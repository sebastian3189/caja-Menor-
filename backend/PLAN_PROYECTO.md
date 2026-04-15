# PLAN DE PROYECTO: SISTEMA DE CAJA MENOR
> Migración de Power Apps / Power Automate → ASP.NET Core + Arquitectura en Servicios
> Empresa de referencia: MiraxionTech

---

## CONTEXTO Y MOTIVACIÓN

La empresa utiliza SAP para manejar avances, legalizaciones y reembolsos de caja menor. Con la migración a **SAP S/4HANA**, los desarrollos personalizados ("Z") no se migran, incluyendo el módulo de Caja Menor.

El nuevo sistema reemplaza ese módulo con una aplicación web moderna. A diferencia de la solución anterior en Power Apps (que requería cargar archivos Excel de CONCUR como workaround), **este nuevo sistema gestiona todos los datos directamente en SQL Server** a través de formularios web.

**Stack tecnológico principal:** C# .NET 9, ASP.NET Core Web API, SQL Server, React + TypeScript (Frontend)

---

## REGLAS DE NEGOCIO CRÍTICAS (extraídas del manual de Power Apps)

### Roles (2 roles operativos)
| Rol | Responsabilidades |
|---|---|
| **Director de Caja Menor** | Realiza la **apertura** de la caja. Firma el arqueo como directivo. Puede cancelar reembolsos en estado "Sin Reembolso". |
| **Administrador de Caja Menor** | Gestiona avances, legalizaciones, reembolsos y arqueos. Firma el arqueo como administrador. |

**Restricciones de acceso:**
- Cada usuario **solo ve la información de su propia caja**, filtrada por la central a la que pertenece.
- Las firmas en el arqueo son **rol-específicas**: cada usuario solo puede agregar su propia firma.
- Una caja puede tener **múltiples administradores** (relación muchos-a-muchos via tabla `CajaAdministradores`).

### Estados de Avances
| Estado | Descripción |
|---|---|
| **Pendiente** | El desembolso fue realizado. Aún no hay legalización asociada. **Editable por Administrador.** |
| **Legalizado** | Se ligó el avance a una legalización con facturas. **No editable** (fue creado para un propósito y persona específicos). |

### Tipo de Avance (calculado automáticamente al ligar con legalización)
| Tipo | Condición | Acción |
|---|---|---|
| **Total** | Gasto = Avance | Sin movimiento adicional |
| **Sobrante** | Avance > Gasto | El empleado **devuelve el excedente** a caja |
| **Faltante** | Avance < Gasto | Tesorería **reembolsa la diferencia** al empleado |

### Estado Reembolso
| Estado | Descripción |
|---|---|
| **Sin Reembolso** | Legalizado, pero no enviado a Tesorería. Legalización **editable**. |
| **En Proceso** | Se activó el reembolso y se notificó a Tesorería |
| **Reembolsado** | Tesorería confirmó el pago — indicador visual en **verde** |

### Fórmulas de cálculo automático (Legalizaciones)
> **Convención implementada:** `Diferencia = ValorAvance - Monto`
> - Diferencia **positiva** → Sobrante (empleado gastó menos, devuelve exceso a caja)
> - Diferencia **negativa** → Faltante (empleado gastó más, `DescuentoCaja = ABS(Diferencia)`)
> - Diferencia **cero** → Total

```
Diferencia         = ValorAvance - Monto
DescuentoCaja      = ABS(Diferencia)  si Diferencia < 0   → empleado gastó más
ValorReembolsar    = Monto            siempre (monto legalizado es lo que se reembolsa)
```
- Si la legalización es **Sin Avance**: `Diferencia = 0`, `DescuentoCaja = 0`, `ValorReembolsar = Monto`.
- Al crear una legalización con avance **Sobrante** (`Diferencia > 0`): `caja.Disponible += Diferencia`.
- Al crear una legalización con avance **Faltante** (`DescuentoCaja > 0`): `caja.Disponible -= DescuentoCaja`.
- Al **confirmar reembolso**: `caja.Disponible += totalReintegro` (se repone el efectivo pagado por Tesorería).

### Validaciones y alertas visuales
- No se puede reembolsar un registro que ya fue reembolsado.
- No se puede asociar tipo "Con Avance" si no existe un avance pendiente disponible.
- Si el monto no coincide al intentar reembolsar → mensaje de advertencia visible.
- Indicador visual (círculo **amarillo** → **verde**) según estado del reembolso.
- Solo se pueden subir recibos/facturas a una legalización cuando `EstadoReembolso === SinReembolso`.
- El botón de lápiz (editar) en avances está **deshabilitado** cuando `estado === Legalizado`.
- El botón de lápiz (editar) en legalizaciones solo aparece cuando `estadoReembolso === SinReembolso`.

---

## FLUJO COMPLETO DEL PROCESO

```
1. APERTURA DE CAJA
   └─ Director crea y abre la caja menor para su central
   └─ Registra: Nombre, Valor Apertura, Central

2. REGISTRO DE AVANCES
   └─ Administrador registra avances directamente en el sistema (formulario)
   └─ Campos: Código (REQ-XXXX), Solicitante, Valor, Descripción, Fecha
   └─ Estado inicial: Pendiente
   └─ [EDICIÓN] Solo editable cuando estado = Pendiente (lápiz disabled si Legalizado)

3. REGISTRO DE LEGALIZACIONES
   └─ Administrador registra legalización mediante formulario
   └─ Tipo "Con Avance" → selecciona el avance pendiente correspondiente
   └─ Tipo "Sin Avance" → Valor Avance = 0
   └─ Sistema calcula automáticamente: Diferencia, Descuento Caja, Valor a Reembolsar
   └─ El avance ligado cambia de estado Pendiente → Legalizado
   └─ La legalización queda con EstadoReembolso = Sin Reembolso
   └─ [EDICIÓN] Solo editable cuando EstadoReembolso = SinReembolso (avanceId no es reasignable)
   └─ Administrador puede subir recibos/facturas adjuntos (imágenes) por legalización
      └─ Solo visible/permitido cuando EstadoReembolso = SinReembolso

4. PROCESO DE REEMBOLSO
   └─ Administrador inicia reembolso por cada legalización (botón "Reembolsar")
   └─ Se crea registro en Reembolsos con estado "Sin Reembolso"
   └─ [CANCELAR] Director puede cancelar un reembolso en estado SinReembolso
      └─ Devuelve la legalización a la lista para que el Administrador la corrija
   └─ Desde módulo Reembolsos → adjuntar PDF del arqueo firmado (obligatorio)
      └─ Una vez adjuntado, se habilita "Enviar a Tesorería"
      └─ "Enviar a Tesorería" ejecuta en secuencia:
         1. Activar reembolsos: Sin Reembolso → En Proceso (lote)
         2. Registrar envío del arqueo a Tesorería
      └─ Disponible para Director y Administrador

5. ARQUEO Y FIRMA DEL DOCUMENTO
   └─ Ir a Arqueo → ver resumen de movimientos de la caja
   └─ Arqueo General muestra:
      - Valor Apertura, Disponible en Caja
      - Avances pendientes por legalizar
      - Legalizaciones sin avance (valor)
      - Valor total de legalizaciones
      - Total a reembolsar
   └─ Director sube su firma (imagen) — solo visible/editable para el Director
   └─ Administrador sube su firma (imagen) — solo visible/editable para el Admin
   └─ Se puede eliminar y reemplazar cada firma antes del cierre
   └─ Sección: "Firmas y descarga arqueo"
      └─ Con ambas firmas → habilita botón "Descargar PDF del arqueo"
      └─ Sin ambas firmas → botón de descarga no aparece
   └─ El PDF descargado se adjunta en el módulo Reembolsos para envío a Tesorería

6. CONFIRMACIÓN DEL REEMBOLSO
   └─ Tesorería confirma por correo
   └─ Administrador o Director va a Reembolsos → "Confirmar Reembolso"
      └─ Todas las legalizaciones "En Proceso" → "Reembolsado"
      └─ Se mueven al histórico de reembolsos
      └─ Indicador visual cambia a Verde en la legalización correspondiente
      └─ caja.Disponible += totalReintegro (reposición de fondos)
```

---

## MÓDULOS DE LA APLICACIÓN

### 1. DASHBOARD PRINCIPAL (Resumen de Caja)
Pantalla inicial al ingresar al módulo. Muestra:
- **Indicadores de Avances:** Total, Pendientes, Legalizados
- **Indicadores de Legalizaciones:** Total, Con Avance, Sin Avance
- **Ficha de la Caja:**
  - Nombre de la Caja Menor
  - Directivo responsable
  - Administrador(es)
  - Valor Apertura
  - Total Usado
  - Disponible en Caja
- Accesos directos a: Avances, Legalizaciones, Reembolsos, Arqueo

### 2. MÓDULO DE AVANCES
- Formulario de registro de avance (Código, Solicitante, Valor, Descripción, Fecha)
- **[NUEVO] Edición de avance:** solo cuando `estado === Pendiente`
  - Lápiz deshabilitado (disabled + tooltip) si `estado === Legalizado`
  - Todos los campos editables excepto: ValorAvance se deshabilita si ya está Legalizado
- Tabla con: ID (REQ-XXXX), Caja Menor, Fecha, Valor Avance, Descripción, Solicitante, Estado, Tipo de Avance, Estado Reembolso
- Contadores: Total Avances, Pendientes, Legalizados
- Barra de progreso de legalización (% Pendientes / % Legalizados)
- Estado Reembolso es **solo lectura** en este módulo
- Filtros: por estado (Todos/Pendiente/Legalizado), por rango de fechas

### 3. MÓDULO DE LEGALIZACIONES
- **Formulario de registro:**
  - Código Legalización (LEG-XXXX)
  - Monto Total
  - Tipo (Con Avance / Sin Avance)
  - Fecha Legalización
  - Descripción
  - Si "Con Avance": dropdown con avances en estado Pendiente → autocompleta Valor Avance
- Cálculo automático al guardar: Diferencia, Descuento Caja, Valor a Reembolsar
- **[NUEVO] Edición de legalización:** solo cuando `estadoReembolso === SinReembolso`
  - Lápiz solo visible en filas con `SinReembolso`
  - AvanceId **no reasignable** en edición (relación creada en el registro inicial)
  - Revierte efectos previos en caja y recalcula con los nuevos valores
- **Subida de recibos/facturas:** imágenes adjuntas por legalización
  - Solo visible cuando `estadoReembolso === SinReembolso`
- Tabla con todas las legalizaciones de la caja
- Botón "Reembolsar" por fila → genera entrada en módulo Reembolsos
- Contadores: Total, Sin Avance, Con Avance
- Filtros: por tipo, por rango de fechas

### 4. MÓDULO DE REEMBOLSOS (Sala de Reembolsos)
- **Sección: Pendientes de iniciar (SinReembolso):**
  - Tabla con columnas: Legalización, Avance, Central, V. Avance, V. Legalizado, Ellos Deben, Debemos, Monto, Estado
  - Total acumulado a reembolsar
  - **[NUEVO] Cancelar reembolso** (Director): botón por fila → devuelve legalización a lista editable
  - **[NUEVO] Adjuntar PDF del arqueo** (Director y Administrador):
    - Input de archivo `.pdf`
    - Muestra chip con nombre del archivo + botón para quitar
    - Botón **"Enviar a Tesorería"** se habilita solo si: hay PDF adjunto Y hay reembolsos pendientes
    - Al enviar: activa reembolsos (Sin Reembolso → En Proceso) + registra envío
- **Sección: En proceso:**
  - Tabla de reembolsos en estado EnProceso
  - Botón **"Confirmar reembolsos"** (Director y Administrador): En Proceso → Reembolsado
- **Histórico de Reembolsos:**
  - Tabla con columnas adicionales: Fecha confirmación
- Filtros: por rango de fechas (aplica a todas las secciones)

### 5. MÓDULO DE ARQUEO
- **Resumen de movimientos:**
  - Avances pendientes por legalizar (cantidad + valor)
  - Avances pendientes por reembolsar (cantidad + valor)
  - Legalizaciones con avance (cantidad + valor)
  - Legalizaciones sin avance (cantidad + valor)
  - Reembolsos sin reembolsar (cantidad + valor)
- **Sección "Firmas y descarga arqueo":** *(antes "Firmas y envío a Tesorería")*
  - Firma del Directivo (imagen — solo editable por Director, con opción de eliminar y reemplazar)
  - Firma de la Administradora (imagen — solo editable por Administrador, con opción de eliminar y reemplazar)
  - Botón **"Descargar PDF del arqueo"** visible **solo con ambas firmas presentes**
  - Sin ambas firmas → aviso de advertencia (no se muestra el botón de descarga)
  - Si ya fue enviado → badge verde con fecha de envío
- **[CAMBIO DE FLUJO]** El envío a Tesorería ya no se hace desde Arqueo.
  Se descarga el PDF aquí y se adjunta + envía desde el módulo Reembolsos.

### 6. LOGIN Y AUTENTICACIÓN
- Formulario email + contraseña con validación Zod
- **[NUEVO] Inicio de sesión con Microsoft** (Azure AD / MSAL):
  - Botón "Continuar con Microsoft" con ícono oficial de Microsoft
  - Pendiente: integración real con `@azure/msal-browser` + registro de app en Azure AD
  - Backend: requiere `Microsoft.AspNetCore.Authentication.OpenIdConnect` o `MicrosoftAccount`
- **[NUEVO] Recuperar contraseña:**
  - Enlace "¿Olvidaste tu contraseña?" bajo el campo de contraseña
  - Redirige al flujo de reset de Azure AD / Microsoft Account
- Diseño responsive: panel de branding (desktop) + formulario centrado (mobile/tablet)

---

## MODELO DE DATOS

```
Central
├── Id, Nombre, CodigoCentral

CajaMenor
├── Id, CentralId, Nombre
├── ValorApertura, Disponible, TotalUsado
├── DirectorId
├── [CAMBIADO] Administradores: ICollection<UsuarioApp>  ← tabla CajaAdministradores (muchos-a-muchos)
├── Estado (Abierta / Cerrada)
├── FechaApertura

Usuario (UsuarioApp — entidad de dominio)
├── Id, IdentityUserId (FK → ASP.NET Identity)
├── Nombre, Email, Rol (Director / Administrador)
├── [CAMBIADO] CentralId  ← filtra por central, no por caja directa

ApplicationUser (Identity — capa Infrastructure)
├── Extiende IdentityUser
├── NombreCompleto

Avance
├── Id, CajaId, CodigoAvance (REQ-XXXX)
├── FechaEnvio, ValorAvance, Descripcion, Solicitante
├── Estado (Pendiente / Legalizado)
├── TipoAvance (null / Total / Sobrante / Faltante)
├── EstadoReembolso (SinReembolso / EnProceso / Reembolsado)
├── FechaCreacion

Legalizacion
├── Id, CajaId, CodigoLegalizacion (LEG-XXXX)
├── Monto, Descripcion, TipoLegalizacion, FechaLegalizacion
├── AvanceId (nullable — null si es Sin Avance)
├── ValorAvance, Diferencia, DescuentoCaja, ValorReembolsar
├── EstadoReembolso (SinReembolso / EnProceso / Reembolsado)
├── FechaCreacion
├── [NUEVO] Recibos: ICollection<LegalizacionRecibo>

LegalizacionRecibo  ← [NUEVO]
├── Id, LegalizacionId
├── NombreOriginal, RutaArchivo
├── FechaSubida
(archivos servidos en /uploads/recibos/)

Reembolso
├── Id, LegalizacionId, AvanceId (nullable)
├── CodigoCentral, ValorAvance, ValorLegalizado
├── Debe, Debemos, Monto
├── Estado (SinReembolso / EnProceso / Reembolsado)
├── FechaReembolso, FechaConfirmacion

Arqueo
├── Id, CajaId, FechaArqueo
├── ValorApertura, DisponibleCaja
├── AvancesPendientesLegalizar, ValorAvancesPendientes
├── LegalizacionesSinAvance, ValorLegalizacionesSinAvance
├── ValorLegalizaciones, TotalReembolso
├── RutaFirmaDirectivo, RutaFirmaAdministrador
├── FechaEnvioTesoreria, Estado ("Pendiente" / "Enviado")
(firmas servidas en /uploads/firmas/)

AuditLog
├── Id, Tabla, RegistroId, UsuarioId, Accion, Fecha, DatosAnteriores, DatosNuevos
[NOTA: entidad definida, logging de auditoría pendiente de implementar en servicios]
```

---

## EQUIPO DE AGENTES ESPECIALIZADOS

### AGENTE 1 — ARQUITECTO DE SOFTWARE
**Rol:** Orquestador del proyecto. Define la arquitectura base, capas, contratos entre servicios y decisiones técnicas globales.

**Responsabilidades:**
- Diseñar la arquitectura en capas (servicio directo sobre EF Core — sin CQRS/MediatR en práctica)
- Definir contratos de API (Swagger)
- Establecer patrones: Repository implícito via EF Core, inyección directa de servicios
- Decisiones de base de datos: esquemas SQL Server, índices, migraciones
- Definir flujos de negocio y orquestación de servicios
- Supervisar la integración entre todos los agentes

**Tecnologías:**
- .NET 9 / ASP.NET Core
- Entity Framework Core 9 + SQL Server
- FluentValidation
- ~~MediatR~~ / ~~AutoMapper~~ (instalados como dependencias pero no usados — mapping manual con métodos estáticos)

---

### AGENTE 2 — DISEÑADOR UX/UI
**Rol:** Especialista en experiencia de usuario e interfaz visual.

**Responsabilidades:**
- Diseñar flujos de los 2 roles (Director y Administrador)
- Wireframes → mockups de alta fidelidad por módulo
- Sistema de diseño con colores identificadores por módulo
- Componentes: tablas con indicadores de estado, modales de selección de avance, formularios de legalización
- Indicadores visuales de estado (círculo amarillo/verde)
- Documento de arqueo con zona de firmas

**Entregables:**
- [COMPLETADO] Prototipo de diseño en `diseñoStitch/stitch-app/` (referencia visual, totalmente responsive)
- User Flows para Director y Administrador
- Design System con tokens CSS

---

### AGENTE 3 — DESARROLLADOR FRONTEND
**Rol:** Especialista en consumo de APIs e interfaces de usuario modernas.

**Stack:**
- React 19 + TypeScript + Vite
- Radix UI primitivos + componentes UI propios (Badge, Button, Card, Input, Label, Select, StatusCircle, Modal, PageHeader, StatCard)
- Tailwind CSS
- Zustand (estado global — authStore)
- TanStack Query (data fetching)
- React Hook Form + Zod (formularios y validación)
- TanStack Table (tablas)
- Axios con interceptores (JWT)
- ~~shadcn/ui~~ (se usan Radix UI primitivos directamente con componentes personalizados)
- **[PENDIENTE]** `@azure/msal-browser` + `@azure/msal-react` para login con Microsoft

**Módulos implementados:**
- [x] Login y autenticación (JWT, rutas protegidas) + botón Microsoft (UI lista, integración MSAL pendiente)
- [x] Recuperar contraseña → redirige a Microsoft Account reset
- [x] Dashboard con indicadores y ficha de caja
- [x] Módulo de Avances (formulario registro, tabla, contadores, barra progreso, edición con lápiz disabled si Legalizado)
- [x] Módulo de Legalizaciones (formulario, modal selección avance, cálculos, recibos solo en SinReembolso, edición solo en SinReembolso)
- [x] Módulo de Reembolsos (cancelar por fila-Director, adjuntar PDF + enviar a Tesorería, confirmar, histórico)
- [x] Módulo de Arqueo (resumen, subida firmas por rol, eliminar firma, descarga PDF solo con ambas firmas)
- [x] Diseño completamente responsive (sidebar overlay en mobile, modales bottom-sheet en mobile)

---

### AGENTE 4 — DESARROLLADOR BACKEND (.NET / C#)
**Rol:** Especialista en servicios, lógica de negocio y base de datos.

**Stack:**
- .NET 9 / ASP.NET Core Web API
- Entity Framework Core 9 + SQL Server 2019+
- ASP.NET Core Identity + JWT Bearer (con `ApplicationUser` extendiendo `IdentityUser`)
- FluentValidation (instalado, validación por controladores)
- QuestPDF (generación PDF del arqueo — licencia Community)
- MailKit (email a Tesorería con PDF adjunto)
- Serilog + Serilog.Sinks.Console + Serilog.Sinks.File (rolling diario)
- Swagger / Swashbuckle con seguridad JWT
- **[PENDIENTE]** `Microsoft.AspNetCore.Authentication.OpenIdConnect` para login con Azure AD
- ~~AutoMapper~~ (instalado pero no usado — mapping con métodos estáticos privados en cada servicio)
- ~~MediatR~~ (instalado pero no usado — patrón de servicio directo)
- ~~SendGrid~~ (reemplazado por MailKit vía SMTP configurable)
- ~~Scalar UI~~ (se usa Swagger/Swashbuckle estándar)

**Arquitectura de capas:**
```
CajaMenor.API           → Controllers, Middleware, DataSeeder, Program.cs
CajaMenor.Application   → Interfaces, DTOs, Common/Result<T>
CajaMenor.Domain        → Entities, Enums
CajaMenor.Infrastructure → EF Core, Configurations, Migrations, Services, Identity
CajaMenor.Shared        → [placeholder, pendiente de contenido]
```

**Servicios de negocio implementados:**
- [x] `IAuthService` / `AuthService` — Login JWT, registro de usuarios, gestión de roles Identity
- [x] `ICajaMenorService` / `CajaMenorService` — CRUD caja, dashboard, filtrado por usuario
- [x] `IAvanceService` / `AvanceService` — CRUD avances, gestión de estados, **edición con validación de estado**
- [x] `ILegalizacionService` / `LegalizacionService` — CRUD legalizaciones, ligado con avance, cálculos automáticos, recibos, **edición solo en SinReembolso** (revierte y recalcula efectos en caja)
- [x] `IReembolsoService` / `ReembolsoService` — Activación en lote (Director y Admin), confirmación en lote, reintegro a caja, histórico, **cancelar reembolso** (Director — devuelve a SinReembolso)
- [x] `IArqueoService` / `ArqueoService` — Resumen movimientos, firmas (subir/eliminar), generación PDF, envío email
- [x] `INotificacionService` / `NotificacionService` — Email SMTP vía MailKit

**Permisos por endpoint relevantes:**
| Endpoint | Roles autorizados |
|---|---|
| `POST /reembolsos/activar` | Director, Administrador |
| `POST /reembolsos/confirmar` | Director |
| `DELETE /reembolsos/{id}/cancelar` | Director |
| `PUT /avances/{id}` | Administrador |
| `PUT /legalizaciones/{id}` | Administrador |
| `POST /arqueo/enviar-tesoreria` | Director, Administrador |

**Extras implementados:**
- [x] `DataSeeder` — Datos iniciales (centrales, usuarios, cajas) cargados al arrancar
- [x] Archivos estáticos servidos en `/uploads/firmas/` y `/uploads/recibos/`
- [x] CORS configurado para `localhost:5173`, `5174`, `3000`
- [x] Migraciones automáticas al iniciar (`db.Database.Migrate()`)

---

### AGENTE 5 — QA / TESTING & SEGURIDAD
**Rol:** Especialista en calidad, pruebas y seguridad.

**Stack de Testing:**
- xUnit + Moq + FluentAssertions (unitarias backend)
- WebApplicationFactory + xUnit (integración API)
- Playwright (E2E)
- Coverlet + ReportGenerator (cobertura)

**Casos de prueba prioritarios:**
- Flujo completo por rol (Director: apertura / Admin: avances → legalización → reembolso → arqueo)
- Cálculos automáticos: Total / Sobrante / Faltante con valores límite
- Legalización Sin Avance (Valor Avance = 0)
- Edición de avance: verificar que ValorAvance no cambia cuando está Legalizado
- Edición de legalización: verificar reversión y recálculo correcto de efectos en caja
- Cancelación de reembolso: solo en SinReembolso, solo Director
- Activación lote de reembolsos (Director y Admin)
- Intento de subir recibo a legalización en estado EnProceso (debe rechazar)
- Flujo completo de arqueo: generar → firmar Director → firmar Admin → descargar PDF → adjuntar en Reembolsos → enviar
- Aislamiento de datos: usuario de caja A no ve datos de caja B
- Intento de reembolsar un registro ya reembolsado
- Generación PDF del arqueo con ambas firmas
- Envío de email con PDF adjunto
- OWASP Top 10 en endpoints
- **[NUEVO]** Login con Microsoft: token MSAL válido → JWT interno generado

---

### AGENTE 6 — DEVOPS / DESPLIEGUE
**Stack DevOps:**
- Docker + Docker Compose (desarrollo local)
- GitHub Actions o Azure DevOps Pipelines (CI/CD)
- Azure App Service / IIS / VPS con Docker (producción)
- SQL Server en Docker (local) / Azure SQL (producción)
- Azure Key Vault o `.env` seguros (secrets)
- Application Insights o Seq (monitoreo)
- Nginx o Caddy (reverse proxy + HTTPS)
- Azure Blob Storage o sistema de archivos (almacenamiento de firmas, recibos e imágenes PDF)
- **[NUEVO]** Azure AD App Registration para SSO con Microsoft (Client ID, Tenant ID, Client Secret)

---

## FASES DEL PROYECTO

### FASE 0 — PLANIFICACIÓN ✅
- [x] Revisión del manual de Power Apps
- [x] Definición de arquitectura final (servicio directo sobre EF Core)
- [x] Diseño de modelo de datos completo (SQL Server)
- [x] Configuración del repositorio y estructura del proyecto
- [x] Prototipo de diseño UI (`diseñoStitch/stitch-app/`)

### FASE 1 — FUNDAMENTOS BACKEND ✅
- [x] Estructura de solución .NET (5 proyectos: API, Application, Domain, Infrastructure, Shared)
- [x] Modelo de dominio y entidades EF Core (SQL Server)
- [x] Migraciones de base de datos (InitialCreate, AdminsMultiples, AddLegalizacionRecibos)
- [x] Autenticación JWT + ASP.NET Core Identity (roles: Director, Administrador)
- [x] Filtro de datos por caja/central (aislamiento por usuario via CentralId)
- [x] Configuración Serilog + Swagger con JWT
- [x] DataSeeder para datos iniciales
- [x] Archivos estáticos para firmas y recibos

### FASE 2 — SERVICIOS DE NEGOCIO ✅
- [x] Servicio de Avances (CRUD + estados + edición con validación)
- [x] Servicio de Legalizaciones (CRUD, ligado con avance, cálculos automáticos, recibos adjuntos, edición con reversión de efectos)
- [x] Servicio de Reembolsos (activación lote Director+Admin, confirmación, reintegro, cancelar por Director, histórico)
- [x] Servicio de Arqueo (resumen en vivo, firmas por rol, subir/eliminar firma, arqueo persistido en DB)
- [x] Generación PDF de arqueo (QuestPDF — licencia Community)
- [x] Envío de email a Tesorería con PDF adjunto (MailKit vía SMTP)

### FASE 3 — FRONTEND ✅
- [x] Setup React 19 + TypeScript + Vite + Radix UI + Tailwind CSS
- [x] Autenticación (login, tokens JWT, rutas protegidas por rol, Zustand authStore)
- [x] UI Login con Microsoft (botón + flujo MSAL stub) + recuperar contraseña
- [x] API layer con Axios + interceptores JWT (`src/api/`)
- [x] Dashboard con indicadores y ficha de caja
- [x] Módulo de Avances (registro, edición con lápiz disabled si Legalizado)
- [x] Módulo de Legalizaciones (modal selección avance, cálculos, recibos solo en SinReembolso, edición solo en SinReembolso)
- [x] Módulo de Reembolsos (cancelar-Director, adjuntar PDF arqueo, enviar a Tesorería, confirmar, histórico)
- [x] Módulo de Arqueo (resumen, firmas por rol, descarga PDF solo con ambas firmas)
- [x] Diseño completamente responsive (sidebar overlay mobile, bottom-sheet modals)

### FASE 3.5 — INTEGRACIÓN MICROSOFT SSO ⏳ Pendiente
- [ ] Registro de app en Azure AD (Client ID, Tenant ID, redirect URI)
- [ ] Backend: `Microsoft.AspNetCore.Authentication.OpenIdConnect` + endpoint `/auth/microsoft`
  - Recibe token MSAL del frontend
  - Valida con Azure AD
  - Genera JWT interno de la aplicación
  - Vincula con usuario existente por email corporativo
- [ ] Frontend: instalar `@azure/msal-browser` + `@azure/msal-react`
  - Configurar `PublicClientApplication` con Client ID y Tenant ID
  - Reemplazar stub `handleMicrosoftLogin` con flujo real
  - Recuperar contraseña: redirigir a flujo Azure AD B2C o Microsoft Account
- [ ] DataSeeder: asegurar que usuarios tengan email corporativo `@miraxiontech.com`

### FASE 4 — PRUEBAS Y CALIDAD ⏳ Pendiente
- [ ] Pruebas unitarias de cálculos de legalización
- [ ] Pruebas de integración de API
- [ ] Pruebas E2E flujo completo (Director + Administrador)
- [ ] Pruebas de aislamiento de datos por caja
- [ ] Análisis de seguridad (OWASP)
- [ ] Corrección de bugs

### FASE 5 — DESPLIEGUE ⏳ Pendiente
- [ ] Dockerfile + Docker Compose producción
- [ ] Pipeline CI/CD
- [ ] Configuración de entorno productivo
- [ ] Migraciones automáticas SQL Server en producción
- [ ] Configuración SMTP para producción (appsettings de producción)
- [ ] Almacenamiento de archivos en producción (firmas, recibos — local o Azure Blob)
- [ ] Azure AD App Registration para SSO
- [ ] Monitoreo y health checks
- [ ] Go-live

---

## DECISIONES TÉCNICAS CLAVE

| Decisión | Elección | Razón |
|---|---|---|
| Base de datos | SQL Server 2019+ | Requerimiento del proyecto |
| Framework backend | .NET 9 / ASP.NET Core | Versión LTS más reciente disponible al iniciar |
| Framework frontend | React 19 + TypeScript | Ecosistema maduro, tipado fuerte |
| UI Library | Radix UI + Tailwind CSS | Componentes accesibles, personalizable |
| Estado global | Zustand | Ligero, sin boilerplate |
| Data fetching | TanStack Query | Cache, invalidación automática |
| Formularios | React Hook Form + Zod | Performance + validación tipada |
| Tablas | TanStack Table | Headless, flexible |
| Patrón backend | Servicios directos sobre EF Core | Sin CQRS — MediatR/AutoMapper instalados pero no usados |
| Auth principal | JWT + Identity | Stateless, compatible con SPA |
| Auth Microsoft | MSAL (pendiente) + OpenIdConnect backend | SSO corporativo con cuentas MiraxionTech |
| PDF arqueo | QuestPDF | API fluente, licencia Community |
| ORM | Entity Framework Core 9 | Integración nativa .NET |
| Email | MailKit vía SMTP | Configuración flexible, sin costo por envío |
| Firmas | Upload de imagen | Alineado con flujo validado en Power Apps |
| Recibos | Upload de imagen por legalización | Nuevos requisitos post-Power Apps |
| Administradores | Muchos-a-muchos (CajaAdministradores) | Soporte multi-admin por caja |
| Mapping | Métodos estáticos `MapToDto()` por servicio | Simple, sin dependencia de AutoMapper |
| Datos iniciales | DataSeeder en arranque | Facilita desarrollo y demo |
| Edición avances | Solo en estado Pendiente | Avance Legalizado fue asignado a persona/propósito específico |
| Edición legalizaciones | Solo en estado SinReembolso | Una vez en proceso no se debe modificar |
| Cancelar reembolso | Solo Director, solo SinReembolso | Corrección de errores del Administrador |
| Activar/enviar reembolsos | Director y Administrador | Flexibilidad operativa requerida por el equipo |
| Descarga PDF arqueo | Solo con ambas firmas | Garantiza que el documento está aprobado antes de circularse |

---

## CONFIGURACIÓN DE EMAIL (appsettings.json)

```json
"Email": {
  "SmtpHost": "smtp.ejemplo.com",
  "SmtpPort": "587",
  "Usuario": "usuario@empresa.com",
  "Password": "contraseña",
  "Remitente": "cajamenor@empresa.com"
}
```
El destinatario de Tesorería está actualmente hardcodeado en `ArqueoService` como `"tesoreria@empresa.com"` — pendiente de mover a configuración.

## CONFIGURACIÓN MICROSOFT SSO (pendiente — appsettings.json)

```json
"AzureAd": {
  "TenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "ClientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "ClientSecret": "...",
  "Authority": "https://login.microsoftonline.com/{TenantId}"
}
```

---

*Generado: 2026-04-08 | Actualizado: 2026-04-14 con todos los cambios implementados | Stack: .NET 9 + React 19 + SQL Server*
