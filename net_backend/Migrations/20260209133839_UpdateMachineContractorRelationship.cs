using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class UpdateMachineContractorRelationship : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_locations_companies_CompanyId",
                table: "locations");

            migrationBuilder.AddColumn<int>(
                name: "ContractorId",
                table: "machines",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Assign existing machines to the first available contractor to avoid FK violation
            migrationBuilder.Sql("IF EXISTS (SELECT 1 FROM contractors) UPDATE machines SET ContractorId = (SELECT TOP 1 Id FROM contractors) WHERE ContractorId = 0 OR ContractorId NOT IN (SELECT Id FROM contractors)");

            migrationBuilder.CreateIndex(
                name: "IX_machines_ContractorId",
                table: "machines",
                column: "ContractorId");

            migrationBuilder.AddForeignKey(
                name: "FK_locations_companies_CompanyId",
                table: "locations",
                column: "CompanyId",
                principalTable: "companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_machines_contractors_ContractorId",
                table: "machines",
                column: "ContractorId",
                principalTable: "contractors",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_locations_companies_CompanyId",
                table: "locations");

            migrationBuilder.DropForeignKey(
                name: "FK_machines_contractors_ContractorId",
                table: "machines");

            migrationBuilder.DropIndex(
                name: "IX_machines_ContractorId",
                table: "machines");

            migrationBuilder.DropColumn(
                name: "ContractorId",
                table: "machines");

            migrationBuilder.AddForeignKey(
                name: "FK_locations_companies_CompanyId",
                table: "locations",
                column: "CompanyId",
                principalTable: "companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
