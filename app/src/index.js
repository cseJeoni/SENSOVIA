import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';

// DOM이 로드된 후 실행
window.addEventListener('load', () => {
  initThreeJS();
});

function initThreeJS() {
  // 1) 컨테이너 참조
  const container = document.querySelector(".handpiece-img");
  if (!container) {
    console.error('handpiece-img를 찾을 수 없습니다.');
    return;
  }

  // 2) 크기 설정
  const width = container.clientWidth;
  const height = container.clientHeight;

  // 3) 씬 생성
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8f0f3);

  // 4) 카메라 설정
  const camera = new THREE.PerspectiveCamera(20, width/height, 0.1, 2000);
  camera.position.set(0, 0, 1000);

  // 5) 렌더러 설정
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // 6) 조명 설정
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 4);
  dirLight.position.set(-4000, 200, 800);
  dirLight.target.position.set(0, 0, 0);
  scene.add(dirLight);

  // 👉 Helper 추가
  const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 100, 0xff0000);
  // scene.add(dirLightHelper);

  // 7) 컨트롤러 설정
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // 8) GLB 모델 로드
  const loader = new GLTFLoader();
  loader.load(
    './src/models/HandPiece-3.glb',
    (gltf) => {
      const model = gltf.scene;
      
      // 모델 크기 조정
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const scale = Math.min(width / size.x, height / size.y) * 0.8;
      model.scale.setScalar(scale);

      // 모델 위치 조정
      model.position.set(0, 0, 0);

      // 재질 설정
      model.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.metalness = 0.4;
          child.material.roughness = 0.2;
          child.material.envMapIntensity = 2;

          if ("clearcoat" in child.material) {
            child.material.clearcoat = 1.0;
            child.material.clearcoatRoughness = 0.1;
          }

          child.material.needsUpdate = true;
        }
      });

      scene.add(model);
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
      console.error('모델 로드 실패:', error);
    }
  );

  // 9) 리사이즈 처리
  window.addEventListener('resize', () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(newWidth, newHeight);
  });

  // 10) 애니메이션 루프
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}