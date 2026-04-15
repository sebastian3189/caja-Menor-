using CajaMenor.Domain.Entities;
using CajaMenor.Domain.Enums;
using CajaMenor.Infrastructure.Identity;
using CajaMenor.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CajaMenor.API;

public static class DataSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        var directorPassword = config["Seeder:DirectorPassword"] ?? "Admin123!";
        var adminPassword = config["Seeder:AdminPassword"] ?? "Admin123!";

        // Crear roles
        foreach (var rol in new[] { "Director", "Administrador" })
        {
            if (!await roleManager.RoleExistsAsync(rol))
                await roleManager.CreateAsync(new IdentityRole(rol));
        }

        // Crear Central si no existe
        if (!await db.Centrales.AnyAsync())
        {
            db.Centrales.Add(new Central { Nombre = "Central MiraxionTech", CodigoCentral = "MXT-001" });
            await db.SaveChangesAsync();
        }

        var central = await db.Centrales.FirstAsync();

        // Crear Director
        UsuarioApp? directorApp = null;
        var directorIdentity = await userManager.FindByEmailAsync("director@miraxiontech.com");
        if (directorIdentity == null)
        {
            directorIdentity = new ApplicationUser
            {
                UserName = "director@miraxiontech.com",
                Email = "director@miraxiontech.com",
                NombreCompleto = "Director MiraxionTech"
            };
            await userManager.CreateAsync(directorIdentity, directorPassword);
            await userManager.AddToRoleAsync(directorIdentity, "Director");

            directorApp = new UsuarioApp
            {
                IdentityUserId = directorIdentity.Id,
                Nombre = "Director MiraxionTech",
                Email = "director@miraxiontech.com",
                Rol = "Director",
                CentralId = central.Id
            };
            db.UsuariosApp.Add(directorApp);
            await db.SaveChangesAsync();
        }
        else
        {
            directorApp = await db.UsuariosApp.FirstOrDefaultAsync(u => u.IdentityUserId == directorIdentity.Id);
        }

        // Crear Administrador
        UsuarioApp? adminApp = null;
        var adminIdentity = await userManager.FindByEmailAsync("admin@miraxiontech.com");
        if (adminIdentity == null)
        {
            adminIdentity = new ApplicationUser
            {
                UserName = "admin@miraxiontech.com",
                Email = "admin@miraxiontech.com",
                NombreCompleto = "Administrador MiraxionTech"
            };
            await userManager.CreateAsync(adminIdentity, adminPassword);
            await userManager.AddToRoleAsync(adminIdentity, "Administrador");

            adminApp = new UsuarioApp
            {
                IdentityUserId = adminIdentity.Id,
                Nombre = "Administrador MiraxionTech",
                Email = "admin@miraxiontech.com",
                Rol = "Administrador",
                CentralId = central.Id
            };
            db.UsuariosApp.Add(adminApp);
            await db.SaveChangesAsync();
        }
        else
        {
            adminApp = await db.UsuariosApp.FirstOrDefaultAsync(u => u.IdentityUserId == adminIdentity.Id);
        }

        // Crear Caja Menor si no existe
        if (directorApp != null && adminApp != null && !await db.CajasMenores.AnyAsync())
        {
            var caja = new CajaMenorEntity
            {
                CentralId = central.Id,
                Nombre = "Caja Menor MiraxionTech",
                ValorApertura = 5_000_000,
                Disponible = 5_000_000,
                TotalUsado = 0,
                DirectorId = directorApp.Id,
                Estado = EstadoCaja.Abierta,
                FechaApertura = DateTime.UtcNow
            };
            caja.Administradores.Add(adminApp);
            db.CajasMenores.Add(caja);
            await db.SaveChangesAsync();
        }
    }
}
