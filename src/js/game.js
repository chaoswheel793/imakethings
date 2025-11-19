// src/js/game.js – FINAL: Tool Wear + Accuracy Scoring + Hidden Shape System
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/PointerLockControls.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/OrbitControls.js';
import { PlayerController } from './player-controller.js';
import { getDeltaTime } from './utils.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2c1810);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    // Controls
    this.pointerLock = new PointerLockControls(this.camera, canvas);
    this.orbit = new OrbitControls(this.camera, canvas);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.05;

    this.player = new PlayerController(this.camera, canvas, this);
    this.scene.add(this.player.group);

    // Game state
    this.mode = 'fps'; // 'fps' or 'inspect'
    this.keys = {};
    this.chiselVisible = false;
    this.isCarving = false;
    this.carvingBlock = null;

    // CRAFTSMANSHIP SYSTEMS
    this.points = 500;
    this.toolWear = 0;
    this.maxToolWear = 100;
    this.sharpenCost = 80;
    this.carvingEfficiency = 1.0;

    // Hidden target shape + scoring
    this.targetVoxels = new Set();
    this.carvedVoxels = new Set();

    this.lastTap = 0;
  }

  async init() {
    this.setupLighting();
    this.createFloor();
    this.createWorkshop();
    this.createChisel();
    this.generateHiddenShape(); // ← NEW: secret target
    this.setupInput();
    this.setMode('fps');
    this.resize();
    this.hideLoading?.();
    this.updateUI();
  }

  setupLighting() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffeecc, 4);
    sun.position.set(5, 10, 7);
    sun.castShadow = true;
    this.scene.add(sun);
  }

  createFloor() {
    const grid = new THREE.GridHelper(100, 100, 0xffffff, 0x555555);
    this.scene.add(grid);
  }

  createWorkshop() {
    const bench = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    bench.add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 2.5), wood));
    bench.add(new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 3), wood).translateY(1));
    bench.position.z = -5;
    this.scene.add(bench);

    const geo = new THREE.BoxGeometry(1, 1, 1, 48, 48, 48);
    const mat = new THREE.MeshStandardMaterial({ color: 0xDEB887, transparent: true, opacity: 0.7 });
    this.carvingBlock = new THREE.Mesh(geo, mat);
    this.carvingBlock.position.set(0, 1.2, -5);
    bench.add(this.carvingBlock);

    this.orbit.target.copy(this.carvingBlock.position);
  }

  createChisel() {
    this.chisel = new THREE.Group();
    this.chisel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4), new THREE.MeshStandardMaterial({ color: 0x8B4513 })));
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95 }));
    blade.position.y = 0.35;
    this.chisel.add(blade);
    this.chisel.scale.set(1.4, 1.4, 1.4);
    this.chisel.visible = false;
    this.scene.add(this.chisel);
  }

  // NEW: Generate hidden target shape (e.g. a sphere)
  generateHiddenShape() {
    const center = this.carvingBlock.position.clone().add(new THREE.Vector3(0, 0.5, 0));
    const radius = 0.38;

    for (let x = -0.5; x <= 0.5; x += 0.0625) {
      for (let y = 0; y <= 1; y += 0.0625) {
        for (let z = -0.5; z <= 0.5; z += 0.0625) {
          const worldPos = new THREE.Vector3(x, y, z).add(this.carvingBlock.position);
          if (worldPos.distanceTo(center) <= radius) {
            const local = new THREE.Vector3(x, y, z);
            this.targetVoxels.add(`${local.x.toFixed(4)},${local.y.toFixed(4)},${local.z.toFixed(4)}`);
          }
        }
      }
    }
    console.log(`Hidden shape generated: ${this.targetVoxels.size} voxels`);
  }

  // NEW: Track carved material
  markCarvedVoxel(worldPos) {
    const local = worldPos.clone().sub(this.carvingBlock.position);
    const key = `${local.x.toFixed(4)},${local.y.toFixed(4)},${local.z.toFixed(4)}`;
    this.carvedVoxels.add(key);
    this.addToolWear(0.8);
  }

  // NEW: Tool wear system
  addToolWear(amount = 1) {
    this.toolWear = Math.min(this.maxToolWear, this.toolWear + amount);
    this.updateCarvingEfficiency();

    // Visual dulling
    const ratio = this.toolWear / this.maxToolWear;
    const blade = this.chisel.children[1];
    if (blade) {
      blade.material.color.setRGB(
        THREE.MathUtils.lerp(1.0, 0.6, ratio),
        THREE.MathUtils.lerp(1.0, 0.4, ratio),
        THREE.MathUtils.lerp(1.0, 0.3, ratio)
      );
    }
  }

  updateCarvingEfficiency() {
    const ratio = this.toolWear / this.maxToolWear;
    this.carvingEfficiency = THREE.MathUtils.lerp(0.35, 1.0, 1 - ratio);
  }

  sharpenTool() {
    if (this.points >= this.sharpenCost) {
      this.points -= this.sharpenCost;
      this.toolWear = 0;
      this.updateCarvingEfficiency();
      const blade = this.chisel.children[1];
      if (blade) blade.material.color.setRGB(1, 1, 1);
      this.showMessage('Chisel Sharpened!', 2000, '#00ff00');
      this.updateUI();
    } else {
      this.showMessage('Not enough points!', 2000, '#ff4444');
    }
  }

  // NEW: Final accuracy score
  calculateScore() {
    let correct = 0, overcut = 0, missed = 0;

    for (let key of this.carvedVoxels) {
      if (this.targetVoxels.has(key)) correct++;
      else overcut++;
    }
    for (let key of this.targetVoxels) {
      if (!this.carvedVoxels.has(key)) missed++;
    }

    const accuracy = correct / (correct + overcut + missed || 1);
    const completeness = correct / this.targetVoxels.size;
    const stylePenalty = overcut / (correct + overcut + 1);

    const finalScore = Math.round(10000 * accuracy * completeness * (1 - stylePenalty * 0.6));

    return {
      score: finalScore,
      accuracy: (accuracy * 100).toFixed(1) + '%',
      completeness: (completeness * 100).toFixed(1) + '%',
      overcut,
      style: stylePenalty < 0.15 ? 'Masterful' : stylePenalty < 0.4 ? 'Elegant' : 'Bold',
      pointsEarned: finalScore
    };
  }

  setupInput() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space' && !e.repeat) this.toggleMode();
      if (e.code === 'KeyR') this.sharpenTool(); // R = sharpen
    });
    window.addEventListener('keyup', e => this.keys[e.code] = false);

    let taps = 0;
    this.canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - this.lastTap < 300) {
          this.toggleMode();
          taps = 0;
        } else {
          taps++;
          this.lastTap = now;
          setTimeout(() => taps = 0, 350);
        }
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.mode === 'inspect') this.setMode('fps');
    });
  }

  toggleMode() {
    this.setMode(this.mode === 'fps' ? 'inspect' : 'fps');
  }

  setMode(mode) {
    this.mode = mode;
    this.pointerLock.enabled = mode === 'fps';
    this.orbit.enabled = mode === 'inspect';

    if (mode === 'fps') {
      this.canvas.requestPointerLock();
      this.chisel.visible = true;
    } else {
      document.exitPointerLock();
      this.chisel.visible = false;
    }
    this.updateUI();
  }

  updateUI() {
    // Simple overlay (you can replace with real UI later)
    let ui = document.getElementById('game-ui') || document.createElement('div');
    ui.id = 'game-ui';
    ui.style.cssText = 'position:fixed;top:10px;left:10px;color:white;font-family:Arial;z-index:100;pointer-events:none;';
    ui.innerHTML = `
      Points: ${this.points} | 
      Tool Wear: ${this.toolWear.toFixed(0)}% | 
      Efficiency: ${(this.carvingEfficiency*100).toFixed(0)}% 
      <br><small>Press R to sharpen (${this.sharpenCost} pts) • Space = Inspect Mode</small>
    `;
    document.body.appendChild(ui);
  }

  showMessage(text, duration = 2000, color = '#ffffff') {
    let msg = document.createElement('div');
    msg.textContent = text;
    msg.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                         background:rgba(0,0,0,0.8);color:${color};padding:20px 40px;
                         font-size:24px;border-radius:12px;z-index:1000;pointer-events:none;`;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), duration);
  }

  update(delta) {
    if (this.mode === 'fps') {
      this.player.update(delta, this.keys);
      this.orbit.update();

      if (this.chisel.visible) {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        this.chisel.position.copy(this.camera.position).addScaledVector(dir, 0.6).sub(new THREE.Vector3(0, 0.4, 0));
        this.chisel.quaternion.copy(this.camera.quaternion);
        this.chisel.rotateX(-1.4);
      }
    }
  }

  render() { this.renderer.render(this.scene, this.camera); }
  loop = (t) => {
    const delta = getDeltaTime(t);
    this.update(delta);
    this.render();
    requestAnimationFrame(this.loop);
  };
  start() { requestAnimationFrame(this.loop); }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
