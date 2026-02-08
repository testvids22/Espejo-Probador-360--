# Despliegue – Espejo Probador GV360º

- **Web:** servidor/navegador ligero (Vercel), probar API keys y flujo completo.
- **APK:** Android 11+, pantalla vertical 43", claves encapsuladas, OTA. Voces con **expo-speech** (TTS en app; el dispositivo no necesita voz de IA).

---

## 1. Variables de entorno (API Keys)

La app usa:

- `EXPO_PUBLIC_FAL_KEY` – FAL (TryOn, etc.)
- `EXPO_PUBLIC_REPLICATE_API_TOKEN` – Replicate (360º, etc.)

Configúralas en:

- **Vercel:** Proyecto → Settings → Environment Variables.
- **EAS (APK):** Expo Dashboard → proyecto → Secrets (añadir `EXPO_PUBLIC_FAL_KEY` y `EXPO_PUBLIC_REPLICATE_API_TOKEN`). Quedarán encapsuladas en el APK.

Opcional: en la app, Ajustes permite guardar keys en AsyncStorage (override local).

---

## 2. Despliegue Web (Vercel)

1. Conectar el repo (GitHub Verdel / testvids22 o este proyecto) a Vercel.
2. Añadir en Vercel las variables `EXPO_PUBLIC_FAL_KEY` y `EXPO_PUBLIC_REPLICATE_API_TOKEN`.
3. Build: `npm run build:web` (ya en `vercel.json` como `buildCommand`).
4. Output: `dist` (en `vercel.json` como `outputDirectory`).

Así se despliega la web y puedes comprobar que las API keys y el resto funcionan.

---

## 3. APK para Android 11+ (EAS) – Espejo 43" vertical

1. **EAS CLI:**  
   `npm i -g eas-cli` y `eas login` (cuenta Expo Pro).

2. **Secrets en Expo:**  
   En [expo.dev](https://expo.dev) → tu proyecto → Secrets, crear:
   - `EXPO_PUBLIC_FAL_KEY`
   - `EXPO_PUBLIC_REPLICATE_API_TOKEN`  
   Así las claves van encapsuladas en el APK.

3. **Build APK:**  
   `eas build --platform android --profile production`  
   (En `eas.json`, `production` ya usa `buildType: apk`.)

4. **Instalación:**  
   Descargar el APK desde el enlace que da EAS e instalarlo en el dispositivo (Android 11 o superior). Para pantalla vertical 43", la app usa `orientation: portrait` en `app.json`.

5. **OTA (actualizaciones sin reinstalar):**  
   `eas update --branch production`  
   Los clientes con la app instalada reciben la actualización por OTA.

---

## 4. Voces (TTS) en el espejo

La app usa **expo-speech** para síntesis de voz (anuncios, confirmaciones, etc.). No depende de Google Assistant ni de voz de IA del dispositivo: las voces se generan desde la app. En Android, expo-speech usa el motor TTS del sistema (p. ej. Google TTS si está instalado). No hace falta configurar nada más para las voces.

---

## 5. Resumen de comandos

| Acción        | Comando |
|---------------|---------|
| Build web     | `npm run build:web` |
| Servir dist   | `npx serve dist` (probar local) |
| Build APK     | `eas build --platform android --profile production` |
| OTA update    | `eas update --branch production` |

---

*Pendientes para más adelante: 2.ª prenda no visible en espejo (transparente); screensaver que aparece con actividad.*
