# Estructura Configuración RORK

**Fecha:** 02/02/2026

---

## ✅ ESTRUCTURA CONFIRMADA

### **3 Pestañas:**

1. **APIs & Claves** (como Orchids)
   - FAL.ai API Key
   - Replicate API Token
   - API Personalizada / Pollo AI
   - Guardar APIs

2. **Permisos Android** (como Orchids)
   - Mostrar sobre otras aplicaciones
   - Modificar ajustes del sistema
   - Notificaciones
   - Servicios en Primer Plano
   - Botones para configurar cada permiso

3. **RGPD** (MEJORADO)
   - Versión y última actualización
   - Datos de empresa
   - Responsable del Tratamiento (DPO)
   - Días de retención
   - **Botón "Ver política completa"** ← Muestra/oculta en misma ventana
   - Contenido del documento RGPD
   - Cargar/Exportar/Resetear/Guardar

---

## 🔧 FUNCIONALIDAD RGPD

### **En ConsentForm (antes de firmar):**

```typescript
// Botón para mostrar/ocultar política completa
<button onClick={() => setShowFullRgpd(!showFullRgpd)}>
  {showFullRgpd ? 'Ocultar política completa' : 'Ver política de privacidad completa'}
</button>

// Área expandible con scroll completo
{showFullRgpd && (
  <div className="mt-3 p-4 bg-black/30 rounded-lg text-white/70 text-xs max-h-96 overflow-y-auto whitespace-pre-wrap">
    {rgpdConfig.content}
  </div>
)}
```

**Mejora para RORK:**
- Aumentar `max-h-96` a `max-h-[80vh]` para pantalla completa
- Permitir scroll completo del documento
- Mantener en misma ventana (no modal separado)

---

## 📋 IMPLEMENTACIÓN

### **Archivo:** `app/(tabs)/configuracion.tsx`

**Estructura:**
- 3 pestañas (APIs, Permisos, RGPD)
- Basado en Orchids pero mejorado
- RGPD con vista completa expandible

### **Archivo:** `components/ConsentForm360.tsx`

**Mejoras:**
- Botón "Ver política completa" más visible
- Área expandible más grande (max-h-[80vh])
- Scroll completo del documento
- Mantener en misma ventana

---

## ✅ CHECKLIST

- [ ] Crear pestaña configuración con 3 tabs
- [ ] Implementar pestaña APIs (como Orchids)
- [ ] Implementar pestaña Permisos Android (como Orchids)
- [ ] Implementar pestaña RGPD con ver/ocultar
- [ ] Mejorar ConsentForm con vista completa
- [ ] Probar en web
- [ ] Probar en Android

---

**Última actualización:** 02/02/2026
