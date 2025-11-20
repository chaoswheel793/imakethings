import * as THREE from 'three';

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.holding = null;
    this.canGrab = true;

    this.arms = new THREE.Group();
    this.camera.add(this.arms);

    const armGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.9, 8);
    const handGeo = new THREE.BoxGeometry(0.14, 0.14, 0.18);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffccb3 });

    this.leftArm = new THREE.Mesh(armGeo, mat);
    this.leftHand = new THREE.Mesh(handGeo, mat);
    this.rightArm = new THREE.Mesh(armGeo, mat);
    this.rightHand = new THREE.Mesh(handGeo, mat);

    this.leftArm.position.set(-0.4, -0.7, -0.6);
    this.leftHand.position.set(-0.4, -1.2, -0.6);
    this.rightArm.position.set(0.4, -0.7, -0.6);
    this.rightHand.position.set(0.4, -1.2, -0.6);

    this.leftArm.rotation.x = 0.5;
    this.rightArm.rotation.x = 0.5;

    this.arms.add(this.leftArm, this.leftHand, this.rightArm, this.rightHand);

    this.grabPoint = new THREE.Object3D();
    this.grabPoint.position.set(0.4, -1.1, -0.6);
    this.camera.add(this.grabPoint);

    this.raycaster = new THREE.Raycaster();
  }

  update(delta) {
    const time = performance.now() * 0.001;
    this.arms.position.y = Math.sin(time * 2) * 0.03 - 0.05;
  }

  tryGrab(objects) {
    if (!this.canGrab || this.holding) return;

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects(objects, true);

    if (hits.length === 0 || hits[0].distance > 3.5) return;

    const hit = hits[0];
    let obj = hit.object;

    // Simple safe climb up parent chain (max 10 levels)
    for (let i = 0; i < 10 && obj && !obj.userData?.isInteractable; i++) {
      obj = obj.parent;
    }

    if (obj && obj.userData.isInteractable) {
      this.holding = obj;
      obj.oldParent = obj.parent;
      this.grabPoint.add(obj);
      obj.position.set(0, 0, 0);
      obj.rotation.set(0, Math.PI, 0);
      this.canGrab = false;
      setTimeout(() => { this.canGrab = true; }, 300);
    }
  }

  drop() {
    if (!this.holding) return;
    this.holding.oldParent.add(this.holding);
    this.holding.position.set(0, 0.9, -2);
    this.holding = null;
  }
}
