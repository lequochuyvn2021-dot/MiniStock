/**
 * MiniStock - Trang Giới thiệu
 * File: js/about.js
 * Đọc số liệu từ LocalStorage rồi đổ vào 4 thẻ thống kê ở đầu trang.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Trang này cho cả 3 vai trò xem
  const currentUser = Auth.requireAuth(['admin', 'staff', 'warehouse']);
  if (!currentUser) return;

  // Gom các thẻ cần cập nhật vào một object: id của thẻ -> khóa LocalStorage
  const counters = {
    'about-products': STORAGE_KEYS.PRODUCTS,
    'about-categories': STORAGE_KEYS.CATEGORIES,
    'about-customers': STORAGE_KEYS.CUSTOMERS,
    'about-orders': STORAGE_KEYS.ORDERS
  };

  Object.keys(counters).forEach(elementId => {
    const list = StorageService.get(counters[elementId], []);
    const el = document.getElementById(elementId);
    if (el) el.textContent = Array.isArray(list) ? list.length : 0;
  });
});
