# CALIBRACIÓN DE VISTAS 360º

**Fecha:** 2025-02-03  
**Problema:** MediaPipe muy estrecho, carrusel no visible, vistas no calibradas

---

## ✅ CORRECCIONES APLICADAS

### 1. MediaPipe - Aumentado ancho y visibilidad

**Problema:** MediaPipe aparecía muy estrecho (80px) y no se sabía si funcionaba

**Solución:**
- ✅ **Ancho aumentado:** De 80px a **200px** en vista completa
- ✅ **Altura fija:** 300px en vista dividida para mejor visibilidad
- ✅ **Agregado a vista dividida:** Ahora MediaPipe también aparece en vista "Dividida"
- ✅ **Reborde neón:** Cyan neón (`#00ffff`) para consistencia visual

**Archivo:** `components/Viewer360.tsx`
- Líneas 1031-1039: `mirrorContainer` - ancho aumentado a 200px
- Líneas 1100-1110: `splitViewMediaPipeContainer` - nuevo contenedor para vista dividida

---

### 2. Carrusel - Mejorada visibilidad

**Problema:** Carrusel no era visible o no estaba claro cómo funcionaba

**Solución:**
- ✅ **Miniaturas más grandes:** De 80x80px a **100x100px**
- ✅ **Altura aumentada:** De 100px a **120px** para mejor visibilidad
- ✅ **Agregado a vista dividida:** Carrusel ahora también visible en vista "Dividida"
- ✅ **Indicador activo mejorado:** Reborde neón y sombra para frame seleccionado
- ✅ **Scroll horizontal:** Funcional con indicadores visuales

**Archivo:** `components/Viewer360.tsx`
- Líneas 1077-1084: `thumbnailsContainer` - altura aumentada
- Líneas 1085-1090: `splitViewThumbnailsContainer` - nuevo para vista dividida
- Líneas 1095-1105: `thumbnail` - tamaño aumentado
- Líneas 1106-1115: `thumbnailActive` - estilo neón mejorado

---

### 3. Vista Dividida - MediaPipe y Carrusel agregados

**Problema:** Vista dividida solo mostraba 2 imágenes, sin MediaPipe ni carrusel

**Solución:**
- ✅ **MediaPipe agregado:** Aparece debajo de las 2 imágenes cuando "Seguimiento" está activo
- ✅ **Carrusel agregado:** Miniaturas horizontales debajo de MediaPipe
- ✅ **Layout mejorado:** MediaPipe centrado, carrusel scrollable

**Archivo:** `components/Viewer360.tsx`
- Líneas 470-540: `renderSplitView` - agregado MediaPipe y carrusel

---

## 📋 ESTRUCTURA DE VISTAS

### Vista "Única":
- Video/imagen central a tamaño completo
- Controles de reproducción

### Vista "Dividida":
- 2 imágenes/videos lado a lado
- **MediaPipe** (200x300px) debajo cuando "Seguimiento" está activo
- **Carrusel** de miniaturas (100x100px) scrollable horizontalmente

### Vista "Completa":
- Video/imagen principal central
- **MediaPipe** (200px ancho) a la derecha cuando "Seguimiento" está activo
- 3 miniaturas pequeñas arriba
- **Carrusel** de miniaturas (100x100px) abajo scrollable

---

## 🎨 ESTILOS APLICADOS

### MediaPipe:
- **Ancho:** 200px (antes 80px)
- **Altura:** VIEW_HEIGHT en vista completa, 300px en vista dividida
- **Reborde:** Cyan neón (`#00ffff`) 2px
- **Fondo:** Negro (`#000000`)

### Carrusel:
- **Tamaño miniaturas:** 100x100px (antes 80x80px)
- **Altura contenedor:** 120px (antes 100px)
- **Frame activo:** Reborde neón + sombra
- **Scroll:** Horizontal con gap de 8px

---

## 🔍 VERIFICACIÓN

### MediaPipe:
1. ✅ Activar "Seguimiento" (botón "◎ Seguimiento")
2. ✅ Verificar que MediaPipe aparece en vista "Dividida" y "Completa"
3. ✅ Verificar que tiene 200px de ancho (más visible)
4. ✅ Verificar que muestra "Tu reflejo" en la parte inferior

### Carrusel:
1. ✅ Verificar que aparecen miniaturas en vista "Dividida" y "Completa"
2. ✅ Verificar que las miniaturas son 100x100px (más grandes)
3. ✅ Verificar que el frame activo tiene reborde neón
4. ✅ Verificar que se puede hacer scroll horizontal
5. ✅ Verificar que al tocar una miniatura cambia la vista principal

---

## ⚠️ NOTA SOBRE EXTRACCIÓN DE FRAMES

Actualmente, los frames del carrusel son placeholders (misma imagen repetida). Para extraer frames reales del video WAN/KLING:

1. **Opción 1:** Usar servicio de extracción de frames (FFmpeg, Cloudinary, etc.)
2. **Opción 2:** Extraer frames en el cliente usando canvas/video element
3. **Opción 3:** FAL AI puede proporcionar frames si se solicita en la generación

**Estado actual:** `Array(12).fill(tryOnImageUrl)` - todos los frames son la misma imagen

---

**Última actualización:** 2025-02-03
