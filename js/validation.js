/**
 * MiniStock - Module Kiểm tra Dữ liệu & Tiện ích Giao diện
 * File: js/validation.js
 * 
 * Chức năng:
 * - Kiểm tra dữ liệu biểu mẫu (trống, trùng mã, số âm, email, số điện thoại)
 * - Định dạng tiền tệ VNĐ và thời gian Việt Nam
 * - Hệ thống thông báo nổi Toast Notification chuyên nghiệp (thay thế alert)
 * - Hộp thoại xác nhận tùy biến đẹp mắt (thay thế confirm)
 */

const Validation = {
  /**
   * Kiểm tra chuỗi rỗng hoặc chỉ toàn khoảng trắng
   */
  isEmpty(val) {
    if (val === null || val === undefined) return true;
    return String(val).trim().length === 0;
  },

  /**
   * Kiểm tra số nguyên dương > 0
   */
  isPositiveNumber(val) {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  },

  /**
   * Kiểm tra số không âm >= 0
   */
  isNonNegativeNumber(val) {
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  },

  /**
   * Kiểm tra định dạng số điện thoại Việt Nam (10 chữ số bắt đầu bằng 0)
   */
  isValidPhone(phone) {
    if (this.isEmpty(phone)) return false;
    const cleanPhone = String(phone).replace(/\s+/g, '');
    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    return phoneRegex.test(cleanPhone);
  },

  /**
   * Kiểm tra định dạng email cơ bản
   */
  isValidEmail(email) {
    if (this.isEmpty(email)) return true; // Email có thể là tùy chọn
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(email).trim());
  },

  /**
   * Kiểm tra mã trùng trong danh sách
   * @param {string} id - Mã cần kiểm tra
   * @param {Array} list - Danh sách các đối tượng
   * @param {string} currentId - Mã hiện tại khi đang sửa (bỏ qua bản thân)
   */
  isDuplicateId(id, list, currentId = null) {
    if (!id || !Array.isArray(list)) return false;
    const target = String(id).trim().toUpperCase();
    return list.some(item => {
      const itemId = String(item.id || item.code).trim().toUpperCase();
      if (currentId && itemId === String(currentId).trim().toUpperCase()) {
        return false;
      }
      return itemId === target;
    });
  },

  /**
   * Hiển thị thông báo lỗi vào phần tử cụ thể
   */
  setFieldError(inputEl, errorEl, message) {
    if (inputEl) {
      inputEl.classList.add('input-error');
    }
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  },

  /**
   * Xóa thông báo lỗi
   */
  clearFieldError(inputEl, errorEl) {
    if (inputEl) {
      inputEl.classList.remove('input-error');
    }
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }
  }
};

// ============================================================
// ĐỊNH DẠNG DỮ LIỆU (FORMATTERS)
// ============================================================

const Format = {
  /**
   * Định dạng tiền tệ VNĐ (ví dụ: 150000 -> 150.000 đ)
   */
  currency(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(num);
  },

  /**
   * Định dạng ngày tháng năm (DD/MM/YYYY)
   */
  date(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  },

  /**
   * Định dạng ngày và giờ (HH:mm DD/MM/YYYY)
   */
  dateTime(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return `${time} ${date}`;
    } catch {
      return dateStr;
    }
  },

  /**
   * Cắt bớt văn bản quá dài
   */
  truncate(text, maxLen = 40) {
    if (!text) return '';
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  }
};

// ============================================================
// HỆ THỐNG THÔNG BÁO NỔI (TOAST NOTIFICATIONS)
// ============================================================

const Toast = {
  container: null,

  init() {
    if (!this.container) {
      let el = document.getElementById('toast-container');
      if (!el) {
        el = document.createElement('div');
        el.id = 'toast-container';
        el.className = 'toast-container';
        document.body.appendChild(el);
      }
      this.container = el;
    }
  },

  /**
   * Hiển thị thông báo nổi
   * @param {string} message - Nội dung thông báo
   * @param {string} type - 'success' | 'danger' | 'warning' | 'info'
   * @param {number} duration - Thời gian hiển thị tính bằng mili-giây
   */
  show(message, type = 'info', duration = 3200) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    const icons = {
      success: '✓',
      danger: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || 'ℹ'}</div>
      <div class="toast-content">${message}</div>
      <button type="button" class="toast-close">&times;</button>
    `;

    // Nút đóng thủ công
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.dismiss(toast);
    });

    this.container.appendChild(toast);

    // Tự động đóng sau khoảng thời gian
    const timer = setTimeout(() => {
      this.dismiss(toast);
    }, duration);

    toast._timer = timer;
  },

  dismiss(toast) {
    if (!toast || toast.classList.contains('toast-fading')) return;
    toast.classList.add('toast-fading');
    if (toast._timer) clearTimeout(toast._timer);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'danger'); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg) { this.show(msg, 'info'); }
};

// ============================================================
// HỘP THOẠI XÁC NHẬN TÙY BIẾN (CUSTOM CONFIRM DIALOG)
// ============================================================

const ModalConfirm = {
  /**
   * Mở hộp thoại xác nhận chuyên nghiệp
   */
  open({ title = 'Xác nhận thao tác', message, confirmText = 'Xác nhận', cancelText = 'Hủy bỏ', isDanger = false, onConfirm }) {
    let backdrop = document.getElementById('confirm-modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'confirm-modal-backdrop';
      backdrop.className = 'modal-backdrop';
      document.body.appendChild(backdrop);
    }

    backdrop.innerHTML = `
      <div class="modal-box modal-sm animate-pop">
        <div class="modal-header">
          <h3 class="modal-title ${isDanger ? 'text-danger' : ''}">${title}</h3>
          <button type="button" class="modal-close" id="btn-confirm-cancel-x">&times;</button>
        </div>
        <div class="modal-body">
          <p class="confirm-message">${message}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" id="btn-confirm-cancel">${cancelText}</button>
          <button type="button" class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}" id="btn-confirm-ok">${confirmText}</button>
        </div>
      </div>
    `;

    backdrop.classList.add('active');

    const closeModal = () => {
      backdrop.classList.remove('active');
    };

    const cancelBtn = backdrop.querySelector('#btn-confirm-cancel');
    const cancelX = backdrop.querySelector('#btn-confirm-cancel-x');
    const okBtn = backdrop.querySelector('#btn-confirm-ok');

    cancelBtn.onclick = closeModal;
    cancelX.onclick = closeModal;

    okBtn.onclick = () => {
      closeModal();
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
    };
  }
};

// ============================================================
// HỘP THOẠI NHẬP LIỆU TÙY BIẾN (THAY CHO prompt() CỦA TRÌNH DUYỆT)
// ============================================================

const PromptModal = {
  /**
   * Mở hộp thoại có form nhỏ, kiểm tra dữ liệu trước khi gọi onSubmit
   * @param {Object} options
   * @param {string} options.title - Tiêu đề hộp thoại
   * @param {string} options.message - Dòng mô tả phía trên form (cho phép HTML)
   * @param {Array} options.fields - Danh sách ô nhập: { name, label, type, placeholder, value, required, requiredMessage, validate, errorMessage }
   * @param {Function} options.onSubmit - Hàm nhận object giá trị { name: value } khi dữ liệu hợp lệ
   */
  open({ title = 'Nhập thông tin', message = '', fields = [], confirmText = 'Xác nhận', cancelText = 'Hủy bỏ', isDanger = false, onSubmit }) {
    let backdrop = document.getElementById('prompt-modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'prompt-modal-backdrop';
      backdrop.className = 'modal-backdrop';
      document.body.appendChild(backdrop);
    }

    // Sinh HTML cho từng ô nhập bằng map()
    const fieldsHtml = fields.map(f => {
      const inputId = `prompt-field-${f.name}`;
      const control = f.type === 'textarea'
        ? `<textarea id="${inputId}" class="form-control" rows="3" placeholder="${f.placeholder || ''}">${f.value || ''}</textarea>`
        : `<input type="${f.type || 'text'}" id="${inputId}" class="form-control" placeholder="${f.placeholder || ''}" value="${f.value || ''}">`;
      return `
        <div class="form-group u-mb-14">
          <label class="form-label" for="${inputId}">${f.label}${f.required ? ' <span class="required">*</span>' : ''}</label>
          ${control}
          <div id="prompt-error-${f.name}" class="form-error"></div>
        </div>`;
    }).join('');

    backdrop.innerHTML = `
      <div class="modal-box modal-sm animate-pop">
        <form id="prompt-form" novalidate>
          <div class="modal-header">
            <h3 class="modal-title ${isDanger ? 'text-danger' : ''}">${title}</h3>
            <button type="button" class="modal-close" id="btn-prompt-cancel-x">&times;</button>
          </div>
          <div class="modal-body">
            ${message ? `<p class="confirm-message u-mb-14">${message}</p>` : ''}
            ${fieldsHtml}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-prompt-cancel">${cancelText}</button>
            <button type="submit" class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}">${confirmText}</button>
          </div>
        </form>
      </div>
    `;
    backdrop.classList.add('active');

    const form = backdrop.querySelector('#prompt-form');
    const closeModal = () => backdrop.classList.remove('active');
    backdrop.querySelector('#btn-prompt-cancel').addEventListener('click', closeModal);
    backdrop.querySelector('#btn-prompt-cancel-x').addEventListener('click', closeModal);

    // Gõ lại thì xóa lỗi của ô đó
    fields.forEach(f => {
      const input = form.querySelector(`#prompt-field-${f.name}`);
      const err = form.querySelector(`#prompt-error-${f.name}`);
      input.addEventListener('input', () => Validation.clearFieldError(input, err));
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault(); // Chặn gửi form để tự kiểm tra bằng JS
      const values = {};
      let hasError = false;

      fields.forEach(f => {
        const input = form.querySelector(`#prompt-field-${f.name}`);
        const err = form.querySelector(`#prompt-error-${f.name}`);
        const value = input.value.trim();
        values[f.name] = value;
        Validation.clearFieldError(input, err);

        if (f.required && Validation.isEmpty(value)) {
          Validation.setFieldError(input, err, f.requiredMessage || `Vui lòng nhập ${f.label.toLowerCase()}!`);
          hasError = true;
        } else if (value && typeof f.validate === 'function' && !f.validate(value)) {
          Validation.setFieldError(input, err, f.errorMessage || 'Giá trị không hợp lệ!');
          hasError = true;
        }
      });

      if (hasError) return;
      closeModal();
      if (typeof onSubmit === 'function') onSubmit(values);
    });

    // Đưa con trỏ vào ô đầu tiên cho tiện gõ
    const firstInput = form.querySelector('input, textarea');
    if (firstInput) firstInput.focus();
  }
};
