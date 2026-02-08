# Plan: Generación Paralela WAN/KLING y Visualización Inmediata

## Problemas Actuales

1. **WAN y KLING se generan secuencialmente**: WAN primero, luego KLING después de 2 segundos
2. **Los videos no aparecen hasta que ambos estén listos**: Bloquea la UI
3. **El carrusel solo se extrae de KLING**: Debería extraerse de WAN también
4. **MediaPipe no aparece arriba al centro**: Falta en el JSX
5. **MediaPipe no se activa automáticamente**: Requiere click manual

## Solución

### 1. Generación Paralela en `generate-360-background.ts`

```typescript
// Generar WAN y KLING en paralelo con Promise.all
const [wanResult, klingResult] = await Promise.allSettled([
  generateWAN(imageUrlForFal, cleanKey),
  generateKLING(imageUrlForFal, cleanKey)
]);

// Retornar WAN inmediatamente cuando esté listo
// KLING se actualizará después sin bloquear
```

### 2. Actualización Incremental en `AppContext.tsx`

```typescript
// Actualizar estado tan pronto como WAN esté listo
if (result.wanUrl) {
  // Actualizar inmediatamente con WAN
  updateTriedItemWithView360(itemId, {
    wanUrl: result.wanUrl,
    isReady: true, // WAN listo = mostrar inmediatamente
    generating: false
  });
}

// KLING se actualizará después sin bloquear
if (result.klingUrl) {
  updateTriedItemWithView360(itemId, {
    klingUrl: result.klingUrl,
    // No cambiar isReady si ya es true
  });
}
```

### 3. Visualización Inmediata en `Viewer360.tsx`

```typescript
// Mostrar WAN tan pronto como esté disponible
useEffect(() => {
  if (view360Data?.wanUrl && !fashionSpinUrl) {
    setFashionSpinUrl(view360Data.wanUrl);
    // Extraer frames inmediatamente de WAN
    extractFramesFromVideo(view360Data.wanUrl);
  }
}, [view360Data?.wanUrl]);

// KLING se mostrará cuando esté listo, sin bloquear
useEffect(() => {
  if (view360Data?.klingUrl && !klingVideoUrl) {
    setKlingVideoUrl(view360Data.klingUrl);
    // Extraer frames de KLING si no hay frames de WAN
    if (carouselFrames.length === 0) {
      extractFramesFromVideo(view360Data.klingUrl);
    }
  }
}, [view360Data?.klingUrl]);
```

### 4. MediaPipe Arriba al Centro

```typescript
// Agregar MediaPipe arriba al centro en el JSX
<View style={styles.mediaPipeTopContainer}>
  {isTracking && (
    <View style={styles.mediaPipeTop}>
      {/* Video webcam */}
      {/* Canvas tracking */}
      {/* Overlay con grados */}
    </View>
  )}
  {!isTracking && (
    <TouchableOpacity onPress={() => setIsTracking(true)}>
      Activar Seguimiento
    </TouchableOpacity>
  )}
</View>
```

### 5. Activación Automática de MediaPipe

```typescript
// Activar MediaPipe automáticamente cuando haya frames
useEffect(() => {
  if (carouselFrames.length > 0 && !isTracking) {
    // Auto-activar MediaPipe cuando hay carrusel
    setIsTracking(true);
  }
}, [carouselFrames.length]);
```

## Secuencia Esperada

1. **TryOn RORK**: 1-3s
2. **Limpieza fondo**: 1s
3. **WAN + KLING en paralelo**: 3-6s (WAN), 5-10s (KLING)
4. **WAN listo**: Mostrar inmediatamente + extraer frames
5. **Carrusel activo**: Con frames de WAN
6. **MediaPipe activo**: Automáticamente cuando hay frames
7. **KLING listo**: Se actualiza sin bloquear (opcional, mejora calidad)

## Cambios Requeridos

1. ✅ `generate-360-background.ts`: Promise.allSettled para paralelo
2. ✅ `AppContext.tsx`: Actualización incremental (WAN primero)
3. ✅ `Viewer360.tsx`: Visualización inmediata de WAN
4. ✅ `Viewer360.tsx`: Extracción de frames de WAN
5. ✅ `Viewer360.tsx`: MediaPipe arriba al centro en JSX
6. ✅ `Viewer360.tsx`: Auto-activación de MediaPipe
