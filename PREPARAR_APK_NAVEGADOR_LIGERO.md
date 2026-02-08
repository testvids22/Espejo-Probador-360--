# Preparar APK Navegador Ligero

**Fecha:** 02/02/2026

---

## 📋 Pasos para Compilar APK

### 1. Copiar Builds a Assets

```bash
# Desde la raíz del proyecto RORK
cd C:\Users\SAPad\Smart-Mirror-GV360

# Crear directorio assets si no existe
mkdir -p android\app\src\main\assets\rork
mkdir -p android\app\src\main\assets\orchids

# Copiar build de RORK
xcopy /E /I /Y dist\* android\app\src\main\assets\rork\

# Copiar build de Orchids
xcopy /E /I /Y ..\orchids-projects\orchids-virtual-try-on-remix-remix\out\* android\app\src\main\assets\orchids\
```

### 2. Configurar AndroidManifest.xml

Asegurar que `LocalServerActivity` sea la actividad principal:

```xml
<activity
    android:name=".LocalServerActivity"
    android:exported="true"
    android:screenOrientation="portrait">
    <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
    </intent-filter>
</activity>
```

### 3. Compilar APK

```bash
cd android
.\gradlew assembleDebug
```

APK generada en: `android\app\build\outputs\apk\debug\app-debug.apk`

---

## 🔧 Implementación API Keys

Las API Keys están **encapsuladas** en `LocalServerActivity.java`:

```java
private static final String FAL_KEY = "...";
private static final String REPLICATE_API_TOKEN = "...";
```

**Nunca se exponen al cliente WebView.**

---

## 📊 Tamaño Estimado

- RORK build: ~4.83 MB
- Orchids build: ~1.82 MB
- Android base: ~15-20 MB
- **Total estimado: ~25-30 MB** ✅

---

## ✅ Ventajas

1. ✅ APK ligera (~25-30 MB vs ~177 MB)
2. ✅ API Keys encapsuladas
3. ✅ RORK + Orchids integrados
4. ✅ Fácil actualización (solo cambiar assets)
5. ✅ Sin recompilar para cambios web

---

**Última actualización:** 02/02/2026
