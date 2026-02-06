const express = require('express');
const fs = require('fs');
const http = require('http');
const https = require('https');

const app = express();
const PORT = 3000;

// --------------------
// Load link.txt
// --------------------
const links = fs.readFileSync('link.txt', 'utf-8')
  .split('\n')
  .map(l => l.trim())
  .filter(Boolean);

const map = {};

links.forEach(url => {
  const filename = url.split('/').pop();
  const slug = filename
    .replace(/_\d+_r\d+@papaitan\.video\.zip$/, '')
    .replace('.zip', '');
  map[slug] = url;
});

// --------------------
// Serve frontend
// --------------------
app.use(express.static('public'));

// --------------------
// Redirect-safe fetch
// --------------------
function fetchStream(url, res, depth = 0) {
  if (depth > 5) {
    res.status(508).end();
    return;
  }

  const client = url.startsWith('https') ? https : http;

  client.get(url, r => {
    if ([301, 302, 307, 308].includes(r.statusCode)) {
      return fetchStream(r.headers.location, res, depth + 1);
    }

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Cache-Control': 'no-store'
    });

    r.pipe(res);
  }).on('error', () => res.status(500).end());
}

// --------------------
// Download endpoint (API)
// --------------------
app.get('/download/:slug', (req, res) => {
  const url = map[req.params.slug];
  if (!url) return res.status(404).end();

  fetchStream(url, res);
});

// --------------------
// API list
// --------------------
app.get('/api/list', (req, res) => {
  res.json(
    Object.keys(map).map(slug => ({
      slug,
      title: slug.replace(/-/g, ' ')
    }))
  );
});

app.listen(PORT, () =>
  console.log(`✅ http://localhost:${PORT}`)
);
