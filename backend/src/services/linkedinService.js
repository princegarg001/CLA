const axios = require('axios');
const config = require('../config');
const db = require('../db');
const logger = require('../utils/logger');

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

async function postText(text) {
  const conn = await getRawConnection();
  if (!conn) {
    return { status: 'skipped', reason: 'LinkedIn not connected — go to Settings to connect it.', sample: true };
  }
  try {
    const { data } = await axios.post(
      UGC_POSTS_URL,
      {
        author: `urn:li:person:${conn.external_account_id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      },
      {
        headers: {
          Authorization: `Bearer ${conn.access_token}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      }
    );
    return { status: 'success', externalPostId: data.id || null };
  } catch (e) {
    logger.error('linkedinService.postText failed', { error: e.response?.data || e.message });
    return { status: 'failed', error: e.response?.data?.message || e.message };
  }
}

module.exports = { isAppConfigured, getAuthUrl, handleCallback, isConnected, status, disconnect, postText };
