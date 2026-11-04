=====================================================================
  MINISTOCK - WEBSITE QUẢN LÝ KHO VÀ BÁN HÀNG CHO CỬA HÀNG NHỎ
  Đồ án môn :                Thiết kế Web 
=====================================================================

Họ và tên : LÊ QUỐC HUY
MSSV      : 24C48020111
Lớp       : CÔNG NGHỆ THÔNG TIN 49
Giảng viên: MS.NHUNG
Link web  : https://ministock-lime.vercel.app/
            (đăng nhập thử: admin / admin123)


1. GIỚI THIỆU
---------------------------------------------------------------------
Em chọn làm website quản lý kho và bán hàng cho một cửa hàng nhỏ bán
văn phòng phẩm và phụ kiện. Em thấy đề tài này gần gũi, dữ liệu mẫu dễ
làm và có nhiều chỗ để dùng Form, DOM, mảng, object và LocalStorage.

Website không dùng backend hay cơ sở dữ liệu. Toàn bộ dữ liệu được lưu
trong trình duyệt bằng LocalStorage, nên chỉ cần mở file là chạy được.
Em không dùng framework hay thư viện nào (không Bootstrap, không jQuery,
không Chart.js). Biểu đồ doanh thu em tự vẽ bằng thẻ <canvas>.


2. CÁCH CHẠY
---------------------------------------------------------------------
1) Giải nén file .zip.
2) Mở file login.html bằng Chrome (hoặc Edge, Firefox). Không cần cài
   thêm gì và không cần mở server.
3) Đăng nhập bằng một trong ba tài khoản demo (có nút bấm điền nhanh
   ngay trên trang đăng nhập):

     Quản trị viên : admin     / admin123   (vào được tất cả các trang)
     Nhân viên bán : staff     / staff123   (bán hàng, đơn hàng, khách hàng)
     Thủ kho       : warehouse / ware123    (kho, sản phẩm, danh mục)

Nếu muốn đưa dữ liệu về như ban đầu, bấm nút 🔄 ở cuối thanh menu bên
trái (nút "Khôi phục dữ liệu mẫu").

Lưu ý: nếu trước đó trình duyệt đã mở một bản MiniStock cũ ở cùng địa chỉ
(ví dụ cùng 127.0.0.1:5500 khi dùng Live Server) thì còn dữ liệu cũ trong
LocalStorage. Web có lưu số phiên bản dữ liệu (DATA_VERSION trong
js/storage.js) nên tự xóa dữ liệu cũ và nạp lại dữ liệu mẫu, lúc đó cần
đăng nhập lại một lần.


3. CÁC TRANG CỦA WEBSITE (12 trang HTML)
---------------------------------------------------------------------
login.html       Đăng nhập, kiểm tra tên đăng nhập và mật khẩu >= 6 ký tự
index.html       Dashboard: thống kê nhanh, biểu đồ doanh thu 7 ngày,
                 đơn hàng gần đây, hàng sắp hết
products.html    Quản lý sản phẩm, có FORM 2 tìm kiếm / lọc / sắp xếp
categories.html  Quản lý danh mục (không cho xóa khi còn sản phẩm)
inventory.html   Quản lý kho: nhập kho, xuất kho, kiểm kê, lịch sử kho
sales.html       Bán hàng tại quầy (POS): giỏ hàng, giảm giá, thanh toán,
                 xem trước và in hóa đơn
orders.html      Quản lý đơn hàng, lọc theo ngày/trạng thái, hủy đơn
customers.html   Quản lý khách hàng, có FORM 1 nhập liệu chính
reports.html     Báo cáo: doanh thu, giá trị kho, lợi nhuận gộp
users.html       Danh sách tài khoản và bảng phân quyền
about.html       Giới thiệu website
contact.html     Liên hệ / góp ý, có FORM 3 (form liên hệ)

Các trang được nối với nhau bằng menu bên trái. Menu tự ẩn những mục mà
vai trò đang đăng nhập không được phép vào.


4. CẤU TRÚC THƯ MỤC
---------------------------------------------------------------------
HoTen_MSSV_DoAn/
  |-- index.html, about.html, products.html, contact.html, login.html
  |-- categories.html, inventory.html, sales.html, orders.html
  |-- customers.html, reports.html, users.html
  |-- css/
  |     |-- style.css         giao diện chung (màu, bảng, form, modal...)
  |     `-- responsive.css    chỉnh cho tablet và điện thoại
  |-- js/
  |     |-- storage.js        đọc/ghi LocalStorage, dữ liệu mẫu, sao lưu
  |     |-- validation.js     kiểm tra dữ liệu, Toast, hộp thoại xác nhận
  |     |-- auth.js           đăng nhập, phân quyền, bảo vệ trang
  |     |-- main.js           menu, đồng hồ, sao lưu (dùng cho mọi trang)
  |     |-- theme.js          chế độ sáng / tối (nạp trong <head> của mọi trang)
  |     `-- products.js, categories.js, inventory.js, sales.js, orders.js,
  |         customers.js, reports.js, users.js, about.js, contact.js
  |-- images/
  |     |-- logo/             logo và icon (SVG)
  |     `-- products/         ảnh sản phẩm
  `-- README.txt


5. NHỮNG GÌ EM ĐÃ LÀM THEO YÊU CẦU CỦA ĐỀ
---------------------------------------------------------------------
- Có 12 trang HTML (đề yêu cầu tối thiểu 5), liên kết bằng menu.
- Bố cục dùng Flexbox và CSS Grid, không dùng <table> để chia bố cục.
  (Thẻ <table> chỉ dùng để hiển thị dữ liệu dạng bảng.)
- Responsive: có 3 mốc (<= 1024px, <= 768px, <= 480px). Ở màn hình nhỏ
  thanh menu thành dạng trượt ra, các cột xếp thành một cột.
- CSS để trong file riêng (css/style.css, css/responsive.css), không
  viết style="..." trong HTML.
- Có 3 form, đều kiểm tra bằng JavaScript:
    Form 1 (customers.html): 9 loại input (text, tel, email, date, number,
      select, radio, checkbox, textarea), mỗi ô có <label for="...">,
      báo lỗi chữ đỏ ngay dưới ô, chặn gửi bằng event.preventDefault().
    Form 2 (products.html): ô từ khóa, nút Tìm kiếm, lọc danh mục / khoảng
      giá / tồn kho, kết quả cập nhật ngay không tải lại trang.
    Form 3 (contact.html): form liên hệ, nội dung 10-500 ký tự có đếm ký
      tự khi gõ; tin nhắn gửi xong hiện ở danh sách bên cạnh và có nút Xóa.
    Ngoài ra form đăng nhập cũng có kiểm tra rỗng và mật khẩu >= 6 ký tự.
- JavaScript dùng đủ các kỹ thuật đề yêu cầu:
    getElementById / querySelector, addEventListener (click, input,
    change, submit, ...), innerHTML / textContent, classList / style,
    createElement / appendChild / remove, forEach / map / filter / reduce,
    object lưu dữ liệu, hàm có tham số và return, if/else và switch,
    LocalStorage, setTimeout và setInterval (đồng hồ trên header).
- Có chế độ sáng / tối: bấm nút ☀️/🌙 ở header (trang đăng nhập thì nút ở góc
  phải trên). Màu của cả website nằm trong biến CSS nên chế độ tối chỉ đổi giá
  trị các biến khi <html> có data-theme="dark" (xem js/theme.js). Lần đầu vào
  web thì theo cài đặt sáng/tối của máy; sau khi bấm nút, lựa chọn được lưu
  trong LocalStorage (key ministock_theme). Biểu đồ Canvas tự vẽ lại theo màu
  mới. Hóa đơn khi in luôn nền trắng chữ đen.
- Không dùng alert(), prompt(), confirm() của trình duyệt. Em tự làm
  Toast (thông báo nổi), hộp thoại xác nhận và hộp thoại nhập liệu.
- Đã mở từng trang bằng Chrome, nhấn F12 xem Console không có lỗi.


6. MỘT SỐ CHỨC NĂNG ĐÁNG CHÚ Ý
---------------------------------------------------------------------
- Không xóa được sản phẩm đã có trong hóa đơn (chuyển sang "Ngừng kinh
  doanh") để doanh thu cũ không bị sai.
- Xuất kho không được vượt quá số lượng đang tồn.
- Mọi thay đổi số lượng kho (nhập, xuất, kiểm kê, bán, hoàn trả) đều được
  ghi lại trong lịch sử kho.
- Hủy đơn phải nhập lý do, hàng được hoàn lại kho đúng một lần, đơn đã hủy
  không hủy lại được.
- Lợi nhuận gộp ước tính = doanh thu thực tế - giá vốn hàng bán.
- Sao lưu dữ liệu ra file JSON và nhập lại từ file JSON.
- In hóa đơn bằng window.print() (có CSS riêng cho bản in).


7. HẠN CHẾ
---------------------------------------------------------------------
- Đăng nhập chỉ là mô phỏng: mật khẩu đang lưu thẳng trong LocalStorage
  nên không an toàn. Nếu làm thật thì phải có backend và mã hóa mật khẩu.
- Dữ liệu nằm trong từng trình duyệt, đổi máy hoặc xóa dữ liệu duyệt web
  là mất (nên dùng nút Sao lưu để xuất file JSON).
- Biểu đồ chỉ có biểu đồ cột 7 ngày gần nhất.


8. HÌNH ẢNH
---------------------------------------------------------------------
- images/products/ có 14 ảnh sản phẩm, tất cả đều là file .jpg. Ảnh em tìm
  trên mạng, chỉ dùng để minh họa cho bài học, không dùng cho mục đích
  thương mại. Nếu làm cho cửa hàng thật thì cần thay bằng ảnh chụp sản phẩm
  của cửa hàng.
- Logo và icon (images/logo/) là file SVG.
- Nếu ảnh nào không tải được, trang sẽ tự hiện icon thay thế.