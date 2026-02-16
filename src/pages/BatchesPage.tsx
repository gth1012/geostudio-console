import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

interface BatchRow {
  image: string;
  supply: string;
  fileName: string;
}

export default function BatchesPage() {
  const [showModal, setShowModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [seriesId, setSeriesId] = useState('');
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [deleteTarget, setDeleteTarget] = useState<{ batch_id: string; name: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [imgModalPos, setImgModalPos] = useState({ x: 0, y: 0 });
  const [isImgDragging, setIsImgDragging] = useState(false);
  const imgDragOffset = useRef({ x: 0, y: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const toast = useToastStore();
  const { data: batches, isLoading } = useQuery({ queryKey: ['batches'], queryFn: () => api.get('/batches').then((res) => res.data.data) });
  const { data: series } = useQuery({ queryKey: ['series'], queryFn: () => api.get('/series').then((res) => res.data.data) });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/batches/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batches'] }); setDeleteTarget(null); toast.show('?ì‚°???? œ?˜ì—ˆ?µë‹ˆ??, 'success'); },
    onError: (err: any) => { toast.show(err.response?.data?.message || '?ì‚° ?? œ ?¤íŒ¨', 'error'); },
  });

  // ì²´í¬ë°•ìŠ¤ ? íƒ ?¸ë“¤??
  const handleSelectAll = (checked: boolean) => {
    if (checked && batches) {
      const draftIds = batches.filter((b: any) => b.status === 'DRAFT').map((b: any) => b.batch_id);
      setSelectedIds(new Set(draftIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (batchId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(batchId);
      else next.delete(batchId);
      return next;
    });
  };

  // ? íƒ ?? œ
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => api.delete(`/batches/${id}`)));
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setSelectedIds(new Set());
      setShowBulkDeleteModal(false);
      toast.show(`${ids.length}ê°??ì‚°???? œ?˜ì—ˆ?µë‹ˆ??, 'success');
    } catch (err: any) {
      toast.show(err.response?.data?.message || '?¼ë? ?ì‚° ?? œ ?¤íŒ¨', 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const draftBatches = batches?.filter((b: any) => b.status === 'DRAFT') || [];
  const allDraftSelected = draftBatches.length > 0 && draftBatches.every((b: any) => selectedIds.has(b.batch_id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesId || rows.length === 0) return;
    setIsCreating(true);
    try {
      for (const row of rows) {
        await api.post('/batches', { seriesId, image: row.image, supply: parseInt(row.supply) || 0 });
      }
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setShowModal(false);
      setSeriesId('');
      setRows([]);
      toast.show(`${rows.length}ê°??ì‚°???ì„±?˜ì—ˆ?µë‹ˆ??, 'success');
    } catch (err: any) {
      toast.show(err.response?.data?.message || '?ì‚° ?ì„± ?¤íŒ¨', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const addImagesWithDuplicateCheck = useCallback((newImages: BatchRow[]) => {
    setRows(prev => {
      const existingKeys = new Set(prev.map(r => r.fileName));
      const unique: BatchRow[] = [];
      let duplicateCount = 0;
      for (const img of newImages) {
        if (existingKeys.has(img.fileName)) {
          duplicateCount++;
        } else {
          existingKeys.add(img.fileName);
          unique.push(img);
        }
      }
      if (duplicateCount > 0) {
        toast.show(`ì¤‘ë³µ ?´ë?ì§€ ${duplicateCount}ê°??œì™¸??, 'error');
      }
      return [...prev, ...unique];
    });
  }, [toast]);

  const processFiles = useCallback((files: File[]) => {
    const readers = files.map(file => {
      return new Promise<BatchRow>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ image: reader.result as string, supply: '', fileName: file.name });
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readers).then(newImages => {
      addImagesWithDuplicateCheck(newImages);
    });
  }, [addImagesWithDuplicateCheck]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) {
      toast.show('?´ë?ì§€ ?Œì¼ë§?ì¶”ê??????ˆìŠµ?ˆë‹¤', 'error');
      return;
    }
    processFiles(files);
  }, [processFiles, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleRemoveRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSupplyChange = (index: number, value: string) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, supply: value } : row));
  };

  const handleMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsDragging(true); dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y }; };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };

  const handleImgMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A','SVG','PATH'].includes(tag)) return; setIsImgDragging(true); imgDragOffset.current = { x: e.clientX - imgModalPos.x, y: e.clientY - imgModalPos.y }; };
  const handleImgMouseMove = (e: React.MouseEvent) => { if (!isImgDragging) return; setImgModalPos({ x: e.clientX - imgDragOffset.current.x, y: e.clientY - imgDragOffset.current.y }); };
  const handleImgMouseUp = () => { if (isImgDragging) setIsImgDragging(false); };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { COMPLETED: 'bg-status-green-dim text-status-green', IN_PROGRESS: 'bg-status-yellow-dim text-status-yellow', FAILED: 'bg-status-red-dim text-status-red', DRAFT: 'bg-status-yellow-dim text-status-yellow', LOCKED: 'bg-status-purple-dim text-status-purple', SHIPPED: 'bg-status-green-dim text-status-green' };
    return map[status] || 'bg-status-yellow-dim text-status-yellow';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { DRAFT: '?„ì‹œ ?€??, IN_PROGRESS: 'ì§„í–‰ ì¤?, COMPLETED: '?„ë£Œ', SHIPPED: 'ì¶œê³  ?„ë£Œ', FAILED: '?¤íŒ¨', LOCKED: '?•ì •' };
    return map[status] || status;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col items-center gap-3 mb-6">
        <button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowModal(true); }} className="px-4 py-2 bg-status-purple text-white rounded-lg hover:bg-status-purple/80 text-sm font-medium transition-all">?œë¦¬ì¦?? íƒ</button>
        {selectedIds.size > 0 && (
          <button onClick={() => setShowBulkDeleteModal(true)} className="px-4 py-2 bg-status-red text-white rounded-lg hover:bg-status-red/80 text-sm font-medium transition-all">
            ? íƒ ?? œ ({selectedIds.size}ê°?
          </button>
        )}
      </div>

      {isLoading ? <p className="text-txt-secondary">ë¡œë”© ì¤?.</p> : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-visible">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="w-[5%] px-2 py-3 text-center">
                  <input type="checkbox" checked={allDraftSelected && draftBatches.length > 0} onChange={(e) => handleSelectAll(e.target.checked)} className="w-4 h-4 rounded border-geo-border text-status-purple focus:ring-status-purple/40 bg-geo-main cursor-pointer" />
                </th>
                <th className="w-[10%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">ID</th>
                <th className="w-[18%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">?œë¦¬ì¦?/th>
                <th className="w-[10%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">ë°œí–‰??/th>
                <th className="w-[22%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">?íƒœ</th>
                <th className="w-[15%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">?ì„±??/th>
                <th className="w-[20%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">?¡ì…˜</th>
              </tr>
            </thead>
            <tbody>
              {batches?.map((b: any) => (
                <tr key={b.batch_id} className={`border-b border-geo-border/50 last:border-0 dark-table-row transition-colors ${selectedIds.has(b.batch_id) ? 'bg-status-purple/10' : ''}`}>
                  <td className="px-2 py-3 text-center">
                    <input type="checkbox" checked={selectedIds.has(b.batch_id)} onChange={(e) => handleSelectOne(b.batch_id, e.target.checked)} disabled={b.status !== 'DRAFT'} className="w-4 h-4 rounded border-geo-border text-status-purple focus:ring-status-purple/40 bg-geo-main cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" />
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-sm">
  <button type="button" onClick={() => navigate(`/batches/${b.batch_id}`)} className="text-status-blue hover:underline cursor-pointer" aria-label={`Open batch ${b.display_id || b.batch_id}`}>{b.display_id || '-'}</button>
</td>
                  <td className="px-4 py-3 text-center text-txt-primary truncate">{b.series_name || '-'}</td>
                  <td className="px-4 py-3 text-center text-txt-primary font-mono">{b.supply?.toLocaleString() || '-'}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center items-center gap-1 flex-wrap">
                      <span className={`inline-block w-16 px-1 py-1 rounded text-xs font-medium text-center ${getStatusBadge(b.status)}`}>{getStatusLabel(b.status)}</span>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${b.batch_reference_status === 'LOCKED' ? 'bg-status-green-dim text-status-green' : 'bg-status-yellow-dim text-status-yellow'}`}>
                        {b.batch_reference_status === 'LOCKED' ? 'ê¸°ì?:?•ì •' : 'ê¸°ì?:ë¯¸í™•??}
                      </span>
                      {b.batch_locked_until && new Date(b.batch_locked_until) > new Date() && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-red/20 text-status-red border border-status-red/30 animate-pulse">LOCKED</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-txt-muted text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => navigate(`/batches/${b.batch_id}`)}
                        className="w-12 px-1 py-1 text-xs bg-status-purple text-white rounded hover:bg-status-purple/80 transition-all">?ì„±</button>
                      <button disabled={b.status !== 'DRAFT'} onClick={() => setDeleteTarget({ batch_id: b.batch_id, name: b.display_id || b.batch_id })}
                        className="w-12 px-1 py-1 text-xs bg-status-red-dim text-status-red rounded hover:bg-status-red/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">?? œ</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!batches?.length && <tr><td colSpan={7} className="px-6 py-8 text-center text-txt-muted">?œë¦¬ì¦ˆê? ?†ìŠµ?ˆë‹¤</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ?? œ ?•ì¸ ëª¨ë‹¬ */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-txt-primary mb-2">?ì‚° ?? œ</h3>
            <p className="text-sm text-txt-secondary mb-6">"{deleteTarget.name}" ?ì‚°???? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?<br />???‘ì—…?€ ?˜ëŒë¦????†ìŠµ?ˆë‹¤.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg hover:border-geo-border-hover transition-all">ì·¨ì†Œ</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.batch_id)} disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-status-red text-white rounded-lg hover:bg-status-red/80 transition-all disabled:opacity-50">
                {deleteMutation.isPending ? '?? œ ì¤?.' : '?? œ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ? íƒ ?? œ ?•ì¸ ëª¨ë‹¬ */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-txt-primary mb-2">? íƒ ?? œ</h3>
            <p className="text-sm text-txt-secondary mb-6">? íƒ??{selectedIds.size}ê°??ì‚°???? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?<br />???‘ì—…?€ ?˜ëŒë¦????†ìŠµ?ˆë‹¤.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowBulkDeleteModal(false)} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg hover:border-geo-border-hover transition-all">ì·¨ì†Œ</button>
              <button onClick={handleBulkDelete} disabled={isBulkDeleting}
                className="px-4 py-2 text-sm font-medium bg-status-red text-white rounded-lg hover:bg-status-red/80 transition-all disabled:opacity-50">
                {isBulkDeleting ? '?? œ ì¤?.' : '?? œ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ??ë°°ì¹˜ ?ì„± ëª¨ë‹¬ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div className="absolute top-4 left-4 bg-geo-card border border-geo-border rounded-xl w-full max-w-md flex flex-col cursor-move select-none" style={{ maxHeight: '85vh', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }} onMouseDown={handleMouseDown}>
            <div className="bg-geo-main px-4 py-3 border-b border-geo-border rounded-t-xl flex-shrink-0 flex justify-center">
              <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} className="px-4 py-2 bg-geo-card border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none text-sm font-medium" required>
                <option value="">?œë¦¬ì¦ˆë? ? íƒ?˜ì„¸??/option>
                {series?.map((s: any) => <option key={s.series_id} value={s.series_id}>{s.name}</option>)}
              </select>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <button type="button" disabled={!seriesId} onClick={() => { setImgModalPos({ x: 0, y: 0 }); setShowImageModal(true); }} className="w-full px-4 py-2.5 bg-status-purple/20 text-status-purple rounded-lg font-medium hover:bg-status-purple/30 transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed">
                    + ?”ì???´ë?ì§€ ì¶”ê?
                  </button>
                </div>
                {rows.length > 0 && (
                  <div className="space-y-3">
                    <label className="block text-xs text-txt-secondary">?ì‚° ëª©ë¡ ({rows.length}ê°?</label>
                    {rows.map((row, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-geo-main rounded-lg border border-geo-border">
                        <span className="text-xs text-txt-muted font-mono w-6 text-center flex-shrink-0">{i + 1}</span>
                        <img src={row.image} alt={`batch-${i}`} className="w-12 h-12 object-cover rounded-lg border border-geo-border flex-shrink-0" />
                        <input type="number" placeholder="ë°œí–‰?? value={row.supply} onChange={(e) => handleSupplyChange(i, e.target.value)} className="flex-1 px-3 py-2 bg-geo-card border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted text-sm focus:ring-2 focus:ring-status-purple/40 outline-none" min="1" required />
                        <button type="button" onClick={() => handleRemoveRow(i)} className="w-8 h-8 bg-status-red/20 text-status-red rounded-lg flex items-center justify-center hover:bg-status-red/30 transition-all flex-shrink-0">X</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => { setShowModal(false); setSeriesId(''); setRows([]); }} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all">ì·¨ì†Œ</button>
                <button type="submit" disabled={isCreating || rows.length === 0} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 transition-all disabled:opacity-50">
                  {isCreating ? '?ì„± ì¤?..' : `?ì„± (${rows.length}ê°??´ë?ì§€)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ?´ë?ì§€ ì¶”ê? ëª¨ë‹¬ */}
      {showImageModal && (
        <div className="fixed inset-0 z-[60]" onMouseMove={handleImgMouseMove} onMouseUp={handleImgMouseUp} onMouseLeave={handleImgMouseUp}>
          <div className="absolute top-4 left-[460px] bg-geo-card border border-geo-border rounded-xl w-full max-w-lg cursor-move select-none" style={{ transform: `translate(${imgModalPos.x}px, ${imgModalPos.y}px)` }} onMouseDown={handleImgMouseDown}>
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex items-center justify-between">
              <h2 className="text-base font-semibold text-txt-primary">?”ì???´ë?ì§€ ì¶”ê?</h2>
              <button onClick={() => setShowImageModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-geo-card-hover transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg px-4 py-3 text-center transition-all cursor-pointer flex items-center justify-center gap-3 ${dragOver ? 'border-status-purple bg-status-purple/10' : 'border-geo-border hover:border-status-purple/50'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesChange} className="hidden" />
                <span className="text-xl">&#128193;</span>
                <span className="text-sm text-txt-primary font-medium">?´ë?ì§€ ?…ë¡œ??/span>
              </div>
              {rows.length > 0 && (
                <div>
                  <label className="block text-xs text-txt-secondary mb-2">ì¶”ê????´ë?ì§€ ({rows.length}ê°?</label>
                  <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto">
                    {rows.map((row, i) => (
                      <div key={i} className="relative group">
                        <img src={row.image} alt={`img-${i}`} className="w-full aspect-square object-cover rounded-lg border border-geo-border" />
                        <span className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[10px] px-1 rounded">{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setShowImageModal(false)} className="w-full px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 transition-all text-sm">
                ?•ì¸ ({rows.length}ê°??´ë?ì§€)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
