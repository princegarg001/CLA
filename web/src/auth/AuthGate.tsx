import { useState, type FormEvent, type ReactNode } from 'react';
import { UserRound, Lock, ShieldCheck } from 'lucide-react';
import { useAuth, authErrorMessage } from './AuthContext';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_50%_-10%,#1C3B4C,#0B1826_60%)] px-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  autoFocus,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-text-muted block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-surface border border-border px-4 py-3 text-sm outline-none focus:border-amber transition-colors"
      />
    </div>
  );
}

function Logo() {
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="h-14 w-14 rounded-2xl bg-amber flex items-center justify-center text-[#221604] font-bold text-2xl mb-4">A</div>
      <h1 className="text-2xl font-bold">AlphoTech</h1>
    </div>
  );
}

function SetupScreen() {
  const { setup } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !username.trim() || !password) {
      setError('Fill in every field.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await setup(name.trim(), username.trim(), password);
    } catch (err) {
      setError(authErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Shell>
      <Logo />
      <p className="text-sm text-text-muted text-center mb-6">
        First time here — set up the one account that controls AlphoTech. You'll use this to log in every time from now on, on any device.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Field label="Your name" value={name} onChange={setName} autoFocus placeholder="Prince" />
        <Field label="Username" value={username} onChange={setUsername} placeholder="prince" />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" />
        <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} />
        {error && <p className="text-xs text-critical">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber text-[#221604] font-semibold py-3 text-sm hover:bg-amber-light transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </Shell>
  );
}

function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(authErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Shell>
      <Logo />
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="relative">
          <UserRound size={15} className="absolute left-4 top-[38px] text-text-faint" />
          <Field label="Username" value={username} onChange={setUsername} autoFocus />
        </div>
        <div className="relative">
          <Lock size={15} className="absolute left-4 top-[38px] text-text-faint" />
          <Field label="Password" type="password" value={password} onChange={setPassword} />
        </div>
        {error && <p className="text-xs text-critical">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber text-[#221604] font-semibold py-3 text-sm hover:bg-amber-light transition-colors disabled:opacity-50"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </Shell>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'authenticated') return <>{children}</>;

  if (status === 'checking') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4">
          <ShieldCheck size={32} className="text-amber animate-pulse" />
        </div>
      </Shell>
    );
  }
  if (status === 'needsSetup') return <SetupScreen />;
  return <LoginScreen />;
}
