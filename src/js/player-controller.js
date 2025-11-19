// src/js/player-controller.js – FINAL WORKING VERSION
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export class PlayerController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.group = new THREE.Group();
    this.group.add(camera);
    camera.position.set(0, 1.6, 0);

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.move = { forward: 0, right: 0 };
    this.canJump = false;

    // Look
    this.pitch = 0;
    this.yaw = 0;
    this.mouseSensitivity = 0.002;

    this.keys = {};
    this.isLocked = false;

    this.setupControls();
  }

  setupControls() {
    this.domElement.addEventListener('click', () => this.lock());
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    this.domElement.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      this.yaw -= e.movementX * this.mouseSensitivity;
      this.pitch -= e.movementY * this.mouseSensitivity;
      this.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, this.pitch));
    });

    // Double-tap or ESC to unlock
    let lastTap = 0;
    this.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const now = Date.now();
      if (now - lastTap < 300) this.unlock();
      lastTap = now;
    });
    this.domElement.addEventListener('dblclick', () => this.unlock());
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') this.unlock();
    });
  }

  lock() { this.domElement.requestPointerLock(); }
  unlock() { document.exitPointerLock(); }

  update(delta, keys) {
    this.keys = keys;

    // Reset movement
    this.move.forward = this.move.right = 0;
    if (keys['KeyW']) this.move.forward += 1;
    if (keys['KeyS']) this.move.forward -= 1;
    if (keys['KeyA']) this.move.right -= 1;
    if (keys['KeyD']) this.move.right += 1;

    // Apply look
    this.group.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Movement
    const speed = 5.0;
    this.direction.z = this.move.forward;
    this.direction.x = this.move.right;
    this.direction.normalize().multiplyScalar(speed * delta);
    this.direction.applyQuaternion(this.group.quaternion);
    this.group.position.add(this.direction);

    // Jump
    if (keys['Space'] && this.canJump) {
      this.velocity.y = 10;
      this.canJump = false;
    }

    // Gravity
    this.velocity.y -= 30 * delta;
    this.group.position.y += this.velocity.y * delta;

    // Ground
    if (this.group.position.y <= 1.6) {
      this.group.position.y = 1.6;
      this.velocity.y = 0;
      this.canJump = true;
    }

    // Head bob
    if (this.move.forward || this.move.right) {
      const time = performance.now() * 0.008;
      const bob = Math.sin(time) * 0.04;
      this.camera.position.y = 1.6 + bob;
    } else {
      this.camera.position.y += (1.6 - this.camera.position.y) * 0.1;
    }
  }
}
