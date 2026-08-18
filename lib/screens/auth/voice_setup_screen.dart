import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/auth_theme.dart';
import '../../providers/voice_auth_controller.dart';
import '../../widgets/auth_widgets.dart';
import '../../widgets/voice_orb.dart';

/// First-run flow: a welcome page, then setting a spoken passphrase that
/// will unlock CLA on every future launch.
class VoiceSetupScreen extends StatefulWidget {
  const VoiceSetupScreen({super.key});

  @override
  State<VoiceSetupScreen> createState() => _VoiceSetupScreenState();
}

class _VoiceSetupScreenState extends State<VoiceSetupScreen> {
  final _pageController = PageController();
  int _page = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _next() {
    _pageController.nextPage(duration: const Duration(milliseconds: 380), curve: Curves.easeOutCubic);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AuthColors.bgDark,
      body: AuthBackground(
        child: Stack(
          children: [
            PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              onPageChanged: (i) => setState(() => _page = i),
              children: [
                _WelcomePage(onNext: _next),
                _PassphraseSetupPage(),
              ],
            ),
            Positioned(
              top: 12,
              left: 0,
              right: 0,
              child: _PageDots(count: 2, index: _page),
            ),
          ],
        ),
      ),
    );
  }
}

class _PageDots extends StatelessWidget {
  final int count;
  final int index;
  const _PageDots({required this.count, required this.index});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (i) {
        final active = i == index;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          margin: const EdgeInsets.symmetric(horizontal: 3),
          width: active ? 20 : 6,
          height: 6,
          decoration: BoxDecoration(
            color: active ? AuthColors.amber : AuthColors.textFaintOnDark,
            borderRadius: BorderRadius.circular(3),
          ),
        );
      }),
    );
  }
}

class _WelcomePage extends StatelessWidget {
  final VoidCallback onNext;
  const _WelcomePage({required this.onNext});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 32, 28, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: AuthColors.amberGradient,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: AuthColors.amber.withValues(alpha: 0.35), blurRadius: 24, offset: const Offset(0, 10))],
            ),
            child: const Icon(Icons.bolt_rounded, color: AuthColors.bgDarker, size: 30),
          ),
          const Spacer(),
          Text(
            'Let\'s make you\nmore ',
            style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w800, color: AuthColors.textOnDark, height: 1.15),
          ),
          Text(
            'unstoppable.',
            style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w800, color: AuthColors.amber, height: 1.15),
          ),
          const SizedBox(height: 14),
          Text(
            'AlphoTech CLA runs your entire acquisition system from one app — and unlocks with your voice, not a password.',
            style: GoogleFonts.inter(fontSize: 14, color: AuthColors.textMutedOnDark, height: 1.5),
          ),
          const SizedBox(height: 28),
          _featureCard(Icons.mic_rounded, 'Voice-locked access', 'Set a spoken passphrase once — say it to unlock every time after.'),
          const SizedBox(height: 12),
          _featureCard(Icons.hub_rounded, '17 tools, one app', 'War Room, Apollo Hunter, Growth Studio and more — unified.'),
          const Spacer(),
          AuthPrimaryButton(label: 'Get started', icon: Icons.arrow_forward_rounded, onPressed: onNext),
        ],
      ),
    );
  }

  Widget _featureCard(IconData icon, String title, String subtitle) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AuthColors.cardNavy,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: AuthColors.amber.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(11)),
            child: Icon(icon, color: AuthColors.amber, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: AuthColors.textOnDark)),
                const SizedBox(height: 2),
                Text(subtitle, style: GoogleFonts.inter(fontSize: 12, color: AuthColors.textMutedOnDark, height: 1.35)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PassphraseSetupPage extends StatefulWidget {
  @override
  State<_PassphraseSetupPage> createState() => _PassphraseSetupPageState();
}

class _PassphraseSetupPageState extends State<_PassphraseSetupPage> {
  final _typedController = TextEditingController();
  bool _typedMode = false;

  @override
  void dispose() {
    _typedController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<VoiceAuthController>();
    final capturedPhrase = auth.transcript;

    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 32, 28, 32),
      child: Column(
        children: [
          Text('Set your voice key', style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w800, color: AuthColors.textOnDark)),
          const SizedBox(height: 8),
          Text(
            'Pick a short phrase, at least two words. You\'ll say this every time you open CLA.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 13, color: AuthColors.textMutedOnDark, height: 1.5),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AuthColors.amber.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              'This is a spoken-passphrase lock, not identity verification — anyone who hears it could say it too.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 11, color: AuthColors.amberLight, height: 1.4),
            ),
          ),
          const Spacer(),
          if (!_typedMode) ...[
            VoiceOrb(
              status: auth.status,
              soundLevel: auth.soundLevel,
              onTap: auth.micAvailable ? () => auth.beginListening() : null,
            ),
            const SizedBox(height: 20),
            AuthStatusText(
              text: auth.status == VoiceAuthStatus.listening
                  ? 'Listening…'
                  : capturedPhrase.isNotEmpty
                      ? '"$capturedPhrase"'
                      : auth.micAvailable
                          ? 'Tap the mic and say your phrase'
                          : 'Voice unavailable — type it below',
            ),
          ] else ...[
            AuthTextField(hint: 'e.g. open sesame alpha tech', controller: _typedController),
          ],
          if (auth.statusMessage != null && auth.status != VoiceAuthStatus.listening) ...[
            const SizedBox(height: 8),
            Text(auth.statusMessage!, style: GoogleFonts.inter(fontSize: 12, color: AuthColors.error)),
          ],
          const Spacer(),
          AuthPrimaryButton(
            label: 'Save & continue',
            icon: Icons.check_rounded,
            onPressed: () {
              final phrase = _typedMode ? _typedController.text : capturedPhrase;
              if (phrase.trim().isEmpty) return;
              auth.setPassphrase(phrase);
            },
          ),
          const SizedBox(height: 8),
          AuthGhostButton(
            label: _typedMode ? 'Use voice instead' : 'Prefer to type it?',
            icon: _typedMode ? Icons.mic_rounded : Icons.keyboard_alt_outlined,
            onPressed: () => setState(() => _typedMode = !_typedMode),
          ),
        ],
      ),
    );
  }
}
