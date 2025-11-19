// src/js/game.js – FINAL REFINED FPS + INSPECT + INTERACTION SYSTEM
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/PointerLockControls.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/OrbitControls.js';
import { PlayerController } from './player-controller.js';
import { getDeltaTime } from './utils.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a0f0a);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    // Controls
    this.pointerLock = new PointerLockControls(this.camera, canvas);
    this.orbit = new OrbitControls(this.camera, canvas);
    this.orbit.enableDamping = true;
    this.orbit.target.set(0, 1.2, -5);

    this.player = new PlayerController(this.camera, canvas, this);
    this.scene.add(this.player.group);

    // Game State
    this.mode = 'fps'; // 'fps' or 'inspect'
    this.keys = {};
    this.holdingItem = null;
    this.chiselVisible = false;
    this.isCarving = false;
    this.carvingBlock = null;
    this.raycaster = new THREE.Raycaster();
    this.lastTap = 0;

    // Interaction
    this.hoveredObject = null;
  }

  async init() {
    this.setupLighting();
    this.createFloor();
    this.createWorkshop();
    this.createChisel();
    this.createCarvingBlock();
    this.setupInput();
    this.setMode('fps');
    this.resize();
    this.hideLoading?.();
  }

  setupLighting() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffeecc, 5);
    sun.position.set(8, 15, 10);
    sun.castShadow = true;
    this.scene.add(sun);
  }

  createFloor() {
    const grid = new THREE.GridHelper(100, 100, 0xffffff, 0x444444);
    this.scene.add(grid);
  }

  createWorkshop() {
    const bench = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    bench.add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 2.5), wood));
    bench.add(new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 3), wood).translateY(1));
    bench.position.z = -5;
    this.scene.add(bench);
  }

  createChisel() {
    this.chisel = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95 }));
    blade.position.y = 0.35;
    this.chisel.add(handle, blade);
    this.chisel.scale.set(1.5, 1.5, 1.5);
    this.chisel.visible = false;
    this.scene.add(this.chisel);
  }

  createCarvingBlock() {
    const geo = new THREE.BoxGeometry(1, 1, 1, 64, 64, 64);
    const mat = new THREE.MeshStandardMaterial({ color: 0xDEB887, roughness: 0.8 });
    this.carvingBlock = new THREE.Mesh(geo, mat);
    this.carvingBlock.position.set(0, 1.2, -5);
    this.carvingBlock.userData.isInteractable = true;
    this.carvingBlock.userData.type = 'block';
    this.scene.add(this.carvingBlock);
  }

  setupInput() {
    // Keyboard
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space') this.toggleMode();
      if (e.code === 'KeyE') this.interact();
    });
    window.addEventListener('keyup', e => this.keys[e.code] = false);

    // Mouse
    this.canvas.addEventListener('click', () => {
      if (this.mode === 'inspect') this.setMode('fps');
      else if (!this.holdingItem) this.interact();
    });

    // Touch Gestures
    this.canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - this.lastTap < 300) this.toggleMode();
        else this.lastTap = now;
      }
    });
  }

  interact() {
    const intersect = this.getIntersect();
    if (!intersect) return;

    if (!this.holdingItem && intersect.object.userData.isInteractable) {
      this.grabItem(intersect.object);
    }
  }

  grabItem(obj) {
    this.holdingItem = obj;
    this.scene.remove(obj);
    this.player.rightHand.add(obj);
    obj.position.set(0.2, -0.1, -0.3);
    obj.rotation.set(0, 0, Math.PI / 2);

    if (obj.userData.type === 'block') {
      this.chiselVisible = true;
      this.chisel.visible = true;
    }
  }

  dropItem() {
    if (!this.holdingItem) return;
    this.player.rightHand.remove(this.holdingItem);
    this.scene.add(this.holdingItem);
    this.holdingItem.position.copy(this.player.group.position).add(new THREE.Vector3(0, 1.6, -2));
    this.holdingItem = null;
    this.chiselVisible = false;
    this.chisel.visible = false;
  }

  getIntersect() {
    this.raycaster.setFromCamera(new THREE.Vector2(), this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    return intersects[0] || null;
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
      if (this.holdingItem?.userData.type === 'block') {
        this.chiselVisible = true;
        this.chisel.visible = true;
      }
    } else {
      document.exitPointerLock();
      this.dropItem();
    }
  }

  update(delta) {
    if (this.mode === 'fps') {
      this.player.update(delta, this.keys);

      if (this.chiselVisible) {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        this.chisel.position.copy(this.camera.position).addScaledVector(dir, 0.7).sub(new THREE.Vector3(0, 0.4, 0));
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
