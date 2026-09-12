using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriLink.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAdvisoryReviewNote : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReviewNote",
                table: "AIAdvisories",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReviewNote",
                table: "AIAdvisories");
        }
    }
}
