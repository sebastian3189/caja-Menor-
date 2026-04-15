using CajaMenor.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CajaMenor.Infrastructure.Persistence.Configurations;

public class LegalizacionConfiguration : IEntityTypeConfiguration<Legalizacion>
{
    public void Configure(EntityTypeBuilder<Legalizacion> builder)
    {
        builder.ToTable("Legalizaciones");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.CodigoLegalizacion).IsRequired().HasMaxLength(50);
        builder.HasIndex(x => x.CodigoLegalizacion).IsUnique();
        builder.Property(x => x.Monto).HasColumnType("decimal(18,2)");
        builder.Property(x => x.ValorAvance).HasColumnType("decimal(18,2)");
        builder.Property(x => x.Diferencia).HasColumnType("decimal(18,2)");
        builder.Property(x => x.DescuentoCaja).HasColumnType("decimal(18,2)");
        builder.Property(x => x.ValorReembolsar).HasColumnType("decimal(18,2)");
        builder.Property(x => x.Descripcion).HasMaxLength(500);
        builder.Property(x => x.TipoLegalizacion).HasMaxLength(100);

        builder.HasOne(x => x.Caja).WithMany(c => c.Legalizaciones).HasForeignKey(x => x.CajaId);
        builder.HasOne(x => x.Reembolso).WithOne(r => r.Legalizacion).HasForeignKey<Reembolso>(r => r.LegalizacionId);
    }
}
