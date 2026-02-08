using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("locations")]
    [ApiController]
    public class LocationsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;
        public LocationsController(ApplicationDbContext context, IExcelService excelService)
        {
            _context = context;
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var data = (await _context.Locations.ToListAsync()).Select(c => new {
                Id = c.Id,
                Name = c.Name,
                IsActive = c.IsActive ? "Yes" : "No",
                CreatedAt = c.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });
            return File(_excelService.GenerateExcel(data, "Locations"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "locations.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<LocationImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<LocationImportDto>> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<LocationImportDto>(stream);
                var validation = await ValidateLocations(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<LocationImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<LocationImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<object> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<LocationImportDto>(stream);
                var validation = await ValidateLocations(result.Data);
                var newItems = new List<Location>();

                foreach (var validRow in validation.Valid)
                {
                    newItems.Add(new Location { Name = validRow.Data.Name.Trim(), IsActive = true });
                }

                if (newItems.Any())
                {
                    _context.Locations.AddRange(newItems);
                    await _context.SaveChangesAsync();
                }

                var finalResult = new { imported = newItems.Count, totalRows = result.TotalRows, errors = validation.Invalid.Select(e => new RowError { Row = e.Row, Message = e.Message ?? "" }).ToList() };
                return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newItems.Count} imported" });
            }
            catch (Exception ex) { return Ok(new ApiResponse<object> { Success = false, Message = ex.Message }); }
        }

        private async Task<ValidationResultDto<LocationImportDto>> ValidateLocations(List<ExcelRow<LocationImportDto>> rows)
        {
            var validation = new ValidationResultDto<LocationImportDto>();
            var existingNames = await _context.Locations.Select(c => c.Name.ToLower()).ToListAsync();
            var processedInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var item = row.Data;
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    validation.Invalid.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item, Message = "Name is mandatory" });
                    continue;
                }
                var nameLower = item.Name.Trim().ToLower();

                if (processedInFile.Contains(nameLower))
                {
                    validation.Duplicates.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item, Message = $"Duplicate Location Name in file: {item.Name}" });
                    continue;
                }

                if (existingNames.Contains(nameLower))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item, Message = $"Location '{item.Name}' already exists" });
                    processedInFile.Add(nameLower);
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item });
                processedInFile.Add(nameLower);
            }

            return validation;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Location>>>> GetAll() => 
            Ok(new ApiResponse<IEnumerable<Location>> { Data = await _context.Locations.ToListAsync() });

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Location>>>> GetActive() => 
            Ok(new ApiResponse<IEnumerable<Location>> { Data = await _context.Locations.Where(c => c.IsActive).ToListAsync() });

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Location>>> GetById(int id)
        {
            var item = await _context.Locations.FindAsync(id);
            return item == null ? NotFound() : Ok(new ApiResponse<Location> { Data = item });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Location>>> Create([FromBody] CreateCompanyRequest request)
        {
            var item = new Location { Name = request.Name, IsActive = request.IsActive ?? true };
            _context.Locations.Add(item);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<Location> { Data = item });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Location>>> Update(int id, [FromBody] CreateCompanyRequest request)
        {
            var item = await _context.Locations.FindAsync(id);
            if (item == null) return NotFound();
            if (!string.IsNullOrEmpty(request.Name)) item.Name = request.Name;
            if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
            item.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Location> { Data = item });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            var item = await _context.Locations.FindAsync(id);
            if (item == null) return NotFound();
            _context.Locations.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
