// languageForm이 존재할 때만 이벤트 리스너 추가
const languageForm = document.getElementById("languageForm");
if (languageForm) {
  languageForm.addEventListener("change", function (e) {
    const selectedLanguage = e.target.value;
    console.log("Selected language:", selectedLanguage);
    // 여기에 언어 설정 변경 로직을 추가할 수 있음
    // 예: localStorage에 저장하거나 서버에 전송
  });
}
  

  const startTime = Date.now(); // 앱 시작 시각 기록

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
  
  function updateOperatingTime() {
    const now = Date.now();
    const elapsed = now - startTime;
    const formatted = formatTime(elapsed);
    const opTimeEl = document.getElementById("operatingTime");
    if (opTimeEl) {
      opTimeEl.textContent = formatted;
    }
  }
  
  // 처음 한번 실행
  updateOperatingTime();
  
  // 1초마다 갱신
  setInterval(updateOperatingTime, 1000);
 

  
  function updateClock() {
    const now = new Date();
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true // ← 이게 핵심! 12시간제 + AM/PM
    };
    const timeStr = now.toLocaleTimeString('en-US', options);
    const clockEl = document.getElementById("clock");
    if (clockEl) {
      clockEl.textContent = timeStr;
    }
  }
  
  updateClock();
  setInterval(updateClock, 1000);
  

  // 키보드
document.addEventListener('DOMContentLoaded', () => {
  const overlay    = document.getElementById('keyboard-overlay');
  const inputField = document.getElementById('keyboard-input');
  const keyBtns    = document.querySelectorAll('.keyboard-keys button');
  const clickArea  = document.getElementById('clickArea');

  let shiftActive = false;

  // 1) clickArea 누르면 모달 열기
  if (clickArea) {
    clickArea.addEventListener('click', () => {
      inputField.value = '';
      overlay.classList.remove('hidden');
      shiftActive = false;
      document.querySelector('[data-key="Shift"]').classList.remove('active');
    });
  }

  // 2) 키보드 버튼 핸들러
  keyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const raw = btn.dataset.key;
      const key = raw.toLowerCase();

      switch (key) {
        case 'shift':
          shiftActive = !shiftActive;
          btn.classList.toggle('active', shiftActive);
          break;

        case 'clear':
          inputField.value = '';
          break;

        case 'back':
          inputField.value = inputField.value.slice(0, -1);
          break;

        case 'save':
          applyNewSaveName(inputField.value);
          overlay.classList.add('hidden');
          break;

        case 'esc':
          overlay.classList.add('hidden');
          break;

        default:
          let output = key;
          if (shiftActive) {
            if (/^[a-z]$/.test(key)) {
              output = key.toUpperCase();
            } else if (key === '-') {
              output = '_';
            }
          }
          inputField.value += output;
          break;
      }
    });
  });

  // 3) overlay 바깥쪽 클릭 시 모달 닫기
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
      }
    });
  }
});

// sidebar 아이콘 꾹 누르는 동안 icon-fill, 떼면 icon-white 효과
const iconMap = {
  'icon_User.svg': 'icon_User.svg',
  'icon_Home.svg': 'icon_Home.svg',
  'icon_Setting.svg': 'icon_Setting.svg',
  'icon_Light.svg': 'icon_Light.svg',
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
  // .sidebar-icon, .sidebar-DrakMode 모두 적용
  const sidebarIcons = document.querySelectorAll('.sidebar-icon img');
  sidebarIcons.forEach(img => {
    addPressEffect(img);
  });
  const darkModeIcons = document.querySelectorAll('.sidebar-DrakMode img');
  darkModeIcons.forEach(img => {
    addPressEffect(img);
  });
});