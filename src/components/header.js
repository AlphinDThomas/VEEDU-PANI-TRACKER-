import { createElement } from '../utils/dom.js';
import { searchModal } from './searchModal.js';
import { navigateTo } from '../router.js';

const HEADER_LOGO_SRC = '/logo.jpg';

export function createHeader() {
  const onSearchClick = () => {
    searchModal.show();
  };

  const onAvatarClick = () => {
    navigateTo('settings');
  };

  return createElement('header', {
    class: 'w-full top-0 sticky bg-surface border-b border-outline-variant z-40 flex justify-between items-center px-container-padding h-touch-target-min shadow-xs'
  }, [
    // Brand & Profile Logo
    createElement('div', { class: 'flex items-center gap-3' }, [
      createElement('button', {
        class: 'w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm border border-primary transition-transform active:scale-95 cursor-pointer overflow-hidden',
        title: 'Settings',
        onclick: onAvatarClick
      }, [
        createElement('img', {
          src: HEADER_LOGO_SRC,
          alt: 'Settings',
          class: 'w-full h-full object-cover',
          onError: (event) => {
            event.currentTarget.classList.add('hidden');
            event.currentTarget.nextSibling?.classList.remove('hidden');
          }
        }),
        createElement('span', { class: 'hidden' }, 'BG')
      ]),
      createElement('span', {
        class: 'font-headline-md text-primary font-bold cursor-pointer select-none',
        onclick: () => navigateTo('dashboard')
      }, 'Veedu Pani Tracker')
    ]),

    // Action Buttons
    createElement('div', { class: 'flex items-center gap-2' }, [
      createElement('button', {
        class: 'material-symbols-outlined text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full cursor-pointer',
        title: 'Global Search',
        onclick: onSearchClick
      }, 'search'),
      createElement('button', {
        class: 'material-symbols-outlined text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full cursor-pointer',
        title: 'Calendar view',
        onclick: () => navigateTo('calendar')
      }, 'calendar_today')
    ])
  ]);
}
