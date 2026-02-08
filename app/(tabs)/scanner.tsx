import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { PermissionRequestButton } from '@/components/PermissionRequestButton';
import { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Platform, Alert, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Check, Camera, ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useVoice } from '@/contexts/VoiceContext';
import * as Speech from 'expo-speech';

export default function ScannerScreen() {
  const router = useRouter();
  const { saveScanData, scanData, setAutoTriggerDetection } = useApp();
  const { registerCommand, unregisterCommand } = useVoice();
  const [facing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>(scanData?.photos || []);
  const [cameraRef, setCameraRef] = useState<any>(null);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shutterSoundRef = useRef<Audio.Sound | null>(null);
  const countdownSoundRef = useRef<Audio.Sound | null>(null);
  
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim3 = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (cameraRef) {
      setIsCameraReady(false);
      
      if (Platform.OS === 'web') {
        const checkVideoReady = () => {
          try {
            const cameraElement = document.querySelector('video');
            if (cameraElement) {
              videoRef.current = cameraElement as HTMLVideoElement;
              
              const handleCanPlay = () => {
                if (videoRef.current && 
                    videoRef.current.readyState >= 3 && 
                    videoRef.current.videoWidth > 0) {
                  console.log('Web camera is ready for capture');
                  setIsCameraReady(true);
                }
              };
              
              const handleLoadedData = () => {
                console.log('Video loaded data');
                if (videoRef.current && videoRef.current.readyState >= 2) {
                  handleCanPlay();
                }
              };
              
              cameraElement.addEventListener('canplay', handleCanPlay);
              cameraElement.addEventListener('loadeddata', handleLoadedData);
              
              if (videoRef.current && videoRef.current.readyState >= 3) {
                handleCanPlay();
              }
              
              return () => {
                cameraElement.removeEventListener('canplay', handleCanPlay);
                cameraElement.removeEventListener('loadeddata', handleLoadedData);
              };
            }
          } catch (error) {
            console.error('Error setting up video listeners:', error);
          }
        };
        
        const timer = setTimeout(checkVideoReady, 500);
        const fallbackTimer = setTimeout(() => {
          console.log('Fallback: Setting camera ready after timeout');
          setIsCameraReady(true);
        }, 3000);
        
        return () => {
          clearTimeout(timer);
          clearTimeout(fallbackTimer);
          if (videoRef.current) {
            videoRef.current = null;
          }
        };
      } else {
        const timer = setTimeout(() => {
          setIsCameraReady(true);
          console.log('Native camera is ready for capture');
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [cameraRef, facing]);
  
  useEffect(() => {
    const pulse1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim1, {
          toValue: 1.5,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim1, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    
    const pulse2 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim2, {
          toValue: 1.5,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim2, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    
    const pulse3 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim3, {
          toValue: 1.5,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim3, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    const opacityAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    setTimeout(() => pulse1.start(), 0);
    setTimeout(() => pulse2.start(), 200);
    setTimeout(() => pulse3.start(), 400);
    opacityAnimation.start();
    
    return () => {
      pulse1.stop();
      pulse2.stop();
      pulse3.stop();
      opacityAnimation.stop();
    };
  }, [pulseAnim1, pulseAnim2, pulseAnim3, opacityAnim]);

  const playCountdownSound = async () => {
    try {
      if (countdownSoundRef.current) {
        await countdownSoundRef.current.unloadAsync();
      }
      
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
        { shouldPlay: true, volume: 0.3 }
      );
      countdownSoundRef.current = sound;
      
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          countdownSoundRef.current = null;
        }
      });
    } catch (error) {
      console.log('Error playing countdown sound:', error);
    }
  };

  const playShutterSound = useCallback(async () => {
    try {
      if (shutterSoundRef.current) {
        await shutterSoundRef.current.unloadAsync();
      }
      
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3' },
        { shouldPlay: true, volume: 0.5 }
      );
      shutterSoundRef.current = sound;
      
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          shutterSoundRef.current = null;
        }
      });
    } catch (error) {
      console.log('Error playing shutter sound:', error);
    }
  }, []);

  const takePictureAfterCountdown = useCallback(async () => {
    if (!cameraRef) {
      console.log('Cannot take picture: cameraRef missing');
      setIsCapturing(false);
      setCountdown(null);
      return;
    }
    
    if (capturedPhotos.length >= 2) {
      console.log('Already have 2 photos, skipping capture');
      setIsCapturing(false);
      setCountdown(null);
      return;
    }
    
    setIsCapturing(true);
    
    try {
      console.log('Starting photo capture...');
      setShowFlash(true);
      playShutterSound();
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      const photo = await cameraRef.takePictureAsync({
        quality: 1,
        base64: false,
      });
      
      console.log('Picture taken successfully:', photo.uri);
      
      setTimeout(() => setShowFlash(false), 200);
      
      const photosCopy = [...capturedPhotos, photo.uri];
      console.log('Updated photos count:', photosCopy.length);
      
      setCapturedPhotos(photosCopy);
      
      if (photosCopy.length === 1) {
        console.log('First photo captured, starting countdown for second photo in 3 seconds');
        setIsCapturing(false);
        setCountdown(null);
        
        // Voice feedback for lateral photo
        Speech.speak('Primera foto capturada. Ahora gira 90 grados a la derecha para la vista lateral. Mantén los brazos pegados al cuerpo.', {
          language: 'es-ES',
          rate: 0.95,
          pitch: 1.0,
        });
        
        setTimeout(() => {
          console.log('Starting second photo countdown');
          setCountdown(3);
        }, 4500);
      } else {
        console.log('Second photo captured, finishing capture process');
        setIsCapturing(false);
        setCountdown(null);
        
        // Voice feedback for completion
        Speech.speak('Escaneo completado. Pulsa Detectar Medidas para continuar.', {
          language: 'es-ES',
          rate: 0.95,
          pitch: 1.0,
        });
      }
      
    } catch (error) {
      console.error('Error taking picture:', error);
      setShowFlash(false);
      setIsCapturing(false);
      setCountdown(null);
    }
  }, [cameraRef, capturedPhotos, playShutterSound]);

  const startCountdown = useCallback(() => {
    if (!isCameraReady || isCapturing || countdown !== null) {
      if (!isCameraReady) {
        const message = 'Por favor espera, la cámara se está inicializando...';
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('Cámara inicializando', message);
        }
      }
      return;
    }

    if (Platform.OS === 'web' && videoRef.current) {
      const video = videoRef.current;
      if (video.readyState < 3 || video.videoWidth === 0) {
        alert('La cámara aún no está lista. Por favor espera unos segundos más.');
        return;
      }
    }

    setCountdown(3);
  }, [isCameraReady, isCapturing, countdown]);

  const resetPhotos = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (shutterSoundRef.current) {
      await shutterSoundRef.current.unloadAsync();
      shutterSoundRef.current = null;
    }
    if (countdownSoundRef.current) {
      await countdownSoundRef.current.unloadAsync();
      countdownSoundRef.current = null;
    }
    
    setCapturedPhotos([]);
    setCountdown(null);
    setIsCapturing(false);
    await saveScanData([]);
  }, [saveScanData]);

  const pickImagesFromLibrary = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      console.log('Scanner: Requesting media library permissions...');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Scanner: Permission result:', JSON.stringify(permissionResult));
      
      if (!permissionResult.granted) {
        const message = 'Necesitamos permiso para acceder a tu galería de fotos';
        console.log('Scanner: Permission denied');
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('Permiso Requerido', message, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Configuración', onPress: () => {
              Alert.alert(
                'Permisos necesarios',
                'Por favor habilita los permisos de almacenamiento en la configuración de la app',
                [{ text: 'OK' }]
              );
            }}
          ]);
        }
        return;
      }

      const allowMultiple = capturedPhotos.length === 0;
      console.log('Scanner: Launching image picker... allowMultiple:', allowMultiple);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: allowMultiple,
        selectionLimit: allowMultiple ? 2 : 1,
        quality: 0.8,
        base64: false,
        exif: false,
        allowsEditing: false,
      });

      console.log('Scanner: Image picker result:', JSON.stringify({
        canceled: result.canceled,
        assetsLength: result.assets?.length,
        uris: result.assets?.map(a => a.uri)
      }));
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhotos = result.assets.map(asset => asset.uri);
        const updatedPhotos = [...capturedPhotos, ...newPhotos].slice(0, 2);
        setCapturedPhotos(updatedPhotos);
        console.log('Images selected from library. Total:', updatedPhotos.length);
        
        if (Platform.OS !== 'web') {
          Alert.alert('Éxito', `${newPhotos.length} imagen(es) seleccionada(s)`);
        }
      } else {
        console.log('Scanner: Image picking was canceled or no assets');
      }
    } catch (error) {
      console.error('Error picking images:', error);
      const message = 'Error al seleccionar imágenes: ' + (error as Error).message;
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  }, [capturedPhotos]);

  const completeScanning = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    if (shutterSoundRef.current) {
      await shutterSoundRef.current.unloadAsync();
      shutterSoundRef.current = null;
    }
    if (countdownSoundRef.current) {
      await countdownSoundRef.current.unloadAsync();
      countdownSoundRef.current = null;
    }
    
    await saveScanData(capturedPhotos);
    console.log('Scanning complete with photos:', capturedPhotos);
    
    // Set flag to auto-trigger AI detection when arriving at size-detector
    setAutoTriggerDetection(true);
    
    router.push('/(tabs)/size-detector');
  }, [capturedPhotos, saveScanData, router, setAutoTriggerDetection]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      playCountdownSound();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      takePictureAfterCountdown();
    }
  }, [countdown, takePictureAfterCountdown]);

  useFocusEffect(
    useCallback(() => {
      const captureAction = () => {
        if (capturedPhotos.length < 2 && isCameraReady && !isCapturing && countdown === null) {
          startCountdown();
        }
      };

      const resetAction = () => {
        if (capturedPhotos.length > 0) {
          resetPhotos();
        }
      };

      const continueAction = () => {
        if (capturedPhotos.length === 2) {
          if (Platform.OS !== 'web') {
            Speech.speak('Detectando medidas. Un momento.', { language: 'es-ES', rate: 0.9 });
          }
          completeScanning();
        }
      };

      registerCommand('scanner-capture', {
        patterns: ['capturar', 'tomar foto', 'foto', 'captura', 'tomar'],
        action: captureAction,
        description: 'capturar foto',
      });

      registerCommand('scanner-reset', {
        patterns: ['reiniciar', 'volver a empezar', 'reintentar', 'borrar fotos'],
        action: resetAction,
        description: 'reiniciar escaneo',
      });

      registerCommand('scanner-continue', {
        patterns: ['detectar medidas', 'analizar medidas', 'continuar detección', 'siguiente paso'],
        action: continueAction,
        description: 'detectar medidas',
      });

      registerCommand('scanner-to-mirror', {
        patterns: ['ir al espejo', 'espejo', 'continuar al espejo'],
        action: () => {
          if (capturedPhotos.length === 2) {
            router.push('/(tabs)/mirror');
          }
        },
        description: 'ir al espejo',
      });

      return () => {
        unregisterCommand('scanner-capture');
        unregisterCommand('scanner-reset');
        unregisterCommand('scanner-continue');
        unregisterCommand('scanner-to-mirror');
      };
    }, [registerCommand, unregisterCommand, capturedPhotos.length, isCameraReady, isCapturing, countdown, startCountdown, resetPhotos, completeScanning, router])
  );

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Cargando cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Camera size={64} color={Colors.light.primary} />
          <Text style={styles.permissionTitle}>Acceso a Cámara</Text>
          <Text style={styles.permissionText}>
            Necesitamos acceso a tu cámara para escanear tu cuerpo y crear tu modelo 3D
          </Text>
          {Platform.OS === 'web' && (
            <>
              <Text style={styles.permissionHint}>
                💡 En web, asegúrate de usar HTTPS o localhost. Si el navegador bloquea el acceso, revisa la configuración de permisos del sitio.
              </Text>
              {/* Componente mejorado para solicitar permisos en navegador de CURSOR */}
              <PermissionRequestButton 
                onPermissionsGranted={() => {
                  // Re-solicitar permisos de expo-camera después de que se concedan los permisos web
                  requestPermission();
                }}
              />
            </>
          )}
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Permitir Acceso</Text>
          </TouchableOpacity>
          {Platform.OS === 'web' && permission.status === 'denied' && (
            <Text style={styles.permissionError}>
              ⚠️ Permiso denegado. Por favor, permite el acceso a la cámara en la configuración del navegador.
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (capturedPhotos.length === 2) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <Text style={styles.completedTitle}>¡Escaneo Completado!</Text>
          <Text style={styles.completedText}>
            Se capturaron 2 fotos correctamente
          </Text>
          
          <View style={styles.photosGrid}>
            {capturedPhotos.map((photo, index) => (
              <View key={index} style={styles.photoCard}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <Text style={styles.photoLabel}>Foto {index + 1}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.secondaryButton} onPress={resetPhotos}>
              <Text style={styles.secondaryButtonText}>Reintentar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={completeScanning}>
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Detectar Medidas</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.directAccessContainer}>
            <Text style={styles.directAccessText}>¿Ya tienes tus medidas?</Text>
            <TouchableOpacity 
              style={styles.directAccessButton} 
              onPress={() => router.push('/(tabs)/mirror')}
            >
              <Text style={styles.directAccessButtonText}>Ir al Espejo</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.libraryHintButton} onPress={pickImagesFromLibrary}>
            <ImageIcon size={16} color={Colors.light.textSecondary} />
            <Text style={styles.libraryHintText}>O selecciona fotos de tu galería</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing={facing}
        ref={(ref) => setCameraRef(ref)}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(capturedPhotos.length / 2) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {capturedPhotos.length} / 2 fotos
              </Text>
            </View>
          </View>

          <View style={styles.guideContainer}>
            {countdown !== null && countdown > 0 && (
              <View style={styles.countdownOverlay}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
            )}
            {showFlash && <View style={styles.flashOverlay} />}
            <View style={styles.silhouette}>
              <View style={styles.positionIndicator}>
                <Text style={styles.positionText}>
                  {capturedPhotos.length === 0 
                    ? 'Colócate de frente con brazos abiertos'
                    : 'Gira 90° - Vista lateral'}
                </Text>
              </View>
              <View style={styles.silhouetteOutline}>
                {capturedPhotos.length === 0 ? (
                  <>
                    <Animated.View style={[styles.trackingPoint, { opacity: opacityAnim, transform: [{ scale: pulseAnim1 }] }]} />
                    <View style={styles.head} />
                    <Animated.View style={[styles.trackingPoint, { top: 40, left: 70, opacity: opacityAnim, transform: [{ scale: pulseAnim2 }] }]} />
                    
                    <Animated.View style={[styles.trackingPoint, { top: 90, left: 30, opacity: opacityAnim, transform: [{ scale: pulseAnim3 }] }]} />
                    <View style={styles.body} />
                    <Animated.View style={[styles.trackingPoint, { top: 90, right: 30, opacity: opacityAnim, transform: [{ scale: pulseAnim1 }] }]} />
                    
                    <Animated.View style={[styles.trackingPoint, { top: 140, left: -25, opacity: opacityAnim, transform: [{ scale: pulseAnim2 }] }]} />
                    <View style={styles.leftArmOpen} />
                    <Animated.View style={[styles.trackingPoint, { top: 140, left: -80, opacity: opacityAnim, transform: [{ scale: pulseAnim3 }] }]} />
                    
                    <Animated.View style={[styles.trackingPoint, { top: 140, right: -25, opacity: opacityAnim, transform: [{ scale: pulseAnim1 }] }]} />
                    <View style={styles.rightArmOpen} />
                    <Animated.View style={[styles.trackingPoint, { top: 140, right: -80, opacity: opacityAnim, transform: [{ scale: pulseAnim2 }] }]} />
                    
                    <Animated.View style={[styles.trackingPoint, { top: 290, left: 45, opacity: opacityAnim, transform: [{ scale: pulseAnim3 }] }]} />
                    <View style={styles.leftLegOpen} />
                    <Animated.View style={[styles.trackingPoint, { top: 630, left: 45, opacity: opacityAnim, transform: [{ scale: pulseAnim1 }] }]} />
                    
                    <Animated.View style={[styles.trackingPoint, { top: 290, right: 45, opacity: opacityAnim, transform: [{ scale: pulseAnim2 }] }]} />
                    <View style={styles.rightLegOpen} />
                    <Animated.View style={[styles.trackingPoint, { top: 630, right: 45, opacity: opacityAnim, transform: [{ scale: pulseAnim3 }] }]} />
                  </>
                ) : (
                  <>
                    <Animated.View style={[styles.trackingPoint, { opacity: opacityAnim, transform: [{ scale: pulseAnim1 }] }]} />
                    <View style={styles.headSide} />
                    <Animated.View style={[styles.trackingPoint, { top: 35, left: 50, opacity: opacityAnim, transform: [{ scale: pulseAnim2 }] }]} />
                    
                    <Animated.View style={[styles.trackingPoint, { top: 80, left: 15, opacity: opacityAnim, transform: [{ scale: pulseAnim3 }] }]} />
                    <View style={styles.bodySide} />
                    <Animated.View style={[styles.trackingPoint, { top: 220, left: 15, opacity: opacityAnim, transform: [{ scale: pulseAnim1 }] }]} />
                    
                    <Animated.View style={[styles.trackingPoint, { top: 135, left: 25, opacity: opacityAnim, transform: [{ scale: pulseAnim2 }] }]} />
                    <View style={styles.armSide} />
                    
                    <Animated.View style={[styles.trackingPoint, { top: 285, left: 35, opacity: opacityAnim, transform: [{ scale: pulseAnim3 }] }]} />
                    <View style={styles.legSide} />
                    <Animated.View style={[styles.trackingPoint, { top: 630, left: 35, opacity: opacityAnim, transform: [{ scale: pulseAnim1 }] }]} />
                  </>
                )}
              </View>
              <Text style={styles.guideText}>
                {capturedPhotos.length === 0 
                  ? 'Brazos y piernas ligeramente separados'
                  : 'Brazos pegados al cuerpo, perfil derecho'}
              </Text>
            </View>
            {!isCameraReady && (
              <View style={styles.initializingBadge}>
                <Text style={styles.initializingText}>Inicializando cámara...</Text>
              </View>
            )}
          </View>

          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={pickImagesFromLibrary}
            >
              <ImageIcon size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.captureButton,
                (!isCameraReady || isCapturing || countdown !== null) && styles.captureButtonDisabled
              ]} 
              onPress={startCountdown}
              disabled={!isCameraReady || isCapturing || countdown !== null}
            >
              <View style={[
                styles.captureButtonInner,
                (!isCameraReady || isCapturing) && styles.captureButtonInnerDisabled
              ]} />
            </TouchableOpacity>
            
            <View style={styles.controlButton} />
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  progressContainer: {
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  guideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  silhouette: {
    width: 240,
    height: 680,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  silhouetteOutline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  trackingPoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00FF00',
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  head: {
    width: 70,
    height: 80,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#00FF00',
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
  },
  body: {
    width: 110,
    height: 200,
    borderWidth: 2,
    borderColor: '#00FF00',
    borderTopLeftRadius: 55,
    borderTopRightRadius: 55,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    position: 'absolute',
    top: 85,
    alignSelf: 'center',
  },
  leftArmOpen: {
    width: 100,
    height: 2,
    backgroundColor: '#00FF00',
    position: 'absolute',
    top: 140,
    left: -15,
    transform: [{ rotate: '-35deg' }],
  },
  rightArmOpen: {
    width: 100,
    height: 2,
    backgroundColor: '#00FF00',
    position: 'absolute',
    top: 140,
    right: -15,
    transform: [{ rotate: '35deg' }],
  },
  leftLegOpen: {
    width: 2,
    height: 350,
    backgroundColor: '#00FF00',
    position: 'absolute',
    top: 290,
    left: 45,
  },
  rightLegOpen: {
    width: 2,
    height: 350,
    backgroundColor: '#00FF00',
    position: 'absolute',
    top: 290,
    right: 45,
  },
  headSide: {
    width: 60,
    height: 70,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#00FF00',
    position: 'absolute',
    top: 0,
    left: 20,
  },
  bodySide: {
    width: 70,
    height: 200,
    borderWidth: 2,
    borderColor: '#00FF00',
    borderRadius: 12,
    position: 'absolute',
    top: 75,
    left: 10,
  },
  armSide: {
    width: 2,
    height: 150,
    backgroundColor: '#00FF00',
    position: 'absolute',
    top: 130,
    left: 25,
  },
  legSide: {
    width: 2,
    height: 350,
    backgroundColor: '#00FF00',
    position: 'absolute',
    top: 285,
    left: 35,
  },
  positionIndicator: {
    position: 'absolute',
    top: -50,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  positionText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: 'bold' as const,
    textAlign: 'center',
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  permissionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  message: {
    color: Colors.light.text,
    fontSize: 16,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    marginTop: 16,
  },
  permissionText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  permissionHint: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  permissionError: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  previewContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    textAlign: 'center',
  },
  completedText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  photosGrid: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 20,
  },
  photoCard: {
    alignItems: 'center',
    gap: 8,
  },
  photoPreview: {
    width: 140,
    height: 200,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  secondaryButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInnerDisabled: {
    opacity: 0.5,
  },
  initializingBadge: {
    position: 'absolute',
    top: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  initializingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 5,
  },
  libraryHintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  libraryHintText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  directAccessContainer: {
    marginTop: 20,
    alignItems: 'center',
    gap: 8,
  },
  directAccessText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  directAccessButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    backgroundColor: 'transparent',
  },
  directAccessButtonText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
