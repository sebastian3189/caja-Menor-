using CajaMenor.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CajaMenor.Infrastructure.Persistence.Configurations;

public class ArqueoConfiguration : IEntityTypeConfiguration<Arqueo>
{
    public void Configure(EntityTypeBuilder<Arqueo> builder)
    {
        builder.ToTable("Arqueos");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ValorApertura).HasColumnType("decimal(18,2)");
        builder.Property(x => x.DisponibleCaja).HasColumnType("decimal(18,2)");
        builder.Property(x => x.ValorAvancesPendientes).HasColumnType("decimal(18,2)");
        builder.Property(x => x.ValorLegalizacionesSinAvance).HasColumnType("decimal(18,2)");
        builder.Property(x => x.ValorLegalizaciones).HasColumnType("decimal(18,2)");
        builder.Property(x => x.TotalReembolso).HasColumnType("decimal(18,2)");
        builder.Property(x => x.Estado).HasMaxLength(50);
        builder.Property(x => x.RutaFirmaDirectivo).HasMaxLength(500);
        builder.Property(x => x.RutaFirmaAdministrador).HasMaxLength(500);

        builder.HasOne(x => x.Caja).WithMany(c => c.Arqueos).HasForeignKey(x => x.CajaId);
    }
}
