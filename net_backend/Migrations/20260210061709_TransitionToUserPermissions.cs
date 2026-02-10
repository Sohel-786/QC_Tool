using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class TransitionToUserPermissions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "role_permissions");

            migrationBuilder.CreateTable(
                name: "user_permissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    ViewDashboard = table.Column<bool>(type: "bit", nullable: false),
                    ViewMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewCompanyMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewLocationMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewContractorMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewStatusMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewMachineMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewItemMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewItemCategoryMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewOutward = table.Column<bool>(type: "bit", nullable: false),
                    ViewInward = table.Column<bool>(type: "bit", nullable: false),
                    ViewReports = table.Column<bool>(type: "bit", nullable: false),
                    ViewActiveIssuesReport = table.Column<bool>(type: "bit", nullable: false),
                    ViewMissingItemsReport = table.Column<bool>(type: "bit", nullable: false),
                    ViewItemHistoryLedgerReport = table.Column<bool>(type: "bit", nullable: false),
                    ImportExportMaster = table.Column<bool>(type: "bit", nullable: false),
                    AddOutward = table.Column<bool>(type: "bit", nullable: false),
                    EditOutward = table.Column<bool>(type: "bit", nullable: false),
                    AddInward = table.Column<bool>(type: "bit", nullable: false),
                    EditInward = table.Column<bool>(type: "bit", nullable: false),
                    AddMaster = table.Column<bool>(type: "bit", nullable: false),
                    EditMaster = table.Column<bool>(type: "bit", nullable: false),
                    ManageUsers = table.Column<bool>(type: "bit", nullable: false),
                    AccessSettings = table.Column<bool>(type: "bit", nullable: false),
                    NavigationLayout = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_permissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_permissions_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_user_permissions_UserId",
                table: "user_permissions",
                column: "UserId",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_permissions");

            migrationBuilder.CreateTable(
                name: "role_permissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AccessSettings = table.Column<bool>(type: "bit", nullable: false),
                    AddInward = table.Column<bool>(type: "bit", nullable: false),
                    AddMaster = table.Column<bool>(type: "bit", nullable: false),
                    AddOutward = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EditInward = table.Column<bool>(type: "bit", nullable: false),
                    EditMaster = table.Column<bool>(type: "bit", nullable: false),
                    EditOutward = table.Column<bool>(type: "bit", nullable: false),
                    ImportExportMaster = table.Column<bool>(type: "bit", nullable: false),
                    ManageUsers = table.Column<bool>(type: "bit", nullable: false),
                    NavigationLayout = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ViewActiveIssuesReport = table.Column<bool>(type: "bit", nullable: false),
                    ViewCompanyMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewContractorMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewDashboard = table.Column<bool>(type: "bit", nullable: false),
                    ViewInward = table.Column<bool>(type: "bit", nullable: false),
                    ViewItemCategoryMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewItemHistoryLedgerReport = table.Column<bool>(type: "bit", nullable: false),
                    ViewItemMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewLocationMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewMachineMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewMissingItemsReport = table.Column<bool>(type: "bit", nullable: false),
                    ViewOutward = table.Column<bool>(type: "bit", nullable: false),
                    ViewReports = table.Column<bool>(type: "bit", nullable: false),
                    ViewStatusMaster = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role_permissions", x => x.Id);
                });
        }
    }
}
