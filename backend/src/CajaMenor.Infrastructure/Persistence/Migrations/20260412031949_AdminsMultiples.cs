using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CajaMenor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AdminsMultiples : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CajasMenores_UsuariosApp_AdministradorId",
                table: "CajasMenores");

            migrationBuilder.DropIndex(
                name: "IX_CajasMenores_AdministradorId",
                table: "CajasMenores");

            migrationBuilder.DropColumn(
                name: "AdministradorId",
                table: "CajasMenores");

            migrationBuilder.CreateTable(
                name: "CajaAdministradores",
                columns: table => new
                {
                    AdministradoresId = table.Column<int>(type: "int", nullable: false),
                    CajasMenoresComoAdminId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CajaAdministradores", x => new { x.AdministradoresId, x.CajasMenoresComoAdminId });
                    table.ForeignKey(
                        name: "FK_CajaAdministradores_CajasMenores_CajasMenoresComoAdminId",
                        column: x => x.CajasMenoresComoAdminId,
                        principalTable: "CajasMenores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CajaAdministradores_UsuariosApp_AdministradoresId",
                        column: x => x.AdministradoresId,
                        principalTable: "UsuariosApp",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CajaAdministradores_CajasMenoresComoAdminId",
                table: "CajaAdministradores",
                column: "CajasMenoresComoAdminId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CajaAdministradores");

            migrationBuilder.AddColumn<int>(
                name: "AdministradorId",
                table: "CajasMenores",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_CajasMenores_AdministradorId",
                table: "CajasMenores",
                column: "AdministradorId");

            migrationBuilder.AddForeignKey(
                name: "FK_CajasMenores_UsuariosApp_AdministradorId",
                table: "CajasMenores",
                column: "AdministradorId",
                principalTable: "UsuariosApp",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
