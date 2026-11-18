'use client';
import { startTransition, useActionState, useEffect, useState, type FormEvent, type ReactNode } from 'react';

export type FormState = { ok?: string; error?: string } | null;
export type FormAction = (prev: FormState, data: FormData) => Promise<FormState>;

// A form wired to a server action; shows the action's error or success message under the button.
// Submitted by hand rather than through <form action>: React clears uncontrolled fields after a form action,
// even when validation failed, which would wipe what the person just typed. The button stays disabled until the
// page has hydrated so an early click can't fall back to a plain browser submit.
export default function ActionForm({ action, submitLabel, children, tone = 'primary', className }: {
  action: FormAction; submitLabel: string; children?: ReactNode; tone?: 'primary' | 'ghost' | 'danger'; className?: string;
}) {
  const [state, run, pending] = useActionState(action, null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => run(data));
  };
  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
      <div className="adm-row">
        <button type="submit" className={'adm-btn' + (tone === 'primary' ? '' : ` adm-btn--${tone}`)} disabled={!ready || pending}>{pending ? 'Working…' : submitLabel}</button>
        {state?.error ? <p role="alert" className="adm-msg adm-msg--err">{state.error}</p> : null}
        {state?.ok ? <p role="status" className="adm-msg adm-msg--ok">{state.ok}</p> : null}
      </div>
    </form>
  );
}
