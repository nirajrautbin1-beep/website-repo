const path = require('path');
const { TOOLS_PREFIX, assetStore } = require('./_shared');

const contentTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.zip': 'application/zip',
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, body: 'Method not allowed' };
    }

    const key = event.queryStringParameters?.key || '';
    if (!key.startsWith(TOOLS_PREFIX) || key.includes('..')) {
      return { statusCode: 400, body: 'Invalid file key' };
    }

    const data = await assetStore().get(key, { type: 'arrayBuffer' });
    if (!data) return { statusCode: 404, body: 'File not found' };

    const extension = path.extname(key).toLowerCase();
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': contentTypes[extension] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      body: Buffer.from(data).toString('base64'),
    };
  } catch (error) {
    return { statusCode: 500, body: 'Could not load file' };
  }
};
