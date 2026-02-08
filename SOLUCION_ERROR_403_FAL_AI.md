# SOLUCIÓN ERROR 403 EN FAL AI

**Fecha:** 2025-02-03  
**Problema:** Error 403 después de TryOn al generar videos 360º (WAN y KLING)

---

## 🔍 DIAGNÓSTICO

El error **403 (Forbidden)** en FAL AI indica que:
- La API key no se está enviando correctamente en las peticiones
- O la API key no tiene permisos para usar los modelos `wan-i2v` y `kling-video`

---

## ✅ SOLUCIÓN APLICADA

### Problema identificado:
- `fal.config()` puede no funcionar correctamente en algunos entornos web
- La API key puede no estar siendo enviada en las llamadas a `fal.subscribe()`

### Solución:
1. ✅ **Mantener `fal.config()`** para configuración global
2. ✅ **Pasar `credentials` directamente** en cada llamada a `fal.subscribe()` como fallback
3. ✅ **Simplificar configuración** - solo `credentials: cleanKey`

### Cambios en código:

**Archivo:** `lib/generate-360-background.ts`

#### 1. Configuración simplificada (líneas 102-120):
```typescript
// Configuración simple y directa
fal.config({
  credentials: cleanKey
});
```

#### 2. Llamada WAN con credentials (líneas 156-165):
```typescript
const wanResult: any = await fal.subscribe('fal-ai/wan-i2v', {
  input: { ... },
  credentials: cleanKey, // Pasar API key directamente como fallback
});
```

#### 3. Llamada KLING con credentials (líneas 294-303):
```typescript
const klingResult: any = await fal.subscribe('fal-ai/kling-video/v2.6/pro/image-to-video', {
  input: { ... },
  credentials: cleanKey, // Pasar API key directamente como fallback
});
```

---

## 🔑 VERIFICACIÓN DE API KEY

### En desarrollo local:
1. Verifica que `.env.local` existe y contiene:
   ```
   EXPO_PUBLIC_FAL_KEY=tu_api_key_aqui
   ```
2. **NO** incluyas comillas ni espacios
3. Reinicia el servidor después de cambiar `.env.local`

### En Vercel:
1. Ve a **Settings → Environment Variables**
2. Agrega `EXPO_PUBLIC_FAL_KEY` con tu API key
3. **Aplica a:** Production, Preview, Development
4. Haz **redeploy** después de agregar la variable

### Verificar en consola:
Busca estos logs en la consola (F12):
```
[API Keys] ✅ Usando keys de variables de entorno
[API Keys] EXPO_PUBLIC_FAL_KEY longitud: [debe ser > 20]
[360º Background] API Key length: [debe ser > 20]
[360º Background] API Key starts with: [primeros 10 caracteres]
```

---

## 🚨 SI SIGUE DANDO ERROR 403

### Verifica:
1. ✅ **API key es válida** - cópiala directamente de tu cuenta de FAL AI
2. ✅ **API key tiene permisos** - verifica en tu cuenta de FAL AI que tienes acceso a `wan-i2v` y `kling-video`
3. ✅ **API key no está expirada** - algunas keys tienen fecha de expiración
4. ✅ **No hay límite de quota** - verifica que no hayas alcanzado el límite de uso

### Logs de debugging:
Abre la consola (F12) y busca:
- `[360º Background] API Key length:` → Debe ser > 20
- `[360º Background] API Key starts with:` → Primeros 10 caracteres
- `[360º Background] ❌ ERROR EN WAN` → Ver el status code (debe ser 403)
- `[360º Background] Response:` → Ver la respuesta completa del error

---

## 📋 PRÓXIMOS PASOS

1. **Probar generación 360º:**
   - Hacer un TryOn
   - Verificar que no aparezca error 403
   - Revisar consola para ver logs de API key

2. **Si sigue dando 403:**
   - Compartir logs completos de la consola
   - Verificar API key en cuenta de FAL AI
   - Verificar que la API key tenga permisos para los modelos

---

**Última actualización:** 2025-02-03
