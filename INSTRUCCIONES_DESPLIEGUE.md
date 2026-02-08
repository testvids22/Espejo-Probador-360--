# Instrucciones Despliegue - RORK 360 Integration

**Fecha:** 02/02/2026  
**Proyecto:** RORK con integración 360º

---

## ✅ COMPLETADO

- ✅ Proyecto RORK copiado a `soluciones CURSOR\rork-360-integration`
- ✅ Git inicializado
- ✅ Proyecto original intacto
- ✅ Plan de integración creado

---

## 🚀 PASO 1: Crear Repositorio en GitHub

**⚠️ IMPORTANTE: NO mezclar con repos existentes**

1. **Abrir:** https://github.com/new
2. **Repository name:** `rork-360-integration`
3. **Description:** `RORK with 360º TryOn integration`
4. **Visibility:** Public o Private
5. **NO marcar:** README, .gitignore, license
6. **Click:** "Create repository"

---

## 🚀 PASO 2: Subir Código

**Una vez creado el repositorio:**

```powershell
cd "C:\Users\SAPad\soluciones CURSOR\rork-360-integration"
git remote add origin https://github.com/testvids22/rork-360-integration.git
git add .
git commit -m "Initial commit - RORK 360 integration"
git branch -M main
git push -u origin main
```

---

## 🚀 PASO 3: Configurar Vercel

1. **Ir a:** https://vercel.com/dashboard
2. **Click:** "Add New..." → "Project"
3. **Importar:** `testvids22/rork-360-integration`
4. **Framework:** Expo (auto-detectado)
5. **Project Name:** `rork-360-integration`
6. **Click:** "Deploy"

---

## 🔑 PASO 4: Variables de Entorno

**En Vercel → Settings → Environment Variables:**

```
EXPO_PUBLIC_FAL_KEY = [CONFIGURAR_EN_VERCEL]
EXPO_PUBLIC_REPLICATE_API_TOKEN = [CONFIGURAR_EN_VERCEL]
```

**Seleccionar:** Production, Preview, Development

---

## ✅ RESULTADO

- **GitHub:** https://github.com/testvids22/rork-360-integration
- **Vercel:** https://rork-360-integration.vercel.app/
- **Original (intacto):** https://smart-mirror-gv-360.vercel.app/

---

**Última actualización:** 02/02/2026
