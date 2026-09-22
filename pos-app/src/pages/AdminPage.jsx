import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext.jsx';
import { apiRequest } from '../lib/api.js';

const emptyBranch = { name: '', code: '', address: '', isActive: true };
const emptyProduct = { name: '', description: '', basePriceCents: '', isActive: true };
const emptyVariant = { sku: '', size: '', color: '', priceOverrideCents: '', lowStockThreshold: '0' };

function asPayload(form) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value === '' ? null : value]));
}

function cents(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((value ?? 0) / 100);
}

function ErrorNotice({ message }) {
  return message ? <p className="rounded-lg bg-rose-950 p-3 text-sm text-rose-200" role="alert">{message}</p> : null;
}

export default function AdminPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState('products');
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedProductId) ?? null, [products, selectedProductId]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [branchResult, productResult] = await Promise.all([
        apiRequest('/branches', { token }),
        apiRequest('/products', { token }),
      ]);
      setBranches(branchResult.branches);
      setProducts(productResult.products);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  if (loading) return <main className="min-h-screen bg-slate-950 p-8 text-slate-100">Loading catalog…</main>;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <Link className="text-sm font-semibold text-emerald-400 hover:text-emerald-300" to="/">← Back to POS</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Administration</p>
            <h1 className="mt-2 text-4xl font-bold">Catalog & branches</h1>
          </div>
          <button className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold hover:bg-slate-800" type="button" onClick={load}>Refresh</button>
        </div>
        <ErrorNotice message={error} />
        <div className="mt-8 flex gap-2 border-b border-slate-700">
          <TabButton active={tab === 'products'} onClick={() => setTab('products')}>Products</TabButton>
          <TabButton active={tab === 'branches'} onClick={() => setTab('branches')}>Branches</TabButton>
        </div>
        {tab === 'products' ? <ProductsPanel token={token} products={products} selectedProduct={selectedProduct} selectProduct={setSelectedProductId} reload={load} /> : <BranchesPanel token={token} branches={branches} reload={load} />}
      </div>
    </main>
  );
}

function TabButton({ active, children, onClick }) {
  return <button className={`border-b-2 px-4 py-3 font-semibold ${active ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`} type="button" onClick={onClick}>{children}</button>;
}

function BranchesPanel({ token, branches, reload }) {
  const [form, setForm] = useState(emptyBranch);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function edit(branch) {
    setEditingId(branch.id);
    setForm({ name: branch.name, code: branch.code, address: branch.address ?? '', isActive: branch.isActive });
    setError('');
  }
  function cancel() { setEditingId(null); setForm(emptyBranch); setError(''); }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await apiRequest(editingId ? `/branches/${editingId}` : '/branches', {
        token, method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(asPayload(form)),
      });
      cancel(); await reload();
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }
  async function remove(branch) {
    if (!window.confirm(`Delete ${branch.name}?`)) return;
    try { await apiRequest(`/branches/${branch.id}`, { token, method: 'DELETE' }); await reload(); } catch (requestError) { setError(requestError.message); }
  }
  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <table className="w-full text-left text-sm"><thead className="bg-slate-800 text-slate-300"><tr><th className="p-4">Branch</th><th className="p-4">Code</th><th className="p-4">Status</th><th className="p-4" /></tr></thead>
          <tbody>{branches.map((branch) => <tr key={branch.id} className="border-t border-slate-800"><td className="p-4"><strong>{branch.name}</strong><br /><span className="text-slate-400">{branch.address ?? 'No address'}</span></td><td className="p-4">{branch.code}</td><td className="p-4">{branch.isActive ? 'Active' : 'Inactive'}</td><td className="p-4 text-right"><button className="mr-3 text-emerald-400" type="button" onClick={() => edit(branch)}>Edit</button><button className="text-rose-300" type="button" onClick={() => remove(branch)}>Delete</button></td></tr>)}</tbody>
        </table>
        {!branches.length && <p className="p-6 text-slate-400">No branches yet.</p>}
      </section>
      <FormCard title={editingId ? 'Edit branch' : 'New branch'} onSubmit={submit} saving={saving} onCancel={editingId ? cancel : undefined}>
        <TextField label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
        <TextField label="Code" value={form.code} onChange={(code) => setForm({ ...form, code })} hint="Example: DOWNTOWN" required />
        <TextField label="Address" value={form.address} onChange={(address) => setForm({ ...form, address })} />
        <Toggle label="Active branch" checked={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />
        <ErrorNotice message={error} />
      </FormCard>
    </div>
  );
}

function ProductsPanel({ token, products, selectedProduct, selectProduct, reload }) {
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function edit(product) { setEditingId(product.id); setForm({ name: product.name, description: product.description ?? '', basePriceCents: String(product.basePriceCents), isActive: product.isActive }); setError(''); }
  function cancel() { setEditingId(null); setForm(emptyProduct); setError(''); }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const result = await apiRequest(editingId ? `/products/${editingId}` : '/products', { token, method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(asPayload(form)) });
      selectProduct(result.product.id); cancel(); await reload();
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }
  async function remove(product) {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    try { await apiRequest(`/products/${product.id}`, { token, method: 'DELETE' }); if (selectedProduct?.id === product.id) selectProduct(null); await reload(); } catch (requestError) { setError(requestError.message); }
  }
  return (
    <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">{products.map((product) => <article key={product.id} className={`rounded-xl border p-5 ${selectedProduct?.id === product.id ? 'border-emerald-400 bg-slate-800' : 'border-slate-700 bg-slate-900'}`}><div className="flex flex-wrap justify-between gap-4"><button className="text-left" type="button" onClick={() => selectProduct(product.id)}><h2 className="text-xl font-bold">{product.name}</h2><p className="mt-1 text-slate-400">{cents(product.basePriceCents)} · {product.isActive ? 'Active' : 'Inactive'}</p></button><div><button className="mr-3 text-emerald-400" type="button" onClick={() => edit(product)}>Edit</button><button className="text-rose-300" type="button" onClick={() => remove(product)}>Delete</button></div></div><p className="mt-3 text-sm text-slate-300">{product.description || 'No description'}</p><div className="mt-4 flex flex-wrap gap-2">{product.variants.map((variant) => <span key={variant.id} className="rounded bg-slate-700 px-2 py-1 text-xs">{variant.sku} {variant.size && `· ${variant.size}`} {variant.color && `· ${variant.color}`}</span>)}{!product.variants.length && <span className="text-sm text-slate-400">No variants</span>}</div></article>)}{!products.length && <p className="rounded-xl border border-dashed border-slate-700 p-8 text-slate-400">Create a product to start your catalog.</p>}
        {selectedProduct && <VariantsPanel token={token} product={selectedProduct} reload={reload} />}</section>
      <FormCard title={editingId ? 'Edit product' : 'New product'} onSubmit={submit} saving={saving} onCancel={editingId ? cancel : undefined}>
        <TextField label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
        <TextField label="Base price (cents)" type="number" min="0" value={form.basePriceCents} onChange={(basePriceCents) => setForm({ ...form, basePriceCents })} required />
        <TextField label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} />
        <Toggle label="Available for sale" checked={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />
        <ErrorNotice message={error} />
      </FormCard>
    </div>
  );
}

function VariantsPanel({ token, product, reload }) {
  const [form, setForm] = useState(emptyVariant);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function edit(variant) { setEditingId(variant.id); setForm({ sku: variant.sku, size: variant.size ?? '', color: variant.color ?? '', priceOverrideCents: variant.priceOverrideCents === null ? '' : String(variant.priceOverrideCents), lowStockThreshold: String(variant.lowStockThreshold ?? 0) }); }
  function cancel() { setEditingId(null); setForm(emptyVariant); setError(''); }
  async function submit(event) { event.preventDefault(); setSaving(true); setError(''); try { await apiRequest(editingId ? `/products/${product.id}/variants/${editingId}` : `/products/${product.id}/variants`, { token, method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(asPayload(form)) }); cancel(); await reload(); } catch (requestError) { setError(requestError.message); } finally { setSaving(false); } }
  async function remove(variant) { if (!window.confirm(`Delete variant ${variant.sku}?`)) return; try { await apiRequest(`/products/${product.id}/variants/${variant.id}`, { token, method: 'DELETE' }); await reload(); } catch (requestError) { setError(requestError.message); } }
  return <section className="rounded-xl border border-emerald-800 bg-slate-900 p-5"><h2 className="text-xl font-bold">Variants: {product.name}</h2><div className="mt-4 space-y-2">{product.variants.map((variant) => <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-800 p-3" key={variant.id}><span><strong>{variant.sku}</strong> · {variant.size || '—'} / {variant.color || '—'} · {variant.priceOverrideCents === null ? `Base ${cents(product.basePriceCents)}` : cents(variant.priceOverrideCents)} · Low-stock at {variant.lowStockThreshold ?? 0}</span><span><button className="mr-3 text-emerald-400" type="button" onClick={() => edit(variant)}>Edit</button><button className="text-rose-300" type="button" onClick={() => remove(variant)}>Delete</button></span></div>)}</div><form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={submit}><TextField label="SKU" value={form.sku} onChange={(sku) => setForm({ ...form, sku })} required /><TextField label="Size" value={form.size} onChange={(size) => setForm({ ...form, size })} /><TextField label="Color" value={form.color} onChange={(color) => setForm({ ...form, color })} /><TextField label="Override (cents)" type="number" min="0" value={form.priceOverrideCents} onChange={(priceOverrideCents) => setForm({ ...form, priceOverrideCents })} /><TextField label="Low-stock threshold" type="number" min="0" value={form.lowStockThreshold} onChange={(lowStockThreshold) => setForm({ ...form, lowStockThreshold })} required /><div className="sm:col-span-2"><ErrorNotice message={error} /><button className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" disabled={saving} type="submit">{saving ? 'Saving…' : editingId ? 'Save variant' : 'Add variant'}</button>{editingId && <button className="ml-3 text-slate-300" type="button" onClick={cancel}>Cancel</button>}</div></form></section>;
}

function FormCard({ title, children, onSubmit, saving, onCancel }) {
  return <form className="h-fit space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5" onSubmit={onSubmit}><h2 className="text-xl font-bold">{title}</h2>{children}<div><button className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save'}</button>{onCancel && <button className="ml-3 text-slate-300" type="button" onClick={onCancel}>Cancel</button>}</div></form>;
}

function TextField({ label, value, onChange, hint, ...props }) {
  return <label className="block text-sm font-medium">{label}<input className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} {...props} />{hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}</label>;
}

function Toggle({ label, checked, onChange }) {
  return <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}
