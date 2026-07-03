# SPEC-02 — Diseño y Experiencia de Usuario

> **Proyecto:** Sistema de Caja Menor  
> **Versión:** 1.1  
> **Fecha:** 2026-07-02  
> **Stack actual:** React 18 + TypeScript + Vite + TailwindCSS + Radix UI

---

## 1. Visión general de diseño

El sistema actualmente tiene una base de componentes funcional (Card, Button, Badge, Input, Select, StatusCircle). El diseño es austero: fondo blanco, textos en gris, acentos en teal. Las mejoras propuestas buscan mayor claridad financiera, jerarquía visual, y una experiencia móvil aceptable.

---

## 2. Sistema de diseño base

### 2.1 Paleta de colores

```css
/* Colores primarios */
--color-primary:     #0d9488;  /* Teal 600 — acción principal */
--color-primary-dk:  #0f766e;  /* Teal 700 — hover */
--color-primary-lt:  #ccfbf1;  /* Teal 100 — fondo suave */

/* Estados financieros */
--color-disponible:  #16a34a;  /* Green 600 — dinero disponible */
--color-usado:       #dc2626;  /* Red 600 — total usado */
--color-pendiente:   #d97706;  /* Amber 600 — avances pendientes */
--color-sobrante:    #7c3aed;  /* Violet 600 — sobrante */

/* Neutros */
--color-surface:     #f9fafb;  /* Gray 50 — fondo de página */
--color-card:        #ffffff;  /* Blanco — tarjetas */
--color-border:      #e5e7eb;  /* Gray 200 — bordes */
--color-text-main:   #111827;  /* Gray 900 — texto principal */
--color-text-muted:  #6b7280;  /* Gray 500 — texto secundario */
```

### 2.2 Tipografía

| Uso | Fuente | Peso | Tamaño |
|-----|--------|------|--------|
| Título de página | Inter / system-ui | 700 | 24px |
| Subtítulo | Inter | 600 | 18px |
| Cuerpo | Inter | 400 | 14px |
| Label de form | Inter | 500 | 13px |
| Código (REQ-001) | JetBrains Mono | 500 | 13px |
| Montos | JetBrains Mono | 600 | 14-20px |

### 2.3 Espaciado y layout

- **Grid del layout principal:** sidebar fijo 260px + área de contenido fluida.
- **Padding de página:** `px-6 py-6` desktop, `px-4 py-4` móvil.
- **Gap entre cards de resumen:** `gap-4` (16px).
- **Altura mínima de fila de tabla:** 48px.
- **Radio de tarjetas:** 12px (`rounded-xl`).

---

## 3. Mejoras por página

### 3.1 Dashboard

**Actual:** Tarjetas simples con número grande, texto y una barra de progreso.

**Propuesto:**

#### Barra de salud financiera de la caja
```
┌──────────────────────────────────────────────────┐
│ CAJA MENOR — Central Norte          ● ABIERTA    │
│                                                  │
│  Apertura    Disponible    Usado                 │
│  $5.000.000  $3.200.000   $1.800.000             │
│  ────────────[████████░░░░░░░░░░░░░]─────────    │
│              64% disponible                      │
│                                                  │
│  Director: Juan Pérez   Admin: María López       │
└──────────────────────────────────────────────────┘
```

- La barra de progreso usa gradiente: verde cuando >50%, amarillo 25-50%, rojo <25%.
- Tooltip al hover sobre la barra: muestra `$3.200.000 disponibles de $5.000.000`.

#### Panel de alertas
Si hay avances pendientes de legalizar >15 días, mostrar banner rojo encima del dashboard:
```
⚠ Hay 3 avances con más de 15 días sin legalizar. Ver avances →
```

#### Cards de métricas mejoradas (2×3 grid)
```
┌───────────┐ ┌───────────┐ ┌───────────┐
│ Avances   │ │ Legaliz.  │ │ Reembolso │
│ Pendientes│ │ Sin reemb.│ │ En Proceso│
│    5      │ │    3      │ │   $1.2M   │
│ $800.000  │ │ $450.000  │ │           │
└───────────┘ └───────────┘ └───────────┘
┌───────────┐ ┌───────────┐ ┌───────────┐
│ Avances   │ │ Recibos   │ │ Último    │
│ Legalizados│ │ Subidos   │ │ Arqueo   │
│    12     │ │    8      │ │ 20/jun    │
└───────────┘ └───────────┘ └───────────┘
```

### 3.2 Página de Avances

**Mejoras:**

1. **Columna de acciones**: botones "Editar" y "Eliminar" (solo Pendiente) como iconos compactos, no texto completo.
2. **Row expandible**: al hacer clic en una fila, se expande para mostrar la descripción completa y el código de la legalización vinculada (si existe).
3. **Indicador visual de antigüedad**: filas con avance pendiente >15 días → fondo amarillo claro, tooltip "Pendiente de legalizar hace X días".
4. **Totales al pie de tabla**: suma de valores de avances pendientes y legalizados.
5. **Badge de TipoAvance con icono**:
   - Total → `✓ Total` (verde)
   - Sobrante → `↑ Sobrante` (naranja)
   - Faltante → `↓ Faltante` (rojo)

**Modal de nuevo avance (mejorado):**
```
┌─────────────────────────────────────┐
│  Nuevo Avance               [✕]     │
├─────────────────────────────────────┤
│  Disponible en caja: $3.200.000     │  ← Banner siempre visible
├─────────────────────────────────────┤
│  Código     [REQ-____] [Auto]       │
│  Fecha      [2026-07-02    ]        │
│  Valor      [$___________]          │
│             Quedaría: $X.XXX.XXX    │  ← Cálculo en tiempo real
│  Solicitante[________________]      │
│  Descripción[________________]      │
├─────────────────────────────────────┤
│         [Cancelar]  [Guardar]       │
└─────────────────────────────────────┘
```

### 3.3 Página de Legalizaciones

**Mejoras:**

1. **Vista de detalle lateral (drawer)**: al hacer clic en una legalización, se abre un panel lateral con todos los campos + recibos adjuntos + historial de estados.
2. **Upload de recibos mejorado**:
   - Zona de drag-and-drop.
   - Preview de la imagen antes de confirmar el upload.
   - Barra de progreso del análisis OCR ("Analizando factura... espere").
   - Al finalizar, mostrar resultado: ✓ Monto verificado o ✗ Discrepancia detectada.
3. **Galería de recibos**: los recibos adjuntos se muestran como miniaturas con opción de zoom (lightbox).
4. **Columna de recibos**: indicador en la tabla de si tiene recibos adjuntos (número de archivos con ícono de clip).
5. **Acciones de edición en línea**: botón "Editar" solo visible si `EstadoReembolso == SinReembolso`.

**Modal de nueva legalización (mejorado):**
```
┌─────────────────────────────────────────┐
│  Nueva Legalización              [✕]    │
├─────────────────────────────────────────┤
│  [Sin Avance] [Con Avance]              │  ← Tabs
├─────────────────────────────────────────┤
│  Si "Con Avance": selector de avance    │
│  muestra código + valor avance          │
│  Monto  [$_________]                   │
│  Diferencia calculada: $XXX (Sobrante) │  ← Cálculo en vivo
├─────────────────────────────────────────┤
│  Código     [LEG-____] [Auto]          │
│  Fecha      [2026-07-02    ]           │
│  Tipo       [Gastos de viaje ▼]        │
│  Descripción[__________________]       │
├─────────────────────────────────────────┤
│           [Cancelar]  [Guardar]        │
└─────────────────────────────────────────┘
```

### 3.4 Página de Reembolsos

**Mejoras:**

1. **Timeline de estado**: cada reembolso muestra una línea de progreso: SinReembolso → EnProceso → Reembolsado.
2. **Resumen financiero**: tarjeta con total a reembolsar (Debemos) y total a descontar de caja (Debe).
3. **Confirmación con firma electrónica**: el botón "Confirmar reembolsos" debe mostrar un diálogo de confirmación explícito con el monto total antes de ejecutar.
4. **Histórico filtrable**: filtros por mes/año en la sección de histórico.

### 3.5 Página de Arqueo

**Mejoras:**

1. **Tabla de movimientos con totales**: mostrar suma de cada columna al pie.
2. **Estado de firmas mejorado**: 
   ```
   ┌─────────────────────────────────────┐
   │ Firma Director    Firma Admin       │
   │ ✓ Firmado         ⏳ Pendiente     │
   │ Juan Pérez        —                │
   │ [Ver] [Eliminar]  [Subir firma]    │
   └─────────────────────────────────────┘
   ```
3. **Botón "Enviar a Tesorería"**: deshabilitado y con tooltip explicativo hasta que ambas firmas estén presentes.
4. **Vista previa del PDF antes de enviar**: botón "Ver PDF" abre el PDF en modal antes de enviar.

### 3.6 Sidebar

**Mejoras:**

1. **Badges de notificación**: número rojo sobre ítems de menú con ítems pendientes.
2. **Logo/nombre de la caja actual** en la parte superior del sidebar.
3. **Indicador de saldo** en el sidebar:
   ```
   ┌──────────────────┐
   │ 💼 Caja Norte    │
   │ Disponible       │
   │ $3.200.000       │  ← Verde / Amarillo / Rojo
   └──────────────────┘
   ```
4. **Avatar del usuario** (iniciales generadas) + rol mostrado debajo del nombre.

---

## 4. Componentes nuevos a crear

| Componente | Ruta propuesta | Descripción |
|-----------|----------------|-------------|
| `Drawer` | `components/ui/Drawer.tsx` | Panel lateral deslizable para detalle |
| `ProgressBar` | `components/ui/ProgressBar.tsx` | Barra de progreso con color dinámico |
| `Lightbox` | `components/ui/Lightbox.tsx` | Visor de imágenes a pantalla completa |
| `FileDropzone` | `components/ui/FileDropzone.tsx` | Zona drag & drop con preview |
| `OCRStatusBadge` | `components/ui/OCRStatusBadge.tsx` | Badge de estado de validación OCR |
| `AlertBanner` | `components/ui/AlertBanner.tsx` | Banner de alerta contextual |
| `ConfirmDialog` | `components/ui/ConfirmDialog.tsx` | Diálogo de confirmación con detalles |
| `Tooltip` | `components/ui/Tooltip.tsx` | Tooltip accesible (Radix UI) |
| `Pagination` | `components/ui/Pagination.tsx` | Control de paginación |
| `Timeline` | `components/ui/Timeline.tsx` | Línea de tiempo de estados |

---

## 5. Responsividad

### 5.1 Puntos de quiebre

| Breakpoint | Ancho | Comportamiento |
|-----------|-------|----------------|
| `sm` | 640px | Sidebar colapsable (hamburger menu) |
| `md` | 768px | Cards de resumen en 2 columnas |
| `lg` | 1024px | Layout completo, sidebar fijo |

### 5.2 Tablas en móvil

Las tablas con muchas columnas se convierten en tarjetas apiladas en pantallas < 768px:
```
┌──────────────────────┐
│ REQ-0042             │
│ $500.000 • Pendiente │
│ Carlos García        │
│ 2026-06-15           │
│ [Editar] [Eliminar]  │
└──────────────────────┘
```

---

## 6. Accesibilidad

- Todos los inputs deben tener `<label>` asociado con `htmlFor`.
- Los botones con solo ícono deben tener `aria-label`.
- El contraste de texto mínimo: 4.5:1 (WCAG AA).
- Los modales deben trapear el foco y cerrarse con `Escape`.
- Las tablas deben tener `<caption>` y atributos `scope` en `<th>`.

---

## 7. Estados de carga y vacío

### Loading skeleton (en lugar de spinner genérico)

Al cargar tablas, mostrar skeleton de filas:
```
┌────────────────────────────────────────┐
│ ████████  ██████  ████  ████████████  │
│ ████████  ██████  ████  ████████████  │
│ ████████  ██████  ████  ████████████  │
└────────────────────────────────────────┘
```

### Estado vacío con acción

```
┌──────────────────────────────────┐
│         📋                       │
│   No hay avances registrados     │
│   Registre el primer avance de   │
│   esta caja menor                │
│      [+ Nuevo avance]            │
└──────────────────────────────────┘
```

---

## 8. Toasts y feedback

Usar una librería de toasts (ej. `react-hot-toast` o `sonner`) para feedback de acciones:

| Acción | Toast |
|--------|-------|
| Crear avance exitoso | ✓ verde — "Avance REQ-0042 creado" |
| Error tope de caja | ✗ rojo — "Saldo insuficiente: disponible $X" |
| Upload exitoso + OCR ok | ✓ verde — "Factura verificada: $500.000" |
| OCR detecta discrepancia | ✗ rojo — "Discrepancia: factura $480.000 vs. $500.000 legalizado" |
| Reembolso confirmado | ✓ verde — "Reembolso por $X confirmado" |

---

## 9. Tema oscuro (Dark Mode) — Roadmap futuro

Preparar variables CSS para soportar dark mode en versión futura mediante `prefers-color-scheme` y toggle manual. Los colores actuales (teal/white) tienen buen contraste en ambos modos.
