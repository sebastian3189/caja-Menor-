using CajaMenor.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CajaMenor.Infrastructure.Persistence.Configurations;

public class LegalizacionReciboConfiguration : IEntityTypeConfiguration<LegalizacionRecibo>
{
    public void Configure(EntityTypeBuilder<LegalizacionRecibo> builder)
    {
        builder.ToTable("LegalizacionRecibos");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.NombreOriginal).IsRequired().HasMaxLength(255);
        builder.Property(x => x.RutaArchivo).IsRequired().HasMaxLength(500);
        builder.HasOne(x => x.Legalizacion)
               .WithMany(l => l.Recibos)
               .HasForeignKey(x => x.LegalizacionId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
