import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/auth/voice_command_service.dart';
import '../core/auth/voice_phrase_matcher.dart';

enum VoiceAuthStatus {
  initializing,
  needsSetup,
  locked,
  listening,
  matched,
  denied,
  micUnavailable,
}

/// Drives the voice-passphrase login: set a spoken passphrase once, then
/// speak it to unlock on every cold start. This is a convenience lock for a
/// single-user founder tool, not cryptographic identity verification — see
/// [VoicePhraseMatcher] for the security caveat that copy should reflect.
class VoiceAuthController extends ChangeNotifier {
  static const _passphraseKey = 'cla_voice_passphrase_v1';
  static const _minPhraseLength = 6;

  final VoiceCommandService _voice = VoiceCommandService();

  VoiceAuthStatus status = VoiceAuthStatus.initializing;
  String transcript = '';
  String? statusMessage;
  double soundLevel = 0;
  bool isAuthenticated = false;

  String? _savedPhrase;
  bool get hasPassphrase => _savedPhrase != null && _savedPhrase!.isNotEmpty;
  bool get micAvailable => _voice.isAvailable;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _savedPhrase = prefs.getString(_passphraseKey);

    final micOk = await _voice.init(onError: (msg) {
      statusMessage = msg;
      notifyListeners();
    });

    if (!micOk) {
      status = VoiceAuthStatus.micUnavailable;
      statusMessage = 'Voice recognition isn\'t available on this device — you can type your passphrase instead.';
    } else {
      status = hasPassphrase ? VoiceAuthStatus.locked : VoiceAuthStatus.needsSetup;
    }
    notifyListeners();
  }

  Future<bool> setPassphrase(String phrase) async {
    final normalized = VoicePhraseMatcher.normalize(phrase);
    if (normalized.length < _minPhraseLength || !normalized.contains(' ')) {
      statusMessage = 'Use a short phrase (at least two words) so it\'s easy to say and hard to guess.';
      notifyListeners();
      return false;
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_passphraseKey, normalized);
    _savedPhrase = normalized;
    status = VoiceAuthStatus.locked;
    statusMessage = null;
    notifyListeners();
    return true;
  }

  Future<void> resetPassphrase() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_passphraseKey);
    _savedPhrase = null;
    isAuthenticated = false;
    status = VoiceAuthStatus.needsSetup;
    notifyListeners();
  }

  Future<void> beginListening() async {
    if (!micAvailable || !hasPassphrase) return;
    status = VoiceAuthStatus.listening;
    transcript = '';
    statusMessage = 'Listening…';
    notifyListeners();

    final started = await _voice.startListening(
      onResult: (words) {
        transcript = words;
        notifyListeners();
      },
      onSoundLevel: (level) {
        soundLevel = level.clamp(0, 100) / 100;
        notifyListeners();
      },
      onFinal: (words) => _evaluate(words),
    );

    if (!started) {
      status = VoiceAuthStatus.micUnavailable;
      statusMessage = 'Couldn\'t start listening. Try again or type your passphrase.';
      notifyListeners();
    }
  }

  Future<void> stopListening() async {
    await _voice.stopListening();
  }

  /// Fallback for devices/dev-testing where the mic isn't usable.
  void submitTypedPhrase(String text) => _evaluate(text);

  void _evaluate(String spoken) {
    if (_savedPhrase == null) return;
    final match = VoicePhraseMatcher.matches(spoken, _savedPhrase!);
    if (match) {
      status = VoiceAuthStatus.matched;
      statusMessage = 'Verified';
      notifyListeners();
      // Let the success animation play before the auth gate swaps screens.
      Future.delayed(const Duration(milliseconds: 650), () {
        isAuthenticated = true;
        notifyListeners();
      });
    } else {
      status = VoiceAuthStatus.denied;
      statusMessage = 'That didn\'t match. Try again.';
      notifyListeners();
    }
  }

  void backToLocked() {
    if (isAuthenticated) return;
    status = VoiceAuthStatus.locked;
    transcript = '';
    statusMessage = null;
    notifyListeners();
  }

  void lock() {
    isAuthenticated = false;
    status = hasPassphrase ? VoiceAuthStatus.locked : VoiceAuthStatus.needsSetup;
    notifyListeners();
  }

  @override
  void dispose() {
    _voice.cancel();
    super.dispose();
  }
}
