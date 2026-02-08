# Plan: Limpieza de Marca de Agua antes de WAN

**Fecha:** 02/02/2026  
**Problema:** Marca de agua en pie de foto (derecha) molesta para carrusel/videos 360º

---

## 🔍 PROBLEMA IDENTIFICADO

**En RORK:**
- TryOn genera `compositeImage`
- A veces añade marca de agua en pie de foto (derecha)
- Esta marca molesta para:
  - Carrusel 360º
  - Videos WAN
  - Videos KLING

---

## ✅ SOLUCIÓN

### **Limpieza antes de procesar WAN/KLING:**

1. **Detectar marca de agua:**
   - Buscar en área inferior derecha
   - Detectar texto/branding
   - Detectar fondo no deseado

2. **Limpiar imagen:**
   - Opción A: Recortar área de marca de agua
   - Opción B: Inpaint (rellenar con IA)
   - Opción C: Recortar imagen completa

3. **Procesar con imagen limpia:**
   - WAN con imagen sin marca
   - KLING con imagen sin marca
   - Carrusel sin marca de agua

---

## 🔧 IMPLEMENTACIÓN

### **Función de Limpieza:**

```typescript
async function cleanWatermark(imageUrl: string): Promise<string> {
  // 1. Cargar imagen
  // 2. Detectar marca de agua (área inferior derecha)
  // 3. Recortar o inpaint
  // 4. Devolver imagen limpia
}
```

### **Aplicar antes de WAN:**

```typescript
// En Viewer360.tsx
const cleanedImage = await cleanWatermark(tryOnImageUrl);
await generateWAN(cleanedImage);
await generateKLING(cleanedImage);
```

---

## 📋 CHECKLIST

- [ ] Identificar dónde se genera marca de agua
- [ ] Crear función de detección
- [ ] Crear función de limpieza
- [ ] Integrar antes de WAN/KLING
- [ ] Probar que funciona

---

**Última actualización:** 02/02/2026
