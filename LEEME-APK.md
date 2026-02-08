# Compilar APK - Espejo GV360º

## Forma rápida

Doble clic en **COMPILAR-APK.BAT**. La primera vez te pedirá:

1. **Iniciar sesión en Expo** (cuenta en https://expo.dev). Si no tienes, créala gratis.
2. **Credenciales de Android (firma digital)**  
   - Puedes dejar que **EAS genere un keystore** por ti (recomendado).  
   - O usar el tuyo: después ejecuta `npx eas-cli credentials` y sube tu `.jks`/`.keystore`.

El build se hace en la **nube** (Expo usa Gradle y todo el toolchain allí). No necesitas Android Studio ni JDK en el PC. Al terminar, EAS te da un **enlace para descargar el APK**.

---

## Qué hace el BAT

1. Comprueba Node.js.
2. Ejecuta `npm install`.
3. Ejecuta `npx eas-cli build --platform android --profile production`.
4. El APK se genera con:
   - **Firma digital**: la gestiona EAS (o la tuya si configuraste credenciales).
   - **Permisos** definidos en `app.json` (cámara, micrófono, almacenamiento, notificaciones, overlay, red, Bluetooth, etc.).

---

## Perfiles en eas.json

- **production**: APK listo para instalar (y para Play Store si luego generas AAB).
- **preview**: igual pero pensado para pruebas internas (también genera APK).
- **development**: con cliente de desarrollo (para depurar).

Para usar otro perfil desde la consola:

```bash
npx eas-cli build --platform android --profile preview
```

---

## Firma digital (keystore) propia

Si quieres firmar con tu propio keystore:

1. Genera uno (o usa el que tengas):
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore mi-release.keystore -alias mi-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
2. En el proyecto:
   ```bash
   npx eas-cli credentials
   ```
3. Elige Android → production → Upload your own keystore y sube el `.keystore` e indica alias y contraseñas.

En los siguientes builds, EAS usará ese keystore.

---

## Permisos incluidos (app.json)

Además de los que ya tenía la app, se han añadido para el espejo/kiosk:

- `POST_NOTIFICATIONS` (Android 13+)
- `SYSTEM_ALERT_WINDOW` (mostrar encima de otras apps)
- `REQUEST_INSTALL_PACKAGES` (instalar actualizaciones)
- `BLUETOOTH` / `BLUETOOTH_CONNECT`
- `ACCESS_NETWORK_STATE` / `ACCESS_WIFI_STATE`
- `WAKE_LOCK`

Para quitar o añadir más, edita la sección `expo.android.permissions` en `app.json`.

---

## Compilar en local (sin EAS, con Gradle)

Si prefieres usar Gradle en tu PC (necesitas Android Studio / SDK y JDK 17):

```bash
npx expo prebuild --platform android
cd android
.\gradlew assembleRelease
```

El APK estará en `android/app/build/outputs/apk/release/`. Para firmarlo en local, configura `android/app/build.gradle` con tu `signingConfigs` y un keystore.
