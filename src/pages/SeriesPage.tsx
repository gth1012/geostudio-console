import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

const MATERIAL_OPTIONS = [
  { value: 'photocard_standard', label: '포토카드 - Standard (아트지)', carrier: 'PATTERN' },
  { value: 'photocard_premium',  label: '포토카드 - Premium (PVC/PETG)',  carrier: 'PATTERN' },
  { value: 'photocard_special',  label: '포토카드 - Special (홀로그램)',  carrier: 'PATTERN' },
  { value: 'photocard_eco',      label: '포토카드 - Eco (친환경/FSC)',    carrier: 'PATTERN' },
  { value: 'acrylic',            label: '아크릴 (UV인쇄)',                carrier: 'ENGRAVING' },
  { value: 'metal',              label: '금속',                          carrier: 'ENGRAVING' },
  { value: 'fabric',             label: '직물',                          carrier: 'PATTERN' },
  { value: 'ceramic_engraving',  label: '세라믹 (각인)',                  carrier: 'ENGRAVING' },
  { value: 'ceramic_sublimation',label: '세라믹 (서브리메이션)',           carrier: 'PATTERN' },
  { value: 'film',               label: '필름 (PET/PVC)',                carrier: 'PATTERN' },
  { value: 'digital_monitor',    label: '디지털 (모니터/스크린)',          carrier: 'PATTERN' },
];

const materialCarrier = (v: string) => MATERIAL_OPTIONS.find(o => o.value === v)?.carrier || 'PATTERN';

function CarrierGuideText({ material }: { material: string }) {
  const carrier = materialCarrier(material);
  const isPattern = carrier === 'PATTERN';
  const isDigital = material === 'digital_monitor';
  return (
    <p className={`mt-2 text-xs font-medium ${isPattern ? 'text-status-green' : 'text-status-blue'}`}>
      {isDigital
        ? '🖥️ 디지털 테스트용 — 모니터 화면 촬영 인식'
        : isPattern
          ? '✅ 패턴 기반 인증이 적용됩니다'
          : '✅ 각인 기반 인증이 적용됩니다'}
    </p>
  );
}

interface Dealer {
  dealer_id: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
}

interface SeriesFormData {
  name: string;
  code?: string;
  description: string;
  artistName: string;
  material: string;
  dealer_id?: string;
}

type CreateStep = 'dealer' | 'artist' | 'series';

interface CreateSeriesModalProps {
  onClose: () => void;
  onSubmit: (form: SeriesFormData) => void;
  isPending: boolean;
  modalPos: { x: number; y: number };
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
}

function CreateSeriesModal({ onClose, onSubmit, isPending, modalPos, onMouseDown, onMouseMove, onMouseUp }: CreateSeriesModalProps) {
  const [step, setStep] = useState<CreateStep>('dealer');
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [showNewDealer, setShowNewDealer] = useState(false);
  const [newDealer, setNewDealer] = useState({ name: '', contact_email: '', contact_phone: '' });
  const [form, setForm] = useState<SeriesFormData>({ name: '', description: '', artistName: '', material: 'photocard_standard' });
  const [artistInput, setArtistInput] = useState('');
  const queryClient = useQueryClient();
  const toast = useToastStore();

  const { data: dealers } = useQuery<Dealer[]>({
    queryKey: ['dealers'],
    queryFn: () => api.get('/dealers').then(r => r.data.data),
  });

  const { data: artists } = useQuery<string[]>({
    queryKey: ['dealer-artists', selectedDealer?.dealer_id],
    queryFn: () => api.get(`/dealers/${selectedDealer!.dealer_id}/artists`).then(r => r.data.data),
    enabled: !!selectedDealer,
  });

  const createDealerMutation = useMutation({
    mutationFn: (data: any) => api.post('/dealers', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
      setSelectedDealer(res.data.data);
      setShowNewDealer(false);
      setNewDealer({ name: '', contact_email: '', contact_phone: '' });
      setStep('artist');
      toast.show('기획사가 등록되었습니다', 'success');
    },
    onError: (err: any) => toast.show(err.response?.data?.message || '기획사 등록 실패', 'error'),
  });

  const handleDealerSelect = (dealer: Dealer) => { setSelectedDealer(dealer); setStep('artist'); };
  const handleSkipDealer = () => { setSelectedDealer(null); setStep('artist'); };
  const handleArtistNext = () => { setForm(f => ({ ...f, artistName: artistInput.trim() })); setStep('series'); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (isPending) return; onSubmit({ ...form, dealer_id: selectedDealer?.dealer_id }); };

  const stepLabel = { dealer: '1/3 기획사 선택', artist: '2/3 아티스트', series: '3/3 시리즈 정보' };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
      <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm cursor-move select-none" style={{ transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }} onMouseDown={onMouseDown}>
        <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-txt-primary">새 시리즈 생성</h2>
            <p className="text-xs text-txt-muted mt-0.5">{stepLabel[step]}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-geo-card-hover transition-all">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6" style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
          {step === 'dealer' && (
            <div className="space-y-3">
              {!showNewDealer ? (
                <>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {dealers?.length === 0 && <p className="text-xs text-txt-muted text-center py-3">등록된 기획사가 없습니다</p>}
                    {dealers?.map(d => (
                      <button key={d.dealer_id} onClick={() => handleDealerSelect(d)} className="w-full text-left p-3 rounded-lg border border-geo-border hover:border-status-purple hover:bg-status-purple/5 transition-all">
                        <p className="text-sm font-medium text-txt-primary">{d.name}</p>
                        {d.contact_email && <p className="text-xs text-txt-muted mt-0.5">{d.contact_email}</p>}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowNewDealer(true)} className="w-full py-2.5 border border-dashed border-status-yellow rounded-lg text-xs text-status-yellow hover:bg-[#1a1a2e] transition-all">+ 새 기획사 등록</button>
                  <button onClick={handleSkipDealer} className="w-full text-xs text-status-yellow hover:text-yellow-300 transition-all py-1">기획사 없이 진행 →</button>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-txt-secondary">새 기획사 등록</p>
                  <input value={newDealer.name} onChange={e => setNewDealer(d => ({ ...d, name: e.target.value }))} placeholder="회사명 *" className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none text-sm" />
                  <input value={newDealer.contact_email} onChange={e => setNewDealer(d => ({ ...d, contact_email: e.target.value }))} placeholder="이메일" type="email" className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none text-sm" />
                  <input value={newDealer.contact_phone} onChange={e => setNewDealer(d => ({ ...d, contact_phone: e.target.value }))} placeholder="전화번호" className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none text-sm" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowNewDealer(false)} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary text-sm hover:text-txt-primary transition-all">취소</button>
                    <button onClick={() => createDealerMutation.mutate(newDealer)} disabled={!newDealer.name || createDealerMutation.isPending} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg text-sm font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all">{createDealerMutation.isPending ? '등록 중...' : '등록'}</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {step === 'artist' && (
            <div className="space-y-3">
              {selectedDealer && <div className="px-3 py-2 rounded-lg bg-status-purple/5 border border-status-purple/20 text-xs text-status-purple">기획사: {selectedDealer.name}</div>}
              <div>
                <label className="block text-xs text-txt-secondary mb-1.5">아티스트명</label>
                <input value={artistInput} onChange={e => setArtistInput(e.target.value)} placeholder="아티스트명 입력" autoFocus className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" />
              </div>
              {artists && artists.length > 0 && (
                <div>
                  <p className="text-xs text-txt-muted mb-1.5">기존 아티스트</p>
                  <div className="flex flex-wrap gap-1.5">
                    {artists.map(a => (
                      <button key={a} onClick={() => setArtistInput(a)} className={`px-2.5 py-1 rounded text-xs border transition-all ${artistInput === a ? 'bg-status-purple text-white border-status-purple' : 'border-geo-border text-txt-secondary hover:border-status-purple hover:text-status-purple'}`}>{a}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep('dealer')} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary text-sm hover:text-txt-primary transition-all">이전</button>
                <button onClick={handleArtistNext} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg text-sm font-medium hover:bg-status-purple/80 transition-all">다음</button>
              </div>
            </div>
          )}
          {step === 'series' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {selectedDealer && <div className="px-3 py-2 rounded-lg bg-status-purple/5 border border-status-purple/20 text-xs text-status-purple">{selectedDealer.name} {form.artistName && `· ${form.artistName}`}</div>}
              <div>
                <label className="block text-xs text-txt-secondary mb-1.5">시리즈 이름 *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="시리즈 이름 입력" autoFocus required className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-txt-secondary mb-1.5">아티스트</label>
                <input value={form.artistName} onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))} placeholder="아티스트명 (선택)" className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-txt-secondary mb-1.5">재질 *</label>
                <select value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} required className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none">
                  <optgroup label="── 포토카드 ──">
                    <option value="photocard_standard">포토카드 - Standard (아트지)</option>
                    <option value="photocard_premium">포토카드 - Premium (PVC/PETG)</option>
                    <option value="photocard_special">포토카드 - Special (홀로그램)</option>
                    <option value="photocard_eco">포토카드 - Eco (친환경/FSC)</option>
                  </optgroup>
                  <optgroup label="── 굿즈 ──">
                    <option value="acrylic">아크릴 (UV인쇄)</option>
                    <option value="metal">금속</option>
                    <option value="fabric">직물</option>
                    <option value="ceramic_engraving">세라믹 (각인)</option>
                    <option value="ceramic_sublimation">세라믹 (서브리메이션)</option>
                    <option value="film">필름 (PET/PVC)</option>
                  </optgroup>
                  <optgroup label="── 테스트 ──">
                    <option value="digital_monitor">디지털 (모니터/스크린)</option>
                  </optgroup>
                </select>
                <CarrierGuideText material={form.material} />
              </div>
              <div>
                <label className="block text-xs text-txt-secondary mb-1.5">설명</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="설명 (선택)" rows={2} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none resize-none" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep('artist')} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all">이전</button>
                <button type="submit" disabled={isPending} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all">{isPending ? '생성 중...' : '생성'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

interface EditSeriesModalProps {
  form: SeriesFormData;
  setForm: (form: SeriesFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isPending: boolean;
  modalPos: { x: number; y: number };
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
}

function EditSeriesModal({ form, setForm, onSubmit, onClose, isPending, modalPos, onMouseDown, onMouseMove, onMouseUp }: EditSeriesModalProps) {
  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4 overflow-y-auto" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
      <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm cursor-move select-none" style={{ transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }} onMouseDown={onMouseDown}>
        <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex items-center justify-between">
          <h2 className="text-lg font-semibold text-txt-primary">시리즈 수정</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-geo-card-hover transition-all">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-txt-secondary mb-1.5">시리즈 이름 *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="시리즈 이름 입력" className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" autoFocus required />
            </div>
            <div>
              <label className="block text-xs text-txt-secondary mb-1.5">시리즈 코드</label>
              <input value={form.code || ''} disabled className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-muted cursor-not-allowed outline-none" />
            </div>
            <div>
              <label className="block text-xs text-txt-secondary mb-1.5">아티스트</label>
              <input value={form.artistName} onChange={(e) => setForm({ ...form, artistName: e.target.value })} placeholder="아티스트명 (선택)" className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-txt-secondary mb-1.5">재질 *</label>
              <select value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none" required>
                <optgroup label="── 포토카드 ──">
                  <option value="photocard_standard">포토카드 - Standard (아트지)</option>
                  <option value="photocard_premium">포토카드 - Premium (PVC/PETG)</option>
                  <option value="photocard_special">포토카드 - Special (홀로그램)</option>
                  <option value="photocard_eco">포토카드 - Eco (친환경/FSC)</option>
                </optgroup>
                <optgroup label="── 굿즈 ──">
                  <option value="acrylic">아크릴 (UV인쇄)</option>
                  <option value="metal">금속</option>
                  <option value="fabric">직물</option>
                  <option value="ceramic_engraving">세라믹 (각인)</option>
                  <option value="ceramic_sublimation">세라믹 (서브리메이션)</option>
                  <option value="film">필름 (PET/PVC)</option>
                </optgroup>
                <optgroup label="── 테스트 ──">
                  <option value="digital_monitor">디지털 (모니터/스크린)</option>
                </optgroup>
              </select>
              <CarrierGuideText material={form.material} />
            </div>
            <div>
              <label className="block text-xs text-txt-secondary mb-1.5">설명</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="설명 (선택)" className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none resize-none" rows={2} />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button type="button" onClick={onClose} disabled={isPending} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary hover:border-geo-border-hover transition-all">취소</button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all">{isPending ? '저장 중...' : '저장'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function SeriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [editTarget, setEditTarget] = useState<{ series_id: string } | null>(null);
  const [editForm, setEditForm] = useState<SeriesFormData>({ name: '', code: '', description: '', artistName: '', material: 'photocard_standard' });
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; message: string; subMessage?: string; onConfirm: () => void; confirmBtnClass?: string }>({ show: false, message: '', onConfirm: () => {} });
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [editModalPos, setEditModalPos] = useState({ x: 0, y: 0 });
  const [isEditDragging, setIsEditDragging] = useState(false);
  const editDragOffset = useRef({ x: 0, y: 0 });
  const queryClient = useQueryClient();
  const toast = useToastStore();

  const { data: series, isLoading } = useQuery({ queryKey: ['series'], queryFn: () => api.get('/series').then((res) => res.data.data), enabled: !showTrash });
  const { data: trashedSeries, isLoading: isTrashLoading } = useQuery({ queryKey: ['series-trash'], queryFn: () => api.get('/series/trash').then((res) => res.data.data), enabled: showTrash });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/series', { ...data, artist_name: data.artistName, insertionMethod: materialCarrier(data.material) }),
    onSuccess: () => { toast.show('시리즈가 생성되었습니다', 'success'); queryClient.invalidateQueries({ queryKey: ['series'] }); queryClient.invalidateQueries({ queryKey: ['dealers'] }); queryClient.invalidateQueries({ queryKey: ['dealer-artists'] }); setShowModal(false); },
    onError: (err: any) => { toast.show(err.response?.data?.message || '시리즈 생성 실패', 'error'); },
  });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/series/${id}`, { ...data, insertion_method: materialCarrier(data.material) }), onSuccess: () => { toast.show('시리즈가 수정되었습니다', 'success'); queryClient.invalidateQueries({ queryKey: ['series'] }); setEditTarget(null); }, onError: (err: any) => { toast.show(err.response?.data?.message || '시리즈 수정 실패', 'error'); } });
  const archiveMutation = useMutation({ mutationFn: (seriesId: string) => api.put(`/series/${seriesId}/archive`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); toast.show('시리즈가 비활성화되었습니다', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '비활성화 실패', 'error'); } });
  const activateMutation = useMutation({ mutationFn: (seriesId: string) => api.put(`/series/${seriesId}/activate`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); toast.show('시리즈가 활성화되었습니다', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '활성화 실패', 'error'); } });
  const deleteMutation = useMutation({ mutationFn: (seriesId: string) => api.delete(`/series/${seriesId}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); queryClient.invalidateQueries({ queryKey: ['series-trash'] }); toast.show('시리즈가 휴지통으로 이동되었습니다', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '삭제 실패', 'error'); } });
  const restoreMutation = useMutation({ mutationFn: (seriesId: string) => api.put(`/series/${seriesId}/restore`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); queryClient.invalidateQueries({ queryKey: ['series-trash'] }); toast.show('시리즈가 복원되었습니다', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '복원 실패', 'error'); } });
  const permanentDeleteMutation = useMutation({ mutationFn: (seriesId: string) => api.delete(`/series/${seriesId}/permanent`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series-trash'] }); toast.show('시리즈가 영구 삭제되었습니다', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '영구 삭제 실패', 'error'); } });

  const handleUpdate = (e: React.FormEvent) => { e.preventDefault(); if (!editTarget || updateMutation.isPending) return; updateMutation.mutate({ id: editTarget.series_id, data: editForm }); };

  // confirmModal stale state 방지: prev 패턴 사용
  const handleDeactivate = (id: string, name: string) => {
    setConfirmModal({ show: true, message: `"${name}" 시리즈를 비활성화 하시겠습니까?`, confirmBtnClass: 'bg-status-yellow-dim text-status-yellow hover:bg-status-yellow/20',
      onConfirm: () => { archiveMutation.mutate(id); setConfirmModal(prev => ({ ...prev, show: false })); } });
  };
  const handleActivate = (id: string, name: string) => {
    setConfirmModal({ show: true, message: `"${name}" 시리즈를 활성화 하시겠습니까?`,
      onConfirm: () => { activateMutation.mutate(id); setConfirmModal(prev => ({ ...prev, show: false })); } });
  };
  const handleDelete = (id: string, name: string) => {
    setConfirmModal({ show: true, message: `"${name}" 시리즈를 휴지통으로 이동하시겠습니까?`,
      onConfirm: () => { deleteMutation.mutate(id); setConfirmModal(prev => ({ ...prev, show: false })); } });
  };
  const handleRestore = (id: string, name: string) => {
    setConfirmModal({ show: true, message: `"${name}" 시리즈를 복구하시겠습니까?`,
      onConfirm: () => { restoreMutation.mutate(id); setConfirmModal(prev => ({ ...prev, show: false })); } });
  };
  const handlePermanentDelete = (id: string, name: string) => {
    setConfirmModal({ show: true, message: `"${name}" 시리즈를 영구 삭제하시겠습니까?`, subMessage: '이 작업은 되돌릴 수 없습니다!',
      onConfirm: () => { permanentDeleteMutation.mutate(id); setConfirmModal(prev => ({ ...prev, show: false })); } });
  };

  const handleMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsDragging(true); dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y }; };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };
  const handleEditMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsEditDragging(true); editDragOffset.current = { x: e.clientX - editModalPos.x, y: e.clientY - editModalPos.y }; };
  const handleEditMouseMove = (e: React.MouseEvent) => { if (!isEditDragging) return; setEditModalPos({ x: e.clientX - editDragOffset.current.x, y: e.clientY - editDragOffset.current.y }); };
  const handleEditMouseUp = () => { if (isEditDragging) setIsEditDragging(false); };

  // paper_art 레거시 fallback → photocard_standard 로 통일
  const openEditModal = (s: any) => {
    setEditModalPos({ x: 0, y: 0 });
    setEditTarget({ series_id: s.series_id });
    const validMaterials = MATERIAL_OPTIONS.map(o => o.value);
    const material = validMaterials.includes(s.material) ? s.material : 'photocard_standard';
    setEditForm({ name: s.name || '', code: s.code || '', description: s.description || '', artistName: s.artist_name || '', material });
  };

  // updateMutation.isPending 추가
  const isActionPending = archiveMutation.isPending || activateMutation.isPending || deleteMutation.isPending || restoreMutation.isPending || permanentDeleteMutation.isPending || updateMutation.isPending;
  const displayData = showTrash ? trashedSeries : series;
  const isDataLoading = showTrash ? isTrashLoading : isLoading;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {!showTrash && <button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowModal(true); }} className="px-4 py-2 bg-status-yellow-dim text-status-yellow rounded-lg hover:bg-status-yellow/20 text-sm font-medium transition-all">+ 시리즈 생성</button>}
        </div>
        <button onClick={() => setShowTrash(!showTrash)} className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${showTrash ? 'bg-status-purple text-white border-status-purple' : 'bg-transparent text-txt-secondary border-geo-border hover:border-geo-border-hover hover:text-txt-primary'}`}>{showTrash ? '← 목록으로' : '🗑 휴지통'}</button>
      </div>
      {isDataLoading ? (
        <p className="text-txt-secondary">로딩 중...</p>
      ) : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-visible">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="w-[12%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">ID</th>
                <th className="w-[13%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">기획사</th>
                <th className="w-[17%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">시리즈</th>
                <th className="w-[20%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">아티스트</th>
                <th className="w-[14%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">{showTrash ? '' : '생성일'}</th>
                <th className="w-[10%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">{showTrash ? '삭제일' : '상태'}</th>
                <th className="w-[18%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody>
              {displayData?.length === 0 ? <tr><td colSpan={7}></td></tr> : (
                displayData?.map((s: any) => (
                  <tr key={s.series_id} className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors">
                    <td className="px-4 py-3 text-center font-mono text-sm text-status-green">{s.display_id || '-'}</td>
                    <td className="px-4 py-3 text-center text-txt-primary truncate">{s.dealer_name || '-'}</td>
                    <td className="px-4 py-3 text-center text-txt-primary truncate">{s.name || '-'}</td>
                    <td className="px-4 py-3 text-center text-txt-primary truncate">{s.artist_name || '-'}</td>
                    <td className="px-4 py-3 text-center text-txt-muted text-xs">{!showTrash && new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      {showTrash ? <span className="text-txt-muted text-xs">{new Date(s.deleted_at).toLocaleDateString()}</span> : (
                        <span className={`inline-block w-14 px-1 py-1 rounded text-xs font-medium text-center ${s.status === 'ACTIVE' ? 'bg-status-green-dim text-status-green' : 'bg-status-yellow-dim text-status-yellow'}`}>{s.status === 'ACTIVE' ? '운영중' : '비활성'}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        {showTrash ? (
                          <>
                            <button onClick={() => handleRestore(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-blue-dim text-status-blue rounded hover:bg-status-blue/20 disabled:opacity-50 transition-all">복구</button>
                            <button onClick={() => handlePermanentDelete(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-red-dim text-status-red rounded hover:bg-status-red/20 disabled:opacity-50 transition-all">비우기</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => openEditModal(s)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-yellow-dim text-status-yellow rounded hover:bg-status-yellow/20 disabled:opacity-50 transition-all">수정</button>
                            {s.status === 'ACTIVE' ? (
                              <button onClick={() => handleDeactivate(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-yellow-dim text-status-yellow rounded hover:bg-status-yellow/20 disabled:opacity-50 transition-all">비활성</button>
                            ) : (
                              <>
                                <button onClick={() => handleActivate(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-green-dim text-status-green rounded hover:bg-status-green/20 disabled:opacity-50 transition-all">활성</button>
                                <button onClick={() => handleDelete(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-red-dim text-status-red rounded hover:bg-status-red/20 disabled:opacity-50 transition-all">삭제</button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {!showTrash && (!displayData || displayData.length === 0) && (
        <div className="mt-4 px-6 py-5 bg-status-purple-dim border border-status-purple/30 rounded-lg text-center">
          <p className="text-base font-semibold text-txt-primary mb-1">시리즈가 없습니다.</p>
          <p className="text-sm text-txt-secondary"><button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowModal(true); }} className="text-status-yellow font-semibold hover:underline">[시리즈 생성]</button>{` `}버튼을 눌러 시리즈를 먼저 만들어주세요.</p>
        </div>
      )}
      {!showTrash && displayData && displayData.length > 0 && (
        <div className="mt-4 px-6 py-5 bg-status-purple-dim border border-status-purple/30 rounded-lg text-center">
          <p className="text-base font-semibold text-status-green mb-1">시리즈 생성 완료!</p>
          <p className="text-sm text-txt-secondary">다음 작업은{' '}<button onClick={() => window.location.hash = '/batches'} className="text-status-yellow font-semibold hover:underline">[작업 관리]</button>에서 진행하세요.</p>
        </div>
      )}
      {showModal && <CreateSeriesModal onClose={() => setShowModal(false)} onSubmit={(form) => createMutation.mutate(form)} isPending={createMutation.isPending} modalPos={modalPos} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} />}
      {editTarget && <EditSeriesModal form={editForm} setForm={setEditForm} onSubmit={handleUpdate} onClose={() => setEditTarget(null)} isPending={updateMutation.isPending} modalPos={editModalPos} onMouseDown={handleEditMouseDown} onMouseMove={handleEditMouseMove} onMouseUp={handleEditMouseUp} />}
      {confirmModal.show && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-geo-border rounded-xl w-full max-w-sm p-6">
            <p className="text-txt-primary text-center mb-2">{confirmModal.message}</p>
            {confirmModal.subMessage && <p className="text-status-red text-sm text-center mb-4">{confirmModal.subMessage}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary hover:border-geo-border-hover transition-all">취소</button>
              <button onClick={confirmModal.onConfirm} className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${confirmModal.confirmBtnClass || 'bg-purple-500 text-white hover:bg-purple-500/80'}`}>확인</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
