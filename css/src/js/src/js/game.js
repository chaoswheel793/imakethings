// src/js/game.js – Full Debug Version: Blue BG + Green Cube + Workshop
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { getDeltaTime } from './utils.js';

export class Game {
  constructor(canvas) {
    console.log('Game constructor');
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Blue to confirm render
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.6, 5);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false }); // Disable antialias for Chromebook
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(1); // Low for mobile
    this.onFirstRender = null;
    this.firstRender = false;

    this.player = new Player(this.camera);
    this.scene.add(this.player.group);
  }

  async init() {
    console.log('Init started');
    // Green cube (fallback)
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geo, mat);
    cube.position.set(0, 1, 0);
    this.scene.add(cube);
    console.log('Green cube added');

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 10, 5);
    this.scene.add(light);
    console.log('Lighting added');

    // Workshop floor
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshLambertMaterial({ color: 0x8B4513 })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    console.log('Floor added');

    // Workbench
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(5, 1, 3),
      new THREE.MeshLambertMaterial({ color: 0x8B4513 })
    );
    bench.position.set(0, 0.5, 0);
    this.scene.add(bench);
    console.log('Workbench added');

    // Wood block
    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    const blockMat = new THREE.MeshLambertMaterial({ color: 0xDEB887, transparent: true, opacity: 0.7 });
    const block = new THREE.Mesh(blockGeo, blockMat);
    block.position.set(0, 1.2, 0);
    this.scene.add(block);
    console.log('Wood block added');

    console.log('Init complete – should see blue BG + green cube + brown floor');
  }

  update(delta) {
    // Rotate cube
    if (this.scene.children.find(c => c.geometry && c.material.color.getHex() === 0x00ff00)) {
      this.scene.children.find(c => c.geometry && c.material.color.getHex() === 0x00ff00).rotation.x += delta;
      this.scene.children.find(c => c.geometry && c.material.color.getHex() === 0x00ff00).rotation.y += delta;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    if (!this.firstRender) {
      this.firstRender = true;
      console.log('First render – hiding loading');
      if (this.onFirstRender) this.onFirstRender();
    }
  }

  loop(t) {
    const delta = getDeltaTime(t);
    this.update(delta);
    this.render();
    requestAnimationFrame(t => this.loop(t));
  }

  start() {
    console.log('Loop started');
    requestAnimationFrame(t => this.loop(t));
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}

class Player {
  constructor(camera) {
    console.log('Player created');
    this.camera = camera;
    this.group = new THREE.Group();
    this.group.position.set(0.2, -0.3, -0.6);

    const skin = new THREE.MeshLambertMaterial({ color: 0xFDBCB4 });
    const sleeve = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7), sleeve);
    arm.position.set(0.4, -0.3, -0.5);
    arm.rotation.x = 0.3;
    this.group.add(arm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.25), skin);
    hand.position.set(0.4, -0.7, -0.7);
    this.group.add(hand);

    console.log('Hands added to scene');
  }

  update(delta) {
    const sway = Math.sin(Date.now() * 0.003) * 0.03;
    this.group.rotation.z = sway;
  }
}
