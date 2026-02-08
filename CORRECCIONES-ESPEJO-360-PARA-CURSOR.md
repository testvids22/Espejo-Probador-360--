# Guía de correcciones Espejo 360 — para usar en Cursor (otro proyecto)

**Objetivo:** Subir este archivo al otro proyecto (p. ej. versión con MediaPipe/TensorFlow) y usar Cursor para aplicar las mismas correcciones y arreglos que ya funcionan en la base Espejo GV360º.

**Uso en Cursor:** Abre este archivo en el otro proyecto y pide: *"Aplica las correcciones del archivo CORRECCIONES-ESPEJO-360-PARA-CURSOR.md"* o ve punto por punto.

---

## Checklist rápido

- [ ] **1. Micrófono:** No bloquear en TryOn ni al marcar favoritos (`mirror.tsx`).
- [ ] **2. Comandos catálogo:** Solo activos con foco en pestaña Catálogo (`catalog.tsx` → `useFocusEffect`).
- [ ] **3. 360 en sesión:** Persistir `triedItems` sin URLs/frames 360 (`AppContext` → `triedItemsForStorage`).
- [ ] **4. 360 con itemId:** Navegar a tryon-360 con `params: { itemId }`; tryon-360 usa `useLocalSearchParams` y prioriza ese ítem.
- [ ] **5. onReady con itemId:** En AppContext, callback de 360 recibe y llama `onReady(itemId)`.
- [ ] **6. Ajustes:** API opcional (nombre + clave), texto persistencia, guardar con `saveApiKeysForExpo(..., optionalApiName, optionalApiKey)`.
- [ ] **7. api-keys-expo:** Tipo retorno y `saveApiKeysForExpo` con `OPTIONAL_API_NAME` y `OPTIONAL_API_KEY`.
- [ ] **8. TTS:** Sustituir "360" por "tres sesenta" en todos los mensajes de voz (mirror + AppContext).

---

## 1. Micrófono sin bloqueo (Espejo)

**Archivo:** `app/(tabs)/mirror.tsx`

**Qué hacer:** Quitar `stopListening()` y `startListening()` durante el TryOn y durante añadir a favoritos.

- **Buscar (TryOn):**  
  `stopListening();` justo antes de `setIsGeneratingTryOn(true);`  
  → **Eliminar** esa línea.

- **Buscar (TryOn finally):**  
  En el `finally` del TryOn, `startListening();`  
  → **Eliminar** esa línea. El `finally` puede quedar solo con `setIsGeneratingTryOn(false);`.

- **Buscar (favoritos):**  
  En la función que hace toggle de favorito (p. ej. `handleToggleFavoriteItem`):  
  `stopListening();` al inicio y `startListening();` en el `finally`.  
  → **Eliminar** ambas. Opcional: dejar un comentario en el `finally` tipo: `// Sin bloqueo de micrófono`.

- **Dependencias:** Quitar `stopListening` y `startListening` del array de dependencias del `useCallback` de TryOn y del de favoritos.

---

## 2. Comandos de catálogo solo con foco en Catálogo

**Archivo:** `app/(tabs)/catalog.tsx`

**Qué hacer:** Los comandos vocales de catálogo (categorías, marcas, "primera", "segunda", "probar [nombre]", etc.) deben registrarse **solo cuando la pestaña Catálogo tiene foco**, y desregistrarse al perder foco.

- **Buscar:** Un `useEffect` que hace `registerCommand` para cosas como `select-category-*`, `select-brand-*`, `catalog-try-first`, `catalog-try-second`, `catalog-try-third`, `catalog-try-fourth`, `catalog-select-generic`, `catalog-try-item-*`, `catalog-clear-search`, y cuyo cleanup hace `unregisterCommand` de esos mismos.

- **Cambiar:** Sustituir ese `useEffect` por un **`useFocusEffect`** con el mismo contenido: al entrar en la pestaña se registran los comandos; al salir (cleanup) se desregistran. Mantener las mismas dependencias (filteredClothes, handleTryOn, categories, etc.).

- **Import:** Asegurar que está `useFocusEffect` de `expo-router` (o de React Navigation).

---

## 3. 360 solo en sesión (no persistir URLs/frames)

**Archivo:** `contexts/AppContext.tsx`

**Qué hacer:** Al guardar `triedItems` en AsyncStorage, no guardar los datos pesados de `view360` (wanUrl, klingUrl, carouselFrames). Así los 360 solo viven en memoria durante la sesión.

- **Añadir** una función helper (p. ej. después de `STORAGE_KEYS`, antes de `DEFAULT_PROFILE`):

```ts
/** Para no persistir vídeos 360º (peso): guardamos solo metadatos; URLs/frames quedan en sesión en memoria. */
function triedItemsForStorage(items: TriedItem[]): TriedItem[] {
  return items.map(ti => ({
    ...ti,
    view360: ti.view360 ? { isReady: false, generating: false } : undefined,
  }));
}
```

- **Buscar** todas las llamadas a `AsyncStorage.setItem(key, JSON.stringify(triedItems))` (o `newTriedItems` / `updatedTriedItems`) donde `key` es la clave de `TRIED_ITEMS` del perfil.

- **Reemplazar** por:  
  `AsyncStorage.setItem(key, JSON.stringify(triedItemsForStorage(triedItems)))`  
  (usando la variable correcta: `newTriedItems`, `updatedTriedItems`, etc.).

Lugares típicos: addTriedItem, markItemAsShared, updateTriedItemWithComposite, start360GenerationForItem (dos sitios: al iniciar generación y al terminar), updateTriedItemView360Frames.

---

## 4. Navegación a 360 con itemId y uso en tryon-360

**Archivo:** `app/(tabs)/mirror.tsx`

**Qué hacer:** Al navegar a la pestaña TryOn 360º, pasar el `itemId` del ítem seleccionado (o del que tiene 360 listo) como parámetro de ruta.

- **Buscar** `router.push('/(tabs)/tryon-360')` (o similar).

- **Reemplazar** por:  
  `router.push({ pathname: '/(tabs)/tryon-360', params: { itemId: <id del ítem> } });`  
  En los sitios donde ya tienes el ítem (p. ej. `itemWithReady360.item.id`, `lastTriedItem.item.id`, o el `itemId` que recibe el callback `openTabWhenReady`), usa ese id. Si no hay ítem: `params: {}`.

**Archivo:** `app/(tabs)/tryon-360.tsx`

- **Import:** Añadir `useLocalSearchParams` de `expo-router`.

- **Al inicio del componente:**  
  `const params = useLocalSearchParams<{ itemId?: string }>();`  
  `const preferredItemId = params.itemId ?? undefined;`

- **En la función que elige qué ítem mostrar** (p. ej. `refreshSelection`):  
  - Si existe `preferredItemId`, buscar en `triedItems` el ítem con ese `item.id`; si tiene `compositeImage`, usarlo como ítem seleccionado.  
  - Si no hay preferido o no se encuentra, mantener la lógica actual (p. ej. el más reciente con 360 listo o el primero).

- **Dependencias:** Incluir `preferredItemId` en las dependencias de ese `useCallback`.

---

## 5. onReady con itemId (AppContext)

**Archivo:** `contexts/AppContext.tsx`

**Qué hacer:** El callback que se llama al terminar la generación 360 debe recibir el `itemId` y pasarlo al abrir la pestaña (para que tryon-360 muestre ese ítem).

- **Buscar** el ref o estado que guarda el callback (p. ej. `on360ReadyOpenTabRef`) y la firma de `start360GenerationForItem` donde se acepta `onReady?: () => void`.

- **Cambiar** a:  
  `onReady?: (itemId?: string) => void`  
  y el ref a: `React.useRef<((itemId?: string) => void) | null>(null)`.

- **Donde se llama al callback** al terminar la generación 360 (dentro del `.then` del resultado), en lugar de `openTab()` llamar:  
  `openTab(itemId)`  
  (usando el `itemId` de la prenda que se generó).

---

## 6. Ajustes: API opcional y persistencia

**Archivo:** `app/(tabs)/settings.tsx`

**Qué hacer:** Añadir dos campos (nombre y clave) para una API opcional (ej. Grok, Wan) y un texto que indique que API Keys, RGPD y permisos son persistentes.

- **Estado:** Añadir `optionalApiName` y `optionalApiKey` (useState string).

- **loadApiKeys:** Tras cargar FAL y Replicate, cargar también `OPTIONAL_API_NAME` y `OPTIONAL_API_KEY` desde `getApiKeysForExpo()` y hacer set de los dos estados.

- **handleSaveApiKeys:** Llamar a `saveApiKeysForExpo(falKey, replicateToken, optionalApiName, optionalApiKey)` (cuatro argumentos).

- **UI:** Debajo del campo Replicate, añadir:  
  - Label "API opcional (ej. Grok, Wan): nombre" y TextInput controlado por `optionalApiName`.  
  - Label "API opcional: clave" y TextInput controlado por `optionalApiKey` (secureTextEntry si quieres).

- **Texto persistencia:** En el subtítulo o encima de Claves API, añadir una línea tipo: "API Keys, permisos Android y RGPD (se guardan de forma persistente)" y/o "En web puedes usar aquí tus keys; en build se usan .env o Vercel. No se borran al borrar perfil."

---

## 7. api-keys-expo: API opcional

**Archivo:** `lib/api-keys-expo.ts`

**Qué hacer:** Que las keys incluyan API opcional y que se guarden.

- **DEFAULT_API_KEYS / tipo retorno:** Asegurar que hay `OPTIONAL_API_NAME: ''` y `OPTIONAL_API_KEY: ''` y que `getApiKeysForExpo()` devuelve esos dos campos (string).

- **Al leer de AsyncStorage:** Si existe config guardada, devolver también `OPTIONAL_API_NAME` y `OPTIONAL_API_KEY` (o string vacío).

- **saveApiKeysForExpo:** Firma con cuatro parámetros: `falKey`, `replicateToken`, `optionalApiName`, `optionalApiKey` (los dos últimos opcionales por defecto `''`). Guardar en AsyncStorage los cuatro en el mismo objeto bajo `API_CONFIG_KEY`.

---

## 8. TTS: "tres sesenta" en lugar de "360"

**Qué hacer:** En todos los mensajes que se leen en voz alta, sustituir el número "360" por las palabras "tres sesenta" (o "de tres sesenta") para que el TTS no diga "sexta", "sexagésimos", etc.

**Archivos a revisar:**  
`app/(tabs)/mirror.tsx`, `contexts/AppContext.tsx` (y cualquier otro que use `Speech.speak` o `speakMirrorConfirmation` con texto que contenga "360").

**Sustituciones típicas:**

- "Abriendo vista 360." → "Abriendo vista de tres sesenta."
- "Vista 360 lista." → "Vista de tres sesenta lista."
- "Preparando vista 360. Se abrirá cuando esté lista." → "Preparando vista de tres sesenta. Se abrirá cuando esté lista."
- "Di sí quiero para generar la vista 360 de esta prenda." → "Di sí quiero para generar la vista de tres sesenta de esta prenda."
- "Primero prueba una prenda y luego di sí quiero para generar la vista 360." → "...vista de tres sesenta."
- "ve a la pestaña 360 grados" → "ve a la pestaña de tres sesenta grados"
- "Vista 360 lista. Ya puedes ver cómo te queda desde todos los ángulos." → "Vista de tres sesenta lista. Ya puedes ver cómo te queda desde todos los ángulos."

Buscar en el proyecto por cadenas que contengan `360` y que se pasen a `speak` o a una función de confirmación por voz, y aplicar el reemplazo solo en el texto hablado (no en textos de UI como "Ver 360º").

---

## Orden sugerido al aplicar

1. api-keys-expo (tipos y save).
2. AppContext (triedItemsForStorage + onReady con itemId).
3. settings (API opcional y textos).
4. mirror (micrófono, router.push con itemId, TTS).
5. tryon-360 (useLocalSearchParams, preferredItemId).
6. catalog (useFocusEffect para comandos).
7. Revisar de nuevo TTS en mirror y AppContext.

Si en tu proyecto avanzado algún archivo tiene otra ruta (p. ej. `screens/Mirror.tsx`), adapta las rutas; la lógica descrita es la misma.
