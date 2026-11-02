/**
 * MiniStock - Module Quản lý Sản phẩm
 * File: js/products.js
 * Đáp ứng yêu cầu môn học: Form 2 tìm kiếm & lọc không tải lại trang, validation hiển thị lỗi đỏ ngay dưới ô
 */

document.addEventListener('DOMContentLoaded', () => {
  // Kỹ thuật 8: Kiểm tra quyền truy cập (Admin, Staff, Warehouse đều được xem)
  const currentUser = Auth.requireAuth(['admin', 'staff', 'warehouse']);
  if (!currentUser) return;

  initProductManagement();
});

function initProductManagement() {
  // Kỹ thuật 1: document.getElementById và querySelector
  const tableBody = document.getElementById('products-table-body');
  const filterForm = document.getElementById('product-filter-form');
  const searchInput = document.getElementById('product-search');
  const categoryFilter = document.getElementById('product-category-filter');
  const priceFilter = document.getElementById('product-price-filter');
  const stockFilter = document.getElementById('product-stock-filter');
  const sortSelect = document.getElementById('product-sort');
  const btnResetFilter = document.getElementById('btn-reset-product-filter');
  const btnAddProduct = document.getElementById('btn-add-product');
  const productCountBadge = document.getElementById('product-count-badge');

  // Modal thêm/sửa sản phẩm
  const productModal = document.getElementById('product-modal');
  const productForm = document.getElementById('product-form');
  const modalTitle = document.getElementById('modal-product-title');
  const btnCloseModal = document.getElementById('btn-close-product-modal');
  const btnCancelModal = document.getElementById('btn-cancel-product-modal');

  // Modal xem chi tiết sản phẩm
  const detailModal = document.getElementById('product-detail-modal');
  const btnCloseDetail = document.getElementById('btn-close-product-detail');

  let editingProductId = null;

  // 1. Tải danh mục vào bộ lọc & modal form
  loadCategoryDropdowns();

  // 2. Render danh sách sản phẩm lần đầu
  renderProducts();

  // 3. Kỹ thuật 2 & 10: Xử lý FORM 2 - TÌM KIẾM VÀ LỌC (Không tải lại trang)
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault(); // Ngăn trình duyệt reload trang
      renderProducts();
    });
  }

  // Lắng nghe sự kiện input/change để tìm kiếm trực tiếp (live filter)
  if (searchInput) searchInput.addEventListener('input', renderProducts);
  if (categoryFilter) categoryFilter.addEventListener('change', renderProducts);
  if (priceFilter) priceFilter.addEventListener('change', renderProducts);
  if (stockFilter) stockFilter.addEventListener('change', renderProducts);
  if (sortSelect) sortSelect.addEventListener('change', renderProducts);

  if (btnResetFilter) {
    btnResetFilter.addEventListener('click', () => {
      filterForm.reset();
      renderProducts();
      Toast.info('Đã đặt lại bộ lọc sản phẩm.');
    });
  }

  // 4. Mở modal thêm mới sản phẩm
  if (btnAddProduct) {
    btnAddProduct.addEventListener('click', () => {
      if (!Auth.can('manage_products')) {
        Toast.error('Bạn không có quyền thêm mới sản phẩm!');
        return;
      }
      openProductModal();
    });
  }

  // 5. Đóng modal
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeProductModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeProductModal);
  if (btnCloseDetail) btnCloseDetail.addEventListener('click', () => detailModal.classList.remove('active'));

  // 6. Xử lý gửi Form Thêm/Sửa sản phẩm
  if (productForm) {
    productForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSaveProduct();
    });
  }

  /**
   * Kỹ thuật 8: Hàm tải danh mục vào các thẻ <select>
   */
  function loadCategoryDropdowns() {
    const categories = StorageService.get(STORAGE_KEYS.CATEGORIES, []);
    const filterSelect = document.getElementById('product-category-filter');
    const formSelect = document.getElementById('product-category');

    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">-- Tất cả danh mục --</option>' +
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    if (formSelect) {
      formSelect.innerHTML = '<option value="">-- Chọn danh mục --</option>' +
        categories.filter(c => c.status === 'active').map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  }

  /**
   * Kỹ thuật 6 & 8: Hiển thị bảng sản phẩm có lọc theo từ khóa, danh mục, khoảng giá, tồn kho và sắp xếp
   */
  function renderProducts() {
    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
    const categories = StorageService.get(STORAGE_KEYS.CATEGORIES, []);
    const settings = StorageService.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const lowStockThreshold = Number(settings.lowStockThreshold) || 5;

    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const selectedCat = categoryFilter ? categoryFilter.value : '';
    const selectedPrice = priceFilter ? priceFilter.value : '';
    const selectedStock = stockFilter ? stockFilter.value : '';
    const selectedSort = sortSelect ? sortSelect.value : 'name-asc';

    // Tạo map danh mục
    const catMap = {};
    categories.forEach(c => catMap[c.id] = c.name);

    // Kỹ thuật 6: Sử dụng filter() để lọc nhiều tiêu chí
    let filtered = products.filter(p => {
      // 1. Tìm kiếm theo mã hoặc tên
      const matchSearch = p.id.toLowerCase().includes(searchTerm) || p.name.toLowerCase().includes(searchTerm);
      // 2. Lọc danh mục
      const matchCat = !selectedCat || p.categoryId === selectedCat;
      // 3. Lọc khoảng giá
      let matchPrice = true;
      if (selectedPrice === 'under-50') matchPrice = p.price < 50000;
      else if (selectedPrice === '50-200') matchPrice = p.price >= 50000 && p.price <= 200000;
      else if (selectedPrice === 'over-200') matchPrice = p.price > 200000;

      // 4. Lọc tồn kho
      let matchStock = true;
      if (selectedStock === 'in-stock') matchStock = p.stock > lowStockThreshold;
      else if (selectedStock === 'low-stock') matchStock = p.stock > 0 && p.stock <= lowStockThreshold;
      else if (selectedStock === 'out-stock') matchStock = p.stock === 0;

      return matchSearch && matchCat && matchPrice && matchStock;
    });

    // Sắp xếp
    filtered.sort((a, b) => {
      if (selectedSort === 'name-asc') return a.name.localeCompare(b.name, 'vi');
      if (selectedSort === 'name-desc') return b.name.localeCompare(a.name, 'vi');
      if (selectedSort === 'price-asc') return a.price - b.price;
      if (selectedSort === 'price-desc') return b.price - a.price;
      if (selectedSort === 'stock-asc') return a.stock - b.stock;
      if (selectedSort === 'stock-desc') return b.stock - a.stock;
      return 0;
    });

    // Kỹ thuật 3: Thay đổi nội dung bằng textContent
    if (productCountBadge) {
      productCountBadge.textContent = `${filtered.length} sản phẩm`;
    }

    if (!tableBody) return;

    // Hiển thị thông báo khi không tìm thấy sản phẩm theo yêu cầu mục 18.2
    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-state-icon">🔍</div>
              <div class="empty-state-title">Không tìm thấy sản phẩm nào</div>
              <div class="empty-state-desc">Không có sản phẩm nào thỏa mãn điều kiện tìm kiếm và bộ lọc hiện tại. Hãy thử chọn lại mức giá hoặc từ khóa khác!</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    // Kỹ thuật 6: Dùng map() tạo hàng bảng HTML
    tableBody.innerHTML = filtered.map(p => {
      let stockBadge = '';
      if (p.stock === 0) {
        stockBadge = '<span class="badge badge-danger">Hết hàng (0)</span>';
      } else if (p.stock <= lowStockThreshold) {
        stockBadge = `<span class="badge badge-warning">Sắp hết (${p.stock} ${p.unit})</span>`;
      } else {
        stockBadge = `<span class="badge badge-success">Còn ${p.stock} ${p.unit}</span>`;
      }

      const statusBadge = p.status === 'active'
        ? '<span class="badge badge-info">Đang bán</span>'
        : '<span class="badge badge-secondary">Ngừng bán</span>';

      const canManage = Auth.can('manage_products');

      return `
        <tr>
          <td class="font-bold text-primary">${p.id}</td>
          <td>
            <img src="${p.image || 'images/logo/icon.svg'}" alt="${p.name}" class="table-thumb" onerror="handleImageError(this)">
          </td>
          <td>
            <div class="font-bold">${p.name}</div>
            <small class="text-muted">${catMap[p.categoryId] || 'Khác'}</small>
          </td>
          <td>${Format.currency(p.costPrice)}</td>
          <td class="font-bold text-primary">${Format.currency(p.price)}</td>
          <td>${stockBadge}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="action-buttons">
              <button type="button" class="btn btn-outline btn-sm btn-view-product" data-id="${p.id}" title="Xem chi tiết">
                👁
              </button>
              ${canManage ? `
                <button type="button" class="btn btn-outline btn-sm btn-edit-product" data-id="${p.id}" title="Sửa sản phẩm">
                  ✏
                </button>
                <button type="button" class="btn btn-outline btn-sm text-danger btn-delete-product" data-id="${p.id}" title="Xóa hoặc ngừng bán">
                  🗑
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    attachTableActionEvents();
  }

  function attachTableActionEvents() {
    document.querySelectorAll('.btn-view-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        viewProductDetail(id);
      });
    });

    document.querySelectorAll('.btn-edit-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openProductModal(id);
      });
    });

    document.querySelectorAll('.btn-delete-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        handleDeleteProduct(id);
      });
    });
  }

  function clearProductErrors() {
    document.querySelectorAll('#product-form .form-error').forEach(el => el.textContent = '');
    document.querySelectorAll('#product-form .input-error').forEach(el => el.classList.remove('input-error'));
  }

  function setFieldError(fieldId, errorId, message) {
    const input = document.getElementById(fieldId);
    const err = document.getElementById(errorId);
    if (input) input.classList.add('input-error');
    if (err) err.textContent = message;
  }

  function openProductModal(productId = null) {
    editingProductId = productId;
    loadCategoryDropdowns();
    clearProductErrors();

    if (productId) {
      const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
      const p = products.find(item => item.id === productId);
      if (!p) return;

      modalTitle.textContent = `Chỉnh sửa sản phẩm: ${p.name}`;
      document.getElementById('product-code').value = p.id;
      document.getElementById('product-code').disabled = true;
      document.getElementById('product-name').value = p.name;
      document.getElementById('product-category').value = p.categoryId;
      document.getElementById('product-image').value = p.image || '';
      document.getElementById('product-cost').value = p.costPrice;
      document.getElementById('product-price').value = p.price;
      document.getElementById('product-stock').value = p.stock;
      document.getElementById('product-unit').value = p.unit || 'Cái';
      document.getElementById('product-supplier').value = p.supplier || '';
      document.getElementById('product-status').value = p.status || 'active';
      document.getElementById('product-desc').value = p.description || '';
    } else {
      const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
      const nextId = generateNextProductId(products);

      modalTitle.textContent = 'Thêm sản phẩm mới';
      productForm.reset();
      document.getElementById('product-code').value = nextId;
      document.getElementById('product-code').disabled = false;
      document.getElementById('product-unit').value = 'Cái';
      document.getElementById('product-status').value = 'active';
      document.getElementById('product-image').value = 'images/products/notebook.jpg';
    }

    productModal.classList.add('active');
  }

  function closeProductModal() {
    productModal.classList.remove('active');
    editingProductId = null;
  }

  function generateNextProductId(products) {
    let maxNum = 0;
    products.forEach(p => {
      const match = String(p.id).match(/^SP(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    return `SP${String(nextNum).padStart(3, '0')}`;
  }

  /**
   * Kỹ thuật 8: Kiểm tra dữ liệu và lưu sản phẩm
   * Hiển thị lỗi màu đỏ ngay dưới từng trường nhập liệu tương ứng theo đúng tiêu chí môn học
   */
  function handleSaveProduct() {
    clearProductErrors();

    const code = document.getElementById('product-code').value.trim().toUpperCase();
    const name = document.getElementById('product-name').value.trim();
    const categoryId = document.getElementById('product-category').value;
    const image = document.getElementById('product-image').value.trim();
    const costPrice = Number(document.getElementById('product-cost').value);
    const price = Number(document.getElementById('product-price').value);
    const stock = Number(document.getElementById('product-stock').value);
    const unit = document.getElementById('product-unit').value.trim();
    const supplier = document.getElementById('product-supplier').value.trim();
    const status = document.getElementById('product-status').value;
    const desc = document.getElementById('product-desc').value.trim();

    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
    let hasError = false;

    // Kiểm tra mã sản phẩm
    if (Validation.isEmpty(code)) {
      setFieldError('product-code', 'err-product-code', 'Vui lòng nhập mã sản phẩm!');
      hasError = true;
    } else if (!editingProductId && Validation.isDuplicateId(code, products)) {
      setFieldError('product-code', 'err-product-code', `Mã sản phẩm "${code}" đã tồn tại!`);
      hasError = true;
    }

    // Kiểm tra tên sản phẩm
    if (Validation.isEmpty(name)) {
      setFieldError('product-name', 'err-product-name', 'Vui lòng nhập tên sản phẩm!');
      hasError = true;
    }

    // Kiểm tra danh mục
    if (Validation.isEmpty(categoryId)) {
      setFieldError('product-category', 'err-product-category', 'Vui lòng chọn danh mục cho sản phẩm!');
      hasError = true;
    }

    // Kiểm tra giá vốn
    if (isNaN(costPrice) || costPrice < 0) {
      setFieldError('product-cost', 'err-product-cost', 'Giá vốn không được là số âm!');
      hasError = true;
    }

    // Kiểm tra giá bán
    if (isNaN(price) || price <= 0) {
      setFieldError('product-price', 'err-product-price', 'Giá bán phải là số lớn hơn 0!');
      hasError = true;
    }

    // Kiểm tra tồn kho
    if (isNaN(stock) || stock < 0) {
      setFieldError('product-stock', 'err-product-stock', 'Số lượng tồn kho không được âm!');
      hasError = true;
    }

    // Kiểm tra đơn vị tính
    if (Validation.isEmpty(unit)) {
      setFieldError('product-unit', 'err-product-unit', 'Vui lòng nhập đơn vị tính!');
      hasError = true;
    }

    // Dừng lại nếu có lỗi
    if (hasError) {
      Toast.error('Vui lòng sửa các trường lỗi được đánh dấu màu đỏ!');
      return;
    }

    if (editingProductId) {
      const index = products.findIndex(p => p.id === editingProductId);
      if (index === -1) return;

      const oldStock = products[index].stock;
      products[index] = {
        ...products[index],
        name,
        categoryId,
        image: image || 'images/logo/icon.svg',
        costPrice,
        price,
        stock,
        unit,
        supplier,
        status,
        description: desc,
        updatedAt: new Date().toISOString()
      };

      if (oldStock !== stock) {
        logInventoryAdjustment(products[index].id, products[index].name, oldStock, stock, 'Điều chỉnh số lượng trong biểu mẫu sửa sản phẩm');
      }

      StorageService.set(STORAGE_KEYS.PRODUCTS, products);
      Toast.success(`Đã cập nhật sản phẩm "${name}" thành công!`);
    } else {
      const newProduct = {
        id: code,
        name,
        categoryId,
        image: image || 'images/logo/icon.svg',
        costPrice,
        price,
        stock,
        unit,
        supplier,
        status,
        description: desc,
        createdAt: new Date().toISOString()
      };

      products.push(newProduct);
      StorageService.set(STORAGE_KEYS.PRODUCTS, products);

      if (stock > 0) {
        logInventoryAdjustment(code, name, 0, stock, 'Nhập số lượng ban đầu khi tạo sản phẩm');
      }

      Toast.success(`Đã thêm mới sản phẩm "${name}" thành công!`);
    }

    closeProductModal();
    renderProducts();
  }

  function viewProductDetail(productId) {
    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
    const categories = StorageService.get(STORAGE_KEYS.CATEGORIES, []);
    const p = products.find(item => item.id === productId);
    if (!p) return;

    const cat = categories.find(c => c.id === p.categoryId);
    const detailContent = document.getElementById('product-detail-content');

    detailContent.innerHTML = `
      <div class="d-flex gap-24 align-center flex-wrap">
        <img class="product-detail-img" src="${p.image || 'images/logo/icon.svg'}" alt="${p.name}" onerror="handleImageError(this)">
        <div class="product-detail-info">
          <h2 class="product-detail-name">${p.name}</h2>
          <div class="d-flex gap-10 mb-14">
            <span class="badge badge-primary">${p.id}</span>
            <span class="badge badge-secondary">${cat ? cat.name : 'Khác'}</span>
            ${p.status === 'active' ? '<span class="badge badge-info">Đang bán</span>' : '<span class="badge badge-secondary">Ngừng bán</span>'}
          </div>
          <p class="text-muted mb-14">${p.description || 'Chưa có mô tả chi tiết.'}</p>
          <div class="d-grid grid-2 gap-10 u-fs-13">
            <div><strong>Giá vốn nhập:</strong> ${Format.currency(p.costPrice)}</div>
            <div><strong>Giá bán lẻ:</strong> <span class="text-primary font-bold">${Format.currency(p.price)}</span></div>
            <div><strong>Tồn kho hiện tại:</strong> <span class="font-bold">${p.stock} ${p.unit}</span></div>
            <div><strong>Nhà cung cấp:</strong> ${p.supplier || 'Không có'}</div>
            <div><strong>Ngày tạo:</strong> ${Format.date(p.createdAt)}</div>
          </div>
        </div>
      </div>
    `;

    detailModal.classList.add('active');
  }

  function handleDeleteProduct(productId) {
    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
    const orders = StorageService.get(STORAGE_KEYS.ORDERS, []);
    const p = products.find(item => item.id === productId);
    if (!p) return;

    const isUsedInOrders = orders.some(order => 
      Array.isArray(order.items) && order.items.some(item => item.productId === productId)
    );

    if (isUsedInOrders) {
      ModalConfirm.open({
        title: 'Bảo vệ dữ liệu lịch sử đơn hàng',
        message: `Sản phẩm "${p.name}" (${p.id}) đã có lịch sử giao dịch trong các hóa đơn bán hàng. Hệ thống sẽ chuyển sản phẩm này sang trạng thái <strong>Ngừng kinh doanh</strong> thay vì xóa vĩnh viễn để bảo vệ lịch sử doanh thu. Bạn có đồng ý không?`,
        confirmText: 'Chuyển ngừng kinh doanh',
        cancelText: 'Hủy',
        isDanger: true,
        onConfirm: () => {
          p.status = 'inactive';
          StorageService.set(STORAGE_KEYS.PRODUCTS, products);
          Toast.warning(`Đã chuyển sản phẩm "${p.name}" sang trạng thái Ngừng kinh doanh.`);
          renderProducts();
        }
      });
    } else {
      ModalConfirm.open({
        title: 'Xóa sản phẩm',
        message: `Bạn có chắc chắn muốn xóa vĩnh viễn sản phẩm "${p.name}" (${p.id}) không? Thao tác này không thể hoàn tác.`,
        confirmText: 'Xóa vĩnh viễn',
        cancelText: 'Hủy bỏ',
        isDanger: true,
        onConfirm: () => {
          const updated = products.filter(item => item.id !== productId);
          StorageService.set(STORAGE_KEYS.PRODUCTS, updated);
          Toast.success(`Đã xóa sản phẩm "${p.name}" thành công!`);
          renderProducts();
        }
      });
    }
  }

  function logInventoryAdjustment(productId, productName, before, after, reason) {
    const txList = StorageService.get(STORAGE_KEYS.INVENTORY_TX, []);
    const currentUser = Auth.getCurrentUser();
    const diff = after - before;

    const newTx = {
      id: `TX${Date.now().toString().slice(-6)}`,
      productId,
      productName,
      type: 'ADJUST',
      quantity: Math.abs(diff),
      stockBefore: before,
      stockAfter: after,
      createdAt: new Date().toISOString(),
      performedBy: currentUser ? currentUser.username : 'system',
      reason
    };

    txList.unshift(newTx);
    StorageService.set(STORAGE_KEYS.INVENTORY_TX, txList);
  }
}
