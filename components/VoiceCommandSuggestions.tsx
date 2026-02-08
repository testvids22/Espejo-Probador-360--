import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { Mic } from 'lucide-react-native';

import { useVoice } from '@/contexts/VoiceContext';

type CommandCategory = {
  label: string;
  commands: string[];
};

const COMMANDS_BY_SCREEN: Record<string, CommandCategory[]> = {
  '/home': [
    { label: 'Navegar', commands: ['ESCANEAR', 'CATÁLOGO', 'ESPEJO', 'PERFIL'] },
  ],
  '/catalog': [
    { label: 'Seleccionar', commands: ['PROBAR', 'SIGUIENTE', 'ANTERIOR'] },
    { label: 'Filtrar', commands: ['ZARA', 'MANGO', 'CAMISETAS'] },
    { label: 'Navegar', commands: ['ESPEJO', 'LIMPIAR'] },
  ],
  '/scanner': [
    { label: 'Capturar', commands: ['FOTO', 'CAPTURAR'] },
    { label: 'Análisis', commands: ['DETECTAR MEDIDAS'] },
    { label: 'Navegar', commands: ['CATÁLOGO', 'MANUAL'] },
  ],
  '/mirror': [
    { label: 'Prenda', commands: ['ADAPTAR', 'FAVORITO'] },
    { label: 'Ver', commands: ['COMPARACIÓN', 'CARRUSEL', '360', 'SÍ QUIERO'] },
    { label: 'Acción', commands: ['COMPARTIR', 'CATÁLOGO'] },
  ],
  '/profile': [
    { label: 'Ver', commands: ['FAVORITOS', 'HISTORIAL'] },
    { label: 'Datos', commands: ['EXPORTAR', 'COMPARTIR'] },
    { label: 'Eliminar', commands: ['BORRAR PERFIL'] },
  ],
  '/size-detector': [
    { label: 'Análisis', commands: ['DETECTAR', 'CALCULAR'] },
    { label: 'Ajuste', commands: ['AJUSTADO', 'HOLGADO', 'NORMAL'] },
  ],
};

export function VoiceCommandSuggestions() {
  const pathname = usePathname();
  const voice = useVoice();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [pathname, fadeAnim]);

  if (!voice) return null;

  const isListening = voice.isListening ?? false;
  const lastCommand = voice.lastCommand ?? '';

  const currentPath = Object.keys(COMMANDS_BY_SCREEN).find(path => pathname.includes(path)) || '/home';
  const categories = COMMANDS_BY_SCREEN[currentPath] || COMMANDS_BY_SCREEN['/home'];

  if (!categories || categories.length === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={[styles.micIndicator, isListening && styles.micIndicatorActive]}>
          <Mic size={12} color={isListening ? '#000' : '#00FF9D'} />
        </View>
        <Text style={[styles.title, isListening && styles.titleActive]}>
          {isListening ? 'ESCUCHANDO' : 'COMANDOS DE VOZ'}
        </Text>
      </View>
      
      <View style={styles.categoriesContainer}>
        {categories.map((category, catIndex) => (
          <View key={catIndex} style={styles.category}>
            <Text style={styles.categoryLabel}>{category.label}:</Text>
            <View style={styles.commandsRow}>
              {category.commands.map((cmd, cmdIndex) => (
                <View key={cmdIndex} style={styles.commandChip}>
                  <Text style={styles.commandText}>{cmd === 'ADAPTADOR' ? 'ADAPTAR' : cmd}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {lastCommand ? (
        <View style={styles.lastCommand}>
          <Text style={styles.lastCommandLabel}>✓</Text>
          <Text style={styles.lastCommandText}>{lastCommand === 'adaptador' || lastCommand === 'ADAPTADOR' ? 'ADAPTAR' : lastCommand}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 157, 0.3)',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  micIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 157, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 157, 0.5)',
  },
  micIndicatorActive: {
    backgroundColor: '#00FF9D',
    borderColor: '#00FF9D',
  },
  title: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  titleActive: {
    color: '#00FF9D',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600' as const,
  },
  commandsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  commandChip: {
    backgroundColor: 'rgba(0, 255, 157, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 157, 0.3)',
  },
  commandText: {
    fontSize: 9,
    color: '#00FF9D',
    fontWeight: '600' as const,
  },
  lastCommand: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 157, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastCommandLabel: {
    fontSize: 10,
    color: '#00FF9D',
    fontWeight: '700' as const,
  },
  lastCommandText: {
    fontSize: 11,
    color: '#00FF9D',
    fontWeight: '600' as const,
  },
});
