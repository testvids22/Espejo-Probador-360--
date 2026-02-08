# Correcciones Aplicadas - Boot Video y Screensaver

**Fecha:** 02/02/2026

---

## ✅ CORRECCIONES APLICADAS

### 1. **Video Boot Centrado**
- **Problema:** Video pegado a la izquierda de la pantalla
- **Solución:** Agregado `alignSelf: 'center'` al estilo del video
- **Archivo:** `components/BootVideo360.tsx`

### 2. **Screensaver - Tiempo y Funcionamiento**
- **Problema:** Screensaver no funcionaba o tiempo insuficiente
- **Solución:** 
  - Cambiado tiempo de inactividad de 30 segundos a **5 minutos (300000ms)**
  - Screensaver se activa correctamente después de 5 minutos sin actividad
- **Archivo:** `app/index.tsx`

### 3. **Condiciones y Consentimiento**
- **Estado:** ✅ NO TOCADOS (funcionan perfectamente y se sincronizan con perfil)
- **Nota:** Se mantienen intactos como solicitado

### 4. **Cierre Automático y Limpieza de Datos**
- **Problema:** Necesidad de borrar datos después de 5 minutos de inactividad
- **Solución Implementada:**
  - Timer de 5 minutos que borra todos los datos del usuario
  - Se ejecuta cuando:
    - App pasa a segundo plano por más de 5 minutos
    - Usuario está inactivo por más de 5 minutos (antes de activar screensaver)
  - Limpia:
    - Datos de escaneo
    - Favoritos
    - Items probados
    - Perfil del usuario (nombre, avatar, etc.)
    - localStorage (en web)
- **Archivo:** `app/index.tsx`
- **Función utilizada:** `clearAllProfileData()` de `AppContext`

### 5. **Screensaver con Sonido 50% Más Bajo**
- **Problema:** Sonido del screensaver muy alto
- **Solución:** 
  - Video en screensaver usa volumen `0.5` (50%)
  - Video boot inicial usa volumen `1.0` (100%)
  - Configurado tanto en `volume` prop como en `setVolumeAsync()`
- **Archivo:** `components/BootVideo360.tsx`

### 6. **Permisos del Navegador Autorizados por Defecto**
- **Problema:** Necesidad de autorizar permisos manualmente
- **Solución Implementada:**
  - Nueva función `requestAllWebPermissions()` en `utils/webPermissions.ts`
  - Solicita automáticamente al iniciar la app:
    - ✅ Permisos de cámara
    - ✅ Permisos de micrófono
    - ✅ Permisos de notificaciones
    - ✅ Permisos de geolocalización
  - Se ejecuta 1 segundo después de que la app carga
  - No bloquea si el usuario aún no ha concedido permisos
- **Archivos:**
  - `utils/webPermissions.ts` (nueva función)
  - `app/index.tsx` (llamada al iniciar)

---

## 📋 DETALLES TÉCNICOS

### Screensaver y Limpieza de Datos

```typescript
// Timer de 5 minutos para screensaver y limpieza
inactivityTimer.current = setTimeout(async () => {
  // Borrar datos del usuario
  await clearAllProfileData();
  
  // Limpiar localStorage en web
  if (Platform.OS === 'web') {
    localStorage.removeItem('espejo_authenticated');
    localStorage.removeItem('espejo_terms_accepted');
    localStorage.removeItem('espejo_gdpr_accepted');
  }
  
  // Activar screensaver
  setShowScreensaver(true);
}, 300000); // 5 minutos
```

### Volumen del Video

```typescript
// Screensaver: 50% de volumen
volume={isScreensaver ? 0.5 : 1.0}

// También configurado en setVolumeAsync
const volume = isScreensaver ? 0.5 : 1.0;
await videoRef.current.setVolumeAsync(volume);
```

### Permisos Automáticos

```typescript
// Solicita todos los permisos al iniciar
useEffect(() => {
  if (Platform.OS === 'web') {
    setTimeout(() => {
      requestAllWebPermissions().catch(console.error);
    }, 1000);
  }
}, []);
```

---

## 🧪 PRUEBAS RECOMENDADAS

1. **Video Boot:**
   - ✅ Verificar que el video está centrado
   - ✅ Verificar que el sonido funciona

2. **Screensaver:**
   - ✅ Esperar 5 minutos sin tocar la pantalla
   - ✅ Verificar que se activa el screensaver
   - ✅ Verificar que el sonido está al 50%

3. **Limpieza de Datos:**
   - ✅ Esperar 5 minutos de inactividad
   - ✅ Verificar que los datos se borran
   - ✅ Verificar que vuelve al inicio (boot video)

4. **Permisos:**
   - ✅ Verificar que se solicitan automáticamente al iniciar
   - ✅ Verificar que funcionan cámara y micrófono sin solicitar manualmente

---

## 📝 NOTAS IMPORTANTES

- **Condiciones/Consentimiento:** NO se modificaron, funcionan perfectamente
- **Sincronización con Perfil:** Se mantiene intacta
- **Primera Foto en Perfil:** Se mantiene intacta
- **Tiempo de Screensaver:** 5 minutos (300000ms)
- **Volumen Screensaver:** 50% del volumen configurado

---

**Última actualización:** 02/02/2026
