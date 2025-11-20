import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';

import { Player } from './Player.js';
import { createChisel } from './Tools.js';

export class Game {
  constructor() {
    this.scene    = new THREE.Scene();
    this.camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('canvas'),
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.clock = new THREE.Clock();
    this.keys = {};
    this.interactables = [];
    this.isPointerLocked = false;

    // Custom FPS setup
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.pitchObject = new THREE.Object3D();
    this.yawObject = new THREE.Object3D();
    this.yawObject.add(this.pitchObject);
    this.pitchObject.add(this.camera);

    this.player = new Player(this.pitchObject, this.scene); // Pass pitchObject as root for look
    this.scene.add(this.yawObject);

    this.setupWorld();
    this.chisel = createChisel(this.scene);
    this.interactables.push(this.chisel);

    this.setupCustomControls();
    this.setupInput();
    this.fadeOutLoading();

    window.addEventListener('resize', () => this.onResize());
  }

  setupWorld() {
    this.scene.background = new THREE.Color(0x2a2a2a);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.8);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(10, 15, 10);
    dir.castShadow = true;
    this.scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0x8b7355 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  setupCustomControls() {
    // Instructions overlay
    const instructions = document.createElement('div');
    instructions.id = 'instructions';
    instructions.style.position = 'absolute';
    instructions.style.top = '10px';
    instructions.style.left = '50%';
    instructions.style.transform = 'translateX(-50%)';
    instructions.style.color = 'white';
    instructions.style.background = 'rgba(0,0,0,0.5)';
    instructions.style.padding = '10px';
    instructions.style.borderRadius = '5px';
    instructions.style.zIndex = '100';
    instructions.innerHTML = 'Click to play: WASD move, Mouse look, Click grab, E drop';
    document.body.appendChild(instructions);

    // Pointer lock
    const toggleLock = () => {
      if (!this.isPointerLocked) {
        document.body.requestPointerLock();
      } else {
        document.exitPointerLock();
      }
    };

    document.addEventListener('click', toggleLock);
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === document.body;
      instructions.style.display = this.isPointerLocked ? 'none' : 'block';
      document.body.style.cursor = this.isPointerLocked ? 'none' : 'grab';
    });

    // Mouse look
    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;
      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= movementX * 0.002;
      this.euler.x -= movementY * 0.002;
      this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
      this.yawObject.rotation.y = this.euler.y;
      this.pitchObject.rotation.x = this.euler.x;
    });
  }

  setupInput() {
    document.addEventListener('keydown', e => this.keys[e.code] = true);
    document.addEventListener('keyup', e => this.keys[e.code] = false);

    const grab = () => this.player.tryGrab(this.interactables);
    document.addEventListener('pointerdown', e => {
      if (e.button === 0 || e.isPrimary) grab();
    });

    document.addEventListener('keydown', e => {
      if (e.code === 'KeyE' || e.code === 'Space') this.player.drop();
    });
  }

  fadeOutLoading() {
    const el = document.getElementById('loading');
    setTimeout(() => el.classList.add('fade-out'), 800);
    setTimeout(() => el.remove(), 1600);
  }

  init() { this.animate(); }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    this.player.move.forward  = this.keys['KeyW'] || this.keys['ArrowUp'];
    this.player.move.backward = this.keys['KeyS'] || this.keys['ArrowDown'];
    this.player.move.left     = this.keys['KeyA'] || this.keys['ArrowLeft'];
    this.player.move.right    = this.keys['KeyD'] || this.keys['ArrowRight'];

    this.player.update(delta);

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
