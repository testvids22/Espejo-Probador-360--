# Integración en navegador ligero y APK

Guía para cuando la app esté lista y se integre en un **navegador ligero** (y luego se encapsule en APK): permisos persistentes, boot video como pantalla de inicio/bloqueo, y conexiones (Bluetooth, NFC, WiFi impresora, etc.).

---

## 1. Permisos por defecto y persistentes (sin reintroducir en cada actualización)

**Sí, se puede.** En un entorno controlado (navegador dedicado o WebView dentro del APK) puedes:

### Opción A: Navegador ligero con perfil persistente

- El navegador abre **siempre** la app en una **carpeta de perfil fija** (user data directory).
- Los permisos (cámara, micrófono, etc.) se guardan en ese perfil.
- Al **actualizar la app** (nuevo build, nueva URL o nuevo contenido), solo se actualiza el origen/código; el perfil del navegador **no se borra**, así que los permisos siguen concedidos.
- Importante: no limpiar la carpeta de perfil al desplegar actualizaciones; solo actualizar la URL o el bundle que carga el navegador.

### Opción B: WebView en APK (Android)

- En `WebChromeClient` puedes **aceptar automáticamente** las peticiones de permiso para tu dominio:
  - `onPermissionRequest()` → `request.grant()` para cámara/micrófono.
- Así no hace falta que el usuario pulse “Permitir” cada vez.
- Para que persistan entre reinicios: el WebView usa el contexto de la app; si no borras datos de la app al actualizar, los permisos concedidos por el usuario (o por tu código) se mantienen.

### Opción C: Modo kiosk / dispositivo dedicado

- Chromium en modo kiosk con flags que permiten **auto-otorgar** permisos para un origen concreto.
- O un navegador que cargue la app y tenga una opción “Permisos pre-concedidos para este origen”.

Resumen: **sí podrás autorizar todos los permisos por defecto (o una sola vez) y que persistan aunque actualices la app**, siempre que el “navegador” (o WebView) use un perfil/datos persistentes y no se borren al actualizar.

---

## 2. Boot video (logo) como pantalla de inicio / bloqueo

Hoy el **boot video solo se ve al arranque “en frío”** (primera carga de la app, por ejemplo al reiniciar el navegador). Por eso “nunca ha funcionado salvo cuando reinicio el navegador”.

### Comportamiento actual

- La pantalla `app/index.tsx` es la raíz.
- Al cargar, `showBootVideo = true` → se muestra `BootVideo360`.
- Al terminar el video (o “Toca para saltar”), se hace `router.replace('/login')` o `router.replace('/(tabs)/home')`.
- A partir de ahí, el usuario ya **no vuelve a la ruta index**; navega entre tabs (home, catálogo, espejo, etc.). Por tanto el boot **no se vuelve a mostrar** hasta que no haya una **recarga completa** (F5 o reinicio del navegador).

### Cómo tener “siempre” el boot como inicio y como bloqueo

En la fase de **navegador ligero + APK** puedes hacer lo siguiente:

1. **Siempre abrir en la URL raíz**
   - Configurar el navegador/WebView para que, al abrir la app, cargue **siempre** la URL raíz (ej. `https://tu-dominio.com/` o `file:///.../index.html`).
   - Así cada “apertura” del app es una carga desde cero → el boot video se ejecuta cada vez que el usuario “abre” la app (o tras un cierre total).

2. **Boot como “pantalla de bloqueo”**
   - Si el navegador permanece abierto y no quieres recargar toda la app:
     - Opción 2a: Añadir una ruta tipo “lock” o “splash” que muestre de nuevo `BootVideo360` y, al terminar (o tocar), redirija a home. Cuando quieras “bloquear” (inactividad, botón, etc.), hacer `router.replace('/')` o `router.replace('/lock')` para volver a esa pantalla.
     - Opción 2b: Reutilizar el **screensaver** que ya tienes (5 min inactividad): ya muestra el mismo video en bucle; se puede exponer también como “pantalla de bloqueo” al abrir el dispositivo.

3. **Reinicio del navegador = inicio “limpio”**
   - Si el navegador ligero se cierra al “salir” de la app y se abre de nuevo al “entrar”, cada apertura será una carga nueva → el boot se verá siempre que el usuario entre en la app. Ahí el boot funcionaría como “siempre al inicio” sin cambiar código.

Recomendación práctica: en el **navegador ligero**, configurar que al abrir la aplicación se cargue **siempre la URL raíz** y no una ruta interna (ej. `/home`). Así el boot video se verá en cada arranque. Si además quieres que actúe como “pantalla de bloqueo” sin cerrar el navegador, se puede añadir una ruta dedicada que reutilice `BootVideo360` y redirigir ahí en inactividad o al desbloquear el dispositivo.

---

## 3. Voces (TTS y reconocimiento): variabilidad y Android

### Navegador y sesión

- **Según el navegador, las voces funcionan mejor o peor** (calidad, idioma, latencia).
- **En el mismo Chrome, el comportamiento puede cambiar entre sesiones** (perfil, caché, permisos, versión). A tener en cuenta al integrar en un **navegador ligero**: fijar versión de Chromium, perfil limpio y persistente, y probar en el mismo entorno que el dispositivo final.
- En el navegador ligero conviene **documentar qué versión/engine se usa** y **probar TTS y reconocimiento de voz** tras cada actualización del sistema o del navegador.

### Android: voces por defecto (sin asistentes IA)

- En **Android**, la síntesis de voz (TTS) suele usar las **voces de IA de la marca** (p. ej. Google) cuando el asistente o los servicios de voz están activos.
- En dispositivos como el **espejo con Android 11 OTA** que traen **Play Store y GBoard pero no tienen el asistente de Google activado por defecto**, el sistema usa las **voces TTS estándar** (no las de IA). La calidad y naturalidad pueden ser menores.
- Para una experiencia de voz más uniforme en ese tipo de dispositivos:
  - Activar / preconfigurar el **asistente de Google** (o el motor de voz que se quiera usar) en la imagen OTA, o
  - Incluir en la imagen del espejo la **descarga/activación de voces mejoradas** (p. ej. desde Ajustes → Accesibilidad o idioma y entrada).
- Tener en cuenta que **reconocimiento de voz (comandos)** y **síntesis (reproducción)** pueden depender de motores distintos; en Android 11 sin asistente, el reconocimiento web (Web Speech API) puede seguir funcionando con el motor por defecto, pero las voces reproducidas serán las TTS básicas.

---

## 4. Checklist para la integración (APIs, voces, persistencia, hardware)

Cuando integres en el navegador ligero y luego en la APK, conviene tener listo:

| Área | Qué hacer |
|------|-----------|
| **APIs** | Misma configuración (FAL, Replicate, etc.); en WebView/APK usar variables de entorno o config inyectada. |
| **Voces** | Web Speech API en el navegador; en APK, comprobar que el WebView no corta audio y que los permisos de micrófono están concedidos. |
| **Persistencia** | `localStorage` (web) o AsyncStorage; en WebView no borrar datos de la app al actualizar si quieres mantener catálogos/favoritos. |
| **Videos/compartir** | URLs o blobs; en WebView asegurar que los orígenes estén permitidos (CORS, `mixed content`, `allow-file-access` si aplica). |
| **Bluetooth / NFC / WiFi impresora** | Web Bluetooth, Web NFC (donde existan); para impresora por red, API REST o WebSocket desde la misma app. En APK se puede exponer puentes nativos si el navegador no da la API. |

---

## 5. Resumen rápido

- **Permisos:** En navegador ligero/APK se pueden dejar concedidos por defecto o una sola vez y que **persistan** si el perfil/datos del navegador no se borran al actualizar.
- **Boot video:** Hoy solo sale en la primera carga (por eso solo lo ves al reiniciar el navegador). Para que sea “siempre” inicio y bloqueo: abrir siempre la URL raíz al iniciar la app y, si quieres, usar una ruta de “bloqueo” que vuelva a mostrar el mismo video.

Cuando tengas elegido el navegador ligero o el esquema del APK, se puede bajar esto a pasos concretos (qué URL abrir, qué flags o `WebChromeClient` usar, etc.).
