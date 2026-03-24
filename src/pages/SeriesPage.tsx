import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

const MATERIAL_OPTIONS = [
  { value: 'photocard_standard',   label: 'Photocard - Standard (Art Paper)',  carrier: 'PATTERN' },
  { value: 'photocard_premium',    label: 'Photocard - Premium (PVC/PETG)',    carrier: 'PATTERN' },
  { value: 'photocard_special',    label: 'Photocard - Special (Hologram)',    carrier: 'PATTERN' },
  { value: 'photocard_eco',        label: 'Photocard - Eco (FSC)',             carrier: 'PATTERN' },
  { value: 'acrylic',              label: 'Acrylic (UV Print)',                carrier: 'ENGRAVING' },
  { value: 'metal',                label: 'Metal',                             carrier: 'ENGRAVING' },
  { value: 'fabric',               label: 'Fabric',                            carrier: 'PATTERN' },
  { value: 'ceramic_engraving',    label: 'Ceramic (Engraving)',               carrier: 'ENGRAVING' },
  { value: 'ceramic_sublimation',  label: 'Ceramic (Sublimation)',             carrier: 'PATTERN' },
  { value: 'film',                 label: 'Film (PET/PVC)',                    carrier: 'PATTERN' },
  { value: 'document_inkjet',      label: 'Document - Inkjet',                 carrier: 'PATTERN' },
  { value: 'document_laser',       label: 'Document - Laser',                  carrier: 'PATTERN' },
] as const;

const materialCarrier = (v: string) => MATERIAL_OPTIONS.find(o => o.value === v)?.carrier || 'PATTERN';

function CarrierGuideText({ material }: { material: string }) {
  const carrier = materialCarrier(material);
  const isPattern = carrier === 'PATTERN';
  return (
    <p className={`mt-2 text-xs font-medium ${isPattern ? 'text-status-green' : 'text-status-blue'}`}>
      {isPattern ? 'GeoCode pattern will be embedded.' : 'Engraving method will be applied.'}
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
  const [newDealerCode, setNewDealerCode] = useState<{ code: string; name: string } | null>(null);
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
      const dealer = res.data.data;
      setSelectedDealer(dealer);
      setShowNewDealer(false);
      setNewDealer({ name: '', contact_email: '', contact_phone: '' });
      if (dealer.access_code) {
        setNewDealerCode({ code: dealer.access_code, name: dealer.name });
      } else {
        setStep('artist');
      }
      toast.show('거래처가 등록되었습니다.', 'success');
    },
    onError: (err: any) => toast.show(err.response?.data?.message || '거래처 등록에 실패했습니다.', 'error'),
  });

  const handleDealerSelect = (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setStep('artist');
  };

  const handleSkipDealer = () => {
    setSelectedDealer(null);
    setStep('artist');
  };

  const handleArtistNext = () => {
    const name = artistInput.trim();
    setForm(f => ({ ...f, artistName: name }));
    setStep('series');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    onSubmit({ ...form, dealer_id: selectedDealer?.dealer_id });
  };

  const stepLabel = { dealer: '1/3 Select Client', artist: '2/3 Artist', series: '3/3 Series Info' };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
    >
      <div
        className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm cursor-move select-none"
        style={{ transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }}
        onMouseDown={onMouseDown}
      >
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

          {/* Step 1: Dealer */}
          {step === 'dealer' && (
            <div className="space-y-3">
              {/* Access Code 표시 (신규 거래처 등록 직후 1회) */}
              {newDealerCode && (
                <div className="space-y-3">
                  <div className="px-4 py-3 rounded-lg bg-status-green/10 border border-status-green/30">
                    <p className="text-xs font-semibold text-status-green mb-1">거래처 등록 완료</p>
                    <p className="text-xs text-txt-secondary mb-2">{newDealerCode.name}의 전송코드입니다. 지금만 확인 가능합니다.</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-geo-main rounded text-sm font-mono text-status-yellow border border-geo-border break-all">
                        {newDealerCode.code}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(newDealerCode.code).then(() => toast.show('복사됨', 'success'))}
                        className="px-3 py-2 text-xs bg-status-purple text-white rounded hover:bg-status-purple/80 transition-all whitespace-nowrap"
                      >
                        복사
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => { setNewDealerCode(null); setStep('artist'); }}
                    className="w-full py-2.5 bg-status-purple text-white rounded-lg text-sm font-medium hover:bg-status-purple/80 transition-all"
                  >
                    확인 후 다음 단계
                  </button>
                </div>
              )}

              {!newDealerCode && !showNewDealer && (
                <>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {dealers?.length === 0 && (
                      <p className="text-xs text-txt-muted text-center py-3">No clients registered.</p>
                    )}
                    {dealers?.map(d => (
                      <button
                        key={d.dealer_id}
                        onClick={() => handleDealerSelect(d)}
                        className="w-full text-left p-3 rounded-lg border border-geo-border hover:border-status-purple hover:bg-status-purple/5 transition-all"
                      >
                        <p className="text-sm font-medium text-txt-primary">{d.name}</p>
                        {d.contact_email && <p className="text-xs text-txt-muted mt-0.5">{d.contact_email}</p>}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowNewDealer(true)}
                    className="w-full py-2.5 border border-dashed border-status-yellow rounded-lg text-xs text-status-yellow hover:bg-[#1a1a2e] transition-all"
                  >
                    + 새 거래처 등록
                  </button>
                  <button onClick={handleSkipDealer} className="w-full text-xs text-status-yellow hover:text-yellow-300 transition-all py-1">
                    거래처 없이 계속
                  </button>
                </>
              )}

              {!newDealerCode && showNewDealer && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-txt-secondary">새 거래처 등록</p>
                  <input
                    value={newDealer.name}
                    onChange={e => setNewDealer(d => ({ ...d, name: e.target.value }))}
                    placeholder="거래처명 *"
                    className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none text-sm"
                  />
                  <input
                    value={newDealer.contact_email}
                    onChange={e => setNewDealer(d => ({ ...d, contact_email: e.target.value }))}
                    placeholder="이메일"
                    type="email"
                    className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none text-sm"
                  />
                  <input
                    value={newDealer.contact_phone}
                    onChange={e => setNewDealer(d => ({ ...d, contact_phone: e.target.value }))}
                    placeholder="연락처"
                    className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowNewDealer(false)} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary text-sm hover:text-txt-primary transition-all">취소</button>
                    <button
                      onClick={() => createDealerMutation.mutate(newDealer)}
                      disabled={!newDealer.name || createDealerMutation.isPending}
                      className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg text-sm font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all"
                    >
                      {createDealerMutation.isPending ? '저장 중..' : '저장'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Artist */}
          {step === 'artist' && (
            <div className="space-y-3">
              {selectedDealer && (
                <div className="px-3 py-2 rounded-lg bg-status-purple/5 border border-status-purple/20 text-xs text-status-purple">
                  거래처: {selectedDealer.name}
                </div>
              )}
              <div>
                <label className="block text-xs text-txt-secondary mb-1.5">아티스트</label>
                <input
                  value={artistInput}
                  onChange={e => setArtistInput(e.target.value)}
                  placeholder="아티스트명 입력"
                  autoFocus
                  className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none"
                />
              </div>
              {artists && artists.length > 0 && (
                <div>
                  <p className="text-xs text-txt-muted mb-1.5">기존 아티스트</p>
                  <div className="flex flex-wrap gap-1.5">
                    {artists.map(a => (
                      <button
                        key={a}
                        onClick={() => setArtistInput(a)}
                        className={`px-2.5 py-1 rounded text-xs border transition-all ${artistInput === a ? 'bg-status-purple text-white border-status-purple' : 'border-geo-border text-txt-secondary hover:border-status-purple hover:text-status-purple'}`}
                      >
                        {a}
                      </button>
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

          {/* Step 3: Series Info */}
          {step === 'series' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {selectedDealer && (
                <div className="px-3 py-2 rounded-lg bg-status-purple/5 border border-status-purple/20 text-xs text-status-purple">
                  {selectedDealer.name} {form.artistName && `· ${form.artistName}`}
                </div>
              )}
              <div>
                <label className="block text-xs text-txt-secondary mb-1.5">시리즈 이름 *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="시리즈 이름 입력"
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-txt-secondary mb-1.5">아티스트</label>
                <input
                  value={form.artistName}
                  onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))}
                  placeholder="아티스트명(수정가능)"
                  className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-txt-secondary mb-1.5">재질 *</label>
                <select
                  value={form.material}
                  onChange={e => setForm(f => ({ ...f, material: e.target.value }))}
                  required
                  className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none"
                >
                  <optgroup label="— 포토카드 —">
                    <option value="photocard_standard">포토카드 - Standard (아트지)</option>
                    <option value="photocard_premium">포토카드 - Premium (PVC/PETG)</option>
                    <option value="photocard_special">포토카드 - Special (홀로그램)</option>
                    <option value="photocard_eco">포토카드 - Eco (친환경/FSC)</option>
                  </optgroup>
                  <optgroup label="— 굿즈 —">
                    <option value="acrylic">아크릴 (UV인쇄)</option>
                    <option value="metal">금속</option>
                    <option value="fabric">직물</option>
                    <option value="ceramic_engraving">세라믹 (각인)</option>
                    <option value="ceramic_sublimation">세라믹 (서브리메이션)</option>
                    <option value="film">필름 (PET/PVC)</option>
                  </optgroup>
                  <optgroup label="— 문서 —">
                    <option value="document_inkjet">문서 - 잉크젯</option>
                    <option value="document_laser">문서 - 레이저</option>
                  </optgroup>
                </select>
                <CarrierGuideText material={form.material} />
              </div>
              <div>
                <label className="block text-xs text-txt-secondary mb-1.5">설명</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="설명 (선택)"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep('artist')} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all">이전</button>
                <button type="submit" disabled={isPending} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all">
                  {isPending ? '생성 중..' : '생성'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}

function EditSeriesModal({ form, setForm, onSubmit, onClose, isPending, modalPos, onMouseDown, onMouseMove, onMouseUp }: any) {
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
              <input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="시리즈 이름 입력"
                className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" autoFocus required />
            </div>
            <div>
              <label className="block text-xs text-txt-secondary mb-1.5">시리즈 코드</label>
              <input value={form.code || ''} disabled className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-muted cursor-not-allowed outline-none" />
            </div>
            <div>
              <label className="block text-xs text-txt-secondary mb-1.5">아티스트</label>
              <input value={form.artistName} onChange={(e: any) => setForm({ ...form, artistName: e.target.value })} placeholder="아티스트명(수정가능)"
                className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-txt-secondary mb-1.5">재질 *</label>
              <select value={form.material} onChange={(e: any) => setForm({ ...form, material: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none" required>
                <optgroup label="— 포토카드 —">
                  <option value="photocard_standard">포토카드 - Standard (아트지)</option>
                  <option value="photocard_premium">포토카드 - Premium (PVC/PETG)</option>
                  <option value="photocard_special">포토카드 - Special (홀로그램)</option>
                  <option value="photocard_eco">포토카드 - Eco (친환경/FSC)</option>
                </optgroup>
                <optgroup label="— 굿즈 —">
                  <option value="acrylic">아크릴 (UV인쇄)</option>
                  <option value="metal">금속</option>
                  <option value="fabric">직물</option>
                  <option value="ceramic_engraving">세라믹 (각인)</option>
                  <option value="ceramic_sublimation">세라믹 (서브리메이션)</option>
                  <option value="film">필름 (PET/PVC)</option>
                </optgroup>
                <optgroup label="— 문서 —">
                  <option value="document_inkjet">문서 - 잉크젯</option>
                  <option value="document_laser">문서 - 레이저</option>
                </optgroup>
              </select>
              <CarrierGuideText material={form.material} />
            </div>
            <div>
              <label className="block text-xs text-txt-secondary mb-1.5">설명</label>
              <textarea value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} placeholder="설명 (선택)"
                className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none resize-none" rows={2} />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button type="button" onClick={onClose} disabled={isPending} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary hover:border-geo-border-hover transition-all">취소</button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all">
              {isPending ? '저장 중..' : '저장'}
            </button>
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
    onSuccess: () => {
      toast.show('시리즈가 생성되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['series'] });
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
      queryClient.invalidateQueries({ queryKey: ['dealer-artists'] });
      setShowModal(false);
    },
    onError: (err: any) => { toast.show(err.response?.data?.message || '생성에 실패했습니다.', 'error'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/series/${id}`, { ...data, insertion_method: materialCarrier(data.material) }),
    onSuccess: () => {
      toast.show('시리즈가 수정되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['series'] });
      setEditTarget(null);
    },
    onError: (err: any) => { toast.show(err.response?.data?.message || '수정에 실패했습니다.', 'error'); }
  });

  const archiveMutation = useMutation({ mutationFn: (seriesId: string) => api.put(`/series/${seriesId}/archive`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); toast.show('시리즈가 비활성화되었습니다.', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '비활성화 실패.', 'error'); } });
  const activateMutation = useMutation({ mutationFn: (seriesId: string) => api.put(`/series/${seriesId}/activate`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); toast.show('시리즈가 활성화되었습니다.', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '활성화 실패.', 'error'); } });
  const deleteMutation = useMutation({ mutationFn: (seriesId: string) => api.delete(`/series/${seriesId}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); queryClient.invalidateQueries({ queryKey: ['series-trash'] }); toast.show('시리즈가 휴지통으로 이동되었습니다.', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '삭제 실패.', 'error'); } });
  const restoreMutation = useMutation({ mutationFn: (seriesId: string) => api.put(`/series/${seriesId}/restore`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); queryClient.invalidateQueries({ queryKey: ['series-trash'] }); toast.show('시리즈가 복원되었습니다.', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '복원 실패.', 'error'); } });
  const permanentDeleteMutation = useMutation({ mutationFn: (seriesId: string) => api.delete(`/series/${seriesId}/permanent`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series-trash'] }); toast.show('시리즈가 영구 삭제되었습니다.', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '영구 삭제 실패.', 'error'); } });

  const handleUpdate = (e: React.FormEvent) => { e.preventDefault(); if (!editTarget || updateMutation.isPending) return; updateMutation.mutate({ id: editTarget.series_id, data: editForm }); };
  const handleDeactivate = (id: string, name: string) => { setConfirmModal({ show: true, message: `"${name}" 시리즈를 비활성화할까요?`, confirmBtnClass: 'bg-status-yellow-dim text-status-yellow hover:bg-status-yellow/20', onConfirm: () => { archiveMutation.mutate(id); setConfirmModal({ ...confirmModal, show: false }); } }); };
  const handleActivate = (id: string, name: string) => { setConfirmModal({ show: true, message: `"${name}" 시리즈를 활성화할까요?`, onConfirm: () => { activateMutation.mutate(id); setConfirmModal({ ...confirmModal, show: false }); } }); };
  const handleDelete = (id: string, name: string) => { setConfirmModal({ show: true, message: `"${name}" 시리즈를 휴지통으로 이동할까요?`, onConfirm: () => { deleteMutation.mutate(id); setConfirmModal({ ...confirmModal, show: false }); } }); };
  const handleRestore = (id: string, name: string) => { setConfirmModal({ show: true, message: `"${name}" 시리즈를 복원할까요?`, onConfirm: () => { restoreMutation.mutate(id); setConfirmModal({ ...confirmModal, show: false }); } }); };
  const handlePermanentDelete = (id: string, name: string) => { setConfirmModal({ show: true, message: `"${name}" 시리즈를 영구 삭제할까요?`, subMessage: '이 작업은 되돌릴 수 없습니다!', onConfirm: () => { permanentDeleteMutation.mutate(id); setConfirmModal({ ...confirmModal, show: false }); } }); };

  const handleMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsDragging(true); dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y }; };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };
  const handleEditMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsEditDragging(true); editDragOffset.current = { x: e.clientX - editModalPos.x, y: e.clientY - editModalPos.y }; };
  const handleEditMouseMove = (e: React.MouseEvent) => { if (!isEditDragging) return; setEditModalPos({ x: e.clientX - editDragOffset.current.x, y: e.clientY - editDragOffset.current.y }); };
  const handleEditMouseUp = () => { if (isEditDragging) setIsEditDragging(false); };

  const openEditModal = (s: any) => {
    setEditModalPos({ x: 0, y: 0 });
    setEditTarget({ series_id: s.series_id });
    setEditForm({ name: s.name || '', code: s.code || '', description: s.description || '', artistName: s.artist_name || '', material: s.material || 'photocard_standard' });
  };

  const isActionPending = archiveMutation.isPending || activateMutation.isPending || deleteMutation.isPending || restoreMutation.isPending || permanentDeleteMutation.isPending;
  const displayData = showTrash ? trashedSeries : series;
  const isDataLoading = showTrash ? isTrashLoading : isLoading;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {!showTrash && (
            <button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowModal(true); }} className="px-4 py-2 bg-status-yellow-dim text-status-yellow rounded-lg hover:bg-status-yellow/20 text-sm font-medium transition-all">+ 시리즈 생성</button>
          )}
        </div>
        <button onClick={() => setShowTrash(!showTrash)} className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${showTrash ? 'bg-status-purple text-white border-status-purple' : 'bg-transparent text-txt-secondary border-geo-border hover:border-geo-border-hover hover:text-txt-primary'}`}>
          {showTrash ? '목록 보기' : '휴지통 보기'}
        </button>
      </div>

      {isDataLoading ? (
        <p className="text-txt-secondary">로딩 중..</p>
      ) : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-visible">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="w-[12%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">ID</th>
                <th className="w-[13%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">거래처</th>
                <th className="w-[17%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">시리즈</th>
                <th className="w-[20%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">아티스트</th>
                <th className="w-[14%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">{showTrash ? '' : '생성일'}</th>
                <th className="w-[10%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">{showTrash ? '삭제일' : '상태'}</th>
                <th className="w-[18%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody>
              {displayData?.length === 0 ? (
                <tr><td colSpan={6}></td></tr>
              ) : (
                displayData?.map((s: any) => (
                  <tr key={s.series_id} className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors">
                    <td className="px-4 py-3 text-center font-mono text-sm text-status-green">{s.display_id || '-'}</td>
                    <td className="px-4 py-3 text-center text-txt-primary truncate">{s.dealer_name || '-'}</td>
                    <td className="px-4 py-3 text-center text-txt-primary truncate">{s.name || '-'}</td>
                    <td className="px-4 py-3 text-center text-txt-primary truncate">{s.artist_name || '-'}</td>
                    <td className="px-4 py-3 text-center text-txt-muted text-xs">{!showTrash && new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      {showTrash ? <span className="text-txt-muted text-xs">{new Date(s.deleted_at).toLocaleDateString()}</span> : (
                        <span className={`inline-block w-14 px-1 py-1 rounded text-xs font-medium text-center ${s.status === 'ACTIVE' ? 'bg-status-green-dim text-status-green' : 'bg-status-yellow-dim text-status-yellow'}`}>{s.status === 'ACTIVE' ? '운영중' : '보관'}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        {showTrash ? (
                          <>
                            <button onClick={() => handleRestore(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-blue-dim text-status-blue rounded hover:bg-status-blue/20 disabled:opacity-50 transition-all">복원</button>
                            <button onClick={() => handlePermanentDelete(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-red-dim text-status-red rounded hover:bg-status-red/20 disabled:opacity-50 transition-all">삭제</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => openEditModal(s)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-yellow-dim text-status-yellow rounded hover:bg-status-yellow/20 disabled:opacity-50 transition-all">수정</button>
                            {s.status === 'ACTIVE' ? (
                              <button onClick={() => handleDeactivate(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-yellow-dim text-status-yellow rounded hover:bg-status-yellow/20 disabled:opacity-50 transition-all">보관</button>
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
          <p className="text-sm text-txt-secondary"><button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowModal(true); }} className="text-status-yellow font-semibold hover:underline">[시리즈 생성]</button>{` `}버튼으로 첫 시리즈를 만들어 보세요.</p>
        </div>
      )}
      {!showTrash && displayData && displayData.length > 0 && (
        <div className="mt-4 px-6 py-5 bg-status-purple-dim border border-status-purple/30 rounded-lg text-center">
          <p className="text-base font-semibold text-status-green mb-1">시리즈 준비 완료!</p>
          <p className="text-sm text-txt-secondary">이제 작업을{' '}<button onClick={() => window.location.hash = '/batches'} className="text-status-yellow font-semibold hover:underline">[작업 관리]</button>에서 생성하세요.</p>
        </div>
      )}

      {showModal && (
        <CreateSeriesModal
          onClose={() => setShowModal(false)}
          onSubmit={(form) => createMutation.mutate(form)}
          isPending={createMutation.isPending}
          modalPos={modalPos}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      )}

      {editTarget && (
        <EditSeriesModal
          form={editForm}
          setForm={setEditForm}
          onSubmit={handleUpdate}
          onClose={() => setEditTarget(null)}
          isPending={updateMutation.isPending}
          modalPos={editModalPos}
          onMouseDown={handleEditMouseDown}
          onMouseMove={handleEditMouseMove}
          onMouseUp={handleEditMouseUp}
        />
      )}

      {confirmModal.show && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-geo-border rounded-xl w-full max-w-sm p-6">
            <p className="text-txt-primary text-center mb-2">{confirmModal.message}</p>
            {confirmModal.subMessage && <p className="text-status-red text-sm text-center mb-4">{confirmModal.subMessage}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmModal({ ...confirmModal, show: false })} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary hover:border-geo-border-hover transition-all">취소</button>
              <button onClick={confirmModal.onConfirm} className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${confirmModal.confirmBtnClass || 'bg-purple-500 text-white hover:bg-purple-500/80'}`}>확인</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}