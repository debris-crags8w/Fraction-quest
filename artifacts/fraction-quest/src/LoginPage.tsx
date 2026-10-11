import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { login, signup, type User } from '@workspace/api-client-react';
import { errorMessage } from './account';
import { Mascot } from './fun-ui';

type Mode = 'sign-in' | 'create';

export default function LoginPage({ notice, onSignedIn, onGuest }: { notice?: string; onSignedIn: (user: User) => Promise<void>; onGuest: () => void }) {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const creating = mode === 'create';

  const switchMode = (next: Mode) => { setMode(next); setError(''); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (creating && !/^[A-Za-z0-9_]{3,20}$/.test(username.trim())) { setError('Usernames are 3–20 letters, numbers or _ (no spaces).'); return; }
    if (creating && password.length < 8) { setError('Passwords need at least 8 characters.'); return; }
    setBusy(true);
    try {
      const user = creating
        ? await signup({ username: username.trim(), displayName: (displayName.trim() || username.trim()).slice(0, 30), password })
        : await login({ username: username.trim(), password });
      await onSignedIn(user);
    } catch (err) {
      setError(errorMessage(err, creating ? "Couldn't create the account. Check your connection and try again." : "Couldn't sign in. Check your connection and try again."));
      setBusy(false);
    }
  };

  return (
    <div className="fq-app fq-login-app">
      <main className="fq-login">
        <div className="fq-login-hero">
          <Mascot mood={error ? 'oops' : creating ? 'cheer' : 'happy'} size={96} />
          <div>
            <p className="fq-login-brand">Fraction Quest</p>
            <h1>{creating ? 'Make your explorer account' : 'Welcome back, explorer!'}</h1>
            <p>{creating ? 'Your stars, streak and lessons will be saved, so you can keep going on any device.' : 'Sign in to pick up where you left off.'}</p>
          </div>
        </div>

        {notice && <p className="fq-login-notice" role="status" data-testid="text-login-notice">{notice}</p>}

        <div className="fq-login-tabs" role="tablist" aria-label="Sign in or create an account">
          <button type="button" role="tab" aria-selected={!creating} className={!creating ? 'on' : ''} onClick={() => switchMode('sign-in')} data-testid="tab-sign-in"><LogIn size={17} /> Sign in</button>
          <button type="button" role="tab" aria-selected={creating} className={creating ? 'on' : ''} onClick={() => switchMode('create')} data-testid="tab-create-account"><UserPlus size={17} /> New account</button>
        </div>

        <form className="fq-login-form" onSubmit={submit} noValidate>
          <label htmlFor="login-username">Username</label>
          <input id="login-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20}
            value={username} onChange={(e) => setUsername(e.target.value)} placeholder={creating ? 'like star_fox7' : 'Your username'} required data-testid="input-username" />
          {creating && <small>3–20 letters, numbers or _. Use a nickname, not your real name.</small>}

          {creating && (
            <>
              <label htmlFor="login-display-name">Name to show in the app</label>
              <input id="login-display-name" name="nickname" autoComplete="nickname" maxLength={30}
                value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your first name or nickname" data-testid="input-display-name" />
            </>
          )}

          <label htmlFor="login-password">Password</label>
          <div className="fq-login-password">
            <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={creating ? 'new-password' : 'current-password'} maxLength={72}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder={creating ? 'At least 8 characters' : 'Your password'} required data-testid="input-password" />
            <button type="button" className="fq-login-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          {error && <p className="fq-login-error" role="alert" data-testid="text-login-error">{error}</p>}

          <button type="submit" className="fq-button fq-login-submit" disabled={busy || !username.trim() || !password} data-testid="button-login-submit">
            {busy ? 'One moment…' : creating ? 'Create my account' : 'Sign in'} {!busy && <ArrowRight size={17} />}
          </button>
        </form>

        {creating
          ? <p className="fq-login-help">Ask a grown-up before making an account. We only save your username, the name you choose and your progress. No email needed.</p>
          : <p className="fq-login-help">Forgot your password? Ask your teacher or a grown-up for help. Passwords can't be reset by email yet.</p>}

        <div className="fq-login-guest">
          <span>or</span>
          <button type="button" className="fq-hint-button" onClick={onGuest} data-testid="button-play-guest">Play without an account</button>
          <small>Progress stays on this device only.</small>
        </div>
      </main>
    </div>
  );
}
