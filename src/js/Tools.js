import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';

export function createChisel(scene) {
  const chisel = new THREE.Group();

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  handle.position.y = 0.2;

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.01, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.2 })
  );
  blade.position.y = 0.425;

  chisel.add(handle, blade);
  chisel.scale.set(1.5, 1.5, 1.5);
  chisel.position.set(0, 0.8, -1.5);
  chisel.userData = { isInteractable: true, toolType: "chisel" };

  scene.add(chisel);
  return chisel;
}
