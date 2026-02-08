# Cómo Probar la Versión 2.0 - Integración 360º

**Fecha:** 02/02/2026

---

## 🚀 PASOS PARA PROBAR

### **1. Iniciar el Proyecto**

```bash
cd "C:\Users\SAPad\soluciones CURSOR\rork-360-integration-v2"
npm start
# o
bunx rork start
```

### **2. Flujo de Prueba Completo**

#### **Paso 1: Probar Prenda en Espejo (RORK)**
1. Abre la app
2. Ve a la pestaña **"Espejo"**
3. Selecciona una prenda del catálogo
4. RORK hace el TryOn automáticamente
5. **Escucha:** "Estoy preparando una sorpresa especial..."

#### **Paso 2: Esperar Generación 360º**
- La generación se hace en segundo plano
- Puedes seguir probando otras prendas
- **Escucha:** "¡Perfecto! Ya puedes ver cómo te queda desde todos los ángulos..."
- **Escucha:** "¡Listo! El video completo está preparado..."

#### **Paso 3: Notificación Aparece**
- Aparece notificación: "¡Sorpresa lista!"
- **Escucha:** "¡Sorpresa! Ya puedes ver cómo te queda [PRENDA] desde todos los ángulos..."
- **Escucha:** "Te llevo a ver todos los ángulos en 3, 2, 1..."
- Auto-redirige a pestaña 360º después de 5 segundos

#### **Paso 4: Pestaña 360º**
1. Se abre automáticamente la pestaña **"360º"**
2. **Escucha:** "¡Perfecto! Aquí puedes ver cómo te queda la prenda desde todos los ángulos..."

#### **Paso 5: Probar los 3 Modos de Vista**

**Modo Única (Central):**
- Toca el botón "Única"
- **Escucha:** "Vista única activada. Imagen central a tamaño completo."
- Verás la imagen central en formato 9:16 vertical
- Cuerpo entero sin recortes

**Modo Dividida (2 vistas):**
- Toca el botón "Dividida"
- **Escucha:** "Vista dividida activada. Compara dos ángulos lado a lado."
- Verás dos vistas lado a lado
- Transición suave

**Modo Completa (3 vistas + miniaturas):**
- Toca el botón "Completa"
- **Escucha:** "Vista completa activada. Tres vistas, miniaturas y seguimiento disponible."
- Verás:
  - Tres vistas pequeñas arriba
  - Vista principal central
  - Miniaturas del carrusel abajo
  - MediaPipe espejo lateral (cuando activas seguimiento)

#### **Paso 6: Probar Seguimiento**
1. Activa el botón "Seguimiento OFF"
2. **Escucha:** "¡Seguimiento activado! Ahora la prenda girará siguiendo tu reflejo en la pantalla..."
3. Aparece el espejo MediaPipe lateral (fino pero alto)
4. Muévete y verás cómo la prenda rota contigo

#### **Paso 7: Probar Auto-rotación**
1. Activa "Auto-rotar"
2. **Escucha:** "El carrusel ahora rotará automáticamente..."
3. El carrusel cambia de frame cada 2 segundos
4. Pulsa "Pausar" para detener

---

## ✅ VERIFICACIONES

### **Anuncios Vocales:**
- ✅ No menciona "WAN" ni "KLING"
- ✅ Mensajes naturales: "¿Quieres ver cómo te queda desde todos los ángulos?"
- ✅ Menciona seguimiento: "La prenda girará siguiendo tu reflejo"

### **Vistas:**
- ✅ Vista única: Imagen central 9:16
- ✅ Vista dividida: 2 vistas lado a lado
- ✅ Vista completa: 3 vistas + miniaturas + MediaPipe

### **Formato:**
- ✅ 9:16 vertical en todas las vistas
- ✅ 85% de altura de pantalla
- ✅ Cuerpo entero sin recortar cabeza ni pies

### **Transiciones:**
- ✅ Fade in/out suave
- ✅ Slide horizontal entre modos

---

## 🐛 SI ALGO NO FUNCIONA

1. **No aparece la notificación:**
   - Verifica que el TryOn se haya completado
   - Revisa la consola para ver si hay errores

2. **No se genera el 360º:**
   - Verifica que las API keys estén configuradas en Vercel
   - Revisa la consola para ver errores de API

3. **MediaPipe no aparece:**
   - Asegúrate de activar el seguimiento
   - Verifica permisos de cámara

4. **Las vistas no se ven bien:**
   - Verifica que el formato 9:16 se mantenga
   - Revisa que las imágenes tengan el tamaño correcto

---

**¡Listo para probar!** 🎉
