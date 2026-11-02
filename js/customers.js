/**
 * MiniStock - Module Quản lý Khách hàng & Lịch sử Mua hàng
 * File: js/customers.js
 * Triển khai FORM 1 - FORM NHẬP LIỆU CHÍNH ĐẠT CHUẨN TIÊU CHÍ MÔN HỌC:
 * - Có hơn 8 loại input khác nhau: text, tel, email, date, number, select, radio, checkbox, textarea
 * - Kiểm tra lỗi đầy đủ (trống, định dạng, số âm, điều khoản bắt buộc)
 * - Hiển thị lỗi màu đỏ ngay dưới trường tương ứng
 * - Sử dụng event.preventDefault() chặn gửi form khi sai sót
 * - Hiển thị thông báo thành công và lưu vào LocalStorage
 */

document.addEventListener('DOMContentLoaded', () => {
  // Kỹ thuật 8: Kiểm tra quyền truy cập
  const currentUser = Auth.requireAuth(['admin', 'staff']);
  if (!currentUser) return;

  initCustomerManagement();
});

function initCustomerManagement() {
  // Kỹ thuật 1: Truy xuất DOM bằng getElementById
  const tableBody = document.getElementById('customers-table-body');
  const searchInput = document.getElementById('customers-search');
  const btnAddCustomer = document.getElementById('btn-add-customer');
  const customerCountBadge = document.getElementById('customers-count-badge');

  // Modal và Form 1
  const customerModal = document.getElementById('customer-modal');
  const customerForm = document.getElementById('customer-form');
  const modalTitle = document.getElementById('modal-customer-title');
  const btnCloseModal = document.getElementById('btn-close-customer-modal');
  const btnCancelModal = document.getElementById('btn-cancel-customer-modal');

  // Modal xem lịch sử mua hàng
  const historyModal = document.getElementById('customer-history-modal');
  const historyContent = document.getElementById('customer-history-content');
  const btnCloseHistory = document.getElementById('btn-close-customer-history');

  let editingCustomerId = null;

  // Render bảng lần đầu
  renderCustomersTable();

  // Kỹ thuật 2 & 10: Lắng nghe sự kiện input tìm kiếm trực tiếp
  if (searchInput) searchInput.addEventListener('input', renderCustomersTable);

  if (btnAddCustomer) {
    btnAddCustomer.addEventListener('click', () => openCustomerModal());
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeCustomerModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeCustomerModal);
  if (btnCloseHistory) btnCloseHistory.addEventListener('click', () => historyModal.classList.remove('active'));

  // Kỹ thuật 2 & 10: Xử lý sự kiện SUBMIT của FORM 1
  if (customerForm) {
    customerForm.addEventListener('submit', (e) => {
      e.preventDefault(); // Ngăn hành vi tải lại trang mặc định
      handleSaveCustomer();
    });
  }

  /**
   * Kỹ thuật 6: Hiển thị danh sách khách hàng tính toán chi tiêu từ đơn hàng hoàn tất
   */
  function renderCustomersTable() {
    const customers = StorageService.get(STORAGE_KEYS.CUSTOMERS, []);
    const orders = StorageService.get(STORAGE_KEYS.ORDERS, []);
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

    // Tính toán chi tiêu
    const customerStats = {};
    orders.forEach(order => {
      if (order.status === 'completed' && order.customerId && order.customerId !== 'guest') {
        if (!customerStats[order.customerId]) {
          customerStats[order.customerId] = { totalSpent: 0, orderCount: 0 };
        }
        customerStats[order.customerId].totalSpent += order.total;
        customerStats[order.customerId].orderCount += 1;
      }
    });

    // Kỹ thuật 6: Dùng filter() để tìm kiếm theo tên, SĐT hoặc mã
    const filtered = customers.filter(c => 
      c.id.toLowerCase().includes(searchTerm) || 
      c.name.toLowerCase().includes(searchTerm) || 
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm))
    );

    // Kỹ thuật 3: Thay đổi nội dung textContent
    if (customerCountBadge) {
      customerCountBadge.textContent = `${filtered.length} khách hàng`;
    }

    if (!tableBody) return;

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-state-icon">👥</div>
              <div class="empty-state-title">Không tìm thấy khách hàng nào</div>
              <div class="empty-state-desc">Hãy thêm mới hoặc thay đổi từ khóa tìm kiếm.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const typeBadges = {
      retail: '<span class="badge badge-secondary">Khách lẻ</span>',
      wholesale: '<span class="badge badge-warning">Khách sỉ</span>',
      vip: '<span class="badge badge-primary">Khách VIP</span>'
    };

    // Kỹ thuật 6: Dùng map() tạo bảng
    tableBody.innerHTML = filtered.map(c => {
      const stats = customerStats[c.id] || { totalSpent: 0, orderCount: 0 };
      const typeBadge = typeBadges[c.customerType] || '<span class="badge badge-secondary">Khách lẻ</span>';

      return `
        <tr>
          <td class="font-bold text-primary">${c.id}</td>
          <td>
            <div class="font-bold">${c.name}</div>
            <small class="text-muted">${c.address || c.province || 'Chưa cập nhật địa chỉ'}</small>
          </td>
          <td>${c.phone}</td>
          <td>${c.email || '<span class="text-muted">-</span>'}</td>
          <td>${typeBadge}</td>
          <td><span class="badge badge-secondary">${stats.orderCount} đơn</span></td>
          <td class="font-bold text-primary">${Format.currency(stats.totalSpent)}</td>
          <td>
            <div class="action-buttons">
              <button type="button" class="btn btn-outline btn-sm btn-view-cust-history" data-id="${c.id}" title="Xem lịch sử mua">
                📜 Lịch sử
              </button>
              <button type="button" class="btn btn-outline btn-sm btn-edit-customer" data-id="${c.id}" title="Sửa thông tin">
                ✏ Sửa
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    attachCustomerActions();
  }

  function attachCustomerActions() {
    document.querySelectorAll('.btn-view-cust-history').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        viewCustomerHistory(id);
      });
    });

    document.querySelectorAll('.btn-edit-customer').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openCustomerModal(id);
      });
    });
  }

  function clearFormErrors() {
    document.querySelectorAll('#customer-form .form-error').forEach(el => el.textContent = '');
    document.querySelectorAll('#customer-form .input-error').forEach(el => el.classList.remove('input-error'));
  }

  function setFieldError(fieldId, errorId, message) {
    const input = document.getElementById(fieldId);
    const err = document.getElementById(errorId);
    if (input) input.classList.add('input-error');
    if (err) err.textContent = message;
  }

  function openCustomerModal(customerId = null) {
    editingCustomerId = customerId;
    clearFormErrors();

    if (customerId) {
      const customers = StorageService.get(STORAGE_KEYS.CUSTOMERS, []);
      const c = customers.find(item => item.id === customerId);
      if (!c) return;

      modalTitle.textContent = `Chỉnh sửa khách hàng: ${c.name}`;
      document.getElementById('customer-code').value = c.id;
      document.getElementById('customer-code').disabled = true;
      document.getElementById('customer-name').value = c.name;
      document.getElementById('customer-phone').value = c.phone;
      document.getElementById('customer-email').value = c.email || '';
      document.getElementById('customer-birthday').value = c.birthday || '';
      document.getElementById('customer-points').value = c.points || 0;
      document.getElementById('customer-province').value = c.province || '';
      document.getElementById('customer-address').value = c.address || '';

      // Radio nhóm khách
      const radioType = document.querySelector(`input[name="customerType"][value="${c.customerType || 'retail'}"]`);
      if (radioType) radioType.checked = true;

      // Checkbox
      document.getElementById('cust-opt-invoice').checked = !!c.optInvoice;
      document.getElementById('cust-opt-sms').checked = c.optSms !== false;
      document.getElementById('cust-opt-terms').checked = true;
    } else {
      const customers = StorageService.get(STORAGE_KEYS.CUSTOMERS, []);
      const nextId = `KH${String(customers.length + 1).padStart(3, '0')}`;
      modalTitle.textContent = 'Thêm khách hàng mới';
      customerForm.reset();
      document.getElementById('customer-code').value = nextId;
      document.getElementById('customer-code').disabled = false;
      document.getElementById('customer-points').value = 0;
      document.getElementById('cust-opt-terms').checked = true;
    }

    customerModal.classList.add('active');
  }

  function closeCustomerModal() {
    customerModal.classList.remove('active');
    editingCustomerId = null;
  }

  /**
   * Kỹ thuật 8: Kiểm tra validation toàn diện cho Form 1
   * Đảm bảo hiển thị thông báo lỗi màu đỏ ngay dưới ô nhập liệu
   */
  function handleSaveCustomer() {
    clearFormErrors();

    const code = document.getElementById('customer-code').value.trim().toUpperCase();
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const email = document.getElementById('customer-email').value.trim();
    const birthday = document.getElementById('customer-birthday').value;
    const points = Number(document.getElementById('customer-points').value);
    const province = document.getElementById('customer-province').value;
    const address = document.getElementById('customer-address').value.trim();

    // Lấy giá trị radio nhóm khách
    const typeRadio = document.querySelector('input[name="customerType"]:checked');
    const customerType = typeRadio ? typeRadio.value : 'retail';

    // Lấy giá trị checkbox
    const optInvoice = document.getElementById('cust-opt-invoice').checked;
    const optSms = document.getElementById('cust-opt-sms').checked;
    const optTerms = document.getElementById('cust-opt-terms').checked;

    const customers = StorageService.get(STORAGE_KEYS.CUSTOMERS, []);
    let hasError = false;

    // 1. Kiểm tra mã khách hàng
    if (Validation.isEmpty(code)) {
      setFieldError('customer-code', 'err-customer-code', 'Vui lòng nhập mã khách hàng!');
      hasError = true;
    } else if (!editingCustomerId && Validation.isDuplicateId(code, customers)) {
      setFieldError('customer-code', 'err-customer-code', `Mã khách hàng "${code}" đã tồn tại trên hệ thống!`);
      hasError = true;
    }

    // 2. Kiểm tra số điện thoại (10 chữ số, bắt đầu bằng 0)
    if (Validation.isEmpty(phone)) {
      setFieldError('customer-phone', 'err-customer-phone', 'Vui lòng nhập số điện thoại liên hệ!');
      hasError = true;
    } else if (!Validation.isValidPhone(phone)) {
      setFieldError('customer-phone', 'err-customer-phone', 'Số điện thoại không hợp lệ (Phải gồm 10 chữ số, bắt đầu bằng 0)!');
      hasError = true;
    }

    // 3. Kiểm tra họ và tên
    if (Validation.isEmpty(name)) {
      setFieldError('customer-name', 'err-customer-name', 'Vui lòng nhập họ và tên khách hàng!');
      hasError = true;
    }

    // 4. Kiểm tra định dạng Email nếu có nhập
    if (!Validation.isEmpty(email) && !Validation.isValidEmail(email)) {
      setFieldError('customer-email', 'err-customer-email', 'Định dạng email không hợp lệ (Ví dụ: ten@gmail.com)!');
      hasError = true;
    }

    // 5. Kiểm tra điểm tích lũy (phải >= 0)
    if (isNaN(points) || points < 0) {
      setFieldError('customer-points', 'err-customer-points', 'Điểm tích lũy không được là số âm!');
      hasError = true;
    }

    // 6. Kiểm tra tỉnh thành phố
    if (Validation.isEmpty(province)) {
      setFieldError('customer-province', 'err-customer-province', 'Vui lòng chọn tỉnh / thành phố sinh sống!');
      hasError = true;
    }

    // 7. Kiểm tra checkbox đồng ý điều khoản bắt buộc
    if (!optTerms) {
      const errTerms = document.getElementById('err-customer-terms');
      if (errTerms) errTerms.textContent = 'Bạn bắt buộc phải đồng ý với điều khoản thành viên!';
      hasError = true;
    }

    // Dừng lại và không lưu nếu phát hiện lỗi
    if (hasError) {
      Toast.error('Vui lòng kiểm tra và sửa các thông tin màu đỏ trên biểu mẫu!');
      return;
    }

    // Kỹ thuật 7: Tạo object để lưu dữ liệu
    if (editingCustomerId) {
      const index = customers.findIndex(c => c.id === editingCustomerId);
      if (index === -1) return;

      customers[index] = {
        ...customers[index],
        name,
        phone,
        email,
        birthday,
        points,
        province,
        customerType,
        address,
        optInvoice,
        optSms,
        updatedAt: new Date().toISOString()
      };

      StorageService.set(STORAGE_KEYS.CUSTOMERS, customers);
      Toast.success(`Đã cập nhật thông tin khách hàng "${name}" thành công!`);
    } else {
      customers.push({
        id: code,
        name,
        phone,
        email,
        birthday,
        points,
        province,
        customerType,
        address,
        optInvoice,
        optSms,
        createdAt: new Date().toISOString()
      });

      StorageService.set(STORAGE_KEYS.CUSTOMERS, customers);
      Toast.success(`Đã tạo mới hồ sơ khách hàng "${name}" thành công!`);
    }

    closeCustomerModal();
    renderCustomersTable();
  }

  function viewCustomerHistory(customerId) {
    const customers = StorageService.get(STORAGE_KEYS.CUSTOMERS, []);
    const orders = StorageService.get(STORAGE_KEYS.ORDERS, []);
    const c = customers.find(item => item.id === customerId);
    if (!c) return;

    const customerOrders = orders.filter(o => o.customerId === customerId);
    const validOrders = customerOrders.filter(o => o.status === 'completed');
    const totalSpent = validOrders.reduce((sum, o) => sum + o.total, 0);

    historyContent.innerHTML = `
      <div class="mb-18 pb-14 hist-header">
        <h3 class="hist-name">${c.name} (${c.id})</h3>
        <p class="text-muted mb-10 hist-meta">
          SĐT: <strong>${c.phone}</strong> | Email: ${c.email || 'Không có'} | Khu vực: ${c.province || 'Chưa rõ'}
        </p>
        <div class="d-flex gap-14">
          <div class="hist-box hist-box-primary">
            <small class="text-muted">Tổng chi tiêu:</small>
            <div class="hist-value hist-value-primary">${Format.currency(totalSpent)}</div>
          </div>
          <div class="hist-box hist-box-plain">
            <small class="text-muted">Số đơn hoàn tất:</small>
            <div class="hist-value">${validOrders.length} / ${customerOrders.length} đơn</div>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Mã HĐ</th>
              <th>Ngày mua</th>
              <th>Số lượng món</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${customerOrders.length === 0 ? `
              <tr><td colspan="5" class="text-center text-muted u-pad-24">Khách hàng này chưa có đơn hàng nào.</td></tr>
            ` : customerOrders.map(o => `
              <tr>
                <td class="font-bold text-primary">${o.id}</td>
                <td>${Format.dateTime(o.createdAt)}</td>
                <td>${o.items ? o.items.reduce((s, i) => s + i.quantity, 0) : 0} món</td>
                <td class="font-bold">${Format.currency(o.total)}</td>
                <td>${o.status === 'completed' ? '<span class="badge badge-success">Hoàn tất</span>' : '<span class="badge badge-danger">Đã hủy</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    historyModal.classList.add('active');
  }
}
