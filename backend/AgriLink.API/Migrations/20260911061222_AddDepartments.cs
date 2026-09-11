using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AgriLink.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDepartments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Hand-edited from the scaffolded version: the generated migration dropped the old
            // Department string column before anything captured its values. This ordering
            // creates Departments and a nullable DepartmentId first, copies each existing
            // OfficerProfiles.Department string into a Departments row and points DepartmentId
            // at it, and only then drops the string column and enforces NOT NULL — so the one
            // "Agriculture" officer already in the database keeps their department.
            migrationBuilder.CreateTable(
                name: "Departments",
                columns: table => new
                {
                    DepartmentId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Departments", x => x.DepartmentId);
                });

            migrationBuilder.AddColumn<int>(
                name: "DepartmentId",
                table: "OfficerProfiles",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql(
                """
                INSERT INTO "Departments" ("Name", "CreatedAt")
                SELECT DISTINCT trim("Department"), now()
                FROM "OfficerProfiles"
                WHERE "Department" IS NOT NULL AND trim("Department") <> '';

                UPDATE "OfficerProfiles" op
                SET "DepartmentId" = d."DepartmentId"
                FROM "Departments" d
                WHERE d."Name" = trim(op."Department");

                INSERT INTO "Departments" ("Name", "CreatedAt")
                SELECT 'General', now()
                WHERE EXISTS (SELECT 1 FROM "OfficerProfiles" WHERE "DepartmentId" IS NULL)
                  AND NOT EXISTS (SELECT 1 FROM "Departments" WHERE "Name" = 'General');

                UPDATE "OfficerProfiles"
                SET "DepartmentId" = (SELECT "DepartmentId" FROM "Departments" WHERE "Name" = 'General')
                WHERE "DepartmentId" IS NULL;
                """);

            migrationBuilder.DropColumn(
                name: "Department",
                table: "OfficerProfiles");

            migrationBuilder.AlterColumn<int>(
                name: "DepartmentId",
                table: "OfficerProfiles",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_OfficerProfiles_DepartmentId",
                table: "OfficerProfiles",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Departments_Name",
                table: "Departments",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_OfficerProfiles_Departments_DepartmentId",
                table: "OfficerProfiles",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OfficerProfiles_Departments_DepartmentId",
                table: "OfficerProfiles");

            migrationBuilder.AddColumn<string>(
                name: "Department",
                table: "OfficerProfiles",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "OfficerProfiles" op
                SET "Department" = d."Name"
                FROM "Departments" d
                WHERE d."DepartmentId" = op."DepartmentId";
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Department",
                table: "OfficerProfiles",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.DropIndex(
                name: "IX_OfficerProfiles_DepartmentId",
                table: "OfficerProfiles");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "OfficerProfiles");

            migrationBuilder.DropTable(
                name: "Departments");
        }
    }
}
