/* static server */
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// config
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const USERS_DIR = path.join(__dirname, 'users');


// mime map
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.map': 'application/json; charset=utf-8'
};

// send file
function sendFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';

  const headers = { 'Content-Type': type };
  // light cache
  if (ext && ext !== '.html') {
    headers['Cache-Control'] = 'public, max-age=3600';
  } else {
    headers['Cache-Control'] = 'no-cache';
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, headers);
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server Error');
    });
    stream.pipe(res);
  });
}

// safe resolve
function resolvePath(reqUrl) {
  const parsed = new URL(reqUrl, `http://localhost:${PORT}`).pathname || '/';
  const decoded = decodeURIComponent(parsed);
  let safePath = path.normalize(decoded).replace(/^\/+/, '');
  // default file
  if (decoded.endsWith('/')) safePath = path.join(safePath, 'index.html');
  const finalPath = path.join(PUBLIC_DIR, safePath);
  if (!finalPath.startsWith(PUBLIC_DIR)) return null;
  return finalPath;
}

// util: hash password
function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return `s2$${salt.toString('base64')}$${hash.toString('base64')}`;
}

// util: verify password
function verifyPasswordSync(password, hashedPassword) {
  try {
    if (!hashedPassword.startsWith('s2$')) return false;
    const parts = hashedPassword.split('$');
    if (parts.length !== 3) return false;
    const salt = Buffer.from(parts[1], 'base64');
    const hash = Buffer.from(parts[2], 'base64');
    const testHash = crypto.scryptSync(password, salt, 32);
    return crypto.timingSafeEqual(hash, testHash);
  } catch {
    return false;
  }
}


// guest handler
function handleGuest(req, res) {
  let body = '';
  const MAX = 1 * 1024 * 1024;
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > MAX) {
      res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'payload too large' }));
      req.destroy();
    }
  });
  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');
      const guestRe = /^Guest#[0-9]{4}$/;

      // name choose
      let desired = String(data.username || '').trim();
      const makeName = () => `Guest#${String((Math.random() * 10000) | 0).padStart(4, '0')}`;

      const ensureUniqueAndWrite = (nameTry, cb) => {
        const outPath = path.join(USERS_DIR, `${nameTry}.json`);
        if (!outPath.startsWith(USERS_DIR)) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: 'invalid path' }));
        }
        fs.stat(outPath, (err, stat) => {
          if (!err && stat && stat.isFile()) {
            // exists ok
            return cb(null, { existed: true, outPath });
          }
          const payload = {
            username: nameTry,
            password: null,
            userDetails: [
              { type: 'time', timeCreated: '00:00:00', timePlayedToday: '00:00:00', timePlayedTotal: '00:00:00' },
              { type: 'discord', loggedInWithDiscord: false, discordID: '000000000000000000', discordUsername: 'username#0000', discordAvatar: 'https://cdn.discordapp.com/avatars/000000000000000000/000000000000000000.png' }
            ]
          };
          fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8', (wErr) => {
            if (wErr) return cb(wErr);
            return cb(null, { existed: false, outPath });
          });
        });
      };

      const finalize = (username, existed) => {
        res.writeHead(existed ? 200 : 201, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: true, username }));
      };

      // desired name
      if (guestRe.test(desired)) {
        return ensureUniqueAndWrite(desired, (err, info) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ error: 'write failed' }));
          }
          return finalize(desired, info.existed);
        });
      }

      // fresh gen
      let attempts = 0;
      const tryGen = () => {
        if (attempts++ > 50) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: 'could not allocate guest' }));
        }
        const candidate = makeName();
        const candidatePath = path.join(USERS_DIR, `${candidate}.json`);
        fs.stat(candidatePath, (e, s) => {
          if (!e && s && s.isFile()) return tryGen();
          ensureUniqueAndWrite(candidate, (wErr, info) => {
            if (wErr) {
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              return res.end(JSON.stringify({ error: 'write failed' }));
            }
            return finalize(candidate, info.existed);
          });
        });
      };
      tryGen();
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'bad json' }));
    }
  });
}

// login handler
function handleLogin(req, res) {
  let body = '';
  const MAX = 1 * 1024 * 1024;
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > MAX) {
      res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'payload too large' }));
      req.destroy();
    }
  });
  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');
      const username = String(data.username || '').trim();
      const password = String(data.password || '');
      const re = /^[A-Za-z0-9_-]{3,20}$/;
      if (!re.test(username)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'invalid username' }));
      }
      if (!password || password.length < 6) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'invalid password' }));
      }
      const fileSafe = username;
      const userPath = path.join(USERS_DIR, `${fileSafe}_password.json`);
      if (!userPath.startsWith(USERS_DIR)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'invalid path' }));
      }

      // check if user exists and verify password
      fs.readFile(userPath, 'utf8', (err, fileData) => {
        if (err) {
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: 'invalid credentials' }));
        }

        try {
          const userData = JSON.parse(fileData);

          // check password - handle both hashed and plain text for backward compatibility
          let passwordValid = false;
          if (userData.password.startsWith('s2$')) {
            // hashed password
            passwordValid = verifyPasswordSync(password, userData.password);
          } else {
            // plain text password (legacy)
            passwordValid = password === userData.password;
          }

          if (!passwordValid) {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ error: 'invalid credentials' }));
          }

          // login successful
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({
            ok: true,
            username: userData.username
          }));
        } catch (parseErr) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: 'server error' }));
        }
      });
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'bad json' }));
    }
  });
}

// signup handler
function handleSignup(req, res) {
  let body = '';
  const MAX = 1 * 1024 * 1024;
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > MAX) {
      res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'payload too large' }));
      req.destroy();
    }
  });
  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');
      const username = String(data.username || '').trim();
      const password = String(data.password || '');
      const re = /^[A-Za-z0-9_-]{3,20}$/;
      if (!re.test(username)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'invalid username' }));
      }
      if (!password || password.length < 6) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'invalid password' }));
      }
      const fileSafe = username;
      const outPath = path.join(USERS_DIR, `${fileSafe}_password.json`);
      if (!outPath.startsWith(USERS_DIR)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'invalid path' }));
      }

      // check user exists
      fs.stat(outPath, (_err, stat) => {
        if (stat && stat.isFile()) {
          res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: 'user exists' }));
        }

        const payload = {
          username,
          password: hashPasswordSync(password),
          userDetails: [
            {
              type: 'time',
              timeCreated: '00:00:00',
              timePlayedToday: '00:00:00',
              timePlayedTotal: '00:00:00'
            },
            {
              type: 'discord',
              loggedInWithDiscord: false,
              discordID: '000000000000000000',
              discordUsername: 'username#0000',
              discordAvatar: 'https://cdn.discordapp.com/avatars/000000000000000000/000000000000000000.png'
            }
          ]
        };
        fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8', (wErr) => {
          if (wErr) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ error: 'write failed' }));
          }
          res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ ok: true }));
        });
      });
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'bad json' }));
    }
  });
}

// server create
const server = http.createServer((req, res) => {
  const parsed = new URL(req.url || '/', `http://localhost:${PORT}`);

  // api route
  if (req.method === 'POST' && parsed.pathname === '/api/signup') {
    return handleSignup(req, res);
  }
  if (req.method === 'POST' && parsed.pathname === '/api/login') {
    return handleLogin(req, res);
  }
  if (req.method === 'POST' && parsed.pathname === '/api/guest') {
    return handleGuest(req, res);
  }
  if (req.method === 'GET' && parsed.pathname === '/api/check-username') {
    const u = String(parsed.searchParams.get('u') || '').trim();
    const re = /^[A-Za-z0-9_-]{3,20}$/;
    if (!re.test(u)) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ exists: false }));
    }
    const fileSafe = u;
    const outPath = path.join(USERS_DIR, `${fileSafe}_password.json`);
    fs.stat(outPath, (_e, stat) => {
      const exists = !!(stat && stat.isFile());
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ exists }));
    });
    return;
  }

  // method check
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  let filePath = resolvePath(req.url || '/');
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  // fallback index
  fs.stat(filePath, (err, stat) => {
    if (!err && stat && stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      return sendFile(filePath, res);
    }
    if (err || !stat || !stat.isFile()) {
      const fallback = path.join(PUBLIC_DIR, 'index.html');
      return sendFile(fallback, res);
    }
    return sendFile(filePath, res);
  });
});

// listen
server.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
});

