import { create } from 'zustand';

interface ToastState {
  message: string | null;
  type: 'success' | 'error' | 'info';
  show: (message: string, type?: 'success' | 'error' | 'info') => void;
  hide: () => void;
}

let toastTimeout: ReturnType<typeof setTimeout> | null = null;
let lastMessage: string | null = null;
let lastMessageTime = 0;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  show: (message, type = 'info') => {
    const now = Date.now();
    // 같은 메시지가 2초 이내에 다시 호출되면 무시
    if (message === lastMessage && now - lastMessageTime < 2000) {
      return;
    }
    lastMessage = message;
    lastMessageTime = now;

    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    set({ message, type });
    toastTimeout = setTimeout(() => {
      set({ message: null });
      lastMessage = null;
    }, 3000);
  },
  hide: () => {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    set({ message: null });
    lastMessage = null;
  },
}));
