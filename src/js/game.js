// src/js/game.js – THE FINAL LEGENDARY VERSION: Full Real-Time Carving Masterpiece
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/PointerLockControls.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/OrbitControls.js';
import { PlayerController } from './player-controller.js';
import { getDeltaTime } from './utils.js';
import { STLExporter } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/exporters/STLExporter.js';

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

    this.player = new PlayerController(this.camera, canvas, this);
    this.scene.add(this.player.group);

    // Game state
    this.mode = 'fps';
    this.keys = {};
    this.chiselVisible = false;
    this.carvingBlock = null;

    // Craftsmanship
    this.points = 1000;
    this.toolWear = 0;
    this.maxToolWear = 100;
    this.sharpenCost = 120;
    this.carvingEfficiency = 1.0;
    this.targetVoxels = new Set();
    this.carvedVoxels = new Set();

    // Carving
    this.carveRadius = 0.08;
    this.carveStrength = 0.12;
    this.isCarving = false;
    this.lastCarvePos = null;

    // Effects
    this.dustParticles = null;
    this.chiselHitSound = null;

    this.exporter = new STLExporter();
    this.lastTap = 0;
  }

  async init() {
    this.setupAudio();
    this.setupLighting();
    this.createFloor();
    this.createWorkshop();
    this.createChisel();
    this.createDustParticles();
    this.generateHiddenShape();
    this.setupInput();
    this.setMode('fps');
    this.resize();
    this.hideLoading?.();
    this.updateUI();
  }

  setupAudio() {
    this.audioListener = new THREE.AudioListener();
    this.camera.add(this.audioListener);
    this.chiselHitSound = new THREE.Audio(this.audioListener);
    // You'll add real sound files later — placeholder
  }

  setupLighting() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
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

    const geo = new THREE.BoxGeometry(1, 1, 1, 64, 64, 64);
    const mat = new THREE.MeshStandardMaterial({ 
      color: 0xDEB887, 
      transparent: true, 
      opacity: 0.85,
      roughness: 0.8
    });
    this.carvingBlock = new THREE.Mesh(geo, mat);
    this.carvingBlock.position.set(0, 1.2, -5);
    this.carvingBlock.castShadow = true;
    bench.add(this.carvingBlock);

    this.orbit.target.copy(this.carvingBlock.position);
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

  createDustParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    for (let i = 0; i < 300; i++) {
      positions.push(0, 0, 0, 0, 0, 0, 0, 0, 0);
      velocities.push(
        (Math.random() - 0.5) * 2,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 2
      );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));

    const material = new THREE.PointsMaterial({
      color: 0xDEB887,
      size: 0.04,
      transparent: true,
      opacity: 0.8
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.dustParticles.visible = false;
    this.scene.add(this.dustParticles);
  }

  generateHiddenShape() {
    const center = this.carvingBlock.position.clone().add(new THREE.Vector3(0, 0.5, 0));
    const radius = 0.38;

    for (let x = -0.5; x <= 0.5; x += 0.05) {
      for (let y = 0; y <= 1; y += 0.05) {
        for (let z = -0.5; z <= 0.5; z += 0.05) {
          const pos = new THREE.Vector3(x, y, z).add(this.carvingBlock.position);
          if (pos.distanceTo(center) <= radius) {
            const local = new THREE.Vector3(x, y, z);
            this.targetVoxels.add(`${local.x.toFixed(3)},${local.y.toFixed(3)},${local.z.toFixed(3)}`);
          }
        }
      }
    }
  }

  performCarve(worldPos) {
    if (!this.carvingBlock || this.toolWear >= 100) return;

    const localPos = worldPos.clone().sub(this.carvingBlock.position);
    const geometry = this.carvingBlock.geometry;
    const positionAttribute = geometry.attributes.position;
    const strength = this.carveStrength * this.carvingEfficiency;

    let changed = false;
    for (let i = 0; i < positionAttribute.count; i++) {
      const vx = positionAttribute.getX(i);
      const vy = positionAttribute.getY(i);
      const vz = positionAttribute.getZ(i);
      const vertWorld = new THREE.Vector3(vx, vy, vz).applyMatrix4(this.carvingBlock.matrixWorld);
      const dist = vertWorld.distanceTo(worldPos);

      if (dist < this.carveRadius) {
        const push = strength * (1 - dist / this.carveRadius);
        positionAttribute.setXYZ(i,
          vx - localPos.x * push * 0.1,
          vy - localPos.y * push * 0.1,
          vz - localPos.z * push * 0.1
        );
        changed = true;
      }
    }

    if (changed) {
      positionAttribute.needsUpdate = true;
      geometry.computeVertexNormals();
      this.markCarvedVoxel(worldPos);
      this.spawnDust(worldPos);
      this.addToolWear(0.6);
      this.updateUI();
    }
  }

  spawnDust(pos) {
    if (!this.dustParticles) return;
    const positions = this.dustParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = pos.x + (Math.random() - 0.5) * 0.1;
      positions[i + 1] = pos.y + Math.random() * 0.1;
      positions[i + 2] = pos.z + (Math.random() - 0.5) * 0.1;
    }
    this.dustParticles.geometry.attributes.position.needsUpdate = true;
    this.dustParticles.visible = true;
    setTimeout(() => this.dustParticles.visible = false, 800);
  }

  // ... (all previous methods: tool wear, scoring, UI, etc. remain exactly as in last version)

  update(delta) {
    if (this.mode === 'fps') {
      this.player.update(delta, this.keys);

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      const intersects = raycaster.intersectObject(this.carvingBlock);

      if (intersects.length > 0 && this.isCarving && this.chisel.visible) {
        const point = intersects[0].point;
        if (!this.lastCarvePos || point.distanceTo(this.lastCarvePos) > 0.02) {
          this.performCarve(point);
          this.lastCarvePos = point;
        }
      } else {
        this.lastCarvePos = null;
      }

      if (this.chisel.visible) {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        this.chisel.position.copy(this.camera.position).addScaledVector(dir, 0.7).sub(new THREE.Vector3(0, 0.4, 0));
        this.chisel.quaternion.copy(this.camera.quaternion);
        this.chisel.rotateX(-1.4);
      }
    }
  }

  exportSTL() {
    const result = this.exporter.parse(this.carvingBlock);
    const blob = new Blob([result], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'my_masterpiece.stl';
    link.click();
    this.showMessage('Masterpiece Exported!', 3000, '#00ff00');
  }

  // ... rest of methods (sharpenTool, calculateScore, etc.) unchanged from previous
}
