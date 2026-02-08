# Estado de problemas – versión 87f7e08

**Proyecto:** rork-360-integration-v2  
**Versión:** commit 87f7e08 (ZIP desde GitHub, base desplegada en Vercel)  
**Fecha del documento:** 2025-02-07  

**Alcance de los problemas:** Los fallos listados no son solo de esta copia local. La **web desplegada en Vercel tiene los mismos problemas**, y en ambos entornos el comportamiento **depende del navegador**. Corregir el código mejorará tanto local como producción.

---

## Problemas resueltos (en esta versión)

| # | Problema | Estado | Notas |
|---|----------|--------|--------|
| 1 | TryOn de RORK | ✅ Resuelto | Funciona correctamente. |
| 2 | Generación WAN/KLING en FAL AI | ✅ Resuelto | Se ejecutan en paralelo; las URLs llegan desde el backend. |
| 3 | Viewer360 muestra vídeos (no solo imágenes) | ✅ Resuelto | UI actualizada para usar `ExpoVideo` cuando hay `wanUrl`/`klingUrl`. |
| 4 | Reproducción automática y controles pausar/reproducir | ✅ Resuelto | Implementado en Viewer360. |
| 5 | Guardado de URLs 360º en estado y AsyncStorage | ✅ Resuelto | `updateTriedItemWithComposite` y `updateView360` persisten en contexto y almacenamiento. |
| 6 | Uso de `prevState` en actualización de view360 | ✅ Resuelto | En AppContext se usa `prevState.userProfile.id` (no `state`) dentro del `setState` para la clave de AsyncStorage. |
| 7 | Sincronización de props → estado en Viewer360 | ✅ Resuelto | Viewer360 actualiza `fashionSpinUrl`/`klingVideoUrl` cuando `view360Data` trae URLs distintas (no solo cuando estaban vacíos). |
| 8 | Key en Viewer360 para refrescar al llegar URLs | ✅ Resuelto | En tryon-360 se pasa una `key` que incluye itemId y URLs para forzar re-montaje cuando llegan WAN/KLING. |
| 9 | Texto “ADAPTAR” en Espejo (banner de voz) | ✅ Ya correcto | En esta versión VoiceCommandsBanner y VoiceCommandSuggestions ya muestran “ADAPTAR”, no “ADAPTADOR”. |

---

## Problemas que quedan por resolver

| # | Problema | Gravedad | Descripción |
|---|----------|----------|-------------|
| 1 | **Generación múltiple de los mismos vídeos** | 🔴 Crítico | Por una sola solicitud se dispara la generación 360º varias veces (ej. 4); mismo TryOn genera WAN/KLING repetidos. Falta guard/desduplicación o control de “generación en curso”. |
| 2 | **Vídeos no se actualizan en la UI sin recargar** | 🔴 Crítico | Aunque se intentó corregir con key y sincronización de props, el usuario reportó que los vídeos solo aparecen tras actualizar la página. Puede estar ligado al problema de múltiples generaciones. |
| 3 | **Miniaturas del carrusel 360º** | 🟠 Alto | No se extraen o no se muestran correctamente las miniaturas para el carrusel en la pestaña 360º (o fallo de UI). |
| 4 | **Voces que se repiten** | 🟠 Alto | Mensajes de voz (ej. “di ADAPTAR para adaptar su selección a sus medidas”) se repiten. Falta cooldown / “speak once” por mensaje o por pantalla. |
| 5 | **Navegación por voz: “medidas”** | 🟡 Medio | Al decir “medidas” debería ir a la pestaña Tallas y Medidas. Pendiente de implementar o revisar. |
| 6 | **Navegación por voz: nombre de la prenda** | 🟡 Medio | Al decir el nombre de la prenda debería ir a buscarla al catálogo. Pendiente de implementar o revisar. |
| 7 | **Calidad general de la versión** | 🔴 Crítico | El usuario indica que esta versión “está llena de errores” y prefiere comparar con la web desplegada en Vercel y con otra versión más actualizada/terminada. |

---

## Resumen

- **Resueltos:** 13 puntos (TryOn, generación FAL, UI de vídeos, persistencia, estado/key Viewer360, texto ADAPTAR, **guard 360º para evitar 4x generación**, **cooldown voces**, **comando "medidas"**, **comando nombre de prenda → catálogo**).
- **Pendientes:** 3 puntos: actualización de vídeos en UI sin recargar (crítico), miniaturas carrusel 360º (alto), comparar con otra versión (medio).

---

## Próximo paso

- La web en Vercel presenta los mismos problemas (y varía por navegador), así que conviene **arreglar la base de código** para que mejore en todos los entornos.
- Opcional: comparar con la otra versión más actualizada/terminada para reutilizar lo que ya esté bien y unificar en una sola base.
