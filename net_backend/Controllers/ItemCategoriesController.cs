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

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<CategoryImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<CategoryImportDto>> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<CategoryImportDto>(stream);
                var validation = await ValidateCategories(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<CategoryImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<CategoryImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<object> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<CategoryImportDto>(stream);
                var validation = await ValidateCategories(result.Data);
                var newItems = new List<ItemCategory>();

                foreach (var validRow in validation.Valid)
                {
                    newItems.Add(new ItemCategory { Name = validRow.Data.Name.Trim(), IsActive = true });
                }

                if (newItems.Any())
                {
                    _context.ItemCategories.AddRange(newItems);
                    await _context.SaveChangesAsync();
                }

                var finalResult = new { imported = newItems.Count, totalRows = result.TotalRows, errors = validation.Invalid.Select(e => new RowError { Row = e.Row, Message = e.Message ?? "" }).ToList() };
                return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newItems.Count} imported" });
            }
            catch (Exception ex) { return Ok(new ApiResponse<object> { Success = false, Message = ex.Message }); }
        }

        private async Task<ValidationResultDto<CategoryImportDto>> ValidateCategories(List<ExcelRow<CategoryImportDto>> rows)
        {
            var validation = new ValidationResultDto<CategoryImportDto>();
            var existingNames = await _context.ItemCategories.Select(c => c.Name.ToLower()).ToListAsync();
            var processedInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var item = row.Data;
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    validation.Invalid.Add(new ValidationEntry<CategoryImportDto> { Row = row.RowNumber, Data = item, Message = "Name is mandatory" });
                    continue;
                }
                var nameLower = item.Name.Trim().ToLower();

                if (processedInFile.Contains(nameLower))
                {
                    validation.Duplicates.Add(new ValidationEntry<CategoryImportDto> { Row = row.RowNumber, Data = item, Message = $"Duplicate Category Name in file: {item.Name}" });
                    continue;
                }

                if (existingNames.Contains(nameLower))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<CategoryImportDto> { Row = row.RowNumber, Data = item, Message = $"Category '{item.Name}' already exists" });
                    processedInFile.Add(nameLower);
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<CategoryImportDto> { Row = row.RowNumber, Data = item });
                processedInFile.Add(nameLower);
            }

            return validation;
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
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new ApiResponse<ItemCategory> { Success = false, Message = "Name is required" });

            if (await _context.ItemCategories.AnyAsync(c => c.Name.ToLower() == request.Name.Trim().ToLower()))
                return BadRequest(new ApiResponse<ItemCategory> { Success = false, Message = "Category name already exists" });

            var item = new ItemCategory { Name = request.Name.Trim(), IsActive = request.IsActive ?? true };
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

            if (!string.IsNullOrEmpty(request.Name))
            {
                var nameTrimmed = request.Name.Trim();
                if (await _context.ItemCategories.AnyAsync(c => c.Id != id && c.Name.ToLower() == nameTrimmed.ToLower()))
                    return BadRequest(new ApiResponse<ItemCategory> { Success = false, Message = "Category name already exists" });
                item.Name = nameTrimmed;
            }

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
