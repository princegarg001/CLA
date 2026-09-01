const axios = require('axios');
const config = require('../config');
const db = require('../db');
const logger = require('../utils/logger');

// Posting to your OWN Instagram Business/Creator account works in a Meta
// app's development mode by adding that account as a "Tester" — no App
// Review or Business Verification needed for single-account use. See
// developers.facebook.com/docs/instagram-platform. Instagram has no
// text-only posts — every publish needs an image.
const GRAPH = 'https://graph.facebook.com/v19.0';
const AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
const SCOPES = 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management';

function isAppConfigured() {
  return config.isConfigured('instagram');
}

function getAuthUrl(state) {
  if (!isAppConfigured()) {
    throw Object.assign(new Error('Instagram app not configured — set META_APP_ID/SECRET first'), { status: 400 });
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

  // 3. Find a Page with a linked Instagram Business/Creator account.
  const { data: pages } = await axios.get(`${GRAPH}/me/accounts`, {
    params: { access_token: longLived.access_token },
  });

  for (const page of pages.data || []) {
    const { data: pageDetail } = await axios.get(`${GRAPH}/${page.id}`, {
      params: { fields: 'instagram_business_account', access_token: page.access_token },
    });
    const igAccount = pageDetail.instagram_business_account;
    if (igAccount) {
      const expiresAt = new Date(Date.now() + (longLived.expires_in || 5184000) * 1000).toISOString();
      const record = {
        platform: 'instagram',
        access_token: page.access_token, // Instagram Graph API calls use the linked Page's token
        refresh_token: null,
        expires_at: expiresAt,
        external_account_id: igAccount.id,
        external_account_name: page.name,
      };
      const existing = await getRawConnection();
      if (existing) await db.update('oauth_connections', existing.id, record);
      else await db.insert('oauth_connections', record);
      return { connected: true, name: page.name };
    }
  }

  throw Object.assign(
    new Error('No Instagram Business/Creator account found on any of your Facebook Pages. Make sure your Instagram account is set to Business/Creator and linked to a Page.'),
    { status: 400 }
  );
}

async function getRawConnection() {
  const rows = await db.list('oauth_connections', { filters: { platform: 'instagram' } });
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

async function postImage(imageUrl, caption) {
  const conn = await getRawConnection();
  if (!conn) {
    return { status: 'skipped', reason: 'Instagram not connected — go to Settings to connect it.', sample: true };
  }
  if (!imageUrl) {
    return { status: 'skipped', reason: 'Instagram requires an image — none was attached.', sample: true };
  }
  try {
    const { data: container } = await axios.post(`${GRAPH}/${conn.external_account_id}/media`, null, {
      params: { image_url: imageUrl, caption, access_token: conn.access_token },
    });
    const { data: published } = await axios.post(`${GRAPH}/${conn.external_account_id}/media_publish`, null, {
      params: { creation_id: container.id, access_token: conn.access_token },
    });
    return { status: 'success', externalPostId: published.id };
  } catch (e) {
    logger.error('instagramService.postImage failed', { error: e.response?.data || e.message });
    return { status: 'failed', error: e.response?.data?.error?.message || e.message };
  }
}

module.exports = { isAppConfigured, getAuthUrl, handleCallback, isConnected, status, disconnect, postImage };
