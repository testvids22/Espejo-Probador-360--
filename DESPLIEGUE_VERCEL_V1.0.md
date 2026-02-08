# Despliegue Versión 1.0 en Vercel

**Fecha:** 02/02/2026  
**Repositorio:** https://github.com/testvids22/rork-360-integration

---

## ✅ CÓDIGO SUBIDO A GITHUB

- ✅ Repositorio: https://github.com/testvids22/rork-360-integration
- ✅ Commit: Version 1.0 (API keys removidas)
- ✅ Branch: main

---

## 🚀 PASOS PARA DESPLEGAR EN VERCEL

### **PASO 1: Acceder a Vercel**

1. Ir a: https://vercel.com/dashboard
2. Iniciar sesión con tu cuenta de GitHub (testvids22@gmail.com)

### **PASO 2: Importar Proyecto**

1. Click en **"Add New..."** (esquina superior derecha)
2. Seleccionar **"Project"**
3. En la lista de repositorios, buscar **`testvids22/rork-360-integration`**
4. Click en **"Import"** junto al repositorio

### **PASO 3: Configurar Proyecto**

**Framework Preset:**
- Debería auto-detectarse como **Expo**
- Si no, seleccionar manualmente **"Expo"**

**Project Name:**
- `rork-360-integration` (o el que prefieras)

**Root Directory:**
- Dejar por defecto: `./`

**Build and Output Settings:**
- **Build Command:** (dejar por defecto o `npm run build:web`)
- **Output Directory:** (dejar por defecto)
- **Install Command:** `npm install` (dejar por defecto)

### **PASO 4: Variables de Entorno**

**⚠️ IMPORTANTE:** Para la Versión 1.0, NO se requieren variables de entorno.

Las API keys solo se necesitarán en la Versión 2.0 cuando se integren las funcionalidades 360º.

### **PASO 5: Desplegar**

1. Click en el botón **"Deploy"**
2. Esperar a que termine el proceso de build (puede tardar 2-5 minutos)
3. Una vez completado, Vercel proporcionará la URL del despliegue:
   - Ejemplo: `https://rork-360-integration.vercel.app/`

---

## 📋 VERIFICACIÓN POST-DESPLIEGUE

Después del despliegue, verificar:

- [ ] La URL funciona y carga la aplicación
- [ ] El boot video aparece al iniciar
- [ ] El botón "Cerrar Sesión" funciona (redirige a Perfil)
- [ ] Las condiciones y consentimiento RGPD funcionan
- [ ] No hay errores en la consola del navegador

---

## 🔗 URLS

- **GitHub:** https://github.com/testvids22/rork-360-integration
- **Vercel (después del despliegue):** https://rork-360-integration.vercel.app/
- **Web Original (NO TOCAR):** https://smart-mirror-gv-360.vercel.app/

---

## 📝 NOTAS

- ✅ **Versión 1.0** incluye: Boot video, screensaver, gestión de sesiones, permisos automáticos
- 🔄 **Versión 2.0** (próxima): Integración 360º de Orchids, limpieza de marca de agua, configuración con 3 pestañas
- ⚠️ **NO tocar:** Proyecto original ni web funcionando

---

**Última actualización:** 02/02/2026
