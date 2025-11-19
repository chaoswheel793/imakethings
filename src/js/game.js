// src/js/game.js – FINAL WORKING
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
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

    this.player = new PlayerController(this.camera, canvas);
    this.scene.add(this.player.group);

    this.keys = {};
    this.chiselVisible = false;
    this.chisel = null;
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
    window.addEventListener('keydown', e => this.keys[e.code] = true);
    window.addEventListener('keyup', e => this.keys[e.code] = false);

    this.player.domElement.addEventListener('click', () => this.player.lock());
    this.player.unlock = () => document.exitPointerLock();

    document.addEventListener('pointerlockchange', () => {
      this.chisel.visible = this.player.isLocked;
      this.chiselVisible = this.player.isLocked;
    });
  }

  update(delta) {
    this.player.update(delta, this.keys);

    if (this.chiselVisible) {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.chisel.position.copy(this.camera.position).addScaledVector(dir, 0.6).sub(new THREE.Vector3(0, 0.4, 0));
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
