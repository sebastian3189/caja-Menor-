namespace CajaMenor.Application.Interfaces;

/// <summary>
/// Lista negra de tokens JWT revocados (logout). El identificador es el claim "jti".
/// La entrada expira sola cuando el token habría caducado, evitando crecimiento indefinido.
/// </summary>
public interface ITokenBlacklistService
{
    void Revocar(string jti, TimeSpan expiracion);
    bool EstaRevocado(string jti);
}
