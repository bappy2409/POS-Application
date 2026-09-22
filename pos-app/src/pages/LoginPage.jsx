import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext.jsx';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-100">
      <form className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl" onSubmit={submit}>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Clothing Store POS</p>
        <h1 className="mt-3 text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-slate-300">Use your staff account to access the POS.</p>

        <label className="mt-7 block text-sm font-medium" htmlFor="email">Email</label>
        <input id="email" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />

        <label className="mt-5 block text-sm font-medium" htmlFor="password">Password</label>
        <input id="password" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />

        {error && <p className="mt-4 rounded-lg bg-rose-950 p-3 text-sm text-rose-200" role="alert">{error}</p>}
        <button className="mt-7 w-full rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
