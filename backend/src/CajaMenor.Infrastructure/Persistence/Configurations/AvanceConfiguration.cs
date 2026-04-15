using CajaMenor.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CajaMenor.Infrastructure.Persistence.Configurations;

public class AvanceConfiguration : IEntityTypeConfiguration<Avance>
{
    public void Configure(EntityTypeBuilder<Avance> builder)
    {
        builder.ToTable("Avances");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.CodigoAvance).IsRequired().HasMaxLength(50);
        builder.HasIndex(x => x.CodigoAvance).IsUnique();
        builder.Property(x => x.ValorAvance).HasColumnType("decimal(18,2)");
        builder.Property(x => x.Descripcion).HasMaxLength(500);
        builder.Property(x => x.Solicitante).IsRequired().HasMaxLength(200);

        builder.HasOne(x => x.Caja).WithMany(c => c.Avances).HasForeignKey(x => x.CajaId);
        builder.HasOne(x => x.Legalizacion).WithOne(l => l.Avance).HasForeignKey<Legalizacion>(l => l.AvanceId);
    }
}
