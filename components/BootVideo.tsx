import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  Text,
  Platform,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Sparkles } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Vídeo de boot (6 s, con sonido): boot-video.mp4. En web se usa /boot-video.mp4 desde public/ para que el navegador lo cargue.
const DEFAULT_BOOT_VIDEO_MODULE = require('@/assets/videos/boot-video.mp4');
const WEB_BOOT_VIDEO_URI = '/boot-video.mp4';

type BootVideoProps = {
  visible: boolean;
  onFinish: () => void;
  /** URI remota del vídeo (ej. https://...) */
  videoUri?: string;
  /** Vídeo local por require (tiene prioridad si se pasa) */
  videoSource?: number;
};

export default function BootVideo({ visible, onFinish, videoUri, videoSource }: BootVideoProps) {
  const videoRef = useRef<Video>(null);
  const [, setIsPlaying] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  const source = videoSource ?? (videoUri ? { uri: videoUri } : (Platform.OS === 'web' ? { uri: WEB_BOOT_VIDEO_URI } : DEFAULT_BOOT_VIDEO_MODULE));
  const hasVideo = !!videoSource || !!videoUri || !!DEFAULT_BOOT_VIDEO_MODULE || (Platform.OS === 'web' && WEB_BOOT_VIDEO_URI);

  const startFallbackAnimation = useCallback(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 800,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setIsPlaying(false);
        onFinish();
      });
    }, 6000);

    return () => clearTimeout(timer);
  }, [logoScale, logoRotate, textOpacity, fadeAnim, onFinish]);

  const playVideo = useCallback(async () => {
    try {
      if (videoRef.current) {
        await videoRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing boot video:', error);
      setShowFallback(true);
      startFallbackAnimation();
    }
  }, [startFallbackAnimation]);

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(1);
      logoScale.setValue(0.5);
      logoRotate.setValue(0);
      textOpacity.setValue(0);
      if (!hasVideo) {
        setShowFallback(true);
        startFallbackAnimation();
      } else {
        setShowFallback(false);
        playVideo();
      }
    }
  }, [visible, hasVideo, fadeAnim, logoScale, logoRotate, textOpacity, startFallbackAnimation, playVideo]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (status.didJustFinish) {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setIsPlaying(false);
          onFinish();
        });
      }
    } else if (status.error) {
      console.error('Video playback error:', status.error);
      setShowFallback(true);
    }
  }, [fadeAnim, onFinish]);

  const handleFinish = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setIsPlaying(false);
      onFinish();
    });
  }, [fadeAnim, onFinish]);

  const handleSkip = () => {
    if (videoRef.current) {
      videoRef.current.stopAsync();
    }
    handleFinish();
  };

  const rotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity 
        style={styles.touchArea} 
        activeOpacity={1} 
        onPress={handleSkip}
      >
        {!showFallback && hasVideo ? (
          <Video
            ref={videoRef}
            source={source}
            style={[styles.video, Platform.OS === 'web' && styles.videoWeb]}
            videoStyle={Platform.OS === 'web' ? { position: 'relative' as const, width, height } : undefined}
            resizeMode={ResizeMode.COVER}
            shouldPlay={visible}
            isLooping={false}
            isMuted={false}
            volume={1.0}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={(error) => {
              console.error('Video error:', error);
              setShowFallback(true);
              startFallbackAnimation();
            }}
          />
        ) : (
          <View style={styles.fallbackContainer}>
            <View style={styles.gradientOverlay}>
              <View style={styles.gradientTop} />
              <View style={styles.gradientMiddle} />
              <View style={styles.gradientBottom} />
            </View>
            
            <Animated.View 
              style={[
                styles.logoContainer,
                { 
                  transform: [
                    { scale: logoScale },
                    { rotate: rotateInterpolate }
                  ] 
                }
              ]}
            >
              <View style={styles.logoOuter}>
                <View style={styles.logoInner}>
                  <Sparkles size={60} color="#FFFFFF" strokeWidth={2} />
                </View>
              </View>
            </Animated.View>
            
            <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
              <Text style={styles.title}>VIRTUAL MIRROR</Text>
              <Text style={styles.subtitle}>GV360º</Text>
              <View style={styles.divider} />
              <Text style={styles.tagline}>Espejo Probador Virtual</Text>
            </Animated.View>
            
            <View style={styles.particlesContainer}>
              {[...Array(20)].map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.particle,
                    {
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      width: 2 + Math.random() * 4,
                      height: 2 + Math.random() * 4,
                      opacity: 0.3 + Math.random() * 0.5,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}
        
        <View style={styles.skipHint}>
          <Text style={styles.skipText}>Toca para saltar</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: '#000000',
  },
  touchArea: {
    flex: 1,
  },
  video: {
    width: width,
    height: height,
  },
  videoWeb: {
    position: 'relative',
    width,
    height,
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#0F0F1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#1A1A3E',
    opacity: 0.6,
  },
  gradientMiddle: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#2D1B4E',
    opacity: 0.4,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#0F0F1E',
    opacity: 0.8,
  },
  logoContainer: {
    marginBottom: 40,
    zIndex: 2,
  },
  logoOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(99, 102, 241, 0.5)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  logoInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    zIndex: 2,
  },
  title: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 4,
    textShadowColor: 'rgba(99, 102, 241, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#A78BFA',
    letterSpacing: 8,
    marginTop: 8,
    textShadowColor: 'rgba(167, 139, 250, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  divider: {
    width: 120,
    height: 3,
    backgroundColor: '#6366F1',
    marginVertical: 24,
    borderRadius: 2,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#C4B5FD',
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#A78BFA',
    borderRadius: 10,
  },
  skipHint: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
  },
});
