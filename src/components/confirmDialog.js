import { createElement } from '../utils/dom.js';

export function showConfirmDialog({ title = 'Confirm Action', message = 'Are you sure you want to proceed?', confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) {
  return new Promise((resolve) => {
    let dialog;

    const closeDialog = (result) => {
      dialog.classList.add('opacity-0');
      dialog.querySelector('.dialog-content').classList.add('scale-95');
      setTimeout(() => {
        if (dialog.parentNode) {
          dialog.parentNode.removeChild(dialog);
        }
        resolve(result);
      }, 200);
    };

    const confirmBtnClass = isDanger 
      ? 'bg-error text-on-error hover:bg-error/90' 
      : 'bg-primary text-on-primary hover:bg-primary/90';

    dialog = createElement('div', {
      class: 'fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 transition-opacity duration-200 opacity-0'
    }, [
      createElement('div', {
        class: 'dialog-content bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl w-full max-w-sm shadow-xl transition-transform duration-200 scale-95 flex flex-col gap-4'
      }, [
        createElement('h3', { class: 'font-headline-md text-on-surface' }, title),
        createElement('p', { class: 'font-body-md text-on-surface-variant' }, message),
        createElement('div', { class: 'flex justify-end gap-3 mt-2' }, [
          createElement('button', {
            class: 'px-4 py-2 border border-outline text-secondary font-label-bold rounded-lg hover:bg-surface-container transition-colors',
            onclick: () => closeDialog(false)
          }, cancelText),
          createElement('button', {
            class: `px-4 py-2 rounded-lg font-label-bold transition-all ${confirmBtnClass}`,
            onclick: () => closeDialog(true)
          }, confirmText)
        ])
      ])
    ]);

    document.body.appendChild(dialog);

    // Fade in
    setTimeout(() => {
      dialog.classList.remove('opacity-0');
      dialog.querySelector('.dialog-content').classList.remove('scale-95');
    }, 10);
  });
}
