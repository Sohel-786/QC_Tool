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
        public async Task<ActionResult<ApiResponse<IEnumerable<Issue>>>> GetAll([FromQuery] bool? onlyPendingInward)
        {
            var query = _context.Issues
                .Include(i => i.Item)
                .Include(i => i.IssuedByUser)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.Returns) // Include Returns for filtering
                .AsQueryable();

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
    }
}
