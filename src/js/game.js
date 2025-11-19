// src/js/game.js – FINAL WORKING VERSION for GitHub Pages + Lenovo
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/PointerLockControls.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/loaders/GLTFLoader.js';
import { getDeltaTime } from './utils.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2c1810);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.6, 5);

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
    this.orbitControls = new OrbitControls(this.camera, canvas);
    this.orbitControls.enabled = false;
    this.currentMode = 'fps';

    this.scene.add(this.fpsControls.getObject());
  }

  async init() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);
    const light = new THREE.PointLight(0xffddaa, 2.5, 50);
    light.position.set(0, 10, 0);
    light.castShadow = true;
    this.scene.add(light);

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
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 2.5), woodMat);
    const top = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 3), woodMat);
    base.position.y = 0.4;
    top.position.y = 1;
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
    );
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9 })
    );
    blade.position.y = 0.35;
    group.add(handle, blade);
    group.scale.set(0.7, 0.7, 0.7);
    group.visible = false;
    this.scene.add(group);
    this.chisel = group;
  }

  setupInput() {
    window.addEventListener('keydown', e => this.keys[e.code] = true);
    window.addEventListener('keyup', e => this.keys[e.code] = false);

    this.canvas.addEventListener('click', () => {
      if (this.currentMode === 'fps') this.fpsControls.lock();
    });

    let lastTap = 0;
    this.canvas.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastTap < 300) this.toggleMode();
      lastTap = now;
    });
    window.addEventListener('keydown', e => {
      if (e.code === 'Space') { e.preventDefault(); this.toggleMode(); }
    });

    this.canvas.addEventListener('pointerdown', () => { if (this.chisel.visible) this.isCarving = true; });
    this.canvas.addEventListener('pointerup', () => this.isCarving = false);
    this.canvas.addEventListener('pointermove', e => this.carve(e));
  }

  carve(event) {
    if (!this.isCarving || !this.carvingBlock) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(this.carvingBlock);
    if (hits.length === 0) return;

    const point = hits[0].point;
    const geo = this.carvingBlock.geometry;
    const pos = geo.attributes.position;
    const radius = 0.18;

    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      const worldV = v.clone().applyMatrix4(this.carvingBlock.matrixWorld);
      const dist = point.distanceTo(worldV);
      if (dist < radius) {
        const strength = 1 - (dist / radius);
        v.lerp(point, strength * 0.025);
        pos.setXYZ(i, v.x, v.y, v
