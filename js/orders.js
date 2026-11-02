/**
 * MiniStock - Module Quản lý Đơn hàng & Hủy đơn Hoàn kho
 * File: js/orders.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = Auth.requireAuth(['admin', 'staff']);
  if (!currentUser) return;

  initOrdersManagement();
});

function initOrdersManagement() {
  const tableBody = document.getElementById('orders-table-body');
  const searchInput = document.getElementById('orders-search');
  const statusFilter = document.getElementById('orders-status-filter');
  const fromDateInput = document.getElementById('orders-from-date');
  const toDateInput = document.getElementById('orders-to-date');
  const orderCountBadge = document.getElementById('orders-count-badge');

  // Modal xem chi tiết đơn hàng & hóa đơn
  const detailModal = document.getElementById('order-detail-modal');
  const detailContent = document.getElementById('order-detail-content');
  const btnCloseDetail = document.getElementById('btn-close-order-detail');
  const btnPrintOrder = document.getElementById('btn-print-order');

  let viewingOrder = null;

  renderOrdersTable();

  // Sự kiện tìm kiếm & lọc
  if (searchInput) searchInput.addEventListener('input', renderOrdersTable);
  if (statusFilter) statusFilter.addEventListener('change', renderOrdersTable);
  if (fromDateInput) fromDateInput.addEventListener('change', renderOrdersTable);
  if (toDateInput) toDateInput.addEventListener('change', renderOrdersTable);

  if (btnCloseDetail) btnCloseDetail.addEventListener('click', () => detailModal.classList.remove('active'));
  if (btnPrintOrder) {
    btnPrintOrder.addEventListener('click', () => {
      window.print();
    });
  }

  /**
   * Hiển thị bảng đơn hàng có tìm kiếm và bộ lọc thời gian
   */
  function renderOrdersTable() {
    const orders = StorageService.get(STORAGE_KEYS.ORDERS, []);
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const selectedStatus = statusFilter ? statusFilter.value : '';
    const fromDate = fromDateInput ? fromDateInput.value : '';
    const toDate = toDateInput ? toDateInput.value : '';

    let filtered = orders.filter(order => {
      const matchSearch = order.id.toLowerCase().includes(searchTerm) || 
                          order.customerName.toLowerCase().includes(searchTerm) ||
                          (order.customerPhone && order.customerPhone.includes(searchTerm));

      const matchStatus = !selectedStatus || order.status === selectedStatus;

      // Lọc theo ngày
      let matchDate = true;
      if (fromDate) {
        const orderDate = new Date(order.createdAt).toISOString().slice(0, 10);
        if (orderDate < fromDate) matchDate = false;
      }
      if (toDate) {
        const orderDate = new Date(order.createdAt).toISOString().slice(0, 10);
        if (orderDate > toDate) matchDate = false;
      }

      return matchSearch && matchStatus && matchDate;
    });

    if (orderCountBadge) {
      orderCountBadge.textContent = `${filtered.length} đơn hàng`;
    }

    if (!tableBody) return;

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-state-icon">📄</div>
              <div class="empty-state-title">Không tìm thấy đơn hàng nào</div>
              <div class="empty-state-desc">Hãy thử chọn lại khoảng ngày hoặc từ khóa tìm kiếm.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const paymentLabels = {
      cash: 'Tiền mặt',
      transfer: 'Chuyển khoản',
      card: 'Thẻ'
    };

    tableBody.innerHTML = filtered.map(order => {
      const statusBadge = order.status === 'completed'
        ? '<span class="badge badge-success">Hoàn tất</span>'
        : '<span class="badge badge-danger">Đã hủy</span>';

      const itemCount = order.items ? order.items.reduce((s, i) => s + i.quantity, 0) : 0;

      return `
        <tr>
          <td class="font-bold text-primary">${order.id}</td>
          <td>${Format.dateTime(order.createdAt)}</td>
          <td>
            <div class="font-bold">${order.customerName}</div>
            <small class="text-muted">${order.customerPhone || 'Khách lẻ'}</small>
          </td>
          <td><span class="badge badge-secondary">${itemCount} sản phẩm</span></td>
          <td class="font-bold text-primary">${Format.currency(order.total)}</td>
          <td>${paymentLabels[order.paymentMethod] || order.paymentMethod}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="action-buttons">
              <button type="button" class="btn btn-outline btn-sm btn-view-order" data-id="${order.id}" title="Xem hóa đơn">
                👁 Chi tiết
              </button>
              ${order.status === 'completed' ? `
                <button type="button" class="btn btn-outline btn-sm text-danger btn-cancel-order" data-id="${order.id}" title="Hủy đơn & hoàn kho">
                  ✕ Hủy
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    attachOrderActions();
  }

  function attachOrderActions() {
    // Xem chi tiết
    document.querySelectorAll('.btn-view-order').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        viewOrderDetail(id);
      });
    });

    // Hủy đơn
    document.querySelectorAll('.btn-cancel-order').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        handleCancelOrder(id);
      });
    });
  }

  /**
   * Xem chi tiết đơn hàng
   */
  function viewOrderDetail(orderId) {
    const orders = StorageService.get(STORAGE_KEYS.ORDERS, []);
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    viewingOrder = order;
    const settings = StorageService.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);

    const paymentLabels = {
      cash: 'Tiền mặt',
      transfer: 'Chuyển khoản QR',
      card: 'Thẻ ngân hàng'
    };

    detailContent.innerHTML = `
      <div id="print-area" class="invoice-paper">
        <div class="invoice-header">
          <h2>${settings.storeName}</h2>
          <p>${settings.storeAddress}</p>
          <p>Hotline: ${settings.storePhone}</p>
          <h3 class="inv-title">HÓA ĐƠN BÁN LẺ</h3>
          <p class="inv-sub">Mã đơn: <strong>${order.id}</strong></p>
          <div class="u-mt-6">
            ${order.status === 'completed' ? '<span class="badge badge-success">Đã hoàn tất thanh toán</span>' : '<span class="badge badge-danger">ĐÃ HỦY ĐƠN</span>'}
          </div>
        </div>

        <div class="invoice-meta">
          <div>Thời gian: ${Format.dateTime(order.createdAt)}</div>
          <div>Khách hàng: <strong>${order.customerName}</strong> ${order.customerPhone ? `(${order.customerPhone})` : ''}</div>
          <div>Thu ngân: ${order.createdBy}</div>
          <div>Hình thức: ${paymentLabels[order.paymentMethod] || order.paymentMethod}</div>
          ${order.status === 'cancelled' ? `
            <div class="inv-cancel">
              <strong>Thời gian hủy:</strong> ${Format.dateTime(order.cancelledAt)}<br>
              <strong>Lý do hủy:</strong> ${order.cancelReason || 'Không có ghi chú'}
            </div>
          ` : ''}
        </div>

        <table class="invoice-table">
          <thead>
            <tr>
              <th class="ta-left">Sản phẩm</th>
              <th class="ta-center">SL</th>
              <th class="ta-right">Đơn giá</th>
              <th class="ta-right">T.Tiền</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td class="ta-center">${item.quantity}</td>
                <td class="ta-right">${Format.currency(item.price)}</td>
                <td class="ta-right">${Format.currency(item.subtotal)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="inv-totals">
          <div class="inv-row">
            <span>Tổng tiền hàng:</span>
            <span>${Format.currency(order.subtotal)}</span>
          </div>
          ${order.discount > 0 ? `
            <div class="inv-row inv-row-danger">
              <span>Giảm giá:</span>
              <span>-${Format.currency(order.discount)}</span>
            </div>
          ` : ''}
          <div class="inv-row inv-row-total">
            <span>TỔNG THANH TOÁN:</span>
            <span class="text-primary">${Format.currency(order.total)}</span>
          </div>
        </div>

        <div class="invoice-footer">
          <p>Cảm ơn quý khách đã tin tưởng mua sắm!</p>
          <p class="inv-foot">MiniStock - Quản lý kho & Bán hàng</p>
        </div>
      </div>
    `;

    detailModal.classList.add('active');
  }

  /**
   * Hủy đơn hàng và HOÀN TRẢ TỒN KHO DUY NHẤT 1 LẦN
   * Quy tắc nghiệp vụ bắt buộc của đồ án:
   * - Chỉ hủy được đơn 'completed'
   * - Hoàn lại đúng số lượng của từng món vào kho
   * - Ghi nhận lịch sử hoàn trả vào bảng giao dịch kho
   * - Cập nhật trạng thái đơn thành 'cancelled', lưu lại thời gian và lý do hủy
   */
  function handleCancelOrder(orderId) {
    const orders = StorageService.get(STORAGE_KEYS.ORDERS, []);
    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
    const inventoryTx = StorageService.get(STORAGE_KEYS.INVENTORY_TX, []);
    const currentUser = Auth.getCurrentUser();

    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    const order = orders[orderIndex];

    if (order.status === 'cancelled') {
      Toast.error('Đơn hàng này đã được hủy trước đó rồi!');
      return;
    }

    // Hộp thoại có ô nhập lý do (bắt buộc) thay cho prompt() của trình duyệt
    PromptModal.open({
      title: 'Hủy đơn hàng & Hoàn trả kho',
      message: `Bạn có chắc chắn muốn hủy đơn hàng <strong>${order.id}</strong> (${Format.currency(order.total)}) không?<br>Toàn bộ sản phẩm trong đơn sẽ được tự động <strong>hoàn trả lại tồn kho</strong> và ghi vào lịch sử kho.`,
      fields: [
        {
          name: 'reason',
          label: 'Lý do hủy đơn',
          type: 'textarea',
          placeholder: 'Ví dụ: Khách đổi ý trả hàng',
          required: true,
          requiredMessage: 'Vui lòng nhập lý do hủy đơn!'
        }
      ],
      confirmText: 'Xác nhận hủy đơn',
      cancelText: 'Không hủy',
      isDanger: true,
      onSubmit: (values) => {
        const reason = values.reason;

        // 1. Hoàn trả tồn kho cho từng sản phẩm trong đơn
        if (Array.isArray(order.items)) {
          order.items.forEach(item => {
            const pIndex = products.findIndex(p => p.id === item.productId);
            if (pIndex !== -1) {
              const prod = products[pIndex];
              const stockBefore = prod.stock;
              prod.stock += item.quantity;
              const stockAfter = prod.stock;

              // Ghi nhận giao dịch hoàn trả kho
              inventoryTx.unshift({
                id: `TX${Date.now().toString().slice(-6)}`,
                productId: prod.id,
                productName: prod.name,
                type: 'RETURN',
                quantity: item.quantity,
                stockBefore,
                stockAfter,
                createdAt: new Date().toISOString(),
                performedBy: currentUser ? currentUser.username : 'staff',
                reason: `Hoàn kho do hủy đơn ${order.id}: ${reason.trim()}`
              });
            }
          });
        }

        // 2. Cập nhật trạng thái đơn hàng thành 'cancelled'
        order.status = 'cancelled';
        order.cancelledAt = new Date().toISOString();
        order.cancelReason = reason.trim();

        // 3. Lưu vào LocalStorage
        StorageService.set(STORAGE_KEYS.PRODUCTS, products);
        StorageService.set(STORAGE_KEYS.ORDERS, orders);
        StorageService.set(STORAGE_KEYS.INVENTORY_TX, inventoryTx);

        Toast.success(`Đã hủy đơn ${order.id} và hoàn trả ${order.items.length} món vào tồn kho thành công!`);
        renderOrdersTable();
      }
    });
  }
}
