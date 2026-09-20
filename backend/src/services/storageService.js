const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { MEDIA_TYPES, UPLOAD_MAX_BYTES } = require('./socialRules');

const BUCKET = 'social-media';

let client = null;
function getClient() {
  if (!client) {
    const { createClient } = require('@supabase/supabase-js');
    client = createClient(config.supabaseUrl, config.supabaseKey);
  }
  return client;
}

function requireSupabase() {
  if (!config.isConfigured('supabase')) {
    throw Object.assign(new Error('Media hosting requires Supabase to be configured (SUPABASE_URL/SUPABASE_KEY).'), { status: 503 });
  }
  return getClient();
}

function publicPrefix() {
  return `${config.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/`;
}

// LinkedIn, X and Reddit all need the raw bytes (or, for Facebook, a public
// URL) — so every picked image/video is hosted in a public Supabase Storage
// bucket first and referenced by URL from then on.
async function uploadMedia({ buffer, filename, mimeType }) {
  const type = MEDIA_TYPES[mimeType];
  if (!type) {
    throw Object.assign(new Error(`Unsupported file type "${mimeType}". Use JPG, PNG, WebP, GIF, MP4 or MOV.`), { status: 400 });
  }
  if (buffer.length > UPLOAD_MAX_BYTES) {
    throw Object.assign(new Error(`File is ${(buffer.length / 1048576).toFixed(1)}MB — the upload limit is ${UPLOAD_MAX_BYTES / 1048576}MB.`), { status: 413 });
  }
  const supabase = requireSupabase();
  const safe = String(filename || 'upload').replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${Date.now()}-${safe}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: mimeType, upsert: false });
  if (error) {
    logger.error('storageService.uploadMedia failed', { error: error.message });
    throw Object.assign(
      new Error(`Upload failed: ${error.message}. Make sure a public bucket named "${BUCKET}" exists in Supabase Storage.`),
      { status: 502 }
    );
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path, type, mime: mimeType, size: buffer.length, name: filename || safe };
}

// Kept for the original image-only route/clients.
async function uploadImage({ buffer, filename, mimeType }) {
  const { url } = await uploadMedia({ buffer, filename, mimeType });
  return url;
}

async function listMedia({ limit = 60 } = {}) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.storage.from(BUCKET).list('', {
    limit,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) throw Object.assign(new Error(`Could not list media: ${error.message}`), { status: 502 });
  return (data || [])
    .filter((f) => f.name && f.id) // folders come back without an id
    .map((f) => {
      const mime = f.metadata?.mimetype || '';
      return {
        path: f.name,
        url: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
        type: MEDIA_TYPES[mime] || 'image',
        mime,
        size: f.metadata?.size || 0,
        name: f.name.replace(/^\d+-/, ''),
        createdAt: f.created_at,
      };
    });
}

async function deleteMedia(path) {
  const supabase = requireSupabase();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw Object.assign(new Error(`Could not delete media: ${error.message}`), { status: 502 });
  return { deleted: true };
}

// Fetches a hosted file back as a Buffer for platforms that need raw bytes.
// Restricted to our own bucket so a crafted media URL on a calendar entry
// can't make the server fetch arbitrary internal/external addresses.
async function download(url) {
  if (!config.isConfigured('supabase') || !String(url).startsWith(publicPrefix())) {
    throw Object.assign(new Error('Media must be uploaded through the app before it can be posted.'), { status: 400 });
  }
  const { data } = await axios.get(url, {
    responseType: 'arraybuffer',
    maxContentLength: UPLOAD_MAX_BYTES + 1048576,
    timeout: 60000,
  });
  return Buffer.from(data);
}

module.exports = { uploadMedia, uploadImage, listMedia, deleteMedia, download, BUCKET };
