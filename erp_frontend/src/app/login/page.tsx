'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Building2, ChevronDown, ChevronUp, LogIn, Shield } from 'lucide-react';
import { useAuth, demoUsers } from '../../context/AuthContext';
import { getRoleInitials } from '../../context/RoleContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 300)); // small delay for UX
    const success = login(username, password);
    if (success) {
      router.replace('/');
    } else {
      setError('Invalid username or password. Please check and retry.');
      setIsSubmitting(false);
    }
  };

  const quickLogin = async (u: string, p: string) => {
    setError('');
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 200));
    const success = login(u, p);
    if (success) {
      router.replace('/');
    } else {
      setError('Quick login failed. Please try manually.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-slate-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/50 mb-4">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">City Surveillance</h1>
          <p className="text-slate-400 text-sm mt-1">ITMS ERP Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Sign in to your account</h2>
            <p className="text-sm text-gray-500 mt-0.5">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <input
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                <Shield className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Credentials Toggle */}
          <div className="border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowCreds(!showCreds)}
              className="w-full flex items-center justify-between px-6 py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center text-xs font-bold text-amber-600">D</span>
                Demo Accounts — Quick Login
              </span>
              {showCreds ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {showCreds && (
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {demoUsers.map(user => (
                  <div
                    key={user.username}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold">
                      {getRoleInitials(user.role)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{user.role}</div>
                      <div className="text-xs text-gray-400 font-mono">{user.username} · {user.password}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => quickLogin(user.username, user.password)}
                      disabled={isSubmitting}
                      className="flex-shrink-0 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-blue-200 disabled:opacity-50"
                    >
                      Use →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © 2026 ITMS Platform · City Surveillance ERP
        </p>
      </div>
    </div>
  );
}
