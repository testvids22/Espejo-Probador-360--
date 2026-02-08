import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Platform, Animated, Dimensions } from 'react-native';
// @ts-ignore - video HTML nativo para web
const VideoHTML = Platform.OS === 'web' ? 'video' : null;
import { RotateCw, Play, Pause, Video, Image as ImageIcon, Sparkles, Share2, Download, Eye, EyeOff, Grid, Layout, Maximize2 } from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import { toast } from './Toast';
import { getApiKeysForExpo } from '@/lib/api-keys-expo';
import Colors from '@/constants/colors';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useVoice } from '@/contexts/VoiceContext';
import { useApp } from '@/contexts/AppContext';

interface Viewer360Props {
  tryOnImageUrl: string; // Imagen del TryOn de RORK
  clothingItemName?: string;
  onBack?: () => void;
  /** ID del item probado: para persistir carouselFrames en el contexto al extraerlos */
  triedItemId?: string;
  view360Data?: {
    wanUrl?: string;
    klingUrl?: string;
    carouselFrames?: string[];
  };
}

const TOTAL_FRAMES = 4;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VERTICAL_ASPECT = 9 / 16; // Ratio vertical 9:16
// Calcular dimensiones para ocupar casi toda la altura sin cortar pies o cabezas
const MAX_VIEW_HEIGHT = SCREEN_HEIGHT * 0.85;
const VIEW_WIDTH = Math.min(SCREEN_WIDTH - 16, MAX_VIEW_HEIGHT * VERTICAL_ASPECT);
const VIEW_HEIGHT = VIEW_WIDTH / VERTICAL_ASPECT;

type ViewMode = 'single' | 'split' | 'full';

export function Viewer360({ tryOnImageUrl, clothingItemName, onBack, triedItemId, view360Data }: Viewer360Props) {
  const [fashionSpinUrl, setFashionSpinUrl] = useState<string | null>(null);
  const [klingVideoUrl, setKlingVideoUrl] = useState<string | null>(null);
  const [isGeneratingWAN, setIsGeneratingWAN] = useState(false);
  const [isGeneratingKLING, setIsGeneratingKLING] = useState(false);
  const [wanProgress, setWanProgress] = useState(0);
  const [klingProgress, setKlingProgress] = useState(0);
  const [carouselFrames, setCarouselFrames] = useState<string[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [carouselSpeedMs, setCarouselSpeedMs] = useState(2500);
  const [activeVideoSource, setActiveVideoSource] = useState<'wan' | 'kling'>('kling');
  const [isTracking, setIsTracking] = useState(false);
  const [trackingAngle, setTrackingAngle] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [cameraPermission] = useCameraPermissions();
  
  const wanGenerationRef = useRef(false);
  const klingGenerationRef = useRef(false);
  const carouselIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackingRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const videoRef = useRef<ExpoVideo>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoStatus, setVideoStatus] = useState<any>(null);
  /** Cuando la extracción de frames falla, mostrar video en la vista carrusel con control de giro */
  const [useVideoInCarouselView, setUseVideoInCarouselView] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const carouselVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // MediaPipe tracking refs (para web)
  const webcamRef = useRef<HTMLVideoElement | null>(null);
  const trackingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseLandmarkerRef = useRef<any>(null);
  const trackingAnimationRef = useRef<number | undefined>(undefined);
  const smoothedAngleRef = useRef(0);
  const [poseReady, setPoseReady] = useState(false);
  const [showAngles, setShowAngles] = useState(true);
  const extractFramesFromVideoRef = useRef<((url: string) => Promise<void>) | null>(null);
  const { registerCommand, unregisterCommand } = useVoice();
  const { updateTriedItemView360Frames } = useApp();

  // Transición suave entre modos de vista (sin slide para evitar que desaparezcan)
  useEffect(() => {
    // Solo animar fade, no slide (slide estaba causando que las vistas desaparecieran)
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [viewMode]);

  // Usar datos 360º si ya están disponibles, sino generar
  useEffect(() => {
    console.log('[Viewer360] ========================================');
    console.log('[Viewer360] useEffect ejecutado');
    console.log('[Viewer360] view360Data existe:', !!view360Data);
    console.log('[Viewer360] fashionSpinUrl actual:', fashionSpinUrl ? '✅' : '❌');
    console.log('[Viewer360] klingVideoUrl actual:', klingVideoUrl ? '✅' : '❌');
    
    if (view360Data) {
      console.log('[Viewer360] view360Data recibido:', {
        hasWanUrl: !!view360Data.wanUrl,
        hasKlingUrl: !!view360Data.klingUrl,
        wanUrl: view360Data.wanUrl ? `${view360Data.wanUrl.substring(0, 50)}... (length: ${view360Data.wanUrl.length})` : 'NO',
        klingUrl: view360Data.klingUrl ? `${view360Data.klingUrl.substring(0, 50)}... (length: ${view360Data.klingUrl.length})` : 'NO',
        carouselFrames: view360Data.carouselFrames?.length || 0,
      });
      
      // Solo KLING: mostrar vídeo al instante y extraer 4 miniaturas (sin voz aquí, solo cuando frames listos)
      if (view360Data.klingUrl && view360Data.klingUrl !== klingVideoUrl) {
        setKlingVideoUrl(view360Data.klingUrl);
        setIsVideoPlaying(true);
        // Mostrar miniaturas SIEMPRE: fallback inmediato con TryOn x4 (reemplazado por frames extraídos si tiene éxito)
        const fallbackFrames = [tryOnImageUrl, tryOnImageUrl, tryOnImageUrl, tryOnImageUrl];
        setCarouselFrames(fallbackFrames);
        setUseVideoInCarouselView(true);
        setIsAutoRotating(true);
        if (extractFramesFromVideoRef.current) {
          extractFramesFromVideoRef.current(view360Data.klingUrl).then(() => {
            console.log('[Viewer360] ✅ Frames extraídos, carrusel actualizado');
          }).catch((err) => {
            console.warn('[Viewer360] Extracción fallida, manteniendo fallback TryOn:', err);
          });
        }
      }
      
      // Configurar carousel - priorizar frames existentes (ya extraídos)
      if (view360Data.carouselFrames && view360Data.carouselFrames.length > 0) {
        console.log('[Viewer360] ✅ Configurando carousel con', view360Data.carouselFrames.length, 'frames');
        setCarouselFrames(view360Data.carouselFrames);
        setUseVideoInCarouselView(false);
        setIsAutoRotating(true);
      }
      
      console.log('[Viewer360] ========================================');
    }
    // La generación 360º solo se dispara desde AppContext tras el TryOn (solo KLING). No generar desde aquí.
  }, [tryOnImageUrl, view360Data, fashionSpinUrl, klingVideoUrl, carouselFrames.length]);

  // Comando de voz: "carrusel" = velocidad rápida, "girar" = reanudar auto-rotación
  useEffect(() => {
    registerCommand('carousel-fast', {
      patterns: ['carrusel', 'carrusel rápido', 'más rápido', 'girar'],
      action: () => {
        setCarouselSpeedMs(1000);
        setIsAutoRotating(true);
      },
      description: '',
    });
    return () => unregisterCommand('carousel-fast');
  }, [registerCommand, unregisterCommand]);

  // Comandos de voz: "frente", "lateral", "trasera" = ver vista del carrusel
  useEffect(() => {
    registerCommand('carousel-frente', {
      patterns: ['frente', 'frontal', 'vista frontal'],
      action: () => { setCurrentFrame(0); setIsAutoRotating(false); },
      description: '',
    });
    registerCommand('carousel-lateral', {
      patterns: ['lateral', 'de lado', 'vista lateral'],
      action: () => { setCurrentFrame(1); setIsAutoRotating(false); },
      description: '',
    });
    registerCommand('carousel-trasera', {
      patterns: ['trasera', 'trasero', 'espalda', 'vista trasera'],
      action: () => { setCurrentFrame(2); setIsAutoRotating(false); },
      description: '',
    });
    registerCommand('carousel-trescuartos', {
      patterns: ['tres cuartos', 'vista tres cuartos', 'ángulo tres cuartos', 'tres cuarto'],
      action: () => { setCurrentFrame(3); setIsAutoRotating(false); },
      description: '',
    });
    return () => {
      unregisterCommand('carousel-frente');
      unregisterCommand('carousel-lateral');
      unregisterCommand('carousel-trasera');
      unregisterCommand('carousel-trescuartos');
    };
  }, [registerCommand, unregisterCommand]);

  // Auto-rotación del carrusel
  useEffect(() => {
    if (isAutoRotating && carouselFrames.length > 0 && !isTracking) {
      carouselIntervalRef.current = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % carouselFrames.length);
      }, carouselSpeedMs);
      return () => {
        if (carouselIntervalRef.current) {
          clearInterval(carouselIntervalRef.current);
        }
      };
    } else {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    }
  }, [isAutoRotating, carouselFrames.length, isTracking, carouselSpeedMs]);

  // MediaPipe tracking - Inicialización
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

  // MediaPipe tracking - Loop de detección (suave y preciso)
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
            if (typeof window !== 'undefined') {
              if (!(window as any).maxBodyWidth || currentWidth > (window as any).maxBodyWidth) {
                (window as any).maxBodyWidth = currentWidth;
              }
            }
            
            const minW = (typeof window !== 'undefined' && (window as any).maxBodyWidth) ? (window as any).maxBodyWidth * 0.25 : 0.04;
            const maxW = (typeof window !== 'undefined' && (window as any).maxBodyWidth) ? (window as any).maxBodyWidth : 0.18;
            
            const leftSideCloser = (leftShoulder.z + leftHip.z) / 2 < (rightShoulder.z + rightHip.z) / 2;
            const noseVisibility = nose ? (nose.visibility || 0) : 0;
            
            let targetAngle = 0;
            
            if (noseVisibility < 0.25) { // Detectar espalda
              targetAngle = 180;
            } else {
              // Normalización más dinámica y precisa
              const normalizedWidth = Math.max(0, Math.min(1, (currentWidth - minW) / (maxW - minW)));
              const baseAngle = (1 - normalizedWidth) * 90;
              targetAngle = leftSideCloser ? baseAngle : 360 - baseAngle;
            }

            // Suavizado fino y preciso (0.90 para más suavidad, calibrado al milímetro)
            const smoothingFactor = 0.90; // Más suave que Orchids (0.85)
            if (isNaN(smoothedAngleRef.current)) smoothedAngleRef.current = targetAngle;
            smoothedAngleRef.current = smoothedAngleRef.current * smoothingFactor + targetAngle * (1 - smoothingFactor);
            
            const finalAngle = (smoothedAngleRef.current + 360) % 360;
            const frameIdx = Math.floor((finalAngle / 360) * TOTAL_FRAMES) % TOTAL_FRAMES;
            
            setCurrentFrame(frameIdx);
            setTrackingAngle(finalAngle);
            
            // Dibujar puntos de seguimiento (fino y preciso)
            if (showAngles) {
              ctx.strokeStyle = '#00ffff'; // Cyan neón (estilo RORK)
              ctx.fillStyle = '#00ffff';
              ctx.lineWidth = 2; // Más fino que Orchids (4)
              
              [leftShoulder, rightShoulder, leftHip, rightHip].forEach(p => {
                if (p && (p.visibility || 0) > 0.5) {
                  ctx.beginPath();
                  ctx.arc((1-p.x) * canvas.width, p.y * canvas.height, 4, 0, 2 * Math.PI); // Punto más pequeño (4 vs 6)
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

  // Setup MediaPipe tracking con webcam
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

  const generateFashionSpin = useCallback(async (tryOnImageUrl: string) => {
    if (wanGenerationRef.current) return;
    wanGenerationRef.current = true;
    
    setIsGeneratingWAN(true);
    setWanProgress(0);
    
    const progressInterval = setInterval(() => {
      setWanProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 1.5;
      });
    }, 2000);
    
    try {
      const apiKeys = await getApiKeysForExpo();
      const falKey = apiKeys.FAL_KEY;
      
      if (!falKey || falKey === '[CONFIGURAR_EN_VERCEL]') {
        throw new Error('API Key de FAL no configurada. Configúrala en Vercel.');
      }

      const { fal } = await import('@fal-ai/client');
      fal.config({ proxyUrl: undefined, credentials: falKey });
      
      console.log('[WAN] Iniciando generación con FAL AI...');
      
      const result: any = await fal.subscribe('fal-ai/wan-i2v', {
        input: {
          image_url: tryOnImageUrl,
          prompt: 'Generar un giro suave y continuo de la persona manteniendo exactamente la prenda aplicada por el Try‑On, sin reinterpretar accesorios como ropa. No modificar rostro, manos, cuerpo ni complementos. Mantener continuidad visual con la imagen de entrada, respetando color, textura y forma de la prenda.',
          negative_prompt: 'blur, distort, low quality, static, no motion, face changing, body proportion change, clothing change, amateur quality, background changing drastically',
          aspect_ratio: '9:16',
          num_frames: 81, // Requerido por el modelo
        },
        credentials: falKey, // Pasar API key directamente como fallback
      });
      
      if (result.data?.video?.url) {
        setFashionSpinUrl(result.data.video.url);
        setActiveVideoSource('wan');
        setWanProgress(100);
        toast.success('Vista Fashion lista');
        
        // No anunciar por voz "Preparando vista 360/video completo" si el usuario no pidió "360"
        
        // Iniciar 360º después de Fashion (con delay para no sobrecargar)
        setTimeout(() => {
          if (!klingGenerationRef.current && tryOnImageUrl) {
            console.log('[Viewer360] Iniciando generación 360º después de Fashion...');
            generateKling360(tryOnImageUrl);
          }
        }, 2000); // Delay de 2 segundos
      } else {
        throw new Error('No se recibió URL de video de WAN');
      }
    } catch (error: any) {
      console.error('[Fashion] Error:', error);
      toast.error(`Error al generar vista Fashion: ${error.message || 'Error desconocido'}`);
    } finally {
      clearInterval(progressInterval);
      setIsGeneratingWAN(false);
      wanGenerationRef.current = false;
    }
  }, []);

  const generateKling360 = useCallback(async (tryOnImageUrl: string) => {
    if (klingGenerationRef.current) return;
    klingGenerationRef.current = true;
    
    setIsGeneratingKLING(true);
    setKlingProgress(0);
    
    const progressInterval = setInterval(() => {
      setKlingProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 8;
      });
    }, 1000);
    
    try {
      const apiKeys = await getApiKeysForExpo();
      const falKey = apiKeys.FAL_KEY;
      
      if (!falKey || falKey === '[CONFIGURAR_EN_VERCEL]') {
        throw new Error('API Key de FAL no configurada.');
      }

      const { fal } = await import('@fal-ai/client');
      fal.config({ proxyUrl: undefined, credentials: falKey });
      
      console.log('[360º] Iniciando generación con FAL AI...');
      
      const result: any = await fal.subscribe('fal-ai/kling-video/v2.6/pro/image-to-video', {
        input: {
          start_image_url: tryOnImageUrl,
          prompt: 'Generar vistas limpias y consistentes de la persona con la prenda aplicada, sin alterar ni confundir accesorios (bolsos, zapatos, gorros, gafas, bufandas, joyas) con ropa. Mantener identidad, proporciones y pose. Producir rotación uniforme y estable en ángulos exactos (frontal, lateral, trasera), con contorno limpio y sin artefactos.',
          negative_prompt: 'blur, distort, low quality, static, no motion, face changing, body proportion change, clothing change, amateur quality, background changing drastically',
          duration: '5',
          aspect_ratio: '9:16',
          generate_audio: false,
        },
        credentials: falKey, // Pasar API key directamente como fallback
      });
      
      if (result.data?.video?.url) {
        setKlingVideoUrl(result.data.video.url);
        setKlingProgress(100);
        toast.success('Video 360º listo');
        
        // Anuncio por voz (solo en móvil)
        if (Platform.OS !== 'web') {
          Speech.speak('¡Listo! El video completo está preparado. Ahora puedes navegar por el carrusel para ver cómo te queda la prenda desde cada ángulo. Y si activas el seguimiento, podrás girar la prenda siguiendo tu reflejo en la pantalla.', {
            language: 'es-ES',
            rate: 0.9,
          });
        }
        
        // Extraer frames del video 360º para el carrusel
        console.log('[Viewer360] Extrayendo frames del video 360º...');
        extractFramesFromVideo(result.data.video.url);
      } else {
        throw new Error('No se recibió URL de video 360º');
      }
    } catch (error: any) {
      console.error('[360º] Error:', error);
      toast.error(`Error al generar video 360º: ${error.message || 'Error desconocido'}`);
    } finally {
      clearInterval(progressInterval);
      setIsGeneratingKLING(false);
      klingGenerationRef.current = false;
    }
  }, []);

  const extractFramesFromVideo = useCallback(async (videoUrl: string) => {
    const FRAMES = 4;
    const fallbackFrames = [tryOnImageUrl, tryOnImageUrl, tryOnImageUrl, tryOnImageUrl];
    try {
      console.log('[Viewer360] Extrayendo frames de:', videoUrl);
      
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const loadAndExtract = (src: string): Promise<string[]> => new Promise((resolve, reject) => {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.muted = true;
          video.playsInline = true;
          video.src = src;
          const frames: string[] = [];
          video.onloadedmetadata = async () => {
            const duration = video.duration;
            const interval = duration / FRAMES;
            
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }

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
              for (let i = 1; i < FRAMES; i++) {
                const time = i * interval;
                const frame = await captureFrame(time);
                frames.push(frame);
              }
              
              // Verificar si el frame 0 está en negro y reemplazar con TryOn (PROTEGER VISTA FRONTAL)
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
                      // Si el brillo promedio es menor a 30, está en negro - REEMPLAZAR CON TRYON
                      if (avgBrightness < 30) {
                        frames[0] = tryOnImageUrl; // PROTEGER VISTA FRONTAL
                        console.log('[Viewer360] ✅ Frame 0 estaba en negro, reemplazado con TryOn image (vista frontal protegida)');
                      } else {
                        console.log('[Viewer360] ✅ Frame 0 tiene contenido válido, manteniendo');
                      }
                    }
                    resolve(null);
                  };
                  img.onerror = reject;
                  img.src = frames[0];
                });
              }
              
              console.log('[Viewer360] ✅ Frames extraídos:', frames.length);
              resolve(frames);
            } catch (err: any) {
              if (err?.message?.includes('tainted') || err?.message?.includes('toDataURL')) {
                reject(new Error('Canvas tainted'));
              } else {
                reject(err);
              }
            }
          };
          video.onerror = () => reject(new Error('Video load error'));
          video.load();
        });

        let frames: string[] = [];
        try {
          frames = await loadAndExtract(videoUrl);
        } catch (directErr) {
          const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(videoUrl);
          console.log('[Viewer360] Directo falló, probando proxy CORS');
          try {
            frames = await loadAndExtract(proxyUrl);
          } catch (proxyErr) {
            console.warn('[Viewer360] Proxy falló, usando fallback TryOn x4');
            setCarouselFrames(fallbackFrames);
            setUseVideoInCarouselView(true);
            setIsAutoRotating(true);
            if (Platform.OS !== 'web') {
              Speech.speak('Ahora puedes ver cómo te queda desde todos los ángulos. Frente, lateral y trasera.', { language: 'es-ES', rate: 0.9 });
            }
            return;
          }
        }
        if (frames.length > 0) {
          setCarouselFrames(frames);
          setUseVideoInCarouselView(false);
          setIsAutoRotating(true);
          if (triedItemId && updateTriedItemView360Frames) {
            updateTriedItemView360Frames(triedItemId, frames);
          }
          if (Platform.OS !== 'web') {
            Speech.speak('Ahora puedes ver cómo te queda desde todos los ángulos. Frente, lateral y trasera.', { language: 'es-ES', rate: 0.9 });
          } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance('Ahora puedes ver cómo te queda desde todos los ángulos. Frente, lateral y trasera.');
            u.lang = 'es-ES';
            u.rate = 0.9;
            window.speechSynthesis.speak(u);
          }
        }
      } else {
        // En native, usar frames sintéticos por ahora (se puede mejorar con expo-video)
        console.log('[Viewer360] ⚠️ Extracción de frames en native no implementada, usando placeholders');
        const frames: string[] = [];
        // PROTEGER VISTA FRONTAL: frame 0 siempre es TryOn image
        frames.push(tryOnImageUrl);
        for (let i = 1; i < TOTAL_FRAMES; i++) {
          frames.push(tryOnImageUrl);
        }
        setCarouselFrames(frames);
        setIsAutoRotating(true);
        if (Platform.OS !== 'web') {
          Speech.speak('Ahora puedes ver cómo te queda desde todos los ángulos. Frente, lateral y trasera.', { language: 'es-ES', rate: 0.9 });
        } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance('Ahora puedes ver cómo te queda desde todos los ángulos. Frente, lateral y trasera.');
          u.lang = 'es-ES';
          u.rate = 0.9;
          window.speechSynthesis.speak(u);
        }
      }
    } catch (error: any) {
      console.error('[Frames] Error:', error);
      const frames = [tryOnImageUrl, tryOnImageUrl, tryOnImageUrl, tryOnImageUrl];
      setCarouselFrames(frames);
      setUseVideoInCarouselView(true);
      setIsAutoRotating(true);
    }
  }, [tryOnImageUrl, triedItemId, updateTriedItemView360Frames]);

  extractFramesFromVideoRef.current = extractFramesFromVideo;

  const handleShare = useCallback(async () => {
    const rawName = clothingItemName || 'Vista 360';
    const safeName = (rawName + '').replace(/[^a-zA-Z0-9\s\-_ñáéíóúüÑÁÉÍÓÚÜ]/g, '').trim().slice(0, 30) || 'Espejo-360';
    const baseNameVideo = safeName.startsWith('Espejo') ? safeName : `Espejo-360-${safeName}`;
    const baseNameImage = safeName.startsWith('Espejo') ? safeName : `Espejo-360-${safeName}`;
    try {
      const videoUrl = klingVideoUrl || fashionSpinUrl;
      // Compartir VIDEO 360º generado (no imagen)
      if (videoUrl) {
        if (Platform.OS === 'web') {
          try {
            const res = await fetch(videoUrl, { mode: 'cors' });
            const blob = await res.blob();
            const mime = blob.type && blob.type.startsWith('video/') ? blob.type : 'video/mp4';
            const fileName = `${baseNameVideo}.mp4`;
            const file = new File([blob], fileName, { type: mime });
            if (navigator.share && navigator.canShare?.({ files: [file] })) {
              await navigator.share({
                title: `Video 360º - ${rawName}`,
                text: 'Mira cómo me queda desde todos los ángulos',
                files: [file],
              });
              toast.success('Video 360º compartido');
            } else {
              throw new Error('Share not available');
            }
          } catch (fetchErr) {
            const a = document.createElement('a');
            a.href = videoUrl;
            a.download = `${baseNameVideo}.mp4`;
            a.target = '_blank';
            a.rel = 'noopener';
            a.click();
            toast.success('Video descargado');
          }
        } else {
          const uri = FileSystem.documentDirectory + `${baseNameVideo}.mp4`;
          await FileSystem.downloadAsync(videoUrl, uri);
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, { mimeType: 'video/mp4' });
            toast.success('Video 360º compartido');
          } else {
            toast.error('Compartir no disponible');
          }
        }
        return;
      }
      // Fallback: compartir imagen si no hay video
      const imageUrl = carouselFrames[currentFrame] || tryOnImageUrl;
      if (Platform.OS === 'web') {
        if (imageUrl.startsWith('data:')) {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
          const ext = mime === 'image/png' ? 'png' : 'jpg';
          const fileName = `${baseNameImage}.${ext}`;
          const file = new File([blob], fileName, { type: mime });
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              title: `Vista 360º - ${rawName}`,
              text: 'Mira cómo me queda desde todos los ángulos',
              files: [file],
            });
            toast.success('¡Compartido!');
          } else {
            const a = document.createElement('a');
            a.href = imageUrl;
            a.download = fileName;
            a.click();
            toast.success('Imagen descargada');
          }
        } else {
          const a = document.createElement('a');
          a.href = imageUrl;
          a.download = `${baseNameImage}.jpg`;
          a.target = '_blank';
          a.click();
          toast.success('Imagen descargada');
        }
      } else {
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          toast.error('Compartir no disponible');
          return;
        }
        const shareFileName = `${baseNameImage}.jpg`;
        const localUri = FileSystem.cacheDirectory + shareFileName;
        try {
          if (imageUrl.startsWith('data:')) {
            const base64 = imageUrl.split(',')[1] || imageUrl;
            await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
          } else {
            await FileSystem.downloadAsync(imageUrl, localUri);
          }
          await Sharing.shareAsync(localUri, { mimeType: 'image/jpeg' });
          toast.success('¡Compartido!');
        } catch (shareErr) {
          await Sharing.shareAsync(imageUrl);
          toast.success('¡Compartido!');
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Error al compartir');
    }
  }, [klingVideoUrl, fashionSpinUrl, carouselFrames, currentFrame, tryOnImageUrl, clothingItemName]);

  // Comando de voz: "compartir" = compartir video 360º
  useEffect(() => {
    registerCommand('share-360', {
      patterns: ['compartir', 'compartir video', 'compartir 360', 'enviar'],
      action: () => handleShare(),
      description: '',
    });
    return () => unregisterCommand('share-360');
  }, [registerCommand, unregisterCommand, handleShare]);

  // Vídeo principal: KLING en cuanto llegue (ya no usamos WAN)
  const currentVideoUrl = klingVideoUrl || fashionSpinUrl;
  const currentImage = carouselFrames[currentFrame] || tryOnImageUrl;
  
  const hasVideo = !!(klingVideoUrl || fashionSpinUrl);

  // Renderizar vista única (central) - video o imagen
  const renderSingleView = () => {
    console.log('[Viewer360] renderSingleView ejecutado');
    console.log('[Viewer360] hasVideo:', hasVideo);
    console.log('[Viewer360] currentVideoUrl:', currentVideoUrl ? `✅ ${currentVideoUrl.substring(0, 50)}...` : '❌ NO HAY');
    console.log('[Viewer360] fashionSpinUrl:', fashionSpinUrl ? '✅' : '❌');
    
    return (
      <View style={styles.singleViewContainer}>
        {hasVideo && currentVideoUrl ? (
          <>
            {console.log('[Viewer360] Renderizando VIDEO en single view')}
            {Platform.OS === 'web' ? (
              <VideoHTML
                ref={(ref: any) => {
                  if (ref) {
                    if (isVideoPlaying) {
                      ref.play().catch((e: any) => console.error('Error al reproducir:', e));
                    } else {
                      ref.pause();
                    }
                  }
                }}
                src={currentVideoUrl}
                loop
                muted
                autoPlay={isVideoPlaying}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain' as any,
                }}
                onError={(e: any) => {
                  console.error('[Viewer360] Error al reproducir video HTML:', e);
                  toast.error('Error al reproducir video');
                }}
                onLoadStart={() => {
                  console.log('[Viewer360] Video HTML empezando a cargar...');
                }}
                onLoadedData={() => {
                  console.log('[Viewer360] Video HTML cargado correctamente');
                }}
              />
            ) : (
              <ExpoVideo
                ref={videoRef}
                source={{ uri: currentVideoUrl }}
                style={styles.fullBodyImage}
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                isMuted
                shouldPlay={isVideoPlaying}
                onPlaybackStatusUpdate={(status) => {
                  setVideoStatus(status);
                  setIsVideoPlaying(status.isPlaying);
                }}
                onError={(error) => {
                  console.error('[Viewer360] Error al reproducir video:', error);
                  toast.error('Error al reproducir video');
                }}
                onLoadStart={() => {
                  console.log('[Viewer360] Video empezando a cargar...');
                }}
                onLoad={() => {
                  console.log('[Viewer360] Video cargado correctamente');
                }}
              />
            )}
          </>
        ) : (
          <>
            {console.log('[Viewer360] Renderizando IMAGEN en single view - hasVideo:', hasVideo, 'currentVideoUrl:', !!currentVideoUrl)}
            <ExpoImage
              source={{ uri: currentImage }}
              style={styles.fullBodyImage}
              contentFit="contain"
            />
          </>
        )}
      </View>
    );
  };

  // Miniaturas fijas: Frontal (TryOn), Lateral, Trasera — sin sustituir frontal por negro
  const frontalThumb = tryOnImageUrl;
  const lateralThumb = carouselFrames.length > 0 ? carouselFrames[Math.floor(carouselFrames.length / 3)] || tryOnImageUrl : tryOnImageUrl;
  const traseraThumb = carouselFrames.length > 0 ? carouselFrames[Math.floor((2 * carouselFrames.length) / 3)] || tryOnImageUrl : tryOnImageUrl;

  // Sin overlay de marca de agua (bordes negros quitados por estética)

  // Renderizar vista dividida: izquierda=VIDEO, centro=CARRUSEL (frontal/lateral/trasera), derecha=FRAME seleccionado
  const renderSplitView = () => {
    return (
      <View style={styles.splitViewContainer}>
        <View style={styles.splitViewRow}>
          {/* Vista izquierda: VIDEO 360º (pause afecta solo este) */}
          <View style={styles.splitViewItem}>
            {(fashionSpinUrl || klingVideoUrl) ? (
              Platform.OS === 'web' ? (
                <VideoHTML
                  ref={(ref: any) => {
                    if (ref) {
                      if (isVideoPlaying) {
                        ref.play().catch((e: any) => console.error('Error al reproducir:', e));
                      } else {
                        ref.pause();
                      }
                    }
                  }}
                  src={currentVideoUrl}
                  loop
                  muted
                  autoPlay={isVideoPlaying}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain' as any,
                  }}
                  onError={(e: any) => {
                    console.error('[Viewer360] Error al reproducir video HTML:', e);
                  }}
                />
              ) : (
                <ExpoVideo
                  ref={videoRef}
                  source={{ uri: currentVideoUrl }}
                  style={styles.fullBodyImage}
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping
                  isMuted
                  shouldPlay={isVideoPlaying}
                  onPlaybackStatusUpdate={(status) => {
                    setVideoStatus(status);
                    setIsVideoPlaying(status.isPlaying);
                  }}
                  onError={(error) => {
                    console.error('[Viewer360] Error al reproducir video:', error);
                  }}
                />
              )
            ) : (
              <ExpoImage
                source={{ uri: currentImage }}
                style={styles.fullBodyImage}
                contentFit="contain"
              />
            )}
          </View>

          {/* Vista derecha: video 360º con control de giro cuando fallback; si no, frame del carrusel */}
          <View style={styles.splitViewItem}>
            {useVideoInCarouselView && currentVideoUrl ? (
              Platform.OS === 'web' ? (
                <VideoHTML
                  ref={(ref: any) => { if (ref) carouselVideoRef.current = ref; }}
                  src={currentVideoUrl}
                  loop
                  muted
                  autoPlay={isVideoPlaying}
                  onLoadedMetadata={(e: any) => {
                    const el = e?.target;
                    if (el && typeof el.duration === 'number') setVideoDuration(el.duration);
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' as any }}
                />
              ) : (
                <ExpoVideo
                  source={{ uri: currentVideoUrl }}
                  style={styles.fullBodyImage}
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping
                  isMuted
                  shouldPlay={isVideoPlaying}
                />
              )
            ) : carouselFrames.length > 0 ? (
              <ExpoImage
                source={{ uri: currentImage }}
                style={styles.fullBodyImage}
                contentFit="contain"
              />
            ) : (
              <ExpoImage
                source={{ uri: tryOnImageUrl }}
                style={styles.fullBodyImage}
                contentFit="contain"
              />
            )}
          </View>
        </View>

        {/* Carrusel centro: frontal, lateral, trasera - clic para ver vista */}
        {carouselFrames.length > 0 && (klingVideoUrl || fashionSpinUrl) && (
          <View style={styles.carouselOverlay} pointerEvents="auto">
            <ScrollView
              style={styles.carouselVerticalContainer}
              contentContainerStyle={styles.carouselVerticalContent}
              showsVerticalScrollIndicator={false}
            >
              {carouselFrames.map((frame, index) => {
                const labels = ['Frente', 'Lateral', 'Trasera', '3/4'];
                const label = labels[index] || `${index + 1}`;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.thumbnailVertical,
                      index === currentFrame && styles.thumbnailActive,
                    ]}
                    onPress={() => {
                      setCurrentFrame(index);
                      setIsAutoRotating(false);
                      if (useVideoInCarouselView && videoDuration > 0 && Platform.OS === 'web' && carouselVideoRef.current) {
                        const seekTime = (index / Math.max(1, carouselFrames.length)) * videoDuration;
                        carouselVideoRef.current.currentTime = seekTime;
                      }
                      const lbl = ['Frente', 'Lateral', 'Trasera', '3/4'][index];
                      if (Platform.OS !== 'web') {
                        Speech.speak(lbl, { language: 'es-ES', rate: 0.9 });
                      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                        const u = new SpeechSynthesisUtterance(lbl);
                        u.lang = 'es-ES';
                        u.rate = 0.9;
                        window.speechSynthesis.speak(u);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <ExpoImage
                      source={{ uri: frame }}
                      style={styles.thumbnailImage}
                      contentFit="cover"
                    />
                    <View style={styles.thumbnailLabelOverlay}>
                      <Text style={styles.thumbnailLabelText}>{label}</Text>
                    </View>
                    {index === currentFrame && <View style={styles.thumbnailIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // Renderizar vista completa (3 vistas + miniaturas + MediaPipe)
  const renderFullView = () => (
    <View style={styles.fullViewContainer}>
      <View style={styles.fullViewRow}>
        {/* Vista principal central */}
        <View style={styles.fullViewMain}>
          {hasVideo && currentVideoUrl ? (
            <>
              {console.log('[Viewer360] Renderizando VIDEO en full view')}
              {Platform.OS === 'web' ? (
                <VideoHTML
                  ref={(ref: any) => {
                    if (ref) {
                      if (isVideoPlaying) {
                        ref.play().catch((e: any) => console.error('Error al reproducir:', e));
                      } else {
                        ref.pause();
                      }
                    }
                  }}
                  src={currentVideoUrl}
                  loop
                  muted
                  autoPlay={isVideoPlaying}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain' as any,
                  }}
                  onError={(e: any) => {
                    console.error('[Viewer360] Error al reproducir video HTML en full view:', e);
                    toast.error('Error al reproducir video');
                  }}
                  onLoadStart={() => {
                    console.log('[Viewer360] Video HTML en full view empezando a cargar...');
                  }}
                  onLoadedData={() => {
                    console.log('[Viewer360] Video HTML en full view cargado correctamente');
                  }}
                />
              ) : (
                <ExpoVideo
                  ref={videoRef}
                  source={{ uri: currentVideoUrl }}
                  style={styles.fullBodyImage}
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping
                  isMuted
                  shouldPlay={isVideoPlaying}
                  onPlaybackStatusUpdate={(status) => {
                    setVideoStatus(status);
                    setIsVideoPlaying(status.isPlaying);
                  }}
                  onError={(error) => {
                    console.error('[Viewer360] Error al reproducir video en full view:', error);
                    toast.error('Error al reproducir video');
                  }}
                  onLoadStart={() => {
                    console.log('[Viewer360] Video en full view empezando a cargar...');
                  }}
                  onLoad={() => {
                    console.log('[Viewer360] Video en full view cargado correctamente');
                  }}
                />
              )}
            </>
          ) : (
            <>
              {console.log('[Viewer360] Renderizando IMAGEN en full view - hasVideo:', hasVideo, 'currentVideoUrl:', !!currentVideoUrl)}
              <ExpoImage
                source={{ uri: currentImage }}
                style={styles.fullBodyImage}
                contentFit="contain"
              />
            </>
          )}
        </View>
        
        {/* MediaPipe espejo lateral (fino pero alto) */}
        {isTracking && Platform.OS === 'web' && (
          <View style={styles.mirrorContainer}>
            {typeof document !== 'undefined' && (
              <>
                <video
                  ref={webcamRef}
                  style={styles.mirrorCamera}
                  autoPlay
                  playsInline
                  muted
                />
                <canvas
                  ref={trackingCanvasRef}
                  style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
                />
              </>
            )}
            <View style={styles.mirrorOverlay}>
              <Text style={styles.mirrorLabel}>Tu reflejo</Text>
              {/* Indicador de seguimiento activo */}
              <View style={styles.trackingIndicator}>
                <View style={styles.trackingDot} />
                <Text style={styles.trackingText}>Seguimiento activo</Text>
              </View>
            </View>
          </View>
        )}
        {isTracking && Platform.OS !== 'web' && (
          <View style={styles.mirrorContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.mirrorCamera}
              facing="front"
            />
            <View style={styles.mirrorOverlay}>
              <Text style={styles.mirrorLabel}>Tu reflejo</Text>
              {/* Indicador de seguimiento activo */}
              <View style={styles.trackingIndicator}>
                <View style={styles.trackingDot} />
                <Text style={styles.trackingText}>Seguimiento activo</Text>
              </View>
            </View>
          </View>
        )}
      </View>
      
      {/* Tres vistas pequeñas arriba */}
      <View style={styles.threeViewsRow}>
        <View style={styles.smallView}>
          <ExpoImage
            source={{ uri: carouselFrames[(currentFrame - 1 + carouselFrames.length) % carouselFrames.length] || currentImage }}
            style={styles.smallImage}
            contentFit="contain"
          />
        </View>
        <View style={styles.smallView}>
          <ExpoImage
            source={{ uri: currentImage }}
            style={styles.smallImage}
            contentFit="contain"
          />
        </View>
        <View style={styles.smallView}>
          <ExpoImage
            source={{ uri: carouselFrames[(currentFrame + 1) % carouselFrames.length] || currentImage }}
            style={styles.smallImage}
            contentFit="contain"
          />
        </View>
      </View>
      
      {/* Miniaturas del carrusel abajo */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.thumbnailsContainer}
        contentContainerStyle={styles.thumbnailsContent}
      >
        {carouselFrames.map((frame, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.thumbnail,
              index === currentFrame && styles.thumbnailActive,
            ]}
            onPress={() => setCurrentFrame(index)}
          >
            <ExpoImage
              source={{ uri: frame }}
              style={styles.thumbnailImage}
              contentFit="cover"
            />
            {index === currentFrame && (
              <View style={styles.thumbnailIndicator} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, styles.neonContainer]}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Vista 360º</Text>
        {clothingItemName && (
          <Text style={styles.subtitle}>{clothingItemName}</Text>
        )}
      </View>

      {/* Progreso WAN */}
      {isGeneratingWAN && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.progressText}>Preparando vista desde todos los ángulos...</Text>
          <Text style={styles.progressPercent}>{Math.round(wanProgress)}%</Text>
        </View>
      )}

      {/* Progreso KLING */}
      {isGeneratingKLING && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.progressText}>Preparando video completo...</Text>
          <Text style={styles.progressPercent}>{Math.round(klingProgress)}%</Text>
        </View>
      )}

      {/* Indicadores mínimos: 360º / FASHION / VIDEO (sin WAN/KLING) */}
      {Platform.OS === 'web' && (fashionSpinUrl || klingVideoUrl) && (
        <View style={styles.debugIndicator}>
          <Text style={styles.debugText}>
            {klingVideoUrl ? '360º ✓' : ''} {fashionSpinUrl ? 'FASHION ✓' : ''} {currentVideoUrl ? 'VIDEO ✓' : ''}
          </Text>
        </View>
      )}

      {/* Contenedor principal de vistas */}
      <View style={styles.viewsContainer}>
        {viewMode === 'single' && renderSingleView()}
        {viewMode === 'split' && renderSplitView()}
        {viewMode === 'full' && renderFullView()}
      </View>

      {/* Selector de video (WAN/KLING) */}
      {fashionSpinUrl && klingVideoUrl && (
        <View style={styles.videoSourceSelector}>
          <TouchableOpacity
            style={[styles.videoSourceButton, activeVideoSource === 'wan' && styles.videoSourceButtonActive]}
            onPress={() => {
              setActiveVideoSource('wan');
              if (Platform.OS !== 'web') {
                Speech.speak('Mostrando giro Fashion desde todos los ángulos', {
                  language: 'es-ES',
                  rate: 0.9,
                });
              }
            }}
          >
            <Text style={[styles.videoSourceButtonText, activeVideoSource === 'wan' && styles.videoSourceButtonTextActive]}>
              Fashion
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.videoSourceButton, activeVideoSource === 'kling' && styles.videoSourceButtonActive]}
            onPress={() => {
              setActiveVideoSource('kling');
              if (Platform.OS !== 'web') {
                Speech.speak('Mostrando video técnico 360 grados', {
                  language: 'es-ES',
                  rate: 0.9,
                });
              }
            }}
          >
            <Text style={[styles.videoSourceButtonText, activeVideoSource === 'kling' && styles.videoSourceButtonTextActive]}>
              360º
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Controles de modo de vista */}
      <View style={styles.viewModeControls}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'single' && styles.viewModeButtonActive]}
          onPress={() => {
            setViewMode('single');
            if (Platform.OS !== 'web') {
              Speech.speak('Vista única activada. Imagen central a tamaño completo.', {
                language: 'es-ES',
                rate: 0.9,
              });
            }
          }}
        >
          <Maximize2 size={20} color={viewMode === 'single' ? '#FFFFFF' : Colors.light.textSecondary} />
          <Text style={[styles.viewModeButtonText, viewMode === 'single' && styles.viewModeButtonTextActive]}>
            Única
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'split' && styles.viewModeButtonActive]}
          onPress={() => {
            setViewMode('split');
            if (Platform.OS !== 'web') {
              Speech.speak('Vista dividida activada. Compara dos ángulos lado a lado.', {
                language: 'es-ES',
                rate: 0.9,
              });
            }
          }}
        >
          <Layout size={20} color={viewMode === 'split' ? '#FFFFFF' : Colors.light.textSecondary} />
          <Text style={[styles.viewModeButtonText, viewMode === 'split' && styles.viewModeButtonTextActive]}>
            Dividida
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'full' && styles.viewModeButtonActive]}
          onPress={() => {
            setViewMode('full');
            if (Platform.OS !== 'web') {
              Speech.speak('Vista completa activada. Tres vistas, miniaturas y seguimiento disponible.', {
                language: 'es-ES',
                rate: 0.9,
              });
            }
          }}
        >
          <Grid size={20} color={viewMode === 'full' ? '#FFFFFF' : Colors.light.textSecondary} />
          <Text style={[styles.viewModeButtonText, viewMode === 'full' && styles.viewModeButtonTextActive]}>
            Completa
          </Text>
        </TouchableOpacity>
      </View>

      {/* Controles */}
      <View style={styles.controlsContainer}>
        {carouselFrames.length > 0 && (
          <>
            {/* Control de video si hay video disponible */}
            {hasVideo ? (
              <TouchableOpacity
                style={[styles.controlButton, isVideoPlaying && styles.controlButtonActive]}
                onPress={async () => {
                  const newPlayingState = !isVideoPlaying;
                  setIsVideoPlaying(newPlayingState);
                  if (videoRef.current) {
                    if (newPlayingState) {
                      await videoRef.current.playAsync();
                    } else {
                      await videoRef.current.pauseAsync();
                    }
                  }
                  if (Platform.OS !== 'web') {
                    Speech.speak(
                      newPlayingState 
                        ? 'Video en reproducción. Puedes ver el giro completo de la prenda.' 
                        : 'Video pausado. Presiona de nuevo para continuar.',
                      {
                        language: 'es-ES',
                        rate: 0.9,
                      }
                    );
                  }
                }}
              >
                {isVideoPlaying ? <Pause size={20} color="#FFFFFF" /> : <Play size={20} color="#FFFFFF" />}
                <Text style={styles.controlButtonText}>
                  {isVideoPlaying ? 'Pausar' : 'Reproducir'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.controlButton, isAutoRotating && styles.controlButtonActive]}
                onPress={() => {
                  const newAutoRotating = !isAutoRotating;
                  setIsAutoRotating(newAutoRotating);
                  if (Platform.OS !== 'web') {
                    Speech.speak(
                      newAutoRotating 
                        ? 'El carrusel ahora rotará automáticamente para que veas todos los ángulos.' 
                        : 'Puedes navegar manualmente por el carrusel para ver cada ángulo a tu ritmo.',
                      {
                        language: 'es-ES',
                        rate: 0.9,
                      }
                    );
                  }
                }}
              >
                {isAutoRotating ? <Pause size={20} color="#FFFFFF" /> : <Play size={20} color="#FFFFFF" />}
                <Text style={styles.controlButtonText}>
                  {isAutoRotating ? 'Pausar' : 'Auto-rotar'}
                </Text>
              </TouchableOpacity>
            )}

            {carouselFrames.length > 0 && (
              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>Velocidad</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="range"
                    min={1000}
                    max={6000}
                    step={200}
                    value={carouselSpeedMs}
                    onChange={(e: any) => setCarouselSpeedMs(Number(e.target.value))}
                    title="Velocidad del carrusel"
                    aria-label="Velocidad del carrusel"
                  />
                ) : (
                  <View style={styles.sliderButtonRow}>
                    <TouchableOpacity style={styles.controlButton} onPress={() => setCarouselSpeedMs(prev => Math.max(1000, prev - 500))}>
                      <Text style={styles.controlButtonText}>Lento</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.controlButton} onPress={() => setCarouselSpeedMs(prev => Math.min(6000, prev + 500))}>
                      <Text style={styles.controlButtonText}>Rápido</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={styles.sliderValue}>{carouselSpeedMs / 1000}s</Text>
              </View>
            )}
          </>
        )}
        
        <TouchableOpacity style={styles.controlButton} onPress={handleShare}>
          <Share2 size={20} color="#FFFFFF" />
          <Text style={styles.controlButtonText}>Compartir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Fondo negro oscuro para espejo (evita transparencia)
    paddingTop: 0, // Sin padding superior para quitar borde blanco
    paddingBottom: 0, // Sin padding inferior para quitar borde blanco
  },
  neonContainer: {
    // Rebordes finos color neón para toda la pestaña 360º
    borderWidth: 2,
    borderColor: '#00ffff', // Cyan neón
    borderRadius: 16,
    // Sombra neón sutil
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10, // Para Android
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 50, // Reducido para evitar cortar cabezas
    paddingHorizontal: 16,
    paddingBottom: 0, // Sin padding inferior para quitar borde blanco
    backgroundColor: '#000000', // Fondo negro para quitar borde blanco
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  progressContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000000', // Fondo negro para quitar borde blanco
    marginHorizontal: 16,
    marginBottom: 0, // Sin margin inferior para quitar borde blanco
    borderRadius: 12,
  },
  progressText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '600',
  },
  progressPercent: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  viewsContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  singleViewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8, // Reducido de 16 a 8 para evitar cortar cabezas
    paddingHorizontal: 16,
    paddingBottom: 16,
    // Asegurar que el contenido no se corte
    overflow: 'visible',
    // Fondo oscuro con reborde neón
    backgroundColor: '#000000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00ffff', // Cyan neón
  },
  fullBodyImage: {
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    borderRadius: 16,
    backgroundColor: '#000000',
    // Reborde neón sutil
    borderWidth: 1,
    borderColor: '#00ffff', // Cyan neón
  },
  splitViewContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-start',
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
    backgroundColor: '#000000',
  },
  splitViewRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  splitViewItem: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  fullViewContainer: {
    flex: 1,
    padding: 8,
    // Fondo oscuro con reborde neón
    backgroundColor: '#000000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00ffff', // Cyan neón
  },
  fullViewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  fullViewMain: {
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    borderRadius: 12,
    overflow: 'visible', // Cambiar a 'visible' para no cortar contenido
    backgroundColor: '#000000',
    // Reborde neón
    borderWidth: 1,
    borderColor: '#00ffff', // Cyan neón
  },
  mirrorContainer: {
    width: 200, // Aumentado de 80 a 200 para mejor visibilidad
    height: VIEW_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#00ffff', // Cyan neón para consistencia
  },
  mirrorCamera: {
    width: '100%',
    height: '100%',
  },
  mirrorOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mirrorLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  threeViewsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  smallView: {
    width: (SCREEN_WIDTH - 48) / 3,
    height: (SCREEN_WIDTH - 48) / 3 * VERTICAL_ASPECT,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  smallImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailsContainer: {
    maxHeight: 120, // Aumentado de 100 a 120 para mejor visibilidad
    marginBottom: 8,
    marginTop: 8,
  },
  thumbnailsContent: {
    paddingHorizontal: 8,
    gap: 8,
    alignItems: 'center',
  },
  miniaturasTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 8,
    marginBottom: 8,
    height: 72,
    maxHeight: 72,
  },
  miniaturaSlot: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  miniaturaLabel: {
    position: 'absolute',
    top: 2,
    left: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    zIndex: 1,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  miniaturaSlotImage: {
    width: '100%',
    height: '100%',
  },
  carouselOverlay: {
    position: 'absolute',
    left: '50%',
    marginLeft: -55,
    top: '5%',
    bottom: '5%',
    width: 110,
    justifyContent: 'center',
    zIndex: 10,
  },
  carouselVerticalContainer: {
    flex: 1,
    maxHeight: '100%',
    backgroundColor: 'rgba(20,20,20,0.9)',
    borderRadius: 8,
    paddingVertical: 8,
  },
  carouselVerticalContent: {
    paddingVertical: 4,
    gap: 8,
    alignItems: 'center',
    flexGrow: 1,
  },
  thumbnailVertical: {
    width: 90,
    height: 120,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  splitViewThumbnailsContainer: {
    maxHeight: 120,
    marginTop: 12,
    marginBottom: 8,
  },
  thumbnail: {
    width: 100, // Aumentado de 60 a 100 para mejor visibilidad
    height: 100, // Aumentado de 80 a 100 para mejor visibilidad (cuadrado)
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  thumbnailActive: {
    borderColor: '#00ffff', // Cyan neón para consistencia
    borderWidth: 3,
    // Sombra neón para indicar selección
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  splitViewMediaPipeContainer: {
    width: 200, // Ancho aumentado para mejor visibilidad
    height: 300, // Altura fija para que sea más visible
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#00ffff', // Cyan neón
    marginTop: 12,
    alignSelf: 'center',
  },
  splitViewMediaPipe: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as any,
  },
  mirrorCamera: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as any,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.primary,
  },
  thumbnailLabelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  thumbnailLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  viewModeControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 0,
    borderRadius: 12,
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  viewModeButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  viewModeButtonTextActive: {
    color: '#FFFFFF',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  controlButtonActive: {
    backgroundColor: '#22c55e',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  sliderButtonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sliderValue: {
    fontSize: 12,
    color: '#fff',
    minWidth: 28,
  },
  watermarkMask: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '18%',
    height: '12%',
    backgroundColor: '#000',
  },
  debugIndicator: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 8,
    zIndex: 1000,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  mediaPipeTopContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#000000',
  },
  mediaPipeTop: {
    width: 200,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#00ffff',
    position: 'relative',
  },
  mediaPipeTopVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as any,
  },
  mediaPipeTopOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaPipeTopLabel: {
    color: '#00ffff',
    fontSize: 12,
    fontWeight: '600',
  },
  mediaPipeTopDegrees: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mediaPipeTopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#00ffff',
  },
  mediaPipeTopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 255, 255, 0.2)', // Cyan neón translúcido
    borderRadius: 12,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ffff', // Cyan neón
    // Animación de pulso
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  trackingText: {
    color: '#00ffff', // Cyan neón
    fontSize: 10,
    fontWeight: '600',
  },
});
