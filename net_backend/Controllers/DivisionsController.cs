using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.Models;
using net_backend.Services;
using net_backend.DTOs;

namespace net_backend.Controllers
{
    [Route("divisions")]
    [ApiController]
    [Authorize]
    public class DivisionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;

        public DivisionsController(ApplicationDbContext context, IExcelService excelService)
        {
            _context = context;
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var divisions = await _context.Divisions
                .OrderBy(d => d.Name)
                .ToListAsync();

            var data = divisions.Select((d, index) => new {
                SrNo = index + 1,
                Name = d.Name,
                IsActive = d.IsActive ? "Yes" : "No",
                CreatedAt = d.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });

            var file = _excelService.GenerateExcel(data, "Divisions");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "divisions.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<DivisionImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<DivisionImportDto>> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<DivisionImportDto>(stream);
                var validation = await ValidateDivisions(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<DivisionImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<DivisionImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<object> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<DivisionImportDto>(stream);
                var validation = await ValidateDivisions(result.Data);
                var newItems = new List<Division>();

                foreach (var validRow in validation.Valid)
                {
                    newItems.Add(new Division { 
                        Name = validRow.Data.Name.Trim(), 
                        IsActive = true,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    });
                }

                if (newItems.Any())
                {
                    _context.Divisions.AddRange(newItems);
                    await _context.SaveChangesAsync();
                }

                var finalResult = new { imported = newItems.Count, totalRows = result.TotalRows, errors = validation.Invalid.Select(e => new RowError { Row = e.Row, Message = e.Message ?? "" }).ToList() };
                return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newItems.Count} divisions imported" });
            }
            catch (Exception ex) { return Ok(new ApiResponse<object> { Success = false, Message = ex.Message }); }
        }

        private async Task<ValidationResultDto<DivisionImportDto>> ValidateDivisions(List<ExcelRow<DivisionImportDto>> rows)
        {
            var validation = new ValidationResultDto<DivisionImportDto>();
            var existingNames = await _context.Divisions
                .Select(d => d.Name.ToLower())
                .ToListAsync();
            var processedInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var item = row.Data;
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    validation.Invalid.Add(new ValidationEntry<DivisionImportDto> { Row = row.RowNumber, Data = item, Message = "Name is mandatory" });
                    continue;
                }
                var nameLower = item.Name.Trim().ToLower();

                if (processedInFile.Contains(nameLower))
                {
                    validation.Duplicates.Add(new ValidationEntry<DivisionImportDto> { Row = row.RowNumber, Data = item, Message = $"Duplicate Division Name in file: {item.Name}" });
                    continue;
                }

                if (existingNames.Contains(nameLower))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<DivisionImportDto> { Row = row.RowNumber, Data = item, Message = $"Division '{item.Name}' already exists" });
                    processedInFile.Add(nameLower);
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<DivisionImportDto> { Row = row.RowNumber, Data = item });
                processedInFile.Add(nameLower);
            }

            return validation;
        }

        [HttpGet]
        public async Task<IActionResult> GetDivisions([FromQuery] string? search, [FromQuery] string? status)
        {
            var query = _context.Divisions.AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                if (status.ToLower() == "active") query = query.Where(d => d.IsActive);
                else if (status.ToLower() == "inactive") query = query.Where(d => !d.IsActive);
            }

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(d => d.Name.Contains(search));
            }

            var divisions = await query
                .OrderBy(d => d.Name)
                .ToListAsync();

            return Ok(new net_backend.DTOs.ApiResponse<IEnumerable<Division>> { Data = divisions });
        }

        [HttpPost]
        public async Task<IActionResult> CreateDivision([FromBody] Division division)
        {
            if (string.IsNullOrEmpty(division.Name))
                return BadRequest(new { message = "Division name is required" });

            if (await _context.Divisions.AnyAsync(d => d.Name == division.Name))
                return BadRequest(new { message = "Division name already exists" });

            division.CreatedAt = DateTime.Now;
            division.UpdatedAt = DateTime.Now;
            _context.Divisions.Add(division);
            await _context.SaveChangesAsync();

            // Create storage folder for the new division
            var divFolderName = net_backend.Utils.PathUtils.SanitizeFolderName(division.Name);
            var storagePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "storage", divFolderName);
            if (!Directory.Exists(storagePath))
            {
                Directory.CreateDirectory(storagePath);
                Directory.CreateDirectory(Path.Combine(storagePath, "items"));
            }

            return Ok(division);
        }

        [HttpPut("{id}")]
        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateDivision(int id, [FromBody] Division division)
        {
            var existing = await _context.Divisions.FindAsync(id);
            if (existing == null) return NotFound();

            if (await _context.Divisions.AnyAsync(d => d.Name == division.Name && d.Id != id))
                return BadRequest(new { message = "Division name already exists" });

            var oldName = existing.Name;
            existing.Name = division.Name;
            existing.IsActive = division.IsActive;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            // Rename storage folder if name changed
            if (oldName != division.Name)
            {
                var oldFolderName = net_backend.Utils.PathUtils.SanitizeFolderName(oldName);
                var newFolderName = net_backend.Utils.PathUtils.SanitizeFolderName(division.Name);
                var oldPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "storage", oldFolderName);
                var newPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "storage", newFolderName);
                if (Directory.Exists(oldPath) && !Directory.Exists(newPath))
                {
                    try { Directory.Move(oldPath, newPath); } catch { /* Ignore move errors */ }
                }
            }

            return Ok(existing);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDivision(int id)
        {
            var division = await _context.Divisions.FindAsync(id);
            if (division == null) return NotFound();

            bool inUse = await _context.Companies.AnyAsync(c => c.DivisionId == id) ||
                         await _context.Contractors.AnyAsync(c => c.DivisionId == id) ||
                         await _context.Issues.AnyAsync(i => i.DivisionId == id);

            if (inUse)
                return BadRequest(new { message = "Division is in use and cannot be deleted" });

            _context.Divisions.Remove(division);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }
    }
}
