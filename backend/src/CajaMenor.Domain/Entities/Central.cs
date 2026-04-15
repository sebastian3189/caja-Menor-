namespace CajaMenor.Domain.Entities;

public class Central
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string CodigoCentral { get; set; } = string.Empty;

    public ICollection<CajaMenorEntity> CajasMenores { get; set; } = [];
    public ICollection<UsuarioApp> Usuarios { get; set; } = [];
}
