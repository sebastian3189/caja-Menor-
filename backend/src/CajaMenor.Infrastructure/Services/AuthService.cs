using System.IdentityModel.Tokens.Jwt;
using System.Net;
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
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace CajaMenor.Infrastructure.Services;

public class AuthService(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration config, AppDbContext db, INotificacionService notificacion, ILogger<AuthService> logger, IHostEnvironment env) : IAuthService
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
            .Include(u => u.CajasMenoresComoSolicitante)
            .FirstOrDefaultAsync(u => u.IdentityUserId == user.Id);

        var cajaId = 0;
        var nombreCaja = string.Empty;
        if (usuarioApp != null)
        {
            var caja = usuarioApp.CajasMenoresComoDirector.FirstOrDefault()
                    ?? usuarioApp.CajasMenoresComoAdmin.FirstOrDefault()
                    ?? usuarioApp.CajasMenoresComoSolicitante.FirstOrDefault();
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
            NombreCaja = nombreCaja,
            MustChangePassword = user.MustChangePassword
        });
    }

    public async Task<Result> RegistrarUsuarioAsync(RegistrarUsuarioDto dto)
    {
        if (!RolUsuario.RolesAsignables.Contains(dto.Rol))
            return Result.Fail($"Rol inválido. Use uno de: {string.Join(", ", RolUsuario.RolesAsignables)}");

        var central = await db.Centrales.FindAsync(dto.CentralId);
        if (central is null) return Result.Fail("Central no encontrada.");

        var cedula = (dto.Cedula ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(cedula))
            return Result.Fail("La cédula es obligatoria (será la contraseña inicial).");

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            NombreCompleto = dto.NombreCompleto,
            MustChangePassword = true // obligar a cambiar la cédula por una contraseña segura en el primer ingreso
        };

        // La contraseña inicial es la cédula
        var result = await userManager.CreateAsync(user, cedula);
        if (!result.Succeeded)
            return Result.Fail(result.Errors.Select(e => e.Description).ToList());

        if (!await roleManager.RoleExistsAsync(dto.Rol))
            await roleManager.CreateAsync(new IdentityRole(dto.Rol));

        await userManager.AddToRoleAsync(user, dto.Rol);

        var usuarioApp = new UsuarioApp
        {
            IdentityUserId = user.Id,
            Nombre = dto.NombreCompleto,
            Email = dto.Email,
            Cedula = cedula,
            Rol = dto.Rol,
            CentralId = central.Id
        };
        db.UsuariosApp.Add(usuarioApp);
        await db.SaveChangesAsync();

        // Un Solicitante puede quedar asignado a una caja desde su creación.
        if (dto.Rol == RolUsuario.Solicitante && dto.CajaId.HasValue)
        {
            var caja = await db.CajasMenores
                .Include(c => c.Solicitantes)
                .FirstOrDefaultAsync(c => c.Id == dto.CajaId.Value);
            if (caja is null) return Result.Fail("Caja no encontrada.");

            if (!caja.Solicitantes.Any(s => s.Id == usuarioApp.Id))
                caja.Solicitantes.Add(usuarioApp);
            // La central del solicitante pasa a ser la de la caja asignada (integridad)
            usuarioApp.CentralId = caja.CentralId;
            await db.SaveChangesAsync();
        }

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
                .Include(ua => ua.Central)
                .Include(ua => ua.CajasMenoresComoDirector)
                .Include(ua => ua.CajasMenoresComoAdmin)
                .Include(ua => ua.CajasMenoresComoSolicitante)
                .FirstOrDefaultAsync(ua => ua.IdentityUserId == u.Id);

            var caja = usuarioApp?.CajasMenoresComoDirector.FirstOrDefault()
                    ?? usuarioApp?.CajasMenoresComoAdmin.FirstOrDefault()
                    ?? usuarioApp?.CajasMenoresComoSolicitante.FirstOrDefault();

            lista.Add(new UsuarioListDto
            {
                Id = u.Id,
                UsuarioAppId = usuarioApp?.Id ?? 0,
                NombreCompleto = u.NombreCompleto,
                Email = u.Email ?? string.Empty,
                Rol = roles.FirstOrDefault() ?? string.Empty,
                CentralId = usuarioApp?.CentralId ?? 0,
                NombreCentral = usuarioApp?.Central?.Nombre ?? string.Empty,
                NombreCaja = caja?.Nombre ?? string.Empty
            });
        }

        return Result<List<UsuarioListDto>>.Ok(lista);
    }

    public async Task<Result> EditarUsuarioAsync(string userId, EditarUsuarioDto dto)
    {
        if (!RolUsuario.RolesAsignables.Contains(dto.Rol) && dto.Rol != RolUsuario.Maestro)
            return Result.Fail($"Rol inválido. Use uno de: {string.Join(", ", RolUsuario.RolesAsignables)}");

        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return Result.Fail("Usuario no encontrado");

        var usuarioApp = await db.UsuariosApp
            .Include(u => u.CajasMenoresComoDirector)
            .FirstOrDefaultAsync(u => u.IdentityUserId == userId);
        if (usuarioApp is null) return Result.Fail("Perfil de usuario no encontrado");

        var rolesActuales = await userManager.GetRolesAsync(user);
        var rolActual = rolesActuales.FirstOrDefault();

        // Cambiar de rol a algo distinto de Director mientras sigue dirigiendo una caja rompería la integridad
        if (rolActual == RolUsuario.Director && dto.Rol != RolUsuario.Director && usuarioApp.CajasMenoresComoDirector.Count > 0)
            return Result.Fail("No se puede cambiar el rol: el usuario es Director de una caja. Reasigne esa caja primero.");

        var central = await db.Centrales.FindAsync(dto.CentralId);
        if (central is null) return Result.Fail("Central no encontrada.");

        // Email/UserName
        if (user.Email != dto.Email)
        {
            user.Email = dto.Email;
            user.UserName = dto.Email;
        }
        user.NombreCompleto = dto.NombreCompleto;
        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
            return Result.Fail(updateResult.Errors.Select(e => e.Description).ToList());

        // Rol (Identity)
        if (rolActual != dto.Rol)
        {
            if (rolActual is not null) await userManager.RemoveFromRoleAsync(user, rolActual);
            if (!await roleManager.RoleExistsAsync(dto.Rol))
                await roleManager.CreateAsync(new IdentityRole(dto.Rol));
            await userManager.AddToRoleAsync(user, dto.Rol);
        }

        // Reset de contraseña opcional
        if (!string.IsNullOrWhiteSpace(dto.NuevaPassword))
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var passResult = await userManager.ResetPasswordAsync(user, token, dto.NuevaPassword);
            if (!passResult.Succeeded)
                return Result.Fail(passResult.Errors.Select(e => e.Description).ToList());
        }

        // Perfil de aplicación
        usuarioApp.Nombre = dto.NombreCompleto;
        usuarioApp.Email = dto.Email;
        usuarioApp.Rol = dto.Rol;
        usuarioApp.CentralId = central.Id;
        await db.SaveChangesAsync();

        return Result.Ok();
    }

    public async Task<Result> EliminarUsuarioAsync(string userId)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return Result.Fail("Usuario no encontrado");

        var usuarioApp = await db.UsuariosApp
            .Include(u => u.CajasMenoresComoAdmin)
            .Include(u => u.CajasMenoresComoSolicitante)
            .FirstOrDefaultAsync(u => u.IdentityUserId == userId);

        if (usuarioApp is not null)
        {
            // Remover de cajas donde es administrador
            foreach (var caja in usuarioApp.CajasMenoresComoAdmin.ToList())
                caja.Administradores.Remove(usuarioApp);

            // Remover de cajas donde es solicitante
            foreach (var caja in usuarioApp.CajasMenoresComoSolicitante.ToList())
                caja.Solicitantes.Remove(usuarioApp);

            // Sus solicitudes de avance se eliminan (FK Restrict impide borrar el usuario si quedan)
            var solicitudes = await db.SolicitudesAvance.Where(s => s.SolicitanteId == usuarioApp.Id).ToListAsync();
            db.SolicitudesAvance.RemoveRange(solicitudes);

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
            .Include(u => u.CajasMenoresComoSolicitante)
            .FirstOrDefaultAsync(u => u.IdentityUserId == userId);

        if (usuarioApp is null) return Result.Fail("Perfil de usuario no encontrado");

        var caja = await db.CajasMenores
            .Include(c => c.Administradores)
            .Include(c => c.Solicitantes)
            .FirstOrDefaultAsync(c => c.Id == cajaId);

        if (caja is null) return Result.Fail("Caja no encontrada");

        var roles = await userManager.GetRolesAsync(user);
        var rol = roles.FirstOrDefault();

        if (rol == RolUsuario.Director)
        {
            // Remover de cualquier otra caja donde este usuario era director (un Director solo lidera una caja)
            var cajaAnterior = await db.CajasMenores.FirstOrDefaultAsync(c => c.DirectorId == usuarioApp.Id && c.Id != cajaId);
            if (cajaAnterior is not null)
                cajaAnterior.DirectorId = null;

            // Reemplaza al Director actual de esta caja (si había otro, queda sin caja asignada)
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
        else if (rol == RolUsuario.Solicitante)
        {
            // Un Solicitante pertenece a una sola caja: quitar de las anteriores
            foreach (var cajaAnterior in usuarioApp.CajasMenoresComoSolicitante.Where(c => c.Id != cajaId).ToList())
                cajaAnterior.Solicitantes.Remove(usuarioApp);

            if (!caja.Solicitantes.Any(a => a.Id == usuarioApp.Id))
                caja.Solicitantes.Add(usuarioApp);
        }
        else
        {
            return Result.Fail("Rol de usuario no reconocido");
        }

        // La central del usuario asignado pasa a ser la de la caja que ahora dirige/administra
        usuarioApp.CentralId = caja.CentralId;

        await db.SaveChangesAsync();
        return Result.Ok();
    }

    public async Task<Result> SolicitarRecuperacionAsync(ForgotPasswordDto dto)
    {
        var user = await userManager.FindByEmailAsync(dto.Email);
        // No revelar si el correo existe: siempre respondemos Ok al cliente
        if (user is null || string.IsNullOrWhiteSpace(user.Email))
        {
            logger.LogWarning("Recuperación solicitada para un correo NO registrado: {Email}", dto.Email);
            return Result.Ok();
        }

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var frontendUrl = (config["App:FrontendUrl"] ?? "http://localhost:5173").TrimEnd('/');
        var enlace = $"{frontendUrl}/reset-password?email={WebUtility.UrlEncode(user.Email)}&token={WebUtility.UrlEncode(token)}";

        var smtpConfigurado = !string.IsNullOrWhiteSpace(config["Email:Usuario"]) && !string.IsNullOrWhiteSpace(config["Email:Password"]);
        if (!smtpConfigurado)
        {
            // Sin cuenta remitente no se puede enviar. En desarrollo dejamos el enlace en el log para poder probar el flujo.
            if (env.IsDevelopment())
                logger.LogWarning("SMTP no configurado. Enlace de recuperación para {Email}:\n{Enlace}", user.Email, enlace);
            else
                logger.LogError("SMTP no configurado (Email:Usuario/Password). No se pudo enviar la recuperación a {Email}.", user.Email);
            return Result.Ok();
        }

        var envio = await notificacion.EnviarRecuperacionAsync(user.Email, user.NombreCompleto, enlace);
        if (!envio.Success)
            logger.LogError("Fallo al enviar correo de recuperación a {Email}: {Error}", user.Email, envio.Error ?? string.Join("; ", envio.Errors));
        else
            logger.LogInformation("Correo de recuperación enviado a {Email}", user.Email);

        // Respuesta genérica al cliente en cualquier caso (no revelar estado del envío)
        return Result.Ok();
    }

    public async Task<Result> RestablecerPasswordAsync(ResetPasswordDto dto)
    {
        var user = await userManager.FindByEmailAsync(dto.Email);
        // Mensaje genérico para no revelar si el correo existe
        if (user is null)
            return Result.Fail("No se pudo restablecer la contraseña. El enlace es inválido o expiró.");

        var errorPolicy = PasswordPolicy.Validar(dto.NuevaPassword);
        if (errorPolicy is not null) return Result.Fail(errorPolicy);

        var result = await userManager.ResetPasswordAsync(user, dto.Token, dto.NuevaPassword);
        if (!result.Succeeded)
            return Result.Fail(result.Errors.Select(e => e.Description).ToList());

        // El reset limpia la obligación de cambio (por si el usuario nunca ingresó y usó "olvidé mi contraseña")
        if (user.MustChangePassword)
        {
            user.MustChangePassword = false;
            await userManager.UpdateAsync(user);
        }

        return Result.Ok();
    }

    public async Task<Result> CambiarPasswordAsync(string identityUserId, CambiarPasswordDto dto)
    {
        var user = await userManager.FindByIdAsync(identityUserId);
        if (user is null) return Result.Fail("Usuario no encontrado");

        var errorPolicy = PasswordPolicy.Validar(dto.NuevaPassword);
        if (errorPolicy is not null) return Result.Fail(errorPolicy);

        var result = await userManager.ChangePasswordAsync(user, dto.PasswordActual, dto.NuevaPassword);
        if (!result.Succeeded)
            return Result.Fail(result.Errors.Select(e => e.Description).ToList());

        if (user.MustChangePassword)
        {
            user.MustChangePassword = false;
            await userManager.UpdateAsync(user);
        }

        return Result.Ok();
    }

    private string GenerarToken(ApplicationUser user, string rol)
    {
        var jwtKey = config["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key no está configurado.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
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
