import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../data/models/misc_models.dart';
import '../../data/models/social_models.dart';
import '../../providers/settings_provider.dart';
import '../../providers/social_provider.dart';
import '../../providers/voice_auth_controller.dart';
import '../../widgets/shared_components.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

// Display metadata for each of the 17 platforms — keyed by the same names
// config.integrationStatus() uses on the backend, so this stays in sync
// with settings.js without needing its own source of truth for connectivity.
class _IntegrationMeta {
  final String label;
  final String connectionMethod;
  final IconData icon;
  final Color color;
  const _IntegrationMeta(this.label, this.connectionMethod, this.icon, this.color);
}

const Map<String, _IntegrationMeta> _integrationMeta = {
  'apollo': _IntegrationMeta('Apollo.io', 'API Key', Icons.rocket_launch_rounded, AppColors.primary),
  'umami': _IntegrationMeta('Umami', 'API Token + Site ID', Icons.analytics_rounded, AppColors.accent),
  'sentry': _IntegrationMeta('Sentry', 'DSN + Auth Token', Icons.bug_report_rounded, AppColors.error),
  'twitter': _IntegrationMeta('Twitter/X', 'OAuth 2.0', Icons.alternate_email_rounded, Color(0xFF1DA1F2)),
  'reddit': _IntegrationMeta('Reddit', 'Script App (OAuth2)', Icons.forum_rounded, Color(0xFFFF4500)),
  'upwork': _IntegrationMeta('Upwork', 'Webhook Secret', Icons.work_history_rounded, Color(0xFF14A800)),
  'trustmrr': _IntegrationMeta('TrustMRR', 'API Key', Icons.attach_money_rounded, AppColors.success),
  'gumroad': _IntegrationMeta('Gumroad', 'Access Token', Icons.storefront_rounded, Color(0xFFFF90A4)),
  'betalist': _IntegrationMeta('BetaList', 'RSS + Webhook', Icons.rocket_rounded, Color(0xFF7C4DFF)),
  'solidgigs': _IntegrationMeta('SolidGigs', 'Email Parsing', Icons.work_rounded, AppColors.warning),
  'contra': _IntegrationMeta('Contra', 'Email Parsing', Icons.business_center_rounded, AppColors.accent),
  'agentscope': _IntegrationMeta('AgentScope', 'Cloud API', Icons.psychology_rounded, AppColors.primary),
  'verdent': _IntegrationMeta('Verdent.ai', 'API Key', Icons.lightbulb_rounded, AppColors.warning),
  'gro': _IntegrationMeta('Gro.app', 'Webhook Secret', Icons.account_tree_rounded, AppColors.accent),
  'headai': _IntegrationMeta('HeadAI', 'API Key', Icons.smart_toy_rounded, Color(0xFF7C4DFF)),
  'foundersDb': _IntegrationMeta('FoundersDB', 'Scrape + Import', Icons.auto_awesome_rounded, AppColors.warning),
  'webrobots': _IntegrationMeta('WebRobots', 'API Key', Icons.precision_manufacturing_rounded, AppColors.textSecondary),
  'startupsRip': _IntegrationMeta('Startups.rip', 'RSS Feed', Icons.trending_down_rounded, AppColors.error),
  'paperclip': _IntegrationMeta('Paperclip', 'TBD', Icons.attachment_rounded, AppColors.textTertiary),
  'supabase': _IntegrationMeta('Supabase', 'Project URL + Key', Icons.storage_rounded, AppColors.success),
  'openai': _IntegrationMeta('OpenAI', 'API Key', Icons.auto_awesome_rounded, Color(0xFF10A37F)),
  'smtp': _IntegrationMeta('Email Alerts', 'SMTP', Icons.mail_rounded, AppColors.info),
};

class _SettingsScreenState extends State<SettingsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<SettingsProvider>().load());
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SettingsProvider>();
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: RefreshIndicator(
        onRefresh: () => context.read<SettingsProvider>().load(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(provider),
              const SizedBox(height: 8),
              _buildConnectionSummary(provider),
              const SizedBox(height: 4),
              const SectionHeader(title: 'Backend Connection'),
              _buildBackendConfig(context),
              const SizedBox(height: 8),
              const SectionHeader(title: 'Connected Accounts'),
              const _ConnectedAccountsSection(),
              const SizedBox(height: 8),
              const SectionHeader(title: 'Platform Integrations'),
              _buildIntegrationsList(provider),
              const SizedBox(height: 8),
              const SectionHeader(title: 'App Settings'),
              _buildAppSettings(),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(SettingsProvider provider) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: AppColors.headerGradient,
        borderRadius: BorderRadius.only(bottomLeft: Radius.circular(28), bottomRight: Radius.circular(28)),
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
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.settings_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text('Settings & Integrations', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white))),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _quickStat('Connected', '${provider.connectedCount}'),
                  _quickStat('Available', '${provider.integrations.length}'),
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

  Widget _buildConnectionSummary(SettingsProvider provider) {
    final connected = provider.connectedCount;
    final total = provider.integrations.length;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: AppColors.cardBg, borderRadius: BorderRadius.circular(16), boxShadow: AppShadows.cardShadow),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Integration Health', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                Text(total == 0 ? '—' : '$connected / $total', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primary)),
              ],
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: total == 0 ? 0 : connected / total,
                minHeight: 8,
                backgroundColor: AppColors.surfaceBg,
                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.accent),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              total == 0 ? 'Pull to refresh once the backend is reachable.' : '${total - connected} integrations available to connect',
              style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBackendConfig(BuildContext context) {
    return AppCard(
      child: _BackendConfigForm(),
    );
  }

  Widget _buildIntegrationsList(SettingsProvider provider) {
    if (provider.isLoading && provider.integrations.isEmpty) {
      return const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Center(child: CircularProgressIndicator()));
    }
    if (provider.hasError && provider.integrations.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Text(provider.error ?? 'Could not load integrations', style: GoogleFonts.inter(fontSize: 12, color: AppColors.error)),
      );
    }
    return Column(
      children: provider.integrations.map((IntegrationStatus i) {
        final meta = _integrationMeta[i.name] ?? _IntegrationMeta(i.name, '—', Icons.extension_rounded, AppColors.textTertiary);
        return AppCard(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(color: meta.color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                child: Icon(meta.icon, color: meta.color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(meta.label, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                    const SizedBox(height: 2),
                    Text(meta.connectionMethod, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
                  ],
                ),
              ),
              i.connected ? StatusBadge.connected() : StatusBadge.pending(),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildAppSettings() {
    return Builder(builder: (context) {
      final auth = context.watch<VoiceAuthController>();
      return Column(
        children: [
          _settingsItem(Icons.person_rounded, 'Account', 'Prince Adigwe • AlphoTech'),
          _settingsItem(
            Icons.mic_rounded,
            'Voice Lock',
            auth.hasPassphrase ? 'Voice passphrase set • tap to re-record' : 'Not set up yet',
            onTap: () => auth.resetPassphrase(),
          ),
          _settingsItem(
            Icons.lock_rounded,
            'Lock CLA now',
            'Require your voice passphrase again',
            onTap: () => context.read<VoiceAuthController>().lock(),
          ),
          _settingsItem(Icons.info_outline_rounded, 'About CLA v2', 'Version 2.0.0'),
        ],
      );
    });
  }

  Widget _settingsItem(IconData icon, String title, String subtitle, {VoidCallback? onTap}) {
    return AppCard(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      onTap: onTap ?? () {},
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(color: AppColors.primaryLight.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: AppColors.primary, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                Text(subtitle, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: AppColors.textTertiary, size: 20),
        ],
      ),
    );
  }
}

/// Lets the app point at a different backend (e.g. a phone testing against a
/// laptop's IP, or a deployed instance) without a rebuild — reads/writes
/// [AppConfig], which every API call already goes through.
class _BackendConfigForm extends StatefulWidget {
  @override
  State<_BackendConfigForm> createState() => _BackendConfigFormState();
}

class _BackendConfigFormState extends State<_BackendConfigForm> {
  late final TextEditingController _urlController;
  late final TextEditingController _keyController;
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final config = context.watch<AppConfig>();
    if (!_initialized && config.loaded) {
      _urlController = TextEditingController(text: config.baseUrl);
      _keyController = TextEditingController(text: config.apiKey);
      _initialized = true;
    }
    if (!_initialized) {
      return const SizedBox(height: 40, child: Center(child: CircularProgressIndicator(strokeWidth: 2)));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Backend URL', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        const SizedBox(height: 6),
        _field(_urlController, 'http://localhost:8080'),
        const SizedBox(height: 4),
        Text(
          'On a physical device, use your computer\'s LAN IP instead of localhost (e.g. http://192.168.1.20:8080).',
          style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary, height: 1.4),
        ),
        const SizedBox(height: 14),
        Text('API Key (optional)', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        const SizedBox(height: 6),
        _field(_keyController, 'Leave blank if CLA_API_KEY is unset'),
        const SizedBox(height: 14),
        AccentButton(
          label: 'Save & Reconnect',
          icon: Icons.save_rounded,
          onPressed: () async {
            await context.read<AppConfig>().update(baseUrl: _urlController.text, apiKey: _keyController.text);
            if (context.mounted) {
              await context.read<SettingsProvider>().load();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Backend connection updated')));
              }
            }
          },
        ),
      ],
    );
  }

  Widget _field(TextEditingController controller, String hint) {
    return Container(
      decoration: BoxDecoration(color: AppColors.surfaceBg, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
      child: TextField(
        controller: controller,
        style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
      ),
    );
  }
}

/// Connect/disconnect LinkedIn + Instagram for the Automation Engine
/// (Growth Studio's "Auto-Post" tab). Twitter/X still lives under Platform
/// Integrations below since it's a single API key, not an OAuth connection.
class _ConnectedAccountsSection extends StatefulWidget {
  const _ConnectedAccountsSection();

  @override
  State<_ConnectedAccountsSection> createState() => _ConnectedAccountsSectionState();
}

class _ConnectedAccountsSectionState extends State<_ConnectedAccountsSection> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<SocialProvider>().load());
  }

  @override
  Widget build(BuildContext context) {
    final social = context.watch<SocialProvider>();
    return Column(
      children: [
        _accountRow(context, 'linkedin', 'LinkedIn', Icons.business_center_rounded, const Color(0xFF0077B5), social.status.linkedin),
        _accountRow(context, 'instagram', 'Instagram', Icons.camera_alt_rounded, const Color(0xFFE1306C), social.status.instagram),
      ],
    );
  }

  Widget _accountRow(BuildContext context, String platform, String label, IconData icon, Color color, PlatformStatus status) {
    return AppCard(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                const SizedBox(height: 2),
                Text(
                  !status.appConfigured
                      ? 'App credentials not set'
                      : status.connected
                          ? 'Connected${status.accountName != null ? ' as ${status.accountName}' : ''}'
                          : 'Not connected',
                  style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
                ),
              ],
            ),
          ),
          if (status.appConfigured)
            TextButton(
              onPressed: () async {
                final social = context.read<SocialProvider>();
                if (status.connected) {
                  await social.disconnect(platform);
                } else {
                  await social.connect(platform);
                }
              },
              child: Text(status.connected ? 'Disconnect' : 'Connect', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
            ),
        ],
      ),
    );
  }
}
