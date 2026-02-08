# Marca de agua en TryOn RORK y envío a FAL AI

## Situación

Las imágenes del TryOn de RORK pueden venir con **marca de agua**. Antes de mandarlas a FAL AI (KLING u otros modelos) conviene tener en cuenta:

1. **URL pública vs data URL**  
   FAL AI acepta:
   - **URLs públicas** (https://…) sin problema.
   - **Data URLs** (data:image/…) en algunos casos; no todos los modelos o entornos las soportan igual.

2. **Si se limpia la marca de agua**  
   - Cualquier proceso de limpieza (recorte, inpainting, otro servicio) que devuelva una **nueva imagen** suele dar:
     - una **data URL** (base64), o  
     - una **URL pública** si se sube a un almacenamiento (p. ej. FAL storage, S3, etc.).
   - Si el resultado es solo data URL y el modelo de FAL exige URL pública, habría que **subir esa imagen a una URL pública** (por ejemplo con `fal.storage.upload` o tu propio backend) y pasar esa URL a FAL.

3. **Recomendación**  
   - Probar primero con la imagen actual (con o sin marca) y ver si FAL la acepta (data URL o URL pública).
   - Si se implementa limpieza de marca de agua:
     - Hacerlo con cuidado (RGPD, no subir a terceros sin necesidad).
     - Si FAL rechaza data URLs para ese modelo, exponer la imagen limpia como **URL pública** (p. ej. subida a FAL o a tu servidor) y pasar esa URL en la llamada.

---

# Grok (xAI) en FAL AI – misma API key

Si en el futuro se cambia de KLING a **Grok Imagine** para el 360º:

- **No hace falta cambiar de API key.**  
  Grok está disponible en FAL AI con la misma **FAL_KEY** (fal.ai).

- Endpoint de ejemplo (comprobar en la doc actual de fal.ai):  
  `fal-ai/models/xai/grok-imagine-video/image-to-video`  
  o el que indique la documentación de FAL para “Grok Imagine Video (Image-to-Video)”.

- Solo habría que:
  1. Sustituir la llamada a `fal-ai/kling-video/...` por la del modelo Grok en `generate-360-background.ts`.
  2. Ajustar el cuerpo de la petición (input) al esquema que pida Grok en FAL (prompt, imagen, etc.).
  3. Mantener la misma clave `EXPO_PUBLIC_FAL_KEY` en Vercel y en local.
