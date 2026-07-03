-- ============================================================
-- SPEC-03 — Limpieza de datos de la base de datos
-- Proyecto: Sistema de Caja Menor
-- Fecha: 2026-07-02
-- ============================================================
-- ADVERTENCIA: Este script elimina DATOS, no tablas ni esquemas.
-- La estructura de la BD (tablas, columnas, índices, FKs)
-- se conserva intacta para poder volver a usar la aplicación.
--
-- EJECUTAR SÓLO EN AMBIENTES DE DESARROLLO O STAGING.
-- NO ejecutar en producción sin respaldo previo (backup).
--
-- ANTES DE EJECUTAR:
--   1. Hacer BACKUP completo de la base de datos.
--   2. Verificar que nadie esté usando la aplicación.
--   3. Detener la API (.NET) para evitar escrituras concurrentes.
-- ============================================================

USE CajaMenorDb;   -- Cambiar por el nombre real de la BD si difiere
GO

-- ============================================================
-- OPCIÓN A: Limpiar SÓLO datos transaccionales (operacionales)
-- Conserva: Centrales, UsuariosApp y AspNet Identity (usuarios)
-- Borra:    Avances, Legalizaciones, Reembolsos, Arqueos,
--           LegalizacionRecibos, CajasMenores, AuditLogs
-- ============================================================

BEGIN TRANSACTION;

-- 1. Recibos de legalizaciones (FK → Legalizaciones)
DELETE FROM LegalizacionRecibos;

-- 2. Reembolsos (FK → Legalizaciones, CASCADE en BD)
DELETE FROM Reembolsos;

-- 3. Legalizaciones (FK → CajasMenores CASCADE, FK → Avances sin acción)
DELETE FROM Legalizaciones;

-- 4. Avances (FK → CajasMenores CASCADE)
DELETE FROM Avances;

-- 5. Arqueos (FK → CajasMenores CASCADE)
DELETE FROM Arqueos;

-- 6. Tabla join de administradores de caja (FK → CajasMenores CASCADE)
DELETE FROM CajaAdministradores;

-- 7. Cajas menores (FK → Centrales CASCADE, FK → UsuariosApp RESTRICT)
--    Se eliminan después de la join table para no violar la FK de UsuariosApp
DELETE FROM CajasMenores;

-- 8. Log de auditoría (sin FK)
DELETE FROM AuditLogs;

-- Resetear identidades (contadores de auto-increment)
DBCC CHECKIDENT ('LegalizacionRecibos', RESEED, 0);
DBCC CHECKIDENT ('Reembolsos',          RESEED, 0);
DBCC CHECKIDENT ('Legalizaciones',      RESEED, 0);
DBCC CHECKIDENT ('Avances',             RESEED, 0);
DBCC CHECKIDENT ('Arqueos',             RESEED, 0);
DBCC CHECKIDENT ('CajasMenores',        RESEED, 0);
DBCC CHECKIDENT ('AuditLogs',           RESEED, 0);

COMMIT TRANSACTION;

PRINT 'Opción A completada: datos transaccionales eliminados. Usuarios y Centrales conservados.';
GO

-- ============================================================
-- OPCIÓN B: Limpiar TODO (incluyendo usuarios e Identity)
-- Útil para resetear completamente el ambiente de desarrollo.
-- También limpia UsuariosApp, Centrales y todas las tablas
-- de ASP.NET Identity.
-- ============================================================
-- DESCOMENTAR SÓLO SI SE DESEA BORRADO TOTAL
-- ============================================================

/*
BEGIN TRANSACTION;

-- 1. Recibos
DELETE FROM LegalizacionRecibos;

-- 2. Reembolsos
DELETE FROM Reembolsos;

-- 3. Legalizaciones
DELETE FROM Legalizaciones;

-- 4. Avances
DELETE FROM Avances;

-- 5. Arqueos
DELETE FROM Arqueos;

-- 6. Join table admins
DELETE FROM CajaAdministradores;

-- 7. Cajas menores
DELETE FROM CajasMenores;

-- 8. AuditLogs
DELETE FROM AuditLogs;

-- 9. Usuarios de la aplicación (FK → Centrales CASCADE)
DELETE FROM UsuariosApp;

-- 10. Centrales (FK → UsuariosApp CASCADE ya se eliminaron)
DELETE FROM Centrales;

-- ---- Identity ASP.NET ----
-- 11. Relaciones usuario-rol (depende de Users y Roles)
DELETE FROM AspNetUserRoles;

-- 12. Claims de usuario
DELETE FROM AspNetUserClaims;

-- 13. Logins externos
DELETE FROM AspNetUserLogins;

-- 14. Tokens de usuario
DELETE FROM AspNetUserTokens;

-- 15. Claims de roles
DELETE FROM AspNetRoleClaims;

-- 16. Usuarios Identity
DELETE FROM AspNetUsers;

-- 17. Roles
DELETE FROM AspNetRoles;

-- Resetear identidades
DBCC CHECKIDENT ('LegalizacionRecibos', RESEED, 0);
DBCC CHECKIDENT ('Reembolsos',          RESEED, 0);
DBCC CHECKIDENT ('Legalizaciones',      RESEED, 0);
DBCC CHECKIDENT ('Avances',             RESEED, 0);
DBCC CHECKIDENT ('Arqueos',             RESEED, 0);
DBCC CHECKIDENT ('CajasMenores',        RESEED, 0);
DBCC CHECKIDENT ('AuditLogs',           RESEED, 0);
DBCC CHECKIDENT ('UsuariosApp',         RESEED, 0);
DBCC CHECKIDENT ('Centrales',           RESEED, 0);

COMMIT TRANSACTION;

PRINT 'Opción B completada: TODOS los datos eliminados, incluyendo usuarios y centrales.';
*/

-- ============================================================
-- OPCIÓN C: Resetear saldos de cajas sin borrar historial
-- Útil para iniciar un nuevo período fiscal manteniendo
-- el historial pero restableciendo Disponible = ValorApertura
-- ============================================================

/*
BEGIN TRANSACTION;

-- Restaurar saldo disponible al valor de apertura
UPDATE CajasMenores
SET Disponible  = ValorApertura,
    TotalUsado  = 0;

-- Marcar todos los avances pendientes como legalizados ficticiamente
-- (o eliminarlos si corresponde al cierre de período)
-- OPCIÓN: solo eliminar avances pendientes de períodos anteriores
DELETE FROM Avances
WHERE Estado = 0   -- EstadoAvance.Pendiente = 0
  AND FechaCreacion < DATEADD(MONTH, -1, GETUTCDATE());

COMMIT TRANSACTION;

PRINT 'Opción C completada: saldos restablecidos.';
*/

-- ============================================================
-- VERIFICACIÓN POST-LIMPIEZA
-- Ejecutar para confirmar que las tablas quedaron vacías
-- ============================================================

SELECT
    'LegalizacionRecibos' AS Tabla, COUNT(*) AS Registros FROM LegalizacionRecibos
UNION ALL SELECT 'Reembolsos',      COUNT(*) FROM Reembolsos
UNION ALL SELECT 'Legalizaciones',  COUNT(*) FROM Legalizaciones
UNION ALL SELECT 'Avances',         COUNT(*) FROM Avances
UNION ALL SELECT 'Arqueos',         COUNT(*) FROM Arqueos
UNION ALL SELECT 'CajaAdministradores', COUNT(*) FROM CajaAdministradores
UNION ALL SELECT 'CajasMenores',    COUNT(*) FROM CajasMenores
UNION ALL SELECT 'AuditLogs',       COUNT(*) FROM AuditLogs
UNION ALL SELECT 'UsuariosApp',     COUNT(*) FROM UsuariosApp
UNION ALL SELECT 'Centrales',       COUNT(*) FROM Centrales
UNION ALL SELECT 'AspNetUsers',     COUNT(*) FROM AspNetUsers
UNION ALL SELECT 'AspNetRoles',     COUNT(*) FROM AspNetRoles;

-- ============================================================
-- NOTA SOBRE ARCHIVOS FÍSICOS (uploads/)
-- Los archivos de recibos y firmas en disco NO se eliminan
-- automáticamente con este script SQL.
-- Eliminar manualmente (o mediante script de shell):
--
-- PowerShell:
--   Remove-Item -Recurse -Force ".\uploads\recibos\*"
--   Remove-Item -Recurse -Force ".\uploads\firmas\*"
--
-- Linux/macOS:
--   rm -rf uploads/recibos/* uploads/firmas/*
--
-- Solo ejecutar DESPUÉS de confirmar que el script SQL fue exitoso.
-- ============================================================
