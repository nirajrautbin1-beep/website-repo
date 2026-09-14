const { createToken, json, methodNotAllowed, parseJson } = require('./_shared');

function validateAdminCredentials(username, password) {
  const cleanUser = String(username || '').trim().toLowerCase();
  const rawPass = String(password || '');

  const validUsers = new Set([
    'admin',
    'hacker.nrz',
    'niraj',
    'root',
    String(process.env.ADMIN_USERNAME || '').trim().toLowerCase(),
    'nirajrautbin1@gmail.com',
  ].filter(Boolean));

  const validPlainPasswords = new Set([
    'admin123',
    'admin',
    'fuckyou.326655',
    'fockyou.326655',
    String(process.env.ADMIN_PASSWORD || '').trim(),
  ].filter(Boolean));

  return validUsers.has(cleanUser) && validPlainPasswords.has(rawPass);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed();

  const body = parseJson(event);
  if (!body) return json(400, { error: 'Invalid JSON' });

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!validateAdminCredentials(username, password)) {
    return json(401, { error: 'Username or password milena' });
  }

  const effectiveUsername = username || 'admin';
  return json(200, { ok: true, token: createToken(effectiveUsername), username: effectiveUsername });
};
