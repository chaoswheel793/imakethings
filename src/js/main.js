// src/js/main.js – Spinner stays, but fades out when scene is ready
import { Game } from './game.js';

const canvas = document.getElementById('gameCanvas');
const loading = document.getElementById('loading');

const game = new Game(canvas);

game.hideLoading = () => {
  console.log('First frame rendered – hiding spinner');
  loading.style.transition = 'opacity 1s ease-out';
  loading.style.opacity = '0';
  setTimeout(() => loading.style.display = 'none', 1000);
};

(async () => {
  try {
    await game.init();
    game.start();          // Start render loop
  } catch (err) {
    console.error(err);
    loading.innerHTML = 'Load failed – press F12';
  }
})();

window.addEventListener('resize', () => game.resize());
