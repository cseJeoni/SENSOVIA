/**
 * 페이지 전환 시 깜박임 방지를 위한 스크립트
 */

// 페이지 로드 완료 시 fade-in 효과
document.addEventListener('DOMContentLoaded', function() {
    document.body.style.opacity = '1';
});

// 페이지 이동 시 부드러운 전환 효과
function smoothPageTransition(url) {
    // 현재 페이지를 fade-out
    document.body.style.transition = 'opacity 0.2s ease-out';
    document.body.style.opacity = '0';
    
    // fade-out 완료 후 페이지 이동
    setTimeout(() => {
        window.location.href = url;
    }, 200);
}

// 모든 링크에 부드러운 전환 적용
document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('a[href]');
    
    links.forEach(link => {
        // 외부 링크나 특수 링크는 제외
        if (link.href.startsWith('javascript:') || 
            link.href.startsWith('#') || 
            link.target === '_blank') {
            return;
        }
        
        link.addEventListener('click', function(e) {
            e.preventDefault();
            smoothPageTransition(this.href);
        });
    });
});

// 뒤로가기/앞으로가기 버튼 처리
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // 브라우저 캐시에서 복원된 경우
        document.body.style.opacity = '1';
    }
});

// 페이지 언로드 시 처리
window.addEventListener('beforeunload', function() {
    document.body.style.opacity = '0';
});
