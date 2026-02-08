# Modelo RGPD Final - RORK

**Fecha:** 02/02/2026

---

## ✅ MODELO CONFIRMADO (MANTENER COMO ORCHIDS)

### **RGPD en ConsentForm:**

**Estructura:**
```tsx
<button onClick={() => setShowFullRgpd(!showFullRgpd)}>
  {showFullRgpd ? 'Ocultar política completa' : 'Ver política de privacidad completa'}
</button>

{showFullRgpd && (
  <div className="mt-3 p-4 bg-black/30 rounded-lg text-white/70 text-xs max-h-48 overflow-y-auto whitespace-pre-wrap">
    {rgpdConfig.content}
  </div>
)}
```

**Características:**
- ✅ Botón "Ver/Ocultar política completa"
- ✅ `max-h-48 overflow-y-auto` (scroll funciona perfectamente)
- ✅ Misma ventana (no modal separado)
- ✅ NO cambiar tamaño - funciona bien como está

---

## 📋 ESTRUCTURA CONFIGURACIÓN (3 PESTAÑAS)

### **1. APIs & Claves** (como Orchids)
- FAL.ai API Key
- Replicate API Token
- API Personalizada / Pollo AI
- Guardar APIs

### **2. Permisos Android** (como Orchids)
- Mostrar sobre otras aplicaciones
- Modificar ajustes del sistema
- Notificaciones
- Servicios en Primer Plano
- Botones para configurar cada permiso

### **3. RGPD** (como Orchids)
- Versión y última actualización
- Datos de empresa
- Responsable del Tratamiento (DPO)
- Días de retención
- Contenido del documento RGPD
- Cargar/Exportar/Resetear/Guardar

---

## 🔧 IMPLEMENTACIÓN

### **Archivo:** `app/(tabs)/configuracion.tsx`

**Replicar exactamente:**
- 3 pestañas (APIs, Permisos, RGPD)
- Basado en Orchids `configuracion/page.tsx`
- Mantener estructura y estilos

### **Archivo:** `components/ConsentForm360.tsx`

**Replicar exactamente:**
- Botón "Ver/Ocultar política completa"
- Área expandible con `max-h-48 overflow-y-auto`
- Basado en Orchids `ConsentForm.tsx`
- NO cambiar tamaño - funciona bien

---

## ✅ CHECKLIST

- [ ] Crear pestaña configuración con 3 tabs
- [ ] Implementar pestaña APIs (como Orchids)
- [ ] Implementar pestaña Permisos Android (como Orchids)
- [ ] Implementar pestaña RGPD (como Orchids)
- [ ] Replicar ConsentForm con botón ver/ocultar
- [ ] Mantener max-h-48 (scroll funciona)
- [ ] Probar en web
- [ ] Probar en Android

---

**Última actualización:** 02/02/2026
