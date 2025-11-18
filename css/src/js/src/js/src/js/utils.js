export let lastTime = 0;
export function getDeltaTime(currentTime) {
  const delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  return Math.min(delta, 1/30);
}

export function log(...args) {
  console.log('%c[I Make Things]', 'color: #ff3366; font-weight: bold;', ...args);
}

export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
