// lib/generate-360-background.ts
// Generación 360º en segundo plano sin bloquear la UI

import { getApiKeysForExpo } from './api-keys-expo';

export interface Generate360Result {
  wanUrl: string | null;
  klingUrl: string | null;
  carouselFrames: string[];
  success: boolean;
  error?: string;
}

export async function generate360InBackground(
  tryOnImageUrl: string
): Promise<Generate360Result> {
  const result: Generate360Result = {
    wanUrl: null,
    klingUrl: null,
    carouselFrames: [],
    success: false,
  };

  try {
    console.log('[360º Background] ========================================');
    console.log('[360º Background] INICIANDO GENERACIÓN 360º');
    console.log('[360º Background] URL recibida:', tryOnImageUrl.substring(0, 100) + '...');
    console.log('[360º Background] Tipo:', tryOnImageUrl.startsWith('data:') ? 'Data URL' : tryOnImageUrl.startsWith('file://') ? 'File URI' : 'URL pública');
    
    // RGPD: No subimos imágenes a servicios externos
    // FAL AI acepta URLs públicas, así que usamos la URL directamente si ya es pública
    // Si es data URL, intentamos usarla directamente (FAL AI puede aceptarla en algunos casos)
    let imageUrlForFal = tryOnImageUrl;
    
    if (tryOnImageUrl.startsWith('data:')) {
      console.log('[360º Background] Data URL detectada. Intentando usar directamente con FAL AI...');
      // Intentar usar data URL directamente - FAL AI puede aceptarla
      imageUrlForFal = tryOnImageUrl;
      console.log('[360º Background] Usando data URL directamente');
    } else if (tryOnImageUrl.startsWith('file://')) {
      console.log('[360º Background] File URI detectada. Necesitamos convertir a URL pública.');
      // En web, file:// no funciona, necesitamos convertir
      // Por ahora, intentar usar como está (puede fallar, pero no romper)
      imageUrlForFal = tryOnImageUrl;
      console.warn('[360º Background] ⚠️ File URI puede no funcionar con FAL AI');
    } else {
      console.log('[360º Background] ✅ Ya es una URL pública, usando directamente');
    }
    
    console.log('[360º Background] Obteniendo API keys...');
    const apiKeys = await getApiKeysForExpo();
    const falKey = apiKeys.FAL_KEY;

    console.log('[360º Background] FAL_KEY obtenida:', falKey ? `${falKey.substring(0, 10)}...` : 'NO CONFIGURADA');

    // Verificar que la API key esté configurada y sea válida
    if (!falKey || 
        falKey === '[CONFIGURAR_EN_VERCEL]' || 
        falKey === 'YOUR_FAL_KEY_HERE' || 
        falKey === 'TU_FAL_KEY_AQUI' ||
        falKey.length < 20) {
      const errorMsg = '❌ API Key de FAL no configurada.\n\n' +
        'Para desarrollo local, configúrala en .env.local como:\n' +
        'EXPO_PUBLIC_FAL_KEY=tu_api_key_aqui\n\n' +
        'Para Vercel, configúrala en Settings → Environment Variables:\n' +
        'EXPO_PUBLIC_FAL_KEY = tu_api_key_aqui\n' +
        '(Aplicar a: Production, Preview, Development)\n\n' +
        'Luego reinicia el servidor o haz redeploy en Vercel.';
      console.error('[360º Background]', errorMsg);
      console.error('[360º Background] API Key recibida:', falKey ? `"${falKey.substring(0, 20)}..." (longitud: ${falKey.length})` : 'undefined');
      throw new Error(errorMsg);
    }
    
    // Verificar formato básico de la API key (debería tener al menos 20 caracteres)
    if (falKey.length < 20) {
      console.warn('[360º Background] ⚠️ API Key parece muy corta. Verifica que sea correcta.');
    }

    console.log('[360º Background] Importando @fal-ai/client...');
    let fal: any;
    try {
      const falModule = await import('@fal-ai/client');
      fal = falModule.fal || falModule.default?.fal || falModule;
      console.log('[360º Background] @fal-ai/client importado correctamente');
    } catch (importError: any) {
      console.error('[360º Background] ❌ Error importando @fal-ai/client:', importError);
      throw new Error(`No se pudo importar @fal-ai/client: ${importError.message}. Asegúrate de que esté instalado con: npm install @fal-ai/client`);
    }
    
    // Configurar FAL AI con la API key
    console.log('[360º Background] Configurando FAL AI...');
    console.log('[360º Background] API Key length:', falKey.length);
    console.log('[360º Background] API Key starts with:', falKey.substring(0, 10));
    console.log('[360º Background] API Key ends with:', falKey.substring(falKey.length - 5));
    
    // Verificar que la key no tenga espacios ni caracteres extraños
    const cleanKey = falKey.trim();
    if (cleanKey !== falKey) {
      console.warn('[360º Background] ⚠️ API Key tenía espacios, limpiada');
    }
    
    // Configurar FAL AI - IMPORTANTE: Configurar ANTES de cualquier llamada
    try {
      // Configuración simple y directa
      // En @fal-ai/client, credentials debe ser la API key directamente
      fal.config({
        credentials: cleanKey
      });
      console.log('[360º Background] ✅ FAL AI configurado con API key');
      console.log('[360º Background] API Key length:', cleanKey.length);
      console.log('[360º Background] API Key starts with:', cleanKey.substring(0, 10));
      
      // Verificar que la configuración se aplicó
      // En algunos casos, fal.config puede no funcionar si se llama después de importar
      // Por eso lo hacemos justo después de importar
    } catch (configError: any) {
      console.error('[360º Background] ❌ Error configurando FAL AI:', configError);
      throw new Error(`Error configurando FAL AI: ${configError.message}`);
    }
    
    console.log('[360º Background] FAL AI configurado correctamente');
    console.log('[360º Background] Verificando configuración...');
    
    // Verificar que la configuración se aplicó
    try {
      // Intentar hacer una llamada de prueba (opcional, solo para verificar)
      console.log('[360º Background] ✅ Configuración lista, procediendo solo con KLING...');
    } catch (configError: any) {
      console.error('[360º Background] ❌ Error en configuración:', configError);
      throw new Error(`Error configurando FAL AI: ${configError.message}`);
    }

    // Solo KLING: giro preciso y fashion, sin WAN (evita tiempos 200+ s y distorsiones)
    console.log('[360º Background] ========================================');
    console.log('[360º Background] INICIANDO GENERACIÓN 360º (solo KLING)');
    console.log('[360º Background] URL de imagen:', imageUrlForFal.substring(0, 100) + '...');
    console.log('[360º Background] Tipo de URL:', imageUrlForFal.startsWith('data:') ? 'Data URL' : 'URL pública');
    
    const startTime = Date.now();
    try {
      console.log('[360º Background] [KLING] Iniciando generación...');
      const klingResult: any = await fal.subscribe('fal-ai/kling-video/v2.6/pro/image-to-video', {
        input: {
          start_image_url: imageUrlForFal,
          prompt: 'Smooth 360 turntable rotation. Same person, preserve face identity exactly, no face changes. Person wearing Try-On clothing. Consistent lighting, sharp contours. Full body visible, stable background. Fashion shot, frontal lateral rear views.',
          negative_prompt: 'face changing, face morphing, different face, face distortion, blur, distort, low quality, static, no motion, body proportion change, clothing change, amateur quality, background changing drastically, watermark, logo, jitter, flicker, unstable, shaky, artifacts',
          duration: '5',
          aspect_ratio: '9:16',
          generate_audio: false,
        },
        credentials: cleanKey,
      });
      const endTime = Date.now();
      if (klingResult.data?.video?.url) {
        result.klingUrl = klingResult.data.video.url;
        result.success = true;
        console.log('[360º Background] ✅ KLING listo en', (endTime - startTime) / 1000, 's');
      } else {
        result.error = 'No se encontró URL en la respuesta de KLING';
      }
    } catch (klingError: any) {
      result.error = klingError?.message || 'Error en KLING';
      console.error('[360º Background] ❌ KLING:', result.error);
    }
    
    // Frames se extraen en el frontend en segundo plano cuando llegue la URL
    result.carouselFrames = [];
    
    if (!result.success && !result.error) {
      result.error = 'No se pudo generar el video 360º. Revisa los logs.';
    }
    
    console.log('[360º Background] ========================================');
    console.log('[360º Background] RESULTADO: Success:', result.success, 'KLING:', result.klingUrl ? '✅' : '❌');
    console.log('[360º Background] ========================================');
    
    return result;
  } catch (error: any) {
    console.error('[360º Background] ========================================');
    console.error('[360º Background] ❌ ERROR GENERAL');
    console.error('[360º Background] Error:', error);
    console.error('[360º Background] Mensaje:', error?.message);
    console.error('[360º Background] Stack:', error?.stack);
    console.error('[360º Background] ========================================');
    
    result.error = error?.message || error?.toString() || 'Error desconocido en generación 360º';
    
    // Mostrar alert en web
    if (typeof window !== 'undefined') {
      alert(`❌ Error general en generación 360º:\n\n${result.error}\n\nRevisa la consola (F12) para más detalles.`);
    }
    
    return result;
  }
}
