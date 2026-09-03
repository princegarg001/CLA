const config = require('../config');
const db = require('../db');
const aiService = require('./aiService');
const apolloService = require('./apolloService');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

// Workflow 4 ("The Lead Pipeline") — called once, right after a lead is
// inserted, from every intake path (routes/leads.js, webhooks, Apollo
// import, jobFetch cron). Branches by score exactly as the automation plan
// specifies; score 5-7 and 1-4 deliberately do nothing here — their handling
// (lazy brief-on-open via POST /api/intelligence/brief/:id, weekly batch via
// cron/weeklyReport.js) already exists and doesn't need duplicating.
async function onLeadCreated(lead) {
  if (!lead || (lead.score || 0) < 8) return null;

  try {
    const [brief, outreachDraft] = await Promise.all([
      aiService.generateLeadBrief(lead),
      aiService.generateOutreachMessage({
        lead,
        tone: 'founder_to_founder',
        market: lead.region || 'US',
        channel: inferChannel(lead),
      }),
    ]);

    await db.update('leads', lead.id, { ai_brief: brief });
    await db.insert('messages', {
      lead_id: lead.id,
      channel: inferChannel(lead),
      tone: 'founder_to_founder',
      market: lead.region || 'US',
      body: outreachDraft,
      direction: 'outbound',
      ai_generated: true,
      status: 'draft',
    });

    logger.info(`leadPipeline: score ${lead.score} lead ${lead.id} (${lead.company || lead.name}) — brief + outreach draft ready`);

    // Fire-and-forget — a failed push shouldn't fail the lead pipeline itself.
    notificationService
      .sendPush({
        title: `🔥 Score ${lead.score} lead: ${lead.company || lead.name}`,
        body: 'AI brief + outreach draft ready — open CLA to review.',
        data: { type: 'hot_lead', leadId: lead.id },
      })
      .catch((e) => logger.warn('leadPipeline: push notification failed', { error: e.message }));

    return { brief, outreachDraft };
  } catch (e) {
    logger.warn('leadPipeline.onLeadCreated failed', { leadId: lead.id, error: e.message });
    return null;
  }
}

function inferChannel(lead) {
  const bySource = { apollo: 'apollo_email', twitter: 'twitter_dm', gumroad: 'apollo_email', betalist: 'apollo_email' };
  return bySource[lead.source] || 'apollo_email';
}

// Runs periodically (see cron/gumroadFollowUp.js) — Gumroad leads that
// scored 8+ but haven't moved past 'new' in 48h get auto-queued into the
// default Apollo sequence, since a download with no reply usually just means
// they haven't seen the follow-up yet, not that they're uninterested.
async function autoQueueStaleHighScoreGumroadLeads() {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const leads = (await db.list('leads', { filters: { source: 'gumroad', status: 'new' } })).filter(
    (l) => (l.score || 0) >= 8 && new Date(l.created_at).getTime() <= cutoff
  );

  let queued = 0;
  for (const lead of leads) {
    try {
      if (config.apolloDefaultSequenceId && lead.email) {
        const contact = await apolloService.enrichPerson(lead.email).catch(() => null);
        const contactId = contact?.id || contact?.person?.id;
        if (contactId) {
          await apolloService.launchSequence({ sequenceId: config.apolloDefaultSequenceId, contactId });
        }
      }
      await db.update('leads', lead.id, {
        status: 'contacted',
        raw: { ...(lead.raw || {}), apolloAutoQueued: true, apolloAutoQueuedAt: new Date().toISOString() },
      });
      queued += 1;
    } catch (e) {
      logger.warn('leadPipeline.autoQueueStaleHighScoreGumroadLeads: failed for one lead', { leadId: lead.id, error: e.message });
    }
  }
  return { checked: leads.length, queued };
}

module.exports = { onLeadCreated, autoQueueStaleHighScoreGumroadLeads };
