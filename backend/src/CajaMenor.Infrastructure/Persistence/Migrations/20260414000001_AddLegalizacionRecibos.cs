using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CajaMenor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLegalizacionRecibos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LegalizacionRecibos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LegalizacionId = table.Column<int>(type: "int", nullable: false),
                    NombreOriginal = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    RutaArchivo = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    FechaSubida = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LegalizacionRecibos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LegalizacionRecibos_Legalizaciones_LegalizacionId",
                        column: x => x.LegalizacionId,
                        principalTable: "Legalizaciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LegalizacionRecibos_LegalizacionId",
                table: "LegalizacionRecibos",
                column: "LegalizacionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "LegalizacionRecibos");
        }
    }
}
