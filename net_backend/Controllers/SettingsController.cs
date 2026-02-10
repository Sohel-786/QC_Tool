using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("settings")]
    [ApiController]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SettingsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [AllowAnonymous]
        [HttpGet("software")]
        public async Task<ActionResult<ApiResponse<AppSettings>>> GetSoftwareSettings()
        {
            var settings = await _context.AppSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings { CompanyName = "QC Item System" };
                _context.AppSettings.Add(settings);
                await _context.SaveChangesAsync();
            }
            return Ok(new ApiResponse<AppSettings> { Data = settings });
        }

        [HttpPatch("software")]
        [HttpPut("software")]
        public async Task<ActionResult<ApiResponse<AppSettings>>> UpdateSoftwareSettings([FromBody] UpdateSettingsRequest request)
        {
            if (!await CheckPermission("accessSettings"))
                return Forbidden();

            var settings = await _context.AppSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings();
                _context.AppSettings.Add(settings);
            }

            if (request.CompanyName != null) settings.CompanyName = request.CompanyName;
            if (request.SoftwareName != null) settings.SoftwareName = request.SoftwareName;
            if (request.PrimaryColor != null) settings.PrimaryColor = request.PrimaryColor;

            settings.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<AppSettings> { Data = settings });
        }

        [HttpGet("permissions/me")]
        public async Task<ActionResult<ApiResponse<UserPermission>>> GetMyPermissions()
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
            {
                return Unauthorized(new ApiResponse<UserPermission> { Success = false, Message = "User ID not found" });
            }

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            
            // If no permissions found, create default based on role
            if (permissions == null)
            {
                var user = await _context.Users.FindAsync(userId);
                if (user != null)
                {
                    permissions = CreateDefaultPermissions(user.Id, user.Role);
                    _context.UserPermissions.Add(permissions);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    return NotFound(new ApiResponse<UserPermission> { Success = false, Message = "User not found" });
                }
            }

            return Ok(new ApiResponse<UserPermission> { Success = true, Data = permissions });
        }

        [HttpGet("permissions/user/{userId}")]
        public async Task<ActionResult<ApiResponse<UserPermission>>> GetUserPermissions(int userId)
        {
            if (!await CheckPermission("accessSettings"))
                return Forbidden();

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            
            if (permissions == null)
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(new ApiResponse<UserPermission> { Success = false, Message = "User not found" });
                }
                
                // Create default if not exists
                permissions = CreateDefaultPermissions(user.Id, user.Role);
                _context.UserPermissions.Add(permissions);
                await _context.SaveChangesAsync();
            }

            return Ok(new ApiResponse<UserPermission> { Data = permissions });
        }

        [HttpPut("permissions/user/{userId}")]
        public async Task<ActionResult<ApiResponse<UserPermission>>> UpdateUserPermissions(int userId, [FromBody] UserPermission updatedPerms)
        {
            if (!await CheckPermission("accessSettings"))
                return Forbidden();

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            
            if (permissions == null)
            {
                 var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(new ApiResponse<UserPermission> { Success = false, Message = "User not found" });
                }
                permissions = new UserPermission { UserId = userId };
                _context.UserPermissions.Add(permissions);
            }

            // Update fields
            permissions.ViewDashboard = updatedPerms.ViewDashboard;
            permissions.ViewMaster = updatedPerms.ViewMaster;
            permissions.ViewCompanyMaster = updatedPerms.ViewCompanyMaster;
            permissions.ViewLocationMaster = updatedPerms.ViewLocationMaster;
            permissions.ViewContractorMaster = updatedPerms.ViewContractorMaster;
            permissions.ViewStatusMaster = updatedPerms.ViewStatusMaster;
            permissions.ViewMachineMaster = updatedPerms.ViewMachineMaster;
            permissions.ViewItemMaster = updatedPerms.ViewItemMaster;
            permissions.ViewItemCategoryMaster = updatedPerms.ViewItemCategoryMaster;
            permissions.ViewOutward = updatedPerms.ViewOutward;
            permissions.ViewInward = updatedPerms.ViewInward;
            permissions.ViewReports = updatedPerms.ViewReports;
            permissions.ViewActiveIssuesReport = updatedPerms.ViewActiveIssuesReport;
            permissions.ViewMissingItemsReport = updatedPerms.ViewMissingItemsReport;
            permissions.ViewItemHistoryLedgerReport = updatedPerms.ViewItemHistoryLedgerReport;
            permissions.ImportExportMaster = updatedPerms.ImportExportMaster;
            permissions.AddOutward = updatedPerms.AddOutward;
            permissions.EditOutward = updatedPerms.EditOutward;
            permissions.AddInward = updatedPerms.AddInward;
            permissions.EditInward = updatedPerms.EditInward;
            permissions.AddMaster = updatedPerms.AddMaster;
            permissions.EditMaster = updatedPerms.EditMaster;
            permissions.ManageUsers = updatedPerms.ManageUsers;
            permissions.AccessSettings = updatedPerms.AccessSettings;
            if (updatedPerms.NavigationLayout != null) permissions.NavigationLayout = updatedPerms.NavigationLayout;
            
            permissions.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<UserPermission> { Data = permissions });
        }

        [HttpPost("software/logo")]
        public async Task<ActionResult<object>> UpdateLogo([FromForm] IFormFile logo)
        {
            if (!await CheckPermission("accessSettings"))
                return Forbidden();

            if (logo == null || logo.Length == 0)
                return BadRequest(new ApiResponse<AppSettings> { Success = false, Message = "No logo file uploaded" });

            var settings = await _context.AppSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings { CompanyName = "QC Item System" };
                _context.AppSettings.Add(settings);
            }

            var fileName = $"logo-{Guid.NewGuid()}{Path.GetExtension(logo.FileName)}";
            var uploads = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "storage", "settings");
            Directory.CreateDirectory(uploads);
            var filePath = Path.Combine(uploads, fileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await logo.CopyToAsync(fileStream);
            }

            var relativePath = $"settings/{fileName}";
            settings.CompanyLogo = relativePath;
            settings.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new { 
                Success = true, 
                Data = settings, 
                LogoUrl = $"/storage/{relativePath}" 
            });
        }

        private async Task<bool> CheckPermission(string permissionKey)
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId)) return false;
            
            // Check if admin role - admins always have full access potentially, 
            // but for this granular path we check the permission record.
            // However, to prevent lockout, if no permission record exists for an admin, we assume true or create one.
            
            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            if (permissions == null)
            {
                // Fallback: If user is QC_ADMIN, grant success.
                var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                if (role == "QC_ADMIN") return true;
                return false;
            }

            return permissionKey switch
            {
                "accessSettings" => permissions.AccessSettings,
                "manageUsers" => permissions.ManageUsers,
                "viewDashboard" => permissions.ViewDashboard,
                "viewMaster" => permissions.ViewMaster,
                "viewCompanyMaster" => permissions.ViewCompanyMaster,
                "viewLocationMaster" => permissions.ViewLocationMaster,
                "viewContractorMaster" => permissions.ViewContractorMaster,
                "viewStatusMaster" => permissions.ViewStatusMaster,
                "viewMachineMaster" => permissions.ViewMachineMaster,
                "viewItemMaster" => permissions.ViewItemMaster,
                "viewItemCategoryMaster" => permissions.ViewItemCategoryMaster,
                "viewOutward" => permissions.ViewOutward,
                "viewInward" => permissions.ViewInward,
                "viewReports" => permissions.ViewReports,
                "viewActiveIssuesReport" => permissions.ViewActiveIssuesReport,
                "viewMissingItemsReport" => permissions.ViewMissingItemsReport,
                "viewItemHistoryLedgerReport" => permissions.ViewItemHistoryLedgerReport,
                "importExportMaster" => permissions.ImportExportMaster,
                "addOutward" => permissions.AddOutward,
                "editOutward" => permissions.EditOutward,
                "addInward" => permissions.AddInward,
                "editInward" => permissions.EditInward,
                "addMaster" => permissions.AddMaster,
                "editMaster" => permissions.EditMaster,
                _ => false
            };
        }

        private UserPermission CreateDefaultPermissions(int userId, Role role)
        {
            var perm = new UserPermission
            {
                UserId = userId,
                NavigationLayout = "VERTICAL",
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            if (role == Role.QC_ADMIN)
            {
                perm.ViewDashboard = true;
                perm.ViewMaster = true;
                perm.ViewCompanyMaster = true;
                perm.ViewLocationMaster = true;
                perm.ViewContractorMaster = true;
                perm.ViewStatusMaster = true;
                perm.ViewMachineMaster = true;
                perm.ViewItemMaster = true;
                perm.ViewItemCategoryMaster = true;
                perm.ViewOutward = true;
                perm.ViewInward = true;
                perm.ViewReports = true;
                perm.ViewActiveIssuesReport = true;
                perm.ViewMissingItemsReport = true;
                perm.ViewItemHistoryLedgerReport = true;
                perm.ImportExportMaster = true;
                perm.AddOutward = true;
                perm.EditOutward = true;
                perm.AddInward = true;
                perm.EditInward = true;
                perm.AddMaster = true;
                perm.EditMaster = true;
                perm.ManageUsers = true;
                perm.AccessSettings = true;
            }
            else if (role == Role.QC_MANAGER)
            {
                perm.ViewDashboard = true;
                perm.ViewMaster = true;
                perm.ViewCompanyMaster = true;
                perm.ViewLocationMaster = true;
                perm.ViewContractorMaster = true;
                perm.ViewStatusMaster = true;
                perm.ViewMachineMaster = true;
                perm.ViewItemMaster = true;
                perm.ViewItemCategoryMaster = true;
                perm.ViewOutward = true;
                perm.ViewInward = true;
                perm.ViewReports = true;
                perm.ViewActiveIssuesReport = true;
                perm.ViewMissingItemsReport = true;
                perm.ViewItemHistoryLedgerReport = true;
                perm.ImportExportMaster = true;
                perm.AddOutward = true;
                perm.EditOutward = true;
                perm.AddInward = true;
                perm.EditInward = true;
                perm.AddMaster = true;
                perm.EditMaster = true;
                perm.ManageUsers = false;
                perm.AccessSettings = false;
            }
            else
            {
                // QC_USER
                perm.ViewDashboard = true;
                perm.ViewMaster = true;
                perm.ViewCompanyMaster = true;
                perm.ViewLocationMaster = true;
                perm.ViewContractorMaster = true;
                perm.ViewStatusMaster = true;
                perm.ViewMachineMaster = true;
                perm.ViewItemMaster = true;
                perm.ViewItemCategoryMaster = true;
                perm.ViewOutward = true;
                perm.ViewInward = true;
                perm.ViewReports = true;
                perm.ViewActiveIssuesReport = true;
                perm.ViewMissingItemsReport = true;
                perm.ViewItemHistoryLedgerReport = true;
                perm.ImportExportMaster = false;
                perm.AddOutward = true;
                perm.EditOutward = true;
                perm.AddInward = true;
                perm.EditInward = true;
                perm.AddMaster = true;
                perm.EditMaster = true;
                perm.ManageUsers = false;
                perm.AccessSettings = false;
            }

            return perm;
        }
        private ActionResult Forbidden()
        {
            return StatusCode(403, new ApiResponse<object> { Success = false, Message = "You do not have permission to perform this action." });
        }
    }
}
