import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext.jsx';
import { apiRequest } from '../lib/api.js';

export default function InventoryPage() {
  const { token, user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(user.role === 'cashier' ? user.branchId : '');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adjusting, setAdjusting] = useState(null);

  useEffect(() => {
    apiRequest('/branches', { token })
      .then(({ branches: result }) => {
        setBranches(result);
        if (!branchId && result.length) setBranchId(result.find((branch) => branch.isActive)?.id ?? result[0].id);
      })
      .catch((requestError) => { setError(requestError.message); setLoading(false); });
  }, [token]);

  async function loadInventory() {
    if (!branchId) return;
    setLoading(true); setError('');
    try {
      const result = await apiRequest(`/inventory?branch_id=${encodeURIComponent(branchId)}`, { token });
      setInventory(result.inventory);
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  }

  useEffect(() => { loadInventory(); }, [branchId, token]);
  const canAdjust = ['owner', 'branch_manager'].includes(user.role);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <Link className="text-sm font-semibold text-emerald-400 hover:text-emerald-300" to="/">← Back to POS</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Inventory</p><h1 className="mt-2 text-4xl font-bold">Branch stock</h1></div><button className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold hover:bg-slate-800" type="button" onClick={loadInventory}>Refresh</button></div>
        <div className="mt-6 max-w-sm"><label className="block text-sm font-medium" htmlFor="branch">Branch</label><select id="branch" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 disabled:opacity-60" value={branchId ?? ''} onChange={(event) => setBranchId(event.target.value)} disabled={user.role === 'cashier'}>{!branchId && <option value="">Select a branch</option>}{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>)}</select></div>
        {error && <p className="mt-5 rounded-lg bg-rose-950 p-3 text-rose-200" role="alert">{error}</p>}
        {loading ? <p className="mt-8 text-slate-300">Loading stock…</p> : <section className="mt-6 overflow-hidden rounded-xl border border-slate-700 bg-slate-900"><table className="w-full text-left text-sm"><thead className="bg-slate-800 text-slate-300"><tr><th className="p-4">Product</th><th className="p-4">Variant</th><th className="p-4">SKU</th><th className="p-4">Quantity</th><th className="p-4" /></tr></thead><tbody>{inventory.map((row) => { const low = row.productVariant.lowStockThreshold > 0 && row.quantity <= row.productVariant.lowStockThreshold; return <tr className="border-t border-slate-800" key={row.productVariant.id}><td className="p-4">{row.productVariant.product.name}</td><td className="p-4">{row.productVariant.size || '—'} / {row.productVariant.color || '—'}</td><td className="p-4 font-mono text-xs">{row.productVariant.sku}</td><td className="p-4">{row.quantity} {low && <span className="ml-2 rounded bg-amber-950 px-2 py-1 text-xs font-semibold text-amber-200">Low stock ≤ {row.productVariant.lowStockThreshold}</span>}</td><td className="p-4 text-right">{canAdjust && <button className="text-emerald-400" type="button" onClick={() => setAdjusting(row)}>Adjust</button>}</td></tr>; })}</tbody></table>{!inventory.length && <p className="p-6 text-slate-400">No product variants found for this branch.</p>}</section>}
      </div>
      {adjusting && <AdjustmentModal row={adjusting} branchId={branchId} token={token} onClose={() => setAdjusting(null)} onSaved={async () => { setAdjusting(null); await loadInventory(); }} />}
    </main>
  );
}

function AdjustmentModal({ row, branchId, token, onClose, onSaved }) {
  const [quantityDelta, setQuantityDelta] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await apiRequest('/inventory/adjust', { token, method: 'POST', body: JSON.stringify({ productVariantId: row.productVariant.id, branchId, quantityDelta: Number(quantityDelta), reason }) });
      await onSaved();
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-10 grid place-items-center bg-slate-950/75 p-6" role="dialog" aria-modal="true" aria-labelledby="adjust-title"><form className="w-full max-w-md space-y-4 rounded-xl border border-slate-600 bg-slate-900 p-6 shadow-2xl" onSubmit={submit}><h2 id="adjust-title" className="text-xl font-bold">Adjust {row.productVariant.sku}</h2><p className="text-sm text-slate-300">Current quantity: {row.quantity}. Enter a positive or negative quantity change.</p><label className="block text-sm font-medium">Quantity change<input className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2" type="number" step="1" value={quantityDelta} onChange={(event) => setQuantityDelta(event.target.value)} required autoFocus /></label><label className="block text-sm font-medium">Reason<textarea className="mt-2 min-h-24 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2" value={reason} onChange={(event) => setReason(event.target.value)} maxLength="500" required /></label>{error && <p className="rounded-lg bg-rose-950 p-3 text-sm text-rose-200" role="alert">{error}</p>}<div><button className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save adjustment'}</button><button className="ml-3 text-slate-300" type="button" onClick={onClose}>Cancel</button></div></form></div>;
}
