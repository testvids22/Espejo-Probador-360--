# Plan de Integración Versión 2.0 - Pestaña 360º

**Fecha:** 02/02/2026  
**Carpeta:** `rork-360-integration-v2`

---

## ✅ COMPLETADO

- ✅ Carpeta Version 2.0 creada
- ✅ Proyecto copiado desde V1.0
- ✅ Nueva pestaña "360º" agregada a `_layout.tsx`
- ✅ Archivo `tryon-360.tsx` creado (estructura básica)
- ✅ `lib/api-keys-expo.ts` creado (adaptado para Expo)
- ✅ Dependencia `@fal-ai/client` agregada a `package.json`

---

## 📋 PENDIENTE

### **1. Adaptar PhotoCapture.tsx para React Native**

**Origen:** `C:\Users\SAPad\soluciones CURSOR\smartmirror-360-pro\src\components\PhotoCapture.tsx`

**Cambios necesarios:**
- Reemplazar `framer-motion` → Animated de React Native
- Reemplazar `@capacitor/camera` → `expo-camera`
- Reemplazar `sonner` toast → Alert o componente propio
- Reemplazar `lucide-react` → `lucide-react-native`
- Adaptar MediaPipe para React Native
- Adaptar estilos CSS → StyleSheet

**Destino:** `components/PhotoCapture360.tsx`

### **2. Adaptar Viewer360.tsx para React Native**

**Origen:** `C:\Users\SAPad\soluciones CURSOR\smartmirror-360-pro\src\components\Viewer360.tsx`

**Cambios necesarios:**
- Reemplazar `framer-motion` → Animated de React Native
- Reemplazar `@fal-ai/client` (ya instalado)
- Reemplazar `sonner` toast → Alert o componente propio
- Reemplazar `lucide-react` → `lucide-react-native`
- Adaptar estilos CSS → StyleSheet
- Adaptar `getApiKeysForCapacitor()` → `getApiKeysForExpo()`

**Destino:** `components/Viewer360.tsx`

### **3. Crear tryon-360.tsx completo**

Integrar PhotoCapture360 y Viewer360 en la nueva pestaña.

### **4. Instalar dependencias adicionales**

```bash
npm install @tensorflow-models/pose-detection @tensorflow/tfjs @tensorflow/tfjs-react-native
```

(Algunas ya están instaladas, verificar)

### **5. Configurar variables de entorno en Vercel**

```
EXPO_PUBLIC_FAL_KEY = [CONFIGURAR]
EXPO_PUBLIC_REPLICATE_API_TOKEN = [CONFIGURAR]
```

---

## 🔧 ESTRUCTURA FINAL

```
rork-360-integration-v2/
├── app/
│   └── (tabs)/
│       ├── tryon-360.tsx (NUEVA)
│       └── _layout.tsx (actualizado)
├── components/
│   ├── PhotoCapture360.tsx (NUEVO - adaptado)
│   └── Viewer360.tsx (NUEVO - adaptado)
└── lib/
    └── api-keys-expo.ts (NUEVO - creado)
```

---

## 🚨 PRECAUCIONES

1. **NO tocar:** Pestaña "Espejo" existente
2. **NO tocar:** TryOn actual de RORK
3. **NO mezclar:** Con repositorio de V1.0
4. **Probar en web primero** antes de compilar APK

---

**Última actualización:** 02/02/2026
