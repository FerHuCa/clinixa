using System.Security.Cryptography;
using System.Text;

namespace HealthHub.Api.Infrastructure;

/// <summary>
/// Cifrado simetrico (AES-256-GCM) para secretos almacenados en BD, como los tokens
/// OAuth de Mercado Pago de cada profesional. La clave viene de Security:EncryptionKey
/// o ENCRYPTION_KEY (base64 de 32 bytes; generar con `openssl rand -base64 32`).
/// En Development sin clave usa una derivada fija para no bloquear pruebas locales;
/// en produccion sin clave valida, Protect lanza (fail closed) y Unprotect devuelve null.
/// </summary>
public sealed class TokenEncryptionService
{
    private const int NonceSize = 12;
    private const int TagSize = 16;

    private readonly byte[]? _key;

    public TokenEncryptionService(IConfiguration configuration, IHostEnvironment environment)
    {
        var configured = configuration["Security:EncryptionKey"]
            ?? Environment.GetEnvironmentVariable("ENCRYPTION_KEY");

        if (!string.IsNullOrWhiteSpace(configured))
        {
            try
            {
                var key = Convert.FromBase64String(configured.Trim());
                _key = key.Length == 32 ? key : null;
            }
            catch (FormatException)
            {
                _key = null;
            }
        }
        else if (environment.IsDevelopment())
        {
            _key = SHA256.HashData(Encoding.UTF8.GetBytes("healthhub-dev-encryption-key"));
        }
    }

    public bool IsConfigured => _key is not null;

    /// <summary>Cifra un secreto para guardarlo en BD. Lanza si no hay clave valida.</summary>
    public string Protect(string plaintext)
    {
        if (_key is null)
        {
            throw new InvalidOperationException(
                "Define ENCRYPTION_KEY (base64 de 32 bytes) para cifrar secretos fuera de Development.");
        }

        if (string.IsNullOrEmpty(plaintext))
        {
            return string.Empty;
        }

        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var plainBytes = Encoding.UTF8.GetBytes(plaintext);
        var cipherBytes = new byte[plainBytes.Length];
        var tag = new byte[TagSize];

        using var aes = new AesGcm(_key, TagSize);
        aes.Encrypt(nonce, plainBytes, cipherBytes, tag);

        var payload = new byte[NonceSize + cipherBytes.Length + TagSize];
        nonce.CopyTo(payload, 0);
        cipherBytes.CopyTo(payload, NonceSize);
        tag.CopyTo(payload, NonceSize + cipherBytes.Length);

        return Convert.ToBase64String(payload);
    }

    /// <summary>
    /// Descifra un valor de BD. Devuelve null ante clave ausente, formato invalido o
    /// manipulacion (fallo de autenticacion GCM); el caller decide como degradar.
    /// </summary>
    public string? Unprotect(string protectedValue)
    {
        if (_key is null || string.IsNullOrWhiteSpace(protectedValue))
        {
            return null;
        }

        try
        {
            var payload = Convert.FromBase64String(protectedValue);

            if (payload.Length < NonceSize + TagSize)
            {
                return null;
            }

            var nonce = payload.AsSpan(0, NonceSize);
            var cipherBytes = payload.AsSpan(NonceSize, payload.Length - NonceSize - TagSize);
            var tag = payload.AsSpan(payload.Length - TagSize, TagSize);
            var plainBytes = new byte[cipherBytes.Length];

            using var aes = new AesGcm(_key, TagSize);
            aes.Decrypt(nonce, cipherBytes, tag, plainBytes);

            return Encoding.UTF8.GetString(plainBytes);
        }
        catch (Exception exception) when (exception is FormatException or CryptographicException)
        {
            return null;
        }
    }
}
