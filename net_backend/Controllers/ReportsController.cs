using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("reports")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ReportsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("issued-items")]
        public async Task<ActionResult<ApiResponse<object>>> GetIssuedItemsReport(
            [FromQuery] int page = 1, 
            [FromQuery] int limit = 25,
            [FromQuery] string? search = null,
            [FromQuery] string? companyIds = null,
            [FromQuery] string? contractorIds = null,
            [FromQuery] string? machineIds = null,
            [FromQuery] string? locationIds = null,
            [FromQuery] string? itemIds = null,
            [FromQuery] string? operatorName = null)
        {
            var query = _context.Issues.Where(i => !i.IsReturned).AsQueryable();

            if (!string.IsNullOrEmpty(search))
                query = query.Where(i => i.IssueNo.Contains(search) || (i.Item != null && i.Item.ItemName.Contains(search)) || (i.IssuedTo != null && i.IssuedTo.Contains(search)));
            
            if (!string.IsNullOrEmpty(companyIds))
            {
                var ids = companyIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => ids.Contains(i.CompanyId));
            }
            if (!string.IsNullOrEmpty(contractorIds))
            {
                var ids = contractorIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => ids.Contains(i.ContractorId));
            }
            if (!string.IsNullOrEmpty(machineIds))
            {
                var ids = machineIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => ids.Contains(i.MachineId));
            }
            if (!string.IsNullOrEmpty(locationIds))
            {
                var ids = locationIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => ids.Contains(i.LocationId));
            }
            if (!string.IsNullOrEmpty(itemIds))
            {
                var ids = itemIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => ids.Contains(i.ItemId));
            }
            if (!string.IsNullOrEmpty(operatorName))
                query = query.Where(i => i.IssuedTo != null && i.IssuedTo.Contains(operatorName));

            var total = await query.CountAsync();
            var issues = await query
                .Include(i => i.Item)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.IssuedByUser)
                .OrderByDescending(i => i.IssuedAt)
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToListAsync();

            return Ok(new 
            {
                Success = true,
                Data = issues,
                Total = total,
                Page = page,
                Limit = limit
            });
        }

        [HttpGet("missing-items")]
        public async Task<ActionResult<ApiResponse<object>>> GetMissingItemsReport(
            [FromQuery] int page = 1, 
            [FromQuery] int limit = 25,
            [FromQuery] string? search = null)
        {
            var query = _context.Items.Where(i => i.Status == ItemStatus.MISSING).AsQueryable();

            if (!string.IsNullOrEmpty(search))
                query = query.Where(i => i.ItemName.Contains(search) || i.SerialNumber.Contains(search));

            var total = await query.CountAsync();
            var items = await query
                .Include(i => i.Category)
                .Include(i => i.Issues).ThenInclude(issue => issue.Location)
                .OrderBy(i => i.ItemName)
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToListAsync();

            return Ok(new 
            {
                Success = true,
                Data = items,
                Total = total,
                Page = page,
                Limit = limit
            });
        }

        [HttpGet("item-history/{itemId}")]
        public async Task<ActionResult<ApiResponse<object>>> GetItemHistory(
            int itemId,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 25)
        {
            var item = await _context.Items.Include(i => i.Category).FirstOrDefaultAsync(i => i.Id == itemId);
            if (item == null) return NotFound(new ApiResponse<object> { Success = false, Message = "Item not found" });

            // Node.js implementation returns issues and returns as rows
            var issues = await _context.Issues
                .Where(i => i.ItemId == itemId)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.IssuedByUser)
                .Include(i => i.Returns).ThenInclude(r => r.ReturnedByUser)
                .OrderByDescending(i => i.IssuedAt)
                .ToListAsync();

            var rows = new List<object>();
            foreach (var issue in issues)
            {
                rows.Add(new
                {
                    type = "issue",
                    date = issue.IssuedAt,
                    issueNo = issue.IssueNo,
                    description = "Item Issued",
                    company = issue.Company?.Name,
                    contractor = issue.Contractor?.Name,
                    machine = issue.Machine?.Name,
                    location = issue.Location?.Name,
                    user = issue.IssuedByUser != null ? $"{issue.IssuedByUser.FirstName} {issue.IssuedByUser.LastName}" : "System",
                    remarks = issue.Remarks
                });

                foreach (var ret in issue.Returns)
                {
                    rows.Add(new
                    {
                        type = "return",
                        date = ret.ReturnedAt,
                        issueNo = issue.IssueNo,
                        description = "Item Returned",
                        company = issue.Company?.Name,
                        contractor = issue.Contractor?.Name,
                        machine = issue.Machine?.Name,
                        location = issue.Location?.Name,
                        user = ret.ReturnedByUser != null ? $"{ret.ReturnedByUser.FirstName} {ret.ReturnedByUser.LastName}" : "System",
                        remarks = ret.Remarks,
                        returnCode = ret.ReturnCode,
                        condition = ret.Condition
                    });
                }
            }

            var sortedRows = rows.OrderByDescending(r => (DateTime)((dynamic)r).date).ToList();
            var total = sortedRows.Count();
            var pagedRows = sortedRows.Skip((page - 1) * limit).Take(limit).ToList();

            return Ok(new ApiResponse<object>
            {
                Data = new
                {
                    item,
                    rows = pagedRows,
                    total = total
                }
            });
        }
        [HttpGet("export/issued-items")]
        public async Task<IActionResult> ExportIssuedItems(
            [FromQuery] string? search = null,
            [FromQuery] string? companyIds = null,
            [FromQuery] string? contractorIds = null,
            [FromQuery] string? machineIds = null,
            [FromQuery] string? locationIds = null)
        {
            var query = _context.Issues.Where(i => !i.IsReturned).AsQueryable();

            if (!string.IsNullOrEmpty(search))
                query = query.Where(i => i.IssueNo.Contains(search) || (i.Item != null && i.Item.ItemName.Contains(search)));
            if (!string.IsNullOrEmpty(companyIds))
                query = query.Where(i => companyIds.Split(',', StringSplitOptions.None).Select(int.Parse).Contains(i.CompanyId));
            if (!string.IsNullOrEmpty(contractorIds))
                query = query.Where(i => contractorIds.Split(',', StringSplitOptions.None).Select(int.Parse).Contains(i.ContractorId));
            if (!string.IsNullOrEmpty(machineIds))
                query = query.Where(i => machineIds.Split(',', StringSplitOptions.None).Select(int.Parse).Contains(i.MachineId));
            if (!string.IsNullOrEmpty(locationIds))
                query = query.Where(i => locationIds.Split(',', StringSplitOptions.None).Select(int.Parse).Contains(i.LocationId));

            var issues = await query
                .Include(i => i.Item)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.IssuedByUser)
                .OrderByDescending(i => i.IssuedAt)
                .ToListAsync();

            var csv = "Issue No,Item Name,Issued To,Company,Contractor,Machine,Location,Issued At\n" +
                      string.Join("\n", issues.Select(i => $"\"{i.IssueNo}\",\"{i.Item?.ItemName}\",\"{i.IssuedTo}\",\"{i.Company?.Name}\",\"{i.Contractor?.Name}\",\"{i.Machine?.Name}\",\"{i.Location?.Name}\",\"{i.IssuedAt:yyyy-MM-dd HH:mm}\""));

            return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "issued_items.csv");
        }

        [HttpGet("export/missing-items")]
        public async Task<IActionResult> ExportMissingItems([FromQuery] string? search = null)
        {
            var query = _context.Items.Where(i => i.Status == ItemStatus.MISSING).AsQueryable();
            if (!string.IsNullOrEmpty(search))
                query = query.Where(i => i.ItemName.Contains(search) || i.SerialNumber.Contains(search));

            var items = await query.Include(i => i.Category).OrderBy(i => i.ItemName).ToListAsync();
            var csv = "Item Name,Serial Number,Category,Description\n" +
                      string.Join("\n", items.Select(i => $"\"{i.ItemName}\",\"{i.SerialNumber}\",\"{i.Category?.Name}\",\"{i.Description}\""));

            return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "missing_items.csv");
        }

        [HttpGet("export/item-history")]
        public async Task<IActionResult> ExportItemHistory([FromQuery] int itemId)
        {
            var item = await _context.Items.FindAsync(itemId);
            if (item == null) return NotFound();

            var issues = await _context.Issues
                .Where(i => i.ItemId == itemId)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.IssuedByUser)
                .Include(r => r.Returns).ThenInclude(r => r.ReturnedByUser)
                .OrderByDescending(i => i.IssuedAt)
                .ToListAsync();

            var csv = "Type,Date,Issue No,Description,Company,Contractor,Machine,Location,User,Remarks\n";
            foreach (var issue in issues)
            {
                csv += $"\"Issue\",\"{issue.IssuedAt:yyyy-MM-dd HH:mm}\",\"{issue.IssueNo}\",\"Item Issued\",\"{issue.Company?.Name}\",\"{issue.Contractor?.Name}\",\"{issue.Machine?.Name}\",\"{issue.Location?.Name}\",\"{issue.IssuedByUser?.FirstName} {issue.IssuedByUser?.LastName}\",\"{issue.Remarks}\"\n";
                foreach (var ret in issue.Returns)
                {
                    csv += $"\"Return\",\"{ret.ReturnedAt:yyyy-MM-dd HH:mm}\",\"{issue.IssueNo}\",\"Item Returned\",\"{issue.Company?.Name}\",\"{issue.Contractor?.Name}\",\"{issue.Machine?.Name}\",\"{issue.Location?.Name}\",\"{ret.ReturnedByUser?.FirstName} {ret.ReturnedByUser?.LastName}\",\"{ret.Remarks}\"\n";
                }
            }

            return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", $"item_history_{item.SerialNumber}.csv");
        }
    }
}
