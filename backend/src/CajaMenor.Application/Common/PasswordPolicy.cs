namespace CajaMenor.Application.Common;

/// <summary>
/// Reglas de contraseña segura que fija el usuario (mín. 8, mayúscula, minúscula, número y carácter especial).
/// No aplica a la contraseña inicial (la cédula), que solo sirve para el primer ingreso.
/// </summary>
public static class PasswordPolicy
{
    public const int LongitudMinima = 8;

    /// <summary>Devuelve un mensaje de error si la contraseña no cumple, o null si es válida.</summary>
    public static string? Validar(string? password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < LongitudMinima)
            return $"La contraseña debe tener al menos {LongitudMinima} caracteres.";
        if (!password.Any(char.IsUpper))
            return "La contraseña debe incluir al menos una letra mayúscula.";
        if (!password.Any(char.IsLower))
            return "La contraseña debe incluir al menos una letra minúscula.";
        if (!password.Any(char.IsDigit))
            return "La contraseña debe incluir al menos un número.";
        if (password.All(char.IsLetterOrDigit))
            return "La contraseña debe incluir al menos un carácter especial (por ejemplo: ! @ # $ % & *).";
        return null;
    }
}
