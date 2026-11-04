using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketBooth.Migrations
{
    /// <inheritdoc />
    public partial class DodanieZamowien : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OrderNumber",
                table: "Seats",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "ReservationTime",
                table: "Seats",
                type: "datetime(6)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OrderNumber",
                table: "Seats");

            migrationBuilder.DropColumn(
                name: "ReservationTime",
                table: "Seats");
        }
    }
}
