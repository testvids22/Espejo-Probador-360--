import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, Share, Alert, Animated, ScrollView, ActivityIndicator } from 'react-native';
import * as Speech from 'expo-speech';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

import { captureRef } from 'react-native-view-shot';

import { RotateCw, Share2, ChevronRight, Sparkles, Heart, RotateCcw, Mic, MicOff, Palette, Grid2X2, Eye, Zap, Contrast, X, Wand2 } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Colors from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/contexts/AppContext';
import { useVoice } from '@/contexts/VoiceContext';
import { useReportActivity } from '@/components/InactivityScreensaver';
import VoiceCommandsBanner from '@/components/VoiceCommandsBanner';
import BootVideo from '@/components/BootVideo';
import type { ClothingItem } from '@/contexts/AppContext';

const SHOW_BOOT_VIDEO_KEY = '@app_show_boot_video';



const baseSuggestions: ClothingItem[] = [
  {
    id: '20',
    name: 'Blazer Premium',
    category: 'Chaquetas',
    brand: 'MANGO',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=400',
  },
  {
    id: '21',
    name: 'Vestido Elegante',
    category: 'Vestidos',
    brand: 'ZARA',
    price: 59.95,
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
  },
  {
    id: '22',
    name: 'Chaqueta Cuero',
    category: 'Chaquetas',
    brand: 'CORTE INGLES',
    price: 129.95,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
  },
];

const AnimatedImage = Animated.createAnimatedComponent(Image as any);

export default function MirrorScreen() {
  const router = useRouter();
  const { scanData, triedItems, markItemAsShared, addTriedItem, isFavorite, toggleFavorite, favorites, updateTriedItemWithComposite, pendingAutoTryOn, setPendingAutoTryOn, pendingCatalogItemId, setPendingCatalogItemId } = useApp();
  const [show360Notification, setShow360Notification] = useState(false);
  const { isListening, startListening, stopListening, registerCommand, unregisterCommand, isSupported } = useVoice();
  const reportActivity = useReportActivity();
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [compareItemIndex, setCompareItemIndex] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('normal');
  const [brightness, setBrightness] = useState<number>(1);
  const [contrast, setContrast] = useState<number>(1);
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(false);
  const [showQRCode, setShowQRCode] = useState<boolean>(false);
  const [infoCollapsed, setInfoCollapsed] = useState<boolean>(false);
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState<boolean>(false);
  const [isCarouselMode, setIsCarouselMode] = useState<boolean>(false);
  const [carouselSpeed, setCarouselSpeed] = useState<number>(3000);
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [aiResultImage, setAiResultImage] = useState<string | null>(null);
  const [, setIsSavingComposite] = useState<boolean>(false);
  const [autoTryOnTriggered, setAutoTryOnTriggered] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [showBootVideo, setShowBootVideo] = useState<boolean>(false);
  const autoTryOnInProgressRef = useRef<boolean>(false);
  const lastAnnouncedItemRef = useRef<string | null>(null);
  const itemArrivedFromCatalogRef = useRef<boolean>(false);
  const isManualSelectionRef = useRef<boolean>(false);
  const voiceAnnouncementInProgressRef = useRef<boolean>(false);
  const lastSpokenRef = useRef<{ text: string; time: number } | null>(null);
  const SPEECH_COOLDOWN_MS = 8000;
  const mirrorViewRef = useRef<View>(null);
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const autoRotateAnim = useRef<Animated.CompositeAnimation | null>(null);
  const leftScrollRef = useRef<ScrollView>(null);
  const rightScrollRef = useRef<ScrollView>(null);
  const scrollAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const scrollPositionLeft = useRef(new Animated.Value(0)).current;
  const scrollPositionRight = useRef(new Animated.Value(0)).current;
  const carouselIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      reportActivity();
      let cancelled = false;
      AsyncStorage.getItem(SHOW_BOOT_VIDEO_KEY).then((val) => {
        if (!cancelled && val === 'true') {
          setShowBootVideo(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [reportActivity])
  );

  const handleBootVideoFinish = useCallback(async () => {
    await AsyncStorage.removeItem(SHOW_BOOT_VIDEO_KEY);
    setShowBootVideo(false);
  }, []);
  
  const speakMirrorConfirmation = useCallback(async (text: string) => {
    const now = Date.now();
    const last = lastSpokenRef.current;
    if (last && last.text === text && now - last.time < SPEECH_COOLDOWN_MS) {
      console.log('Mirror: Skipping repeated speech (cooldown):', text.slice(0, 40) + '...');
      return;
    }
    lastSpokenRef.current = { text, time: now };
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'es-ES';
          utterance.pitch = 1.0;
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
        }
      } else {
        await Speech.stop();
        await Speech.speak(text, {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9,
        });
      }
    } catch (error) {
      console.log('Mirror speech error (non-blocking):', error);
    }
  }, []);

  const lastTriedItem = triedItems.length > 0 ? triedItems[selectedItemIndex] : null;
  const frontPhoto = scanData?.photos?.[0];
  const sidePhoto = scanData?.photos?.[1];
  
  const mockSuggestions = useMemo(() => {
    const recentTriedItemsForSuggestions = triedItems
      .filter((ti, index) => index !== selectedItemIndex)
      .map(ti => ({
        ...ti.item,
        compositeImage: ti.compositeImage,
        isTried: true,
      }))
      .slice(0, 3);
    
    const favoritesNotTried = favorites.filter(
      fav => !triedItems.some(tried => tried.item.id === fav.id)
    ).slice(0, 3);
    
    const combined = [
      ...recentTriedItemsForSuggestions,
      ...favoritesNotTried,
      ...baseSuggestions
    ];
    
    const unique = combined.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );
    
    return unique.slice(0, 6);
  }, [favorites, triedItems, selectedItemIndex]);

  const handleSelectTriedItem = useCallback(async (index: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Mark as manual selection to prevent voice announcements
    isManualSelectionRef.current = true;
    
    // Clear pending item to prevent voice loop
    setPendingItemId(null);
    voiceAnnouncementInProgressRef.current = false;
    
    setSelectedItemIndex(index);
    setRotationAngle(0);
    
    // If the selected item has a compositeImage (already adapted), use it
    const selectedItem = triedItems[index];
    if (selectedItem?.compositeImage) {
      setAiResultImage(selectedItem.compositeImage);
    } else {
      setAiResultImage(null);
    }
    
    setAutoTryOnTriggered(null);
    rotationAnim.setValue(0);
    
    // Reset manual selection flag after state updates
    setTimeout(() => {
      isManualSelectionRef.current = false;
    }, 100);
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, rotationAnim, triedItems]);

  const handleTrySuggestion = async (item: ClothingItem) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Reset all states first
    setCompareMode(false);
    setCompareItemIndex(null);
    setAiResultImage(null);
    voiceAnnouncementInProgressRef.current = false;
    
    // Mark as arriving from suggestion (treat like catalog)
    itemArrivedFromCatalogRef.current = true;
    setPendingItemId(item.id);
    
    await addTriedItem(item);
    setSelectedItemIndex(0);
    setRotationAngle(0);
    rotationAnim.setValue(0);
  };

  const handleAiTryOn = useCallback(async () => {
    if (!lastTriedItem || !frontPhoto) return;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    setIsGeneratingTryOn(true);
    try {
      let userBase64 = '';
      let itemBase64 = '';

      if (Platform.OS === 'web') {
        // Web: Handle image loading differently
        const loadImageAsBase64 = async (url: string): Promise<string> => {
          // If it's a data URL, extract base64
          if (url.startsWith('data:')) {
            const base64Part = url.split(',')[1];
            return base64Part || url;
          }
          
          // If it's a blob URL, convert to base64
          if (url.startsWith('blob:')) {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
          
          // If it's an HTTP URL, fetch and convert
          if (url.startsWith('http')) {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
          
          return url;
        };

        userBase64 = await loadImageAsBase64(frontPhoto);
        itemBase64 = await loadImageAsBase64(lastTriedItem.item.image);
      } else {
        // Native: Use FileSystem with proper blob URL handling
        console.log('Mirror: Reading user photo from:', frontPhoto);
        
        // User photo handling
        if (frontPhoto.startsWith('blob:') || frontPhoto.startsWith('content:')) {
          // For Android content URIs and blob URLs, read directly
          try {
            userBase64 = await FileSystemLegacy.readAsStringAsync(frontPhoto, { encoding: 'base64' });
          } catch (readError) {
            console.error('Error reading user photo directly:', readError);
            // Fallback: try to copy to cache first
            const cacheDir = FileSystemLegacy.cacheDirectory || '';
            const tempUserFile = cacheDir + 'temp_user_photo.jpg';
            await FileSystemLegacy.copyAsync({ from: frontPhoto, to: tempUserFile });
            userBase64 = await FileSystemLegacy.readAsStringAsync(tempUserFile, { encoding: 'base64' });
          }
        } else if (frontPhoto.startsWith('file://')) {
          userBase64 = await FileSystemLegacy.readAsStringAsync(frontPhoto, { encoding: 'base64' });
        } else {
          // HTTP URL - download first
          const cacheDir = FileSystemLegacy.cacheDirectory || '';
          const tempUserFile = cacheDir + 'temp_user_photo.jpg';
          await FileSystemLegacy.downloadAsync(frontPhoto, tempUserFile);
          userBase64 = await FileSystemLegacy.readAsStringAsync(tempUserFile, { encoding: 'base64' });
        }
        
        console.log('Mirror: User photo base64 length:', userBase64.length);
        
        // Item image handling
        const itemImageUri = lastTriedItem.item.image;
        console.log('Mirror: Reading item image from:', itemImageUri);
        
        const cacheDir = FileSystemLegacy.cacheDirectory || '';
        const tempItemFile = cacheDir + 'temp_item_image.jpg';
        
        if (itemImageUri.startsWith('http://') || itemImageUri.startsWith('https://')) {
          // Download from URL
          await FileSystemLegacy.downloadAsync(itemImageUri, tempItemFile);
          itemBase64 = await FileSystemLegacy.readAsStringAsync(tempItemFile, { encoding: 'base64' });
        } else if (itemImageUri.startsWith('file://') || itemImageUri.startsWith('content:') || itemImageUri.startsWith('blob:')) {
          // Local file or content URI
          try {
            itemBase64 = await FileSystemLegacy.readAsStringAsync(itemImageUri, { encoding: 'base64' });
          } catch (readError) {
            console.error('Error reading item image directly:', readError);
            // Copy to cache first
            await FileSystemLegacy.copyAsync({ from: itemImageUri, to: tempItemFile });
            itemBase64 = await FileSystemLegacy.readAsStringAsync(tempItemFile, { encoding: 'base64' });
          }
        } else {
          throw new Error('Unsupported image URI format: ' + itemImageUri);
        }
        
        console.log('Mirror: Item image base64 length:', itemBase64.length);
      }
      
      // 3. Call API
      const response = await fetch('https://toolkit.rork.com/images/edit/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `A realistic photo of the person in the first image wearing the clothing item shown in the second image (${lastTriedItem.item.name}). The clothing should fit naturally on the body. Maintain the person's pose and identity. High quality, photorealistic.`,
          images: [
            { type: 'image', image: userBase64 },
            { type: 'image', image: itemBase64 }
          ],
          aspectRatio: "9:16"
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to generate try-on: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const resultUri = `data:${data.image.mimeType};base64,${data.image.base64Data}`;
      setAiResultImage(resultUri);
      
    } catch (error: any) {
      console.error('AI Try On Error:', error);
      setAiResultImage(null);
      setShowUserOnly(true);
      const message = error?.message || 'No se pudo generar la prueba virtual. Puedes probar otra prenda desde el catálogo.';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setIsGeneratingTryOn(false);
    }
  }, [lastTriedItem, frontPhoto]);

  const captureAndSaveComposite = useCallback(async (): Promise<string | undefined> => {
    if (!mirrorViewRef.current || !lastTriedItem || !frontPhoto) return undefined;
    
    try {
      setIsSavingComposite(true);
      console.log('Mirror: Starting composite capture...');
      
      if (Platform.OS === 'web') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No canvas context');
        
        const loadImage = (src: string): Promise<HTMLImageElement> => {
          return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        };
        
        const userImg = await loadImage(aiResultImage || frontPhoto);
        
        canvas.width = userImg.naturalWidth;
        canvas.height = userImg.naturalHeight;
        
        ctx.drawImage(userImg, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        console.log('📸 [Mirror] Web composite created with original dimensions:', canvas.width, 'x', canvas.height);
        console.log('📸 [Mirror] Data URL length:', dataUrl.length);
        console.log('📸 [Mirror] Llamando a updateTriedItemWithComposite...');
        console.log('📸 [Mirror] Item ID:', lastTriedItem.item.id);
        
        await updateTriedItemWithComposite(lastTriedItem.item.id, dataUrl, frontPhoto);
        console.log('✅ [Mirror] updateTriedItemWithComposite completado');
        return dataUrl;
      } else {
        // Native: capture the actual view with captureRef
        console.log('Mirror: Capturing native view...');
        const uri = await captureRef(mirrorViewRef, {
          format: 'jpg',
          quality: 0.8,
          result: 'tmpfile',
        });
        
        console.log('📸 [Mirror] Native composite captured:', uri);
        console.log('📸 [Mirror] Llamando a updateTriedItemWithComposite...');
        console.log('📸 [Mirror] Item ID:', lastTriedItem.item.id);
        
        await updateTriedItemWithComposite(lastTriedItem.item.id, uri, frontPhoto);
        console.log('✅ [Mirror] updateTriedItemWithComposite completado');
        return uri;
      }
    } catch (error) {
      console.error('Error capturing composite:', error);
      return undefined;
    } finally {
      setIsSavingComposite(false);
    }
  }, [lastTriedItem, frontPhoto, aiResultImage, updateTriedItemWithComposite]);

  const handleShareResult = useCallback(async () => {
    if (!lastTriedItem) return;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      console.log('Mirror: Starting share process...');
      const itemCategory = lastTriedItem.item.category || 'Prenda';
      const shareMessage = `¡Mira cómo me queda este/a ${itemCategory.toLowerCase()}! 👗\n\n🏷️ ${lastTriedItem.item.name}\n🏪 ${lastTriedItem.item.brand}\n💰 ${lastTriedItem.item.price.toFixed(2)}€\n\n¿Qué te parece? Estoy probándome ropa virtualmente con Espejo GV360º`;
      
      let compositeImageUri: string | null | undefined = lastTriedItem.compositeImage;
      if (!compositeImageUri || aiResultImage) {
        console.log('Mirror: Capturing composite image...');
        compositeImageUri = await captureAndSaveComposite();
      }
      
      if (!compositeImageUri) {
        console.error('Mirror: No composite image available');
        if (Platform.OS === 'web') {
          alert('No se pudo capturar la imagen. Intenta de nuevo.');
        } else {
          Alert.alert('Error', 'No se pudo capturar la imagen. Intenta de nuevo.');
        }
        return;
      }

      console.log('Mirror: Composite image ready:', compositeImageUri);

      if (Platform.OS === 'web') {
        if (navigator.share && navigator.canShare) {
          try {
            const blob = await fetch(compositeImageUri).then(r => r.blob());
            const file = new File([blob], 'prueba-virtual.jpg', { type: 'image/jpeg' });
            
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: 'Comparte tu prueba virtual',
                text: shareMessage,
                files: [file],
              });
              await markItemAsShared(lastTriedItem.item.id);
              if (!offered360Ref.current) {
                offered360Ref.current = true;
                speakMirrorConfirmation('Di 360 para ver todos los ángulos.');
              }
              console.log('Shared successfully with image');
            } else {
              const link = document.createElement('a');
              link.href = compositeImageUri;
              link.download = 'prueba-virtual.jpg';
              link.click();
              alert('Imagen descargada. Ahora puedes compartirla desde tus archivos.');
              await markItemAsShared(lastTriedItem.item.id);
              if (!offered360Ref.current) {
                offered360Ref.current = true;
                speakMirrorConfirmation('¿Quieres ver cómo te queda desde todos los ángulos? Di 360.');
              }
            }
          } catch (shareError: any) {
            if (shareError.name === 'AbortError') {
              console.log('Share cancelled by user');
              return;
            }
            const link = document.createElement('a');
            link.href = compositeImageUri;
            link.download = 'prueba-virtual.jpg';
            link.click();
            alert('Imagen descargada. Ahora puedes compartirla desde tus archivos.');
            await markItemAsShared(lastTriedItem.item.id);
            if (!offered360Ref.current) {
              offered360Ref.current = true;
              speakMirrorConfirmation('Di 360 para ver todos los ángulos.');
            }
          }
        } else {
          const link = document.createElement('a');
          link.href = compositeImageUri;
          link.download = 'prueba-virtual.jpg';
          link.click();
          alert('Imagen descargada. Ahora puedes compartirla desde tus archivos.');
          await markItemAsShared(lastTriedItem.item.id);
          if (!offered360Ref.current) {
            offered360Ref.current = true;
            speakMirrorConfirmation('Di 360 para ver todos los ángulos.');
          }
        }
      } else {
        console.log('Mirror: Saving to media library and sharing on native...');
        try {
          const permissionResult = await MediaLibrary.requestPermissionsAsync();
          console.log('Mirror: Media library permission result:', JSON.stringify(permissionResult));
          
          if (permissionResult.granted) {
            console.log('Mirror: Creating asset...');
            const asset = await MediaLibrary.createAssetAsync(compositeImageUri);
            console.log('Mirror: Asset created:', asset.id);
            
            try {
              const album = await MediaLibrary.getAlbumAsync('Espejo Virtual');
              if (album) {
                await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
              } else {
                await MediaLibrary.createAlbumAsync('Espejo Virtual', asset, false);
              }
              console.log('Mirror: Image saved to album');
              Alert.alert('Guardado', 'Imagen guardada en tu galería (Álbum: Espejo Virtual)');
            } catch (albumError) {
              console.log('Mirror: Album creation/add error (non-critical):', albumError);
            }
          } else {
            console.log('Mirror: Media library permission not granted');
          }
        } catch (permError) {
          console.error('Error requesting media library permissions:', permError);
        }
        
        console.log('Mirror: Launching Share dialog...');
        const result = await Share.share({
          message: shareMessage,
          url: compositeImageUri,
          title: 'Comparte tu prueba virtual',
        });

        console.log('Mirror: Share result:', result.action);
        if (result.action === Share.sharedAction) {
          await markItemAsShared(lastTriedItem.item.id);
          if (!offered360Ref.current) {
            offered360Ref.current = true;
            speakMirrorConfirmation('Di 360 para ver todos los ángulos.');
          }
          Alert.alert('¡Compartido!', 'Se compartió tu imagen con prueba virtual');
        }
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
      if (Platform.OS === 'web') {
        alert('No se pudo compartir la imagen. Intenta de nuevo.');
      } else {
        Alert.alert('Error', 'No se pudo compartir el resultado. Intenta de nuevo.');
      }
    }
  }, [lastTriedItem, aiResultImage, markItemAsShared, captureAndSaveComposite, speakMirrorConfirmation]);

  const handleRotate = () => {
    if (isAutoRotating) {
      stopAutoRotation();
      return;
    }
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const newAngle = (rotationAngle + 90) % 360;
    setRotationAngle(newAngle);
    
    Animated.spring(rotationAnim, {
      toValue: newAngle / 360,
      tension: 40,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handleRotateReverse = () => {
    if (isAutoRotating) {
      stopAutoRotation();
      return;
    }
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const newAngle = (rotationAngle - 90 + 360) % 360;
    setRotationAngle(newAngle);
    
    Animated.spring(rotationAnim, {
      toValue: newAngle / 360,
      tension: 40,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const startAutoRotation = useCallback(() => {
    if (isAutoRotating) return;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setIsAutoRotating(true);
    setRotationAngle(0);
    rotationAnim.setValue(0);
    
    autoRotateAnim.current = Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    );
    autoRotateAnim.current.start();
  }, [isAutoRotating, rotationAnim]);

  const stopAutoRotation = useCallback(() => {
    if (!isAutoRotating) return;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    autoRotateAnim.current?.stop();
    setIsAutoRotating(false);
    
    const currentValue = (rotationAnim as any)._value;
    const closestAngle = Math.round(currentValue * 4) * 90;
    setRotationAngle(closestAngle % 360);
    
    Animated.spring(rotationAnim, {
      toValue: closestAngle / 360,
      tension: 40,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [isAutoRotating, rotationAnim]);

  const offered360Ref = useRef(false);
  const handleToggleFavoriteItem = useCallback(async () => {
    if (!lastTriedItem) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    let compositeImageUri = lastTriedItem.compositeImage;
    if (!compositeImageUri) {
      compositeImageUri = await captureAndSaveComposite();
    }
    
    const wasFavorite = isFavorite(lastTriedItem.item.id);
    await toggleFavorite(lastTriedItem.item, compositeImageUri ?? undefined);
    
    const message = wasFavorite 
      ? 'Eliminado de favoritos' 
      : 'Agregado a favoritos con tu imagen';
    
    if (!wasFavorite) {
      if (!offered360Ref.current) {
        offered360Ref.current = true;
        speakMirrorConfirmation('Di 360 para ver todos los ángulos.');
      }
      if (Platform.OS !== 'web') {
        setTimeout(() => { Alert.alert('Favoritos', message); }, 2200);
      } else {
        console.log(message);
      }
    } else {
      if (Platform.OS === 'web') {
        console.log(message);
      } else {
        Alert.alert('Favoritos', message);
      }
    }
  }, [lastTriedItem, toggleFavorite, isFavorite, captureAndSaveComposite, speakMirrorConfirmation]);

  const toggleCompareMode = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (!compareMode && triedItems.length > 1) {
      if (!lastTriedItem?.compositeImage && lastTriedItem && frontPhoto) {
        console.log('Auto-capturing composite for comparison mode...');
        await captureAndSaveComposite();
      }
      setCompareMode(true);
      setCompareItemIndex(selectedItemIndex === 0 ? 1 : 0);
    } else {
      setCompareMode(false);
      setCompareItemIndex(null);
    }
  }, [compareMode, triedItems.length, selectedItemIndex, lastTriedItem, frontPhoto, captureAndSaveComposite]);

  const toggleAutoScroll = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (isAutoScrolling) {
      scrollAnimRef.current?.stop();
      setIsAutoScrolling(false);
    } else {
      if (triedItems.length === 0 && mockSuggestions.length === 0) {
        console.log('No items to scroll');
        return;
      }
      
      setIsAutoScrolling(true);
      const itemHeight = 132 + 12;
      const itemsPerSecond = 0.5;
      const leftDuration = Math.max(triedItems.length / itemsPerSecond * 1000, 2000);
      const rightDuration = Math.max(mockSuggestions.length / itemsPerSecond * 1000, 2000);
      
      if (triedItems.length > 0) {
        const leftScroll = Animated.loop(
          Animated.sequence([
            Animated.timing(scrollPositionLeft, {
              toValue: triedItems.length * itemHeight,
              duration: leftDuration,
              useNativeDriver: false,
            }),
            Animated.timing(scrollPositionLeft, {
              toValue: 0,
              duration: 500,
              useNativeDriver: false,
            }),
            Animated.delay(1000),
          ])
        );
        leftScroll.start();
      }
      
      if (mockSuggestions.length > 0) {
        const rightScroll = Animated.loop(
          Animated.sequence([
            Animated.timing(scrollPositionRight, {
              toValue: mockSuggestions.length * itemHeight,
              duration: rightDuration,
              useNativeDriver: false,
            }),
            Animated.timing(scrollPositionRight, {
              toValue: 0,
              duration: 500,
              useNativeDriver: false,
            }),
            Animated.delay(1000),
          ])
        );
        rightScroll.start();
        scrollAnimRef.current = rightScroll;
      }
    }
  }, [isAutoScrolling, triedItems.length, mockSuggestions.length, scrollPositionLeft, scrollPositionRight]);

  useEffect(() => {
    if (autoRotateAnim.current) {
      autoRotateAnim.current.stop();
    }
    setIsAutoRotating(false);
    rotationAnim.setValue(0);
    setRotationAngle(0);
  }, [lastTriedItem, rotationAnim]);

  const [showUserOnly, setShowUserOnly] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reportActivity();
      voiceAnnouncementInProgressRef.current = false;
      // Al volver a la pestaña Espejo: vista principal solo usuario, sin residuo de prenda anterior
      setShowUserOnly(true);
      setAiResultImage(null);

      // On blur: mismo criterio; favoritos, prendas probadas y usuario se conservan en contexto
      return () => {
        setShowUserOnly(true);
        setAiResultImage(null);
        voiceAnnouncementInProgressRef.current = false;
        offered360Ref.current = false;
      };
    }, [reportActivity])
  );

  // Al llegar item del catálogo: mostrar TryOn (no usuario solo)
  useEffect(() => {
    if (pendingItemId && triedItems.some(ti => ti.item.id === pendingItemId)) {
      setShowUserOnly(false);
    }
  }, [pendingItemId, triedItems]);

  useEffect(() => {
    if (pendingAutoTryOn && lastTriedItem && frontPhoto && !isGeneratingTryOn) {
      const itemId = lastTriedItem.item.id;
      
      if (autoTryOnInProgressRef.current) {
        console.log('Mirror: Auto try-on already in progress, skipping');
        setPendingAutoTryOn(false);
        return;
      }
      
      // Mark that this item arrived from catalog (no forzar selectedItemIndex(0): la 2.ª/3.ª prenda la elige pendingCatalogItemId)
      itemArrivedFromCatalogRef.current = true;
      setPendingItemId(itemId);
      
      console.log('Mirror: Item arrived from catalog:', itemId);
      setPendingAutoTryOn(false);
      
      setCompareMode(false);
      setCompareItemIndex(null);
      setAiResultImage(null);
    }
  }, [pendingAutoTryOn, lastTriedItem, frontPhoto, isGeneratingTryOn, setPendingAutoTryOn]);

  // Auto-navegar a 360º ahora en AutoNavigate360 (layout) para que funcione desde cualquier pestaña

  // Al llegar desde catálogo: seleccionar la prenda que acabamos de añadir (2.ª, 3.ª, etc.)
  useEffect(() => {
    if (pendingCatalogItemId && triedItems.length > 0) {
      const idx = triedItems.findIndex(ti => ti.item.id === pendingCatalogItemId);
      if (idx >= 0) {
        setSelectedItemIndex(idx);
        setPendingItemId(pendingCatalogItemId);
        setAiResultImage(null);
        setShowUserOnly(false);
        setPendingCatalogItemId(null);
        console.log('Mirror: Item from catalog selected at index:', idx, pendingCatalogItemId);
      }
    }
  }, [triedItems, pendingCatalogItemId, setPendingCatalogItemId]);

  // Reset state when triedItems changes (new item added) – respaldo por si pendingCatalogItemId ya se limpió
  useEffect(() => {
    if (triedItems.length > 0 && pendingItemId) {
      const newItemIndex = triedItems.findIndex(ti => ti.item.id === pendingItemId);
      if (newItemIndex >= 0) {
        setSelectedItemIndex(newItemIndex);
        setAiResultImage(null);
        console.log('Mirror: New item from catalog detected, selecting item at index:', newItemIndex);
      }
    }
  }, [triedItems, pendingItemId]);

  // Announce item ONLY when it arrives from catalog (not when selecting from mirror)
  useEffect(() => {
    // Skip if manual selection from mirror panels
    if (isManualSelectionRef.current) {
      console.log('Mirror: Skipping announcement - manual selection from mirror');
      return;
    }
    
    // Skip if voice announcement already in progress
    if (voiceAnnouncementInProgressRef.current) {
      console.log('Mirror: Skipping announcement - already in progress');
      return;
    }
    
    // Item llegó del catálogo: un solo mensaje y TryOn automático (evitar repetir "diga ADAPTAR")
    if (lastTriedItem && frontPhoto && pendingItemId === lastTriedItem.item.id && lastAnnouncedItemRef.current !== lastTriedItem.item.id) {
      const itemName = lastTriedItem.item.name;
      const fullMessage = `Vamos a adaptar tu selección. Tardaremos unos segundos.`;
      const now = Date.now();
      const last = lastSpokenRef.current;
      if (last && last.text === fullMessage && now - last.time < SPEECH_COOLDOWN_MS) {
        return;
      }
      lastAnnouncedItemRef.current = lastTriedItem.item.id;
      itemArrivedFromCatalogRef.current = false;
      voiceAnnouncementInProgressRef.current = true;
      lastSpokenRef.current = { text: fullMessage, time: now };

      const timer = setTimeout(async () => {
        try {
          if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(fullMessage);
              utterance.lang = 'es-ES';
              utterance.pitch = 1.0;
              utterance.rate = 0.85;
              utterance.onend = () => {
                voiceAnnouncementInProgressRef.current = false;
                setTimeout(() => {
                  if (!autoTryOnTriggered && lastTriedItem) {
                    setAutoTryOnTriggered(lastTriedItem.item.id);
                    handleAiTryOn();
                  }
                }, 600);
              };
              utterance.onerror = () => voiceAnnouncementInProgressRef.current = false;
              window.speechSynthesis.speak(utterance);
            } else {
              if (!autoTryOnTriggered && lastTriedItem) {
                setAutoTryOnTriggered(lastTriedItem.item.id);
                handleAiTryOn();
              }
              voiceAnnouncementInProgressRef.current = false;
            }
          } else {
            await Speech.stop();
            await Speech.speak(fullMessage, {
              language: 'es-ES',
              pitch: 1.0,
              rate: 0.85,
              onDone: () => {
                voiceAnnouncementInProgressRef.current = false;
                setTimeout(() => {
                  if (!autoTryOnTriggered && lastTriedItem) {
                    setAutoTryOnTriggered(lastTriedItem.item.id);
                    handleAiTryOn();
                  }
                }, 600);
              },
              onStopped: () => voiceAnnouncementInProgressRef.current = false,
              onError: () => voiceAnnouncementInProgressRef.current = false,
            });
          }
        } catch (error) {
          voiceAnnouncementInProgressRef.current = false;
          if (!autoTryOnTriggered && lastTriedItem) {
            setAutoTryOnTriggered(lastTriedItem.item.id);
            handleAiTryOn();
          }
        }
        setTimeout(() => setPendingItemId(null), 3000);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [lastTriedItem, frontPhoto, pendingItemId, autoTryOnTriggered, handleAiTryOn]);

  // Reset autoTryOnTriggered when selecting a different item manually
  useEffect(() => {
    if (lastTriedItem && autoTryOnTriggered && autoTryOnTriggered !== lastTriedItem.item.id) {
      console.log('Mirror: Resetting autoTryOnTriggered for different item');
      setAutoTryOnTriggered(null);
    }
  }, [lastTriedItem, autoTryOnTriggered]);

  useEffect(() => {
    registerCommand('rotate-360', {
      patterns: ['girar', 'rotar', 'dar la vuelta', 'rotación'],
      action: () => {
        if (lastTriedItem && frontPhoto) {
          if (isAutoRotating) {
            stopAutoRotation();
          } else {
            startAutoRotation();
          }
        }
      },
      description: 'girar vista 360 grados',
    });

    registerCommand('stop-rotation', {
      patterns: ['detener', 'parar', 'stop', 'quieto'],
      action: () => {
        if (isAutoRotating) {
          stopAutoRotation();
        }
      },
      description: 'detener rotación',
    });

    registerCommand('share', {
      patterns: ['compartir', 'enviar', 'compartir resultado'],
      action: () => {
        if (lastTriedItem && frontPhoto) {
          handleShareResult();
        }
      },
      description: 'compartir resultado',
    });

    registerCommand('favorite', {
      patterns: ['favorito', 'me gusta', 'guardar favorito', 'añadir favorito'],
      action: () => {
        if (lastTriedItem) {
          handleToggleFavoriteItem();
        }
      },
      description: 'añadir a favoritos',
    });

    registerCommand('next', {
      patterns: ['siguiente', 'próxima', 'próximo', 'siguiente prenda', 'siguiente ropa'],
      action: () => {
        if (selectedItemIndex < triedItems.length - 1) {
          handleSelectTriedItem(selectedItemIndex + 1);
        }
      },
      description: 'siguiente prenda',
    });

    registerCommand('previous', {
      patterns: ['anterior', 'atrás', 'prenda anterior'],
      action: () => {
        if (selectedItemIndex > 0) {
          handleSelectTriedItem(selectedItemIndex - 1);
        }
      },
      description: 'prenda anterior',
    });

    registerCommand('catalog', {
      patterns: ['catálogo', 'ver catálogo', 'mostrar catálogo', 'ir al catálogo', 'volver al catálogo', 'abrir catálogo'],
      action: () => {
        setCompareMode(false);
        setCompareItemIndex(null);
        router.push('/(tabs)/catalog');
      },
      description: '',
    });

    registerCommand('tallas-medidas', {
      patterns: ['medidas', 'tallas', 'tallas y medidas', 'mis medidas', 'detectar medidas', 'ir a tallas', 'ir a medidas'],
      action: () => {
        setCompareMode(false);
        setCompareItemIndex(null);
        router.push('/(tabs)/size-detector');
      },
      description: 'Abriendo tallas y medidas',
    });

    registerCommand('go-360', {
      patterns: ['360', '360 grados', 'tres sesenta', 'ver 360', 'todos los angulos', 'todos los ángulos', 'vista 360', 'ir a 360', 'abrir 360', 'ver todos los angulos'],
      action: () => {
        setCompareMode(false);
        setCompareItemIndex(null);
        const itemWithReady360 = triedItems.find(ti => ti.view360?.isReady && !ti.view360?.generating);
        if (itemWithReady360) {
          speakMirrorConfirmation('Abriendo vista 360.');
          router.push('/(tabs)/tryon-360');
        } else {
          speakMirrorConfirmation('El video aún se está generando. Te llevaré automáticamente cuando termine.');
        }
      },
      description: '',
    });
    registerCommand('accept-360', {
      patterns: ['aceptar', 'acceptar', 'ver 360'],
      action: () => {
        setCompareMode(false);
        setCompareItemIndex(null);
        const itemWithReady360 = triedItems.find(ti => ti.view360?.isReady && !ti.view360?.generating);
        if (itemWithReady360) {
          speakMirrorConfirmation('Abriendo vista 360.');
          router.push('/(tabs)/tryon-360');
        } else {
          speakMirrorConfirmation('El video aún se está generando. Te llevaré automáticamente cuando termine.');
        }
      },
      description: '',
    });

    registerCommand('compare-mode', {
      patterns: ['comparación', 'lado a lado', 'comparar prendas', 'modo comparación'],
      action: () => {
        toggleCompareMode();
      },
      description: 'modo comparación',
    });

    registerCommand('ver-lo-probado', {
      patterns: ['ver lo que me he probado', 'lo que me he probado', 'ver mis pruebas', 'mis pruebas', 'ver probado', 'qué me he probado'],
      action: () => {
        const triedWithComposite = triedItems
          .filter(ti => ti.compositeImage)
          .sort((a, b) => {
            const aFav = favorites.some(f => f.id === a.item.id) ? 1 : 0;
            const bFav = favorites.some(f => f.id === b.item.id) ? 1 : 0;
            return bFav - aFav;
          });
        if (triedWithComposite.length >= 1) {
          if (!lastTriedItem?.compositeImage && lastTriedItem && frontPhoto) {
            captureAndSaveComposite().then(() => {
              setCompareMode(true);
              setCompareItemIndex(triedItems.findIndex(t => t.item.id === triedWithComposite[0].item.id) ?? 0);
              setIsCarouselMode(triedWithComposite.length > 1);
              speakMirrorConfirmation('Vista de comparación con tus favoritos.');
            });
          } else {
            setCompareMode(true);
            const idx = triedItems.findIndex(t => t.item.id === (triedWithComposite[0]?.item.id ?? ''));
            setCompareItemIndex(idx >= 0 ? idx : 0);
            setIsCarouselMode(triedWithComposite.length > 1);
            speakMirrorConfirmation('Vista de comparación con tus favoritos.');
          }
        } else {
          speakMirrorConfirmation('Aún no tienes prendas probadas para comparar. Prueba alguna del catálogo.');
        }
      },
      description: 'ver lo que me he probado',
    });

    registerCommand('auto-scroll', {
      patterns: ['automático', 'modo automático', 'activar automático'],
      action: () => {
        toggleAutoScroll();
      },
      description: 'modo automático',
    });

    registerCommand('stop-auto-scroll', {
      patterns: ['parar', 'detener', 'stop'],
      action: () => {
        if (isAutoScrolling) {
          toggleAutoScroll();
        }
      },
      description: 'parar',
    });

    registerCommand('try-on', {
      patterns: [
        'adaptar', 'adaptar prenda', 'adaptar automáticamente', 
        'prueba virtual', 'probármela', 'probarmela', 'me la pruebo',
        'ajustar', 'ajustar prenda', 'ver cómo queda', 'como queda'
      ],
      action: () => {
        if (lastTriedItem && frontPhoto && !isGeneratingTryOn) {
          handleAiTryOn();
        }
      },
      description: `adaptando ${lastTriedItem?.item?.name || 'prenda'} a sus medidas`,
    });

    registerCommand('select-second', {
      patterns: ['segunda', 'segunda prenda', 'probar segunda'],
      action: () => {
        if (triedItems.length >= 2) {
          handleSelectTriedItem(1);
        }
      },
      description: 'seleccionar segunda prenda',
    });

    registerCommand('select-third', {
      patterns: ['tercera', 'tercera prenda', 'probar tercera'],
      action: () => {
        if (triedItems.length >= 3) {
          handleSelectTriedItem(2);
        }
      },
      description: 'seleccionar tercera prenda',
    });

    registerCommand('select-fourth', {
      patterns: ['cuarta', 'cuarta prenda', 'probar cuarta'],
      action: () => {
        if (triedItems.length >= 4) {
          handleSelectTriedItem(3);
        }
      },
      description: 'seleccionar cuarta prenda',
    });

    registerCommand('select-this', {
      patterns: ['esta', 'ésta', 'seleccionar esta'],
      action: () => {
        if (triedItems.length > 0) {
          handleSelectTriedItem(selectedItemIndex);
        }
      },
      description: 'seleccionar prenda actual',
    });

    registerCommand('more-clothes', {
      patterns: ['ver más prendas', 'más prendas', 'ver más ropa', 'más sugerencias'],
      action: () => {
        router.push('/(tabs)/catalog');
      },
      description: 'ver más prendas',
    });

    // Decir el nombre de una prenda probada → ir al catálogo a buscarla
    const catalogKeywords = ['catálogo', 'ver', 'mostrar', 'buscar', 'siguiente', 'anterior', 'adaptar'];
    const itemNamePatterns = triedItems
      .map(ti => ti.item.name?.trim())
      .filter((name): name is string => !!name && name.length > 0 && !catalogKeywords.includes(name.toLowerCase()));
    if (itemNamePatterns.length > 0) {
      registerCommand('catalog-by-item-name', {
        patterns: [...new Set([...itemNamePatterns, ...itemNamePatterns.map(n => n.toLowerCase())])],
        action: () => {
          setCompareMode(false);
          setCompareItemIndex(null);
          router.push('/(tabs)/catalog');
        },
        description: 'Abriendo catálogo',
      });
    }

    registerCommand('show-qr', {
      patterns: ['mostrar qr', 'ver qr', 'código qr', 'qr'],
      action: () => {
        if (lastTriedItem && frontPhoto) {
          setShowQRCode(true);
        }
      },
      description: 'mostrar código QR',
    });

    registerCommand('hide-qr', {
      patterns: ['ocultar qr', 'cerrar qr', 'quitar qr'],
      action: () => {
        setShowQRCode(false);
      },
      description: 'ocultar código QR',
    });

    registerCommand('carousel-mode', {
      patterns: [
        'ver lo que he probado', 'ver probadas', 'carrusel', 'modo carrusel',
        'ver mis prendas', 'mis prendas probadas', 'revisar probadas',
        'slideshow', 'presentación'
      ],
      action: () => {
        const triedWithComposite = triedItems.filter(ti => ti.compositeImage);
        if (triedWithComposite.length > 0) {
          setIsCarouselMode(true);
          setCompareMode(true);
          setCarouselIndex(0);
          const firstIndex = triedItems.findIndex(t => t.item.id === triedWithComposite[0].item.id);
          setCompareItemIndex(firstIndex);
          speakMirrorConfirmation(`Mostrando ${triedWithComposite.length} prendas probadas en carrusel`);
        } else {
          speakMirrorConfirmation('No hay prendas probadas con imagen para mostrar');
        }
      },
      description: 'activando carrusel de prendas probadas',
    });

    registerCommand('stop-carousel', {
      patterns: ['parar carrusel', 'detener carrusel', 'salir carrusel', 'cerrar carrusel'],
      action: () => {
        setIsCarouselMode(false);
        if (carouselIntervalRef.current) {
          clearInterval(carouselIntervalRef.current);
          carouselIntervalRef.current = null;
        }
        speakMirrorConfirmation('Carrusel detenido');
      },
      description: 'deteniendo carrusel',
    });

    registerCommand('carousel-faster', {
      patterns: ['más rápido', 'acelerar', 'rápido', 'velocidad rápida'],
      action: () => {
        if (isCarouselMode) {
          setCarouselSpeed(prev => Math.max(1000, prev - 1000));
          speakMirrorConfirmation('Velocidad aumentada');
        }
      },
      description: 'aumentando velocidad del carrusel',
    });

    registerCommand('carousel-slower', {
      patterns: ['más lento', 'desacelerar', 'lento', 'velocidad lenta'],
      action: () => {
        if (isCarouselMode) {
          setCarouselSpeed(prev => Math.min(8000, prev + 1000));
          speakMirrorConfirmation('Velocidad reducida');
        }
      },
      description: 'reduciendo velocidad del carrusel',
    });

    return () => {
      unregisterCommand('rotate-360');
      unregisterCommand('stop-rotation');
      unregisterCommand('share');
      unregisterCommand('favorite');
      unregisterCommand('next');
      unregisterCommand('previous');
      unregisterCommand('catalog');
      unregisterCommand('tallas-medidas');
      unregisterCommand('go-360');
      unregisterCommand('accept-360');
      unregisterCommand('catalog-by-item-name');
      unregisterCommand('compare-mode');
      unregisterCommand('ver-lo-probado');
      unregisterCommand('auto-scroll');
      unregisterCommand('select-second');
      unregisterCommand('select-third');
      unregisterCommand('select-fourth');
      unregisterCommand('select-this');
      unregisterCommand('more-clothes');
      unregisterCommand('stop-auto-scroll');
      unregisterCommand('try-on');
      unregisterCommand('carousel-mode');
      unregisterCommand('stop-carousel');
      unregisterCommand('carousel-faster');
      unregisterCommand('carousel-slower');
    };
  }, [lastTriedItem, frontPhoto, isAutoRotating, selectedItemIndex, triedItems.length, isAutoScrolling, isGeneratingTryOn, isCarouselMode, registerCommand, unregisterCommand, router, handleShareResult, handleToggleFavoriteItem, handleSelectTriedItem, startAutoRotation, stopAutoRotation, toggleCompareMode, toggleAutoScroll, handleAiTryOn, speakMirrorConfirmation, triedItems, captureAndSaveComposite]);

  const toggleVoiceCommands = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleFilters = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowFilters(!showFilters);
  };

  const applyFilter = (filter: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setActiveFilter(filter);
    
    switch(filter) {
      case 'bright':
        setBrightness(1.35);
        setContrast(1.1);
        break;
      case 'dark':
        setBrightness(0.65);
        setContrast(1.15);
        break;
      case 'vivid':
        setBrightness(1.1);
        setContrast(1.5);
        break;
      case 'soft':
        setBrightness(0.95);
        setContrast(0.75);
        break;
      case 'warm':
        setBrightness(1.15);
        setContrast(0.95);
        break;
      case 'cool':
        setBrightness(0.9);
        setContrast(1.2);
        break;
      default:
        setBrightness(1);
        setContrast(1);
    }
  };

  const toggleQRCode = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowQRCode(!showQRCode);
  };

  const toggleInfoCollapse = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setInfoCollapsed(!infoCollapsed);
  };
  
  useEffect(() => {
    if (!isAutoScrolling) return;
    
    const leftListener = scrollPositionLeft.addListener(({ value }) => {
      leftScrollRef.current?.scrollTo({ y: value, animated: false });
    });
    
    const rightListener = scrollPositionRight.addListener(({ value }) => {
      rightScrollRef.current?.scrollTo({ y: value, animated: false });
    });
    
    return () => {
      scrollPositionLeft.removeListener(leftListener);
      scrollPositionRight.removeListener(rightListener);
    };
  }, [isAutoScrolling, scrollPositionLeft, scrollPositionRight]);
  
  useEffect(() => {
    return () => {
      if (scrollAnimRef.current) {
        scrollAnimRef.current.stop();
      }
      if (autoRotateAnim.current) {
        autoRotateAnim.current.stop();
      }
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isCarouselMode && compareMode) {
      const triedWithComposite = triedItems.filter(ti => ti.compositeImage);
      if (triedWithComposite.length === 0) {
        setIsCarouselMode(false);
        return;
      }

      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }

      carouselIntervalRef.current = setInterval(() => {
        setCarouselIndex(prev => {
          const nextIndex = (prev + 1) % triedWithComposite.length;
          const nextItem = triedWithComposite[nextIndex];
          const originalIndex = triedItems.findIndex(t => t.item.id === nextItem.item.id);
          setCompareItemIndex(originalIndex);
          return nextIndex;
        });
      }, carouselSpeed);

      return () => {
        if (carouselIntervalRef.current) {
          clearInterval(carouselIntervalRef.current);
          carouselIntervalRef.current = null;
        }
      };
    } else {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
        carouselIntervalRef.current = null;
      }
    }
  }, [isCarouselMode, compareMode, carouselSpeed, triedItems]);

  const filters = [
    { id: 'normal', name: 'Normal', icon: Eye, desc: 'Sin filtro' },
    { id: 'bright', name: 'Día', icon: Zap, desc: 'Luz natural' },
    { id: 'dark', name: 'Noche', icon: Contrast, desc: 'Iluminación tenue' },
    { id: 'vivid', name: 'Tienda', icon: Sparkles, desc: 'Luz LED' },
    { id: 'soft', name: 'Evento', icon: Palette, desc: 'Luz ambiente' },
    { id: 'warm', name: 'Cálida', icon: Sparkles, desc: 'Tono dorado' },
    { id: 'cool', name: 'Fría', icon: Eye, desc: 'Tono azulado' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        {lastTriedItem && frontPhoto ? (
          <View style={styles.mirrorLayout}>
            <View style={styles.leftPanel}>
              <View style={styles.panelHeader}>
                <Heart size={20} color="#FF006E" />
                <Text style={styles.panelTitle}>Seleccionadas</Text>
              </View>
              <TouchableOpacity 
                style={styles.autoScrollButton}
                onPress={toggleAutoScroll}
              >
                <RotateCw size={16} color="#FFFFFF" />
                <Text style={styles.autoScrollText}>{isAutoScrolling ? 'Parar' : 'Auto'}</Text>
              </TouchableOpacity>
              <ScrollView 
                ref={leftScrollRef}
                style={styles.panelScroll}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!isAutoScrolling}
              >
                {favorites.map((fav, index) => {
                  const triedIndex = triedItems.findIndex(ti => ti.item.id === fav.id);
                  const isCurrentlySelected = triedIndex >= 0 && selectedItemIndex === triedIndex;
                  return (
                    <TouchableOpacity
                      key={fav.id + index}
                      style={[
                        styles.sideCard,
                        isCurrentlySelected && styles.sideCardActive
                      ]}
                      onPress={() => {
                        if (triedIndex >= 0) {
                          handleSelectTriedItem(triedIndex);
                        } else {
                          handleTrySuggestion(fav);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: fav.image }}
                        style={styles.sideCardImage}
                        cachePolicy="memory-disk"
                        contentFit="cover"
                      />
                      <View style={styles.sideCardInfo}>
                        <Text style={styles.sideCardBrand} numberOfLines={1}>{fav.brand}</Text>
                        <Text style={styles.sideCardName} numberOfLines={2}>{fav.name}</Text>
                        <Text style={styles.sideCardPrice}>{fav.price.toFixed(2)}€</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {favorites.length === 0 && (
                  <View style={styles.emptyPanelMessage}>
                    <Heart size={24} color="#6B7280" />
                    <Text style={styles.emptyPanelText}>Añade favoritos desde el catálogo</Text>
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={[styles.centerMirror, compareMode && styles.centerMirrorCompare]}>
              <Animated.View 
                ref={mirrorViewRef}
                style={[
                  styles.mirrorContent,
                  {
                    opacity: fadeAnim,
                  }
                ]}
              >
                {(showUserOnly && frontPhoto) ? (
                  <View style={styles.photoWrapper}>
                    <Image 
                      source={{ uri: frontPhoto }}
                      style={styles.userPhoto}
                      contentFit="cover"
                    />
                  </View>
                ) : aiResultImage ? (
                  <View style={styles.photoWrapper}>
                    <Image 
                      source={{ uri: aiResultImage }}
                      style={styles.userPhoto}
                      contentFit="cover"
                    />
                  </View>
                ) : (
                  <Animated.View
                    style={[
                      styles.photoWrapper,
                      {
                        transform: [
                          {
                            rotateY: rotationAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg']
                            })
                          }
                        ]
                      }
                    ]}
                  >
                  <AnimatedImage
                    style={[
                      styles.userPhoto,
                      {
                        opacity: rotationAnim.interpolate({
                          inputRange: [0, 0.125, 0.375, 0.5, 0.625, 0.875, 1],
                          outputRange: [1, 0.3, 0.3, 1, 0.3, 0.3, 1]
                        })
                      }
                    ]}
                    source={{ 
                      uri: frontPhoto
                    }}
                  />
                  {sidePhoto && (
                    <AnimatedImage 
                      source={{ uri: sidePhoto }}
                      style={[
                        styles.userPhoto,
                        {
                          opacity: rotationAnim.interpolate({
                            inputRange: [0, 0.125, 0.375, 0.5, 0.625, 0.875, 1],
                            outputRange: [0.3, 1, 1, 0.3, 1, 1, 0.3]
                          })
                        }
                      ]}
                    />
                  )}
                    <Image 
                      source={{ uri: lastTriedItem.item.image }}
                      style={[
                        styles.clothingOverlay,
                        {
                          opacity: brightness * contrast * 0.95,
                          transform: [{ scale: brightness > 1 ? 1.02 : 0.98 }]
                        }
                      ]}
                      cachePolicy="memory-disk"
                      contentFit="contain"
                    />
                  </Animated.View>
                )}
                
                {showFilters && (
                  <View style={styles.filtersPanel}>
                    <View style={styles.filtersPanelHeader}>
                      <Text style={styles.filtersPanelTitle}>Filtros</Text>
                      <TouchableOpacity 
                        style={styles.closeFiltersButton}
                        onPress={toggleFilters}
                      >
                        <X size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.filtersList}
                    >
                      {filters.map((filter) => {
                        const IconComponent = filter.icon;
                        return (
                          <TouchableOpacity
                            key={filter.id}
                            style={[
                              styles.filterChip,
                              activeFilter === filter.id && styles.filterChipActive
                            ]}
                            onPress={() => applyFilter(filter.id)}
                          >
                            <IconComponent size={16} color={activeFilter === filter.id ? '#FFFFFF' : '#9CA3AF'} />
                            <Text style={[
                              styles.filterText,
                              activeFilter === filter.id && styles.filterTextActive
                            ]}>
                              {filter.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                
                <View style={styles.mirrorOverlay}>
                  <View style={styles.topRow}>
                    <View style={styles.topRowLeft}>
                      <TouchableOpacity 
                        style={styles.iconButton}
                        onPress={handleToggleFavoriteItem}
                      >
                        <Heart 
                          size={24} 
                          color={isFavorite(lastTriedItem.item.id) ? '#FF006E' : '#FFFFFF'}
                          fill={isFavorite(lastTriedItem.item.id) ? '#FF006E' : 'transparent'}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.iconButton}
                        onPress={handleShareResult}
                      >
                        <Share2 size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.iconButton, compareMode && styles.iconButtonActive]}
                        onPress={toggleCompareMode}
                        disabled={triedItems.length < 2}
                      >
                        <Grid2X2 size={24} color={triedItems.length < 2 ? "#6B7280" : "#FFFFFF"} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.iconButton, showFilters && styles.iconButtonActive]}
                        onPress={toggleFilters}
                      >
                        <Palette size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.iconButton, styles.aiButton, isGeneratingTryOn && styles.iconButtonActive]}
                        onPress={handleAiTryOn}
                        disabled={isGeneratingTryOn}
                      >
                        {isGeneratingTryOn ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Wand2 size={24} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity 
                      style={[
                        styles.iconButton, 
                        styles.micButton, 
                        isListening && styles.micButtonActive,
                        !isSupported && styles.micButtonDisabled
                      ]}
                      onPress={isSupported ? toggleVoiceCommands : () => {
                        if (Platform.OS !== 'web') {
                          Alert.alert('No disponible', 'El reconocimiento de voz no está disponible en este dispositivo');
                        } else {
                          alert('El reconocimiento de voz no está disponible en este navegador');
                        }
                      }}
                    >
                      {isListening ? (
                        <MicOff size={24} color="#FFFFFF" />
                      ) : (
                        <Mic size={24} color={isSupported ? "#FFFFFF" : "#9CA3AF"} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.bottomRow}>
                    <TouchableOpacity 
                      style={styles.rotateButton}
                      onPress={handleRotateReverse}
                    >
                      <RotateCcw size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.rotateButton, styles.rotateButtonMain, isAutoRotating && styles.rotateButtonActive]}
                      onPress={isAutoRotating ? stopAutoRotation : startAutoRotation}
                    >
                      <RotateCw size={28} color="#FFFFFF" />
                      <Text style={styles.rotateText}>{isAutoRotating ? 'Detener' : 'Vista 360°'}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.rotateButton}
                      onPress={handleRotate}
                    >
                      <RotateCw size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                {!infoCollapsed ? (
                  <View style={styles.itemInfo}>
                    <TouchableOpacity 
                      style={styles.itemInfoContent}
                      onPress={toggleInfoCollapse}
                      activeOpacity={0.9}
                    >
                      <TouchableOpacity 
                        style={styles.qrToggleButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleQRCode();
                        }}
                      >
                        <Text style={styles.qrToggleText}>{showQRCode ? 'Texto' : 'QR'}</Text>
                      </TouchableOpacity>
                      
                      {showQRCode ? (
                        <View style={styles.qrCodeContainer}>
                          <Image
                            source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${lastTriedItem.item.brand} - ${lastTriedItem.item.name} - ${lastTriedItem.item.price.toFixed(2)}€`)}` }}
                            style={styles.qrCodeImage}
                            cachePolicy="memory-disk"
                            contentFit="contain"
                          />
                          <Text style={styles.itemBrandCompact}>{lastTriedItem.item.brand}</Text>
                        </View>
                      ) : (
                        <View style={styles.itemInfoTextContainer}>
                          <Text style={styles.itemBrandCompact}>{lastTriedItem.item.brand}</Text>
                          <Text style={styles.itemNameCompact} numberOfLines={1}>{lastTriedItem.item.name}</Text>
                          <Text style={styles.itemPriceCompact}>{lastTriedItem.item.price.toFixed(2)}€</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.expandInfoButton}
                    onPress={toggleInfoCollapse}
                  >
                    <View style={styles.expandInfoIndicator} />
                  </TouchableOpacity>
                )}
              </Animated.View>
            </View>

            {compareMode && compareItemIndex !== null && triedItems[compareItemIndex] && (
              <View style={styles.comparePanel}>
                <View style={styles.compareMirror}>
                  <TouchableOpacity 
                    style={styles.closeCompareButton}
                    onPress={toggleCompareMode}
                  >
                    <X size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View style={styles.compareSelector}>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.compareSelectorScroll}
                    >
                      {triedItems.filter(ti => ti.compositeImage).map((tried) => {
                        const originalIndex = triedItems.findIndex(t => t.item.id === tried.item.id);
                        return (
                          <TouchableOpacity
                            key={tried.item.id}
                            style={[
                              styles.compareSelectorItem,
                              compareItemIndex === originalIndex && styles.compareSelectorItemActive
                            ]}
                            onPress={() => {
                              if (Platform.OS !== 'web') {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              }
                              setCompareItemIndex(originalIndex);
                            }}
                          >
                            <Image
                              source={{ uri: tried.compositeImage }}
                              style={styles.compareSelectorImage}
                              cachePolicy="memory-disk"
                              contentFit="cover"
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                  <Animated.View
                    style={[
                      styles.comparePhotoWrapper,
                      {
                        transform: [
                          {
                            rotateY: rotationAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg']
                            })
                          }
                        ]
                      }
                    ]}
                  >
                    {triedItems[compareItemIndex].compositeImage ? (
                      <Image
                        source={{ uri: triedItems[compareItemIndex].compositeImage }}
                        style={styles.comparePhoto}
                        cachePolicy="memory-disk"
                        contentFit="cover"
                      />
                    ) : (
                      <>
                        <AnimatedImage 
                          source={{ uri: frontPhoto }}
                          style={[
                            styles.userPhoto,
                            {
                              opacity: rotationAnim.interpolate({
                                inputRange: [0, 0.125, 0.375, 0.5, 0.625, 0.875, 1],
                                outputRange: [1, 0.3, 0.3, 1, 0.3, 0.3, 1]
                              })
                            }
                          ]}
                          contentFit="contain"
                        />
                        {sidePhoto && (
                          <AnimatedImage 
                            source={{ uri: sidePhoto }}
                            style={[
                              styles.userPhoto,
                              {
                                opacity: rotationAnim.interpolate({
                                  inputRange: [0, 0.125, 0.375, 0.5, 0.625, 0.875, 1],
                                  outputRange: [0.3, 1, 1, 0.3, 1, 1, 0.3]
                                })
                              }
                            ]}
                            contentFit="contain"
                          />
                        )}
                        <Image 
                          source={{ uri: triedItems[compareItemIndex].item.image }}
                          style={[
                            styles.clothingOverlay,
                            {
                              opacity: brightness * contrast * 0.95,
                              transform: [{ scale: brightness > 1 ? 1.02 : 0.98 }]
                            }
                          ]}
                          cachePolicy="memory-disk"
                          contentFit="contain"
                        />
                      </>
                    )}
                  </Animated.View>
                  <View style={styles.compareLabel}>
                    <Text style={styles.compareLabelText}>
                      {isCarouselMode ? `Carrusel (${carouselIndex + 1}/${triedItems.filter(ti => ti.compositeImage).length})` : 'Comparación'}
                    </Text>
                  </View>
                  {isCarouselMode && (
                    <View style={styles.carouselControls}>
                      <TouchableOpacity
                        style={styles.carouselSpeedButton}
                        onPress={() => setCarouselSpeed(prev => Math.max(1000, prev - 1000))}
                      >
                        <Text style={styles.carouselSpeedText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.carouselSpeedLabel}>{carouselSpeed / 1000}s</Text>
                      <TouchableOpacity
                        style={styles.carouselSpeedButton}
                        onPress={() => setCarouselSpeed(prev => Math.min(8000, prev + 1000))}
                      >
                        <Text style={styles.carouselSpeedText}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.carouselStopButton}
                        onPress={() => {
                          setIsCarouselMode(false);
                          if (carouselIntervalRef.current) {
                            clearInterval(carouselIntervalRef.current);
                            carouselIntervalRef.current = null;
                          }
                        }}
                      >
                        <Text style={styles.carouselStopText}>Parar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.compareInfoContainer}>
                    <TouchableOpacity 
                      style={styles.compareQrToggleButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowQRCode(!showQRCode);
                      }}
                    >
                      <Text style={styles.compareQrToggleText}>{showQRCode ? 'Texto' : 'QR'}</Text>
                    </TouchableOpacity>
                    {showQRCode ? (
                      <View style={styles.compareQrContainer}>
                        <Image
                          source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`${triedItems[compareItemIndex].item.brand} - ${triedItems[compareItemIndex].item.name} - ${triedItems[compareItemIndex].item.price.toFixed(2)}€`)}` }}
                          style={styles.compareQrImage}
                          cachePolicy="memory-disk"
                          contentFit="contain"
                        />
                        <Text style={styles.compareItemBrandCompact}>{triedItems[compareItemIndex].item.brand}</Text>
                      </View>
                    ) : (
                      <View style={styles.compareInfo}>
                        <Text style={styles.compareItemBrand}>{triedItems[compareItemIndex].item.brand}</Text>
                        <Text style={styles.compareItemName} numberOfLines={1}>{triedItems[compareItemIndex].item.name}</Text>
                        <Text style={styles.compareItemPrice}>{triedItems[compareItemIndex].item.price.toFixed(2)}€</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

            <View style={styles.rightPanel}>
              <View style={styles.panelHeader}>
                <Sparkles size={20} color="#00FF9D" />
                <Text style={styles.panelTitle}>Probadas</Text>
              </View>
              <ScrollView 
                ref={rightScrollRef}
                style={styles.panelScroll}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!isAutoScrolling}
              >
                {triedItems.filter(ti => ti.compositeImage).map((tried, index) => {
                  const originalIndex = triedItems.findIndex(t => t.item.id === tried.item.id);
                  return (
                    <TouchableOpacity
                      key={tried.item.id + index}
                      style={[
                        styles.sideCard,
                        selectedItemIndex === originalIndex && styles.sideCardActive
                      ]}
                      onPress={() => {
                        if (compareMode) {
                          setCompareItemIndex(originalIndex);
                        } else {
                          handleSelectTriedItem(originalIndex);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: tried.compositeImage }}
                        style={styles.sideCardImage}
                        cachePolicy="memory-disk"
                        contentFit="cover"
                      />
                      {isFavorite(tried.item.id) && (
                        <View style={styles.sideCardFavoriteBadge}>
                          <Heart size={14} color="#FF006E" fill="#FF006E" />
                        </View>
                      )}
                      <View style={styles.sideCardInfo}>
                        <Text style={styles.sideCardBrand} numberOfLines={1}>{tried.item.brand}</Text>
                        <Text style={styles.sideCardName} numberOfLines={2}>{tried.item.name}</Text>
                        <Text style={styles.sideCardPrice}>{tried.item.price.toFixed(2)}€</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {triedItems.filter(ti => ti.compositeImage).length === 0 && (
                  <View style={styles.emptyPanelMessage}>
                    <Sparkles size={24} color="#6B7280" />
                    <Text style={styles.emptyPanelText}>Prueba prendas y comparte para verlas aquí</Text>
                  </View>
                )}
                
                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={() => {
                    setCompareMode(false);
                    setCompareItemIndex(null);
                    router.push('/(tabs)/catalog');
                  }}
                >
                  <Text style={styles.viewMoreText}>Ver más prendas</Text>
                  <ChevronRight size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Sparkles size={80} color={Colors.light.primary} />
            <Text style={styles.emptyTitle}>
              {scanData?.completed 
                ? 'Selecciona ropa del catálogo' 
                : 'Completa tu escaneo'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {scanData?.completed
                ? 'Explora el catálogo y prueba prendas virtuales'
                : 'Necesitas completar el escaneo para comenzar'}
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push(scanData?.completed ? '/(tabs)/catalog' : '/(tabs)/scanner')}
            >
              <Text style={styles.emptyButtonText}>
                {scanData?.completed ? 'Ir al Catálogo' : 'Iniciar Escaneo'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <VoiceCommandsBanner screen="mirror" />
      
      {/* Notificación 360º lista */}
      {show360Notification && (
        <Animated.View
          style={[
            styles.notification360,
            {
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0]
              })}]
            }
          ]}
        >
          <View style={styles.notification360Content}>
            <RotateCw size={32} color="#FFFFFF" />
            <View style={styles.notification360Text}>
              <Text style={styles.notification360Title}>¡Sorpresa lista!</Text>
              <Text style={styles.notification360Subtitle}>
                Descubre cómo te queda desde todos los ángulos
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notification360Button}
              onPress={() => {
                setShow360Notification(false);
                router.push('/(tabs)/tryon-360');
              }}
            >
              <Sparkles size={20} color="#000000" />
              <Text style={styles.notification360ButtonText}>Ver 360º</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notification360Close}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Speech.speak('Perfecto, puedes seguir probando prendas. Cuando quieras ver todos los ángulos, ve a la pestaña 360 grados.', {
                    language: 'es-ES',
                    rate: 0.95,
                  });
                }
                setShow360Notification(false);
              }}
            >
              <Text style={styles.notification360CloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {showBootVideo && (
        <BootVideo
          visible={showBootVideo}
          onFinish={handleBootVideoFinish}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mainContent: {
    flex: 1,
  },
  mirrorLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: 110,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    paddingTop: 60,
    paddingBottom: 80,
  },
  rightPanel: {
    width: 110,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    paddingTop: 60,
    paddingBottom: 80,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  panelTitle: {
    fontSize: 9,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  panelScroll: {
    flex: 1,
  },
  sideCard: {
    marginHorizontal: 8,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sideCardActive: {
    borderColor: '#00FF9D',
    shadowColor: '#00FF9D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  sideCardImage: {
    width: '100%',
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sideCardInfo: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sideCardBrand: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  sideCardName: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  sideCardPrice: {
    fontSize: 13,
    color: '#00FF9D',
    fontWeight: 'bold' as const,
  },
  sideCardFavoriteBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 8,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  centerMirror: {
    flex: 1,
    position: 'relative',
  },
  centerMirrorCompare: {
    flex: 0.5,
  },
  mirrorContent: {
    flex: 1,
    position: 'relative',
  },
  photoWrapper: {
    flex: 1,
    position: 'relative',
  },
  userPhoto: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  clothingOverlay: {
    width: '55%',
    height: '55%',
    position: 'absolute',
    top: '22%',
    left: '22.5%',
  },
  mirrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topRowLeft: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  micButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    borderColor: '#6366F1',
  },
  micButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  micButtonDisabled: {
    backgroundColor: 'rgba(100, 100, 100, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.5,
  },
  rotateButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rotateButtonMain: {
    flexDirection: 'row',
    width: 'auto',
    paddingHorizontal: 24,
    gap: 12,
    borderColor: '#00FF9D',
    shadowColor: '#00FF9D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  rotateButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  rotateText: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  itemInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  itemInfoContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  itemInfoTextContainer: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  qrToggleButton: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
    width: 36,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 157, 0.2)',
    borderWidth: 1,
    borderColor: '#00FF9D',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  qrToggleText: {
    fontSize: 9,
    fontWeight: 'bold' as const,
    color: '#00FF9D',
  },
  qrCodeContainer: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  qrCodeImage: {
    width: 80,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  itemBrandCompact: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  itemNameCompact: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  itemPriceCompact: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#00FF9D',
  },
  expandInfoButton: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: [{ translateX: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandInfoIndicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#00FF9D',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
    backgroundColor: '#000000',
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 12,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  emptyButtonText: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  filtersPanel: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  filtersPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  filtersPanelTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  closeFiltersButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersList: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#818CF8',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#9CA3AF',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  aiButton: {
    backgroundColor: 'rgba(236, 72, 153, 0.7)', // Pink for "Magic"
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  resetAiButton: {
    position: 'absolute',
    top: 80,
    left: '50%',
    transform: [{ translateX: -70 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  resetAiText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  comparePanel: {
    flex: 0.5,
    borderLeftWidth: 2,
    borderLeftColor: '#00FF9D',
  },
  compareMirror: {
    flex: 1,
    position: 'relative',
  },
  compareLabel: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  compareLabelText: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: '#00FF9D',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#00FF9D',
  },
  comparePhoto: {
    width: '100%',
    height: '100%',
  },
  comparePhotoWrapper: {
    flex: 1,
    position: 'relative',
  },
  compareInfoContainer: {
    position: 'absolute',
    bottom: 10,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 60,
    justifyContent: 'center',
  },
  compareQrToggleButton: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
    width: 36,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 157, 0.2)',
    borderWidth: 1,
    borderColor: '#00FF9D',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  compareQrToggleText: {
    fontSize: 9,
    fontWeight: 'bold' as const,
    color: '#00FF9D',
  },
  compareQrContainer: {
    alignItems: 'center',
    gap: 8,
  },
  compareQrImage: {
    width: 60,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  compareItemBrandCompact: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  compareInfo: {
    alignItems: 'center',
    gap: 2,
  },
  compareItemBrand: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  compareItemName: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  compareItemPrice: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#00FF9D',
    marginTop: 2,
  },
  closeCompareButton: {
    position: 'absolute',
    top: 60,
    right: 10,
    zIndex: 11,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  compareSelector: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 60,
    zIndex: 9,
  },
  compareSelectorScroll: {
    paddingHorizontal: 10,
    gap: 8,
  },
  compareSelectorItem: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  compareSelectorItemActive: {
    borderColor: '#00FF9D',
    shadowColor: '#00FF9D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  compareSelectorImage: {
    width: '100%',
    height: '100%',
  },
  carouselControls: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  carouselSpeedButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  carouselSpeedText: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  carouselSpeedLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  carouselStopButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  carouselStopText: {
    fontSize: 12,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  autoScrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  autoScrollText: {
    fontSize: 11,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  emptyPanelMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 10,
    gap: 12,
  },
  emptyPanelText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  notification360: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 60,
    left: 16,
    right: 16,
    zIndex: 10000,
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  notification360Content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notification360Text: {
    flex: 1,
  },
  notification360Title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  notification360Subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  notification360Button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  notification360ButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  notification360Close: {
    padding: 4,
  },
  notification360CloseText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
