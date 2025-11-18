// src/js/utils.js – All helpers fixed
export let lastTime = 0;
export function getDeltaTime(currentTime) {
  const delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  return Math.min(delta, 1/30);
}

export function log(...args) {
  console.log('%c[I Make Things]', 'color: #ff3366; font-weight: bold;', ...args);
}

export function getInputVector(e) {
  const rect = e.target.getBoundingClientRect();
  const x = (e.clientX || e.touches[0].clientX) - rect.left;
  const y = (e.clientY || e.touches[0].clientY) - rect.top;
  return { x: (x / rect.width) * 2 - 1, y: -(y / rect.height) * 2 + 1 };
}

export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
