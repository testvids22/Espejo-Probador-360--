import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { Camera, Mic, Check, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { requestAllWebPermissions, requestCameraPermissionWeb, requestMicrophonePermissionWeb } from '@/utils/webPermissions';

interface PermissionRequestButtonProps {
  onPermissionsGranted?: () => void;
}

export function PermissionRequestButton({ onPermissionsGranted }: PermissionRequestButtonProps) {
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');
  const [isRequesting, setIsRequesting] = useState(false);

  // Verificar estado de permisos al montar
  useEffect(() => {
    if (Platform.OS === 'web') {
      checkPermissions();
    }
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS !== 'web' || !navigator.mediaDevices || !navigator.permissions) {
      return;
    }

    try {
      // Verificar cámara
      try {
        const cameraStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setCameraPermission(cameraStatus.state === 'granted' ? 'granted' : cameraStatus.state === 'denied' ? 'denied' : 'prompt');
      } catch (e) {
        // Si no soporta query, intentar getUserMedia directamente
        setCameraPermission('prompt');
      }

      // Verificar micrófono
      try {
        const micStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicrophonePermission(micStatus.state === 'granted' ? 'granted' : micStatus.state === 'denied' ? 'denied' : 'prompt');
      } catch (e) {
        setMicrophonePermission('prompt');
      }
    } catch (error) {
      console.warn('[PermissionButton] Error verificando permisos:', error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      return;
    }

    setIsRequesting(true);

    try {
      // Solicitar permisos de forma más explícita para el navegador de CURSOR
      console.log('[PermissionButton] Solicitando permisos de cámara y micrófono...');

      // Intentar solicitar ambos permisos juntos primero
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        // Si llegamos aquí, los permisos fueron concedidos
        console.log('[PermissionButton] ✅ Permisos concedidos');
        setCameraPermission('granted');
        setMicrophonePermission('granted');
        
        // Detener el stream inmediatamente (solo lo necesitamos para obtener permisos)
        stream.getTracks().forEach(track => track.stop());
        
        if (onPermissionsGranted) {
          onPermissionsGranted();
        }

        // Mostrar mensaje de éxito
        if (Platform.OS === 'web') {
          Alert.alert('✅ Permisos concedidos', 'Cámara y micrófono están ahora disponibles.');
        }
      } catch (error: any) {
        console.warn('[PermissionButton] Error al solicitar permisos juntos:', error);
        
        // Si falla, intentar por separado
        try {
          // Intentar cámara primero
          const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraPermission('granted');
          cameraStream.getTracks().forEach(track => track.stop());
          console.log('[PermissionButton] ✅ Permiso de cámara concedido');
        } catch (camError: any) {
          console.warn('[PermissionButton] Error al solicitar cámara:', camError);
          setCameraPermission('denied');
          
          if (Platform.OS === 'web') {
            Alert.alert(
              '❌ Permiso de cámara denegado',
              'Por favor, permite el acceso a la cámara en la configuración del navegador.\n\nEn Chrome/Edge: Configuración > Privacidad y seguridad > Configuración del sitio > Cámara',
              [{ text: 'OK' }]
            );
          }
        }

        try {
          // Intentar micrófono
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicrophonePermission('granted');
          micStream.getTracks().forEach(track => track.stop());
          console.log('[PermissionButton] ✅ Permiso de micrófono concedido');
        } catch (micError: any) {
          console.warn('[PermissionButton] Error al solicitar micrófono:', micError);
          setMicrophonePermission('denied');
          
          if (Platform.OS === 'web') {
            Alert.alert(
              '❌ Permiso de micrófono denegado',
              'Por favor, permite el acceso al micrófono en la configuración del navegador.\n\nEn Chrome/Edge: Configuración > Privacidad y seguridad > Configuración del sitio > Micrófono',
              [{ text: 'OK' }]
            );
          }
        }
      }
    } catch (error: any) {
      console.error('[PermissionButton] Error general:', error);
      if (Platform.OS === 'web') {
        Alert.alert(
          'Error',
          `Error al solicitar permisos: ${error.message}\n\nAsegúrate de que el navegador soporte getUserMedia y que estés usando HTTPS o localhost.`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsRequesting(false);
      // Re-verificar permisos después de un momento
      setTimeout(checkPermissions, 1000);
    }
  };

  if (Platform.OS !== 'web') {
    return null; // No mostrar en native
  }

  const allGranted = cameraPermission === 'granted' && microphonePermission === 'granted';
  const needsPermission = cameraPermission !== 'granted' || microphonePermission !== 'granted';

  if (allGranted) {
    return (
      <View style={styles.container}>
        <View style={styles.statusContainer}>
          <Check size={20} color="#22c55e" />
          <Text style={styles.statusText}>Permisos concedidos</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.permissionStatus}>
        <View style={styles.permissionItem}>
          <Camera size={20} color={cameraPermission === 'granted' ? '#22c55e' : '#ef4444'} />
          <Text style={styles.permissionText}>
            Cámara: {cameraPermission === 'granted' ? '✅' : cameraPermission === 'denied' ? '❌' : '⏳'}
          </Text>
        </View>
        <View style={styles.permissionItem}>
          <Mic size={20} color={microphonePermission === 'granted' ? '#22c55e' : '#ef4444'} />
          <Text style={styles.permissionText}>
            Micrófono: {microphonePermission === 'granted' ? '✅' : microphonePermission === 'denied' ? '❌' : '⏳'}
          </Text>
        </View>
      </View>
      
      {needsPermission && (
        <TouchableOpacity
          style={[styles.button, isRequesting && styles.buttonDisabled]}
          onPress={requestPermissions}
          disabled={isRequesting}
        >
          <Text style={styles.buttonText}>
            {isRequesting ? 'Solicitando...' : 'Autorizar Cámara y Micrófono'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  permissionStatus: {
    gap: 8,
    marginBottom: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  button: {
    backgroundColor: Colors.light.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
