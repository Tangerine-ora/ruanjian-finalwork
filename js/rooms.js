/* ============================================================
 * 自习室查询：JSON 加载 + 关键词搜索 + 楼宇/状态筛选
 * 复用课堂五模式：状态在数组，界面只是状态的投影
 * ============================================================ */

$(function () {
  /* ---------- 状态 ---------- */
  let rooms = [];                 // 全量自习室（JSON + 本地新增）
  const STORAGE_KEY = 'studyroom_added_v1';
  const filters = {
    keyword: '',
    building: 'all',
    status: 'all'
  };

  /* ---------- 读取本地新增的自习室（JSON 解析失败时兜底为空数组） ---------- */
  const loadAddedRooms = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch (err) {
      console.warn('本地新增数据解析失败，已忽略：', err);
      return [];
    }
  };

  const saveAddedRooms = (added) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(added));
  };

  let addedRooms = loadAddedRooms();

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

    // 用户自行添加的房间：加黄色标记和删除入口
    const addedBadge = room.userAdded
      ? '<span class="badge text-bg-warning text-dark">我添加的</span>'
      : '';
    const deleteBtn = room.userAdded
      ? '<button type="button" class="btn btn-sm btn-outline-danger btn-delete mt-3" ' +
          'data-id="' + room.id + '">删除该登记</button>'
      : '';

    return '<div class="card h-100 room-card' + (room.userAdded ? ' user-added' : '') + '">' +
      '<div class="card-body d-flex flex-column">' +
        '<div class="d-flex justify-content-between align-items-start gap-2">' +
          '<h2 class="h6 card-title mb-0">' + escapeHtml(room.name) + '</h2>' +
          '<span class="text-end">' + addedBadge + ' ' + statusBadge(room.status) + '</span>' +
        '</div>' +
        '<p class="small text-muted mb-1 mt-2">' +
          escapeHtml(room.building) + ' · ' + room.floor + '楼 · ' + escapeHtml(room.type || '综合区') +
        '</p>' +
        seatBar +
        '<p class="small mb-1">' + seatText + '</p>' +
        '<p class="small text-muted mb-2">开放时间：' + escapeHtml(room.hours) + '</p>' +
        '<div>' + tags + '</div>' +
        deleteBtn +
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
      // 远端 JSON 为基础数据，合并本浏览器 localStorage 中的新增登记
      rooms = data.rooms.concat(addedRooms);
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

  /* ============================================================
   * 添加自习室：Bootstrap 模态框 + 表单校验 + localStorage
   * ============================================================ */

  const addModalEl = document.querySelector('#add-modal');
  const addModal = new bootstrap.Modal(addModalEl);
  const $form = $('#add-form');
  const toast = new bootstrap.Toast(document.querySelector('#op-toast'));

  const showToast = (msg, ok) => {
    $('#op-toast-text').text(msg);
    $('#op-toast').toggleClass('text-bg-success', ok !== false)
                  .toggleClass('text-bg-danger', ok === false);
    toast.show();
  };

  /* ---------- 打开模态框 ---------- */
  $('#btn-add-room').on('click', () => addModal.show());

  /* ---------- 关闭后清空表单与校验状态 ---------- */
  addModalEl.addEventListener('hidden.bs.modal', () => {
    $form.removeClass('was-validated')[0].reset();
    $form.find('.is-invalid').removeClass('is-invalid');
  });

  /* ---------- 提交：逐字段校验，拦截非法输入 ---------- */
  $form.on('submit', (e) => {
    e.preventDefault();

    const name = $('#form-name').val().trim();
    const building = $('#form-building').val();
    const floor = Number($('#form-floor').val());
    const seats = Number($('#form-seats').val());
    const occupied = Number($('#form-occupied').val());
    const status = $('#form-status').val();
    const hours = $('#form-hours').val().trim();

    // 逐字段规则校验，非法字段标红并给出原因
    let valid = true;
    const setInvalid = (id, bad) => {
      $('#' + id).toggleClass('is-invalid', bad);
      if (bad) valid = false;
    };

    setInvalid('form-name', !(name.length >= 2 && name.length <= 20));
    setInvalid('form-building', building === '');
    setInvalid('form-floor', !Number.isInteger(floor) || floor < 1 || floor > 9);
    setInvalid('form-seats', !Number.isInteger(seats) || seats < 1 || seats > 500);

    // 已占用必须是 0 ~ 总座位数之间的整数（跨字段校验）
    const occupiedBad = !Number.isInteger(occupied) || occupied < 0 || occupied > seats;
    setInvalid('form-occupied', occupiedBad);
    $('#occupied-feedback').text(
      seats && occupied > seats
        ? '已占用数不能大于总座位数（' + seats + '）。'
        : '已占用数须为不超过总座位数的非负整数。'
    );

    setInvalid('form-hours', hours.length === 0);

    if (!valid) {
      // 非法输入：不提交，顶部滚动提示 + 字段级红字反馈
      showToast('表单存在非法输入，请按提示修改后再提交。', false);
      return;
    }

    // 同名房间拦截，避免重复登记
    const duplicated = rooms.some(r => r.name === name);
    if (duplicated) {
      setInvalid('form-name', true);
      showToast('已存在同名自习室，请勿重复添加。', false);
      return;
    }

    // 生成新房间（id 取现有最大值 + 1，打 userAdded 标记）
    const nextId = rooms.reduce((max, r) => Math.max(max, r.id), 0) + 1;
    const newRoom = {
      id: nextId,
      name: name,
      building: building,
      floor: floor,
      type: '综合区',
      seats: seats,
      occupied: status === '开放' ? occupied : 0,
      status: status,
      hours: hours,
      tags: ['用户登记'],
      userAdded: true
    };

    addedRooms.push(newRoom);
    saveAddedRooms(addedRooms);
    rooms.push(newRoom);

    renderBuildingButtons();
    render();
    addModal.hide();
    showToast('自习室「' + name + '」添加成功。');
  });

  /* ---------- 删除本地登记（事件委托，按钮是动态渲染的） ---------- */
  $list.on('click', '.btn-delete', function () {
    const id = Number($(this).data('id'));
    const target = rooms.find(r => r.id === id);
    if (!target || !target.userAdded) return;

    if (!window.confirm('确定删除自习室「' + target.name + '」的本地登记吗？')) return;

    addedRooms = addedRooms.filter(r => r.id !== id);
    saveAddedRooms(addedRooms);
    rooms = rooms.filter(r => r.id !== id);
    renderBuildingButtons();
    render();
    showToast('已删除该自习室登记。');
  });

  loadRooms();
});
