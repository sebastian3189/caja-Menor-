═══════════════════════════════════════════════════════════
   📌 POST PRINCIPAL — COPIAR Y PEGAR EN LINKEDIN
═══════════════════════════════════════════════════════════

🚀 Acabo de terminar un sistema empresarial de gestión de Caja Menor — de cero, full stack, listo para producción.

Te cuento qué hace, cómo lo construí y qué aprendí 👇

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 EL PROBLEMA

La mayoría de empresas todavía maneja la caja menor con Excel, papeles sueltos y correos.

El resultado: fugas de dinero, errores contables y cierres mensuales caóticos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 LA SOLUCIÓN — CajaMenor

Una plataforma web multi-tenant que cubre el ciclo contable completo:

📥 Avances → el Administrador desembolsa dinero a empleados
🧾 Legalizaciones → el sistema calcula automáticamente sobrante, faltante o gasto exacto y ajusta el disponible
💰 Reembolsos → el Director activa, confirma o cancela el ciclo
🔐 Arqueo → cierre con doble firma digital + PDF oficial → envío a Tesorería

Todo trazable, con audit log y permisos diferenciados por rol.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛠️ STACK

BACKEND (.NET 9 con Arquitectura Limpia)
✅ ASP.NET Core 9 Web API
✅ Entity Framework Core 9 + SQL Server
✅ JWT Bearer + ASP.NET Identity
✅ FluentValidation
✅ Serilog (logging estructurado)
✅ Swagger / OpenAPI

FRONTEND (React 19 + TypeScript + Vite 8)
✅ React 19 con TypeScript 6
✅ Vite 8 (HMR ultrarrápido)
✅ TailwindCSS 4 + Radix UI
✅ TanStack Query (cache inteligente)
✅ Zustand (estado global ligero)
✅ React Hook Form + Zod (validación tipada)
✅ React Router 7 con guards por rol
✅ Axios con interceptores JWT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏗️ DECISIONES QUE MÁS ME LLEVÓ PENSAR

1️⃣ Multi-tenant real
Cada usuario solo ve su caja. Embebí el cajaId dentro del JWT, así la autorización vive en el claim, no en el query.

2️⃣ Separación Director vs Administrador
Quien aprueba NO es quien ejecuta. Esto cumple principios de control interno y se refleja en cada endpoint con [Authorize(Roles = "...")].

3️⃣ Cálculo automático sobrante/faltante
El dominio decide, no el frontend. Si registras un avance de $220.000 y legalizas $210.000, el sistema marca automáticamente "Sobrante $10.000" y ajusta la caja.

4️⃣ Arquitectura limpia de verdad
El Domain no conoce a EF Core ni a ASP.NET. Puedo cambiar la base de datos sin tocar la lógica de negocio.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 VALOR DE NEGOCIO

🔒 Control real del disponible en tiempo real
👥 Separación de funciones (compliance SOX)
📋 Trazabilidad total con audit log
⏱️ Cierre mensual en minutos, no en días
🏢 Multi-sucursal nativo (una instalación, N centrales)
📑 Genera PDF oficial con doble firma listo para Tesorería

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎓 LO QUE APRENDÍ

Construir software que se parezca a cómo trabaja realmente la gente vale más que cualquier feature técnica.

La arquitectura limpia no es teoría: es lo que me permitió cambiar 3 veces la lógica de cálculo sin romper nada más.

Y JWT con claims personalizados es magia para multi-tenant.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

¿Estás construyendo algo similar?
¿O tienes un proceso financiero todavía en Excel?

Hablemos 👇

#DotNet #React #TypeScript #CleanArchitecture #FullStack #SoftwareEngineering #DesarrolloDeSoftware #WebDevelopment #DotNet9 #React19 #Backend #Frontend #ProgramacionEnEspañol #MiraxionTech



═══════════════════════════════════════════════════════════
   🎬 TEXTOS PARA CADA SLIDE DEL CARRUSEL
═══════════════════════════════════════════════════════════

▸ SLIDE 1 — PORTADA
Imagen: frontend/14-dashboard-final.png
Título: Sistema de Caja Menor empresarial
Subtítulo: Full stack · .NET 9 + React 19 · Multi-tenant
Pie: Desliza para ver cómo lo construí →


▸ SLIDE 2 — EL PROBLEMA
(solo texto sobre fondo de color)
80% de empresas todavía maneja
la caja menor en Excel.
Fugas. Errores. Cierres caóticos.
Llegó la hora de digitalizarlo.


▸ SLIDE 3 — DASHBOARD EN VIVO
Imagen: frontend/14-dashboard-final.png
Título: Dashboard en tiempo real
Bullet: Disponible · Total usado · Avances · Legalizaciones · Progreso de legalización


▸ SLIDE 4 — LOGIN CON ROLES
Imagen: frontend/01-login.png
Título: Autenticación JWT
Bullet: Director vs Administrador
        cajaId embebido en el claim
        Cada usuario sólo ve su caja


▸ SLIDE 5 — GESTIÓN DE AVANCES
Imagen: frontend/08-avances-admin.png
Título: Avances con filtros y badges
Bullet: Filtros por estado y fecha · Edición controlada por estado · Badges semánticos


▸ SLIDE 6 — CREAR UN AVANCE
Imagen: frontend/09-modal-nuevo-avance.png
Título: Forms tipados con validación instantánea
Bullet: React Hook Form + Zod
        Validación cliente y servidor
        UX sin sorpresas


▸ SLIDE 7 — AVANCE CREADO
Imagen: frontend/11-avance-creado.png
Título: ✅ AV-2026-006 creado
Bullet: Felipe Castillo · $420.000
        Total subió de 4 a 5
        Sistema funcionando en vivo


▸ SLIDE 8 — LEGALIZACIONES
Imagen: frontend/12-legalizacion-form-lleno.png
Título: Legalizar contra un avance
Bullet: El dominio calcula la diferencia
        Sobrante, faltante o exacto
        Sin intervención manual


▸ SLIDE 9 — LEGALIZACIÓN CREADA
Imagen: frontend/13-legalizacion-creada.png
Título: ✅ LG-2026-004 con diferencia $10.000
Bullet: Avance $220.000 · Monto $210.000
        Sobrante $10.000 calculado automáticamente
        Caja ajustada en tiempo real


▸ SLIDE 10 — FLUJO DE REEMBOLSOS
Imagen: frontend/15-reembolsos.png
Título: Doble aprobación obligatoria
Bullet: El que ejecuta NO confirma
        Cumple principios SOX
        Director cancela / activa / confirma


▸ SLIDE 11 — ARQUEO Y CIERRE
Imagen: frontend/16-arqueo.png
Título: Cierre con doble firma + PDF
Bullet: Firma del Director y del Administrador
        Generación de PDF oficial
        Envío directo a Tesorería


▸ SLIDE 12 — API REST DOCUMENTADA
Imagen: swagger/01-overview.png
Título: 25+ endpoints documentados
Bullet: Swagger / OpenAPI
        7 controladores
        Versionado nativo


▸ SLIDE 13 — JWT EN ACCIÓN
Imagen: swagger/02-login-ejecutado.png
Título: Login devuelve JWT + refresh
Bullet: cajaId, rol y email embebidos
        Expiración configurable
        Refresh token incluido


▸ SLIDE 14 — AUTORIZACIÓN BEARER
Imagen: swagger/03-authorize-jwt.png
Título: Probar la API en vivo
Bullet: Swagger UI con Authorize
        Cada endpoint con su rol requerido
        DX impecable para QA y dev


▸ SLIDE 15 — STACK COMPLETO
(solo texto)
BACKEND
.NET 9 · EF Core 9 · JWT · FluentValidation · Serilog · Swagger
FRONTEND
React 19 · TypeScript · Vite 8 · Tailwind 4 · Radix UI
TanStack Query · Zustand · React Hook Form · Zod
DB
SQL Server


▸ SLIDE 16 — ARQUITECTURA LIMPIA
(solo texto + diagrama)
API
↓
Application (DTOs · Interfaces · Validators)
↓
Domain (Entities · Enums · Reglas de negocio)
↑
Infrastructure (EF Core · Identity · Services)
La regla de oro: el Domain NO conoce a nadie.


▸ SLIDE 17 — CTA FINAL
(solo texto)
¿Construyes algo similar?
¿Tienes un proceso financiero en Excel?
Hablemos. 👇
[tu LinkedIn] · [tu portafolio]



═══════════════════════════════════════════════════════════
   ✏️ VERSIÓN CORTA — PARA POST SIMPLE SIN CARRUSEL
═══════════════════════════════════════════════════════════

🚀 Caja Menor — sistema empresarial full stack que acabo de terminar.

El problema: el 80% de empresas todavía gestiona la caja menor en Excel.

La solución: una plataforma multi-tenant que digitaliza el ciclo completo (avances → legalizaciones → reembolsos → arqueo) con doble firma digital y PDF oficial.

Stack:
🔹 Backend: .NET 9 · Clean Architecture · EF Core 9 · JWT · FluentValidation · Serilog · Swagger
🔹 Frontend: React 19 · TypeScript · Vite 8 · Tailwind 4 · Radix UI · TanStack Query · Zustand
🔹 DB: SQL Server

Lo más interesante de construirlo:
✅ Multi-tenant real — cajaId embebido en el JWT
✅ Separación Director vs Administrador (compliance SOX)
✅ El dominio calcula sobrante/faltante automáticamente
✅ Arquitectura limpia: el Domain no conoce a EF Core

¿Tienes un proceso financiero todavía en Excel? Hablemos. 👇

#DotNet #React #TypeScript #CleanArchitecture #FullStack #MiraxionTech



═══════════════════════════════════════════════════════════
   💬 PRIMER COMENTARIO SUGERIDO (impulsa el engagement)
═══════════════════════════════════════════════════════════

Si te interesa el detalle técnico de algún slide específico (la implementación de JWT multi-tenant, el cálculo automático de diferencias, o cómo monté la arquitectura limpia en .NET 9), pídelo en comentarios y te dejo el código 👇



═══════════════════════════════════════════════════════════
   📂 RESUMEN DE CAPTURAS DISPONIBLES
═══════════════════════════════════════════════════════════

FRONTEND (carpeta: screenshots-linkedin/frontend/)
01-login.png                      → pantalla de login limpia
02-login-llenado.png              → login con credenciales del Director
03-dashboard-director.png         → dashboard inicial con vista de Director
04-avances.png                    → vista de avances (Director)
05-legalizaciones.png             → vista de legalizaciones (Director)
06-reembolsos.png                 → vista de reembolsos (Director)
07-arqueo.png                     → vista de arqueo (Director)
08-avances-admin.png              → avances con botón Nuevo (Admin)
09-modal-nuevo-avance.png         → modal de crear avance abierto
11-avance-creado.png              → ✅ AV-2026-006 visible en lista
12-legalizacion-form-lleno.png    → modal de legalización con datos
13-legalizacion-creada.png        → ✅ LG-2026-004 con diferencia calculada
14-dashboard-final.png            → dashboard refrescado con datos nuevos
15-reembolsos.png                 → reembolsos finales
16-arqueo.png                     → arqueo final

SWAGGER (carpeta: screenshots-linkedin/swagger/)
01-overview.png                   → vista general de la API completa
02-login-ejecutado.png            → POST /Auth/login con JWT real en respuesta
03-authorize-jwt.png              → modal Authorize con Bearer token
