document.addEventListener('DOMContentLoaded', function() {
  const container = document.querySelector('.container');
  if (!container) return;

  // 자식 요소들
  const children = Array.from(container.children);
  const maxHeight = container.offsetHeight * 0.6;
  let accHeight = 0;
  let overIndex = -1;

  // 누적 높이 계산해서 오버되는 첫 인덱스 찾기
  for (let i = 0; i < children.length; i++) {
    accHeight += children[i].offsetHeight;
    if (accHeight > maxHeight) {
      overIndex = i;
      break;
    }
  }

  // 오버되는 자식부터 .right-top 클래스 추가
  if (overIndex !== -1) {
    for (let i = overIndex; i < children.length; i++) {
      children[i].classList.add('right-top');
    }
  }
});

// 드롭다운 메뉴 토글 및 바깥 클릭 시 닫힘 기능

document.addEventListener('DOMContentLoaded', function() {
  const dropdownWrappers = document.querySelectorAll('.custom-dropdown-wrapper');

  dropdownWrappers.forEach(function(wrapper) {
    const dropdownBtn = wrapper.querySelector('.admin-mode-btn.custom-dropdown');
    const dropdownList = wrapper.querySelector('.dropdown-list');
    const selected = wrapper.querySelector('.selected');
    if (!dropdownBtn || !dropdownList || !selected) return;

    // 드롭다운 열기/닫기
    dropdownBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      // 모든 드롭다운 닫기
      document.querySelectorAll('.dropdown-list').forEach(list => list.style.display = 'none');
      dropdownList.style.display = (dropdownList.style.display === 'block') ? 'none' : 'block';
    });

    // 메뉴 클릭 시 닫기 및 선택값 변경
    dropdownList.addEventListener('click', function(e) {
      if(e.target.tagName === 'LI') {
        dropdownList.style.display = 'none';
        selected.textContent = e.target.textContent;
      }
    });

    // 드롭다운 메뉴 위에서는 닫히지 않게
    dropdownList.addEventListener('mousedown', function(e) {
      e.stopPropagation();
    });
  });

  // 바깥 클릭 시 모든 드롭다운 닫기
  document.addEventListener('click', function() {
    document.querySelectorAll('.dropdown-list').forEach(list => list.style.display = 'none');
  });
}); 


