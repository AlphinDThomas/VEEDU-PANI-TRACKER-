import { createElement } from '../utils/dom.js';

class ToastContainer {
  constructor() {
    this.el = null;
    this.init();
  }

  init() {
    this.el = createElement('div', {
      class: 'fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none'
    });
    document.body.appendChild(this.el);
  }

  show(message, type = 'success', duration = 3000) {
    if (!this.el) this.init();

    let bgClass = 'bg-green-600 text-white';
    let icon = 'check_circle';

    if (type === 'error') {
      bgClass = 'bg-error text-on-error';
      icon = 'error';
    } else if (type === 'info') {
      bgClass = 'bg-tertiary text-white';
      icon = 'info';
    }

    const toast = createElement('div', {
      class: `${bgClass} p-4 rounded-xl shadow-lg flex items-center gap-3 transition-all duration-300 translate-y-[-20px] opacity-0 pointer-events-auto`
    }, [
      createElement('span', { class: 'material-symbols-outlined' }, icon),
      createElement('span', { class: 'font-label-bold text-sm flex-grow' }, message),
      createElement('button', {
        class: 'material-symbols-outlined text-sm opacity-75 hover:opacity-100 p-1 rounded-full hover:bg-black/10',
        onclick: () => this.removeToast(toast)
      }, 'close')
    ]);

    this.el.appendChild(toast);

    // Trigger transition
    setTimeout(() => {
      toast.classList.remove('translate-y-[-20px]', 'opacity-0');
    }, 10);

    // Auto-remove
    const timer = setTimeout(() => {
      this.removeToast(toast);
    }, duration);

    toast.dataset.timer = timer;
  }

  removeToast(toast) {
    if (toast.dataset.timer) {
      clearTimeout(parseInt(toast.dataset.timer));
    }
    toast.classList.add('translate-y-[-20px]', 'opacity-0');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
}

const toastManager = new ToastContainer();

export const showToast = (message, type, duration) => toastManager.show(message, type, duration);
