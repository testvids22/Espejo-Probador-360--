import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';

export type UserProfile = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar: string;
  isPrivate?: boolean;
};

export type ClothingItem = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  image: string;
  model3d?: string;
  size?: string;
  color?: string;
  tags?: string[];
  availableColors?: string[];
  recommendedSize?: string;
  compositeImage?: string;
};

export type ScanData = {
  photos?: string[];
  photoCount?: number;
  date: string;
  completed: boolean;
  scanId?: string;
};

export type SizeDetectorData = {
  height: string;
  weight: string;
  age: string;
  waist: 'plana' | 'media' | 'curvada' | null;
  hips: 'delgada' | 'media' | 'curvada' | null;
  heightUnit: 'cm' | 'in';
  weightUnit: 'kg' | 'lb';
  fitType: 'ajustado' | 'holgado';
  recommendedSize: string;
  scanId: string;
};

export type TriedItem = {
  item: ClothingItem;
  date: string;
  shared?: boolean;
  compositeImage?: string;
  userPhoto?: string;
  bodyMeasurements?: {
    shoulders: number;
    chest: number;
    waist: number;
    hips: number;
  };
  view360?: {
    wanUrl?: string;
    klingUrl?: string;
    carouselFrames?: string[];
    isReady: boolean;
    generating: boolean;
  };
};

export type CustomCatalog = {
  url: string;
  items: ClothingItem[];
  loadedAt: string;
};

type AppState = {
  scanData: ScanData | null;
  favorites: ClothingItem[];
  triedItems: TriedItem[];
  sizeDetectorData: SizeDetectorData | null;
  userProfile: UserProfile;
  profiles: UserProfile[];
  isLoading: boolean;
  pendingAutoTryOn: boolean;
  /** ID de la prenda recién añadida desde el catálogo; Mirror lo usa para seleccionarla */
  pendingCatalogItemId: string | null;
  customCatalog: CustomCatalog | null;
  autoTriggerDetection: boolean;
};

const STORAGE_KEYS = {
  SCAN_DATA: '@app_scan_data',
  FAVORITES: '@app_favorites',
  TRIED_ITEMS: '@app_tried_items',
  SIZE_DETECTOR: '@app_size_detector',
  USER_PROFILE: '@app_user_profile',
  PROFILES: '@app_profiles',
  CUSTOM_CATALOG: '@app_custom_catalog',
  SHOW_BOOT_VIDEO: '@app_show_boot_video',
};

const MAX_PROFILES = 50;

const DEFAULT_PROFILE: UserProfile = {
  id: 'default',
  name: 'Usuario Principal',
  avatar: '',
  isPrivate: false,
};

export const [AppProvider, useApp] = createContextHook(() => {
  const [state, setState] = useState<AppState>({
    scanData: null,
    favorites: [],
    triedItems: [],
    sizeDetectorData: null,
    userProfile: DEFAULT_PROFILE,
    profiles: [DEFAULT_PROFILE],
    isLoading: true,
    pendingAutoTryOn: false,
    pendingCatalogItemId: null,
    customCatalog: null,
    autoTriggerDetection: false,
  });

  const loadPersistedData = useCallback(async () => {
    try {
      // 1. Load global settings first (profiles and current user profile)
      const [userProfileStr, profilesStr, customCatalogStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.PROFILES),
        AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_CATALOG),
      ]);

      const userProfile = userProfileStr ? JSON.parse(userProfileStr) : DEFAULT_PROFILE;
      const profiles = profilesStr 
        ? JSON.parse(profilesStr).slice(0, MAX_PROFILES) 
        : [DEFAULT_PROFILE];
      const customCatalog = customCatalogStr ? JSON.parse(customCatalogStr) : null;

      // 2. Load profile-specific data
      const profileId = userProfile.id;
      const [scanDataStr, favoritesStr, triedItemsStr, sizeDetectorStr] = await Promise.all([
        AsyncStorage.getItem(`${STORAGE_KEYS.SCAN_DATA}_${profileId}`),
        AsyncStorage.getItem(`${STORAGE_KEYS.FAVORITES}_${profileId}`),
        AsyncStorage.getItem(`${STORAGE_KEYS.TRIED_ITEMS}_${profileId}`),
        AsyncStorage.getItem(`${STORAGE_KEYS.SIZE_DETECTOR}_${profileId}`),
      ]);

      // Fallback to legacy keys if profile-specific data is missing (for migration)
      // Only for the default profile or if it's the first run after update
      let legacyFavorites = [];
      let legacyTriedItems = [];
      if (!favoritesStr && profileId === 'default') {
        const legacyFavStr = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
        if (legacyFavStr) legacyFavorites = JSON.parse(legacyFavStr);
      }
      if (!triedItemsStr && profileId === 'default') {
        const legacyTriedStr = await AsyncStorage.getItem(STORAGE_KEYS.TRIED_ITEMS);
        if (legacyTriedStr) legacyTriedItems = JSON.parse(legacyTriedStr);
      }

      setState({
        scanData: scanDataStr ? JSON.parse(scanDataStr) : null,
        favorites: favoritesStr ? JSON.parse(favoritesStr) : legacyFavorites,
        triedItems: triedItemsStr ? JSON.parse(triedItemsStr) : legacyTriedItems,
        sizeDetectorData: sizeDetectorStr ? JSON.parse(sizeDetectorStr) : null,
        userProfile,
        profiles,
        isLoading: false,
        pendingAutoTryOn: false,
        customCatalog,
        autoTriggerDetection: false,
      });
    } catch (error) {
      console.error('Error loading persisted data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    loadPersistedData();
  }, [loadPersistedData]);

  const saveScanData = useCallback(async (photos: string[]) => {
    try {
      let savedPhotos: string[] = [];
      
      if (Platform.OS !== 'web') {
        savedPhotos = photos;
        console.log('Saved photo URIs:', savedPhotos);
      } else {
        savedPhotos = photos;
      }
      
      const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const scanData: ScanData = {
        photos: savedPhotos,
        date: new Date().toISOString(),
        completed: savedPhotos.length === 2,
        scanId,
      };
      
      const key = `${STORAGE_KEYS.SCAN_DATA}_${state.userProfile.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(scanData));
      
      setState(prev => ({ 
        ...prev, 
        scanData,
        // Clear size detector data when new scan is saved to force reset in UI
        sizeDetectorData: null 
      }));
      console.log('Scan data saved successfully with', savedPhotos.length, 'photos');
    } catch (error) {
      console.error('Error saving scan data:', error);
    }
  }, [state.userProfile.id]);

  const clearScanData = useCallback(async () => {
    try {
      const profileId = state.userProfile.id;
      await AsyncStorage.multiRemove([
        `${STORAGE_KEYS.SCAN_DATA}_${profileId}`,
        `${STORAGE_KEYS.SIZE_DETECTOR}_${profileId}`
      ]);
      setState(prev => ({ ...prev, scanData: null, sizeDetectorData: null }));
      console.log('Scan data and size detector data cleared successfully');
    } catch (error) {
      console.error('Error clearing scan data:', error);
    }
  }, [state.userProfile.id]);

  const clearAllProfileData = useCallback(async () => {
    try {
      const profileId = state.userProfile.id;
      await AsyncStorage.multiRemove([
        `${STORAGE_KEYS.SCAN_DATA}_${profileId}`,
        `${STORAGE_KEYS.SIZE_DETECTOR}_${profileId}`,
        `${STORAGE_KEYS.FAVORITES}_${profileId}`,
        `${STORAGE_KEYS.TRIED_ITEMS}_${profileId}`,
      ]);
      
      // Sin datos de relleno: nombre vacío para que el siguiente usuario se registre desde cero
      const resetProfile: UserProfile = {
        ...DEFAULT_PROFILE,
        id: profileId,
        name: '',
        avatar: '',
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(resetProfile));
      
      // Update profiles list with reset profile
      const updatedProfiles = state.profiles.map(p => 
        p.id === profileId ? resetProfile : p
      );
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(updatedProfiles));
      
      setState(prev => ({ 
        ...prev, 
        scanData: null, 
        sizeDetectorData: null,
        favorites: [],
        triedItems: [],
        userProfile: resetProfile,
        profiles: updatedProfiles,
        pendingAutoTryOn: false,
        pendingCatalogItemId: null,
      }));
      await AsyncStorage.setItem(STORAGE_KEYS.SHOW_BOOT_VIDEO, 'true');
      console.log('All profile data cleared successfully including name (GDPR compliance)');
    } catch (error) {
      console.error('Error clearing all profile data:', error);
    }
  }, [state.userProfile.id, state.profiles]);

  const toggleFavorite = useCallback(async (item: ClothingItem, compositeImage?: string) => {
    setState(prev => {
      const isFavorite = prev.favorites.some(fav => fav.id === item.id);
      const itemWithComposite = compositeImage ? { ...item, compositeImage } : item;
      const newFavorites = isFavorite
        ? prev.favorites.filter(fav => fav.id !== item.id)
        : [...prev.favorites, itemWithComposite];

      const key = `${STORAGE_KEYS.FAVORITES}_${state.userProfile.id}`;
      AsyncStorage.setItem(key, JSON.stringify(newFavorites)).catch(error => {
        console.error('Error toggling favorite:', error);
      });

      return { ...prev, favorites: newFavorites };
    });
  }, [state.userProfile.id]);

  const isFavorite = useCallback((itemId: string): boolean => {
    return state.favorites.some(fav => fav.id === itemId);
  }, [state.favorites]);

  const addTriedItem = useCallback(async (item: ClothingItem, compositeImage?: string, userPhoto?: string) => {
    setState(prev => {
      const existingIndex = prev.triedItems.findIndex(ti => ti.item.id === item.id);
      
      let newTriedItems: TriedItem[];
      if (existingIndex >= 0) {
        newTriedItems = [...prev.triedItems];
        newTriedItems[existingIndex] = {
          item,
          date: new Date().toISOString(),
          compositeImage,
          userPhoto,
        };
      } else {
        newTriedItems = [
          { item, date: new Date().toISOString(), compositeImage, userPhoto },
          ...prev.triedItems,
        ];
      }

      const key = `${STORAGE_KEYS.TRIED_ITEMS}_${state.userProfile.id}`;
      AsyncStorage.setItem(key, JSON.stringify(newTriedItems)).catch(error => {
        console.error('Error adding tried item:', error);
      });

      return { ...prev, triedItems: newTriedItems };
    });
  }, [state.userProfile.id]);

  const markItemAsShared = useCallback(async (itemId: string) => {
    setState(prev => {
      const newTriedItems = prev.triedItems.map(ti =>
        ti.item.id === itemId ? { ...ti, shared: true } : ti
      );

      const key = `${STORAGE_KEYS.TRIED_ITEMS}_${state.userProfile.id}`;
      AsyncStorage.setItem(key, JSON.stringify(newTriedItems)).catch(error => {
        console.error('Error marking item as shared:', error);
      });

      return { ...prev, triedItems: newTriedItems };
    });
  }, [state.userProfile.id]);

  const recentTriedItems = useMemo(() => {
    return state.triedItems.slice(0, 3);
  }, [state.triedItems]);

  const getPreferenceStats = useCallback(() => {
    const stats = {
      favoriteCategories: {} as Record<string, number>,
      favoriteBrands: {} as Record<string, number>,
      priceRange: { min: Infinity, max: 0, avg: 0 },
      mostTriedColors: {} as Record<string, number>,
      totalTries: state.triedItems.length,
      totalFavorites: state.favorites.length,
      totalShared: state.triedItems.filter(t => t.shared).length,
    };

    state.triedItems.forEach(({ item }) => {
      stats.favoriteCategories[item.category] = (stats.favoriteCategories[item.category] || 0) + 1;
      stats.favoriteBrands[item.brand] = (stats.favoriteBrands[item.brand] || 0) + 1;
      stats.priceRange.min = Math.min(stats.priceRange.min, item.price);
      stats.priceRange.max = Math.max(stats.priceRange.max, item.price);
      if (item.color) {
        stats.mostTriedColors[item.color] = (stats.mostTriedColors[item.color] || 0) + 1;
      }
    });

    const totalPrice = state.triedItems.reduce((sum, { item }) => sum + item.price, 0);
    stats.priceRange.avg = state.triedItems.length > 0 ? totalPrice / state.triedItems.length : 0;

    return stats;
  }, [state.triedItems, state.favorites]);

  const saveSizeDetectorData = useCallback(async (data: Omit<SizeDetectorData, 'scanId'>) => {
    if (!state.scanData?.scanId) {
      console.error('Cannot save size detector data without a scan ID');
      return;
    }

    try {
      const sizeDetectorData: SizeDetectorData = {
        ...data,
        scanId: state.scanData.scanId,
      };
      
      await AsyncStorage.setItem(`${STORAGE_KEYS.SIZE_DETECTOR}_${state.userProfile.id}`, JSON.stringify(sizeDetectorData));
      setState(prev => ({ ...prev, sizeDetectorData }));
      console.log('Size detector data saved successfully for scan:', state.scanData.scanId);
    } catch (error) {
      console.error('Error saving size detector data:', error);
    }
  }, [state.scanData, state.userProfile.id]);

  const updateTriedItemWithComposite = useCallback(async (itemId: string, compositeImage: string, userPhoto: string) => {
    console.log('[AppContext] updateTriedItemWithComposite llamado');
    console.log('[AppContext] Item ID:', itemId);
    console.log('[AppContext] CompositeImage existe:', !!compositeImage);
    console.log('[AppContext] CompositeImage tipo:', compositeImage?.substring(0, 20) || 'undefined');

    setState(prev => {
      const existingItem = prev.triedItems.find(ti => ti.item.id === itemId);
      const alreadyGenerating = existingItem?.view360?.generating === true;
      const alreadyHasUrls = !!(existingItem?.view360?.wanUrl || existingItem?.view360?.klingUrl);
      const skip360Generation = alreadyGenerating || alreadyHasUrls;
      if (skip360Generation) {
        console.log('[AppContext] ⏭️ No se inicia 360º: ya generando o ya tiene URLs para item', itemId);
      }

      const newTriedItems = prev.triedItems.map(ti =>
        ti.item.id === itemId
          ? {
              ...ti,
              compositeImage,
              userPhoto,
              view360: skip360Generation
                ? (existingItem?.view360 || { generating: false, isReady: false })
                : {
                    ...ti.view360,
                    generating: true,
                    isReady: false,
                  },
            }
          : ti
      );

      const key = `${STORAGE_KEYS.TRIED_ITEMS}_${prev.userProfile.id}`;
      AsyncStorage.setItem(key, JSON.stringify(newTriedItems)).catch(error => {
        console.error('Error updating tried item with composite:', error);
      });

      // Iniciar generación 360º solo si no estaba ya generando ni tiene URLs (evitar 4x misma generación)
      if (compositeImage && !skip360Generation) {
        console.log('🚀 [AppContext] ========================================');
        console.log('🚀 [AppContext] INICIANDO GENERACIÓN 360º');
        console.log('🚀 [AppContext] Item ID:', itemId);
        console.log('🚀 [AppContext] CompositeImage tipo:', compositeImage.substring(0, 50) + '...');
        
        // Verificar API keys antes de iniciar (solo para logging, no bloquear)
        // Usar import dinámico con .then() en lugar de await para evitar problemas de sintaxis
        import('@/lib/api-keys-expo').then(({ getApiKeysForExpo }) => {
          return getApiKeysForExpo();
        }).then((apiKeys) => {
          console.log('🚀 [AppContext] API Key disponible:', !!apiKeys.FAL_KEY && apiKeys.FAL_KEY.length > 20);
          console.log('🚀 [AppContext] API Key valor (primeros 10):', apiKeys.FAL_KEY ? `${apiKeys.FAL_KEY.substring(0, 10)}...` : 'NO CONFIGURADA');
          console.log('🚀 [AppContext] API Key longitud:', apiKeys.FAL_KEY ? apiKeys.FAL_KEY.length : 0);
          
          // NO bloquear - dejar que generate360InBackground maneje el error
          // Esto permite que al menos intente hacer la solicitud a FAL AI
          if (!apiKeys.FAL_KEY || apiKeys.FAL_KEY.length < 20) {
            console.warn('⚠️ [AppContext] API Key parece no estar configurada, pero intentaremos de todas formas');
            console.warn('⚠️ [AppContext] Si falla, será por falta de API key y se mostrará el error correspondiente');
          }
        }).catch((error) => {
          console.warn('⚠️ [AppContext] Error al verificar API keys:', error);
          // Continuar de todas formas
        });
        console.log('🚀 [AppContext] URL de imagen TryOn:', compositeImage.substring(0, 100) + '...');
        console.log('🚀 [AppContext] Tipo:', compositeImage.startsWith('data:') ? 'Data URL' : 'URL');
        
        // Anuncio por voz: inicio de generación (solo en móvil, sin alerts web)
        if (Platform.OS !== 'web') {
          import('expo-speech').then((SpeechModule) => {
            SpeechModule.default.speak('Estoy preparando una sorpresa especial. Podrás ver cómo te queda desde todos los ángulos. Te avisaré cuando esté lista.', {
              language: 'es-ES',
              rate: 0.9,
            });
          }).catch(() => {
            // Si falla el import, continuar sin anuncio
          });
        }
        
        import('../lib/generate-360-background').then(({ generate360InBackground }) => {
          console.log('🚀 [AppContext] generate360InBackground importado correctamente');
          console.log('🚀 [AppContext] Llamando a generate360InBackground...');
          
            // Generar en paralelo y actualizar incrementalmente
            generate360InBackground(compositeImage).then((result) => {
            console.log('✅ [AppContext] ========================================');
            console.log('✅ [AppContext] Generación 360º completada');
            console.log('✅ [AppContext] ========================================');
            console.log('✅ [AppContext] Result.success:', result.success, 'klingUrl:', result.klingUrl ? '✅' : '❌');
            console.log('✅ [AppContext] ========================================');
            
            // Solo KLING: actualizar en cuanto esté listo para que el vídeo aparezca al instante
            if (result.klingUrl) {
              console.log('✅ [AppContext] KLING listo, actualizando estado...');
              setState(prevState => {
                const updatedTriedItems = prevState.triedItems.map(ti => {
                  if (ti.item.id === itemId) {
                    const newView360 = {
                      ...ti.view360,
                      wanUrl: undefined,
                      klingUrl: result.klingUrl,
                      carouselFrames: result.carouselFrames || [],
                      isReady: true,
                      generating: false,
                    };
                    return { ...ti, view360: newView360 };
                  }
                  return ti;
                });
                const storageKey = `${STORAGE_KEYS.TRIED_ITEMS}_${prevState.userProfile.id}`;
                AsyncStorage.setItem(storageKey, JSON.stringify(updatedTriedItems)).catch(console.error);
                return { ...prevState, triedItems: updatedTriedItems };
              });
            }
          }).catch((error) => {
            console.error('❌ [AppContext] Error en generación 360º:', error);
            console.error('❌ [AppContext] Detalles del error:', error.message, error.stack);
            
            // Mostrar alert con el error en web
            if (Platform.OS === 'web') {
              const errorMessage = error?.message || error?.toString() || 'Error desconocido';
              alert(`❌ Error en generación 360º:\n\n${errorMessage}\n\nRevisa la consola (F12) para más detalles.`);
            }
            setState(prevState => {
              const updatedTriedItems = prevState.triedItems.map(ti =>
                ti.item.id === itemId
                  ? {
                      ...ti,
                      view360: {
                        ...ti.view360,
                        generating: false,
                        isReady: false,
                      }
                    }
                  : ti
              );
              return { ...prevState, triedItems: updatedTriedItems };
            });
          });
        });
      }

      return { ...prev, triedItems: newTriedItems };
    });
  }, [state.userProfile.id]);

  const setPendingAutoTryOn = useCallback((value: boolean) => {
    console.log('AppContext: Setting pendingAutoTryOn to', value);
    setState(prev => ({ ...prev, pendingAutoTryOn: value }));
  }, []);

  const setPendingCatalogItemId = useCallback((itemId: string | null) => {
    setState(prev => ({ ...prev, pendingCatalogItemId: itemId }));
  }, []);

  const setCustomCatalog = useCallback(async (url: string, items: ClothingItem[]) => {
    try {
      const customCatalog: CustomCatalog = {
        url,
        items,
        loadedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_CATALOG, JSON.stringify(customCatalog));
      setState(prev => ({ ...prev, customCatalog }));
      console.log('Custom catalog saved with', items.length, 'items from', url);
    } catch (error) {
      console.error('Error saving custom catalog:', error);
    }
  }, []);

  const clearCustomCatalog = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CUSTOM_CATALOG);
      setState(prev => ({ ...prev, customCatalog: null }));
      console.log('Custom catalog cleared');
    } catch (error) {
      console.error('Error clearing custom catalog:', error);
    }
  }, []);

  const setAutoTriggerDetection = useCallback((value: boolean) => {
    console.log('AppContext: Setting autoTriggerDetection to', value);
    setState(prev => ({ ...prev, autoTriggerDetection: value }));
  }, []);

  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setState(prev => {
      const newProfile = { ...prev.userProfile, ...updates };
      AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(newProfile)).catch(e => console.error('Error saving profile:', e));
      
      const newProfiles = prev.profiles.map(p => 
        p.id === newProfile.id ? newProfile : p
      ).slice(0, MAX_PROFILES);
      AsyncStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(newProfiles)).catch(e => console.error('Error saving profiles:', e));
      
      return { ...prev, userProfile: newProfile, profiles: newProfiles };
    });
  }, []);

  const addProfile = useCallback(async (name: string, isPrivate: boolean = false) => {
    const newProfile: UserProfile = {
      id: `profile_${Date.now()}`,
      name,
      avatar: '',
      isPrivate,
    };
    
    setState(prev => {
      const newProfiles = [...prev.profiles, newProfile].slice(0, MAX_PROFILES);
      AsyncStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(newProfiles)).catch(e => console.error('Error saving profiles:', e));
      return { ...prev, profiles: newProfiles };
    });
    
    return newProfile;
  }, []);

  const switchProfile = useCallback(async (profileId: string) => {
    const profile = state.profiles.find(p => p.id === profileId);
    if (profile) {
      try {
        const [scanDataStr, favoritesStr, triedItemsStr, sizeDetectorStr] = await Promise.all([
          AsyncStorage.getItem(`${STORAGE_KEYS.SCAN_DATA}_${profileId}`),
          AsyncStorage.getItem(`${STORAGE_KEYS.FAVORITES}_${profileId}`),
          AsyncStorage.getItem(`${STORAGE_KEYS.TRIED_ITEMS}_${profileId}`),
          AsyncStorage.getItem(`${STORAGE_KEYS.SIZE_DETECTOR}_${profileId}`),
        ]);

        setState(prev => ({ 
          ...prev, 
          userProfile: profile,
          scanData: scanDataStr ? JSON.parse(scanDataStr) : null,
          favorites: favoritesStr ? JSON.parse(favoritesStr) : [],
          triedItems: triedItemsStr ? JSON.parse(triedItemsStr) : [],
          sizeDetectorData: sizeDetectorStr ? JSON.parse(sizeDetectorStr) : null,
        }));
        
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      } catch (error) {
        console.error('Error switching profile data:', error);
        setState(prev => ({ ...prev, userProfile: profile }));
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      }
    }
  }, [state.profiles]);

  const updateTriedItemView360Frames = useCallback(async (itemId: string, carouselFrames: string[]) => {
    setState(prev => {
      const updatedTriedItems = prev.triedItems.map(ti =>
        ti.item.id === itemId && ti.view360
          ? { ...ti, view360: { ...ti.view360, carouselFrames } }
          : ti
      );
      const key = `${STORAGE_KEYS.TRIED_ITEMS}_${prev.userProfile.id}`;
      AsyncStorage.setItem(key, JSON.stringify(updatedTriedItems)).catch(console.error);
      return { ...prev, triedItems: updatedTriedItems };
    });
  }, [state.userProfile.id]);

  return useMemo(() => ({
    ...state,
    saveScanData,
    clearScanData,
    clearAllProfileData,
    toggleFavorite,
    isFavorite,
    addTriedItem,
    markItemAsShared,
    recentTriedItems,
    getPreferenceStats,
    saveSizeDetectorData,
    updateUserProfile,
    addProfile,
    switchProfile,
    updateTriedItemWithComposite,
    updateTriedItemView360Frames,
    setPendingAutoTryOn,
    setPendingCatalogItemId,
    setCustomCatalog,
    clearCustomCatalog,
    setAutoTriggerDetection,
  }), [state, saveScanData, clearScanData, clearAllProfileData, toggleFavorite, isFavorite, addTriedItem, markItemAsShared, recentTriedItems, getPreferenceStats, saveSizeDetectorData, updateUserProfile, addProfile, switchProfile, updateTriedItemWithComposite, updateTriedItemView360Frames, setPendingAutoTryOn, setPendingCatalogItemId, setCustomCatalog, clearCustomCatalog, setAutoTriggerDetection]);
});

export function useFilteredFavorites(category?: string) {
  const { favorites } = useApp();
  
  return useMemo(() => {
    if (!category || category === 'Todos') {
      return favorites;
    }
    return favorites.filter(item => item.category === category);
  }, [favorites, category]);
}

export function useTriedItemsHistory(limit?: number) {
  const { triedItems } = useApp();
  
  return useMemo(() => {
    return limit ? triedItems.slice(0, limit) : triedItems;
  }, [triedItems, limit]);
}
