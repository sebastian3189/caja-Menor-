using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CajaMenor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSolicitudesAvance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Join table Caja <-> Solicitantes (UsuarioApp)
            migrationBuilder.CreateTable(
                name: "CajaSolicitantes",
                columns: table => new
                {
                    CajasMenoresComoSolicitanteId = table.Column<int>(type: "int", nullable: false),
                    SolicitantesId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CajaSolicitantes", x => new { x.CajasMenoresComoSolicitanteId, x.SolicitantesId });
                    table.ForeignKey(
                        name: "FK_CajaSolicitantes_CajasMenores_CajasMenoresComoSolicitanteId",
                        column: x => x.CajasMenoresComoSolicitanteId,
                        principalTable: "CajasMenores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CajaSolicitantes_UsuariosApp_SolicitantesId",
                        column: x => x.SolicitantesId,
                        principalTable: "UsuariosApp",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction); // evita múltiples rutas de cascada; la limpieza se hace en código
                });

            migrationBuilder.CreateTable(
                name: "SolicitudesAvance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CajaId = table.Column<int>(type: "int", nullable: false),
                    SolicitanteId = table.Column<int>(type: "int", nullable: false),
                    ValorSolicitado = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Descripcion = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Estado = table.Column<int>(type: "int", nullable: false),
                    FechaSolicitud = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FechaRespuesta = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AvanceId = table.Column<int>(type: "int", nullable: true),
                    MotivoRechazo = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SolicitudesAvance", x => x.Id);
                    // Todas NoAction para evitar múltiples rutas de cascada; el borrado se maneja en código.
                    table.ForeignKey(
                        name: "FK_SolicitudesAvance_CajasMenores_CajaId",
                        column: x => x.CajaId,
                        principalTable: "CajasMenores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_SolicitudesAvance_UsuariosApp_SolicitanteId",
                        column: x => x.SolicitanteId,
                        principalTable: "UsuariosApp",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_SolicitudesAvance_Avances_AvanceId",
                        column: x => x.AvanceId,
                        principalTable: "Avances",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CajaSolicitantes_SolicitantesId",
                table: "CajaSolicitantes",
                column: "SolicitantesId");

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudesAvance_CajaId",
                table: "SolicitudesAvance",
                column: "CajaId");

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudesAvance_SolicitanteId",
                table: "SolicitudesAvance",
                column: "SolicitanteId");

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudesAvance_AvanceId",
                table: "SolicitudesAvance",
                column: "AvanceId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "CajaSolicitantes");
            migrationBuilder.DropTable(name: "SolicitudesAvance");
        }
    }
}
