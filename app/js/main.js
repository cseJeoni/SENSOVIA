const autoBtn = document.querySelector('.auto');
if (autoBtn) {
  autoBtn.addEventListener('click', function() {
    window.location.href = 'ready.html';
  });
}

// sidebar 아이콘 클릭 시 icon-white ↔ icon-fill로 변경 (꾹 누르는 동안만 fill)
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
  if (!img || !img.parentElement) return;
  // 마우스/터치 눌렀을 때 fill, 뗄 때 white
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

// .sidebar-icon 내부 아이콘
const sidebarIcons = document.querySelectorAll('.sidebar-icon img');
if (sidebarIcons && sidebarIcons.length > 0) {
  sidebarIcons.forEach(img => {
    addPressEffect(img);
  });
}

// .sidebar-DrakMode 내부 아이콘
const darkModeIcons = document.querySelectorAll('.sidebar-DrakMode img');
if (darkModeIcons && darkModeIcons.length > 0) {
  darkModeIcons.forEach(img => {
    addPressEffect(img);
  });
}
