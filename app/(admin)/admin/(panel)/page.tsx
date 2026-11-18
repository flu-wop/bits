import { requireAdmin } from '@/lib/session';
import { dashboardStats, setupStatus } from '@/lib/stats';

export default async function Dashboard() {
  await requireAdmin();
  const s = await dashboardStats();
  return (
    <main className="adm-wrap">
      <h1 className="adm-h1">Dashboard</h1>
      <div className="adm-grid">
        <div className="adm-card adm-card--accent"><p className="adm-stat">{s.published}</p><p className="adm-label">Published events</p></div>
        <div className="adm-card"><p className="adm-stat">{s.drafts}</p><p className="adm-label">Draft events</p></div>
        <div className="adm-card"><p className="adm-stat">{s.depositsOn}/{s.depositsTotal}</p><p className="adm-label">Deposit packages on</p></div>
        <div className="adm-card"><p className="adm-stat">{s.paidOrders}</p><p className="adm-label">Paid orders</p></div>
      </div>
      <h2 className="adm-h2">Setup</h2>
      <ul className="adm-list">
        {setupStatus().map((x) => (
          <li key={x.label}><strong className={x.ok ? 'adm-ok' : 'adm-no'}>{x.ok ? 'Ready' : 'Not set'}</strong><span>{x.label}</span><span className="adm-hint">{x.note}</span></li>
        ))}
      </ul>
    </main>
  );
}
