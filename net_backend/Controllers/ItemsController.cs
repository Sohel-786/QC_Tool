using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("items")]
    [ApiController]
    public class ItemsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ItemsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Item>>>> GetAll([FromQuery] string? status)
        {
            var query = _context.Items.Include(i => i.Category).AsQueryable();
            
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<ItemStatus>(status, true, out var itemStatus))
            {
                query = query.Where(i => i.Status == itemStatus);
            }

            var items = await query.ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Item>> { Data = items });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Item>>>> GetActive()
        {
            var items = await _context.Items.Where(i => i.IsActive).Include(i => i.Category).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Item>> { Data = items });
        }

        [HttpGet("available")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Item>>>> GetAvailable()
        {
            var items = await _context.Items.Where(i => i.IsActive && i.Status == ItemStatus.AVAILABLE).Include(i => i.Category).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Item>> { Data = items });
        }

        [HttpGet("missing")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetMissing()
        {
            var items = await _context.Items.Where(i => i.IsActive && i.Status == ItemStatus.MISSING).Include(i => i.Category).ToListAsync();
            
            // Replicate sourceInwardCode logic
            var itemIds = items.Select(i => i.Id).ToList();
            var sourceReturns = await _context.Returns
                .Where(r => r.ItemId.HasValue && itemIds.Contains(r.ItemId.Value) && r.Condition == "Missing")
                .OrderByDescending(r => r.ReturnedAt)
                .Select(r => new { r.ItemId, r.ReturnCode })
                .ToListAsync();

            var sourceByItemId = sourceReturns
                .GroupBy(r => r.ItemId)
                .ToDictionary(g => g.Key!.Value, g => g.First().ReturnCode);

            var result = items.Select(item => new
            {
                item.Id,
                item.ItemName,
                item.SerialNumber,
                item.Description,
                item.Image,
                item.CategoryId,
                item.Status,
                item.IsActive,
                item.CreatedAt,
                item.UpdatedAt,
                Category = item.Category,
                SourceInwardCode = sourceByItemId.ContainsKey(item.Id) ? sourceByItemId[item.Id] : null
            });

            return Ok(new ApiResponse<IEnumerable<object>> { Data = result });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Item>>> GetById(int id)
        {
            var item = await _context.Items.Include(i => i.Category).FirstOrDefaultAsync(i => i.Id == id);
            if (item == null) return NotFound(new ApiResponse<Item> { Success = false, Message = "Item not found" });
            return Ok(new ApiResponse<Item> { Data = item });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Item>>> Create([FromForm] CreateItemRequest request, IFormFile? image)
        {
            if (string.IsNullOrEmpty(request.ItemName) || string.IsNullOrEmpty(request.SerialNumber))
            {
                return BadRequest(new ApiResponse<Item> { Success = false, Message = "Item name and serial number are required" });
            }

            if (await _context.Items.AnyAsync(i => i.SerialNumber == request.SerialNumber))
            {
                return Conflict(new ApiResponse<Item> { Success = false, Message = "Item with this serial number already exists" });
            }

            string? imagePath = null;
            if (image != null)
            {
                // Simple file saving logic (should be improved in a real app)
                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(image.FileName)}";
                var uploads = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "storage", "items", request.SerialNumber);
                Directory.CreateDirectory(uploads);
                var filePath = Path.Combine(uploads, fileName);
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await image.CopyToAsync(fileStream);
                }
                imagePath = $"items/{request.SerialNumber}/{fileName}";
            }

            var item = new Item
            {
                ItemName = request.ItemName,
                SerialNumber = request.SerialNumber,
                Description = request.Description,
                Image = imagePath,
                CategoryId = request.CategoryId,
                IsActive = request.IsActive ?? true,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                Status = ItemStatus.AVAILABLE
            };

            _context.Items.Add(item);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Item> { Data = item });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Item>>> Update(int id, [FromForm] UpdateItemRequest request, IFormFile? image)
        {
            var item = await _context.Items.FindAsync(id);
            if (item == null) return NotFound(new ApiResponse<Item> { Success = false, Message = "Item not found" });

            if (!string.IsNullOrEmpty(request.ItemName)) item.ItemName = request.ItemName;
            if (request.Description != null) item.Description = request.Description;
            if (request.CategoryId.HasValue) item.CategoryId = request.CategoryId;
            if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
            
            if (!string.IsNullOrEmpty(request.Status) && Enum.TryParse<ItemStatus>(request.Status, true, out var newStatus))
            {
                item.Status = newStatus;
            }

            if (image != null)
            {
                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(image.FileName)}";
                var uploads = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "storage", "items", item.SerialNumber ?? "unknown");
                Directory.CreateDirectory(uploads);
                var filePath = Path.Combine(uploads, fileName);
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await image.CopyToAsync(fileStream);
                }
                item.Image = $"items/{item.SerialNumber ?? "unknown"}/{fileName}";
            }

            item.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<Item> { Data = item });
        }
    }
}
