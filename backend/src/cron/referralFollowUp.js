const db = require('../db');
const referralService = require('../services/referralService');
const logger = require('../utils/logger');

// Runs daily — projects completed 3+ days ago that haven't had a follow-up
// drafted yet get a thank-you + referral/testimonial ask queued into
// `messages` as a draft (never auto-sent, same convention as every other
// AI-drafted outreach in this app).
async function run() {
  const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const projects = (await db.list('projects', { filters: { status: 'completed' } })).filter(
    (p) => !p.referral_followup_drafted_at && p.completed_date && new Date(p.completed_date).getTime() <= cutoff
  );

  let drafted = 0;
  for (const project of projects) {
    try {
      const client = await db.get('clients', project.client_id);
      if (!client) continue;

      const body = await referralService.draftPostProjectFollowUp({ client, project });
      await db.insert('messages', {
        client_id: client.id,
        channel: client.preferred_channel || 'email',
        tone: 'founder_to_founder',
        body,
        direction: 'outbound',
        ai_generated: true,
        status: 'draft',
      });
      await db.update('projects', project.id, { referral_followup_drafted_at: new Date().toISOString() });
      drafted += 1;
    } catch (e) {
      logger.warn('referralFollowUp: failed for one project', { projectId: project.id, error: e.message });
    }
  }

  logger.info(`cron: referralFollowUp drafted ${drafted}/${projects.length} follow-ups`);
  return { checked: projects.length, drafted };
}

module.exports = { run };
