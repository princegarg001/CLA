const config = require('../config');
const logger = require('../utils/logger');

const BUCKET = 'social-media';

let client = null;
function getClient() {
  if (!client) {
    const { createClient } = require('@supabase/supabase-js');
    client = createClient(config.supabaseUrl, config.supabaseKey);
  }
  return client;
}

// Instagram's Graph API needs a publicly reachable image_url — it fetches
// the image itself rather than accepting raw bytes — so a picked photo has
// to be hosted somewhere before /api/social/publish can pass it along.
// Uploads to a public Supabase Storage bucket and returns that public URL.
async function uploadImage({ buffer, filename, mimeType }) {
  if (!config.isConfigured('supabase')) {
    throw Object.assign(new Error('Image hosting requires Supabase to be configured (SUPABASE_URL/SUPABASE_KEY).'), { status: 503 });
  }
  const supabase = getClient();
  const path = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (uploadError) {
    logger.error('storageService.uploadImage failed', { error: uploadError.message });
    throw Object.assign(new Error(`Image upload failed: ${uploadError.message}. Make sure a public bucket named "${BUCKET}" exists in Supabase Storage.`), { status: 502 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

module.exports = { uploadImage, BUCKET };
