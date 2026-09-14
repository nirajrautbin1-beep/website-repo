const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');
const fallbackSiteData = require('../../data/site.json');

const SITE_KEY = 'site.json';
const TOOLS_PREFIX = 'tools/';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 4;
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

function methodNotAllowed() {
  return json(405, { error: 'Method not allowed' });
}

function parseJson(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch (error) {
    return null;
  }
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

function normalizeSiteData(input = {}) {
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

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function signPayload(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createToken(username) {
  const secret = process.env.SESSION_SECRET || 'change-this-secret-for-production';
  const payload = base64Url(JSON.stringify({ username, expiresAt: Date.now() + TOKEN_TTL_MS }));
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  const secret = process.env.SESSION_SECRET || 'change-this-secret-for-production';
  if (!token || !token.includes('.')) return null;

  const [payload, signature] = token.split('.');
  const expected = signPayload(payload, secret);
  const provided = Buffer.from(signature || '');
  const expectedBuffer = Buffer.from(expected);

  if (provided.length !== expectedBuffer.length || !crypto.timingSafeEqual(provided, expectedBuffer)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.expiresAt > Date.now() ? data : null;
  } catch (error) {
    return null;
  }
}

function getToken(event) {
  const authorization = event.headers.authorization || event.headers.Authorization || '';
  if (!authorization.startsWith('Bearer ')) return '';
  return authorization.slice('Bearer '.length).trim();
}

function requireAuth(event) {
  return verifyToken(getToken(event));
}

function siteStore() {
  return getStore('hacking-cv-site');
}

function assetStore() {
  return getStore('hacking-cv-assets');
}

async function readSiteData() {
  const stored = await siteStore().get(SITE_KEY, { type: 'json' }).catch(() => null);
  if (stored) return normalizeSiteData(stored);

  return normalizeSiteData(fallbackSiteData);
}

async function writeSiteData(data) {
  const normalized = normalizeSiteData(data);
  await siteStore().setJSON(SITE_KEY, normalized);
  return normalized;
}

function getUploadInfo(name = '', type = '') {
  const originalName = cleanString(name);
  const mimeType = cleanString(type).toLowerCase();
  const extension = path.extname(originalName).toLowerCase();
  const isPhoto = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension) && mimeType.startsWith('image/');
  const isZip = extension === '.zip' && ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'].includes(mimeType);

  if (!isPhoto && !isZip) {
    return null;
  }

  return {
    kind: isZip ? 'zip' : 'photo',
    extension,
    mimeType,
    originalName,
  };
}

module.exports = {
  MAX_UPLOAD_SIZE,
  TOOLS_PREFIX,
  assetStore,
  createToken,
  getUploadInfo,
  json,
  methodNotAllowed,
  normalizeSiteData,
  parseJson,
  readSiteData,
  requireAuth,
  writeSiteData,
};
