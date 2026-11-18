import ActionForm from '@/components/admin/ActionForm';
import { saveDepositAction } from '../../actions';
import { listDepositOffers } from '@/lib/deposits';
import { requireAdmin } from '@/lib/session';
import { centsToInput } from '@/lib/validate';

export default async function DepositsPage() {
  await requireAdmin();
  const offers = await listDepositOffers();
  return (
    <main className="adm-wrap">
      <h1 className="adm-h1">Deposits</h1>
      <p className="adm-lede">A fixed deposit amount per Build Systems package. A pay button appears on the Build Systems page only for packages that are switched on. Deposits are separate from donations.</p>
      {offers.map((o) => (
        <ActionForm key={o.id} action={saveDepositAction.bind(null, o.id)} submitLabel="Save" className="adm-card">
          <h3>{o.label} {o.enabled ? <span className="adm-ok">on</span> : <span className="adm-hint">off</span>}</h3>
          <p className="adm-hint">{o.hint}</p>
          <div className="adm-cols">
            <div className="adm-field"><label className="adm-label">Label shown at checkout</label><input name="label" type="text" required maxLength={100} defaultValue={o.label} /></div>
            <div className="adm-field"><label className="adm-label">Deposit amount (USD)</label><input name="amount" type="text" inputMode="decimal" placeholder="not set" defaultValue={centsToInput(o.amountCents)} /></div>
          </div>
          <label className="adm-check"><input name="enabled" type="checkbox" defaultChecked={o.enabled} /> On (needs an amount)</label>
        </ActionForm>
      ))}
    </main>
  );
}
