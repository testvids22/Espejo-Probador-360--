// lib/upload-image-to-url.ts
// Convierte data URLs a URLs públicas para FAL AI

import { Platform } from 'react-native';

/**
 * Convierte una data URL o URI local a una URL pública
 * Para web: usa un servicio de hosting temporal
 * Para móvil: sube a un servicio de hosting
 */
export async function uploadImageToPublicUrl(imageUrl: string): Promise<string> {
  console.log('[Upload Image] Iniciando conversión de imagen a URL pública...');
  console.log('[Upload Image] Tipo de URL:', imageUrl.startsWith('data:') ? 'Data URL' : imageUrl.startsWith('file://') ? 'File URI' : 'URL pública');

  // Si ya es una URL pública (http/https), devolverla directamente
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    console.log('[Upload Image] Ya es una URL pública, devolviendo directamente');
    return imageUrl;
  }

  // Para web: convertir data URL a blob y subir a un servicio temporal
  if (Platform.OS === 'web' && imageUrl.startsWith('data:')) {
    try {
      console.log('[Upload Image] Convirtiendo data URL a blob...');
      
      // Convertir data URL a blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Opción 1: Usar imgur.com (servicio gratuito y confiable)
      console.log('[Upload Image] Subiendo a imgur.com...');
      const formData = new FormData();
      formData.append('image', blob);
      
      // imgur.com API (sin API key para subidas anónimas)
      const uploadResponse = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          'Authorization': 'Client-ID 546c25a59c58ad7', // Client ID público de imgur para subidas anónimas
        },
        body: formData,
      });
      
      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        if (uploadData.data?.link) {
          console.log('[Upload Image] ✅ Imagen subida exitosamente a imgur:', uploadData.data.link);
          return uploadData.data.link;
        }
      }
      
      // Opción 2: Si imgur falla, intentar con otro servicio
      console.log('[Upload Image] imgur falló, intentando con otro servicio...');
      throw new Error('No se pudo subir la imagen a imgur. Verifica la consola para más detalles.');
    } catch (error) {
      console.error('[Upload Image] Error subiendo imagen:', error);
      throw error;
    }
  }

  // Para móvil: subir desde file:// URI
  if (Platform.OS !== 'web' && imageUrl.startsWith('file://')) {
    try {
      console.log('[Upload Image] Subiendo archivo local desde móvil...');
      
      // Leer el archivo
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Subir a imgur.com
      const formData = new FormData();
      formData.append('image', blob);
      
      const uploadResponse = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          'Authorization': 'Client-ID 546c25a59c58ad7', // Client ID público de imgur
        },
        body: formData,
      });
      
      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        if (uploadData.data?.link) {
          console.log('[Upload Image] ✅ Imagen subida exitosamente a imgur:', uploadData.data.link);
          return uploadData.data.link;
        }
      }
      
      throw new Error('No se pudo subir la imagen desde móvil.');
    } catch (error) {
      console.error('[Upload Image] Error subiendo imagen desde móvil:', error);
      throw error;
    }
  }

  // Si no se puede convertir, lanzar error
  throw new Error(`No se pudo convertir la URL: ${imageUrl.substring(0, 50)}...`);
}
