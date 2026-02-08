# Requisitos Completos - RORK 360 Integration

**Fecha:** 02/02/2026

---

## 🎯 SISTEMA OBJETIVO

- **Plataforma:** Android 11 OTA con Play Store
- **Hardware:** Espejo 2m altura x 60cm ancho
- **Pantalla:** Interactiva 43" vertical
- **IMPRESCINDIBLE:** Todas las informaciones vocales y comandos vocales

---

## ✅ CONFIGURACIÓN NECESARIA

### **1. Permisos Android (TODOS)**

**Basado en Orchids:**
- ✅ Cámara
- ✅ Micrófono (RECORD_AUDIO)
- ✅ Almacenamiento (READ/WRITE_EXTERNAL_STORAGE)
- ✅ Internet
- ✅ Notificaciones (POST_NOTIFICATIONS)
- ✅ Mostrar sobre otras apps (SYSTEM_ALERT_WINDOW)
- ✅ Modificar ajustes del sistema (WRITE_SETTINGS)
- ✅ Ignorar optimización de batería (REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
- ✅ Servicios en primer plano (FOREGROUND_SERVICE)
- ✅ Wake Lock
- ✅ Acceso a red/WiFi

### **2. Configuración RGPD (MEJORADA)**

**Problema en Orchids:**
- El documento RGPD se muestra en área pequeña (max-h-48)
- No se puede ver completo antes de firmar
- El modelo anterior ya no permite visualizar antes de firmar

**Solución para RORK:**
- ✅ Vista completa del documento ANTES de firmar
- ✅ Modal/pantalla completa para leer todo el contenido
- ✅ Scroll completo del documento
- ✅ Editar configuración RGPD desde configuración
- ✅ Cargar actualización de reglamento cuando cambia
- ✅ Modelo más amplio que Orchids

### **3. Comandos Vocales (IMPRESCINDIBLE)**

**Deben funcionar:**
- ✅ Todas las informaciones vocales
- ✅ Todos los comandos vocales
- ✅ Navegación por voz
- ✅ Confirmaciones vocales
- ✅ Text-to-Speech en Android

---

## 📋 ESTRUCTURA DE CONFIGURACIÓN

### **Pestañas (como Orchids):**

1. **APIs & Claves** (mantener como Orchids)
   - FAL.ai API Key
   - Replicate API Token
   - API Personalizada

2. **Permisos Android** (mantener como Orchids)
   - Mostrar sobre otras apps
   - Modificar ajustes del sistema
   - Notificaciones
   - Servicios en primer plano

3. **RGPD** (MEJORAR)
   - Editar documento completo
   - Cargar actualización
   - Exportar/Importar
   - **Vista completa antes de firmar** ← NUEVO

---

## 🔧 IMPLEMENTACIÓN

### **PASO 1: Crear Pestaña Configuración**

**Archivo:** `app/(tabs)/configuracion.tsx`

**Estructura:**
- 3 pestañas (APIs, Permisos, RGPD)
- Basado en Orchids pero mejorado

### **PASO 2: Mejorar ConsentForm**

**Archivo:** `components/ConsentForm360.tsx`

**Mejoras:**
- Modal de pantalla completa para ver documento completo
- Scroll completo del documento
- Vista previa completa antes de firmar
- Botón "Ver documento completo" que abre modal grande

### **PASO 3: Asegurar Permisos Android**

**Archivo:** `android/app/src/main/AndroidManifest.xml`

**Todos los permisos:**
- Ver AndroidManifest.xml de Orchids como referencia

### **PASO 4: Asegurar Comandos Vocales**

**Archivo:** `contexts/VoiceContext.tsx`

**Verificar:**
- Text-to-Speech funciona
- Speech Recognition funciona
- Comandos registrados correctamente

---

## ✅ CHECKLIST

- [ ] Crear pestaña configuración
- [ ] Implementar permisos Android (TODOS)
- [ ] Mejorar RGPD con vista completa
- [ ] Asegurar comandos vocales funcionando
- [ ] Probar en web
- [ ] Probar en Android

---

**Última actualización:** 02/02/2026
