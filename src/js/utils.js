// src/js/utils.js – Shared utility functions

// Simple namespaced console logging (easy to disable later)
export function log(...args) {
  console.log('%c[Chaos Carver]', 'color: #ff3366; font-weight: bold;', ...args);
}

export function warn(...args) {
  console.warn('%c[Chaos Carver]', 'color: #ff3366; font-weight: bold;', ...args);
}

export function error(...args) {
  console.error('%c[Chaos Carver]', 'color: #ff3366; font-weight: bold;', ...args);
}

// Mobile detection helper
export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Simple unique ID generator (for entities later)
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
