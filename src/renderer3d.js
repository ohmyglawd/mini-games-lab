import { MONSTER_COLORS } from './config.js';

export class Renderer3D {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.monsterMesh = null;
    this.particles = [];
    this.hitTime = 0;
    this.flashTime = 0;
  }

  init() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight / 2;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a202c);
    this.scene.fog = new THREE.Fog(0x1a202c, 10, 50);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    this.camera.position.set(0, 2, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(5, 10, 7); this.scene.add(dl);
    const bl = new THREE.DirectionalLight(0xaabbff, 0.4); bl.position.set(-5, 5, -5); this.scene.add(bl);

    window.addEventListener('resize', () => {
      const nw = this.container.clientWidth;
      const nh = this.container.clientHeight;
      if (!nw || !nh) return;
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(nw, nh);
    });

    this.animate();
  }

  createMonster(level) {
    if (this.monsterMesh) this.scene.remove(this.monsterMesh);
    const typeIndex = (level - 1) % MONSTER_COLORS.length;
    const color = MONSTER_COLORS[typeIndex];
    const geometry = new THREE.DodecahedronGeometry(1.5, 0);
    const material = new THREE.MeshPhongMaterial({ color, flatShading: true, shininess: 50 });
    this.monsterMesh = new THREE.Mesh(geometry, material);
    this.monsterMesh.position.y = 0.5;

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.5;
    this.monsterMesh.add(shadow);
    this.scene.add(this.monsterMesh);
  }

  hit() { this.hitTime = 1; }
  flash() { this.flashTime = 1.5; }

  explode(isPrestige = false) {
    const color = isPrestige ? 0xffffff : (this.monsterMesh ? this.monsterMesh.material.color : 0xffffff);
    const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const mat = new THREE.MeshPhongMaterial({ color, flatShading: true });
    const count = isPrestige ? 80 : 20;
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(this.monsterMesh ? this.monsterMesh.position : new THREE.Vector3(0, 0, 0));
      const mult = isPrestige ? 2.5 : 1;
      p.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.4 * mult, Math.random() * 0.5 * mult + 0.1, (Math.random() - 0.5) * 0.4 * mult);
      p.userData.rotSpeed = new THREE.Vector3(Math.random() * 0.2, Math.random() * 0.2, Math.random() * 0.2);
      this.scene.add(p);
      this.particles.push(p);
    }
    if (this.monsterMesh) this.scene.remove(this.monsterMesh);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const t = Date.now() * 0.001;

    if (this.flashTime > 0) {
      this.flashTime -= 0.02;
      const c = Math.min(1, this.flashTime);
      this.scene.background.setRGB(0.1 + c * 0.9, 0.12 + c * 0.88, 0.17 + c * 0.83);
    } else this.scene.background.setHex(0x1a202c);

    if (this.monsterMesh) {
      this.monsterMesh.position.y = 0.5 + Math.sin(t * 2) * 0.2;
      this.monsterMesh.rotation.y = t * 0.5;
      this.monsterMesh.rotation.z = Math.sin(t * 1.5) * 0.05;
      if (this.hitTime > 0) {
        this.hitTime -= 0.05;
        const s = 1 - this.hitTime * 0.2;
        this.monsterMesh.scale.set(s, s * 0.8, s);
        this.monsterMesh.material.emissive.setHex(0x550000);
      } else {
        this.monsterMesh.scale.set(1, 1, 1);
        this.monsterMesh.material.emissive.setHex(0x000000);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.position.add(p.userData.velocity);
      p.userData.velocity.y -= 0.015;
      p.rotation.x += p.userData.rotSpeed.x;
      p.rotation.y += p.userData.rotSpeed.y;
      if (p.position.y < -5) {
        this.scene.remove(p);
        this.particles.splice(i, 1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
