document.addEventListener("DOMContentLoaded", function () {
    let currentPage = 1;

    const values = [
        { id: 1, name: "INTENSITY", value: "50%" },
        { id: 2, name: "RF", value: "60ms" },
        { id: 3, name: "DEPTH", value: "0.8mm" },
        { id: 4, name: "MODE", value: "0.2s" },
        { id: 5, name: "DELAT TIME", value: "110ms" },
        { id: 6, name: "6번값", value: "50%" },
        { id: 7, name: "7번값", value: "60ms" },
        { id: 8, name: "8번값", value: "0.8mm" },
        { id: 9, name: "9번값", value: "0.2s" },
        { id: 10, name: "10번값", value: "110ms" },
        { id: 11, name: "11번값", value: "110ms" }
    ];

    const tableContent = document.getElementById("table-content");
    const pageTitle = document.getElementById("page-title");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const sendBtn = document.getElementById("sendBtn");

    function renderPage() {
        tableContent.innerHTML = ""; // 기존 내용 초기화
        const pageData = currentPage === 1 ? values.slice(0, 5) : values.slice(5);

        pageData.forEach(item => {
            const row = document.createElement("div");
            row.classList.add("row");
            row.innerHTML = `
                <span>${item.name}</span>
                <button class="decrease" data-id="${item.id}">-</button>
                <span id="value-${item.id}" class="value">${item.value}</span>
                <button class="increase" data-id="${item.id}">+</button>
            `;
            tableContent.appendChild(row);
        });

        // 페이지 제목 업데이트
        pageTitle.textContent = currentPage === 1 ? "MOTOR" : "RF";

        // 버튼 보이기/숨기기
        prevBtn.style.display = currentPage === 1 ? "none" : "inline-block";
        nextBtn.style.display = currentPage === 2 ? "none" : "inline-block";

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

    sendBtn.addEventListener("click", function () {
        const dataToSend = values.map(item => ({ name: item.name, value: item.value }));
        console.log("전송할 데이터:", JSON.stringify(dataToSend));
        // 실제 전송 로직 (예: fetch API를 이용한 서버 전송)
    });

    prevBtn.addEventListener("click", function () {
        currentPage = 1;
        renderPage();
    });

    nextBtn.addEventListener("click", function () {
        currentPage = 2;
        renderPage();
    });

    // 초기 렌더링
    renderPage();

    // 모든 .sendBtn 버튼 아이콘 변경 효과
    const sendBtns = document.querySelectorAll('.sendBtn');
    sendBtns.forEach(btn => {
        const img = btn.querySelector('img');
        if (img) {
            btn.addEventListener('mousedown', function() {
                if (img.src.includes('icon-white/')) {
                    img.src = img.src.replace('icon-white/', 'icon-fill/');
                }
            });
            btn.addEventListener('touchstart', function() {
                if (img.src.includes('icon-white/')) {
                    img.src = img.src.replace('icon-white/', 'icon-fill/');
                }
            });
            function resetBtnIcon() {
                if (img.src.includes('icon-fill/')) {
                    img.src = img.src.replace('icon-fill/', 'icon-white/');
                }
            }
            btn.addEventListener('mouseup', resetBtnIcon);
            btn.addEventListener('mouseleave', resetBtnIcon);
            btn.addEventListener('touchend', resetBtnIcon);
            btn.addEventListener('touchcancel', resetBtnIcon);
        }
    });
});



const selectAll = document.getElementById('selectAll');
const checkboxes = document.querySelectorAll('.row-checkbox');
const deleteBtn = document.getElementById('deleteBtn');

// 전체 선택/해제
selectAll.addEventListener('change', () => {
  checkboxes.forEach(cb => {
    cb.checked = selectAll.checked;
    toggleRowHighlight(cb.closest('tr'), cb.checked);
  });
  updateDeleteBtn();
});

// 개별 체크박스 변화 처리
checkboxes.forEach(cb => {
  cb.addEventListener('change', () => {
    toggleRowHighlight(cb.closest('tr'), cb.checked);
    updateDeleteBtn();
    // 전체선택 체크박스 상태 동기화
    selectAll.checked = Array.from(checkboxes).every(c => c.checked);
  });
});

// 행에 선택 클래스 토글
function toggleRowHighlight(row, isSelected) {
  if (isSelected) row.classList.add('selected');
  else row.classList.remove('selected');
}

// Delete 버튼 활성화/비활성화
function updateDeleteBtn() {
  const anyChecked = Array.from(checkboxes).some(c => c.checked);
  deleteBtn.disabled = !anyChecked;
}

// (선택) Delete 클릭 시 선택된 행 제거
deleteBtn.addEventListener('click', () => {
  document.querySelectorAll('.row-checkbox:checked').forEach(cb => {
    cb.closest('tr').remove();
  });
  updateDeleteBtn();
  selectAll.checked = false;
});















// 키보드

document.addEventListener('DOMContentLoaded', () => {
  const overlay    = document.getElementById('keyboard-overlay');
  const inputField = document.getElementById('keyboard-input');
  const keyBtns    = document.querySelectorAll('.keyboard-keys button');
  const newBtn     = document.getElementById('newBtn');      // +New 버튼
  const selectAll  = document.getElementById('selectAll');   // (필요시)
  const deleteBtn  = document.getElementById('deleteBtn');   // (필요시)

  let shiftActive = false;


  // 1) +New 누르면 모달 열기
  newBtn.addEventListener('click', () => {
    inputField.value = '';
    overlay.classList.remove('hidden');
    shiftActive = false;  // 모달 열 때 Shift 초기화
    // (Shift 버튼에 active 클래스가 있다면 제거)
    document.querySelector('[data-key="Shift"]').classList.remove('active');
  });




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
            }
            else if (key === '-') {
              output = '_';
            }
            // 필요하면 한 번만 적용 후 Shift 해제:
            // shiftActive = false;
            // document.querySelector('[data-key="Shift"]').classList.remove('active');
          }
          inputField.value += output;
          break;
      }
    });
  });



  function applyNewSaveName(name) {
    if (!name.trim()) return;

    // 오늘 날짜 로컬 기준 yyyy-MM-dd
    const today = new Date();
    const yyyy  = today.getFullYear();
    const mm    = String(today.getMonth() + 1).padStart(2, '0');
    const dd    = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const tbody = document.querySelector('.storage-table tbody');
    const tr    = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="row-checkbox" /></td>
      <td>${name}</td>
      <td>${dateStr}</td>
    `;
    tbody.appendChild(tr);

    // 체크박스 로직 재연결(생략 가능)
    const cb = tr.querySelector('.row-checkbox');
    cb.addEventListener('change', () => {
      tr.classList.toggle('selected', cb.checked);
      deleteBtn.disabled = !document.querySelector('.row-checkbox:checked');
      selectAll.checked = Array.from(document.querySelectorAll('.row-checkbox'))
                              .every(c => c.checked);
    });
  }



  // 3) 모달 바깥 클릭 시 닫기
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.classList.add('hidden');
    }
  });

  // 4) 새 파일명 추가 로직 (원본 스크립트에서 가져오세요)
  function applyNewSaveName(name) {
    if (!name.trim()) return;
    const tbody = document.querySelector('.storage-table tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="row-checkbox" /></td>
      <td>${name}</td>
      <td>${new Date().toISOString().slice(0,10)}</td>
    `;
    tbody.appendChild(tr);
    // 새 체크박스에 이벤트도 다시 연결해야 합니다.
    tr.querySelector('.row-checkbox').addEventListener('change', () => {
      // 기졸 하이라이트 & Delete 버튼 로직 재사용
      tr.classList.toggle('selected', tr.querySelector('.row-checkbox').checked);
      deleteBtn.disabled = !document.querySelector('.row-checkbox:checked');
      selectAll.checked = Array.from(document.querySelectorAll('.row-checkbox'))
                               .every(cb => cb.checked);
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
  const sidebarIcons = document.querySelectorAll('.sidebar-icon img');
  sidebarIcons.forEach(img => {
    addPressEffect(img);
  });
  const darkModeIcons = document.querySelectorAll('.sidebar-DrakMode img');
  darkModeIcons.forEach(img => {
    addPressEffect(img);
  });
});
