using CajaMenor.Domain.Entities;
using CajaMenor.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CajaMenor.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Central> Centrales => Set<Central>();
    public DbSet<UsuarioApp> UsuariosApp => Set<UsuarioApp>();
    public DbSet<CajaMenorEntity> CajasMenores => Set<CajaMenorEntity>();
    public DbSet<Avance> Avances => Set<Avance>();
    public DbSet<Legalizacion> Legalizaciones => Set<Legalizacion>();
    public DbSet<Reembolso> Reembolsos => Set<Reembolso>();
    public DbSet<Arqueo> Arqueos => Set<Arqueo>();
    public DbSet<LegalizacionRecibo> LegalizacionRecibos => Set<LegalizacionRecibo>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
