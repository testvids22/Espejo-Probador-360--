import { StyleSheet, Text, View, TouchableOpacity, Animated, ScrollView, Platform, Alert } from "react-native";
import { Image } from "expo-image";
import { Sparkles, Scan, CheckCircle, XCircle, Shirt, Mic, MicOff } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useRef, useEffect, useCallback, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { useApp } from "@/contexts/AppContext";
import { useVoice } from "@/contexts/VoiceContext";
import VoiceCommandsBanner from "@/components/VoiceCommandsBanner";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LogOut } from "lucide-react-native";

const WELCOME_SHOWN_KEY = '@welcome_voice_shown';

export default function HomeScreen() {
  const router = useRouter();
  const { scanData, recentTriedItems, favorites } = useApp();
  const { isListening, startListening, stopListening, isSupported, registerCommand, unregisterCommand, speak } = useVoice();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(true);
  const welcomeSpokenRef = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, slideAnim]);

  // Check if welcome message has been shown
  useEffect(() => {
    const checkWelcome = async () => {
      try {
        const shown = await AsyncStorage.getItem(WELCOME_SHOWN_KEY);
        if (!shown) {
          setHasShownWelcome(false);
        }
      } catch (error) {
        console.log('Error checking welcome status:', error);
      }
    };
    checkWelcome();
  }, []);

  // Speak welcome message when mic is first activated
  useEffect(() => {
    if (isListening && !hasShownWelcome && !welcomeSpokenRef.current) {
      welcomeSpokenRef.current = true;
      const saveWelcomeShown = async () => {
        try {
          await AsyncStorage.setItem(WELCOME_SHOWN_KEY, 'true');
          setHasShownWelcome(true);
        } catch (error) {
          console.log('Error saving welcome status:', error);
        }
      };
      
      setTimeout(() => {
        speak('Escuchando comandos de voz. El espejo ya funciona por comandos vocales. Verás los comandos disponibles en cada pestaña.');
        saveWelcomeShown();
      }, 500);
    }
  }, [isListening, hasShownWelcome, speak]);

  useFocusEffect(
    useCallback(() => {
      const scrollUpId = `scroll-up-home-${Date.now()}`;
      const scrollDownId = `scroll-down-home-${Date.now()}`;
      const goToScannerId = `go-to-scanner-${Date.now()}`;
      const goToCatalogId = `go-to-catalog-${Date.now()}`;
      const goToMirrorId = `go-to-mirror-${Date.now()}`;
      const goToProfileId = `go-to-profile-${Date.now()}`;

      registerCommand(scrollUpId, {
        patterns: ['subir', 'arriba', 'scroll arriba', 'desplazar arriba'],
        action: () => {
          console.log('Home: Scrolling up');
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        },
        description: 'subiendo',
      });

      registerCommand(scrollDownId, {
        patterns: ['bajar', 'abajo', 'scroll abajo', 'desplazar abajo'],
        action: () => {
          console.log('Home: Scrolling down');
          scrollViewRef.current?.scrollToEnd({ animated: true });
        },
        description: 'bajando',
      });

      registerCommand(goToScannerId, {
        patterns: ['escanear', 'ir al escáner', 'ir al escaner', 'comenzar escaneo', 'iniciar escaneo', 'escaner', 'escáner'],
        action: () => {
          console.log('Home: Navigating to scanner');
          speak('Abriendo el escáner corporal');
          router.push('/(tabs)/scanner');
        },
        description: 'abriendo escáner',
      });

      registerCommand(goToCatalogId, {
        patterns: ['catálogo', 'catalogo', 'ir al catálogo', 'ir al catalogo', 'ver catálogo', 'ver catalogo', 'ver ropa'],
        action: () => {
          console.log('Home: Navigating to catalog');
          speak('Abriendo el catálogo de prendas');
          router.push('/(tabs)/catalog');
        },
        description: 'abriendo catálogo',
      });

      registerCommand(goToMirrorId, {
        patterns: ['espejo', 'ir al espejo', 'ver espejo', 'abrir espejo'],
        action: () => {
          console.log('Home: Navigating to mirror');
          speak('Abriendo el espejo probador');
          router.push('/(tabs)/mirror');
        },
        description: 'abriendo espejo',
      });

      registerCommand(goToProfileId, {
        patterns: ['perfil', 'ir al perfil', 'ver perfil', 'mi perfil'],
        action: () => {
          console.log('Home: Navigating to profile');
          speak('Abriendo tu perfil');
          router.push('/(tabs)/profile');
        },
        description: 'abriendo perfil',
      });

      return () => {
        unregisterCommand(scrollUpId);
        unregisterCommand(scrollDownId);
        unregisterCommand(goToScannerId);
        unregisterCommand(goToCatalogId);
        unregisterCommand(goToMirrorId);
        unregisterCommand(goToProfileId);
      };
    }, [registerCommand, unregisterCommand, router, speak])
  );

  const toggleVoiceCommands = useCallback(() => {
    if (isListening) {
      stopListening();
      speak('Micrófono desactivado');
    } else {
      startListening();
      if (hasShownWelcome) {
        speak('Escuchando comandos de voz');
      }
    }
  }, [isListening, stopListening, startListening, speak, hasShownWelcome]);

  return (
    <ScrollView ref={scrollViewRef} style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Botón para ir a perfil (donde está el botón de cerrar sesión) */}
        <View style={styles.closeSessionContainer}>
          <TouchableOpacity 
            style={styles.closeSessionButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <LogOut size={20} color={Colors.light.text} />
            <Text style={styles.closeSessionText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={[
              styles.micButton, 
              isListening && styles.micButtonActive,
              !isSupported && styles.micButtonDisabled
            ]}
            onPress={isSupported ? toggleVoiceCommands : () => {
              if (Platform.OS !== 'web') {
                Alert.alert('No disponible', 'El reconocimiento de voz no está disponible en este dispositivo');
              } else {
                alert('El reconocimiento de voz no está disponible en este navegador');
              }
            }}
          >
            {isListening ? (
              <MicOff size={24} color="#FFFFFF" />
            ) : (
              <Mic size={24} color={isSupported ? "#FFFFFF" : "#9CA3AF"} />
            )}
          </TouchableOpacity>
        </View>
        <Animated.View style={[styles.iconContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Sparkles size={80} color={Colors.light.primary} />
        </Animated.View>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.title}>Espejo Probador Virtual{"\n"}de Ropa GV360º</Text>
          <Text style={styles.subtitle}>Prueba ropa de forma virtual con tecnología 3D avanzada</Text>
        </Animated.View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Estado del Perfil</Text>
            {scanData?.completed ? (
              <View style={styles.statusBadge}>
                <CheckCircle size={16} color="#10B981" />
                <Text style={styles.statusBadgeText}>Completo</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.statusBadgePending]}>
                <XCircle size={16} color="#EF4444" />
                <Text style={styles.statusBadgeText}>Pendiente</Text>
              </View>
            )}
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{recentTriedItems.length}</Text>
              <Text style={styles.statLabel}>Probadas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{favorites.length}</Text>
              <Text style={styles.statLabel}>Favoritos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{scanData?.completed ? '2' : '0'}</Text>
              <Text style={styles.statLabel}>Fotos</Text>
            </View>
          </View>
        </View>

        {recentTriedItems.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Últimas Prendas Probadas</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                <Text style={styles.seeAllText}>Ver todas</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentList}>
              {recentTriedItems.map((tried) => (
                <TouchableOpacity 
                  key={tried.item.id} 
                  style={styles.recentCard}
                  onPress={() => router.push('/(tabs)/catalog')}
                >
                  <Image 
                    source={{ uri: tried.item.image }}
                    style={styles.recentImage}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                  />
                  <Text style={styles.recentBrand} numberOfLines={1}>{tried.item.brand}</Text>
                  <Text style={styles.recentName} numberOfLines={1}>{tried.item.name}</Text>
                  <Text style={styles.recentPrice}>{tried.item.price.toFixed(2)}€</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📸</Text>
            <Text style={styles.featureText}>Escaneo rápido con 2 fotos</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>👗</Text>
            <Text style={styles.featureText}>Catálogo de marcas exclusivas</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🪞</Text>
            <Text style={styles.featureText}>Prueba virtual en tiempo real</Text>
          </View>
        </View>
        
        <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.push('/(tabs)/scanner')}
            activeOpacity={0.8}
          >
            <Scan size={24} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {scanData?.completed ? 'Actualizar Escaneo' : 'Comenzar Escaneo'}
            </Text>
          </TouchableOpacity>
          
          {scanData?.completed && (
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => router.push('/(tabs)/catalog')}
              activeOpacity={0.8}
            >
              <Shirt size={24} color={Colors.light.primary} />
              <Text style={styles.secondaryButtonText}>Explorar Catálogo</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
        
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.instruction}>o explora las funciones disponibles</Text>
        </Animated.View>
        <View style={styles.bannerSpacer} />
      </View>
      <VoiceCommandsBanner screen="home" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 24,
  },
  iconContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold" as const,
    color: Colors.light.text,
    textAlign: "center",
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 16,
  },
  featuresContainer: {
    width: "100%",
    gap: 16,
    marginVertical: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    padding: 16,
    borderRadius: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.light.text,
    flex: 1,
  },
  buttonContainer: {
    width: "100%",
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold" as const,
  },
  instruction: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  statusCard: {
    width: "100%",
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginVertical: 24,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "bold" as const,
    color: Colors.light.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgePending: {
    backgroundColor: "#FEE2E2",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold" as const,
    color: Colors.light.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.light.border,
  },
  recentSection: {
    width: "100%",
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: Colors.light.text,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.primary,
  },
  closeSessionContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'flex-end',
  },
  closeSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  closeSessionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  recentList: {
    marginHorizontal: -32,
    paddingHorizontal: 32,
  },
  recentCard: {
    width: 140,
    marginRight: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  recentImage: {
    width: "100%",
    height: 160,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  recentBrand: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 8,
    marginHorizontal: 8,
  },
  recentName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.text,
    marginHorizontal: 8,
    marginTop: 2,
  },
  recentPrice: {
    fontSize: 16,
    fontWeight: "bold" as const,
    color: Colors.light.primary,
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  secondaryButton: {
    backgroundColor: Colors.light.background,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: Colors.light.primary,
    fontSize: 18,
    fontWeight: "bold" as const,
  },
  topBar: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingTop: 60,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  micButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  micButtonDisabled: {
    backgroundColor: 'rgba(100, 100, 100, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.5,
  },
  bannerSpacer: {
    height: 40,
  },
});
