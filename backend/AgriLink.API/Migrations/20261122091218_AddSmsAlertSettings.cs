using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriLink.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSmsAlertSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "SmsAlertsEnabled",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SmsLanguage",
                table: "AspNetUsers",
                type: "character varying(5)",
                maxLength: 5,
                nullable: false,
                defaultValue: "en");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SmsAlertsEnabled",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "SmsLanguage",
                table: "AspNetUsers");
        }
    }
}
