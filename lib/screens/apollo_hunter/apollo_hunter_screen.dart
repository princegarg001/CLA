import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../widgets/shared_components.dart';

class ApolloHunterScreen extends StatefulWidget {
  const ApolloHunterScreen({super.key});

  @override
  State<ApolloHunterScreen> createState() => _ApolloHunterScreenState();
}

class _ApolloHunterScreenState extends State<ApolloHunterScreen> {
  int _selectedTab = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: Column(
        children: [
          _buildHeader(),
          const SizedBox(height: 4),
          AppTabBar(
            tabs: const ['Leads', 'Sequences', 'ICP Builder'],
            selectedIndex: _selectedTab,
            onTap: (i) => setState(() => _selectedTab = i),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: IndexedStack(
              index: _selectedTab,
              children: [
                _buildLeadsList(),
                _buildSequencesList(),
                _buildICPBuilder(),
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
                    child: const Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Apollo Hunter',
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  _headerAction(Icons.filter_list_rounded),
                  const SizedBox(width: 10),
                  _headerAction(Icons.add_rounded),
                ],
              ),
              const SizedBox(height: 16),
              const HeaderSearchBar(hint: 'Search 230M+ contacts...'),
              const SizedBox(height: 14),
              // Quick stats
              Row(
                children: [
                  _quickStat('Found', '247'),
                  _quickStat('In Pipeline', '52'),
                  _quickStat('Sequenced', '18'),
                  _quickStat('Replied', '7'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _headerAction(IconData icon) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: Colors.white, size: 20),
    );
  }

  Widget _quickStat(String label, String value) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 11,
              color: Colors.white.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLeadsList() {
    final leads = [
      _LeadData('David Chen', 'CTO at Finova Technologies', 'US', 9, 'contacted', 'Fintech · Series A · 45 employees'),
      _LeadData('Sarah Williams', 'VP Engineering at BuildFast', 'UK', 8, 'replied', 'SaaS · Seed · 22 employees'),
      _LeadData('Marcus Weber', 'Co-founder at DataFlow GmbH', 'EU', 8, 'new', 'Data Infra · Pre-seed · 12 employees'),
      _LeadData('James Cooper', 'Head of Engineering at PayRight', 'US', 7, 'sequenced', 'Fintech · Series B · 85 employees'),
      _LeadData('Priya Sharma', 'CTO at CloudScale', 'US', 7, 'new', 'DevOps · Seed · 18 employees'),
      _LeadData('Alex Morgan', 'Engineering Lead at LogiTech', 'UK', 6, 'contacted', 'Logistics · Series A · 30 employees'),
      _LeadData('Nina Petrov', 'CTO at MedConnect', 'EU', 6, 'new', 'HealthTech · Pre-seed · 8 employees'),
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: leads.length,
      itemBuilder: (context, index) {
        final lead = leads[index];
        return AppCard(
          margin: const EdgeInsets.only(bottom: 10),
          onTap: () {},
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  InitialsAvatar(name: lead.name),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                lead.name,
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ),
                            StatusBadge.score(lead.score),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          lead.role,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  _leadTag(Icons.flag_rounded, lead.region),
                  const SizedBox(width: 8),
                  _leadTag(Icons.star_rounded, '${lead.score}/10'),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      lead.details,
                      style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  _actionChip(Icons.email_rounded, 'Sequence', AppColors.primary),
                  const SizedBox(width: 8),
                  _actionChip(Icons.open_in_new_rounded, 'LinkedIn', const Color(0xFF0077B5)),
                  const SizedBox(width: 8),
                  _actionChip(Icons.info_outline_rounded, 'Enrich', AppColors.accent),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _leadTag(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.surfaceBg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppColors.textTertiary),
          const SizedBox(width: 4),
          Text(
            label,
            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _actionChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildSequencesList() {
    final sequences = [
      {'name': 'Cold Outreach — Fintech CTOs', 'steps': 5, 'active': 12, 'replies': 3, 'open': 42},
      {'name': 'Follow-up — Event Contacts', 'steps': 3, 'active': 8, 'replies': 2, 'open': 55},
      {'name': 'Re-engage — Cold Leads Q2', 'steps': 4, 'active': 6, 'replies': 0, 'open': 18},
      {'name': 'Warm Intro — Funded Startups', 'steps': 5, 'active': 15, 'replies': 5, 'open': 61},
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: sequences.length,
      itemBuilder: (context, index) {
        final s = sequences[index];
        return AppCard(
          margin: const EdgeInsets.only(bottom: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.send_rounded, color: AppColors.primary, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          s['name'] as String,
                          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                        ),
                        Text(
                          '${s['steps']} steps • ${s['active']} active contacts',
                          style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded, color: AppColors.textTertiary, size: 20),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _seqStat('Open Rate', '${s['open']}%', AppColors.info),
                  const SizedBox(width: 16),
                  _seqStat('Replies', '${s['replies']}', AppColors.success),
                  const SizedBox(width: 16),
                  _seqStat('Active', '${s['active']}', AppColors.primary),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _seqStat(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: color)),
        Text(label, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
      ],
    );
  }

  Widget _buildICPBuilder() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Ideal Client Profile', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                Text('Define who you\'re targeting. Apollo will remember.', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                const SizedBox(height: 16),
                _icpField('Industry', 'Fintech, SaaS, HealthTech'),
                _icpField('Company Size', '11 – 200 employees'),
                _icpField('Region', 'US, UK, EU'),
                _icpField('Seniority', 'CTO, VP Eng, Head of Eng'),
                _icpField('Tech Stack', 'Python, Node.js, AWS, Microservices'),
                _icpField('Funding Stage', 'Seed to Series B'),
                const SizedBox(height: 16),
                AccentButton(label: 'Save ICP & Search', onPressed: () {}, icon: Icons.search_rounded),
              ],
            ),
          ),
          const SizedBox(height: 12),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.warning.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.auto_awesome_rounded, color: AppColors.warning, size: 18),
                    ),
                    const SizedBox(width: 10),
                    Text('FoundersDB', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  'Import founders who raised \$500K–\$5M in the last 90 days. These companies have budget + urgency.',
                  style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 12),
                OutlinedAccentButton(label: 'Import FoundersDB Leads', onPressed: () {}, icon: Icons.download_rounded),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _icpField(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.surfaceBg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: Text(value, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary)),
          ),
        ],
      ),
    );
  }
}

class _LeadData {
  final String name;
  final String role;
  final String region;
  final int score;
  final String status;
  final String details;

  _LeadData(this.name, this.role, this.region, this.score, this.status, this.details);
}
