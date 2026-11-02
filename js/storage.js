/**
 * MiniStock - Module Quản lý Lưu trữ (LocalStorage)
 * File: js/storage.js
 *
 * Chức năng:
 * - Đọc và ghi dữ liệu an toàn vào LocalStorage với try...catch
 * - Khởi tạo dữ liệu mẫu phong phú khi lần đầu chạy ứng dụng
 * - Không ghi đè dữ liệu cũ khi tải lại trang
 * - Cung cấp API xuất (export) và nhập (import) dữ liệu JSON
 * - Cung cấp chức năng khôi phục dữ liệu mẫu
 */

const STORAGE_KEYS = {
  PRODUCTS: "ministock_products",
  CATEGORIES: "ministock_categories",
  CUSTOMERS: "ministock_customers",
  ORDERS: "ministock_orders",
  INVENTORY_TX: "ministock_inventory_tx",
  USERS: "ministock_users",
  CONTACTS: "ministock_contacts",
  SESSION: "ministock_session",
  SETTINGS: "ministock_settings",
  VERSION: "ministock_data_version",
};

// Số phiên bản cấu trúc dữ liệu. Khi sửa cấu trúc dữ liệu mẫu thì tăng số này lên
// để trình duyệt nào còn lưu dữ liệu cũ sẽ được làm mới, tránh lỗi hiện 0đ / undefined.
const DATA_VERSION = "2";

/**
 * Tạo mốc thời gian cách hôm nay n ngày (dùng cho dữ liệu mẫu)
 * để biểu đồ doanh thu 7 ngày luôn có dữ liệu dù mở web vào ngày nào.
 * @param {number} n - số ngày trước
 * @param {number} hour - giờ trong ngày
 * @param {number} minute - phút
 * @returns {string} chuỗi thời gian ISO
 */
function daysAgo(n, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// Cài đặt mặc định của cửa hàng
const DEFAULT_SETTINGS = {
  storeName: "MiniStock - Cửa hàng Văn phòng phẩm & Phụ kiện",
  storeAddress: "123 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
  storePhone: "0901 234 567",
  storeEmail: "contact@ministock.vn",
  lowStockThreshold: 5, // Ngưỡng cảnh báo sắp hết hàng
  currency: "VNĐ",
};

// Dữ liệu mẫu danh mục sản phẩm
const INITIAL_CATEGORIES = [
  {
    id: "CAT01",
    name: "Văn phòng phẩm",
    description: "Sổ tay, bút viết, giấy in và dụng cụ học tập, làm việc",
    status: "active",
    createdAt: "2026-01-10T08:00:00Z",
  },
  {
    id: "CAT02",
    name: "Phụ kiện công nghệ",
    description: "Chuột, bàn phím, cáp sạc, tai nghe và giá đỡ laptop",
    status: "active",
    createdAt: "2026-01-10T08:15:00Z",
  },
  {
    id: "CAT03",
    name: "Đời sống & Cá nhân",
    description: "Bình giữ nhiệt, balo, đèn bàn LED và vật dụng sinh hoạt",
    status: "active",
    createdAt: "2026-01-10T08:30:00Z",
  },
  {
    id: "CAT04",
    name: "Quà tặng & Phụ kiện lưu niệm",
    description: "Sản phẩm trang trí bàn làm việc và quà lưu niệm nhỏ",
    status: "active",
    createdAt: "2026-01-10T08:45:00Z",
  },
];

// Dữ liệu 14 sản phẩm mẫu, ảnh nằm trong images/products/ (14 ảnh .jpg)
const INITIAL_PRODUCTS = [
  {
    id: "SP001",
    name: "Sổ tay bìa cứng A5 phong cách tối giản",
    categoryId: "CAT01",
    image: "images/products/notebook.jpg",
    costPrice: 35000,
    price: 55000,
    stock: 45,
    unit: "Cuốn",
    supplier: "Cty CP Văn phòng phẩm Hồng Hà",
    description:
      "Sổ bìa cứng gáy may chỉ cao cấp, giấy chống lóa 100gsm, 160 trang kẻ ngang.",
    status: "active",
    createdAt: "2026-01-12T09:00:00Z",
  },
  {
    id: "SP002",
    name: "Bút bi gel ngòi 0.5mm nét mảnh mực xanh",
    categoryId: "CAT01",
    image: "images/products/gel-pen.jpg",
    costPrice: 6000,
    price: 10000,
    stock: 120,
    unit: "Cây",
    supplier: "Tập đoàn Thiên Long",
    description:
      "Mực gel mau khô, viết êm trơn, tay cầm có đệm cao su êm ái chống mỏi.",
    status: "active",
    createdAt: "2026-01-12T09:15:00Z",
  },
  {
    id: "SP003",
    name: "Bộ bút dạ quang Highlighter 6 màu pastel",
    categoryId: "CAT01",
    image: "images/products/highlighters.jpg",
    costPrice: 28000,
    price: 45000,
    stock: 18,
    unit: "Hộp",
    supplier: "Deli Việt Nam",
    description:
      "Tone màu pastel dịu mắt không làm lem mực viết, đầu vát tiện lợi đánh dấu.",
    status: "active",
    createdAt: "2026-01-12T09:30:00Z",
  },
  {
    id: "SP004",
    name: "Tập giấy in Double A khổ A4 70gsm (500 tờ)",
    categoryId: "CAT01",
    image: "images/products/paper-reams.jpg",
    costPrice: 65000,
    price: 85000,
    stock: 4, // Sắp hết hàng
    unit: "Ram",
    supplier: "Double A Paper Corp",
    description:
      "Giấy in văn phòng chất lượng cao, độ trắng chuẩn, không kẹt giấy khi in đảo mặt.",
    status: "active",
    createdAt: "2026-01-12T09:45:00Z",
  },
  {
    id: "SP005",
    name: "Giấy ghi chú Sticky Notes 100 tờ màu vàng",
    categoryId: "CAT01",
    image: "images/products/sticky-notes.jpg",
    costPrice: 8000,
    price: 15000,
    stock: 60,
    unit: "Xấp",
    supplier: "Deli Việt Nam",
    description:
      "Giấy note keo dính chắc chắn, bóc dán dễ dàng không để lại vết keo trên bề mặt.",
    status: "active",
    createdAt: "2026-01-12T10:00:00Z",
  },
  {
    id: "SP006",
    name: "Chuột không dây Silent nút bấm êm chống ồn",
    categoryId: "CAT02",
    image: "images/products/wireless-mouse.jpg",
    costPrice: 110000,
    price: 165000,
    stock: 22,
    unit: "Cái",
    supplier: "Cty Tin học Mai Hoàng",
    description:
      "Chuột quang không dây 2.4GHz pin 1 năm, switch silent bấm không phát ra tiếng ồn.",
    status: "active",
    createdAt: "2026-01-14T10:10:00Z",
  },
  {
    id: "SP007",
    name: "Bàn phím cơ mini 68 phím LED trắng Tenkeyless",
    categoryId: "CAT02",
    image: "images/products/mechanical-keyboard.jpg",
    costPrice: 380000,
    price: 550000,
    stock: 8,
    unit: "Chiếc",
    supplier: "Cty Tin học Mai Hoàng",
    description:
      "Switch cơ học Red Switch gõ êm, layout 68 phím nhỏ gọn, kết nối Type-C tháo rời.",
    status: "active",
    createdAt: "2026-01-14T10:30:00Z",
  },
  {
    id: "SP008",
    name: "Cáp sạc nhanh Type-C to Type-C bọc dù 60W",
    categoryId: "CAT02",
    image: "images/products/typec-cable.jpg",
    costPrice: 45000,
    price: 79000,
    stock: 2, // Sắp hết hàng
    unit: "Sợi",
    supplier: "Ugreen Việt Nam",
    description:
      "Chuẩn PD sạc nhanh 60W cho laptop và điện thoại, dây bọc dù chống gãy đứt.",
    status: "active",
    createdAt: "2026-01-14T11:00:00Z",
  },
  {
    id: "SP009",
    name: "Tai nghe không dây Bluetooth In-ear True Wireless",
    categoryId: "CAT02",
    image: "images/products/bluetooth-earphones.jpg",
    costPrice: 210000,
    price: 320000,
    stock: 0, // Đã hết hàng
    unit: "Bộ",
    supplier: "Baseus Official",
    description:
      "Bluetooth 5.3 kết nối ổn định, âm bass dày dặn, thời lượng pin 25 giờ kèm hộp sạc.",
    status: "active",
    createdAt: "2026-01-14T11:20:00Z",
  },
  {
    id: "SP010",
    name: "Giá đỡ laptop hợp kim nhôm tản nhiệt gấp gọn",
    categoryId: "CAT02",
    image: "images/products/laptop-stand.jpg",
    costPrice: 120000,
    price: 185000,
    stock: 15,
    unit: "Cái",
    supplier: "Ugreen Việt Nam",
    description:
      "Hợp kim nhôm nguyên khối chắc chắn, 6 nấc chỉnh độ cao công thái học.",
    status: "active",
    createdAt: "2026-01-14T11:45:00Z",
  },
  {
    id: "SP011",
    name: "Bình giữ nhiệt Inox 304 nắp khóa 500ml",
    categoryId: "CAT03",
    image: "images/products/water-bottle.jpg",
    costPrice: 95000,
    price: 149000,
    stock: 25,
    unit: "Bình",
    supplier: "Lock&Lock VN",
    description:
      "Chất liệu inox 304 tiêu chuẩn thực phẩm, giữ nóng 8h và giữ lạnh lên đến 18h.",
    status: "active",
    createdAt: "2026-01-15T08:30:00Z",
  },
  {
    id: "SP012",
    name: "Balo thời trang chống nước đựng laptop 15.6 inch",
    categoryId: "CAT03",
    image: "images/products/backpack.jpg",
    costPrice: 210000,
    price: 340000,
    stock: 10,
    unit: "Chiếc",
    supplier: "Cty May Balo Sài Gòn",
    description:
      "Vải Oxford trượt nước bền bỉ, nhiều ngăn chứa tiện dụng và cổng sạc USB tích hợp.",
    status: "active",
    createdAt: "2026-01-15T09:00:00Z",
  },
  {
    id: "SP013",
    name: "Đèn bàn học LED chống cận 3 chế độ sáng cảm ứng",
    categoryId: "CAT03",
    image: "images/products/desk-lamp.jpg",
    costPrice: 130000,
    price: 210000,
    stock: 3, // Sắp hết hàng
    unit: "Chiếc",
    supplier: "Công ty Cổ phần Rạng Đông",
    description:
      "Ánh sáng liên tục không nhấp nháy, điều khiển cảm ứng đổi 3 nhiệt độ màu.",
    status: "active",
    createdAt: "2026-01-15T09:30:00Z",
  },
  {
    id: "SP014",
    name: "Máy tính cầm tay văn phòng màn hình 12 số lớn",
    categoryId: "CAT01",
    image: "images/products/calculator.jpg",
    costPrice: 85000,
    price: 135000,
    stock: 12,
    unit: "Chiếc",
    supplier: "Cty CP XNK Bình Tây (Bitex)",
    description:
      "Màn hình nghiêng góc dễ nhìn, phím nảy êm, dùng cả năng lượng mặt trời và pin.",
    status: "active",
    createdAt: "2026-01-15T10:00:00Z",
  },
];

// Khách hàng mẫu
const INITIAL_CUSTOMERS = [
  {
    id: "KH001",
    name: "Nguyễn Văn An",
    phone: "0912345678",
    email: "an.nguyen@gmail.com",
    address: "45 Lê Duẩn, P. Bến Nghé, Quận 1, TP.HCM",
    createdAt: "2026-01-15T14:00:00Z",
    note: "Khách hàng thân thiết, thường mua văn phòng phẩm",
  },
  {
    id: "KH002",
    name: "Trần Thị Mai",
    phone: "0987654321",
    email: "mai.tran@outlook.com",
    address: "180 Hai Bà Trưng, Quận 3, TP.HCM",
    createdAt: "2026-01-16T10:20:00Z",
    note: "Thường mua phụ kiện công nghệ cho công ty",
  },
  {
    id: "KH003",
    name: "Lê Hoàng Long",
    phone: "0903112233",
    email: "long.le@fpt.edu.vn",
    address: "70 Tô Ký, Quận 12, TP.HCM",
    createdAt: "2026-01-18T16:15:00Z",
    note: "Sinh viên CNTT",
  },
  {
    id: "KH004",
    name: "Phạm Minh Đức",
    phone: "0938445566",
    email: "duc.pham@gmail.com",
    address: "12 Nguyễn Trãi, Quận 5, TP.HCM",
    createdAt: "2026-01-20T11:00:00Z",
    note: "Khách hàng văn phòng",
  },
  {
    id: "KH005",
    name: "Vũ Bích Phương",
    phone: "0977889900",
    email: "phuong.vu@yahoo.com",
    address: "254 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM",
    createdAt: "2026-01-22T09:30:00Z",
    note: "Mua lẻ",
  },
];

// Đơn hàng mẫu ban đầu
const INITIAL_ORDERS = [
  {
    id: "HD26012001",
    customerId: "KH001",
    customerName: "Nguyễn Văn An",
    customerPhone: "0912345678",
    createdAt: daysAgo(5, 14, 30),
    items: [
      {
        productId: "SP001",
        productName: "Sổ tay bìa cứng A5 phong cách tối giản",
        quantity: 2,
        price: 55000,
        costPrice: 35000,
        subtotal: 110000,
      },
      {
        productId: "SP002",
        productName: "Bút bi gel ngòi 0.5mm nét mảnh mực xanh",
        quantity: 5,
        price: 10000,
        costPrice: 6000,
        subtotal: 50000,
      },
    ],
    subtotal: 160000,
    discount: 10000,
    total: 150000,
    paymentMethod: "cash", // cash, transfer, card
    status: "completed", // completed, cancelled
    createdBy: "staff",
    note: "Khách thanh toán tiền mặt",
  },
  {
    id: "HD26012102",
    customerId: "KH002",
    customerName: "Trần Thị Mai",
    customerPhone: "0987654321",
    createdAt: daysAgo(4, 10, 15),
    items: [
      {
        productId: "SP006",
        productName: "Chuột không dây Silent nút bấm êm chống ồn",
        quantity: 2,
        price: 165000,
        costPrice: 110000,
        subtotal: 330000,
      },
      {
        productId: "SP010",
        productName: "Giá đỡ laptop hợp kim nhôm tản nhiệt gấp gọn",
        quantity: 1,
        price: 185000,
        costPrice: 120000,
        subtotal: 185000,
      },
    ],
    subtotal: 515000,
    discount: 15000,
    total: 500000,
    paymentMethod: "transfer",
    status: "completed",
    createdBy: "admin",
    note: "Chuyển khoản QR ngân hàng",
  },
  {
    id: "HD26012203",
    customerId: "KH003",
    customerName: "Lê Hoàng Long",
    customerPhone: "0903112233",
    createdAt: daysAgo(2, 16, 40),
    items: [
      {
        productId: "SP007",
        productName: "Bàn phím cơ mini 68 phím LED trắng Tenkeyless",
        quantity: 1,
        price: 550000,
        costPrice: 380000,
        subtotal: 550000,
      },
      {
        productId: "SP008",
        productName: "Cáp sạc nhanh Type-C to Type-C bọc dù 60W",
        quantity: 1,
        price: 79000,
        costPrice: 45000,
        subtotal: 79000,
      },
    ],
    subtotal: 629000,
    discount: 29000,
    total: 600000,
    paymentMethod: "transfer",
    status: "completed",
    createdBy: "staff",
    note: "Khách nhận tại quầy",
  },
  {
    id: "HD26012304",
    customerId: "KH004",
    customerName: "Phạm Minh Đức",
    customerPhone: "0938445566",
    createdAt: daysAgo(1, 11, 20),
    items: [
      {
        productId: "SP011",
        productName: "Bình giữ nhiệt Inox 304 nắp khóa 500ml",
        quantity: 1,
        price: 149000,
        costPrice: 95000,
        subtotal: 149000,
      },
    ],
    subtotal: 149000,
    discount: 0,
    total: 149000,
    paymentMethod: "cash",
    status: "cancelled", // Đã hủy mẫu để kiểm tra tính nhất quán
    cancelledAt: daysAgo(1, 11, 45),
    cancelReason: "Khách đổi ý muốn lấy màu khác",
    createdBy: "staff",
    note: "Đơn đã hoàn trả tồn kho",
  },
];

// Lịch sử giao dịch kho ban đầu (nhập hàng khởi tạo, xuất bán, hoàn trả)
const INITIAL_INVENTORY_TX = [
  {
    id: "TX001",
    productId: "SP001",
    productName: "Sổ tay bìa cứng A5 phong cách tối giản",
    type: "IN", // IN (Nhập kho), OUT (Xuất kho), ADJUST (Điều chỉnh), SALE (Bán hàng), RETURN (Hoàn trả)
    quantity: 50,
    stockBefore: 0,
    stockAfter: 50,
    createdAt: "2026-01-12T09:00:00Z",
    performedBy: "warehouse",
    reason: "Nhập lô hàng ban đầu từ Cty Hồng Hà",
  },
  {
    id: "TX002",
    productId: "SP002",
    productName: "Bút bi gel ngòi 0.5mm nét mảnh mực xanh",
    type: "IN",
    quantity: 130,
    stockBefore: 0,
    stockAfter: 130,
    createdAt: "2026-01-12T09:15:00Z",
    performedBy: "warehouse",
    reason: "Nhập lô hàng bút Thiên Long",
  },
  {
    id: "TX003",
    productId: "SP001",
    productName: "Sổ tay bìa cứng A5 phong cách tối giản",
    type: "SALE",
    quantity: 2,
    stockBefore: 47,
    stockAfter: 45,
    createdAt: daysAgo(5, 14, 30),
    performedBy: "staff",
    reason: "Bán hàng theo hóa đơn HD26012001",
  },
  {
    id: "TX004",
    productId: "SP009",
    productName: "Tai nghe không dây Bluetooth In-ear True Wireless",
    type: "OUT",
    quantity: 5,
    stockBefore: 5,
    stockAfter: 0,
    createdAt: daysAgo(2, 15, 0),
    performedBy: "warehouse",
    reason: "Xuất chuyển trưng bày chi nhánh 2 và bán lẻ hết kho",
  },
];

// Tài khoản người dùng demo phục vụ học tập và đồ án
const INITIAL_USERS = [
  {
    id: "U001",
    username: "admin",
    passwordHash: "admin123", // Demo frontend - không dùng cho production thực tế
    fullName: "Quản Trị Viên (Admin)",
    role: "admin", // admin, staff, warehouse
    status: "active",
    avatar: "👨‍💼",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "U002",
    username: "staff",
    passwordHash: "staff123",
    fullName: "Nguyễn Bán Hàng (Staff)",
    role: "staff",
    status: "active",
    avatar: "👩‍💼",
    createdAt: "2026-01-05T08:00:00Z",
  },
  {
    id: "U003",
    username: "warehouse",
    passwordHash: "ware123",
    fullName: "Trần Thủ Kho (Warehouse)",
    role: "warehouse",
    status: "active",
    avatar: "👷‍♂️",
    createdAt: "2026-01-05T08:30:00Z",
  },
];

// ============================================================
// HỆ THỐNG API QUẢN LÝ LOCALSTORAGE
// ============================================================

const StorageService = {
  /**
   * Đọc dữ liệu từ LocalStorage với fallback
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.error(`Lỗi đọc dữ liệu từ LocalStorage [${key}]:`, error);
      return defaultValue;
    }
  },

  /**
   * Ghi dữ liệu vào LocalStorage
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Lỗi ghi dữ liệu vào LocalStorage [${key}]:`, error);
      return false;
    }
  },

  /**
   * Xóa một key trong LocalStorage
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Lỗi xóa dữ liệu [${key}]:`, error);
      return false;
    }
  },

  /**
   * Khởi tạo dữ liệu mẫu nếu chưa từng khởi tạo
   */
  initInitialData() {
    // Nếu trình duyệt còn dữ liệu của bản cũ (khác phiên bản) thì xóa đi để nạp lại dữ liệu mẫu mới.
    // Việc này sửa lỗi sản phẩm hiện 0đ, "undefined" và POS không có sản phẩm.
    if (localStorage.getItem(STORAGE_KEYS.VERSION) !== DATA_VERSION) {
      Object.keys(STORAGE_KEYS).forEach((name) => {
        if (name !== "VERSION") localStorage.removeItem(STORAGE_KEYS[name]);
      });
      localStorage.setItem(STORAGE_KEYS.VERSION, DATA_VERSION);
    }
    // Chỉ khởi tạo khi chưa có dữ liệu trong LocalStorage
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      this.set(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      this.set(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      this.set(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
      this.set(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVENTORY_TX)) {
      this.set(STORAGE_KEYS.INVENTORY_TX, INITIAL_INVENTORY_TX);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.set(STORAGE_KEYS.USERS, INITIAL_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    }
    // Máy nào đã chạy bản cũ thì sửa lại đường dẫn ảnh trong dữ liệu đã lưu
    this.migrateImagePaths();
  },

  /**
   * Đổi tên đường dẫn ảnh cũ (assets/images/*.jpg) sang đường dẫn mới (images/*)
   * để dữ liệu đã lưu từ phiên bản trước không bị mất ảnh.
   * @param {string} path - đường dẫn ảnh cần chuẩn hóa
   * @returns {string} đường dẫn ảnh đã chuẩn hóa
   */
  fixImagePath(path) {
    if (!path || typeof path !== "string") return path;
    let result = path.replace("assets/images/", "images/");
    const renamed = [
      "highlighters",
      "laptop-stand",
      "paper-reams",
      "notebook",
      "sticky-notes",
      "typec-cable",
    ];
    renamed.forEach((name) => {
      result = result.replace(`products/${name}.svg`, `products/${name}.jpg`);
    });
    return result;
  },

  migrateImagePaths() {
    const products = this.get(STORAGE_KEYS.PRODUCTS, []);
    let changed = false;
    products.forEach((p) => {
      const fixed = this.fixImagePath(p.image);
      if (fixed !== p.image) {
        p.image = fixed;
        changed = true;
      }
    });
    if (changed) this.set(STORAGE_KEYS.PRODUCTS, products);
  },

  /**
   * Đặt lại toàn bộ dữ liệu mẫu (Reset demo)
   */
  resetToDefault() {
    this.set(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    this.set(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    this.set(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    this.set(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    this.set(STORAGE_KEYS.INVENTORY_TX, INITIAL_INVENTORY_TX);
    this.set(STORAGE_KEYS.USERS, INITIAL_USERS);
    this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    this.remove(STORAGE_KEYS.CONTACTS);
    return true;
  },

  /**
   * Xuất toàn bộ dữ liệu MiniStock dưới dạng file JSON tải về
   */
  exportBackupJSON() {
    const backupData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      products: this.get(STORAGE_KEYS.PRODUCTS, []),
      categories: this.get(STORAGE_KEYS.CATEGORIES, []),
      customers: this.get(STORAGE_KEYS.CUSTOMERS, []),
      orders: this.get(STORAGE_KEYS.ORDERS, []),
      inventoryTx: this.get(STORAGE_KEYS.INVENTORY_TX, []),
      contacts: this.get(STORAGE_KEYS.CONTACTS, []),
      settings: this.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
    };

    const jsonString =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute(
      "download",
      `MiniStock_Backup_${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  /**
   * Nhập dữ liệu sao lưu từ file JSON có kiểm tra tính hợp lệ
   */
  importBackupJSON(jsonData) {
    try {
      const data =
        typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;

      if (!data || typeof data !== "object") {
        throw new Error("Định dạng file sao lưu không hợp lệ.");
      }

      if (Array.isArray(data.products)) {
        // File sao lưu cũ có thể còn đường dẫn ảnh kiểu cũ nên chuẩn hóa lại
        data.products.forEach((p) => {
          p.image = this.fixImagePath(p.image);
        });
        this.set(STORAGE_KEYS.PRODUCTS, data.products);
      }
      if (Array.isArray(data.categories))
        this.set(STORAGE_KEYS.CATEGORIES, data.categories);
      if (Array.isArray(data.customers))
        this.set(STORAGE_KEYS.CUSTOMERS, data.customers);
      if (Array.isArray(data.orders))
        this.set(STORAGE_KEYS.ORDERS, data.orders);
      if (Array.isArray(data.inventoryTx))
        this.set(STORAGE_KEYS.INVENTORY_TX, data.inventoryTx);
      if (Array.isArray(data.contacts))
        this.set(STORAGE_KEYS.CONTACTS, data.contacts);
      if (data.settings && typeof data.settings === "object")
        this.set(STORAGE_KEYS.SETTINGS, data.settings);

      return { success: true, message: "Nhập dữ liệu thành công!" };
    } catch (err) {
      return { success: false, message: "Lỗi nhập dữ liệu: " + err.message };
    }
  },
};

// Tự động khởi tạo dữ liệu ngay khi file storage.js được load
StorageService.initInitialData();
