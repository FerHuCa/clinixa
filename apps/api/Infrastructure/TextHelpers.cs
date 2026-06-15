namespace HealthHub.Api.Infrastructure;

public static class TextHelpers
{
    public static string Slugify(string value)
    {
        var lower = value.Trim().ToLowerInvariant();
        var chars = lower.Select(character => char.IsLetterOrDigit(character) ? character : '-').ToArray();
        var slug = string.Join("-", new string(chars).Split('-', StringSplitOptions.RemoveEmptyEntries));
        return string.IsNullOrWhiteSpace(slug) ? "paciente" : slug;
    }

    public static string InitialsFromName(string fullName)
    {
        var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return string.Concat(parts.Take(2).Select(part => char.ToUpperInvariant(part[0])));
    }
}
