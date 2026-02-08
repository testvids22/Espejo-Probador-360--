# Guía: APK Android 11 OTA + Navegador Ligero + Despliegue Vercel

**Fecha:** 07/02/2026  
**Proyecto:** RORK 360º Integration V2

---

## 1. Carrusel 360º – ¿Funciona? ¿Cómo probar?

Sí, el carrusel está implementado. Puedes probarlo así:

### Web
1. Completar escaneo y probar una prenda en el Espejo.
2. Esperar a que se genere el video 360º (KLING).
3. Ir a la pestaña 360º o usar la navegación automática cuando el video esté listo.
4. Verás: video + carrusel (Frente, Lateral, Trasera, 3/4).

La extracción de frames: directo → proxy `corsproxy.io` → fallback TryOn x4 si falla.

### Android (APK)
- En native usa fallback TryOn x4 (no hay extracción de frames en la app nativa).
- Las vistas siguen siendo correctas (Frente, Lateral, Trasera, 3/4).

---

## 2. API Keys – `.env.local`

1. Copiar el ejemplo:
   ```bash
   cp .env.example .env.local
   ```

2. Editar `.env.local` y poner tu FAL Key:
   ```
   EXPO_PUBLIC_FAL_KEY=tu_clave_fal_real
   EXPO_PUBLIC_REPLICATE_API_TOKEN=opcional
   ```

3. No subir `.env.local` a Git (ya está en `.gitignore`).

---

## 3. Servidor local (navegador ligero)

El servidor lee FAL_KEY desde `.env.local` en la raíz del proyecto.

### Iniciar servidor
```bash
cd server
node local-server.js
```

El servidor usa:
- `FAL_KEY` o `EXPO_PUBLIC_FAL_KEY` desde `.env.local`
- Puerto: 8080

### Rutas disponibles
- `/rork` → build estático de RORK
- `/orchids` → build estático de Orchids
- `/api/try-on`, `/api/wan`, `/api/kling` → APIs con keys encapsuladas

---

## 4. Compilar APK para Android 11 OTA

### Opción A: EAS Build (recomendada)

1. Instalar EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Iniciar sesión en Expo:
   ```bash
   eas login
   ```

3. Configurar proyecto (si aún no):
   ```bash
   eas build:configure
   ```

4. Crear secreto con la FAL Key:
   ```bash
   eas secret:create --name EXPO_PUBLIC_FAL_KEY --value "tu_fal_key" --scope project
   ```

5. Compilar APK:
   ```bash
   eas build -p android --profile preview
   ```

   APK en: EAS Dashboard → builds → descargar.

### Opción B: Build local (requiere Android Studio)

```bash
npx expo prebuild
npx expo run:android --variant release
```

---

## 5. Permisos Android (ya en `app.json`)

- CAMERA
- RECORD_AUDIO
- VIBRATE
- READ_EXTERNAL_STORAGE
- WRITE_EXTERNAL_STORAGE
- INTERNET
- READ_MEDIA_IMAGES
- READ_MEDIA_VIDEO
- READ_MEDIA_AUDIO

Almacenamiento local: AsyncStorage.

---

## 6. Despliegue en Vercel (nueva carpeta, nuevo repo, nueva URL)

Cuando todo funcione:

1. Crear nuevo repositorio en GitHub.
2. Crear carpeta nueva y copiar el proyecto.
3. Añadir variables de entorno en Vercel:
   - `EXPO_PUBLIC_FAL_KEY`
   - `EXPO_PUBLIC_REPLICATE_API_TOKEN` (si aplica)
4. Conectar el repo a Vercel.
5. Desplegar: Vercel crea una nueva URL automáticamente.

### Variables en Vercel
Settings → Environment Variables → Add:
- Name: `EXPO_PUBLIC_FAL_KEY`
- Value: tu clave FAL
- Environment: Production, Preview, Development

---

## 7. Resumen

| Paso            | Comando / acción                                      |
|-----------------|--------------------------------------------------------|
| 1. API Keys     | Copiar `.env.example` → `.env.local`, rellenar FAL_KEY |
| 2. Servidor     | `cd server && node local-server.js`                    |
| 3. APK          | `eas build -p android --profile preview`               |
| 4. Vercel       | Nuevo repo → conectar → configurar env vars → deploy   |

---

**Última actualización:** 07/02/2026
