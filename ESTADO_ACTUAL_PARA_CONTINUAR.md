# Estado actual – Para continuar al volver

**Fecha:** 08/02/2026  
**Proyecto:** rork-360-integration-v2-87f7e08  
**Carpeta:** `C:\Users\SAPad\rork-360-integration-v2-87f7e08`

---

## Situación al cerrar

Tu portátil se actualizaba y se iba a reiniciar. Este documento sirve para retomar el trabajo.

---

## Dónde está todo

| Qué | Ubicación |
|-----|-----------|
| Proyecto | `C:\Users\SAPad\rork-360-integration-v2-87f7e08` |
| Resumen modificaciones | `RESUMEN_MODIFICACIONES_COMPLETO.md` |
| Guía APK + Vercel | `GUIA_APK_Y_DESPLIEGUE.md` |
| Este estado | `ESTADO_ACTUAL_PARA_CONTINUAR.md` |

---

## Último paso antes del reinicio

- Se había lanzado la app web con: `npm run web:5057`
- URL: **http://localhost:5057**
- El servidor quedó en segundo plano; al reiniciar se cerró.

---

## Comandos para volver a arrancar

```bash
cd C:\Users\SAPad\rork-360-integration-v2-87f7e08

# App web en puerto 5057 (con caché limpia)
npm run web:5057
```

Luego abre: **http://localhost:5057**

---

## Lo que ya está implementado

1. Comando vocal Espejo: «ver lo que me he probado» → vista comparación
2. Comando vocal Perfil: «borrar perfil» / «cerrar y borrar»
3. Botón rojo borrar perfil con aviso Bluetooth
4. Boot video cuando se borra perfil (siguiente vez que se abre Mirror)
5. `.env.example` para API Keys
6. Servidor local que lee `.env.local`
7. `eas.json` para APK
8. Scripts: `web:5057`, `server:local`, `server:local:5057`

---

## Pendiente de probar / hacer

- **Navegador ligero:** Primero ejecutar `npm run build:web` para generar `dist/`. Luego `npm run server:local` (o `npm run build:and:serve`). Abrir http://127.0.0.1:8080/rork
- Probar carrusel en web
- Configurar `.env.local` con FAL Key
- Crear nuevo repo y desplegar en Vercel
- Compilar APK con EAS Build

---

## Archivos de referencia

- **PASOS_PARA_TERMINAR.md** – Checklist para cerrar el proyecto (nuevo)
- **RESUMEN_MODIFICACIONES_COMPLETO.md** – Todas las modificaciones para copiar en otro proyecto
- **GUIA_APK_Y_DESPLIEGUE.md** – Pasos para APK, Vercel, servidor, .env

---

**Última actualización:** 08/02/2026
