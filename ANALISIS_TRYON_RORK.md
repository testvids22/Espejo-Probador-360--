# Análisis: TryOn en RORK

**Fecha:** 02/02/2026

---

## 🔍 CÓMO HACE TRYON RORK ACTUALMENTE

### **Estructura:**

1. **Pestaña "Espejo" (`mirror.tsx`):**
   - Vista de comparación
   - Vista 360º (2D) - rotación manual
   - Carrusel de prendas probadas
   - **NO TOCAR** - Funciona correctamente

2. **TryOn en RORK:**
   - Se hace a través de `AppContext.tsx`
   - Genera `compositeImage` (imagen compuesta)
   - A veces añade marca de agua en pie de foto (derecha)

---

## ⚠️ PROBLEMA IDENTIFICADO

**Marca de agua en TryOn:**
- Aparece en pie de foto (derecha)
- Molesta para carrusel 360º
- Molesta para videos WAN/KLING
- **Necesita limpieza antes de procesar WAN**

---

## ✅ SOLUCIÓN PROPUESTA

### **Nueva Pestaña "360º":**

1. **Crear:** `app/(tabs)/tryon-360/index.tsx`
2. **Funcionalidades:**
   - Photo Capture (MediaPipe)
   - TryOn (FASHN V1.6 - como Orchids)
   - Limpieza de marca de agua/fondo
   - WAN Generation
   - KLING Generation
   - Carrusel 360º real

3. **NO tocar:**
   - Pestaña "Espejo" existente
   - TryOn existente en RORK
   - Vista de comparación
   - Carrusel 2D existente

---

## 🔧 LIMPIEZA DE MARCA DE AGUA

### **Antes de procesar WAN:**

1. **Detectar marca de agua:**
   - Buscar en pie de foto (derecha)
   - Detectar texto/branding
   - Detectar fondo no deseado

2. **Limpiar:**
   - Recortar área de marca de agua
   - Inpaint (rellenar con IA)
   - O recortar imagen

3. **Procesar:**
   - WAN con imagen limpia
   - KLING con imagen limpia
   - Carrusel sin marca de agua

---

## 📋 PLAN DE IMPLEMENTACIÓN

### **PASO 1: Crear Nueva Pestaña**

- Crear: `app/(tabs)/tryon-360/index.tsx`
- Agregar a `_layout.tsx` (nueva pestaña)
- Icono: RotateCw o similar

### **PASO 2: Copiar Componentes de Orchids**

- `PhotoCapture.tsx` → `components/PhotoCapture360.tsx`
- `Viewer360.tsx` → `components/Viewer360.tsx`
- Adaptar imports

### **PASO 3: Implementar Limpieza**

- Función: `cleanWatermark(imageUrl)`
- Detectar y eliminar marca de agua
- Aplicar antes de WAN/KLING

### **PASO 4: Integrar APIs**

- TryOn: FASHN V1.6 (como Orchids)
- WAN: wan-i2v
- KLING: kling-video/v2.6/pro

---

**Última actualización:** 02/02/2026
