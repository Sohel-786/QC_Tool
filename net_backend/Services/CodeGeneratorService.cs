namespace net_backend.Services
{
    public interface ICodeGeneratorService
    {
        string GenerateNextCode(string type, int count, string divisionPrefix);
    }

    public class CodeGeneratorService : ICodeGeneratorService
    {
        public string GenerateNextCode(string type, int count, string divisionPrefix)
        {
            string prefix = type == "OUTWARD" ? "OUT" : "INW";
            return $"{divisionPrefix}-{prefix}-{count + 1:D2}";
        }
    }
}
