using net_backend.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;

namespace net_backend.Data
{
    public static class DbInitializer
    {
        public static void Initialize(ApplicationDbContext context)
        {
            context.Database.EnsureCreated();

            // 0. Seed Default Division if none exists
            if (!context.Divisions.Any())
            {
                context.Divisions.Add(new Division 
                { 
                    Name = "QC", 
                    IsActive = true, 
                    CreatedAt = DateTime.Now, 
                    UpdatedAt = DateTime.Now 
                });
                context.SaveChanges();
            }

            var defaultDivision = context.Divisions.First();

            // 1. Ensure Admin User Exists with Correct Password
            var adminUser = context.Users.FirstOrDefault(u => u.Username == "mitul");
            if (adminUser == null)
            {
                adminUser = new User 
                { 
                    Username = "mitul", 
                    Password = BCrypt.Net.BCrypt.HashPassword("admin"), 
                    FirstName = "Mitul", 
                    LastName = "Modi", 
                    Role = Role.QC_ADMIN, 
                    IsActive = true, 
                    CreatedAt = DateTime.Now, 
                    UpdatedAt = DateTime.Now 
                };
                context.Users.Add(adminUser);
                context.SaveChanges();
            }
            else
            {
                // Reset password to ensure access
                adminUser.Password = BCrypt.Net.BCrypt.HashPassword("admin");
                context.SaveChanges();
            }

            // Ensure Admin has access to Default Division
            if (!context.UserDivisions.Any(ud => ud.UserId == adminUser.Id && ud.DivisionId == defaultDivision.Id))
            {
                context.UserDivisions.Add(new UserDivision
                {
                    UserId = adminUser.Id,
                    DivisionId = defaultDivision.Id
                });
                context.SaveChanges();
            }

            // 2. Seed/Reset App Settings (Fresh Start)
            var settings = context.AppSettings.FirstOrDefault();
            if (settings == null)
            {
                context.AppSettings.Add(new AppSettings 
                { 
                    CompanyName = "Aira Euro Automation Pvt Ltd", 
                    SoftwareName = "QC Tool Management",
                    CreatedAt = DateTime.Now, 
                    UpdatedAt = DateTime.Now 
                });
            }
            else
            {
                settings.CompanyName = "Aira Euro Automation Pvt Ltd";
                settings.CompanyLogo = null;
                settings.SoftwareName = "QC Tool Management";
                settings.PrimaryColor = null;
                settings.SupportEmail = null;
                settings.SupportPhone = null;
                settings.Address = null;
                settings.Website = null;
                settings.UpdatedAt = DateTime.Now;
            }
            context.SaveChanges();

            // 3. Seed Statuses (Essential for functionality)
            if (!context.Statuses.Any())
            {
                context.Statuses.AddRange(new Status[] {
                    new Status { Name = "Available", IsActive = true, DivisionId = defaultDivision.Id, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new Status { Name = "Missing", IsActive = true, DivisionId = defaultDivision.Id, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now }
                });
                context.SaveChanges();
            }

            // 4. Seed User Permissions
            if (!context.UserPermissions.Any())
            {
                var adminUserForPerms = context.Users.FirstOrDefault(u => u.Username == "mitul");
                if (adminUserForPerms != null)
                {
                    var adminPerm = new UserPermission
                    {
                        UserId = adminUserForPerms.Id,
                        ViewDashboard = true,
                        ViewMaster = true,
                        ViewCompanyMaster = true,
                        ViewLocationMaster = true,
                        ViewContractorMaster = true,
                        ViewStatusMaster = true,
                        ViewMachineMaster = true,
                        ViewItemMaster = true,
                        ViewItemCategoryMaster = true,
                        ViewOutward = true,
                        ViewInward = true,
                        ViewReports = true,
                        ViewActiveIssuesReport = true,
                        ViewMissingItemsReport = true,
                        ViewItemHistoryLedgerReport = true,
                        ImportExportMaster = true,
                        AddOutward = true,
                        EditOutward = true,
                        AddInward = true,
                        EditInward = true,
                        AddMaster = true,
                        EditMaster = true,
                        ManageUsers = true,
                        AccessSettings = true,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    };
                    context.UserPermissions.Add(adminPerm);
                    context.SaveChanges();
                }
            }
        }
    }
}
