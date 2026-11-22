using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriLink.API.Migrations
{
    /// <inheritdoc />
    public partial class AddIssueClientReportId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ClientReportId",
                table: "CropIssues",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CropIssues_FarmerProfileId_ClientReportId",
                table: "CropIssues",
                columns: new[] { "FarmerProfileId", "ClientReportId" },
                unique: true,
                filter: "\"ClientReportId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CropIssues_FarmerProfileId_ClientReportId",
                table: "CropIssues");

            migrationBuilder.DropColumn(
                name: "ClientReportId",
                table: "CropIssues");
        }
    }
}
