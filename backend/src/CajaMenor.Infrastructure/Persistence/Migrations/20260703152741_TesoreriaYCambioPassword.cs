using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CajaMenor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class TesoreriaYCambioPassword : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Solo columnas nuevas (el snapshot venía desincronizado; el diff generado recreaba todo por error).
            migrationBuilder.AddColumn<bool>(
                name: "MustChangePassword",
                table: "AspNetUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Cedula",
                table: "UsuariosApp",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EstadoTesoreria",
                table: "Arqueos",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Pendiente");

            migrationBuilder.AddColumn<string>(
                name: "TokenTesoreria",
                table: "Arqueos",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FechaRespuestaTesoreria",
                table: "Arqueos",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "MustChangePassword", table: "AspNetUsers");
            migrationBuilder.DropColumn(name: "Cedula", table: "UsuariosApp");
            migrationBuilder.DropColumn(name: "EstadoTesoreria", table: "Arqueos");
            migrationBuilder.DropColumn(name: "TokenTesoreria", table: "Arqueos");
            migrationBuilder.DropColumn(name: "FechaRespuestaTesoreria", table: "Arqueos");
        }
    }
}
