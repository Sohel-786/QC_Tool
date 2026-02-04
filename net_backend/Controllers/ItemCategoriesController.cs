using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("item-categories")]
    [ApiController]
    public class ItemCategoriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public ItemCategoriesController(ApplicationDbContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<ItemCategory>>>> GetAll() => 
            Ok(new ApiResponse<IEnumerable<ItemCategory>> { Data = await _context.ItemCategories.ToListAsync() });

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<ItemCategory>>>> GetActive() => 
            Ok(new ApiResponse<IEnumerable<ItemCategory>> { Data = await _context.ItemCategories.Where(c => c.IsActive).ToListAsync() });

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<ItemCategory>>> GetById(int id)
        {
            var item = await _context.ItemCategories.FindAsync(id);
            return item == null ? NotFound() : Ok(new ApiResponse<ItemCategory> { Data = item });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<ItemCategory>>> Create([FromBody] CreateCompanyRequest request)
        {
            var item = new ItemCategory { Name = request.Name, IsActive = request.IsActive ?? true };
            _context.ItemCategories.Add(item);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<ItemCategory> { Data = item });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<ItemCategory>>> Update(int id, [FromBody] CreateCompanyRequest request)
        {
            var item = await _context.ItemCategories.FindAsync(id);
            if (item == null) return NotFound();
            if (!string.IsNullOrEmpty(request.Name)) item.Name = request.Name;
            if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
            item.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<ItemCategory> { Data = item });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            var item = await _context.ItemCategories.FindAsync(id);
            if (item == null) return NotFound();
            _context.ItemCategories.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
