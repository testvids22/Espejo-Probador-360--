# Plan: Boot con Video y Screensaver

**Fecha:** 02/02/2026

---

## 🎯 REQUISITOS

1. **Boot real al inicio de la app**
   - Video de 6 segundos
   - 3.7MB con sonido
   - Se reproduce automáticamente al iniciar

2. **Screensaver cuando pantalla en reposo**
   - Mismo video se reproduce cuando la pantalla está inactiva
   - Detectar inactividad del usuario
   - Reproducir video en loop o una vez

---

## 📋 ESPECIFICACIONES TÉCNICAS

### **Video:**
- **Duración:** 6 segundos
- **Tamaño:** 3.7MB
- **Audio:** Con sonido
- **Formato:** MP4 recomendado (compatible con expo-av)

### **Ubicación:**
- `assets/videos/boot-video.mp4`
- O en carpeta `public/videos/` si es web

---

## 🔧 IMPLEMENTACIÓN

### **PASO 1: Preparar Video**

1. **Crear carpeta:** `assets/videos/`
2. **Colocar video:** `boot-video.mp4` (6 seg, 3.7MB, con audio)
3. **Verificar formato:** MP4 con codec H.264 (compatible Android/iOS)

### **PASO 2: Crear Componente BootVideo**

**Archivo:** `components/BootVideo.tsx`

**Funcionalidades:**
- Reproducir video automáticamente
- Mostrar durante 6 segundos
- Ocultar después de reproducir
- Con sonido habilitado

### **PASO 3: Integrar en Boot Screen**

**Archivo:** `app/index.tsx`

**Cambios:**
- Reemplazar animación actual con componente BootVideo
- Reproducir video al iniciar
- Redirigir después de que termine el video

### **PASO 4: Implementar Screensaver**

**Archivo:** `app/index.tsx` o componente separado

**Lógica:**
- Detectar inactividad (sin toques/gestos por X segundos)
- Mostrar video cuando detecta inactividad
- Ocultar cuando usuario interactúa

---

## 📁 ESTRUCTURA

```
assets/
  videos/
    boot-video.mp4 (6 seg, 3.7MB, con audio)

components/
  BootVideo.tsx (nuevo)

app/
  index.tsx (modificar)
```

---

## 🔧 CÓDIGO EJEMPLO

### **BootVideo.tsx:**

```typescript
import { Video, ResizeMode } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';

export function BootVideo({ onFinish }: { onFinish: () => void }) {
  const videoRef = useRef<Video>(null);
  const [showVideo, setShowVideo] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playAsync();
    }
  }, []);

  return (
    <View style={styles.container}>
      {showVideo && (
        <Video
          ref={videoRef}
          source={require('@/assets/videos/boot-video.mp4')}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          volume={1.0}
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded && status.didJustFinish) {
              setShowVideo(false);
              onFinish();
            }
          }}
        />
      )}
    </View>
  );
}
```

### **Screensaver:**

```typescript
// Detectar inactividad
const [isIdle, setIsIdle] = useState(false);
const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  const resetTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    setIsIdle(false);
    inactivityTimer.current = setTimeout(() => {
      setIsIdle(true); // Mostrar video después de X segundos de inactividad
    }, 30000); // 30 segundos de inactividad
  };

  // Resetear timer en cualquier interacción
  const events = ['touchstart', 'mousemove', 'keydown'];
  events.forEach(event => {
    document.addEventListener(event, resetTimer);
  });

  return () => {
    events.forEach(event => {
      document.removeEventListener(event, resetTimer);
    });
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
  };
}, []);
```

---

## ✅ CHECKLIST

- [ ] Preparar video (6 seg, 3.7MB, con audio)
- [ ] Crear carpeta `assets/videos/`
- [ ] Crear componente `BootVideo.tsx`
- [ ] Integrar en `app/index.tsx` (boot inicial)
- [ ] Implementar detección de inactividad
- [ ] Integrar screensaver con video
- [ ] Probar reproducción con sonido
- [ ] Probar en web
- [ ] Probar en Android

---

## 🚨 CONSIDERACIONES

1. **Tamaño del video:** 3.7MB puede ser grande para carga inicial
   - Considerar compresión adicional si es necesario
   - O cargar de forma asíncrona

2. **Sonido:**
   - Verificar que expo-av reproduce audio correctamente
   - En Android, puede requerir permisos de audio

3. **Performance:**
   - Video debe cargar rápido
   - No bloquear inicio de la app

---

**Última actualización:** 02/02/2026
