/* ============================================================
 * 首页：加载 rooms.json，计算并渲染四张实时概况卡片
 * 复用课堂“异步取数 → 校验 → 渲染”模式
 * ============================================================ */

$(function () {
  /* ---------- 把原始数据汇总为四个指标 ---------- */
  const summarize = (data) => {
    const rooms = data.rooms;
    const openRooms = rooms.filter(r => r.status === '开放');
    const totalSeats = rooms.reduce((sum, r) => sum + r.seats, 0);
    const occupiedSeats = rooms.reduce((sum, r) => sum + r.occupied, 0);
    return {
      total: rooms.length,
      open: openRooms.length,
      seats: totalSeats,
      free: totalSeats - occupiedSeats,
      updated: data.updated || '未知'
    };
  };

  /* ---------- 渲染到页面 ---------- */
  const render = (summary) => {
    $('#stat-total').text(summary.total);
    $('#stat-open').text(summary.open);
    $('#stat-seats').text(summary.seats);
    $('#stat-free').text(summary.free);
    $('#overview-meta').text('数据更新时间：' + summary.updated + '（模拟数据）');
  };

  /* ---------- 加载流程 ---------- */
  const loadOverview = async () => {
    $('#overview-error').empty();
    $('#overview-meta').text('正在加载最新数据…');
    try {
      const data = await loadJSON('data/rooms.json');

      // 数据为空或结构不对：给出明确提示，而不是显示 0
      if (!data || !Array.isArray(data.rooms) || data.rooms.length === 0) {
        throw new Error('自习室数据为空，请联系管理员更新 rooms.json。');
      }
      render(summarize(data));
    } catch (err) {
      $('#overview-meta').text('');
      renderLoadError('#overview-error', err.message, loadOverview);
      console.error('首页概况加载失败：', err);
    }
  };

  loadOverview();
});
