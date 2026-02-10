using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.Models;
using net_backend.DTOs;
using System.IO;

namespace net_backend.Controllers
{
    [Route("maintenance")]
    [ApiController]
    [Authorize(Roles = "QC_ADMIN")]
    public class MaintenanceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;

        public MaintenanceController(ApplicationDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpPost("reset-system")]
        public async Task<IActionResult> ResetSystem()
        {
            try
            {
                // 1. Clear Database Tables in Order to Respect Foreign Keys
                // We'll use a transaction for safety
                await using var transaction = await _context.Database.BeginTransactionAsync();
                
                try {
                    // Delete Transactional Data first
                    _context.Returns.RemoveRange(_context.Returns);
                    _context.Issues.RemoveRange(_context.Issues);
                    await _context.SaveChangesAsync();

                    // Delete Master Data with dependencies
                    _context.AuditLogs.RemoveRange(_context.AuditLogs);
                    _context.Items.RemoveRange(_context.Items);
                    _context.Operators.RemoveRange(_context.Operators);
                    await _context.SaveChangesAsync();
                
                    // Delete baseline Masters
                    _context.ItemCategories.RemoveRange(_context.ItemCategories);
                    _context.Companies.RemoveRange(_context.Companies);
                    _context.Contractors.RemoveRange(_context.Contractors);
                    _context.Machines.RemoveRange(_context.Machines);
                    _context.Locations.RemoveRange(_context.Locations);
                    _context.Statuses.RemoveRange(_context.Statuses);
                    await _context.SaveChangesAsync();

                    // Delete all users except for the persistent Admin
                    var nonAdminUsers = _context.Users.Where(u => u.Role != Role.QC_ADMIN);
                    _context.Users.RemoveRange(nonAdminUsers);
                    await _context.SaveChangesAsync();

                    // Delete User Permissions to get a fresh seed
                    _context.UserPermissions.RemoveRange(_context.UserPermissions);
                    await _context.SaveChangesAsync();

                    // Software/App Settings will be reset in DbInitializer, 
                    // but we can clear them here too if preferred. 
                    // For now, let's rely on DbInitializer.Initialize logic.

                    // Ensure admin exists (re-reseed if necessary)
                    DbInitializer.Initialize(_context);

                    await transaction.CommitAsync();
                } catch (Exception) {
                    await transaction.RollbackAsync();
                    throw;
                }

                // 2. Clean Storage Files (recursively clean everything in wwwroot/storage)
                var storagePath = Path.Combine(_env.ContentRootPath, "wwwroot", "storage");
                if (Directory.Exists(storagePath))
                {
                    var di = new DirectoryInfo(storagePath);

                    foreach (FileInfo file in di.GetFiles()) {
                        file.Delete(); 
                    }
                    foreach (DirectoryInfo dir in di.GetDirectories()) {
                        dir.Delete(true); 
                    }

                    // Re-create the standard directory structure for imports/uploads
                    Directory.CreateDirectory(Path.Combine(storagePath, "items"));
                    Directory.CreateDirectory(Path.Combine(storagePath, "inwards"));
                    Directory.CreateDirectory(Path.Combine(storagePath, "settings"));
                }

                return Ok(new ApiResponse<string>
                {
                    Success = true,
                    Message = "System has been reset successfully. All data and files have been cleared. Admin account is ready for a fresh start.",
                    Data = "Success"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<string>
                {
                    Success = false,
                    Message = $"Reset failed: {ex.Message}"
                });
            }
        }
    }
}
