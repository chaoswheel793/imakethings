// src/js/main.js – I Make Things entry point
import { Game } from './game.js';

class IMakeThings {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.loading = document.getElementById('loading');
    this.game = null;
  }

  async init() {
    this.game = new Game(this.canvas);
    await this.game.init();

    this.loading.style.opacity = '0';
    setTimeout(() => this.loading.style.display = 'none', 600);

    this.game.start(); // Starts the main loop
  }

  handleResize = () => {
    if (this.game) this.game.resize();
  };
}

const app = new IMakeThings();
app.init().catch(err => console.error('Init failed:', err));

window.addEventListener('resize', app.handleResize);
window.addEventListener('orientationchange', () => setTimeout(app.handleResize, 300));
