const { json, requireAuth } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const auth = requireAuth(event);
  return json(200, { authenticated: Boolean(auth), username: auth?.username || '' });
};
