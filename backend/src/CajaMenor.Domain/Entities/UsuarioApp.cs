namespace CajaMenor.Domain.Entities;

public class UsuarioApp
{
    public int Id { get; set; }
    public string IdentityUserId { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public int CentralId { get; set; }

    public Central Central { get; set; } = null!;
    public ICollection<CajaMenorEntity> CajasMenoresComoDirector { get; set; } = [];
    public ICollection<CajaMenorEntity> CajasMenoresComoAdmin { get; set; } = [];
}
