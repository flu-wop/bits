import { redirect } from 'next/navigation';
import ActionForm from '@/components/admin/ActionForm';
import { requestLoginAction } from '../actions';
import { currentAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await currentAdmin()) redirect('/admin');
  return (
    <main className="adm-wrap adm-wrap--narrow">
      <h1 className="adm-h1">BITS admin</h1>
      <p className="adm-lede">Enter your email and we&rsquo;ll send you a sign-in link.</p>
      <ActionForm action={requestLoginAction} submitLabel="Send link">
        <div className="adm-field">
          <label className="adm-label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
        </div>
      </ActionForm>
    </main>
  );
}
