/* ============================================================
 * 三维自习区导览（Three.js）
 * 复用课堂七模式：场景 + 相机 + 渲染器 + 光照 + 动画
 * 房间按楼宇分组布置成沙盘，颜色表示上座率；
 * 支持 OrbitControls 旋转/缩放/平移，点击房间查看实时信息。
 * ============================================================ */

$(function () {
  /* ---------- 场景 ---------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe3ff);
  scene.fog = new THREE.Fog(0xbfe3ff, 45, 95);

  /* ---------- 相机 ---------- */
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
  const HOME_POS = new THREE.Vector3(0, 19, 30);
  const HOME_TARGET = new THREE.Vector3(0, 0, 0);
  camera.position.copy(HOME_POS);
  camera.lookAt(HOME_TARGET);

  /* ---------- 渲染器 ---------- */
  const canvas = document.querySelector('#scene-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  resize();

  /* ---------- 鼠标/触摸交互 ---------- */
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(HOME_TARGET);
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minDistance = 6;
  controls.maxDistance = 70;

  /* ---------- 光照 ---------- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const sun = new THREE.DirectionalLight(0xffffff, 0.85);
  sun.position.set(18, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.far = 90;
  scene.add(sun);

  /* ---------- 地面与道路 ---------- */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 55),
    new THREE.MeshStandardMaterial({ color: 0xe3edf7 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(52, 1.8),
    new THREE.MeshStandardMaterial({ color: 0xaeb8c2 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, 4.2);
  road.receiveShadow = true;
  scene.add(road);

  /* ---------- 周边绿化（圆柱树干 + 球冠） ---------- */
  const treeSpots = [
    [-23, -18], [-15, -18], [15, -18], [23, -18],
    [-23, 12], [-15, 12], [15, 12], [23, 12]
  ];
  treeSpots.forEach(([x, z]) => {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 1.5, 10),
      new THREE.MeshStandardMaterial({ color: 0x8d6e63 })
    );
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    tree.add(trunk);
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
    );
    crown.position.y = 2.1;
    crown.castShadow = true;
    tree.add(crown);
    tree.position.set(x, 0, z);
    scene.add(tree);
  });

  /* ---------- 选中房间的高亮圆环 ---------- */
  const selectRing = new THREE.Mesh(
    new THREE.RingGeometry(2.0, 2.35, 48),
    new THREE.MeshBasicMaterial({ color: 0xffd34e, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
  );
  selectRing.rotation.x = -Math.PI / 2;
  selectRing.position.y = 0.32;
  selectRing.visible = false;
  scene.add(selectRing);

  /* ---------- 文字标签：Canvas 纹理 Sprite ---------- */
  const makeLabel = (text, fontSize) => {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const pad = 10;
    ctx.font = 'bold ' + fontSize + 'px "Microsoft YaHei", sans-serif';
    c.width = Math.ceil(ctx.measureText(text).width) + pad * 2;
    c.height = fontSize + pad * 2;
    // 设置 width 后字体会被重置，需要重新指定
    ctx.font = 'bold ' + fontSize + 'px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(10, 42, 92, 0.85)';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pad, c.height / 2);

    const tex = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sprite.scale.set(c.width / 110, c.height / 110, 1);
    return sprite;
  };

  /* ---------- 上座率 → 颜色 ---------- */
  const occupancyColor = (room) => {
    if (room.status !== '开放') return 0x9aa3ad;
    const rate = room.seats === 0 ? 1 : room.occupied / room.seats;
    if (rate >= 0.9) return 0xe74c3c;
    if (rate >= 0.6) return 0xf1c40f;
    return 0x2ecc71;
  };

  /* ---------- 房间布局常量 ---------- */
  const UNIT_W = 3, UNIT_D = 2.4, GAP_X = 0.5, ZONE_GAP = 1.8;

  /* ---------- 根据数据批量创建房间，挂到 roomsRoot ---------- */
  const clickableRooms = [];
  const roomsRoot = new THREE.Group();
  scene.add(roomsRoot);

  const buildRooms = (roomsData) => {
    // 清空旧场景（重试加载时使用）
    roomsRoot.clear();
    clickableRooms.length = 0;

    // 按数据中首次出现的顺序得到楼宇列表
    const buildings = Array.from(new Set(roomsData.map(r => r.building)));
    const zoneW = (n) => Math.ceil(n / 2) * (UNIT_W + GAP_X) + 0.8;
    const zoneD = UNIT_D * 2 + 1.3;

    const totalW = buildings.reduce((sum, b, i) =>
      sum + zoneW(roomsData.filter(r => r.building === b).length) + (i > 0 ? ZONE_GAP : 0), 0);

    let cursor = -totalW / 2;

    buildings.forEach(building => {
      const list = roomsData.filter(r => r.building === building);
      const w = zoneW(list.length);
      const centerX = cursor + w / 2;

      // 楼宇地台
      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.3, zoneD),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
      );
      platform.position.set(centerX, 0.15, 0);
      platform.receiveShadow = true;
      platform.castShadow = true;
      roomsRoot.add(platform);

      // 楼宇名牌
      const zoneLabel = makeLabel(building, 34);
      zoneLabel.position.set(centerX, 2.6, 0);
      roomsRoot.add(zoneLabel);

      // 房间逐个入位：每排两间
      list.forEach((room, i) => {
        const cols = Math.ceil(list.length / 2);
        const col = Math.floor(i / 2);
        const row = i % 2;
        const x = centerX - (cols * (UNIT_W + GAP_X) - GAP_X) / 2
                + col * (UNIT_W + GAP_X) + UNIT_W / 2;
        const z = row === 0 ? -(UNIT_D / 2 + 0.32) : (UNIT_D / 2 + 0.32);

        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.userData.isRoom = true;
        group.userData.room = room;

        const color = occupancyColor(room);
        const baseMat = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0,
          roughness: 0.55
        });
        const base = new THREE.Mesh(new THREE.BoxGeometry(UNIT_W, 0.55, UNIT_D), baseMat);
        base.position.y = 0.575;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        // 座位点：最多画 22 个小方块，按真实占用比例分配红绿
        const maxDots = 22;
        const dots = Math.min(room.seats, maxDots);
        const occupiedDots = room.status === '开放'
          ? Math.round(dots * room.occupied / room.seats)
          : 0;
        const dotCols = 6;
        const dotRows = Math.ceil(dots / dotCols);
        const dotGeo = new THREE.BoxGeometry(0.22, 0.06, 0.22);
        const matOcc = new THREE.MeshStandardMaterial({ color: 0xc0392b });
        const matFree = new THREE.MeshStandardMaterial({ color: 0x9be7b0 });
        const matOff = new THREE.MeshStandardMaterial({ color: 0xc8ced6 });
        for (let d = 0; d < dots; d++) {
          const mat = room.status !== '开放' ? matOff : (d < occupiedDots ? matOcc : matFree);
          const dot = new THREE.Mesh(dotGeo, mat);
          const dc = d % dotCols;
          const dr = Math.floor(d / dotCols);
          dot.position.set(
            -(dotCols - 1) * 0.32 / 2 + dc * 0.32,
            0.88,
            -(dotRows - 1) * 0.34 / 2 + dr * 0.34 - 0.25
          );
          group.add(dot);
        }

        // 房间名牌
        const nameLabel = makeLabel(room.name, 22);
        nameLabel.position.set(0, 1.35, -UNIT_D / 2 - 0.15);
        group.add(nameLabel);

        group.userData.baseMat = baseMat;
        roomsRoot.add(group);
        clickableRooms.push(group);
      });

      cursor += w + ZONE_GAP;
    });
  };

  /* ============================================================
   * 射线拾取：点击房间 → 信息卡；悬停 → 高亮
   * ============================================================ */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveredRoom = null;

  const pickRoom = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickableRooms, true);
    if (hits.length === 0) return null;
    // 子物体（座位点）命中时向上找到房间组
    let obj = hits[0].object;
    while (obj && !obj.userData.isRoom) obj = obj.parent;
    return obj || null;
  };

  const setHover = (group) => {
    if (hoveredRoom === group) return;
    if (hoveredRoom) hoveredRoom.userData.baseMat.emissiveIntensity = 0;
    hoveredRoom = group;
    if (hoveredRoom) hoveredRoom.userData.baseMat.emissiveIntensity = 0.35;
    canvas.style.cursor = hoveredRoom ? 'pointer' : 'default';
  };

  const $panel = $('#room-panel');
  const showRoomPanel = (group) => {
    const room = group.userData.room;
    const free = room.seats - room.occupied;
    const rate = room.seats === 0 ? 0 : Math.round(room.occupied / room.seats * 100);

    $('#panel-name').text(room.name);
    $('#panel-loc').text(room.building + ' · ' + room.floor + '楼 · ' + (room.type || '综合区'));
    if (room.status === '开放') {
      $('#panel-seats').html(
        '已占用 <strong>' + room.occupied + '</strong> / ' + room.seats +
        ' 座，空闲 <strong class="text-success">' + free + '</strong> 座（上座率 ' + rate + '%）'
      );
    } else {
      $('#panel-seats').html('<span class="text-muted">' + room.status + '中，暂不可预约（共 ' + room.seats + ' 座）</span>');
    }
    $('#panel-hours').text('开放时间：' + room.hours);
    $panel.removeClass('d-none');

    selectRing.visible = true;
    selectRing.position.x = group.position.x;
    selectRing.position.z = group.position.z;
  };

  $('#panel-close').on('click', () => {
    $panel.addClass('d-none');
    selectRing.visible = false;
  });

  /* 悬停（桌面端） */
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    setHover(pickRoom(e.clientX, e.clientY));
  });

  /* 点击/触摸点按：用起止位移区分“拖拽”和“点击” */
  let downX = 0, downY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    downY = e.clientY;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
    const group = pickRoom(e.clientX, e.clientY);
    if (group) showRoomPanel(group);
  });

  /* ---------- 场景控制按钮 ---------- */
  $('#btn-reset').on('click', () => {
    camera.position.copy(HOME_POS);
    controls.target.copy(HOME_TARGET);
    controls.autoRotate = false;
    $('#btn-rotate').text('自动旋转：关').attr('aria-pressed', 'false');
    controls.update();
  });

  $('#btn-rotate').on('click', function () {
    controls.autoRotate = !controls.autoRotate;
    controls.autoRotateSpeed = 0.8;
    $(this).text('自动旋转：' + (controls.autoRotate ? '开' : '关'))
           .attr('aria-pressed', String(controls.autoRotate));
  });

  /* ---------- 数据加载 ---------- */
  const loadSceneData = async () => {
    $('#scene-error').addClass('d-none');
    try {
      const data = await loadJSON('data/rooms.json');
      if (!data || !Array.isArray(data.rooms) || data.rooms.length === 0) {
        throw new Error('自习室数据为空。');
      }
      buildRooms(data.rooms);
    } catch (err) {
      $('#scene-error-msg').text(err.message);
      $('#scene-error').removeClass('d-none');
      console.error('三维场景数据加载失败：', err);
    }
  };

  $('#scene-retry').on('click', loadSceneData);

  /* ---------- 动画循环 ---------- */
  const clock = new THREE.Clock();
  const animate = () => {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // 选中圆环呼吸效果
    if (selectRing.visible) {
      const s = 1 + Math.sin(t * 3.5) * 0.06;
      selectRing.scale.set(s, s, s);
    }

    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  /* ---------- 窗口尺寸变化 ---------- */
  window.addEventListener('resize', resize);

  loadSceneData();
});
