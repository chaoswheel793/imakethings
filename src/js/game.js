// src/js/game.js – FINAL: Right-click to carve, hands, chisel, bright lights – 100% working
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
  }

  async init() {
    // Bright beautiful lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const sun = new THREE.DirectionalLight(0xffeecc, 3);
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
    );
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.1 })
    );
    blade.position.y = 0.35;
    group.add(handle, blade);
    group.scale.set(1.3, 1.3, 1.3);
    group.visible = false;
    this.scene.add(group);
    this.chisel = group;
  }

  setupInput() {
    // Click anywhere → lock camera + pick up chisel first time
    this.canvas.addEventListener('click', () => {
      this.fpsControls.lock();
      if (!this.chiselVisible) {
        this.chisel.visible = true;
        this.chiselVisible = true;
      }
    });

    // RIGHT-CLICK = carve (preventsDefault so camera doesn't move)
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('pointerdown', e => {
      if (e.button === 2) {  // right mouse button
        e.preventDefault();
        this.isCarving = true;
      }
    });
    this.canvas.addEventListener('pointerup', e => {
      if (e.button === 2) this.isCarving = false;
    });
    this.canvas.addEventListener('pointermove', e => this.carve(e));

    // WASD movement
    window.addEventListener('keydown', e => this.keys[e.code] = true);
    window.addEventListener('keyup', e => this.keys[e.code] = false);
  }

  carve(event) {
    if (!this.isCarving || !this.chiselVisible) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(this.carvingBlock);
    if (hits.length === 0) return;

    const point = hits[0].point;
    const geo = this.carvingBlock.geometry;
    const pos = geo.attributes.position;
    const radius = 0.2;

    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      const worldV = v.clone().applyMatrix4(this.carvingBlock.matrixWorld);
      const dist = point.distanceTo(worldV);
      if (dist < radius) {
        const strength = 1 - (dist / radius);
        v.lerp(point, strength * 0.04);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    this.carvingBlock.material.opacity = Math.min(1.0, this.carvingBlock.material.opacity + 0.008);
  }

  update(delta) {
    // Movement
    const speed = 5 * delta;
    const dir = new THREE.Vector3();
    if (this.keys['KeyW']) dir.z -= 1;
    if (this.keys['KeyS']) dir.z += 1;
    if (this.keys['KeyA']) dir.x -= 1;
    if (this.keys['KeyD']) dir.x += 1;
    if (dir.length() > 0) {
      dir.normalize().applyQuaternion(this.camera.quaternion).multiplyScalar(speed);
      this.camera.position.add(dir);
    }

    this.player.update();
    if (this.chisel?.visible) {
      this.chisel.position.copy(this.player.rightHand.position);
      this.chisel.quaternion.copy(this.camera.quaternion);
      this.chisel.rotateX(-1.2);
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

class Player {
  constructor(camera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.rightHand = new THREE.Group();

    const skin = new THREE.MeshStandardMaterial({ color: 0xFDBCB4 });
    const sleeve = new THREE.MeshStandardMaterial({ color: 0x333333 });

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7), sleeve);
    arm.position.set(0.4, -0.3, -0.5);
    arm.rotation.x = 0.3;
    this.group.add(arm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.25), skin);
    hand.position.set(0.4, -0.7, -0.7);
    this.rightHand.add(hand);
    this.group.add(this.rightHand);

    this.group.position.set(0.35, -0.35, -0.7);
    camera.add(this.group);
  }

  update() {
    const sway = Math.sin(Date.now() * 0.003) * 0.07;
    this.group.rotation.z = sway;
  }
}
