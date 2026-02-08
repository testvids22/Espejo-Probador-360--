import { Platform, Alert } from 'react-native';

/**
 * Utilidades para manejar permisos de cámara y micrófono en web
 */

export interface PermissionStatus {
  granted: boolean;
  error?: string;
}

/**
 * Solicita permisos de cámara en web usando getUserMedia
 */
export async function requestCameraPermissionWeb(): Promise<PermissionStatus> {
  if (Platform.OS !== 'web') {
    return { granted: true };
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return {
      granted: false,
      error: 'Tu navegador no soporta acceso a la cámara. Por favor, usa un navegador moderno como Chrome, Firefox o Edge.',
    };
  }

  // Verificar si estamos en HTTPS o localhost
  const isSecureContext = window.location.protocol === 'https:' || 
                          window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';

  if (!isSecureContext) {
    return {
      granted: false,
      error: 'Se requiere HTTPS para acceder a la cámara. En desarrollo local, usa http://localhost en lugar de una IP.',
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'user', // Cámara frontal
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    });
    
    // Detener el stream inmediatamente, solo queríamos verificar permisos
    stream.getTracks().forEach(track => track.stop());
    
    return { granted: true };
  } catch (error: any) {
    let errorMessage = 'No se pudo acceder a la cámara.';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = 'No se encontró ninguna cámara conectada.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMessage = 'La cámara está siendo usada por otra aplicación.';
    } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
      errorMessage = 'La cámara no soporta las características requeridas.';
    } else if (error.name === 'NotSupportedError') {
      errorMessage = 'Tu navegador no soporta acceso a la cámara.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      granted: false,
      error: errorMessage,
    };
  }
}

/**
 * Solicita permisos de micrófono en web usando getUserMedia
 */
export async function requestMicrophonePermissionWeb(): Promise<PermissionStatus> {
  if (Platform.OS !== 'web') {
    return { granted: true };
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return {
      granted: false,
      error: 'Tu navegador no soporta acceso al micrófono. Por favor, usa un navegador moderno.',
    };
  }

  // Verificar si estamos en HTTPS o localhost
  const isSecureContext = window.location.protocol === 'https:' || 
                          window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';

  if (!isSecureContext) {
    return {
      granted: false,
      error: 'Se requiere HTTPS para acceder al micrófono. En desarrollo local, usa http://localhost en lugar de una IP.',
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Detener el stream inmediatamente, solo queríamos verificar permisos
    stream.getTracks().forEach(track => track.stop());
    
    return { granted: true };
  } catch (error: any) {
    let errorMessage = 'No se pudo acceder al micrófono.';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Permiso de micrófono denegado. Por favor, permite el acceso al micrófono en la configuración de tu navegador.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = 'No se encontró ningún micrófono conectado.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMessage = 'El micrófono está siendo usado por otra aplicación.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      granted: false,
      error: errorMessage,
    };
  }
}

/**
 * Verifica si el navegador soporta Web Speech API
 */
export function isSpeechRecognitionSupported(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }
  
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

/**
 * Muestra una alerta informativa sobre permisos
 */
export function showPermissionAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    // En web, usar window.alert o un modal personalizado
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message);
  }
}

/**
 * Obtiene información sobre el contexto de seguridad
 */
export function getSecurityContextInfo(): {
  isSecure: boolean;
  protocol: string;
  hostname: string;
  message: string;
} {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return {
      isSecure: true,
      protocol: '',
      hostname: '',
      message: '',
    };
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const isSecure = protocol === 'https:' || 
                   hostname === 'localhost' || 
                   hostname === '127.0.0.1';

  let message = '';
  if (!isSecure) {
    message = `⚠️ Se requiere HTTPS o localhost para acceder a la cámara y micrófono.\n\n` +
              `Protocolo actual: ${protocol}\n` +
              `Hostname: ${hostname}\n\n` +
              `Solución: Usa http://localhost:3000 en lugar de una IP.`;
  }

  return {
    isSecure,
    protocol,
    hostname,
    message,
  };
}

/**
 * Solicita todos los permisos del navegador por defecto al iniciar la app
 * Esto evita tener que solicitarlos manualmente más tarde
 * Mejorado para funcionar mejor en navegadores integrados como CURSOR
 */
export async function requestAllWebPermissions(): Promise<void> {
  if (Platform.OS !== 'web') {
    return; // En móvil, los permisos se manejan de otra forma
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    console.warn('[PERMISSIONS] Navegador no soporta mediaDevices');
    return;
  }

  // Verificar contexto de seguridad
  const isSecureContext = window.location.protocol === 'https:' || 
                          window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
  
  if (!isSecureContext) {
    console.warn('[PERMISSIONS] ⚠️ Se requiere HTTPS o localhost para permisos de cámara/micrófono');
    console.warn('[PERMISSIONS] Protocolo actual:', window.location.protocol);
    console.warn('[PERMISSIONS] Hostname actual:', window.location.hostname);
    return;
  }

  try {
    // Solicitar permisos de cámara y micrófono simultáneamente
    // En navegadores integrados como CURSOR, esto puede requerir interacción del usuario
    console.log('[PERMISSIONS] Solicitando permisos de cámara y micrófono por defecto...');
    console.log('[PERMISSIONS] URL:', window.location.href);
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: true 
    });
    
    // Detener el stream inmediatamente, solo queríamos solicitar permisos
    stream.getTracks().forEach(track => {
      track.stop();
      console.log('[PERMISSIONS] Stream track detenido:', track.kind);
    });
    
    console.log('[PERMISSIONS] ✅ Permisos de cámara y micrófono concedidos');
    
    // Verificar estado de permisos usando Permissions API si está disponible
    if (navigator.permissions) {
      try {
        const cameraStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const micStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('[PERMISSIONS] Estado de cámara:', cameraStatus.state);
        console.log('[PERMISSIONS] Estado de micrófono:', micStatus.state);
      } catch (permError) {
        // Permissions API puede no estar disponible en todos los navegadores
        console.log('[PERMISSIONS] Permissions API no disponible, usando getUserMedia como verificación');
      }
    }
  } catch (error: any) {
    // No mostrar error si el usuario aún no ha concedido permisos
    // Solo loguear para debugging
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      console.log('[PERMISSIONS] ⚠️ Permisos aún no concedidos, se solicitarán cuando sean necesarios');
      console.log('[PERMISSIONS] 💡 En navegadores integrados como CURSOR, puede ser necesario hacer clic en un botón para autorizar');
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      console.warn('[PERMISSIONS] ⚠️ No se encontraron dispositivos de cámara/micrófono');
    } else {
      console.warn('[PERMISSIONS] Error al solicitar permisos:', error.name, error.message);
    }
  }

  // Solicitar permisos de notificaciones si están disponibles
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
      console.log('[PERMISSIONS] ✅ Permiso de notificaciones:', Notification.permission);
    } catch (error) {
      console.warn('[PERMISSIONS] Error al solicitar permiso de notificaciones:', error);
    }
  }

  // Solicitar permisos de geolocalización si están disponibles
  if ('geolocation' in navigator) {
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            console.log('[PERMISSIONS] ✅ Permiso de geolocalización concedido');
            resolve();
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              console.log('[PERMISSIONS] Permiso de geolocalización denegado');
            } else {
              console.warn('[PERMISSIONS] Error al solicitar geolocalización:', error.message);
            }
            resolve(); // Resolver de todas formas para no bloquear
          },
          { timeout: 1000 } // Timeout corto para no bloquear
        );
      });
    } catch (error) {
      console.warn('[PERMISSIONS] Error al solicitar geolocalización:', error);
    }
  }
}


