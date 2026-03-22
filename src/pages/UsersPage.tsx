import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';
import { useAuthStore } from '../stores/auth.store';

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const [confirmDelete, setConfirmDelete] = useState<{ userId: string; email: string } | null>(null);
  const queryClient = useQueryClient();
  const toast = useToastStore();
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((res) => res.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      setForm({ email: '', password: '', name: '' });
      toast.show('User created successfully', 'success');
    },
    onError: (err: any) => { toast.show(err.response?.data?.message || 'Failed to create user', 'error'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmDelete(null);
      toast.show('User deleted successfully', 'success');
    },
    onError: (err: any) => { toast.show(err.response?.data?.message || 'Failed to delete user', 'error'); },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/reset-password`),
    onSuccess: () => { toast.show('Temporary password sent to user email', 'success'); },
    onError: (err: any) => { toast.show(err.response?.data?.message || 'Failed to reset password', 'error'); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...form, role: 'STUDIO_VIEWER' });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return;
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - dragPos.x, y: e.clientY - dragPos.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };

  const getRoleBadge = (role: string) => {
    const map: Record<string, string> = {
      super_admin: 'bg-status-red-dim text-status-red',
      STUDIO_ADMIN: 'bg-status-red-dim text-status-red',
      agency_admin: 'bg-status-purple-dim text-status-purple',
      ops_admin: 'bg-status-blue-dim text-status-blue',
      STUDIO_OPERATOR: 'bg-status-blue-dim text-status-blue',
      viewer: 'bg-status-yellow-dim text-status-yellow',
      STUDIO_VIEWER: 'bg-status-yellow-dim text-status-yellow',
    };
    return map[role] || 'bg-status-yellow-dim text-status-yellow';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div />
        {isSuperAdmin && (
          <button
            onClick={() => { setDragPos({ x: 0, y: 0 }); setShowModal(true); }}
            className="px-4 py-2 bg-status-purple text-white rounded-lg hover:bg-status-purple/80 text-sm font-medium transition-all"
          >
            + New User
          </button>
        )}
      </div>

      {isLoading ? <p className="text-txt-secondary">Loading...</p> : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">Last Login</th>
                {isSuperAdmin && <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users?.map((u: any) => (
                <tr key={u.user_id} className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors">
                  <td className="px-6 py-4 font-medium text-txt-primary">{u.name}</td>
                  <td className="px-6 py-4 text-txt-secondary">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium font-mono ${getRoleBadge(u.role)}`}>{u.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium font-mono ${u.status === 'ACTIVE' ? 'bg-status-green-dim text-status-green' : 'bg-status-yellow-dim text-status-yellow'}`}>{u.status}</span>
                  </td>
                  <td className="px-6 py-4 text-txt-muted text-sm">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '-'}</td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => resetPasswordMutation.mutate(u.user_id)}
                          disabled={resetPasswordMutation.isPending}
                          className="px-2.5 py-1 text-xs font-medium text-status-blue border border-status-blue/30 rounded hover:bg-status-blue/10 transition-all disabled:opacity-50"
                        >
                          Reset PW
                        </button>
                        {u.role !== 'super_admin' && (
                          <button
                            onClick={() => setConfirmDelete({ userId: u.user_id, email: u.email })}
                            className="px-2.5 py-1 text-xs font-medium text-status-red border border-status-red/30 rounded hover:bg-status-red/10 transition-all"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!users?.length && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-txt-muted">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-txt-primary mb-2">Delete User</h3>
            <p className="text-sm text-txt-secondary mb-6">
              Delete <span className="text-status-red font-medium">{confirmDelete.email}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg hover:border-geo-border-hover transition-all">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.userId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-status-red text-white rounded-lg hover:bg-status-red/80 transition-all disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4 pb-4"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm flex flex-col cursor-move select-none"
            style={{
              maxHeight: '85vh',
              transform: dragPos.x !== 0 || dragPos.y !== 0 ? `translate(${dragPos.x}px, ${dragPos.y}px)` : undefined,
            }}
            onMouseDown={handleMouseDown}
          >
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex-shrink-0">
              <h2 className="text-lg font-semibold text-txt-primary">New User</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">Name *</label>
                  <input placeholder="Enter name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" required />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">Email *</label>
                  <input type="email" placeholder="Enter email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" required />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">Password *</label>
                  <input type="password" placeholder="Enter password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" required minLength={6} />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 transition-all disabled:opacity-50">
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
