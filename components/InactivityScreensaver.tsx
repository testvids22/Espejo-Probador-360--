import React, { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import BootVideo from '@/components/BootVideo';

const INACTIVITY_MS = 30 * 1000; // 30 s para pruebas (producción: 5 * 60 * 1000)
const CHECK_INTERVAL_MS = 5000; // comprobar cada 5 s en pruebas

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
