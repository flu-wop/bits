import ActionForm from '@/components/admin/ActionForm';
import { verifyLoginAction } from '../../actions';

export const dynamic = 'force-dynamic';

// Opening the emailed link only shows this page. The token is used up when the button is pressed (POST),
// so link previews and mail scanners can't consume it.
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  return (
    <main className="adm-wrap adm-wrap--narrow">
      <h1 className="adm-h1">BITS admin</h1>
      {token ? (
        <>
          <p className="adm-lede">Continue to sign in on this device.</p>
          <ActionForm action={verifyLoginAction} submitLabel="Sign in">
            <input type="hidden" name="token" value={token} />
          </ActionForm>
        </>
      ) : (
        <p className="adm-lede">This link is missing its code. <a className="inline-link" href="/admin/login">Request a new one.</a></p>
      )}
    </main>
  );
}
