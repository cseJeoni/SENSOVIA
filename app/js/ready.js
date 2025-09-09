document.addEventListener("DOMContentLoaded", function () {
  const values = [
      { id: 0, name: "TIP TYPE", value: "NONE", hasButtons: false },
      { id: 1, name: "INTENSITY", value: "50%" },
      { id: 2, name: "RF", value: "2000ms" },
      { id: 3, name: "DEPTH", value: "2.0mm" },
      { id: 4, name: "MODE", value: "0.2s" },
      { id: 5, name: "DELAT TIME", value: "1000ms" }
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
      
      if (window.wsManager && window.wsManager.isConnected) {
          // 사이클 실행
          executeCycle();
      } else {
          console.warn("WebSocket이 연결되지 않았습니다.");
      }
  });

  // 사이클 실행 상태 변수
  let cycleInProgress = false;

  // 사이클 실행 함수
  async function executeCycle() {
      console.log('★'.repeat(60));
      console.log('★ executeCycle() 함수 진입!');
      console.log('★ cycleInProgress 상태:', cycleInProgress);
      console.log('★'.repeat(60));
      
      if (cycleInProgress) {
          console.warn("사이클이 이미 실행 중입니다.");
          return;
      }
      
      try {
          cycleInProgress = true;
          updateCycleButtonState(true);
          console.log("=== 사이클 시작 ===");
          
          // 사이클 시작 시 니들 올라간 이미지로 변경
          setHandpieceImage('ready_07.png');
          
          // 파라미터 값들 추출
          const depthItem = values.find(item => item.name === "DEPTH");
          const intensityItem = values.find(item => item.name === "INTENSITY");
          const rfItem = values.find(item => item.name === "RF");
          const delayItem = values.find(item => item.name === "DELAT TIME");
          
          if (!depthItem || !intensityItem || !rfItem || !delayItem) {
              console.error("필수 파라미터가 누락되었습니다.");
              return;
          }
          
          const depthValue = parseFloat(depthItem.value.replace('mm', ''));
          const motorPosition = Math.round(depthValue * 100); // depth * 100
          const intensity = parseInt(intensityItem.value.replace('%', ''));
          const rfTime = parseInt(rfItem.value.replace('ms', ''));
          const delayTime = parseInt(delayItem.value.replace('ms', ''));
          
          // 파라미터 유효성 검사
          if (depthValue <= 0 || intensity <= 0 || rfTime <= 0) {
              console.error("잘못된 파라미터 값입니다.");
              return;
          }
          
          console.log(`사이클 파라미터: Depth=${depthValue}mm(${motorPosition}), Intensity=${intensity}%, RF=${rfTime}ms, Delay=${delayTime}ms`);
          
          // 1단계: depth 만큼 모터 전진
          console.log("1단계: 모터를 depth 위치로 이동");
          updateCycleStatus("모터 이동 중...");
          if (!window.wsManager.moveMotor(motorPosition, 'position')) {
              throw new Error("모터 이동 명령 전송 실패");
          }
          
          // 2단계: 0.3초 딜레이 (타겟 위치 도달 확실하게 하기 위함)
          console.log("2단계: 0.3초 딜레이 (위치 안정화)");
          updateCycleStatus("위치 안정화 중...");
          await delay(1000);
          
          // 3단계: RF intensity(level)로 RF(onTime) 만큼 쏘기 (dtr high)
          console.log("3단계: RF 샷 실행");
          updateCycleStatus("RF 샷 실행 중...");
          if (!window.wsManager.sendRFShot(intensity, rfTime)) {
              throw new Error("RF 샷 명령 전송 실패");
          }
          if (!window.wsManager.sendRFDTRHigh(rfTime)) {
              throw new Error("RF DTR HIGH 명령 전송 실패");
          }
          
          // 4단계: onTime이 끝날 때부터 delay 설정한 만큼 delay
          console.log(`4단계: RF 완료 후 ${delayTime}ms 딜레이`);
          updateCycleStatus("RF 완료 대기 중...");
          await delay(rfTime + delayTime); // RF 시간 + 추가 딜레이
          
          // 5단계: 모터 0 위치로 이동
          console.log("5단계: 모터를 0 위치로 복귀");
          updateCycleStatus("모터 복귀 중...");
          if (!window.wsManager.moveMotor(0, 'position')) {
              throw new Error("모터 복귀 명령 전송 실패");
          }
          
          // 복귀 완료 대기
          await delay(500);
          
          console.log("=== 사이클 완료 ===");
          updateCycleStatus("사이클 완료");
          
          // 사이클 완료 시 니들 내려간 이미지로 변경
          setHandpieceImage('ready_08.png');
          
          // 완료 후 잠시 대기 후 상태 초기화
          setTimeout(() => {
              updateCycleStatus("");
          }, 2000);
          
      } catch (error) {
          console.error("사이클 실행 중 오류 발생:", error);
          updateCycleStatus("사이클 오류 발생");
          setTimeout(() => {
              updateCycleStatus("");
          }, 3000);
      } finally {
          cycleInProgress = false;
          updateCycleButtonState(false);
      }
  }
  
  // 사이클 버튼 상태 업데이트
  function updateCycleButtonState(inProgress) {
      const sendBtnA = sendBtn.querySelector('a');
      if (inProgress) {
          sendBtn.style.opacity = '0.6';
          sendBtn.style.pointerEvents = 'none';
          sendBtn.style.width = sendBtn.offsetWidth + 'px'; // 현재 너비 고정
          sendBtn.style.height = sendBtn.offsetHeight + 'px'; // 현재 높이 고정
          if (sendBtnA) {
              sendBtnA.style.whiteSpace = 'nowrap'; // 텍스트 줄바꿈 방지
              sendBtnA.textContent = 'RUNNING...';
          }
      } else {
          sendBtn.style.opacity = '1';
          sendBtn.style.pointerEvents = 'auto';
          sendBtn.style.width = ''; // 원래 크기로 복원
          sendBtn.style.height = ''; // 원래 크기로 복원
          if (sendBtnA) {
              sendBtnA.style.whiteSpace = '';
              sendBtnA.textContent = 'READY';
          }
      }
  }
  
  // 사이클 상태 표시 업데이트
  function updateCycleStatus(status) {
      // 페이지 제목 영역에 상태 표시
      const pageTitle = document.getElementById("page-title");
      if (pageTitle) {
          if (status) {
              pageTitle.innerHTML = `<a>AUTO MODE</a><br><small style="font-size: 14px; color: #588CF5;">${status}</small>`;
          } else {
              pageTitle.innerHTML = '<a>AUTO MODE</a>';
          }
      }
  }
  
  // 풋 스위치 상태 표시 업데이트
  function updateFootSwitchStatus(pressed) {
      const pageTitle = document.getElementById("page-title");
      if (pageTitle && pressed) {
          pageTitle.innerHTML = `<a>AUTO MODE</a><br><small style="font-size: 14px; color: #FF6B6B;">풋 스위치 활성화</small>`;
      }
  }
  
  // 딜레이 함수
  function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

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

    // 풋 스위치 신호 수신 시 사이클 실행
    window.wsManager.on('foot_switch', (data) => {
      console.log('='.repeat(60));
      console.log('[Ready.js] 풋 스위치 이벤트 리스너 호출됨!');
      console.log('[Ready.js] 수신된 데이터:', JSON.stringify(data));
      console.log('[Ready.js] data.pressed:', data.pressed);
      
      if (data.pressed) {
        console.log('[Ready.js] 풋 스위치 신호 수신 - 사이클 시작!');
        console.log('[Ready.js] WebSocket 연결 상태:', window.wsManager.isConnected);
        updateFootSwitchStatus(true);
        
        // 사이클 실행 (WebSocket 연결 상태 확인)
        if (window.wsManager.isConnected) {
          console.log('[Ready.js] executeCycle() 함수 호출 시작');
          executeCycle();
          console.log('[Ready.js] executeCycle() 함수 호출 완료');
        } else {
          console.warn("WebSocket이 연결되지 않아 사이클을 실행할 수 없습니다.");
        }
        
        // 풋 스위치 상태 표시 초기화 (1초 후)
        setTimeout(() => {
          updateFootSwitchStatus(false);
        }, 1000);
      } else {
        console.log('[Ready.js] 풋 스위치 released 신호 수신');
      }
      console.log('='.repeat(60));
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
    // console.log('[Ready.js] 모터 상태:', status); // 콘솔 로그 제거
    
    // 니들팁 연결 상태에 따른 경고 모달 제어
    // if (status.needle_tip_connected !== undefined) {
    //   const modal = document.getElementById('modalOverlay');
    //   if (!status.needle_tip_connected && modal) {
    //     // 니들팁이 분리되면 경고 모달 표시
    //     modal.classList.add('active');
    //   }
    // }
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
      soundImg.src = '../icon-white/icon_Sound(1).svg';
    } else if (val > 0 && val <= 50) {
      soundImg.src = '../icon-white/icon_Sound(2).svg';
    } else {
      soundImg.src = '../icon-white/icon_Sound(3).svg';
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
      storageImg.src = '../icon-fill/icon_Storage.svg';
    });
    storageBtn.addEventListener('touchstart', function() {
      storageImg.src = '../icon-fill/icon_Storage.svg';
    });
    // 마우스/터치 뗄 때 icon-white로 복귀
    storageBtn.addEventListener('mouseup', function() {
      storageImg.src = '../icon-white/icon_Storage.svg';
    });
    storageBtn.addEventListener('mouseleave', function() {
      storageImg.src = '../icon-white/icon_Storage.svg';
    });
    storageBtn.addEventListener('touchend', function() {
      storageImg.src = '../icon-white/icon_Storage.svg';
    });
    storageBtn.addEventListener('touchcancel', function() {
      storageImg.src = '../icon-white/icon_Storage.svg';
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

  // 핸드피스 이미지 변경 함수
  function setHandpieceImage(imageName) {
      if (handpiece) {
          handpiece.style.background = `url('../img/${imageName}') no-repeat center`;
          handpiece.style.backgroundSize = 'cover';
      }
  }

  // 수동 버튼 이벤트 (기존 기능 유지)
  document.getElementById('cleanBtn').addEventListener('click', e => {
      e.preventDefault();
      setHandpieceImage('ready_07.png');
  });
  document.getElementById('normalBtn').addEventListener('click', e => {
      e.preventDefault();
      setHandpieceImage('ready_08.png');
  });

  // WebSocket 클라이언트 초기화 및 사이클 상태 감지
  if (typeof WebSocketClient !== 'undefined') {
      const wsClient = new WebSocketClient();
      
      // 사이클 상태 변경 감지
      wsClient.on('motor_status', (data) => {
          // 사이클 시작 감지 (모터가 움직이기 시작할 때)
          if (data.position > 0 && data.force > 0) {
              setHandpieceImage('ready_07.png'); // 사이클 시작
          }
      });
      
      wsClient.on('cycle_complete', (data) => {
          setHandpieceImage('ready_08.png'); // 사이클 완료
      });
      
      // 풋스위치 상태 감지를 통한 사이클 제어
      wsClient.on('footswitch_status', (data) => {
          if (data.pressed) {
              setHandpieceImage('ready_07.png'); // 풋스위치 눌림 - 사이클 시작
          } else {
              setHandpieceImage('ready_08.png'); // 풋스위치 해제 - 사이클 종료
          }
      });
  }

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
  soundImg.src = '../icon-fill/icon_Sound(1).svg';
} else if (val > 0 && val <= 50) {
  soundImg.src = '../icon-fill/icon_Sound(2).svg';
} else {
  soundImg.src = '../icon-fill/icon_Sound(3).svg';
}
}

// 사운드 슬라이더가 사라질 때 사운드 아이콘을 icon-white로 변경 (값에 따라)
function setSoundIconWhite() {
const soundImg = document.querySelector('.sidebar-icon .sound-control img');
const slider = document.querySelector('.sidebar-icon .sound-control .volume-slider');
if (!soundImg || !slider) return;
const val = Number(slider.value);
if (val == 0) {
  soundImg.src = '../icon-white/icon_Sound(1).svg';
} else if (val > 0 && val <= 50) {
  soundImg.src = '../icon-white/icon_Sound(2).svg';
} else {
  soundImg.src = '../icon-white/icon_Sound(3).svg';
}
}