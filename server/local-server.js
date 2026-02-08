// Servidor HTTP local para WebView / desarrollo
// Encapsula API Keys y sirve RORK + Orchids
// Carga .env.local desde la raíz del proyecto

const http = require('http');
const fs = require('fs');
const path = require('path');

// Cargar .env.local desde la raíz del proyecto
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    });
    console.log('[SERVER] .env.local cargado desde', envPath);
  } catch (e) {
    console.warn('[SERVER] No se pudo cargar .env.local:', e.message);
  }
} else {
  console.warn('[SERVER] No existe .env.local en', envPath, '- Copia .env.example a .env.local y configura FAL_KEY');
}

const PORT = parseInt(process.env.PORT || '8080', 10);
const API_KEYS = {
  FAL_KEY: process.env.FAL_KEY || process.env.EXPO_PUBLIC_FAL_KEY || '[CONFIGURAR_EN_VARIABLES_ENTORNO]',
  REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN || process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN || '[CONFIGURAR_EN_VARIABLES_ENTORNO]'
};

// Rutas de los builds estáticos
// RORK: npm run build:web → dist/
// Orchids: npm run build → out/
const RORK_BUILD_PATH = path.join(__dirname, '../dist');
const ORCHIDS_BUILD_PATH = path.join(__dirname, '../../orchids-projects/orchids-virtual-try-on-remix-remix/out');

// Avisar si no existe el build de RORK (ruta /rork no funcionará hasta hacer npm run build:web)
const rorkIndexPath = path.join(RORK_BUILD_PATH, 'index.html');
if (!fs.existsSync(rorkIndexPath)) {
  console.warn('[SERVER] No existe dist/index.html. Para servir /rork ejecuta en la raíz: npm run build:web');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  console.log(`[SERVER] ${req.method} ${pathname}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Routes
  if (pathname.startsWith('/api/')) {
    handleApiRoute(req, res, pathname);
    return;
  }

  // Serve RORK or Orchids
  if (pathname.startsWith('/rork')) {
    const filePath = pathname.replace('/rork', '') || '/index.html';
    serveStaticFiles(req, res, RORK_BUILD_PATH, filePath);
    return;
  }

  if (pathname.startsWith('/orchids')) {
    const filePath = pathname.replace('/orchids', '') || '/index.html';
    serveStaticFiles(req, res, ORCHIDS_BUILD_PATH, filePath);
    return;
  }

  // Default: serve RORK home
  if (pathname === '/' || pathname === '') {
    res.writeHead(302, { 'Location': '/rork' });
    res.end();
    return;
  }

  // Try to serve from RORK by default
  serveStaticFiles(req, res, RORK_BUILD_PATH, pathname);
});

function handleApiRoute(req, res, pathname) {
  if (pathname === '/api/try-on' && req.method === 'POST') {
    handleTryOn(req, res);
  } else if (pathname === '/api/wan' && req.method === 'POST') {
    handleWAN(req, res);
  } else if (pathname === '/api/kling' && req.method === 'POST') {
    handleKLING(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API route not found' }));
  }
}

async function handleTryOn(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      console.log('[API] TryOn request received');
      
      // Llamar a FAL AI FASHN V1.6 (igual que Orchids)
      const response = await fetch('https://queue.fal.run/fal-ai/fashn/tryon/v1.6', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${API_KEYS.FAL_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model_image: data.model_image || data.imageUrl, // Imagen preprocesada del usuario
          garment_image: data.garment_image || data.apparelImageUrl, // Imagen de la prenda
          category: data.category || 'tops', // tops o bottoms
          prompt: data.prompt || 'HIGH-RESOLUTION 8K ULTRA-DETAILED. Apply ONLY the selected main garment. STRICTLY PROHIBITED: modifying or interpreting as clothing any visible accessories (bags, shoes, hats, hoods, glasses, scarves, jewelry). Maintain the user\'s complete identity: face, hands, and body proportions UNCHANGED. Precise garment fit, respecting original color, texture, drape, and style. Keep lighting, pose, and background EXACTLY as the original. No artifacts, no blur, professional fashion photography quality.',
          garment_photo_type: "auto",
          nsfw_filter: true,
          cover: true,
          adjust_hands: true,
          restore_background: true,
          restore_face: true,
        })
      });
      
      if (!response.ok) {
        throw new Error(`FAL AI error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...result }));
    } catch (error) {
      console.error('[API] TryOn error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}

async function handleWAN(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      console.log('[API] WAN request received');
      
      // Llamar a FAL AI WAN con API key encapsulada (nunca expuesta al cliente)
      const response = await fetch('https://queue.fal.run/fal-ai/wan-i2v', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${API_KEYS.FAL_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_url: data.imageUrl,
          prompt: data.prompt || 'Generar un giro suave y continuo de la persona manteniendo exactamente la prenda aplicada por el Try‑On, sin reinterpretar accesorios como ropa. No modificar rostro, manos, cuerpo ni complementos. Mantener continuidad visual con la imagen de entrada, respetando color, textura y forma de la prenda.',
          negative_prompt: data.negative_prompt || 'blur, distort, low quality, static, no motion, face changing, body proportion change, clothing change, amateur quality, background changing drastically',
          aspect_ratio: data.aspect_ratio || '9:16',
          num_frames: data.num_frames || 81  // Requerido por el modelo
        })
      });
      
      if (!response.ok) {
        throw new Error(`FAL AI WAN error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...result }));
    } catch (error) {
      console.error('[API] WAN error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}

async function handleKLING(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      console.log('[API] KLING request received');
      
      // Llamar a FAL AI KLING con API key encapsulada (nunca expuesta al cliente)
      const response = await fetch('https://queue.fal.run/fal-ai/kling-video/v2.6/pro/image-to-video', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${API_KEYS.FAL_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_image_url: data.imageUrl,
          prompt: data.prompt || 'Generar vistas limpias y consistentes de la persona con la prenda aplicada, sin alterar ni confundir accesorios (bolsos, zapatos, gorros, gafas, bufandas, joyas) con ropa. Mantener identidad, proporciones y pose. Producir rotación uniforme y estable en ángulos exactos (frontal, lateral, trasera), con contorno limpio y sin artefactos.',
          negative_prompt: data.negative_prompt || 'blur, distort, low quality, static, no motion, face changing, body proportion change, clothing change, amateur quality, background changing drastically',
          duration: data.duration || '5',
          aspect_ratio: data.aspect_ratio || '9:16'
        })
      });
      
      if (!response.ok) {
        throw new Error(`FAL AI KLING error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...result }));
    } catch (error) {
      console.error('[API] KLING error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}

function serveStaticFiles(req, res, basePath, filePath) {
  if (filePath === '/' || filePath === '') {
    filePath = '/index.html';
  }

  const fullPath = path.join(basePath, filePath);
  const ext = path.extname(fullPath).toLowerCase();

  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
  };

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream'
    });
    res.end(data);
  });
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[SERVER] Local server running on http://127.0.0.1:${PORT}`);
  console.log(`[SERVER] RORK: http://127.0.0.1:${PORT}/rork`);
  console.log(`[SERVER] Orchids: http://127.0.0.1:${PORT}/orchids`);
  console.log(`[SERVER] API Keys: ENCAPSULADAS (no expuestas)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SERVER] Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
