// utils/animated.ts
// Helper para useNativeDriver que funciona en web y native

import { Platform } from 'react-native';

/**
 * Determina si debe usar native driver para animaciones
 * En web, useNativeDriver no está soportado, así que siempre retorna false
 * En native, puede usar true para mejor rendimiento
 */
export const useNativeDriver = Platform.OS !== 'web';
