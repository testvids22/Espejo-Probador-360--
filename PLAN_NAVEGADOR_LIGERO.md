# Plan: Navegador Ligero con Servidor Local

**Fecha:** 02/02/2026  
**Estado:** En implementación

---

## 🎯 Objetivo

Crear una APK ligera (~20-30 MB) que sea un WebView con servidor HTTP local embebido, encapsulando API Keys y sirviendo RORK + Orchids integrados.

---

## 📋 Estructura

```
APK (20-30 MB)
├── WebView (Android)
├── Servidor HTTP Local (puerto 8080)
│   ├── /rork → RORK app
│   ├── /orchids → Orchids app
│   ├── /api/try-on → FAL AI (API Keys encapsuladas)
│   ├── /api/wan → WAN generation
│   └── /api/kling → KLING generation
└── Assets (comprimidos)
    ├── RORK build (estático)
    └── Orchids build (estático)
```

---

## 🔧 Implementación

### Opción 1: Node.js embebido (Recomendado)
- **Ventaja:** Fácil de implementar, ya tenemos código Node.js
- **Desventaja:** Necesita empaquetar Node.js (~15 MB)

### Opción 2: Servidor Java nativo
- **Ventaja:** Más ligero, nativo Android
- **Desventaja:** Más complejo de implementar

### Opción 3: Capacitor + Servidor Node
- **Ventaja:** Ya tenemos Capacitor configurado
- **Desventaja:** Sigue siendo pesado

---

## 📝 Pasos de Implementación

### Paso 1: Preparar builds estáticos
1. Build RORK para web (estático)
2. Build Orchids para web (estático)
3. Comprimir assets

### Paso 2: Crear servidor local
1. Servidor HTTP simple (Java o Node.js)
2. Servir archivos estáticos
3. Endpoints API con API Keys encapsuladas

### Paso 3: WebView Android
1. Configurar WebView
2. Cargar servidor local (127.0.0.1:8080)
3. Habilitar JavaScript, MediaPipe, etc.

### Paso 4: Empaquetar
1. Incluir builds estáticos en assets
2. Incluir servidor en APK
3. Comprimir todo

---

## 🔐 API Keys

**ENCAPSULADAS en el servidor:**
- FAL_KEY: Solo en servidor, nunca expuesta
- REPLICATE_API_TOKEN: Solo en servidor, nunca expuesta
- Todas las llamadas API pasan por el servidor local

---

## 📊 Comparación

| Aspecto | APK Nativa | WebView + Servidor |
|---------|------------|-------------------|
| Tamaño | ~177 MB | ~20-30 MB |
| API Keys | Expuestas | Encapsuladas ✅ |
| Mantenimiento | Difícil | Fácil ✅ |
| Actualizaciones | Recompilar | Sin recompilar ✅ |

---

## 🚀 Estado Actual

- ✅ Plan creado
- ✅ Estructura definida
- ⏳ Implementación en progreso

---

**Última actualización:** 02/02/2026
