import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import Colors from '@/constants/colors';
import { useNativeDriver } from '@/utils/animated';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  duration?: number;
  onHide: () => void;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  visible, 
  duration = 3000,
  onHide 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver,
          }),
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver,
          }),
        ]).start(() => {
          onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide]);

  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return Colors.light.primary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.toast, { backgroundColor: getBackgroundColor() }]}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

// Hook para usar Toast fácilmente
let toastQueue: Array<{ message: string; type: ToastType; id: number }> = [];
let toastId = 0;

export const toast = {
  success: (message: string) => {
    toastQueue.push({ message, type: 'success', id: toastId++ });
  },
  error: (message: string) => {
    toastQueue.push({ message, type: 'error', id: toastId++ });
  },
  info: (message: string) => {
    toastQueue.push({ message, type: 'info', id: toastId++ });
  },
  warning: (message: string) => {
    toastQueue.push({ message, type: 'warning', id: toastId++ });
  },
};

// Componente ToastProvider para manejar múltiples toasts
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentToast, setCurrentToast] = React.useState<{
    message: string;
    type: ToastType;
    id: number;
  } | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const processQueue = () => {
      if (toastQueue.length > 0 && !currentToast) {
        const next = toastQueue.shift()!;
        setCurrentToast(next);
        setVisible(true);
      }
    };

    const interval = setInterval(processQueue, 100);
    return () => clearInterval(interval);
  }, [currentToast]);

  const handleHide = () => {
    setVisible(false);
    setTimeout(() => {
      setCurrentToast(null);
    }, 300);
  };

  return (
    <>
      {children}
      {currentToast && (
        <Toast
          message={currentToast.message}
          type={currentToast.type}
          visible={visible}
          onHide={handleHide}
        />
      )}
    </>
  );
};
