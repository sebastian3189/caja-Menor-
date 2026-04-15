using CajaMenor.Application.Interfaces;
using CajaMenor.Infrastructure.Identity;
using CajaMenor.Infrastructure.Persistence;
using CajaMenor.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CajaMenor.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            options.Password.RequireDigit = true;
            options.Password.RequiredLength = 8;
            options.Password.RequireUppercase = false;
            options.Password.RequireNonAlphanumeric = false;
        })
        .AddEntityFrameworkStores<AppDbContext>()
        .AddDefaultTokenProviders();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICajaMenorService, CajaMenorService>();
        services.AddScoped<IAvanceService, AvanceService>();
        services.AddScoped<ILegalizacionService, LegalizacionService>();
        services.AddScoped<IReembolsoService, ReembolsoService>();
        services.AddScoped<IArqueoService, ArqueoService>();
        services.AddScoped<INotificacionService, NotificacionService>();
        services.AddScoped<ICentralService, CentralService>();

        return services;
    }
}
