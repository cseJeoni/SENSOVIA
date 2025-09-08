// Three.js 및 관련 모듈 import
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';

// 페이지 로드 시 실행될 모든 초기화 함수
document.addEventListener("DOMContentLoaded", function () {
    // 3D 모델 초기화
    initThreeJS();
    
    // 기존 UI 초기화
    initUI();
    
    // 모달 초기화
    initModal();
    
    // 배지 초기화
    initBadge();
    
    // 버튼 이벤트 초기화
    initButtons();

    // sidebar, sidebar-Setting 아이콘 꾹 누르는 동안 icon-fill, 떼면 icon-white 효과
    const iconMap = {
        'icon_User.svg': 'icon_User.svg',
        'icon_Home.svg': 'icon_Home.svg',
        'icon_Setting.svg': 'icon_Setting.svg',
        'icon_Light.svg': 'icon_Light.svg',
        'icon_Sound(1).svg': 'icon_Sound(1).svg',
        'icon_Sound(2).svg': 'icon_Sound(2).svg',
        'icon_Sound(3).svg': 'icon_Sound(3).svg',
        'icon_Cleaning.svg': 'icon_Cleaning.svg',
        'icon_Normal.svg': 'icon_Normal.svg',
    };

    function setIcon(img, toFill) {
        for (const [white, fill] of Object.entries(iconMap)) {
            if (toFill && img.src.includes('icon-white/' + white)) {
                img.src = img.src.replace('icon-white', 'icon-fill');
                break;
            } else if (!toFill && img.src.includes('icon-fill/' + fill)) {
                img.src = img.src.replace('icon-fill', 'icon-white');
                break;
            }
        }
    }

    function addPressEffect(img) {
        img.parentElement.addEventListener('mousedown', function(e) {
            setIcon(img, true);
        });
        img.parentElement.addEventListener('mouseup', function(e) {
            setIcon(img, false);
        });
        img.parentElement.addEventListener('mouseleave', function(e) {
            setIcon(img, false);
        });
        img.parentElement.addEventListener('touchstart', function(e) {
            setIcon(img, true);
        });
        img.parentElement.addEventListener('touchend', function(e) {
            setIcon(img, false);
        });
        img.parentElement.addEventListener('touchcancel', function(e) {
            setIcon(img, false);
        });
    }

    // .sidebar-icon, .sidebar-Setting 모두 적용
    const sidebarIcons = document.querySelectorAll('.sidebar-icon img');
    sidebarIcons.forEach(img => {
        addPressEffect(img);
    });
    const sidebarSettingIcons = document.querySelectorAll('.sidebar-Setting img');
    sidebarSettingIcons.forEach(img => {
        addPressEffect(img);
    });

    // 사운드 컨트롤 초기화 함수 (ready.js와 동일하게 동작)
    initSoundControl();

    // Storage 버튼 아이콘 변경 효과
    const storageBtn = document.querySelector('#btn.storage');
    if (storageBtn) {
        const storageImg = storageBtn.querySelector('img');
        if (storageImg) {
            storageBtn.addEventListener('mousedown', function() {
                storageImg.src = 'icon-fill/icon_Storage.svg';
            });
            storageBtn.addEventListener('touchstart', function() {
                storageImg.src = 'icon-fill/icon_Storage.svg';
            });
            storageBtn.addEventListener('mouseup', function() {
                storageImg.src = 'icon-white/icon_Storage.svg';
            });
            storageBtn.addEventListener('mouseleave', function() {
                storageImg.src = 'icon-white/icon_Storage.svg';
            });
            storageBtn.addEventListener('touchend', function() {
                storageImg.src = 'icon-white/icon_Storage.svg';
            });
            storageBtn.addEventListener('touchcancel', function() {
                storageImg.src = 'icon-white/icon_Storage.svg';
            });
        }
    }

    // sendBtn 버튼 배경/글자색 변경 효과 (a 태그 내부 텍스트까지)
    const sendBtn = document.querySelector('#sendBtn.sendBtn');
    if (sendBtn) {
        // standby는 a 태그 자체가 버튼이므로 sendBtn이 a임
        function setActiveSendBtnStyle() {
            sendBtn.style.backgroundColor = 'rgba(255,255,255,1)';
            sendBtn.style.color = '#588CF5';
        }
        function resetSendBtnStyle() {
            sendBtn.style.backgroundColor = '';
            sendBtn.style.color = '';
        }
        sendBtn.addEventListener('mousedown', setActiveSendBtnStyle);
        sendBtn.addEventListener('touchstart', setActiveSendBtnStyle);
        sendBtn.addEventListener('mouseup', resetSendBtnStyle);
        sendBtn.addEventListener('mouseleave', resetSendBtnStyle);
        sendBtn.addEventListener('touchend', resetSendBtnStyle);
        sendBtn.addEventListener('touchcancel', resetSendBtnStyle);
    }
});

// Three.js 초기화 함수
function initThreeJS() {
    const container = document.querySelector(".handpiece-img");
    if (!container) {
        console.error('handpiece-img를 찾을 수 없습니다.');
        return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 씬 설정
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8f0f3);

    // 카메라 설정
    const camera = new THREE.PerspectiveCamera(20, width/height, 0.1, 2000);
    camera.position.set(0, 0, 1000);

    // 렌더러 설정
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // 조명 설정
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(-1000, 200, 500);
    dirLight.target.position.set(0, 0, 0);
    scene.add(dirLight);

    // 컨트롤러 설정
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // GLB 모델 로드
    const loader = new GLTFLoader();
    loader.load(
        './src/models/HandPiece-3.glb',
        (gltf) => {
            const model = gltf.scene;
            
            // 모델 크기 조정
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const scale = Math.min(width / size.x, height / size.y) * 0.3;
            model.scale.setScalar(scale);

            // 모델 위치 조정
            model.position.set(0, -170, 0);
            
            // 모델 회전 설정 (오른쪽으로 기울이기)
            model.rotation.set(0, 0, -Math.PI * 0.08); // z축 기준으로 약 18도 기울임

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

    // 리사이즈 처리
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;

        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(newWidth, newHeight);
    });

    // 애니메이션 루프
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

// UI 초기화 함수
function initUI() {
    const values = [
        { id: 0, name: "TIP TYPE", value: "NONE", hasButtons: false },
        { id: 1, name: "INTENSITY", value: "50%" },
        { id: 2, name: "RF", value: "60ms" },
        { id: 3, name: "DEPTH", value: "0.8mm" },
        { id: 4, name: "MODE", value: "0.2s" },
        { id: 5, name: "DELAT TIME", value: "110ms" }
    ];

    const tableContent = document.getElementById("table-content");
    const pageTitle = document.getElementById("page-title");
    const sendBtn = document.getElementById("sendBtn");

    function renderPage() {
        tableContent.innerHTML = ""; // 기존 내용 초기화

        values.forEach(item => {
            const row = document.createElement("div");
            row.classList.add("row");
            
            if (item.hasButtons === false) {
                // TIP TYPE처럼 버튼이 없는 경우
                row.innerHTML = `
                    <span>${item.name}</span>
                    <div class="value-container tip-type-container">
                        <span id="value-${item.id}" class="value">${item.value}</span>
                    </div>
                `;
            } else {
                // 기존처럼 버튼이 있는 경우
                row.innerHTML = `
                    <span>${item.name}</span>
                    <div class="value-container">
                        <button class="decrease" data-id="${item.id}">-</button>
                        <span id="value-${item.id}" class="value">${item.value}</span>
                        <button class="increase" data-id="${item.id}">+</button>
                    </div>
                `;
            }
            
            tableContent.appendChild(row);
        });

        // 페이지 제목 고정
        pageTitle.textContent = "MOTOR";

        addEventListeners();
    }

    function addEventListeners() {
        document.querySelectorAll(".increase").forEach(button => {
            button.addEventListener("click", function () {
                updateValue(parseInt(this.dataset.id), "increase");
            });
        });

        document.querySelectorAll(".decrease").forEach(button => {
            button.addEventListener("click", function () {
                updateValue(parseInt(this.dataset.id), "decrease");
            });
        });
    }

    function updateValue(id, operation) {
        values.forEach(item => {
            if (item.id === id) {
                let currentVal = item.value;
                if (currentVal.includes("ms")) {
                    item.value = `${parseInt(currentVal) + (operation === "increase" ? 10 : -10)}ms`;
                } else if (currentVal.includes("%")) {
                    item.value = `${parseInt(currentVal) + (operation === "increase" ? 5 : -5)}%`;
                } else if (currentVal.includes("mm")) {
                    item.value = `${(parseFloat(currentVal) + (operation === "increase" ? 0.1 : -0.1)).toFixed(1)}mm`;
                } else if (currentVal.includes("s")) {
                    item.value = `${(parseFloat(currentVal) + (operation === "increase" ? 0.1 : -0.1)).toFixed(1)}s`;
                }

                let valueElement = document.getElementById(`value-${id}`);
                valueElement.textContent = item.value;
                
                // 값이 변경될 때도 폰트 크기 유지
                valueElement.style.fontSize = "20px";
                valueElement.style.fontWeight = "";
            }
        });
    }

    // TIP TYPE 값을 설정하는 함수
    function setTipType(tipType) {
        const tipTypeItem = values.find(item => item.id === 0);
        if (tipTypeItem) {
            tipTypeItem.value = tipType;
            const valueElement = document.getElementById('value-0');
            if (valueElement) {
                valueElement.textContent = tipType;
            }
        }
    }

    // 전역 함수로 노출 (다른 스크립트에서 사용할 수 있도록)
    window.setTipType = setTipType;

    sendBtn.addEventListener("click", function () {
        const dataToSend = values.map(item => ({ name: item.name, value: item.value }));
        console.log("전송할 데이터:", JSON.stringify(dataToSend));
        // 실제 전송 로직 (예: fetch API를 이용한 서버 전송)
    });

    // 초기 렌더링
    renderPage();
}

// 모달 초기화 함수
function initModal() {
    const overlay = document.getElementById('modalOverlay');
    const closeBtn = document.getElementById('closeModalBtn');

    if (overlay) {
        overlay.classList.add('active');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                overlay.classList.remove('active');
            });
        }

        overlay.addEventListener('click', e => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    }
}

// 배지 초기화 함수
function initBadge() {
    const userLink = document.querySelector('.sidebar-icon .user-link');
    if (userLink) {
        userLink.addEventListener('click', function() {
            const badge = this.querySelector('.badge');
            if (badge) badge.remove();
        });
    }
}

// 버튼 이벤트 초기화 함수
function initButtons() {
    const handpiece = document.querySelector('.handpiece');
    const cleanBtn = document.getElementById('cleanBtn');
    const normalBtn = document.getElementById('normalBtn');

    if (cleanBtn) {
        cleanBtn.addEventListener('click', e => {
            e.preventDefault();
            if (handpiece) {
                handpiece.style.background = "url('img/ready_07.png') no-repeat center";
                handpiece.style.backgroundSize = 'cover';
            }
        });
    }

    if (normalBtn) {
        normalBtn.addEventListener('click', e => {
            e.preventDefault();
            if (handpiece) {
                handpiece.style.background = "url('img/ready_08.png') no-repeat center";
                handpiece.style.backgroundSize = 'cover';
            }
        });
    }
}

// 사운드 컨트롤 초기화 함수 (ready.js와 동일하게 동작)
function initSoundControl() {
    const soundLi = document.querySelector('.sidebar-icon .sound-control');
    if (!soundLi) return;
    const labelSpan = soundLi.querySelector('.label');
    const slider = soundLi.querySelector('.volume-slider');
    if (!slider) return;

    // 저장된 볼륨 값 복원
    const savedVolume = localStorage.getItem('soundVolume');
    if (savedVolume !== null) {
        slider.value = savedVolume;
    }

    // Sound 메뉴 클릭 → 토글
    soundLi.querySelector('a').addEventListener('click', e => {
        e.stopPropagation();
        labelSpan.classList.toggle('hidden');
        slider.classList.toggle('hidden');
    });

    // 사운드 슬라이더 값에 따라 사운드 아이콘 변경 (icon-fill)
    function updateSoundIcon(val) {
        const soundImg = soundLi.querySelector('img');
        if (!soundImg) return;
        if (val == 0) {
            soundImg.src = '../icon-fill/icon_Sound(1).svg';
        } else if (val > 0 && val <= 50) {
            soundImg.src = '../icon-fill/icon_Sound(2).svg';
        } else {
            soundImg.src = '../icon-fill/icon_Sound(3).svg';
        }
    }

    // 사운드 슬라이더가 사라질 때 사운드 아이콘을 icon-white로 변경 (값에 따라)
    function setSoundIconWhite() {
        const soundImg = soundLi.querySelector('img');
        if (!soundImg) return;
        const val = Number(slider.value);
        if (val == 0) {
            soundImg.src = '../icon-white/icon_Sound(1).svg';
        } else if (val > 0 && val <= 50) {
            soundImg.src = '../icon-white/icon_Sound(2).svg';
        } else {
            soundImg.src = '../icon-white/icon_Sound(3).svg';
        }
    }

    // 슬라이더 조절 시 볼륨 값 저장 및 실시간 아이콘 변경
    slider.addEventListener('input', function() {
        const volume = Number(this.value);
        localStorage.setItem('soundVolume', volume);
        updateSoundIcon(volume); // 실시간으로 icon-fill 아이콘 변경
    });
    
    // 슬라이더 클릭 시에만 icon-fill로 변경
    slider.addEventListener('mousedown', function() {
        updateSoundIcon(Number(this.value));
    });
    
    // 슬라이더에서 손을 떼면 icon-fill 상태 유지 (외부 클릭이 아니므로)
    // mouseup 이벤트 제거 - icon-fill 상태 유지
    
    // 페이지 진입 시 초기값 반영 (icon-white로 표시)
    const val = Number(slider.value);
    const soundImg = soundLi.querySelector('img');
    if (soundImg) {
      if (val == 0) {
        soundImg.src = '../icon-white/icon_Sound(1).svg';
      } else if (val > 0 && val <= 50) {
        soundImg.src = '../icon-white/icon_Sound(2).svg';
      } else {
        soundImg.src = '../icon-white/icon_Sound(3).svg';
      }
    }

    // 외부 클릭 시 슬라이더 숨기고 icon-white로 변경
    document.addEventListener('click', e => {
        if (!soundLi.contains(e.target)) {
            if (!slider.classList.contains('hidden')) {
                slider.classList.add('hidden');
                if (labelSpan) labelSpan.classList.remove('hidden');
                setSoundIconWhite();
            }
        }
    });
}