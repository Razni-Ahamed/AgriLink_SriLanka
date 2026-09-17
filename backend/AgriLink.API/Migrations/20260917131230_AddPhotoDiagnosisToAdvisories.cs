using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriLink.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPhotoDiagnosisToAdvisories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EscalationReasons",
                table: "AIAdvisories",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<float>(
                name: "ModelConfidence",
                table: "AIAdvisories",
                type: "real",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ModelVersion",
                table: "AIAdvisories",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PredictedDiseaseKey",
                table: "AIAdvisories",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EscalationReasons",
                table: "AIAdvisories");

            migrationBuilder.DropColumn(
                name: "ModelConfidence",
                table: "AIAdvisories");

            migrationBuilder.DropColumn(
                name: "ModelVersion",
                table: "AIAdvisories");

            migrationBuilder.DropColumn(
                name: "PredictedDiseaseKey",
                table: "AIAdvisories");
        }
    }
}
