/* ============================================================
 * 数据统计：并行加载两个 JSON，渲染柱状图 / 饼图 / 折线图
 * 复用课堂六模式：异步取数 → 数据聚合 → setOption 渲染
 * ============================================================ */

$(function () {
  /* ---------- 图表实例（懒初始化） ---------- */
  let buildingChart = null;
  let statusChart = null;
  let flowChart = null;

  /* ============================================================
   * 图一：各楼宇座位 = 已占用 + 空闲（堆叠柱状图）
   * ============================================================ */
  const renderBuildingBar = (rooms) => {
    // 按楼宇聚合
    const map = {};
    rooms.forEach(r => {
      if (!map[r.building]) {
        map[r.building] = { seats: 0, occupied: 0 };
      }
      map[r.building].seats += r.seats;
      map[r.building].occupied += r.occupied;
    });
    const buildings = Object.keys(map);
    const occupied = buildings.map(b => map[b].occupied);
    const free = buildings.map(b => map[b].seats - map[b].occupied);

    if (buildingChart === null) {
      buildingChart = echarts.init(document.querySelector('#chart-building'));
    }
    buildingChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const name = params[0].name;
          const used = params[0].value;
          const rest = params[1].value;
          return name + '<br/>已占用：' + used + ' 座<br/>空闲：' + rest +
                 ' 座<br/>合计：' + (used + rest) + ' 座';
        }
      },
      legend: { top: 0, data: ['已占用', '空闲'] },
      grid: { left: 50, right: 20, top: 40, bottom: 40 },
      xAxis: { type: 'category', data: buildings },
      yAxis: { type: 'value', name: '座位数', minInterval: 50 },
      series: [
        {
          name: '已占用',
          type: 'bar',
          stack: 'seats',
          data: occupied,
          barMaxWidth: 46,
          itemStyle: { color: '#0d6efd' }
        },
        {
          name: '空闲',
          type: 'bar',
          stack: 'seats',
          data: free,
          barMaxWidth: 46,
          itemStyle: { color: '#7ed6a5' },
          label: {
            show: true,
            position: 'top',
            formatter: (p) => occupied[p.dataIndex] + free[p.dataIndex],
            fontSize: 11,
            color: '#495057'
          }
        }
      ]
    });
  };

  /* ============================================================
   * 图二：自习室状态分布（环形饼图）
   * ============================================================ */
  const renderStatusPie = (rooms) => {
    const order = ['开放', '维修', '闭馆'];
    const counts = order.map(status => ({
      name: status,
      value: rooms.filter(r => r.status === status).length
    }));

    if (statusChart === null) {
      statusChart = echarts.init(document.querySelector('#chart-status'));
    }
    statusChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}：{c} 间（{d}%）' },
      legend: { bottom: 0 },
      color: ['#198754', '#6c757d', '#dc3545'],
      series: [{
        name: '房间状态',
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        label: { formatter: '{b}\n{c} 间' },
        data: counts
      }]
    });
  };

  /* ============================================================
   * 图三：每日入馆人次（折线）+ 上座率（折线，右轴）
   * ============================================================ */
  const renderFlowLine = (flow) => {
    if (flowChart === null) {
      flowChart = echarts.init(document.querySelector('#chart-flow'));
    }
    flowChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { top: 0, data: ['入馆人次', '平均上座率'] },
      grid: { left: 60, right: 60, top: 44, bottom: 40 },
      xAxis: { type: 'category', data: flow.days, boundaryGap: false },
      yAxis: [
        {
          type: 'value',
          name: '人次',
          minInterval: 500
        },
        {
          type: 'value',
          name: '上座率',
          min: 0,
          max: 100,
          axisLabel: { formatter: '{value}%' }
        }
      ],
      series: [
        {
          name: '入馆人次',
          type: 'line',
          smooth: true,
          symbolSize: 8,
          data: flow.checkins,
          itemStyle: { color: '#0d6efd' },
          areaStyle: { opacity: 0.12 },
          lineStyle: { width: 3 }
        },
        {
          name: '平均上座率',
          type: 'line',
          smooth: true,
          symbolSize: 8,
          yAxisIndex: 1,
          data: flow.occupancyRate,
          itemStyle: { color: '#fd7e14' },
          lineStyle: { width: 3, type: 'dashed' }
        }
      ]
    });
  };

  /* ---------- 数据完整性校验 ---------- */
  const validate = (roomsData, flowData) => {
    if (!roomsData || !Array.isArray(roomsData.rooms) || roomsData.rooms.length === 0) {
      throw new Error('rooms.json 中自习室数据为空。');
    }
    if (!flowData || !Array.isArray(flowData.days) || !Array.isArray(flowData.checkins)) {
      throw new Error('flow.json 中人流数据格式不正确。');
    }
    if (flowData.days.length !== flowData.checkins.length) {
      throw new Error('flow.json 中日期与人次数量不一致。');
    }
  };

  /* ---------- 加载与渲染入口 ---------- */
  const loadStats = async () => {
    $('#stats-error').empty();
    $('#stats-loading').removeClass('d-none');
    $('#stats-content').addClass('d-none');

    try {
      const [roomsData, flowData] = await Promise.all([
        loadJSON('data/rooms.json'),
        loadJSON('data/flow.json')
      ]);
      validate(roomsData, flowData);

      $('#stats-meta').text(
        '数据来源：' + roomsData.source + '；' + flowData.source +
        '　统计周期：' + flowData.period
      );

      renderBuildingBar(roomsData.rooms);
      renderStatusPie(roomsData.rooms);
      renderFlowLine(flowData);

      $('#stats-loading').addClass('d-none');
      $('#stats-content').removeClass('d-none');
    } catch (err) {
      $('#stats-loading').addClass('d-none');
      $('#stats-meta').text('');
      renderLoadError('#stats-error', err.message, loadStats);
      console.error('统计数据加载失败：', err);
    }
  };

  /* ---------- 窗口变化：三个图表一起自适应 ---------- */
  window.addEventListener('resize', () => {
    if (buildingChart) buildingChart.resize();
    if (statusChart) statusChart.resize();
    if (flowChart) flowChart.resize();
  });

  loadStats();
});
