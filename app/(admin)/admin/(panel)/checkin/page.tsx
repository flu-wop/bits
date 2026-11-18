import ActionForm from '@/components/admin/ActionForm';
import { checkInAction } from '../../actions';
import { requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function CheckinPage() {
  await requireAdmin();
  return (
    <main className="adm-wrap adm-wrap--narrow">
      <h1 className="adm-h1">Door check-in</h1>
      <p className="adm-lede">Scan a ticket with any QR scanner app (it opens the ticket link) and paste the link here, or type the code. Each ticket works once.</p>
      <ActionForm action={checkInAction} submitLabel="Check in">
        <div className="adm-field"><label className="adm-label">Ticket link or code</label><input name="code" type="text" required autoComplete="off" autoCapitalize="off" spellCheck={false} /></div>
      </ActionForm>
    </main>
  );
}
