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
    const published = await publishContainer(conn, container.id);
    return { status: 'success', externalPostId: published.id };
  } catch (e) {
    logger.error('instagramService.postImage failed', { error: e.response?.data || e.message });
    return { status: 'failed', error: e.response?.data?.error?.message || e.message };
  }
}

async function publishContainer(conn, creationId) {
  const { data } = await axios.post(`${GRAPH}/${conn.external_account_id}/media_publish`, null, {
    params: { creation_id: creationId, access_token: conn.access_token },
  });
  return data;
}

// POST /api/social/publish-carousel — 2-10 images, each uploaded as a
// non-published carousel item container, then wrapped in a parent
// CAROUSEL container before the final publish call.
async function postCarousel(imageUrls, caption) {
  const conn = await getRawConnection();
  if (!conn) return { status: 'skipped', reason: 'Instagram not connected — go to Settings to connect it.', sample: true };
  if (!Array.isArray(imageUrls) || imageUrls.length < 2 || imageUrls.length > 10) {
    return { status: 'skipped', reason: 'Instagram carousels need 2-10 images.', sample: true };
  }
  try {
    const itemIds = [];
    for (const imageUrl of imageUrls) {
      const { data: item } = await axios.post(`${GRAPH}/${conn.external_account_id}/media`, null, {
        params: { image_url: imageUrl, is_carousel_item: true, access_token: conn.access_token },
      });
      itemIds.push(item.id);
    }
    const { data: container } = await axios.post(`${GRAPH}/${conn.external_account_id}/media`, null, {
      params: { media_type: 'CAROUSEL', children: itemIds.join(','), caption, access_token: conn.access_token },
    });
    const published = await publishContainer(conn, container.id);
    return { status: 'success', externalPostId: published.id };
  } catch (e) {
    logger.error('instagramService.postCarousel failed', { error: e.response?.data || e.message });
    return { status: 'failed', error: e.response?.data?.error?.message || e.message };
  }
}

// POST /api/social/publish-reel — video_url must be a publicly reachable
// .mp4; Graph API fetches and processes it asynchronously before it can be
// published, so this polls the container's status_code briefly.
async function postReel(videoUrl, caption) {
  const conn = await getRawConnection();
  if (!conn) return { status: 'skipped', reason: 'Instagram not connected — go to Settings to connect it.', sample: true };
  if (!videoUrl) return { status: 'skipped', reason: 'Reels require a video URL — none was attached.', sample: true };
  try {
    const { data: container } = await axios.post(`${GRAPH}/${conn.external_account_id}/media`, null, {
      params: { media_type: 'REELS', video_url: videoUrl, caption, access_token: conn.access_token },
    });
    await waitForContainerReady(conn, container.id);
    const published = await publishContainer(conn, container.id);
    return { status: 'success', externalPostId: published.id };
  } catch (e) {
    logger.error('instagramService.postReel failed', { error: e.response?.data || e.message });
    return { status: 'failed', error: e.response?.data?.error?.message || e.message };
  }
}

// POST /api/social/publish-story — an image or video Story; no caption field.
async function postStory({ imageUrl, videoUrl }) {
  const conn = await getRawConnection();
  if (!conn) return { status: 'skipped', reason: 'Instagram not connected — go to Settings to connect it.', sample: true };
  if (!imageUrl && !videoUrl) return { status: 'skipped', reason: 'Stories require an image or video URL.', sample: true };
  try {
    const params = { media_type: 'STORIES', access_token: conn.access_token };
    if (videoUrl) params.video_url = videoUrl;
    else params.image_url = imageUrl;
    const { data: container } = await axios.post(`${GRAPH}/${conn.external_account_id}/media`, null, { params });
    if (videoUrl) await waitForContainerReady(conn, container.id);
    const published = await publishContainer(conn, container.id);
    return { status: 'success', externalPostId: published.id };
  } catch (e) {
    logger.error('instagramService.postStory failed', { error: e.response?.data || e.message });
    return { status: 'failed', error: e.response?.data?.error?.message || e.message };
  }
}

// Video containers process asynchronously — poll status_code until it's no
// longer IN_PROGRESS (Meta's own recommended pattern), capped so a stalled
// upload can't hang the request forever.
async function waitForContainerReady(conn, containerId, { maxAttempts = 10, delayMs = 3000 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await axios.get(`${GRAPH}/${containerId}`, {
      params: { fields: 'status_code', access_token: conn.access_token },
    });
    if (data.status_code === 'FINISHED') return true;
    if (data.status_code === 'ERROR') throw new Error('Instagram media processing failed (status_code=ERROR)');
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error('Instagram media still processing after the wait window — try publishing again shortly.');
}

async function getAccountInsights() {
  const conn = await getRawConnection();
  if (!conn) {
    return { sample: true, reach: 4200, impressions: 6800, followerCount: 812, profileViews: 190 };
  }
  try {
    const { data } = await axios.get(`${GRAPH}/${conn.external_account_id}/insights`, {
      params: { metric: 'reach,impressions,profile_views', period: 'day', access_token: conn.access_token },
    });
    const metrics = (data.data || []).reduce((acc, m) => {
      const total = (m.values || []).reduce((sum, v) => sum + (v.value || 0), 0);
      acc[m.name] = total;
      return acc;
    }, {});
    const { data: account } = await axios.get(`${GRAPH}/${conn.external_account_id}`, {
      params: { fields: 'followers_count,media_count', access_token: conn.access_token },
    });
    return {
      reach: metrics.reach || 0,
      impressions: metrics.impressions || 0,
      profileViews: metrics.profile_views || 0,
      followerCount: account.followers_count,
      mediaCount: account.media_count,
    };
  } catch (e) {
    logger.error('instagramService.getAccountInsights failed', { error: e.response?.data || e.message });
    throw Object.assign(new Error(`Instagram insights fetch failed: ${e.response?.data?.error?.message || e.message}`), { status: 502 });
  }
}

async function getMedia({ limit = 25 } = {}) {
  const conn = await getRawConnection();
  if (!conn) {
    return [{
      id: 'sample-media-1', caption: 'Behind the scenes building AlphoTech', mediaType: 'IMAGE',
      permalink: 'https://instagram.com', timestamp: new Date().toISOString(),
      likeCount: 42, commentsCount: 5, sample: true,
    }];
  }
  try {
    const { data } = await axios.get(`${GRAPH}/${conn.external_account_id}/media`, {
      params: {
        fields: 'id,caption,media_type,permalink,timestamp,like_count,comments_count,thumbnail_url,media_url',
        limit,
        access_token: conn.access_token,
      },
    });
    return (data.data || []).map((m) => ({
      id: m.id,
      caption: m.caption || '',
      mediaType: m.media_type,
      permalink: m.permalink,
      timestamp: m.timestamp,
      likeCount: m.like_count || 0,
      commentsCount: m.comments_count || 0,
      thumbnailUrl: m.thumbnail_url || m.media_url || null,
    }));
  } catch (e) {
    logger.error('instagramService.getMedia failed', { error: e.response?.data || e.message });
    throw Object.assign(new Error(`Instagram media fetch failed: ${e.response?.data?.error?.message || e.message}`), { status: 502 });
  }
}

async function getMediaInsights(mediaId) {
  const conn = await getRawConnection();
  if (!conn) return { sample: true, reach: 900, impressions: 1400, engagement: 120, saved: 8 };
  try {
    const { data } = await axios.get(`${GRAPH}/${mediaId}/insights`, {
      params: { metric: 'reach,impressions,engagement,saved', access_token: conn.access_token },
    });
    return (data.data || []).reduce((acc, m) => {
      acc[m.name] = (m.values || [])[0]?.value || 0;
      return acc;
    }, {});
  } catch (e) {
    logger.error('instagramService.getMediaInsights failed', { error: e.response?.data || e.message });
    throw Object.assign(new Error(`Instagram media insights fetch failed: ${e.response?.data?.error?.message || e.message}`), { status: 502 });
  }
}

async function getComments(mediaId) {
  const conn = await getRawConnection();
  if (!conn) return [{ id: 'sample-comment-1', text: 'This is exactly what we needed, DMing you', username: 'founder_dev', sample: true }];
  try {
    const { data } = await axios.get(`${GRAPH}/${mediaId}/comments`, {
      params: { fields: 'id,text,username,timestamp,like_count', access_token: conn.access_token },
    });
    return (data.data || []).map((c) => ({
      id: c.id, text: c.text, username: c.username, timestamp: c.timestamp, likeCount: c.like_count || 0,
    }));
  } catch (e) {
    logger.error('instagramService.getComments failed', { error: e.response?.data || e.message });
    throw Object.assign(new Error(`Instagram comments fetch failed: ${e.response?.data?.error?.message || e.message}`), { status: 502 });
  }
}

module.exports = {
  isAppConfigured, getAuthUrl, handleCallback, isConnected, status, disconnect,
  postImage, postCarousel, postReel, postStory,
  getAccountInsights, getMedia, getMediaInsights, getComments,
};
