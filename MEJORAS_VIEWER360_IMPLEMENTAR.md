# MEJORAS A IMPLEMENTAR EN VIEWER360

**Fecha:** 2025-02-03

---

## 1. MEJORAR EXTRACCIÓN DE FRAMES (Líneas 322-405)

**Cambios:**
- Verificar si el frame 0 está en negro y reemplazarlo con TryOn image
- Mejorar el manejo de errores
- Usar el mismo método de Orchids (muted, playsInline, mejor manejo de seeked)

**Código a reemplazar:**
```typescript
const extractFramesFromVideo = useCallback(async (videoUrl: string) => {
  try {
    const TOTAL_FRAMES = 12;
    toast.info('Extrayendo frames del video para carrusel...');
    
    console.log('[Viewer360] Extrayendo frames de:', videoUrl);
    
    // En web, usar canvas para extraer frames del video (método de Orchids)
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true; // Agregado
      video.playsInline = true; // Agregado
      video.src = videoUrl;
      
      const frames: string[] = [];
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = async () => {
          const duration = video.duration;
          const interval = duration / TOTAL_FRAMES;
          
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Pre-capture the first frame immediately (método de Orchids)
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
            for (let i = 1; i < TOTAL_FRAMES; i++) {
              const time = i * interval;
              const frame = await captureFrame(time);
              frames.push(frame);
            }
            
            // Verificar si el frame 0 está en negro (método de Orchids)
            if (frames[0] && tryOnImageUrl) {
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
                      frames[0] = tryOnImageUrl; // Reemplazar con imagen TryOn
                      console.log('[Viewer360] Frame 0 estaba en negro, reemplazado con TryOn image');
                    }
                  }
                  resolve(null);
                };
                img.onerror = reject;
                img.src = frames[0];
              });
            }
            
            console.log('[Viewer360] ✅ Frames extraídos:', frames.length);
            setCarouselFrames(frames);
            setIsAutoRotating(true);
            toast.success(`Carrusel 360º listo con ${frames.length} frames`);
            resolve(null);
          } catch (err) {
            reject(err);
          }
        };
        video.onerror = (e) => reject(new Error('Failed to load video: ' + e));
        video.load();
      });
      
      // Anuncio por voz (solo en móvil)
      if (Platform.OS !== 'web') {
        Speech.speak('¡Perfecto! Ya puedes navegar por el carrusel y ver cómo te queda desde cada ángulo. Activa el seguimiento para que la prenda gire siguiendo tu reflejo en la pantalla.', {
          language: 'es-ES',
          rate: 0.9,
        });
      }
    } else {
      // En native, usar frames sintéticos por ahora (se puede mejorar con expo-video)
      console.log('[Viewer360] ⚠️ Extracción de frames en native no implementada, usando placeholders');
      const frames: string[] = [];
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        frames.push(tryOnImageUrl);
      }
      setCarouselFrames(frames);
      setIsAutoRotating(true);
      toast.success('Carrusel 360º listo (modo placeholder)');
    }
  } catch (error: any) {
    console.error('[Frames] Error:', error);
    toast.error('Error al extraer frames');
    // Fallback: usar frames placeholder
    const frames: string[] = [];
    for (let i = 0; i < 12; i++) {
      frames.push(tryOnImageUrl);
    }
    setCarouselFrames(frames);
    if (Platform.OS !== 'web') {
      Speech.speak('Hubo un problema al preparar el carrusel. Intenta de nuevo más tarde.', {
        language: 'es-ES',
        rate: 0.9,
      });
    }
  }
}, [tryOnImageUrl]);
```

---

## 2. IMPLEMENTAR MEDIAPIPE TRACKING (Líneas 172-187)

**Cambios:**
- Reemplazar placeholder con implementación completa de MediaPipe
- Agregar detección de landmarks
- Calcular ángulo y convertir a frame
- Dibujar puntos de seguimiento en canvas

**Código a agregar al inicio del componente (después de los refs):**
```typescript
// MediaPipe tracking refs
const webcamRef = useRef<HTMLVideoElement | null>(null);
const trackingCanvasRef = useRef<HTMLCanvasElement | null>(null);
const poseLandmarkerRef = useRef<any>(null);
const trackingAnimationRef = useRef<number | undefined>(undefined);
const smoothedAngleRef = useRef(0);
const [poseReady, setPoseReady] = useState(false);
const [showAngles, setShowAngles] = useState(true);
```

**Código a reemplazar (líneas 172-187):**
```typescript
// Seguimiento en tiempo real con MediaPipe
const initTracking = useCallback(async () => {
  if (poseLandmarkerRef.current) {
    console.log("[Viewer360] MediaPipe ya inicializado");
    return;
  }
  
  if (Platform.OS !== 'web') {
    console.log("[Viewer360] MediaPipe solo disponible en web");
    return;
  }
  
  try {
    console.log("[Viewer360] Initializing MediaPipe Tracking...");
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

    setPoseReady(true);
    console.log("[Viewer360] MediaPipe Ready");
  } catch (error: any) {
    console.error("Error initializing MediaPipe:", error);
    toast.error(`Error al iniciar seguimiento: ${error.message || 'Error desconocido'}`);
    setPoseReady(false);
    setIsTracking(false);
  }
}, []);

const startTracking = useCallback(() => {
  if (trackingAnimationRef.current) return;

  const detect = async () => {
    if (!isTracking) {
      trackingAnimationRef.current = undefined;
      return;
    }

    if (!webcamRef.current || !poseLandmarkerRef.current || !trackingCanvasRef.current) {
      trackingAnimationRef.current = requestAnimationFrame(detect);
      return;
    }

    const video = webcamRef.current;
    const canvas = trackingCanvasRef.current;

    if (video.readyState < 2 || !canvas) {
      trackingAnimationRef.current = requestAnimationFrame(detect);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      trackingAnimationRef.current = requestAnimationFrame(detect);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const timestamp = performance.now();
      const results = poseLandmarkerRef.current.detectForVideo(video, timestamp);
      
      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const nose = landmarks[0];
        
        if (leftShoulder && rightShoulder && leftHip && rightHip) {
          const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
          const hipWidth = Math.abs(rightHip.x - leftHip.x);
          const currentWidth = (shoulderWidth + hipWidth) / 2;
          
          // Track max width seen to normalize better
          if (typeof window !== 'undefined' && !(window as any).maxBodyWidth || currentWidth > (window as any).maxBodyWidth) {
            (window as any).maxBodyWidth = currentWidth;
          }
          
          const minW = (typeof window !== 'undefined' && (window as any).maxBodyWidth) ? (window as any).maxBodyWidth * 0.25 : 0.04;
          const maxW = (typeof window !== 'undefined' && (window as any).maxBodyWidth) ? (window as any).maxBodyWidth : 0.18;
          
          const leftSideCloser = (leftShoulder.z + leftHip.z) / 2 < (rightShoulder.z + rightHip.z) / 2;
          const noseVisibility = nose ? (nose.visibility || 0) : 0;
          
          let targetAngle = 0;
          
          if (noseVisibility < 0.25) { // Más umbral para detectar espalda
            targetAngle = 180;
          } else {
            // Normalización más dinámica
            const normalizedWidth = Math.max(0, Math.min(1, (currentWidth - minW) / (maxW - minW)));
            const baseAngle = (1 - normalizedWidth) * 90;
            targetAngle = leftSideCloser ? baseAngle : 360 - baseAngle;
          }

          const smoothingFactor = 0.85; // Más responsivo
          if (isNaN(smoothedAngleRef.current)) smoothedAngleRef.current = 0;
          smoothedAngleRef.current = smoothedAngleRef.current * smoothingFactor + targetAngle * (1 - smoothingFactor);
          
          const finalAngle = (smoothedAngleRef.current + 360) % 360;
          const frameIdx = Math.floor((finalAngle / 360) * TOTAL_FRAMES) % TOTAL_FRAMES;
          
          setCurrentFrame(frameIdx);
          setTrackingAngle(finalAngle);
          
          // Dibujar puntos de seguimiento
          if (showAngles) {
            ctx.strokeStyle = '#00ffff'; // Cyan neón (como el estilo de RORK)
            ctx.fillStyle = '#00ffff';
            ctx.lineWidth = 4;
            
            [leftShoulder, rightShoulder, leftHip, rightHip].forEach(p => {
              if (p && (p.visibility || 0) > 0.5) {
                ctx.beginPath();
                ctx.arc((1-p.x) * canvas.width, p.y * canvas.height, 6, 0, 2 * Math.PI);
                ctx.fill();
              }
            });

            ctx.beginPath();
            ctx.moveTo((1-leftShoulder.x) * canvas.width, leftShoulder.y * canvas.height);
            ctx.lineTo((1-rightShoulder.x) * canvas.width, rightShoulder.y * canvas.height);
            ctx.lineTo((1-rightHip.x) * canvas.width, rightHip.y * canvas.height);
            ctx.lineTo((1-leftHip.x) * canvas.width, leftHip.y * canvas.height);
            ctx.closePath();
            ctx.stroke();
          }
        }
      }
    } catch (err) {
      console.error("Tracking detection error:", err);
    }

    trackingAnimationRef.current = requestAnimationFrame(detect);
  };
  trackingAnimationRef.current = requestAnimationFrame(detect);
}, [isTracking, showAngles, carouselFrames.length]);

useEffect(() => {
  let isMounted = true;
  let activeStream: MediaStream | null = null;

  const setup = async () => {
    if (isTracking && Platform.OS === 'web') {
      await initTracking();
      if (!isMounted) return;

      try {
        if (activeStream) {
          activeStream.getTracks().forEach(t => t.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 }
        });
        activeStream = stream;

        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
          webcamRef.current.onloadedmetadata = () => {
            if (webcamRef.current && poseReady) {
              startTracking();
            }
          };
        }
      } catch (error: any) {
        console.error("Error accessing webcam:", error);
        toast.error(`Error al acceder a la cámara: ${error.message || 'Error desconocido'}`);
        setIsTracking(false);
      }
    } else {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
        activeStream = null;
      }
      if (trackingAnimationRef.current) {
        cancelAnimationFrame(trackingAnimationRef.current);
        trackingAnimationRef.current = undefined;
      }
    }
  };

  setup();

  return () => {
    isMounted = false;
    if (activeStream) {
      activeStream.getTracks().forEach(t => t.stop());
    }
    if (trackingAnimationRef.current) {
      cancelAnimationFrame(trackingAnimationRef.current);
    }
  };
}, [isTracking, poseReady, initTracking, startTracking]);
```

---

## 3. MEJORAR SINCRONIZACIÓN DE VIDEOS

**Problema:** Videos tardan en aparecer aunque ya están generados

**Solución:**
- Verificar que `useEffect` se ejecuta cuando `fashionSpinUrl` o `klingVideoUrl` cambian
- Agregar dependencias correctas al `useEffect` de líneas 76-152

**Cambio:**
```typescript
}, [tryOnImageUrl, view360Data, fashionSpinUrl, klingVideoUrl]); // Ya está bien
```

Pero también necesitamos un `useEffect` separado para cuando `klingVideoUrl` cambia y extraer frames automáticamente:

```typescript
// Extraer frames automáticamente cuando KLING está listo
useEffect(() => {
  if (klingVideoUrl && carouselFrames.length === 0) {
    console.log('[Viewer360] KLING URL disponible, extrayendo frames...');
    extractFramesFromVideo(klingVideoUrl);
  }
}, [klingVideoUrl, carouselFrames.length, extractFramesFromVideo]);
```

---

**Última actualización:** 2025-02-03
