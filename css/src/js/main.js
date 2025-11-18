// src/js/main.js – FINAL FIX: Hide loading only after first render
import { Game } from './game.js';

class IMakeThings {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.loading = document.getElementById('loading');
    this.game = null;
  }

  async init() {
    try {
      this.game = new Game(this.canvas);
      await this.game.init();

      // CRITICAL: Hide loading ONLY when first frame actually renders
      this.game.onFirstRender = () => {
        console.log('First frame rendered – hiding loading');
        this.loading.style.transition = 'opacity 0.8s';
        this.loading.style.opacity = '0';
        setTimeout(() => this.loading.style.display = 'none', 800);
      };

      this.game.start();
    } catch (err) {
      console.error('Init failed:', err);
      this.loading.innerHTML = 'Error – check console (F12)';
    }
  }

  handleResize = () => this.game?.resize();
}

const app = new IMakeThings();
app.init();

window.addEventListener('resize', app.handleResize);
window.addEventListener('orientationchange', () => setTimeout(app.handleResize, 300));
