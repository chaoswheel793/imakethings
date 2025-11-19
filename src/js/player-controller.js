// src/js/player-controller.js – FINAL MASTERPIECE: ALL CONTROLS PERFECT
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
    this.freeLookHeld = false;
    this.lastTapTime = 0;

    this.bobTime = 0;

    // Two-finger movement state
    this.twoFingerStart = null;
    this.middleMouseDown = false;

    this.setupControls();
  }

  setupControls() {
    // === SINGLE TAP → LOCK (only if not in free-look) ===
    const attemptLock = () => {
      if (!this.isLocked && !this.freeLookHeld) {
        this.domElement.requestPointerLock();
      }
    };

    this.domElement.addEventListener('click', attemptLock);

    // === TOUCH: SINGLE / DOUBLE TAP ===
    this.domElement.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      const now = Date.now();
      if (now - this.lastTapTime < 320) {
        this.unlock(); // double-tap = release
        e.preventDefault();
      } else {
        this.lastTapTime = now;
        setTimeout(attemptLock, 350);
      }
    });

    // === HOLD ONE FINGER → ENTER FREE LOOK MODE ===
    this.domElement.addEventListener('touchstart', e => {
      if (e.touches.length === 1 && !this.isLocked) {
        this.freeLookHeld = true;
      }
      if (e.touches.length === 2) {
        this.twoFingerStart = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        };
      }
    });

    // === SECOND FINGER SWIPE → FREE LOOK (FIXED & SMOOTH) ===
    this.domElement.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && this.freeLookHeld && !this.isLocked) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        this.yaw -= dx * 0.008;
        this.pitch -= dy * 0.008;
        this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
        e.preventDefault();
      }

      // === TWO FINGER SWIPE → MOVE FORWARD/BACK/LEFT/RIGHT ===
      if (e.touches.length === 2 && this.twoFingerStart) {
        const currentX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const deltaX = currentX - this.twoFingerStart.x;
        const deltaY = currentY - this.twoFingerStart.y;

        this.move.right += deltaX * 0.0005;
        this.move.forward -= deltaY * 0.0005;

        this.twoFingerStart = { x: currentX, y: currentY };
        e.preventDefault();
      }
    });

    this.domElement.addEventListener('touchend', () => {
      if (this.domElement.touches?.length < 2) this.twoFingerStart = null;
      if (this.domElement.touches?.length === 0) this.freeLookHeld = false;
    });

    // === MOUSE: MIDDLE BUTTON + MOVE = TWO-FINGER MOVEMENT ===
    this.domElement.addEventListener('mousedown', e => {
      if (e.button === 1) { // middle click
        this.middleMouseDown = true;
        e.preventDefault();
      }
    });
    this.domElement.addEventListener('mouseup', e => {
      if (e.button === 1) this.middleMouseDown = false;
    });
    this.domElement.addEventListener('mousemove', e => {
      if (this.middleMouseDown && !this.isLocked) {
        this.move.right += e.movementX * 0.02;
        this.move.forward -= e.movementY * 0.02;
      }
      if (this.isLocked) {
        this.yaw -= e.movementX * this.mouseSensitivity;
        this.pitch -= e.movementY * this.mouseSensitivity;
        this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('keydown', e => {
      if (e.code === 'Escape') this.unlock();
    });
  }

  lock() { this.domElement.requestPointerLock(); }
  unlock() { document.exitPointerLock(); }

  update(delta, keys) {
    this.keys = keys;

    // Combine keyboard + touch/mouse movement
    const kbForward = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
    const kbRight   = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    this.move.forward += kbForward;
    this.move.right += kbRight;

    const speed = 5.0;
    const direction = new THREE.Vector3(this.move.right, 0, -this.move.forward);
    if (direction.length() > 0) {
      direction.normalize().multiplyScalar(speed * delta);
      direction.applyAxisAngle(new THREE.Vector3(0,1,0), this.yaw);
      this.group.position.add(direction);
    }

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

    // HEAD BOB
    const walking = Math.abs(this.move.forward) + Math.abs(this.move.right) > 0.1;
    if (walking && this.canJump) {
      this.bobTime += delta * 12;
      const bob = Math.sin(this.bobTime) * 0.06;
      this.camera.position.y = 1.6 + bob + Math.sin(this.bobTime * 2) * 0.02;
    } else {
      this.camera.position.y += (1.6 - this.camera.position.y) * delta * 10;
      this.bobTime *= 0.9;
    }

    // Reset move input
    this.move.forward = 0;
    this.move.right = 0;

    // Apply look
    this.group.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }
}
