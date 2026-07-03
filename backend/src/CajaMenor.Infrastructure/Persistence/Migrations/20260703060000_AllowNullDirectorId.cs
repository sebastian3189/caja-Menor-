using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CajaMenor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AllowNullDirectorId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CajasMenores_UsuariosApp_DirectorId",
                table: "CajasMenores");

            migrationBuilder.AlterColumn<int>(
                name: "DirectorId",
                table: "CajasMenores",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddForeignKey(
                name: "FK_CajasMenores_UsuariosApp_DirectorId",
                table: "CajasMenores",
                column: "DirectorId",
                principalTable: "UsuariosApp",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CajasMenores_UsuariosApp_DirectorId",
                table: "CajasMenores");

            migrationBuilder.AlterColumn<int>(
                name: "DirectorId",
                table: "CajasMenores",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_CajasMenores_UsuariosApp_DirectorId",
                table: "CajasMenores",
                column: "DirectorId",
                principalTable: "UsuariosApp",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
