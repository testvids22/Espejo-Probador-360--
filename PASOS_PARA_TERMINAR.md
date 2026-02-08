# Pasos para terminar el proyecto RORK 360º

**Proyecto:** rork-360-integration-v2-87f7e08  
**Fecha:** 08/02/2026

---

## ✅ Lo que ya está hecho

- Comando vocal **«ver lo que me he probado»** en Espejo → comparación/carrusel
- Comando vocal **«borrar perfil»** / «cerrar y borrar» en Perfil
- Botón rojo **Borrar perfil** con aviso irreversible y recomendación Bluetooth
- **Boot video** al borrar perfil (se muestra al volver a Mirror)
- **.env.example** y configuración de API Keys
- **Servidor local** que carga `.env.local` (FAL_KEY)
- **eas.json** para compilar APK Android
- Scripts: `server:local`, `web:5057`, etc.

---

## 📋 Checklist para cerrar el proyecto

### 1. Configurar API Key (obligatorio para TryOn y 360º)

- [ ] Copiar `.env.example` a `.env.local`
- [ ] En `.env.local`, sustituir `tu_fal_key_aqui` por tu clave real de FAL AI
- [ ] No subir `.env.local` a Git (ya está en `.gitignore`)

### 2. Probar la app en local

- [ ] Ejecutar: `npm run web:5057`
- [ ] Abrir en el navegador: **http://localhost:5057**
- [ ] Probar: escaneo → catálogo → espejo → compartir → favoritos
- [ ] Probar comando de voz: «ver lo que me he probado»
- [ ] Probar en Perfil: «borrar perfil» (o el botón rojo) y comprobar que al volver a Mirror se muestra el boot video

### 3. Servidor local (navegador ligero / APIs encapsuladas)

El servidor sirve el **build estático** en `/rork` y las APIs (TryOn, WAN, KLING) con la key encapsulada.

- [ ] Generar el build web: `npm run build:web`
- [ ] Arrancar el servidor: `npm run server:local` (o `cd server && node local-server.js`)
- [ ] Abrir: **http://127.0.0.1:8080/rork**
- Si no existe la carpeta `dist/`, el servidor avisará; en ese caso ejecuta antes `npm run build:web`.

### 4. Compilar APK (Android)

- [ ] `eas login`
- [ ] `eas secret:create --name EXPO_PUBLIC_FAL_KEY --value "tu_fal_key" --scope project`
- [ ] `eas build -p android --profile preview`
- [ ] Descargar el APK desde el dashboard de EAS

### 5. Desplegar en Vercel

- [ ] Crear un nuevo repositorio en GitHub y subir el proyecto
- [ ] En Vercel: New Project → importar el repo
- [ ] Añadir variable de entorno: `EXPO_PUBLIC_FAL_KEY` = tu clave FAL
- [ ] Desplegar; Vercel generará una URL pública

---

## 📁 Archivos de referencia

| Archivo | Uso |
|--------|-----|
| **RESUMEN_MODIFICACIONES_COMPLETO.md** | Todas las modificaciones aplicadas (para replicar en otro proyecto) |
| **GUIA_APK_Y_DESPLIEGUE.md** | Detalle de APK, servidor, .env, Vercel |
| **ESTADO_ACTUAL_PARA_CONTINUAR.md** | Estado al retomar el trabajo |

---

## 🔧 Comandos rápidos

```bash
# App web (desarrollo)
npm run web:5057

# Build web + servidor local (navegador ligero)
npm run build:web
npm run server:local
# O todo en uno: npm run build:and:serve
# Luego: http://127.0.0.1:8080/rork

# APK
eas build -p android --profile preview
```

---

**Última actualización:** 08/02/2026
