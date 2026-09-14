const { json, methodNotAllowed, requireAuth, readSiteData, writeSiteData } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return methodNotAllowed();
  }

  if (!requireAuth(event)) {
    return json(401, { error: 'Unauthorized' });
  }

  try {
    const current = await readSiteData();
    await writeSiteData(current);
    return json(200, {
      ok: true,
      message: 'Successfully synced site data to storage!',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return json(500, { error: err.message || 'Sync failed' });
  }
};
