# ANÁLISIS: CÓMO FUNCIONA VIEWER360 EN ORCHIDS

**Fecha:** 2025-02-03  
**Objetivo:** Adaptar la funcionalidad de MediaPipe tracking y extracción de frames de Orchids a RORK

---

## 🔍 FUNCIONALIDADES CLAVE EN ORCHIDS

### 1. MediaPipe Tracking en Tiempo Real

**Librería:** `@mediapipe/tasks-vision`

**Inicialización:**
```typescript
const { PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
const vision = await FilesetResolver.forVisionTasks(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
);

poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    delegate: "GPU"
  },
  runningMode: "VIDEO",
  numPoses: 1,
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
```

**Detección de Puntos Clave:**
- **Hombros:** landmarks[11] (izquierdo), landmarks[12] (derecho)
- **Caderas:** landmarks[23] (izquierda), landmarks[24] (derecha)
- **Nariz:** landmarks[0]

**Cálculo de Ángulo:**
```typescript
const leftShoulder = landmarks[11];
const rightShoulder = landmarks[12];
const leftHip = landmarks[23];
const rightHip = landmarks[24];
const nose = landmarks[0];

// Calcular ancho del cuerpo
const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
const hipWidth = Math.abs(rightHip.x - leftHip.x);
const currentWidth = (shoulderWidth + hipWidth) / 2;

// Detectar si está de espalda (nariz no visible)
const noseVisibility = nose ? (nose.visibility || 0) : 0;
if (noseVisibility < 0.25) {
  targetAngle = 180; // Espalda
} else {
  // Calcular ángulo basado en ancho y posición
  const normalizedWidth = Math.max(0, Math.min(1, (currentWidth - minW) / (maxW - minW)));
  const baseAngle = (1 - normalizedWidth) * 90;
  targetAngle = leftSideCloser ? baseAngle : 360 - baseAngle;
}

// Suavizar el ángulo
const smoothingFactor = 0.85;
smoothedAngleRef.current = smoothedAngleRef.current * smoothingFactor + targetAngle * (1 - smoothingFactor);
const finalAngle = (smoothedAngleRef.current + 360) % 360;

// Convertir ángulo a frame del carrusel (0-11)
const frameIdx = Math.floor((finalAngle / 360) * TOTAL_FRAMES) % TOTAL_FRAMES;
setCurrentFrame(frameIdx);
```

**Visualización de Puntos:**
```typescript
// Dibujar puntos en canvas
ctx.strokeStyle = '#22c55e'; // Verde
ctx.fillStyle = '#22c55e';
ctx.lineWidth = 4;

// Dibujar puntos en hombros y caderas
[leftShoulder, rightShoulder, leftHip, rightHip].forEach(p => {
  if (p && (p.visibility || 0) > 0.5) {
    ctx.beginPath();
    ctx.arc((1-p.x) * canvas.width, p.y * canvas.height, 6, 0, 2 * Math.PI);
    ctx.fill();
  }
});

// Dibujar líneas conectando puntos
ctx.beginPath();
ctx.moveTo((1-leftShoulder.x) * canvas.width, leftShoulder.y * canvas.height);
ctx.lineTo((1-rightShoulder.x) * canvas.width, rightShoulder.y * canvas.height);
ctx.lineTo((1-rightHip.x) * canvas.width, rightHip.y * canvas.height);
ctx.lineTo((1-leftHip.x) * canvas.width, leftHip.y * canvas.height);
ctx.closePath();
ctx.stroke();
```

---

### 2. Extracción de Frames del Video KLING

**Función:** `extractFramesFromVideo` (en `image-preprocessing.ts`)

**Proceso:**
1. Crear elemento `<video>` con `crossOrigin: 'anonymous'`
2. Esperar `onloadedmetadata` para obtener duración
3. Calcular intervalo: `duration / frameCount` (12 frames)
4. Crear canvas con dimensiones del video
5. Extraer primer frame inmediatamente (`currentTime = 0`)
6. Para cada frame restante:
   - Establecer `video.currentTime = i * interval`
   - Esperar evento `seeked`
   - Dibujar frame en canvas: `ctx.drawImage(video, 0, 0)`
   - Convertir a data URL: `canvas.toDataURL('image/jpeg', 0.8)`

**Código:**
```typescript
export async function extractFramesFromVideo(
  videoUrl: string,
  frameCount: number = 12
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    const frames: string[] = [];
    
    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const interval = duration / frameCount;
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Pre-capture the first frame immediately
      ctx.drawImage(video, 0, 0);
      frames.push(canvas.toDataURL('image/jpeg', 0.8));

      const captureFrame = (time: number): Promise<string> => {
        return new Promise((res) => {
          video.currentTime = time;
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            ctx.drawImage(video, 0, 0);
            res(canvas.toDataURL('image/jpeg', 0.8));
          };
          video.addEventListener('seeked', onSeeked);
        });
      };

      try {
        // Start from second frame (i=1) as we already got i=0
        for (let i = 1; i < frameCount; i++) {
          const time = i * interval;
          const frame = await captureFrame(time);
          frames.push(frame);
        }
        resolve(frames);
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = (e) => reject(new Error('Failed to load video: ' + e));
    video.src = videoUrl;
    video.load();
  });
}
```

**Uso en Viewer360:**
```typescript
const extractFramesFromVideoLocal = useCallback(async (videoUrl: string) => {
  try {
    setProcessingStep('Extrayendo vistas del video...');
    const frames = await extractFramesFromVideo(videoUrl, 12);
    
    // Verificar si el frame 0 está en negro
    if (frames[0] && aiTryOnImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let totalBrightness = 0;
            for (let i = 0; i < data.length; i += 4) {
              totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
            }
            const avgBrightness = totalBrightness / (data.length / 4);
            // Si el brillo promedio es menor a 30, está en negro
            if (avgBrightness < 30) {
              frames[0] = aiTryOnImage; // Reemplazar con imagen TryOn
            }
          }
          resolve(null);
        };
        img.onerror = reject;
        img.src = frames[0];
      });
    }
    
    setCarouselFrames(frames);
    setCompositeImages(frames);
    onFramesCached?.(frames);
  } catch (error) {
    console.error('Error extracting frames:', error);
  }
}, [onFramesCached, aiTryOnImage]);
```

---

### 3. Carrusel con 12 Frames

**Estructura:**
- **TOTAL_FRAMES = 12**
- Cada frame corresponde a 30 grados (360/12)
- Frame 0 = 0° (Frontal)
- Frame 3 = 90° (Lateral)
- Frame 6 = 180° (Trasera)
- Frame 9 = 270° (Lateral opuesto)

**Conversión Ángulo → Frame:**
```typescript
const rotation = (currentFrame / TOTAL_FRAMES) * 360;
const frameIdx = Math.floor((finalAngle / 360) * TOTAL_FRAMES) % TOTAL_FRAMES;
```

**Etiquetas de Vista:**
```typescript
const currentViewLabel = rotation < 15 || rotation >= 345 ? 'Frontal' : 
                         rotation >= 15 && rotation < 105 ? 'Lateral Der.' :
                         rotation >= 105 && rotation < 255 ? 'Trasera' : 'Lateral Izq.';
```

---

### 4. Sincronización de Videos

**Problema reportado:** WAN tarda 38 segundos pero más de 2 minutos en aparecer

**En Orchids:**
- WAN se genera primero
- Cuando WAN está listo, se inicia KLING automáticamente
- Ambos videos se muestran cuando están listos
- Hay un delay de 15 segundos antes de mostrar el panel secundario

**Código:**
```typescript
if (data.success && data.videoUrl) {
  setFashionSpinUrl(data.videoUrl);
  setActiveVideoSource('wan');
  setWanProgress(100);
  toast.success('Giro Fashion WAN 2.1 listo');
  if (tryOnImageUrl) {
    generateKling360(tryOnImageUrl); // Iniciar KLING después de WAN
  }
}
```

---

## 🎯 ADAPTACIÓN A RORK

### Cambios Necesarios:

1. **Instalar MediaPipe:**
   ```bash
   npm install @mediapipe/tasks-vision
   ```

2. **Implementar Tracking:**
   - Inicializar `PoseLandmarker` en `Viewer360.tsx`
   - Crear canvas para dibujar puntos de seguimiento
   - Implementar loop de detección con `requestAnimationFrame`
   - Convertir ángulo a frame del carrusel

3. **Mejorar Extracción de Frames:**
   - Usar la función `extractFramesFromVideo` de Orchids
   - Verificar frame 0 en negro y reemplazar con TryOn image
   - Llamar automáticamente cuando KLING está listo

4. **Sincronización:**
   - Mostrar videos inmediatamente cuando están listos (sin delay de 15 segundos)
   - Extraer frames automáticamente cuando KLING está listo

5. **Visualización:**
   - Mostrar puntos de seguimiento en canvas overlay
   - Mostrar ángulo actual en grados
   - Mostrar etiqueta de vista (Frontal, Lateral, Trasera)

---

**Última actualización:** 2025-02-03
