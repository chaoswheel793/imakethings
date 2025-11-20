import * as THREE from 'three';

export function createChisel(scene) {
  const chisel = new THREE.Group();

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  handle.position.y = 0.3;

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.02, 0.35),
    new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.2 })
  );
  blade.position.y = 0.6;

  chisel.add(handle, blade);
  chisel.scale.set(2.5, 2.5, 2.5);
  chisel.position.set(0, 0.9, -2);   // Perfect distance in front of player
  chisel.rotation.set(0, Math.PI, 0);
  chisel.userData = { isInteractable: true };

  scene.add(chisel);
  return chisel;
}
