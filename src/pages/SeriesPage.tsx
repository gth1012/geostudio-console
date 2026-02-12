import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

const MATERIAL_OPTIONS = [
  { value: 'paper_art', label: '종이 (아트지/스노우지)', carrier: 'PATTERN' },
  { value: 'paper_eco', label: '종이 (친환경/FSC)', carrier: 'PATTERN' },
  { value: 'film', label: '필름 (PET/PVC)', carrier: 'PATTERN' },
  { value: 'pvc_card', label: 'PVC (카드형)', carrier: 'PATTERN' },
  { value: 'hologram', label: '특수지 (홀로그램/펄)', carrier: 'PATTERN' },
  { value: 'fabric', label: '직물', carrier: 'PATTERN' },
  { value: 'acrylic', label: '아크릴 (UV인쇄)', carrier: 'ENGRAVING' },
  { value: 'metal', label: '금속', carrier: 'ENGRAVING' },
  { value: 'ceramic', label: '세라믹 (각인)', carrier: 'ENGRAVING' },
  { value: 'ceramic_sub', label: '세라믹 (서브리메이션)', carrier: 'PATTERN' },
] as const;

const materialCarrier = (v: string) => MATERIAL_OPTIONS.find(o => o.value === v)?.carrier || 'PATTERN';

function CarrierGuideText({ material }: { material: string }) {
  const carrier = materialCarrier(material);
  const isPattern = carrier === 'PATTERN';
  return (
    <p className={`mt-2 text-xs font-medium ${isPattern ? 'text-status-green' : 'text-status-blue'}`}>
      {isPattern ? '\u2705 패턴 기반 인증이 적용됩니다' : '\u2705 각인 기반 인증이 적용됩니다'}
    </p>
  );
}

export default function SeriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', artistName: '', material: 'paper_art' });
  const [editTarget, setEditTarget] = useState<{ series_id: string; name: string; code: string; description: string; artist_name: string; material: string; thumbnail_image?: string } | null>(null);
  const [editForm, setEditForm] = useState({ name: '', code: '', description: '', artistName: '', material: 'paper_art' });
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; message: string; subMessage?: string; onConfirm: () => void; confirmBtnClass?: string }>({ show: false, message: '', onConfirm: () => {} });
  // Image upload state (edit modal only)
  const [editSelectedImage, setEditSelectedImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const toast = useToastStore();
  const { data: series, isLoading } = useQuery({ queryKey: ['series'], queryFn: () => api.get('/series').then((res) => res.data.data), enabled: !showTrash });
  const { data: trashedSeries, isLoading: isTrashLoading } = useQuery({ queryKey: ['series-trash'], queryFn: () => api.get('/series/trash').then((res) => res.data.data), enabled: showTrash });

  // Image upload helper
  const uploadSeriesImage = async (seriesId: string, imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post(`/series/${seriesId}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  };

  const createMutation = useMutation({ mutationFn: (data: any) => api.post('/series', { ...data, insertionMethod: materialCarrier(data.material) }), onSuccess: () => {
    toast.show('시리즈가 생성되었습니다', 'success');
    queryClient.invalidateQueries({ queryKey: ['series'] });
    setShowModal(false);
    setForm({ name: '', description: '', artistName: '', material: 'paper_art' });
  }, onError: (err: any) => { toast.show(err.response?.data?.message || '시리즈 생성 실패', 'error'); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/series/${id}`, { ...data, insertion_method: materialCarrier(data.material) }), onSuccess: async (_res, variables) => {
    // Upload image if selected
    if (editSelectedImage && variables.id) {
      try {
        await uploadSeriesImage(variables.id, editSelectedImage);
        toast.show('시리즈가 수정되었습니다 (이미지 업로드 완료)', 'success');
      } catch (imgErr: any) {
        toast.show('시리즈 수정됨, 이미지 업로드 실패: ' + (imgErr.response?.data?.message || imgErr.message), 'error');
      }
    } else {
      toast.show('시리즈가 수정되었습니다', 'success');
    }
    queryClient.invalidateQueries({ queryKey: ['series'] });
    setEditTarget(null);
    setEditSelectedImage(null);
    setEditImagePreview(null);
  }, onError: (err: any) => { toast.show(err.response?.data?.message || '시리즈 수정 실패', 'error'); } });
  const archiveMutation = useMutation({ mutationFn: (seriesId: string) => api.put(`/series/${seriesId}/archive`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); toast.show('시리즈가 비활성화되었습니다', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '비활성화 실패', 'error'); } });
  const activateMutation = useMutation({ mutationFn: (seriesId: string) => api.put(`/series/${seriesId}/activate`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); toast.show('시리즈가 활성화되었습니다', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '활성화 실패', 'error'); } });
  const deleteMutation = useMutation({ mutationFn: (seriesId: string) => api.delete(`/series/${seriesId}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); queryClient.invalidateQueries({ queryKey: ['series-trash'] }); toast.show('시리즈가 휴지통으로 이동되었습니다', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '삭제 실패', 'error'); } });
  const restoreMutation = useMutation({ mutationFn: (seriesId: string) => api.put(`/series/${seriesId}/restore`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); queryClient.invalidateQueries({ queryKey: ['series-trash'] }); toast.show('시리즈가 복원되었습니다', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '복원 실패', 'error'); } });
  const permanentDeleteMutation = useMutation({ mutationFn: (seriesId: string) => api.delete(`/series/${seriesId}/permanent`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series-trash'] }); toast.show('시리즈가 영구 삭제되었습니다', 'success'); }, onError: (err: any) => { toast.show(err.response?.data?.message || '영구 삭제 실패', 'error'); } });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (createMutation.isPending) return; createMutation.mutate(form); };

  // Image selection handler (edit modal only)
  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  const clearEditSelectedImage = () => { setEditSelectedImage(null); setEditImagePreview(null); if (editFileInputRef.current) editFileInputRef.current.value = ''; };
  const handleDeactivate = (id: string, name: string) => { setConfirmModal({ show: true, message: `"${name}" 시리즈를 비활성화 하시겠습니까?`, confirmBtnClass: 'bg-status-yellow-dim text-status-yellow hover:bg-status-yellow/20', onConfirm: () => { archiveMutation.mutate(id); setConfirmModal({ ...confirmModal, show: false }); } }); };
  const handleActivate = (id: string, name: string) => { setConfirmModal({ show: true, message: `"${name}" 시리즈를 활성화 하시겠습니까?`, onConfirm: () => { activateMutation.mutate(id); setConfirmModal({ ...confirmModal, show: false }); } }); };
  const handleDelete = (id: string, name: string) => { setConfirmModal({ show: true, message: `"${name}" 시리즈를 휴지통으로 이동하시겠습니까?`, onConfirm: () => { deleteMutation.mutate(id); setConfirmModal({ ...confirmModal, show: false }); } }); };
  const handleRestore = (id: string, name: string) => { setConfirmModal({ show: true, message: `"${name}" 시리즈를 복구하시겠습니까?`, onConfirm: () => { restoreMutation.mutate(id); setConfirmModal({ ...confirmModal, show: false }); } }); };
  const handlePermanentDelete = (id: string, name: string) => { setConfirmModal({ show: true, message: `"${name}" 시리즈를 영구 삭제하시겠습니까?`, subMessage: '이 작업은 되돌릴 수 없습니다!', onConfirm: () => { permanentDeleteMutation.mutate(id); setConfirmModal({ ...confirmModal, show: false }); } }); };

  const isActionPending = archiveMutation.isPending || activateMutation.isPending || deleteMutation.isPending || restoreMutation.isPending || permanentDeleteMutation.isPending;
  const displayData = showTrash ? trashedSeries : series;
  const isDataLoading = showTrash ? isTrashLoading : isLoading;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {!showTrash && (
            <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-status-purple text-white rounded-lg hover:bg-status-purple/80 text-sm font-medium transition-all">+ 시리즈 생성</button>
          )}
        </div>
        <button onClick={() => setShowTrash(!showTrash)} className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${showTrash ? 'bg-status-purple text-white border-status-purple' : 'bg-transparent text-txt-secondary border-geo-border hover:border-geo-border-hover hover:text-txt-primary'}`}>
          {showTrash ? '\u2190 목록으로' : '\uD83D\uDDD1 휴지통'}
        </button>
      </div>

      {isDataLoading ? (
        <p className="text-txt-secondary">로딩 중...</p>
      ) : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-visible">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="w-[12%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">ID</th>
                <th className="w-[30%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">이름</th>
                <th className="w-[12%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">{showTrash ? '삭제일' : '상태'}</th>
                <th className="w-[12%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">수량</th>
                <th className="w-[14%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">{showTrash ? '' : '생성일'}</th>
                <th className="w-[20%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody>
              {displayData?.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-txt-muted">{showTrash ? '휴지통이 비어있습니다.' : '시리즈가 없습니다.'}</td></tr>
              ) : (
                displayData?.map((s: any) => (
                  <tr key={s.series_id} className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors">
                    <td className="px-4 py-3 text-center font-mono text-sm text-status-blue">{s.display_id || '-'}</td>
                    <td className="px-4 py-3 text-center text-txt-primary truncate">{s.name}</td>
                    <td className="px-4 py-3 text-center">
                      {showTrash ? <span className="text-txt-muted text-xs">{new Date(s.deleted_at).toLocaleDateString()}</span> : (
                        <span className={`inline-block w-14 px-1 py-1 rounded text-xs font-medium text-center ${s.status === 'ACTIVE' ? 'bg-status-green-dim text-status-green' : 'bg-status-yellow-dim text-status-yellow'}`}>{s.status === 'ACTIVE' ? '활성' : '비활성'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-txt-primary font-mono text-sm">{s.total_count > 0 ? s.total_count.toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-center text-txt-muted text-xs">{!showTrash && new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        {showTrash ? (
                          <>
                            <button onClick={() => handleRestore(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-blue-dim text-status-blue rounded hover:bg-status-blue/20 disabled:opacity-50 transition-all">복구</button>
                            <button onClick={() => handlePermanentDelete(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-red-dim text-status-red rounded hover:bg-status-red/20 disabled:opacity-50 transition-all">비우기</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditTarget({ series_id: s.series_id, name: s.name || '', code: s.code || '', description: s.description || '', artist_name: s.artist_name || '', material: s.material || 'paper_art', thumbnail_image: s.thumbnail_image || undefined }); setEditForm({ name: s.name || '', code: s.code || '', description: s.description || '', artistName: s.artist_name || '', material: s.material || 'paper_art' }); setEditImagePreview(null); setEditSelectedImage(null); }} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-purple/10 text-status-purple rounded hover:bg-status-purple/20 disabled:opacity-50 transition-all">수정</button>
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

      {/* 수정 모달 */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm m-auto">
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex items-center justify-between">
              <h2 className="text-lg font-semibold text-txt-primary">시리즈 수정</h2>
              <button onClick={() => setEditTarget(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-geo-card-hover transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ id: editTarget.series_id, data: editForm }); }} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">시리즈 이름</label>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="시리즈 이름"
                    className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" autoFocus />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">시리즈 코드</label>
                  <input value={editForm.code} disabled
                    className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-muted cursor-not-allowed outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">아티스트</label>
                  <input value={editForm.artistName} onChange={(e) => setEditForm({ ...editForm, artistName: e.target.value })} placeholder="아티스트명"
                    className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">재질 *</label>
                  <select value={editForm.material} onChange={(e) => setEditForm({ ...editForm, material: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none">
                    {MATERIAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <CarrierGuideText material={editForm.material} />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">설명</label>
                  <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="설명"
                    className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none resize-none" rows={2} />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">커버 이미지</label>
                  <input type="file" ref={editFileInputRef} accept="image/*" onChange={handleEditImageSelect} className="hidden" />
                  {editImagePreview || editTarget?.thumbnail_image ? (
                    <div className="relative">
                      <img src={editImagePreview || editTarget?.thumbnail_image} alt="미리보기" className="w-full h-32 object-cover rounded-lg border border-geo-border" />
                      <button type="button" onClick={clearEditSelectedImage} className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-all">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                      <button type="button" onClick={() => editFileInputRef.current?.click()} className="absolute bottom-1 right-1 px-2 py-1 bg-black/60 rounded text-white text-xs hover:bg-black/80 transition-all">변경</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => editFileInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-geo-border rounded-lg flex flex-col items-center justify-center text-txt-muted hover:border-status-purple/50 hover:text-txt-secondary transition-all">
                      <svg className="w-6 h-6 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="text-xs">클릭하여 이미지 선택</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => { setEditTarget(null); clearEditSelectedImage(); }} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all">취소</button>
                <button type="submit" disabled={updateMutation.isPending} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 transition-all disabled:opacity-50">
                  {updateMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-md p-6 mx-4 m-auto">
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex-shrink-0">
              <h2 className="text-lg font-semibold text-txt-primary">새 시리즈 생성</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">시리즈 이름 *</label>
                  <input placeholder="시리즈 이름 입력" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 focus:border-status-purple/60 outline-none transition-all" required />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">아티스트</label>
                  <input placeholder="아티스트명 (선택)" value={form.artistName} onChange={(e) => setForm({ ...form, artistName: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 focus:border-status-purple/60 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">재질 *</label>
                  <select value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none" required>
                    {MATERIAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <CarrierGuideText material={form.material} />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">설명</label>
                  <textarea placeholder="설명 (선택)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 focus:border-status-purple/60 outline-none transition-all resize-none" rows={2} />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} disabled={createMutation.isPending} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary hover:border-geo-border-hover transition-all">취소</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all">{createMutation.isPending ? '생성 중...' : '생성'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 커스텀 확인 모달 */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-geo-border rounded-xl w-full max-w-sm p-6">
            <p className="text-txt-primary text-center mb-2">{confirmModal.message}</p>
            {confirmModal.subMessage && (
              <p className="text-status-red text-sm text-center mb-4">{confirmModal.subMessage}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmModal({ ...confirmModal, show: false })} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary hover:border-geo-border-hover transition-all">
                취소
              </button>
              <button onClick={confirmModal.onConfirm} className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${confirmModal.confirmBtnClass || 'bg-purple-500 text-white hover:bg-purple-500/80'}`}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
