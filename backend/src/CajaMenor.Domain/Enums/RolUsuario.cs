namespace CajaMenor.Domain.Enums;

public static class RolUsuario
{
    public const string Director = "Director";
    public const string Administrador = "Administrador";
    public const string Maestro = "Maestro";
    public const string Solicitante = "Solicitante";

    /// <summary>Roles que se pueden asignar a un usuario de negocio (no incluye Maestro, que solo se siembra).</summary>
    public static readonly string[] RolesAsignables = [Director, Administrador, Solicitante];
}
