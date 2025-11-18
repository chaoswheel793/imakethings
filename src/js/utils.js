// src/js/utils.js – Enhanced utilities

// Namespaced logging
export function log(...args) {
  console.log('%c[I Make Things]', 'color: #ff3366; font-weight: bold;', ...args);
}

export function warn(...args) {
  console.warn('%c[I Make Things]', 'color: #ff3366; font-weight: bold;', ...args);
}

export function error(...args) {
  console.error('%c[I Make Things]', 'color: #ff3366; font-weight: bold;', ...args);
}

// Mobile detection
export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Unique ID generator
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Delta time for smooth updates (prevents frame skips on mobile)
export let lastTime = 0;
export function getDeltaTime(currentTime) {
  const delta = (currentTime - lastTime) / 1000; // Seconds
  lastTime = currentTime;
  return Math.min(delta, 1/30); // Cap at ~30FPS for logic (avoids jank)
}

// Touch/mouse helper for first-person controls
export function getInputVector(e) {
  const rect = e.target.getBoundingClientRect();
  const x = (e.clientX || e.touches[0].clientX) - rect.left;
  const y = (e.clientY || e.touches[0].clientY) - rect.top;
  return { x: (x / rect.width) * 2 - 1, y: -(y / rect.height) * 2 + 1 };
}
