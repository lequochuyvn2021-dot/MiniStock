/**
 * MiniStock - Module Giao Diện Chung & Điều Khiển Toàn Cục
 * File: js/main.js
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Khởi tạo dữ liệu mẫu nếu cần
  StorageService.initInitialData();

  // 2. Khởi tạo xác thực & hiển thị thông tin người dùng
  if (typeof Auth !== 'undefined') {
    Auth.renderHeaderAndNav();
  }

  // 3. Khởi tạo Sidebar Drawer trên di động
  initMobileSidebar();

  // 4. Highlight menu đang hoạt động
  highlightActiveMenuItem();

  // 5. Gắn sự kiện Sao lưu & Khôi phục dữ liệu toàn cục
  initGlobalDataActions();

  // 6. Đồng hồ thời gian thực + lời chào trên header
  initHeaderClock();

  // 7. Nút đóng modal dùng chung (thay cho onclick viết trực tiếp trong HTML)
  initCloseModalButtons();
});

/**
 * Chọn lời chào theo giờ trong ngày.
 * Chia 24 giờ thành 4 khoảng 6 tiếng rồi dùng switch để chọn câu chào.
 * @param {number} hour - giờ hiện tại (0 - 23)
 * @returns {string} câu chào
 */
function getGreeting(hour) {
  switch (Math.floor(hour / 6)) {
    case 0:
      return 'Khuya rồi, nhớ nghỉ ngơi nhé';
    case 1:
      return 'Chào buổi sáng';
    case 2:
      return 'Chào buổi chiều';
    default:
      return 'Chào buổi tối';
  }
}

/**
 * Tạo đồng hồ ở góc phải header và cập nhật mỗi giây bằng setInterval
 */
function initHeaderClock() {
  const headerRight = document.querySelector('.header-right');
  if (!headerRight) return;

  const clock = document.createElement('div');
  clock.className = 'header-clock';
  clock.innerHTML = '<span class="header-clock-time" id="header-clock-time"></span>' +
    '<span class="header-clock-greet" id="header-clock-greet"></span>';
  headerRight.insertBefore(clock, headerRight.firstChild);

  const timeEl = document.getElementById('header-clock-time');
  const greetEl = document.getElementById('header-clock-greet');

  const updateClock = () => {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    greetEl.textContent = getGreeting(now.getHours());
  };

  updateClock();
  setInterval(updateClock, 1000); // Cập nhật lại mỗi 1 giây
}

/**
 * Các nút có thuộc tính data-close-modal="id-modal" sẽ đóng modal tương ứng
 */
function initCloseModalButtons() {
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById(btn.getAttribute('data-close-modal'));
      if (modal) modal.classList.remove('active');
    });
  });
}

/**
 * Điều khiển mở/đóng Sidebar trên màn hình điện thoại & máy tính bảng
 */
function initMobileSidebar() {
  const toggleBtn = document.getElementById('btn-sidebar-toggle');
  const sidebar = document.querySelector('.app-sidebar');

  if (!toggleBtn || !sidebar) return;

  // Tạo lớp phủ mờ nếu chưa có
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  const openSidebar = () => {
    sidebar.classList.add('show');
    overlay.classList.add('active');
  };

  const closeSidebar = () => {
    sidebar.classList.remove('show');
    overlay.classList.remove('active');
  };

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sidebar.classList.contains('show')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  overlay.addEventListener('click', closeSidebar);
}

/**
 * Tự động đánh dấu class active cho trang hiện tại
 */
function highlightActiveMenuItem() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const menuLinks = document.querySelectorAll('.menu-link');

  menuLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Xử lý sự kiện Sao lưu JSON và Khôi phục mẫu
 */
function initGlobalDataActions() {
  // Nút Xuất sao lưu JSON
  const btnExport = document.getElementById('btn-export-backup');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      StorageService.exportBackupJSON();
      Toast.success('Đã xuất file sao lưu dữ liệu MiniStock thành công!');
    });
  }

  // Nút Nhập sao lưu JSON
  const fileImport = document.getElementById('file-import-backup');
  if (fileImport) {
    fileImport.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = StorageService.importBackupJSON(event.target.result);
        if (result.success) {
          Toast.success(result.message);
          setTimeout(() => window.location.reload(), 1200);
        } else {
          Toast.error(result.message);
        }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
    });
  }

  // Nút Khôi phục dữ liệu mẫu
  const btnReset = document.getElementById('btn-reset-demo');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      ModalConfirm.open({
        title: 'Khôi phục dữ liệu gốc',
        message: 'Thao tác này sẽ đặt lại toàn bộ dữ liệu mẫu (sản phẩm, kho, đơn hàng) về trạng thái ban đầu. Bạn có chắc chắn không?',
        confirmText: 'Khôi phục ngay',
        isDanger: true,
        onConfirm: () => {
          StorageService.resetToDefault();
          Toast.success('Đã khôi phục dữ liệu mẫu thành công!');
          setTimeout(() => window.location.reload(), 1000);
        }
      });
    });
  }
}

/**
 * Xử lý ảnh lỗi mặc định
 */
function handleImageError(img) {
  img.onerror = null;
  img.src = 'images/logo/icon.svg';
  img.classList.add('img-fallback');
}
