import React, { useEffect, useRef, useState } from 'react';
import {
  createNaturalSpeaker,
  warmUpNaturalVoice,
  type NaturalVoiceFailureStage,
} from './lib/natural-voice';

type TestStep = 'load' | 'generate' | 'play';
type TestState = {
  status: 'idle' | 'running' | 'passed' | 'failed' | 'cancelled';
  step?: TestStep;
  completed: TestStep[];
  progress?: number;
  message?: string;
};

const TEST_PHRASE = 'Hello! This is a short Kokoro voice test.';
/* If Safari runs out of memory it reloads the page and every error handler is lost. Each step is saved here
   first, so after a reload the test can say where it stopped. */
const BREADCRUMB_KEY = 'fraction-quest-kokoro-test-step';
type Breadcrumb = { step: TestStep; detail: string; at: number };
export function saveBreadcrumb(step: TestStep, detail: string) {
  try { globalThis.localStorage?.setItem(BREADCRUMB_KEY, JSON.stringify({ step, detail, at: Date.now() } satisfies Breadcrumb)); } catch { /* storage blocked */ }
}
export function clearBreadcrumb() {
  try { globalThis.localStorage?.removeItem(BREADCRUMB_KEY); } catch { /* storage blocked */ }
}
/** A test that was still running when the page went away (a crash or reload), if any. */
export function readBreadcrumb(): Breadcrumb | null {
  try {
    const raw = globalThis.localStorage?.getItem(BREADCRUMB_KEY);
    if (!raw) return null;
    const crumb = JSON.parse(raw) as Breadcrumb;
    return crumb && (crumb.step === 'load' || crumb.step === 'generate' || crumb.step === 'play') ? crumb : null;
  } catch { return null; }
}
const STEP_NAMES: Record<TestStep, string> = {
  load: 'Reach the Kokoro voice server',
  generate: 'Generate a short sample',
  play: 'Play the sample',
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const location = error.stack?.split('\n').slice(0, 2).join(' ');
    return `${error.name}: ${error.message}${location ? ` — ${location}` : ''}`.slice(0, 600);
  }
  if (typeof error === 'string') return error.slice(0, 600);
  try { return JSON.stringify(error).slice(0, 600); } catch { return 'An unknown browser error occurred.'; }
}

function getStepStatus(state: TestState, step: TestStep): { text: string; state: string } {
  if (state.completed.includes(step)) return { text: 'Passed', state: 'passed' };
  if (state.status === 'failed' && state.step === step) return { text: 'Failed', state: 'failed' };
  if (state.status === 'running' && state.step === step) {
    if (step === 'load' && typeof state.progress === 'number') {
      return {
        text: state.progress >= 100 ? 'Connected' : state.progress > 0 ? 'The server is loading the voice (first time only)…' : 'Connecting…',
        state: 'active',
      };
    }
    return { text: 'In progress', state: 'active' };
  }
  return { text: 'Waiting', state: 'waiting' };
}

export function KokoroDiagnostic() {
  const [state, setState] = useState<TestState>({ status: 'idle', completed: [] });
  // A breadcrumb left by the last run means the page crashed or reloaded mid-test (often Safari memory limits).
  const [crashed] = useState<Breadcrumb | null>(() => readBreadcrumb());
  useEffect(() => { if (crashed) clearBreadcrumb(); }, [crashed]);
  const runId = useRef(0);
  const activeSpeaker = useRef<ReturnType<typeof createNaturalSpeaker> | null>(null);
  const removeErrorListeners = useRef<(() => void) | null>(null);

  const cancel = () => {
    runId.current += 1;
    clearBreadcrumb();
    removeErrorListeners.current?.();
    removeErrorListeners.current = null;
    try { activeSpeaker.current?.stop(); } catch { /* partial mobile audio implementations */ }
    activeSpeaker.current = null;
    setState({
      status: 'cancelled',
      completed: [],
      message: 'Test stopped. A model download already in progress may finish in the background.',
    });
  };

  const run = async () => {
    const id = ++runId.current;
    const activeStep = { current: 'load' as TestStep };
    let failure: { step: TestStep; message: string } | null = null;
    const fail = (step: TestStep, message: string) => {
      if (runId.current !== id || failure) return;
      failure = { step, message };
      clearBreadcrumb();
      try { activeSpeaker.current?.stop(); } catch { /* partial mobile audio implementations */ }
      activeSpeaker.current = null;
      setState({ status: 'failed', step, completed: step === 'load' ? [] : step === 'generate' ? ['load'] : ['load', 'generate'], message });
    };
    const onWindowError = (event: Event) => {
      const errorEvent = event as ErrorEvent;
      const location = errorEvent.filename
        ? ` (${errorEvent.filename}:${errorEvent.lineno ?? 0}:${errorEvent.colno ?? 0})`
        : '';
      const stack = errorEvent.error instanceof Error ? `\n${errorEvent.error.stack || ''}` : '';
      fail(activeStep.current, `${errorEvent.message || 'Browser runtime error'}${location}${stack}`);
    };
    const onUnhandledRejection = (event: Event) => {
      fail(activeStep.current, errorMessage((event as PromiseRejectionEvent).reason));
    };

    setState({ status: 'running', step: 'load', completed: [], progress: 0 });
    saveBreadcrumb('load', 'connecting to the voice server');
    if (typeof window !== 'undefined') {
      window.addEventListener('error', onWindowError, true);
      window.addEventListener('unhandledrejection', onUnhandledRejection);
      removeErrorListeners.current = () => {
        window.removeEventListener('error', onWindowError, true);
        window.removeEventListener('unhandledrejection', onUnhandledRejection);
      };
    }

    try {
      let loadError: unknown = null;
      // This explicit diagnostic bypasses the normal iOS Kokoro guard and never changes the saved voice.
      const engine = await warmUpNaturalVoice({
        diagnostic: true,
        onProgress: (progress) => {
          if (runId.current !== id) return;
          setState({ status: 'running', step: 'load', completed: [], progress });
          if (progress >= 100) saveBreadcrumb('load', 'connected to the voice server');
        },
        onError: (error) => { loadError = error; },
      });
      if (runId.current !== id) return;
      if (failure) return;
      if (!engine) throw loadError ?? new Error('The voice server could not be reached. Check the connection, then try again.');

      setState({ status: 'running', step: 'generate', completed: ['load'], progress: 100 });
      activeStep.current = 'generate';
      saveBreadcrumb('generate', 'making the voice sample');
      // Let mobile Safari paint the new phase before the expensive inference call.
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())));
      if (runId.current !== id || failure) return;
      const speaker = createNaturalSpeaker(undefined, 'af_heart');
      activeSpeaker.current = speaker;

      const played = await new Promise<boolean>((resolve) => {
        speaker.speak(
          [TEST_PHRASE],
          resolve,
          (phase) => {
            if (runId.current !== id || failure) return;
            if (phase === 'playing') {
              activeStep.current = 'play';
              saveBreadcrumb('play', 'playing the sample');
              setState({ status: 'running', step: 'play', completed: ['load', 'generate'] });
            } else if (phase === 'generating') {
              activeStep.current = 'generate';
              setState({ status: 'running', step: 'generate', completed: ['load'] });
            }
          },
          (stage: NaturalVoiceFailureStage, error) => {
            fail(stage === 'playing' ? 'play' : 'generate', errorMessage(error));
          },
        );
      });

      if (runId.current !== id || failure) return;
      if (!played) {
        fail(activeStep.current, 'Kokoro stopped before the sample finished. Check the browser error details and try again.');
        return;
      }
      clearBreadcrumb();
      setState({ status: 'passed', completed: ['load', 'generate', 'play'] });
    } catch (error) {
      fail(activeStep.current, errorMessage(error));
    } finally {
      removeErrorListeners.current?.();
      removeErrorListeners.current = null;
      if (runId.current === id) activeSpeaker.current = null;
    }
  };

  const running = state.status === 'running';

  return (
    <section className="fq-kokoro-diagnostic" data-testid="kokoro-diagnostic" aria-labelledby="kokoro-diagnostic-title">
      <div className="fq-kokoro-diagnostic-heading">
        <div>
          <h4 id="kokoro-diagnostic-title">Kokoro self-test</h4>
          <p>Runs a short, fixed phrase through the model and audio player. It won’t change the lesson voice or send student work anywhere.</p>
        </div>
        <button
          type="button"
          className="fq-button ghost"
          onClick={() => { if (running) cancel(); else void run(); }}
          data-testid="button-kokoro-diagnostic"
        >
          {running ? 'Stop test' : state.status === 'passed' || state.status === 'failed' ? 'Run again' : 'Run test'}
        </button>
      </div>

      <ol className="fq-kokoro-test-steps" aria-label="Kokoro test steps">
        {(['load', 'generate', 'play'] as const).map((step, index) => {
          const result = getStepStatus(state, step);
          return (
            <li key={step} className={`fq-kokoro-test-step is-${result.state}`} data-testid={`kokoro-test-step-${step}`}>
              <span className="fq-kokoro-test-number" aria-hidden="true">{result.state === 'passed' ? '✓' : index + 1}</span>
              <strong>{STEP_NAMES[step]}</strong>
              <span className="fq-kokoro-test-result" role={result.state === 'failed' ? 'alert' : undefined}>{result.text}</span>
            </li>
          );
        })}
      </ol>

      {crashed && state.status === 'idle' && (
        <div className="fq-kokoro-test-error" role="alert" data-testid="kokoro-test-crashed">
          <strong>The last test stopped the page during: {STEP_NAMES[crashed.step]} ({crashed.detail}).</strong>
          <p>The page reloaded instead of showing an error. On iPhone and iPad this usually means Safari ran out of memory.</p>
        </div>
      )}
      {running && state.step === 'load' && <p className="fq-kokoro-test-note" role="status">The first time, the server loads the voice (up to a minute). Keep this page open.</p>}
      {state.status === 'passed' && <p className="fq-kokoro-test-success" role="status">All three steps passed. The Kokoro sample played on this device.</p>}
      {state.status === 'failed' && (
        <div className="fq-kokoro-test-error" role="alert" data-testid="kokoro-test-error">
          <strong>Failed during: {state.step ? STEP_NAMES[state.step] : 'test'}</strong>
          <pre>{state.message}</pre>
        </div>
      )}
      {state.message && state.status === 'cancelled' && <p className="fq-kokoro-test-note" role="status">{state.message}</p>}
    </section>
  );
}
