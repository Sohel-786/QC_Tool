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
                // 1. Clear Database Tables for THE CURRENT DIVISION ONLY
                await using var transaction = await _context.Database.BeginTransactionAsync();
                
                try {
                    // Delete Transactional Data first
                    var returns = _context.Returns.Where(r => r.DivisionId == CurrentDivisionId);
                    _context.Returns.RemoveRange(returns);

                    var issues = _context.Issues.Where(i => i.DivisionId == CurrentDivisionId);
                    _context.Issues.RemoveRange(issues);
                    await _context.SaveChangesAsync();

                    // Delete Master Data with dependencies
                    // Note: AuditLogs might not have DivisionId yet if shared, but usually they should
                    // var logs = _context.AuditLogs.Where(l => l.DivisionId == CurrentDivisionId);
                    // _context.AuditLogs.RemoveRange(logs);

                    var items = _context.Items.Where(i => i.DivisionId == CurrentDivisionId);
                    _context.Items.RemoveRange(items);

                    var operators = _context.Operators.Where(o => o.DivisionId == CurrentDivisionId);
                    _context.Operators.RemoveRange(operators);
                    await _context.SaveChangesAsync();
                
                    // Delete baseline Masters
                    var categories = _context.ItemCategories.Where(c => c.DivisionId == CurrentDivisionId);
                    _context.ItemCategories.RemoveRange(categories);

                    var companies = _context.Companies.Where(c => c.DivisionId == CurrentDivisionId);
                    _context.Companies.RemoveRange(companies);

                    var contractors = _context.Contractors.Where(c => c.DivisionId == CurrentDivisionId);
                    _context.Contractors.RemoveRange(contractors);

                    var machines = _context.Machines.Where(m => m.DivisionId == CurrentDivisionId);
                    _context.Machines.RemoveRange(machines);

                    var locations = _context.Locations.Where(l => l.DivisionId == CurrentDivisionId);
                    _context.Locations.RemoveRange(locations);

                    var statuses = _context.Statuses.Where(s => s.DivisionId == CurrentDivisionId);
                    _context.Statuses.RemoveRange(statuses);
                    await _context.SaveChangesAsync();

                    // Delete all users in this division except the one calling this (if they are the primary admin)
                    // or just all non-admin users in this division.
                    var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                    int.TryParse(userIdStr, out int currentUserId);

                    var divisionUsers = _context.Users.Where(u => u.UserDivisions.Any(ud => ud.DivisionId == CurrentDivisionId) && u.Id != currentUserId && u.Username != "qc_admin");
                    _context.Users.RemoveRange(divisionUsers);
                    await _context.SaveChangesAsync();

                    // Delete User Permissions for the users we just deleted
                    var deletedUserIds = await divisionUsers.Select(u => u.Id).ToListAsync();
                    var permsCleanup = _context.UserPermissions.Where(p => deletedUserIds.Contains(p.UserId));
                    _context.UserPermissions.RemoveRange(permsCleanup);
                    await _context.SaveChangesAsync();

                    // Only run DbInitializer if we are in the default division to avoid resetting global AppSettings from sub-divisions
                    if (CurrentDivisionId == 1)
                    {
                        DbInitializer.Initialize(_context);
                    }

                    await transaction.CommitAsync();
                } catch (Exception) {
                    await transaction.RollbackAsync();
                    throw;
                }

                // 2. Clean Storage Files 
                // WARNING: In the current structure, storage is shared. 
                // We only perform full storage wipe if resetting the master division.
                if (CurrentDivisionId == 1)
                {
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
                }

                return Ok(new ApiResponse<string>
                {
                    Success = true,
                    Message = $"Division data has been reset successfully. {(CurrentDivisionId == 1 ? "All system files cleared." : "Storage files were kept as they might be shared.")}",
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
