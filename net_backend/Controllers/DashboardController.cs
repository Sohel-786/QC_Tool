using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("dashboard")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;

        public DashboardController(ApplicationDbContext context, IExcelService excelService)
        {
            _context = context;
            _excelService = excelService;
        }

        [HttpGet("metrics")]
        public async Task<ActionResult<ApiResponse<object>>> GetMetrics()
        {
            var totalItems = await _context.Items.CountAsync(i => i.IsActive);
            var itemsIssued = await _context.Items.CountAsync(i => i.Status == ItemStatus.ISSUED && i.IsActive);
            var itemsAvailable = await _context.Items.CountAsync(i => i.Status == ItemStatus.AVAILABLE && i.IsActive);
            var itemsMissing = await _context.Items.CountAsync(i => i.Status == ItemStatus.MISSING && i.IsActive);

            var totalIssues = await _context.Issues.CountAsync(i => i.IsActive);
            var activeIssues = await _context.Issues.CountAsync(i => !i.IsReturned && i.IsActive);

            var totalReturns = await _context.Returns.CountAsync(r => r.IsActive);

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
                query = query.Where(i => i.ItemName.Contains(search) || (i.SerialNumber != null && i.SerialNumber.Contains(search)) || (i.Description != null && i.Description.Contains(search)) || (i.InHouseLocation != null && i.InHouseLocation.Contains(search)));
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
            var query = _context.Items.Where(i => i.IsActive).AsQueryable();
            
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(i => i.ItemName.Contains(search) || (i.SerialNumber != null && i.SerialNumber.Contains(search)) || (i.Description != null && i.Description.Contains(search)) || (i.InHouseLocation != null && i.InHouseLocation.Contains(search)));
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
            var query = _context.Items.Where(i => i.Status == ItemStatus.MISSING && i.IsActive);
            
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(i => i.ItemName.Contains(search) || (i.SerialNumber != null && i.SerialNumber.Contains(search)) || (i.Description != null && i.Description.Contains(search)) || (i.InHouseLocation != null && i.InHouseLocation.Contains(search)));
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
            var query = _context.Items.Include(i => i.Category).Where(i => i.IsActive).AsQueryable();
            if (!string.IsNullOrEmpty(search))
                query = query.Where(i => i.ItemName.Contains(search) || (i.SerialNumber != null && i.SerialNumber.Contains(search)));
            if (!string.IsNullOrEmpty(categoryIds))
            {
                var ids = categoryIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.CategoryId.HasValue && ids.Contains(i.CategoryId.Value));
            }

            var items = await query.ToListAsync();
            var data = items.Select(i => new {
                ItemName = i.ItemName,
                SerialNumber = i.SerialNumber,
                InHouseLocation = i.InHouseLocation,
                Category = i.Category?.Name,
                Status = i.Status.ToString(),
                CreatedAt = i.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });

            var file = _excelService.GenerateExcel(data, "Total Items");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "total_items.xlsx");
        }

        [HttpGet("export/available-items")]
        public async Task<IActionResult> ExportAvailableItems([FromQuery] string? search, [FromQuery] string? categoryIds)
        {
            var query = _context.Items.Include(i => i.Category).Where(i => i.Status == ItemStatus.AVAILABLE && i.IsActive);
            if (!string.IsNullOrEmpty(search))
                query = query.Where(i => i.ItemName.Contains(search) || (i.SerialNumber != null && i.SerialNumber.Contains(search)));
            if (!string.IsNullOrEmpty(categoryIds))
            {
                var ids = categoryIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.CategoryId.HasValue && ids.Contains(i.CategoryId.Value));
            }

            var items = await query.ToListAsync();
            var data = items.Select(i => new {
                ItemName = i.ItemName,
                SerialNumber = i.SerialNumber,
                InHouseLocation = i.InHouseLocation,
                Category = i.Category?.Name,
                CreatedAt = i.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });

            var file = _excelService.GenerateExcel(data, "Available Items");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "available_items.xlsx");
        }

        [HttpGet("export/missing-items")]
        public async Task<IActionResult> ExportMissingItems([FromQuery] string? search, [FromQuery] string? categoryIds)
        {
            var query = _context.Items.Include(i => i.Category).Where(i => i.Status == ItemStatus.MISSING && i.IsActive);
            if (!string.IsNullOrEmpty(search))
                query = query.Where(i => i.ItemName.Contains(search) || (i.SerialNumber != null && i.SerialNumber.Contains(search)));
            if (!string.IsNullOrEmpty(categoryIds))
            {
                var ids = categoryIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.CategoryId.HasValue && ids.Contains(i.CategoryId.Value));
            }

            var items = await query.ToListAsync();
            var data = items.Select(i => new {
                ItemName = i.ItemName,
                SerialNumber = i.SerialNumber,
                InHouseLocation = i.InHouseLocation,
                Category = i.Category?.Name,
                CreatedAt = i.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });

            var file = _excelService.GenerateExcel(data, "Missing Items");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "missing_items.xlsx");
        }
    }
}
