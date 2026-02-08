# Resumen completo de modificaciones – Proyecto RORK 360º

**Fecha:** 07/02/2026  
**Proyecto:** rork-360-integration-v2-87f7e08

Este documento resume todas las modificaciones, correcciones y mejoras realizadas para poder replicarlas en otra carpeta de proyecto.

---

## Índice

1. [Comandos vocales Espejo](#1-comandos-vocales-espejo)
2. [Comandos vocales Perfil](#2-comandos-vocales-perfil)
3. [Boot video al borrar perfil](#3-boot-video-al-borrar-perfil)
4. [Configuración .env.local y API Keys](#4-configuración-envlocal-y-api-keys)
5. [Servidor local (navegador ligero)](#5-servidor-local-navegador-ligero)
6. [APK Android (EAS Build)](#6-apk-android-eas-build)
7. [Guía de despliegue](#7-guía-de-despliegue)
8. [Archivos creados/modificados](#8-archivos-creadosmodificados)

---

## 1. Comandos vocales Espejo

### Comando "ver lo que me he probado"

**Archivo:** `app/(tabs)/mirror.tsx`

- **Patrones:** `ver lo que me he probado`, `lo que me he probado`, `ver mis pruebas`, `mis pruebas`, `ver probado`, `qué me he probado`
- **Acción:** Abre la vista de comparación con carrusel de favoritos. Prioriza items que están en favoritos en el carrusel.
- **Lógica:**
  - Obtiene `triedItems` con `compositeImage`, ordenados por favoritos primero
  - Si hay items: abre `compareMode`, activa `isCarouselMode` si hay más de uno
  - Si no hay composite: captura con `captureAndSaveComposite()` y luego abre comparación
  - Si no hay items probados: mensaje de voz indicando que pruebe algo del catálogo
- **Registro:** `registerCommand('ver-lo-probado', {...})`
- **Limpieza:** `unregisterCommand('ver-lo-probado')` en el cleanup del `useFocusEffect`

---

## 2. Comandos vocales Perfil

### Comando "borrar perfil" / "cerrar y borrar"

**Archivo:** `app/(tabs)/profile.tsx`

- **Patrones:** `borrar perfil`, `cerrar y borrar`, `eliminar perfil`, `borrar todo`, `cerrar sesión y borrar`
- **Acción:** Muestra confirmación de borrado con aviso irreversible y recomendación de Bluetooth
- **Texto del aviso:**  
  `"Esta acción es IRREVERSIBLE. Si no quiere volver a firmar el consentimiento y sacar fotos, debería guardar su perfil completo en su móvil vía Bluetooth antes de borrar."`
- **Función:** `showDeleteProfileConfirmation` (useCallback) que:
  - Muestra Alert con el texto completo
  - Botones: Cancelar / Eliminar Todo
  - Al confirmar: `clearAllProfileData()`
- **Uso:** Tanto el botón rojo como el comando vocal llaman a `showDeleteProfileConfirmation`
- **Registro:** `registerCommand('profile-delete-all', {...})`
- **Limpieza:** `unregisterCommand('profile-delete-all')`

### Botón borrar perfil (rojo)

- El botón usa `styles.deleteProfileButton` (fondo rojo #DC2626)
- El `onPress` se simplificó a `showDeleteProfileConfirmation` (antes tenía la lógica inline)

---

## 3. Boot video al borrar perfil

### AppContext

**Archivo:** `contexts/AppContext.tsx`

- **Nueva clave:** `SHOW_BOOT_VIDEO: '@app_show_boot_video'` en `STORAGE_KEYS`
- **En `clearAllProfileData`:** Después de borrar todo y actualizar estado:
  ```javascript
  await AsyncStorage.setItem(STORAGE_KEYS.SHOW_BOOT_VIDEO, 'true');
  ```

### Mirror

**Archivo:** `app/(tabs)/mirror.tsx`

- **Constante:** `SHOW_BOOT_VIDEO_KEY = '@app_show_boot_video'`
- **Imports:** `AsyncStorage`, `BootVideo`
- **Estado:** `showBootVideo` (useState boolean)
- **useFocusEffect:** Al enfocar Mirror, lee `AsyncStorage.getItem(SHOW_BOOT_VIDEO_KEY)`. Si es `'true'`, pone `setShowBootVideo(true)`
- **handleBootVideoFinish:** Elimina la clave en AsyncStorage y hace `setShowBootVideo(false)`
- **Render:** Si `showBootVideo` es true, renderiza `<BootVideo visible={showBootVideo} onFinish={handleBootVideoFinish} />`

Flujo: al borrar perfil → se marca la flag → al volver a Mirror se muestra el boot video → al terminar se limpia la flag.

---

## 4. Configuración .env.local y API Keys

### .env.example

**Archivo:** `.env.example` (nuevo)

```env
# Copia este archivo como .env.local y rellena tus API Keys
# Nunca subas .env.local a Git (ya está en .gitignore)

# FAL AI - Requerido para TryOn, WAN, KLING 360º
EXPO_PUBLIC_FAL_KEY=tu_fal_key_aqui

# Replicate (opcional, si usas otros modelos)
EXPO_PUBLIC_REPLICATE_API_TOKEN=opcional
```

- `.env.local` debe crearse desde este archivo y rellenarse con la FAL key real.

---

## 5. Servidor local (navegador ligero)

### server/local-server.js

**Cambios:**

1. Carga manual de `.env.local` desde la raíz del proyecto:
   ```javascript
   const envPath = path.join(__dirname, '..', '.env.local');
   if (fs.existsSync(envPath)) {
     const envContent = fs.readFileSync(envPath, 'utf8');
     envContent.split('\n').forEach(line => {
       const match = line.match(/^([^#=]+)=(.*)$/);
       if (match) {
         const key = match[1].trim();
         const val = match[2].trim().replace(/^["']|["']$/g, '');
         if (!process.env[key]) process.env[key] = val;
       }
     });
   }
   ```
2. `API_KEYS` usa `process.env.FAL_KEY` o `process.env.EXPO_PUBLIC_FAL_KEY` (y lo mismo para REPLICATE)

### package.json

**Nuevo script:**

```json
"server:local": "node server/local-server.js"
```

Ejecutar: `npm run server:local` o `cd server && node local-server.js`

---

## 6. APK Android (EAS Build)

### eas.json

**Archivo:** `eas.json` (nuevo)

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "apk" }
    }
  },
  "submit": { "production": {} }
}
```

Uso: `eas build -p android --profile preview` (después de `eas login` y `eas secret:create` para EXPO_PUBLIC_FAL_KEY).

---

## 7. Guía de despliegue

### GUIA_APK_Y_DESPLIEGUE.md

**Archivo:** `GUIA_APK_Y_DESPLIEGUE.md` (nuevo)

Contiene:

1. Carrusel 360º – cómo funciona y cómo probarlo (web vs APK)
2. API Keys – `.env.local` y `EXPO_PUBLIC_FAL_KEY`
3. Servidor local – cómo iniciarlo
4. Compilación APK – EAS Build y build local
5. Permisos Android (ya en app.json)
6. Despliegue en Vercel – nuevo repo, carpeta y URL
7. Tabla resumen de pasos

---

## 8. Archivos creados/modificados

| Archivo | Acción |
|---------|--------|
| `.env.example` | Creado |
| `app/(tabs)/mirror.tsx` | Modificado (comando ver-lo-probado, BootVideo) |
| `app/(tabs)/profile.tsx` | Modificado (comando borrar, showDeleteProfileConfirmation) |
| `contexts/AppContext.tsx` | Modificado (SHOW_BOOT_VIDEO en clearAllProfileData) |
| `server/local-server.js` | Modificado (carga .env.local) |
| `eas.json` | Creado |
| `package.json` | Modificado (script server:local) |
| `GUIA_APK_Y_DESPLIEGUE.md` | Creado |
| `RESUMEN_MODIFICACIONES_COMPLETO.md` | Creado (este archivo) |

---

## Cómo replicar en otra carpeta de proyecto

1. Copiar o aplicar los cambios descritos en cada archivo.
2. Crear `.env.example` y `.env.local` si no existen.
3. Añadir/actualizar `eas.json` si vas a compilar APK.
4. Actualizar `server/local-server.js` con la carga de `.env.local`.
5. Añadir el script `server:local` en `package.json`.
6. Usar `GUIA_APK_Y_DESPLIEGUE.md` como referencia para despliegue y APK.

---

**Última actualización:** 07/02/2026
