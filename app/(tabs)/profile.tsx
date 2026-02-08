import { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Platform, ActivityIndicator, Modal, TextInput, Alert, FlatList } from 'react-native';
import * as Speech from 'expo-speech';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { User, History, Info, Bell, Moon, Globe, HelpCircle, Heart, Trash2, Eye, Sparkles, TrendingUp, Mic, Key, CheckCircle2, XCircle, Plus, Users, Lock, Edit2, Volume2, VolumeX, Share2, Bluetooth, Download, AlertTriangle } from 'lucide-react-native';
import { generateText } from '@rork-ai/toolkit-sdk';
import { useRouter, useFocusEffect } from 'expo-router';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useVoice } from '@/contexts/VoiceContext';
import { useReportActivity } from '@/components/InactivityScreensaver';

export default function ProfileScreen() {
  const router = useRouter();
  const { triedItems, favorites, scanData, sizeDetectorData, clearScanData, clearAllProfileData, toggleFavorite, addTriedItem, userProfile, profiles, updateUserProfile, addProfile, switchProfile, getPersistentRecentTriesForInsights } = useApp();
  const { registerCommand, unregisterCommand, setGoogleCloudApiKey, isGoogleCloudConfigured } = useVoice();
  const reportActivity = useReportActivity();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isNewProfilePrivate, setIsNewProfilePrivate] = useState(false);
  const [editName, setEditName] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'history' | 'favorites' | 'insights'>('history');
  const [insights, setInsights] = useState<string | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const persistentRecentForInsights = getPersistentRecentTriesForInsights();
  const hasDataForInsights = persistentRecentForInsights.length > 0 || triedItems.length > 0;

  const handleNotificationToggle = (value: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setNotificationsEnabled(value);
  };

  const handleDarkModeToggle = (value: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDarkModeEnabled(value);
  };

  const stopSpeaking = useCallback(async () => {
    try {
      await Speech.stop();
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }, []);

  const speakInsights = useCallback(async () => {
    if (!insights) return;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (isSpeaking) {
      await stopSpeaking();
      return;
    }

    try {
      setIsSpeaking(true);
      await Speech.speak(insights, {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error('Error speaking insights:', error);
      setIsSpeaking(false);
      if (Platform.OS === 'web') {
        alert('No se pudo reproducir el análisis de voz');
      } else {
        Alert.alert('Error', 'No se pudo reproducir el análisis de voz');
      }
    }
  }, [insights, isSpeaking, stopSpeaking]);

  const generateInsights = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await stopSpeaking();
    setIsLoadingInsights(true);
    try {
      const persistentRecent = getPersistentRecentTriesForInsights();
      const historyText = persistentRecent.length > 0
        ? persistentRecent.map((tried, idx) => 
            `${idx + 1}. ${tried.brand} - ${tried.name} (${tried.category}) - ${tried.price}€ - Probado: ${new Date(tried.date).toLocaleDateString('es-ES')}`
          ).join('\n')
        : triedItems.slice(0, 20).map((tried, idx) => 
            `${idx + 1}. ${tried.item.brand} - ${tried.item.name} (${tried.item.category}) - ${tried.item.price}€ - Probado: ${new Date(tried.date).toLocaleDateString('es-ES')}`
          ).join('\n');

      const totalTriesForPrompt = persistentRecent.length > 0 ? persistentRecent.length : triedItems.length;
      const favoritesText = favorites.slice(0, 10).map((item, idx) => 
        `${idx + 1}. ${item.brand} - ${item.name} (${item.category}) - ${item.price}€`
      ).join('\n');

      const prompt = `Eres un asesor de moda profesional. Analiza el historial de pruebas y favoritos del usuario para proporcionar insights personalizados.

Historial de prendas probadas (${totalTriesForPrompt} total):
${historyText}

Prendas favoritas (${favorites.length} total):
${favoritesText}

Proporciona un análisis en español que incluya:
1. Patrones de estilo identificados (marcas, categorías, rango de precios)
2. Recomendaciones personalizadas basadas en sus preferencias
3. Tendencias observadas en sus elecciones
4. Sugerencias de combinaciones y nuevos estilos

Haz el análisis conciso, profesional y útil (máximo 200 palabras).`;

      const analysis = await generateText(prompt);
      setInsights(analysis);
      
      // Auto-speak the generated insights
      setTimeout(async () => {
        try {
          setIsSpeaking(true);
          await Speech.speak(`Tu perfil de estilo. ${analysis}`, {
            language: 'es-ES',
            pitch: 1.0,
            rate: 0.9,
            onDone: () => setIsSpeaking(false),
            onStopped: () => setIsSpeaking(false),
            onError: () => setIsSpeaking(false),
          });
        } catch (speakError) {
          console.error('Error auto-speaking insights:', speakError);
          setIsSpeaking(false);
        }
      }, 500);
    } catch (error) {
      console.error('Error generating insights:', error);
      setInsights('No se pudieron generar insights. Intenta de nuevo más tarde.');
    } finally {
      setIsLoadingInsights(false);
    }
  }, [triedItems, favorites, stopSpeaking]);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].uri) {
        let imageUri = result.assets[0].uri;
        
        if (Platform.OS === 'web') {
          if (result.assets[0].base64) {
            imageUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
          }
        } else {
          // Use the URI directly for mobile
          // In production, you'd want to copy to permanent storage
          // For now, we'll use the temporary URI
        }

        await updateUserProfile({ avatar: imageUri });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;
    
    await addProfile(newProfileName.trim(), isNewProfilePrivate);
    setNewProfileName('');
    setIsNewProfilePrivate(false);
    setShowProfileModal(false);
    Alert.alert('Perfil Creado', `Se ha creado el perfil "${newProfileName}" exitosamente.`);
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) return;
    
    await updateUserProfile({ name: editName.trim() });
    setShowEditProfileModal(false);
  };

  const BORRAR_AVISO = 'Esta acción es IRREVERSIBLE. Si no quiere volver a firmar el consentimiento y sacar fotos, debería guardar su perfil completo en su móvil vía Bluetooth antes de borrar.';

  const showDeleteProfileConfirmation = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    const confirmAction = () => {
      clearAllProfileData();
      if (Platform.OS === 'web') {
        alert('Todos los datos del perfil han sido eliminados');
      } else {
        Alert.alert('Eliminado', 'Todos los datos del perfil han sido eliminados permanentemente.');
      }
    };
    if (Platform.OS === 'web') {
      if (confirm(`¿Está seguro de que desea eliminar TODOS los datos del perfil (escaneos, medidas, favoritos, historial)? ${BORRAR_AVISO}`)) {
        confirmAction();
      }
    } else {
      Alert.alert(
        'Borrar Perfil Completo',
        `¿Está seguro de que desea eliminar TODOS los datos del perfil (escaneos, medidas, favoritos, historial)? ${BORRAR_AVISO}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar Todo', style: 'destructive', onPress: confirmAction }
        ]
      );
    }
  }, [clearAllProfileData]);

  useEffect(() => {
    setEditName(userProfile.name);
  }, [userProfile.name]);

  useEffect(() => {
    registerCommand('profile-history', {
      patterns: ['historial', 'ver historial', 'mostrar historial'],
      action: () => {
        setActiveTab('history');
      },
      description: 'ver historial',
    });

    registerCommand('profile-favorites', {
      patterns: ['mis favoritos', 'ver favoritos', 'mostrar favoritos', 'lista de favoritos'],
      action: () => {
        setActiveTab('favorites');
      },
      description: '',
    });

    registerCommand('profile-insights', {
      patterns: ['opinión profesional', 'opinión', 'análisis profesional', 'asesoría', 'consejos'],
      action: () => {
        setActiveTab('insights');
        const hasData = getPersistentRecentTriesForInsights().length > 0 || triedItems.length > 0;
        if (!insights && hasData && !isLoadingInsights) {
          generateInsights();
        }
      },
      description: 'ver opinión profesional',
    });

    registerCommand('profile-delete-scan', {
      patterns: ['eliminar escaneo', 'borrar escaneo', 'quitar escaneo'],
      action: () => {
        if (scanData?.completed) {
          clearScanData();
        }
      },
      description: 'eliminar escaneo',
    });

    registerCommand('profile-delete-all', {
      patterns: ['borrar perfil', 'cerrar y borrar', 'eliminar perfil', 'borrar todo', 'cerrar sesión y borrar'],
      action: () => {
        showDeleteProfileConfirmation();
      },
      description: 'borrar perfil completo',
    });

    return () => {
      unregisterCommand('profile-history');
      unregisterCommand('profile-favorites');
      unregisterCommand('profile-insights');
      unregisterCommand('profile-delete-scan');
      unregisterCommand('profile-delete-all');
    };
  }, [registerCommand, unregisterCommand, activeTab, insights, triedItems.length, isLoadingInsights, scanData, generateInsights, clearScanData, showDeleteProfileConfirmation]);

  useFocusEffect(
    useCallback(() => {
      reportActivity();
      const scrollUpId = `scroll-up-profile-${Date.now()}`;
      const scrollDownId = `scroll-down-profile-${Date.now()}`;

      registerCommand(scrollUpId, {
        patterns: ['subir', 'arriba', 'scroll arriba', 'desplazar arriba'],
        action: () => {
          console.log('Profile: Scrolling up');
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        },
        description: 'subiendo',
      });

      registerCommand(scrollDownId, {
        patterns: ['bajar', 'abajo', 'scroll abajo', 'desplazar abajo'],
        action: () => {
          console.log('Profile: Scrolling down');
          scrollViewRef.current?.scrollToEnd({ animated: true });
        },
        description: 'bajando',
      });

      return () => {
        unregisterCommand(scrollUpId);
        unregisterCommand(scrollDownId);
      };
    }, [registerCommand, unregisterCommand, reportActivity])
  );

  return (
    <ScrollView ref={scrollViewRef} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar}>
          {userProfile.avatar ? (
            <Image source={{ uri: userProfile.avatar }} style={styles.avatarImage} />
          ) : scanData?.photos?.[0] ? (
            <Image source={{ uri: scanData.photos[0] }} style={styles.avatarImage} />
          ) : (
            <User size={48} color={Colors.light.primary} />
          )}
          <View style={styles.editAvatarBadge}>
            <Edit2 size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nameContainer} onPress={() => setShowEditProfileModal(true)}>
          <Text style={styles.headerTitle}>{userProfile.name}</Text>
          <View style={{ marginLeft: 8 }}>
            <Edit2 size={16} color={Colors.light.textSecondary} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.profilesButton}
          onPress={() => setShowProfileModal(true)}
        >
          <Users size={14} color={Colors.light.primary} />
          <Text style={styles.profilesButtonText}>Cambiar Perfil</Text>
        </TouchableOpacity>
        {userProfile.isPrivate && (
          <View style={styles.privateBadge}>
            <Lock size={12} color="#FFFFFF" />
            <Text style={styles.privateBadgeText}>Privado</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Bell size={20} color={Colors.light.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Notificaciones</Text>
            <Text style={styles.settingDescription}>Recibe alertas y actualizaciones</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Moon size={20} color={Colors.light.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Modo Oscuro</Text>
            <Text style={styles.settingDescription}>Tema visual de la app</Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={handleDarkModeToggle}
            trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => setShowApiKeyModal(true)}
        >
          <View style={styles.settingIcon}>
            {Platform.OS === 'web' ? (
              <Globe size={20} color={Colors.light.primary} />
            ) : (
              <Mic size={20} color={Colors.light.primary} />
            )}
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Reconocimiento de Voz (Android)</Text>
            <Text style={styles.settingDescription}>
              {isGoogleCloudConfigured ? 'API Key configurada' : 'Configurar Google Cloud API'}
            </Text>
          </View>
          {isGoogleCloudConfigured ? (
            <CheckCircle2 size={20} color="#10B981" />
          ) : (
            <Key size={20} color={Colors.light.textSecondary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Globe size={20} color={Colors.light.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Idioma</Text>
            <Text style={styles.settingDescription}>Español</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <History size={16} color={activeTab === 'history' ? Colors.light.primary : Colors.light.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Historial</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
            onPress={() => setActiveTab('favorites')}
          >
            <Heart size={16} color={activeTab === 'favorites' ? Colors.light.primary : Colors.light.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>Favoritos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'insights' && styles.tabActive]}
            onPress={() => setActiveTab('insights')}
          >
            <TrendingUp size={16} color={activeTab === 'insights' ? Colors.light.primary : Colors.light.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'insights' && styles.tabTextActive]}>Opinión IA</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'insights' ? (
          <View style={styles.tabContent}>
            {!insights ? (
              <View style={styles.insightsEmpty}>
                <Sparkles size={60} color={Colors.light.primary} />
                <Text style={styles.insightsTitle}>Análisis de Preferencias con IA</Text>
                <Text style={styles.insightsSubtitle}>
                  Genera insights personalizados basados en tu historial de pruebas y favoritos
                </Text>
                <TouchableOpacity 
                  style={styles.generateButton}
                  onPress={generateInsights}
                  disabled={isLoadingInsights || !hasDataForInsights}
                >
                  {isLoadingInsights ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Sparkles size={20} color="#FFFFFF" />
                      <Text style={styles.generateButtonText}>Generar Insights</Text>
                    </>
                  )}
                </TouchableOpacity>
                {!hasDataForInsights && (
                  <Text style={styles.insightsHint}>Necesitas probar al menos una prenda</Text>
                )}
              </View>
            ) : (
              <View style={styles.insightsResult}>
                <View style={styles.insightsHeader}>
                  <Sparkles size={24} color={Colors.light.primary} />
                  <Text style={styles.insightsResultTitle}>Tu Perfil de Estilo</Text>
                  <TouchableOpacity 
                    style={[styles.speakButton, isSpeaking && styles.speakButtonActive]}
                    onPress={speakInsights}
                  >
                    {isSpeaking ? (
                      <VolumeX size={20} color="#FFFFFF" />
                    ) : (
                      <Volume2 size={20} color={Colors.light.primary} />
                    )}
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.insightsScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.insightsText}>{insights}</Text>
                </ScrollView>
                <TouchableOpacity 
                  style={styles.regenerateButton}
                  onPress={generateInsights}
                  disabled={isLoadingInsights}
                >
                  {isLoadingInsights ? (
                    <ActivityIndicator color={Colors.light.primary} />
                  ) : (
                    <>
                      <TrendingUp size={18} color={Colors.light.primary} />
                      <Text style={styles.regenerateButtonText}>Actualizar Análisis</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : activeTab === 'favorites' ? (
          <View style={styles.tabContent}>
            {favorites.length > 0 ? (
              favorites.map((item) => {
                const triedItem = triedItems.find(ti => ti.item.id === item.id);
                const compositeImage = item.compositeImage || triedItem?.compositeImage;
                return (
                  <View key={item.id} style={styles.triedItemCard}>
                    <Image 
                      source={{ uri: compositeImage || item.image }}
                      style={[styles.triedItemImage, compositeImage && styles.compositeImage]}
                      cachePolicy="memory-disk"
                      contentFit="cover"
                    />
                    {compositeImage && (
                      <View style={styles.compositeLabel}>
                        <Text style={styles.compositeLabelText}>Probado</Text>
                      </View>
                    )}
                    <View style={styles.triedItemInfo}>
                      <Text style={styles.triedItemBrand}>{item.brand}</Text>
                      <Text style={styles.triedItemName} numberOfLines={2}>{item.name}</Text>
                      <Text style={styles.triedItemPrice}>{item.price.toFixed(2)}€</Text>
                    </View>
                    <View style={styles.triedItemActions}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={async () => {
                          await addTriedItem(item);
                          router.push('/(tabs)/mirror');
                        }}
                      >
                        <Eye size={18} color={Colors.light.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => toggleFavorite(item)}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Heart size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyTitle}>Sin favoritos</Text>
                <Text style={styles.emptyText}>Marca prendas como favoritas para verlas aquí</Text>
              </View>
            )}
          </View>
        ) : activeTab === 'history' ? (
          <View style={styles.tabContent}>
            {triedItems.length > 0 ? (
              triedItems.map((tried, index) => (
                <View key={`${tried.item.id}-${index}`} style={styles.triedItemCard}>
                  <Image 
                    source={{ uri: tried.item.image }}
                    style={styles.triedItemImage}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                  />
                  <View style={styles.triedItemInfo}>
                    <Text style={styles.triedItemBrand}>{tried.item.brand}</Text>
                    <Text style={styles.triedItemName} numberOfLines={2}>{tried.item.name}</Text>
                    <Text style={styles.triedItemPrice}>{tried.item.price.toFixed(2)}€</Text>
                    <Text style={styles.triedItemDate}>{new Date(tried.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  </View>
                  <View style={styles.triedItemActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={async () => {
                        await addTriedItem(tried.item);
                        router.push('/(tabs)/mirror');
                      }}
                    >
                      <Eye size={18} color={Colors.light.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <History size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyTitle}>Sin prendas probadas</Text>
                <Text style={styles.emptyText}>Explora el catálogo y prueba prendas</Text>
                <TouchableOpacity 
                  style={styles.exploreButton}
                  onPress={() => router.push('/(tabs)/catalog')}
                >
                  <Text style={styles.exploreButtonText}>Explorar Catálogo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}
      </View>

      {scanData?.completed && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Escaneo Corporal</Text>
            {scanData.photos && scanData.photos.length > 0 && (
              <View style={styles.scanPhotosRow}>
                {scanData.photos.map((photo, index) => (
                  <View key={index} style={styles.scanPhotoContainer}>
                    <Image 
                      source={{ uri: photo }} 
                      style={styles.scanPhotoThumb}
                      contentFit="cover"
                    />
                    <Text style={styles.scanPhotoLabel}>{index === 0 ? 'Frontal' : 'Lateral'}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={styles.scanInfo}>
            <View style={styles.scanInfoRow}>
              <Text style={styles.scanInfoLabel}>Estado:</Text>
              <Text style={styles.scanInfoValue}>Completado</Text>
            </View>
            <View style={styles.scanInfoRow}>
              <Text style={styles.scanInfoLabel}>Fecha:</Text>
              <Text style={styles.scanInfoValue}>{new Date(scanData.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </View>
            <View style={styles.scanInfoRow}>
              <Text style={styles.scanInfoLabel}>Fotos:</Text>
              <Text style={styles.scanInfoValue}>{scanData.photoCount || scanData.photos?.length || 0} capturas</Text>
            </View>
            {sizeDetectorData && sizeDetectorData.scanId === scanData.scanId && (
              <>
                <View style={styles.scanInfoDivider} />
                <View style={styles.scanInfoRow}>
                  <Text style={styles.scanInfoLabel}>Talla recomendada:</Text>
                  <Text style={[styles.scanInfoValue, styles.scanInfoHighlight]}>{sizeDetectorData.recommendedSize}</Text>
                </View>
                <View style={styles.scanInfoRow}>
                  <Text style={styles.scanInfoLabel}>Altura:</Text>
                  <Text style={styles.scanInfoValue}>{sizeDetectorData.height} {sizeDetectorData.heightUnit}</Text>
                </View>
                <View style={styles.scanInfoRow}>
                  <Text style={styles.scanInfoLabel}>Peso:</Text>
                  <Text style={styles.scanInfoValue}>{sizeDetectorData.weight} {sizeDetectorData.weightUnit}</Text>
                </View>
                <View style={styles.scanInfoRow}>
                  <Text style={styles.scanInfoLabel}>Ajuste:</Text>
                  <Text style={styles.scanInfoValue}>{sizeDetectorData.fitType}</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.gdprWarning}>
            <AlertTriangle size={16} color="#F59E0B" />
            <Text style={styles.gdprWarningText}>
              Estos datos se borrarán definitivamente de manera irreversible si no los exporta a su móvil. Deberá volver a cumplir con el consentimiento y volver a capturar sus fotos. En el caso contrario, solo conectando con su móvil volverá a generar sus datos en cualquier espejo de nuestra marca.
            </Text>
          </View>

          <View style={styles.gdprButtonsContainer}>
            <TouchableOpacity 
              style={styles.gdprButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                if (Platform.OS === 'web') {
                  alert('Función de compartir disponible en la app móvil');
                } else {
                  Alert.alert('Compartir', 'Preparando datos para compartir...');
                }
              }}
            >
              <Share2 size={18} color={Colors.light.primary} />
              <Text style={styles.gdprButtonText}>Compartir</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.gdprButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                if (Platform.OS === 'web') {
                  alert('Bluetooth no disponible en navegador');
                } else {
                  Alert.alert('Bluetooth', 'Buscando dispositivos cercanos...');
                }
              }}
            >
              <Bluetooth size={18} color={Colors.light.primary} />
              <Text style={styles.gdprButtonText}>Bluetooth</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.gdprButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                if (Platform.OS === 'web') {
                  alert('Exportando datos... (simulado)');
                } else {
                  Alert.alert('Exportar', 'Preparando exportación de datos...');
                }
              }}
            >
              <Download size={18} color={Colors.light.primary} />
              <Text style={styles.gdprButtonText}>Exportar</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.deleteProfileButton}
            onPress={showDeleteProfileConfirmation}
          >
            <Trash2 size={18} color="#FFFFFF" />
            <Text style={styles.deleteProfileButtonText}>Borrar Perfil Completo (Datos, Escaneos y Medidas)</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Soporte</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <HelpCircle size={20} color={Colors.light.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Centro de Ayuda</Text>
            <Text style={styles.settingDescription}>Preguntas frecuentes y tutoriales</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Info size={20} color={Colors.light.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Acerca de</Text>
            <Text style={styles.settingDescription}>Versión 1.0.0</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Virtual Mirror v1.0.0</Text>
        <Text style={styles.footerSubtext}>Probador Virtual Profesional</Text>
      </View>

      <Modal
        visible={showApiKeyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowApiKeyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Key size={28} color={Colors.light.primary} />
              <Text style={styles.modalTitle}>Configurar Google Cloud</Text>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDescription}>
                Para usar comandos vocales en Android, necesitas configurar tu API Key de Google Cloud Speech-to-Text.
              </Text>

              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Tu información:</Text>
                <Text style={styles.infoText}>Número: 739627450164</Text>
                <Text style={styles.infoText}>ID: second-elf-479113-i0</Text>
              </View>

              <View style={styles.stepsCard}>
                <Text style={styles.stepsTitle}>Pasos para obtener la API Key:</Text>
                <Text style={styles.stepText}>1. Ve a console.cloud.google.com</Text>
                <Text style={styles.stepText}>2. Selecciona tu proyecto</Text>
                <Text style={styles.stepText}>3. Ve a APIs y servicios → Credenciales</Text>
                <Text style={styles.stepText}>4. Crea una API Key</Text>
                <Text style={styles.stepText}>5. Habilita Speech-to-Text API</Text>
              </View>

              <TextInput
                style={styles.apiKeyInput}
                placeholder="Pega tu API Key aquí"
                placeholderTextColor={Colors.light.textSecondary}
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowApiKeyModal(false);
                  setApiKeyInput('');
                }}
              >
                <XCircle size={18} color={Colors.light.text} />
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButtonSave,
                  !apiKeyInput.trim() && styles.modalButtonDisabled
                ]}
                onPress={() => {
                  if (apiKeyInput.trim()) {
                    setGoogleCloudApiKey(apiKeyInput.trim());
                    Alert.alert(
                      'Configuración Guardada',
                      'La API Key de Google Cloud se configuró correctamente. Ahora puedes usar comandos vocales en Android.'
                    );
                    setShowApiKeyModal(false);
                    setApiKeyInput('');
                  }
                }}
                disabled={!apiKeyInput.trim()}
              >
                <CheckCircle2 size={18} color="#FFFFFF" />
                <Text style={styles.modalButtonSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Management Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Users size={28} color={Colors.light.primary} />
              <Text style={styles.modalTitle}>Gestionar Perfiles</Text>
            </View>

            <View style={styles.profilesListContainer}>
              <Text style={styles.sectionSubtitle}>Mis Perfiles</Text>
              <FlatList
                data={profiles}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      styles.profileItem,
                      userProfile.id === item.id && styles.profileItemActive
                    ]}
                    onPress={() => {
                      switchProfile(item.id);
                      setShowProfileModal(false);
                    }}
                  >
                    <View style={styles.profileItemLeft}>
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.profileAvatarSmall} />
                      ) : (
                        <View style={styles.profileAvatarPlaceholder}>
                          <User size={20} color={Colors.light.primary} />
                        </View>
                      )}
                      <View>
                        <Text style={[
                          styles.profileName,
                          userProfile.id === item.id && styles.profileNameActive
                        ]}>{item.name}</Text>
                        {item.isPrivate && (
                          <View style={styles.privateTag}>
                            <Lock size={10} color="#FFFFFF" />
                            <Text style={styles.privateTagText}>Privado</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {userProfile.id === item.id && (
                      <CheckCircle2 size={20} color={Colors.light.primary} />
                    )}
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 200 }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.newProfileForm}>
              <Text style={styles.sectionSubtitle}>Crear Nuevo Perfil</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre del perfil"
                value={newProfileName}
                onChangeText={setNewProfileName}
              />
              <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                  <Lock size={16} color={Colors.light.textSecondary} />
                  <Text style={styles.switchLabel}>Perfil Privado</Text>
                </View>
                <Switch
                  value={isNewProfilePrivate}
                  onValueChange={setIsNewProfilePrivate}
                  trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalButtonSave,
                  !newProfileName.trim() && styles.modalButtonDisabled
                ]}
                onPress={handleCreateProfile}
                disabled={!newProfileName.trim()}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.modalButtonSaveText}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Edit2 size={28} color={Colors.light.primary} />
              <Text style={styles.modalTitle}>Editar Perfil</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Nombre</Text>
              <TextInput
                style={styles.input}
                placeholder="Tu nombre"
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel}
                onPress={() => setShowEditProfileModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalButtonSave,
                  !editName.trim() && styles.modalButtonDisabled
                ]}
                onPress={handleUpdateProfile}
                disabled={!editName.trim()}
              >
                <CheckCircle2 size={18} color="#FFFFFF" />
                <Text style={styles.modalButtonSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.light.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  profilesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  profilesButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  privateBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold' as const,
  },
  profilesListContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    marginBottom: 12,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  profileItemActive: {
    borderColor: Colors.light.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  profileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profileAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  profileNameActive: {
    color: Colors.light.primary,
  },
  privateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.text,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  privateTagText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: 'bold' as const,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginBottom: 20,
  },
  newProfileForm: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 12,
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: Colors.light.text,
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 2,
  },
  historyDetails: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  historyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  insightsEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 16,
  },
  insightsTitle: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    textAlign: 'center',
  },
  insightsSubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 16,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
    justifyContent: 'center',
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  insightsHint: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  insightsResult: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 16,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  insightsResultTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
  },
  insightsScroll: {
    maxHeight: 400,
  },
  insightsText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 24,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  regenerateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  tabActive: {
    backgroundColor: Colors.light.card,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  tabTextActive: {
    color: Colors.light.primary,
  },
  tabContent: {
    gap: 12,
  },
  triedItemCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 12,
  },
  triedItemImage: {
    width: 80,
    height: 100,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  triedItemInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  triedItemBrand: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '600' as const,
  },
  triedItemName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  triedItemPrice: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.light.primary,
  },
  triedItemDate: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  triedItemActions: {
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  exploreButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  scanInfo: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  scanInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scanInfoLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  scanInfoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  scanInfoDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 8,
  },
  scanInfoHighlight: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.light.primary,
  },
  clearButton: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  scanPhotosRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scanPhotoContainer: {
    alignItems: 'center',
  },
  scanPhotoThumb: {
    width: 50,
    height: 70,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  scanPhotoLabel: {
    fontSize: 9,
    color: Colors.light.textSecondary,
    marginTop: 4,
    fontWeight: '600' as const,
  },
  gdprWarning: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  gdprWarningText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
  gdprButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  gdprButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  gdprButtonText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.light.primary,
    textAlign: 'center',
  },
  deleteProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#DC2626',
  },
  deleteProfileButtonText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  compositeImage: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  compositeLabel: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compositeLabelText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
  },
  modalDescription: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    marginBottom: 4,
  },
  stepsCard: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1E40AF',
    marginBottom: 10,
  },
  stepText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
    marginBottom: 4,
  },
  apiKeyInput: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: Colors.light.text,
    borderWidth: 2,
    borderColor: Colors.light.border,
    marginBottom: 20,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  modalButtonSave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  speakButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  speakButtonActive: {
    backgroundColor: Colors.light.primary,
  },
});
