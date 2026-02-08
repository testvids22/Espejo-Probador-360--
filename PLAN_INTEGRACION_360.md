# Plan de Integración 360º en RORK

**Fecha:** 02/02/2026  
**Proyecto:** RORK con funcionalidades 360º de Orchids

---

## 🎯 OBJETIVO

Integrar funcionalidades 360º de Orchids en RORK como una nueva pestaña, sin tocar:
- ❌ Proyecto original: `C:\Users\SAPad\Smart-Mirror-GV360`
- ❌ Web funcionando: https://smart-mirror-gv-360.vercel.app/

---

## 📋 FUNCIONALIDADES A INTEGRAR

### **Desde Orchids:**

1. **TryOn (FASHN V1.6)**
   - Aplicar prenda virtual
   - Modelo: `fal-ai/fashn/tryon/v1.6`
   - Prompt completo

2. **WAN (Fashion Spin)**
   - Giro 360º con efecto vuelo
   - Modelo: `fal-ai/wan-i2v`
   - 81 frames, 9:16

3. **KLING (Video Técnico 360º)**
   - Rotación técnica
   - Modelo: `fal-ai/kling-video/v2.6/pro/image-to-video`
   - 5 segundos, 9:16

4. **MediaPipe Tracking**
   - Seguimiento en tiempo real
   - Detección de pose
   - Rotación automática del carrusel

5. **Carrusel 360º**
   - Extracción de frames
   - 12 vistas del giro
   - Navegación interactiva

---

## 🏗️ ESTRUCTURA DE INTEGRACIÓN

### **Nueva Pestaña en RORK:**

```
RORK App
├── Home (existente)
├── Scanner (existente)
├── Catalog (existente)
├── Profile (existente)
├── Mirror (existente)
├── Size Detector (existente)
└── TryOn 360º (NUEVA) ← Funcionalidades de Orchids
    ├── Photo Capture (MediaPipe)
    ├── TryOn (FASHN V1.6)
    ├── WAN Generation
    ├── KLING Generation
    ├── Carrusel 360º
    └── Viewer 360º
```

---

## 📁 ARCHIVOS A COPIAR DE ORCHIDS

### **Componentes:**

1. `PhotoCapture.tsx` - Captura con MediaPipe
2. `Viewer360.tsx` - Visualizador 360º completo
3. `VoiceAssistant.tsx` - Asistente de voz (si se necesita)

### **Librerías:**

1. `api-keys-capacitor.ts` - Gestión de API keys
2. `image-preprocessing.ts` - Preprocesamiento de imágenes
3. `voice-service-android.ts` - Text-to-Speech Android

### **Configuración:**

1. API Keys (variables de entorno Vercel)
2. Permisos Android (cámara, micrófono)
3. Dependencias (package.json)

---

## 🔧 PASOS DE INTEGRACIÓN

### **PASO 1: Preparar Estructura**

1. Crear carpeta: `app/(tabs)/tryon-360`
2. Crear archivo: `app/(tabs)/tryon-360/index.tsx`
3. Agregar a navegación de tabs

### **PASO 2: Copiar Componentes**

1. Copiar `PhotoCapture.tsx` → `components/PhotoCapture360.tsx`
2. Copiar `Viewer360.tsx` → `components/Viewer360.tsx`
3. Adaptar imports y rutas

### **PASO 3: Integrar APIs**

1. Crear `lib/fal-api.ts` (llamadas a FAL AI)
2. Configurar API keys (variables de entorno)
3. Implementar endpoints

### **PASO 4: Configurar MediaPipe**

1. Instalar dependencias
2. Configurar permisos Android
3. Integrar tracking

### **PASO 5: Agregar a Navegación**

1. Agregar tab en `app/(tabs)/_layout.tsx`
2. Agregar icono
3. Configurar ruta

---

## 🔐 API KEYS

### **Configuración en Vercel:**

```
NEXT_PUBLIC_FAL_KEY = [CONFIGURAR_EN_VERCEL]
NEXT_PUBLIC_REPLICATE_API_TOKEN = [CONFIGURAR_EN_VERCEL]
```

### **En Código:**

- Usar `process.env.NEXT_PUBLIC_FAL_KEY`
- Nunca hardcodear keys
- Leer de variables de entorno

---

## 📊 DEPENDENCIAS NECESARIAS

### **Agregar a package.json:**

```json
{
  "@fal-ai/client": "^latest",
  "@mediapipe/pose": "^latest",
  "@tensorflow/tfjs": "^latest",
  "@tensorflow/tfjs-react-native": "^latest"
}
```

---

## ✅ CHECKLIST

- [ ] Proyecto copiado a `soluciones CURSOR`
- [ ] Repositorio GitHub creado (nuevo, sin mezclar)
- [ ] Estructura de pestaña creada
- [ ] Componentes copiados y adaptados
- [ ] APIs integradas
- [ ] MediaPipe configurado
- [ ] Navegación actualizada
- [ ] Variables de entorno configuradas
- [ ] Desplegado en Vercel
- [ ] Probado y funcionando

---

## 🚨 PRECAUCIONES

1. **NO tocar proyecto original** en `Smart-Mirror-GV360`
2. **NO tocar web funcionando** en Vercel
3. **NO mezclar repositorios** de RORK en GitHub
4. **Usar nuevo repositorio** para esta integración
5. **Probar en copia** antes de cualquier cambio

---

**Última actualización:** 02/02/2026
