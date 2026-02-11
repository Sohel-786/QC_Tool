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

            // 1. Seed Users (Only Minimal Admin)
            if (!context.Users.Any())
            {
                var users = new User[]
                {
                    new User { Username = "qc_admin", Password = BCrypt.Net.BCrypt.HashPassword("admin123"), FirstName = "QC", LastName = "Admin", Role = Role.QC_ADMIN, IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now }
                };
                context.Users.AddRange(users);
                context.SaveChanges();
            }

            // 2. Seed/Reset App Settings (Fresh Start)
            var settings = context.AppSettings.FirstOrDefault();
            if (settings == null)
            {
                context.AppSettings.Add(new AppSettings 
                { 
                    CompanyName = "QC Item System", 
                    SoftwareName = "QC Tool",
                    CreatedAt = DateTime.Now, 
                    UpdatedAt = DateTime.Now 
                });
            }
            else
            {
                settings.CompanyName = "QC Item System";
                settings.CompanyLogo = null;
                settings.SoftwareName = "QC Tool";
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
                    new Status { Name = "Available", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new Status { Name = "Missing", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now }
                });
                context.SaveChanges();
            }

            // 4. Seed User Permissions
            if (!context.UserPermissions.Any())
            {
                var adminUser = context.Users.FirstOrDefault(u => u.Role == Role.QC_ADMIN);
                if (adminUser != null)
                {
                    var adminPerm = new UserPermission
                    {
                        UserId = adminUser.Id,
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
            // 5. Update Existing Contractors Phone Number
            var contractorsToUpdate = context.Contractors.ToList();
            foreach (var c in contractorsToUpdate)
            {
                c.PhoneNumber = "9662106701";
            }
            context.SaveChanges();

            // NOTE: Master data (Items, Companies, etc.) and Transactions (Issues, Returns)
            // are NOT seeded to ensure a completely fresh start as requested by the user.
        }
    }
}
