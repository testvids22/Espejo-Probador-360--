# Debug RORK APK - Pantalla Blanca/Negra

**Problema:** APK muestra pantalla blanca, luego negra, y se bloquea.

---

## 🔍 Pasos para Debug

### 1. Ver Logs en Tiempo Real
```bash
adb logcat | Select-String "AppContent|Error|Exception|ReactNative"
```

### 2. Ver Logs Completos
```bash
adb logcat > rork_logs.txt
# Luego revisa el archivo para ver errores
```

### 3. Verificar Permisos
En el dispositivo Android:
- Configuración → Apps → Smart Mirror GV360
- Permisos → Activar todos los permisos posibles:
  - ✅ Cámara
  - ✅ Micrófono
  - ✅ Almacenamiento
  - ✅ Notificaciones
  - ✅ Modificar configuración del sistema (si está disponible)

### 4. Verificar Errores Específicos
```bash
# Errores de React
adb logcat | Select-String "ReactNativeJS|ErrorBoundary"

# Errores de inicialización
adb logcat | Select-String "AppContent|prepareApp"

# Errores de providers
adb logcat | Select-String "AppProvider|VoiceProvider|AIProvider"
```

---

## 🔧 Correcciones Aplicadas

1. **Tiempo de espera aumentado:** 2s → 3s
2. **Logging mejorado:** Console.logs en puntos clave
3. **Manejo de errores:** Pantalla de error si falla
4. **Reintentos de navegación:** Si falla, intenta de nuevo

---

## 📋 Posibles Causas

1. **Providers no se inicializan:**
   - AppProvider, VoiceProvider, AIProvider pueden estar fallando
   - Revisar logs para ver qué provider falla

2. **Error en navegación:**
   - `router.replace('/(tabs)/home')` puede fallar
   - Verificar que la ruta existe

3. **Error en componentes:**
   - ErrorBoundary debería capturar errores
   - Revisar si ErrorBoundary está funcionando

4. **Problema de memoria:**
   - APK es grande (177MB)
   - Puede tardar en cargar en dispositivos con poca RAM

---

## 🚀 Próximos Pasos

1. **Probar con logs:**
   - Ejecutar `adb logcat` mientras abres la app
   - Buscar errores específicos

2. **Si sigue bloqueado:**
   - Revisar si hay errores en los providers
   - Verificar que todos los módulos nativos se cargan correctamente
   - Considerar reducir el tamaño del APK

---

**Estado:** ⏳ Esperando logs para diagnóstico
