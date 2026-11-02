/**
 * MiniStock - Module Quản lý Tài khoản & Phân quyền Demo
 * File: js/users.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = Auth.requireAuth(['admin']);
  if (!currentUser) return;

  initUsersManagement();
});

function initUsersManagement() {
  const tableBody = document.getElementById('users-table-body');
  const btnAddUser = document.getElementById('btn-add-user');

  // Modal thêm/sửa tài khoản
  const userModal = document.getElementById('user-modal');
  const userForm = document.getElementById('user-form');
  const modalTitle = document.getElementById('modal-user-title');
  const btnCloseModal = document.getElementById('btn-close-user-modal');
  const btnCancelModal = document.getElementById('btn-cancel-user-modal');

  let editingUserId = null;

  renderUsersTable();

  if (btnAddUser) btnAddUser.addEventListener('click', () => openUserModal());
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeUserModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeUserModal);

  if (userForm) {
    userForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSaveUser();
    });
  }

  function renderUsersTable() {
    const users = StorageService.get(STORAGE_KEYS.USERS, []);
    if (!tableBody) return;

    tableBody.innerHTML = users.map(u => {
      const isCurrentUser = Auth.getCurrentUser() && Auth.getCurrentUser().id === u.id;

      return `
        <tr>
          <td><span class="u-fs-24">${u.avatar || '👤'}</span></td>
          <td>
            <div class="font-bold">${u.fullName} ${isCurrentUser ? '<small class="text-primary">(Bạn)</small>' : ''}</div>
            <small class="text-muted">${u.id}</small>
          </td>
          <td class="font-bold">${u.username}</td>
          <td>
            <span class="role-badge ${Auth.getRoleBadgeClass(u.role)}">
              ${Auth.getRoleBadgeText(u.role)}
            </span>
          </td>
          <td>
            <span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}">
              ${u.status === 'active' ? 'Đang hoạt động' : 'Bị khóa'}
            </span>
          </td>
          <td>${Format.date(u.createdAt)}</td>
          <td>
            <div class="action-buttons">
              <button type="button" class="btn btn-outline btn-sm btn-edit-user" data-id="${u.id}" title="Sửa vai trò">
                ✏ Sửa
              </button>
              ${!isCurrentUser ? `
                <button type="button" class="btn btn-outline btn-sm text-danger btn-toggle-user" data-id="${u.id}" title="Khóa/Mở khóa">
                  ${u.status === 'active' ? '🔒 Khóa' : '🔓 Mở'}
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    attachUserActions();
  }

  function attachUserActions() {
    document.querySelectorAll('.btn-edit-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openUserModal(id);
      });
    });

    document.querySelectorAll('.btn-toggle-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        handleToggleUserStatus(id);
      });
    });
  }

  function openUserModal(userId = null) {
    editingUserId = userId;
    if (userId) {
      const users = StorageService.get(STORAGE_KEYS.USERS, []);
      const u = users.find(item => item.id === userId);
      if (!u) return;

      modalTitle.textContent = `Chỉnh sửa tài khoản: ${u.username}`;
      document.getElementById('user-username').value = u.username;
      document.getElementById('user-username').disabled = true;
      document.getElementById('user-fullname').value = u.fullName;
      document.getElementById('user-role').value = u.role;
      document.getElementById('user-avatar-select').value = u.avatar || '👤';
      document.getElementById('user-password').value = '';
      document.getElementById('user-password').placeholder = 'Để trống nếu không đổi mật khẩu';
    } else {
      modalTitle.textContent = 'Thêm tài khoản demo mới';
      userForm.reset();
      document.getElementById('user-username').disabled = false;
      document.getElementById('user-password').placeholder = 'Mật khẩu đăng nhập';
    }

    userModal.classList.add('active');
  }

  function closeUserModal() {
    userModal.classList.remove('active');
    editingUserId = null;
  }

  function handleSaveUser() {
    const username = document.getElementById('user-username').value.trim().toLowerCase();
    const fullName = document.getElementById('user-fullname').value.trim();
    const password = document.getElementById('user-password').value.trim();
    const role = document.getElementById('user-role').value;
    const avatar = document.getElementById('user-avatar-select').value;

    const users = StorageService.get(STORAGE_KEYS.USERS, []);

    if (Validation.isEmpty(username)) {
      Toast.error('Vui lòng nhập tên đăng nhập!');
      return;
    }

    if (!editingUserId && Validation.isDuplicateId(username, users.map(u => ({ id: u.username })))) {
      Toast.error(`Tên đăng nhập "${username}" đã tồn tại!`);
      return;
    }

    if (Validation.isEmpty(fullName)) {
      Toast.error('Vui lòng nhập họ và tên!');
      return;
    }

    if (!editingUserId && Validation.isEmpty(password)) {
      Toast.error('Vui lòng nhập mật khẩu cho tài khoản mới!');
      return;
    }

    if (editingUserId) {
      const index = users.findIndex(u => u.id === editingUserId);
      if (index === -1) return;

      users[index].fullName = fullName;
      users[index].role = role;
      users[index].avatar = avatar;
      if (password) {
        users[index].passwordHash = password;
      }

      StorageService.set(STORAGE_KEYS.USERS, users);
      Toast.success(`Đã cập nhật tài khoản "${username}" thành công!`);
    } else {
      const newId = `U${String(users.length + 1).padStart(3, '0')}`;
      users.push({
        id: newId,
        username,
        passwordHash: password,
        fullName,
        role,
        avatar,
        status: 'active',
        createdAt: new Date().toISOString()
      });

      StorageService.set(STORAGE_KEYS.USERS, users);
      Toast.success(`Đã thêm tài khoản "${username}" thành công!`);
    }

    closeUserModal();
    renderUsersTable();
  }

  function handleToggleUserStatus(userId) {
    const users = StorageService.get(STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? 'mở khóa' : 'khóa';

    ModalConfirm.open({
      title: `Xác nhận ${actionText} tài khoản`,
      message: `Bạn có chắc chắn muốn ${actionText} tài khoản "${user.username}" không?`,
      confirmText: actionText.toUpperCase(),
      isDanger: newStatus === 'inactive',
      onConfirm: () => {
        user.status = newStatus;
        StorageService.set(STORAGE_KEYS.USERS, users);
        Toast.success(`Đã ${actionText} tài khoản "${user.username}"!`);
        renderUsersTable();
      }
    });
  }
}
