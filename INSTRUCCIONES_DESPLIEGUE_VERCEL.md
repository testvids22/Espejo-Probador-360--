# INSTRUCCIONES PARA DESPLEGAR EN VERCEL

**Proyecto:** RORK V2.0 - Integración 360º  
**Fecha:** 2025-02-02

---

## 📋 PREPARACIÓN

### 1. Verificar que el proyecto esté listo

```bash
cd "C:\Users\SAPad\soluciones CURSOR\rork-360-integration-v2"
npm install
npm run build:web
```

### 2. Verificar que el build funciona

Si el build falla, corrígelo antes de desplegar.

---

## 🚀 DESPLIEGUE EN VERCEL

### Opción A: Desde Vercel Dashboard (Recomendado)

1. **Ve a https://vercel.com**
2. **Inicia sesión** con tu cuenta
3. **Nuevo Proyecto** → **Import Git Repository**
4. **Conecta el repositorio** de RORK V2.0
   - Si no está en Git, súbelo primero a GitHub
5. **Configuración del proyecto:**
   - **Framework Preset:** Other
   - **Root Directory:** `./` (raíz del proyecto)
   - **Build Command:** `npm run build:web`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

6. **Environment Variables:**
   - Agrega estas variables:
     - `EXPO_PUBLIC_FAL_KEY` = `tu_api_key_de_fal_ai`
     - `EXPO_PUBLIC_REPLICATE_API_TOKEN` = `tu_token_de_replicate` (opcional)

7. **Deploy**

### Opción B: Desde CLI de Vercel

```bash
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# En la carpeta del proyecto
cd "C:\Users\SAPad\soluciones CURSOR\rork-360-integration-v2"

# Login en Vercel
vercel login

# Desplegar
vercel

# Seguir las instrucciones:
# - Link to existing project? No (primera vez)
# - Project name: rork-360-integration-v2
# - Directory: ./
# - Override settings? No

# Agregar variables de entorno
vercel env add EXPO_PUBLIC_FAL_KEY
# Pegar tu API key cuando lo pida

vercel env add EXPO_PUBLIC_REPLICATE_API_TOKEN
# Pegar tu token cuando lo pida

# Desplegar a producción
vercel --prod
```

---

## 🔑 CONFIGURAR VARIABLES DE ENTORNO EN VERCEL

### Desde el Dashboard:

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `EXPO_PUBLIC_FAL_KEY` | Tu API key de FAL AI | Production, Preview, Development |
| `EXPO_PUBLIC_REPLICATE_API_TOKEN` | Tu token de Replicate | Production, Preview, Development |

4. **Save**

### Verificar que se aplicaron:

Después del deploy, en la consola del navegador deberías ver:
```
[API Keys] ✅ Usando keys de variables de entorno (Vercel/Expo)
[API Keys] EXPO_PUBLIC_FAL_KEY valor: tu_key...
```

---

## 🧪 PROBAR DESPUÉS DEL DESPLIEGUE

1. **Abre la URL de Vercel** (ej: `https://rork-360-integration-v2.vercel.app`)
2. **Abre la consola** (F12)
3. **Ve a la pestaña "Espejo"**
4. **Haz un TryOn**
5. **Verifica en la consola:**
   - `[API Keys] EXPO_PUBLIC_FAL_KEY valor: ...`
   - `[360º Background] FAL_KEY obtenida: ...`
   - Si no hay error 401, debería funcionar

---

## 🔍 VERIFICAR LOGS EN VERCEL

1. Ve a tu proyecto en Vercel Dashboard
2. **Deployments** → Selecciona el último deployment
3. **Functions** → Ver logs en tiempo real
4. Busca errores relacionados con API keys

---

## ⚠️ SI SIGUE DANDO ERROR 401

1. **Verifica que las variables estén configuradas:**
   - Settings → Environment Variables
   - Deben estar en Production, Preview y Development

2. **Verifica el formato:**
   - Sin espacios
   - Sin comillas
   - Sin saltos de línea

3. **Re-deploy:**
   - Después de cambiar variables, haz un nuevo deploy
   - O usa "Redeploy" en el dashboard

4. **Verifica en la consola del navegador:**
   - Debe mostrar la key (primeros 10 caracteres)
   - Si dice "NO CONFIGURADA", la variable no se está leyendo

---

## 📝 NOTAS

- Las variables `EXPO_PUBLIC_*` son públicas (se incluyen en el bundle)
- Esto es normal para Expo/React Native
- Las keys se exponen en el cliente, pero solo las usa el usuario
- Para mayor seguridad, podrías usar un servidor intermedio (futuro)

---

## 🎯 OBJETIVO

Desplegar en Vercel para verificar si:
1. ✅ Las variables de entorno se leen correctamente
2. ✅ El error 401 se resuelve
3. ✅ La generación 360º funciona en producción

Si funciona en Vercel pero no en local, el problema es la lectura de `.env.local` en desarrollo.

---

**Última actualización:** 2025-02-02
