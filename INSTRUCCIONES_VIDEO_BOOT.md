# Instrucciones: Video Boot 6 segundos

**Fecha:** 02/02/2026

---

## 📹 ESPECIFICACIONES DEL VIDEO

### **Requisitos:**
- **Duración:** 6 segundos exactos
- **Tamaño:** 3.7MB máximo
- **Audio:** Con sonido habilitado
- **Formato:** MP4 (H.264 video, AAC audio)
- **Resolución:** Recomendado 1920x1080 o 1280x720 (vertical 9:16 para espejo)

### **Ubicación:**
```
assets/videos/boot-video.mp4
```

---

## 🔧 PREPARACIÓN DEL VIDEO

### **Opciones de Compresión:**

1. **HandBrake (Recomendado):**
   - Codec: H.264
   - Audio: AAC
   - Calidad: RF 23-28 (balance tamaño/calidad)
   - Target: 3.7MB para 6 segundos

2. **FFmpeg:**
```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -c:a aac -b:a 128k -t 6 -s 1280x720 output.mp4
```

3. **Online:**
   - CloudConvert
   - FreeConvert
   - Clideo

---

## 📁 ESTRUCTURA DE CARPETAS

```
rork-360-integration/
├── assets/
│   └── videos/
│       └── boot-video.mp4 (6 seg, 3.7MB, con audio)
├── components/
│   └── BootVideo.tsx (mejorado)
└── app/
    └── index.tsx (modificar)
```

---

## ✅ CHECKLIST

- [ ] Crear carpeta `assets/videos/`
- [ ] Preparar video (6 seg, 3.7MB, con audio)
- [ ] Colocar video en `assets/videos/boot-video.mp4`
- [ ] Mejorar BootVideo.tsx para usar video local
- [ ] Integrar en boot inicial (app/index.tsx)
- [ ] Integrar en screensaver (cuando reposo)
- [ ] Probar reproducción con sonido
- [ ] Verificar que funciona en boot
- [ ] Verificar que funciona en screensaver
- [ ] Probar en web
- [ ] Probar en Android

---

## 🚨 NOTAS IMPORTANTES

1. **Tamaño del video:** 3.7MB puede ser grande para carga inicial
   - Considerar carga asíncrona
   - O comprimir más si es necesario

2. **Sonido en Android:**
   - Verificar permisos de audio
   - Puede requerir interacción del usuario primero

3. **Performance:**
   - Video debe cargar rápido
   - No bloquear inicio de la app

---

**Última actualización:** 02/02/2026
