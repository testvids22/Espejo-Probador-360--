import React, { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Alert, Animated, ScrollView } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, Check, RotateCcw, Sparkles, Eye, ImagePlus, User } from 'lucide-react-native';
import { toast } from './Toast';
import { UserPhoto, BodyMeasurements } from '@/lib/types-360';
import { generateUUID } from '@/lib/uuid';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

export interface PhotoCapture360Ref {
  capture: () => void;
  toggleAutoMode: () => void;
  detectMeasures: () => void;
}

interface PhotoCapture360Props {
  onPhotosComplete: (photos: UserPhoto[]) => void;
  onSkip?: () => void;
}

const CAPTURE_ANGLES = [
  { id: 'front' as const, label: 'Frontal', instruction: 'Posiciónate en la zona marcada mirando al espejo' },
  { id: 'side' as const, label: 'Lateral', instruction: 'Gira 90° hacia tu derecha (perfil)' },
  { id: 'back' as const, label: 'Espalda', instruction: 'Da media vuelta, de espaldas al espejo' },
] as const;

export const PhotoCapture360 = forwardRef<PhotoCapture360Ref, PhotoCapture360Props>(
  function PhotoCapture360({ onPhotosComplete, onSkip }, ref) {
    const [permission, requestPermission] = useCameraPermissions();
    const [facing] = useState<CameraType>('front');
    const cameraRef = useRef<any>(null);
    
    const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
    const [photos, setPhotos] = useState<UserPhoto[]>([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [showFlash, setShowFlash] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [autoMode, setAutoMode] = useState(true);
    const [detectionEnabled, setDetectionEnabled] = useState(false); // MediaPipe disabled for now
    
    const flashAnim = useRef(new Animated.Value(0)).current;
    const countdownAnim = useRef(new Animated.Value(0)).current;

    useImperativeHandle(ref, () => ({
      capture: () => {
        if (!isCapturing) {
          handleCapture();
        }
      },
      toggleAutoMode: () => {
        setAutoMode(prev => !prev);
        Speech.speak(prev ? 'Modo automático desactivado' : 'Modo automático activado', {
          language: 'es-ES',
          rate: 0.95,
        });
      },
      detectMeasures: () => {
        // Placeholder for future MediaPipe integration
        Alert.alert('Detección de medidas', 'Funcionalidad en desarrollo');
      },
    }));

    useEffect(() => {
      if (!permission) {
        requestPermission();
      }
    }, [permission, requestPermission]);

    const playBeep = useCallback(() => {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, []);

    const capturePhoto = useCallback(async () => {
      if (!cameraRef.current) {
        toast.error('Cámara no disponible');
        return;
      }

      try {
        setShowFlash(true);
        playBeep();

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: false,
          skipProcessing: false,
        });

        setTimeout(() => setShowFlash(false), 200);

        const angle = CAPTURE_ANGLES[currentAngleIndex];
        const newPhoto: UserPhoto = {
          id: generateUUID(),
          dataUrl: photo.uri,
          timestamp: new Date().toISOString(),
          angle: angle.id,
        };

        const updatedPhotos = [...photos, newPhoto];
        setPhotos(updatedPhotos);

        if (currentAngleIndex < CAPTURE_ANGLES.length - 1) {
          setCurrentAngleIndex(prev => prev + 1);
          Speech.speak(`Ahora toma la foto ${angle.label.toLowerCase()}`, {
            language: 'es-ES',
            rate: 0.95,
          });
        } else {
          Speech.speak('Todas las fotos capturadas', {
            language: 'es-ES',
            rate: 0.95,
          });
          setTimeout(() => {
            onPhotosComplete(updatedPhotos);
          }, 2000);
        }
      } catch (error: any) {
        console.error('Error capturing photo:', error);
        toast.error('Error al capturar foto');
      } finally {
        setIsCapturing(false);
        setCountdown(null);
      }
    }, [currentAngleIndex, photos, onPhotosComplete, playBeep]);

    const handleCapture = useCallback(() => {
      if (isCapturing) return;
      setIsCapturing(true);
      setCountdown(3);

      const angle = CAPTURE_ANGLES[currentAngleIndex];
      Speech.speak(`Preparando captura ${angle.label.toLowerCase()}`, {
        language: 'es-ES',
        rate: 0.95,
      });
      playBeep();

      let count = 3;
      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
          Speech.speak(count === 2 ? 'Dos' : 'Uno', {
            language: 'es-ES',
            rate: 0.95,
          });
          playBeep();
        } else {
          clearInterval(interval);
          setCountdown(null);
          playBeep();
          capturePhoto();
        }
      }, 1000);
    }, [capturePhoto, isCapturing, currentAngleIndex, playBeep]);

    const loadFromGallery = useCallback(async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 0.9,
          selectionLimit: 3,
        });

        if (!result.canceled && result.assets.length > 0) {
          toast.info('Cargando imágenes...');
          const loadedPhotos: UserPhoto[] = result.assets.slice(0, 3).map((asset, index) => ({
            id: generateUUID(),
            dataUrl: asset.uri,
            timestamp: new Date().toISOString(),
            angle: (['front', 'side', 'back'] as const)[index] || 'front',
          }));

          setPhotos(loadedPhotos);
          toast.success(`${loadedPhotos.length} imagen(es) cargada(s)`);
          setTimeout(() => onPhotosComplete(loadedPhotos), 500);
        }
      } catch (error: any) {
        console.error('Error loading from gallery:', error);
        toast.error('Error al cargar imágenes');
      }
    }, [onPhotosComplete]);

    const retakePhoto = useCallback(() => {
      setPhotos(prev => prev.slice(0, -1));
      setCurrentAngleIndex(prev => Math.max(0, prev - 1));
    }, []);

    const toggleDetection = useCallback(() => {
      setDetectionEnabled(prev => !prev);
      Speech.speak(prev ? 'Detección desactivada' : 'Detección activada', {
        language: 'es-ES',
        rate: 0.95,
      });
    }, []);

    const currentAngle = CAPTURE_ANGLES[currentAngleIndex];

    if (!permission) {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Solicitando permisos de cámara...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Se necesitan permisos de cámara</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Conceder permisos</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Captura con Detección de Medidas</Text>
          <Text style={styles.subtitle}>
            {photos.length === 0
              ? 'Posiciónate en la zona marcada'
              : `Foto ${currentAngleIndex + 1} de ${CAPTURE_ANGLES.length}: ${currentAngle?.label}`}
          </Text>
        </View>

        <View style={styles.cameraContainer}>
          {cameraError ? (
            <View style={styles.errorContainer}>
              <Camera size={48} color={Colors.light.textSecondary} />
              <Text style={styles.errorText}>{cameraError}</Text>
              <TouchableOpacity style={styles.button} onPress={loadFromGallery}>
                <Upload size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Cargar Imágenes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
                mode="picture"
              />
              
              {showFlash && (
                <Animated.View
                  style={[
                    styles.flash,
                    {
                      opacity: flashAnim,
                    },
                  ]}
                />
              )}

              {countdown !== null && (
                <View style={styles.countdownContainer}>
                  <Animated.Text
                    style={[
                      styles.countdownText,
                      {
                        transform: [{ scale: countdownAnim }],
                      },
                    ]}
                  >
                    {countdown}
                  </Animated.Text>
                </View>
              )}

              <View style={styles.statusBar}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: detectionEnabled ? '#22c55e' : '#6b7280' },
                  ]}
                >
                  <Eye size={16} color="#FFFFFF" />
                  <Text style={styles.statusText}>
                    {detectionEnabled ? 'Detección ON' : 'Detección OFF'}
                  </Text>
                </View>
              </View>

              <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>{currentAngle?.instruction}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.thumbnailsContainer}>
          {CAPTURE_ANGLES.map((angle, index) => (
            <View
              key={angle.id}
              style={[
                styles.thumbnail,
                index < photos.length
                  ? styles.thumbnailComplete
                  : index === currentAngleIndex
                  ? styles.thumbnailActive
                  : styles.thumbnailPending,
              ]}
            >
              {index < photos.length ? (
                <Image source={{ uri: photos[index].dataUrl }} style={styles.thumbnailImage} />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <User size={24} color={index === currentAngleIndex ? '#FFFFFF' : '#9ca3af'} />
                  <Text style={styles.thumbnailLabel}>{angle.label}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.controlButton, detectionEnabled && styles.controlButtonActive]}
            onPress={toggleDetection}
          >
            <Eye size={20} color="#FFFFFF" />
            <Text style={styles.controlButtonText}>Detección</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, autoMode && styles.controlButtonActive]}
            onPress={() => setAutoMode(!autoMode)}
          >
            <Sparkles size={20} color="#FFFFFF" />
            <Text style={styles.controlButtonText}>Auto</Text>
          </TouchableOpacity>

          {photos.length > 0 && (
            <TouchableOpacity style={styles.controlButton} onPress={retakePhoto}>
              <RotateCcw size={20} color="#FFFFFF" />
              <Text style={styles.controlButtonText}>Repetir</Text>
            </TouchableOpacity>
          )}

          {!cameraError && (
            <TouchableOpacity
              style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
              onPress={handleCapture}
              disabled={isCapturing}
            >
              <Camera size={24} color="#000000" />
              <Text style={styles.captureButtonText}>
                {isCapturing ? 'Capturando...' : 'Capturar'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.controlButton} onPress={loadFromGallery}>
            <ImagePlus size={20} color="#FFFFFF" />
            <Text style={styles.controlButtonText}>Galería</Text>
          </TouchableOpacity>

          {photos.length >= 2 && (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => onPhotosComplete(photos)}
            >
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.continueButtonText}>Continuar</Text>
            </TouchableOpacity>
          )}
        </View>

        {onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Omitir y usar avatar genérico</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 16,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: '60%',
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.light.primary + '40',
  },
  camera: {
    flex: 1,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  countdownContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: Colors.light.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  statusBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: Colors.light.textSecondary,
    marginVertical: 16,
    textAlign: 'center',
  },
  thumbnailsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    justifyContent: 'center',
  },
  thumbnail: {
    width: 64,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  thumbnailComplete: {
    borderColor: '#22c55e',
    backgroundColor: '#22c55e20',
  },
  thumbnailActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF10',
  },
  thumbnailPending: {
    borderColor: '#6b7280',
    backgroundColor: '#1f2937',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  thumbnailLabel: {
    fontSize: 10,
    color: '#9ca3af',
  },
  controlsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  controlButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#22c55e',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  text: {
    color: Colors.light.text,
    fontSize: 16,
    textAlign: 'center',
  },
});
