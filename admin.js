let siteData = null;
const ADMIN_TOKEN_KEY = 'hacking_cv_admin_token';

function getStoredToken() {
  try {
    const t1 = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (t1) return t1;
  } catch {}
  try {
    const t2 = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (t2) return t2;
  } catch {}
  return '';
}

let adminToken = getStoredToken();

const loginCard = document.querySelector('#login-card');
const editorCard = document.querySelector('#editor-card');
const loginForm = document.querySelector('#login-form');
const siteForm = document.querySelector('#site-form');
const loginMessage = document.querySelector('#login-message');
const saveMessage = document.querySelector('#save-message');
const logoutBtn = document.querySelector('#logout-btn');

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle('error', isError);
}

function setAdminToken(token = '') {
  adminToken = token;
  try {
    if (adminToken) {
      localStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
      sessionStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // Ignore storage restrictions in sandboxed environments
  }
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showEditor() {
  loginCard.classList.add('hidden');
  editorCard.classList.remove('hidden');
}

function showLogin() {
  editorCard.classList.add('hidden');
  loginCard.classList.remove('hidden');
}

function lineListToTextarea(items) {
  return Array.isArray(items) ? items.join('\n') : '';
}

function textareaToLineList(value) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.split(',')[1] || '');
    });
    reader.addEventListener('error', () => reject(reader.error || new Error('File read failed')));
    reader.readAsDataURL(file);
  });
}

function cardRow(item = {}, includeTag = false) {
  const row = document.createElement('div');
  row.className = 'repeat-row';

  if (includeTag) {
    const tag = document.createElement('input');
    tag.name = 'tag';
    tag.placeholder = 'Tag';
    tag.value = item.tag || '';
    row.appendChild(tag);
  }

  const title = document.createElement('input');
  title.name = 'title';
  title.placeholder = 'Title';
  title.value = item.title || '';

  const description = document.createElement('textarea');
  description.name = 'description';
  description.placeholder = 'Description';
  description.rows = 3;
  description.value = item.description || '';

  row.append(title, description);

  if (includeTag) {
    const link = document.createElement('input');
    link.name = 'link';
    link.placeholder = 'Project link (optional)';
    link.value = item.link || '';
    row.appendChild(link);
  }

  const remove = document.createElement('button');
  remove.className = 'remove-btn';
  remove.type = 'button';
  remove.textContent = 'Remove';
  remove.addEventListener('click', () => row.remove());
  row.appendChild(remove);

  return row;
}

function renderCardEditor(containerId, items, includeTag = false) {
  const container = document.querySelector(containerId);
  container.innerHTML = '';
  (items || []).forEach((item) => container.appendChild(cardRow(item, includeTag)));
}

function readCardEditor(containerId, includeTag = false) {
  const container = document.querySelector(containerId);
  return [...container.querySelectorAll('.repeat-row')]
    .map((row) => ({
      title: row.querySelector('[name="title"]')?.value.trim() || '',
      description: row.querySelector('[name="description"]')?.value.trim() || '',
      tag: includeTag ? row.querySelector('[name="tag"]')?.value.trim() || 'Project' : '',
      link: includeTag ? row.querySelector('[name="link"]')?.value.trim() || '' : '',
    }))
    .filter((item) => item.title || item.description);
}

async function uploadToolFile(fileInput, statusElement) {
  const file = fileInput.files[0];
  if (!file) {
    throw new Error('Please select a file first (Pahila file choose garnu)');
  }

  statusElement.textContent = 'Uploading...';
  statusElement.classList.remove('error');

  // First try multipart upload using FormData
  try {
    const formData = new FormData();
    formData.append('file', file);
    const headers = {};
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

    const response = await fetch('/api/tools/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.ok) {
      return await response.json();
    }
    const errData = await response.json().catch(() => ({}));
    if (response.status === 400 || response.status === 401 || response.status === 413) {
      throw new Error(errData.error || `Upload failed with HTTP ${response.status}`);
    }
  } catch (err) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
    console.warn('Multipart upload fallback to base64:', err);
  }

  // Fallback: authenticated upload with base64
  return api('/api/tools/upload', {
    method: 'POST',
    body: JSON.stringify({
      name: file.name,
      type: file.type,
      data: await fileToBase64(file),
    }),
  });
}

function toolRow(item = {}) {
  const row = document.createElement('div');
  row.className = 'repeat-row tool-row';

  const tag = document.createElement('input');
  tag.name = 'tag';
  tag.placeholder = 'Tag (Tool, Script, Scanner...)';
  tag.value = item.tag || 'Tool';

  const title = document.createElement('input');
  title.name = 'title';
  title.placeholder = 'Tool name';
  title.value = item.title || '';

  const description = document.createElement('textarea');
  description.name = 'description';
  description.placeholder = 'Tool description';
  description.rows = 3;
  description.value = item.description || '';

  const photoUrl = document.createElement('input');
  photoUrl.name = 'photoUrl';
  photoUrl.placeholder = 'Photo URL will appear after upload';
  photoUrl.value = item.photoUrl || '';

  const previewImg = document.createElement('img');
  previewImg.className = 'admin-tool-preview';
  if (item.photoUrl) {
    previewImg.src = item.photoUrl;
    previewImg.style.display = 'block';
  } else {
    previewImg.style.display = 'none';
  }
  photoUrl.addEventListener('input', () => {
    const val = photoUrl.value.trim();
    if (val) {
      previewImg.src = val;
      previewImg.style.display = 'block';
    } else {
      previewImg.style.display = 'none';
    }
  });

  const zipUrl = document.createElement('input');
  zipUrl.name = 'zipUrl';
  zipUrl.placeholder = 'ZIP URL will appear after upload';
  zipUrl.value = item.zipUrl || '';

  const photoInput = document.createElement('input');
  photoInput.type = 'file';
  photoInput.accept = 'image/jpeg,image/png,image/webp,image/gif';

  const zipInput = document.createElement('input');
  zipInput.type = 'file';
  zipInput.accept = '.zip,application/zip';

  const status = document.createElement('p');
  status.className = 'admin-message tool-status';

  const photoButton = document.createElement('button');
  photoButton.className = 'btn secondary';
  photoButton.type = 'button';
  photoButton.textContent = 'Upload Photo';
  photoButton.addEventListener('click', async () => {
    try {
      const result = await uploadToolFile(photoInput, status);
      if (result.kind !== 'photo') throw new Error('Photo file matra upload garnu');
      photoUrl.value = result.url;
      previewImg.src = result.url;
      previewImg.style.display = 'block';
      status.textContent = 'Photo uploaded ✅ Save Changes click garnu.';
    } catch (error) {
      status.textContent = error.message;
      status.classList.add('error');
    }
  });

  const zipButton = document.createElement('button');
  zipButton.className = 'btn secondary';
  zipButton.type = 'button';
  zipButton.textContent = 'Upload ZIP';
  zipButton.addEventListener('click', async () => {
    try {
      const result = await uploadToolFile(zipInput, status);
      if (result.kind !== 'zip') throw new Error('ZIP file matra upload garnu');
      zipUrl.value = result.url;
      status.textContent = 'ZIP uploaded ✅ Save Changes click garnu.';
    } catch (error) {
      status.textContent = error.message;
      status.classList.add('error');
    }
  });

  const uploadGrid = document.createElement('div');
  uploadGrid.className = 'tool-upload-grid';
  uploadGrid.append(photoInput, photoButton, zipInput, zipButton);

  const remove = document.createElement('button');
  remove.className = 'remove-btn';
  remove.type = 'button';
  remove.textContent = 'Remove';
  remove.addEventListener('click', () => row.remove());

  row.append(tag, title, description, photoUrl, previewImg, zipUrl, uploadGrid, status, remove);
  return row;
}

function renderToolsEditor(items) {
  const container = document.querySelector('#tools-editor');
  container.innerHTML = '';
  (items || []).forEach((item) => container.appendChild(toolRow(item)));
}

function readToolsEditor() {
  const container = document.querySelector('#tools-editor');
  return [...container.querySelectorAll('.tool-row')]
    .map((row) => ({
      tag: row.querySelector('[name="tag"]')?.value.trim() || 'Tool',
      title: row.querySelector('[name="title"]')?.value.trim() || '',
      description: row.querySelector('[name="description"]')?.value.trim() || '',
      photoUrl: row.querySelector('[name="photoUrl"]')?.value.trim() || '',
      zipUrl: row.querySelector('[name="zipUrl"]')?.value.trim() || '',
    }))
    .filter((item) => item.title || item.description || item.photoUrl || item.zipUrl);
}

function populateForm(data) {
  siteData = data;
  siteForm.elements.name.value = data.name || '';
  siteForm.elements.heroEyebrow.value = data.hero?.eyebrow || '';
  siteForm.elements.heroSubtitle.value = data.hero?.subtitle || '';
  siteForm.elements.terminalWhoami.value = data.terminal?.whoami || '';
  siteForm.elements.terminalFocus.value = data.terminal?.focus || '';
  siteForm.elements.terminalStatus.value = data.terminal?.status || '';
  siteForm.elements.email.value = data.contact?.email || '';
  siteForm.elements.github.value = data.contact?.github || '';
  siteForm.elements.linkedin.value = data.contact?.linkedin || '';
  siteForm.elements.certifications.value = lineListToTextarea(data.certifications);
  siteForm.elements.experience.value = lineListToTextarea(data.experience);

  renderCardEditor('#skills-editor', data.skills, false);
  renderCardEditor('#home-projects-editor', data.homeProjects, false);
  renderCardEditor('#projects-editor', data.projects, true);
  renderToolsEditor(data.tools);
}

function formToData() {
  return {
    name: siteForm.elements.name.value.trim(),
    hero: {
      eyebrow: siteForm.elements.heroEyebrow.value.trim(),
      subtitle: siteForm.elements.heroSubtitle.value.trim(),
    },
    terminal: {
      whoami: siteForm.elements.terminalWhoami.value.trim(),
      focus: siteForm.elements.terminalFocus.value.trim(),
      status: siteForm.elements.terminalStatus.value.trim(),
    },
    skills: readCardEditor('#skills-editor', false),
    homeProjects: readCardEditor('#home-projects-editor', false),
    projects: readCardEditor('#projects-editor', true),
    tools: readToolsEditor(),
    certifications: textareaToLineList(siteForm.elements.certifications.value),
    experience: textareaToLineList(siteForm.elements.experience.value),
    contact: {
      email: siteForm.elements.email.value.trim(),
      github: siteForm.elements.github.value.trim(),
      linkedin: siteForm.elements.linkedin.value.trim(),
    },
  };
}

async function updateFirebaseStatus() {
  const badge = document.querySelector('#fb-connection-badge');
  const projEl = document.querySelector('#fb-project-id');
  const dbEl = document.querySelector('#fb-db-id');
  const syncMsg = document.querySelector('#fb-sync-msg');

  try {
    const res = await api('/api/firebase/status');
    if (res && res.connected) {
      if (badge) {
        badge.textContent = 'Active & Connected';
        badge.classList.remove('offline');
      }
      if (projEl && res.projectId) projEl.textContent = res.projectId;
      if (dbEl && res.databaseId) dbEl.textContent = res.databaseId;
      if (syncMsg) {
        syncMsg.textContent = 'Cloud Firestore is live and ready for real-time portfolio updates.';
        syncMsg.classList.remove('error');
      }
    } else {
      if (badge) {
        badge.textContent = 'Disconnected';
        badge.classList.add('offline');
      }
      if (syncMsg) {
        syncMsg.textContent = res?.error || 'Firebase not currently reachable. Falling back to local database.';
        syncMsg.classList.add('error');
      }
    }
  } catch (err) {
    if (badge) {
      badge.textContent = 'Error';
      badge.classList.add('offline');
    }
    if (syncMsg) {
      syncMsg.textContent = err.message;
      syncMsg.classList.add('error');
    }
  }
}

async function loadEditor(username = '') {
  showEditor();
  if (username) {
    const userDisplay = document.querySelector('#admin-user-display');
    if (userDisplay) userDisplay.textContent = username;
  }
  try {
    const data = await api('/api/site');
    populateForm(data);
  } catch (err) {
    console.error('Failed to load site data:', err);
    setMessage(saveMessage, 'Could not load site data: ' + err.message, true);
  }
  updateFirebaseStatus().catch((err) => console.warn('Firebase status check error:', err));
}

// Password show/hide toggle
const togglePassBtn = document.querySelector('#toggle-password-btn');
const passwordInput = document.querySelector('#password');
const usernameInput = document.querySelector('#username');
if (togglePassBtn && passwordInput) {
  togglePassBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      togglePassBtn.textContent = '🔒';
    } else {
      passwordInput.type = 'password';
      togglePassBtn.textContent = '👁️';
    }
  });
}

// Credential auto-fill chips
const chipHacker = document.querySelector('#chip-hacker');
const chipAdmin = document.querySelector('#chip-admin');
const oneClickBtn = document.querySelector('#one-click-login-btn');

if (chipHacker && usernameInput && passwordInput) {
  chipHacker.addEventListener('click', () => {
    usernameInput.value = 'hacker.nrz';
    passwordInput.value = 'fuckyou.326655';
    setMessage(loginMessage, 'Credentials filled! Click "Login to Admin" or 1-Click Login.');
  });
}

if (chipAdmin && usernameInput && passwordInput) {
  chipAdmin.addEventListener('click', () => {
    usernameInput.value = 'admin';
    passwordInput.value = 'admin123';
    setMessage(loginMessage, 'Credentials filled! Click "Login to Admin" or 1-Click Login.');
  });
}

if (oneClickBtn) {
  oneClickBtn.addEventListener('click', () => {
    if (usernameInput) usernameInput.value = 'hacker.nrz';
    if (passwordInput) passwordInput.value = 'fuckyou.326655';
    loginForm.dispatchEvent(new Event('submit', { cancelable: true }));
  });
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(loginMessage, 'Logging in...');

  try {
    const enteredUser = (loginForm.elements.username.value || '').trim();
    const enteredPass = loginForm.elements.password.value;

    const result = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        username: enteredUser,
        password: enteredPass,
      }),
    });

    if (result.token) {
      setAdminToken(result.token);
    }

    setMessage(loginMessage, 'Login successful! Loading editor...');
    const effectiveUser = result.username || enteredUser || 'admin';
    await loadEditor(effectiveUser);
  } catch (error) {
    setMessage(loginMessage, error.message || 'Login failed. Check credentials.', true);
  }
});

siteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(saveMessage, 'Saving and syncing to Firebase Firestore...');

  try {
    const result = await api('/api/site', {
      method: 'POST',
      body: JSON.stringify(formToData()),
    });
    siteData = result.data;
    setMessage(saveMessage, 'Saved & Synced to Firebase Firestore successfully ✅ Aba public page refresh garnu.');
    await updateFirebaseStatus();
  } catch (error) {
    setMessage(saveMessage, error.message, true);
  }
});

const fbSyncBtn = document.querySelector('#fb-sync-btn');
if (fbSyncBtn) {
  fbSyncBtn.addEventListener('click', async () => {
    const syncMsg = document.querySelector('#fb-sync-msg');
    if (syncMsg) {
      syncMsg.textContent = 'Syncing current portfolio to Firebase Firestore...';
      syncMsg.classList.remove('error');
    }
    try {
      const res = await api('/api/firebase/sync', { method: 'POST', body: '{}' });
      if (syncMsg) {
        syncMsg.textContent = (res && res.message) || 'Synced to Firebase successfully!';
        syncMsg.classList.remove('error');
      }
      await updateFirebaseStatus();
    } catch (err) {
      if (syncMsg) {
        syncMsg.textContent = 'Sync failed: ' + err.message;
        syncMsg.classList.add('error');
      }
    }
  });
}

logoutBtn.addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST', body: '{}' }).catch(() => null);
  setAdminToken('');
  siteData = null;
  showLogin();
});

document.querySelectorAll('[data-add]').forEach((button) => {
  button.addEventListener('click', () => {
    const type = button.dataset.add;
    if (type === 'skills') document.querySelector('#skills-editor').appendChild(cardRow());
    if (type === 'homeProjects') document.querySelector('#home-projects-editor').appendChild(cardRow());
    if (type === 'projects') document.querySelector('#projects-editor').appendChild(cardRow({}, true));
    if (type === 'tools') document.querySelector('#tools-editor').appendChild(toolRow());
  });
});

api('/api/session')
  .then((session) => {
    if (session && session.authenticated) return loadEditor(session.username);
    setAdminToken('');
    showLogin();
  })
  .catch(() => {
    setAdminToken('');
    showLogin();
  });
