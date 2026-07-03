using System.Text.Json;
using CajaMenor.Domain.Entities;
using CajaMenor.Infrastructure.Identity;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace CajaMenor.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    private readonly IHttpContextAccessor? _httpContext;

    public AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor? httpContext = null) : base(options)
    {
        _httpContext = httpContext;
    }

    public DbSet<Central> Centrales => Set<Central>();
    public DbSet<UsuarioApp> UsuariosApp => Set<UsuarioApp>();
    public DbSet<CajaMenorEntity> CajasMenores => Set<CajaMenorEntity>();
    public DbSet<Avance> Avances => Set<Avance>();
    public DbSet<Legalizacion> Legalizaciones => Set<Legalizacion>();
    public DbSet<Reembolso> Reembolsos => Set<Reembolso>();
    public DbSet<Arqueo> Arqueos => Set<Arqueo>();
    public DbSet<LegalizacionRecibo> LegalizacionRecibos => Set<LegalizacionRecibo>();
    public DbSet<SolicitudAvance> SolicitudesAvance => Set<SolicitudAvance>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    // Entidades de dominio que se auditan (create/update/delete)
    private static readonly HashSet<Type> _tiposAuditados =
    [
        typeof(Avance), typeof(Legalizacion), typeof(Reembolso),
        typeof(Arqueo), typeof(LegalizacionRecibo), typeof(CajaMenorEntity),
        typeof(UsuarioApp), typeof(Central), typeof(SolicitudAvance),
    ];

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var auditorias = CapturarAuditoria();
        var resultado = await base.SaveChangesAsync(cancellationToken);

        if (auditorias.Count > 0)
        {
            // Resolver Id definitivo para entidades recién insertadas
            foreach (var (log, entry) in auditorias)
            {
                if (log.RegistroId == 0)
                {
                    var idProp = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "Id");
                    if (idProp?.CurrentValue is int id) log.RegistroId = id;
                }
                AuditLogs.Add(log);
            }
            await base.SaveChangesAsync(cancellationToken);
        }

        return resultado;
    }

    private List<(AuditLog Log, EntityEntry Entry)> CapturarAuditoria()
    {
        var usuarioId = _httpContext?.HttpContext?.User?
            .FindFirst("sub")?.Value
            ?? _httpContext?.HttpContext?.User?
            .FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? "sistema";

        var opts = new JsonSerializerOptions { WriteIndented = false };
        var resultado = new List<(AuditLog, EntityEntry)>();

        foreach (var entry in ChangeTracker.Entries())
        {
            if (!_tiposAuditados.Contains(entry.Entity.GetType())) continue;
            if (entry.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted)) continue;

            var log = new AuditLog
            {
                Tabla = entry.Entity.GetType().Name,
                UsuarioId = usuarioId,
                Fecha = DateTime.UtcNow,
                Accion = entry.State switch
                {
                    EntityState.Added => "Crear",
                    EntityState.Modified => "Editar",
                    EntityState.Deleted => "Eliminar",
                    _ => entry.State.ToString(),
                },
            };

            if (entry.State != EntityState.Added)
                log.RegistroId = (entry.OriginalValues["Id"] as int?) ?? 0;

            // "Id" se omite del JSON: ya viaja en RegistroId (y en Added es un valor temporal)
            static bool Auditable(Microsoft.EntityFrameworkCore.ChangeTracking.PropertyEntry p) => p.Metadata.Name != "Id";

            if (entry.State == EntityState.Modified)
            {
                var antes = new Dictionary<string, object?>();
                var despues = new Dictionary<string, object?>();
                foreach (var prop in entry.Properties.Where(p => p.IsModified && Auditable(p)))
                {
                    antes[prop.Metadata.Name] = prop.OriginalValue;
                    despues[prop.Metadata.Name] = prop.CurrentValue;
                }
                log.DatosAnteriores = JsonSerializer.Serialize(antes, opts);
                log.DatosNuevos = JsonSerializer.Serialize(despues, opts);
            }
            else if (entry.State == EntityState.Added)
            {
                log.DatosNuevos = JsonSerializer.Serialize(
                    entry.Properties.Where(Auditable).ToDictionary(p => p.Metadata.Name, p => p.CurrentValue), opts);
            }
            else // Deleted
            {
                log.DatosAnteriores = JsonSerializer.Serialize(
                    entry.Properties.Where(Auditable).ToDictionary(p => p.Metadata.Name, p => p.OriginalValue), opts);
            }

            resultado.Add((log, entry));
        }

        return resultado;
    }
}
