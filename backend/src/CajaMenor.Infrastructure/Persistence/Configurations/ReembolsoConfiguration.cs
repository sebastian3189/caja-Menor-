using CajaMenor.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CajaMenor.Infrastructure.Persistence.Configurations;

public class ReembolsoConfiguration : IEntityTypeConfiguration<Reembolso>
{
    public void Configure(EntityTypeBuilder<Reembolso> builder)
    {
        builder.ToTable("Reembolsos");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.CodigoCentral).HasMaxLength(200);
        builder.Property(x => x.ValorAvance).HasColumnType("decimal(18,2)");
        builder.Property(x => x.ValorLegalizado).HasColumnType("decimal(18,2)");
        builder.Property(x => x.Debe).HasColumnType("decimal(18,2)");
        builder.Property(x => x.Debemos).HasColumnType("decimal(18,2)");
        builder.Property(x => x.Monto).HasColumnType("decimal(18,2)");
    }
}
