namespace CajaMenor.Application.DTOs;

public class LoginDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime Expiration { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string NombreCompleto { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public int CajaId { get; set; }
    public string NombreCaja { get; set; } = string.Empty;
    /// <summary>Si es true, el usuario debe cambiar su contraseña antes de usar la app (primer ingreso).</summary>
    public bool MustChangePassword { get; set; }
}

public class RegistrarUsuarioDto
{
    public string NombreCompleto { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    /// <summary>Cédula de la persona. Es la contraseña inicial; el usuario deberá cambiarla en su primer ingreso.</summary>
    public string Cedula { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public int CentralId { get; set; }
    /// <summary>Opcional. Solo para rol Solicitante: caja a la que queda asignado al crearlo.</summary>
    public int? CajaId { get; set; }
}

public class CambiarPasswordDto
{
    public string PasswordActual { get; set; } = string.Empty;
    public string NuevaPassword { get; set; } = string.Empty;
}

public class UsuarioListDto
{
    /// <summary>Id de Identity (GUID). Se usa en las rutas de auth: editar/eliminar/asignar-caja.</summary>
    public string Id { get; set; } = string.Empty;
    /// <summary>Id interno de UsuarioApp (int). Se usa como DirectorId/AdministradorId al crear o editar una caja.</summary>
    public int UsuarioAppId { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public int CentralId { get; set; }
    public string NombreCentral { get; set; } = string.Empty;
    public string NombreCaja { get; set; } = string.Empty;
}

public class ForgotPasswordDto
{
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    public string Email { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string NuevaPassword { get; set; } = string.Empty;
}

public class EditarUsuarioDto
{
    public string NombreCompleto { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public int CentralId { get; set; }
    /// <summary>Opcional: si se envía, resetea la contraseña del usuario.</summary>
    public string? NuevaPassword { get; set; }
}
