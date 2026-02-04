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
            var permissions = await _context.RolePermissions.ToListAsync();
            return Ok(new ApiResponse<IEnumerable<RolePermission>> { Data = permissions });
        }

        [HttpPatch("permissions")]
        [HttpPut("permissions")]
        public async Task<ActionResult<ApiResponse<IEnumerable<RolePermission>>>> UpdatePermissions([FromBody] UpdatePermissionsRequest request)
        {
            foreach (var perm in request.Permissions)
            {
                var existing = await _context.RolePermissions.FirstOrDefaultAsync(p => p.Role == perm.Role);
                if (existing != null)
                {
                    // Update existing
                    _context.Entry(existing).CurrentValues.SetValues(perm);
                    existing.UpdatedAt = DateTime.Now;
                }
                else
                {
                    // Add new
                    perm.CreatedAt = DateTime.Now;
                    perm.UpdatedAt = DateTime.Now;
                    _context.RolePermissions.Add(perm);
                }
            }

            await _context.SaveChangesAsync();
            var all = await _context.RolePermissions.ToListAsync();
            return Ok(new ApiResponse<IEnumerable<RolePermission>> { Data = all });
        }
        [HttpPost("software/logo")]
        public async Task<ActionResult<ApiResponse<AppSettings>>> UpdateLogo(IFormFile logo)
        {
            if (logo == null || logo.Length == 0)
                return BadRequest(new ApiResponse<AppSettings> { Success = false, Message = "No file uploaded" });

            var settings = await _context.AppSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings();
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

            settings.CompanyLogo = $"settings/{fileName}";
            settings.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<AppSettings> { Data = settings });
        }
    }
}
