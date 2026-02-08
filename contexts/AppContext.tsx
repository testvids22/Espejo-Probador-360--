import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

/** Estadísticas anónimas persistentes: no se borran al resetear/borrar perfil. */
export type PersistentAnalytics = {
  totalTries: number;
  totalFavorites: number;
  totalShared: number;
  favoriteCategories: Record<string, number>;
  favoriteBrands: Record<string, number>;
  mostTriedColors: Record<string, number>;
  priceRange: { min: number; max: number; avg: number };
  /** Últimas pruebas anónimas (para Analytics e Insights); max 30 */
  recentTriesAnonymous: Array<{ category: string; brand: string; name: string; price: number; date: string }>;
  lastUpdated: string;
};

const EMPTY_PERSISTENT_ANALYTICS: PersistentAnalytics = {
  totalTries: 0,
  totalFavorites: 0,
  totalShared: 0,
  favoriteCategories: {},
  favoriteBrands: {},
  mostTriedColors: {},
  priceRange: { min: Infinity, max: 0, avg: 0 },
  recentTriesAnonymous: [],
  lastUpdated: new Date().toISOString(),
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
  /** Estadísticas anónimas: no se borran al borrar perfil (para Analytics/Insights). */
  persistentAnalytics: PersistentAnalytics;
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
  /** No se borra con clearAllProfileData. */
  PERSISTENT_ANALYTICS: '@app_persistent_analytics',
};

const MAX_PROFILES = 50;

/** Para no persistir vídeos 360º (peso): guardamos solo metadatos; URLs/frames quedan en sesión en memoria. */
function triedItemsForStorage(items: TriedItem[]): TriedItem[] {
  return items.map(ti => ({
    ...ti,
    view360: ti.view360 ? { isReady: false, generating: false } : undefined,
  }));
}

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
    persistentAnalytics: EMPTY_PERSISTENT_ANALYTICS,
  });

  const loadPersistedData = useCallback(async () => {
    try {
      // 1. Load global / persistent data (no se borra al borrar perfil)
      const [userProfileStr, profilesStr, customCatalogStr, persistentAnalyticsStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.PROFILES),
        AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_CATALOG),
        AsyncStorage.getItem(STORAGE_KEYS.PERSISTENT_ANALYTICS),
      ]);

      const userProfile = userProfileStr ? JSON.parse(userProfileStr) : DEFAULT_PROFILE;
      const profiles = profilesStr 
        ? JSON.parse(profilesStr).slice(0, MAX_PROFILES) 
        : [DEFAULT_PROFILE];
      const customCatalog = customCatalogStr ? JSON.parse(customCatalogStr) : null;
      const persistentAnalytics: PersistentAnalytics = persistentAnalyticsStr
        ? { ...EMPTY_PERSISTENT_ANALYTICS, ...JSON.parse(persistentAnalyticsStr), recentTriesAnonymous: (JSON.parse(persistentAnalyticsStr).recentTriesAnonymous || []).slice(0, 30) }
        : EMPTY_PERSISTENT_ANALYTICS;

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
        persistentAnalytics,
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
      // Solo datos del perfil. NO borrar: CUSTOM_CATALOG, PERSISTENT_ANALYTICS (catálogos y estadísticas se conservan).
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

      const pa = prev.persistentAnalytics;
      const nextPa: PersistentAnalytics = isFavorite
        ? {
            ...pa,
            totalFavorites: Math.max(0, pa.totalFavorites - 1),
            favoriteCategories: { ...pa.favoriteCategories, [item.category]: Math.max(0, (pa.favoriteCategories[item.category] || 0) - 1) },
            favoriteBrands: { ...pa.favoriteBrands, [item.brand]: Math.max(0, (pa.favoriteBrands[item.brand] || 0) - 1) },
            lastUpdated: new Date().toISOString(),
          }
        : {
            ...pa,
            totalFavorites: pa.totalFavorites + 1,
            favoriteCategories: { ...pa.favoriteCategories, [item.category]: (pa.favoriteCategories[item.category] || 0) + 1 },
            favoriteBrands: { ...pa.favoriteBrands, [item.brand]: (pa.favoriteBrands[item.brand] || 0) + 1 },
            lastUpdated: new Date().toISOString(),
          };
      AsyncStorage.setItem(STORAGE_KEYS.PERSISTENT_ANALYTICS, JSON.stringify(nextPa)).catch(() => {});

      return { ...prev, favorites: newFavorites, persistentAnalytics: nextPa };
    });
  }, [state.userProfile.id]);

  const isFavorite = useCallback((itemId: string): boolean => {
    return state.favorites.some(fav => fav.id === itemId);
  }, [state.favorites]);

  const addTriedItem = useCallback(async (item: ClothingItem, compositeImage?: string, userPhoto?: string) => {
    const now = new Date().toISOString();
    setState(prev => {
      const existingIndex = prev.triedItems.findIndex(ti => ti.item.id === item.id);
      
      let newTriedItems: TriedItem[];
      if (existingIndex >= 0) {
        newTriedItems = [...prev.triedItems];
        newTriedItems[existingIndex] = {
          item,
          date: now,
          compositeImage,
          userPhoto,
        };
      } else {
        newTriedItems = [
          { item, date: now, compositeImage, userPhoto },
          ...prev.triedItems,
        ];
      }

      const key = `${STORAGE_KEYS.TRIED_ITEMS}_${state.userProfile.id}`;
      AsyncStorage.setItem(key, JSON.stringify(triedItemsForStorage(newTriedItems))).catch(error => {
        console.error('Error adding tried item:', error);
      });

      const pa = prev.persistentAnalytics;
      const recent = [{ category: item.category, brand: item.brand, name: item.name, price: item.price, date: now }, ...pa.recentTriesAnonymous].slice(0, 30);
      const isNewTry = existingIndex < 0;
      const nextPa: PersistentAnalytics = isNewTry
        ? {
            ...pa,
            totalTries: pa.totalTries + 1,
            favoriteCategories: { ...pa.favoriteCategories, [item.category]: (pa.favoriteCategories[item.category] || 0) + 1 },
            favoriteBrands: { ...pa.favoriteBrands, [item.brand]: (pa.favoriteBrands[item.brand] || 0) + 1 },
            mostTriedColors: item.color ? { ...pa.mostTriedColors, [item.color]: (pa.mostTriedColors[item.color] || 0) + 1 } : pa.mostTriedColors,
            priceRange: {
              min: Math.min(pa.priceRange.min, item.price),
              max: Math.max(pa.priceRange.max, item.price),
              avg: (pa.priceRange.avg * pa.totalTries + item.price) / (pa.totalTries + 1),
            },
            recentTriesAnonymous: recent,
            lastUpdated: now,
          }
        : { ...pa, recentTriesAnonymous: recent, lastUpdated: now };
      AsyncStorage.setItem(STORAGE_KEYS.PERSISTENT_ANALYTICS, JSON.stringify(nextPa)).catch(() => {});

      return { ...prev, triedItems: newTriedItems, persistentAnalytics: nextPa };
    });
  }, [state.userProfile.id]);

  const markItemAsShared = useCallback(async (itemId: string) => {
    setState(prev => {
      const newTriedItems = prev.triedItems.map(ti =>
        ti.item.id === itemId ? { ...ti, shared: true } : ti
      );

      const key = `${STORAGE_KEYS.TRIED_ITEMS}_${state.userProfile.id}`;
      AsyncStorage.setItem(key, JSON.stringify(triedItemsForStorage(newTriedItems))).catch(error => {
        console.error('Error marking item as shared:', error);
      });

      const pa = prev.persistentAnalytics;
      const nextPa: PersistentAnalytics = { ...pa, totalShared: pa.totalShared + 1, lastUpdated: new Date().toISOString() };
      AsyncStorage.setItem(STORAGE_KEYS.PERSISTENT_ANALYTICS, JSON.stringify(nextPa)).catch(() => {});

      return { ...prev, triedItems: newTriedItems, persistentAnalytics: nextPa };
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

  /** Estadísticas persistentes (anónimas): no se borran al borrar perfil. Para pestaña Analytics e Insights. */
  const getPersistentPreferenceStats = useCallback(() => {
    const pa = state.persistentAnalytics;
    return {
      favoriteCategories: { ...pa.favoriteCategories },
      favoriteBrands: { ...pa.favoriteBrands },
      priceRange: { ...pa.priceRange, avg: pa.totalTries > 0 ? pa.priceRange.avg : 0 },
      mostTriedColors: { ...pa.mostTriedColors },
      totalTries: pa.totalTries,
      totalFavorites: pa.totalFavorites,
      totalShared: pa.totalShared,
    };
  }, [state.persistentAnalytics]);

  /** Últimas pruebas anónimas para el prompt de Insights (perfil). */
  const getPersistentRecentTriesForInsights = useCallback(() => {
    return state.persistentAnalytics.recentTriesAnonymous.slice(0, 20);
  }, [state.persistentAnalytics.recentTriesAnonymous]);

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

    setState(prev => {
      const existingItem = prev.triedItems.find(ti => ti.item.id === itemId);
      const newTriedItems = prev.triedItems.map(ti =>
        ti.item.id === itemId
          ? {
              ...ti,
              compositeImage,
              userPhoto,
              view360: existingItem?.view360 || { generating: false, isReady: false },
            }
          : ti
      );

      const key = `${STORAGE_KEYS.TRIED_ITEMS}_${prev.userProfile.id}`;
      AsyncStorage.setItem(key, JSON.stringify(triedItemsForStorage(newTriedItems))).catch(error => {
        console.error('Error updating tried item with composite:', error);
      });

      return { ...prev, triedItems: newTriedItems };
    });
  }, [state.userProfile.id]);

  // Ref para abrir la pestaña 360º al terminar, con itemId para que la pestaña muestre ese favorito
  const on360ReadyOpenTabRef = React.useRef<((itemId?: string) => void) | null>(null);

  // Generación 360º solo bajo petición explícita (p. ej. comando de voz "sí quiero")
  // compositeImageOverride: si la prenda aún no tiene composite en estado (p. ej. 2.ª prenda), pasar la imagen recién guardada
  // onReady: si se pasa, al terminar se llama con itemId para abrir 360º mostrando ese ítem
  const start360GenerationForItem = useCallback((itemId: string, compositeImageOverride?: string, onReady?: (itemId?: string) => void) => {
    if (onReady) {
      on360ReadyOpenTabRef.current = onReady;
    }
    setState(prev => {
      const item = prev.triedItems.find(ti => ti.item.id === itemId);
      const compositeImage = compositeImageOverride ?? item?.compositeImage;
      const alreadyGenerating = item?.view360?.generating === true;
      const alreadyReady = !!(item?.view360?.wanUrl || item?.view360?.klingUrl);
      if (!compositeImage || alreadyGenerating || alreadyReady) {
        return prev;
      }
      const newTriedItems = prev.triedItems.map(ti =>
        ti.item.id === itemId
          ? { ...ti, view360: { ...ti.view360, generating: true, isReady: false } }
          : ti
      );
      const key = `${STORAGE_KEYS.TRIED_ITEMS}_${prev.userProfile.id}`;
      AsyncStorage.setItem(key, JSON.stringify(triedItemsForStorage(newTriedItems))).catch(console.error);

      import('../lib/generate-360-background').then(({ generate360InBackground }) => {
        generate360InBackground(compositeImage).then((result) => {
          if (result.klingUrl) {
            setState(prevState => {
              const updatedTriedItems = prevState.triedItems.map(ti =>
                ti.item.id === itemId
                  ? {
                      ...ti,
                      view360: {
                        ...ti.view360,
                        wanUrl: undefined,
                        klingUrl: result.klingUrl,
                        carouselFrames: result.carouselFrames || [],
                        isReady: true,
                        generating: false,
                      },
                    }
                  : ti
              );
              const storageKey = `${STORAGE_KEYS.TRIED_ITEMS}_${prevState.userProfile.id}`;
              AsyncStorage.setItem(storageKey, JSON.stringify(triedItemsForStorage(updatedTriedItems))).catch(console.error);
              return { ...prevState, triedItems: updatedTriedItems };
            });
            const openTab = on360ReadyOpenTabRef.current;
            on360ReadyOpenTabRef.current = null;
            if (openTab) {
              try {
                openTab(itemId);
              } catch (e) {
                console.warn('on360Ready callback error:', e);
              }
            }
            if (Platform.OS !== 'web') {
              import('expo-speech').then((Speech) => {
                Speech.default.speak('Vista de tres sesenta lista. Ya puedes ver cómo te queda desde todos los ángulos.', { language: 'es-ES', rate: 0.9 });
              }).catch(() => {});
            }
          }
        }).catch((error) => {
          console.error('❌ [AppContext] Error en generación 360º:', error);
          on360ReadyOpenTabRef.current = null;
          if (Platform.OS === 'web') {
            const errorMessage = error?.message || error?.toString() || 'Error desconocido';
            alert(`❌ Error en generación 360º:\n\n${errorMessage}`);
          }
          setState(prevState => ({
            ...prevState,
            triedItems: prevState.triedItems.map(ti =>
              ti.item.id === itemId
                ? { ...ti, view360: { ...ti.view360, generating: false, isReady: false } }
                : ti
            ),
          }));
        });
      });
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
      AsyncStorage.setItem(key, JSON.stringify(triedItemsForStorage(updatedTriedItems))).catch(console.error);
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
    getPersistentPreferenceStats,
    getPersistentRecentTriesForInsights,
    saveSizeDetectorData,
    updateUserProfile,
    addProfile,
    switchProfile,
    updateTriedItemWithComposite,
    start360GenerationForItem,
    updateTriedItemView360Frames,
    setPendingAutoTryOn,
    setPendingCatalogItemId,
    setCustomCatalog,
    clearCustomCatalog,
    setAutoTriggerDetection,
  }), [state, saveScanData, clearScanData, clearAllProfileData, toggleFavorite, isFavorite, addTriedItem, markItemAsShared, recentTriedItems, getPreferenceStats, getPersistentPreferenceStats, getPersistentRecentTriesForInsights, saveSizeDetectorData, updateUserProfile, addProfile, switchProfile, updateTriedItemWithComposite, start360GenerationForItem, updateTriedItemView360Frames, setPendingAutoTryOn, setPendingCatalogItemId, setCustomCatalog, clearCustomCatalog, setAutoTriggerDetection]);
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
