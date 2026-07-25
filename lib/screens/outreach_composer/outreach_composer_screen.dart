import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../widgets/shared_components.dart';

class OutreachComposerScreen extends StatefulWidget {
  const OutreachComposerScreen({super.key});

  @override
  State<OutreachComposerScreen> createState() => _OutreachComposerScreenState();
}

class _OutreachComposerScreenState extends State<OutreachComposerScreen> {
  int _selectedTab = 0;
  String _selectedTone = 'Technical';
  String _selectedMarket = 'US';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: Column(
        children: [
          _buildHeader(),
          const SizedBox(height: 4),
          AppTabBar(
            tabs: const ['Inbox', 'Compose', 'Templates'],
            selectedIndex: _selectedTab,
            onTap: (i) => setState(() => _selectedTab = i),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: IndexedStack(
              index: _selectedTab,
              children: [
                _buildInboxTab(),
                _buildComposeTab(),
                _buildTemplatesTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: AppColors.headerGradient,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.edit_note_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text('Outreach Composer',
                        style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                  _headerAction(Icons.search_rounded),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _quickStat('Drafts', '4'),
                  _quickStat('Sent', '28'),
                  _quickStat('Replies', '7'),
                  _quickStat('Rate', '25%'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _headerAction(IconData icon) => Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, color: Colors.white, size: 20),
      );

  Widget _quickStat(String label, String value) => Expanded(
        child: Column(
          children: [
            Text(value, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
            const SizedBox(height: 2),
            Text(label, style: GoogleFonts.inter(fontSize: 11, color: Colors.white.withValues(alpha: 0.7))),
          ],
        ),
      );

  Widget _buildInboxTab() {
    final messages = [
      _MessageData('Apollo Email', 'David Chen — Finova Technologies', 'Re: Backend infrastructure for your fintech platform', '12m ago', 'replied', Icons.email_rounded, AppColors.primary),
      _MessageData('Twitter DM', '@sarahbuilds', 'Hey! Saw your thread on microservices. We might need help...', '45m ago', 'new', Icons.alternate_email_rounded, const Color(0xFF1DA1F2)),
      _MessageData('Contra', 'SaaS Backend Project', 'Your proposal has been viewed by the client', '2h ago', 'viewed', Icons.work_rounded, AppColors.accent),
      _MessageData('SolidGigs', 'HealthTech API Application', 'Application submitted — awaiting response', '4h ago', 'sent', Icons.send_rounded, const Color(0xFF7C4DFF)),
      _MessageData('Contact Form', 'James Cooper — PayRight', 'Hi, I found your website and I\'m interested in...', '6h ago', 'new', Icons.contact_mail_rounded, AppColors.warning),
      _MessageData('Apollo Email', 'Sarah Williams — BuildFast', 'Follow-up: Discovery call this Thursday?', '1d ago', 'sent', Icons.email_rounded, AppColors.primary),
      _MessageData('WhatsApp', 'Priya Sharma — CloudScale', 'Thanks for the proposal. Let me discuss with my team...', '1d ago', 'replied', Icons.chat_rounded, AppColors.success),
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final m = messages[index];
        return AppCard(
          margin: const EdgeInsets.only(bottom: 8),
          onTap: () {},
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: m.color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(m.icon, color: m.color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: m.color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(m.channel,
                              style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: m.color)),
                        ),
                        const Spacer(),
                        Text(m.time,
                            style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(m.sender,
                        style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                    const SizedBox(height: 2),
                    Text(m.preview,
                        style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                children: [
                  const SizedBox(height: 18),
                  if (m.status == 'new')
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                    )
                  else
                    StatusBadge(
                      label: m.status[0].toUpperCase() + m.status.substring(1),
                      bgColor: m.status == 'replied'
                          ? AppColors.successLight
                          : m.status == 'viewed'
                              ? AppColors.warningLight
                              : AppColors.surfaceBg,
                      textColor: m.status == 'replied'
                          ? AppColors.success
                          : m.status == 'viewed'
                              ? AppColors.warning
                              : AppColors.textTertiary,
                    ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildComposeTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // To field
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('New Message',
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                const SizedBox(height: 16),
                _inputField('To', 'Search leads or enter email...'),
                const SizedBox(height: 12),
                _inputField('Subject', 'Enter subject line...'),
                const SizedBox(height: 16),
                // Tone selector
                Text('Tone', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: ['Technical', 'Casual', 'Formal', 'Founder-to-founder'].map((tone) {
                    final isSelected = tone == _selectedTone;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedTone = tone),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primary.withValues(alpha: 0.1) : AppColors.surfaceBg,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : AppColors.border,
                            width: isSelected ? 1.5 : 1,
                          ),
                        ),
                        child: Text(tone,
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                              color: isSelected ? AppColors.primary : AppColors.textSecondary,
                            )),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                // Market selector
                Text('Target Market',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                const SizedBox(height: 8),
                Row(
                  children: ['US', 'UK', 'EU'].map((market) {
                    final isSelected = market == _selectedMarket;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedMarket = market),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.accent.withValues(alpha: 0.1) : AppColors.surfaceBg,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSelected ? AppColors.accent : AppColors.border,
                              width: isSelected ? 1.5 : 1,
                            ),
                          ),
                          child: Text(market,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                                color: isSelected ? AppColors.accent : AppColors.textSecondary,
                              )),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                // Message body
                Container(
                  height: 160,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: TextField(
                    maxLines: null,
                    expands: true,
                    style: GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary),
                    decoration: InputDecoration.collapsed(
                      hintText: 'Write your message or tap AI Generate...',
                      hintStyle: GoogleFonts.inter(fontSize: 14, color: AppColors.textTertiary),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // Action buttons
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 46,
                        child: ElevatedButton.icon(
                          onPressed: () {},
                          icon: const Icon(Icons.auto_awesome_rounded, size: 18),
                          label: Text('AI Generate',
                              style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accent,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    SizedBox(
                      height: 46,
                      child: ElevatedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.send_rounded, size: 18),
                        label: Text('Send', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Personalisation tokens
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Personalisation Tokens',
                    style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                Text('Auto-inserted when a lead is selected',
                    style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    '{company_name}',
                    '{founder_name}',
                    '{funding_round}',
                    '{tech_stack}',
                    '{job_posting}',
                    '{pain_point}',
                  ]
                      .map((token) => Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppColors.primaryLight.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.primaryLight.withValues(alpha: 0.3)),
                            ),
                            child: Text(token,
                                style: GoogleFonts.inter(
                                    fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.primary)),
                          ))
                      .toList(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // A/B testing
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF7C4DFF).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.compare_arrows_rounded, color: Color(0xFF7C4DFF), size: 18),
                    ),
                    const SizedBox(width: 10),
                    Text('A/B Testing',
                        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Send two message versions to similar leads. Track which gets more replies.',
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary),
                ),
                const SizedBox(height: 12),
                OutlinedAccentButton(
                  label: 'Create A/B Test',
                  onPressed: () {},
                  icon: Icons.science_rounded,
                  color: const Color(0xFF7C4DFF),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _inputField(String label, String hint) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.surfaceBg,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(hint, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textTertiary)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTemplatesTab() {
    final templates = [
      _TemplateData('Cold Outreach — ROI Focus', 'US market • Technical tone', Icons.trending_up_rounded, AppColors.primary, '42% open · 12% reply'),
      _TemplateData('Cold Outreach — Pain Point', 'US/UK market • Casual tone', Icons.psychology_rounded, AppColors.accent, '38% open · 15% reply'),
      _TemplateData('Follow-up — Value Add', 'All markets • Formal tone', Icons.volunteer_activism_rounded, const Color(0xFF7C4DFF), '55% open · 22% reply'),
      _TemplateData('Follow-up — Social Proof', 'UK market • Founder tone', Icons.groups_rounded, AppColors.warning, '48% open · 18% reply'),
      _TemplateData('Closing Push — Urgency', 'US market • Technical tone', Icons.timer_rounded, AppColors.error, '60% open · 8% reply'),
      _TemplateData('Warm Intro — Mutual Connection', 'All markets • Casual tone', Icons.handshake_rounded, AppColors.success, '65% open · 28% reply'),
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: templates.length,
      itemBuilder: (context, index) {
        final t = templates[index];
        return AppCard(
          margin: const EdgeInsets.only(bottom: 10),
          onTap: () {},
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: t.color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(t.icon, color: t.color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t.name,
                        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                    const SizedBox(height: 2),
                    Text(t.subtitle,
                        style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                    const SizedBox(height: 4),
                    Text(t.metrics,
                        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.success)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: AppColors.textTertiary, size: 20),
            ],
          ),
        );
      },
    );
  }
}

class _MessageData {
  final String channel, sender, preview, time, status;
  final IconData icon;
  final Color color;
  _MessageData(this.channel, this.sender, this.preview, this.time, this.status, this.icon, this.color);
}

class _TemplateData {
  final String name, subtitle, metrics;
  final IconData icon;
  final Color color;
  _TemplateData(this.name, this.subtitle, this.icon, this.color, this.metrics);
}
