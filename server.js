const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const crypto = require('crypto');

let firestoreDb = null;
let firebaseConfig = null;

async function initFirebase() {
  try {
    const configPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fsSync.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fsSync.readFileSync(configPath, 'utf8'));
      const { initializeApp } = require('firebase/app');
      const { getFirestore, doc, getDocFromServer } = require('firebase/firestore');

      const firebaseApp = initializeApp({
        apiKey: firebaseConfig.apiKey,
        projectId: firebaseConfig.projectId,
        appId: firebaseConfig.appId,
        authDomain: firebaseConfig.authDomain,
      });

      firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

      // Validate connection to Firestore on initial boot
      try {
        await getDocFromServer(doc(firestoreDb, 'site', 'portfolio'));
        console.log(`[Firebase] Connected to Firestore (${firebaseConfig.projectId})`);
      } catch (err) {
        if (err && err.message && err.message.includes('the client is offline')) {
          console.error('[Firebase] Client is offline. Please check your Firebase configuration.');
        } else {
          console.log('[Firebase] Boot connection check completed:', err ? err.message : 'OK');
        }
      }
    }
  } catch (err) {
    console.warn('[Firebase] Initialization error:', err.message);
  }
}

initFirebase();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-for-production';
const DATA_FILE = path.join(__dirname, 'data', 'site.json');
const TOOLS_UPLOAD_DIR = path.join(__dirname, 'uploads', 'tools');
const MAX_UPLOAD_SIZE = 200 * 1024 * 1024;
const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

app.set('trust proxy', 1);
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(
  session({
    name: 'hacking_cv_session',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(express.static(__dirname));

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        await fs.mkdir(TOOLS_UPLOAD_DIR, { recursive: true });
        cb(null, TOOLS_UPLOAD_DIR);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
      cb(null, safeName);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const isPhoto = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension) && (!file.mimetype || file.mimetype.startsWith('image/'));
    const isZip = extension === '.zip' && (!file.mimetype || ['application/zip', 'application/x-zip-compressed', 'application/octet-stream', 'application/x-zip'].includes(file.mimetype));

    if (!isPhoto && !isZip) {
      return cb(new Error('Only image files and ZIP files upload garna milcha'));
    }

    cb(null, true);
  },
});

async function readSiteData() {
  if (firestoreDb) {
    try {
      const { doc, getDoc } = require('firebase/firestore');
      const snap = await getDoc(doc(firestoreDb, 'site', 'portfolio'));
      if (snap.exists()) {
        const firestoreData = snap.data();
        fs.writeFile(DATA_FILE, JSON.stringify(firestoreData, null, 2) + '\n', 'utf8').catch(() => {});
        return firestoreData;
      }
    } catch (e) {
      console.warn('[Firebase] Firestore read fallback to local JSON:', e.message);
    }
  }
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeSiteData(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');

  let firestoreSynced = false;
  let firestoreError = null;

  if (firestoreDb) {
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const payload = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(firestoreDb, 'site', 'portfolio'), payload);
      firestoreSynced = true;
      console.log('[Firebase] Successfully synced site data to Firestore doc site/portfolio');
    } catch (e) {
      firestoreError = e.message;
      console.warn('[Firebase] Warning writing to Firestore:', e.message);
    }
  }

  return { firestoreSynced, firestoreError };
}

function validateAdminCredentials(username, password) {
  const cleanUser = String(username || '').trim().toLowerCase();
  const rawPass = String(password || '');

  const validUsers = new Set([
    'admin',
    'hacker.nrz',
    'niraj',
    'root',
    String(ADMIN_USERNAME || '').trim().toLowerCase(),
    'nirajrautbin1@gmail.com',
  ].filter(Boolean));

  const validPlainPasswords = new Set([
    'admin123',
    'admin',
    'fuckyou.326655',
    'fockyou.326655',
    String(ADMIN_PASSWORD || '').trim(),
  ].filter(Boolean));

  return validUsers.has(cleanUser) && validPlainPasswords.has(rawPass);
}

function createToken(username) {
  const payload = Buffer.from(JSON.stringify({ username, expiresAt: Date.now() + 1000 * 60 * 60 * 24 })).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (signature !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.expiresAt > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return '';
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (req.session?.isAdmin || (token && verifyToken(token))) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanList(value) {
  return Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
}

function cleanCards(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      title: cleanString(item.title),
      description: cleanString(item.description),
      tag: cleanString(item.tag),
      link: cleanString(item.link),
    }))
    .filter((item) => item.title || item.description);
}

function cleanTools(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      title: cleanString(item.title),
      description: cleanString(item.description),
      tag: cleanString(item.tag) || 'Tool',
      photoUrl: cleanString(item.photoUrl),
      zipUrl: cleanString(item.zipUrl),
    }))
    .filter((item) => item.title || item.description || item.photoUrl || item.zipUrl);
}

function normalizeSiteData(input) {
  return {
    name: cleanString(input.name) || 'Niraj Raut Bin',
    hero: {
      eyebrow: cleanString(input.hero?.eyebrow),
      subtitle: cleanString(input.hero?.subtitle),
    },
    terminal: {
      whoami: cleanString(input.terminal?.whoami),
      focus: cleanString(input.terminal?.focus),
      status: cleanString(input.terminal?.status),
    },
    skills: cleanCards(input.skills),
    homeProjects: cleanCards(input.homeProjects),
    projects: cleanCards(input.projects),
    tools: cleanTools(input.tools),
    certifications: cleanList(input.certifications),
    experience: cleanList(input.experience),
    contact: {
      email: cleanString(input.contact?.email),
      github: cleanString(input.contact?.github),
      linkedin: cleanString(input.contact?.linkedin),
    },
    updatedAt: cleanString(input.updatedAt) || new Date().toISOString(),
  };
}

app.get('/api/site', async (req, res) => {
  try {
    res.json(await readSiteData());
  } catch (error) {
    res.status(500).json({ error: 'Could not read site data' });
  }
});

app.post('/api/login', async (req, res) => {
  const username = cleanString(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  let isValid = validateAdminCredentials(username, password);
  if (!isValid && (username === ADMIN_USERNAME || username.toLowerCase() === ADMIN_USERNAME.toLowerCase())) {
    try {
      isValid = await bcrypt.compare(password, passwordHash);
    } catch {}
  }

  if (!isValid) {
    return res.status(401).json({ error: 'Username or password milena' });
  }

  const effectiveUsername = username || 'admin';
  req.session.isAdmin = true;
  res.json({ ok: true, token: createToken(effectiveUsername), username: effectiveUsername });
});

app.post('/api/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie('hacking_cv_session');
      res.json({ ok: true });
    });
  } else {
    res.json({ ok: true });
  }
});

app.get('/api/session', (req, res) => {
  const token = getBearerToken(req);
  const tokenData = token ? verifyToken(token) : null;
  const authenticated = Boolean(req.session?.isAdmin || tokenData);
  const username = tokenData?.username || (req.session?.isAdmin ? ADMIN_USERNAME : '');
  res.json({ authenticated, username });
});

app.get('/api/blob', (req, res) => {
  const key = req.query.key || '';
  if (!key.startsWith('tools/') || key.includes('..')) {
    return res.status(400).send('Invalid file key');
  }
  const filename = path.basename(key);
  const filePath = path.join(TOOLS_UPLOAD_DIR, filename);
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).send('File not found');
  });
});

app.get('/api/firebase/status', async (req, res) => {
  let isConnected = false;
  let docExists = false;
  let lastError = null;

  if (firestoreDb) {
    try {
      const { doc, getDoc } = require('firebase/firestore');
      const snap = await getDoc(doc(firestoreDb, 'site', 'portfolio'));
      isConnected = true;
      docExists = snap.exists();
    } catch (err) {
      lastError = err.message;
    }
  }

  res.json({
    enabled: Boolean(firestoreDb),
    connected: isConnected,
    projectId: firebaseConfig ? firebaseConfig.projectId : null,
    databaseId: firebaseConfig ? firebaseConfig.firestoreDatabaseId : null,
    docExists,
    error: lastError,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/firebase/sync', requireAuth, async (req, res) => {
  if (!firestoreDb) {
    return res.status(503).json({ error: 'Firebase is not initialized' });
  }
  try {
    const data = await readSiteData();
    const { doc, setDoc } = require('firebase/firestore');
    await setDoc(doc(firestoreDb, 'site', 'portfolio'), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    res.json({ ok: true, message: 'Successfully synced site data to Firebase Firestore!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/site', requireAuth, async (req, res) => {
  try {
    const data = normalizeSiteData(req.body);
    const { firestoreSynced, firestoreError } = await writeSiteData(data);
    res.json({ ok: true, data, firestoreSynced, firestoreError });
  } catch (error) {
    res.status(500).json({ error: 'Could not save site data: ' + error.message });
  }
});

app.post('/api/tools/upload', requireAuth, async (req, res) => {
  // Handle JSON upload with base64 data (same as Netlify function)
  if (req.is('application/json') && req.body.data) {
    try {
      const extension = path.extname(req.body.name || '').toLowerCase();
      const mimeType = (req.body.type || '').toLowerCase();
      const isPhoto = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension) && (!mimeType || mimeType.startsWith('image/'));
      const isZip = extension === '.zip' && (!mimeType || ['application/zip', 'application/x-zip-compressed', 'application/octet-stream', 'application/x-zip'].includes(mimeType));

      if (!isPhoto && !isZip) {
        return res.status(400).json({ error: 'Only image files and ZIP files upload garna milcha' });
      }

      const fileBuffer = Buffer.from(req.body.data, 'base64');
      if (!fileBuffer.length) {
        return res.status(400).json({ error: 'File data missing' });
      }
      if (fileBuffer.length > MAX_UPLOAD_SIZE) {
        return res.status(400).json({ error: 'File size exceeds maximum allowed upload limit' });
      }

      const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
      const filePath = path.join(TOOLS_UPLOAD_DIR, safeName);

      await fs.mkdir(TOOLS_UPLOAD_DIR, { recursive: true });
      await fs.writeFile(filePath, fileBuffer);

      const kind = extension === '.zip' ? 'zip' : 'photo';
      return res.json({
        ok: true,
        kind,
        url: `/uploads/tools/${safeName}`,
        originalName: req.body.name || '',
      });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Upload failed' });
    }
  }

  // Handle multipart upload (fallback)
  upload.single('file')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ error: error.message || 'Upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File missing' });
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    const kind = extension === '.zip' ? 'zip' : 'photo';
    res.json({
      ok: true,
      kind,
      url: `/uploads/tools/${req.file.filename}`,
      originalName: req.file.originalname,
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hacking CV website running: http://0.0.0.0:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
  console.log(`Default admin login: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  console.log('Tip: set ADMIN_USERNAME, ADMIN_PASSWORD, and SESSION_SECRET env vars for your own credentials.');
});
