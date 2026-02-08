# Implementación: Navegador Ligero con Servidor Local

**Fecha:** 02/02/2026  
**Estado:** En progreso

---

## 🎯 Objetivo

Crear una APK ligera (~20-30 MB) que integre:
- ✅ RORK (completo)
- ✅ Orchids (360º real con WAN/KLING/MediaPipe)
- ✅ API Keys encapsuladas
- ✅ Servidor HTTP local

---

## 📋 Estructura

```
APK (20-30 MB)
├── WebView (Android)
├── Servidor HTTP Local (Node.js, puerto 8080)
│   ├── /rork → RORK app
│   ├── /orchids → Orchids app
│   ├── /api/try-on → FAL AI TryOn
│   ├── /api/wan → WAN generation
│   └── /api/kling → KLING generation
└── Assets (comprimidos)
    ├── RORK build (web-build-rork/)
    └── Orchids build (out/)
```

---

## 🔧 Implementación

### Paso 1: Preparar Builds Estáticos

#### RORK:
```bash
cd C:\Users\SAPad\Smart-Mirror-GV360
npm run build:web
# Output: web-build-rork/
```

#### Orchids:
```bash
cd C:\Users\SAPad\orchids-projects\orchids-virtual-try-on-remix-remix
npm run build
# Output: out/
```

### Paso 2: Servidor Local

**Archivo:** `server/local-server.js`

**Características:**
- ✅ Servidor HTTP en puerto 8080
- ✅ Sirve archivos estáticos de RORK y Orchids
- ✅ Endpoints API con API Keys encapsuladas
- ✅ CORS habilitado
- ✅ Manejo de errores

**API Keys:**
- ✅ FAL_KEY: Encapsulada en servidor
- ✅ REPLICATE_API_TOKEN: Encapsulada en servidor
- ✅ Nunca expuestas al cliente

### Paso 3: WebView Android

**Archivo:** `android/.../LocalServerActivity.java`

**Características:**
- ✅ WebView configurado
- ✅ JavaScript habilitado
- ✅ MediaPipe habilitado
- ✅ Audio habilitado
- ✅ Carga servidor local (127.0.0.1:8080)

### Paso 4: Empaquetar en APK

1. Incluir builds estáticos en `android/app/src/main/assets/`
2. Incluir servidor Node.js embebido
3. Configurar WebView para cargar servidor local
4. Compilar APK

---

## 🔐 Seguridad API Keys

**ANTES (expuestas):**
```javascript
// ❌ Cliente ve las keys
const FAL_KEY = process.env.NEXT_PUBLIC_FAL_KEY;
```

**AHORA (encapsuladas):**
```javascript
// ✅ Keys solo en servidor, nunca expuestas
const API_KEYS = {
  FAL_KEY: '...',  // Solo en servidor
  REPLICATE_API_TOKEN: '...'  // Solo en servidor
};
```

---

## 📊 Comparación

| Aspecto | APK Nativa | WebView + Servidor |
|---------|------------|-------------------|
| Tamaño | ~177 MB | ~20-30 MB ✅ |
| API Keys | Expuestas | Encapsuladas ✅ |
| Mantenimiento | Difícil | Fácil ✅ |
| Actualizaciones | Recompilar | Sin recompilar ✅ |
| RORK | ✅ | ✅ |
| Orchids 360º | ✅ | ✅ |

---

## 🚀 Próximos Pasos

1. ✅ Servidor local creado
2. ⏳ Preparar builds estáticos
3. ⏳ Configurar WebView Android
4. ⏳ Empaquetar en APK
5. ⏳ Probar

---

**Última actualización:** 02/02/2026
