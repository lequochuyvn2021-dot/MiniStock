/**
 * MiniStock - Module Xác thực & Phân quyền Frontend
 * File: js/auth.js
 * 
 * Lưu ý quan trọng cho đồ án:
 * Đây là cơ chế xác thực mô phỏng trên frontend bằng LocalStorage.
 * Trong môi trường thực tế cần có Backend API, JWT token và Session bảo mật phía server.
 */

const Auth = {
  /**
   * Lấy thông tin phiên đăng nhập hiện tại
   */
  getCurrentUser() {
    return StorageService.get(STORAGE_KEYS.SESSION, null);
  },

  /**
   * Kiểm tra xem đã đăng nhập chưa
   */
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  /**
   * Đăng nhập với username và password
   */
  login(username, password) {
    const users = StorageService.get(STORAGE_KEYS.USERS, []);
    const cleanUser = String(username).trim().toLowerCase();

    const user = users.find(u => u.username.toLowerCase() === cleanUser && u.status === 'active');

    if (!user) {
      return { success: false, message: 'Tên đăng nhập không tồn tại hoặc đã bị khóa.' };
    }

    if (user.passwordHash !== password) {
      return { success: false, message: 'Mật khẩu không chính xác.' };
    }

    // Tạo phiên làm việc (bỏ mật khẩu khi lưu session)
    const sessionUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      avatar: user.avatar || '👤',
      loginAt: new Date().toISOString()
    };

    StorageService.set(STORAGE_KEYS.SESSION, sessionUser);
    return { success: true, user: sessionUser };
  },

  /**
   * Đăng xuất khỏi hệ thống
   */
  logout() {
    StorageService.remove(STORAGE_KEYS.SESSION);
    window.location.href = 'login.html';
  },

  /**
   * Kiểm tra quyền thực hiện tác vụ
   * @param {string} permission - Tên quyền cần kiểm tra
   */
  can(permission) {
    const user = this.getCurrentUser();
    if (!user) return false;
    const role = user.role;

    if (role === 'admin') return true; // Admin có toàn quyền

    const rolePermissions = {
      staff: [
        'view_dashboard',
        'view_products',
        'manage_sales',
        'view_orders',
        'cancel_order',
        'print_invoice',
        'manage_customers'
      ],
      warehouse: [
        'view_dashboard',
        'view_products',
        'manage_products',
        'manage_categories',
        'manage_inventory',
        'stock_in',
        'stock_out',
        'adjust_stock'
      ]
    };

    const allowed = rolePermissions[role] || [];
    return allowed.includes(permission);
  },

  /**
   * Bảo vệ trang: Chặn truy cập trái phép và điều hướng
   * @param {Array<string>} allowedRoles - Danh sách role được phép vào trang
   */
  requireAuth(allowedRoles = []) {
    const user = this.getCurrentUser();

    // 1. Nếu chưa đăng nhập -> Chuyển về login.html
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }

    // 2. Nếu trang có giới hạn vai trò và role hiện tại không nằm trong danh sách
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // Báo bằng Toast rồi mới chuyển trang để người dùng kịp đọc
      Toast.warning(`Tài khoản "${user.fullName}" (${this.getRoleBadgeText(user.role)}) không có quyền truy cập trang này.`);
      let targetPage = 'index.html';
      if (user.role === 'staff') {
        targetPage = 'sales.html';
      } else if (user.role === 'warehouse') {
        targetPage = 'inventory.html';
      }
      setTimeout(() => {
        window.location.href = targetPage;
      }, 1600);
      return null;
    }

    return user;
  },

  /**
   * Lấy nhãn tiếng Việt cho vai trò
   */
  getRoleBadgeText(role) {
    const map = {
      admin: 'Quản trị viên',
      staff: 'Nhân viên bán hàng',
      warehouse: 'Nhân viên thủ kho'
    };
    return map[role] || role;
  },

  /**
   * Lấy class CSS cho nhãn vai trò
   */
  getRoleBadgeClass(role) {
    const map = {
      admin: 'badge-role-admin',
      staff: 'badge-role-staff',
      warehouse: 'badge-role-warehouse'
    };
    return map[role] || 'badge-secondary';
  },

  /**
   * Render thông tin người dùng vào Header và ẩn các menu không thuộc quyền hạn
   */
  renderHeaderAndNav() {
    const user = this.getCurrentUser();
    if (!user) return;

    // Hiển thị tên và vai trò trên Header
    const nameEl = document.getElementById('header-user-name');
    const roleEl = document.getElementById('header-user-role');
    const avatarEl = document.getElementById('header-user-avatar');

    if (nameEl) nameEl.textContent = user.fullName;
    if (roleEl) {
      roleEl.textContent = this.getRoleBadgeText(user.role);
      roleEl.className = `role-badge ${this.getRoleBadgeClass(user.role)}`;
    }
    if (avatarEl) avatarEl.textContent = user.avatar;

    // Gắn sự kiện Đăng xuất
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        ModalConfirm.open({
          title: 'Đăng xuất tài khoản',
          message: 'Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc hiện tại không?',
          confirmText: 'Đăng xuất',
          cancelText: 'Ở lại',
          isDanger: true,
          onConfirm: () => {
            Auth.logout();
          }
        });
      });
    }

    // Ẩn/hiện các menu theo phân quyền
    const navItems = document.querySelectorAll('[data-role-allow]');
    navItems.forEach(item => {
      const allowedRoles = item.getAttribute('data-role-allow').split(',').map(s => s.trim());
      if (!allowedRoles.includes(user.role)) {
        item.style.display = 'none';
      }
    });

    // Ẩn/hiện các nút thao tác đặc quyền trên trang
    const permissionElements = document.querySelectorAll('[data-permission]');
    permissionElements.forEach(el => {
      const perm = el.getAttribute('data-permission');
      if (!this.can(perm)) {
        el.style.display = 'none';
      }
    });
  }
};
