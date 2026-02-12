using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("statuses")]
    [ApiController]
    public class StatusesController : DivisionIsolatedController
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;
        public StatusesController(ApplicationDbContext context, IExcelService excelService, IDivisionService divisionService)
            : base(divisionService)
        {
            _context = context;
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var data = (await _context.Statuses
                .Where(s => s.DivisionId == CurrentDivisionId)
                .ToListAsync()).Select(c => new {
                Id = c.Id,
                Name = c.Name,
                IsActive = c.IsActive ? "Yes" : "No",
                CreatedAt = c.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });
            return File(_excelService.GenerateExcel(data, "Statuses"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "statuses.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<StatusImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<StatusImportDto>> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<StatusImportDto>(stream);
                var validation = await ValidateStatuses(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<StatusImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<StatusImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<object> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<StatusImportDto>(stream);
                var validation = await ValidateStatuses(result.Data);
                var newItems = new List<Status>();

                foreach (var validRow in validation.Valid)
                {
                    newItems.Add(new Status 
                    { 
                        Name = validRow.Data.Name.Trim(), 
                        IsActive = true,
                        DivisionId = CurrentDivisionId,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    });
                }

                if (newItems.Any())
                {
                    _context.Statuses.AddRange(newItems);
                    await _context.SaveChangesAsync();
                }

                var finalResult = new { imported = newItems.Count, totalRows = result.TotalRows, errors = validation.Invalid.Select(e => new RowError { Row = e.Row, Message = e.Message ?? "" }).ToList() };
                return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newItems.Count} imported" });
            }
            catch (Exception ex) { return Ok(new ApiResponse<object> { Success = false, Message = ex.Message }); }
        }

        private async Task<ValidationResultDto<StatusImportDto>> ValidateStatuses(List<ExcelRow<StatusImportDto>> rows)
        {
            var validation = new ValidationResultDto<StatusImportDto>();
            var existingNames = await _context.Statuses
                .Where(s => s.DivisionId == CurrentDivisionId)
                .Select(c => c.Name.ToLower())
                .ToListAsync();
            var processedInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var item = row.Data;
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    validation.Invalid.Add(new ValidationEntry<StatusImportDto> { Row = row.RowNumber, Data = item, Message = "Name is mandatory" });
                    continue;
                }
                var nameLower = item.Name.Trim().ToLower();

                if (processedInFile.Contains(nameLower))
                {
                    validation.Duplicates.Add(new ValidationEntry<StatusImportDto> { Row = row.RowNumber, Data = item, Message = $"Duplicate Status Name in file: {item.Name}" });
                    continue;
                }

                if (existingNames.Contains(nameLower))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<StatusImportDto> { Row = row.RowNumber, Data = item, Message = $"Status '{item.Name}' already exists" });
                    processedInFile.Add(nameLower);
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<StatusImportDto> { Row = row.RowNumber, Data = item });
                processedInFile.Add(nameLower);
            }

            return validation;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Status>>>> GetAll() => 
            Ok(new ApiResponse<IEnumerable<Status>> { Data = await _context.Statuses.Where(s => s.DivisionId == CurrentDivisionId).ToListAsync() });

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Status>>>> GetActive() => 
            Ok(new ApiResponse<IEnumerable<Status>> { Data = await _context.Statuses.Where(c => c.IsActive && c.DivisionId == CurrentDivisionId).ToListAsync() });

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Status>>> GetById(int id)
        {
            var item = await _context.Statuses.FirstOrDefaultAsync(s => s.Id == id && s.DivisionId == CurrentDivisionId);
            return item == null ? NotFound() : Ok(new ApiResponse<Status> { Data = item });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Status>>> Create([FromBody] CreateCompanyRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new ApiResponse<Status> { Success = false, Message = "Name is required" });

            if (await _context.Statuses.AnyAsync(c => c.DivisionId == CurrentDivisionId && c.Name.ToLower() == request.Name.Trim().ToLower()))
                return BadRequest(new ApiResponse<Status> { Success = false, Message = "Status name already exists" });

            var item = new Status 
            { 
                Name = request.Name.Trim(), 
                IsActive = request.IsActive ?? true,
                DivisionId = CurrentDivisionId
            };
            _context.Statuses.Add(item);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<Status> { Data = item });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Status>>> Update(int id, [FromBody] CreateCompanyRequest request)
        {
            var item = await _context.Statuses.FirstOrDefaultAsync(s => s.Id == id && s.DivisionId == CurrentDivisionId);
            if (item == null) return NotFound();

            if (!string.IsNullOrEmpty(request.Name))
            {
                var nameTrimmed = request.Name.Trim();
                if (await _context.Statuses.AnyAsync(c => c.DivisionId == CurrentDivisionId && c.Id != id && c.Name.ToLower() == nameTrimmed.ToLower()))
                    return BadRequest(new ApiResponse<Status> { Success = false, Message = "Status name already exists" });
                item.Name = nameTrimmed;
            }

            if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
            item.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Status> { Data = item });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            var item = await _context.Statuses.FirstOrDefaultAsync(s => s.Id == id && s.DivisionId == CurrentDivisionId);
            if (item == null) return NotFound();

            // Check if in use
            var inUse = await _context.Returns.AnyAsync(r => r.StatusId == id);
            if (inUse)
            {
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Status is in use and cannot be deleted." });
            }

            _context.Statuses.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
