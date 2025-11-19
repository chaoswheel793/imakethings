// Add these imports at the very top of game.js
import { ToolManager } from './tool-manager.js';
import { CraftingDisciplineManager } from './crafting-manager.js';
import { InteractionManager } from './interaction-manager.js';

// Inside Game constructor, add:
this.toolManager = new ToolManager(this.player);
this.craftingManager = new CraftingDisciplineManager(this);
this.interactionManager = new InteractionManager(this);
this.isCarving = false;

// In createChisel():
this.chisel.userData = { isInteractable: true, toolType: "chisel" };

// In createCarvingBlock():
this.carvingBlock.userData = { isInteractable: true, materialType: "wood" };

// In update(), replace carving block with this full logic:
const hovered = this.interactionManager.update();

if (this.mode === 'fps' && this.keys['KeyE']) {
  if (hovered && !this.player.holdingItem) {
    this.player.grabItem(hovered);
    if (hovered.userData.toolType) {
      this.toolManager.equip(hovered.userData.toolType);
    }
  }
}

if (this.mode === 'fps' && hovered && this.player.holdingItem && this.toolManager.isCompatibleWith(hovered)) {
  if (!this.isCarving) this.isCarving = true;
  const point = this.raycaster.ray.at(hovered.distance, new THREE.Vector3());
  const action = this.toolManager.getCurrentAction();
  this.craftingManager.performAction(action, hovered, point);
} else {
  this.isCarving = false;
}
