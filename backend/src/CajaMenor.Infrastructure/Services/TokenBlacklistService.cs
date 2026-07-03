using CajaMenor.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace CajaMenor.Infrastructure.Services;

/// <summary>
/// Implementación en memoria de la lista negra de JWT.
/// En despliegues multi-instancia debe sustituirse por Redis (IDistributedCache) — ver SPEC-05.
/// </summary>
public class TokenBlacklistService(IMemoryCache cache) : ITokenBlacklistService
{
    private const string Prefijo = "jwt-revocado:";

    public void Revocar(string jti, TimeSpan expiracion)
    {
        if (string.IsNullOrWhiteSpace(jti)) return;
        // Nunca guardar por menos de 1 min ni por más que la vida del token
        var ttl = expiracion < TimeSpan.FromMinutes(1) ? TimeSpan.FromMinutes(1) : expiracion;
        cache.Set(Prefijo + jti, true, ttl);
    }

    public bool EstaRevocado(string jti)
        => !string.IsNullOrWhiteSpace(jti) && cache.TryGetValue(Prefijo + jti, out _);
}
