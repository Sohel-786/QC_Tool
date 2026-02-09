using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddGranularReportPermissions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ViewActiveIssuesReport",
                table: "role_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ViewItemHistoryLedgerReport",
                table: "role_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ViewMissingItemsReport",
                table: "role_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql("UPDATE role_permissions SET ViewActiveIssuesReport = ViewReports, ViewItemHistoryLedgerReport = ViewReports, ViewMissingItemsReport = ViewReports");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ViewActiveIssuesReport",
                table: "role_permissions");

            migrationBuilder.DropColumn(
                name: "ViewItemHistoryLedgerReport",
                table: "role_permissions");

            migrationBuilder.DropColumn(
                name: "ViewMissingItemsReport",
                table: "role_permissions");
        }
    }
}
