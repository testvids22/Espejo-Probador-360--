import { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { Mic } from 'lucide-react-native';

type VoiceCommandsBannerProps = {
  screen: 'home' | 'scanner' | 'catalog' | 'mirror' | 'profile' | 'size-detector';
};

const COMMANDS_BY_SCREEN: Record<string, string[]> = {
  home: [
    'ESCANEAR',
    'CATÁLOGO',
    'ESPEJO',
    'PERFIL',
    'SUBIR',
    'BAJAR',
  ],
  scanner: [
    'CAPTURAR',
    'FOTO',
    'DETECTAR MEDIDAS',
    'REINICIAR',
    'IR AL ESPEJO',
  ],
  catalog: [
    'PROBAR',
    'SIGUIENTE',
    'ANTERIOR',
    'LLEVAR AL ESPEJO',
    'FAVORITO',
  ],
  mirror: [
    'ADAPTAR',
    'AÑADIR A FAVORITOS',
    'COMPARTIR',
    'VER LO QUE ME HE PROBADO',
    'MODO COMPARACIÓN',
    'CARRUSEL',
    'ROTAR',
  ],
  profile: [
    'VER FAVORITOS',
    'EXPORTAR PERFIL',
    'COMPARTIR PERFIL',
    'BORRAR PERFIL',
  ],
  'size-detector': [
    'DETECTAR MEDIDAS',
    'CONTINUAR',
    'ATRÁS',
    'IR AL CATÁLOGO',
    'ENTRADA MANUAL',
  ],
};

export default function VoiceCommandsBanner({ screen }: VoiceCommandsBannerProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const commands = useMemo(() => COMMANDS_BY_SCREEN[screen] || [], [screen]);
  
  const commandsText = useMemo(() => {
    const separator = '   •   ';
    const normalized = commands.map(c => (c === 'ADAPTADOR' ? 'ADAPTAR' : c));
    const fullText = normalized.join(separator);
    return `${fullText}${separator}${fullText}${separator}${fullText}`;
  }, [commands]);

  const textWidth = useMemo(() => {
    const avgCharWidth = 9;
    return (commandsText.length / 3) * avgCharWidth;
  }, [commandsText]);

  useEffect(() => {
    translateX.setValue(0);
    
    if (animationRef.current) {
      animationRef.current.stop();
    }

    const duration = Math.max(textWidth * 40, 20000);

    animationRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: -textWidth,
        duration: duration,
        useNativeDriver: true,
      })
    );

    animationRef.current.start();

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [translateX, textWidth, screen]);

  if (commands.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Mic size={14} color="#00FF9D" />
      </View>
      <View style={styles.scrollContainer}>
        <Animated.View
          style={[
            styles.textContainer,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <Text style={styles.commandsText}>{commandsText}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 157, 0.4)',
  },
  iconContainer: {
    width: 32,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 157, 0.2)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0, 255, 157, 0.4)',
  },
  scrollContainer: {
    flex: 1,
    overflow: 'hidden',
    height: '100%',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commandsText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#00FF9D',
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
});
