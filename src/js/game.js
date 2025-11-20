import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/PointerLockControls.js';
import { Player } from './Player.js';
import { createChisel } from './Tools.js';

export class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    this.clock = new THREE.Clock();
    this.keys = {};
    this.interactables = [];

    // Player & hands
    this.player = new Player(this.camera, this.scene);

    // Controls
    this.controls = new PointerLockControls(this.camera, document.body);
    this.scene.add(this.controls.getObject());

    this.setupLightingAndFloor();
    this.chisel = createChisel(this.scene);
    this.interactables.push(this.chisel);

    this.setupInput();
    this.fadeOutLoading();

    window.addEventListener('resize', () => this.onResize());
  }

  setupLightingAndFloor() {
    this.scene.background = new THREE.Color(0x2a2a2a);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.6);
    this.scene.add(hemi);

    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(8, 15, 8);
    light.castShadow = true;
    this.scene.add(light);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0x8b7355 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  setupInput() {
    document.addEventListener('keydown', e => this.keys[e.code] = true);
    document.addEventListener('keyup', e => this.keys[e.code] = false);

    // Mouse / touch grab
    const tryGrab = () => this.player.tryGrab(this.interactables);
    document.addEventListener('pointerdown', e => {
      if (e.button === 0 || e.isPrimary) tryGrab();
    });

    // E or tap to drop
    document.addEventListener('keydown', e => {
      if (e.code === 'KeyE') this.player.drop();
    });

    // Mobile double-tap = drop
    let tapCount = 0;
    document.addEventListener('touchend', () => {
      tapCount++;
      if (tapCount === 2) {
        this.player.drop();
        tapCount = 0;
      }
      setTimeout(() => tapCount = 0, 400);
    });

    this.controls.addEventListener('lock', () => document.body.style.cursor = 'none');
    this.controls.addEventListener('unlock', () => document.body.style.cursor = 'grab');
    document.addEventListener('click', () => this.controls.lock());
  }

  fadeOutLoading() {
    const loading = document.getElementById('loading');
    setTimeout(() => loading.classList.add('fade-out'), 800);
    setTimeout(() => loading.remove(), 1600);
  }

  init() {
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    // Update movement
    this.player.move.forward = this.keys['KeyW'] || this.keys['ArrowUp'];
    this.player.move.backward = this.keys['KeyS'] || this.keys['ArrowDown'];
    this.player.move.left = this.keys['KeyA'] || this.keys['ArrowLeft'];
    this.player.move.right = this.keys['KeyD'] || this.keys['ArrowRight'];

    this.player.update(delta, this.keys);

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
