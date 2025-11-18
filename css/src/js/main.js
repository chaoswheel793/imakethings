// src/js/main.js – 100% Chromebook-Proof: Hides loading ONLY when scene renders
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

      // This function is called from inside render() — GUARANTEED after first frame
      this.game.hideLoading = () => {
        console.log('Scene rendered – hiding loading');
        this.loading.style.transition = 'opacity 1s';
        this.loading.style.opacity = '0';
        setTimeout(() => this.loading.style.display = 'none', 1000);
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
