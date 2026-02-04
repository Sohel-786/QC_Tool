namespace net_backend.DTOs
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; } = true;
        public T? Data { get; set; }
        public string? Message { get; set; }
    }

    public class CompanyDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateCompanyRequest
    {
        public string Name { get; set; } = string.Empty;
        public bool? IsActive { get; set; }
    }
}
