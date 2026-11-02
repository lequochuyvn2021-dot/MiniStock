/**
 * MiniStock - Module Quản lý Danh mục Sản phẩm
 * File: js/categories.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = Auth.requireAuth(['admin', 'staff', 'warehouse']);
  if (!currentUser) return;

  initCategoryManagement();
});

function initCategoryManagement() {
  const tableBody = document.getElementById('categories-table-body');
  const searchInput = document.getElementById('category-search');
  const btnAddCategory = document.getElementById('btn-add-category');
  const categoryCountBadge = document.getElementById('category-count-badge');

  // Modal thêm/sửa danh mục
  const categoryModal = document.getElementById('category-modal');
  const categoryForm = document.getElementById('category-form');
  const modalTitle = document.getElementById('modal-category-title');
  const btnCloseModal = document.getElementById('btn-close-category-modal');
  const btnCancelModal = document.getElementById('btn-cancel-category-modal');

  let editingCategoryId = null;

  renderCategories();

  if (searchInput) searchInput.addEventListener('input', renderCategories);

  if (btnAddCategory) {
    btnAddCategory.addEventListener('click', () => {
      if (!Auth.can('manage_categories')) {
        Toast.error('Bạn không có quyền thêm mới danh mục!');
        return;
      }
      openCategoryModal();
    });
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeCategoryModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeCategoryModal);

  if (categoryForm) {
    categoryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSaveCategory();
    });
  }

  /**
   * Hiển thị bảng danh mục kèm số lượng sản phẩm liên quan
   */
  function renderCategories() {
    const categories = StorageService.get(STORAGE_KEYS.CATEGORIES, []);
    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

    // Đếm số sản phẩm thuộc từng danh mục
    const productCounts = {};
    products.forEach(p => {
      productCounts[p.categoryId] = (productCounts[p.categoryId] || 0) + 1;
    });

    const filtered = categories.filter(c => 
      c.id.toLowerCase().includes(searchTerm) || c.name.toLowerCase().includes(searchTerm)
    );

    if (categoryCountBadge) {
      categoryCountBadge.textContent = `${filtered.length} danh mục`;
    }

    if (!tableBody) return;

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-state-icon">📂</div>
              <div class="empty-state-title">Chưa có danh mục nào phù hợp</div>
              <div class="empty-state-desc">Hãy thử tìm từ khóa khác hoặc tạo danh mục mới.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map(c => {
      const count = productCounts[c.id] || 0;
      const statusBadge = c.status === 'active'
        ? '<span class="badge badge-success">Hoạt động</span>'
        : '<span class="badge badge-secondary">Tạm dừng</span>';

      const canManage = Auth.can('manage_categories');

      return `
        <tr>
          <td class="font-bold text-primary">${c.id}</td>
          <td class="font-bold">${c.name}</td>
          <td>${c.description || '<span class="text-muted">Không có</span>'}</td>
          <td>
            <span class="badge ${count > 0 ? 'badge-info' : 'badge-secondary'}">
              ${count} sản phẩm
            </span>
          </td>
          <td>${statusBadge}</td>
          <td>
            <div class="action-buttons">
              ${canManage ? `
                <button type="button" class="btn btn-outline btn-sm btn-edit-category" data-id="${c.id}" title="Sửa danh mục">
                  ✏ Sửa
                </button>
                <button type="button" class="btn btn-outline btn-sm text-danger btn-delete-category" data-id="${c.id}" title="Xóa danh mục">
                  🗑 Xóa
                </button>
              ` : '<span class="text-muted">Chỉ xem</span>'}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    attachCategoryActions();
  }

  function attachCategoryActions() {
    document.querySelectorAll('.btn-edit-category').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openCategoryModal(id);
      });
    });

    document.querySelectorAll('.btn-delete-category').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        handleDeleteCategory(id);
      });
    });
  }

  function openCategoryModal(catId = null) {
    editingCategoryId = catId;
    if (catId) {
      const categories = StorageService.get(STORAGE_KEYS.CATEGORIES, []);
      const c = categories.find(item => item.id === catId);
      if (!c) return;

      modalTitle.textContent = `Chỉnh sửa danh mục: ${c.name}`;
      document.getElementById('category-code').value = c.id;
      document.getElementById('category-code').disabled = true;
      document.getElementById('category-name').value = c.name;
      document.getElementById('category-desc').value = c.description || '';
      document.getElementById('category-status').value = c.status || 'active';
    } else {
      const categories = StorageService.get(STORAGE_KEYS.CATEGORIES, []);
      const nextId = `CAT${String(categories.length + 1).padStart(2, '0')}`;
      modalTitle.textContent = 'Thêm danh mục mới';
      categoryForm.reset();
      document.getElementById('category-code').value = nextId;
      document.getElementById('category-code').disabled = false;
      document.getElementById('category-status').value = 'active';
    }

    categoryModal.classList.add('active');
  }

  function closeCategoryModal() {
    categoryModal.classList.remove('active');
    editingCategoryId = null;
  }

  function handleSaveCategory() {
    const code = document.getElementById('category-code').value.trim().toUpperCase();
    const name = document.getElementById('category-name').value.trim();
    const desc = document.getElementById('category-desc').value.trim();
    const status = document.getElementById('category-status').value;

    const categories = StorageService.get(STORAGE_KEYS.CATEGORIES, []);

    if (Validation.isEmpty(code)) {
      Toast.error('Vui lòng nhập mã danh mục!');
      return;
    }

    if (!editingCategoryId && Validation.isDuplicateId(code, categories)) {
      Toast.error(`Mã danh mục "${code}" đã tồn tại!`);
      return;
    }

    if (Validation.isEmpty(name)) {
      Toast.error('Vui lòng nhập tên danh mục!');
      return;
    }

    if (editingCategoryId) {
      const index = categories.findIndex(c => c.id === editingCategoryId);
      if (index === -1) return;

      categories[index] = {
        ...categories[index],
        name,
        description: desc,
        status,
        updatedAt: new Date().toISOString()
      };
      StorageService.set(STORAGE_KEYS.CATEGORIES, categories);
      Toast.success(`Đã cập nhật danh mục "${name}" thành công!`);
    } else {
      categories.push({
        id: code,
        name,
        description: desc,
        status,
        createdAt: new Date().toISOString()
      });
      StorageService.set(STORAGE_KEYS.CATEGORIES, categories);
      Toast.success(`Đã tạo mới danh mục "${name}" thành công!`);
    }

    closeCategoryModal();
    renderCategories();
  }

  /**
   * Xóa danh mục - Có kiểm tra ràng buộc toàn vẹn dữ liệu
   */
  function handleDeleteCategory(catId) {
    const categories = StorageService.get(STORAGE_KEYS.CATEGORIES, []);
    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
    const c = categories.find(item => item.id === catId);
    if (!c) return;

    // Ràng buộc: Không cho xóa nếu đang có sản phẩm thuộc danh mục này
    const usedCount = products.filter(p => p.categoryId === catId).length;
    if (usedCount > 0) {
      ModalConfirm.open({
        title: 'Không thể xóa danh mục',
        message: `Danh mục "${c.name}" hiện đang chứa <strong>${usedCount} sản phẩm</strong>. Bạn không được phép xóa danh mục khi còn sản phẩm trực thuộc. Vui lòng chuyển các sản phẩm sang danh mục khác trước khi xóa.`,
        confirmText: 'Đã hiểu',
        cancelText: 'Đóng',
        isDanger: false,
        onConfirm: () => {}
      });
      return;
    }

    ModalConfirm.open({
      title: 'Xác nhận xóa danh mục',
      message: `Bạn có chắc chắn muốn xóa danh mục "${c.name}" (${c.id}) không?`,
      confirmText: 'Xóa danh mục',
      cancelText: 'Hủy bỏ',
      isDanger: true,
      onConfirm: () => {
        const updated = categories.filter(item => item.id !== catId);
        StorageService.set(STORAGE_KEYS.CATEGORIES, updated);
        Toast.success(`Đã xóa danh mục "${c.name}" thành công!`);
        renderCategories();
      }
    });
  }
}
