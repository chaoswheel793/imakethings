// src/js/game.js – I Make Things: Real Carving with Chisel
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/PointerLockControls.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/OrbitControls.js';
import { getDeltaTime } from './utils.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.player = null;
    this.workshopItems = [];
    this.carvingBlock = null;
    this.chisel = null;
    this.isCarving = false;
    this.keys = {};
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.fpsControls = null;
    this.orbitControls = null;
    this.currentMode = 'fps';
    this.originalGeometry = null; // For carving reset
  }

  async init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2c1810);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.6, 5);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const light = new THREE.PointLight(0xffddaa, 2, 40);
    light.position.set(0, 8, 0);
    light.castShadow = true;
    this.scene.add(light);

    this.player = new Player(this.camera);
    this.scene.add(this.player.group);

    this.createWorkshop();
    this.createChisel();

    this.setupControls();
    this.setupInput();

    this.resize();
  }

  createWorkshop() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshLambertMaterial({ color: 0x8B4513 })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    const bench = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 2.5), woodMat);
    const top = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 3), woodMat);
    base.position.y = 0.4; top.position.y = 1;
    bench.add(base, top);
    this.scene.add(bench);

    // Carvable wood block with hidden target shape
    const geometry = new THREE.BoxGeometry(1, 1, 1, 32, 32, 32);
    this.originalGeometry = geometry.clone();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCarveProgress: { value: 0.0 },
        uTargetShape: { value: 1.0 } // 0=sphere, 1=cube
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uCarveProgress;
        varying vec3 vPos;
        float sdSphere(vec3 p, float r) { return length(p) - r; }
        float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0); }
        void main() {
          float dist = sdBox(vPos, vec3(0.3));
          float reveal = 1.0 - smoothstep(0.0, 0.15, abs(dist) - uCarveProgress * 0.3);
          vec3 wood = mix(vec3(0.87,0.72,0.53), vec3(1.0,0.9,0.7), reveal);
          float alpha = mix(0.4, 1.0, reveal * uCarveProgress);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true
    });

    this.carvingBlock = new THREE.Mesh(geometry, material);
    this.carvingBlock.position.set(0, 1.2, 0);
    this.carvingBlock.userData = { type: 'carvable' };
    bench.add(this.carvingBlock);
    this.workshopItems.push(this.carvingBlock);
  }

  createChisel() {
    const group = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4), new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 }));
    blade.position.y = 0.35;
    group.add(handle, blade);
    group.scale.set(0.6, 0.6, 0.6);
    group.visible = false;
    this.scene.add(group);
    this.chisel = group;
  }

  setupControls() {
    this.fpsControls = new PointerLockControls(this.camera, this.canvas);
    this.scene.add(this.fpsControls.getObject());

    this.orbitControls = new OrbitControls(this.camera, this.canvas);
    this.orbitControls.target.set(0, 1.2, 0);
    this.orbitControls.enableDamping = true;
    this.orbitControls.enabled = false;
  }

  setupInput() {
    window.addEventListener('keydown', e => this.keys[e.code] = true);
    window.addEventListener('keyup', e => this.keys[e.code] = false);

    this.canvas.addEventListener('click', () => {
      if (this.currentMode === 'fps') this.fpsControls.lock();
    });

    let lastTap = 0;
    this.canvas.addEventListener('dblclick', () => this.toggleMode());
    this.canvas.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastTap < 300) this.toggleMode();
      lastTap = now;
    });
    window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); this.toggleMode(); } });

    // Carving: mouse/touch drag
    this.canvas.addEventListener('pointerdown', () => { if (this.chisel.visible) this.isCarving = true; });
    this.canvas.addEventListener('pointerup', () => this.isCarving = false);
    this.canvas.addEventListener('pointermove', e => this.carve(e));
    this.canvas.addEventListener('touchmove', e => { e.preventDefault(); this.carve(e.touches[0]); }, { passive: false });
  }

  carve(event) {
    if (!this.isCarving || !this.chisel.visible) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.carvingBlock);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const geo = this.carvingBlock.geometry;
      const pos = geo.attributes.position;
      const carveRadius = 0.15;

      for (let i = 0; i < pos.count; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(pos, i);
        vertex.applyMatrix4(this.carvingBlock.matrixWorld);
        const dist = point.distanceTo(vertex);
        if (dist < carveRadius) {
          const strength = 1 - (dist / carveRadius);
          vertex.lerp(point, strength * 0.05);
          pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();

      // Reveal hidden shape as we carve
      this.carvingBlock.material.uniforms.uCarveProgress.value = Math.min(1.0,
        this.carvingBlock.material.uniforms.uCarveProgress.value + 0.003);
    }
  }

  toggleMode() {
    this.currentMode = this.currentMode === 'fps' ? 'inspect' : 'fps';
    if (this.currentMode === 'fps') {
      this.fpsControls.lock();
      this.orbitControls.enabled = false;
      this.chisel.visible = true;
    } else {
      this.fpsControls.unlock();
      this.orbitControls.enabled = true;
      this.chisel.visible = false;
    }
  }

  update(delta) {
    if (this.currentMode === 'fps') {
      const speed = 4 * delta;
      const dir = new THREE.Vector3();
      if (this.keys['KeyW']) dir.z -= 1;
      if (this.keys['KeyS']) dir.z += 1;
      if (this.keys['KeyA']) dir.x -= 1;
      if (this.keys['KeyD']) dir.x += 1;
      dir.normalize().applyQuaternion(this.camera.quaternion).multiplyScalar(speed);
      this.camera.position.add(dir);

      this.player.update(delta);
      if (this.chisel.visible) {
        this.chisel.position.copy(this.player.rightHand.position);
        this.chisel.quaternion.copy(this.camera.quaternion);
      }
    } else {
      this.orbitControls.update();
    }

    // Pulse hidden shape
    if (this.carvingBlock) {
      this.carvingBlock.material.uniforms.uTime.value += delta;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  loop(t) {
    const delta = getDeltaTime(t);
    this.update(delta);
    this.render();
    requestAnimationFrame(t => this.loop(t));
  }

  start() {
    requestAnimationFrame(t => this.loop(t));
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w/h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w,h);
  }
}

// Player with hands
class Player {
  constructor(camera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.rightHand = new THREE.Group();

    const skin = new THREE.MeshLambertMaterial({ color: 0xFDBCB4 });
    const sleeve = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,0.7), sleeve);
    arm.position.set(0.4, -0.3, -0.5);
    arm.rotation.x = 0.3;
    this.group.add(arm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.12,0.25), skin);
    hand.position.set(0.4, -0.7, -0.7);
    this.rightHand.add(hand);
    this.group.add(this.rightHand);

    this.group.position.set(0.2, -0.3, -0.6);
    this.holding = null;
  }

  update(delta) {
    const sway = Math.sin(Date.now()*0.003)*0.03;
    this.group.rotation.z = sway;
  }
}
