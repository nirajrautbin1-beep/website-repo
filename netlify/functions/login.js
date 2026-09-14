const { createToken, json, methodNotAllowed, parseJson } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed();

  const body = parseJson(event);
  if (!body) return json(400, { error: 'Invalid JSON' });

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const usernameOk = username === adminUsername;
  const passwordOk = password === adminPassword;

  if (!usernameOk || !passwordOk) {
    return json(401, { error: 'Username or password milena' });
  }

  return json(200, { ok: true, token: createToken(username) });
};
