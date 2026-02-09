namespace net_backend.DTOs
{
    public class CompanyImportDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class ContractorImportDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class LocationImportDto
    {
        public string Name { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string? IsActive { get; set; }
    }

    public class MachineImportDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class StatusImportDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class CategoryImportDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class ItemImportDto
    {
        public string ItemName { get; set; } = string.Empty;
        public string? SerialNumber { get; set; }
        public string? Description { get; set; }
        public string? Category { get; set; }
    }

    public class RowError
    {
        public int Row { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class ExcelRow<T> where T : new()
    {
        public int RowNumber { get; set; }
        public T Data { get; set; } = new T();
    }

    public class ValidationEntry<T> where T : new()
    {
        public int Row { get; set; }
        public T Data { get; set; } = new T();
        public string? Message { get; set; }
    }

    public class ValidationResultDto<T> where T : new()
    {
        public List<ValidationEntry<T>> Valid { get; set; } = new();
        public List<ValidationEntry<T>> Duplicates { get; set; } = new();
        public List<ValidationEntry<T>> AlreadyExists { get; set; } = new();
        public List<ValidationEntry<T>> Invalid { get; set; } = new();
        public int TotalRows { get; set; }
    }

    public class ImportResultDto<T> where T : new()
    {
        public int Imported { get; set; }
        public int TotalRows { get; set; }
        public List<RowError> Errors { get; set; } = new List<RowError>();
        public List<ExcelRow<T>> Data { get; set; } = new List<ExcelRow<T>>();
    }
}
