# SPEC-05 — Seguridad Post-Producción y Operación Continua

> **Proyecto:** Sistema de Caja Menor — MiraxionTech
> **Versión:** 1.0
> **Fecha:** 2026-07-03
> **Predecesor:** SPEC-04 (seguridad pre-producción, ejecutado) · AUDITORIA-SEGURIDAD.md
> **Estado:** Pendiente de implementación (roadmap de operación)

---

## 1. Propósito

El SPEC-04 dejó el sistema **apto para un piloto en un solo nodo**. Este documento define los controles que deben implementarse una vez el sistema **está en producción** para operarlo de forma segura, escalarlo a **múltiples instancias / alto tráfico**, y sostener la seguridad en el tiempo (detección, respuesta, cumplimiento).

Prioridades: **P0** (antes de escalar a multi-nodo o abrir al público), **P1** (primer mes), **P2** (mejora continua).

---

## 2. Gestión de sesiones distribuida — Redis (P0)

**Problema:** La lista negra de JWT (`TokenBlacklistService`) y el rate limiter usan memoria local. Con 2+ instancias detrás de un balanceador, un logout en la instancia A no revoca el token en la B.

**Solución:**

```csharp
// Reemplazar IMemoryCache por IDistributedCache (Redis)
builder.Services.AddStackExchangeRedisCache(o =>
    o.Configuration = builder.Configuration["Redis:Connection"]);

// TokenBlacklistService pasa a usar IDistributedCache
public async Task RevocarAsync(string jti, TimeSpan exp) =>
    await cache.SetStringAsync($"jwt-revocado:{jti}", "1",
        new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = exp });
```

**Refresh tokens reales:**
- Persistir refresh tokens en BD (tabla `RefreshTokens`: `Token`, `UserId`, `Expira`, `Revocado`, `ReemplazadoPor`).
- Rotación en cada uso (detección de reuso = robo → revocar cadena).
- Endpoint `POST /api/auth/refresh`.

**Rate limiting distribuido:** usar Redis como store del limiter para que el límite sea global, no por instancia.

---

## 3. Protección de archivos (S-04) — endpoint autenticado + Blob (P0)

**Problema:** `/uploads` se sirve como estático; cualquiera con la URL descarga recibos/firmas.

**Solución en 2 fases:**

**Fase 1 — Endpoint autenticado (rápida):**
```csharp
[HttpGet("{id}/recibos/{reciboId}/descargar")]
[Authorize]
public async Task<IActionResult> DescargarRecibo(int cajaId, int id, int reciboId)
{
    var recibo = await service.ObtenerReciboAsync(reciboId);
    if (recibo is null || recibo.CajaId != cajaId) return NotFound();
    // verificar que el usuario pertenece a la caja
    var bytes = await File.ReadAllBytesAsync(recibo.RutaArchivo);
    return File(bytes, "application/octet-stream", recibo.NombreOriginal);
}
```
- Quitar `UseStaticFiles` para `/uploads`.
- Frontend: cargar imágenes con `fetch` + token → `objectURL` (o usar SAS de Blob).

**Fase 2 — Azure Blob Storage con SAS:**
- Mover recibos/firmas a Blob (contenedor privado).
- Generar **SAS de corta duración** (5 min) por archivo bajo demanda.
- Cifrado en reposo gestionado por Azure (SSE) + versionado.

---

## 4. Defensa perimetral: WAF, CDN y anti-DDoS (P0/P1)

| Control | Herramienta | Beneficio |
|---------|-------------|-----------|
| WAF (reglas OWASP CRS) | Azure Front Door / Cloudflare | Bloquea inyección, XSS, bots |
| Protección DDoS volumétrica | Azure DDoS Protection / Cloudflare | Absorbe floods L3/L4 antes de la app |
| CDN + caché | Front Door / Cloudflare | Reduce carga y latencia del frontend |
| Rate limiting perimetral | Reglas del WAF | Segunda capa además del limiter de la app |
| Geobloqueo (opcional) | WAF | Restringir a Colombia si aplica |
| TLS 1.2+ obligatorio, HSTS preload | Certificado gestionado | Cifrado extremo a extremo |

> El rate limiter de la aplicación (SPEC-04) es la **última** línea; el WAF es la **primera**.

---

## 5. Seguridad de la cadena de suministro y CI/CD (P1)

```yaml
# Añadir al pipeline (SPEC-04 §4.4)
- name: Escaneo de dependencias .NET
  run: dotnet list package --vulnerable --include-transitive

- name: Escaneo de dependencias npm
  run: npm audit --audit-level=high --prefix diseñoStitch/stitch-app

- name: Análisis estático (SAST)
  uses: github/codeql-action/analyze@v3

- name: Escaneo de secretos
  uses: gitleaks/gitleaks-action@v2

- name: Escaneo de imagen Docker
  uses: aquasecurity/trivy-action@master
```

- Habilitar **Dependabot** para PRs automáticos de parches.
- **Firmar** las imágenes de contenedor (cosign).
- Resolver `MailKit` NU1902 (actualizar a versión sin CVE).
- Política: no desplegar con vulnerabilidades **High/Critical** abiertas.

---

## 6. Autenticación reforzada (P1/P2)

- **MFA (TOTP)** para el usuario maestro y Directores (operaciones sensibles: confirmar reembolsos, gestionar usuarios).
- **Bloqueo de cuenta** tras N intentos fallidos (Identity `Lockout`), complementando el rate limiting por IP.
- **Política de contraseñas** reforzada + verificación contra listas de contraseñas filtradas (HaveIBeenPwned API).
- **Notificación** por correo ante login desde nueva IP/dispositivo.

---

## 7. Gestión de secretos y claves (P1)

- Todos los secretos en **Azure Key Vault** (o equivalente), referenciados por identidad administrada (Managed Identity) — sin secretos en variables de entorno planas.
- **Rotación** trimestral de: JWT key, contraseña de BD, claves OCR, credencial maestra.
- Rotación de JWT key con **soporte de doble clave** (validar con clave antigua durante ventana de gracia) para no invalidar todas las sesiones.
- Registro de acceso a secretos (auditoría de Key Vault).

---

## 8. Monitoreo, detección y respuesta (P1)

### 8.1 Observabilidad
- **Application Insights / OpenTelemetry**: trazas, métricas, latencias, tasa de error.
- **Sink de Serilog** a un SIEM (Azure Monitor / Sentinel / ELK).
- Dashboards: intentos de login fallidos, 429, 401, picos de tráfico por IP.

### 8.2 Alertas (SOC básico)
| Señal | Umbral | Acción |
|-------|--------|--------|
| Login fallidos por IP | > 20 en 5 min | Alerta + bloqueo temporal |
| Respuestas 429 | pico anómalo | Posible DDoS → revisar WAF |
| Errores 5xx | > 1% de requests | Alerta on-call |
| Acceso a auditoría fuera de horario | cualquiera | Notificación al Director |
| Health check `/health` DOWN | 2 fallos seguidos | Alerta + failover |

### 8.3 Respuesta a incidentes
- **Runbook** de incidentes: contención (revocar sesiones, rotar secretos), erradicación, recuperación, lecciones aprendidas.
- Capacidad de **revocación masiva** de tokens (invalidar todas las sesiones: cambiar la JWT key o versión de clave).
- Contacto y escalamiento definidos.

---

## 9. Continuidad y recuperación (P1)

| Control | Objetivo |
|---------|----------|
| **Backups automáticos** de BD | Diario + PITR (point-in-time restore) |
| **Backup de uploads/Blob** | Geo-redundante, versionado |
| **Prueba de restauración** | Trimestral (un backup no probado no existe) |
| **RTO / RPO** definidos | RTO ≤ 4 h, RPO ≤ 24 h (ajustar a negocio) |
| **Plan DR** documentado | Región secundaria / restauración |
| **Alta disponibilidad** | ≥ 2 instancias de API + BD con réplica |

---

## 10. Cumplimiento y protección de datos (P2)

- **Ley 1581 de 2012 (Habeas Data, Colombia)**: política de tratamiento de datos personales, consentimiento, derechos ARCO.
- **Retención y borrado**: definir ciclo de vida de recibos, logs y datos personales; borrado seguro al expirar.
- **Registro de actividades de tratamiento** (art. 30 GDPR-like) si aplica.
- **Anonimización** de datos en entornos no productivos.
- **Acuerdos de tratamiento** con proveedores cloud (Azure DPA).

---

## 11. Pruebas de seguridad continuas (P2)

| Prueba | Frecuencia | Responsable |
|--------|-----------|-------------|
| Pentest externo | Anual + tras cambios mayores | Tercero |
| DAST (OWASP ZAP) | En cada release | CI/CD |
| Revisión de accesos y roles | Trimestral | Director / TI |
| Revisión de logs de auditoría | Mensual | Director |
| Tabletop de respuesta a incidentes | Semestral | Equipo |
| Revisión de este SPEC | Semestral | Seguridad |

---

## 12. Checklist post-producción

### Escalado / multi-nodo (P0)
- [ ] Redis para blacklist de JWT y rate limiting distribuido
- [ ] Refresh tokens persistidos con rotación
- [ ] Endpoint autenticado de descarga de archivos (+ quitar estático `/uploads`)
- [ ] Migración de uploads a Blob privado con SAS

### Perímetro (P0/P1)
- [ ] WAF con reglas OWASP CRS
- [ ] Protección DDoS a nivel de red
- [ ] CDN para el frontend
- [ ] HSTS preload + TLS 1.2+ forzado

### Operación (P1)
- [ ] Secretos en Key Vault + Managed Identity + rotación trimestral
- [ ] MFA para maestro/Director + lockout de cuenta
- [ ] App Insights/OTel + SIEM + alertas configuradas
- [ ] Runbook de incidentes + revocación masiva probada
- [ ] Backups automáticos + prueba de restauración trimestral

### Cadena de suministro (P1)
- [ ] Escaneo de dependencias (.NET + npm) en CI
- [ ] SAST (CodeQL) + escaneo de secretos (gitleaks) + Trivy
- [ ] Dependabot activo · resolver MailKit NU1902

### Cumplimiento (P2)
- [ ] Política de tratamiento de datos (Ley 1581)
- [ ] Retención/borrado seguro definido
- [ ] Pentest externo anual programado
- [ ] Revisión periódica de accesos y auditoría

---

## 13. Trazabilidad SPEC-04 → SPEC-05

| Hallazgo residual (Auditoría §7) | Sección SPEC-05 |
|----------------------------------|-----------------|
| Blacklist JWT en memoria (multi-nodo) | §2 |
| `/uploads` sin autenticación (S-04) | §3 |
| Sin escaneo de dependencias | §5 |
| Sin WAF / anti-DDoS de red | §4 |
| Refresh token no persistido | §2 |
| Sin MFA | §6 |
| Sin rotación de secretos | §7 |
