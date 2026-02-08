using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("machines")]
    [ApiController]
    public class MachinesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;
        public MachinesController(ApplicationDbContext context, IExcelService excelService)
        {
            _context = context;
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var data = (await _context.Machines.ToListAsync()).Select(c => new {
                Id = c.Id,
                Name = c.Name,
                IsActive = c.IsActive ? "Yes" : "No",
                CreatedAt = c.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });
            return File(_excelService.GenerateExcel(data, "Machines"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "machines.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<MachineImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<MachineImportDto>> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<MachineImportDto>(stream);
                var validation = await ValidateMachines(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<MachineImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<MachineImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<object> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<MachineImportDto>(stream);
                var validation = await ValidateMachines(result.Data);
                var newItems = new List<Machine>();

                foreach (var validRow in validation.Valid)
                {
                    newItems.Add(new Machine { Name = validRow.Data.Name.Trim(), IsActive = true });
                }

                if (newItems.Any())
                {
                    _context.Machines.AddRange(newItems);
                    await _context.SaveChangesAsync();
                }

                var finalResult = new { imported = newItems.Count, totalRows = result.TotalRows, errors = validation.Invalid.Select(e => new RowError { Row = e.Row, Message = e.Message ?? "" }).ToList() };
                return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newItems.Count} imported" });
            }
            catch (Exception ex) { return Ok(new ApiResponse<object> { Success = false, Message = ex.Message }); }
        }

        private async Task<ValidationResultDto<MachineImportDto>> ValidateMachines(List<ExcelRow<MachineImportDto>> rows)
        {
            var validation = new ValidationResultDto<MachineImportDto>();
            var existingNames = await _context.Machines.Select(c => c.Name.ToLower()).ToListAsync();
            var processedInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var item = row.Data;
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    validation.Invalid.Add(new ValidationEntry<MachineImportDto> { Row = row.RowNumber, Data = item, Message = "Name is mandatory" });
                    continue;
                }
                var nameLower = item.Name.Trim().ToLower();

                if (processedInFile.Contains(nameLower))
                {
                    validation.Duplicates.Add(new ValidationEntry<MachineImportDto> { Row = row.RowNumber, Data = item, Message = $"Duplicate Machine Name in file: {item.Name}" });
                    continue;
                }

                if (existingNames.Contains(nameLower))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<MachineImportDto> { Row = row.RowNumber, Data = item, Message = $"Machine '{item.Name}' already exists" });
                    processedInFile.Add(nameLower);
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<MachineImportDto> { Row = row.RowNumber, Data = item });
                processedInFile.Add(nameLower);
            }

            return validation;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Machine>>>> GetAll() => 
            Ok(new ApiResponse<IEnumerable<Machine>> { Data = await _context.Machines.ToListAsync() });

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Machine>>>> GetActive() => 
            Ok(new ApiResponse<IEnumerable<Machine>> { Data = await _context.Machines.Where(c => c.IsActive).ToListAsync() });

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Machine>>> GetById(int id)
        {
            var item = await _context.Machines.FindAsync(id);
            return item == null ? NotFound() : Ok(new ApiResponse<Machine> { Data = item });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Machine>>> Create([FromBody] CreateCompanyRequest request)
        {
            var item = new Machine { Name = request.Name, IsActive = request.IsActive ?? true };
            _context.Machines.Add(item);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<Machine> { Data = item });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Machine>>> Update(int id, [FromBody] CreateCompanyRequest request)
        {
            var item = await _context.Machines.FindAsync(id);
            if (item == null) return NotFound();
            if (!string.IsNullOrEmpty(request.Name)) item.Name = request.Name;
            if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
            item.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Machine> { Data = item });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            var item = await _context.Machines.FindAsync(id);
            if (item == null) return NotFound();
            _context.Machines.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
