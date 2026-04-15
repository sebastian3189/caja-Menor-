using Microsoft.AspNetCore.Identity;

namespace CajaMenor.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
    public string NombreCompleto { get; set; } = string.Empty;
}
