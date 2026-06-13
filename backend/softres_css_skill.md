# 🎨 SKILL: CAMBIOS DE ESTILOS EN EL DASHBOARD SOFTRES

## Archivos Clave
- **`public/css/premium-softres.css`** — hoja de estilos principal (fuente de verdad)
- **`resources/views/Comercio/Panel.blade.php`** — tiene estilos inline `<style>` que deben SIEMPRE estar sincronizados con el CSS externo

> ⚠️ REGLA CRÍTICA: Cada vez que cambies un estilo en `premium-softres.css`, debes replicar el mismo cambio en el bloque `<style>` de `Panel.blade.php`. Si no, habrá inconsistencias.

---

## 📐 Tamaños Actuales de las Tarjetas de Módulo (aprobados por el cliente)

### Dimensiones de la Tarjeta (`.module-card-premium`)
```css
height: 88px !important;
min-height: 88px !important;
border-radius: 10px !important;
```

### Grid del Panel (`#panel-grid`)
```css
grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
gap: 13px !important;
```

### Lado Icono (`.card-accent-side`)
```css
width: 54px !important;
min-width: 54px !important;
font-size: 1.4rem !important;
```

### Cuerpo de la Tarjeta (`.card-body-side`)
```css
padding: 8px 12px !important;
```

### Título del Módulo (`.card-title-side`) — TEXTO GRANDE
```css
font-size: 0.92rem !important;  /* NO tocar sin permiso explícito */
font-weight: 700 !important;
```

### Categoría del Módulo (`.card-category-side`) — texto secundario
```css
font-size: 0.62rem !important;  /* NO tocar sin permiso explícito */
font-weight: 700 !important;
```

---

## 💊 Badges / Píldoras Informativas (`.card-badge-side`) — APROBADOS

```css
/* Tamaño aprobado: -20% del original */
font-size: 0.46rem !important;
font-weight: 700 !important;
padding: 1px 5px !important;
border-radius: 20px !important;

/* Posición: esquina inferior derecha de la tarjeta */
position: absolute !important;
bottom: 8px !important;
right: 12px !important;
```

### Colores por tipo de badge:
```css
/* Azul — datos generales */
.card-badge-side.bg-blue-side {
    background: rgba(37, 99, 235, 0.04) !important;
    color: #1e40af !important;
    border: 1px solid rgba(37, 99, 235, 0.08) !important;
}

/* Verde — estado OK */
.card-badge-side.bg-green-side {
    background: rgba(22, 163, 74, 0.04) !important;
    color: #166534 !important;
    border: 1px solid rgba(22, 163, 74, 0.08) !important;
}

/* Ámbar — alertas/pendientes */
.card-badge-side.bg-yellow-side {
    background: rgba(217, 119, 6, 0.04) !important;
    color: #92400e !important;
    border: 1px solid rgba(217, 119, 6, 0.08) !important;
}

/* Rojo — bajas/crítico */
.card-badge-side.bg-red-side {
    background: rgba(220, 38, 38, 0.04) !important;
    color: #991b1b !important;
    border: 1px solid rgba(220, 38, 38, 0.08) !important;
}
```

---

## 🔧 Sidebar Activo (`.nav.side-menu > li.active`)

```css
/* Tab activo — forma cuadrada moderada */
background: #f8fafc !important;
border-radius: 8px 0 0 8px;          /* 8px, no más redondo */
border-right: none !important;        /* ← anula el verde de Gentelella */
border: none !important;
position: relative;

/* Pseudoelementos de esquina inversa */
/* ::before → arriba-derecha (top: -8px, box-shadow: 4px 4px 0 4px #f8fafc) */
/* ::after  → abajo-derecha (bottom: -8px, box-shadow: 4px -4px 0 4px #f8fafc) */
```

---

## 📋 Procedimiento para Ajustar Tamaños

### Si el usuario pide cambiar el tamaño de los BADGES (píldoras):
1. Tomar el tamaño base actual: `0.46rem`
2. Aplicar el porcentaje pedido: `0.46 × (1 ± %)` 
3. Cambiar `font-size` en **ambos** archivos
4. Ajustar `padding` proporcionalmente
5. Hacer `git add`, `git commit`, `git push origin main`

### Si el usuario pide cambiar el tamaño de las TARJETAS:
1. Ajustar `height` y `min-height` en `.module-card-premium`
2. Ajustar `minmax(Xpx, 1fr)` en el grid si es necesario
3. Ajustar `width` de `.card-accent-side` proporcionalmente
4. Cambiar en **ambos** archivos + sincronizar
5. Hacer commit y push

### Historial de tamaños de tarjeta (para referencia):
| Altura | Estado |
|--------|--------|
| 130px  | Demasiado grande ❌ |
| 96px   | Grande ❌ |
| 68px   | Demasiado pequeño ❌ |
| **88px** | **APROBADO ✅** |

---

## 🚀 Flujo de Deploy

```bash
# Desde C:\Users\SANTIAGO\.gemini\antigravity\scratch\softres
git add public/css/premium-softres.css resources/views/Comercio/Panel.blade.php
git commit -m "Design: descripción del cambio"
git push origin main
# El servidor del cliente hace pull automático desde GitHub
# El cliente debe hacer Ctrl+F5 para limpiar caché del navegador
```
