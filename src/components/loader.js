import { createElement } from '../utils/dom.js';

export function createLoader(text = 'Loading...') {
  return createElement('div', { class: 'flex flex-col items-center justify-center p-8 space-y-3 h-full animate-in fade-in duration-300' }, [
    createElement('div', { class: 'relative w-10 h-10' }, [
      createElement('div', { class: 'absolute inset-0 border-4 border-surface-container rounded-full' }),
      createElement('div', { class: 'absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin' })
    ]),
    createElement('p', { class: 'text-sm font-label-bold text-secondary tracking-wide' }, text)
  ]);
}
