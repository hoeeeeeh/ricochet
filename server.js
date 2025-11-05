const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;
const ROOT = __dirname;

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
}

function computeShareMeta(u) {
  const n = (u.searchParams.get('n') || '').trim();
  const p = (u.searchParams.get('p') || '').trim();
  const c = u.searchParams.get('c');
  const count = c ? parseInt(c, 10) : (p && p.length % 2 === 0 ? Math.floor(p.length / 2) : undefined);
  const name = n || '플레이어';
  const title = count ? `${name}님이 ${count}수만에 증명하셨어요!` : `${name}님이 증명에 도전 중입니다!`;
  const description = '리코셰 로봇 - URL만으로 플레이 · 증명 공유';
  const url = u.toString();
  return { title, description, url };
}

function injectOg(html, { title, description, url }) {
  let out = html;
  // Replace <title>
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  // Inject OG tags after <head>
  const og = [
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
  ].join('\n    ');
  out = out.replace('<head>', `<head>\n    ${og}`);
  return out;
}

const server = http.createServer((req, res) => {
  try {
    const u = new URL(req.url, `http://localhost:${PORT}`);
    let filePath = path.join(ROOT, decodeURIComponent(u.pathname));
    if (u.pathname === '/' || u.pathname === '/index.html') {
      const indexPath = path.join(ROOT, 'index.html');
      const html = fs.readFileSync(indexPath, 'utf-8');
      const meta = computeShareMeta(u);
      const out = injectOg(html, meta);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(out);
      return;
    }

    // Basic static serving
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(data);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


