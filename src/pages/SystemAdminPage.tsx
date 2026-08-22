import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../stores/auth.store';

function opId() { return crypto.randomUUID(); }
function adminGet(path: string, params?: Record<string, string>) {
  return api.get(`/admin/${path}`, { params }).then(r => r.data);
}
function adminMutate(method: 'delete' | 'post', path: string, body?: any) {
  const config = { headers: { 'X-Operation-Id': opId() } };
  if (method === 'delete') return api.delete(`/admin/${path}`, config).then(r => r.data);
  return api.post(`/admin/${path}`, body, config).then(r => r.data);
}

interface Series { series_id: string; display_id: string; name: string; status: string; created_at: string; deleted_at: string | null }

function StatusBadge({ status, deleted }: { status: string; deleted: boolean }) {
  if (deleted) return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-status-red/10 text-status-red">삭제됨</span>;
  const map: Record<string, string> = {
    ACTIVE: 'bg-status-green/10 text-status-green', ACTIVATED: 'bg-status-green/10 text-status-green',
    DRAFT: 'bg-status-yellow/10 text-status-yellow', ARCHIVED: 'bg-status-red/10 text-status-red',
    PROCESSING: 'bg-status-blue/10 text-status-blue', COMPLETED: 'bg-status-green/10 text-status-green',
    PENDING: 'bg-status-yellow/10 text-status-yellow', FAILED: 'bg-status-red/10 text-status-red',
    INACTIVE: 'bg-status-red/10 text-status-red',
  };
  return <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${map[status] || 'bg-status-blue/10 text-status-blue'}`}>{status}</span>;
}

// GeoMicro QA verdict 배지 — 기존 StatusBadge와 동일한 디자인 토큰 재사용
function VerdictBadge({ verdict }: { verdict: 'PASS' | 'UNCERTAIN' | 'FAIL' }) {
  const map: Record<string, string> = {
    PASS: 'bg-status-green/10 text-status-green',
    UNCERTAIN: 'bg-status-yellow/10 text-status-yellow',
    FAIL: 'bg-status-red/10 text-status-red',
  };
  return <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${map[verdict]}`}>{verdict}</span>;
}

function ConfirmModal({ title, message, danger, onConfirm, onCancel }: {
  title: string; message: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
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

function ResetModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState('');
  const [typing, setTyping] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const handleFinalReset = async () => {
    setLoading(true); setError('');
    try {
      const res = await adminMutate('post', 'reset', { password, confirmation: 'DELETE ALL DATA' });
      setResult(res.data || res);
    } catch (e: any) { setError(e.response?.data?.message || '초기화 실패'); }
    finally { setLoading(false); }
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
              <div>작업: {result.truncated_batches}건 삭제</div>
              <div>자산: {result.truncated_assets}건 삭제</div>
            </div>
            <button onClick={onClose} className="w-full py-2 text-sm font-medium bg-geo-card border border-geo-border rounded-lg text-txt-primary hover:border-geo-border-hover transition-all">닫기</button>
          </div>
        ) : (
          <>
            {step === 0 && (
              <div>
                <p className="text-sm text-txt-secondary mb-4">시리즈, 작업, 자산 데이터가 모두 삭제됩니다.<br />감사 로그는 보존됩니다.</p>
                <label className="block text-xs text-txt-muted mb-1.5">관리자 비밀번호</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="ADMIN_RESET_PASSWORD"
                  className="w-full px-3 py-2 bg-geo-deep border border-geo-border rounded-lg text-sm text-txt-primary placeholder-txt-muted focus:outline-none focus:border-status-purple mb-4" />
                <div className="flex justify-end gap-3">
                  <button onClick={onClose} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg">취소</button>
                  <button onClick={() => password && setStep(1)} disabled={!password} className="px-4 py-2 text-sm font-medium bg-status-red text-white rounded-lg disabled:opacity-30">다음</button>
                </div>
              </div>
            )}
            {step === 1 && (
              <div>
                <p className="text-sm text-txt-secondary mb-4">아래에 <span className="text-status-red font-semibold">초기화합니다</span>를 정확히 입력해주세요.</p>
                <input type="text" value={typing} onChange={e => setTyping(e.target.value)} placeholder="초기화합니다"
                  className="w-full px-3 py-2 bg-geo-deep border border-geo-border rounded-lg text-sm text-txt-primary mb-4" />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setStep(0)} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg">이전</button>
                  <button onClick={() => typing === '초기화합니다' && setStep(2)} disabled={typing !== '초기화합니다'} className="px-4 py-2 text-sm font-medium bg-status-red text-white rounded-lg disabled:opacity-30">다음</button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div>
                <div className="bg-status-red/10 border border-status-red/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-status-red font-medium">이 작업은 되돌릴 수 없습니다.</p>
                  <p className="text-xs text-status-red/70 mt-1">모든 시리즈, 작업, 자산 데이터가 영구 삭제됩니다.</p>
                </div>
                {error && <p className="text-sm text-status-red mb-3">{error}</p>}
                <div className="flex justify-end gap-3">
                  <button onClick={() => setStep(1)} disabled={loading} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg">이전</button>
                  <button onClick={handleFinalReset} disabled={loading} className="px-4 py-2 text-sm font-medium bg-status-red text-white rounded-lg disabled:opacity-50">
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

// ============================================================
// GeoMicro QA 탭
// 백엔드: POST /geo-micro/qa/verify (super_admin ONLY, 서버 Guard가 실제 보안 담당)
// 최근 실행 기록: 기존 /audit/logs?action= 필터 재사용 (신규 엔드포인트 없음)
// ============================================================
function GeoMicroQaTab() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<{ verdict: string; evidence: any } | null>(null);
  const [error, setError] = useState('');

  const historyQuery = useQuery({
    queryKey: ['geomicro-qa-history'],
    queryFn: () =>
      api.get('/audit/logs?limit=20&action=GEO_MICRO_QA_VERIFY').then((res) => res.data.data),
  });

  const verifyMutation = useMutation({
    mutationFn: async (f: File) => {
      const formData = new FormData();
      formData.append('image', f);
      const res = await api.post('/geo-micro/qa/verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      setResult({ verdict: data.verdict, evidence: data.evidence });
      setError('');
      historyQuery.refetch();
    },
    onError: (e: any) => {
      setResult(null);
      setError(e.response?.data?.error?.message || e.response?.data?.message || 'QA 검증 실패');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResult(null);
    setError('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const handleVerify = () => {
    if (!file) return;
    verifyMutation.mutate(file);
  };

  return (
    <div>
      <div className="bg-geo-card border border-geo-border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <label className="px-4 py-2 text-sm font-medium bg-geo-deep border border-geo-border rounded-lg text-txt-primary hover:border-geo-border-hover transition-all cursor-pointer">
            이미지 선택
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
          {file && <span className="text-sm text-txt-secondary">{file.name}</span>}
          <div className="flex-1" />
          <button
            onClick={handleVerify}
            disabled={!file || verifyMutation.isPending}
            className="px-4 py-2 text-sm font-medium bg-status-purple text-white rounded-lg hover:bg-status-purple/80 transition-all disabled:opacity-30"
          >
            {verifyMutation.isPending ? '검증 중...' : 'QA 검증 실행'}
          </button>
        </div>

        {previewUrl && (
          <img src={previewUrl} alt="preview" className="max-h-48 rounded-lg border border-geo-border mb-4" />
        )}

        {error && (
          <div className="bg-status-red/10 border border-status-red/20 rounded-lg p-3 text-sm text-status-red mb-2">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-geo-deep rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm text-txt-secondary">결과:</span>
              <VerdictBadge verdict={result.verdict as any} />
            </div>
            {result.evidence ? (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-txt-muted mb-1">Cell Size</div>
                  <div className="text-txt-primary font-mono">{result.evidence.cellSize}px</div>
                </div>
                <div>
                  <div className="text-xs text-txt-muted mb-1">Correlation</div>
                  <div className="text-txt-primary font-mono">{result.evidence.correlation.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-xs text-txt-muted mb-1">Response</div>
                  <div className="text-txt-primary font-mono">{result.evidence.response.toFixed(2)}</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-txt-muted">Evidence 없음 (FAIL)</div>
            )}
          </div>
        )}
      </div>

      <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
        <div className="px-6 py-3 border-b border-geo-border">
          <span className="text-sm font-medium text-txt-primary">최근 실행 기록</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-geo-border">
              <th className="px-6 py-2.5 text-left text-[11px] text-txt-secondary font-semibold uppercase tracking-wider">시간</th>
              <th className="px-6 py-2.5 text-left text-[11px] text-txt-secondary font-semibold uppercase tracking-wider">사용자</th>
              <th className="px-6 py-2.5 text-left text-[11px] text-txt-secondary font-semibold uppercase tracking-wider">결과</th>
              <th className="px-6 py-2.5 text-left text-[11px] text-txt-secondary font-semibold uppercase tracking-wider">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {(historyQuery.data || []).map((log: any) => (
              <tr key={log.log_id} className="border-b border-geo-border/50 last:border-0">
                <td className="px-6 py-3 text-xs text-txt-muted font-mono">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-3 text-sm text-txt-secondary">
                  {log.actor_type}
                  {log.actor_id && <span className="text-txt-muted ml-1">({log.actor_id.slice(0, 8)})</span>}
                </td>
                <td className="px-6 py-3">
                  {log.payload?.verdict ? <VerdictBadge verdict={log.payload.verdict} /> : <span className="text-xs text-txt-muted">-</span>}
                </td>
                <td className="px-6 py-3 text-xs text-txt-muted font-mono">
                  {log.payload?.evidence
                    ? `${log.payload.evidence.cellSize}px / corr=${log.payload.evidence.correlation?.toFixed(3)} / resp=${log.payload.evidence.response?.toFixed(2)}`
                    : '-'}
                </td>
              </tr>
            ))}
            {!(historyQuery.data || []).length && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-txt-muted">실행 기록이 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SystemAdminPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [includeDeleted, setIncludeDeleted] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; danger?: boolean; action: () => void } | null>(null);
  const [resetModal, setResetModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'series' | 'geomicro'>('series');

  if (user?.role?.toLowerCase() !== 'super_admin') {
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

  const seriesQuery = useQuery({
    queryKey: ['admin-series', includeDeleted],
    queryFn: () => adminGet('series', { include_deleted: String(includeDeleted), limit: '200' }),
    enabled: activeTab === 'series',
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-series'] });
  };

  const softDeleteSeries = useMutation({ mutationFn: (id: string) => adminMutate('delete', `series/${id}`), onSuccess: invalidateAll });
  const restoreSeries = useMutation({ mutationFn: (id: string) => adminMutate('post', `series/${id}/restore`), onSuccess: invalidateAll });

  const withConfirm = (title: string, message: string, action: () => void, danger = false) => {
    setConfirmModal({ title, message, danger, action });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-txt-primary">시스템 관리</h2>
          <p className="text-xs text-txt-muted mt-0.5">super_admin 전용 — 데이터 조회 / 삭제 / 복구 / 초기화</p>
        </div>
        {activeTab === 'series' && (
          <button onClick={() => setResetModal(true)}
            className="px-4 py-2 text-sm font-medium bg-status-red/10 text-status-red border border-status-red/20 rounded-lg hover:bg-status-red/20 transition-all">
            전체 초기화
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-geo-border">
        <button
          onClick={() => setActiveTab('series')}
          className={`px-4 py-2.5 text-sm font-medium relative transition-colors ${activeTab === 'series' ? 'text-status-purple' : 'text-txt-secondary hover:text-txt-primary'}`}
        >
          시리즈
          {activeTab === 'series' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-status-purple rounded-t" />}
        </button>
        <button
          onClick={() => setActiveTab('geomicro')}
          className={`px-4 py-2.5 text-sm font-medium relative transition-colors ${activeTab === 'geomicro' ? 'text-status-purple' : 'text-txt-secondary hover:text-txt-primary'}`}
        >
          GeoMicro QA
          {activeTab === 'geomicro' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-status-purple rounded-t" />}
        </button>
        {activeTab === 'series' && (
          <>
            <div className="flex-1" />
            <label className="flex items-center gap-2 mr-2 cursor-pointer select-none">
              <input type="checkbox" checked={includeDeleted} onChange={e => setIncludeDeleted(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-geo-border accent-status-purple" />
              <span className="text-xs text-txt-secondary">삭제 포함</span>
            </label>
          </>
        )}
      </div>

      {activeTab === 'series' && (
        <>
          {seriesQuery.isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-status-purple/30 border-t-status-purple rounded-full animate-spin" />
            </div>
          )}

          {!seriesQuery.isLoading && (
            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead><tr className="border-b border-geo-border">
                  <th className="px-3 py-2.5 text-[11px] text-status-purple font-semibold uppercase tracking-wider text-center w-[200px]">ID</th>
                  <th className="px-3 py-2.5 text-[11px] text-status-purple font-semibold uppercase tracking-wider text-center">이름</th>
                  <th className="px-3 py-2.5 text-[11px] text-status-purple font-semibold uppercase tracking-wider text-center w-[90px]">상태</th>
                  <th className="px-3 py-2.5 text-[11px] text-status-purple font-semibold uppercase tracking-wider text-center w-[160px]">생성일</th>
                  <th className="px-3 py-2.5 text-[11px] text-status-purple font-semibold uppercase tracking-wider text-center w-[160px]">액션</th>
                </tr></thead>
                <tbody>
                  {(seriesQuery.data?.data || []).map((s: Series) => (
                    <tr key={s.series_id} className={`border-b border-geo-border/50 hover:bg-geo-card/50 transition-colors ${s.deleted_at ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2.5 text-xs font-mono text-status-purple whitespace-nowrap">{s.display_id}</td>
                      <td className="px-3 py-2.5 text-sm text-txt-primary">{s.name}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={s.status} deleted={!!s.deleted_at} /></td>
                      <td className="px-3 py-2.5 text-xs font-mono text-txt-secondary">{new Date(s.created_at).toLocaleDateString('ko-KR')}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {s.deleted_at ? (
                            <button onClick={() => restoreSeries.mutate(s.series_id)} className="px-2.5 py-1 text-[11px] font-medium text-status-green border border-status-green/30 rounded hover:bg-status-green/10 transition-all">복구</button>
                          ) : (
                            <button onClick={() => withConfirm('시리즈 삭제', `"${s.name}" 시리즈와 하위 작업/자산을 모두 삭제합니다.`, () => softDeleteSeries.mutate(s.series_id), true)} className="px-2.5 py-1 text-[11px] font-medium text-status-yellow border border-status-yellow/30 rounded hover:bg-status-yellow/10 transition-all">삭제</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!(seriesQuery.data?.data || []).length && <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-txt-muted">데이터 없음</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'geomicro' && <GeoMicroQaTab />}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          danger={confirmModal.danger}
          onConfirm={() => { confirmModal.action(); setConfirmModal(null); }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {resetModal && <ResetModal onClose={() => setResetModal(false)} />}
    </div>
  );
}
