// One place that knows each platform's hard limits (text length, media
// counts/sizes, required fields). The web composer shows these live, the
// calendar/publish routes reject violations up front, and publishEngine
// re-checks right before sending — so a post can't get as far as an
// upstream API error that a length check would have caught.

const MB = 1024 * 1024;

// What we accept for upload at all (Supabase's free plan caps a file at 50MB).
const MEDIA_TYPES = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'gif',
  'video/mp4': 'video',
  'video/quicktime': 'video',
};
const UPLOAD_MAX_BYTES = 50 * MB;

const LIMITS = {
  twitter: {
    text: 280,
    maxThreadTweets: 25,
    maxImages: 4,
    image: { maxBytes: 5 * MB },
    gif: { maxBytes: 15 * MB },
    video: { maxBytes: 50 * MB },
  },
  linkedin: {
    text: 3000,
    maxImages: 9,
    image: { maxBytes: 8 * MB },
    video: { maxBytes: 50 * MB },
  },
  reddit: {
    title: 300,
    text: 40000,
    image: { maxBytes: 20 * MB },
  },
  facebook: {
    text: 63000,
  },
};

const SUPPORTED_PLATFORMS = Object.keys(LIMITS);

function publicLimits() {
  return { limits: LIMITS, uploadMaxBytes: UPLOAD_MAX_BYTES, mediaTypes: MEDIA_TYPES };
}

// X counts every URL as 23 characters regardless of its real length.
const URL_RE = /https?:\/\/\S+/g;
function tweetLength(text) {
  const t = String(text || '');
  return Array.from(t.replace(URL_RE, 'x'.repeat(23))).length;
}

function splitThread(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function inferMediaType(url = '', mime = '') {
  if (MEDIA_TYPES[mime]) return MEDIA_TYPES[mime];
  const ext = String(url).split('?')[0].split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image';
  if (ext === 'gif') return 'gif';
  if (['mp4', 'mov'].includes(ext)) return 'video';
  return 'image';
}

// Media lives in raw.media ({url,type,mime,size,name}) when the composer
// uploaded it; older/plain entries only have media_urls, so fall back to that.
function entryMedia(entry) {
  const raw = entry.raw || {};
  if (Array.isArray(raw.media) && raw.media.length) return raw.media;
  return (entry.media_urls || []).map((url) => ({ url, type: inferMediaType(url) }));
}

// Per-platform overrides live in raw.variants[platform]; anything not
// overridden falls back to the shared content.
function variantFor(platform, entry) {
  const v = (entry.raw && entry.raw.variants && entry.raw.variants[platform]) || {};
  return { ...v, text: v.text !== undefined && v.text !== null ? v.text : entry.content || '' };
}

function fmtMB(bytes) {
  return `${(bytes / MB).toFixed(bytes < MB ? 2 : 1)}MB`;
}

function checkSizes(media, rules, errors) {
  for (const m of media) {
    const rule = rules[m.type];
    if (rule && m.size && m.size > rule.maxBytes) {
      errors.push({ field: 'media', message: `${m.name || m.type} is ${fmtMB(m.size)} — limit is ${fmtMB(rule.maxBytes)}` });
    }
  }
}

function validateTwitter(entry) {
  const L = LIMITS.twitter;
  const errors = [];
  const warnings = [];
  const v = variantFor('twitter', entry);
  const media = entryMedia(entry);
  const isThread = entry.post_type === 'thread';
  const tweets = isThread ? splitThread(v.text) : [String(v.text || '').trim()];

  if (!tweets.length || (!tweets[0] && !media.length)) {
    errors.push({ field: 'text', message: 'Write something or attach media' });
  }
  if (isThread && tweets.length > L.maxThreadTweets) {
    errors.push({ field: 'text', message: `Threads are capped at ${L.maxThreadTweets} tweets (this has ${tweets.length})` });
  }
  tweets.forEach((t, i) => {
    const len = tweetLength(t);
    if (len > L.text) {
      errors.push({ field: 'text', message: isThread ? `Tweet ${i + 1} is ${len}/${L.text} characters` : `${len}/${L.text} characters` });
    }
  });

  const images = media.filter((m) => m.type === 'image');
  const gifs = media.filter((m) => m.type === 'gif');
  const videos = media.filter((m) => m.type === 'video');
  if (images.length > L.maxImages) errors.push({ field: 'media', message: `At most ${L.maxImages} images per tweet` });
  if (videos.length > 1) errors.push({ field: 'media', message: 'Only one video per tweet' });
  if (gifs.length > 1) errors.push({ field: 'media', message: 'Only one GIF per tweet' });
  if ((videos.length || gifs.length) && media.length > 1) {
    errors.push({ field: 'media', message: "A video or GIF can't be combined with other media in one tweet" });
  }
  checkSizes(media, L, errors);
  if (isThread && media.length) warnings.push({ field: 'media', message: 'Media is attached to the first tweet only' });

  const first = tweets[0] || '';
  return { errors, warnings, text: { length: tweetLength(first), limit: L.text } };
}

function validateLinkedIn(entry) {
  const L = LIMITS.linkedin;
  const errors = [];
  const warnings = [];
  const v = variantFor('linkedin', entry);
  const media = entryMedia(entry);
  const text = String(v.text || '');

  if (!text.trim() && !media.length) errors.push({ field: 'text', message: 'Write something or attach media' });
  if (Array.from(text).length > L.text) errors.push({ field: 'text', message: `${Array.from(text).length}/${L.text} characters` });

  const images = media.filter((m) => m.type === 'image' || m.type === 'gif');
  const videos = media.filter((m) => m.type === 'video');
  if (images.length > L.maxImages) errors.push({ field: 'media', message: `At most ${L.maxImages} images per post` });
  if (videos.length > 1) errors.push({ field: 'media', message: 'Only one video per post' });
  if (videos.length && images.length) errors.push({ field: 'media', message: "Images and video can't be mixed in one LinkedIn post" });
  if (v.linkUrl && media.length) errors.push({ field: 'link', message: "A link preview and media can't be combined — pick one" });
  if (v.linkUrl && !/^https?:\/\//i.test(v.linkUrl)) errors.push({ field: 'link', message: 'Link must start with http:// or https://' });
  checkSizes(media, L, errors);
  if (media.some((m) => m.type === 'gif')) warnings.push({ field: 'media', message: 'GIFs post as a static image on LinkedIn' });

  return { errors, warnings, text: { length: Array.from(text).length, limit: L.text } };
}

function redditKind(entry) {
  const v = variantFor('reddit', entry);
  if (v.kind) return v.kind;
  const media = entryMedia(entry);
  if (media.length) return 'image';
  if (v.linkUrl) return 'link';
  return 'self';
}

function validateReddit(entry) {
  const L = LIMITS.reddit;
  const errors = [];
  const warnings = [];
  const v = variantFor('reddit', entry);
  const media = entryMedia(entry);
  const kind = redditKind(entry);
  const title = String(v.title || '');

  if (!v.subreddit) errors.push({ field: 'subreddit', message: 'Pick a subreddit' });
  else if (!/^[A-Za-z0-9_]{2,21}$/.test(String(v.subreddit).replace(/^r\//i, ''))) {
    errors.push({ field: 'subreddit', message: 'Subreddit names are 2–21 letters, numbers or underscores' });
  }
  if (!title.trim()) errors.push({ field: 'title', message: 'Reddit posts need a title' });
  if (Array.from(title).length > L.title) errors.push({ field: 'title', message: `Title is ${Array.from(title).length}/${L.title} characters` });

  if (!['self', 'link', 'image'].includes(kind)) {
    errors.push({ field: 'kind', message: `Unsupported post type "${kind}"` });
  }
  if (kind === 'self' && Array.from(String(v.text || '')).length > L.text) {
    errors.push({ field: 'text', message: `Body is over ${L.text} characters` });
  }
  if (kind === 'link') {
    if (!v.linkUrl) errors.push({ field: 'link', message: 'Add the link to share' });
    else if (!/^https?:\/\//i.test(v.linkUrl)) errors.push({ field: 'link', message: 'Link must start with http:// or https://' });
  }
  if (kind === 'image') {
    if (media.some((m) => m.type === 'video')) {
      errors.push({ field: 'media', message: "Reddit doesn't accept video through the API — share a link to the video instead" });
    } else if (media.length !== 1) {
      errors.push({ field: 'media', message: media.length ? 'Reddit image posts take exactly one image' : 'Attach the image to post' });
    } else if (media[0].type === 'gif') {
      errors.push({ field: 'media', message: "Reddit GIF posts aren't supported here — use a still image or a link" });
    }
    checkSizes(media, L, errors);
  }
  if (kind !== 'image' && media.length) warnings.push({ field: 'media', message: 'Media is ignored for text/link posts on Reddit' });

  return { errors, warnings, text: { length: Array.from(title).length, limit: L.title } };
}

function validateFacebook(entry) {
  const errors = [];
  const v = variantFor('facebook', entry);
  if (!String(v.text || '').trim() && !entryMedia(entry).length) errors.push({ field: 'text', message: 'Write something or attach media' });
  return { errors, warnings: [], text: { length: Array.from(String(v.text || '')).length, limit: LIMITS.facebook.text } };
}

const VALIDATORS = { twitter: validateTwitter, linkedin: validateLinkedIn, reddit: validateReddit, facebook: validateFacebook };

// Validates an entry against every platform it targets.
function validateEntry(entry) {
  const platforms = Array.isArray(entry.platforms) ? entry.platforms : [];
  const perPlatform = {};
  const errors = [];
  const warnings = [];

  if (!platforms.length) errors.push({ platform: null, field: 'platforms', message: 'Pick at least one platform' });

  for (const p of platforms) {
    const validator = VALIDATORS[p];
    if (!validator) {
      const err = { field: 'platforms', message: `Unknown platform "${p}"` };
      perPlatform[p] = { errors: [err], warnings: [], text: null };
      errors.push({ platform: p, ...err });
      continue;
    }
    const r = validator(entry);
    perPlatform[p] = r;
    r.errors.forEach((e) => errors.push({ platform: p, ...e }));
    r.warnings.forEach((w) => warnings.push({ platform: p, ...w }));
  }
  return { ok: errors.length === 0, errors, warnings, platforms: perPlatform };
}

module.exports = {
  LIMITS,
  MEDIA_TYPES,
  UPLOAD_MAX_BYTES,
  SUPPORTED_PLATFORMS,
  publicLimits,
  tweetLength,
  splitThread,
  inferMediaType,
  entryMedia,
  variantFor,
  redditKind,
  validateEntry,
};
