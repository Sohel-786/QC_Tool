using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class UpdateLocationCompanyRelationship : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompanyId",
                table: "locations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Assign existing locations to the first available company to avoid FK violation
            migrationBuilder.Sql("IF EXISTS (SELECT 1 FROM companies) UPDATE locations SET CompanyId = (SELECT TOP 1 Id FROM companies) WHERE CompanyId = 0 OR CompanyId NOT IN (SELECT Id FROM companies)");

            migrationBuilder.CreateIndex(
                name: "IX_locations_CompanyId",
                table: "locations",
                column: "CompanyId");

            migrationBuilder.AddForeignKey(
                name: "FK_locations_companies_CompanyId",
                table: "locations",
                column: "CompanyId",
                principalTable: "companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_locations_companies_CompanyId",
                table: "locations");

            migrationBuilder.DropIndex(
                name: "IX_locations_CompanyId",
                table: "locations");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "locations");
        }
    }
}
