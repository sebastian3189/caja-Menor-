using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.Domain.Entities;
using CajaMenor.Domain.Enums;
using CajaMenor.Infrastructure.Identity;
using CajaMenor.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace CajaMenor.Infrastructure.Services;

public class AuthService(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration config, AppDbContext db) : IAuthService
{
    public async Task<Result<LoginResponseDto>> LoginAsync(LoginDto dto)
    {
        var user = await userManager.FindByEmailAsync(dto.Email);
        if (user is null || !await userManager.CheckPasswordAsync(user, dto.Password))
            return Result<LoginResponseDto>.Fail("Credenciales inválidas");

        var roles = await userManager.GetRolesAsync(user);
        var rol = roles.FirstOrDefault() ?? string.Empty;

        var usuarioApp = await db.UsuariosApp
            .Include(u => u.CajasMenoresComoDirector)
            .Include(u => u.CajasMenoresComoAdmin)
            .FirstOrDefaultAsync(u => u.IdentityUserId == user.Id);

        var cajaId = 0;
        var nombreCaja = string.Empty;
        if (usuarioApp != null)
        {
            var caja = usuarioApp.CajasMenoresComoDirector.FirstOrDefault()
                    ?? usuarioApp.CajasMenoresComoAdmin.FirstOrDefault();
            if (caja != null) { cajaId = caja.Id; nombreCaja = caja.Nombre; }
        }

        var token = GenerarToken(user, rol);
        return Result<LoginResponseDto>.Ok(new LoginResponseDto
        {
            Token = token,
            RefreshToken = Guid.NewGuid().ToString(),
            Expiration = DateTime.UtcNow.AddHours(8),
            UserId = user.Id,
            NombreCompleto = user.NombreCompleto,
            Email = user.Email!,
            Rol = rol,
            CajaId = cajaId,
            NombreCaja = nombreCaja
        });
    }

    public async Task<Result> RegistrarUsuarioAsync(RegistrarUsuarioDto dto)
    {
        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            NombreCompleto = dto.NombreCompleto
        };

        var result = await userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return Result.Fail(result.Errors.Select(e => e.Description).ToList());

        if (!await roleManager.RoleExistsAsync(dto.Rol))
            await roleManager.CreateAsync(new IdentityRole(dto.Rol));

        await userManager.AddToRoleAsync(user, dto.Rol);

        var central = await db.Centrales.FirstOrDefaultAsync();
        var usuarioApp = new UsuarioApp
        {
            IdentityUserId = user.Id,
            Nombre = dto.NombreCompleto,
            Email = dto.Email,
            Rol = dto.Rol,
            CentralId = central?.Id ?? 1
        };
        db.UsuariosApp.Add(usuarioApp);
        await db.SaveChangesAsync();

        return Result.Ok();
    }

    public async Task<Result<List<UsuarioListDto>>> ListarUsuariosAsync()
    {
        var usuarios = await userManager.Users.ToListAsync();
        var lista = new List<UsuarioListDto>();

        foreach (var u in usuarios)
        {
            var roles = await userManager.GetRolesAsync(u);
            var usuarioApp = await db.UsuariosApp
                .Include(ua => ua.CajasMenoresComoDirector)
                .Include(ua => ua.CajasMenoresComoAdmin)
                .FirstOrDefaultAsync(ua => ua.IdentityUserId == u.Id);

            var caja = usuarioApp?.CajasMenoresComoDirector.FirstOrDefault()
                    ?? usuarioApp?.CajasMenoresComoAdmin.FirstOrDefault();

            lista.Add(new UsuarioListDto
            {
                Id = u.Id,
                NombreCompleto = u.NombreCompleto,
                Email = u.Email ?? string.Empty,
                Rol = roles.FirstOrDefault() ?? string.Empty,
                NombreCaja = caja?.Nombre ?? string.Empty
            });
        }

        return Result<List<UsuarioListDto>>.Ok(lista);
    }

    public async Task<Result> EliminarUsuarioAsync(string userId)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return Result.Fail("Usuario no encontrado");

        var usuarioApp = await db.UsuariosApp
            .Include(u => u.CajasMenoresComoAdmin)
            .FirstOrDefaultAsync(u => u.IdentityUserId == userId);

        if (usuarioApp is not null)
        {
            // Remover de cajas donde es administrador
            foreach (var caja in usuarioApp.CajasMenoresComoAdmin.ToList())
                caja.Administradores.Remove(usuarioApp);

            // Si es director, limpiar la referencia
            var cajaComoDirector = await db.CajasMenores.FirstOrDefaultAsync(c => c.DirectorId == usuarioApp.Id);
            if (cajaComoDirector is not null)
                return Result.Fail("No se puede eliminar un Director que tiene una caja asignada. Primero reasigne el director de la caja.");

            db.UsuariosApp.Remove(usuarioApp);
            await db.SaveChangesAsync();
        }

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return Result.Fail(result.Errors.Select(e => e.Description).ToList());

        return Result.Ok();
    }

    public async Task<Result> AsignarCajaAsync(string userId, int cajaId)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return Result.Fail("Usuario no encontrado");

        var usuarioApp = await db.UsuariosApp
            .Include(u => u.CajasMenoresComoDirector)
            .Include(u => u.CajasMenoresComoAdmin)
            .FirstOrDefaultAsync(u => u.IdentityUserId == userId);

        if (usuarioApp is null) return Result.Fail("Perfil de usuario no encontrado");

        var caja = await db.CajasMenores
            .Include(c => c.Administradores)
            .FirstOrDefaultAsync(c => c.Id == cajaId);

        if (caja is null) return Result.Fail("Caja no encontrada");

        var roles = await userManager.GetRolesAsync(user);
        var rol = roles.FirstOrDefault();

        if (rol == RolUsuario.Director)
        {
            // Validar que la caja no tenga ya un director
            if (caja.DirectorId != 0 && caja.DirectorId != usuarioApp.Id)
                return Result.Fail("Esta caja ya tiene un Director asignado. Primero reasigne el director actual.");

            // Remover de director anterior si aplica
            var cajaAnterior = await db.CajasMenores.FirstOrDefaultAsync(c => c.DirectorId == usuarioApp.Id && c.Id != cajaId);
            if (cajaAnterior is not null)
                cajaAnterior.DirectorId = 0;

            caja.DirectorId = usuarioApp.Id;
        }
        else if (rol == RolUsuario.Administrador)
        {
            // Remover de cajas anteriores como admin
            foreach (var cajaAnterior in usuarioApp.CajasMenoresComoAdmin.Where(c => c.Id != cajaId).ToList())
                cajaAnterior.Administradores.Remove(usuarioApp);

            // Agregar a la nueva caja si no está ya
            if (!caja.Administradores.Any(a => a.Id == usuarioApp.Id))
                caja.Administradores.Add(usuarioApp);
        }
        else
        {
            return Result.Fail("Rol de usuario no reconocido");
        }

        await db.SaveChangesAsync();
        return Result.Ok();
    }

    private string GenerarToken(ApplicationUser user, string rol)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"] ?? "CajaMenorSecretKey2024!@#DefaultKey"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(ClaimTypes.Name, user.NombreCompleto),
            new Claim(ClaimTypes.Role, rol),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"] ?? "CajaMenorAPI",
            audience: config["Jwt:Audience"] ?? "CajaMenorApp",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
