# PLAN DE ADAPTACIÓN: FUNCIONALIDAD ORCHIDS → RORK

**Fecha:** 2025-02-03  
**Problemas a resolver:**
1. WAN tarda 38 segundos pero más de 2 minutos en aparecer
2. KLING se genera en 68 segundos pero no extrae frames del carrusel
3. MediaPipe no tiene puntos de seguimiento y no funciona en tiempo real
4. El seguimiento debería actuar en grados sobre el video KLING

---

## 🔧 CAMBIOS NECESARIOS

### 1. Extracción de Frames del Video KLING

**Problema:** Los frames no se extraen automáticamente cuando KLING está listo

**Solución:**
- ✅ Mejorar `extractFramesFromVideo` para usar el mismo método de Orchids
- ✅ Llamar automáticamente cuando `klingUrl` está disponible
- ✅ Verificar si el frame 0 está en negro y reemplazarlo con TryOn image

**Archivo:** `components/Viewer360.tsx`
- Líneas 318-395: Función `extractFramesFromVideo` (ya existe pero necesita mejoras)
- Líneas 124-131: Llamar automáticamente cuando hay `klingUrl`

---

### 2. MediaPipe Tracking en Tiempo Real

**Problema:** MediaPipe no muestra puntos de seguimiento y no funciona

**Solución:**
- ⚠️ **Para Web:** Instalar `@mediapipe/tasks-vision` y usar el mismo código de Orchids
- ⚠️ **Para Native:** Usar `@tensorflow-models/pose-detection` que ya está instalado
- ✅ Implementar detección de landmarks (hombros, caderas, nariz)
- ✅ Calcular ángulo basado en posición del cuerpo
- ✅ Convertir ángulo a frame del carrusel (0-11)
- ✅ Dibujar puntos de seguimiento en canvas (web) o View (native)

**Archivo:** `components/Viewer360.tsx`
- Agregar inicialización de MediaPipe/TensorFlow
- Agregar loop de detección con `requestAnimationFrame`
- Agregar canvas/View para mostrar puntos de seguimiento

---

### 3. Sincronización de Videos

**Problema:** WAN tarda 38 segundos pero más de 2 minutos en aparecer

**Solución:**
- ✅ Mostrar videos inmediatamente cuando están listos (sin delay)
- ✅ Actualizar estado cuando `fashionSpinUrl` o `klingVideoUrl` cambian
- ✅ Verificar que `useEffect` se ejecuta cuando las URLs cambian

**Archivo:** `components/Viewer360.tsx`
- Líneas 76-148: `useEffect` que maneja `view360Data`
- Verificar que se actualiza cuando `fashionSpinUrl` o `klingVideoUrl` cambian

---

### 4. Carrusel con Vistas Frontal, Lateral, Trasera

**Problema:** No se ven las vistas del carrusel claramente

**Solución:**
- ✅ Mostrar etiquetas de vista (Frontal, Lateral, Trasera)
- ✅ Mostrar ángulo actual en grados
- ✅ Navegación rápida a vistas específicas (botones)

**Archivo:** `components/Viewer360.tsx`
- Agregar etiquetas de vista basadas en `currentFrame`
- Agregar botones para ir a vistas específicas

---

## 📋 IMPLEMENTACIÓN PASO A PASO

### Paso 1: Mejorar Extracción de Frames
1. Copiar función `extractFramesFromVideo` de Orchids
2. Adaptar para React Native (usar `expo-video` si es necesario)
3. Llamar automáticamente cuando `klingUrl` está disponible
4. Verificar frame 0 en negro y reemplazar

### Paso 2: Implementar MediaPipe/TensorFlow Tracking
1. **Para Web:**
   - Instalar `@mediapipe/tasks-vision`
   - Copiar código de inicialización de Orchids
   - Implementar loop de detección
   - Dibujar puntos en canvas

2. **Para Native:**
   - Usar `@tensorflow-models/pose-detection` (ya instalado)
   - Adaptar código de detección
   - Mostrar puntos en View con círculos

### Paso 3: Sincronizar Videos
1. Verificar que `useEffect` se ejecuta cuando URLs cambian
2. Mostrar videos inmediatamente cuando están listos
3. Actualizar estado correctamente

### Paso 4: Mejorar UI del Carrusel
1. Agregar etiquetas de vista
2. Agregar botones de navegación rápida
3. Mostrar ángulo actual en grados

---

**Última actualización:** 2025-02-03
