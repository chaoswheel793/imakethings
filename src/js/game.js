import * as THREE from 'three';
import { PointerLockControls } from 'three/additions/controls/PointerLockControls.js';
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

    // Player root
    this.playerRoot = new THREE.Group();
    this.scene.add(this.playerRoot);
    this.playerRoot.position.y = 1.6;

    // Pointer lock controls
    this.controls = new PointerLockControls(this.camera, document.body);
    this.playerRoot.add(this.controls.getObject());

    // Player with visible arms
    this.player = new Player(this.camera, this.scene);
    this.chisel = createChisel(this.scene);
    this.interactables.push(this.chisel);

    this.setupWorld();
    this.setupControls();
    this.fadeOutLoading();
    window.addEventListener('resize', () => this.onResize());
  }

  setupWorld() {
    this.scene.background = new THREE.Color(0x87ceeb);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
    this.scene.add(hemi);
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(10, 20, 10);
    light.castShadow = true;
    this.scene.add(light);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x8b7355 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  setupControls() {
    const lock = () => this.controls.lock();
    document.addEventListener('click', lock);

    this.controls.addEventListener('lock', () => {
      document.getElementById('instructions').style.display = 'none';
      document.body.style.cursor = 'none';
    });
    this.controls.addEventListener('unlock', () => {
      document.getElementById('instructions').style.display = 'block';
      document.body.style.cursor = 'default';
    });

    document.addEventListener('keydown', e => this.keys[e.code] = true);
    document.addEventListener('keyup', e => this.keys[e.code] = false);

    document.addEventListener('pointerdown', e => {
      if (e.button === 0) this.player.tryGrab(this.interactables);
    });

    document.addEventListener('keydown', e => {
      if (e.code === 'KeyE') this.player.drop();
    });
  }

  fadeOutLoading() {
    setTimeout(() => {
      const el = document.getElementById('loading');
      el.classList.add('fade-out');
      setTimeout(() => el.remove(), 1000);
    }, 500);
  }

  init() {
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    this.player.update(delta, this.keys, this.playerRoot, this.controls);
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
