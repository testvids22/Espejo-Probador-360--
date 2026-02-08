import { useState, useEffect, useCallback, useMemo } from 'react';
import * as React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Platform, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { Search, Filter, Shirt, Heart, X, RefreshCw, Plus, Camera } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useVoice } from '@/contexts/VoiceContext';
import { useReportActivity } from '@/components/InactivityScreensaver';
import VoiceCommandsBanner from '@/components/VoiceCommandsBanner';
import type { ClothingItem } from '@/contexts/AppContext';

// URL del catálogo JSON
// Estructura esperada: { "catalog": [ ...items ], "categories": [...], "brands": [...] }
const CATALOG_URL = 'https://orchids-cat-logo-ropa-oto-o-inviern.vercel.app/catalog.json';

const mockClothes: ClothingItem[] = [
  {
    id: '1',
    name: 'Camiseta Básica Algodón',
    category: 'Camisetas',
    brand: 'ZARA',
    price: 19.95,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
  },
  {
    id: '2',
    name: 'Camisa Formal Slim',
    category: 'Camisas',
    brand: 'MANGO',
    price: 49.99,
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400',
  },
  {
    id: '3',
    name: 'Jeans Skinny Fit',
    category: 'Pantalones',
    brand: 'ZARA',
    price: 39.95,
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
  },
  {
    id: '4',
    name: 'Chaqueta Vaquera',
    category: 'Chaquetas',
    brand: 'MANGO',
    price: 69.99,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
  },
  {
    id: '5',
    name: 'Vestido Midi Estampado',
    category: 'Vestidos',
    brand: 'CORTE INGLES',
    price: 79.95,
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
  },
  {
    id: '6',
    name: 'Sudadera Capucha',
    category: 'Deportivo',
    brand: 'ZARA',
    price: 29.95,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
  },
  {
    id: '7',
    name: 'Blazer Estructurada',
    category: 'Chaquetas',
    brand: 'MANGO',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=400',
  },
  {
    id: '8',
    name: 'Pantalón Chino',
    category: 'Pantalones',
    brand: 'CORTE INGLES',
    price: 49.95,
    image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400',
  },
  {
    id: '9',
    name: 'Jersey Cuello Alto',
    category: 'Camisetas',
    brand: 'ZARA',
    price: 25.95,
    image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
  },
  {
    id: '10',
    name: 'Falda Plisada',
    category: 'Vestidos',
    brand: 'MANGO',
    price: 35.99,
    image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400',
  },
  {
    id: '11',
    name: 'Abrigo Largo Lana',
    category: 'Chaquetas',
    brand: 'CORTE INGLES',
    price: 149.95,
    image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400',
  },
  {
    id: '12',
    name: 'Polo Classic',
    category: 'Camisetas',
    brand: 'MANGO',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400',
  },
  {
    id: '13',
    name: 'Shorts Bermudas',
    category: 'Pantalones',
    brand: 'ZARA',
    price: 22.95,
    image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400',
  },
  {
    id: '14',
    name: 'Vestido Cóctel',
    category: 'Vestidos',
    brand: 'CORTE INGLES',
    price: 99.95,
    image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400',
  },
  {
    id: '15',
    name: 'Chaleco Acolchado',
    category: 'Chaquetas',
    brand: 'ZARA',
    price: 45.95,
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400',
  },
  {
    id: '16',
    name: 'Camiseta Rayas',
    category: 'Camisetas',
    brand: 'MANGO',
    price: 19.99,
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
  },
  {
    id: '17',
    name: 'Pantalón Deportivo',
    category: 'Deportivo',
    brand: 'ZARA',
    price: 29.95,
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400',
  },
  {
    id: '18',
    name: 'Blusa Satin',
    category: 'Camisas',
    brand: 'CORTE INGLES',
    price: 59.95,
    image: 'https://images.unsplash.com/photo-1564257577315-2d8f352f30b8?w=400',
  },
];

const defaultCategories = ['Todos', 'Camisetas', 'Camisas', 'Pantalones', 'Chaquetas', 'Vestidos', 'Deportivo'];

export default function CatalogScreen() {
  const router = useRouter();
  const { isFavorite, toggleFavorite, addTriedItem, scanData, setPendingAutoTryOn, setPendingCatalogItemId, customCatalog } = useApp();
  const { registerCommand, unregisterCommand } = useVoice();
  const reportActivity = useReportActivity();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [previewItem, setPreviewItem] = useState<ClothingItem | null>(null);
  const [showAddCustom, setShowAddCustom] = useState<boolean>(false);
  const [customItemName, setCustomItemName] = useState<string>('');
  const [customItemPrice, setCustomItemPrice] = useState<string>('');
  const [customItemBrand, setCustomItemBrand] = useState<string>('');
  const [customItemCategory, setCustomItemCategory] = useState<string>('Camisetas');
  const [customItemImage, setCustomItemImage] = useState<string | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Fetch catalog data
  const { data: onlineData, isLoading, refetch, error: catalogError } = useQuery({
    queryKey: ['catalog', CATALOG_URL],
    queryFn: async () => {
      console.log('Fetching catalog from:', CATALOG_URL);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await fetch(CATALOG_URL, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          mode: 'cors',
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error('Catalog fetch failed:', response.status, response.statusText);
          throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('Catalog response length:', text.length);
        
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error('El catálogo no tiene formato JSON válido');
        }
        
        const catalogItems = data.catalog || data.items || data.products || (Array.isArray(data) ? data : null);
        
        if (!catalogItems || !Array.isArray(catalogItems)) {
          console.error('Invalid catalog structure:', Object.keys(data));
          throw new Error('Estructura de catálogo no reconocida');
        }
        
        const normalizedData = {
          catalog: catalogItems.map((item: any, index: number) => ({
            id: item.id || item.sku || `item-${index}`,
            name: item.name || item.nombre || item.title || 'Sin nombre',
            category: item.category || item.categoria || item.type || 'General',
            brand: item.brand || item.marca || item.manufacturer || 'Sin marca',
            price: parseFloat(item.price || item.precio || item.cost || 0),
            image: item.image || item.imagen || item.photo || item.img || 'https://via.placeholder.com/400',
          })),
          categories: data.categories || data.categorias || ['Todos'],
          brands: data.brands || data.marcas || [],
        };
        
        console.log('Catalog loaded successfully:', normalizedData.catalog.length, 'items');
        console.log('First item sample:', normalizedData.catalog[0]);
        
        return normalizedData;
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error('Tiempo de espera agotado al cargar el catálogo');
        }
        
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (onlineData?.catalog && onlineData.catalog.length > 0) {
      console.log(`Catálogo online cargado: ${onlineData.catalog.length} prendas`);
    }
  }, [onlineData]);

  useEffect(() => {
    if (catalogError) {
      console.log('Catalog using local fallback data');
    }
  }, [catalogError]);

  const clothes = useMemo(() => {
    // Priority: 1. Custom catalog from Editor, 2. Online data, 3. Mock data
    if (customCatalog?.items && customCatalog.items.length > 0) {
      console.log('Catalog: Using custom catalog with', customCatalog.items.length, 'items');
      return customCatalog.items;
    }
    if (onlineData?.catalog && Array.isArray(onlineData.catalog)) {
      return onlineData.catalog;
    }
    return mockClothes;
  }, [onlineData, customCatalog]);

  const categories = useMemo(() => {
    if (onlineData?.categories && Array.isArray(onlineData.categories)) {
      return onlineData.categories;
    }
    return defaultCategories;
  }, [onlineData]);

  const filteredClothes = clothes.filter((item: ClothingItem) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const speakConfirmation = useCallback(async (text: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'es-ES';
          utterance.pitch = 1.0;
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
        } else {
          console.log('Speech synthesis not available on this platform');
        }
      } else {
        await Speech.speak(text, {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9,
        });
      }
    } catch (error) {
      console.log('Speech error (non-blocking):', error);
    }
  }, []);

  const handleTryOn = useCallback(async (item: ClothingItem, autoTryOn: boolean = false) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await addTriedItem(item);
    setPendingCatalogItemId(item.id);
    if (autoTryOn) {
      if (scanData?.photos && scanData.photos.length > 0) {
        console.log('Catalog: Auto try-on requested, setting pendingAutoTryOn for mirror announcement');
        setPendingAutoTryOn(true);
      } else {
        speakConfirmation(`${item.name} seleccionado. Necesitas escanear tu cuerpo primero para la prueba virtual.`);
      }
    } else {
      speakConfirmation('Añadido al espejo.');
    }
    setTimeout(() => {
      router.push('/(tabs)/mirror');
    }, autoTryOn && scanData?.photos?.length ? 300 : 100);
  }, [addTriedItem, router, scanData, speakConfirmation, setPendingAutoTryOn, setPendingCatalogItemId]);

  const handlePreview = (item: ClothingItem) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPreviewItem(item);
  };

  const handleToggleFavorite = async (item: ClothingItem, e: any) => {
    e.stopPropagation();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await toggleFavorite(item);
  };

  const handleCategoryPress = useCallback((category: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setSelectedCategory(category);
  }, []);

  const pickCustomImage = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      console.log('Catalog: Requesting media library permissions...');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Catalog: Permission result:', JSON.stringify(permissionResult));
      
      if (!permissionResult.granted) {
        const message = 'Necesitamos permiso para acceder a tu galería de fotos';
        console.log('Catalog: Permission denied');
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('Permiso Requerido', message, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Configuración', onPress: () => {
              // On Android, we can't open settings directly, but we inform the user
              Alert.alert(
                'Permisos necesarios',
                'Por favor habilita los permisos de almacenamiento en la configuración de la app',
                [{ text: 'OK' }]
              );
            }}
          ]);
        }
        return;
      }

      console.log('Catalog: Launching image picker with options:', JSON.stringify({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 1,
      }));
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
        base64: false,
        exif: false,
        allowsEditing: false,
      });

      console.log('Catalog: Image picker result:', JSON.stringify({
        canceled: result.canceled,
        assetsLength: result.assets?.length,
        firstAssetUri: result.assets?.[0]?.uri
      }));
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log('Custom clothing image selected:', uri);
        setCustomItemImage(uri);
        
        if (Platform.OS !== 'web') {
          Alert.alert('Éxito', 'Imagen seleccionada correctamente');
        }
      } else {
        console.log('Catalog: Image picking was canceled or no assets');
      }
    } catch (error) {
      console.error('Error picking custom image:', error);
      const message = 'Error al seleccionar imagen: ' + (error as Error).message;
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  }, []);

  const takeCustomPhoto = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      console.log('Catalog: Requesting camera permissions...');
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Catalog: Camera permission result:', JSON.stringify(permissionResult));
      
      if (!permissionResult.granted) {
        const message = 'Necesitamos permiso para usar la cámara';
        console.log('Catalog: Camera permission denied');
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('Permiso Requerido', message);
        }
        return;
      }

      console.log('Catalog: Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
        base64: false,
        exif: false,
      });

      console.log('Catalog: Camera result:', JSON.stringify({
        canceled: result.canceled,
        assetsLength: result.assets?.length,
        firstAssetUri: result.assets?.[0]?.uri
      }));
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log('Custom clothing photo taken:', uri);
        setCustomItemImage(uri);
        
        if (Platform.OS !== 'web') {
          Alert.alert('Éxito', 'Foto tomada correctamente');
        }
      } else {
        console.log('Catalog: Camera was canceled or no assets');
      }
    } catch (error) {
      console.error('Error taking custom photo:', error);
      const message = 'Error al tomar foto: ' + (error as Error).message;
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  }, []);

  const addCustomItem = useCallback(async () => {
    if (!customItemName.trim() || !customItemImage) {
      const message = 'Por favor completa el nombre y la imagen';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Faltan datos', message);
      }
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsAddingCustom(true);
    
    try {
      const newItem: ClothingItem = {
        id: `custom-${Date.now()}`,
        name: customItemName.trim(),
        category: customItemCategory,
        brand: customItemBrand.trim() || 'Personalizado',
        price: parseFloat(customItemPrice) || 0,
        image: customItemImage,
      };

      await addTriedItem(newItem);
      setPendingCatalogItemId(newItem.id);
      setShowAddCustom(false);
      setCustomItemName('');
      setCustomItemPrice('');
      setCustomItemBrand('');
      setCustomItemCategory('Camisetas');
      setCustomItemImage(null);
      const successMessage = 'Prenda personalizada añadida';
      if (Platform.OS === 'web') {
        alert(successMessage);
      } else {
        Alert.alert('Éxito', successMessage);
      }
      router.push('/(tabs)/mirror');
    } catch (error) {
      console.error('Error adding custom item:', error);
      const errorMessage = 'Error al añadir prenda personalizada';
      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsAddingCustom(false);
    }
  }, [customItemName, customItemImage, customItemCategory, customItemBrand, customItemPrice, addTriedItem, setPendingCatalogItemId, router]);

  // Comandos de catálogo solo cuando esta pestaña tiene foco: así "primera", "probar Zara", etc. no se interpretan en Espejo
  useFocusEffect(
    useCallback(() => {
      const brandVariations: { [key: string]: string[] } = {
        'zara': ['zara', 'sara', 'sarra', 'zarra', 'la zara'],
        'mango': ['mango', 'mangó', 'el mango', 'mangoo'],
        'corte ingles': [
          'corte ingles', 'corte inglés', 'el corte ingles', 'el corte inglés',
          'corteingles', 'corteinglés', 'corte', 'el corte', 'inglés', 'ingles'
        ]
      };

      categories.forEach((category: string) => {
        const commandId = `select-category-${category.toLowerCase()}`;
        registerCommand(commandId, {
          patterns: [
            category.toLowerCase(),
            `mostrar ${category.toLowerCase()}`,
            `ver ${category.toLowerCase()}`,
            `categoría ${category.toLowerCase()}`,
          ],
          action: () => {
            handleCategoryPress(category);
          },
          description: `seleccionar categoría ${category}`,
        });
      });

      Object.entries(brandVariations).forEach(([brand, variations]) => {
        const commandId = `select-brand-${brand.replace(/\s+/g, '-')}`;
        const allPatterns = [
          ...variations,
          ...variations.map(v => `mostrar ${v}`),
          ...variations.map(v => `ver ${v}`),
          ...variations.map(v => `marca ${v}`),
          ...variations.map(v => `filtrar ${v}`),
          ...variations.map(v => `buscar ${v}`),
        ];
        registerCommand(commandId, {
          patterns: allPatterns,
          action: () => {
            setSearchQuery(brand === 'corte ingles' ? 'CORTE INGLES' : brand.toUpperCase());
            speakConfirmation(`Filtrando por marca ${brand}`);
          },
          description: '',
        });
      });

      registerCommand('catalog-select-generic', {
        patterns: [
          'seleccionar', 'selecciona', 'seleccionando', 'elegir', 'escoger',
          'probar', 'probando', 'probar esta', 'probar esto', 'quiero esta', 'quiero este',
          'me gusta', 'esta', 'este', 'esa', 'ese'
        ],
        action: () => {
          if (filteredClothes.length > 0) {
            handleTryOn(filteredClothes[0], true);
          } else {
            speakConfirmation('No hay prendas disponibles');
          }
        },
        description: '',
      });

      registerCommand('catalog-try-first', {
        patterns: [
          'probar primera', 'probar primero', 'primera prenda', 'primera',
          'seleccionar primera', 'seleccionar primero', 'la primera'
        ],
        action: () => {
          if (filteredClothes.length > 0) {
            handleTryOn(filteredClothes[0], true);
          }
        },
        description: '',
      });

      registerCommand('catalog-try-second', {
        patterns: [
          'probar segunda', 'segunda prenda', 'segunda', 'la segunda',
          'seleccionar segunda', 'probar segundo', 'segundo'
        ],
        action: () => {
          if (filteredClothes.length >= 2) {
            handleTryOn(filteredClothes[1], true);
          }
        },
        description: '',
      });

      registerCommand('catalog-try-third', {
        patterns: [
          'probar tercera', 'tercera prenda', 'la tercera',
          'seleccionar tercera', 'probar tercero'
        ],
        action: () => {
          if (filteredClothes.length >= 3) {
            handleTryOn(filteredClothes[2], true);
          }
        },
        description: '',
      });

      registerCommand('catalog-try-fourth', {
        patterns: [
          'probar cuarta', 'cuarta prenda', 'la cuarta',
          'seleccionar cuarta', 'probar cuarto'
        ],
        action: () => {
          if (filteredClothes.length >= 4) {
            handleTryOn(filteredClothes[3], true);
          }
        },
        description: '',
      });

      const generateNameVariations = (name: string): string[] => {
        const lower = name.toLowerCase();
        const words = lower.split(/\s+/);
        const variations: string[] = [lower];
        words.forEach(word => {
          if (word.length > 3) {
            variations.push(word);
          }
        });
        const normalized = lower
          .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
          .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n');
        if (normalized !== lower) variations.push(normalized);
        return [...new Set(variations)];
      };

      filteredClothes.slice(0, 50).forEach((item: ClothingItem) => {
        const nameVariations = generateNameVariations(item.name);
        const commandId = `catalog-try-item-${item.id}`;
        const allPatterns = [
          ...nameVariations,
          ...nameVariations.map(v => `probar ${v}`),
          ...nameVariations.map(v => `seleccionar ${v}`),
          ...nameVariations.map(v => `quiero ${v}`),
          `${item.brand.toLowerCase()} ${item.name.toLowerCase()}`,
        ];
        registerCommand(commandId, {
          patterns: allPatterns,
          action: () => {
            handleTryOn(item, true);
          },
          description: '',
        });
      });

      registerCommand('catalog-clear-search', {
        patterns: ['limpiar búsqueda', 'borrar búsqueda', 'mostrar todo', 'ver todo'],
        action: () => {
          setSearchQuery('');
          setSelectedCategory('Todos');
          speakConfirmation('Filtros limpiados. Mostrando todas las prendas.');
        },
        description: 'limpiar filtros',
      });

      return () => {
        categories.forEach((category: string) => {
          unregisterCommand(`select-category-${category.toLowerCase()}`);
        });
        Object.keys(brandVariations).forEach((brand) => {
          unregisterCommand(`select-brand-${brand.replace(/\s+/g, '-')}`);
        });
        unregisterCommand('catalog-select-generic');
        unregisterCommand('catalog-try-first');
        unregisterCommand('catalog-try-second');
        unregisterCommand('catalog-try-third');
        unregisterCommand('catalog-try-fourth');
        unregisterCommand('catalog-clear-search');
        filteredClothes.slice(0, 50).forEach((item: ClothingItem) => {
          unregisterCommand(`catalog-try-item-${item.id}`);
        });
      };
    }, [registerCommand, unregisterCommand, filteredClothes, handleTryOn, handleCategoryPress, categories, speakConfirmation])
  );

  useFocusEffect(
    useCallback(() => {
      reportActivity();
      const scrollUpId = `scroll-up-catalog-${Date.now()}`;
      const scrollDownId = `scroll-down-catalog-${Date.now()}`;

      registerCommand(scrollUpId, {
        patterns: ['subir', 'arriba', 'scroll arriba', 'desplazar arriba'],
        action: () => {
          console.log('Catalog: Scrolling up');
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        },
        description: 'subiendo',
      });

      registerCommand(scrollDownId, {
        patterns: ['bajar', 'abajo', 'scroll abajo', 'desplazar abajo'],
        action: () => {
          console.log('Catalog: Scrolling down');
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Catálogo 3D</Text>
            <Text style={styles.headerSubtitle}>
            {customCatalog?.items ? `${customCatalog.items.length} prendas (personalizado)` : onlineData?.catalog ? `${onlineData.catalog.length} prendas disponibles` : 'Explora y prueba ropa virtual'}
          </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                refetch();
              }}
            >
              <RefreshCw size={20} color={Colors.light.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addCustomButton}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAddCustom(true);
              }}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        {isLoading && (
          <View style={styles.loadingBadge}>
            <ActivityIndicator size="small" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Cargando catálogo...</Text>
          </View>
        )}
        {catalogError && !isLoading && (
          <View style={[styles.loadingBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Text style={[styles.loadingText, { color: '#EF4444' }]}>Usando catálogo local ({clothes.length})</Text>
          </View>
        )}
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar prendas..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.light.textSecondary}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category: string) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => handleCategoryPress(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView ref={scrollViewRef} style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {filteredClothes.map((item: ClothingItem) => (
            <TouchableOpacity key={item.id} style={styles.card} onPress={() => handlePreview(item)} activeOpacity={0.9}>
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: item.image }} 
                  style={styles.cardImage}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  transition={200}
                />
                <TouchableOpacity 
                  style={styles.favoriteButton}
                  onPress={(e) => handleToggleFavorite(item, e)}
                >
                  <Heart 
                    size={20} 
                    color={isFavorite(item.id) ? Colors.light.primary : '#FFFFFF'}
                    fill={isFavorite(item.id) ? Colors.light.primary : 'transparent'}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardBrand}>{item.brand}</Text>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardPrice}>{item.price.toFixed(2)}€</Text>
                  <TouchableOpacity 
                    style={styles.tryButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleTryOn(item);
                    }}
                  >
                    <Shirt size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {filteredClothes.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No se encontraron prendas</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={previewItem !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPreviewItem(null)}
      >
        {previewItem && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setPreviewItem(null)}>
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
              
              <Image 
                source={{ uri: previewItem.image }} 
                style={styles.previewImage}
                cachePolicy="memory-disk"
                contentFit="contain"
              />
              
              <View style={styles.previewInfo}>
                <Text style={styles.previewBrand}>{previewItem.brand}</Text>
                <Text style={styles.previewName}>{previewItem.name}</Text>
                <Text style={styles.previewPrice}>{previewItem.price.toFixed(2)}€</Text>
                
                <View style={styles.previewActions}>
                  <TouchableOpacity 
                    style={styles.favoriteActionButton}
                    onPress={() => toggleFavorite(previewItem)}
                  >
                    <Heart 
                      size={24} 
                      color={isFavorite(previewItem.id) ? Colors.light.primary : Colors.light.text}
                      fill={isFavorite(previewItem.id) ? Colors.light.primary : 'transparent'}
                    />
                    <Text style={styles.favoriteActionText}>
                      {isFavorite(previewItem.id) ? 'Favorito' : 'Añadir a Favoritos'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.tryActionButton}
                    onPress={() => {
                      setPreviewItem(null);
                      handleTryOn(previewItem, true);
                    }}
                  >
                    <Shirt size={24} color="#FFFFFF" />
                    <Text style={styles.tryActionText}>Probar Ahora</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </Modal>

      <Modal
        visible={showAddCustom}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddCustom(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => {
                setShowAddCustom(false);
                setCustomItemName('');
                setCustomItemPrice('');
                setCustomItemBrand('');
                setCustomItemCategory('Camisetas');
                setCustomItemImage(null);
              }}
            >
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
            
            <ScrollView style={styles.customItemForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.customFormTitle}>Añadir Prenda Personalizada</Text>
              
              {customItemImage ? (
                <View style={styles.customImagePreviewContainer}>
                  <Image 
                    source={{ uri: customItemImage }} 
                    style={styles.customImagePreview}
                    contentFit="cover"
                  />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => setCustomItemImage(null)}
                  >
                    <X size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.customImageSelector}>
                  <Text style={styles.customImageLabel}>Selecciona una imagen</Text>
                  <View style={styles.imageButtonsRow}>
                    <TouchableOpacity 
                      style={styles.imageOptionButton}
                      onPress={pickCustomImage}
                    >
                      <Plus size={24} color={Colors.light.primary} />
                      <Text style={styles.imageOptionText}>Galería</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.imageOptionButton}
                      onPress={takeCustomPhoto}
                    >
                      <Camera size={24} color={Colors.light.primary} />
                      <Text style={styles.imageOptionText}>Cámara</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nombre *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: Camisa Blanca"
                  value={customItemName}
                  onChangeText={setCustomItemName}
                  placeholderTextColor={Colors.light.textSecondary}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Marca</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: ZARA"
                  value={customItemBrand}
                  onChangeText={setCustomItemBrand}
                  placeholderTextColor={Colors.light.textSecondary}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Precio (€)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="0.00"
                  value={customItemPrice}
                  onChangeText={setCustomItemPrice}
                  keyboardType="decimal-pad"
                  placeholderTextColor={Colors.light.textSecondary}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Categoría</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categorySelector}
                >
                  {categories.filter((c: string) => c !== 'Todos').map((cat: string) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categorySelectorChip,
                        customItemCategory === cat && styles.categorySelectorChipActive,
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync();
                        setCustomItemCategory(cat);
                      }}
                    >
                      <Text
                        style={[
                          styles.categorySelectorText,
                          customItemCategory === cat && styles.categorySelectorTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.addCustomItemButton,
                  (!customItemName.trim() || !customItemImage || isAddingCustom) && styles.addCustomItemButtonDisabled
                ]}
                onPress={addCustomItem}
                disabled={!customItemName.trim() || !customItemImage || isAddingCustom}
              >
                {isAddingCustom ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Plus size={20} color="#FFFFFF" />
                    <Text style={styles.addCustomItemButtonText}>Añadir y Probar</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <VoiceCommandsBanner screen="catalog" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCustomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  loadingText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    maxHeight: 50,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.light.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    marginTop: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  card: {
    width: '47%',
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.backgroundSecondary,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 12,
  },
  cardBrand: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.light.primary,
  },
  tryButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  previewImage: {
    width: '100%',
    height: 400,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  previewInfo: {
    padding: 24,
    gap: 12,
  },
  previewBrand: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '600' as const,
  },
  previewName: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
  },
  previewPrice: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.light.primary,
    marginBottom: 12,
  },
  previewActions: {
    gap: 12,
  },
  favoriteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  favoriteActionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  tryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
  },
  tryActionText: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  customItemForm: {
    flex: 1,
    padding: 24,
  },
  customFormTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  customImageSelector: {
    marginBottom: 24,
    alignItems: 'center',
  },
  customImageLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  imageButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageOptionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundSecondary,
    gap: 8,
  },
  imageOptionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  customImagePreviewContainer: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
  },
  customImagePreview: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.backgroundSecondary,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  categorySelector: {
    gap: 8,
  },
  categorySelectorChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  categorySelectorChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  categorySelectorText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  categorySelectorTextActive: {
    color: '#FFFFFF',
  },
  addCustomItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    marginTop: 12,
    marginBottom: 24,
  },
  addCustomItemButtonDisabled: {
    opacity: 0.5,
  },
  addCustomItemButtonText: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
});
