# DEBUG: URLs NO APARECEN EN PESTAÑA 360º

**Fecha:** 2025-02-03  
**Problema:** Los videos se generan en FAL AI, pero no aparecen en la pestaña 360º

---

## 🔍 PROBLEMA

- ✅ Los videos SÍ se generan en FAL AI (confirmado en cuenta de FAL AI)
- ❌ Los videos NO aparecen en la pestaña 360º de la aplicación

---

## 🔧 LOGGING AGREGADO

He agregado logging detallado en todo el flujo para identificar dónde se pierden las URLs:

### 1. En `lib/generate-360-background.ts`:
- ✅ Log cuando WAN se completa con URL
- ✅ Log cuando KLING se completa con URL
- ❌ Log de error si no se encuentra URL en la respuesta
- ✅ Log de estructura completa de la respuesta si falta URL

### 2. En `contexts/AppContext.tsx`:
- ✅ Log detallado cuando se recibe el resultado de `generate360InBackground`
- ✅ Log de URLs antes de guardar (con longitud)
- ✅ Log de URLs después de guardar en el estado
- ✅ Log de `isReady` status

### 3. En `app/(tabs)/tryon-360.tsx`:
- ✅ Log detallado cuando se busca el `selectedItem`
- ✅ Log de URLs encontradas en `view360`
- ✅ Log de URLs que se pasan a `Viewer360`

---

## 📋 CÓMO DEBUGGEAR

### Paso 1: Abrir Consola del Navegador
1. Abre Chrome (o tu navegador)
2. Presiona `F12` o `Ctrl+Shift+I`
3. Ve a la pestaña "Console"

### Paso 2: Hacer un TryOn
1. Ve a la pestaña "Espejo"
2. Selecciona una prenda
3. Haz el TryOn
4. Espera a que aparezca la notificación de generación 360º

### Paso 3: Buscar Logs en la Consola

Busca estos logs en orden:

#### A. Generación 360º (`[360º Background]`):
```
[360º Background] ✅ WAN completado
[360º Background] ✅ WAN URL: https://...
[360º Background] ✅ WAN URL length: XXX

[360º Background] ✅ KLING completado
[360º Background] ✅ KLING URL: https://...
[360º Background] ✅ KLING URL length: XXX
```

**Si NO aparecen estos logs:**
- Las URLs no se están extrayendo de la respuesta de FAL AI
- Revisa el log `[360º Background] ❌ WAN: No se encontró URL en la respuesta`
- Revisa la estructura de la respuesta en el log

#### B. Guardado en AppContext (`[AppContext]`):
```
✅ [AppContext] ========================================
✅ [AppContext] Generación 360º completada
✅ [AppContext] Result.wanUrl existe: true/false
✅ [AppContext] Result.wanUrl: ✅ https://... (length: XXX)
✅ [AppContext] Result.klingUrl existe: true/false
✅ [AppContext] Result.klingUrl: ✅ https://... (length: XXX)
✅ [AppContext] ========================================

✅ [AppContext] Guardando view360 para item: ...
✅ [AppContext] newView360.wanUrl existe: true/false
✅ [AppContext] newView360.wanUrl: ✅ https://... (length: XXX)
✅ [AppContext] newView360.klingUrl existe: true/false
✅ [AppContext] newView360.klingUrl: ✅ https://... (length: XXX)
✅ [AppContext] newView360.isReady: true/false
```

**Si NO aparecen estos logs o dicen "❌ NO HAY URL":**
- Las URLs no se están retornando desde `generate360InBackground`
- O no se están guardando en el estado

#### C. Recuperación en tryon-360 (`[TryOn360]`):
```
[TryOn360] ========================================
[TryOn360] selectedItem encontrado: ✅ SÍ / ❌ NO
[TryOn360] view360.wanUrl existe: true/false
[TryOn360] view360.wanUrl: ✅ https://... (length: XXX) / ❌ NO HAY URL
[TryOn360] view360.klingUrl existe: true/false
[TryOn360] view360.klingUrl: ✅ https://... (length: XXX) / ❌ NO HAY URL
[TryOn360] ========================================

[TryOn360] view360DataToPass existe: true/false
[TryOn360] view360DataToPass.wanUrl: ✅ https://... (length: XXX) / ❌ NO HAY URL
[TryOn360] view360DataToPass.klingUrl: ✅ https://... (length: XXX) / ❌ NO HAY URL
```

**Si NO aparecen estos logs o dicen "❌ NO HAY URL":**
- Las URLs no se están recuperando del estado
- O el `selectedItem` no se está encontrando correctamente

#### D. Configuración en Viewer360 (`[Viewer360]`):
```
[Viewer360] view360Data recibido: ...
[Viewer360] ✅ Configurando WAN URL: https://...
[Viewer360] ✅ Configurando KLING URL: https://...
```

**Si NO aparecen estos logs:**
- Las URLs no se están pasando al componente `Viewer360`
- O `view360Data` es `undefined`

---

## 🎯 POSIBLES CAUSAS Y SOLUCIONES

### Causa 1: URLs no se extraen de la respuesta de FAL AI
**Síntoma:** Logs de `[360º Background]` muestran "❌ No se encontró URL"

**Solución:** 
- Revisar la estructura de la respuesta de FAL AI
- Puede que la estructura haya cambiado
- Verificar que `wanResult.data?.video?.url` sea correcto

### Causa 2: URLs no se guardan en el estado
**Síntoma:** Logs de `[AppContext]` muestran "❌ NO HAY URL" al guardar

**Solución:**
- Verificar que `result.wanUrl` y `result.klingUrl` existan antes de guardar
- Verificar que el `itemId` coincida correctamente

### Causa 3: URLs no se recuperan del estado
**Síntoma:** Logs de `[TryOn360]` muestran "❌ NO HAY URL"

**Solución:**
- Verificar que el `selectedItem` se encuentre correctamente
- Verificar que `view360.isReady` esté en `true`
- Verificar que `compositeImage` coincida

### Causa 4: URLs no se pasan al componente
**Síntoma:** Logs de `[Viewer360]` no aparecen o muestran "NO HAY DATOS"

**Solución:**
- Verificar que `view360DataToPass` no sea `undefined`
- Verificar que las URLs existan antes de pasarlas

---

## 📝 INSTRUCCIONES PARA EL USUARIO

1. **Abre la consola del navegador** (F12)
2. **Haz un TryOn** y espera a que se complete la generación 360º
3. **Ve a la pestaña 360º**
4. **Copia TODOS los logs** que empiecen con:
   - `[360º Background]`
   - `[AppContext]`
   - `[TryOn360]`
   - `[Viewer360]`
5. **Pega los logs aquí** para identificar dónde se pierden las URLs

---

**Última actualización:** 2025-02-03
