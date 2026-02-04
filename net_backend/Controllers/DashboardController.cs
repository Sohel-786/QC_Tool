using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("dashboard")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DashboardController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("metrics")]
        public async Task<ActionResult<ApiResponse<object>>> GetMetrics()
        {
            var totalItems = await _context.Items.CountAsync();
            var itemsIssued = await _context.Items.CountAsync(i => i.Status == ItemStatus.ISSUED);
            var itemsAvailable = await _context.Items.CountAsync(i => i.Status == ItemStatus.AVAILABLE);
            var itemsMissing = await _context.Items.CountAsync(i => i.Status == ItemStatus.MISSING);

            var totalIssues = await _context.Issues.CountAsync();
            var activeIssues = await _context.Issues.CountAsync(i => !i.IsReturned);

            var totalReturns = await _context.Returns.CountAsync();

            var result = new
            {
                items = new { total = totalItems, available = itemsAvailable, issued = itemsIssued, missing = itemsMissing },
                issues = new { total = totalIssues, active = activeIssues },
                returns = new { total = totalReturns }
            };

            return Ok(new ApiResponse<object> { Data = result });
        }

        [HttpGet("available-items")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Item>>>> GetAvailableItems([FromQuery] string? search, [FromQuery] string? categoryIds)
        {
            var query = _context.Items.Where(i => i.Status == ItemStatus.AVAILABLE && i.IsActive);
            
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(i => i.ItemName.Contains(search) || i.SerialNumber.Contains(search) || (i.Description != null && i.Description.Contains(search)));
            }

            if (!string.IsNullOrEmpty(categoryIds))
            {
                var ids = categoryIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.CategoryId.HasValue && ids.Contains(i.CategoryId.Value));
            }

            var items = await query.Include(i => i.Category).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Item>> { Data = items });
        }

        [HttpGet("total-items")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Item>>>> GetTotalItems([FromQuery] string? search, [FromQuery] string? categoryIds)
        {
            var query = _context.Items.AsQueryable();
            
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(i => i.ItemName.Contains(search) || i.SerialNumber.Contains(search) || (i.Description != null && i.Description.Contains(search)));
            }

            if (!string.IsNullOrEmpty(categoryIds))
            {
                var ids = categoryIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.CategoryId.HasValue && ids.Contains(i.CategoryId.Value));
            }

            var items = await query.Include(i => i.Category).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Item>> { Data = items });
        }

        [HttpGet("missing-items")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Item>>>> GetMissingItems([FromQuery] string? search, [FromQuery] string? categoryIds)
        {
            var query = _context.Items.Where(i => i.Status == ItemStatus.MISSING);
            
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(i => i.ItemName.Contains(search) || i.SerialNumber.Contains(search) || (i.Description != null && i.Description.Contains(search)));
            }

            if (!string.IsNullOrEmpty(categoryIds))
            {
                var ids = categoryIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.CategoryId.HasValue && ids.Contains(i.CategoryId.Value));
            }

            var items = await query.Include(i => i.Category).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Item>> { Data = items });
        }
        [HttpGet("export/total-items")]
        public async Task<IActionResult> ExportTotalItems([FromQuery] string? search, [FromQuery] string? categoryIds)
        {
            var query = _context.Items.Include(i => i.Category).AsQueryable();
            if (!string.IsNullOrEmpty(search))
                query = query.Where(i => i.ItemName.Contains(search) || i.SerialNumber.Contains(search));
            if (!string.IsNullOrEmpty(categoryIds))
            {
                var ids = categoryIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.CategoryId.HasValue && ids.Contains(i.CategoryId.Value));
            }

            var items = await query.ToListAsync();
            var csv = "Item Name,Serial Number,Category,Status,Purchase Date\n" + 
                      string.Join("\n", items.Select(i => $"\"{i.ItemName}\",\"{i.SerialNumber}\",\"{i.Category?.Name}\",\"{i.Status}\",\"{i.PurchaseDate:yyyy-MM-dd}\""));
            
            return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "total_items.csv");
        }

        [HttpGet("export/available-items")]
        public async Task<IActionResult> ExportAvailableItems([FromQuery] string? search, [FromQuery] string? categoryIds)
        {
            var query = _context.Items.Include(i => i.Category).Where(i => i.Status == ItemStatus.AVAILABLE && i.IsActive);
            if (!string.IsNullOrEmpty(search))
                query = query.Where(i => i.ItemName.Contains(search) || i.SerialNumber.Contains(search));
            if (!string.IsNullOrEmpty(categoryIds))
            {
                var ids = categoryIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.CategoryId.HasValue && ids.Contains(i.CategoryId.Value));
            }

            var items = await query.ToListAsync();
            var csv = "Item Name,Serial Number,Category,Purchase Date\n" + 
                      string.Join("\n", items.Select(i => $"\"{i.ItemName}\",\"{i.SerialNumber}\",\"{i.Category?.Name}\",\"{i.PurchaseDate:yyyy-MM-dd}\""));
            
            return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "available_items.csv");
        }

        [HttpGet("export/missing-items")]
        public async Task<IActionResult> ExportMissingItems([FromQuery] string? search, [FromQuery] string? categoryIds)
        {
            var query = _context.Items.Include(i => i.Category).Where(i => i.Status == ItemStatus.MISSING);
            if (!string.IsNullOrEmpty(search))
                query = query.Where(i => i.ItemName.Contains(search) || i.SerialNumber.Contains(search));
            if (!string.IsNullOrEmpty(categoryIds))
            {
                var ids = categoryIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.CategoryId.HasValue && ids.Contains(i.CategoryId.Value));
            }

            var items = await query.ToListAsync();
            var csv = "Item Name,Serial Number,Category,Purchase Date\n" + 
                      string.Join("\n", items.Select(i => $"\"{i.ItemName}\",\"{i.SerialNumber}\",\"{i.Category?.Name}\",\"{i.PurchaseDate:yyyy-MM-dd}\""));
            
            return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "missing_items.csv");
        }
    }
}
