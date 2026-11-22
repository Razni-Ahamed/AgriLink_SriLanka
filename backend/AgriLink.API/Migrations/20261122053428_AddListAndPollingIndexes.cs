using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriLink.API.Migrations
{
    /// <inheritdoc />
    public partial class AddListAndPollingIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_CropIssues_FarmerProfileId",
                table: "CropIssues");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId_CreatedAt",
                table: "Notifications",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_HarvestListings_Status_CreatedAt",
                table: "HarvestListings",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CropIssues_FarmerProfileId_CreatedAt",
                table: "CropIssues",
                columns: new[] { "FarmerProfileId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CropIssues_Status_CreatedAt",
                table: "CropIssues",
                columns: new[] { "Status", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notifications_UserId_CreatedAt",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_HarvestListings_Status_CreatedAt",
                table: "HarvestListings");

            migrationBuilder.DropIndex(
                name: "IX_CropIssues_FarmerProfileId_CreatedAt",
                table: "CropIssues");

            migrationBuilder.DropIndex(
                name: "IX_CropIssues_Status_CreatedAt",
                table: "CropIssues");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CropIssues_FarmerProfileId",
                table: "CropIssues",
                column: "FarmerProfileId");
        }
    }
}
