# Explicación: Navegador Ligero en RORK

**Fecha:** 02/02/2026  
**Proyecto:** RORK - Cambio de APK Nativa a Navegador Ligero

---

## 🎯 ¿QUÉ ES EL NAVEGADOR LIGERO?

Es una **APK ligera** que contiene:
1. **WebView** (navegador embebido de Android)
2. **Servidor HTTP local** (puerto 8080)
3. **Builds estáticos** de RORK y Orchids
4. **API Keys encapsuladas** (nunca expuestas)

---

## 📊 COMPARACIÓN: APK Nativa vs Navegador Ligero

### **ANTES: APK Nativa (177 MB)**

```
APK Nativa
├── React Native compilado
├── Expo Runtime
├── Todas las dependencias nativas
├── Node modules embebidos
└── Resultado: ~177 MB, problemas de arranque
```

**Problemas:**
- ❌ Muy pesada (177 MB)
- ❌ Problemas de arranque (pantalla blanca/negra)
- ❌ Difícil de mantener
- ❌ API Keys expuestas

---

### **AHORA: Navegador Ligero (~25-30 MB)**

```
APK Ligera
├── WebView (navegador Android)
├── Servidor HTTP Local (Java)
│   ├── Puerto 8080
│   ├── Sirve archivos estáticos
│   └── Maneja APIs (con keys encapsuladas)
├── Builds Estáticos
│   ├── RORK (4.83 MB)
│   └── Orchids (1.82 MB)
└── Resultado: ~25-30 MB, funciona como navegador
```

**Ventajas:**
- ✅ Mucho más ligera (25-30 MB vs 177 MB)
- ✅ Funciona como navegador (más estable)
- ✅ API Keys encapsuladas (más seguro)
- ✅ Fácil de actualizar (solo cambiar assets)

---

## 🔄 ¿CÓMO FUNCIONA?

### **Flujo de Ejecución:**

```
1. Usuario abre APK
   ↓
2. Se inicia LocalServerActivity (Android)
   ↓
3. Servidor HTTP local arranca (puerto 8080)
   ↓
4. WebView carga: http://127.0.0.1:8080/rork
   ↓
5. Servidor sirve archivos estáticos de RORK
   ↓
6. Usuario ve RORK funcionando (como en navegador)
   ↓
7. Si necesita Orchids: http://127.0.0.1:8080/orchids
   ↓
8. APIs se manejan en servidor local (keys encapsuladas)
```

---

## 🎨 EXPERIENCIA DEL USUARIO

### **¿Cómo se ve?**

**Exactamente igual que en navegador web**, pero:
- ✅ Dentro de una APK
- ✅ Sin barra de direcciones
- ✅ Sin botones de navegador
- ✅ Pantalla completa
- ✅ Funciona offline (servidor local)

### **¿Qué puede hacer?**

- ✅ **Todo lo que hace RORK en web:**
  - Navegar por las pantallas
  - Usar todas las funciones
  - Acceder a catálogos
  - Usar escáner
  - Ver perfil

- ✅ **Todo lo que hace Orchids en web:**
  - TryOn (FASHN V1.6)
  - WAN (Fashion Spin)
  - KLING (Video 360º)
  - MediaPipe tracking
  - Carrusel 360º

- ✅ **APIs funcionan:**
  - TryOn → Servidor local → FAL AI (keys encapsuladas)
  - WAN → Servidor local → FAL AI (keys encapsuladas)
  - KLING → Servidor local → FAL AI (keys encapsuladas)

---

## 🔐 SEGURIDAD: API Keys

### **ANTES (APK Nativa):**
```
Código JavaScript
  ↓
API Keys visibles en código
  ↓
Cualquiera puede verlas
```

### **AHORA (Navegador Ligero):**
```
WebView (cliente)
  ↓
Solicita: /api/try-on
  ↓
Servidor Local (Java)
  ↓
API Keys encapsuladas (nunca expuestas)
  ↓
Llamada a FAL AI
```

**Las API Keys NUNCA salen del servidor local.**

---

## 📱 DIFERENCIAS PRÁCTICAS

### **APK Nativa:**
- ❌ React Native compilado
- ❌ Código nativo
- ❌ Más pesada
- ❌ Más lenta de arrancar
- ❌ Difícil de actualizar

### **Navegador Ligero:**
- ✅ HTML/CSS/JavaScript (como web)
- ✅ WebView (navegador embebido)
- ✅ Más ligera
- ✅ Arranca más rápido
- ✅ Fácil de actualizar (solo cambiar archivos)

---

## 🎯 VENTAJAS DEL NAVEGADOR LIGERO

1. **Tamaño:**
   - 25-30 MB vs 177 MB (85% más pequeña)

2. **Estabilidad:**
   - Funciona como navegador (más estable)
   - No hay problemas de arranque

3. **Seguridad:**
   - API Keys encapsuladas
   - Nunca expuestas al cliente

4. **Mantenimiento:**
   - Actualizar solo archivos estáticos
   - No recompilar APK

5. **Integración:**
   - RORK + Orchids en una sola APK
   - Cambiar entre ellos fácilmente

---

## 🔄 NAVEGACIÓN

### **Cómo cambiar entre RORK y Orchids:**

**Opción 1: Desde el código**
- RORK: `http://127.0.0.1:8080/rork`
- Orchids: `http://127.0.0.1:8080/orchids`

**Opción 2: Botón en la UI**
- Agregar botón para cambiar entre apps
- O menú de selección

---

## ⚙️ CONFIGURACIÓN ACTUAL

### **Servidor Local (Java):**
- Puerto: 8080
- Sirve: RORK y Orchids
- Maneja: APIs con keys encapsuladas

### **WebView:**
- JavaScript: ✅ Habilitado
- Cámara: ✅ Habilitada
- Micrófono: ✅ Habilitado
- Geolocalización: ✅ Habilitada
- Permisos: ✅ Automáticos

---

## 📋 RESUMEN

**¿Qué cambia?**
- ✅ De APK nativa pesada → APK ligera con navegador
- ✅ De código nativo → HTML/CSS/JavaScript (web)
- ✅ De 177 MB → 25-30 MB
- ✅ De keys expuestas → keys encapsuladas

**¿Cómo se ve?**
- ✅ **Exactamente igual que en navegador web**
- ✅ Pero dentro de una APK
- ✅ Sin barra de direcciones
- ✅ Pantalla completa

**¿Funciona igual?**
- ✅ Sí, todo funciona igual
- ✅ RORK completo
- ✅ Orchids completo
- ✅ APIs funcionan

---

**Última actualización:** 02/02/2026
