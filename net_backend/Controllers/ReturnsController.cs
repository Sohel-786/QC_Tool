using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;
using net_backend.Utils;

namespace net_backend.Controllers
{
    [Route("returns")]
    [ApiController]
    public class ReturnsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICodeGeneratorService _codeGenerator;

        public ReturnsController(ApplicationDbContext context, ICodeGeneratorService codeGenerator)
        {
            _context = context;
            _codeGenerator = codeGenerator;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Return>>>> GetAll()
        {
            var returns = await _context.Returns
                .Include(r => r.Issue).ThenInclude(i => i.Item)
                .Include(r => r.Issue).ThenInclude(i => i.Company)
                .Include(r => r.Issue).ThenInclude(i => i.Contractor)
                .Include(r => r.Issue).ThenInclude(i => i.Machine)
                .Include(r => r.Issue).ThenInclude(i => i.Location)
                .Include(r => r.Item)
                .Include(r => r.ReturnedByUser)
                .Include(r => r.Company)
                .Include(r => r.Contractor)
                .Include(r => r.Machine)
                .Include(r => r.Location)
                .Include(r => r.Status)
                .OrderByDescending(r => r.ReturnedAt)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Return>> { Data = returns });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Return>>> GetById(int id)
        {
            var ret = await _context.Returns
                .Include(r => r.Issue).ThenInclude(i => i.Item)
                .Include(r => r.Issue).ThenInclude(i => i.Company)
                .Include(r => r.Issue).ThenInclude(i => i.Contractor)
                .Include(r => r.Issue).ThenInclude(i => i.Machine)
                .Include(r => r.Issue).ThenInclude(i => i.Location)
                .Include(r => r.Item)
                .Include(r => r.ReturnedByUser)
                .Include(r => r.Company)
                .Include(r => r.Contractor)
                .Include(r => r.Machine)
                .Include(r => r.Location)
                .Include(r => r.Status)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (ret == null) return NotFound();
            return Ok(new ApiResponse<Return> { Data = ret });
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<object>>> GetNextCode()
        {
            var count = await _context.Returns.CountAsync();
            var nextCode = _codeGenerator.GenerateNextCode("INWARD", count);
            return Ok(new ApiResponse<object> { Data = new { nextCode } });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Return>>> Create([FromForm] CreateReturnRequest request, IFormFile? image)
        {
            if (request.IssueId.HasValue)
            {
                var existingActiveReturn = await _context.Returns
                    .AnyAsync(r => r.IssueId == request.IssueId && r.IsActive);
                
                if (existingActiveReturn)
                {
                    return BadRequest(new ApiResponse<Return> { Success = false, Message = "An active inward entry already exists for this outward entry. Please inactivate the existing inward entry first." });
                }
            }

            var count = await _context.Returns.CountAsync();
            var returnCode = _codeGenerator.GenerateNextCode("INWARD", count);

            string? imagePath = null;
            if (image != null)
            {
                // New Logic:
                // If Issue IssueId -> items/{itemSerial}/inward/parameter-name
                // If Item ItemId -> items/{itemSerial}/inward/parameter-name
                // For this we need the item serial.
                
                string serialNumber = "unknown";
                if (request.IssueId.HasValue)
                {
                    // Fetch Issue -> Item to get Serial
                    var issueForSerial = await _context.Issues.Include(i => i.Item).FirstOrDefaultAsync(i => i.Id == request.IssueId);
                    if (issueForSerial?.Item != null) serialNumber = issueForSerial.Item.SerialNumber;
                }
                else if (request.ItemId.HasValue)
                {
                     var itemForSerial = await _context.Items.FindAsync(request.ItemId);
                     if (itemForSerial != null) serialNumber = itemForSerial.SerialNumber;
                }

                var safeSerial = PathUtils.SanitizeSerialForPath(serialNumber);
                var ext = Path.GetExtension(image.FileName);
                var fileName = request.IssueId.HasValue 
                    ? $"inward-issue-{request.IssueId}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{ext}"
                    : $"inward-missing-{request.ItemId}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{ext}";

                var uploads = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "storage", "items", safeSerial, "inward");
                Directory.CreateDirectory(uploads);
                
                var filePath = Path.Combine(uploads, fileName);
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await image.CopyToAsync(fileStream);
                }
                
                // Stored path: items/{serial}/inward/{filename}
                imagePath = $"items/{safeSerial}/inward/{fileName}";
            }

            var ret = new Return
            {
                ReturnCode = returnCode,
                IssueId = request.IssueId,
                ItemId = request.ItemId,
                Condition = request.Condition,
                ReturnedBy = 1, // Placeholder
                Remarks = request.Remarks,
                ReceivedBy = request.ReceivedBy,
                StatusId = request.StatusId,
                ReturnImage = imagePath,
                CompanyId = request.CompanyId,
                ContractorId = request.ContractorId,
                MachineId = request.MachineId,
                LocationId = request.LocationId,
                ReturnedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Returns.Add(ret);

            // Update item/issue status
            if (request.IssueId.HasValue)
            {
                var issue = await _context.Issues.FindAsync(request.IssueId);
                if (issue != null)
                {
                    issue.IsReturned = true;
                    var item = await _context.Items.FindAsync(issue.ItemId);
                    if (item != null)
                    {
                        item.Status = request.Condition == "Missing" ? ItemStatus.MISSING : ItemStatus.AVAILABLE;
                    }
                }
            }
            else if (request.ItemId.HasValue)
            {
                var item = await _context.Items.FindAsync(request.ItemId);
                if (item != null)
                {
                    item.Status = request.Condition == "Missing" ? ItemStatus.MISSING : ItemStatus.AVAILABLE;
                }
            }

            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<Return> { Data = ret });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Return>>> Update(int id, [FromBody] UpdateReturnRequest request)
        {
            var ret = await _context.Returns.FindAsync(id);
            if (ret == null) return NotFound(new ApiResponse<Return> { Success = false, Message = "Return record not found" });

            if (request.Remarks != null) ret.Remarks = request.Remarks;
            if (request.ReceivedBy != null) ret.ReceivedBy = request.ReceivedBy;
            if (request.StatusId.HasValue) ret.StatusId = request.StatusId.Value;
            if (request.Condition != null) ret.Condition = request.Condition;
            
            if (request.CompanyId.HasValue) ret.CompanyId = request.CompanyId;
            if (request.ContractorId.HasValue) ret.ContractorId = request.ContractorId;
            if (request.MachineId.HasValue) ret.MachineId = request.MachineId;
            if (request.LocationId.HasValue) ret.LocationId = request.LocationId;

            ret.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<Return> { Data = ret });
        }

        [HttpPatch("{id}/inactive")]
        [HttpPost("{id}/inactive")] 
        public async Task<ActionResult<ApiResponse<Return>>> MarkInactive(int id)
        {
            var ret = await _context.Returns
                .Include(r => r.Issue).ThenInclude(i => i.Item)
                .Include(r => r.Issue).ThenInclude(i => i.Company)
                .Include(r => r.Issue).ThenInclude(i => i.Contractor)
                .Include(r => r.Issue).ThenInclude(i => i.Machine)
                .Include(r => r.Issue).ThenInclude(i => i.Location)
                .Include(r => r.Item)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (ret == null) return NotFound(new ApiResponse<Return> { Success = false, Message = "Return record not found" });

            // 1. Mark Return as Inactive
            ret.IsActive = false;
            ret.UpdatedAt = DateTime.Now;

            // 2. Revert associated Issue to "Not Returned"
            if (ret.Issue != null)
            {
                // Check if there are any OTHER active returns for this issue? 
                // Usually 1 issue = 1 return. If we inactive this return, the issue is effectively open.
                ret.Issue.IsReturned = false;
            }

            // 3. Revert associated Item to "ISSUED"
            if (ret.Item != null)
            {
                // If the return is voided, the item is theoretically back with the user (ISSUED)
                ret.Item.Status = ItemStatus.ISSUED;
            }
            else if (ret.Issue != null)
            {
                 // Try to fetch item via issue if direct navigation failed (unlikely with EF Include)
                 var item = await _context.Items.FindAsync(ret.Issue.ItemId);
                 if (item != null) item.Status = ItemStatus.ISSUED;
            }

            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<Return> { Data = ret });
        }

        [HttpPatch("{id}/active")]
        [HttpPost("{id}/active")]
        public async Task<ActionResult<ApiResponse<Return>>> MarkActive(int id)
        {
            var ret = await _context.Returns
                .Include(r => r.Issue).ThenInclude(i => i.Item)
                .Include(r => r.Issue).ThenInclude(i => i.Company)
                .Include(r => r.Issue).ThenInclude(i => i.Contractor)
                .Include(r => r.Issue).ThenInclude(i => i.Machine)
                .Include(r => r.Issue).ThenInclude(i => i.Location)
                .Include(r => r.Item)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (ret == null) return NotFound(new ApiResponse<Return> { Success = false, Message = "Return record not found" });

            // Ensure no other active return exists for this issue
            if (ret.IssueId.HasValue)
            {
                var otherActiveReturn = await _context.Returns
                    .AnyAsync(r => r.IssueId == ret.IssueId && r.IsActive && r.Id != id);

                if (otherActiveReturn)
                {
                    return BadRequest(new ApiResponse<Return> { Success = false, Message = "Another inward entry is already active for this outward entry. Please inactivate it before reactivating this one." });
                }
            }

            // 1. Mark Return as Active
            ret.IsActive = true;
            ret.UpdatedAt = DateTime.Now;

            // 2. Mark associated Issue as "Returned"
            if (ret.Issue != null)
            {
                ret.Issue.IsReturned = true;
            }

            // 3. Set Item Status based on Condition
            // Logic mirrored from Create: Missing -> MISSING, else -> AVAILABLE
            if (ret.Item != null)
            {
                 ret.Item.Status = ret.Condition == "Missing" ? ItemStatus.MISSING : ItemStatus.AVAILABLE;
            }
             else if (ret.Issue != null)
            {
                 var item = await _context.Items.FindAsync(ret.Issue.ItemId);
                 if (item != null) 
                 {
                    item.Status = ret.Condition == "Missing" ? ItemStatus.MISSING : ItemStatus.AVAILABLE;
                 }
            }

            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<Return> { Data = ret });
        }
    }
}
