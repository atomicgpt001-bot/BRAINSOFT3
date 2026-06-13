# Contexto Actualizado de Softres (Soft 3)
*Fecha de actualización: 13 de Junio de 2026*

## 📊 Estadísticas del Sistema (Módulo de Administración)
*   **Empresas / Registros Procesados:** 1,452 empresas activas sincronizadas en la base de datos de administración central.
*   **Eventos Pendientes:** 4
*   **Estado General del Servicio:** Completamente Operativo.

## 📐 Cambios Recientes en el Dashboard de Softres (Cliente)
1.  **Tarjetas de Módulo:**
    *   Altura actual: `88px` (óptima tras pruebas de 130px, 96px y 68px).
    *   Bordes redondeados: `10px` de radio.
2.  **Badges / Píldoras Informativas:**
    *   Reducidos un 20% (`font-size: 0.46rem`).
    *   Ubicados en la esquina inferior derecha de cada tarjeta (`position: absolute; bottom: 8px; right: 12px`).
    *   Estilo ultra-translúcido: fondo `rgba(color, 0.04)` y borde `rgba(color, 0.08)` para evitar saturación de color verde Gentelella.
3.  **Sidebar (Menú Lateral):**
    *   Pestañas activas ajustadas a un radio de `8px` (más cuadradas) en lugar de los `24px` anteriores.
    *   El borde derecho verde Gentelella se eliminó para integrarse limpiamente.

## 🛠️ Arquitectura
*   Framework: Laravel 6.20 con PHP 7.4.
*   Base de datos multitenant (MySQL/Supabase).
*   Mapeo de archivos clave:
    *   Estilos: `public/css/premium-softres.css`
    *   Vistas: `resources/views/Comercio/Panel.blade.php`
