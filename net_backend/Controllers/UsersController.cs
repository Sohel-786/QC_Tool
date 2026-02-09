using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("users")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<User>>>> GetAll()
        {
            var users = await _context.Users.ToListAsync();
            return Ok(new ApiResponse<IEnumerable<User>> { Data = users });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<User>>> GetById(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            return Ok(new ApiResponse<User> { Data = user });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<User>>> Create([FromBody] CreateUserRequest request)
        {
            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
                return Conflict(new ApiResponse<User> { Success = false, Message = "Username already exists" });

            var user = new User
            {
                Username = request.Username,
                Password = BCrypt.Net.BCrypt.HashPassword(request.Password),
                FirstName = request.FirstName,
                LastName = request.LastName,
                Role = Enum.Parse<Role>(request.Role),
                IsActive = request.IsActive,
                Avatar = request.Avatar,
                MobileNumber = request.MobileNumber,
                CreatedBy = request.CreatedBy,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            // Validation for MobileNumber
            if ((user.Role == Role.QC_USER || user.Role == Role.QC_MANAGER) && string.IsNullOrEmpty(user.MobileNumber))
            {
                return BadRequest(new ApiResponse<User> { Success = false, Message = "Mobile number is mandatory for User and Manager roles." });
            }

            if (!string.IsNullOrEmpty(user.MobileNumber))
            {
                var indianPhoneRegex = new System.Text.RegularExpressions.Regex(@"^[6-9]\d{9}$");
                if (!indianPhoneRegex.IsMatch(user.MobileNumber))
                {
                    return BadRequest(new ApiResponse<User> { Success = false, Message = "Please provide a valid 10-digit Indian mobile number." });
                }
            }

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<User> { Data = user });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<User>>> Update(int id, [FromBody] UpdateUserRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            if (!string.IsNullOrEmpty(request.Username) && request.Username != user.Username)
            {
                if (await _context.Users.AnyAsync(u => u.Username == request.Username && u.Id != id))
                {
                    return Conflict(new ApiResponse<User> { Success = false, Message = "Username already exists" });
                }
                user.Username = request.Username;
            }

            if (!string.IsNullOrEmpty(request.FirstName)) user.FirstName = request.FirstName;
            if (!string.IsNullOrEmpty(request.LastName)) user.LastName = request.LastName;
            if (!string.IsNullOrEmpty(request.Role)) user.Role = Enum.Parse<Role>(request.Role);
            if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;
            if (!string.IsNullOrEmpty(request.Password)) user.Password = BCrypt.Net.BCrypt.HashPassword(request.Password);
            if (request.Avatar != null) user.Avatar = string.IsNullOrEmpty(request.Avatar) ? null : request.Avatar;
            if (request.MobileNumber != null) user.MobileNumber = request.MobileNumber;

            // Validation for MobileNumber
            if ((user.Role == Role.QC_USER || user.Role == Role.QC_MANAGER) && string.IsNullOrEmpty(user.MobileNumber))
            {
                return BadRequest(new ApiResponse<User> { Success = false, Message = "Mobile number is mandatory for User and Manager roles." });
            }

            if (!string.IsNullOrEmpty(user.MobileNumber))
            {
                var indianPhoneRegex = new System.Text.RegularExpressions.Regex(@"^[6-9]\d{9}$");
                if (!indianPhoneRegex.IsMatch(user.MobileNumber))
                {
                    return BadRequest(new ApiResponse<User> { Success = false, Message = "Please provide a valid 10-digit Indian mobile number." });
                }
            }

            user.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<User> { Data = user });
        }
    }
}
