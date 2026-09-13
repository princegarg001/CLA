import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { matches, normalize } from './voicePhraseMatcher';

const PASSPHRASE_KEY = 'cla_voice_passphrase_v1';
const MIN_PHRASE_LENGTH = 6;

export type VoiceAuthStatus =
  | 'initializing'
  | 'needsSetup'
  | 'locked'
  | 'listening'
  | 'matched'
  | 'denied'
  | 'micUnavailable';

interface VoiceAuthState {
  status: VoiceAuthStatus;
  transcript: string;
  statusMessage: string | null;
  soundLevel: number;
  isAuthenticated: boolean;
  hasPassphrase: boolean;
  micAvailable: boolean;
  setPassphrase: (phrase: string) => boolean;
  resetPassphrase: () => void;
  beginListening: () => void;
  stopListening: () => void;
  submitTypedPhrase: (text: string) => void;
  backToLocked: () => void;
  lock: () => void;
}

const VoiceAuthCtx = createContext<VoiceAuthState | null>(null);

// SpeechRecognition is vendor-prefixed in Chrome/Edge and absent in Firefox/Safari.
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VoiceAuthStatus>('initializing');
  const [transcript, setTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [soundLevel, setSoundLevel] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savedPhrase, setSavedPhrase] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const micAvailable = getRecognitionCtor() !== null;
  const hasPassphrase = !!savedPhrase;

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(PASSPHRASE_KEY);
    } catch {
      /* ignore */
    }
    setSavedPhrase(stored);
    if (!micAvailable) {
      setStatus('micUnavailable');
      setStatusMessage("Voice recognition isn't available in this browser — Chrome or Edge works best. You can type your passphrase instead.");
    } else {
      setStatus(stored ? 'locked' : 'needsSetup');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const evaluate = useCallback(
    (spoken: string) => {
      if (!savedPhrase) return;
      if (matches(spoken, savedPhrase)) {
        setStatus('matched');
        setStatusMessage('Verified');
        window.setTimeout(() => setIsAuthenticated(true), 650);
      } else {
        setStatus('denied');
        setStatusMessage("That didn't match. Try again.");
      }
    },
    [savedPhrase]
  );

  const stopSoundMeter = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  const startSoundMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setSoundLevel(Math.min(1, avg / 90));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      // Stop the raw mic track once recognition also grabs it; the analyser
      // node itself doesn't need to keep the original tracks alive long.
      window.setTimeout(() => stream.getTracks().forEach((t) => t.stop()), 15000);
    } catch {
      // sound-level visualization is cosmetic — recognition still works without it
    }
  }, []);

  const beginListening = useCallback(() => {
    if (!micAvailable || !hasPassphrase) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    setStatus('listening');
    setTranscript('');
    setStatusMessage('Listening…');
    startSoundMeter();

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e: any) => {
      let finalText = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setTranscript(finalText || interim);
      if (finalText) evaluate(finalText);
    };
    recognition.onerror = (e: any) => {
      stopSoundMeter();
      setStatus('micUnavailable');
      setStatusMessage(e?.error === 'not-allowed' ? 'Microphone access was denied.' : "Couldn't start listening. Try again or type your passphrase.");
    };
    recognition.onend = () => {
      stopSoundMeter();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setStatus('micUnavailable');
      setStatusMessage("Couldn't start listening. Try again or type your passphrase.");
    }
  }, [micAvailable, hasPassphrase, evaluate, startSoundMeter]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    stopSoundMeter();
  }, []);

  const setPassphrase = useCallback((phrase: string): boolean => {
    const n = normalize(phrase);
    if (n.length < MIN_PHRASE_LENGTH || !n.includes(' ')) {
      setStatusMessage("Use a short phrase (at least two words) so it's easy to say and hard to guess.");
      return false;
    }
    try {
      localStorage.setItem(PASSPHRASE_KEY, n);
    } catch {
      /* ignore */
    }
    setSavedPhrase(n);
    setStatus('locked');
    setStatusMessage(null);
    return true;
  }, []);

  const resetPassphrase = useCallback(() => {
    try {
      localStorage.removeItem(PASSPHRASE_KEY);
    } catch {
      /* ignore */
    }
    setSavedPhrase(null);
    setIsAuthenticated(false);
    setStatus('needsSetup');
  }, []);

  const submitTypedPhrase = useCallback((text: string) => evaluate(text), [evaluate]);

  const backToLocked = useCallback(() => {
    setStatus((s) => (isAuthenticated ? s : 'locked'));
    setTranscript('');
    setStatusMessage(null);
  }, [isAuthenticated]);

  const lock = useCallback(() => {
    setIsAuthenticated(false);
    setStatus(hasPassphrase ? 'locked' : 'needsSetup');
  }, [hasPassphrase]);

  const value: VoiceAuthState = {
    status,
    transcript,
    statusMessage,
    soundLevel,
    isAuthenticated,
    hasPassphrase,
    micAvailable,
    setPassphrase,
    resetPassphrase,
    beginListening,
    stopListening,
    submitTypedPhrase,
    backToLocked,
    lock,
  };

  return <VoiceAuthCtx.Provider value={value}>{children}</VoiceAuthCtx.Provider>;
}

export function useVoiceAuth() {
  const ctx = useContext(VoiceAuthCtx);
  if (!ctx) throw new Error('useVoiceAuth must be used within VoiceAuthProvider');
  return ctx;
}
