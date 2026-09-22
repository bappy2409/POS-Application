import { useAuth } from '../auth/AuthContext.jsx';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const { logout, user } = useAuth();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Authenticated</p>
        <h1 className="mt-3 text-4xl font-bold">Welcome, {user.firstName}</h1>
        <p className="mt-4 text-slate-300">Signed in as {user.role.replace('_', ' ')}. POS features arrive in the next phases.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-lg border border-emerald-500 px-4 py-2 font-semibold text-emerald-300" to="/inventory">View inventory</Link>
          {['owner', 'branch_manager'].includes(user.role) && <Link className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950" to="/admin">Manage catalog</Link>}
          <button className="rounded-lg border border-slate-500 px-4 py-2 font-semibold hover:bg-slate-800" type="button" onClick={logout}>Sign out</button>
        </div>
      </section>
    </main>
  );
}
