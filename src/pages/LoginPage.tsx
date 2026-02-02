import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import api from '../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.accessToken, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '로그인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-geo-deep">
      {/* Background effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-status-purple/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-status-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-geo-card border border-geo-border rounded-2xl p-8 w-full max-w-md animate-fade-in">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-status-purple to-status-blue rounded-t-2xl" />

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-status-purple to-status-blue rounded-xl flex items-center justify-center text-lg font-bold text-white">
            G
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-txt-primary mb-1">GeoStudio</h1>
        <p className="text-txt-secondary text-center text-sm mb-8">콘솔에 로그인하세요</p>

        {error && (
          <div className="bg-status-red-dim text-status-red p-3 rounded-lg mb-4 text-sm border border-status-red/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-txt-secondary mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 focus:border-status-purple/60 outline-none transition-all"
              placeholder="admin@arteon.io"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-txt-secondary mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 focus:border-status-purple/60 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-status-purple text-white py-2.5 rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
