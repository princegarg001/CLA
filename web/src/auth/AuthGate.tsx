import { useState, type ReactNode } from 'react';
import { useVoiceAuth } from './VoiceAuthContext';
import { VoiceOrb } from './VoiceOrb';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_50%_-10%,#1C3B4C,#0B1826_60%)] px-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function SetupScreen() {
  const { setPassphrase, statusMessage } = useVoiceAuth();
  const [phrase, setPhrase] = useState('');

  return (
    <Shell>
      <div className="text-center mb-8">
        <VoiceOrb status="needsSetup" soundLevel={0} />
      </div>
      <h1 className="text-2xl font-bold text-center mb-2">Set your passphrase</h1>
      <p className="text-sm text-text-muted text-center mb-6">
        Pick a short phrase — two or more words — you'll say (or type) it to unlock AlphoTech every time.
      </p>
      <p className="text-xs text-text-faint text-center mb-6">
        This checks <em>what</em> you say, not who's saying it — a convenience lock, not identity verification. Don't
        reuse a real password here.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPassphrase(phrase);
        }}
        className="space-y-3"
      >
        <input
          autoFocus
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder="e.g. amber falcon rising"
          className="w-full rounded-xl bg-surface border border-border px-4 py-3 text-sm outline-none focus:border-amber transition-colors"
        />
        {statusMessage && <p className="text-xs text-critical">{statusMessage}</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-amber text-[#221604] font-semibold py-3 text-sm hover:bg-amber-light transition-colors"
        >
          Save passphrase
        </button>
      </form>
    </Shell>
  );
}

function LoginScreen() {
  const { status, transcript, statusMessage, soundLevel, beginListening, submitTypedPhrase, backToLocked, micAvailable, resetPassphrase } =
    useVoiceAuth();
  const [typed, setTyped] = useState('');

  return (
    <Shell>
      <div className="text-center mb-8">
        <VoiceOrb status={status} soundLevel={soundLevel} />
      </div>
      <h1 className="text-2xl font-bold text-center mb-2">AlphoTech</h1>
      <p className="text-sm text-text-muted text-center mb-8 min-h-5">
        {statusMessage || 'Say your passphrase to unlock.'}
      </p>

      {transcript && status === 'listening' && (
        <p className="text-center text-sm text-text-faint italic mb-4">"{transcript}"</p>
      )}

      {micAvailable && status !== 'listening' && (
        <button
          onClick={beginListening}
          className="w-full rounded-xl bg-amber text-[#221604] font-semibold py-3 text-sm hover:bg-amber-light transition-colors mb-3"
        >
          {status === 'denied' ? 'Try again' : 'Start listening'}
        </button>
      )}
      {status === 'listening' && (
        <button onClick={backToLocked} className="w-full rounded-xl border border-border py-3 text-sm mb-3 hover:border-amber transition-colors">
          Cancel
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitTypedPhrase(typed);
        }}
        className="flex gap-2"
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="…or type your passphrase"
          className="flex-1 rounded-xl bg-surface border border-border px-3 py-2.5 text-sm outline-none focus:border-amber transition-colors"
        />
        <button type="submit" className="rounded-xl border border-border px-4 text-sm font-medium hover:border-amber transition-colors">
          Unlock
        </button>
      </form>

      <button onClick={resetPassphrase} className="w-full text-center text-xs text-text-faint mt-6 hover:text-text-muted">
        Forgot it? Reset passphrase
      </button>
    </Shell>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { status, isAuthenticated } = useVoiceAuth();

  if (isAuthenticated) return <>{children}</>;

  if (status === 'initializing') {
    return (
      <Shell>
        <div className="flex justify-center">
          <VoiceOrb status="initializing" soundLevel={0} />
        </div>
      </Shell>
    );
  }
  if (status === 'needsSetup') return <SetupScreen />;
  return <LoginScreen />;
}
