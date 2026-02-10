import { useToastStore } from '../stores/toast.store';

export default function Toast() {
  const { message, type, hide } = useToastStore();

  if (!message) return null;

  // 어두운 배경 + 글씨색만 구분 (임시 저장 뱃지 스타일)
  const textColor = {
    success: 'text-[#4ade80]',
    error: 'text-[#f87171]',
    info: 'text-[#fbbf24]',
  }[type];

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      <div
        className={`bg-[#1e1e1e] border border-[#333] ${textColor} px-6 py-3 rounded-lg shadow-xl pointer-events-auto cursor-pointer animate-fade-in max-w-md text-center`}
        onClick={hide}
      >
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}
