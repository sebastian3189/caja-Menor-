using CajaMenor.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CajaMenor.Infrastructure.Persistence.Configurations;

public class SolicitudAvanceConfiguration : IEntityTypeConfiguration<SolicitudAvance>
{
    public void Configure(EntityTypeBuilder<SolicitudAvance> builder)
    {
        builder.ToTable("SolicitudesAvance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ValorSolicitado).HasColumnType("decimal(18,2)");
        builder.Property(x => x.Descripcion).IsRequired().HasMaxLength(500);
        builder.Property(x => x.MotivoRechazo).HasMaxLength(500);

        // NoAction en todas las FK para evitar múltiples rutas de cascada; el borrado se maneja en código.
        builder.HasOne(x => x.Caja).WithMany(c => c.Solicitudes).HasForeignKey(x => x.CajaId).OnDelete(DeleteBehavior.NoAction);
        builder.HasOne(x => x.Solicitante).WithMany().HasForeignKey(x => x.SolicitanteId).OnDelete(DeleteBehavior.NoAction);
        builder.HasOne(x => x.Avance).WithMany().HasForeignKey(x => x.AvanceId).OnDelete(DeleteBehavior.NoAction);
    }
}
