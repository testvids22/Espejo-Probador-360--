const fs = require('fs');
const path = require('path');

const root = process.cwd();

// Limpiar caché (evita "Unable to deserialize cloned data" de Metro)
const dirs = [
  path.join(root, '.expo'),
  path.join(root, 'node_modules', '.cache'),
];
for (const dir of dirs) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
      console.log('Eliminado:', dir);
    }
  } catch (e) {
    console.warn('No se pudo eliminar', dir, e.message);
  }
}

// Asegurar que public tenga boot-video.mp4 para web (desde assets/videos)
const src = path.join(root, 'assets', 'videos', 'boot-video.mp4');
const dest = path.join(root, 'public', 'boot-video.mp4');
if (fs.existsSync(src)) {
  try {
    const publicDir = path.join(root, 'public');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    fs.copyFileSync(src, dest);
    console.log('public/boot-video.mp4 actualizado desde assets.');
  } catch (e) {
    console.warn('No se pudo copiar boot-video.mp4 a public:', e.message);
  }
}

console.log('Caché limpiada. Arrancando en puerto 5064...');
