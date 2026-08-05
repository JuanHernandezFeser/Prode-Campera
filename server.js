const http = require('http');
const fs = require('fs');
const path = require('path');

// ---------- env: carga .env.local sin dependencias ----------
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

// ---------- body ----------
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 4 * 1024 * 1024) {
        req.destroy();
        reject(Object.assign(new Error('Body demasiado grande'), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ---------- adaptador: replica la interfaz de handlers de Vercel ----------
function adapt(req, res) {
  const url = new URL(req.url, 'http://localhost');
  req.pathname = url.pathname;
  req.query = Object.fromEntries(url.searchParams.entries());
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };
}

// ---------- estáticos ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const PUBLIC_DIR = path.join(__dirname, 'public');

function serveStatic(req, res) {
  const rel = req.pathname === '/' ? '/index.html' : req.pathname;
  const filePath = path.join(PUBLIC_DIR, rel);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.status(403).setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('403 - Prohibido');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.status(404).setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('404 - No encontrado');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.status(200).setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.end(data);
  });
}

// ---------- router de API ----------
const handlers = {
  '/api/data': require('./api/data'),
  '/api/parse': require('./api/parse')
};

async function handleApi(req, res) {
  const handler = handlers[req.pathname] || handlers[req.pathname.replace(/\.js$/, '')];
  if (!handler) {
    res.status(404).json({ error: 'Ruta no encontrada' });
    return;
  }
  try {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const raw = await readBody(req);
      try {
        req.body = raw ? JSON.parse(raw) : {};
      } catch {
        res.status(400).json({ error: 'Body JSON inválido' });
        return;
      }
    } else {
      req.body = {};
    }
    await handler(req, res);
  } catch (e) {
    const code = e.statusCode || 500;
    res.status(code).json({ error: code >= 500 ? 'Error interno del servidor' : e.message });
  }
}

// ---------- server ----------
const server = http.createServer((req, res) => {
  adapt(req, res);
  if (req.pathname.startsWith('/api/')) handleApi(req, res);
  else serveStatic(req, res);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`PRODE Manager corriendo en http://localhost:${port}`);
});
