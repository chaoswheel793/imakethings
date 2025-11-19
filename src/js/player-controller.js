// src/js/player-controller.js – FINAL WITH HEAD BOB + FREE LOOK
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export class PlayerController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.group = new THREE.Group();
    this.group.add(camera);
    camera.position.set(0, 1.6, 0);

    this.velocity = new THREE.Vector3();
    this.move = { forward: 0, right: 0 };
    this.canJump = false;

    this.pitch = 0;
    this.yaw = 0;
    this.mouseSensitivity = 0.002;

    this.keys = {};
    this.isLocked = false;
    this.freeLookMode = false;

    this.bobTime = 0;
    this.lastTap = 0;

    this.setupControls();
  }

  setupControls() {
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked) this.lock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      if (!this.isLocked) this.freeLookMode = true;
    });

    this.domElement.addEventListener('mousemove', (e) => {
      if (!this.isLocked && !this.freeLookMode) return;
      this.yaw -= e.movementX * this.mouseSensitivity;
      this.pitch -= e.movementY * this.mouseSensitivity;
      this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
    });

    // Double-tap or ESC = unlock
    this.domElement.addEventListener('dblclick', () => this.unlock());
    this.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const now = Date.now();
      if (now - this.lastTap < 300) this.unlock();
      this.lastTap = now;
    });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') this.unlock();
    });
  }

  lock() { this.domElement.requestPointerLock(); }
  unlock() {
    document.exitPointerLock();
    this.freeLookMode = true;
  }

  update(delta, keys) {
    this.keys = keys;

    // Movement
    this.move.forward = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
    this.move.right = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);

    const speed = 5.0;
    const direction = new THREE.Vector3(this.move.right, 0, -this.move.forward);
    direction.normalize().multiplyScalar(speed * delta);
    direction.applyAxisAngle(new THREE.Vector3(0,1,0), this.yaw);
    this.group.position.add(direction);

    // Jump
    if (keys['Space'] && this.canJump) {
      this.velocity.y = 10;
      this.canJump = false;
    }
    this.velocity.y -= 30 * delta;
    this.group.position.y += this.velocity.y * delta;
    if (this.group.position.y <= 1.6) {
      this.group.position.y = 1.6;
      this.velocity.y = 0;
      this.canJump = true;
    }

    // HEAD BOB — RESTORED AND BEAUTIFUL
    const walking = Math.abs(this.move.forward) + Math.abs(this.move.right) > 0;
    if (walking && this.canJump) {
      this.bobTime += delta * 12;
      const bob = Math.sin(this.bobTime) * 0.06;
      this.camera.position.y = 1.6 + bob + Math.sin(this.bobTime * 2) * 0.02;
    } else {
      this.camera.position.y += (1.6 - this.camera.position.y) * delta * 10;
      this.bobTime = 0;
    }

    // Apply look
    this.group.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }
}
