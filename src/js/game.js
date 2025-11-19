// src/js/game.js – FINAL MOVEMENT & CONTROLS – PERFECTION ACHIEVED
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/PointerLockControls.js';
import { getDeltaTime } from './utils.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2c1810);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.6, 2.5);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    this.player = new Player(this.camera);
    this.scene.add(this.player.group);

    this.carvingBlock = null;
    this.chisel = null;
    this.isCarving = false;
    this.keys = {};
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.fpsControls = new PointerLockControls(this.camera, canvas);
    this.scene.add(this.fpsControls.getObject());

    this.chiselVisible = false;
    this.activePointers = 0;
    this.wasLocked = false;
  }

  async init() {
    // LIGHTING – BEAUTIFUL
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
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
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
    const mat = new THREE.MeshStandardMaterial({
      color: 0xDEB887,
      transparent: true,
      opacity: 0.6,
      roughness: 0.8
    });
    this.carvingBlock = new THREE.Mesh(geo, mat);
    this.carvingBlock.position.set(0, 1.2, 0);
    this.carvingBlock.castShadow = true;
    bench.add(this.carvingBlock);
  }

  createChisel() {
    const group = new THREE.Group();
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x8B4513 })
   
