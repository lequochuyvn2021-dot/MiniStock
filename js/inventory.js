/**
 * MiniStock - Module Quản lý Kho & Lịch sử Giao dịch
 * File: js/inventory.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = Auth.requireAuth(['admin', 'warehouse']);
  if (!currentUser) return;

  initInventoryManagement();
});

function initInventoryManagement() {
  // Tabs
  const tabStock = document.getElementById('tab-btn-stock');
  const tabHistory = document.getElementById('tab-btn-history');
  const panelStock = document.getElementById('panel-stock');
  const panelHistory = document.getElementById('panel-history');

  // Search & Filters cho Tồn kho
  const stockSearch = document.getElementById('inventory-search');
  const stockFilter = document.getElementById('inventory-status-filter');
  const stockTableBody = document.getElementById('inventory-table-body');

  // Search & Filters cho Lịch sử
  const historySearch = document.getElementById('history-search');
  const historyTypeFilter = document.getElementById('history-type-filter');
  const historyTableBody = document.getElementById('history-table-body');

  // Nút mở Modal
  const btnStockIn = document.getElementById('btn-open-stock-in');
  const btnStockOut = document.getElementById('btn-open-stock-out');
  const btnAdjust = document.getElementById('btn-open-adjust');

  // Modals
  const actionModal = document.getElementById('inventory-action-modal');
  const actionForm = document.getElementById('inventory-action-form');
  const actionTitle = document.getElementById('modal-action-title');
  const btnCloseAction = document.getElementById('btn-close-action-modal');
  const btnCancelAction = document.getElementById('btn-cancel-action-modal');

  let currentActionType = 'IN'; // 'IN', 'OUT', 'ADJUST'

  // 1. Chuyển Tab
  if (tabStock && tabHistory) {
    tabStock.addEventListener('click', () => {
      tabStock.classList.add('active');
      tabHistory.classList.remove('active');
      panelStock.classList.remove('hidden');
      panelHistory.classList.add('hidden');
      renderStockTable();
    });

    tabHistory.addEventListener('click', () => {
      tabHistory.classList.add('active');
      tabStock.classList.remove('active');
      panelHistory.classList.remove('hidden');
      panelStock.classList.add('hidden');
      renderHistoryTable();
    });
  }

  // 2. Render dữ liệu ban đầu
  renderStockTable();

  // 3. Sự kiện tìm kiếm & lọc
  if (stockSearch) stockSearch.addEventListener('input', renderStockTable);
  if (stockFilter) stockFilter.addEventListener('change', renderStockTable);
  if (historySearch) historySearch.addEventListener('input', renderHistoryTable);
  if (historyTypeFilter) historyTypeFilter.addEventListener('change', renderHistoryTable);

  // 4. Mở Modals tương ứng
  if (btnStockIn) btnStockIn.addEventListener('click', () => openActionModal('IN'));
  if (btnStockOut) btnStockOut.addEventListener('click', () => openActionModal('OUT'));
  if (btnAdjust) btnAdjust.addEventListener('click', () => openActionModal('ADJUST'));

  if (btnCloseAction) btnCloseAction.addEventListener('click', closeActionModal);
  if (btnCancelAction) btnCancelAction.addEventListener('click', closeActionModal);

  // 5. Thay đổi sản phẩm trong modal để hiển thị tồn kho hiện tại
  const modalProductSelect = document.getElementById('action-product');
  if (modalProductSelect) {
    modalProductSelect.addEventListener('change', updateCurrentStockDisplay);
  }

  // 6. Xử lý lưu giao dịch
  if (actionForm) {
    actionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSaveInventoryAction();
    });
  }

  /**
   * Hiển thị bảng Tồn kho hiện tại
   */
  function renderStockTable() {
    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
    const categories = StorageService.get(STORAGE_KEYS.CATEGORIES, []);
    const settings = StorageService.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const lowStockThreshold = Number(settings.lowStockThreshold) || 5;

    const searchTerm = stockSearch ? stockSearch.value.trim().toLowerCase() : '';
    const filter = stockFilter ? stockFilter.value : '';

    const catMap = {};
    categories.forEach(c => catMap[c.id] = c.name);

    let filtered = products.filter(p => {
      const matchSearch = p.id.toLowerCase().includes(searchTerm) || p.name.toLowerCase().includes(searchTerm);
      let matchStatus = true;
      if (filter === 'in-stock') matchStatus = p.stock > lowStockThreshold;
      else if (filter === 'low-stock') matchStatus = p.stock > 0 && p.stock <= lowStockThreshold;
      else if (filter === 'out-stock') matchStatus = p.stock === 0;

      return matchSearch && matchStatus;
    });

    if (!stockTableBody) return;

    if (filtered.length === 0) {
      stockTableBody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-icon">📋</div>
              <div class="empty-state-title">Không tìm thấy sản phẩm nào trong kho</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    stockTableBody.innerHTML = filtered.map(p => {
      let statusBadge = '';
      if (p.stock === 0) {
        statusBadge = '<span class="badge badge-danger">Hết hàng</span>';
      } else if (p.stock <= lowStockThreshold) {
        statusBadge = `<span class="badge badge-warning">Cảnh báo: Sắp hết</span>`;
      } else {
        statusBadge = '<span class="badge badge-success">An toàn</span>';
      }

      const totalValuation = p.stock * p.costPrice;

      return `
        <tr>
          <td class="font-bold text-primary">${p.id}</td>
          <td>
            <div class="font-bold">${p.name}</div>
            <small class="text-muted">${catMap[p.categoryId] || 'Khác'}</small>
          </td>
          <td>${p.unit}</td>
          <td class="font-bold text-center u-fs-15">${p.stock}</td>
          <td>${Format.currency(totalValuation)}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="action-buttons">
              <button type="button" class="btn btn-outline btn-sm btn-quick-in" data-id="${p.id}" title="Nhập thêm hàng">
                + Nhập
              </button>
              <button type="button" class="btn btn-outline btn-sm btn-quick-adjust" data-id="${p.id}" title="Kiểm kê điều chỉnh">
                ⚙ Điều chỉnh
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Nút nhập nhanh & điều chỉnh nhanh từ hàng
    document.querySelectorAll('.btn-quick-in').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openActionModal('IN', id);
      });
    });

    document.querySelectorAll('.btn-quick-adjust').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openActionModal('ADJUST', id);
      });
    });
  }

  /**
   * Hiển thị bảng Lịch sử biến động kho
   */
  function renderHistoryTable() {
    const txList = StorageService.get(STORAGE_KEYS.INVENTORY_TX, []);
    const searchTerm = historySearch ? historySearch.value.trim().toLowerCase() : '';
    const selectedType = historyTypeFilter ? historyTypeFilter.value : '';

    const typeBadges = {
      IN: '<span class="badge badge-success">Nhập kho</span>',
      OUT: '<span class="badge badge-danger">Xuất kho</span>',
      ADJUST: '<span class="badge badge-warning">Điều chỉnh</span>',
      SALE: '<span class="badge badge-info">Bán hàng</span>',
      RETURN: '<span class="badge badge-success">Hoàn trả đơn</span>'
    };

    let filtered = txList.filter(tx => {
      const matchSearch = tx.id.toLowerCase().includes(searchTerm) || 
                          tx.productName.toLowerCase().includes(searchTerm) || 
                          tx.productId.toLowerCase().includes(searchTerm);
      const matchType = !selectedType || tx.type === selectedType;
      return matchSearch && matchType;
    });

    // Mới nhất lên đầu
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!historyTableBody) return;

    if (filtered.length === 0) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-state-icon">📜</div>
              <div class="empty-state-title">Chưa có lịch sử giao dịch kho nào</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    historyTableBody.innerHTML = filtered.map(tx => `
      <tr>
        <td class="font-bold text-primary">${tx.id}</td>
        <td>${Format.dateTime(tx.createdAt)}</td>
        <td>
          <div class="font-bold">${tx.productName}</div>
          <small class="text-muted">${tx.productId}</small>
        </td>
        <td>${typeBadges[tx.type] || tx.type}</td>
        <td class="font-bold text-center">${tx.quantity}</td>
        <td>${tx.stockBefore} → <strong>${tx.stockAfter}</strong></td>
        <td><span class="badge badge-secondary">${tx.performedBy}</span></td>
        <td><small>${tx.reason || '-'}</small></td>
      </tr>
    `).join('');
  }

  /**
   * Mở modal Nhập / Xuất / Điều chỉnh kho
   */
  function openActionModal(type, preselectedProductId = null) {
    currentActionType = type;
    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
    const select = document.getElementById('action-product');
    const labelQty = document.getElementById('label-action-quantity');
    const inputQty = document.getElementById('action-quantity');
    const inputReason = document.getElementById('action-reason');

    actionForm.reset();

    // Thiết lập tiêu đề và nhãn
    if (type === 'IN') {
      actionTitle.textContent = '📥 Tạo phiếu Nhập kho';
      labelQty.innerHTML = 'Số lượng nhập <span class="required">*</span>';
      inputReason.placeholder = 'Ví dụ: Nhập hàng từ nhà cung cấp theo hợp đồng số...';
    } else if (type === 'OUT') {
      actionTitle.textContent = '📤 Tạo phiếu Xuất kho';
      labelQty.innerHTML = 'Số lượng xuất <span class="required">*</span>';
      inputReason.placeholder = 'Ví dụ: Xuất chuyển kho, hủy hàng hỏng bể vỡ...';
    } else {
      actionTitle.textContent = '⚙ Kiểm kê & Điều chỉnh số lượng kho';
      labelQty.innerHTML = 'Số lượng thực tế sau kiểm kê <span class="required">*</span>';
      inputReason.placeholder = 'Bắt buộc ghi rõ lý do sai lệch kiểm kê...';
    }

    // Đổ danh sách sản phẩm
    select.innerHTML = '<option value="">-- Chọn sản phẩm --</option>' +
      products.map(p => `<option value="${p.id}" ${p.id === preselectedProductId ? 'selected' : ''}>${p.id} - ${p.name} (Hiện có: ${p.stock} ${p.unit})</option>`).join('');

    updateCurrentStockDisplay();
    actionModal.classList.add('active');
  }

  function closeActionModal() {
    actionModal.classList.remove('active');
  }

  function updateCurrentStockDisplay() {
    const select = document.getElementById('action-product');
    const currentStockBox = document.getElementById('action-current-stock-box');
    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);

    const productId = select.value;
    const p = products.find(item => item.id === productId);

    if (p) {
      currentStockBox.innerHTML = `Tồn kho hiện tại: <strong class="text-primary">${p.stock} ${p.unit}</strong>`;
      currentStockBox.classList.remove('hidden');
    } else {
      currentStockBox.classList.add('hidden');
    }
  }

  /**
   * Xử lý xác nhận thực hiện Nhập / Xuất / Điều chỉnh kho
   */
  function handleSaveInventoryAction() {
    const productId = document.getElementById('action-product').value;
    const quantity = Number(document.getElementById('action-quantity').value);
    const reason = document.getElementById('action-reason').value.trim();

    if (Validation.isEmpty(productId)) {
      Toast.error('Vui lòng chọn sản phẩm thực hiện!');
      return;
    }

    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      Toast.error('Sản phẩm không tồn tại!');
      return;
    }

    const p = products[productIndex];
    const stockBefore = p.stock;
    let stockAfter = stockBefore;
    let txQuantity = quantity;

    // Kiểm tra tính hợp lệ tùy theo loại giao dịch
    if (currentActionType === 'IN') {
      if (!Validation.isPositiveNumber(quantity)) {
        Toast.error('Số lượng nhập kho phải lớn hơn 0!');
        return;
      }
      stockAfter = stockBefore + quantity;
      p.stock = stockAfter;
    } else if (currentActionType === 'OUT') {
      if (!Validation.isPositiveNumber(quantity)) {
        Toast.error('Số lượng xuất kho phải lớn hơn 0!');
        return;
      }
      // Ràng buộc nghiêm ngặt: Không cho phép xuất quá tồn kho đang có
      if (quantity > stockBefore) {
        Toast.error(`Không thể xuất kho! Số lượng yêu cầu (${quantity} ${p.unit}) vượt quá tồn kho hiện có (${stockBefore} ${p.unit}).`);
        return;
      }
      stockAfter = stockBefore - quantity;
      p.stock = stockAfter;
    } else if (currentActionType === 'ADJUST') {
      if (!Validation.isNonNegativeNumber(quantity)) {
        Toast.error('Số lượng kiểm kê thực tế phải >= 0!');
        return;
      }
      if (Validation.isEmpty(reason)) {
        Toast.error('Vui lòng nhập lý do điều chỉnh kiểm kê kho!');
        return;
      }
      stockAfter = quantity;
      txQuantity = Math.abs(stockAfter - stockBefore);
      p.stock = stockAfter;
    }

    // Cập nhật tồn kho sản phẩm
    StorageService.set(STORAGE_KEYS.PRODUCTS, products);

    // Ghi nhận lịch sử giao dịch kho
    const txList = StorageService.get(STORAGE_KEYS.INVENTORY_TX, []);
    const currentUser = Auth.getCurrentUser();
    const newTx = {
      id: `TX${Date.now().toString().slice(-6)}`,
      productId: p.id,
      productName: p.name,
      type: currentActionType,
      quantity: txQuantity,
      stockBefore,
      stockAfter,
      createdAt: new Date().toISOString(),
      performedBy: currentUser ? currentUser.username : 'warehouse',
      reason: reason || (currentActionType === 'IN' ? 'Nhập kho bổ sung' : 'Xuất kho sử dụng')
    };

    txList.unshift(newTx);
    StorageService.set(STORAGE_KEYS.INVENTORY_TX, txList);

    Toast.success(`Thực hiện giao dịch kho cho "${p.name}" thành công! Tồn kho mới: ${stockAfter} ${p.unit}.`);
    closeActionModal();

    renderStockTable();
    renderHistoryTable();
  }
}
