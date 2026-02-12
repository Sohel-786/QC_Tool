using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

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
        public async Task<ActionResult<ApiResponse<object>>> GetUserPermissions(int userId)
        {
            if (!await CheckPermission("accessSettings"))
                return Forbidden();

            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            
            if (targetUser == null)
            {
                return NotFound(new ApiResponse<object> { Success = false, Message = "User not found" });
            }

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            if (permissions == null)
            {
                permissions = new UserPermission { UserId = userId };
            }

            var allowedDivisionIds = await _context.UserDivisions
                .Where(ud => ud.UserId == userId)
                .Select(ud => ud.DivisionId)
                .ToListAsync();

            return Ok(new ApiResponse<object> { 
                Data = new { 
                    Permissions = permissions, 
                    AllowedDivisionIds = allowedDivisionIds 
                } 
            });
        }

        [HttpPut("permissions/user/{userId}")]
        public async Task<ActionResult<ApiResponse<object>>> UpdatePermissions(int userId, [FromBody] UpdateUserPermissionsRequest request)
        {
            if (!await CheckPermission("accessSettings"))
                return Forbidden();

            if (request.Permissions == null)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Permissions data is required" });

            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            
            if (targetUser == null)
            {
                return NotFound(new ApiResponse<object> { Success = false, Message = "User not found" });
            }

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            
            if (permissions == null)
            {
                permissions = new UserPermission { UserId = userId };
                _context.UserPermissions.Add(permissions);
            }

            var updatedPerms = request.Permissions;

            // Update fields
            permissions.ViewDashboard = updatedPerms.ViewDashboard;
            permissions.ViewMaster = updatedPerms.ViewMaster;
            permissions.ViewDivisionMaster = updatedPerms.ViewDivisionMaster;
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

            // Update Division Access mapping
            var existingMappings = await _context.UserDivisions.Where(ud => ud.UserId == userId).ToListAsync();
            
            // Remove mappings not in the request
            var toRemove = existingMappings.Where(m => !request.AllowedDivisionIds.Contains(m.DivisionId)).ToList();
            _context.UserDivisions.RemoveRange(toRemove);

            // Add new mappings
            var newDivIds = request.AllowedDivisionIds.Where(id => !existingMappings.Any(m => m.DivisionId == id)).ToList();
            foreach (var divId in newDivIds)
            {
                _context.UserDivisions.Add(new UserDivision { UserId = userId, DivisionId = divId });
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { 
                Data = new { 
                    Permissions = permissions, 
                    AllowedDivisionIds = request.AllowedDivisionIds 
                } 
            });
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
            
            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            if (permissions == null)
            {
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
                "viewDivisionMaster" => permissions.ViewDivisionMaster,
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
                perm.ViewDivisionMaster = true;
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
            else
            {
                perm.ViewDashboard = false;
                perm.ViewMaster = false;
                perm.ViewDivisionMaster = false;
                perm.ViewCompanyMaster = false;
                perm.ViewLocationMaster = false;
                perm.ViewContractorMaster = false;
                perm.ViewStatusMaster = false;
                perm.ViewMachineMaster = false;
                perm.ViewItemMaster = false;
                perm.ViewItemCategoryMaster = false;
                perm.ViewOutward = false;
                perm.ViewInward = false;
                perm.ViewReports = false;
                perm.ViewActiveIssuesReport = false;
                perm.ViewMissingItemsReport = false;
                perm.ViewItemHistoryLedgerReport = false;
                perm.ImportExportMaster = false;
                perm.AddOutward = false;
                perm.EditOutward = false;
                perm.AddInward = false;
                perm.EditInward = false;
                perm.AddMaster = false;
                perm.EditMaster = false;
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
