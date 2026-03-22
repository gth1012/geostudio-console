import { useState } from 'react';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

export default function SettingsPage() {
  const { show } = useToastStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [readOnly, setReadOnly] = useState(true);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      show('모든 항목을 입력해주세요', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      show('새 비밀번호가 일치하지 않습니다', 'error');
      return;
    }
    if (newPassword.length < 8) {
      show('새 비밀번호는 8자 이상이어야 합니다', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      show('비밀번호가 변경되었습니다', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setReadOnly(true);
    } catch (e: any) {
      show(e.response?.data?.message || '비밀번호 변경에 실패했습니다', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-geo-deep border border-geo-border rounded-lg text-sm text-txt-primary placeholder-txt-muted focus:outline-none focus:border-status-purple";

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-txt-primary">설정</h2>
        <p className="text-xs text-txt-muted mt-0.5">계정 설정</p>
      </div>

      <div className="max-w-[480px]">
        <div className="bg-geo-card border border-geo-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-txt-primary mb-4">비밀번호 변경</h3>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-txt-muted mb-1.5">현재 비밀번호</label>
              <input
                type="password"
                value={currentPassword}
                readOnly={readOnly}
                onFocus={() => setReadOnly(false)}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호 입력"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs text-txt-muted mb-1.5">새 비밀번호</label>
              <input
                type="password"
                value={newPassword}
                readOnly={readOnly}
                onFocus={() => setReadOnly(false)}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 입력 (8자 이상)"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs text-txt-muted mb-1.5">새 비밀번호 확인</label>
              <input
                type="password"
                value={confirmPassword}
                readOnly={readOnly}
                onFocus={() => setReadOnly(false)}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 재입력"
                className={inputClass}
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="w-full py-2.5 text-sm font-medium bg-status-purple text-white rounded-lg hover:bg-status-purple/80 transition-all disabled:opacity-50"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
