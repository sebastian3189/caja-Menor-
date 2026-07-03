# SPEC-04 — Seguridad y Despliegue

> **Proyecto:** Sistema de Caja Menor  
> **Versión:** 1.1  
> **Fecha:** 2026-07-02  
> **Stack:** .NET 9 + React 18 + SQL Server + Azure (propuesto)

---

## 1. Análisis de seguridad actual

### 1.1 Fortalezas existentes

| Área | Estado |
|------|--------|
| Autenticación JWT con expiración | ✓ Implementado |
| Autorización por roles (Director / Administrador) | ✓ Implementado |
| Validación de extensiones en uploads | ✓ Implementado (.jpg, .png, .pdf, etc.) |
| CORS restringido a orígenes conocidos | ✓ Implementado (localhost:5173, 5174, 3000) |
| Contraseñas hasheadas con ASP.NET Identity | ✓ Implementado (BCrypt) |
| Log de operaciones con Serilog | ✓ Implementado |
| Tabla AuditLog para trazabilidad | ✓ Presente (no se escribe en todos los flujos) |

### 1.2 Vulnerabilidades y brechas identificadas

| # | Vulnerabilidad | Criticidad | Ubicación |
|---|---------------|------------|-----------|
| S-01 | JWT secret hardcodeado en fallback | **Alta** | `Program.cs:62` |
| S-02 | JWT sin revocación (logout no invalida token) | **Alta** | `AuthController` |
| S-03 | Sin validación de tamaño de archivo en uploads | **Alta** | `LegalizacionesController:56` |
| S-04 | Archivos servidos desde directorio físico sin autenticación | **Alta** | `Program.cs:125` |
| S-05 | CORS abierto en producción debería limitarse al dominio real | Media | `Program.cs:97` |
| S-06 | Sin rate limiting en login (brute force posible) | Media | `AuthController` |
| S-07 | AuditLog no se escribe en create/update/delete de avances y legalizaciones | Media | Services |
| S-08 | Sin HTTPS forzado | Media | `Program.cs` |
| S-09 | MasterAdmin credentials en config (no secretos) | Media | `appsettings.json` |
| S-10 | Sin validación de Content-Type en upload (solo extensión) | Baja | `LegalizacionesController` |
| S-11 | Path traversal posible si fileName contiene `../` | Baja | `LegalizacionesController` |

---

## 2. Correcciones de seguridad prioritarias

### S-01 — JWT secret sin hardcodear

**Problema:** `Program.cs:62` usa un fallback literal si `Jwt:Key` no está configurado:
```csharp
var jwtKey = builder.Configuration["Jwt:Key"] ?? "CajaMenorSecretKey2024!@#DefaultKey";
```

**Corrección:**
```csharp
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key no está configurado. Use User Secrets o variables de entorno.");
```

En desarrollo usar `dotnet user-secrets set "Jwt:Key" "tu-clave-256-bits"`.  
En producción usar variable de entorno `JWT__KEY` (Azure App Service → Configuration).

### S-02 — Revocación de JWT

**Problema:** Al hacer logout, el token sigue siendo válido hasta su expiración.

**Corrección (lista negra en memoria con Redis):**

```csharp
// Infrastructure/Services/TokenBlacklistService.cs
public class TokenBlacklistService(IDistributedCache cache)
{
    public async Task RevocarAsync(string jti, TimeSpan expiracion)
        => await cache.SetStringAsync($"revoked:{jti}", "1",
               new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = expiracion });

    public async Task<bool> EstaRevocadoAsync(string jti)
        => await cache.GetStringAsync($"revoked:{jti}") != null;
}
```

```csharp
// En el JWT claim agregar "jti" (JWT ID único)
// En el middleware de autenticación, verificar blacklist
// En AuthController.Logout() → agregar jti a blacklist
```

### S-03 — Límite de tamaño de archivo

**Corrección:**
```csharp
// Program.cs
builder.Services.Configure<FormOptions>(o => {
    o.MultipartBodyLengthLimit = 10_485_760; // 10 MB máximo
});

// En el controller, validar explícitamente:
if (archivo.Length > 10_485_760)
    return BadRequest(new { message = "El archivo no puede superar 10 MB" });
```

### S-04 — Archivos de uploads protegidos por autenticación

**Problema:** Cualquier persona con la URL puede descargar recibos y firmas.

**Corrección:** Eliminar el `UseStaticFiles` para uploads y crear endpoint autenticado:

```csharp
// Remover de Program.cs:
// app.UseStaticFiles(...)  ← para uploads/

// Agregar endpoint protegido:
[HttpGet("{id}/recibos/{reciboId}/descargar")]
[Authorize]
public async Task<IActionResult> DescargarRecibo(int cajaId, int id, int reciboId)
{
    var recibo = await service.ObtenerReciboAsync(reciboId);
    if (recibo is null) return NotFound();
    // Verificar que pertenece a la caja del usuario autenticado
    var bytes = await System.IO.File.ReadAllBytesAsync(recibo.RutaArchivo);
    return File(bytes, "application/octet-stream", recibo.NombreOriginal);
}
```

### S-05 — CORS en producción

```csharp
// Program.cs — separar configuración por ambiente
var origenesPermitidos = builder.Environment.IsProduction()
    ? new[] { "https://cajamenor.tudominio.com" }
    : new[] { "http://localhost:5173", "http://localhost:5174" };

options.AddPolicy("FrontendPolicy", policy =>
    policy.WithOrigins(origenesPermitidos)
          .AllowAnyHeader()
          .AllowAnyMethod());
```

### S-06 — Rate Limiting en login

```csharp
// Program.cs
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", o =>
    {
        o.PermitLimit = 5;
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueLimit = 0;
    });
});

// AuthController
[HttpPost("login")]
[EnableRateLimiting("login")]
public async Task<IActionResult> Login(...)
```

### S-07 — Completar escritura en AuditLog

Crear interceptor o middleware para escribir AuditLog automáticamente en todas las operaciones de escritura. Implementar en `AppDbContext.SaveChangesAsync()` override usando `ChangeTracker`:

```csharp
public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
{
    var cambios = ChangeTracker.Entries()
        .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
        .ToList();

    var resultado = await base.SaveChangesAsync(ct);

    foreach (var cambio in cambios)
        AuditLogs.Add(new AuditLog { ... });

    await base.SaveChangesAsync(ct);
    return resultado;
}
```

### S-10 y S-11 — Upload seguro

```csharp
// Validar Content-Type además de extensión
var contentTypesPermitidos = new[]
{
    "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"
};
if (!contentTypesPermitidos.Contains(archivo.ContentType))
    return BadRequest(new { message = "Tipo de contenido no permitido" });

// Sanitizar nombre de archivo para evitar path traversal
var nombreSeguro = Path.GetFileName(archivo.FileName); // elimina directorios
var fileName = $"leg_{id}_{Guid.NewGuid()}{ext}"; // siempre usar GUID
```

---

## 3. Hardening adicional

### 3.1 Headers de seguridad HTTP

```csharp
// Program.cs
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("Content-Security-Policy",
        "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'");
    await next();
});
```

### 3.2 HTTPS en producción

```csharp
// Program.cs (solo en producción)
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}
```

### 3.3 Swagger sólo en desarrollo

```csharp
// Solo exponer Swagger en Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
// En producción nunca exponer Swagger
```

---

## 4. Plan de despliegue

### 4.1 Arquitectura de despliegue (Azure)

```
┌────────────────────────────────────────────────────────────┐
│                        AZURE                               │
│                                                            │
│  ┌─────────────────┐      ┌──────────────────────┐        │
│  │  Azure Static   │      │   Azure App Service   │        │
│  │  Web Apps       │ HTTP │   (Plan B1+)          │        │
│  │  (React SPA)    │──────►   .NET 9 API          │        │
│  │  cajamenor.azurestaticapps.net │               │        │
│  └─────────────────┘      └──────────┬───────────┘        │
│                                      │                     │
│                            ┌─────────▼─────────┐          │
│                            │  Azure SQL Database│          │
│                            │  (General Purpose  │          │
│                            │   S1 o superior)   │          │
│                            └───────────────────┘          │
│                                                            │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Azure Blob      │  │  Azure Key Vault │               │
│  │  Storage         │  │  (JWT secret,    │               │
│  │  (recibos/firmas)│  │  DB password,    │               │
│  └──────────────────┘  │  OCR keys)       │               │
│                        └──────────────────┘               │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Alternativa económica (VPS con Docker)

```yaml
# docker-compose.yml
version: '3.9'
services:
  api:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=${DB_CONNECTION}
      - Jwt__Key=${JWT_KEY}
      - Azure__FormRecognizer__Key=${OCR_KEY}
    volumes:
      - uploads:/app/uploads
    depends_on:
      - db

  frontend:
    build: ./frontend/cajamenor-app
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api

  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=${SA_PASSWORD}
    volumes:
      - sqldata:/var/opt/mssql

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - certs:/etc/letsencrypt
    ports:
      - "80:80"
      - "443:443"

volumes:
  uploads:
  sqldata:
  certs:
```

### 4.3 Variables de entorno requeridas en producción

| Variable | Descripción |
|----------|-------------|
| `ConnectionStrings__DefaultConnection` | Cadena de conexión SQL Server |
| `Jwt__Key` | Clave simétrica 256 bits mínimo |
| `Jwt__Issuer` | Dominio de la API (ej. `api.cajamenor.com`) |
| `Jwt__Audience` | Dominio del frontend (ej. `cajamenor.com`) |
| `MasterAdmin__User` | Usuario del admin maestro |
| `MasterAdmin__Password` | Contraseña del admin maestro (mínimo 16 chars) |
| `Azure__FormRecognizer__Endpoint` | Endpoint del servicio OCR |
| `Azure__FormRecognizer__Key` | API key del servicio OCR |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ASPNETCORE_URLS` | `https://+:5000` |

### 4.4 Pipeline de CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy CajaMenor

on:
  push:
    branches: [main]

jobs:
  build-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.0.x'
      - run: dotnet restore backend/
      - run: dotnet build backend/ --configuration Release --no-restore
      - run: dotnet test backend/ --no-build
      - run: dotnet publish backend/src/CajaMenor.API -c Release -o ./publish/api
      - uses: actions/upload-artifact@v4
        with:
          name: api-publish
          path: ./publish/api

  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci --prefix frontend/cajamenor-app
      - run: npm run build --prefix frontend/cajamenor-app
      - uses: actions/upload-artifact@v4
        with:
          name: frontend-build
          path: frontend/cajamenor-app/dist

  deploy:
    needs: [build-backend, build-frontend]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy API to Azure App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: cajamenor-api
          publish-profile: ${{ secrets.AZURE_PUBLISH_PROFILE }}
          package: ./publish/api
      - name: Deploy frontend to Azure Static Web Apps
        uses: azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: upload
          app_location: /frontend/cajamenor-app/dist
```

### 4.5 Nginx como reverse proxy (VPS)

```nginx
# nginx.conf
server {
    listen 80;
    server_name cajamenor.com www.cajamenor.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name cajamenor.com;

    ssl_certificate /etc/letsencrypt/live/cajamenor.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cajamenor.com/privkey.pem;

    # Frontend SPA
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://api:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Archivos subidos (solo acceso autenticado via API)
    location /uploads/ {
        deny all;
    }
}
```

---

## 5. Checklist pre-despliegue a producción

### Backend
- [ ] `appsettings.Production.json` no contiene secretos (usar variables de entorno)
- [ ] JWT key en Key Vault o variable de entorno (no en código)
- [ ] `ASPNETCORE_ENVIRONMENT=Production`
- [ ] Swagger deshabilitado en producción
- [ ] HTTPS forzado (`UseHsts`, `UseHttpsRedirection`)
- [ ] CORS configurado solo con el dominio de producción
- [ ] Rate limiting habilitado
- [ ] Logs configurados en nivel `Warning` o superior (no `Debug`)
- [ ] Migraciones aplicadas antes de levantar la app
- [ ] Tamaño máximo de upload configurado (10 MB)
- [ ] Headers de seguridad HTTP configurados

### Base de datos
- [ ] Usuario SQL con permisos mínimos (no `sa`)
- [ ] Backups automáticos configurados (mínimo diario)
- [ ] Conexión cifrada (TLS)
- [ ] Firewall de SQL Server: solo permite conexión desde la API

### Frontend
- [ ] Variables `VITE_API_URL` apuntan a la URL de producción
- [ ] Build con `--mode production` (minificado, sin source maps públicos)
- [ ] CSP (Content Security Policy) configurada en Nginx

### Infraestructura
- [ ] Certificado SSL válido y con auto-renovación (Let's Encrypt)
- [ ] Backups de volumen de uploads configurados
- [ ] Monitoreo de uptime (ej. UptimeRobot)
- [ ] Alertas de error configuradas (ej. Azure Monitor o Sentry)

---

## 6. Monitoreo post-despliegue

### Health check endpoint

```csharp
// Program.cs
app.MapHealthChecks("/health");
builder.Services.AddHealthChecks()
    .AddSqlServer(connectionString, name: "database")
    .AddUrlGroup(new Uri(config["Azure:FormRecognizer:Endpoint"]!), name: "ocr-service");
```

### Logging estructurado

Usar Serilog con sink a Azure Application Insights o a un archivo con rotación diaria (ya configurado). Agregar enriquecedores:

```csharp
Log.Logger = new LoggerConfiguration()
    .Enrich.WithProperty("Application", "CajaMenor")
    .Enrich.WithProperty("Environment", env.EnvironmentName)
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File("logs/cajamenor-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30)
    .CreateLogger();
```
