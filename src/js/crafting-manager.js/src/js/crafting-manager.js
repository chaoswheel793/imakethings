// src/js/crafting-manager.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export class CraftingDisciplineManager {
  constructor(game) {
    this.game = game;
  }

  performAction(action, workpiece, point) {
    if (!action || !workpiece) return;

    switch (action) {
      case "carve":
        this.carve(workpiece, point);
        break;
      case "paint":
        this.paint(workpiece);
        break;
      case "assemble":
        console.log("Assembly: snapping parts...");
        break;
      default:
        console.log(`Action ${action} not yet implemented`);
    }
  }

  carve(mesh, point) {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const radius = 0.09;
    let changed = false;

    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      v.applyMatrix4(mesh.matrixWorld);
      const dist = v.distanceTo(point);

      if (dist < radius) {
        const push = (1 - dist / radius) * 0.14;
        const dir = v.clone().sub(point).normalize();
        pos.setXYZ(i,
          pos.getX(i) + dir.x * push,
          pos.getY(i) + dir.y * push,
          pos.getZ(i) + dir.z * push
        );
        changed = true;
      }
    }

    if (changed) {
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      this.game.spawnDust?.(point);
    }
  }

  paint(mesh) {
    if (mesh.material?.color) {
      const hue = (performance.now() / 50) % 360;
      mesh.material.color.setHSL(hue / 360, 0.8, 0.6);
      mesh.material.needsUpdate = true;
    }
  }
}
