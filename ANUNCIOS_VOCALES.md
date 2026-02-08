# Anuncios Vocales - Integración 360º

**Fecha:** 02/02/2026

---

## ✅ TODOS LOS ANUNCIOS VOCALES IMPLEMENTADOS

### **1. INICIO DE GENERACIÓN 360º**
**Cuándo:** Al guardar `compositeImage` en `AppContext.tsx`
```
"Iniciando generación de vista 360 grados en segundo plano. Te avisaré cuando esté lista."
```

### **2. WAN COMPLETADO**
**Cuándo:** Cuando WAN (Fashion Spin) termina de generarse
```
"Giro Fashion WAN completado. Iniciando generación del video técnico KLING."
```

### **3. KLING COMPLETADO**
**Cuándo:** Cuando KLING (Video Técnico) termina de generarse
```
"Video técnico KLING completado. Extrayendo frames para el carrusel 360 grados."
```

### **4. CARRUSEL LISTO**
**Cuándo:** Cuando se extraen los frames del carrusel
```
"Carrusel 360 grados listo. Ya puedes navegar por todas las vistas de la prenda."
```

### **5. NOTIFICACIÓN 360º LISTA (Múltiples anuncios)**
**Cuándo:** Cuando el 360º completo está listo y aparece la notificación

**a) Anuncio inicial:**
```
"¡Tu vista 360 grados está lista! La prenda [NOMBRE] ya tiene su giro completo disponible. Puedes ver el Fashion Spin y el video técnico. Te redirigiré automáticamente en 5 segundos, o pulsa el botón para ir ahora."
```

**b) Cuenta regresiva (a los 2 segundos):**
```
"Redirigiendo a la vista 360 grados en 3, 2, 1..."
```

**c) Redirección automática (a los 5 segundos):**
```
"Abriendo vista 360 grados."
```

### **6. BOTONES DE NOTIFICACIÓN**

**Botón "Ver 360º":**
```
"Abriendo vista 360 grados ahora."
```

**Botón "✕" (Cerrar):**
```
"Notificación cerrada. Puedes seguir probando prendas. La vista 360 grados seguirá disponible en la pestaña correspondiente."
```

### **7. CARGA DE DATOS PRECARGADOS**
**Cuándo:** Al entrar a la pestaña 360º con datos ya generados
```
"Cargando vista 360 grados. Mostrando Fashion Spin, video técnico y carrusel."
```

### **8. INICIO DE GENERACIÓN EN VIEWER360**
**Cuándo:** Si no hay datos precargados y se inicia generación
```
"Iniciando generación de vista 360 grados. Esto puede tardar unos minutos. Te avisaré cuando cada parte esté lista."
```

### **9. CONTROLES EN VIEWER360**

**Auto-rotación activada:**
```
"Auto-rotación activada. El carrusel rotará automáticamente."
```

**Auto-rotación pausada:**
```
"Auto-rotación pausada. Puedes navegar manualmente."
```

**Seguimiento activado:**
```
"Seguimiento en tiempo real activado. El carrusel seguirá tu movimiento."
```

**Seguimiento desactivado:**
```
"Seguimiento en tiempo real desactivado. El carrusel rotará automáticamente."
```

### **10. ERRORES**

**Error al extraer frames:**
```
"Error al extraer frames del video. Intenta de nuevo más tarde."
```

---

## 🎯 FLUJO COMPLETO CON ANUNCIOS VOCALES

1. **Usuario prueba prenda → TryOn se guarda**
   - 🔊 "Iniciando generación de vista 360 grados en segundo plano..."

2. **WAN completado**
   - 🔊 "Giro Fashion WAN completado. Iniciando generación del video técnico KLING."

3. **KLING completado**
   - 🔊 "Video técnico KLING completado. Extrayendo frames para el carrusel 360 grados."

4. **Carrusel listo**
   - 🔊 "Carrusel 360 grados listo. Ya puedes navegar por todas las vistas de la prenda."

5. **Notificación aparece**
   - 🔊 "¡Tu vista 360 grados está lista! La prenda [NOMBRE] ya tiene su giro completo disponible..."
   - 🔊 (2 seg después) "Redirigiendo a la vista 360 grados en 3, 2, 1..."
   - 🔊 (5 seg después) "Abriendo vista 360 grados."

6. **Usuario en pestaña 360º**
   - 🔊 "Cargando vista 360 grados. Mostrando Fashion Spin, video técnico y carrusel."

7. **Controles interactivos**
   - 🔊 Anuncios al activar/desactivar auto-rotación y seguimiento

---

## 📋 CONFIGURACIÓN

Todos los anuncios usan:
- **Idioma:** `es-ES`
- **Velocidad:** `0.9` (normal) o `1.0` (rápido para cuenta regresiva)
- **Tono:** `1.0` (normal)

---

**Última actualización:** 02/02/2026
