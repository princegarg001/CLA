const Parser = require('rss-parser');
const logger = require('../utils/logger');

const parser = new Parser({ timeout: 15000 });

async function fetchFeed(url, fallback = []) {
  if (!url) return fallback;
  try {
    const feed = await parser.parseURL(url);
    return (feed.items || []).map((item) => ({
      title: item.title,
      link: item.link,
      publishedAt: item.pubDate || item.isoDate,
      summary: item.contentSnippet || item.summary || '',
    }));
  } catch (e) {
    logger.warn('rssService.fetchFeed failed, returning fallback', { url, error: e.message });
    return fallback;
  }
}

module.exports = { fetchFeed };
