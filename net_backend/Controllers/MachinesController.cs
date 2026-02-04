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

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<object> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<MachineImportDto>(stream);
                var newItems = new List<Machine>();

                var existingNames = await _context.Machines.Select(c => c.Name.ToLower()).ToListAsync();
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
                        result.Errors.Add(new RowError { Row = row.RowNumber, Message = $"Duplicate Machine Name in file: {item.Name}" });
                        continue;
                    }

                    if (existingNames.Contains(nameLower))
                    {
                        result.Errors.Add(new RowError { Row = row.RowNumber, Message = $"Machine '{item.Name}' already exists" });
                        processedInFile.Add(nameLower);
                        continue;
                    }

                    newItems.Add(new Machine { Name = item.Name.Trim(), IsActive = true });
                    processedInFile.Add(nameLower);
                }

                if (newItems.Any()) { _context.Machines.AddRange(newItems); await _context.SaveChangesAsync(); }
                
                var finalResult = new { imported = newItems.Count, totalRows = result.TotalRows, errors = result.Errors.OrderBy(e => e.Row).ToList() };
                return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newItems.Count} imported" });
            }
            catch (Exception ex) { return Ok(new ApiResponse<object> { Success = false, Message = ex.Message }); }
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
