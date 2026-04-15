using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace CajaMenor.API;

/// <summary>
/// Añade el requisito de autenticación Basic a los endpoints que lo necesitan
/// (GET y DELETE /api/auth/usuarios — usuario maestro).
/// </summary>
public class BasicAuthOperationFilter : IOperationFilter
{
    private static readonly HashSet<string> _basicEndpoints =
    [
        "ListarUsuarios",
        "EliminarUsuario"
    ];

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        if (!_basicEndpoints.Contains(context.MethodInfo.Name)) return;

        operation.Security =
        [
            new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Basic"
                        }
                    },
                    Array.Empty<string>()
                }
            }
        ];
    }
}
