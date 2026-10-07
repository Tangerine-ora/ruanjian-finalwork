/* ============================================================
 * 自习室查询：JSON 加载 + 关键词搜索 + 楼宇/状态筛选
 * 复用课堂五模式：状态在数组，界面只是状态的投影
 * ============================================================ */

$(function () {
  /* ---------- 状态 ---------- */
  let rooms = [];                 // 全量自习室
  const filters = {
    keyword: '',
    building: 'all',
    status: 'all'
  };

  /* ---------- DOM 引用 ---------- */
  const $list = $('#room-list');
  const $count = $('#room-count');
  const $buildingFilters = $('#building-filters');

  /* ---------- 工具：状态对应的徽章 ---------- */
  const statusBadge = (status) => {
    const map = {
      '开放': 'text-bg-success',
      '维修': 'text-bg-secondary',
      '闭馆': 'text-bg-danger'
    };
    return '<span class="badge ' + (map[status] || 'text-bg-secondary') + '">' +
           escapeHtml(status) + '</span>';
  };

  /* ---------- 渲染单张卡片的 HTML ---------- */
  const roomCardHtml = (room) => {
    const free = room.seats - room.occupied;
    const percent = room.seats === 0 ? 0 : Math.round(room.occupied / room.seats * 100);

    // 非开放状态不显示占用进度
    const seatBar = room.status === '开放'
      ? '<div class="progress my-2" style="height: 6px;" role="progressbar" ' +
          'aria-valuenow="' + percent + '" aria-valuemin="0" aria-valuemax="100">' +
          '<div class="progress-bar ' + (free === 0 ? 'bg-danger' : '') + '" style="width:' + percent + '%"></div>' +
        '</div>'
      : '';
    const seatText = room.status === '开放'
      ? '<span class="' + (free === 0 ? 'text-danger fw-semibold' : 'text-success fw-semibold') + '">空闲 ' + free + '</span> / ' + room.seats + ' 座'
      : '<span class="text-muted">暂不可用</span>';

    const tags = (room.tags || [])
      .map(t => '<span class="tag-pill">' + escapeHtml(t) + '</span>')
      .join('');

    return '<div class="card h-100 room-card">' +
      '<div class="card-body">' +
        '<div class="d-flex justify-content-between align-items-start gap-2">' +
          '<h2 class="h6 card-title mb-0">' + escapeHtml(room.name) + '</h2>' +
          statusBadge(room.status) +
        '</div>' +
        '<p class="small text-muted mb-1 mt-2">' +
          escapeHtml(room.building) + ' · ' + room.floor + '楼 · ' + escapeHtml(room.type || '综合区') +
        '</p>' +
        seatBar +
        '<p class="small mb-1">' + seatText + '</p>' +
        '<p class="small text-muted mb-2">开放时间：' + escapeHtml(room.hours) + '</p>' +
        '<div>' + tags + '</div>' +
      '</div>' +
    '</div>';
  };

  /* ---------- 统一渲染：按筛选条件过滤 → 列表 ---------- */
  const render = () => {
    const kw = filters.keyword.trim().toLowerCase();

    const shown = rooms.filter(room => {
      const matchKeyword = kw === '' ||
        room.name.toLowerCase().includes(kw) ||
        room.building.toLowerCase().includes(kw);
      const matchBuilding = filters.building === 'all' || room.building === filters.building;
      const matchStatus = filters.status === 'all' || room.status === filters.status;
      return matchKeyword && matchBuilding && matchStatus;
    });

    $count.text('共找到 ' + shown.length + ' 间自习室');

    if (shown.length === 0) {
      $list.html(
        '<div class="col-12"><div class="text-center text-muted py-5">' +
          '<p class="mb-2 fs-4">😕 没有符合条件的自习室</p>' +
          '<p class="small mb-0">换个关键词或筛选条件试试，也可以清空搜索。</p>' +
        '</div></div>'
      );
      return;
    }

    $list.html(shown.map(room =>
      '<div class="col-sm-6 col-lg-4 col-xxl-3">' + roomCardHtml(room) + '</div>'
    ).join(''));
  };

  /* ---------- 根据数据动态生成楼宇筛选按钮 ---------- */
  const renderBuildingButtons = () => {
    const buildings = Array.from(new Set(rooms.map(r => r.building)));
    let html = '<span class="filter-label">楼宇：</span>' +
      '<button type="button" class="btn btn-sm btn-outline-primary active" data-building="all">全部楼宇</button>';
    buildings.forEach(b => {
      html += '<button type="button" class="btn btn-sm btn-outline-primary" data-building="' +
              escapeHtml(b) + '">' + escapeHtml(b) + '</button>';
    });
    $buildingFilters.html(html);
  };

  /* ---------- 首次数据加载 ---------- */
  const loadRooms = async () => {
    $('#load-error').empty();
    $list.html(
      '<div class="col-12"><div class="loading-placeholder">' +
        '<div class="spinner-border text-primary" role="status"></div>' +
        '<p class="mt-2 mb-0">正在加载自习室数据…</p>' +
      '</div></div>'
    );

    try {
      const data = await loadJSON('data/rooms.json');
      if (!data || !Array.isArray(data.rooms) || data.rooms.length === 0) {
        throw new Error('自习室数据为空，请联系管理员更新 rooms.json。');
      }
      rooms = data.rooms;
      renderBuildingButtons();
      render();
    } catch (err) {
      $count.text('');
      $list.empty();
      renderLoadError('#load-error', err.message, loadRooms);
      console.error('自习室数据加载失败：', err);
    }
  };

  /* ---------- 事件：搜索输入（即时过滤） ---------- */
  $('#search-input').on('input', function () {
    filters.keyword = $(this).val();
    render();
  });

  /* ---------- 事件：清空搜索 ---------- */
  $('#search-clear').on('click', () => {
    filters.keyword = '';
    $('#search-input').val('').trigger('focus');
    render();
  });

  /* ---------- 事件：楼宇按钮（事件委托，按钮是动态生成的） ---------- */
  $buildingFilters.on('click', 'button', function () {
    filters.building = $(this).data('building');
    $buildingFilters.find('button').removeClass('active');
    $(this).addClass('active');
    render();
  });

  /* ---------- 事件：状态按钮 ---------- */
  $('#status-filters').on('click', 'button', function () {
    filters.status = $(this).data('status');
    $(this).siblings('button').removeClass('active');
    $(this).addClass('active');
    render();
  });

  loadRooms();
});
