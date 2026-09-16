const axios = require('axios');
const config = require('../config');
const db = require('../db');
const logger = require('../utils/logger');

// Posting to your own Facebook Page — far simpler than the Instagram Graph
// API this replaced: no Professional-account linking, no Instagram Tester
// role, just pages_manage_posts on a Page you admin. Same Meta app
// (META_APP_ID/SECRET) as was set up for Instagram; only the scopes and the
// callback path changed.
const GRAPH = 'https://graph.facebook.com/v19.0';
const AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
const SCOPES = 'pages_show_list,pages_read_engagement,pages_manage_posts';

function isAppConfigured() {
  return config.isConfigured('facebook');
}

function getAuthUrl(state) {
  if (!isAppConfigured()) {
    throw Object.assign(new Error('Facebook app not configured — set META_APP_ID/SECRET first'), { status: 400 });
  }
  const params = new URLSearchParams({
    client_id: config.metaAppId,
    redirect_uri: config.metaRedirectUri,
    scope: SCOPES,
    state,
    response_type: 'code',
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function handleCallback(code) {
  // 1. Exchange code for a short-lived user token.
  const { data: shortLived } = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: {
      client_id: config.metaAppId,
      client_secret: config.metaAppSecret,
      redirect_uri: config.metaRedirectUri,
      code,
    },
  });

  // 2. Exchange for a long-lived token (~60 days) so we're not re-authing constantly.
  const { data: longLived } = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: config.metaAppId,
      client_secret: config.metaAppSecret,
      fb_exchange_token: shortLived.access_token,
    },
  });

  // 3. Pick a Page — Page access tokens (not the user token) are what
  // actually post to a Page's feed, and don't expire on their own as long
  // as the underlying user token stays valid.
  const { data: pages } = await axios.get(`${GRAPH}/me/accounts`, {
    params: { access_token: longLived.access_token },
  });

  const page = (pages.data || [])[0];
  if (!page) {
    throw Object.assign(
      new Error('No Facebook Page found on this account — you need to be an admin on at least one Page.'),
      { status: 400 }
    );
  }

  const expiresAt = new Date(Date.now() + (longLived.expires_in || 5184000) * 1000).toISOString();
  const record = {
    platform: 'facebook',
    access_token: page.access_token,
    refresh_token: null,
    expires_at: expiresAt,
    external_account_id: page.id,
    external_account_name: page.name,
  };
  const existing = await getRawConnection();
  if (existing) await db.update('oauth_connections', existing.id, record);
  else await db.insert('oauth_connections', record);
  return { connected: true, name: page.name };
}

async function getRawConnection() {
  const rows = await db.list('oauth_connections', { filters: { platform: 'facebook' } });
  return rows[0] || null;
}

async function isConnected() {
  const conn = await getRawConnection();
  return !!conn;
}

async function status() {
  const conn = await getRawConnection();
  return {
    appConfigured: isAppConfigured(),
    connected: !!conn,
    accountName: conn?.external_account_name || null,
  };
}

async function disconnect() {
  const conn = await getRawConnection();
  if (conn) await db.remove('oauth_connections', conn.id);
  return { connected: false };
}

async function postText(text, imageUrl) {
  const conn = await getRawConnection();
  if (!conn) {
    return { status: 'skipped', reason: 'Facebook not connected — go to Settings to connect it.', sample: true };
  }
  try {
    // A photo post takes the caption as `caption` on /photos; a plain text
    // post takes it as `message` on /feed — same endpoint shape as every
    // other service.postText in this app, branching only on whether an
    // image was attached.
    const endpoint = imageUrl ? `${GRAPH}/${conn.external_account_id}/photos` : `${GRAPH}/${conn.external_account_id}/feed`;
    const params = imageUrl
      ? { url: imageUrl, caption: text, access_token: conn.access_token }
      : { message: text, access_token: conn.access_token };
    const { data } = await axios.post(endpoint, null, { params });
    return { status: 'success', externalPostId: data.post_id || data.id };
  } catch (e) {
    logger.error('facebookService.postText failed', { error: e.response?.data || e.message });
    return { status: 'failed', error: e.response?.data?.error?.message || e.message };
  }
}

module.exports = { isAppConfigured, getAuthUrl, handleCallback, isConnected, status, disconnect, postText };
