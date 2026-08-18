import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/auth_theme.dart';
import '../../providers/voice_auth_controller.dart';
import '../../widgets/auth_widgets.dart';
import '../../widgets/voice_orb.dart';

/// The "unlock CLA" gate a returning user sees on every cold start — speak
/// your passphrase, or type it if the mic isn't available.
class VoiceLoginScreen extends StatefulWidget {
  const VoiceLoginScreen({super.key});

  @override
  State<VoiceLoginScreen> createState() => _VoiceLoginScreenState();
}

class _VoiceLoginScreenState extends State<VoiceLoginScreen> {
  bool _showTypedFallback = false;
  final _typedController = TextEditingController();

  @override
  void dispose() {
    _typedController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<VoiceAuthController>();

    return Scaffold(
      backgroundColor: AuthColors.bgDark,
      body: AuthBackground(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 24, 28, 32),
          child: Column(
            children: [
              _brandMark(),
              const Spacer(),
              Text(
                'Welcome back',
                style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: AuthColors.textOnDark),
              ),
              const SizedBox(height: 6),
              Text(
                auth.status == VoiceAuthStatus.micUnavailable
                    ? 'Type your voice passphrase to unlock.'
                    : 'Say your voice passphrase to unlock.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(fontSize: 14, color: AuthColors.textMutedOnDark),
              ),
              const SizedBox(height: 40),
              VoiceOrb(
                status: auth.status,
                soundLevel: auth.soundLevel,
                onTap: auth.status == VoiceAuthStatus.micUnavailable
                    ? null
                    : () => auth.status == VoiceAuthStatus.listening ? null : auth.beginListening(),
              ),
              const SizedBox(height: 28),
              SizedBox(
                height: 44,
                child: Center(
                  child: AuthStatusText(
                    text: _statusLabel(auth),
                    color: auth.status == VoiceAuthStatus.denied
                        ? AuthColors.error
                        : auth.status == VoiceAuthStatus.matched
                            ? AuthColors.success
                            : AuthColors.textMutedOnDark,
                  ),
                ),
              ),
              if (auth.transcript.isNotEmpty && auth.status == VoiceAuthStatus.listening) ...[
                const SizedBox(height: 4),
                Text(
                  '"${auth.transcript}"',
                  style: GoogleFonts.inter(fontSize: 13, fontStyle: FontStyle.italic, color: AuthColors.amberLight),
                ),
              ],
              const Spacer(),
              if (_showTypedFallback) _typedFallbackField(auth) else _actions(auth),
            ],
          ),
        ),
      ),
    );
  }

  String _statusLabel(VoiceAuthController auth) {
    switch (auth.status) {
      case VoiceAuthStatus.listening:
        return 'Listening…';
      case VoiceAuthStatus.matched:
        return 'Verified — welcome back';
      case VoiceAuthStatus.denied:
        return auth.statusMessage ?? 'That didn\'t match. Try again.';
      case VoiceAuthStatus.micUnavailable:
        return auth.statusMessage ?? 'Voice recognition unavailable on this device.';
      default:
        return 'Tap the mic and speak your passphrase';
    }
  }

  Widget _brandMark() {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            gradient: AuthColors.amberGradient,
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.bolt_rounded, color: AuthColors.bgDarker, size: 20),
        ),
        const SizedBox(width: 10),
        Text('AlphoTech CLA', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: AuthColors.textOnDark)),
      ],
    );
  }

  Widget _actions(VoiceAuthController auth) {
    return Column(
      key: const ValueKey('actions'),
      children: [
        if (auth.status == VoiceAuthStatus.denied)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: AuthPrimaryButton(
              label: 'Try again',
              icon: Icons.refresh_rounded,
              onPressed: () {
                auth.backToLocked();
                auth.beginListening();
              },
            ),
          ),
        AuthGhostButton(
          label: 'Type passphrase instead',
          icon: Icons.keyboard_alt_outlined,
          onPressed: () => setState(() => _showTypedFallback = true),
        ),
      ],
    );
  }

  Widget _typedFallbackField(VoiceAuthController auth) {
    return Column(
      key: const ValueKey('typed'),
      children: [
        AuthTextField(
          hint: 'Type your passphrase…',
          controller: _typedController,
          onSubmitted: (v) => auth.submitTypedPhrase(v),
        ),
        const SizedBox(height: 12),
        AuthPrimaryButton(
          label: 'Unlock',
          icon: Icons.lock_open_rounded,
          onPressed: () => auth.submitTypedPhrase(_typedController.text),
        ),
        const SizedBox(height: 8),
        AuthGhostButton(
          label: 'Use voice instead',
          icon: Icons.mic_rounded,
          onPressed: () => setState(() => _showTypedFallback = false),
        ),
      ],
    );
  }
}
