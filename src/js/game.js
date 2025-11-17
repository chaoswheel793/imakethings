export class Game {
  constructor() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 1.5, 4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isCarving = false;

    this.addLights();
    this.createStoneBlock();
    this.setupTouchControls();

    window.addEventListener('resize', () => this.onResize());
    this.animate();
  }

  addLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(5, 10, 7);
    this.scene.add(dir);
  }

  createStoneBlock() {
    const size = 2;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.8,
      metalness: 0.1
    });
    this.block = new THREE.Mesh(geometry, material);
    this.scene.add(this.block);
  }

  setupTouchControls() {
    window.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    window.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener('touchend', () => this.onTouchEnd());

    window.addEventListener('mousedown', (e) => this.onTouchStart(e));
    window.addEventListener('mousemove', (e) => this.onTouchMove(e));
    window.addEventListener('mouseup', () => this.onTouchEnd());
  }

  onTouchStart(event) {
    event.preventDefault();
    this.isCarving = true;
    this.updateMousePosition(event);
  }

  onTouchMove(event) {
    if (!this.isCarving) return;
    event.preventDefault();
    this.updateMousePosition(event);
    this.carve();
  }

  onTouchEnd() {
    this.isCarving = false;
  }

  updateMousePosition(event) {
    const touch = event.touches ? event.touches[0] : event;
    this.mouse.x = (touch.clientX / this.width) * 2 - 1;
    this.mouse.y = -(touch.clientY / this.height) * 2 + 1;
  }

  carve() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.block);
    if (intersects.length > 0) {
      // Visual feedback – flash white when carving
      this.block.material.emissive.setHex(0xffffff);
      setTimeout(() => {
        if (this.block?.material) this.block.material.emissive.setHex(0x000000);
      }, 50);
    }
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    this.block.rotation.y += 0.005; // slow idle rotation
    this.renderer.render(this.scene, this.camera);
  };

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }
}
