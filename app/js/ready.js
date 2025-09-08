document.addEventListener("DOMContentLoaded", function () {
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

  sendBtn.addEventListener("click", function (e) {
      e.preventDefault(); // 페이지 이동 방지
      
      const dataToSend = values.map(item => ({ name: item.name, value: item.value }));
      console.log("전송할 데이터:", JSON.stringify(dataToSend));
      
      // WebSocket을 통해 모터 위치 400으로 이동 명령 전송
      if (window.wsManager && window.wsManager.isConnected) {
          console.log("모터 위치 400으로 이동 명령 전송");
          window.wsManager.moveMotor(400, 'position');
          
          // 명령 전송 후 standby.html로 이동
          setTimeout(() => {
              window.location.href = 'standby.html';
          }, 500); // 0.5초 후 페이지 이동
      } else {
          console.warn("WebSocket이 연결되지 않았습니다.");
          // WebSocket이 연결되지 않아도 페이지는 이동
          window.location.href = 'standby.html';
      }
  });

  // sendBtn 버튼 배경/글자색 변경 효과 (a 태그 내부 텍스트까지)
  if (sendBtn) {
      const sendBtnA = sendBtn.querySelector('a');
      // 마우스/터치 눌렀을 때 색상 변경
      function setActiveSendBtnStyle() {
          sendBtn.style.backgroundColor = 'rgba(255,255,255,1)';
          if (sendBtnA) sendBtnA.style.color = '#588CF5';
      }
      // 마우스/터치 뗄 때 원래대로 복귀
      function resetSendBtnStyle() {
          sendBtn.style.backgroundColor = '';
          if (sendBtnA) sendBtnA.style.color = '';
      }
      sendBtn.addEventListener('mousedown', setActiveSendBtnStyle);
      sendBtn.addEventListener('touchstart', setActiveSendBtnStyle);
      sendBtn.addEventListener('mouseup', resetSendBtnStyle);
      sendBtn.addEventListener('mouseleave', resetSendBtnStyle);
      sendBtn.addEventListener('touchend', resetSendBtnStyle);
      sendBtn.addEventListener('touchcancel', resetSendBtnStyle);
  }

  // 초기 렌더링
  renderPage();

  // WebSocket 이벤트 리스너 등록
  if (window.wsManager) {
    // WebSocket 연결 상태 모니터링
    window.wsManager.on('connected', () => {
      console.log('[Ready.js] WebSocket 연결됨');
      updateConnectionStatus(true);
    });

    window.wsManager.on('disconnected', () => {
      console.log('[Ready.js] WebSocket 연결 해제됨');
      updateConnectionStatus(false);
    });

    // 모터 상태 업데이트
    window.wsManager.on('motor_status', (status) => {
      updateMotorStatus(status);
    });

    // EEPROM 데이터로 TIP TYPE 업데이트
    window.wsManager.on('eeprom_read', (result) => {
      if (result.success && result.tipType) {
        const tipTypeMap = {
          1: '16PIN',
          2: '25PIN', 
          3: '49PIN',
          4: '64PIN',
          5: '81PIN'
        };
        const tipTypeName = tipTypeMap[result.tipType] || 'UNKNOWN';
        setTipType(tipTypeName);
        
        // 핸드피스 영역의 TIP TYPE도 업데이트
        const handpieceTipType = document.querySelector('.tipType-value h3');
        if (handpieceTipType) {
          handpieceTipType.textContent = tipTypeName;
        }
        
        // SHOT COUNT 업데이트
        const shotCountElement = document.querySelector('.sohtCount-value h3');
        if (shotCountElement && result.shotCount !== undefined) {
          shotCountElement.innerHTML = `${result.shotCount}<span>/2000</span>`;
        }
      }
    });

    // 페이지 로드 시 EEPROM 데이터 읽기
    setTimeout(() => {
      if (window.wsManager.isConnected) {
        window.wsManager.readEEPROM();
      }
    }, 2000);
  }

  // 연결 상태 표시 업데이트
  function updateConnectionStatus(connected) {
    // 연결 상태에 따른 UI 업데이트 (필요시 구현)
    const statusIndicator = document.querySelector('.connection-status');
    if (statusIndicator) {
      statusIndicator.textContent = connected ? '연결됨' : '연결 해제됨';
      statusIndicator.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    }
  }

  // 모터 상태 업데이트
  function updateMotorStatus(status) {
    // 모터 위치, 힘 등의 실시간 데이터 표시 (필요시 구현)
    console.log('[Ready.js] 모터 상태:', status);
    
    // 니들팁 연결 상태에 따른 경고 모달 제어
    if (status.needle_tip_connected !== undefined) {
      const modal = document.getElementById('modalOverlay');
      if (!status.needle_tip_connected && modal) {
        // 니들팁이 분리되면 경고 모달 표시
        modal.classList.add('active');
      }
    }
  }
});

// 여기부터 사운드 볼륨 조절 //
document.addEventListener('DOMContentLoaded', function () {
const soundLi   = document.querySelector('.sidebar-icon .sound-control');
const labelSpan = soundLi ? soundLi.querySelector('.label') : null;
const slider    = soundLi ? soundLi.querySelector('.volume-slider') : null;
const soundA    = soundLi ? soundLi.querySelector('a') : null;

if (slider) {
  // 저장된 볼륨 값 복원
  const savedVolume = localStorage.getItem('soundVolume');
  if (savedVolume !== null) {
    slider.value = savedVolume;
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

  // 페이지 진입 시 초기값 반영 (icon-white로 표시)
  const val = Number(slider.value);
  const soundImg = document.querySelector('.sidebar-icon .sound-control img');
  if (soundImg) {
    if (val == 0) {
      soundImg.src = 'icon-white/icon_Sound(1).svg';
    } else if (val > 0 && val <= 50) {
      soundImg.src = 'icon-white/icon_Sound(2).svg';
    } else {
      soundImg.src = 'icon-white/icon_Sound(3).svg';
    }
  }
}

// Sound 메뉴 클릭 → 토글 (a 태그가 있을 때만)
if (soundA && labelSpan && slider) {
  soundA.addEventListener('click', e => {
    e.stopPropagation();
    labelSpan.classList.toggle('hidden');
    slider.classList.toggle('hidden');
  });
}

// 외부 클릭 시 슬라이더 숨기고 icon-white로 변경
if (slider && soundLi) {
  document.addEventListener('click', e => {
    if (!soundLi.contains(e.target)) {
      if (!slider.classList.contains('hidden')) {
        slider.classList.add('hidden');
        if (labelSpan) labelSpan.classList.remove('hidden');
      }
      setSoundIconWhite(); // 항상 icon-white로 변경
    }
  });
}

// Storage 버튼 아이콘 변경 효과
const storageBtn = document.querySelector('#btn.storage');
if (storageBtn) {
  const storageImg = storageBtn.querySelector('img');
  if (storageImg) {
    // 마우스/터치 눌렀을 때 icon-fill로 변경
    storageBtn.addEventListener('mousedown', function() {
      storageImg.src = 'icon-fill/icon_Storage.svg';
    });
    storageBtn.addEventListener('touchstart', function() {
      storageImg.src = 'icon-fill/icon_Storage.svg';
    });
    // 마우스/터치 뗄 때 icon-white로 복귀
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
});

// 여기까지 사운드 볼륨 조절 //

const overlay  = document.getElementById('modalOverlay');
const closeBtn = document.getElementById('closeModalBtn');
const confirmBtn = document.getElementById('confirmBtn');

// 페이지 로드 직후 모달 띄우기
window.addEventListener('DOMContentLoaded', () => {
overlay.classList.add('active');
});

// 닫기(X) 버튼
closeBtn.addEventListener('click', () => {
overlay.classList.remove('active');
});

// 배경 클릭 시에도 닫기
overlay.addEventListener('click', e => {
if (e.target === overlay) {
  overlay.classList.remove('active');
}
});

// 클릭한 뒤에는 배지를 제거하고, 페이지 이동
document.querySelector('.sidebar-icon .user-link')
.addEventListener('click', function(e) {
  const b = this.querySelector('.badge');
  if (b) b.remove();
  // (여기서 e.preventDefault()를 하면 배지를 지우고 SPA처럼 유지할 수 있고,
  //  그냥 내비게이션하려면 preventDefault() 생략)
});

const handpiece = document.querySelector('.handpiece');
document.getElementById('cleanBtn').addEventListener('click', e => {
e.preventDefault();
handpiece.style.background = "url('img/ready_07.png') no-repeat center";
handpiece.style.backgroundSize = 'cover';
});
document.getElementById('normalBtn').addEventListener('click', e => {
e.preventDefault();
handpiece.style.background = "url('img/ready_08.png') no-repeat center";
handpiece.style.backgroundSize = 'cover';
});

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

document.addEventListener('DOMContentLoaded', () => {
// .sidebar-icon, .sidebar-Setting 모두 적용
const sidebarIcons = document.querySelectorAll('.sidebar-icon img');
sidebarIcons.forEach(img => {
  addPressEffect(img);
});
const sidebarSettingIcons = document.querySelectorAll('.sidebar-Setting img');
sidebarSettingIcons.forEach(img => {
  addPressEffect(img);
});
});

// 사운드 슬라이더 값에 따라 사운드 아이콘 변경
function updateSoundIcon(val) {
const soundImg = document.querySelector('.sidebar-icon .sound-control img');
if (!soundImg) return;
if (val == 0) {
  soundImg.src = 'icon-fill/icon_Sound(1).svg';
} else if (val > 0 && val <= 50) {
  soundImg.src = 'icon-fill/icon_Sound(2).svg';
} else {
  soundImg.src = 'icon-fill/icon_Sound(3).svg';
}
}

// 사운드 슬라이더가 사라질 때 사운드 아이콘을 icon-white로 변경 (값에 따라)
function setSoundIconWhite() {
const soundImg = document.querySelector('.sidebar-icon .sound-control img');
const slider = document.querySelector('.sidebar-icon .sound-control .volume-slider');
if (!soundImg || !slider) return;
const val = Number(slider.value);
if (val == 0) {
  soundImg.src = 'icon-white/icon_Sound(1).svg';
} else if (val > 0 && val <= 50) {
  soundImg.src = 'icon-white/icon_Sound(2).svg';
} else {
  soundImg.src = 'icon-white/icon_Sound(3).svg';
}
}