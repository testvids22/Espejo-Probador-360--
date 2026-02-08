# Plan 360º – Flujo, miniaturas y alternativa xAI Grok

**Fecha:** 2025-02-07

---

## 1. Flujo actual y cambios

### Orden WAN vs KLING
- Hoy se lanzan **en paralelo** (`Promise.allSettled`). Quien termine antes devuelve antes; por eso a veces KLING “llega” antes que WAN.
- **Cambio aplicado:** Se mantiene paralelo para no alargar el tiempo total. La UI ya muestra el primer vídeo que llegue (WAN o KLING) según `activeVideoSource` y las URLs en estado. Si quieres priorizar uno: se puede mostrar KLING cuando exista y usar WAN como respaldo, o al revés.
- **KLING:** En FAL v2.6 la duración mínima es **5 s** (opciones 5 o 10). Dejamos 5 s para una vuelta 360º y menos coste.

### Sin audio
- **Reproducción:** Todos los `<video>` y `ExpoVideo` en Viewer360 usan **muted={true}** para no reproducir audio.
- **Generación:** En FAL, Kling v2.6 admite **`generate_audio: false`** (más barato y sin audio). Aplicado en `generate-360-background.ts` y en la llamada a Kling dentro de Viewer360.
- WAN (wan-i2v) no documenta audio en la API; si en el futuro se añade, se puede desactivar igual.

### Miniaturas: solo Frontal, Lateral, Trasera
- **Frontal:** Siempre la imagen del TryOn (`tryOnImageUrl`) como fallback para que no se quede en negro cuando aún no hay frames extraídos. Cuando haya carrusel, el frame 0 puede ser frontal.
- **Lateral y Trasera:** Se rellenan con frames extraídos del vídeo (KLING o WAN): por ejemplo índices `length/3` y `2*length/3` para repartir la rotación.
- Las miniaturas van en una **fila fija arriba** (como en tu captura: 3 cajas verdes horizontales), **sin superponer** las dos vistas grandes y **sin cambiar** el tamaño de estas. Debajo sigue la fila de las dos vistas principales y, si se desea, el carrusel horizontal de todos los frames.

---

## 2. Ubicación de las miniaturas (pestaña 360º)

Según tu corrección visual:

- **Fila superior:** 3 huecos en horizontal: **Miniatura Frontal** | **Lateral** | **Trasera**, por encima de las vistas grandes, sin invadirlas.
- **Vistas grandes:** Sin cambio de tamaño; las miniaturas no se superponen a ellas.

Implementación en `Viewer360.tsx`:
- En vista **Dividida**: una fila superior con 3 slots (Frontal = `tryOnImageUrl` por defecto, Lateral/Trasera = frames del carrusel cuando existan).
- Misma idea aplicable a vista **Completa** si se quiere la misma barra arriba.

---

## 3. xAI Grok (Imagine) como alternativa a WAN/KLING

**Qué hay hoy:** xAI ofrece **Grok Imagine** con imagen → vídeo (p. ej. 6 s, con o sin audio), vía API (PoYo u otros). Es rápido y en muchos casos más barato que WAN/KLING en FAL.

**Ventajas para este proyecto:**
- Menor coste y menor tiempo de generación.
- Un solo proveedor (Grok) en lugar de WAN + KLING.
- Con un buen prompt de “giro 360º fashion / vuelo de ropa” se pueden extraer después 3 frames (frontal, lateral, trasera) para las miniaturas.

**Qué haría falta:**
- API key de xAI (o del agregador que uses, p. ej. PoYo).
- Un módulo `generate-360-grok.ts` (o similar) que llame a imagen→vídeo, reciba la URL del vídeo y, en frontend o backend, extraiga los frames (igual que ahora con `extractFramesFromVideo`).
- En AppContext/Viewer360: elegir proveedor (FAL vs Grok) por config o variable de entorno para no romper el flujo actual.

**Conclusión:** Es viable sustituir WAN y KLING por Grok Imagine (imagen→vídeo) para ahorro y simplicidad. Se puede dejar como **opción futura**: mismo flujo TryOn → generación 360º → extracción de frames para miniaturas; solo cambia el backend (Grok en lugar de FAL). En esta versión no usamos MediaPipe/TensorFlow para seguimiento; el prompt de “giro efecto vuelo de ropa fashion 360º” encaja con ese uso.

---

## 4. Resumen de cambios aplicados en código

| Cambio | Archivo |
|--------|--------|
| KLING sin audio | `lib/generate-360-background.ts`: `generate_audio: false` |
| KLING sin audio (generación desde Viewer360) | `components/Viewer360.tsx`: mismo parámetro en llamada a FAL Kling |
| Vídeos mudos en reproducción | `components/Viewer360.tsx`: `muted={true}` en todos los `<video>` y `ExpoVideo` |
| Fila superior de 3 miniaturas (Frontal / Lateral / Trasera) | `components/Viewer360.tsx`: en vista Dividida, fila arriba sin tapar vistas grandes |
| Frontal que no se quede en negro | Frontal = `tryOnImageUrl` por defecto; solo se sustituye por frame 0 cuando haya carrusel válido |

Cuando tengas la otra versión para comparar, se puede revisar si este layout de miniaturas coincide con tus correcciones visuales y ajustar solo posiciones o estilos si hace falta.
