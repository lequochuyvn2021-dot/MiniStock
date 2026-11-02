/**
 * MiniStock - Chế độ sáng / tối
 * File: js/theme.js
 *
 * Cách làm:
 * - Màu của cả website đều nằm trong biến CSS (css/style.css).
 *   Chế độ tối chỉ cần đổi giá trị các biến đó bằng cách gắn
 *   thuộc tính data-theme="dark" lên thẻ <html>.
 * - File này được nạp trong <head> (trước khi trang vẽ ra) để áp dụng
 *   theme ngay, nên khi tải lại trang không bị nháy màu trắng.
 * - Lựa chọn của người dùng lưu trong LocalStorage (key: ministock_theme).
 *   Nếu chưa chọn thì theo cài đặt sáng/tối của hệ điều hành.
 */
const Theme = {
  KEY: 'ministock_theme',

  /**
   * Đọc theme đã lưu
   * @returns {string|null} 'light', 'dark' hoặc null nếu chưa từng chọn
   */
  getSaved() {
    try {
      const value = localStorage.getItem(this.KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (e) {
      return null; // trình duyệt chặn LocalStorage thì dùng mặc định
    }
  },

  /**
   * Xác định theme đang dùng: ưu tiên lựa chọn đã lưu, sau đó đến hệ điều hành
   * @returns {string} 'light' hoặc 'dark'
   */
  getCurrent() {
    const saved = this.getSaved();
    if (saved) return saved;
    const osDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return osDark ? 'dark' : 'light';
  },

  /**
   * Áp dụng theme lên trang
   * @param {string} theme - 'light' hoặc 'dark'
   */
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.updateButton(theme);
  },

  /**
   * Đổi qua lại giữa sáng và tối, lưu lại và báo cho các phần cần vẽ lại (biểu đồ canvas)
   */
  toggle() {
    const next = this.getCurrent() === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(this.KEY, next);
    } catch (e) {
      // không lưu được thì vẫn đổi giao diện cho lần xem này
    }
    this.apply(next);
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
  },

  /**
   * Lấy giá trị của một biến CSS (dùng cho biểu đồ canvas vì canvas không đọc được var())
   * @param {string} name - tên biến, ví dụ '--text-muted'
   * @param {string} fallback - màu dự phòng
   * @returns {string}
   */
  cssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  },

  /**
   * Cập nhật biểu tượng và chữ gợi ý của nút theo theme hiện tại
   * @param {string} theme
   */
  updateButton(theme) {
    const button = document.getElementById('btn-theme-toggle');
    if (!button) return;
    const isDark = theme === 'dark';
    button.textContent = isDark ? '☀️' : '🌙';
    button.title = isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(isDark));
  },

  /**
   * Tạo nút chuyển theme: nằm ở header của các trang trong hệ thống,
   * riêng trang đăng nhập (không có header) thì nằm nổi ở góc phải trên
   */
  createButton() {
    if (document.getElementById('btn-theme-toggle')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'btn-theme-toggle';
    button.className = 'btn btn-outline btn-sm btn-theme';
    button.addEventListener('click', () => this.toggle());

    const headerRight = document.querySelector('.header-right');
    if (headerRight) {
      headerRight.insertBefore(button, headerRight.firstChild);
    } else {
      button.classList.add('btn-theme-floating');
      document.body.appendChild(button);
    }
    this.updateButton(this.getCurrent());
  }
};

// Áp dụng ngay khi file được nạp (file nằm trong <head> nên chạy trước khi vẽ trang)
Theme.apply(Theme.getCurrent());

document.addEventListener('DOMContentLoaded', () => {
  Theme.createButton();
});

// Đổi theme ở tab này thì các tab khác đang mở cũng đổi theo
window.addEventListener('storage', (event) => {
  if (event.key === Theme.KEY) {
    Theme.apply(Theme.getCurrent());
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: Theme.getCurrent() } }));
  }
});

// Người dùng chưa chọn gì mà đổi cài đặt hệ điều hành thì đổi theo
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!Theme.getSaved()) {
      Theme.apply(Theme.getCurrent());
      document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: Theme.getCurrent() } }));
    }
  });
}
