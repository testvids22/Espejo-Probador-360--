// lib/api-keys-expo.ts
// Gestión de API keys para Expo (React Native)
// Adaptado de api-keys-capacitor.ts para usar AsyncStorage en lugar de Capacitor Preferences

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// En web, también intentar leer desde document si está disponible
declare global {
  interface Window {
    __ENV__?: {
      EXPO_PUBLIC_FAL_KEY?: string;
      EXPO_PUBLIC_REPLICATE_API_TOKEN?: string;
    };
  }
}

const API_CONFIG_KEY = 'smart-mirror-api-config';

// API Keys por defecto (se incluyen en la build)
// NOTA: Las keys reales se configuran en Vercel como variables de entorno
const DEFAULT_API_KEYS = {
  FAL_KEY: process.env.EXPO_PUBLIC_FAL_KEY || '[CONFIGURAR_EN_VERCEL]',
  REPLICATE_API_TOKEN: process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN || '[CONFIGURAR_EN_VERCEL]',
};

/**
 * Obtiene las API keys según la plataforma
 */
export async function getApiKeysForExpo(): Promise<{
  FAL_KEY: string;
  REPLICATE_API_TOKEN: string;
}> {
  try {
    // 1. Intentar leer de AsyncStorage (si el usuario las configuró)
    const savedConfig = await AsyncStorage.getItem(API_CONFIG_KEY);
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      if (parsed.FAL_KEY && parsed.FAL_KEY.length > 20) {
        console.log('[API Keys] Usando keys de AsyncStorage');
        return {
          FAL_KEY: parsed.FAL_KEY,
          REPLICATE_API_TOKEN: (parsed.REPLICATE_API_TOKEN && parsed.REPLICATE_API_TOKEN !== '[CONFIGURAR_EN_VERCEL]') ? parsed.REPLICATE_API_TOKEN : (process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN || '[NO_CONFIGURADO]'),
        };
      }
    }

    // 2. Intentar leer de variables de entorno (Vercel/Expo/.env.local)
    // En web, process.env se reemplaza en build time por Expo/Vercel
    // En Vercel, las variables EXPO_PUBLIC_* se inyectan durante el build
    // También intentar leer desde window.__ENV__ si está disponible (algunos bundlers)
    let envFalKey: string | undefined;
    let envReplicateToken: string | undefined;
    
    // Método 1: process.env (funciona en build time con Expo)
    if (typeof process !== 'undefined' && process.env) {
      envFalKey = process.env.EXPO_PUBLIC_FAL_KEY;
      envReplicateToken = process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN;
    }
    
    // Método 2: window.__ENV__ (algunos bundlers inyectan aquí)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const windowEnv = window.__ENV__;
      if (windowEnv) {
        envFalKey = envFalKey || windowEnv.EXPO_PUBLIC_FAL_KEY;
        envReplicateToken = envReplicateToken || windowEnv.EXPO_PUBLIC_REPLICATE_API_TOKEN;
      }
      
      // Método 3: Intentar leer desde el HTML (si se inyectó como script)
      try {
        if (typeof document !== 'undefined') {
          const envScript = document.querySelector('script[data-env]');
          if (envScript) {
            const envData = JSON.parse(envScript.getAttribute('data-env') || '{}');
            envFalKey = envFalKey || envData.EXPO_PUBLIC_FAL_KEY;
            envReplicateToken = envReplicateToken || envData.EXPO_PUBLIC_REPLICATE_API_TOKEN;
          }
        }
      } catch (e) {
        // Ignorar errores de parsing
        console.warn('[API Keys] Error leyendo env desde HTML:', e);
      }
    }
    
    console.log('[API Keys] ========================================');
    console.log('[API Keys] Verificando variables de entorno...');
    console.log('[API Keys] Platform:', Platform.OS);
    console.log('[API Keys] process.env existe:', typeof process !== 'undefined' && !!process.env);
    console.log('[API Keys] EXPO_PUBLIC_FAL_KEY existe:', !!envFalKey);
    console.log('[API Keys] EXPO_PUBLIC_FAL_KEY tipo:', typeof envFalKey);
    console.log('[API Keys] EXPO_PUBLIC_FAL_KEY longitud:', envFalKey ? envFalKey.length : 0);
    console.log('[API Keys] EXPO_PUBLIC_FAL_KEY valor (primeros 10):', envFalKey ? `${envFalKey.substring(0, 10)}...` : 'NO CONFIGURADA');
    console.log('[API Keys] EXPO_PUBLIC_FAL_KEY valor completo:', envFalKey || 'NO CONFIGURADA');
    
    // Verificar que la key no sea un placeholder
    if (envFalKey && 
        envFalKey !== '[CONFIGURAR_EN_VERCEL]' && 
        envFalKey !== 'TU_FAL_KEY_AQUI' &&
        envFalKey !== '[CONFIGURAR_EN_VERCEL]' &&
        envFalKey.length > 20) { // Las API keys de FAL suelen tener más de 20 caracteres
      console.log('[API Keys] ✅ Usando keys de variables de entorno (.env.local o Vercel)');
      console.log('[API Keys] ========================================');
      return {
        FAL_KEY: envFalKey.trim(), // Limpiar espacios
        REPLICATE_API_TOKEN: (envReplicateToken && envReplicateToken !== '[CONFIGURAR_EN_VERCEL]') ? envReplicateToken.trim() : '[NO_CONFIGURADO]',
      };
    }
    
    console.log('[API Keys] ⚠️ API Key no válida o no configurada');
    console.log('[API Keys] Valor recibido:', envFalKey || 'undefined');
    console.log('[API Keys] ========================================');

    // 3. Usar defaults (hardcodeadas en el código o placeholders)
    console.log('[API Keys] Usando keys por defecto (configurar en Vercel)');
    return DEFAULT_API_KEYS;
  } catch (error) {
    console.error('Error leyendo API keys:', error);
    return DEFAULT_API_KEYS;
  }
}

/**
 * Guarda las API keys (útil para que el usuario las configure)
 */
export async function saveApiKeysForExpo(
  falKey: string,
  replicateToken: string
): Promise<void> {
  try {
    await AsyncStorage.setItem(API_CONFIG_KEY, JSON.stringify({
      FAL_KEY: falKey,
      REPLICATE_API_TOKEN: replicateToken
    }));
    console.log('✅ API keys guardadas en AsyncStorage');
  } catch (error) {
    console.error('Error guardando en AsyncStorage:', error);
  }
}
