const axios = require('axios');
const config = require('../config');
const db = require('../db');
const logger = require('../utils/logger');
const { isRetriable, upstreamMessage } = require('../utils/http');

// Posting to your OWN profile only needs LinkedIn's self-serve "Share on
// LinkedIn" product (openid + profile + w_member_social scopes) — no
// Partner Program approval. Posting to a Company Page instead needs the
// slow partner-approval path, which this does not implement.
const AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const UGC_POSTS_URL = 'https://api.linkedin.com/v2/ugcPosts';
const SCOPES = 'openid profile w_member_social';

function isAppConfigured() {
  return config.isConfigured('linkedin');
}

function getAuthUrl(state) {
  if (!isAppConfigured()) {
    throw Object.assign(new Error('LinkedIn app not configured — set LINKEDIN_CLIENT_ID/SECRET first'), { status: 400 });
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.linkedinClientId,
    redirect_uri: config.linkedinRedirectUri,
    scope: SCOPES,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function handleCallback(code) {
  const { data: tokenData } = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.linkedinRedirectUri,
      client_id: config.linkedinClientId,
      client_secret: config.linkedinClientSecret,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { data: userInfo } = await axios.get(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 0) * 1000).toISOString();
  const existing = await getRawConnection();
  const record = {
    platform: 'linkedin',
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || null,
    expires_at: expiresAt,
    external_account_id: userInfo.sub,
    external_account_name: userInfo.name || null,
  };
  if (existing) {
    await db.update('oauth_connections', existing.id, record);
  } else {
    await db.insert('oauth_connections', record);
  }
  return { connected: true, name: userInfo.name };
}

async function getRawConnection() {
  const rows = await db.list('oauth_connections', { filters: { platform: 'linkedin' } });
  return rows[0] || null;
}

async function isConnected() {
  const conn = await getRawConnection();
  return !!conn;
}

function daysUntil(iso) {
  if (!iso) return null;
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86400000);
}

// Self-serve LinkedIn tokens last ~60 days and can't be refreshed, so the
// only fix for an expiring one is reconnecting — surface how long is left so
// the UI can warn before scheduled posts start failing.
async function status() {
  const conn = await getRawConnection();
  const daysLeft = conn ? daysUntil(conn.expires_at) : null;
  return {
    appConfigured: isAppConfigured(),
    connected: !!conn,
    accountName: conn?.external_account_name || null,
    expiresAt: conn?.expires_at || null,
    daysLeft,
    expired: daysLeft !== null && daysLeft < 0,
  };
}

async function disconnect() {
  const conn = await getRawConnection();
  if (conn) await db.remove('oauth_connections', conn.id);
  return { connected: false };
}

const ASSETS_URL = 'https://api.linkedin.com/v2/assets';
const RECIPES = { image: 'urn:li:digitalmediaRecipe:feedshare-image', video: 'urn:li:digitalmediaRecipe:feedshare-video' };

function authHeaders(conn, extra = {}) {
  return { Authorization: `Bearer ${conn.access_token}`, 'X-Restli-Protocol-Version': '2.0.0', ...extra };
}

// Two-step media upload: ask LinkedIn for an upload URL + asset URN, then PUT
// the raw bytes there. The asset URN is what the post itself references.
async function uploadAsset(conn, { buffer, mime, kind }) {
  const { data } = await axios.post(
    `${ASSETS_URL}?action=registerUpload`,
    {
      registerUploadRequest: {
        recipes: [RECIPES[kind]],
        owner: `urn:li:person:${conn.external_account_id}`,
        serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
      },
    },
    { headers: authHeaders(conn, { 'Content-Type': 'application/json' }), timeout: 30000 }
  );
  const uploadUrl = data.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
  const asset = data.value?.asset;
  if (!uploadUrl || !asset) throw new Error('LinkedIn did not return an upload URL');

  await axios.put(uploadUrl, buffer, {
    headers: { Authorization: `Bearer ${conn.access_token}`, 'Content-Type': mime || 'application/octet-stream' },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 120000,
  });
  return asset;
}

// Videos are transcoded after upload; posting before that finishes fails.
async function waitForAsset(conn, assetUrn, { attempts = 12, delayMs = 5000 } = {}) {
  const id = assetUrn.split(':').pop();
  for (let i = 0; i < attempts; i++) {
    const { data } = await axios.get(`${ASSETS_URL}/${id}`, { headers: authHeaders(conn), timeout: 15000 });
    const state = data.recipes?.[0]?.status;
    if (state === 'AVAILABLE') return true;
    if (state === 'CLIENT_ERROR' || state === 'SERVER_ERROR') throw new Error(`LinkedIn could not process the video (${state})`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw Object.assign(new Error('LinkedIn is still processing the video — try again in a few minutes'), { retriable: true });
}

// text-only, image(s), one video, or a link preview — LinkedIn allows exactly
// one of those per post. `media` items carry a downloaded `buffer`.
async function publish({ text = '', media = [], linkUrl } = {}) {
  const conn = await getRawConnection();
  if (!conn) {
    return { status: 'skipped', reason: 'LinkedIn not connected — go to Settings to connect it.', sample: true };
  }
  if (conn.expires_at && new Date(conn.expires_at).getTime() < Date.now()) {
    return { status: 'failed', retriable: false, error: 'LinkedIn access expired — reconnect it in Settings → Connected Accounts.' };
  }

  try {
    let category = 'NONE';
    let mediaBlock;

    const video = media.find((m) => m.type === 'video');
    const images = media.filter((m) => m.type === 'image' || m.type === 'gif');

    if (video) {
      const asset = await uploadAsset(conn, { buffer: video.buffer, mime: video.mime, kind: 'video' });
      await waitForAsset(conn, asset);
      category = 'VIDEO';
      mediaBlock = [{ status: 'READY', media: asset }];
    } else if (images.length) {
      const assets = [];
      for (const img of images) {
        assets.push(await uploadAsset(conn, { buffer: img.buffer, mime: img.mime, kind: 'image' }));
      }
      category = 'IMAGE';
      mediaBlock = assets.map((asset) => ({ status: 'READY', media: asset }));
    } else if (linkUrl) {
      category = 'ARTICLE';
      mediaBlock = [{ status: 'READY', originalUrl: linkUrl }];
    }

    const shareContent = { shareCommentary: { text }, shareMediaCategory: category };
    if (mediaBlock) shareContent.media = mediaBlock;

    const { data } = await axios.post(
      UGC_POSTS_URL,
      {
        author: `urn:li:person:${conn.external_account_id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: { 'com.linkedin.ugc.ShareContent': shareContent },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      },
      { headers: authHeaders(conn, { 'Content-Type': 'application/json' }), timeout: 30000 }
    );
    return {
      status: 'success',
      externalPostId: data.id || null,
      url: data.id ? `https://www.linkedin.com/feed/update/${data.id}/` : null,
    };
  } catch (e) {
    logger.error('linkedinService.publish failed', { error: e.response?.data || e.message });
    return { status: 'failed', error: upstreamMessage(e), retriable: e.retriable === true || isRetriable(e) };
  }
}

// Original text-only entry point (used by the legacy publish route).
function postText(text) {
  return publish({ text });
}

module.exports = { isAppConfigured, getAuthUrl, handleCallback, isConnected, status, disconnect, publish, postText };
