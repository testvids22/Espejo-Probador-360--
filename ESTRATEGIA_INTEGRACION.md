# Estrategia de Integración 360º en RORK

**Fecha:** 02/02/2026

---

## ✅ CONFIRMADO

### **TryOn en RORK:**
- **API:** `toolkit.rork.com/images/edit/` (propia de RORK)
- **NO es FLUX ni FASHN**
- Genera `compositeImage`
- A veces añade marca de agua en pie de foto (derecha)

### **Pestaña Espejo (NO TOCAR):**
- Vista de comparación
- Vista 360º (2D) - rotación manual
- Carrusel de prendas probadas
- TryOn actual (con marca de agua)
- **Funciona correctamente - NO MODIFICAR**

---

## 🎯 NUEVA PESTAÑA "360º"

### **Estructura:**

```
app/(tabs)/
├── home.tsx (existente)
├── scanner.tsx (existente)
├── catalog.tsx (existente)
├── mirror.tsx (existente - NO TOCAR)
├── profile.tsx (existente)
└── tryon-360.tsx (NUEVA) ← Funcionalidades 360º de Orchids
```

### **Funcionalidades:**

1. **Photo Capture (MediaPipe)**
   - Captura con detección de pose
   - Vertical 9:16
   - Carga desde galería

2. **TryOn (FASHN V1.6)**
   - Modelo: `fal-ai/fashn/tryon/v1.6` (como Orchids)
   - Sin marca de agua
   - Prompt completo

3. **Limpieza de Marca de Agua**
   - Detectar en pie de foto (derecha)
   - Recortar o inpaint
   - Aplicar antes de WAN/KLING

4. **WAN (Fashion Spin)**
   - Giro 360º con efecto vuelo
   - 81 frames, 9:16

5. **KLING (Video Técnico)**
   - Rotación técnica 360º
   - 5 segundos, 9:16

6. **Carrusel 360º Real**
   - Extracción de 12 frames
   - Navegación interactiva
   - MediaPipe tracking

---

## 🔧 IMPLEMENTACIÓN

### **PASO 1: Crear Nueva Pestaña**

**Archivo:** `app/(tabs)/tryon-360.tsx`

**Agregar a `_layout.tsx`:**
```typescript
<Tabs.Screen
  name="tryon-360"
  options={{
    title: "360º",
    tabBarIcon: ({ color }) => <RotateCw size={24} color={color} />,
  }}
/>
```

### **PASO 2: Copiar Componentes de Orchids**

1. `PhotoCapture.tsx` → `components/PhotoCapture360.tsx`
2. `Viewer360.tsx` → `components/Viewer360.tsx`
3. Adaptar imports y rutas

### **PASO 3: Implementar Limpieza**

**Función:** `lib/image-cleanup.ts`
```typescript
export async function cleanWatermark(imageUrl: string): Promise<string> {
  // Detectar marca de agua (área inferior derecha)
  // Recortar o inpaint
  // Devolver imagen limpia
}
```

**Aplicar antes de WAN:**
```typescript
const cleanedImage = await cleanWatermark(tryOnImageUrl);
await generateWAN(cleanedImage);
```

### **PASO 4: Configurar APIs**

- TryOn: FASHN V1.6 (como Orchids)
- WAN: wan-i2v
- KLING: kling-video/v2.6/pro
- Variables de entorno en Vercel

---

## 🔐 API KEYS

**En Vercel (variables de entorno):**
```
EXPO_PUBLIC_FAL_KEY = [CONFIGURAR_EN_VERCEL]
EXPO_PUBLIC_REPLICATE_API_TOKEN = [CONFIGURAR_EN_VERCEL]
```

---

## ✅ CHECKLIST

- [ ] Proyecto copiado a `soluciones CURSOR`
- [ ] Probar en web primero
- [ ] Crear nueva pestaña `tryon-360`
- [ ] Copiar componentes de Orchids
- [ ] Implementar limpieza de marca de agua
- [ ] Integrar APIs (FASHN, WAN, KLING)
- [ ] Configurar MediaPipe
- [ ] Agregar a navegación
- [ ] Desplegar en Vercel
- [ ] Probar

---

## 🚨 PRECAUCIONES

1. **NO tocar pestaña "Espejo"** existente
2. **NO tocar TryOn actual** de RORK
3. **NO mezclar repositorios** en GitHub
4. **Probar en web primero** antes de integrar
5. **Limpieza de marca de agua** antes de WAN/KLING

---

**Última actualización:** 02/02/2026
