import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../stores/auth.store';

// ── helpers ─────────────────────────────────────────────────

function opId() {
  return crypto.randomUUID();
}

function adminGet(path: string, params?: Record<string, string>) {
  return api.get(`/admin/${path}`, { params }).then(r => r.data);
}

function adminMutate(method: 'delete' | 'post', path: string, body?: any) {
  const config = { headers: { 'X-Operation-Id': opId() } };
  if (method === 'delete') return api.delete(`/admin/${path}`, config).then(r => r.data);
  return api.post(`/admin/${path}`, body, config).then(r => r.data);
}

// ── types ───────────────────────────────────────────────────

type Tab = 'series' | 'batches' | 'assets';

interface Series { series_id: string; display_id: string; name: string; status: string; created_at: string; deleted_at: string | null }
interface Batch { batch_id: string; display_id: string; name: string; status: string; series_id: string; items_total: number; created_at: string; deleted_at: string | null }
interface Asset { asset_id: string; dina_id: string; status: string; batch_id: string; series_id: string; created_at: string; deleted_at: string | null }

// ── badge ───────────────────────────────────────────────────

function StatusBadge({ status, deleted }: { status: string; deleted: boolean }) {
  if (deleted) return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-status-red/10 text-status-red">삭제됨</span>;
  const map: Record<string, string> = {
    ACTIVE: 'bg-status-green/10 text-status-green',
    ACTIVATED: 'bg-status-green/10 text-status-green',
    DRAFT: 'bg-status-yellow/10 text-status-yellow',
    ARCHIVED: 'bg-status-red/10 text-status-red',
    PROCESSING: 'bg-status-blue/10 text-status-blue',
    COMPLETED: 'bg-status-green/10 text-status-green',
    PENDING: 'bg-status-yellow/10 text-status-yellow',
    FAILED: 'bg-status-red/10 text-status-red',
    FINAL_FAILED: 'bg-status-red/10 text-status-red',
  };
  return <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${map[status] || 'bg-status-blue/10 text-status-blue'}`}>{status}</span>;
}

// ── confirm modal ───────────────────────────────────────────

function ConfirmModal({ title, message, danger, onConfirm, onCancel }: {
  title: string; message: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-geo-card border border-geo-border rounded-xl w-[420px] p-6">
        <h3 className="text-base font-semibold text-txt-primary mb-2">{title}</h3>
        <p className="text-sm text-txt-secondary mb-6 whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg hover:border-geo-border-hover transition-all">취소</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${danger ? 'bg-status-red text-white hover:bg-status-red/80' : 'bg-status-purple text-white hover:bg-status-purple/80'}`}>{danger ? '삭제' : '확인'}</button>
        </div>
      </div>
    </div>
  );
}

// ── reset modal (3중 안전장치) ──────────────────────────────

function ResetModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState('');
  const [typing, setTyping] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleFinalReset = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminMutate('post', 'reset', { password, confirmation: 'DELETE ALL DATA' });
      setResult(res.data || res);
    } catch (e: any) {
      setError(e.response?.data?.message || '초기화 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-geo-card border border-status-red/30 rounded-xl w-[480px] p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-status-red/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-status-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-base font-semibold text-status-red flex-1">전체 데이터 초기화</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-geo-card-hover transition-all">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {result ? (
          <div>
            <p className="text-sm text-status-green mb-3">초기화 완료</p>
            <div className="bg-geo-deep rounded-lg p-3 text-xs font-mono text-txt-secondary mb-4">
              <div>시리즈: {result.truncated_series}건 삭제</div>
              <div>배치: {result.truncated_batches}건 삭제</div>
              <div>에셋: {result.truncated_assets}건 삭제</div>
            </div>
            <button onClick={onClose} className="w-full py-2 text-sm font-medium bg-geo-card border border-geo-border rounded-lg text-txt-primary hover:border-geo-border-hover transition-all">닫기</button>
          </div>
        ) : (
          <>
            {/* Step 0: 비밀번호 */}
            {step === 0 && (
              <div>
                <p className="text-sm text-txt-secondary mb-4">시리즈, 배치, 에셋 데이터가 모두 삭제됩니다.<br />감사 로그는 보존됩니다.</p>
                <label className="block text-xs text-txt-muted mb-1.5">관리자 비밀번호</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="ADMIN_RESET_PASSWORD"
                  className="w-full px-3 py-2 bg-geo-deep border border-geo-border rounded-lg text-sm text-txt-primary placeholder-txt-muted focus:outline-none focus:border-status-purple mb-4" />
                <div className="flex justify-end gap-3">
                  <button onClick={onClose} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg hover:border-geo-border-hover transition-all">취소</button>
                  <button onClick={() => password && setStep(1)} disabled={!password}
                    className="px-4 py-2 text-sm font-medium bg-status-red text-white rounded-lg hover:bg-status-red/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed">다음</button>
                </div>
              </div>
            )}

            {/* Step 1: 타이핑 확인 */}
            {step === 1 && (
              <div>
                <p className="text-sm text-txt-secondary mb-4">아래에 <span className="text-status-red font-semibold">초기화합니다</span>를 정확히 입력해주세요.</p>
                <input type="text" value={typing} onChange={e => setTyping(e.target.value)} placeholder="초기화합니다"
                  className="w-full px-3 py-2 bg-geo-deep border border-geo-border rounded-lg text-sm text-txt-primary placeholder-txt-muted focus:outline-none focus:border-status-red mb-4" />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setStep(0)} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg hover:border-geo-border-hover transition-all">이전</button>
                  <button onClick={() => typing === '초기화합니다' && setStep(2)} disabled={typing !== '초기화합니다'}
                    className="px-4 py-2 text-sm font-medium bg-status-red text-white rounded-lg hover:bg-status-red/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed">다음</button>
                </div>
              </div>
            )}

            {/* Step 2: 최종 확인 */}
            {step === 2 && (
              <div>
                <div className="bg-status-red/10 border border-status-red/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-status-red font-medium">이 작업은 되돌릴 수 없습니다.</p>
                  <p className="text-xs text-status-red/70 mt-1">모든 시리즈, 배치, 에셋 데이터가 영구 삭제됩니다.</p>
                </div>
                {error && <p className="text-sm text-status-red mb-3">{error}</p>}
                <div className="flex justify-end gap-3">
                  <button onClick={() => setStep(1)} disabled={loading} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg hover:border-geo-border-hover transition-all">이전</button>
                  <button onClick={handleFinalReset} disabled={loading}
                    className="px-4 py-2 text-sm font-medium bg-status-red text-white rounded-lg hover:bg-status-red/80 transition-all disabled:opacity-50">
                    {loading ? '처리 중...' : '최종 확인 — 전체 초기화 실행'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Main Page
// ═══════════════════════════════════════════════════════════

export default function SystemAdminPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('series');
  const [includeDeleted, setIncludeDeleted] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; danger?: boolean; action: () => void } | null>(null);
  const [resetModal, setResetModal] = useState(false);

  // filter states
  const [seriesFilter, setSeriesFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');

  // role guard
  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-txt-primary mb-2">접근 권한 없음</h2>
          <p className="text-sm text-txt-secondary">이 페이지는 super_admin 전용입니다.</p>
        </div>
      </div>
    );
  }

  // ── queries ─────────────────────────────────────────────

  const seriesQuery = useQuery({
    queryKey: ['admin-series', includeDeleted],
    queryFn: () => adminGet('series', { include_deleted: String(includeDeleted), limit: '200' }),
    enabled: tab === 'series',
  });

  const batchesQuery = useQuery({
    queryKey: ['admin-batches', includeDeleted, seriesFilter],
    queryFn: () => adminGet('batches', { include_deleted: String(includeDeleted), limit: '200', ...(seriesFilter ? { series_id: seriesFilter } : {}) }),
    enabled: tab === 'batches',
  });

  const assetsQuery = useQuery({
    queryKey: ['admin-assets', includeDeleted, batchFilter],
    queryFn: () => adminGet('assets', { include_deleted: String(includeDeleted), limit: '200', ...(batchFilter ? { batch_id: batchFilter } : {}) }),
    enabled: tab === 'assets',
  });

  // ── mutations ───────────────────────────────────────────

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-series'] });
    queryClient.invalidateQueries({ queryKey: ['admin-batches'] });
    queryClient.invalidateQueries({ queryKey: ['admin-assets'] });
  };

  const softDeleteSeries = useMutation({ mutationFn: (id: string) => adminMutate('delete', `series/${id}`), onSuccess: invalidateAll });
  const restoreSeries = useMutation({ mutationFn: (id: string) => adminMutate('post', `series/${id}/restore`), onSuccess: invalidateAll });
  const purgeSeries = useMutation({ mutationFn: (id: string) => adminMutate('delete', `series/${id}/purge`), onSuccess: invalidateAll });

  const softDeleteBatch = useMutation({ mutationFn: (id: string) => adminMutate('delete', `batches/${id}`), onSuccess: invalidateAll });
  const restoreBatch = useMutation({ mutationFn: (id: string) => adminMutate('post', `batches/${id}/restore`), onSuccess: invalidateAll });
  const purgeBatch = useMutation({ mutationFn: (id: string) => adminMutate('delete', `batches/${id}/purge`), onSuccess: invalidateAll });

  const softDeleteAsset = useMutation({ mutationFn: (dinaId: string) => adminMutate('delete', `assets/${dinaId}`), onSuccess: invalidateAll });
  const restoreAsset = useMutation({ mutationFn: (dinaId: string) => adminMutate('post', `assets/${dinaId}/restore`), onSuccess: invalidateAll });
  const purgeAsset = useMutation({ mutationFn: (dinaId: string) => adminMutate('delete', `assets/${dinaId}/purge`), onSuccess: invalidateAll });

  // ── action helpers ──────────────────────────────────────

  const withConfirm = (title: string, message: string, action: () => void, danger = false) => {
    setConfirmModal({ title, message, danger, action });
  };

  // ── tabs ────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: 'series', label: '시리즈' },
    { key: 'batches', label: '배치' },
    { key: 'assets', label: '에셋' },
  ];

  const isLoading = (tab === 'series' && seriesQuery.isLoading) || (tab === 'batches' && batchesQuery.isLoading) || (tab === 'assets' && assetsQuery.isLoading);

  return (
    <div className="animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-txt-primary">시스템 관리</h2>
          <p className="text-xs text-txt-muted mt-0.5">super_admin 전용 — 데이터 조회 / 삭제 / 복구 / 초기화</p>
        </div>
        <button onClick={() => setResetModal(true)}
          className="px-4 py-2 text-sm font-medium bg-status-red/10 text-status-red border border-status-red/20 rounded-lg hover:bg-status-red/20 transition-all">
          전체 초기화
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-4 border-b border-geo-border">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
              tab === t.key ? 'text-status-purple' : 'text-txt-secondary hover:text-txt-primary'
            }`}>
            {t.label}
            {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-status-purple rounded-t" />}
          </button>
        ))}

        <div className="flex-1" />

        {/* include deleted toggle */}
        <label className="flex items-center gap-2 mr-2 cursor-pointer select-none">
          <input type="checkbox" checked={includeDeleted} onChange={e => setIncludeDeleted(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-geo-border accent-status-purple" />
          <span className="text-xs text-txt-secondary">삭제 포함</span>
        </label>

        {/* filter */}
        {tab === 'batches' && (
          <input value={seriesFilter} onChange={e => setSeriesFilter(e.target.value)} placeholder="series_id 필터"
            className="px-3 py-1.5 bg-geo-deep border border-geo-border rounded-lg text-xs text-txt-primary placeholder-txt-muted w-[240px] focus:outline-none focus:border-status-purple" />
        )}
        {tab === 'assets' && (
          <input value={batchFilter} onChange={e => setBatchFilter(e.target.value)} placeholder="batch_id 필터"
            className="px-3 py-1.5 bg-geo-deep border border-geo-border rounded-lg text-xs text-txt-primary placeholder-txt-muted w-[240px] focus:outline-none focus:border-status-purple" />
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-status-purple/30 border-t-status-purple rounded-full animate-spin" />
        </div>
      )}

      {/* ── Series table ─────────────────────────────────── */}
      {tab === 'series' && !seriesQuery.isLoading && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider w-[100px]">ID</th>
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider">이름</th>
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider w-[90px]">상태</th>
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider w-[160px]">생성일</th>
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider w-[200px]">액션</th>
              </tr>
            </thead>
            <tbody>
              {(seriesQuery.data?.data || []).map((s: Series) => (
                <tr key={s.series_id} className={`border-b border-geo-border/50 hover:bg-geo-card/50 transition-colors ${s.deleted_at ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2.5 text-xs font-mono text-status-purple">{s.display_id}</td>
                  <td className="px-3 py-2.5 text-sm text-txt-primary">{s.name}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={s.status} deleted={!!s.deleted_at} /></td>
                  <td className="px-3 py-2.5 text-xs font-mono text-txt-secondary">{new Date(s.created_at).toLocaleDateString('ko-KR')}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {s.deleted_at ? (
                        <button onClick={() => restoreSeries.mutate(s.series_id)}
                          className="px-2.5 py-1 text-[11px] font-medium text-status-green border border-status-green/30 rounded hover:bg-status-green/10 transition-all">복구</button>
                      ) : (
                        <button onClick={() => withConfirm('시리즈 삭제', `"${s.name}" 시리즈와 하위 배치/에셋을 모두 삭제합니다.`, () => softDeleteSeries.mutate(s.series_id), true)}
                          className="px-2.5 py-1 text-[11px] font-medium text-status-yellow border border-status-yellow/30 rounded hover:bg-status-yellow/10 transition-all">삭제</button>
                      )}
                      <button onClick={() => withConfirm('영구 삭제 (Purge)', `"${s.name}" 시리즈를 영구 삭제합니다.\nACTIVATED 에셋이 있으면 실패합니다.`, () => purgeSeries.mutate(s.series_id), true)}
                        className="px-2.5 py-1 text-[11px] font-medium text-status-red border border-status-red/30 rounded hover:bg-status-red/10 transition-all">Purge</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!(seriesQuery.data?.data || []).length && (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-txt-muted">데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Batches table ────────────────────────────────── */}
      {tab === 'batches' && !batchesQuery.isLoading && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider w-[100px]">ID</th>
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider">이름</th>
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider w-[90px]">상태</th>
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider w-[80px]">아이템</th>
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider w-[160px]">생성일</th>
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider w-[200px]">액션</th>
              </tr>
            </thead>
            <tbody>
              {(batchesQuery.data?.data || []).map((b: Batch) => (
                <tr key={b.batch_id} className={`border-b border-geo-border/50 hover:bg-geo-card/50 transition-colors ${b.deleted_at ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2.5 text-xs font-mono text-status-purple">{b.display_id}</td>
                  <td className="px-3 py-2.5 text-sm text-txt-primary">{b.name}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={b.status} deleted={!!b.deleted_at} /></td>
                  <td className="px-3 py-2.5 text-xs font-mono text-txt-secondary">{b.items_total}</td>
                  <td className="px-3 py-2.5 text-xs font-mono text-txt-secondary">{new Date(b.created_at).toLocaleDateString('ko-KR')}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {b.deleted_at ? (
                        <button onClick={() => restoreBatch.mutate(b.batch_id)}
                          className="px-2.5 py-1 text-[11px] font-medium text-status-green border border-status-green/30 rounded hover:bg-status-green/10 transition-all">복구</button>
                      ) : (
                        <button onClick={() => withConfirm('배치 삭제', `"${b.name}" 배치와 하위 에셋을 모두 삭제합니다.`, () => softDeleteBatch.mutate(b.batch_id), true)}
                          className="px-2.5 py-1 text-[11px] font-medium text-status-yellow border border-status-yellow/30 rounded hover:bg-status-yellow/10 transition-all">삭제</button>
                      )}
                      <button onClick={() => withConfirm('영구 삭제 (Purge)', `"${b.name}" 배치를 영구 삭제합니다.\nACTIVATED 에셋이 있으면 실패합니다.`, () => purgeBatch.mutate(b.batch_id), true)}
                        className="px-2.5 py-1 text-[11px] font-medium text-status-red border border-status-red/30 rounded hover:bg-status-red/10 transition-all">Purge</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!(batchesQuery.data?.data || []).length && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-txt-muted">데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Assets table ─────────────────────────────────── */}
      {tab === 'assets' && !assetsQuery.isLoading && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider w-[180px]">DINA ID</th>
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider w-[90px]">상태</th>
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider">Batch ID</th>
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider w-[160px]">생성일</th>
                <th className="px-3 py-2.5 text-[11px] text-txt-muted font-semibold uppercase tracking-wider w-[200px]">액션</th>
              </tr>
            </thead>
            <tbody>
              {(assetsQuery.data?.data || []).map((a: Asset) => (
                <tr key={a.asset_id} className={`border-b border-geo-border/50 hover:bg-geo-card/50 transition-colors ${a.deleted_at ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2.5 text-xs font-mono text-status-blue">{a.dina_id}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={a.status} deleted={!!a.deleted_at} /></td>
                  <td className="px-3 py-2.5 text-xs font-mono text-txt-secondary truncate max-w-[240px]">{a.batch_id}</td>
                  <td className="px-3 py-2.5 text-xs font-mono text-txt-secondary">{new Date(a.created_at).toLocaleDateString('ko-KR')}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {a.deleted_at ? (
                        <button onClick={() => restoreAsset.mutate(a.dina_id)}
                          className="px-2.5 py-1 text-[11px] font-medium text-status-green border border-status-green/30 rounded hover:bg-status-green/10 transition-all">복구</button>
                      ) : (
                        <button onClick={() => withConfirm('에셋 삭제', `${a.dina_id} 에셋을 삭제합니다.`, () => softDeleteAsset.mutate(a.dina_id), true)}
                          className="px-2.5 py-1 text-[11px] font-medium text-status-yellow border border-status-yellow/30 rounded hover:bg-status-yellow/10 transition-all">삭제</button>
                      )}
                      <button onClick={() => withConfirm('영구 삭제 (Purge)', `${a.dina_id} 에셋을 영구 삭제합니다.\nACTIVATED 상태이면 실패합니다.`, () => purgeAsset.mutate(a.dina_id), true)}
                        className="px-2.5 py-1 text-[11px] font-medium text-status-red border border-status-red/30 rounded hover:bg-status-red/10 transition-all">Purge</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!(assetsQuery.data?.data || []).length && (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-txt-muted">데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          danger={confirmModal.danger}
          onConfirm={() => { confirmModal.action(); setConfirmModal(null); }}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Reset modal */}
      {resetModal && <ResetModal onClose={() => { setResetModal(false); invalidateAll(); }} />}
    </div>
  );
}
