import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Three separate architectural frames share a central aperture. This is an
// illustration, never an alternate logo or a picture of current product UI.
function roundedRect(path, width, height, radius) {
  const x = -width / 2, y = -height / 2;
  path.moveTo(x + radius, y);
  path.lineTo(x + width - radius, y);
  path.quadraticCurveTo(x + width, y, x + width, y + radius);
  path.lineTo(x + width, y + height - radius);
  path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  path.lineTo(x + radius, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - radius);
  path.lineTo(x, y + radius);
  path.quadraticCurveTo(x, y, x + radius, y);
}

export function mountSculpture(viewport) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 40);
  camera.position.set(5.1, 3.3, 7.6);
  camera.lookAt(0, 0, 0);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(environment, 0.04);
  scene.environment = env.texture;
  environment.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4b4265, 2));
  const key = new THREE.DirectionalLight(0xfff6ed, 5);
  key.position.set(3, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xcab4ff, 3);
  rim.position.set(-4, 2, -2);
  scene.add(rim);
  const assembly = new THREE.Group();
  scene.add(assembly);
  const shape = new THREE.Shape();
  roundedRect(shape, 3.2, 3.2, 0.72);
  const hole = new THREE.Path();
  roundedRect(hole, 2.34, 2.34, 0.42);
  shape.holes.push(hole);
  const rawGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.27, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: 0.075, bevelThickness: 0.075, curveSegments: 24 });
  const geometry = toCreasedNormals(rawGeometry, Math.PI / 3);
  rawGeometry.dispose();
  geometry.center();
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0x393443, metalness: 0.86, roughness: 0.26 }),
    new THREE.MeshStandardMaterial({ color: 0x9b78cd, metalness: 0.68, roughness: 0.26 }),
    new THREE.MeshStandardMaterial({ color: 0xe7e1ed, metalness: 0.7, roughness: 0.22 }),
  ];
  materials.forEach((material, index) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = index * Math.PI / 3;
    mesh.rotation.z = (index - 1) * 0.18;
    assembly.add(mesh);
  });
  assembly.rotation.set(0.18, -0.24, -0.45);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  viewport.appendChild(renderer.domElement);
  const resize = () => {
    const { width, height } = viewport.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  return {
    resize,
    render(time, pointer) {
      assembly.rotation.x = 0.18 + Math.sin(time * 0.23) * 0.045 + pointer.y * 0.1;
      assembly.rotation.y = -0.24 + Math.sin(time * 0.17) * 0.12 + pointer.x * 0.14;
      assembly.rotation.z = -0.45 + Math.sin(time * 0.19) * 0.025;
      renderer.render(scene, camera);
    },
    dispose() {
      geometry.dispose();
      materials.forEach(material => material.dispose());
      env.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
