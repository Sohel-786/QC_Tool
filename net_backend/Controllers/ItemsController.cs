using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;
using net_backend.Utils;

namespace net_backend.Controllers
{
    [Route("items")]
    [ApiController]
    public class ItemsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;

        public ItemsController(ApplicationDbContext context, IExcelService excelService)
        {
            _context = context;
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var items = await _context.Items.Include(i => i.Category).ToListAsync();
            var data = items.Select(i => new {
                Id = i.Id,
                ItemName = i.ItemName,
                SerialNumber = i.SerialNumber,
                InHouseLocation = i.InHouseLocation,
                Category = i.Category?.Name,
                Status = i.Status.ToString(),
                IsActive = i.IsActive ? "Yes" : "No",
                CreatedAt = i.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });

            var file = _excelService.GenerateExcel(data, "Items");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "items.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<ItemImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<ItemImportDto>> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<ItemImportDto>(stream);
                var validation = await ValidateItems(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<ItemImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<ItemImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<object> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<ItemImportDto>(stream);
                
                var validation = await ValidateItems(result.Data);
                var newItems = new List<Item>();
                var categories = await _context.ItemCategories.ToDictionaryAsync(c => c.Name.ToLower(), c => c.Id);

                foreach (var validRow in validation.Valid)
                {
                    var item = validRow.Data;
                    int? categoryId = null;
                    if (!string.IsNullOrEmpty(item.Category) && categories.TryGetValue(item.Category.Trim().ToLower(), out var catId))
                    {
                        categoryId = catId;
                    }

                    newItems.Add(new Item
                    {
                        ItemName = item.ItemName.Trim(),
                        SerialNumber = item.SerialNumber!.Trim(),
                        Description = item.Description?.Trim(),
                        CategoryId = categoryId,
                        InHouseLocation = item.InHouseLocation?.Trim(),
                        Status = ItemStatus.AVAILABLE,
                        IsActive = true,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    });
                }

                if (newItems.Any())
                {
                    _context.Items.AddRange(newItems);
                    await _context.SaveChangesAsync();
                }

                var finalResult = new { imported = newItems.Count, totalRows = result.TotalRows, errors = validation.Invalid.Select(e => new RowError { Row = e.Row, Message = e.Message ?? "" }).ToList() };
                return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newItems.Count} items imported successfully" });
            }
            catch (Exception ex) { return Ok(new ApiResponse<object> { Success = false, Message = ex.Message }); }
        }

        private async Task<ValidationResultDto<ItemImportDto>> ValidateItems(List<ExcelRow<ItemImportDto>> rows)
        {
            var validation = new ValidationResultDto<ItemImportDto>();
            var existingSerials = await _context.Items.Select(i => i.SerialNumber.ToLower()).ToListAsync();
            var processedInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var item = row.Data;
                if (string.IsNullOrEmpty(item.ItemName) || string.IsNullOrEmpty(item.SerialNumber))
                {
                    validation.Invalid.Add(new ValidationEntry<ItemImportDto> { Row = row.RowNumber, Data = item, Message = "Name and Serial Number are mandatory" });
                    continue;
                }

                var serialLower = item.SerialNumber.Trim().ToLower();

                if (processedInFile.Contains(serialLower))
                {
                    validation.Duplicates.Add(new ValidationEntry<ItemImportDto> { Row = row.RowNumber, Data = item, Message = $"Duplicate Serial Number in file: {item.SerialNumber}" });
                    continue;
                }

                if (existingSerials.Contains(serialLower))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<ItemImportDto> { Row = row.RowNumber, Data = item, Message = $"Serial Number already exists: {item.SerialNumber}" });
                    processedInFile.Add(serialLower);
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<ItemImportDto> { Row = row.RowNumber, Data = item });
                processedInFile.Add(serialLower);
            }

            return validation;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Item>>>> GetAll([FromQuery] string? search, [FromQuery] string? status)
        {
            var query = _context.Items.Include(i => i.Category).AsQueryable();
            
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<ItemStatus>(status, true, out var itemStatus))
            {
                query = query.Where(i => i.Status == itemStatus);
            }

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(i => i.ItemName.Contains(search) || 
                                       (i.SerialNumber != null && i.SerialNumber.Contains(search)) || 
                                       (i.Description != null && i.Description.Contains(search)) || 
                                       (i.InHouseLocation != null && i.InHouseLocation.Contains(search)));
            }

            var items = await query.ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Item>> { Data = items });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetActive()
        {
            var items = await _context.Items
                .Where(i => i.IsActive)
                .Include(i => i.Category)
                .ToListAsync();

            var itemIds = items.Select(i => i.Id).ToList();
            
            var returnsData = await _context.Returns
                 .Where(r => r.IsActive && !string.IsNullOrEmpty(r.ReturnImage) && 
                            (r.ItemId != null && itemIds.Contains(r.ItemId.Value) || 
                             r.Issue != null && itemIds.Contains(r.Issue.ItemId)))
                 .Select(r => new {
                     ItemId = r.ItemId ?? r.Issue!.ItemId,
                     r.ReturnImage,
                     r.ReturnedAt
                 })
                 .ToListAsync();

             var latestReturns = returnsData
                 .GroupBy(x => x.ItemId)
                 .Select(g => new { ItemId = g.Key, LatestImage = g.OrderByDescending(r => r.ReturnedAt).First().ReturnImage })
                 .ToDictionary(x => x.ItemId, x => x.LatestImage);

            var result = items.Select(i => new {
                i.Id,
                i.ItemName,
                i.SerialNumber,
                i.Description,
                i.CategoryId,
                i.InHouseLocation,
                i.Category,
                i.Status,
                i.IsActive,
                i.Image,
                LatestImage = latestReturns.ContainsKey(i.Id) ? latestReturns[i.Id] : i.Image,
                i.CreatedAt,
                i.UpdatedAt
            }).ToList();

            return Ok(new ApiResponse<IEnumerable<object>> { Data = result });
        }

        [HttpGet("available")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAvailable()
        {
            var items = await _context.Items
                .Where(i => i.IsActive && i.Status == ItemStatus.AVAILABLE)
                .Include(i => i.Category)
                .ToListAsync();

            var itemIds = items.Select(i => i.Id).ToList();
            
            var returnsData = await _context.Returns
                 .Where(r => r.IsActive && !string.IsNullOrEmpty(r.ReturnImage) && 
                            (r.ItemId != null && itemIds.Contains(r.ItemId.Value) || 
                             r.Issue != null && itemIds.Contains(r.Issue.ItemId)))
                 .Select(r => new {
                     ItemId = r.ItemId ?? r.Issue!.ItemId,
                     r.ReturnImage,
                     r.ReturnedAt
                 })
                 .ToListAsync();

             var latestReturns = returnsData
                 .GroupBy(x => x.ItemId)
                 .Select(g => new { ItemId = g.Key, LatestImage = g.OrderByDescending(r => r.ReturnedAt).First().ReturnImage })
                 .ToDictionary(x => x.ItemId, x => x.LatestImage);

            var result = items.Select(i => {
                var latestImage = latestReturns.ContainsKey(i.Id) ? latestReturns[i.Id] : i.Image;
                return new {
                    i.Id,
                    i.ItemName,
                    i.SerialNumber,
                    i.Description,
                    i.CategoryId,
                    i.InHouseLocation,
                    i.Category,
                    i.Status,
                    i.IsActive,
                    i.Image,
                    LatestImage = latestImage,
                    i.CreatedAt,
                    i.UpdatedAt
                };
            })
            .Where(i => !string.IsNullOrEmpty(i.LatestImage)) // Requirement: Must have an image to be selectable
            .ToList();

            return Ok(new ApiResponse<IEnumerable<object>> { Data = result });
        }

        [HttpGet("missing")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetMissing()
        {
            var items = await _context.Items
                .Where(i => i.IsActive && i.Status == ItemStatus.MISSING)
                .Include(i => i.Category)
                .ToListAsync();

            // For missing items, we might want to see them even if they don't have an image? 
            // But let's keep consistent with other endpoints and fetch latest image if available.
            
            var itemIds = items.Select(i => i.Id).ToList();
            
            var returnsData = await _context.Returns
                 .Where(r => r.IsActive && !string.IsNullOrEmpty(r.ReturnImage) && 
                            (r.ItemId != null && itemIds.Contains(r.ItemId.Value) || 
                             r.Issue != null && itemIds.Contains(r.Issue.ItemId)))
                 .Select(r => new {
                     ItemId = r.ItemId ?? r.Issue!.ItemId,
                     r.ReturnImage,
                     r.ReturnedAt
                 })
                 .ToListAsync();

             var latestReturns = returnsData
                 .GroupBy(x => x.ItemId)
                 .Select(g => new { ItemId = g.Key, LatestImage = g.OrderByDescending(r => r.ReturnedAt).First().ReturnImage })
                 .ToDictionary(x => x.ItemId, x => x.LatestImage);

            var result = items.Select(i => {
                var latestImage = latestReturns.ContainsKey(i.Id) ? latestReturns[i.Id] : i.Image;
                return new {
                    i.Id,
                    i.ItemName,
                    i.SerialNumber,
                    i.Description,
                    i.CategoryId,
                    i.InHouseLocation,
                    i.Category,
                    i.Status,
                    i.IsActive,
                    i.Image,
                    LatestImage = latestImage,
                    i.CreatedAt,
                    i.UpdatedAt
                };
            }).ToList();

            return Ok(new ApiResponse<IEnumerable<object>> { Data = result });
        }

        [HttpGet("by-category/{categoryId}")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetByCategory(int categoryId)
        {
            var items = await _context.Items
                .Where(i => i.IsActive && i.CategoryId == categoryId)
                .Include(i => i.Category)
                .ToListAsync();

            var itemIds = items.Select(i => i.Id).ToList();
            
            var returnsData = await _context.Returns
                 .Where(r => r.IsActive && !string.IsNullOrEmpty(r.ReturnImage) && 
                            (r.ItemId != null && itemIds.Contains(r.ItemId.Value) || 
                             r.Issue != null && itemIds.Contains(r.Issue.ItemId)))
                 .Select(r => new {
                     ItemId = r.ItemId ?? r.Issue!.ItemId,
                     r.ReturnImage,
                     r.ReturnedAt
                 })
                 .ToListAsync();

             var latestReturns = returnsData
                 .GroupBy(x => x.ItemId)
                 .Select(g => new { ItemId = g.Key, LatestImage = g.OrderByDescending(r => r.ReturnedAt).First().ReturnImage })
                 .ToDictionary(x => x.ItemId, x => x.LatestImage);

            var result = items.Select(i => {
                var latestImage = latestReturns.ContainsKey(i.Id) ? latestReturns[i.Id] : i.Image;
                return new {
                    i.Id,
                    i.ItemName,
                    i.SerialNumber,
                    i.Description,
                    i.CategoryId,
                    i.InHouseLocation,
                    i.Category,
                    i.Status,
                    i.IsActive,
                    i.Image,
                    LatestImage = latestImage,
                    i.CreatedAt,
                    i.UpdatedAt
                };
            }).ToList();

            return Ok(new ApiResponse<IEnumerable<object>> { Data = result });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
        {
            var item = await _context.Items.Include(i => i.Category).FirstOrDefaultAsync(i => i.Id == id);
            if (item == null) return NotFound(new ApiResponse<object> { Success = false, Message = "Item not found" });

            var latestReturn = await _context.Returns
                .Include(r => r.Issue)
                .Where(r => (r.ItemId == id || (r.IssueId.HasValue && r.Issue!.ItemId == id)) && r.IsActive && !string.IsNullOrEmpty(r.ReturnImage))
                .OrderByDescending(r => r.ReturnedAt)
                .FirstOrDefaultAsync();

            var latestImage = latestReturn?.ReturnImage ?? item.Image;

            var result = new {
                item.Id,
                item.ItemName,
                item.SerialNumber,
                item.Description,
                item.CategoryId,
                item.InHouseLocation,
                item.Category,
                item.Status,
                item.IsActive,
                item.Image,
                LatestImage = latestImage,
                item.CreatedAt,
                item.UpdatedAt
            };

            return Ok(new ApiResponse<object> { Data = result });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Item>>> Create([FromForm] CreateItemRequest request, IFormFile? image)
        {
            if (!await CheckPermission("addMaster")) return Forbidden();

            if (string.IsNullOrEmpty(request.ItemName) || string.IsNullOrEmpty(request.SerialNumber))
            {
                return BadRequest(new ApiResponse<Item> { Success = false, Message = "Item name and serial number are required" });
            }

            if (await _context.Items.AnyAsync(i => i.SerialNumber.ToLower() == request.SerialNumber.Trim().ToLower()))
            {
                return Conflict(new ApiResponse<Item> { Success = false, Message = "Item with this serial number already exists" });
            }

            if (request.CategoryId.HasValue)
            {
                if (await _context.Items.AnyAsync(i => i.CategoryId == request.CategoryId && i.ItemName.ToLower() == request.ItemName.Trim().ToLower()))
                {
                    return BadRequest(new ApiResponse<Item> { Success = false, Message = "Item name already exists in this category" });
                }
            }

            string? imagePath = null;
            if (image != null)
            {
                var safeSerial = PathUtils.SanitizeSerialForPath(request.SerialNumber);
                var fileName = $"master-{safeSerial}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{Path.GetExtension(image.FileName)}";
                
                var uploads = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "storage", "items", safeSerial);
                Directory.CreateDirectory(uploads);
                
                var filePath = Path.Combine(uploads, fileName);
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await image.CopyToAsync(fileStream);
                }
                
                imagePath = $"items/{safeSerial}/{fileName}";
            }

            var item = new Item
            {
                ItemName = request.ItemName.Trim(),
                SerialNumber = request.SerialNumber.Trim(),
                Description = request.Description?.Trim(),
                Image = imagePath,
                CategoryId = request.CategoryId,
                InHouseLocation = request.InHouseLocation?.Trim(),
                IsActive = request.IsActive ?? true,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                Status = ItemStatus.AVAILABLE
            };

            _context.Items.Add(item);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Item> { Data = item });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Item>>> Update(int id, [FromForm] UpdateItemRequest request, IFormFile? image)
        {
            if (!await CheckPermission("editMaster")) return Forbidden();

            var item = await _context.Items.FindAsync(id);
            if (item == null) return NotFound(new ApiResponse<Item> { Success = false, Message = "Item not found" });

            if (!string.IsNullOrEmpty(request.ItemName)) 
            {
                // Check for duplicate name if name or category is changed
                // Note: request.CategoryId might be null if not updating category, but we need to check against current category
                var currentCategoryId = request.CategoryId ?? item.CategoryId;
                var newItemName = request.ItemName.Trim();
                
                if (currentCategoryId.HasValue && 
                    await _context.Items.AnyAsync(i => i.Id != id && i.CategoryId == currentCategoryId && i.ItemName.ToLower() == newItemName.ToLower()))
                {
                     return BadRequest(new ApiResponse<Item> { Success = false, Message = "Item name already exists in this category" });
                }
                item.ItemName = newItemName;
            }
            else if (request.CategoryId.HasValue && request.CategoryId != item.CategoryId)
            {
                // Only category changed, check if current name exists in new category
                 if (await _context.Items.AnyAsync(i => i.Id != id && i.CategoryId == request.CategoryId && i.ItemName.ToLower() == item.ItemName.ToLower()))
                {
                     return BadRequest(new ApiResponse<Item> { Success = false, Message = "Item name already exists in the new category" });
                }
            }

            if (request.Description != null) item.Description = request.Description.Trim();
            if (request.CategoryId.HasValue) item.CategoryId = request.CategoryId;
            if (request.InHouseLocation != null) item.InHouseLocation = request.InHouseLocation.Trim();

            // Restrict inactivation when item is in outward
            if (request.IsActive.HasValue && !request.IsActive.Value && item.Status == ItemStatus.ISSUED)
            {
                return BadRequest(new ApiResponse<Item> { Success = false, Message = "Item is in outward. Please inward first, then inactivate." });
            }
            if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
            
            if (!string.IsNullOrEmpty(request.Status) && Enum.TryParse<ItemStatus>(request.Status, true, out var newStatus))
            {
                item.Status = newStatus;
            }

            if (image != null)
            {
               var issueCount = await _context.Issues.CountAsync(i => i.ItemId == id);
               if (issueCount > 0)
               {
                   return BadRequest(new ApiResponse<Item> { Success = false, Message = "This item has already been issued at least once. Manual image updates in Item Master are locked. Use Inward (Inward) to update condition photos." });
               }

                var safeSerial = PathUtils.SanitizeSerialForPath(item.SerialNumber ?? "unknown");
                var fileName = $"master-{safeSerial}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{Path.GetExtension(image.FileName)}";
                
                var uploads = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "storage", "items", safeSerial);
                Directory.CreateDirectory(uploads);
                
                var filePath = Path.Combine(uploads, fileName);
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await image.CopyToAsync(fileStream);
                }
                
                item.Image = $"items/{safeSerial}/{fileName}";
            }

            item.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<Item> { Data = item });
        }

        private async Task<bool> CheckPermission(string permissionKey)
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId)) return false;

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            if (permissions == null)
            {
                 var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                 if (role == "QC_ADMIN") return true;
                 return false;
            }

            return permissionKey switch
            {
                "addMaster" => permissions.AddMaster,
                "editMaster" => permissions.EditMaster,
                _ => false
            };
        }

        private ActionResult Forbidden()
        {
            return StatusCode(403, new ApiResponse<object> { Success = false, Message = "You do not have permission to perform this action." });
        }
    }
}
