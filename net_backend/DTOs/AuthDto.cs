namespace net_backend.DTOs
{
    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? Avatar { get; set; }
        public List<DivisionDto> AllowedDivisions { get; set; } = new();
    }

    public class DivisionDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        public bool Success { get; set; }
        public UserDto? User { get; set; }
        public string? Message { get; set; }
    }
}
