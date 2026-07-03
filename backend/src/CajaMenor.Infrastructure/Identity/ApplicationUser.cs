using Microsoft.AspNetCore.Identity;

namespace CajaMenor.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
    public string NombreCompleto { get; set; } = string.Empty;
    /// <summary>Obliga a cambiar la contraseña en el primer ingreso (la inicial es la cédula asignada por el Maestro).</summary>
    public bool MustChangePassword { get; set; }
}
