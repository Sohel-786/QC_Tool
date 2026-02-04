using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("item-categories")]
    [ApiController]
    public class ItemCategoriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;
        public ItemCategoriesController(ApplicationDbContext context, IExcelService excelService)
        {
            _context = context;
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var data = (await _context.ItemCategories.ToListAsync()).Select(c => new {
                Id = c.Id,
                Name = c.Name,
                IsActive = c.IsActive ? "Yes" : "No",
                CreatedAt = c.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });
            return File(_excelService.GenerateExcel(data, "Categories"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "categories.xlsx");
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<object> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<CategoryImportDto>(stream);
                var newItems = new List<ItemCategory>();

                var existingNames = await _context.ItemCategories.Select(c => c.Name.ToLower()).ToListAsync();
                var processedInFile = new HashSet<string>();

                foreach (var row in result.Data)
                {
                    var item = row.Data;
                    if (string.IsNullOrWhiteSpace(item.Name))
                    {
                        result.Errors.Add(new RowError { Row = row.RowNumber, Message = "Name is mandatory" });
                        continue;
                    }
                    var nameLower = item.Name.Trim().ToLower();

                    if (processedInFile.Contains(nameLower))
                    {
                        result.Errors.Add(new RowError { Row = row.RowNumber, Message = $"Duplicate Category Name in file: {item.Name}" });
                        continue;
                    }

                    if (existingNames.Contains(nameLower))
                    {
                        result.Errors.Add(new RowError { Row = row.RowNumber, Message = $"Category '{item.Name}' already exists" });
                        processedInFile.Add(nameLower);
                        continue;
                    }

                    newItems.Add(new ItemCategory { Name = item.Name.Trim(), IsActive = true });
                    processedInFile.Add(nameLower);
                }

                if (newItems.Any()) { _context.ItemCategories.AddRange(newItems); await _context.SaveChangesAsync(); }
                
                var finalResult = new { imported = newItems.Count, totalRows = result.TotalRows, errors = result.Errors.OrderBy(e => e.Row).ToList() };
                return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newItems.Count} imported" });
            }
            catch (Exception ex) { return Ok(new ApiResponse<object> { Success = false, Message = ex.Message }); }
        }

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
