const crypto = require('crypto');
const { MAX_UPLOAD_SIZE, TOOLS_PREFIX, assetStore, getUploadInfo, json, methodNotAllowed, parseJson, requireAuth } = require('./_shared');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return methodNotAllowed();
    if (!requireAuth(event)) return json(401, { error: 'Unauthorized - login garna parne' });

    const body = parseJson(event);
    if (!body) return json(400, { error: 'Invalid JSON' });

    const uploadInfo = getUploadInfo(body.name, body.type);
    if (!uploadInfo) {
      return json(400, { error: 'Only image files and ZIP files upload garna milcha' });
    }

    const fileBuffer = Buffer.from(body.data || '', 'base64');
    if (!fileBuffer.length) return json(400, { error: 'File data missing' });
    if (fileBuffer.length > MAX_UPLOAD_SIZE) {
      return json(400, { error: 'File 10MB bhanda sano hunu parcha' });
    }

    const key = `${TOOLS_PREFIX}${Date.now()}-${crypto.randomBytes(6).toString('hex')}${uploadInfo.extension}`;
    await assetStore().set(key, fileBuffer, {
      metadata: {
        contentType: uploadInfo.mimeType,
        originalName: uploadInfo.originalName,
      },
    });

    return json(200, {
      ok: true,
      kind: uploadInfo.kind,
      url: `/api/blob?key=${encodeURIComponent(key)}`,
      originalName: uploadInfo.originalName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return json(500, { error: error.message || 'Upload failed' });
  }
};
