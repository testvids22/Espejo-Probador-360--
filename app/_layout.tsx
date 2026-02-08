import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Text } from "react-native";
import { AppProvider } from "@/contexts/AppContext";
import { VoiceProvider, useVoice } from "@/contexts/VoiceContext";
import { AIProvider } from "@/contexts/AIContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function VoiceCommandsManager() {
  const router = useRouter();
  const voice = useVoice();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady || !voice) return;

    const { registerCommand, unregisterCommand } = voice;

    try {
      registerCommand('go-home', {
        patterns: ['inicio', 'ir a inicio', 'ir al inicio', 'home', 'principal', 'página principal'],
        action: () => {
          console.log('Navigating to home');
          router.push('/(tabs)/home');
        },
        description: 'Ir a inicio',
      });

      registerCommand('go-scanner', {
        patterns: ['escáner', 'escaneando', 'ir a escáner', 'ir al escáner', 'scanner', 'abrir escáner', 'abrir scanner'],
        action: () => {
          console.log('Navigating to scanner');
          router.push('/(tabs)/scanner');
        },
        description: 'Ir a escáner',
      });

      registerCommand('go-catalog', {
        patterns: ['catálogo', 'ir al catálogo', 'ir a catálogo', 'catalog', 'elegir marca', 'elegir modelo', 'elegir ropa', 'elegir marca modelo de ropa'],
        action: () => {
          console.log('Navigating to catalog');
          router.push('/(tabs)/catalog');
        },
        description: 'Ir al catálogo',
      });

      registerCommand('go-profile', {
        patterns: ['perfil', 'ir al perfil', 'ir a perfil', 'mi perfil', 'profile', 'abrir perfil'],
        action: () => {
          console.log('Navigating to profile');
          router.push('/(tabs)/profile');
        },
        description: 'Ir a perfil',
      });

      registerCommand('go-mirror', {
        patterns: ['espejo', 'ir al espejo', 'ir a espejo', 'mirror', 'probador', 'abrir espejo'],
        action: () => {
          console.log('Navigating to mirror');
          router.push('/(tabs)/mirror');
        },
        description: 'Ir a espejo virtual',
      });

      registerCommand('go-size-detector', {
        patterns: ['detector de talla', 'detector de tallas', 'ir al detector', 'detector', 'tallas', 'medidas'],
        action: () => {
          console.log('Navigating to size detector');
          router.push('/(tabs)/size-detector');
        },
        description: 'Ir al detector de tallas',
      });
    } catch (error) {
      console.error('Error registering voice commands:', error);
    }

    return () => {
      try {
        unregisterCommand('go-home');
        unregisterCommand('go-scanner');
        unregisterCommand('go-catalog');
        unregisterCommand('go-profile');
        unregisterCommand('go-mirror');
        unregisterCommand('go-size-detector');
      } catch (error) {
        console.error('Error unregistering voice commands:', error);
      }
    };
  }, [voice, router, isReady]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="webview" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function AppContent() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        console.log('[AppContent] Iniciando preparación de app (simplificada)...');
        // SIMPLIFICADO: Reducir tiempo de espera para arranque rápido
        await new Promise(resolve => setTimeout(resolve, 1000)); // Reducido a 1 segundo
        console.log('[AppContent] App lista');
        setAppIsReady(true);
      } catch (error: any) {
        console.error('[AppContent] Error preparing app:', error);
        setInitError(error?.message || 'Error desconocido');
        // Continuar aunque haya error para mostrar el error
        setAppIsReady(true);
      }
    };

    prepareApp();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      const hideSplash = async () => {
        try {
          console.log('[AppContent] Ocultando splash screen...');
          // Esperar un poco más antes de ocultar
          await new Promise(resolve => setTimeout(resolve, 500));
          await SplashScreen.hideAsync();
          console.log('[AppContent] Splash screen ocultado');
        } catch (error) {
          console.log('[AppContent] Splash screen already hidden:', error);
        }
      };
      hideSplash();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null; // Mantener splash screen visible
  }

  if (initError) {
    // Mostrar error si hay problema de inicialización
    console.error('[AppContent] Error de inicialización:', initError);
    return (
      <GestureHandlerRootView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff', padding: 20, textAlign: 'center', fontSize: 16 }}>
          Error de inicialización:{'\n'}{initError}
        </Text>
        <Text style={{ color: '#888', padding: 20, textAlign: 'center', fontSize: 12, marginTop: 20 }}>
          Revisa los logs para más detalles
        </Text>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootLayoutNav />
      <VoiceCommandsManager />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <AIProvider>
            <VoiceProvider>
              <AppContent />
            </VoiceProvider>
          </AIProvider>
        </AppProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
