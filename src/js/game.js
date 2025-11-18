// Add to Game class properties
this.currentEnvironmentTheme = 'basic'; // Controls asset loading (e.g., GLTF packs later)
this.environmentManager = null;

// In init(), after lighting:
this.environmentManager = new EnvironmentManager(this.scene);
this.environmentManager.loadTheme(this.currentEnvironmentTheme);

// TODO: Add spectator characters/elements here for audience reactions.

// New class at bottom of file (after Player class)
class EnvironmentManager {
  constructor(scene) {
    this.scene = scene;
    this.themes = {
      basic: this.createBasicWorkshop.bind(this)
    };
  }

  loadTheme(theme) {
    if (this.themes[theme]) {
      this.themes[theme]();
    } else {
      console.warn(`Unknown theme: ${theme}. Using basic.`);
      this.themes.basic();
    }
    // Later: async GLTFLoader(`/assets/envs/${theme}.gltf`)
  }

  createBasicWorkshop() {
    // Ground: Simple plane
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    // Workbench: Sturdy wooden (BoxGeometry + roughness)
    const benchGeo = new THREE.BoxGeometry(4, 1, 2);
    const benchMat = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513, 
      roughness: 0.7, 
      metalness: 0.1 
    });
    const workbench = new THREE.Mesh(benchGeo, benchMat);
    workbench.position.set(0, 0.5, 0);
    this.scene.add(workbench);

    // Walls: Enclosed gray space (DoubleSide for visibility)
    const wallMat = new THREE.MeshLambertMaterial({ 
      color: 0x555555, 
      side: THREE.DoubleSide 
    });
    // Back wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(50, 20), wallMat);
    backWall.position.set(0, 10, -10);
    backWall.rotation.y = Math.PI;
    this.scene.add(backWall);
    // Left wall
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(50, 20), wallMat);
    leftWall.position.set(-10, 10, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.scene.add(leftWall);
    // Right wall
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(50, 20), wallMat);
    rightWall.position.set(10, 10, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.scene.add(rightWall);

    // Lighting: Warm point light above workbench
    const pointLight = new THREE.PointLight(0xffddaa, 1.5, 30);
    pointLight.position.set(0, 8, 0);
    this.scene.add(pointLight);
  }
}
