/* ============================================================
 * 公共脚本：导航高亮、JSON 统一加载、工具函数
 * 全项目数据加载统一走 loadJSON，便于统一错误提示
 * ============================================================ */

/* ---------- 根据当前文件名高亮导航项 ---------- */
(function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
})();

/* ---------- 页脚年份自动更新 ---------- */
document.querySelectorAll('[data-year]').forEach(el => {
  el.textContent = String(new Date().getFullYear());
});

/* ---------- 转义 HTML：渲染用户输入内容前调用，防止注入 ---------- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================================
 * 统一 JSON 加载（基于 jQuery $.ajax）
 * - 网络/404/JSON 格式错误分别给出可读提示
 * - file:// 直接打开时给出“请使用本地服务器”的明确引导
 * 返回 Promise，调用方配合 await 使用
 * ============================================================ */
function loadJSON(url) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: url,
      method: 'GET',
      dataType: 'json',
      cache: false,
      timeout: 8000
    })
      .done(data => resolve(data))
      .fail((jqXHR, textStatus, errorThrown) => {
        let msg = '';
        if (location.protocol === 'file:') {
          msg = '不能直接双击打开 HTML（file:// 协议浏览器会拦截 JSON 读取），请用本地服务器访问，详见 README。';
        } else if (textStatus === 'timeout') {
          msg = '请求超时，请检查网络后重试。';
        } else if (jqXHR.status === 404) {
          msg = '数据文件不存在（404）：' + url;
        } else if (textStatus === 'parsererror') {
          msg = 'JSON 数据格式错误：' + errorThrown;
        } else {
          msg = '网络请求失败（' + textStatus + ' ' + jqXHR.status + '）。';
        }
        reject(new Error(msg));
      });
  });
}

/* ---------- 在指定容器内渲染“加载失败 + 重试”提示 ---------- */
function renderLoadError(container, message, onRetry) {
  const $box = $(container);
  $box.html(
    '<div class="alert alert-danger d-flex flex-column flex-sm-row align-items-sm-center gap-2" role="alert">' +
      '<span class="flex-grow-1"><strong>数据加载失败：</strong>' + escapeHtml(message) + '</span>' +
      '<button type="button" class="btn btn-sm btn-outline-danger btn-retry">重新加载</button>' +
    '</div>'
  );
  $box.find('.btn-retry').on('click', onRetry);
}
