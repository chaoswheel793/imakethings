import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';

export class Player {
  constructor(root, scene) {
    this.root = root; // Now uses yaw/pitch object for movement
    this.scene = scene;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.move = { forward: false, backward: false, left: false, right: false };

    this.holding = null;
    this.canGrab = true;
    this.grabDistance = 2.2;

    this.hands = new THREE.Group();
    this.root.add(this.hands); // Hands on root (yaw/pitch)

    const armGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.6, 8);
    const handGeo = new THREE.SphereGeometry(0.08, 12, 8);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfdbcb4 });

    this.leftArm = new THREE.Mesh(armGeo, skinMat);
    this.leftHand = new THREE.Mesh(handGeo, skinMat);
    this.rightArm = new THREE.Mesh(armGeo, skinMat);
    this.rightHand = new THREE.Mesh(handGeo, skinMat);

    this.leftArm.position.set(-0.25, -0.4, -0.4);
    this.leftHand.position.set(-0.25, -0.7, -0.4);
    this.rightArm.position.set(0.25, -0.4, -0.4);
    this.rightHand.position.set(0.25, -0.7, -0.4);

    this.leftArm.rotation.x = 0.4;
    this.rightArm.rotation.x = 0.4;

    this.hands.add(this.leftArm, this.leftHand, this.rightArm, this.rightHand);

    this.grabPoint = new THREE.Object3D();
    this.grabPoint.position.set(0.25, -0.6, -0.5);
    this.root.add(this.grabPoint); // Grab on root

    this.raycaster = new THREE.Raycaster();
    this.camera = root.getObjectByName ? root.getObjectByName('camera') : root.children.find(c => c.type === 'PerspectiveCamera'); // Fallback to camera
  }

  update(delta) {
    this.direction.z = Number(this.move.forward) - Number(this.move.backward);
    this.direction.x = Number(this.move.left) - Number(this.move.right);
    this.direction.normalize();

    if (this.direction.lengthSq() > 0) {
      const speed = 5.0 * delta;
      this.root.translateX(this.direction.x * speed);
      this.root.translateZ(this.direction.z * speed);
    }

    // Lock y height
    this.root.position.y = 1.6;
  }

  tryGrab(interactables) {
    if (!this.canGrab || this.holding) return;

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(interactables, true);

    if (intersects.length > 0 && intersects[0].distance < this.grabDistance) {
      let obj = intersects[0].object;
      while (obj && !obj.userData?.isInteractable) obj = obj.parent;
      if (obj?.userData?.isInteractable) {
        this.holding = obj;
        this.holding.oldParent = obj.parent;
        this.grabPoint.add(obj);
        obj.position.set(0, 0, 0);
        obj.rotation.set(0, Math.PI, 0);
        this.canGrab = false;
        setTimeout(() => this.canGrab = true, 300);
      }
    }
  }

  drop() {
    if (!this.holding) return;
    this.holding.oldParent.add(this.holding);
    this.holding = null;
  }
}
