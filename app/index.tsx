import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, Platform, AppState, AppStateStatus } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles, Scan, Shirt, Smartphone } from "lucide-react-native";
import BootVideo360 from "@/components/BootVideo360";
import { useApp } from "@/contexts/AppContext";
import { requestAllWebPermissions } from "@/utils/webPermissions";
import { useNativeDriver } from "@/utils/animated";

// Fallback para LinearGradient si falla la carga
const GradientWrapper = ({ colors, style, start, end, children }: any) => {
  try {
    if (LinearGradient && typeof LinearGradient === 'function') {
      return (
        <LinearGradient colors={colors} style={style} start={start} end={end}>
          {children}
        </LinearGradient>
      );
    }
  } catch (error) {
    console.warn('LinearGradient no disponible, usando fallback:', error);
  }
  
  // Fallback: View con color sólido
  return (
    <View style={[style, { backgroundColor: colors[0] || '#0F0F1E' }]}>
      {children}
    </View>
  );
};

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { closeSessionAndClearAll, clearAllProfileData } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const qrFadeAnim = useRef(new Animated.Value(0)).current;
  const [showScreensaver, setShowScreensaver] = useState(false);
  const [expoUrl, setExpoUrl] = useState<string>('');
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null); // Timer para borrar datos después de 5 min
  const [isReady, setIsReady] = useState(false);
  const [showBootVideo, setShowBootVideo] = useState(true); // Mostrar video boot al inicio
  const [bootVideoFinished, setBootVideoFinished] = useState(false);
  const lastActivityTime = useRef<number>(Date.now());

  // Solicitar todos los permisos del navegador por defecto al iniciar
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Pequeño delay para asegurar que el navegador está listo
      const timer = setTimeout(() => {
        requestAllWebPermissions().catch(console.error);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Manejar cierre de app y limpieza de datos
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App en segundo plano: iniciar timer de 5 minutos para borrar datos
        console.log('[INDEX] App en segundo plano, iniciando timer de limpieza (5 minutos)');
        dataClearTimer.current = setTimeout(async () => {
          try {
            console.log('[INDEX] Borrando datos después de 5 minutos en segundo plano');
            // Usar closeSessionAndClearAll para borrar TODO al cerrar completamente
            await closeSessionAndClearAll();
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              localStorage.removeItem('espejo_authenticated');
              localStorage.removeItem('espejo_terms_accepted');
              localStorage.removeItem('espejo_gdpr_accepted');
            }
          } catch (error) {
            console.error('[INDEX] Error al borrar datos en segundo plano:', error);
          }
        }, 300000); // 5 minutos
      } else if (nextAppState === 'active') {
        // App vuelve a primer plano: cancelar timer
        if (dataClearTimer.current) {
          clearTimeout(dataClearTimer.current);
          dataClearTimer.current = null;
        }
        lastActivityTime.current = Date.now();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      if (dataClearTimer.current) clearTimeout(dataClearTimer.current);
    };
  }, [clearAllProfileData]);

  // Después del boot video, inicializar app
  useEffect(() => {
    if (bootVideoFinished) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 500); // Pequeño delay después del video
      return () => clearTimeout(timer);
    }
  }, [bootVideoFinished]);

  useEffect(() => {
    if (!isReady) return;

    // Verificar autenticación y términos
    // SIEMPRE pasar por consentimiento si no hay sesión activa
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const currentUrl = window.location.href;
      setExpoUrl(currentUrl);
      const authenticated = localStorage.getItem('espejo_authenticated') === 'true';
      const termsAccepted = localStorage.getItem('espejo_terms_accepted') === 'true';
      const gdprConsent = localStorage.getItem('espejo_gdpr_accepted') === 'true';
      
      // Si no hay autenticación o consentimientos, ir a login
      if (!authenticated || !termsAccepted || !gdprConsent) {
        const timer = setTimeout(() => {
          router.replace('/login');
        }, 500);
        return () => clearTimeout(timer);
      }
      
      // Si todo está OK, ir a home
      const timer = setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // En móvil, verificar AsyncStorage
      const checkSession = async () => {
        try {
          const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
          const termsAccepted = await AsyncStorage.getItem('espejo_terms_accepted');
          const gdprConsent = await AsyncStorage.getItem('espejo_gdpr_accepted');
          
          // Si no hay consentimientos, ir a login
          if (termsAccepted !== 'true' || gdprConsent !== 'true') {
            router.replace('/login');
          } else {
            // Si todo está OK, ir a home
            router.replace('/(tabs)/home');
          }
        } catch (error) {
          console.error('[INDEX] Error checking session:', error);
          router.replace('/login');
        }
      };
      checkSession();
    }
  }, [isReady, router]);

  useEffect(() => {
    // Animaciones solo si no está en boot video
    if (!showBootVideo && !showScreensaver) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver,
        }),
      ]).start();

      Animated.loop(
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 3000,
          useNativeDriver,
        })
      ).start();

      setTimeout(() => {
        Animated.timing(qrFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver,
        }).start();
      }, 1000);
    }

    let activationTimer: ReturnType<typeof setTimeout> | null = null;
    
    // Redirigir después de inicializar (solo si no está en boot video)
    if (isReady && !showBootVideo && Platform.OS !== 'web') {
      activationTimer = setTimeout(() => {
        console.log('[INDEX] Redirecting to home...');
        try {
          router.replace('/(tabs)/home');
        } catch (error) {
          console.error('[INDEX] Error navigating to home:', error);
        }
      }, 2000);
    }

    // Screensaver: activar después de 5 minutos (300000ms) de inactividad
    const startScreensaver = async () => {
      if (isReady && !showBootVideo) {
        console.log('[INDEX] Activando screensaver después de 5 minutos de inactividad');
        
        // Borrar todos los datos del usuario antes de activar screensaver
        try {
          console.log('[INDEX] Borrando datos del usuario (5 minutos de inactividad)');
          await closeSessionAndClearAll();
          
          // Limpiar localStorage en web
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            localStorage.removeItem('espejo_authenticated');
            localStorage.removeItem('espejo_terms_accepted');
            localStorage.removeItem('espejo_gdpr_accepted');
          }
        } catch (error) {
          console.error('[INDEX] Error al borrar datos:', error);
        }
        
        setShowScreensaver(true);
      }
    };

    inactivityTimer.current = setTimeout(startScreensaver, 300000); // 5 minutos = 300000ms

    return () => {
      if (activationTimer) clearTimeout(activationTimer);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (dataClearTimer.current) clearTimeout(dataClearTimer.current);
    };
  }, [fadeAnim, logoRotate, router, scaleAnim, qrFadeAnim, isReady, showBootVideo, clearAllProfileData]);

  const handleUserActivity = useCallback(() => {
    if (!isReady) return;
    
    // Actualizar tiempo de última actividad
    lastActivityTime.current = Date.now();
    
    // Resetear timers de inactividad
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (dataClearTimer.current) clearTimeout(dataClearTimer.current);
    
    if (showScreensaver) {
      // Ocultar screensaver al tocar y volver al inicio
      setShowScreensaver(false);
      // Reiniciar timers
      inactivityTimer.current = setTimeout(() => {
        const startScreensaver = async () => {
          try {
            await clearAllProfileData();
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              localStorage.removeItem('espejo_authenticated');
              localStorage.removeItem('espejo_terms_accepted');
              localStorage.removeItem('espejo_gdpr_accepted');
            }
            setShowScreensaver(true);
          } catch (error) {
            console.error('[INDEX] Error al borrar datos:', error);
            setShowScreensaver(true);
          }
        };
        startScreensaver();
      }, 300000); // 5 minutos
    } else {
      console.log('User tap - redirecting to application');
      router.replace("/(tabs)/home");
    }
  }, [isReady, showScreensaver, router, clearAllProfileData]);

  const handleBootVideoFinish = () => {
    console.log('[INDEX] Boot video finished');
    setShowBootVideo(false);
    setBootVideoFinished(true);
  };

  const rotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Boot video inicial
  if (showBootVideo) {
    return (
      <BootVideo360
        visible={showBootVideo}
        onFinish={handleBootVideoFinish}
        isScreensaver={false}
      />
    );
  }

  // Screensaver con video
  if (showScreensaver) {
    return (
      <TouchableOpacity 
        style={styles.container} 
        activeOpacity={1}
        onPress={handleUserActivity}
      >
        <BootVideo360
          visible={showScreensaver}
          onFinish={() => {
            // En screensaver, el video hace loop, solo se oculta al tocar
            setShowScreensaver(false);
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            inactivityTimer.current = setTimeout(() => setShowScreensaver(true), 300000); // 5 minutos
          }}
          isScreensaver={true}
        />
      </TouchableOpacity>
    );
  }

  // Pantalla de bienvenida normal (fallback si no hay video)
  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={1}
      onPress={handleUserActivity}
    >
      <GradientWrapper
        colors={["#0F0F1E", "#1A1A3E", "#2D1B4E", "#1A1A3E", "#0F0F1E"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <View style={styles.logoContainer}>
              <Sparkles size={120} color="rgba(167, 139, 250, 0.6)" strokeWidth={2} />
            </View>
          </Animated.View>
          
          <Text style={styles.title}>VIRTUAL MIRROR</Text>
          <Text style={styles.subtitle}>GV360º</Text>
          <View style={styles.divider} />
          <Text style={styles.tagline}>Espejo Probador Virtual</Text>
          
          <Animated.View style={[styles.qrContainer, { opacity: qrFadeAnim }]}>
            {Platform.OS === 'web' && expoUrl && (
              <View style={styles.qrCodeContainer}>
                <Text style={styles.qrLabel}>Escanea para conectar</Text>
                <Text style={styles.qrUrl} numberOfLines={1} ellipsizeMode="middle">
                  {expoUrl}
                </Text>
              </View>
            )}
          </Animated.View>
          
          <View style={styles.features}>
            <View style={styles.feature}>
              <Scan size={24} color="rgba(167, 139, 250, 0.8)" />
              <Text style={styles.featureText}>Escáner</Text>
            </View>
            <View style={styles.feature}>
              <Shirt size={24} color="rgba(167, 139, 250, 0.8)" />
              <Text style={styles.featureText}>Catálogo</Text>
            </View>
            <View style={styles.feature}>
              <Smartphone size={24} color="rgba(167, 139, 250, 0.8)" />
              <Text style={styles.featureText}>Espejo</Text>
            </View>
          </View>
          
          <Text style={styles.hint}>Toca para comenzar</Text>
        </Animated.View>
      </GradientWrapper>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 600,
  },
  logoContainer: {
    marginBottom: 40,
    padding: 20,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  title: {
    fontSize: 42,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 4,
    marginBottom: 8,
    textShadowColor: 'rgba(167, 139, 250, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#A78BFA',
    letterSpacing: 8,
    marginBottom: 24,
    textShadowColor: 'rgba(167, 139, 250, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  divider: {
    width: 150,
    height: 4,
    backgroundColor: '#A78BFA',
    marginBottom: 32,
    borderRadius: 2,
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 2,
    marginBottom: 48,
    textTransform: 'uppercase' as const,
  },
  qrContainer: {
    marginVertical: 20,
    alignItems: 'center',
    maxWidth: Platform.OS === 'web' ? 400 : width - 64,
  },
  qrCodeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  qrLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  qrUrl: {
    fontSize: 12,
    color: '#A78BFA',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'monospace',
  },
  features: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 32,
    marginBottom: 48,
  },
  feature: {
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500' as const,
  },
  hint: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    fontStyle: 'italic',
  },
});
