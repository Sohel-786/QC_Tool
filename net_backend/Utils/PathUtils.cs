using System.Text.RegularExpressions;

namespace net_backend.Utils
{
    public static class PathUtils
    {
        public static string SanitizeSerialForPath(string serial)
        {
            if (string.IsNullOrWhiteSpace(serial)) return "unknown";
            
            // Match Node.js: serial.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            var sanitized = Regex.Replace(serial, "[^a-zA-Z0-9]", "_").ToLower();
            
            // Avoid multiple underscores if desired, though Node.js simple regex might produces them. 
            // Node: "A-B" -> "a_b". "A  B" -> "a__b". 
            // My previous logic collapsed them. 
            // To be EXACTLY like Node.js: /[^a-z0-9]/gi -> '_'
            // Let's stick to the simplest valid filename safe version that is consistent.
            
            return sanitized.Length > 120 ? sanitized.Substring(0, 120) : sanitized;
        }
    }
}
