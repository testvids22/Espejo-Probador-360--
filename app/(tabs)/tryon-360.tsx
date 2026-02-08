import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { RotateCw, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useReportActivity } from '@/components/InactivityScreensaver';
import { Viewer360 } from '@/components/Viewer360';

export default function TryOn360Screen() {
  const router = useRouter();
  const { triedItems, scanData } = useApp();
  const reportActivity = useReportActivity();
  const [selectedTryOnImage, setSelectedTryOnImage] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);

  const selectedItemIdRef = useRef<string | null>(null);

  // Mostrar siempre el 360º más reciente (triedItems tiene el más nuevo primero)
  const refreshSelection = useCallback(() => {
    if (triedItems.length > 0) {
      const itemsWith360 = triedItems.filter(ti => ti.view360?.isReady);
      const itemWith360 = itemsWith360[0] ?? null; // [0] = más reciente
      const item = itemWith360 || triedItems[0];
      if (item?.compositeImage) {
        selectedItemIdRef.current = item.item.id;
        setSelectedTryOnImage(item.compositeImage);
        setSelectedItemName(item.item.name);
      }
    }
  }, [triedItems]);

  useEffect(() => {
    refreshSelection();
  }, [refreshSelection]);

  useFocusEffect(
    useCallback(() => {
      reportActivity();
      refreshSelection();
    }, [refreshSelection, reportActivity])
  );

  if (!selectedTryOnImage) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <RotateCw size={32} color={Colors.light.primary} />
          <Text style={styles.title}>TryOn 360º</Text>
          <Text style={styles.subtitle}>Funcionalidades avanzadas de Orchids</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Esta pestaña genera vistas 360º a partir del TryOn de RORK.
            {'\n\n'}
            Para usar esta funcionalidad:
            {'\n'}
            1. Ve a la pestaña "Espejo"
            {'\n'}
            2. Selecciona una prenda
            {'\n'}
            3. Realiza el TryOn
            {'\n'}
            4. Vuelve aquí para ver la vista 360º
          </Text>
        </View>

        {triedItems.length === 0 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              No hay TryOn disponible. Realiza un TryOn en la pestaña "Espejo" primero.
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const selectedItem = triedItems.find(ti => 
    (selectedItemIdRef.current && ti.item.id === selectedItemIdRef.current) || 
    ti.compositeImage === selectedTryOnImage
  );

  console.log('[TryOn360] ========================================');
  console.log('[TryOn360] selectedItem encontrado:', selectedItem ? '✅ SÍ' : '❌ NO');
  if (selectedItem) {
    console.log('[TryOn360] itemId:', selectedItem.item.id);
    console.log('[TryOn360] itemName:', selectedItem.item.name);
    console.log('[TryOn360] hasCompositeImage:', !!selectedItem.compositeImage);
    console.log('[TryOn360] hasView360:', !!selectedItem.view360);
    if (selectedItem.view360) {
      console.log('[TryOn360] view360.wanUrl existe:', !!selectedItem.view360.wanUrl);
      console.log('[TryOn360] view360.wanUrl:', selectedItem.view360.wanUrl ? `✅ ${selectedItem.view360.wanUrl.substring(0, 50)}... (length: ${selectedItem.view360.wanUrl.length})` : '❌ NO HAY URL');
      console.log('[TryOn360] view360.klingUrl existe:', !!selectedItem.view360.klingUrl);
      console.log('[TryOn360] view360.klingUrl:', selectedItem.view360.klingUrl ? `✅ ${selectedItem.view360.klingUrl.substring(0, 50)}... (length: ${selectedItem.view360.klingUrl.length})` : '❌ NO HAY URL');
      console.log('[TryOn360] view360.isReady:', selectedItem.view360.isReady);
      console.log('[TryOn360] view360.generating:', selectedItem.view360.generating);
      console.log('[TryOn360] view360.carouselFrames:', selectedItem.view360.carouselFrames?.length || 0, 'frames');
    } else {
      console.log('[TryOn360] ⚠️ selectedItem NO tiene view360');
    }
  }
  console.log('[TryOn360] ========================================');

  const view360DataToPass = selectedItem?.view360 ? {
    wanUrl: selectedItem.view360.wanUrl,
    klingUrl: selectedItem.view360.klingUrl,
    carouselFrames: selectedItem.view360.carouselFrames,
  } : undefined;

  console.log('[TryOn360] ========================================');
  console.log('[TryOn360] view360DataToPass existe:', !!view360DataToPass);
  if (view360DataToPass) {
    console.log('[TryOn360] view360DataToPass.wanUrl existe:', !!view360DataToPass.wanUrl);
    console.log('[TryOn360] view360DataToPass.wanUrl:', view360DataToPass.wanUrl ? `✅ ${view360DataToPass.wanUrl.substring(0, 50)}... (length: ${view360DataToPass.wanUrl.length})` : '❌ NO HAY URL');
    console.log('[TryOn360] view360DataToPass.klingUrl existe:', !!view360DataToPass.klingUrl);
    console.log('[TryOn360] view360DataToPass.klingUrl:', view360DataToPass.klingUrl ? `✅ ${view360DataToPass.klingUrl.substring(0, 50)}... (length: ${view360DataToPass.klingUrl.length})` : '❌ NO HAY URL');
    console.log('[TryOn360] view360DataToPass.carouselFrames:', view360DataToPass.carouselFrames?.length || 0, 'frames');
  } else {
    console.log('[TryOn360] ⚠️ NO HAY view360DataToPass - no se pasarán URLs al Viewer360');
  }
  console.log('[TryOn360] ========================================');

  // Key para forzar re-montaje de Viewer360 cuando cambie la URL del video (actualización de video generado)
  const viewerKey = selectedItem
    ? `${selectedItem.item.id}-${selectedItem.view360?.klingUrl ?? ''}-${selectedItem.view360?.isReady ? '1' : '0'}`
    : 'no-item';

  return (
    <Viewer360
      key={viewerKey}
      tryOnImageUrl={selectedTryOnImage}
      clothingItemName={selectedItemName || undefined}
      onBack={() => router.back()}
      triedItemId={selectedItem?.item.id}
      view360Data={view360DataToPass}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.light.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  featureText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: Colors.light.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  warningBox: {
    backgroundColor: Colors.light.errorBackground || '#fee2e2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.light.error || '#ef4444',
  },
  generatingBox: {
    backgroundColor: Colors.light.card,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  generatingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 12,
    textAlign: 'center',
  },
  generatingSubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
