// Shared classification of upstream (LinkedIn/X/Reddit) failures so the
// scheduler knows whether trying again later can possibly help.

// Network drop, 5xx, or 429 → worth retrying. 4xx (bad content, expired
// token, forbidden) → retrying just fails the same way.
function isRetriable(err) {
  if (!err) return false;
  const status = err.response?.status;
  if (status === undefined) {
    // No HTTP response at all: DNS/reset/timeout are transient; anything
    // thrown by our own code (validation etc.) is not.
    const code = err.code;
    return ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'ERR_NETWORK'].includes(code);
  }
  return status >= 500 || status === 429;
}

// Best human-readable message out of an axios error, falling back to the
// generic message.
function upstreamMessage(err, fallback = 'Request failed') {
  const d = err?.response?.data;
  if (!d) return err?.message || fallback;
  if (typeof d === 'string') return d.slice(0, 300);
  return d.message || d.detail || d.error?.message || d.error_description || d.title || err.message || fallback;
}

module.exports = { isRetriable, upstreamMessage };
