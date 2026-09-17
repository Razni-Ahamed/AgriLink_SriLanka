using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriLink.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRegistrationApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FieldPlotNumber",
                table: "FarmerProfiles",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "FarmerProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BusinessPhone",
                table: "BuyerProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BusinessRegistrationNumber",
                table: "BuyerProfiles",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NIC",
                table: "BuyerProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            // Every account that already exists predates the approval workflow, so it must
            // come back as Approved — otherwise the team locks itself out of its own accounts.
            migrationBuilder.AddColumn<string>(
                name: "RegistrationStatus",
                table: "AspNetUsers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Approved");

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "AspNetUsers",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FieldPlotNumber",
                table: "FarmerProfiles");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "FarmerProfiles");

            migrationBuilder.DropColumn(
                name: "BusinessPhone",
                table: "BuyerProfiles");

            migrationBuilder.DropColumn(
                name: "BusinessRegistrationNumber",
                table: "BuyerProfiles");

            migrationBuilder.DropColumn(
                name: "NIC",
                table: "BuyerProfiles");

            migrationBuilder.DropColumn(
                name: "RegistrationStatus",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "AspNetUsers");
        }
    }
}
