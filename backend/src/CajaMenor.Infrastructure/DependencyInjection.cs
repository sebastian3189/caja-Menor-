using CajaMenor.Application.Interfaces;
using CajaMenor.Infrastructure.Identity;
using CajaMenor.Infrastructure.Persistence;
using CajaMenor.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CajaMenor.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddMemoryCache();

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection"))
                   .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning)));

        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            // Política permisiva a nivel de Identity para admitir la contraseña inicial (cédula numérica).
            // Las contraseñas que fija el usuario se validan aparte con PasswordPolicy (mayús+minús+número+especial).
            options.Password.RequireDigit = true;
            options.Password.RequiredLength = 8;
            options.Password.RequireUppercase = false;
            options.Password.RequireLowercase = false;
            options.Password.RequireNonAlphanumeric = false;
        })
        .AddEntityFrameworkStores<AppDbContext>()
        .AddDefaultTokenProviders();

        services.AddScoped<IOCRService, OcrService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICajaMenorService, CajaMenorService>();
        services.AddScoped<IAvanceService, AvanceService>();
        services.AddScoped<ILegalizacionService, LegalizacionService>();
        services.AddScoped<IReembolsoService, ReembolsoService>();
        services.AddScoped<IArqueoService, ArqueoService>();
        services.AddScoped<INotificacionService, NotificacionService>();
        services.AddScoped<ICentralService, CentralService>();
        services.AddScoped<IAuditoriaService, AuditoriaService>();
        services.AddScoped<ISolicitudAvanceService, SolicitudAvanceService>();
        services.AddSingleton<ITokenBlacklistService, TokenBlacklistService>();

        return services;
    }
}
