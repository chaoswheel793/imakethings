// src/js/player-controller.js – PROMPT #2: Full Look Controls + PointerLock + Touch
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export class PlayerController {
  constructor(camera, domElement) {
    this.group = new THREE.Group();
    this.camera = camera;
    this.group.add(this.camera);
    this.camera.position.set(0, 1.6, 0);

    // Movement constants
    this.WALKING_SPEED = 5.0;
    this.SPRINT_SPEED = 8.0;
    this.GRAVITY = -29.8;
    this.JUMP_VELOCITY = 10.0;

    // Look constants
    this.MOUSE_SENSITIVITY = 0.002;
    this.TOUCH_SENSITIVITY = 0.003;
    this.MAX_PITCH = Math.PI / 2 * 0.8; // 72 degrees up/down

    this.velocity = new THREE.Vector3(0, 0, 0);
    this.isGrounded = true;
    this.keys = {};
    this.bobTime = 0;
    this.bobActive = false;

    this.pitch = 0; // Vertical look
    this.yaw = 0;   // Horizontal look

    this.domElement = domElement;

    // Touch state
    this.touchStart = null;
    this.touchCurrent = null;

    // PointerLock for desktop
    this.pointerLock = false;
  }

  update(delta, keys) {
    this.keys = keys;

    // === GRAVITY & JUMP ===
    this.velocity.y += this.GRAVITY * delta;
    if (this.keys['Space'] && this.isGrounded) {
      this.velocity.y = this.JUMP_VELOCITY;
      this.isGrounded = false;
    }

    // === HORIZONTAL MOVEMENT ===
    const speed = this.keys['ShiftLeft'] ? this.SPRINT_SPEED : this.WALKING_SPEED;
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.group.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.group.quaternion);
    right.y = 0;
    right.normalize();

    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.sub(forward);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.sub(right);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.add(right);

    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(speed * delta);
      this.group.position.add(moveDir);
      this.bobActive = true;
    } else {
      this.bobActive = false;
    }

    // === VERTICAL (GRAVITY) ===
    this.group.position.y += this.velocity.y * delta;
    if (this.group.position.y < 1.6) {
      this.group.position.y = 1.6;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // === HEAD BOB ===
    if (this.bobActive && this.isGrounded) {
      this.bobTime += delta * 9;
      const bob = Math.sin(this.bobTime) * 0.04;
      this.camera.position.y = 1.6 + bob;
    } else {
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, 1.6, delta * 10);
    }

    // === MOUSE LOOK (PointerLock) ===
    if (this.pointerLock) {
      this.pitch -= this.mouseY * this.MOUSE_SENSITIVITY;
      this.yaw -= this.mouseX * this.MOUSE_SENSITIVITY;

      this.pitch = THREE.MathUtils.clamp(this.pitch, -this.MAX_PITCH, this.MAX_PITCH);
      this.group.rotation.order = 'YXZ';
      this.group.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    }

    // === TOUCH LOOK (Drag) ===
    if (this.touchCurrent && this.touchStart) {
      const deltaX = this.touchCurrent.x - this.touchStart.x;
      const deltaY = this.touchCurrent.y - this.touchStart.y;

      this.pitch -= deltaY * this.TOUCH_SENSITIVITY;
      this.yaw -= deltaX * this.TOUCH_SENSITIVITY;

      this.pitch = THREE.MathUtils.clamp(this.pitch, -this.MAX_PITCH, this.MAX_PITCH);
      this.group.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    }
  }

  // Mouse move for look
  onMouseMove = (event) => {
    if (this.pointerLock) {
      this.mouseX = event.movementX || 0;
      this.mouseY = event.movementY || 0;
    }
  };

  // Touch events
  onTouchStart = (event) => {
    this.touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };

  onTouchMove = (event) => {
    this.touchCurrent = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };

  onTouchEnd = () => {
    this.touchStart = null;
    this.touchCurrent = null;
  };

  // PointerLock events
  onPointerLockChange = () => {
    this.pointerLock = document.pointerLockElement === this.domElement;
  };

  // Connect to DOM
  connect() {
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('touchstart', this.onTouchStart);
    this.domElement.addEventListener('touchmove', this.onTouchMove);
    this.domElement.addEventListener('touchend', this.onTouchEnd);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  disconnect() {
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('touchmove', this.onTouchMove);
    this.domElement.removeEventListener('touchend', this.onTouchEnd);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
