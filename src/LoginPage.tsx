import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { login, recoverAccount, signup, type User, type UserWithRecoveryCode } from '@workspace/api-client-react';
import { RecoveryCodeCard } from './RecoveryCode';
import { errorMessage } from './account';
import { authenticateAccount } from './account-flow';
import { Mascot } from './fun-ui';
import { PieFraction } from './fraction-ui';

type Mode = 'sign-in' | 'create' | 'recover';

export default function LoginPage({ notice, onSignedIn, onGuest }: { notice?: string; onSignedIn: (user: User) => Promise<void>; onGuest: () => void }) {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [parentConsent, setParentConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  // After sign-up or a reset, the new recovery code is shown once before going in.
  const [codeToSave, setCodeToSave] = useState<UserWithRecoveryCode | null>(null);
  const creating = mode === 'create';
  const recovering = mode === 'recover';

  const switchMode = (next: Mode) => { setMode(next); setError(''); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (creating && !/^[A-Za-z0-9_]{3,20}$/.test(username.trim())) { setError('Usernames are 3–20 letters, numbers or _ (no spaces).'); return; }
    if (creating && password.length < 8) { setError('Passwords need at least 8 characters.'); return; }
    if (creating && !parentConsent) { setError('A parent or caregiver must review and accept the privacy notice.'); return; }
    if (recovering && password.length < 8) { setError('New passwords need at least 8 characters.'); return; }
    setBusy(true);
    if (recovering) {
      try {
        const user = await recoverAccount({ username: username.trim(), recoveryCode, newPassword: password });
        setCodeToSave(user);
      } catch (err) {
        setError(errorMessage(err, "Couldn't reset the password. Check your connection and try again."));
      }
      setBusy(false);
      return;
    }
    try {
      const normalizedUsername = username.trim();
      const user = await authenticateAccount(creating ? 'create' : 'sign-in', {
        username: normalizedUsername,
        displayName: (displayName.trim() || normalizedUsername).slice(0, 30),
        password,
        parentConsent,
      }, { login, signup });
      if (creating && 'recoveryCode' in user && typeof user.recoveryCode === 'string') { setCodeToSave(user as UserWithRecoveryCode); setBusy(false); return; }
      await onSignedIn(user);
    } catch (err) {
      const fallback = creating ? "Couldn't create the account. Check your connection and try again." : "Couldn't sign in. Check your connection and try again.";
      setError(errorMessage(err, '') || (err instanceof Error && err.message ? err.message : fallback));
      setBusy(false);
    }
  };

  if (codeToSave) {
    const { recoveryCode: code, ...user } = codeToSave;
    return (
      <div className="fq-app fq-login-app">
        <main className="fq-login">
          {recovering && <p className="fq-login-notice" role="status">Your new password is set. The old recovery code no longer works, so here is a new one.</p>}
          <RecoveryCodeCard code={code} username={user.username} onDone={() => { setBusy(true); void onSignedIn(user).catch(() => setBusy(false)); }} doneLabel={recovering ? 'Go to Fraction Quest' : 'Start exploring'} />
        </main>
      </div>
    );
  }

  return (
    <div className="fq-app fq-login-app">
      <main className="fq-login">
        <div className="fq-login-hero">
          <Mascot mood={error ? 'oops' : creating ? 'cheer' : 'happy'} size={96} />
          <div>
            <p className="fq-login-brand"><PieFraction n={3} d={4} size={22} fill="var(--fq-sun)" stroke="var(--fq-grape)" /> Fraction Quest</p>
            <h1>{recovering ? 'Set a new password' : creating ? 'Make your explorer account' : 'Welcome back, explorer!'}</h1>
            <p>{recovering ? 'Use the recovery code a grown-up saved when the account was made.' : creating ? 'Your stars, streak and lessons will be saved, so you can keep going on any device.' : 'Sign in to pick up where you left off.'}</p>
          </div>
        </div>

        {notice && <p className="fq-login-notice" role="status" data-testid="text-login-notice">{notice}</p>}

        <div className="fq-login-tabs" role="tablist" aria-label="Sign in or create an account">
          <button type="button" role="tab" aria-selected={mode === 'sign-in'} className={mode === 'sign-in' ? 'on' : ''} onClick={() => switchMode('sign-in')} data-testid="tab-sign-in"><LogIn size={17} /> Sign in</button>
          <button type="button" role="tab" aria-selected={creating} className={creating ? 'on' : ''} onClick={() => switchMode('create')} data-testid="tab-create-account"><UserPlus size={17} /> New account</button>
        </div>

        <form className="fq-login-form" onSubmit={submit} noValidate>
          <label htmlFor="login-username">Username</label>
          <input id="login-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20}
            value={username} onChange={(e) => setUsername(e.target.value)} placeholder={creating ? 'like star_fox7' : 'Your username'} required data-testid="input-username" />
          {creating && <small>3–20 letters, numbers or _. Use a nickname, not your real name.</small>}

          {creating && (
            <>
              <label htmlFor="login-display-name">First learner’s nickname</label>
              <input id="login-display-name" name="nickname" autoComplete="nickname" maxLength={30}
                value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="A nickname for the learner" data-testid="input-display-name" />
              <small>This becomes the first learner profile. Use a nickname; classroom reports show only a code.</small>
            </>
          )}

          {recovering && (
            <>
              <label htmlFor="login-recovery-code">Recovery code</label>
              <input id="login-recovery-code" name="recovery-code" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} maxLength={40}
                value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} placeholder="like K7QM-2XTB-9HPA" required data-testid="input-recovery-code" />
            </>
          )}

          <label htmlFor="login-password">{recovering ? 'New password' : 'Password'}</label>
          <div className="fq-login-password">
            <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={creating || recovering ? 'new-password' : 'current-password'} maxLength={72}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder={creating || recovering ? 'At least 8 characters' : 'Your password'} required data-testid="input-password" />
            <button type="button" className="fq-login-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          {creating && (
            <fieldset className="fq-privacy-consent">
              <legend>For a parent or caregiver</legend>
              <p>Fraction Quest saves the account username and display name, learner nicknames, lesson answers and progress, and app preferences so learning can continue on another device. Class reports use a learner code, not the learner’s nickname. We do not ask for email or record audio.</p>
              <label className="fq-privacy-consent-check">
                <input type="checkbox" checked={parentConsent} onChange={(event) => setParentConsent(event.target.checked)} />
                <span>I am a parent or caregiver. I reviewed this notice and agree to save this account’s learning data online.</span>
              </label>
              <small>This check is an adult reminder, not identity verification. Guest play stays on this device.</small>
            </fieldset>
          )}

          {error && <p className="fq-login-error" role="alert" data-testid="text-login-error">{error}</p>}

          <button type="submit" className="fq-button fq-login-submit" disabled={busy || !username.trim() || !password || (creating && !parentConsent) || (recovering && !recoveryCode.trim())} data-testid="button-login-submit">
            {busy ? 'One moment…' : recovering ? 'Set new password' : creating ? 'Create my account' : 'Sign in'} {!busy && <ArrowRight size={17} />}
          </button>
        </form>

        {creating
          ? <p className="fq-login-help">A parent or caregiver must create the online account. You’ll get a recovery code to keep, in case the password is forgotten.</p>
          : recovering
            ? <p className="fq-login-help">No recovery code? If this account is still signed in on another device, a grown-up can set a new password from the grown-ups’ page there. <button type="button" className="fq-link-button" onClick={() => switchMode('sign-in')} data-testid="button-back-to-sign-in">Back to sign in</button></p>
            : <p className="fq-login-help">Forgot your password? <button type="button" className="fq-link-button" onClick={() => switchMode('recover')} data-testid="button-forgot-password">Use the recovery code</button></p>}

        <div className="fq-login-guest">
          <span>or</span>
          <button type="button" className="fq-hint-button" onClick={onGuest} data-testid="button-play-guest">Play without an account</button>
          <small>Progress stays on this device only.</small>
        </div>
      </main>
    </div>
  );
}
