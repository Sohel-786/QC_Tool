using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.Models;
using net_backend.DTOs;
using System.IO;
using net_backend.Services; // Assuming IDivisionService is here
using System.Linq; // For .Where() and .Select()
using System.Security.Claims; // For ClaimTypes

namespace net_backend.Controllers
{
    [Route("maintenance")]
    [ApiController]
    [Authorize(Roles = "QC_ADMIN")]
    public class MaintenanceController : DivisionIsolatedController
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;

        public MaintenanceController(ApplicationDbContext context, IWebHostEnvironment env, IDivisionService divisionService)
            : base(divisionService)
        {
            _context = context;
            _env = env;
        }

        [HttpPost("reset-system")]
        public async Task<IActionResult> ResetSystem()
        {
            try
            {
                // 1. Clear Database Tables - GLOBAL WIPE
                await using var transaction = await _context.Database.BeginTransactionAsync();
                
                try {
                    // Delete Transactional Data (Global)
                    _context.Returns.RemoveRange(_context.Returns);
                    _context.Issues.RemoveRange(_context.Issues);
                    _context.AuditLogs.RemoveRange(_context.AuditLogs);
                    await _context.SaveChangesAsync();

                    // Delete Master Data (Global)
                    _context.Items.RemoveRange(_context.Items);
                    _context.Operators.RemoveRange(_context.Operators);
                    _context.ItemCategories.RemoveRange(_context.ItemCategories);
                    _context.Companies.RemoveRange(_context.Companies);
                    _context.Contractors.RemoveRange(_context.Contractors);
                    _context.Machines.RemoveRange(_context.Machines);
                    _context.Locations.RemoveRange(_context.Locations);
                    _context.Statuses.RemoveRange(_context.Statuses);
                    await _context.SaveChangesAsync();

                    // Delete User-related Data
                    _context.UserPermissions.RemoveRange(_context.UserPermissions);
                    _context.UserDivisions.RemoveRange(_context.UserDivisions);
                    await _context.SaveChangesAsync();
                    
                    // Delete all users except 'qc_admin'
                    var otherUsers = _context.Users.Where(u => u.Username != "qc_admin");
                    _context.Users.RemoveRange(otherUsers);
                    await _context.SaveChangesAsync();

                    // Delete all divisions except 'QC'
                    var otherDivisions = _context.Divisions.Where(d => d.Name != "QC");
                    _context.Divisions.RemoveRange(otherDivisions);
                    await _context.SaveChangesAsync();

                    // 2. Clean Storage Files (Full Wipe)
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

                        // Re-create structure
                        Directory.CreateDirectory(Path.Combine(storagePath, "items"));
                        Directory.CreateDirectory(Path.Combine(storagePath, "inwards"));
                        Directory.CreateDirectory(Path.Combine(storagePath, "settings"));
                    }

                    // 3. Re-initialize baseline data (Admin, QC Division, Default Statuses)
                    DbInitializer.Initialize(_context);

                    await transaction.CommitAsync();
                } catch (Exception) {
                    await transaction.RollbackAsync();
                    throw;
                }

                return Ok(new ApiResponse<string>
                {
                    Success = true,
                    Message = "System has been reset successfully. All data removed except primary admin and QC division.",
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
