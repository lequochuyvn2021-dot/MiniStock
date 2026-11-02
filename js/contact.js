/**
 * MiniStock - Trang Liên hệ & Góp ý
 * File: js/contact.js
 *
 * FORM 3 (form liên hệ) có đủ các loại input: text, tel, email, select, date, radio, textarea, checkbox.
 * Validation bằng JavaScript:
 *  - Kiểm tra rỗng cho các ô bắt buộc
 *  - Kiểm tra định dạng số điện thoại, email
 *  - Nội dung từ 10 đến 500 ký tự (có đếm ký tự trực tiếp khi gõ)
 *  - Ngày phản hồi không được ở quá khứ
 *  - Lỗi hiện chữ đỏ ngay dưới ô, dùng preventDefault() để chặn gửi khi còn lỗi
 * Tin nhắn hợp lệ được lưu vào LocalStorage và hiện ở danh sách bên phải, có nút xóa.
 */

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = Auth.requireAuth(['admin', 'staff', 'warehouse']);
  if (!currentUser) return;
  initContactPage(currentUser);
});

function initContactPage(currentUser) {
  const form = document.getElementById('contact-form');
  const messageInput = document.getElementById('contact-message');
  const charCount = document.getElementById('contact-char-count');
  const successBox = document.getElementById('contact-success');
  const listBox = document.getElementById('contact-list');
  const countBadge = document.getElementById('contact-count');
  const resetBtn = document.getElementById('btn-contact-reset');

  const MESSAGE_MIN = 10;
  const MESSAGE_MAX = 500;

  // Điền sẵn họ tên người đang đăng nhập cho đỡ phải gõ
  document.getElementById('contact-name').value = currentUser.fullName || '';

  // Thông tin cửa hàng lấy từ cài đặt
  const settings = StorageService.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  document.getElementById('info-address').textContent = settings.storeAddress;
  document.getElementById('info-phone').textContent = settings.storePhone;
  document.getElementById('info-email').textContent = settings.storeEmail;

  /**
   * Hiện lỗi ở ô nhập tương ứng
   * @param {string} inputId - id của ô nhập
   * @param {string} errorId - id của thẻ chứa thông báo lỗi
   * @param {string} message - nội dung lỗi
   */
  function showError(inputId, errorId, message) {
    Validation.setFieldError(document.getElementById(inputId), document.getElementById(errorId), message);
  }

  function clearAllErrors() {
    form.querySelectorAll('.form-error').forEach(el => {
      el.textContent = '';
      el.classList.add('hidden');
    });
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  }

  /**
   * Kiểm tra toàn bộ form
   * @returns {boolean} true nếu tất cả hợp lệ
   */
  function validateForm() {
    clearAllErrors();
    let valid = true;

    const name = document.getElementById('contact-name').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const subject = document.getElementById('contact-subject').value;
    const date = document.getElementById('contact-date').value;
    const message = messageInput.value.trim();
    const agree = document.getElementById('contact-agree').checked;

    if (Validation.isEmpty(name)) {
      showError('contact-name', 'err-contact-name', 'Vui lòng nhập họ và tên!');
      valid = false;
    } else if (name.length < 2) {
      showError('contact-name', 'err-contact-name', 'Họ và tên phải có ít nhất 2 ký tự!');
      valid = false;
    }

    if (Validation.isEmpty(phone)) {
      showError('contact-phone', 'err-contact-phone', 'Vui lòng nhập số điện thoại!');
      valid = false;
    } else if (!Validation.isValidPhone(phone)) {
      showError('contact-phone', 'err-contact-phone', 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)!');
      valid = false;
    }

    if (Validation.isEmpty(email)) {
      showError('contact-email', 'err-contact-email', 'Vui lòng nhập email!');
      valid = false;
    } else if (!Validation.isValidEmail(email)) {
      showError('contact-email', 'err-contact-email', 'Email không đúng định dạng (ví dụ: ten@gmail.com)!');
      valid = false;
    }

    if (!subject) {
      showError('contact-subject', 'err-contact-subject', 'Vui lòng chọn chủ đề!');
      valid = false;
    }

    // Ngày phản hồi là tùy chọn, nhưng nếu chọn thì không được ở quá khứ
    if (date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(date) < today) {
        showError('contact-date', 'err-contact-date', 'Ngày phản hồi không được nằm trong quá khứ!');
        valid = false;
      }
    }

    if (Validation.isEmpty(message)) {
      showError('contact-message', 'err-contact-message', 'Vui lòng nhập nội dung!');
      valid = false;
    } else if (message.length < MESSAGE_MIN) {
      showError('contact-message', 'err-contact-message', `Nội dung quá ngắn, cần ít nhất ${MESSAGE_MIN} ký tự!`);
      valid = false;
    } else if (message.length > MESSAGE_MAX) {
      showError('contact-message', 'err-contact-message', `Nội dung quá dài, tối đa ${MESSAGE_MAX} ký tự!`);
      valid = false;
    }

    if (!agree) {
      showError('contact-agree', 'err-contact-agree', 'Bạn cần đồng ý để cửa hàng liên hệ lại!');
      valid = false;
    }

    return valid;
  }

  /** Vẽ lại danh sách liên hệ đã gửi từ LocalStorage */
  function renderContacts() {
    const contacts = StorageService.get(STORAGE_KEYS.CONTACTS, []);
    countBadge.textContent = contacts.length;
    listBox.innerHTML = '';

    if (contacts.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-muted';
      empty.textContent = 'Chưa có liên hệ nào được gửi.';
      listBox.appendChild(empty);
      return;
    }

    contacts.forEach(item => {
      const box = document.createElement('div');
      box.className = 'contact-msg';

      const head = document.createElement('div');
      head.className = 'contact-msg-head';

      const title = document.createElement('div');
      title.className = 'contact-msg-title';
      title.textContent = `${item.subject}${item.priority === 'Gấp' ? ' (Gấp)' : ''}`;

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-outline btn-sm text-danger';
      delBtn.textContent = 'Xóa';
      delBtn.addEventListener('click', () => deleteContact(item.id));

      head.appendChild(title);
      head.appendChild(delBtn);

      const meta = document.createElement('div');
      meta.className = 'contact-msg-meta';
      meta.textContent = `${item.name} · ${item.phone} · ${Format.dateTime(item.createdAt)}`;

      const body = document.createElement('div');
      body.className = 'contact-msg-body';
      body.textContent = item.message; // textContent để không bị chèn HTML

      box.appendChild(head);
      box.appendChild(meta);
      box.appendChild(body);
      listBox.appendChild(box);
    });
  }

  function deleteContact(id) {
    ModalConfirm.open({
      title: 'Xóa liên hệ',
      message: 'Bạn có chắc muốn xóa liên hệ này không?',
      confirmText: 'Xóa',
      isDanger: true,
      onConfirm: () => {
        const contacts = StorageService.get(STORAGE_KEYS.CONTACTS, []).filter(c => c.id !== id);
        StorageService.set(STORAGE_KEYS.CONTACTS, contacts);
        renderContacts();
        Toast.success('Đã xóa liên hệ.');
      }
    });
  }

  // Đếm ký tự khi người dùng gõ (sự kiện input)
  messageInput.addEventListener('input', () => {
    const length = messageInput.value.length;
    charCount.textContent = length;
    charCount.parentElement.classList.toggle('text-danger', length > MESSAGE_MAX);
  });

  // Gõ lại ô nào thì xóa lỗi của ô đó (sự kiện input / change)
  form.querySelectorAll('input, select, textarea').forEach(el => {
    const eventName = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date') ? 'change' : 'input';
    el.addEventListener(eventName, () => {
      const errEl = document.getElementById(`err-${el.id}`);
      Validation.clearFieldError(el, errEl);
    });
  });

  // Sự kiện submit
  form.addEventListener('submit', (event) => {
    event.preventDefault(); // Luôn chặn gửi mặc định, tự xử lý bằng JS
    successBox.classList.add('hidden');

    if (!validateForm()) {
      Toast.error('Vui lòng sửa các ô báo lỗi màu đỏ trước khi gửi!');
      return;
    }

    const contacts = StorageService.get(STORAGE_KEYS.CONTACTS, []);
    const priorityEl = form.querySelector('input[name="contactPriority"]:checked');

    // Object lưu một liên hệ
    const newContact = {
      id: `LH${Date.now()}`,
      name: document.getElementById('contact-name').value.trim(),
      phone: document.getElementById('contact-phone').value.trim(),
      email: document.getElementById('contact-email').value.trim(),
      subject: document.getElementById('contact-subject').value,
      replyDate: document.getElementById('contact-date').value,
      priority: priorityEl ? priorityEl.value : 'Bình thường',
      message: messageInput.value.trim(),
      createdAt: new Date().toISOString()
    };

    contacts.unshift(newContact);
    StorageService.set(STORAGE_KEYS.CONTACTS, contacts);

    successBox.textContent = `Đã gửi thành công! Cảm ơn ${newContact.name}, cửa hàng sẽ phản hồi sớm.`;
    successBox.classList.remove('hidden');
    Toast.success('Gửi liên hệ thành công!');

    form.reset();
    document.getElementById('contact-name').value = currentUser.fullName || '';
    charCount.textContent = 0;
    renderContacts();
  });

  // Nút "Nhập lại": xóa lỗi và đếm ký tự về 0
  resetBtn.addEventListener('click', () => {
    clearAllErrors();
    successBox.classList.add('hidden');
    charCount.textContent = 0;
  });

  renderContacts();
}
