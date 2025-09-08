document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('keyboard-overlay');
  const modal = document.querySelector('.keyboard-modal');
  const searchInput = document.querySelector('.search-input');
  const keyboardInput = document.getElementById('keyboard-input');
  const newUserForm = document.querySelector('.new-user-form');
  const keyboardKeys = document.querySelector('.keyboard-keys');
  const newBtn = document.getElementById('newBtn');
  const searchBtn = document.querySelector('.search-btn');
const selectAll = document.getElementById('selectAll');
const deleteBtn = document.getElementById('deleteBtn');

  let currentMode = '';
  let currentInputField = null;
  let shiftActive = false;

// 전체 선택/해제
selectAll.addEventListener('change', () => {
    console.log('전체 선택 체크박스 변경됨');
    const checkboxes = document.querySelectorAll('.row-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = selectAll.checked;
    toggleRowHighlight(cb.closest('tr'), cb.checked);
  });
  updateDeleteBtn();
});

// 개별 체크박스 변화 처리
  const checkboxes = document.querySelectorAll('.row-checkbox');
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
    if (row) {
      if (isSelected) {
        row.classList.add('selected');
      } else {
        row.classList.remove('selected');
      }
    }
}

// Delete 버튼 활성화/비활성화
function updateDeleteBtn() {
    const deleteBtn = document.getElementById('deleteBtn');
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    const anyChecked = checkboxes.length > 0;
    
    console.log('선택된 체크박스 수:', checkboxes.length);
    console.log('Delete 버튼 상태 업데이트:', anyChecked ? '활성화' : '비활성화');
    
    if (deleteBtn) {
  deleteBtn.disabled = !anyChecked;
    }
}

  // Delete 클릭 시 선택된 행 제거
deleteBtn.addEventListener('click', () => {
    console.log('Delete 버튼 클릭됨');
    const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
    console.log('선택된 항목 수:', checkedBoxes.length);
    
    checkedBoxes.forEach(cb => {
      const row = cb.closest('tr');
      if (row) {
        row.remove();
        console.log('행이 삭제됨');
      }
  });

  updateDeleteBtn();
  selectAll.checked = false;
    saveTableData();
});

// 키보드
  // 검색창 클릭 시
  searchInput.addEventListener('focus', () => {
    openKeyboard('search');
  });

  // 검색 버튼 클릭 시
  searchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openKeyboard('search');
    });

  // +New 버튼 클릭 시
  newBtn.addEventListener('click', () => {
    openKeyboard('new');
  });

  function openKeyboard(mode) {
    currentMode = mode;
    overlay.classList.remove('hidden');

    // 모드에 따른 UI 조정
    if (mode === 'search') {
      keyboardInput.classList.remove('hidden');
      newUserForm.classList.add('hidden');
      keyboardInput.value = '';
      setupSearchKeyboard();
    } else {
      keyboardInput.classList.add('hidden');
      newUserForm.classList.remove('hidden');
      resetNewUserForm();
      setupNewUserKeyboard();
      // 첫 번째 입력 필드 활성화
      currentInputField = document.getElementById('name');
      highlightCurrentField();
    }
  }

  function setupSearchKeyboard() {
    keyboardKeys.innerHTML = '';
    const keys = [
      ['Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Back'],
      ['~', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'Clear'],
      ['#', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '-',],
      ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '@', 'Enter']
    ];
    createKeyboard(keys, 'search');
  }

  function setupNewUserKeyboard() {
    keyboardKeys.innerHTML = '';
    const keys = [
      ['Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Back'],
      ['~', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'Clear'],
      ['#', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '-',],
      ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '@', 'Enter']
    ];
    createKeyboard(keys, 'new');
  }

  function createKeyboard(keys, mode) {
    keys.forEach(row => {
      row.forEach(key => {
        const button = document.createElement('button');
        button.textContent = key;
        button.setAttribute('data-key', key);

        if (key === 'Enter') {
          button.classList.add('save-key');
        }

        button.addEventListener('click', () => handleKeyPress(key, mode));
        keyboardKeys.appendChild(button);
      });
    });
  }

  function handleKeyPress(key, mode) {
    const targetInput = mode === 'search' ? keyboardInput : currentInputField;
    if (!targetInput) return;

    switch(key.toLowerCase()) {
        case 'shift':
          shiftActive = !shiftActive;
        toggleShift();
          break;
        case 'clear':
        targetInput.value = '';
          break;
        case 'back':
        targetInput.value = targetInput.value.slice(0, -1);
        if (targetInput.id === 'rrn') {
          formatRRN(targetInput, false);
        }
          break;
      case 'enter':
        if (mode === 'search') {
          performSearch(keyboardInput.value);
          overlay.classList.add('hidden');
          } else {
          if (targetInput.id === 'rrn') {
            formatRRN(targetInput, true);
          } else if (targetInput.id === 'prev-date' || targetInput.id === 'mfg-date') {
            if (targetInput.value && !isValidDate(targetInput.value)) {
              alert('올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)');
              return;
            }
          }
          handleEnterInNewMode();
          }
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
        }
        
        // RRN 필드인 경우 숫자만 입력 가능하고 13자리로 제한
        if (targetInput.id === 'rrn') {
          if (!/^\d$/.test(output)) return; // 숫자가 아니면 입력 무시
          const currentValue = targetInput.value.replace(/[^0-9]/g, '');
          if (currentValue.length >= 13) return; // 13자리 초과 입력 방지
        }
        // 날짜 필드인 경우 숫자와 하이픈만 허용
        else if (targetInput.id === 'prev-date' || targetInput.id === 'mfg-date') {
          if (!/[\d-]/.test(output)) return;
          
          // 자동으로 하이픈 추가
          const value = targetInput.value;
          if (output !== '-') {
            if (value.length === 4 || value.length === 7) {
              output = '-' + output;
          }
          } else if (value.length !== 4 && value.length !== 7) {
            return;
          }
        }
        
        targetInput.value += output;
        
        if (targetInput.id === 'rrn') {
          formatRRN(targetInput, false);
      }
    }
  }

  function toggleShift() {
    const keys = keyboardKeys.querySelectorAll('button');
    const excludedKeys = ['Esc', 'Back', 'Clear', 'Shift', 'Enter'];
    
    keys.forEach(key => {
        const keyText = key.textContent;
        const dataKey = key.getAttribute('data-key');
        
        if (!excludedKeys.includes(dataKey) && /^[a-zA-Z]$/.test(keyText)) {
            key.textContent = shiftActive ? keyText.toUpperCase() : keyText.toLowerCase();
        }
        else if (dataKey === '-') {
            key.textContent = shiftActive ? '_' : '-';
        }
    });
  }

  // 새 사용자 입력 폼 필드 클릭 이벤트
  const inputFields = newUserForm.querySelectorAll('input[readonly]');
  inputFields.forEach(field => {
    field.addEventListener('click', () => {
      currentInputField = field;
      highlightCurrentField();
    });
  });

  function highlightCurrentField() {
    inputFields.forEach(field => {
      field.style.borderColor = field === currentInputField ? '#6d90d1' : '#ddd';
    });
  }

  function resetNewUserForm() {
    inputFields.forEach(field => field.value = '');
    document.getElementById('gender').selectedIndex = 0;
    document.getElementById('tip-type').selectedIndex = 0;
    currentInputField = null;
  }

  function saveNewUserData() {
    const newUserData = {
      name: document.getElementById('name').value,
      rrn: document.getElementById('rrn').value,
      gender: document.getElementById('gender').value,
      prevDate: document.getElementById('prev-date').value,
      tipType: document.getElementById('tip-type').value,
      shotCount: document.getElementById('shot-count').value,
      mfgDate: document.getElementById('mfg-date').value
    };

    if (!newUserData.name) {
      alert('이름을 입력해주세요.');
      return;
    }

    addNewRow(newUserData);
    overlay.classList.add('hidden');
    resetNewUserForm();
  }

  function addNewRow(data) {
    const table = document.querySelector('.storage-table tbody');
    const newRow = table.insertRow();
    
    // 체크박스 셀 추가
    const checkboxCell = newRow.insertCell();
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'row-checkbox';
    checkboxCell.appendChild(checkbox);

    // 데이터 셀 추가
    Object.entries(data).forEach(([key, value]) => {
      const cell = newRow.insertCell();
      if (key === 'rrn') {
        const rrnValue = value.replace(/[^0-9]/g, '');
        cell.textContent = rrnValue.slice(0, 6) + '-' + '*'.repeat(7);
      } else {
        cell.textContent = value;
      }
    });

    // 새로운 체크박스에 이벤트 리스너 추가
    addCheckboxListener(checkbox);

    // 테이블 데이터 저장
    saveTableData();
  }

  // 모달 바깥 클릭 시 닫기
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.add('hidden');
    }
  });

  // 검색 함수
  function performSearch(keyword) {
    const rows = document.querySelectorAll('.storage-table tbody tr');
    const q = keyword.trim().toLowerCase();

    rows.forEach(tr => {
      const cells = tr.querySelectorAll('td');
      const name = cells[1].textContent.toLowerCase();
      const rrn  = cells[2].textContent.toLowerCase();

      if (name.includes(q) || rrn.includes(q)) {
        tr.style.display = '';
      } else {
        tr.style.display = 'none';
      }
    });
  }

  function handleEnterInNewMode() {
    const fields = [
      document.getElementById('name'),
      document.getElementById('rrn'),
      document.getElementById('gender'),
      document.getElementById('prev-date'),
      document.getElementById('tip-type'),
      document.getElementById('shot-count'),
      document.getElementById('mfg-date')
    ];

    // 현재 필드의 인덱스 찾기
    const currentIndex = fields.indexOf(currentInputField);
    
    if (currentIndex === -1) {
      // 현재 선택된 필드가 없으면 첫 번째 필드 선택
      currentInputField = fields[0];
      highlightCurrentField();
      return;
    }

    // 마지막 필드인 경우 저장 실행
    if (currentIndex === fields.length - 1) {
      // RRN 필드의 마스킹 처리
      const rrnField = document.getElementById('rrn');
      if (rrnField) {
        formatRRN(rrnField, true);
      }
      saveNewUserData();
      return;
    }

    // 다음 필드로 이동
    let nextIndex = currentIndex + 1;
    // select 요소는 건너뛰기
    while (nextIndex < fields.length && fields[nextIndex].tagName === 'SELECT') {
      nextIndex++;
    }

    if (nextIndex < fields.length) {
      currentInputField = fields[nextIndex];
      highlightCurrentField();
    }
  }

  const refreshBtn = document.getElementById('refreshBtn');
  
  // 초기 로드 시 저장된 데이터 복원
  loadTableData();

  // Refresh 버튼 클릭 이벤트
  refreshBtn.addEventListener('click', () => {
    // 검색 필드 초기화
    searchInput.value = '';
    
    // 체크박스 초기화
    document.getElementById('selectAll').checked = false;
    document.querySelectorAll('.row-checkbox').forEach(cb => {
      cb.checked = false;
      cb.closest('tr').classList.remove('selected');
  });

    // Delete 버튼 비활성화
    document.getElementById('deleteBtn').disabled = true;

    // 숨겨진 행 모두 표시
    document.querySelectorAll('.storage-table tbody tr').forEach(tr => {
      tr.style.display = '';
    });
  });

  // 테이블 데이터 저장 함수
  function saveTableData() {
    const rows = [];
    document.querySelectorAll('.storage-table tbody tr').forEach(tr => {
      const rowData = [];
      tr.querySelectorAll('td').forEach((td, index) => {
        if (index > 0) {
          // RRN 열인 경우 원본 데이터 저장
          if (index === 2) { // RRN이 있는 열 인덱스
            const rrnText = td.textContent;
            rowData.push(rrnText); // 마스킹된 형태로 저장
          } else {
            rowData.push(td.textContent);
          }
        }
      });
      rows.push(rowData);
    });
    localStorage.setItem('userTableData', JSON.stringify(rows));
  }

  // 테이블 데이터 로드 함수
  function loadTableData() {
    const savedData = localStorage.getItem('userTableData');
    if (!savedData) return;

    try {
      const rows = JSON.parse(savedData);
    const tbody = document.querySelector('.storage-table tbody');
      tbody.innerHTML = ''; // 기존 데이터 초기화

      rows.forEach(rowData => {
        const tr = tbody.insertRow();
        
        // 체크박스 셀 추가
        const checkboxCell = tr.insertCell();
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'row-checkbox';
        checkboxCell.appendChild(checkbox);

        // 데이터 셀 추가
        rowData.forEach(cellData => {
          const cell = tr.insertCell();
          cell.textContent = cellData;
        });

        // 새로운 체크박스에 이벤트 리스너 추가
        addCheckboxListener(checkbox);
      });
    } catch (error) {
      console.error('테이블 데이터 로드 중 오류 발생:', error);
    }
  }

  // 주민등록번호 포맷팅 함수
  function formatRRN(input, shouldMask) {
    let value = input.value.replace(/[^0-9]/g, ''); // 숫자만 추출
    
    if (value.length > 6) {
      const front = value.slice(0, 6);
      const back = value.slice(6);
      
      if (shouldMask) {
        // 마스킹 처리
        input.value = front + '-' + '*'.repeat(7);
      } else {
        // 입력 중에는 실제 숫자 표시
        input.value = front + '-' + back;
      }
      
      // 실제 값은 데이터 속성에 저장
      input.setAttribute('data-full-rrn', value);
    } else if (value.length > 0) {
      input.value = value;
    }
  }

  // 체크박스 이벤트 리스너 추가
  function addCheckboxListener(checkbox) {
    if (!checkbox) return;

    checkbox.addEventListener('change', () => {
      console.log('체크박스 상태 변경됨');
      const row = checkbox.closest('tr');
      toggleRowHighlight(row, checkbox.checked);
      updateDeleteBtn();

      // 전체 선택 체크박스 상태 업데이트
      const selectAll = document.getElementById('selectAll');
      if (selectAll) {
        const allCheckboxes = document.querySelectorAll('.row-checkbox');
        selectAll.checked = Array.from(allCheckboxes).every(cb => cb.checked);
      }
    });
  }

  // 날짜 입력 필드 초기화
  const prevDateField = document.getElementById('prev-date');
  const mfgDateField = document.getElementById('mfg-date');
  
  // 달력 아이콘 추가
  function addDatepicker(inputField) {
    const wrapper = inputField.parentElement;
    
    // 달력 아이콘 버튼 생성
    const calendarBtn = document.createElement('button');
    calendarBtn.type = 'button';
    calendarBtn.className = 'calendar-btn';
    
    // 달력 아이콘 이미지 생성
    const calendarIcon = document.createElement('img');
    calendarIcon.src = 'assets/calendar-icon.svg';
    calendarIcon.alt = '달력';
    calendarBtn.appendChild(calendarIcon);
    
    wrapper.appendChild(calendarBtn);

    // 달력 컨테이너 생성
    const calendarContainer = document.createElement('div');
    calendarContainer.className = 'calendar-container hidden';
    wrapper.appendChild(calendarContainer);

    // 달력 아이콘 클릭 이벤트
    calendarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = calendarContainer.classList.contains('hidden');
      
      // 다른 열린 달력 모두 닫기
      document.querySelectorAll('.calendar-container').forEach(cal => {
        cal.classList.add('hidden');
      });

      // 현재 달력 토글
      if (isHidden) {
        calendarContainer.classList.remove('hidden');
        renderCalendar(calendarContainer, inputField);
      } else {
        calendarContainer.classList.add('hidden');
      }
    });

    // 문서 클릭 시 달력 닫기
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        calendarContainer.classList.add('hidden');
      }
    });
  }

  // 달력 렌더링
  function renderCalendar(container, inputField) {
    const today = new Date();
    let currentDate = inputField.value ? 
      new Date(inputField.value) : 
      new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 달력 헤더
    const header = document.createElement('div');
    header.className = 'calendar-header';
    
    // 년도 선택 드롭다운
    const yearSelect = document.createElement('select');
    yearSelect.className = 'year-select';
    // 현재 년도 기준 ±10년
    for (let y = year - 10; y <= year + 10; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y + '년';
        if (y === year) option.selected = true;
        yearSelect.appendChild(option);
    }
    
    // 월 선택 드롭다운
    const monthSelect = document.createElement('select');
    monthSelect.className = 'month-select';
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', 
                   '7월', '8월', '9월', '10월', '11월', '12월'];
    months.forEach((monthName, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = monthName;
        if (index === month) option.selected = true;
        monthSelect.appendChild(option);
    });

    header.innerHTML = `
        <button class="prev-month">◀</button>
        <div class="calendar-title">
            ${yearSelect.outerHTML}
            ${monthSelect.outerHTML}
        </div>
        <button class="next-month">▶</button>
    `;

    // 요일 헤더
    const weekDays = document.createElement('div');
    weekDays.className = 'calendar-weekdays';
    weekDays.innerHTML = `
        <div>일</div><div>월</div><div>화</div><div>수</div>
        <div>목</div><div>금</div><div>토</div>
    `;

    // 날짜 그리드
    const daysGrid = document.createElement('div');
    daysGrid.className = 'calendar-days';

    function updateCalendarDays() {
        daysGrid.innerHTML = '';
        
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // 이전 달의 날짜들
        const prevMonthDays = firstDay.getDay();
        const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
        for (let i = prevMonthDays - 1; i >= 0; i--) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day prev-month';
            dayDiv.textContent = prevMonth.getDate() - i;
            daysGrid.appendChild(dayDiv);
        }

        // 현재 달의 날짜들
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day';
            if (currentDate.getFullYear() === today.getFullYear() && 
                currentDate.getMonth() === today.getMonth() && 
                i === today.getDate()) {
                dayDiv.classList.add('today');
            }
            dayDiv.textContent = i;
            dayDiv.addEventListener('click', () => {
                const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
                const formattedDate = formatDate(selectedDate);
                inputField.value = formattedDate;
                container.classList.add('hidden');
            });
            daysGrid.appendChild(dayDiv);
        }

        // 다음 달의 날짜들
        const nextMonthDays = 42 - (prevMonthDays + lastDay.getDate());
        for (let i = 1; i <= nextMonthDays; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day next-month';
            dayDiv.textContent = i;
            daysGrid.appendChild(dayDiv);
        }
    }

    // 달력 조립
    container.innerHTML = '';
    container.appendChild(header);
    container.appendChild(weekDays);
    container.appendChild(daysGrid);
    updateCalendarDays();

    // 이벤트 리스너 설정
    const yearSelectElement = container.querySelector('.year-select');
    const monthSelectElement = container.querySelector('.month-select');

    yearSelectElement.addEventListener('change', (e) => {
        currentDate.setFullYear(parseInt(e.target.value));
        updateCalendarDays();
    });

    monthSelectElement.addEventListener('change', (e) => {
        currentDate.setMonth(parseInt(e.target.value));
        updateCalendarDays();
    });

    // 이전/다음 달 버튼 이벤트
    container.querySelector('.prev-month').addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentDate.getMonth() === 0) {
            currentDate.setFullYear(currentDate.getFullYear() - 1);
            currentDate.setMonth(11);
        } else {
            currentDate.setMonth(currentDate.getMonth() - 1);
        }
        yearSelectElement.value = currentDate.getFullYear();
        monthSelectElement.value = currentDate.getMonth();
        updateCalendarDays();
    });

    container.querySelector('.next-month').addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentDate.getMonth() === 11) {
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            currentDate.setMonth(0);
        } else {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        yearSelectElement.value = currentDate.getFullYear();
        monthSelectElement.value = currentDate.getMonth();
        updateCalendarDays();
    });
  }

  // 날짜 포맷 함수
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 날짜 유효성 검사
  function isValidDate(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
  }

  // 달력 초기화
  addDatepicker(prevDateField);
  addDatepicker(mfgDateField);

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

  const sidebarIcons = document.querySelectorAll('.sidebar-icon img');
  sidebarIcons.forEach(img => {
    addPressEffect(img);
  });
  const darkModeIcons = document.querySelectorAll('.sidebar-DrakMode img');
  darkModeIcons.forEach(img => {
    addPressEffect(img);
  });
});

