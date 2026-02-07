using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("issues")]
    [ApiController]
    public class IssuesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICodeGeneratorService _codeGenerator;

        public IssuesController(ApplicationDbContext context, ICodeGeneratorService codeGenerator)
        {
            _context = context;
            _codeGenerator = codeGenerator;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Issue>>>> GetAll(
            [FromQuery] string? status,
            [FromQuery] string? companyIds,
            [FromQuery] string? contractorIds,
            [FromQuery] string? machineIds,
            [FromQuery] string? locationIds,
            [FromQuery] string? itemIds,
            [FromQuery] string? operatorName,
            [FromQuery] string? search,
            [FromQuery] bool? onlyPendingInward)
        {
            var query = _context.Issues
                .Include(i => i.Item)
                .Include(i => i.IssuedByUser)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.Returns)
                .AsQueryable();

            // Status filter
            if (!string.IsNullOrEmpty(status))
            {
                if (status == "active") query = query.Where(i => i.IsActive);
                else if (status == "inactive") query = query.Where(i => !i.IsActive);
            }

            // Multi-select filters
            if (!string.IsNullOrEmpty(companyIds))
            {
                var ids = companyIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any()) query = query.Where(i => ids.Contains(i.CompanyId));
            }

            if (!string.IsNullOrEmpty(contractorIds))
            {
                var ids = contractorIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any()) query = query.Where(i => ids.Contains(i.ContractorId));
            }

            if (!string.IsNullOrEmpty(machineIds))
            {
                var ids = machineIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any()) query = query.Where(i => ids.Contains(i.MachineId));
            }

            if (!string.IsNullOrEmpty(locationIds))
            {
                var ids = locationIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any()) query = query.Where(i => ids.Contains(i.LocationId));
            }

            if (!string.IsNullOrEmpty(itemIds))
            {
                var ids = itemIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any()) query = query.Where(i => ids.Contains(i.ItemId));
            }

            // Operator name filter
            if (!string.IsNullOrEmpty(operatorName))
            {
                var searchTerm = operatorName.Trim();
                query = query.Where(i => i.IssuedTo != null && i.IssuedTo.Contains(searchTerm));
            }

            // Global search filter
            if (!string.IsNullOrEmpty(search))
            {
                var searchTerm = search.Trim();
                query = query.Where(i =>
                    i.IssueNo.Contains(searchTerm) ||
                    (i.Item != null && (i.Item.ItemName.Contains(searchTerm) || (i.Item.SerialNumber != null && i.Item.SerialNumber.Contains(searchTerm)))) ||
                    (i.Company != null && i.Company.Name.Contains(searchTerm)) ||
                    (i.Contractor != null && i.Contractor.Name.Contains(searchTerm)) ||
                    (i.Machine != null && i.Machine.Name.Contains(searchTerm)) ||
                    (i.Location != null && i.Location.Name.Contains(searchTerm)) ||
                    (i.IssuedTo != null && i.IssuedTo.Contains(searchTerm))
                );
            }

            // Only pending inward filter
            if (onlyPendingInward.HasValue && onlyPendingInward.Value)
            {
                // Filter out issues that have ANY active return (meaning Inward is done/active)
                query = query.Where(i => i.IsActive && !i.Returns.Any(r => r.IsActive));
            }

            var issues = await query.OrderByDescending(i => i.IssuedAt).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Issue>> { Data = issues });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Issue>>>> GetActive()
        {
            var issues = await _context.Issues
                .Include(i => i.Returns) // Include returns to check status
                .Where(i => i.IsActive && !i.Returns.Any(r => r.IsActive)) // Only show if no active return exists
                .Include(i => i.Item)
                .Include(i => i.IssuedByUser)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Issue>> { Data = issues });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Issue>>> GetById(int id)
        {
            var issue = await _context.Issues
                .Include(i => i.Item)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.IssuedByUser)
                .FirstOrDefaultAsync(i => i.Id == id);
                
            if (issue == null) return NotFound(new ApiResponse<Issue> { Success = false, Message = "Issue not found" });
            return Ok(new ApiResponse<Issue> { Data = issue });
        }

        [HttpGet("issue-no/{issueNo}")]
        public async Task<ActionResult<ApiResponse<Issue>>> GetByIssueNo(string issueNo)
        {
            var issue = await _context.Issues
                .Include(i => i.Item)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .FirstOrDefaultAsync(i => i.IssueNo == issueNo);
                
            if (issue == null) return NotFound(new ApiResponse<Issue> { Success = false, Message = "Issue not found" });
            return Ok(new ApiResponse<Issue> { Data = issue });
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<object>>> GetNextCode()
        {
            var count = await _context.Issues.CountAsync();
            var nextCode = _codeGenerator.GenerateNextCode("OUTWARD", count);
            return Ok(new ApiResponse<object> { Data = new { nextCode } });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Issue>>> Create([FromBody] CreateIssueRequest request)
        {
            if (!await CheckPermission("addOutward")) return Forbidden();

            // Validation logic matching Node.js
            var item = await _context.Items.FindAsync(request.ItemId);
            if (item == null) return NotFound(new ApiResponse<Issue> { Success = false, Message = "Item not found" });
            if (item.Status != ItemStatus.AVAILABLE) return BadRequest(new ApiResponse<Issue> { Success = false, Message = "Item is not available" });

            // Image Validation
            var hasReturnImage = await _context.Returns.AnyAsync(r => r.ItemId == item.Id && r.IsActive && !string.IsNullOrEmpty(r.ReturnImage));
            if (string.IsNullOrEmpty(item.Image) && !hasReturnImage)
            {
                 return BadRequest(new ApiResponse<Issue> { Success = false, Message = "This item does not have an image. Items without images cannot be issued." });
            }

            var count = await _context.Issues.CountAsync();
            var issueNo = _codeGenerator.GenerateNextCode("OUTWARD", count);

            var issue = new Issue
            {
                IssueNo = issueNo,
                ItemId = request.ItemId,
                IssuedBy = 1, // Placeholder for actual User ID from Claims
                IssuedTo = request.IssuedTo,
                Remarks = request.Remarks,
                CompanyId = request.CompanyId,
                ContractorId = request.ContractorId,
                MachineId = request.MachineId,
                LocationId = request.LocationId,
                IsActive = true,
                IsReturned = false,
                IssuedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Issues.Add(issue);
            item.Status = ItemStatus.ISSUED;
            
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Issue> { Data = issue });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Issue>>> Update(int id, [FromBody] UpdateIssueRequest request)
        {
            if (!await CheckPermission("editOutward")) return Forbidden();

            var issue = await _context.Issues.FindAsync(id);
            if (issue == null) return NotFound();
            if (issue.IsReturned) return BadRequest(new ApiResponse<Issue> { Success = false, Message = "Cannot edit returned issue" });

            if (request.IssuedTo != null) issue.IssuedTo = request.IssuedTo;
            if (request.Remarks != null) issue.Remarks = request.Remarks;
            if (request.CompanyId.HasValue) issue.CompanyId = request.CompanyId.Value;
            if (request.ContractorId.HasValue) issue.ContractorId = request.ContractorId.Value;
            if (request.MachineId.HasValue) issue.MachineId = request.MachineId.Value;
            if (request.LocationId.HasValue) issue.LocationId = request.LocationId.Value;

            issue.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<Issue> { Data = issue });
        }

        [HttpPatch("{id}/inactive")]
        public async Task<ActionResult<ApiResponse<Issue>>> SetInactive(int id)
        {
            if (User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value != "QC_ADMIN") return Forbidden();

            var issue = await _context.Issues.Include(i => i.Item).FirstOrDefaultAsync(i => i.Id == id);
            if (issue == null) return NotFound(new ApiResponse<Issue> { Success = false, Message = "Issue not found" });
            
            if (issue.IsReturned)
            {
                return BadRequest(new ApiResponse<Issue> { Success = false, Message = "Cannot mark outward inactive once inward is done." });
            }

            issue.IsActive = false;
            issue.UpdatedAt = DateTime.Now;

            if (issue.Item != null)
            {
                issue.Item.Status = ItemStatus.AVAILABLE;
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Issue> { Data = issue });
        }

        [HttpPatch("{id}/active")]
        public async Task<ActionResult<ApiResponse<Issue>>> SetActive(int id)
        {
            if (User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value != "QC_ADMIN") return Forbidden();

            var issue = await _context.Issues.Include(i => i.Item).FirstOrDefaultAsync(i => i.Id == id);
            if (issue == null) return NotFound(new ApiResponse<Issue> { Success = false, Message = "Issue not found" });

            issue.IsActive = true;
            issue.UpdatedAt = DateTime.Now;

            if (issue.Item != null && issue.Item.Status == ItemStatus.AVAILABLE)
            {
                issue.Item.Status = ItemStatus.ISSUED;
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Issue> { Data = issue });
        }

        private async Task<bool> CheckPermission(string permissionKey)
        {
            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (string.IsNullOrEmpty(role)) return false;
            if (role == "QC_ADMIN") return true;

            var permissions = await _context.RolePermissions.FirstOrDefaultAsync(p => p.Role == role);
            if (permissions == null) return false;

            return permissionKey switch
            {
                "addOutward" => permissions.AddOutward,
                "editOutward" => permissions.EditOutward,
                _ => false
            };
        }

        private ActionResult Forbidden()
        {
            return StatusCode(403, new ApiResponse<object> { Success = false, Message = "You do not have permission to perform this action." });
        }
    }
}
