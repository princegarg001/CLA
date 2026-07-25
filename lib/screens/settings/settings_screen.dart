import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../widgets/shared_components.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final Map<String, bool> _integrationStatus = {
    'Apollo.io': true,
    'Umami': true,
    'Sentry': true,
    'Twitter/X': true,
    'TrustMRR': false,
    'Gumroad': true,
    'BetaList': false,
    'SolidGigs': true,
    'Contra': true,
    'AgentScope': true,
    'Verdent.ai': false,
    'Gro.app': false,
    'HeadAI': false,
    'FoundersDB': true,
    'WebRobots': false,
    'Startups.rip': true,
    'Paperclip': false,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 8),
            _buildConnectionSummary(),
            const SizedBox(height: 4),
            const SectionHeader(title: 'Platform Integrations'),
            _buildIntegrationsList(),
            const SizedBox(height: 8),
            const SectionHeader(title: 'App Settings'),
            _buildAppSettings(),
            const SizedBox(height: 24),
          ],
        ),
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
                    child: const Icon(Icons.settings_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text('Settings & Integrations',
                        style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _quickStat('Connected', '${_integrationStatus.values.where((v) => v).length}'),
                  _quickStat('Available', '${_integrationStatus.length}'),
                  _quickStat('Data Points', '1,247'),
                  _quickStat('Last Sync', '2m ago'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _quickStat(String label, String value) => Expanded(
        child: Column(
          children: [
            Text(value, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
            const SizedBox(height: 2),
            Text(label, style: GoogleFonts.inter(fontSize: 11, color: Colors.white.withValues(alpha: 0.7))),
          ],
        ),
      );

  Widget _buildConnectionSummary() {
    final connected = _integrationStatus.values.where((v) => v).length;
    final total = _integrationStatus.length;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.cardBg,
          borderRadius: BorderRadius.circular(16),
          boxShadow: AppShadows.cardShadow,
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Integration Health',
                    style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                Text('$connected / $total',
                    style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primary)),
              ],
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: connected / total,
                minHeight: 8,
                backgroundColor: AppColors.surfaceBg,
                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.accent),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '${total - connected} integrations available to connect',
              style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIntegrationsList() {
    final integrations = [
      _IntegrationData('Apollo.io', 'API Key', Icons.rocket_launch_rounded, AppColors.primary, '2m ago', 342),
      _IntegrationData('Umami', 'API Token + Site ID', Icons.analytics_rounded, AppColors.accent, '5m ago', 543),
      _IntegrationData('Sentry', 'DSN + Auth Token', Icons.bug_report_rounded, AppColors.error, '1m ago', 48),
      _IntegrationData('Twitter/X', 'OAuth 2.0', Icons.alternate_email_rounded, const Color(0xFF1DA1F2), '3m ago', 1247),
      _IntegrationData('TrustMRR', 'API Key', Icons.attach_money_rounded, AppColors.success, 'Never', 0),
      _IntegrationData('Gumroad', 'OAuth', Icons.storefront_rounded, const Color(0xFFFF90A4), '10m ago', 156),
      _IntegrationData('BetaList', 'RSS + Webhook', Icons.rocket_rounded, const Color(0xFF7C4DFF), 'Never', 0),
      _IntegrationData('SolidGigs', 'Email Parsing', Icons.work_rounded, AppColors.warning, '6h ago', 28),
      _IntegrationData('Contra', 'Email Parsing', Icons.business_center_rounded, AppColors.accent, '4h ago', 12),
      _IntegrationData('AgentScope', 'Cloud API', Icons.psychology_rounded, AppColors.primary, '1m ago', 89),
      _IntegrationData('Verdent.ai', 'API Key', Icons.lightbulb_rounded, AppColors.warning, 'Never', 0),
      _IntegrationData('Gro.app', 'Webhook', Icons.account_tree_rounded, AppColors.accent, 'Never', 0),
      _IntegrationData('HeadAI', 'API Key', Icons.smart_toy_rounded, const Color(0xFF7C4DFF), 'Never', 0),
      _IntegrationData('FoundersDB', 'Scrape + Import', Icons.auto_awesome_rounded, AppColors.warning, '1d ago', 67),
      _IntegrationData('WebRobots', 'API Key', Icons.precision_manufacturing_rounded, AppColors.textSecondary, 'Never', 0),
      _IntegrationData('Startups.rip', 'RSS Feed', Icons.trending_down_rounded, AppColors.error, '12h ago', 15),
      _IntegrationData('Paperclip', 'TBD', Icons.attachment_rounded, AppColors.textTertiary, 'Never', 0),
    ];

    return Column(
      children: integrations.map((i) {
        final isConnected = _integrationStatus[i.name] ?? false;
        return AppCard(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          onTap: () {},
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: i.color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(i.icon, color: i.color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(i.name,
                        style: GoogleFonts.inter(
                            fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                    const SizedBox(height: 2),
                    Text(
                      isConnected
                          ? 'Last sync: ${i.lastSync} · ${i.dataPoints} data points'
                          : i.connectionMethod,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: isConnected ? AppColors.textTertiary : AppColors.textTertiary,
                      ),
                    ),
                  ],
                ),
              ),
              Transform.scale(
                scale: 0.8,
                child: Switch(
                  value: isConnected,
                  onChanged: (val) => setState(() => _integrationStatus[i.name] = val),
                  activeThumbColor: AppColors.accent,
                  activeTrackColor: AppColors.accent.withValues(alpha: 0.3),
                  inactiveThumbColor: AppColors.textTertiary,
                  inactiveTrackColor: AppColors.border,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildAppSettings() {
    return Column(
      children: [
        _settingsItem(Icons.person_rounded, 'Account', 'Prince Adigwe • AlphoTech'),
        _settingsItem(Icons.notifications_rounded, 'Notifications', 'Push · Email · SMS'),
        _settingsItem(Icons.schedule_rounded, 'War Room Schedule', 'Daily brief at 7:00 AM'),
        _settingsItem(Icons.language_rounded, 'Target Markets', 'US · UK · EU'),
        _settingsItem(Icons.storage_rounded, 'Data & Storage', '2.4 GB used'),
        _settingsItem(Icons.security_rounded, 'Security', 'Biometric lock enabled'),
        _settingsItem(Icons.info_outline_rounded, 'About CLA v2', 'Version 2.0.0'),
      ],
    );
  }

  Widget _settingsItem(IconData icon, String title, String subtitle) {
    return AppCard(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      onTap: () {},
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: AppColors.primaryLight.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: AppColors.primary, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                Text(subtitle,
                    style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: AppColors.textTertiary, size: 20),
        ],
      ),
    );
  }
}

class _IntegrationData {
  final String name, connectionMethod;
  final IconData icon;
  final Color color;
  final String lastSync;
  final int dataPoints;
  _IntegrationData(this.name, this.connectionMethod, this.icon, this.color, this.lastSync, this.dataPoints);
}
