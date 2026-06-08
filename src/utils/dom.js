/**
 * DOM Utilities for BuildGuard
 */

/**
 * Create a DOM element with attributes, event listeners, and children
 * @param {string} tag - HTML tag name (e.g., 'div', 'button')
 * @param {Object} [props] - HTML attributes and events
 * @param {Array|string|Element} [children] - Child elements or text
 * @returns {HTMLElement}
 */
export function createElement(tag, props = {}, children = []) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else if (key === 'class' || key === 'className') {
      element.className = value;
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(element.dataset, value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else {
      element.setAttribute(key, value);
    }
  }

  const childrenArray = Array.isArray(children) ? children : [children];
  for (const child of childrenArray) {
    if (child === null || child === undefined) continue;
    if (child instanceof Node) {
      element.appendChild(child);
    } else {
      element.appendChild(document.createTextNode(String(child)));
    }
  }

  return element;
}

/**
 * Clear an element and render a new element inside it
 * @param {HTMLElement} parent - Parent element
 * @param {HTMLElement|string} child - Element to render or HTML string
 */
export function render(parent, child) {
  if (!parent) return;
  parent.innerHTML = '';
  if (child instanceof Node) {
    parent.appendChild(child);
  } else if (typeof child === 'string') {
    parent.innerHTML = child;
  }
}
