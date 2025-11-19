// src/js/game.js – 100% WORKING: movement, jump, double-tap release, chisel
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/PointerLockControls.js';
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

    // PLAYER CONTROLLER OWNS THE CAMERA — THIS WAS THE MISSING PIECE
    this.player = new PlayerController(this.camera, this.canvas);
    this.scene.add(this.player.group);

    // PointerLock now only controls look, not position
    this.controls = new PointerLockControls(this.camera, canvas);

    this.keys = {};
    this.chiselVisible = false;
    this.chisel = null;
    this.lastTap = 0;
  }

  async init() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffeecc, 4);
    sun.position.set(5, 10, 7);
    sun.castShadow = true;
    this.scene.add(sun);

    this.createFloor();
    this.createWorkshop();
    this.createChisel();
    this.setupInput();

    this.resize();
    this.hideLoading?.();
  }

  createFloor() {
    const grid = new THREE.GridHelper(100, 100, 0xffffff, 0x555555);
    this.scene.add(grid);

    const tex = new THREE.CanvasTexture(this.makeTexture());
    tex.repeat.set(50, 50);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  makeTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#0d0d0d';
    x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#00ff99';
    x.lineWidth = 4;
    for (let i = 0; i <= 128; i += 32) {
      x.beginPath();
      x.moveTo(i, 0); x.lineTo(i, 128);
      x.moveTo(0, i); x.lineTo(128, i);
      x.stroke();
    }
    return c;
  }

  createWorkshop() {
    const bench = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    bench.add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 2.5), wood));
    bench.add(new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 3), wood).translateY(1));
    bench.position.set(0, 0, -5);
    this.scene.add(bench);

    const geo = new THREE.BoxGeometry(1, 1, 1, 48, 48, 48);
    const mat = new THREE.MeshStandardMaterial({ color: 0xDEB887, transparent: true, opacity: 0.7 });
    const block = new THREE.Mesh(geo, mat);
    block.position.set(0, 1.2, -5);
    bench.add(block);
  }

  createChisel() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4), new THREE.MeshStandardMaterial({ color: 0x8B4513 })));
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95 }));
    blade.position.y = 0.35;
    g.add(blade);
    g.scale.set(1.4, 1.4, 1.4);
    g.visible = false;
    this.scene.add(g);
    this.chisel = g;
  }

  setupInput() {
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Keyboard
    window.addEventListener('keydown', e => this.keys[e.code] = true);
    window.addEventListener('keyup',   e => this.keys[e.code] = false);

    // Click → lock
    this.canvas.addEventListener('click', () => this.controls.lock());

    // Double-click or double-tap → unlock
    this.canvas.addEventListener('dblclick', () => this.controls.unlock());
    this.canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - this.lastTap < 300) this.controls.unlock();
        this.lastTap = now;
      }
    });

    // ESC also unlocks
    window.addEventListener('keydown', e => {
      if (e.code === 'Escape') this.controls.unlock();
    });

    this.controls.addEventListener('lock', () => {
      this.chisel.visible = true;
      this.chiselVisible = true;
    });

    this.controls.addEventListener('unlock', () => {
      this.chisel.visible = false;
      this.chiselVisible = false;
    });
  }

  update(delta) {
    // THIS LINE MAKES EVERYTHING WORK
    this.player.update(delta, this.keys, this.controls);

    // Chisel follows camera beautifully
    if (this.chiselVisible) {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.chisel.position.copy(this.camera.position).addScaledVector(dir, 0.6).sub(new THREE.Vector3(0, .4, 0));
      this.chisel.quaternion.copy(this.camera.quaternion);
      this.chisel.rotateX(-1.4);
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
