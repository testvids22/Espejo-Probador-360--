import React, { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import BootVideo from '@/components/BootVideo';

const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutos
const CHECK_INTERVAL_MS = 15000; // comprobar cada 15 s

type ActivityContextValue = { reportActivity: () => void };
const ActivityContext = createContext<ActivityContextValue | null>(null);

export function useReportActivity(): () => void {
  const ctx = useContext(ActivityContext);
  return useCallback(() => {
    ctx?.reportActivity();
  }, [ctx]);
}

type Props = {
  children: React.ReactNode;
};

export function InactivityScreensaver({ children }: Props) {
  const [showScreensaver, setShowScreensaver] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reportActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const handleFinish = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowScreensaver(false);
  }, []);

  useEffect(() => {
    checkIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_MS) {
        setShowScreensaver(true);
      }
    }, CHECK_INTERVAL_MS);
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, []);

  // En web: escuchar actividad global (clic, toque, tecla) para no mostrar screensaver con uso normal
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };
    document.addEventListener('mousedown', onActivity);
    document.addEventListener('touchstart', onActivity);
    document.addEventListener('keydown', onActivity);
    document.addEventListener('scroll', onActivity);
    return () => {
      document.removeEventListener('mousedown', onActivity);
      document.removeEventListener('touchstart', onActivity);
      document.removeEventListener('keydown', onActivity);
      document.removeEventListener('scroll', onActivity);
    };
  }, []);

  return (
    <ActivityContext.Provider value={{ reportActivity }}>
      <View style={styles.wrapper}>
        {children}
        {showScreensaver && (
          <Pressable style={StyleSheet.absoluteFill} onPress={handleFinish}>
            <View style={StyleSheet.absoluteFill}>
              <BootVideo visible={true} onFinish={handleFinish} />
            </View>
          </Pressable>
        )}
      </View>
    </ActivityContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});
