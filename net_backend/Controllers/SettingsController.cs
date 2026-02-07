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
        public async Task<ActionResult<ApiResponse<RolePermission>>> GetMyPermissions()
        {
            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (string.IsNullOrEmpty(role))
            {
                return Unauthorized(new ApiResponse<RolePermission> { Success = false, Message = "User role not found" });
            }

            var permissions = await _context.RolePermissions.FirstOrDefaultAsync(p => p.Role == role);
            if (permissions == null)
            {
                return NotFound(new ApiResponse<RolePermission> { Success = false, Message = "Permissions not found for role: " + role });
            }

            return Ok(new ApiResponse<RolePermission> { Success = true, Data = permissions });
        }

        [HttpGet("permissions")]
        public async Task<ActionResult<ApiResponse<IEnumerable<RolePermission>>>> GetPermissions()
        {
            if (!await CheckPermission("accessSettings"))
                return Forbidden();

            var permissions = await _context.RolePermissions.ToListAsync();
            return Ok(new ApiResponse<IEnumerable<RolePermission>> { Data = permissions });
        }

        [HttpPatch("permissions")]
        [HttpPut("permissions")]
        public async Task<ActionResult<ApiResponse<IEnumerable<RolePermission>>>> UpdatePermissions([FromBody] UpdatePermissionsRequest request)
        {
            if (!await CheckPermission("accessSettings"))
                return Forbidden();

            foreach (var perm in request.Permissions)
            {
                var existing = await _context.RolePermissions.FirstOrDefaultAsync(p => p.Role == perm.Role);
                if (existing != null)
                {
                    // Update existing fields individually to avoid ID conflicts or unintended overwrites
                    existing.ViewDashboard = perm.ViewDashboard;
                    existing.ViewMaster = perm.ViewMaster;
                    existing.ViewOutward = perm.ViewOutward;
                    existing.ViewInward = perm.ViewInward;
                    existing.ViewReports = perm.ViewReports;
                    existing.ImportExportMaster = perm.ImportExportMaster;
                    existing.AddOutward = perm.AddOutward;
                    existing.EditOutward = perm.EditOutward;
                    existing.AddInward = perm.AddInward;
                    existing.EditInward = perm.EditInward;
                    existing.AddMaster = perm.AddMaster;
                    existing.EditMaster = perm.EditMaster;
                    existing.ManageUsers = perm.ManageUsers;
                    existing.AccessSettings = perm.AccessSettings;
                    existing.NavigationLayout = perm.NavigationLayout ?? "VERTICAL";
                    existing.UpdatedAt = DateTime.Now;
                }
                else
                {
                    // Add new
                    perm.CreatedAt = DateTime.Now;
                    perm.UpdatedAt = DateTime.Now;
                    if (string.IsNullOrEmpty(perm.NavigationLayout)) perm.NavigationLayout = "VERTICAL";
                    _context.RolePermissions.Add(perm);
                }
            }

            await _context.SaveChangesAsync();
            var all = await _context.RolePermissions.ToListAsync();
            return Ok(new ApiResponse<IEnumerable<RolePermission>> { Data = all });
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
            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (string.IsNullOrEmpty(role)) return false;
            
            if (role == "QC_ADMIN") return true;

            var permissions = await _context.RolePermissions.FirstOrDefaultAsync(p => p.Role == role);
            if (permissions == null) return false;

            return permissionKey switch
            {
                "accessSettings" => permissions.AccessSettings,
                "manageUsers" => permissions.ManageUsers,
                "viewDashboard" => permissions.ViewDashboard,
                "viewMaster" => permissions.ViewMaster,
                "viewOutward" => permissions.ViewOutward,
                "viewInward" => permissions.ViewInward,
                "viewReports" => permissions.ViewReports,
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

        private ActionResult Forbidden()
        {
            return StatusCode(403, new { Success = false, Message = "You do not have permission to perform this action." });
        }
    }
}
