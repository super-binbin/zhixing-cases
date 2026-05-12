/* ============================================
   知行案例库 — 主页逻辑
   ============================================ */

(function() {
  'use strict';

  // --- 状态 ---
  let currentCourse = 'all';
  let searchKeyword = '';
  let sortAsc = false; // false = 最新优先

  // --- DOM 元素 ---
  const courseFiltersEl = document.getElementById('courseFilters');
  const caseGrid = document.getElementById('caseGrid');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const sortBtn = document.getElementById('sortBtn');
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  // --- 初始化 ---
  function init() {
    renderCourseFilters();
    bindEvents();
    renderAll();
    updateSidebarStats();
  }

  // --- 渲染课程筛选按钮 ---
  function renderCourseFilters() {
    const courses = getCourses();
    courseFiltersEl.innerHTML = courses.map(c => `
      <button class="course-filter" data-course="${c.id}">
        <span class="course-dot" style="background:${c.dotColor || c.color};"></span>
        ${c.name}
      </button>
    `).join('');
  }

  // --- 绑定事件 ---
  function bindEvents() {
    // 侧边栏筛选按钮（包括"全部"和课程按钮）
    sidebar.addEventListener('click', function(e) {
      const btn = e.target.closest('.course-filter');
      if (!btn) return;

      currentCourse = btn.dataset.course;
      // 高亮当前按钮
      sidebar.querySelectorAll('.course-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      renderAll();
    });

    // 搜索
    searchInput.addEventListener('input', function() {
      searchKeyword = this.value.trim().toLowerCase();
      renderCaseCards();
    });

    // 排序
    sortBtn.addEventListener('click', function() {
      sortAsc = !sortAsc;
      sortBtn.textContent = sortAsc ? '🕐 最早优先' : '🕐 最新优先';
      renderCaseCards();
    });

    // 移动端菜单
    menuToggle.addEventListener('click', function() {
      sidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('show');
    });

    sidebarOverlay.addEventListener('click', function() {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('show');
    });

    // 窗口大小变化时关闭移动菜单
    window.addEventListener('resize', function() {
      if (window.innerWidth > 768) {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
      }
    });

    // 时间轴图表弹窗（侧边栏触发）
    var chartModal = document.getElementById('chartModal');
    var chartContainer = document.getElementById('timelineChart');
    var chartRendered = false;

    // 侧边栏触发器点击 → 打开弹窗
    document.getElementById('sidebarChartTrigger').addEventListener('click', function() {
      chartModal.classList.add('show');
      if (!chartRendered) {
        setTimeout(function() { renderTimelineChart(); }, 100); // 等弹窗渲染完毕
        chartRendered = true;
      }
    });

    // 关闭按钮
    document.getElementById('chartModalClose').addEventListener('click', function() {
      chartModal.classList.remove('show');
    });

    // 点击遮罩关闭
    chartModal.addEventListener('click', function(e) {
      if (e.target === chartModal) chartModal.classList.remove('show');
    });

    // ESC 关闭
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') chartModal.classList.remove('show');
    });
  }

  // --- 获取筛选后的案例 ---
  function getFilteredCases() {
    let list = getAllCases();

    // 课程筛选
    if (currentCourse !== 'all') {
      list = list.filter(c => c.courseId === currentCourse);
    }

    // 搜索筛选
    if (searchKeyword) {
      list = list.filter(c => c.author.toLowerCase().includes(searchKeyword));
    }

    // 排序
    list.sort((a, b) => {
      const diff = new Date(b.date) - new Date(a.date);
      return sortAsc ? -diff : diff;
    });

    return list;
  }

  // --- 渲染全部（统计 + 卡片） ---
  function renderAll() {
    renderStats();
    renderCaseCards();
  }

  // --- 渲染统计数字 ---
  function renderStats() {
    const all = getAllCases();
    const courses = getCourses();

    document.getElementById('statAll').textContent = all.length;
    document.getElementById('statVideo').textContent = all.filter(c => c.courseId === courses[0]?.id).length;
    document.getElementById('statShop').textContent = all.filter(c => c.courseId === courses[1]?.id).length;
    document.getElementById('statAi').textContent = all.filter(c => c.courseId === courses[2]?.id).length;
  }

  // --- 渲染案例卡片 ---
  function renderCaseCards() {
    var list = getFilteredCases();

    if (list.length === 0) {
      caseGrid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    caseGrid.innerHTML = list.map(function(c) {
      var course = getCourseById(c.courseId);
      var courseName = course ? course.name : '未知课程';
      var tagClass = getTagClass(c.courseId);
      var hasImage = c.images && c.images.length > 0;
      // 占位图，后续异步替换
      var thumbHtml = hasImage
        ? '<img class="card-thumb" src="" alt="" loading="lazy" data-img-path="' + escapeHtml(c.images[0]) + '">'
        : '<div class="card-thumb">📝</div>';

      return '' +
        '<div class="case-card" onclick="location.href=\'detail.html?id=' + c.id + '\'">' +
          thumbHtml +
          '<div class="card-body">' +
            '<h3>' + escapeHtml(c.summary) + '</h3>' +
            '<div class="card-meta">' +
              '<span>👤 ' + escapeHtml(c.author) + '</span>' +
              '<span>📅 ' + formatDate(c.date) + '</span>' +
            '</div>' +
            '<span class="card-tag ' + tagClass + '">' + escapeHtml(courseName) + '</span>' +
          '</div>' +
        '</div>';
    }).join('');

    // 异步解析 IndexedDB 图片路径
    var thumbs = caseGrid.querySelectorAll('.card-thumb[data-img-path]');
    thumbs.forEach(function(img) {
      var path = img.dataset.imgPath;
      getFileUrl(path).then(function(url) {
        if (url) img.src = url;
      });
    });
  }

  // --- 获取课程标签样式类 ---
  function getTagClass(courseId) {
    switch (courseId) {
      case 'short-video': return 'tag-video';
      case 'xiaohongshu': return 'tag-shop';
      case 'ai-interest': return 'tag-ai';
      default: return 'tag-video';
    }
  }

  // --- 更新侧边栏统计 ---
  function updateSidebarStats() {
    const all = getAllCases();
    document.getElementById('statTotal').textContent = all.length;

    const now = new Date();
    const thisMonth = all.filter(c => {
      const d = new Date(c.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    document.getElementById('statMonth').textContent = thisMonth.length;
  }

  // --- 渲染时间轴图表 ---
  function renderTimelineChart() {
    const container = document.getElementById('timelineChart');
    if (!container) return;

    // 如果 ECharts 未加载，跳过
    if (typeof echarts === 'undefined') {
      container.innerHTML = '<p style="text-align:center;padding:40px;color:#94a3b8;">图表库加载中，请刷新重试</p>';
      return;
    }

    const chart = echarts.init(container);
    const all = getAllCases();
    const courses = getCourses();

    // 按月份统计每个课程的案例数
    if (all.length === 0) {
      chart.setOption({
        title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#94a3b8', fontSize: 14 } }
      });
      return;
    }

    // 获取日期范围
    const dates = all.map(c => new Date(c.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // 扩展到整月范围，至少显示6个月
    let startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    let endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
    const monthSpan = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 + (endMonth.getMonth() - startMonth.getMonth());
    if (monthSpan < 5) {
      startMonth = new Date(endMonth.getFullYear(), endMonth.getMonth() - 5, 1);
    }

    // 生成月份列表
    const months = [];
    const cursor = new Date(startMonth);
    while (cursor <= endMonth) {
      months.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const monthLabels = months.map(m => m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0'));

    // 计算每个课程的累计案例数
    function calcCumulative(courseId) {
      const cum = [];
      let count = 0;
      months.forEach(month => {
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        count += all.filter(c => {
          const d = new Date(c.date);
          return c.courseId === courseId && d >= monthStart && d <= monthEnd;
        }).length;
        cum.push(count);
      });
      return cum;
    }

    // 全部课程的累计
    function calcTotalCumulative() {
      const cum = [];
      let count = 0;
      months.forEach(month => {
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        count += all.filter(c => {
          const d = new Date(c.date);
          return d >= monthStart && d <= monthEnd;
        }).length;
        cum.push(count);
      });
      return cum;
    }

    const series = courses.map(c => ({
      name: c.name,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2.5 },
      itemStyle: { color: c.color },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: c.color + '30' },
          { offset: 1, color: c.color + '05' }
        ])
      },
      data: calcCumulative(c.id)
    }));

    // 总累计
    series.push({
      name: '全部案例',
      type: 'line',
      smooth: true,
      symbol: 'diamond',
      symbolSize: 8,
      lineStyle: { width: 3, type: 'dashed', color: '#6366f1' },
      itemStyle: { color: '#6366f1' },
      data: calcTotalCumulative()
    });

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        textStyle: { color: '#1e293b', fontSize: 13 },
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 12, color: '#64748b' },
        itemWidth: 16,
        itemHeight: 8,
        itemGap: 20
      },
      grid: {
        left: '3%',
        right: '4%',
        top: '8%',
        bottom: '12%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: monthLabels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        name: '累计案例数',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 }
      },
      series: series
    });

    // 响应式
    window.addEventListener('resize', function() { chart.resize(); });
  }

  // --- 启动 ---
  init();

})();
