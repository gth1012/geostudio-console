import { useToastStore } from '../stores/toast.store';

export default function Toast() {
  const { message, type, hide } = useToastStore();

  if (!message) return null;

  const bgColor = {
    success: 'bg-status-green',
    error: 'bg-status-red',
    info: 'bg-status-blue',
  }[type];

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      <div
        className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-xl pointer-events-auto cursor-pointer animate-fade-in max-w-md text-center`}
        onClick={hide}
      >
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}
