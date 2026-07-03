# SPEC-05 — Plan de Pruebas

> **Proyecto:** Sistema de Caja Menor  
> **Versión:** 1.1  
> **Fecha:** 2026-07-02  
> **Herramientas:** xUnit + Moq (backend), Vitest + Testing Library (frontend), Playwright (E2E)

---

## 1. Estrategia de pruebas

```
        ┌─────────────────────────────────┐
        │         E2E (Playwright)        │  ← Flujos completos de usuario
        │         ~10% del total          │
        └─────────────┬───────────────────┘
                      │
        ┌─────────────▼───────────────────┐
        │    Integración (API + BD)       │  ← Endpoints con BD real (SQLite)
        │         ~30% del total          │
        └─────────────┬───────────────────┘
                      │
        ┌─────────────▼───────────────────┐
        │        Unitarias                │  ← Lógica de negocio pura
        │         ~60% del total          │
        └─────────────────────────────────┘
```

---

## 2. Pruebas unitarias — Backend (.NET / xUnit)

### 2.1 Proyecto de pruebas

```
backend/
  tests/
    CajaMenor.UnitTests/
      Services/
        AvanceServiceTests.cs
        LegalizacionServiceTests.cs
        CajaMenorServiceTests.cs
        OCRServiceTests.cs
      Domain/
        LegalizacionCalculosTests.cs
      Common/
        ResultTests.cs
```

### 2.2 `LegalizacionCalculosTests.cs` — Lógica de negocio

```csharp
public class LegalizacionCalculosTests
{
    [Fact]
    public void CalcularDiferencias_SinAvance_DebeReembolsarMontoCompleto()
    {
        var leg = new Legalizacion { Monto = 500_000m, AvanceId = null };
        leg.CalcularDiferencias();
        Assert.Equal(0m, leg.Diferencia);
        Assert.Equal(0m, leg.DescuentoCaja);
        Assert.Equal(500_000m, leg.ValorReembolsar);
    }

    [Fact]
    public void CalcularDiferencias_ConAvance_Sobrante_DiferenciaPositiva()
    {
        // Avance: $600.000, Gasto: $500.000 → Sobrante: $100.000
        var leg = new Legalizacion { Monto = 500_000m, AvanceId = 1, ValorAvance = 600_000m };
        leg.CalcularDiferencias();
        Assert.Equal(100_000m, leg.Diferencia);
        Assert.Equal(0m, leg.DescuentoCaja);
        Assert.Equal(500_000m, leg.ValorReembolsar);
    }

    [Fact]
    public void CalcularDiferencias_ConAvance_Faltante_DiferenciaNegativa()
    {
        // Avance: $400.000, Gasto: $500.000 → Faltante: $100.000
        var leg = new Legalizacion { Monto = 500_000m, AvanceId = 1, ValorAvance = 400_000m };
        leg.CalcularDiferencias();
        Assert.Equal(-100_000m, leg.Diferencia);
        Assert.Equal(100_000m, leg.DescuentoCaja);
        Assert.Equal(500_000m, leg.ValorReembolsar);
    }

    [Fact]
    public void CalcularDiferencias_ConAvance_Total_DiferenciaCero()
    {
        var leg = new Legalizacion { Monto = 500_000m, AvanceId = 1, ValorAvance = 500_000m };
        leg.CalcularDiferencias();
        Assert.Equal(0m, leg.Diferencia);
        Assert.Equal(0m, leg.DescuentoCaja);
        Assert.Equal(500_000m, leg.ValorReembolsar);
    }
}
```

### 2.3 `AvanceServiceTests.cs` — Control de tope de caja

```csharp
public class AvanceServiceTests
{
    private readonly Mock<AppDbContext> _dbMock;

    [Fact]
    public async Task CrearAvance_CuandoSuperaDisponible_DebeRetornarError()
    {
        // Arrange
        var caja = new CajaMenorEntity { Disponible = 100_000m, ValorApertura = 500_000m, TotalUsado = 400_000m };
        // Configurar mock para retornar esa caja
        var dto = new CrearAvanceDto { ValorAvance = 200_000m, CajaId = 1, CodigoAvance = "REQ-001" };

        // Act
        var resultado = await _service.CrearAsync(dto);

        // Assert
        Assert.False(resultado.Success);
        Assert.Contains("Saldo insuficiente", resultado.Error);
    }

    [Fact]
    public async Task CrearAvance_CuandoSuperaTopeCaja_DebeRetornarError()
    {
        // Caja con ValorApertura $500.000, TotalUsado $490.000, Disponible $10.000
        // Avance de $20.000 → superaría el tope aunque haya disponible
        var caja = new CajaMenorEntity { Disponible = 10_000m, ValorApertura = 500_000m, TotalUsado = 490_000m };
        var dto = new CrearAvanceDto { ValorAvance = 20_000m, CajaId = 1, CodigoAvance = "REQ-001" };

        var resultado = await _service.CrearAsync(dto);

        Assert.False(resultado.Success);
    }

    [Fact]
    public async Task CrearAvance_ValorDentroDeDisponible_DebeDescontarDeCaja()
    {
        var dto = new CrearAvanceDto { ValorAvance = 50_000m, CajaId = 1, CodigoAvance = "REQ-001" };
        var resultado = await _service.CrearAsync(dto);

        Assert.True(resultado.Success);
        Assert.Equal(EstadoAvance.Pendiente.ToString(), resultado.Data!.Estado);
    }

    [Fact]
    public async Task CrearAvance_CodigoDuplicado_DebeRetornarError()
    {
        // Arrange: código REQ-001 ya existe
        var dto = new CrearAvanceDto { CodigoAvance = "REQ-001", ValorAvance = 10_000m, CajaId = 1 };

        var resultado = await _service.CrearAsync(dto);

        Assert.False(resultado.Success);
        Assert.Contains("Ya existe", resultado.Error);
    }
}
```

### 2.4 `LegalizacionServiceTests.cs`

```csharp
public class LegalizacionServiceTests
{
    [Fact]
    public async Task CrearLegalizacion_ConAvanceYaLegalizado_DebeRetornarError()

    [Fact]
    public async Task CrearLegalizacion_SinAvance_SuperaTopeCaja_DebeRetornarError()

    [Fact]
    public async Task CrearLegalizacion_ConAvancePendiente_DebeMarcarloComoLegalizado()

    [Fact]
    public async Task CrearLegalizacion_Sobrante_DebeAumentarDisponibleEnCaja()
        // ValorAvance $600k, Monto $500k → Diferencia $100k → Disponible += $100k

    [Fact]
    public async Task CrearLegalizacion_Faltante_DebeDisminuirDisponibleEnCaja()
        // ValorAvance $400k, Monto $500k → DescuentoCaja $100k → Disponible -= $100k

    [Fact]
    public async Task SubirRecibo_LegalizacionEnProceso_DebeRechazar()

    [Fact]
    public async Task IniciarReembolso_YaReembolsada_DebeRetornarError()
}
```

### 2.5 `OCRServiceTests.cs` (nuevo — validación OCR)

```csharp
public class OCRServiceTests
{
    [Fact]
    public async Task ExtraerMonto_FacturaValida_DebeRetornarValorCorrecto()
    {
        // Usar imagen de prueba con valor conocido $500.000
        var stream = File.OpenRead("TestAssets/factura_500000.jpg");
        var resultado = await _ocrService.ExtraerMontoFacturaAsync(stream, ".jpg");

        Assert.True(resultado.Exitoso);
        Assert.Equal(500_000m, resultado.MontoExtraido);
    }

    [Fact]
    public async Task ExtraerMonto_PDFVacio_DebeRetornarSinError()
    {
        var resultado = await _ocrService.ExtraerMontoFacturaAsync(Stream.Null, ".pdf");
        Assert.False(resultado.Exitoso);
        Assert.Null(resultado.MontoExtraido);
    }

    [Theory]
    [InlineData(500_000, 490_000, 0.02, false)]  // Diferencia 2% → rechazar
    [InlineData(500_000, 499_000, 0.02, true)]   // Diferencia 0.2% → aceptar
    [InlineData(500_000, 510_000, 0.02, true)]   // Diferencia 2% exacto → aceptar
    public void ValidarTolerancia_DebeAceptarORechazarSegunPorcentaje(
        decimal montoLegalizado, decimal montoOCR, double tolerancia, bool esperado)
    {
        var diferencia = Math.Abs(montoOCR - montoLegalizado);
        var umbral = montoLegalizado * (decimal)tolerancia;
        var esValido = diferencia <= umbral;
        Assert.Equal(esperado, esValido);
    }
}
```

---

## 3. Pruebas de integración — Backend (API con BD en memoria)

### 3.1 Configuración

```csharp
// Tests/IntegrationTests/CajaMenorWebApplicationFactory.cs
public class CajaMenorWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Reemplazar SQL Server con SQLite en memoria
            var descriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlite("DataSource=:memory:"));
        });
    }
}
```

### 3.2 Casos de prueba de integración

```csharp
// Tests/IntegrationTests/AvancesIntegrationTests.cs
public class AvancesIntegrationTests(CajaMenorWebApplicationFactory factory)
    : IClassFixture<CajaMenorWebApplicationFactory>
{
    [Fact]
    public async Task POST_NuevoAvance_RetornaCreated()
    {
        var client = factory.CreateClient();
        // Login → obtener JWT
        var token = await ObtenerTokenAdmin(client);
        client.DefaultRequestHeaders.Authorization = new("Bearer", token);

        var dto = new CrearAvanceDto { CodigoAvance = "REQ-001", ValorAvance = 50_000, ... };
        var response = await client.PostAsJsonAsync("/api/cajas/1/avances", dto);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task POST_NuevoAvance_SuperaDisponible_RetornaBadRequest()

    [Fact]
    public async Task POST_NuevoAvance_SinToken_Retorna401()

    [Fact]
    public async Task POST_NuevoAvance_ConTokenDirector_Retorna403()
        // Solo Administrador puede crear avances
}
```

### 3.3 Pruebas de upload

```csharp
[Fact]
public async Task POST_SubirRecibo_FacturaValida_RetornaOK()
{
    using var content = new MultipartFormDataContent();
    var imageBytes = File.ReadAllBytes("TestAssets/factura_test.jpg");
    content.Add(new ByteArrayContent(imageBytes), "archivo", "factura.jpg");

    var response = await client.PostAsync($"/api/cajas/1/legalizaciones/1/recibos", content);
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
}

[Fact]
public async Task POST_SubirRecibo_ExtensionNoPermitida_RetornaBadRequest()
{
    // Subir un .exe
    content.Add(new ByteArrayContent([]), "archivo", "virus.exe");
    var response = await client.PostAsync("...", content);
    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
}

[Fact]
public async Task POST_SubirRecibo_ValorOCRDiscrepa_Retorna422()
{
    // Imagen con $300.000 vs. legalización de $500.000
}
```

---

## 4. Pruebas unitarias — Frontend (Vitest + Testing Library)

### 4.1 Setup

```typescript
// frontend/cajamenor-app/src/test/setup.ts
import '@testing-library/jest-dom'
import { server } from './mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### 4.2 Pruebas de componentes clave

#### `AvancesPage.test.tsx`

```typescript
describe('AvancesPage', () => {
  it('muestra skeleton de carga mientras obtiene datos', async () => {
    render(<AvancesPage />)
    expect(screen.getByTestId('skeleton-table')).toBeInTheDocument()
  })

  it('muestra lista de avances al cargar', async () => {
    render(<AvancesPage />)
    await waitFor(() => expect(screen.getByText('REQ-0001')).toBeInTheDocument())
  })

  it('botón nuevo avance solo visible para Administrador', () => {
    renderWithRole(<AvancesPage />, 'Director')
    expect(screen.queryByText('+ Nuevo avance')).not.toBeInTheDocument()
  })

  it('muestra saldo disponible en modal de nuevo avance', async () => {
    renderWithRole(<AvancesPage />, 'Administrador')
    fireEvent.click(screen.getByText('+ Nuevo avance'))
    await waitFor(() =>
      expect(screen.getByText(/Disponible en caja/)).toBeInTheDocument()
    )
  })

  it('muestra error cuando valor supera disponible', async () => {
    // Mock API que retorna error de saldo insuficiente
  })
})
```

#### `LegalizacionesPage.test.tsx`

```typescript
describe('FileDropzone — upload recibo', () => {
  it('muestra estado de análisis OCR durante la subida', async () => {
    // Simular upload lento con delay en MSW
    render(<LegalizacionDetail id={1} />)
    const file = new File(['...'], 'factura.jpg', { type: 'image/jpeg' })
    fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } })
    expect(screen.getByText('Analizando factura...')).toBeInTheDocument()
  })

  it('muestra badge de verificación exitosa tras OCR correcto', async () => {
    // MSW mock devuelve OCR exitoso
    await waitFor(() =>
      expect(screen.getByText('Monto verificado')).toBeInTheDocument()
    )
  })

  it('muestra error de discrepancia con montos detallados', async () => {
    // MSW mock devuelve HTTP 422 con detalle
    await waitFor(() =>
      expect(screen.getByText(/no coincide con el monto legalizado/)).toBeInTheDocument()
    )
  })
})
```

### 4.3 Pruebas de store

```typescript
describe('authStore', () => {
  it('setAuth almacena token y datos de usuario', () => {
    const { setAuth, user, isAuthenticated } = useAuthStore.getState()
    setAuth({ token: 'jwt123', rol: 'Administrador', cajaId: 1, ... })
    expect(isAuthenticated).toBe(true)
    expect(user?.rol).toBe('Administrador')
  })

  it('logout limpia el estado completamente', () => {
    const { logout, isAuthenticated } = useAuthStore.getState()
    logout()
    expect(isAuthenticated).toBe(false)
  })
})
```

### 4.4 Pruebas de lógica utilitaria

```typescript
// lib/utils.test.ts
describe('formatCurrency', () => {
  it('formatea montos colombianos correctamente', () => {
    expect(formatCurrency(1500000)).toBe('$1.500.000')
    expect(formatCurrency(0)).toBe('$0')
    expect(formatCurrency(-50000)).toBe('-$50.000')
  })
})
```

---

## 5. Pruebas End-to-End (Playwright)

### 5.1 Setup

```typescript
// e2e/playwright.config.ts
export default {
  testDir: './e2e/tests',
  baseURL: 'http://localhost:5173',
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
}
```

### 5.2 Flujos críticos E2E

#### Flujo 1: Login y acceso por rol

```typescript
test('Director puede ver página de Reembolsos', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name=email]', 'director@test.com')
  await page.fill('[name=password]', 'Pass1234!')
  await page.click('button[type=submit]')
  await page.waitForURL('/dashboard')
  await page.click('text=Reembolsos')
  await expect(page).toHaveURL('/reembolsos')
  await expect(page.locator('h2')).toContainText('Reembolsos')
})

test('Administrador no ve la página de Reembolsos en el menú', async ({ page }) => {
  await loginAs(page, 'admin@test.com', 'Pass1234!')
  await expect(page.locator('nav text=Reembolsos')).not.toBeVisible()
})
```

#### Flujo 2: Crear avance y legalizar

```typescript
test('Flujo completo: crear avance → legalizar → reembolsar', async ({ page }) => {
  await loginAs(page, 'admin@test.com', 'Pass1234!')

  // 1. Crear avance
  await page.click('text=Avances')
  await page.click('text=+ Nuevo avance')
  await page.fill('[name=codigoAvance]', 'REQ-E2E-001')
  await page.fill('[name=valorAvance]', '50000')
  await page.fill('[name=solicitante]', 'Carlos García')
  await page.fill('[name=descripcion]', 'Prueba E2E')
  await page.click('button[type=submit]')
  await expect(page.locator('text=REQ-E2E-001')).toBeVisible()

  // 2. Crear legalización asociada
  await page.click('text=Legalizaciones')
  await page.click('text=+ Nueva legalización')
  await page.selectOption('[name=avanceId]', { label: /REQ-E2E-001/ })
  await page.fill('[name=monto]', '48000')
  await page.fill('[name=codigoLegalizacion]', 'LEG-E2E-001')
  await page.selectOption('[name=tipoLegalizacion]', 'Servicios')
  await page.fill('[name=descripcion]', 'Prueba E2E legalización')
  await page.click('button[type=submit]')
  await expect(page.locator('text=LEG-E2E-001')).toBeVisible()

  // 3. Iniciar reembolso
  await page.click('tr:has-text("LEG-E2E-001") button:has-text("Reembolsar")')
  await expect(page.locator('text=EnProceso')).toBeVisible()
})
```

#### Flujo 3: Upload de recibo con validación OCR

```typescript
test('Upload de factura con monto correcto es aceptado', async ({ page }) => {
  await loginAs(page, 'admin@test.com', 'Pass1234!')
  await page.goto('/cajas/1/legalizaciones/1')

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('text=Subir factura')
  ])
  await fileChooser.setFiles('./e2e/fixtures/factura_valida.jpg')

  await expect(page.locator('text=Analizando factura')).toBeVisible()
  await expect(page.locator('text=Monto verificado')).toBeVisible({ timeout: 30_000 })
})

test('Upload de factura con monto incorrecto es rechazado', async ({ page }) => {
  // Factura con valor diferente al monto legalizado
  await fileChooser.setFiles('./e2e/fixtures/factura_valor_diferente.jpg')
  await expect(page.locator('text=no coincide con el monto legalizado')).toBeVisible({ timeout: 30_000 })
})
```

#### Flujo 4: Tope de caja

```typescript
test('No permite crear avance que supere el monto de la caja', async ({ page }) => {
  // Caja con $100.000 disponibles, intentar avance de $200.000
  await loginAs(page, 'admin@test.com', 'Pass1234!')
  await page.click('text=Avances')
  await page.click('text=+ Nuevo avance')
  await page.fill('[name=valorAvance]', '200000')
  await page.click('button[type=submit]')
  await expect(page.locator('text=Saldo insuficiente')).toBeVisible()
})
```

#### Flujo 5: Arqueo completo

```typescript
test('Flujo de arqueo: generar → firmar → enviar a tesorería', async ({ page }) => {
  // Admin genera arqueo
  await loginAs(page, 'admin@test.com', 'Pass1234!')
  await page.click('text=Arqueo')
  await page.click('text=Generar arqueo')
  await expect(page.locator('[data-testid=arqueo-resumen]')).toBeVisible()

  // Admin sube firma
  await uploadFile(page, 'firma-admin', 'e2e/fixtures/firma.png')

  // Director sube firma
  await loginAs(page, 'director@test.com', 'Pass1234!')
  await page.click('text=Arqueo')
  await uploadFile(page, 'firma-director', 'e2e/fixtures/firma.png')

  // Enviar a tesorería
  await loginAs(page, 'admin@test.com', 'Pass1234!')
  await page.click('text=Enviar a Tesorería')
  await expect(page.locator('text=Enviado')).toBeVisible()
})
```

---

## 6. Pruebas de seguridad manuales

| Prueba | Procedimiento | Resultado esperado |
|--------|--------------|-------------------|
| JWT expirado | Esperar 8h + llamar endpoint | HTTP 401 |
| Token de otro usuario | Usar token de admin de caja A en caja B | HTTP 403 |
| Endpoint Director con token Admin | `POST /api/cajamenor` con token Admin | HTTP 403 |
| Upload .exe | Subir archivo .exe como recibo | HTTP 400 |
| Upload >10MB | Subir imagen >10 MB | HTTP 400 |
| Inyección SQL | Código avance: `'; DROP TABLE Avances; --` | Guardado como texto literal, sin efecto |
| Path traversal | Nombre de archivo `../../app.dll` | Sanitizado a `app.dll` |
| Brute force login | 10 intentos en 1 minuto | HTTP 429 tras el 5° intento |

---

## 7. Matriz de cobertura objetivo

| Módulo | Unitarias | Integración | E2E |
|--------|-----------|-------------|-----|
| Avances | 10 casos | 6 casos | 2 flujos |
| Legalizaciones | 12 casos | 8 casos | 2 flujos |
| Reembolsos | 8 casos | 4 casos | 1 flujo |
| Arqueos | 6 casos | 3 casos | 1 flujo |
| OCR / Upload | 8 casos | 5 casos | 2 flujos |
| Auth / Roles | 6 casos | 4 casos | 1 flujo |
| Dashboard | 4 casos | 2 casos | — |
| **TOTAL** | **54** | **32** | **9** |

**Cobertura mínima de código objetivo:** 80% en servicios de backend.

---

## 8. Herramientas y configuración

### Backend

```xml
<!-- backend/tests/CajaMenor.UnitTests/CajaMenor.UnitTests.csproj -->
<PackageReference Include="xunit" Version="2.9.0" />
<PackageReference Include="Moq" Version="4.20.0" />
<PackageReference Include="FluentAssertions" Version="6.12.0" />
<PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="9.0.0" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="9.0.0" />
```

Ejecutar pruebas:
```powershell
dotnet test backend/ --collect:"XPlat Code Coverage" --results-directory ./coverage
reportgenerator -reports:coverage/**/*.xml -targetdir:./coverage/report -reporttypes:Html
```

### Frontend

```json
// package.json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "test:e2e": "playwright test"
}
```

```typescript
// vite.config.ts — agregar
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    thresholds: { lines: 80, functions: 80 }
  }
}
```

### E2E

```bash
npx playwright install
npx playwright test --reporter=html
```

---

## 9. Flujo de CI

```yaml
# .github/workflows/tests.yml
- name: Backend tests
  run: dotnet test backend/ --no-build --verbosity normal

- name: Frontend unit tests
  run: npm test --prefix frontend/cajamenor-app -- --run

- name: E2E tests
  run: |
    npm run build --prefix frontend/cajamenor-app
    npx serve -s dist &
    dotnet run --project backend/src/CajaMenor.API &
    sleep 5
    npx playwright test
```

Los tests E2E solo corren en el pipeline de `main` (no en PRs de feature branches, para ahorrar tiempo).
