// src/js/game.js – JUMP WORKS + PERFECT TOUCHPAD + MOUSE WHEEL SUPPORT
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

    // Fresh controller
    this.playerController = new PlayerController(this.camera, this.canvas);
    this.scene.add(this.playerController.group);

    // Input state
    this.keys = {};
    this.fpsControls = new PointerLockControls(this.camera, canvas);
    this.scene.add(this.fpsControls.getObject());

    this.chiselVisible = false;
    this.chisel = null;

    // Touchpad / trackpad state
    this.twoFingerDeltaY = 0;
    this.isOneFingerDown = false;
    this.turnDeltaX = 0;
  }

  async init() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffeecc, 4);
    sun.position.set(5, 10, 7);
    sun.castShadow = true;
    this.scene.add(sun);

    this.createWorkshop();
    this.createChisel();
    this.setupInput();

    this.resize();
    this.hideLoading?.();
  }

  createWorkshop() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const bench = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 2.5), wood);
    const top = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 3), wood);
    base.position.y = 0.4; top.position.y = 1;
    base.castShadow = top.castShadow = true;
    bench.add(base, top);
    this.scene.add(bench);

    const geo = new THREE.BoxGeometry(1, 1, 1, 48, 48, 48);
    const mat = new THREE.MeshStandardMaterial({ color: 0xDEB887, transparent: true, opacity: 0.6, roughness: 0.8 });
    const block = new THREE.Mesh(geo, mat);
    block.position.set(0, 1.2, 0);
    block.castShadow = true;
    bench.add(block);
    this.carvingBlock = block;
  }

  createChisel() {
    const group = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95 }));
    blade.position.y = 0.35;
    group.add(handle, blade);
    group.scale.set(1.4, 1.4, 1.4);
    group.visible = false;
    this.scene.add(group);
    this.chisel = group;
  }

  setupInput() {
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Keyboard
    window.addEventListener('keydown', e => { this.keys[e.code] = true; });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    // Pointer lock (click to capture mouse)
    this.canvas.addEventListener('click', () => this.fpsControls.lock());
    this.fpsControls.addEventListener('lock', () => {
      if (!this.chiselVisible) {
        this.chisel.visible = true;
        this.chiselVisible = true;
      }
    });

    // === TOUCHPAD / TRACKPAD SUPPORT ===
    let touchCount = 0;
    let lastTouchY = 0;
    let lastSingleTouchX = 0;

    this.canvas.addEventListener('touchstart', e => {
      touchCount = e.touches.length;
      if (touchCount === 1) {
        this.isOneFingerDown = true;
        lastSingleTouchX = e.touches[0].clientX;
      }
      if (touchCount === 2) lastTouchY = e.touches[0].clientY + e.touches[1].clientY;
    });

    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (touchCount === 2) {
        const currentY = e.touches[0].clientY + e.touches[1].clientY;
        this.twoFingerDeltaY = (lastTouchY - currentY) * 0.08; // forward/back
        lastTouchY = currentY;
      }
      if (touchCount === 2 && this.isOneFingerDown) {
        const currentX = e.touches[0].clientX; // second finger
        this.turnDeltaX = (lastSingleTouchX - currentX) * 0.004;
        lastSingleTouchX = currentX;
      }
    });

    this.canvas.addEventListener('touchend', () => {
      touchCount = 0;
      this.twoFingerDeltaY = 0;
      this.turnDeltaX = 0;
      this.isOneFingerDown = false;
    });

    // Mouse wheel = forward/back like two-finger swipe
    this.canvas.addEventListener('wheel', e => {
      this.twoFingerDeltaY = e.deltaY * 0.05;
    });
  }

  update(delta) {
    // Pass simulated keys from touchpad
    if (this.twoFingerDeltaY > 5) this.keys['KeyW'] = true, this.keys['KeyS'] = false;
    else if (this.twoFingerDeltaY < -5) this.keys['KeyS'] = true, this.keys['KeyW'] = false;
    else this.keys['KeyW'] = this.keys['KeyW'] || false, this.keys['KeyS'] = this.keys['KeyS'] || false;

    // Turn from second finger
    if (Math.abs(this.turnDeltaX) > 0.01) {
      this.playerController.yaw -= this.turnDeltaX;
    }

    // ALWAYS PASS KEYS TO CONTROLLER
    this.playerController.update(delta, this.keys);

    // Chisel follow camera
    if (this.chisel?.visible) {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.chisel.position.copy(this.camera.position).add(dir.multiplyScalar(0.6)).sub(new THREE.Vector3(0, 0.4, 0));
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
