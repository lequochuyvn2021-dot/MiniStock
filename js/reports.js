/**
 * MiniStock - Module Báo Cáo Thống Kê & Phân Tích Lợi Nhuận
 * File: js/reports.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = Auth.requireAuth(['admin']);
  if (!currentUser) return;

  initReports();
});

function initReports() {
  // Nhớ dữ liệu lần vẽ gần nhất để vẽ lại khi người dùng đổi chế độ sáng/tối
  let lastChartOrders = [];
  document.addEventListener('themechange', () => drawRevenueCanvasChart(lastChartOrders));

  const timeRangeFilter = document.getElementById('report-time-range');
  const fromDateInput = document.getElementById('report-from-date');
  const toDateInput = document.getElementById('report-to-date');
  const btnApplyFilter = document.getElementById('btn-apply-report-filter');
  const btnExportReport = document.getElementById('btn-export-report');

  // Thẻ thống kê
  const statRevenue = document.getElementById('report-stat-revenue');
  const statProfit = document.getElementById('report-stat-profit');
  const statOrders = document.getElementById('report-stat-orders');
  const statStockValue = document.getElementById('report-stat-stock-value');

  // Bảng Top bán chạy & Hàng cần nhập
  const topProductsTable = document.getElementById('report-top-products-body');
  const lowStockTable = document.getElementById('report-low-stock-body');

  renderAllReports();

  if (timeRangeFilter) {
    timeRangeFilter.addEventListener('change', () => {
      handleTimeRangeShortcut(timeRangeFilter.value);
      renderAllReports();
    });
  }

  if (btnApplyFilter) btnApplyFilter.addEventListener('click', renderAllReports);
  if (btnExportReport) btnExportReport.addEventListener('click', exportReportSummary);

  function handleTimeRangeShortcut(type) {
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    let fromStr = '';

    if (type === 'today') {
      fromStr = toStr;
    } else if (type === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      fromStr = d.toISOString().slice(0, 10);
    } else if (type === 'month') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      fromStr = d.toISOString().slice(0, 10);
    } else if (type === 'all') {
      fromStr = '';
    }

    if (fromDateInput) fromDateInput.value = fromStr;
    if (toDateInput) toDateInput.value = toStr;
  }

  /**
   * Tính toán và hiển thị tất cả các báo cáo
   */
  function renderAllReports() {
    const orders = StorageService.get(STORAGE_KEYS.ORDERS, []);
    const products = StorageService.get(STORAGE_KEYS.PRODUCTS, []);
    const settings = StorageService.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const lowStockThreshold = Number(settings.lowStockThreshold) || 5;

    const fromDate = fromDateInput ? fromDateInput.value : '';
    const toDate = toDateInput ? toDateInput.value : '';

    // 1. Lọc các đơn hàng hoàn tất hợp lệ trong khoảng thời gian
    const validOrders = orders.filter(o => {
      if (o.status !== 'completed') return false;
      const orderDate = new Date(o.createdAt).toISOString().slice(0, 10);
      if (fromDate && orderDate < fromDate) return false;
      if (toDate && orderDate > toDate) return false;
      return true;
    });

    // 2. Tính Tổng doanh thu
    const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);

    // 3. Tính Giá vốn hàng bán (Cost of Goods Sold - COGS)
    let totalCostOfGoodsSold = 0;
    const productSalesMap = {}; // { productId: { name, qty, revenue } }

    validOrders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach(item => {
          const itemCost = (Number(item.costPrice) || 0) * item.quantity;
          totalCostOfGoodsSold += itemCost;

          // Gom nhóm thống kê sản phẩm bán chạy
          if (!productSalesMap[item.productId]) {
            productSalesMap[item.productId] = {
              id: item.productId,
              name: item.productName,
              quantity: 0,
              revenue: 0
            };
          }
          productSalesMap[item.productId].quantity += item.quantity;
          productSalesMap[item.productId].revenue += item.subtotal;
        });
      }
    });

    // 4. Lợi nhuận gộp ước tính = Doanh thu - Giá vốn
    // Giảm giá đơn hàng đã được trừ trong order.total, nên công thức rất chuẩn xác
    const estimatedGrossProfit = totalRevenue - totalCostOfGoodsSold;

    // 5. Giá trị hàng tồn kho hiện tại
    const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);

    // Cập nhật số liệu lên giao diện
    if (statRevenue) statRevenue.textContent = Format.currency(totalRevenue);
    if (statProfit) statProfit.textContent = Format.currency(estimatedGrossProfit);
    if (statOrders) statOrders.textContent = `${validOrders.length} đơn`;
    if (statStockValue) statStockValue.textContent = Format.currency(totalStockValue);

    // 6. Render bảng Top sản phẩm bán chạy
    renderTopProducts(productSalesMap);

    // 7. Render bảng Hàng sắp hết & đã hết cần nhập thêm
    renderLowStockProducts(products, lowStockThreshold);

    // 8. Vẽ biểu đồ doanh thu thuần HTML5 Canvas (Không phụ thuộc mạng internet, luôn chạy mượt)
    lastChartOrders = validOrders;
    drawRevenueCanvasChart(validOrders);
  }

  function renderTopProducts(salesMap) {
    if (!topProductsTable) return;
    const sorted = Object.values(salesMap).sort((a, b) => b.quantity - a.quantity);

    if (sorted.length === 0) {
      topProductsTable.innerHTML = `
        <tr><td colspan="4" class="text-center text-muted u-pad-24">Chưa có dữ liệu bán hàng trong khoảng thời gian này.</td></tr>
      `;
      return;
    }

    topProductsTable.innerHTML = sorted.slice(0, 5).map((item, idx) => `
      <tr>
        <td class="font-bold text-center">${idx + 1}</td>
        <td>
          <div class="font-bold">${item.name}</div>
          <small class="text-muted">${item.id}</small>
        </td>
        <td class="font-bold text-center">${item.quantity}</td>
        <td class="font-bold text-primary text-right">${Format.currency(item.revenue)}</td>
      </tr>
    `).join('');
  }

  function renderLowStockProducts(products, threshold) {
    if (!lowStockTable) return;
    const needRestock = products.filter(p => p.stock <= threshold);
    needRestock.sort((a, b) => a.stock - b.stock);

    if (needRestock.length === 0) {
      lowStockTable.innerHTML = `
        <tr><td colspan="5" class="text-center text-success u-pad-24">✓ Kho hàng an toàn! Không có sản phẩm nào chạm ngưỡng cảnh báo.</td></tr>
      `;
      return;
    }

    lowStockTable.innerHTML = needRestock.map(p => `
      <tr>
        <td class="font-bold text-primary">${p.id}</td>
        <td>${p.name}</td>
        <td class="font-bold text-center stock-num ${p.stock === 0 ? 'stock-num-out' : 'stock-num-low'}">
          ${p.stock} ${p.unit}
        </td>
        <td>
          ${p.stock === 0 
            ? '<span class="badge badge-danger">ĐÃ HẾT HÀNG</span>' 
            : '<span class="badge badge-warning">Sắp hết hàng</span>'}
        </td>
        <td><small>${p.supplier || '-'}</small></td>
      </tr>
    `).join('');
  }

  /**
   * Vẽ biểu đồ cột doanh thu 7 ngày gần nhất bằng Canvas thuần
   * Hoàn toàn tự chủ, không lo lỗi khi không có mạng internet, chuẩn cho đồ án sinh viên!
   */
  function drawRevenueCanvasChart(orders) {
    const canvas = document.getElementById('report-revenue-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Chuẩn bị dữ liệu 7 ngày qua
    const days = [];
    const dayLabels = [];
    const dayTotals = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      days.push(dateKey);
      dayLabels.push(`${d.getDate()}/${d.getMonth() + 1}`);

      // Tính tổng tiền các đơn của ngày này
      const daySum = orders
        .filter(o => o.status === 'completed' && new Date(o.createdAt).toISOString().slice(0, 10) === dateKey)
        .reduce((sum, o) => sum + o.total, 0);

      dayTotals.push(daySum);
    }

    // Kích thước canvas
    // Cho canvas rộng đúng bằng khung chứa để chữ và cột không bị kéo giãn
    if (canvas.clientWidth > 0) canvas.width = canvas.clientWidth;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const maxVal = Math.max(...dayTotals, 500000);
    const padding = { top: 30, right: 30, bottom: 40, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Vẽ lưới ngang
    // Màu lấy từ biến CSS để đổi theo chế độ sáng/tối
    ctx.strokeStyle = Theme.cssVar('--chart-grid', '#e2e8f0');
    ctx.lineWidth = 1;
    ctx.fillStyle = Theme.cssVar('--chart-label', '#64748b');
    ctx.font = '11px sans-serif';

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = padding.top + (chartHeight / steps) * i;
      const val = Math.round(maxVal - (maxVal / steps) * i);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.fillText(Format.currency(val).replace('₫', '').trim(), padding.left - 8, y + 4);
    }

    // Vẽ các cột (Bars)
    const barWidth = Math.min(38, (chartWidth / days.length) * 0.55);
    const stepX = chartWidth / days.length;

    dayTotals.forEach((val, idx) => {
      const x = padding.left + (stepX * idx) + (stepX - barWidth) / 2;
      const barH = (val / maxVal) * chartHeight;
      const y = padding.top + chartHeight - barH;

      // Gradient màu cột
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, Theme.cssVar('--chart-bar-top', '#2563eb'));
      grad.addColorStop(1, Theme.cssVar('--chart-bar-bottom', '#60a5fa'));

      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, barWidth, barH);
      }

      // Nhãn ngày tháng bên dưới
      ctx.fillStyle = Theme.cssVar('--text-soft', '#475569');
      ctx.textAlign = 'center';
      ctx.fillText(dayLabels[idx], x + barWidth / 2, height - padding.bottom + 18);

      // Nhãn giá trị trên đầu cột nếu > 0
      if (val > 0) {
        ctx.fillStyle = Theme.cssVar('--chart-value', '#1e40af');
        ctx.font = 'bold 10.5px sans-serif';
        ctx.fillText(`${Math.round(val / 1000)}k`, x + barWidth / 2, y - 6);
        ctx.font = '11px sans-serif';
      }
    });
  }

  function exportReportSummary() {
    Toast.success('Đang chuẩn bị báo cáo tổng hợp...');
    StorageService.exportBackupJSON();
  }
}
