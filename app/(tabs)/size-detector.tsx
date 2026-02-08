import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { useRouter, useFocusEffect } from 'expo-router';

import { ChevronLeft, ChevronRight, Check, RotateCcw, Sparkles } from 'lucide-react-native';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useVoice } from '@/contexts/VoiceContext';

type BodyType = 'plana' | 'media' | 'curvada';
type HipType = 'delgada' | 'media' | 'curvada';
type Gender = 'male' | 'female';

type SizeData = {
  height: string;
  weight: string;
  age: string;
  gender: Gender;
  waist: BodyType | null;
  hips: HipType | null;
};

const STEPS = ['medidas', 'edad', 'cintura', 'cadera', 'resultado_ia', 'resultado'] as const;
type Step = typeof STEPS[number];

export default function SizeDetectorScreen() {
  const router = useRouter();
  const { scanData, sizeDetectorData, saveSizeDetectorData, autoTriggerDetection, setAutoTriggerDetection } = useApp();
  const { registerCommand, unregisterCommand } = useVoice();
  
  const [currentStep, setCurrentStep] = useState<Step>('medidas');
  const [sizeData, setSizeData] = useState<SizeData>({
    height: '',
    weight: '',
    age: '',
    gender: 'female',
    waist: null,
    hips: null,
  });
  const [heightUnit, setHeightUnit] = useState<'cm' | 'in'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [fitType, setFitType] = useState<'ajustado' | 'holgado'>('ajustado');
  const [recommendedSize, setRecommendedSize] = useState<string>('');
  const [, setEstimatedEUSize] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeakingResults, setIsSpeakingResults] = useState(false);

  const calculateSize = useCallback((): { intSize: string; euSize: string } => {
    const height = parseFloat(sizeData.height);
    const weight = parseFloat(sizeData.weight);
    const age = parseInt(sizeData.age);
    const isMale = sizeData.gender === 'male';

    if (!height || !weight || !age || !sizeData.waist || !sizeData.hips) {
      return { intSize: 'M', euSize: isMale ? '48-50' : '38-40' };
    }

    let baseSize = 'M';
    let euSize = '';
    
    if (isMale) {
      if (height < 165 && weight < 60) {
        baseSize = 'XS';
        euSize = '44';
      } else if (height < 170 && weight < 70) {
        baseSize = 'S';
        euSize = '46';
      } else if (height < 175 && weight < 80) {
        baseSize = 'M';
        euSize = '48-50';
      } else if (height < 180 && weight < 90) {
        baseSize = 'L';
        euSize = '52-54';
      } else if (height < 190 && weight < 100) {
        baseSize = 'XL';
        euSize = '56-58';
      } else {
        baseSize = 'XXL';
        euSize = '60-62';
      }
    } else {
      if (height < 158 && weight < 50) {
        baseSize = 'XS';
        euSize = '32-34';
      } else if (height < 163 && weight < 55) {
        baseSize = 'S';
        euSize = '36';
      } else if (height < 168 && weight < 65) {
        baseSize = 'M';
        euSize = '38-40';
      } else if (height < 173 && weight < 75) {
        baseSize = 'L';
        euSize = '42-44';
      } else if (height < 180 && weight < 85) {
        baseSize = 'XL';
        euSize = '46-48';
      } else {
        baseSize = 'XXL';
        euSize = '50-52';
      }
    }

    if (sizeData.waist === 'plana' && sizeData.hips === 'delgada') {
      const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      const index = sizes.indexOf(baseSize);
      if (index > 0) baseSize = sizes[index - 1];
    }

    if (sizeData.waist === 'curvada' || sizeData.hips === 'curvada') {
      const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      const index = sizes.indexOf(baseSize);
      if (index < sizes.length - 1) baseSize = sizes[index + 1];
    }

    if (fitType === 'holgado') {
      const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      const index = sizes.indexOf(baseSize);
      if (index < sizes.length - 1) baseSize = sizes[index + 1];
    }

    return { intSize: baseSize, euSize };
  }, [sizeData, fitType]);

  const speakResults = useCallback(async (intSize: string, euSize: string) => {
    if (isSpeakingResults) {
      await Speech.stop();
      setIsSpeakingResults(false);
      return;
    }

    const resultText = `Resultado del análisis de medidas. 
      Estimación: altura ${sizeData.height} centímetros, peso ${sizeData.weight} kilogramos, edad aproximada ${sizeData.age} años. 
      Tu talla internacional recomendada es ${intSize}. 
      Tu talla europea estimada es ${euSize}. 
      Tipo de ajuste: ${fitType}. 
      Recuerda que estas son estimaciones basadas en tus medidas corporales.`;

    setIsSpeakingResults(true);
    try {
      await Speech.speak(resultText, {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.85,
        onDone: () => setIsSpeakingResults(false),
        onStopped: () => setIsSpeakingResults(false),
        onError: () => setIsSpeakingResults(false),
      });
    } catch (error) {
      console.error('Error speaking results:', error);
      setIsSpeakingResults(false);
    }
  }, [isSpeakingResults, sizeData, fitType]);

  const goToNextStep = useCallback(() => {
    const stepIndex = STEPS.indexOf(currentStep);
    if (stepIndex < STEPS.length - 1) {
      const nextStep = STEPS[stepIndex + 1];
      setCurrentStep(nextStep);
      
      if (nextStep === 'resultado') {
        const { intSize, euSize } = calculateSize();
        setRecommendedSize(intSize);
        setEstimatedEUSize(euSize);
        setTimeout(() => speakResults(intSize, euSize), 500);
      }
    }
  }, [currentStep, calculateSize, speakResults]);

  const goToPreviousStep = useCallback(() => {
    const stepIndex = STEPS.indexOf(currentStep);
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1]);
    }
  }, [currentStep]);

  // Función auxiliar para convertir imagen a base64
  const convertImageToBase64 = useCallback(async (uri: string): Promise<string> => {
    if (Platform.OS !== 'web') {
      // En plataformas nativas, usar FileSystem para leer como base64
      try {
        console.log('SizeDetector: Converting native image to base64:', uri.substring(0, 100));
        
        if (uri.startsWith('data:')) {
          const base64Part = uri.split(',')[1];
          return base64Part || uri;
        }
        
        // Use FileSystemLegacy for proper blob/content URI handling
        if (uri.startsWith('blob:') || uri.startsWith('content:')) {
          try {
            const base64 = await FileSystemLegacy.readAsStringAsync(uri, { encoding: 'base64' });
            console.log('SizeDetector: Successfully read blob/content URI, length:', base64.length);
            return base64;
          } catch (readError) {
            console.error('SizeDetector: Error reading blob/content URI directly:', readError);
            // Try copying to cache first
            const cacheDir = FileSystemLegacy.cacheDirectory || '';
            const tempFile = cacheDir + `temp_size_photo_${Date.now()}.jpg`;
            await FileSystemLegacy.copyAsync({ from: uri, to: tempFile });
            const base64 = await FileSystemLegacy.readAsStringAsync(tempFile, { encoding: 'base64' });
            console.log('SizeDetector: Successfully read after copy, length:', base64.length);
            return base64;
          }
        }
        
        if (uri.startsWith('file://')) {
          const base64 = await FileSystemLegacy.readAsStringAsync(uri, { encoding: 'base64' });
          console.log('SizeDetector: Successfully read file URI, length:', base64.length);
          return base64;
        }
        
        console.error('SizeDetector: Unsupported URI format:', uri.substring(0, 100));
        throw new Error('Formato de imagen no soportado');
      } catch (error) {
        console.error('SizeDetector: Error reading file in native:', error);
        throw new Error('No se pudo leer la imagen. Por favor, intenta capturar la foto nuevamente.');
      }
    }

    // En web, procesar diferentes tipos de URIs
    if (uri.startsWith('data:')) {
      // Extraer solo la parte base64 (sin el prefijo data:image/...)
      const base64Part = uri.split(',')[1];
      if (base64Part) {
        return base64Part;
      }
      return uri;
    }

    // Para blob URLs en web (más común)
    if (uri.startsWith('blob:')) {
      try {
        console.log('Converting blob URL to base64:', uri.substring(0, 50));
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch blob: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            // Extraer solo la parte base64 (sin data:image/...)
            const base64Part = base64String.split(',')[1];
            if (base64Part) {
              console.log('Blob converted to base64, length:', base64Part.length);
              resolve(base64Part);
            } else {
              reject(new Error('Failed to extract base64 from blob'));
            }
          };
          reader.onerror = (error) => {
            console.error('FileReader error:', error);
            reject(error);
          };
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error converting blob URL to base64:', error);
        throw new Error('No se pudo procesar la imagen. Por favor, intenta capturar la foto nuevamente.');
      }
    }

    // Para URLs HTTP/HTTPS en web
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      try {
        console.log('Converting HTTP URL to base64:', uri.substring(0, 50));
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Part = base64String.split(',')[1];
            if (base64Part) {
              resolve(base64Part);
            } else {
              reject(new Error('Failed to extract base64 from HTTP URL'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error converting HTTP URL to base64:', error);
        throw new Error('No se pudo cargar la imagen desde la URL. Verifica tu conexión a internet.');
      }
    }

    // Para file:// URLs (menos común en web, pero por si acaso)
    if (uri.startsWith('file://')) {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Part = base64String.split(',')[1];
            if (base64Part) {
              resolve(base64Part);
            } else {
              reject(new Error('Failed to extract base64 from file URL'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error converting file:// URL to base64:', error);
        throw new Error('No se pudo procesar la imagen. Por favor, intenta capturar la foto nuevamente.');
      }
    }

    // Si no coincide con ningún patrón conocido, lanzar error
    console.error('Unknown image URI format:', uri.substring(0, 100));
    throw new Error('Formato de imagen no soportado. Por favor, captura la foto nuevamente.');
  }, []);

  const analyzeWithAI = useCallback(async () => {
    if (!scanData?.photos || scanData.photos.length < 1) {
      Alert.alert('Error', 'Se necesita al menos 1 foto para el análisis automático.');
      return;
    }

    setIsAnalyzing(true);
    console.log('Starting AI analysis with', scanData.photos.length, 'photos');
    console.log('Platform:', Platform.OS);
    console.log('Photo URIs:', scanData.photos.map(uri => uri.substring(0, 100)));
    
    const timeoutId = setTimeout(() => {
      console.warn('AI analysis taking longer than expected');
    }, 10000);
    
    try {
      
      const schema: z.ZodType<any> = z.object({
        height: z.number().min(140).max(210).describe("Altura estimada en centímetros (140-210 cm). Analiza cuidadosamente las proporciones del cuerpo."),
        weight: z.number().min(35).max(150).describe("Peso estimado en kilogramos (35-150 kg). Considera la complexión corporal visible."),
        age: z.number().min(16).max(85).describe("Edad estimada en años (16-85). Observa características faciales y corporales."),
        waist: z.enum(['plana', 'media', 'curvada']).describe("Forma de cintura: 'plana' (cintura muy definida, abdomen plano), 'media' (cintura normal), 'curvada' (cintura menos definida, abdomen más pronunciado)"),
        hips: z.enum(['delgada', 'media', 'curvada']).describe("Forma de cadera: 'delgada' (caderas estrechas), 'media' (caderas proporcionadas), 'curvada' (caderas anchas)"),
        confidence: z.number().min(0).max(100).describe("Nivel de confianza en el análisis (0-100%)"),
      });

      // Procesar imágenes: convertir a base64 si es necesario (especialmente en web)
      console.log('Processing images for AI analysis...');
      const images = await Promise.all(
        scanData.photos.map(async (photoUri, index) => {
          try {
            console.log(`Processing photo ${index + 1} URI:`, photoUri.substring(0, 100));
            const processedImage = await convertImageToBase64(photoUri);
            console.log(`Photo ${index + 1} processed successfully, length:`, processedImage.length);
            return processedImage;
          } catch (error) {
            console.error(`Error processing photo ${index + 1}:`, error);
            throw error;
          }
        })
      );

      const detailedPrompt = `Analiza estas fotografías de una persona y estima sus medidas corporales con la mayor precisión posible.

INSTRUCCIONES DETALLADAS:

1. ALTURA (height):
   - Observa las proporciones generales del cuerpo
   - Considera la longitud de las piernas en relación al torso
   - Ten en cuenta la relación cabeza-cuerpo (típicamente 1:7 o 1:8 en adultos)
   - Rango realista: 140-210 cm

2. PESO (weight):
   - Analiza la complexión corporal visible
   - Considera la distribución de masa en brazos, torso y piernas
   - Observa la definición muscular o presencia de tejido adiposo
   - Rango realista: 35-150 kg

3. EDAD (age):
   - Examina rasgos faciales si están visibles
   - Considera la textura de la piel
   - Observa la postura y tono muscular
   - Rango realista: 16-85 años

4. CINTURA (waist):
   - 'plana': Abdomen muy plano, cintura muy definida, línea recta del torso
   - 'media': Cintura visible pero con curva natural, abdomen normal
   - 'curvada': Cintura menos definida, abdomen más prominente, curva más pronunciada

5. CADERA (hips):
   - 'delgada': Caderas estrechas, poca diferencia con la cintura
   - 'media': Caderas proporcionadas, forma equilibrada
   - 'curvada': Caderas anchas, diferencia notable con la cintura

6. CONFIANZA (confidence):
   - Evalúa qué tan clara y completa es la vista de la persona
   - Considera la calidad de la imagen y la iluminación
   - 100% = imagen perfecta, vista completa, buena iluminación
   - 50% = imagen parcial o con obstáculos
   - 0% = imposible de analizar

Sé realista y preciso. Basa tus estimaciones en las proporciones visibles y características corporales observables.`;

      const content: ({ type: 'text'; text: string } | { type: 'image'; image: string })[] = [
        { type: 'text', text: detailedPrompt },
        { type: 'image', image: images[0] },
      ];

      if (images[1]) {
        content.push({ type: 'image', image: images[1] });
      }

      console.log('SizeDetector: Sending request to AI with detailed prompt...');
      
      let result;
      try {
        result = await generateObject({
          messages: [
            {
              role: 'user',
              content,
            },
          ],
          schema,
        });
      } catch (fetchError: any) {
        console.error('SizeDetector: generateObject fetch error:', fetchError?.message || fetchError);
        throw new Error('No se pudo conectar con el servicio de IA. Verifica tu conexión a internet.');
      }

      console.log('SizeDetector: AI Analysis Result:', JSON.stringify(result, null, 2));

      if (!result || typeof result !== 'object') {
        console.error('Invalid result structure:', result);
        throw new Error('Respuesta inválida del modelo de IA');
      }

      const typedResult = result as {
        height: number;
        weight: number;
        age: number;
        waist: 'plana' | 'media' | 'curvada';
        hips: 'delgada' | 'media' | 'curvada';
        confidence: number;
      };

      if (!typedResult.height || !typedResult.weight || !typedResult.age) {
        throw new Error('Datos incompletos en la respuesta');
      }

      if (typedResult.height < 140 || typedResult.height > 210) {
        throw new Error('Altura fuera del rango válido');
      }

      if (typedResult.weight < 35 || typedResult.weight > 150) {
        throw new Error('Peso fuera del rango válido');
      }

      console.log('Confidence level:', typedResult.confidence, '%');

      const newHeight = String(Math.round(typedResult.height));
      const newWeight = String(Math.round(typedResult.weight));
      const newAge = String(Math.round(typedResult.age));
      setSizeData(prev => ({
        ...prev,
        height: newHeight,
        weight: newWeight,
        age: newAge,
        waist: typedResult.waist,
        hips: typedResult.hips,
      }));
      setHeightUnit('cm');
      setWeightUnit('kg');
      setFitType('ajustado');

      const h = typedResult.height;
      const w = typedResult.weight;
      let baseSize = 'M';
      if (h < 163 && w < 55) baseSize = 'S';
      else if (h < 168 && w < 65) baseSize = 'M';
      else if (h < 173 && w < 75) baseSize = 'L';
      else if (h < 180 && w < 85) baseSize = 'XL';
      else baseSize = 'XXL';
      if (typedResult.waist === 'plana' && typedResult.hips === 'delgada' && baseSize !== 'XS') {
        const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        baseSize = sizes[sizes.indexOf(baseSize) - 1];
      }
      if (typedResult.waist === 'curvada' || typedResult.hips === 'curvada') {
        const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        const idx = sizes.indexOf(baseSize);
        if (idx < sizes.length - 1) baseSize = sizes[idx + 1];
      }
      setRecommendedSize(baseSize);
      setCurrentStep('resultado_ia');
      
    } catch (error: any) {
      console.log('AI Analysis unavailable:', error?.message || 'Unknown error');
      
      let userMessage = 'El análisis automático no está disponible en este momento.';
      let technicalReason = '';
      
      if (error instanceof Error) {
        // Errores relacionados con procesamiento de imágenes
        if (error.message.includes('No se pudo procesar la imagen') || 
            error.message.includes('Formato de imagen no soportado') ||
            error.message.includes('Failed to extract base64')) {
          userMessage = 'Error al procesar la imagen.';
          technicalReason = 'No se pudo convertir la imagen al formato necesario. Por favor, intenta capturar la foto nuevamente.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
          userMessage = 'No se pudo conectar con el servicio de IA.';
          technicalReason = 'Error de conexión: Verifica tu conexión a internet.';
        } else if (error.message.includes('Network') || error.message.includes('network')) {
          userMessage = 'Error de red al conectar con el servicio de IA.';
          technicalReason = 'Verifica tu conexión a internet y vuelve a intentarlo.';
        } else if (error.message.includes('CORS') || error.message.includes('blocked')) {
          userMessage = 'Error de permisos al conectar con el servicio de IA.';
          technicalReason = 'Intenta recargar la página.';
        } else if (error.message.includes('timeout')) {
          userMessage = 'El servicio de IA tardó demasiado en responder.';
          technicalReason = 'Intenta nuevamente en unos momentos.';
        } else if (error.message.includes('blob') || error.message.includes('Blob')) {
          userMessage = 'Error al procesar la imagen capturada.';
          technicalReason = 'Por favor, intenta capturar la foto nuevamente desde el escáner.';
        } else {
          technicalReason = `Error técnico: ${error.message}`;
        }
      }
      
      const fullMessage = technicalReason 
        ? `${userMessage}\n\n${technicalReason}\n\nNo te preocupes, puedes introducir tus medidas manualmente. Es rápido y fácil.`
        : `${userMessage}\n\nNo te preocupes, puedes introducir tus medidas manualmente. Es rápido y fácil.`;
      
      Alert.alert(
        'Entrada Manual', 
        fullMessage,
        [
          {
            text: 'Ir al Catálogo',
            style: 'default',
            onPress: () => {
              console.log('User skipping to catalog');
              router.push('/(tabs)/catalog');
            },
          },
          {
            text: 'Entrada Manual',
            onPress: () => {
              console.log('User will proceed with manual input');
              setCurrentStep('medidas');
            },
          },
        ]
      );
    } finally {
      clearTimeout(timeoutId);
      setIsAnalyzing(false);
    }
  }, [scanData?.photos, convertImageToBase64, router, saveSizeDetectorData]);

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 'medidas':
        return sizeData.height !== '' && sizeData.weight !== '';
      case 'edad':
        return sizeData.age !== '' && parseInt(sizeData.age) > 0;
      case 'cintura':
        return sizeData.waist !== null;
      case 'cadera':
        return sizeData.hips !== null;
      case 'resultado_ia':
      case 'resultado':
        return true;
      default:
        return false;
    }
  }, [currentStep, sizeData]);

  const goToCatalogFromAIResult = useCallback(async () => {
    await saveSizeDetectorData({
      height: sizeData.height,
      weight: sizeData.weight,
      age: sizeData.age,
      waist: sizeData.waist,
      hips: sizeData.hips,
      heightUnit,
      weightUnit,
      fitType,
      recommendedSize,
    });
    if (Platform.OS !== 'web') {
      Speech.speak('Medidas detectadas. Abriendo catálogo.', { language: 'es-ES', rate: 0.9 });
    }
    router.push('/(tabs)/catalog');
  }, [sizeData, heightUnit, weightUnit, fitType, recommendedSize, saveSizeDetectorData, router]);

  const finishAndGoToCatalog = useCallback(async () => {
    await saveSizeDetectorData({
      height: sizeData.height,
      weight: sizeData.weight,
      age: sizeData.age,
      waist: sizeData.waist,
      hips: sizeData.hips,
      heightUnit,
      weightUnit,
      fitType,
      recommendedSize,
    });
    // Go to catalog instead of mirror so user can select clothes
    router.push('/(tabs)/catalog');
  }, [router, saveSizeDetectorData, sizeData, heightUnit, weightUnit, fitType, recommendedSize]);

  const resetData = useCallback(() => {
    Alert.alert(
      'Reiniciar Datos',
      '¿Estás seguro de que quieres borrar todos los datos introducidos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: () => {
            setSizeData({
              height: '',
              weight: '',
              age: '',
              gender: 'female',
              waist: null,
              hips: null,
            });
            setHeightUnit('cm');
            setWeightUnit('kg');
            setFitType('ajustado');
            setRecommendedSize('');
            setCurrentStep('medidas');
          },
        },
      ]
    );
  }, []);

  useEffect(() => {
    if (scanData?.scanId && sizeDetectorData?.scanId !== scanData.scanId) {
      console.log('New scan detected, resetting size detector data');
      setSizeData({
        height: '',
        weight: '',
        age: '',
        gender: 'female',
        waist: null,
        hips: null,
      });
      setHeightUnit('cm');
      setWeightUnit('kg');
      setFitType('ajustado');
      setRecommendedSize('');
      setCurrentStep('medidas');
    } else if (sizeDetectorData && sizeDetectorData.scanId === scanData?.scanId) {
      console.log('Loading existing size detector data for current scan');
      setSizeData(prev => ({
        ...prev,
        height: sizeDetectorData.height,
        weight: sizeDetectorData.weight,
        age: sizeDetectorData.age,
        waist: sizeDetectorData.waist,
        hips: sizeDetectorData.hips,
      }));
      setHeightUnit(sizeDetectorData.heightUnit);
      setWeightUnit(sizeDetectorData.weightUnit);
      setFitType(sizeDetectorData.fitType);
      setRecommendedSize(sizeDetectorData.recommendedSize);
      if (sizeDetectorData.recommendedSize) {
        setCurrentStep('resultado');
      }
    }
  }, [scanData?.scanId, sizeDetectorData]);

  // Auto-trigger AI detection when arriving from scanner
  useEffect(() => {
    if (autoTriggerDetection && scanData?.photos && scanData.photos.length >= 2 && !isAnalyzing && currentStep === 'medidas') {
      console.log('SizeDetector: Auto-triggering AI detection');
      setAutoTriggerDetection(false);
      // Small delay to allow UI to render
      const timer = setTimeout(() => {
        analyzeWithAI();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoTriggerDetection, scanData?.photos, isAnalyzing, currentStep, setAutoTriggerDetection, analyzeWithAI]);

  // Voz explicando medidas y talla internacional al mostrar resultado IA (una sola vez)
  const spokeAIResultRef = useRef(false);
  useEffect(() => {
    if (currentStep !== 'resultado_ia' || !sizeData.height || !recommendedSize) return;
    if (spokeAIResultRef.current) return;
    spokeAIResultRef.current = true;
    const waistLabel = sizeData.waist === 'plana' ? 'plana' : sizeData.waist === 'media' ? 'media' : 'curvada';
    const hipsLabel = sizeData.hips === 'delgada' ? 'delgada' : sizeData.hips === 'media' ? 'media' : 'curvada';
    const text = `Resultado del análisis. Altura ${sizeData.height} centímetros, peso ${sizeData.weight} kilos, edad ${sizeData.age} años. Cintura ${waistLabel}, cadera ${hipsLabel}. Tu talla internacional recomendada es ${recommendedSize}. Si las medidas son correctas, di ir al catálogo. Si no, pulsa introducir manualmente.`;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    } else if (Platform.OS !== 'web') {
      Speech.speak(text, { language: 'es-ES', rate: 0.85 });
    }
    return () => { spokeAIResultRef.current = false; };
  }, [currentStep, sizeData.height, sizeData.weight, sizeData.age, sizeData.waist, sizeData.hips, recommendedSize]);

  useFocusEffect(
    useCallback(() => {
      const nextAction = () => {
        if (canProceed()) {
          if (currentStep === 'resultado') {
            finishAndGoToCatalog();
          } else if (currentStep === 'resultado_ia') {
            goToCatalogFromAIResult();
          } else {
            goToNextStep();
          }
        }
      };

      const backAction = () => {
        if (currentStep === 'medidas') {
          router.back();
        } else if (currentStep === 'resultado_ia') {
          setCurrentStep('medidas');
        } else {
          goToPreviousStep();
        }
      };

      registerCommand('size-next', {
        patterns: ['continuar', 'siguiente', 'avanzar', 'adelante'],
        action: nextAction,
        description: 'Continuar',
      });

      registerCommand('size-back', {
        patterns: ['atrás', 'volver', 'anterior', 'regresar'],
        action: backAction,
        description: 'Atrás',
      });

      registerCommand('detect-measures', {
        patterns: ['detectar medidas', 'detectar medidas con ia', 'detectar', 'analizar medidas'],
        action: () => {
          if (currentStep === 'medidas' && !isAnalyzing && scanData?.photos && scanData.photos.length >= 2) {
            analyzeWithAI();
          }
        },
        description: 'Analizar con IA',
      });

      registerCommand('size-go-catalog', {
        patterns: ['ir al catálogo', 'catálogo', 'ver catálogo', 'saltar al catálogo', 'ir catálogo'],
        action: () => {
          console.log('Voice command: Going to catalog');
          router.push('/(tabs)/catalog');
        },
        description: 'Ir al catálogo',
      });

      registerCommand('size-manual-entry', {
        patterns: ['entrada manual', 'manual', 'introducir manual', 'medidas manuales', 'introducir medidas'],
        action: () => {
          console.log('Voice command: Manual entry mode');
          setCurrentStep('medidas');
        },
        description: 'Entrada manual',
      });

      registerCommand('size-try-now', {
        patterns: ['probar ahora', 'probar', 'finalizar', 'elegir ropa'],
        action: () => {
          if (currentStep === 'resultado') {
            finishAndGoToCatalog();
          } else if (currentStep === 'resultado_ia') {
            goToCatalogFromAIResult();
          } else if (canProceed()) {
            goToNextStep();
          }
        },
        description: 'Ir al catálogo',
      });

      return () => {
        unregisterCommand('size-next');
        unregisterCommand('size-back');
        unregisterCommand('detect-measures');
        unregisterCommand('size-go-catalog');
        unregisterCommand('size-manual-entry');
        unregisterCommand('size-try-now');
      };
    }, [registerCommand, unregisterCommand, currentStep, canProceed, goToNextStep, goToPreviousStep, finishAndGoToCatalog, goToCatalogFromAIResult, router, isAnalyzing, scanData?.photos, analyzeWithAI])
  );

  const renderMedidasStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.stepTitle}>Tus Medidas</Text>
        <TouchableOpacity onPress={resetData} style={styles.resetButton}>
          <RotateCcw size={20} color={Colors.light.primary} />
          <Text style={styles.resetText}>Reiniciar</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.stepDescription}>
        Introduce tus medidas manualmente o usa la IA para detectarlas automáticamente
      </Text>

      {scanData?.photos && scanData.photos.length > 0 && (
        <View style={styles.photoPreview}>
          <Image
            source={{ uri: scanData.photos[0] }}
            style={styles.photoThumbnail}
          />
          <TouchableOpacity 
            style={styles.aiButton} 
            onPress={analyzeWithAI}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Sparkles size={20} color="#FFFFFF" />
                <Text style={styles.aiButtonText}>Detectar con IA</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {(!scanData?.photos || scanData.photos.length === 0) && (
        <View style={styles.manualInputNotice}>
          <Text style={styles.manualInputNoticeTitle}>📝 Entrada Manual</Text>
          <Text style={styles.manualInputNoticeText}>
            No hay fotos disponibles para análisis automático. Introduce tus medidas manualmente a continuación.
          </Text>
        </View>
      )}

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Altura</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="168"
            keyboardType="numeric"
            value={sizeData.height}
            onChangeText={(text) =>
              setSizeData({ ...sizeData, height: text })
            }
          />
          <View style={styles.unitToggle}>
            <TouchableOpacity
              style={[
                styles.unitButton,
                heightUnit === 'cm' && styles.unitButtonActive,
              ]}
              onPress={() => setHeightUnit('cm')}
            >
              <Text
                style={[
                  styles.unitText,
                  heightUnit === 'cm' && styles.unitTextActive,
                ]}
              >
                CM
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.unitButton,
                heightUnit === 'in' && styles.unitButtonActive,
              ]}
              onPress={() => setHeightUnit('in')}
            >
              <Text
                style={[
                  styles.unitText,
                  heightUnit === 'in' && styles.unitTextActive,
                ]}
              >
                IN
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Peso</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="61"
            keyboardType="numeric"
            value={sizeData.weight}
            onChangeText={(text) =>
              setSizeData({ ...sizeData, weight: text })
            }
          />
          <View style={styles.unitToggle}>
            <TouchableOpacity
              style={[
                styles.unitButton,
                weightUnit === 'kg' && styles.unitButtonActive,
              ]}
              onPress={() => setWeightUnit('kg')}
            >
              <Text
                style={[
                  styles.unitText,
                  weightUnit === 'kg' && styles.unitTextActive,
                ]}
              >
                KG
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.unitButton,
                weightUnit === 'lb' && styles.unitButtonActive,
              ]}
              onPress={() => setWeightUnit('lb')}
            >
              <Text
                style={[
                  styles.unitText,
                  weightUnit === 'lb' && styles.unitTextActive,
                ]}
              >
                LB
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.fitToggleSection}>
        <Text style={styles.inputLabel}>¿Cómo quieres que ajuste?</Text>
        <View style={styles.fitToggle}>
          <TouchableOpacity
            style={[
              styles.fitButton,
              fitType === 'ajustado' && styles.fitButtonActive,
            ]}
            onPress={() => setFitType('ajustado')}
          >
            <Text
              style={[
                styles.fitText,
                fitType === 'ajustado' && styles.fitTextActive,
              ]}
            >
              AJUSTADO
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.fitButton,
              fitType === 'holgado' && styles.fitButtonActive,
            ]}
            onPress={() => setFitType('holgado')}
          >
            <Text
              style={[
                styles.fitText,
                fitType === 'holgado' && styles.fitTextActive,
              ]}
            >
              HOLGADO
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEdadStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Edad</Text>
      <Text style={styles.stepDescription}>
        La distribución de peso cambia con la edad
      </Text>

      <View style={styles.ageInputContainer}>
        <Text style={styles.ageLabel}>Edad</Text>
        <View style={styles.ageSliderContainer}>
          <TextInput
            style={styles.ageInput}
            placeholder="25"
            keyboardType="numeric"
            value={sizeData.age}
            onChangeText={(text) => setSizeData({ ...sizeData, age: text })}
          />
          <Text style={styles.ageUnit}>años</Text>
        </View>
      </View>
    </View>
  );

  const renderCinturaStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Cintura</Text>
      <Text style={styles.stepDescription}>
        Selecciona la imagen que más se ajuste a tu cintura
      </Text>

      <View style={styles.bodyTypesContainer}>
        <TouchableOpacity
          style={[
            styles.bodyTypeCard,
            sizeData.waist === 'plana' && styles.bodyTypeCardActive,
          ]}
          onPress={() => setSizeData({ ...sizeData, waist: 'plana' })}
        >
          <Image
            source={{ uri: 'https://r2-pub.rork.com/generated-images/91bac11a-ba6b-48c8-82f8-7da73252a851.png' }}
            style={styles.bodyTypeImage}
            resizeMode="contain"
          />
          <Text style={styles.bodyTypeLabel}>plana</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.bodyTypeCard,
            sizeData.waist === 'media' && styles.bodyTypeCardActive,
          ]}
          onPress={() => setSizeData({ ...sizeData, waist: 'media' })}
        >
          <Image
            source={{ uri: 'https://r2-pub.rork.com/generated-images/8d8bc611-2900-460e-80d8-0ba3c836c6d9.png' }}
            style={styles.bodyTypeImage}
            resizeMode="contain"
          />
          <Text style={styles.bodyTypeLabel}>media</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.bodyTypeCard,
            sizeData.waist === 'curvada' && styles.bodyTypeCardActive,
          ]}
          onPress={() => setSizeData({ ...sizeData, waist: 'curvada' })}
        >
          <Image
            source={{ uri: 'https://r2-pub.rork.com/generated-images/2ccd6e5d-f839-45a3-863f-2b5cf9679514.png' }}
            style={styles.bodyTypeImage}
            resizeMode="contain"
          />
          <Text style={styles.bodyTypeLabel}>curvada</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCaderaStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Cadera</Text>
      <Text style={styles.stepDescription}>
        Selecciona la imagen que más se parezca a tu cadera
      </Text>

      <View style={styles.bodyTypesContainer}>
        <TouchableOpacity
          style={[
            styles.bodyTypeCard,
            sizeData.hips === 'delgada' && styles.bodyTypeCardActive,
          ]}
          onPress={() => setSizeData({ ...sizeData, hips: 'delgada' })}
        >
          <Image
            source={{ uri: 'https://r2-pub.rork.com/generated-images/5a1b85ca-92e5-4e3f-9740-1f168e835d2c.png' }}
            style={styles.bodyTypeImage}
            resizeMode="contain"
          />
          <Text style={styles.bodyTypeLabel}>delgada</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.bodyTypeCard,
            sizeData.hips === 'media' && styles.bodyTypeCardActive,
          ]}
          onPress={() => setSizeData({ ...sizeData, hips: 'media' })}
        >
          <Image
            source={{ uri: 'https://r2-pub.rork.com/generated-images/0458cc60-4dad-4a71-8590-7838cf9afe87.png' }}
            style={styles.bodyTypeImage}
            resizeMode="contain"
          />
          <Text style={styles.bodyTypeLabel}>media</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.bodyTypeCard,
            sizeData.hips === 'curvada' && styles.bodyTypeCardActive,
          ]}
          onPress={() => setSizeData({ ...sizeData, hips: 'curvada' })}
        >
          <Image
            source={{ uri: 'https://r2-pub.rork.com/generated-images/faea7810-d092-4736-9e4d-fe53c3cb249f.png' }}
            style={styles.bodyTypeImage}
            resizeMode="contain"
          />
          <Text style={styles.bodyTypeLabel}>curvada</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderResultadoIAStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Resultado del análisis con IA</Text>
      <Text style={styles.stepDescription}>
        Revisa si las medidas se corresponden con las tuyas. Si son correctas, ve al catálogo. Si no, puedes introducirlas manualmente.
      </Text>

      {scanData?.photos && scanData.photos.length > 0 && (
        <View style={styles.resultPhotoPreview}>
          <Image
            source={{ uri: scanData.photos[0] }}
            style={styles.resultPhotoThumbnail}
          />
        </View>
      )}

      <View style={styles.sizeResultContainer}>
        <Text style={styles.sizeResultText}>{recommendedSize}</Text>
        <Text style={styles.stepDescription}>Talla recomendada por la IA</Text>
      </View>

      <View style={styles.resultSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Altura:</Text>
          <Text style={styles.summaryValue}>{sizeData.height} {heightUnit}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Peso:</Text>
          <Text style={styles.summaryValue}>{sizeData.weight} {weightUnit}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Edad:</Text>
          <Text style={styles.summaryValue}>{sizeData.age} años</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Cintura:</Text>
          <Text style={styles.summaryValue}>{sizeData.waist}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Cadera:</Text>
          <Text style={styles.summaryValue}>{sizeData.hips}</Text>
        </View>
      </View>

      <View style={styles.aiResultActions}>
        <TouchableOpacity
          style={[styles.continueButton, styles.continueButtonFull]}
          onPress={goToCatalogFromAIResult}
        >
          <Text style={styles.continueButtonText}>IR AL CATÁLOGO</Text>
          <Check size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.manualEntryButton}
          onPress={() => setCurrentStep('medidas')}
        >
          <Text style={styles.manualEntryButtonText}>Introducir manualmente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderResultadoStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Talla recomendada</Text>

      {scanData?.photos && scanData.photos.length > 0 && (
        <View style={styles.resultPhotoPreview}>
          <Image
            source={{ uri: scanData.photos[0] }}
            style={styles.resultPhotoThumbnail}
          />
        </View>
      )}

      <View style={styles.sizeResultContainer}>
        <Text style={styles.sizeResultText}>{recommendedSize}</Text>
        <View style={styles.sizeTypeToggle}>
          <TouchableOpacity style={styles.sizeTypeButton}>
            <Text style={styles.sizeTypeButtonText}>INT</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.resultDescription}>
        Basamos nuestra recomendación en tus medidas y preferencias, en
        comparación con miles de perfiles similares.
      </Text>

      <View style={styles.resultSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Altura:</Text>
          <Text style={styles.summaryValue}>
            {sizeData.height} {heightUnit}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Peso:</Text>
          <Text style={styles.summaryValue}>
            {sizeData.weight} {weightUnit}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Edad:</Text>
          <Text style={styles.summaryValue}>{sizeData.age} años</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Cintura:</Text>
          <Text style={styles.summaryValue}>{sizeData.waist}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Cadera:</Text>
          <Text style={styles.summaryValue}>{sizeData.hips}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ajuste:</Text>
          <Text style={styles.summaryValue}>{fitType}</Text>
        </View>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 'medidas':
        return renderMedidasStep();
      case 'edad':
        return renderEdadStep();
      case 'cintura':
        return renderCinturaStep();
      case 'cadera':
        return renderCaderaStep();
      case 'resultado_ia':
        return renderResultadoIAStep();
      case 'resultado':
        return renderResultadoStep();
      default:
        return null;
    }
  };

  const progressPercent =
    ((STEPS.indexOf(currentStep) + 1) / STEPS.length) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep === 'medidas' && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.push('/(tabs)/catalog')}
          >
            <Text style={styles.skipButtonText}>Ir al Catálogo</Text>
          </TouchableOpacity>
        )}
        {currentStep !== 'medidas' && currentStep !== 'resultado_ia' && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={goToPreviousStep}
          >
            <ChevronLeft size={24} color={Colors.light.text} />
            <Text style={styles.backButtonText}>Atrás</Text>
          </TouchableOpacity>
        )}
        {currentStep === 'resultado_ia' && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep('medidas')}
          >
            <ChevronLeft size={24} color={Colors.light.text} />
            <Text style={styles.backButtonText}>Atrás</Text>
          </TouchableOpacity>
        )}

        {currentStep !== 'resultado_ia' && (
          <TouchableOpacity
            style={[
              styles.continueButton,
              !canProceed() && styles.continueButtonDisabled,
              currentStep === 'medidas' && styles.continueButtonFull,
            ]}
            onPress={
              currentStep === 'resultado' ? finishAndGoToCatalog : goToNextStep
            }
            disabled={!canProceed()}
          >
            <Text style={styles.continueButtonText}>
              {currentStep === 'resultado' ? 'IR AL CATÁLOGO' : 'CONTINUAR'}
            </Text>
            {currentStep !== 'resultado' && (
              <ChevronRight size={20} color="#FFFFFF" />
            )}
            {currentStep === 'resultado' && <Check size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#E0E0E0',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  stepContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
  },
  resetText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '600' as const,
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 32,
    lineHeight: 24,
  },
  photoPreview: {
    alignItems: 'center',
    marginBottom: 32,
  },
  photoThumbnail: {
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    marginBottom: 16,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold' as const,
    fontSize: 14,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 18,
    color: Colors.light.text,
  },
  unitToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  unitButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  unitTextActive: {
    color: '#FFFFFF',
  },
  fitToggleSection: {
    marginTop: 24,
  },
  fitToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  fitButton: {
    flex: 1,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  fitButtonActive: {
    borderColor: Colors.light.primary,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  fitText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  fitTextActive: {
    color: Colors.light.primary,
  },
  ageInputContainer: {
    marginTop: 32,
  },
  ageLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  ageSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ageInput: {
    height: 56,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '600' as const,
    color: Colors.light.text,
    textAlign: 'center',
    width: 120,
  },
  ageUnit: {
    fontSize: 18,
    color: Colors.light.textSecondary,
  },
  bodyTypesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 32,
    gap: 16,
  },
  bodyTypeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  bodyTypeCardActive: {
    borderColor: Colors.light.primary,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  bodyTypeImage: {
    width: 100,
    height: 140,
    marginBottom: 12,
    backgroundColor: '#F5F5F5',
  },
  bodyTypeLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  resultPhotoPreview: {
    alignItems: 'center',
    marginVertical: 24,
  },
  resultPhotoThumbnail: {
    width: 140,
    height: 180,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  sizeResultContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  sizeResultText: {
    fontSize: 80,
    fontWeight: 'bold' as const,
    color: Colors.light.primary,
    marginBottom: 16,
  },
  sizeTypeToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sizeTypeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.light.primary,
  },
  sizeTypeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  resultDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  resultSummary: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
  },
  continueButtonFull: {
    flex: 1,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  aiResultActions: {
    marginTop: 24,
    gap: 12,
  },
  manualEntryButton: {
    paddingVertical: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: 12,
  },
  manualEntryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  manualInputNotice: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  manualInputNoticeTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.light.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  manualInputNoticeText: {
    fontSize: 14,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 22,
  },
});
