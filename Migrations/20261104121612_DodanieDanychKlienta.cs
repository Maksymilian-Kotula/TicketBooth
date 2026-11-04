using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketBooth.Migrations
{
    /// <inheritdoc />
    public partial class DodanieDanychKlienta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClientEmail",
                table: "Seats",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ClientName",
                table: "Seats",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ClientPhone",
                table: "Seats",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClientEmail",
                table: "Seats");

            migrationBuilder.DropColumn(
                name: "ClientName",
                table: "Seats");

            migrationBuilder.DropColumn(
                name: "ClientPhone",
                table: "Seats");
        }
    }
}
