using System.Security.Cryptography;
using System.Text;

namespace HealthHub.Api.Infrastructure;

public static class PasswordHasher
{
    public static (string Hash, string Salt) HashPassword(string password)
    {
        var saltBytes = RandomNumberGenerator.GetBytes(16);
        var salt = Convert.ToBase64String(saltBytes);
        return (HashPassword(password, salt), salt);
    }

    public static bool VerifyPassword(string password, string hash, string salt)
    {
        if (string.IsNullOrWhiteSpace(hash) || string.IsNullOrWhiteSpace(salt))
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(HashPassword(password, salt)),
            Encoding.UTF8.GetBytes(hash));
    }

    public static string CreateToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-", StringComparison.Ordinal)
            .Replace("/", "_", StringComparison.Ordinal)
            .TrimEnd('=');
    }

    public static string HashToken(string token)
    {
        var tokenBytes = Encoding.UTF8.GetBytes(token);
        return Convert.ToBase64String(SHA256.HashData(tokenBytes));
    }

    private static string HashPassword(string password, string salt)
    {
        var inputBytes = Encoding.UTF8.GetBytes($"{salt}:{password}");
        return Convert.ToBase64String(SHA256.HashData(inputBytes));
    }
}
