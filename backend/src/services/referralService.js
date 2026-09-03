const aiService = require('./aiService');

// AI drafts a thank-you + review/referral request 3 days after a project
// completes (see cron/referralFollowUp.js). Never auto-sent — lands as a
// draft in `messages`, same "AI drafts, you approve" convention as every
// other outreach path in this app (leadPipelineService, outreach.js).
async function draftPostProjectFollowUp({ client, project }) {
  const fallback =
    `Hey ${client.name}, really enjoyed working on ${project.title}. If you know any other founders who need backend ` +
    `help, I'd really appreciate an intro. Also, if you have 2 minutes, a short testimonial would mean a lot — no pressure either way!`;

  return aiService.safeComplete(
    {
      system:
        'You write a short, warm, non-pushy thank-you message from a solo backend engineering freelancer (AlphoTech) to a ' +
        'client whose project just completed. Goals, in order: (1) genuine thanks specific to the actual project, ' +
        '(2) a low-pressure ask for a referral to other founders who might need similar help, (3) a low-pressure ask for ' +
        'a short testimonial. Keep it under 80 words, no corporate tone, sound like a real founder-to-founder message.',
      prompt: JSON.stringify({ clientName: client.name, company: client.company, projectTitle: project.title }),
      maxTokens: 200,
    },
    fallback
  );
}

// AI drafts a monthly "how's it going" check-in for a client with no logged
// communication in 30+ days (see cron/clientCheckIn.js). Same draft-only rule.
async function draftMonthlyCheckIn({ client }) {
  const fallback = `Hey ${client.name}, it's been a bit — just checking in on how things are going with ${client.company || 'the project'}. Anything you need help with right now?`;

  return aiService.safeComplete(
    {
      system:
        'You write a brief, genuine monthly check-in message from a solo backend engineering freelancer (AlphoTech) to a ' +
        'past or ongoing client they have not spoken with in a while. No sales pitch, no pressure — just a real check-in ' +
        'that keeps the relationship warm. Under 50 words.',
      prompt: JSON.stringify({ clientName: client.name, company: client.company, status: client.status }),
      maxTokens: 150,
    },
    fallback
  );
}

module.exports = { draftPostProjectFollowUp, draftMonthlyCheckIn };
