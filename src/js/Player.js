import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';

export class Player {
  constructor(camera, scene, playerRoot) {
    this.camera = camera;
    this.scene = scene;
    this.playerRoot = playerRoot;
    this.move = { forward: false, backward: false, left: false, right: false };
    this.holding = null;
    this.canGrab = true;
    this.grabDistance = 3.0; // Increased for easier grab
    this.velocityY = 0;
    this.isJumping = false;
    this.time = 0;

    // Metroid Prime-style arms: Relaxed, lowered, slight shoulder tilt (from Unity recreations)
    this.hands = new THREE.Group();
    this.camera.add(this.hands);

    const armGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.7, 8); // Slightly thinner/longer
    const handGeo = new THREE.BoxGeometry(0.1, 0.08, 0.12); // Box for fist-like grip
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfdbcb4 });

    // Left arm (mirrored)
    this.leftArm = new THREE.Mesh(armGeo, skinMat);
    this.leftHand = new THREE.Mesh(handGeo, skinMat);
    this.leftArm.position.set(-0.3, -0.5, -0.35); // Lowered, outward (Metroid relaxed pose)
    this.leftHand.position.set(-0.3, -0.85, -0.35);
    this.leftArm.rotation.set(0.3, -0.2, 0.1); // Shoulder tilt out, elbow bend
    this.leftHand.rotation.set(0, 0, 0);

    // Right arm (primary for chisel)
    this.rightArm = new THREE.Mesh(armGeo, skinMat);
    this.rightHand = new THREE.Mesh(handGeo, skinMat);
    this.rightArm.position.set(0.3, -0.5, -0.35);
    this.rightHand.position.set(0.3, -0.85, -0.35);
    this.rightArm.rotation.set(0.3, 0.2, -0.1); // Symmetric tilt
    this.rightHand.rotation.set(0, 0, 0);

    this.hands.add(this.leftArm, this.leftHand, this.rightArm, this.rightHand);

    // Grab point (snaps tighter to palm)
    this.grabPoint = new THREE.Object3D();
    this.grabPoint.position.set(0.3, -0.75, -0.4); // Closer to right hand
    this.camera.add(this.grabPoint);

    this.raycaster = new THREE.Raycaster();
  }

  update(delta, keys) {
    this.time += delta;
    this.move.forward = keys['KeyW'] || keys['ArrowUp'];
    this.move.backward = keys['KeyS'] || keys['ArrowDown'];
    this.move.left = keys['KeyA'] || keys['ArrowLeft'];
    this.move.right = keys['KeyD'] || keys['ArrowRight'];

    // Movement (fixed translation on root)
    const direction = new THREE.Vector3();
    direction.z = Number(this.move.forward) - Number(this.move.backward);
    direction.x = Number(this.move.left) - Number(this.move.right);
    direction.normalize();
    if (direction.lengthSq() > 0) {
      const speed = 6.0 * delta;
      this.playerRoot.translateX(direction.x * speed);
      this.playerRoot.translateZ(direction.z * speed);
    }

    // Jump (simple vertical impulse, clamp to ground)
    if (this.isJumping) {
      this.velocityY += 10 * delta; // Up impulse
      this.playerRoot.position.y += this.velocityY * delta;
      this.velocityY -= 20 * delta; // Gravity
      if (this.playerRoot.position.y <= 1.6) {
        this.playerRoot.position.y = 1.6;
        this.isJumping = false;
        this.velocityY = 0;
      }
    }

    // Metroid idle bob/sway (subtle arm movement)
    const bob = Math.sin(this.time * 2) * 0.02; // Breathing motion
    this.hands.position.y = -0.1 + bob;
    this.leftArm.rotation.z = Math.sin(this.time * 3) * 0.05; // Slight sway
    this.rightArm.rotation.z = -Math.sin(this.time * 3) * 0.05;
  }

  jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.velocityY = -5; // Initial down for momentum
    } else {
      this.drop(); // Alt: Drop on space if jumping
    }
  }

  tryGrab(interactables) {
    if (!this.canGrab || this.holding) return;
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects(interactables, true);
    if (hits.length > 0 && hits[0].distance < this.grabDistance) {
      let obj = hits[0].object;
      while (obj && !obj.userData?.isInteractable) obj = obj.parent;
      if (obj?.userData?.isInteractable) {
        this.holding = obj;
        obj.oldParent = obj.parent;
        this.grabPoint.add(obj);
        obj.position.set(0, 0, 0); // Snap to grab point
        obj.rotation.set(0, Math.PI * 0.5, 0); // Grip rotation (chisel ready)
        // Grip pose: Close hand on grab
        this.rightHand.scale.set(0.9, 0.9, 0.9);
        this.canGrab = false;
        setTimeout(() => {
          this.canGrab = true;
          this.rightHand.scale.set(1, 1, 1); // Relax
        }, 500);
      }
    }
  }

  drop() {
    if (!this.holding) return;
    this.holding.oldParent.add(this.holding);
    this.holding.position.copy(this.playerRoot.position).add(new THREE.Vector3(0, 0.5, -1)); // Drop in front
    this.holding = null;
  }
}
