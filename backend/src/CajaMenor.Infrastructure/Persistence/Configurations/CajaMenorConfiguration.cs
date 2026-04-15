using CajaMenor.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CajaMenor.Infrastructure.Persistence.Configurations;

public class CajaMenorConfiguration : IEntityTypeConfiguration<CajaMenorEntity>
{
    public void Configure(EntityTypeBuilder<CajaMenorEntity> builder)
    {
        builder.ToTable("CajasMenores");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Nombre).IsRequired().HasMaxLength(200);
        builder.Property(x => x.ValorApertura).HasColumnType("decimal(18,2)");
        builder.Property(x => x.Disponible).HasColumnType("decimal(18,2)");
        builder.Property(x => x.TotalUsado).HasColumnType("decimal(18,2)");

        builder.HasOne(x => x.Central).WithMany(c => c.CajasMenores).HasForeignKey(x => x.CentralId);
        builder.HasOne(x => x.Director).WithMany(u => u.CajasMenoresComoDirector).HasForeignKey(x => x.DirectorId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Administradores).WithMany(u => u.CajasMenoresComoAdmin)
            .UsingEntity(j => j.ToTable("CajaAdministradores"));
    }
}
