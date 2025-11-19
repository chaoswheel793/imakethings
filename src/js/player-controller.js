// src/js/player-controller.js – 100% CLEAN & WORKING
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export class PlayerController {
  constructor(camera, domElement) {
    this.group = new THREE.Group();
    this.camera = camera;
    this.group.add(this.camera);
    this.camera.position.set(0, 1.6, 0);

    this.WALKING_SPEED = 5.0;
    this.SPRINT_SPEED = 8.0;
    this.GRAVITY = -29.8;
    this.JUMP_VELOCITY = 10.0;

    this.velocity = new THREE.Vector3(0, 0, 0);
    this.isGrounded = true;
    this.keys = {};
    this.bobTime = 0;
    this.bobActive = false;

    this.domElement = domElement;
  }

  update(delta, keys) {
    this.keys = keys;

    // Gravity
    this.velocity.y += this.GRAVITY * delta;

    // Jump
    if (this.keys['Space'] && this.isGrounded) {
      this.velocity.y = this.JUMP_VELOCITY;
      this.isGrounded = false;
    }

    // Horizontal movement
    const speed = this.keys['ShiftLeft'] ? this.SPRINT_SPEED : this.WALKING_SPEED;
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.camera.quaternion);
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

    // Apply vertical
    this.group.position.y += this.velocity.y * delta;

    // Floor
    if (this.group.position.y < 1.6) {
      this.group.position.y = 1.6;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Head bob
    if (this.bobActive && this.isGrounded) {
      this.bobTime += delta * 9;
      const bob = Math.sin(this.bobTime) * 0.04;
      this.camera.position.y = 1.6 + bob;
    } else {
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, 1.6, delta * 10);
    }
  }
}
