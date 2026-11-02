/**
 * MiniStock - Module Bán Hàng & Lập Hóa Đơn (POS)
 * File: js/sales.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = Auth.requireAuth(['admin', 'staff']);
  if (!currentUser) return;

  initSalesPOS();
});

function initSalesPOS() {
  const searchInput = document.getElementById('pos-search');
  const categoryPillsContainer = document.getElementById('category-pills');
  const productsGrid = document.getElementById('pos-products-grid');

  // Giỏ hàng
  const cartItemsContainer = document.getElementById('pos-cart-items');
  const cartSubtotalEl = document.getElementById('cart-subtotal');
  const cartDiscountInput = document.getElementById('cart-discount');
  const cartTotalEl = document.getElementById('cart-total');
  const cartItemCountEl = document.getElementById('cart-item-count');
  const btnClearCart = document.getElementById('btn-clear-cart');
  const btnCheckout = document.getElementById('btn-checkout');

  // Khách hàng & thanh toán
  const customerSelect = document.getElementById('cart-customer-select');
  const btnQuickAddCustomer = document.getElementById('btn-quick-add-customer');
  const paymentMethodSelect = document.getElementById('cart-payment-method');
  const orderNoteInput = document.getElementById('cart-note');

  // Modal hóa đơn sau thanh toán
  const invoiceModal = document.getElementById('invoice-modal');
  const invoicePaper = document.getElementById('invoice-paper-content');
  const btnPrintInvoice = document.getElementById('btn-print-invoice');
  const btnCloseInvoice = document.getElementById('btn-close-invoice');

  // Giỏ hàng trong bộ nhớ
  let cart = []; // Mảng chứa các item: { productId, name, price, costPrice, quantity, stock, unit, image }
  let activeCategoryId = ''; // Rỗng là tất cả

  // Khởi tạo
  renderCategoryPills();
  renderProductsCatalog();
  loadCustomerDropdown();
  renderCart();

  // Sự kiện tìm kiếm & lọc
  if (searchInput) searchInput.addEventListener('input', renderProductsCatalog);
  if (cartDiscountInput) cartDiscountInput.addEventListener('input', updateCartTotals);
  if (btnClearCart) btnClearCart.addEventListener('click', handleClearCart);
  if (btnCheckout) btnCheckout.addEventListener('click', handleCheckout);

  if (btnCloseInvoice) btnCloseInvoice.addEventListener('click', () => invoiceModal.classList.remove('active'));
  if (btnPrintInvoice) btnPrintInvoice.addEventListener('click', () => window.print());

  if (btnQuickAddCustomer) {
    btnQuickAddCustomer.addEventListener('click', handleQuickAddCustomer);
  }

  /**
   * Render các nút danh mục dạng Pill
   */
  function renderCategoryPills() {
    const categories = StorageService.get(STORAGE_KEYS.CATEGORIES, []).filter(c => c.status === 'active');
    if (!categoryPillsContainer) return;

    categoryPillsContainer.innerHTML = `
      <button type="button" class="category-pill ${activeCategoryId === '' ? 'active' : ''}" data-id="">
        Tất cả danh mục
      </button>
      ${categories.map(c => `
        <button type="button" class="category-pill ${activeCategoryId === c.id ? 'active' : ''}" data-id="${c.id}">
          ${c.name}
        </button>
      `).join('')}
    `;

    categoryPillsContainer.querySelectorAll('.category-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        activeCategoryId = pill.getAttribute('data-id');
        renderCategoryPills();
        renderProductsCatalog();
      });
    });
  }

  /**
   * Render lưới sản phẩm để chọn bán
   */
  function renderProductsCatalog() {
    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []).filter(p => p.status === 'active');
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

    const filtered = products.filter(p => {
      const matchSearch = p.id.toLowerCase().includes(searchTerm) || p.name.toLowerCase().includes(searchTerm);
      const matchCat = !activeCategoryId || p.categoryId === activeCategoryId;
      return matchSearch && matchCat;
    });

    if (!productsGrid) return;

    if (filtered.length === 0) {
      productsGrid.innerHTML = `
        <div class="empty-state u-col-full">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">Không tìm thấy sản phẩm phù hợp</div>
          <div class="empty-state-desc">Hãy thử gõ từ khóa khác.</div>
        </div>
      `;
      return;
    }

    productsGrid.innerHTML = filtered.map(p => {
      const isOutOfStock = p.stock <= 0;
      return `
        <div class="pos-product-card ${isOutOfStock ? 'out-of-stock' : ''}" data-id="${p.id}" title="${p.name}">
          <img src="${p.image || 'images/logo/icon.svg'}" alt="${p.name}" class="pos-product-img" onerror="handleImageError(this)">
          <div class="pos-product-name">${p.name}</div>
          <div class="pos-product-price">${Format.currency(p.price)}</div>
          <div class="pos-product-stock">
            ${isOutOfStock ? '<span class="text-danger font-bold">Hết hàng (0)</span>' : `Kho: <strong>${p.stock} ${p.unit}</strong>`}
          </div>
        </div>
      `;
    }).join('');

    // Sự kiện click thêm vào giỏ
    productsGrid.querySelectorAll('.pos-product-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        addToCart(id);
      });
    });
  }

  /**
   * Tải danh sách khách hàng vào dropdown
   */
  function loadCustomerDropdown() {
    const customers = StorageService.get(STORAGE_KEYS.CUSTOMERS, []);
    if (!customerSelect) return;

    customerSelect.innerHTML = `
      <option value="guest">Khách mua lẻ tại quầy</option>
      ${customers.map(c => `
        <option value="${c.id}">${c.name} - ${c.phone}</option>
      `).join('')}
    `;
  }

  /**
   * Thêm sản phẩm vào giỏ hàng
   */
  function addToCart(productId) {
    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
    const product = products.find(p => p.id === productId);

    if (!product) return;

    if (product.stock <= 0) {
      Toast.error(`Sản phẩm "${product.name}" đã hết hàng trong kho, không thể thêm!`);
      return;
    }

    const cartItem = cart.find(item => item.productId === productId);

    if (cartItem) {
      if (cartItem.quantity + 1 > product.stock) {
        Toast.warning(`Chỉ còn ${product.stock} ${product.unit} trong kho, không thể thêm vượt quá!`);
        return;
      }
      cartItem.quantity += 1;
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        costPrice: product.costPrice,
        quantity: 1,
        stock: product.stock,
        unit: product.unit,
        image: product.image
      });
    }

    renderCart();
    Toast.success(`Đã thêm "${product.name}" vào giỏ hàng.`);
  }

  /**
   * Render danh sách item trong giỏ hàng
   */
  function renderCart() {
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="empty-state empty-cart">
          <div class="empty-cart-icon">🛒</div>
          <div class="empty-cart-text">Giỏ hàng đang trống</div>
          <small class="text-light">Nhấp vào sản phẩm bên trái để thêm</small>
        </div>
      `;
      if (cartItemCountEl) cartItemCountEl.textContent = '0 món';
      updateCartTotals();
      return;
    }

    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartItemCountEl) cartItemCountEl.textContent = `${totalCount} món`;

    cartItemsContainer.innerHTML = cart.map((item, index) => {
      const lineSubtotal = item.quantity * item.price;
      return `
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-title" title="${item.name}">${item.name}</div>
            <div class="cart-item-price">${Format.currency(item.price)} × ${item.quantity} = <strong class="text-primary">${Format.currency(lineSubtotal)}</strong></div>
          </div>
          <div class="cart-qty-ctrl">
            <button type="button" class="cart-qty-btn btn-cart-minus" data-index="${index}">-</button>
            <input type="number" class="cart-qty-input" data-index="${index}" value="${item.quantity}" min="1" max="${item.stock}">
            <button type="button" class="cart-qty-btn btn-cart-plus" data-index="${index}">+</button>
            <button type="button" class="btn btn-outline btn-sm text-danger btn-cart-remove btn-cart-x" data-index="${index}" title="Xóa món">✕</button>
          </div>
        </div>
      `;
    }).join('');

    // Sự kiện điều chỉnh số lượng
    cartItemsContainer.querySelectorAll('.btn-cart-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'), 10);
        if (cart[index].quantity > 1) {
          cart[index].quantity -= 1;
        } else {
          cart.splice(index, 1);
        }
        renderCart();
      });
    });

    cartItemsContainer.querySelectorAll('.btn-cart-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'), 10);
        if (cart[index].quantity + 1 > cart[index].stock) {
          Toast.warning(`Kho chỉ còn ${cart[index].stock} ${cart[index].unit}!`);
          return;
        }
        cart[index].quantity += 1;
        renderCart();
      });
    });

    cartItemsContainer.querySelectorAll('.cart-qty-input').forEach(input => {
      input.addEventListener('change', () => {
        const index = parseInt(input.getAttribute('data-index'), 10);
        const val = parseInt(input.value, 10);
        if (isNaN(val) || val < 1) {
          cart[index].quantity = 1;
        } else if (val > cart[index].stock) {
          Toast.warning(`Kho chỉ còn ${cart[index].stock} ${cart[index].unit}!`);
          cart[index].quantity = cart[index].stock;
        } else {
          cart[index].quantity = val;
        }
        renderCart();
      });
    });

    cartItemsContainer.querySelectorAll('.btn-cart-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'), 10);
        cart.splice(index, 1);
        renderCart();
      });
    });

    updateCartTotals();
  }

  /**
   * Tính toán tổng tiền giỏ hàng
   */
  function updateCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    let discount = Number(cartDiscountInput ? cartDiscountInput.value : 0);

    if (isNaN(discount) || discount < 0) {
      discount = 0;
      if (cartDiscountInput) cartDiscountInput.value = 0;
    }

    if (discount > subtotal) {
      Toast.warning('Giảm giá không thể vượt quá tổng tiền hàng!');
      discount = subtotal;
      if (cartDiscountInput) cartDiscountInput.value = discount;
    }

    const finalTotal = Math.max(0, subtotal - discount);

    if (cartSubtotalEl) cartSubtotalEl.textContent = Format.currency(subtotal);
    if (cartTotalEl) cartTotalEl.textContent = Format.currency(finalTotal);
  }

  function handleClearCart() {
    if (cart.length === 0) return;
    ModalConfirm.open({
      title: 'Làm sạch giỏ hàng',
      message: 'Bạn có chắc muốn xóa tất cả sản phẩm đang có trong giỏ hàng không?',
      confirmText: 'Làm sạch',
      cancelText: 'Giữ lại',
      isDanger: true,
      onConfirm: () => {
        cart = [];
        if (cartDiscountInput) cartDiscountInput.value = 0;
        renderCart();
        Toast.info('Đã làm sạch giỏ hàng.');
      }
    });
  }

  /**
   * Thêm nhanh khách hàng mới ngay tại màn hình POS
   */
  function handleQuickAddCustomer() {
    // Form nhỏ trong modal, có kiểm tra họ tên và số điện thoại
    PromptModal.open({
      title: 'Thêm nhanh khách hàng',
      fields: [
        { name: 'name', label: 'Họ tên khách hàng', type: 'text', placeholder: 'Ví dụ: Nguyễn Văn An', required: true,
          validate: (v) => v.length >= 2, errorMessage: 'Họ tên phải có ít nhất 2 ký tự!' },
        { name: 'phone', label: 'Số điện thoại', type: 'tel', placeholder: '10 số, bắt đầu bằng 0', required: true,
          validate: (v) => Validation.isValidPhone(v), errorMessage: 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)!' }
      ],
      confirmText: 'Thêm khách hàng',
      onSubmit: (values) => {
        const customers = StorageService.get(STORAGE_KEYS.CUSTOMERS, []);
        const newId = `KH${String(customers.length + 1).padStart(3, '0')}`;
        customers.push({
          id: newId,
          name: values.name,
          phone: values.phone,
          email: '',
          address: '',
          createdAt: new Date().toISOString(),
          note: 'Tạo nhanh tại quầy bán lẻ'
        });
        StorageService.set(STORAGE_KEYS.CUSTOMERS, customers);
        loadCustomerDropdown();
        customerSelect.value = newId;
        Toast.success(`Đã thêm khách hàng "${values.name}" thành công!`);
      }
    });
  }

  /**
   * Hoàn tất đơn hàng & thanh toán
   */
  function handleCheckout() {
    if (cart.length === 0) {
      Toast.error('Giỏ hàng đang trống! Vui lòng chọn sản phẩm để thanh toán.');
      return;
    }

    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
    const orders = StorageService.get(STORAGE_KEYS.ORDERS, []);
    const inventoryTx = StorageService.get(STORAGE_KEYS.INVENTORY_TX, []);
    const customers = StorageService.get(STORAGE_KEYS.CUSTOMERS, []);
    const currentUser = Auth.getCurrentUser();

    // 1. Kiểm tra tồn kho lần cuối cho toàn bộ sản phẩm trong giỏ
    for (const item of cart) {
      const liveProduct = products.find(p => p.id === item.productId);
      if (!liveProduct) {
        Toast.error(`Sản phẩm "${item.name}" không còn tồn tại trên hệ thống!`);
        return;
      }
      if (liveProduct.stock < item.quantity) {
        Toast.error(`Sản phẩm "${item.name}" không đủ số lượng trong kho (chỉ còn ${liveProduct.stock} ${liveProduct.unit})!`);
        return;
      }
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const discount = Number(cartDiscountInput ? cartDiscountInput.value : 0) || 0;
    const total = Math.max(0, subtotal - discount);

    // Xác định thông tin khách hàng
    const customerId = customerSelect ? customerSelect.value : 'guest';
    let customerName = 'Khách mua lẻ tại quầy';
    let customerPhone = '';

    if (customerId !== 'guest') {
      const cust = customers.find(c => c.id === customerId);
      if (cust) {
        customerName = cust.name;
        customerPhone = cust.phone;
      }
    }

    const paymentMethod = paymentMethodSelect ? paymentMethodSelect.value : 'cash';
    const note = orderNoteInput ? orderNoteInput.value.trim() : '';

    // Tạo mã hóa đơn duy nhất
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randNum = String(Math.floor(Math.random() * 900) + 100);
    const orderId = `HD${dateStr}${randNum}`;

    // 2. Trừ tồn kho & ghi nhận lịch sử biến động kho (Duy nhất 1 lần khi thanh toán)
    const orderItems = cart.map(item => {
      const pIndex = products.findIndex(p => p.id === item.productId);
      const prod = products[pIndex];
      const stockBefore = prod.stock;
      prod.stock -= item.quantity;
      const stockAfter = prod.stock;

      // Tạo bản ghi giao dịch kho
      inventoryTx.unshift({
        id: `TX${Date.now().toString().slice(-6)}`,
        productId: prod.id,
        productName: prod.name,
        type: 'SALE',
        quantity: item.quantity,
        stockBefore,
        stockAfter,
        createdAt: new Date().toISOString(),
        performedBy: currentUser ? currentUser.username : 'staff',
        reason: `Bán hàng theo hóa đơn ${orderId}`
      });

      return {
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        costPrice: item.costPrice,
        subtotal: item.quantity * item.price
      };
    });

    // 3. Tạo bản ghi đơn hàng mới
    const newOrder = {
      id: orderId,
      customerId,
      customerName,
      customerPhone,
      createdAt: new Date().toISOString(),
      items: orderItems,
      subtotal,
      discount,
      total,
      paymentMethod,
      status: 'completed',
      createdBy: currentUser ? currentUser.username : 'staff',
      note
    };

    orders.unshift(newOrder);

    // Lưu vào LocalStorage
    StorageService.set(STORAGE_KEYS.PRODUCTS, products);
    StorageService.set(STORAGE_KEYS.ORDERS, orders);
    StorageService.set(STORAGE_KEYS.INVENTORY_TX, inventoryTx);

    // Hiển thị hóa đơn
    showInvoicePreview(newOrder);

    // Reset giỏ hàng
    cart = [];
    if (cartDiscountInput) cartDiscountInput.value = 0;
    if (orderNoteInput) orderNoteInput.value = '';
    renderCart();
    renderProductsCatalog(); // Cập nhật lại số tồn hiển thị

    Toast.success(`Thanh toán thành công! Mã đơn: ${orderId}`);
  }

  /**
   * Hiển thị xem trước hóa đơn và in
   */
  function showInvoicePreview(order) {
    const settings = StorageService.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);

    const paymentMethodNames = {
      cash: 'Tiền mặt',
      transfer: 'Chuyển khoản QR',
      card: 'Thẻ ngân hàng'
    };

    invoicePaper.innerHTML = `
      <div id="print-area" class="invoice-paper">
        <div class="invoice-header">
          <h2>${settings.storeName}</h2>
          <p>${settings.storeAddress}</p>
          <p>Hotline: ${settings.storePhone}</p>
          <h3 class="inv-title">HÓA ĐƠN BÁN LẺ</h3>
          <p class="inv-sub">Mã HĐ: <strong>${order.id}</strong></p>
        </div>

        <div class="invoice-meta">
          <div>Ngày lập: ${Format.dateTime(order.createdAt)}</div>
          <div>Khách hàng: <strong>${order.customerName}</strong> ${order.customerPhone ? `(${order.customerPhone})` : ''}</div>
          <div>Thu ngân: ${order.createdBy}</div>
          <div>Phương thức: ${paymentMethodNames[order.paymentMethod] || order.paymentMethod}</div>
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
            <span>KHÁCH PHẢI TRẢ:</span>
            <span>${Format.currency(order.total)}</span>
          </div>
        </div>

        <div class="invoice-footer">
          <p>Cảm ơn quý khách và hẹn gặp lại!</p>
          <p class="inv-foot">MiniStock - Hệ thống bán lẻ thông minh</p>
        </div>
      </div>
    `;

    invoiceModal.classList.add('active');
  }
}
