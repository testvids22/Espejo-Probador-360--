# Plan: Sustitución de 3 Primeras Pantallas RORK

**Fecha:** 02/02/2026

---

## 🎯 OBJETIVO

Sustituir las 3 primeras pantallas de RORK con el modelo de Orchids, **MANTENIENDO** la sincronización con el perfil.

---

## 📋 PANTALLAS A SUSTITUIR

### **1. Boot (Pantalla Inicio/Logo)**
- **Archivo actual:** `app/index.tsx`
- **Reemplazar con:** Modelo de Orchids (más simple y profesional)
- **Mantener:** Lógica de redirección a login/consentimiento

### **2. Condiciones (Consentimiento RGPD)**
- **Archivo actual:** `app/login.tsx` o `components/GDPRConsentForm.tsx`
- **Reemplazar con:** `ConsentForm.tsx` de Orchids
- **Mantener:** Sincronización con perfil

### **3. Relleno Consentimiento (Formulario)**
- **Archivo actual:** `components/GDPRConsentForm.tsx`
- **Reemplazar con:** Formulario de `ConsentForm.tsx` de Orchids
- **Mantener:** Sincronización con perfil

---

## ⚠️ SINCRONIZACIÓN IMPORTANTE (NO PERDER)

### **1. Datos Consentimiento → PERFIL**

**Función:** `updateUserProfile` en `AppContext.tsx`

```typescript
updateUserProfile({
  name: consent.fullName,
  email: consent.email,
  // ... otros datos del consentimiento
});
```

**Datos a sincronizar:**
- Nombre completo → `userProfile.name`
- Email → `userProfile.email` (si existe)
- Firma → Guardar en perfil (si es necesario)

### **2. Primera Foto Capturada → MINIATURA PERFIL**

**Lógica actual:**
- Primera foto se captura en `scanner.tsx`
- Se guarda en `scanData.photos[0]`
- **NECESITA:** Asignar automáticamente a `userProfile.avatar`

**Implementación:**
```typescript
// En scanner.tsx, después de capturar primera foto
if (capturedPhotos.length === 1) {
  const firstPhoto = capturedPhotos[0];
  await updateUserProfile({ avatar: firstPhoto });
}
```

---

## 🔧 IMPLEMENTACIÓN

### **PASO 1: Reemplazar Boot Screen**

**Archivo:** `app/index.tsx`
- Usar modelo más simple de Orchids
- Mantener lógica de redirección
- Redirigir a login/consentimiento si no está autenticado

### **PASO 2: Reemplazar ConsentForm**

**Archivo:** `components/ConsentForm360.tsx` (nuevo)
- Copiar `ConsentForm.tsx` de Orchids
- **AGREGAR:** Sincronización con perfil después de consentir
- **AGREGAR:** Lógica para asignar primera foto al avatar

### **PASO 3: Actualizar Scanner**

**Archivo:** `app/(tabs)/scanner.tsx`
- **AGREGAR:** Lógica para asignar primera foto al avatar del perfil
- Mantener resto de funcionalidad

### **PASO 4: Verificar Sincronización**

**Archivo:** `contexts/AppContext.tsx`
- Verificar que `updateUserProfile` funciona correctamente
- Asegurar que avatar se actualiza en perfil

---

## ✅ CHECKLIST

- [ ] Reemplazar boot screen (app/index.tsx)
- [ ] Crear ConsentForm360.tsx basado en Orchids
- [ ] Agregar sincronización datos consentimiento → perfil
- [ ] Agregar lógica primera foto → avatar perfil
- [ ] Actualizar scanner para asignar foto al avatar
- [ ] Verificar que perfil se actualiza correctamente
- [ ] Probar flujo completo
- [ ] Probar en web
- [ ] Probar en Android

---

## 🚨 PRECAUCIONES

1. **NO perder sincronización con perfil**
2. **NO perder asignación de primera foto al avatar**
3. **Mantener estructura de datos del perfil**
4. **Probar que perfil se actualiza correctamente**

---

**Última actualización:** 02/02/2026
