const fs = require('fs');
const path = require('path');
const { json, methodNotAllowed } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return methodNotAllowed();
  }

  const configPath = path.join(__dirname, '..', '..', 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    return json(200, {
      enabled: false,
      connected: false,
      error: 'Firebase configuration not found',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return json(200, {
      enabled: true,
      connected: true,
      projectId: config.projectId,
      databaseId: config.firestoreDatabaseId || '(default)',
      docExists: true,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return json(200, {
      enabled: false,
      connected: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
};
