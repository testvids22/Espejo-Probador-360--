import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Text, View, Platform } from "react-native";
import { AppProvider } from "@/contexts/AppContext";
import { VoiceProvider, useVoice } from "@/contexts/VoiceContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function AIProviderWrap({ children }: { children: React.ReactNode }) {
  const { AIProvider } = require("@/contexts/AIContext");
  return <AIProvider>{children}</AIProvider>;
}

SplashScreen.preventAutoHideAsync().catch(() => {});

// En web: mostrar algo ante cualquier error no capturado o promesa rechazada
if (typeof window !== 'undefined') {
  const showErrorOverlay = (msg: string) => {
    if (document.getElementById('expo-error-fallback')) return;
    const div = document.createElement('div');
    div.id = 'expo-error-fallback';
    div.style.cssText = 'position:fixed;inset:0;background:#0F0F1E;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:sans-serif;z-index:99999;';
    div.innerHTML = `<p style="font-size:18px;margin-bottom:16px;">${msg}</p><p style="font-size:14px;color:#888;margin-bottom:24px;">Abre F12 → Console para ver el error.</p><button onclick="location.reload()" style="padding:12px 24px;background:#6366F1;color:#fff;border:none;border-radius:8px;cursor:pointer;">Reintentar</button>`;
    document.body.appendChild(div);
  };
  window.addEventListener('error', (event) => {
    console.error('[App] Error no capturado:', event.error || event.message);
    showErrorOverlay('Algo falló al cargar la app.');
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[App] Promesa rechazada:', event.reason);
    showErrorOverlay('Error en la app (promesa rechazada).');
  });
}

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

  // En web: asegurar que html/body/root tengan altura para no ver pantalla en blanco
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
    document.body.style.overflow = 'hidden';
    const root = document.getElementById('root') ?? document.getElementById('expo-root') ?? document.body.firstElementChild;
    if (root) {
      (root as HTMLElement).style.height = '100%';
      (root as HTMLElement).style.minHeight = '100vh';
      (root as HTMLElement).style.display = 'flex';
    }
  }, []);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        console.log('[AppContent] Iniciando preparación de app (simplificada)...');
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('[AppContent] App lista');
        setAppIsReady(true);
      } catch (error: any) {
        console.error('[AppContent] Error preparing app:', error);
        setInitError(error?.message || 'Error desconocido');
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
    const loadingStyle = Platform.OS === 'web'
      ? { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: '#0F0F1E', minHeight: '100vh' }
      : { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: '#0F0F1E' };
    return (
      <View style={loadingStyle}>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18 }}>Cargando Espejo GV360º...</Text>
        {Platform.OS === 'web' && (
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8 }}>Si se queda en blanco, abre F12 → Console</Text>
        )}
      </View>
    );
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

// En web: primer frame sin providers para que siempre se pinte algo (evitar pantalla en blanco)
function WebFirstPaint({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1E', minHeight: '100vh' as any }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Cargando Espejo GV360º...</Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8 }}>Abre F12 → Console si se queda en blanco</Text>
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const content = (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AIProviderWrap>
          <VoiceProvider>
            <AppContent />
          </VoiceProvider>
        </AIProviderWrap>
      </AppProvider>
    </QueryClientProvider>
  );

  return (
    <ErrorBoundary>
      {Platform.OS === 'web' ? <WebFirstPaint>{content}</WebFirstPaint> : content}
    </ErrorBoundary>
  );
}
