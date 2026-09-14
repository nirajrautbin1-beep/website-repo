const { json, methodNotAllowed } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed();
  return json(200, { ok: true });
};
