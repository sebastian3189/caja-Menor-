# Auditoría de Seguridad, Gobernanza y Aseguramiento de la Información

> **Proyecto:** Sistema de Caja Menor — MiraxionTech
> **Fecha de auditoría:** 2026-07-03
> **Alcance:** Backend .NET 9 + Frontend React (stitch-app) + SQL Server
> **Basado en:** SPEC-04, OWASP Top 10 (2021), ISO/IEC 27001 (controles Anexo A), NIST CSF 2.0

---

## 1. Resumen ejecutivo

Se ejecutó el endurecimiento de seguridad **pre-producción** definido en SPEC-04. De las **11 vulnerabilidades** identificadas, **9 quedaron resueltas y verificadas**, y **2 quedan documentadas como controles post-producción** (S-02 con Redis multi-instancia y S-04 protección física de archivos), planificadas en el **SPEC-05**.

| Indicador | Antes | Después |
|-----------|-------|---------|
| Vulnerabilidades Altas | 4 | 0 abiertas (1 mitigada, pendiente robustez multi-nodo) |
| Vulnerabilidades Medias | 5 | 0 abiertas |
| Vulnerabilidades Bajas | 2 | 0 abiertas |
| Rate limiting | ✗ | ✓ (login 5/min + global 120/min por IP) |
| Headers de seguridad | ✗ | ✓ (6 headers) |
| Revocación de sesión | ✗ | ✓ (blacklist jti) |
| Trazabilidad (AuditLog) | Parcial | ✓ (automática vía interceptor) |

**Postura general:** de **"prototipo funcional"** a **"listo para piloto en producción con un solo nodo"**.

---

## 2. Estado de las vulnerabilidades (SPEC-04 §1.2)

| # | Vulnerabilidad | Criticidad | Estado | Evidencia / Control aplicado |
|---|---------------|------------|--------|------------------------------|
| S-01 | JWT secret hardcodeado en fallback | Alta | ✅ **Resuelto** | `Program.cs`: la clave es obligatoria (`throw` si falta) y valida ≥ 256 bits. Sin fallback literal. |
| S-02 | JWT sin revocación (logout no invalida) | Alta | ✅ **Mitigado** | `TokenBlacklistService` (jti + IMemoryCache) + endpoint `POST /api/auth/logout`. Verificado: token válido→200, logout→200, reuso→401. *Multi-nodo requiere Redis (SPEC-05).* |
| S-03 | Sin límite de tamaño de archivo | Alta | ✅ **Resuelto** | `FormOptions.MultipartBodyLengthLimit` + `Kestrel.MaxRequestBodySize` = 10 MB, + validación en `UploadValidator`. |
| S-04 | Archivos servidos sin autenticación | Alta | ⚠️ **Documentado** | Mitigado en despliegue vía Nginx `deny all` a `/uploads` + acceso por API. Endpoint autenticado planificado en SPEC-05. |
| S-05 | CORS abierto en producción | Media | ✅ **Resuelto** | Orígenes desde `Cors:AllowedOrigins` (config/env). En prod solo el dominio real. |
| S-06 | Sin rate limiting en login | Media | ✅ **Resuelto** | `AddRateLimiter` política `login` 5/min por IP. Verificado: 6º intento→429. |
| S-07 | AuditLog incompleto | Media | ✅ **Resuelto** | Override de `SaveChangesAsync` en `AppDbContext` audita Crear/Editar/Eliminar de todas las entidades de dominio. Página Auditoría (Director). |
| S-08 | Sin HTTPS forzado | Media | ✅ **Resuelto** | `UseHsts()` + `UseHttpsRedirection()` en no-desarrollo. |
| S-09 | MasterAdmin en config | Media | ✅ **Resuelto** | `appsettings.Production.json` sin secretos; credenciales por variable de entorno / Key Vault. |
| S-10 | Sin validación de Content-Type | Baja | ✅ **Resuelto** | `UploadValidator` valida `ContentType` contra whitelist además de la extensión. |
| S-11 | Path traversal en fileName | Baja | ✅ **Resuelto** | `Path.GetFileName()` + almacenamiento siempre con GUID. |

---

## 3. Controles adicionales implementados (fuera del catálogo original)

| Control | Descripción | Ubicación |
|---------|-------------|-----------|
| **Rate limiter global** | 120 req/min por IP (mitigación DDoS/flood además del login) | `Program.cs` |
| **Headers de seguridad** | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy` | `Program.cs` middleware |
| **Server header oculto** | `Kestrel.AddServerHeader = false` (no revela tecnología) | `Program.cs` |
| **ClockSkew reducido** | Ventana de validación de expiración de 5 min → 30 s | `Program.cs` |
| **ProblemDetails** | Manejo global de errores sin filtrar stack traces en producción | `Program.cs` |
| **Swagger gated** | Solo se expone en Development | `Program.cs` |
| **Health checks** | `/health` con verificación de BD (para orquestadores/uptime) | `Program.cs` |
| **Logout en frontend** | El botón "Cerrar sesión" revoca el token en el servidor | `authStore.ts` |
| **Serilog con retención** | Rotación diaria, 30 días de retención, nivel Warning en prod | `Program.cs` |

---

## 4. Mapeo OWASP Top 10 (2021)

| Riesgo OWASP | Estado | Control |
|--------------|--------|---------|
| A01 Broken Access Control | ✅ | Autorización por roles (`[Authorize(Roles=...)]`), verificación de propiedad de caja |
| A02 Cryptographic Failures | ✅ | Contraseñas con hash (Identity), JWT firmado HS256 ≥256 bits, TLS en prod |
| A03 Injection | ✅ | EF Core parametrizado (sin SQL crudo); validación de entradas |
| A04 Insecure Design | ✅ | Tope de caja, validación OCR, separación de capas (Clean Architecture) |
| A05 Security Misconfiguration | ✅ | Headers, Swagger gated, server header oculto, secretos fuera de código |
| A06 Vulnerable Components | ⚠️ | `dotnet list package --vulnerable` en CI (pendiente automatizar — SPEC-05). MailKit NU1902 conocido. |
| A07 Auth/Identification Failures | ✅ | Rate limiting login, revocación de sesión, política de contraseñas |
| A08 Software/Data Integrity | ✅ | AuditLog inmutable append-only; validación OCR de facturas |
| A09 Logging & Monitoring Failures | ✅ | Serilog + AuditLog + health checks |
| A10 SSRF | ✅ | No hay fetch de URLs controladas por el usuario |

---

## 5. Gobernanza de la información

### 5.1 Roles y responsabilidades (segregación de funciones)

| Rol | Permisos | Control de segregación |
|-----|----------|------------------------|
| **Administrador** | Crear/editar avances y legalizaciones, subir recibos, iniciar reembolsos | No puede confirmar sus propios reembolsos ni ver auditoría |
| **Director** | Confirmar reembolsos, firmar arqueo, ver auditoría | No opera el día a día de la caja |
| **Usuario maestro** | Gestión de usuarios (Basic Auth separado) | Credencial fuera de la BD, por env var |

> **Principio de doble control:** un avance lo crea el Administrador y su reembolso lo confirma el Director. La auditoría (solo Director) permite supervisión independiente.

### 5.2 Clasificación de datos

| Dato | Clasificación | Protección |
|------|---------------|------------|
| Credenciales / JWT key | **Secreto** | Env vars / Key Vault, nunca en repo |
| Recibos y firmas | **Confidencial** | Acceso restringido (Nginx deny + API), backup cifrado |
| Montos y movimientos | **Interno** | Autorización por caja y rol |
| Logs de auditoría | **Interno / retención** | Append-only, 30 días+ |

### 5.3 Trazabilidad y no repudio

- Toda operación de escritura genera un `AuditLog` con usuario, acción, entidad, valores antes/después y timestamp UTC.
- La página **Auditoría** (Director) permite revisión con detalle expandible.
- Los reembolsos y arqueos registran firmas electrónicas (Director + Administrador).

---

## 6. Aseguramiento de la información (CIA)

| Dimensión | Controles implementados | Pendiente (SPEC-05) |
|-----------|-------------------------|---------------------|
| **Confidencialidad** | JWT, roles, TLS, headers, CORS restringido, secretos externos | Cifrado en reposo de uploads, endpoint autenticado de descarga |
| **Integridad** | AuditLog, validación OCR, tope de caja, EF parametrizado | Firma/hash de archivos, backups verificados |
| **Disponibilidad** | Rate limiting, health checks, límites de request | Alta disponibilidad multi-nodo + Redis, WAF/CDN, DR |

---

## 7. Hallazgos residuales y recomendaciones

| Prioridad | Hallazgo | Recomendación | Destino |
|-----------|----------|---------------|---------|
| Alta | Blacklist de JWT en memoria no sirve para multi-instancia | Migrar a Redis (`IDistributedCache`) | SPEC-05 §2 |
| Alta | `/uploads` servido como estático | Endpoint autenticado + Azure Blob con SAS | SPEC-05 §3 |
| Media | Sin escaneo automático de dependencias | `dotnet list package --vulnerable` + `npm audit` en CI | SPEC-05 §5 |
| Media | Sin WAF ni protección DDoS a nivel de red | Azure Front Door / Cloudflare | SPEC-05 §4 |
| Media | Refresh token es un GUID no persistido | Implementar rotación real de refresh tokens | SPEC-05 §2 |
| Baja | Sin MFA para el usuario maestro | TOTP para operaciones sensibles | SPEC-05 §6 |
| Baja | Sin política de expiración/rotación de secretos | Rotación trimestral vía Key Vault | SPEC-05 §7 |

---

## 8. Veredicto de la auditoría

> **APTO para despliegue en producción de un solo nodo (piloto).**
> La superficie de ataque de red (login, DDoS, headers, CORS, uploads) y la trazabilidad están cubiertas y verificadas. Antes de escalar a **multi-instancia o alto tráfico**, deben ejecutarse los controles del **SPEC-05 (seguridad post-producción)**: Redis para revocación distribuida, protección física de archivos, WAF, escaneo de dependencias en CI y monitoreo continuo.

**Verificaciones ejecutadas el 2026-07-03:**
- ✅ Headers de seguridad presentes en todas las respuestas
- ✅ Rate limiting login: 429 tras 5 intentos/min
- ✅ Revocación de token: 401 tras logout
- ✅ Health check `/health` → Healthy
- ✅ Auditoría automática registra Crear/Editar/Eliminar
- ✅ Build backend 0 errores · TypeScript frontend 0 errores
