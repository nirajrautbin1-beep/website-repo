const { json, methodNotAllowed, parseJson, readSiteData, requireAuth, writeSiteData } = require('./_shared');

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const data = await readSiteData();
      return json(200, data);
    }

    if (event.httpMethod === 'POST') {
      if (!requireAuth(event)) return json(401, { error: 'Unauthorized' });

      const body = parseJson(event);
      if (!body) return json(400, { error: 'Invalid JSON' });

      const data = await writeSiteData(body);
      return json(200, { ok: true, data });
    }

    return methodNotAllowed();
  } catch (error) {
    return json(500, { error: 'Could not process site data' });
  }
};
