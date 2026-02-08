# Solución: Problema con Servidor

**Fecha:** 02/02/2026

---

## ⚠️ PROBLEMA

El servidor no muestra URL al iniciar con `npm run start-web`.

---

## ✅ SOLUCIONES

### **Opción 1: Usar comando alternativo**

```bash
npm run web
```

Este comando usa `expo start --web` directamente.

### **Opción 2: Verificar dependencias**

```bash
npm install
npm install -D @expo/cli
```

### **Opción 3: Iniciar manualmente**

```bash
npx expo start --web
```

---

## 🔍 VERIFICACIONES

1. **Dependencias instaladas:**
   - ✅ `@expo/cli` instalado
   - ✅ `expo-av` instalado
   - ✅ `node_modules` existe

2. **Archivos verificados:**
   - ✅ Video: `assets/videos/boot-video.mp4`
   - ✅ Componente: `components/BootVideo360.tsx`
   - ✅ Integración: `app/index.tsx`

---

## 🚀 PRÓXIMOS PASOS

1. Esperar a que el servidor inicie
2. Buscar URL en la terminal (puede tardar 30-60 segundos)
3. Si no aparece, usar `npm run web` directamente
4. Verificar errores en la consola

---

**Última actualización:** 02/02/2026
