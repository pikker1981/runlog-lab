/* =========================================================
   RunLog Lab — Vanilla JS
   Grayscale charts + orange numeric point highlight
   ========================================================= */

const STORAGE_KEY = "runlog_lab_records_v2";

const CHART_COLORS = {
  axis: "#d4d4d4",
  grid: "#e5e5e5",
  text: "#737373",
  bar: "#525252",
  barSoft: "#a3a3a3",
  line: "#262626",
  point: "#000000",
  numberAccent: "#f97316",
  numberAccentDark: "#c2410c",
  tooltipBg: "#000000",
  tooltipText: "#ffffff"
};

const sleepChartConfig = [
  {
    id: "sleepScoreChart",
    type: "bar",
    title: "수면 점수",
    key: "sleepScore",
    domain: [50, 100],
    unit: "점",
    source: "sleep",
    valueType: "max"
  },
  {
    id: "bodyBatteryChart",
    type: "bar",
    title: "바디 배터리",
    key: "bodyBattery",
    domain: [50, 100],
    unit: "점",
    source: "sleep",
    valueType: "max"
  },
  {
    id: "totalSleepChart",
    type: "bar",
    title: "총 수면 시간",
    key: "totalSleep",
    domain: [300, 500],
    unit: "분",
    source: "sleep",
    valueType: "max"
  },
  {
    id: "deepSleepChart",
    type: "bar",
    title: "깊은 수면",
    key: "deepSleep",
    domain: [0, 200],
    unit: "분",
    source: "sleep",
    valueType: "max"
  },
  {
    id: "remSleepChart",
    type: "bar",
    title: "렘 수면",
    key: "remSleep",
    domain: [0, 200],
    unit: "분",
    source: "sleep",
    valueType: "max"
  },
  {
    id: "sleepRatioChart",
    type: "multiLine",
    title: "수면 비율",
    keys: [
      { key: "deepRatio", label: "깊은 수면", unit: "%" },
      { key: "remRatio", label: "렘 수면", unit: "%" }
    ],
    domain: [0, 50],
    source: "sleep",
    valueType: "max"
  },
  {
    id: "restingHrChart",
    type: "line",
    title: "안정시 심박수",
    key: "restingHr",
    domain: [40, 70],
    unit: "bpm",
    source: "sleep",
    valueType: "min"
  },
  {
    id: "distanceChart",
    type: "bar",
    title: "러닝 거리",
    key: "distance",
    domain: null,
    unit: "km",
    source: "run",
    valueType: "max"
  }
];

const state = {
  records: loadRecords(),
  historyFilter: "all",
  chartRange: "7",
  activeTooltip: null
};

document.addEventListener("DOMContentLoaded", () => {
  setTodayDefaults();
  bindTabs();
  bindForms();
  bindFilters();
  bindImportExport();
  renderAll();
  window.addEventListener("resize", debounce(renderCharts, 120));
});

function setTodayDefaults() {
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.value) input.value = today;
  });
}

function bindTabs() {
  document.querySelectorAll("[data-tab-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.tabTarget;
      switchTab(target);
    });
  });
}

function switchTab(target) {
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === target);
  });

  document.querySelectorAll(".top-nav__item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.tabTarget === target);
  });

  if (target === "charts") {
    setTimeout(renderCharts, 0);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindForms() {
  const sleepForm = document.getElementById("sleepForm");
  const runForm = document.getElementById("runForm");

  sleepForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(sleepForm).entries());

    const record = {
      id: createId(),
      type: "sleep",
      date: data.date,
      sleepScore: toNumber(data.sleepScore),
      bodyBattery: toNumber(data.bodyBattery),
      totalSleep: toNumber(data.totalSleep),
      deepSleep: toNumber(data.deepSleep),
      remSleep: toNumber(data.remSleep),
      deepRatio: toNumber(data.deepRatio),
      remRatio: toNumber(data.remRatio),
      restingHr: toNumber(data.restingHr),
      memo: data.memo?.trim() || "",
      createdAt: new Date().toISOString()
    };

    state.records.push(record);
    saveRecords();
    sleepForm.reset();
    setTodayDefaults();
    renderAll();
    showToast("수면 기록을 저장했어.");
  });

  runForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(runForm).entries());

    const record = {
      id: createId(),
      type: "run",
      date: data.date,
      distance: toNumber(data.distance),
      duration: data.duration?.trim() || "",
      avgPace: data.avgPace?.trim() || "",
      calories: toNumber(data.calories),
      avgSpeed: toNumber(data.avgSpeed),
      avgHr: toNumber(data.avgHr),
      maxHr: toNumber(data.maxHr),
      cadence: toNumber(data.cadence),
      stride: toNumber(data.stride),
      verticalRatio: toNumber(data.verticalRatio),
      groundContact: toNumber(data.groundContact),
      memo: data.memo?.trim() || "",
      createdAt: new Date().toISOString()
    };

    state.records.push(record);
    saveRecords();
    runForm.reset();
    setTodayDefaults();
    renderAll();
    showToast("러닝 기록을 저장했어.");
  });
}

function bindFilters() {
  document.querySelectorAll("[data-history-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.historyFilter = button.dataset.historyFilter;
      document.querySelectorAll("[data-history-filter]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      renderHistory();
    });
  });

  document.querySelectorAll("[data-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.chartRange = button.dataset.range;
      document.querySelectorAll("[data-range]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      renderCharts();
    });
  });
}

function bindImportExport() {
  const exportBtn = document.getElementById("exportJsonBtn");
  const importInput = document.getElementById("importJsonInput");

  exportBtn.addEventListener("click", () => {
    const payload = {
      app: "RunLog Lab",
      version: 2,
      exportedAt: new Date().toISOString(),
      records: state.records
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `runlog-lab-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const records = Array.isArray(payload) ? payload : payload.records;

      if (!Array.isArray(records)) {
        throw new Error("records 배열이 없음");
      }

      state.records = records.filter((item) => item && item.type && item.date);
      saveRecords();
      renderAll();
      showToast("기록을 가져왔어.");
    } catch (error) {
      showToast("가져오기 실패: JSON 형식을 확인해줘.");
    } finally {
      importInput.value = "";
    }
  });
}

function renderAll() {
  renderSummary();
  renderLatest();
  renderHistory();
  renderCharts();
}

function renderSummary() {
  const summaryCards = document.getElementById("summaryCards");

  const sleepRecords = getSortedRecords("sleep");
  const runRecords = getSortedRecords("run");

  const latestSleep = sleepRecords[0];
  const latestRun = runRecords[0];

  const avgSleepScore = average(sleepRecords.map((r) => r.sleepScore));
  const avgBodyBattery = average(sleepRecords.map((r) => r.bodyBattery));
  const totalDistance = sum(runRecords.map((r) => r.distance));
  const avgRestingHr = average(sleepRecords.map((r) => r.restingHr));

  const cards = [
    {
      label: "최근 수면 점수",
      value: latestSleep?.sleepScore ?? "-",
      unit: latestSleep?.sleepScore != null ? "점" : "",
      note: latestSleep ? formatDate(latestSleep.date) : "기록 없음"
    },
    {
      label: "평균 수면 점수",
      value: avgSleepScore ?? "-",
      unit: avgSleepScore != null ? "점" : "",
      note: sleepRecords.length ? `${sleepRecords.length}개 수면 기록 기준` : "기록 없음"
    },
    {
      label: "평균 바디 배터리",
      value: avgBodyBattery ?? "-",
      unit: avgBodyBattery != null ? "점" : "",
      note: "컨디션 회복 참고 지표"
    },
    {
      label: "누적 러닝 거리",
      value: totalDistance ?? "-",
      unit: totalDistance != null ? "km" : "",
      note: runRecords.length ? `${runRecords.length}개 러닝 기록 기준` : "기록 없음"
    },
    {
      label: "최근 러닝 거리",
      value: latestRun?.distance ?? "-",
      unit: latestRun?.distance != null ? "km" : "",
      note: latestRun ? formatDate(latestRun.date) : "기록 없음"
    },
    {
      label: "평균 안정시 심박",
      value: avgRestingHr ?? "-",
      unit: avgRestingHr != null ? "bpm" : "",
      note: "낮을수록 회복 상태 양호"
    },
    {
      label: "총 기록 수",
      value: state.records.length,
      unit: "개",
      note: "수면 + 러닝 전체"
    },
    {
      label: "마지막 입력",
      value: state.records.length ? formatShortDate(getSortedRecords()[0].date) : "-",
      unit: "",
      note: state.records.length ? getSortedRecords()[0].type === "sleep" ? "수면 기록" : "러닝 기록" : "기록 없음"
    }
  ];

  summaryCards.innerHTML = cards.map((card) => `
    <article class="metric-card">
      <div class="metric-label">${escapeHtml(card.label)}</div>
      <div>
        <span class="metric-value">${escapeHtml(String(card.value))}</span>
        <span class="metric-unit">${escapeHtml(card.unit)}</span>
      </div>
      <div class="metric-note">${escapeHtml(card.note)}</div>
    </article>
  `).join("");
}

function renderLatest() {
  const sleepRecords = getSortedRecords("sleep");
  const runRecords = getSortedRecords("run");

  const latestSleep = sleepRecords[0];
  const latestRun = runRecords[0];

  document.getElementById("latestSleepDate").textContent = latestSleep ? formatDate(latestSleep.date) : "없음";
  document.getElementById("latestRunDate").textContent = latestRun ? formatDate(latestRun.date) : "없음";

  document.getElementById("latestSleepList").innerHTML = latestSleep
    ? compactRows([
      ["수면 점수", formatValue(latestSleep.sleepScore, "점")],
      ["바디 배터리", formatValue(latestSleep.bodyBattery, "점")],
      ["총 수면", formatValue(latestSleep.totalSleep, "분")],
      ["깊은 수면", formatValue(latestSleep.deepSleep, "분")],
      ["렘 수면", formatValue(latestSleep.remSleep, "분")],
      ["안정시 심박", formatValue(latestSleep.restingHr, "bpm")]
    ])
    : `<div class="empty-state">아직 수면 기록이 없어.</div>`;

  document.getElementById("latestRunList").innerHTML = latestRun
    ? compactRows([
      ["총 거리", formatValue(latestRun.distance, "km")],
      ["시간", latestRun.duration || "-"],
      ["평균 페이스", latestRun.avgPace || "-"],
      ["평균 심박수", formatValue(latestRun.avgHr, "bpm")],
      ["케이던스", formatValue(latestRun.cadence, "spm")],
      ["지면 접촉 시간", formatValue(latestRun.groundContact, "ms")]
    ])
    : `<div class="empty-state">아직 러닝 기록이 없어.</div>`;
}

function compactRows(rows) {
  return rows.map(([label, value]) => `
    <div class="compact-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");
}

function renderHistory() {
  const historyList = document.getElementById("historyList");

  const records = getSortedRecords().filter((record) => {
    if (state.historyFilter === "all") return true;
    return record.type === state.historyFilter;
  });

  if (!records.length) {
    historyList.innerHTML = `<div class="empty-state">표시할 기록이 없어.</div>`;
    return;
  }

  historyList.innerHTML = records.map((record) => {
    const title = record.type === "sleep" ? "수면 기록" : "러닝 기록";
    const values = record.type === "sleep"
      ? [
        ["수면", formatValue(record.sleepScore, "점")],
        ["배터리", formatValue(record.bodyBattery, "점")],
        ["총수면", formatValue(record.totalSleep, "분")],
        ["깊은", formatValue(record.deepSleep, "분")],
        ["렘", formatValue(record.remSleep, "분")],
        ["심박", formatValue(record.restingHr, "bpm")]
      ]
      : [
        ["거리", formatValue(record.distance, "km")],
        ["시간", record.duration || "-"],
        ["페이스", record.avgPace || "-"],
        ["심박", formatValue(record.avgHr, "bpm")],
        ["케이던스", formatValue(record.cadence, "spm")],
        ["GCT", formatValue(record.groundContact, "ms")]
      ];

    return `
      <article class="history-item">
        <div class="history-item__main">
          <div class="history-item__title">${escapeHtml(title)}</div>
          <div class="history-item__meta">
            <span class="chip chip--light">${escapeHtml(formatDate(record.date))}</span>
            <span>${record.type === "sleep" ? "sleep" : "run"}</span>
          </div>
          ${record.memo ? `<p class="history-item__memo">${escapeHtml(record.memo)}</p>` : ""}
          <button type="button" class="btn btn--danger" data-delete-id="${record.id}">삭제</button>
        </div>
        <div class="history-item__values">
          ${values.map(([label, value]) => `
            <span class="value-chip">${escapeHtml(label)} ${escapeHtml(value)}</span>
          `).join("")}
        </div>
      </article>
    `;
  }).join("");

  historyList.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.deleteId;
      state.records = state.records.filter((record) => record.id !== id);
      saveRecords();
      renderAll();
      showToast("기록을 삭제했어.");
    });
  });
}

function renderCharts() {
  sleepChartConfig.forEach((config) => {
    const canvas = document.getElementById(config.id);
    if (!canvas) return;

    const records = getChartRecords(config.source);
    if (config.type === "multiLine") {
      drawMultiLineChart(canvas, records, config);
    } else if (config.type === "line") {
      drawLineChart(canvas, records, config);
    } else {
      drawBarChart(canvas, records, config);
    }
  });
}

function getChartRecords(type) {
  let records = getSortedRecords(type).reverse();

  if (state.chartRange !== "all") {
    const limit = Number(state.chartRange);
    records = records.slice(-limit);
  }

  return records;
}

function setupCanvas(canvas) {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return {
    ctx,
    width: rect.width,
    height: rect.height,
    padding: {
      top: 30,
      right: 20,
      bottom: 42,
      left: 44
    }
  };
}

function drawEmptyChart(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = CHART_COLORS.text;
  ctx.font = "14px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("기록이 부족해.", width / 2, height / 2);
}

function drawAxes(ctx, width, height, padding, min, max) {
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.strokeStyle = CHART_COLORS.grid;
  ctx.lineWidth = 1;
  ctx.font = "12px system-ui";
  ctx.fillStyle = CHART_COLORS.text;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = padding.top + chartH * (i / steps);
    const value = max - (max - min) * (i / steps);

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillText(formatNumber(value), padding.left - 8, y);
  }

  ctx.strokeStyle = CHART_COLORS.axis;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();
}

function getDomain(records, config) {
  if (config.domain) return config.domain;

  const values = records.map((r) => toNumber(r[config.key])).filter(isFiniteNumber);
  if (!values.length) return [0, 10];

  const max = Math.max(...values);
  const paddedMax = Math.max(10, Math.ceil(max * 1.2));
  return [0, paddedMax];
}

function getX(index, total, padding, width) {
  const chartW = width - padding.left - padding.right;
  if (total <= 1) return padding.left + chartW / 2;
  return padding.left + (chartW * index) / (total - 1);
}

function getY(value, min, max, padding, height) {
  const chartH = height - padding.top - padding.bottom;
  const ratio = (value - min) / (max - min || 1);
  return height - padding.bottom - chartH * ratio;
}

function drawBarChart(canvas, records, config) {
  const { ctx, width, height, padding } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const data = records
    .map((record) => ({
      date: record.date,
      value: toNumber(record[config.key])
    }))
    .filter((item) => isFiniteNumber(item.value));

  if (!data.length) {
    drawEmptyChart(ctx, width, height);
    return;
  }

  const [min, max] = getDomain(records, config);
  drawAxes(ctx, width, height, padding, min, max);

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const gap = 8;
  const barW = Math.max(10, Math.min(34, (chartW - gap * (data.length - 1)) / data.length));

  const extreme = config.valueType === "min"
    ? Math.min(...data.map((d) => d.value))
    : Math.max(...data.map((d) => d.value));

  const minExtreme = Math.min(...data.map((d) => d.value));
  const maxExtreme = Math.max(...data.map((d) => d.value));

  data.forEach((item, index) => {
    const xCenter = padding.left + chartW * ((index + 0.5) / data.length);
    const x = xCenter - barW / 2;
    const y = getY(item.value, min, max, padding, height);
    const baseY = height - padding.bottom;
    const barH = baseY - y;

    ctx.fillStyle = item.value === extreme ? CHART_COLORS.bar : CHART_COLORS.barSoft;
    roundRect(ctx, x, y, barW, barH, 999, true, false);

    drawDateLabel(ctx, item.date, xCenter, height - padding.bottom + 20);

    const showAllNumbers = data.length <= 7;
    const showExtremeNumbers = item.value === maxExtreme || item.value === minExtreme;

    if (showAllNumbers || showExtremeNumbers) {
      drawOrangeNumber(ctx, `${formatNumber(item.value)}${config.unit ? "" : ""}`, xCenter, y - 11);
    }
  });
}

function drawLineChart(canvas, records, config) {
  const { ctx, width, height, padding } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const data = records
    .map((record) => ({
      date: record.date,
      value: toNumber(record[config.key])
    }))
    .filter((item) => isFiniteNumber(item.value));

  if (!data.length) {
    drawEmptyChart(ctx, width, height);
    return;
  }

  const [min, max] = getDomain(records, config);
  drawAxes(ctx, width, height, padding, min, max);

  ctx.strokeStyle = CHART_COLORS.line;
  ctx.lineWidth = 2;
  ctx.beginPath();

  data.forEach((item, index) => {
    const x = getX(index, data.length, padding, width);
    const y = getY(item.value, min, max, padding, height);

    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  const minValue = Math.min(...data.map((d) => d.value));
  const maxValue = Math.max(...data.map((d) => d.value));

  data.forEach((item, index) => {
    const x = getX(index, data.length, padding, width);
    const y = getY(item.value, min, max, padding, height);

    ctx.fillStyle = CHART_COLORS.point;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    drawDateLabel(ctx, item.date, x, height - padding.bottom + 20);

    const showAllNumbers = data.length <= 7;
    const showExtremeNumbers = item.value === minValue || item.value === maxValue;

    if (showAllNumbers || showExtremeNumbers) {
      drawOrangeNumber(ctx, `${formatNumber(item.value)}`, x, y - 14);
    }
  });
}

function drawMultiLineChart(canvas, records, config) {
  const { ctx, width, height, padding } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const series = config.keys.map((keyInfo, seriesIndex) => {
    return {
      ...keyInfo,
      color: seriesIndex === 0 ? CHART_COLORS.line : CHART_COLORS.barSoft,
      data: records
        .map((record) => ({
          date: record.date,
          value: toNumber(record[keyInfo.key])
        }))
        .filter((item) => isFiniteNumber(item.value))
    };
  });

  const hasData = series.some((s) => s.data.length);
  if (!hasData) {
    drawEmptyChart(ctx, width, height);
    return;
  }

  const [min, max] = config.domain;
  drawAxes(ctx, width, height, padding, min, max);

  series.forEach((s) => {
    if (!s.data.length) return;

    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    s.data.forEach((item, index) => {
      const x = getX(index, s.data.length, padding, width);
      const y = getY(item.value, min, max, padding, height);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    const minValue = Math.min(...s.data.map((d) => d.value));
    const maxValue = Math.max(...s.data.map((d) => d.value));

    s.data.forEach((item, index) => {
      const x = getX(index, s.data.length, padding, width);
      const y = getY(item.value, min, max, padding, height);

      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      if (index === 0) drawDateLabel(ctx, item.date, x, height - padding.bottom + 20);

      const showAllNumbers = s.data.length <= 7;
      const showExtremeNumbers = item.value === minValue || item.value === maxValue;

      if (showAllNumbers || showExtremeNumbers) {
        drawOrangeNumber(ctx, `${formatNumber(item.value)}`, x, y - 14);
      }
    });
  });

  drawLegend(ctx, config.keys, padding.left, 18);
}

function drawLegend(ctx, keys, x, y) {
  ctx.font = "12px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  let offset = 0;
  keys.forEach((item, index) => {
    const color = index === 0 ? CHART_COLORS.line : CHART_COLORS.barSoft;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + offset, y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = CHART_COLORS.text;
    ctx.fillText(item.label, x + offset + 9, y);
    offset += ctx.measureText(item.label).width + 42;
  });
}

function drawDateLabel(ctx, date, x, y) {
  ctx.fillStyle = CHART_COLORS.text;
  ctx.font = "11px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(formatShortDate(date), x, y);
}

function drawOrangeNumber(ctx, text, x, y) {
  ctx.save();
  ctx.font = "600 12px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const width = ctx.measureText(text).width + 12;
  const height = 22;

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = CHART_COLORS.numberAccent;
  ctx.lineWidth = 1;
  roundRect(ctx, x - width / 2, y - height / 2, width, height, 999, true, true);

  ctx.fillStyle = CHART_COLORS.numberAccentDark;
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();

  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getSeedRecords();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function getSeedRecords() {
  const today = new Date();
  const daysAgo = (days) => {
    const d = new Date(today);
    d.setDate(today.getDate() - days);
    return d.toISOString().slice(0, 10);
  };

  return [
    {
      id: createId(),
      type: "sleep",
      date: daysAgo(6),
      sleepScore: 74,
      bodyBattery: 61,
      totalSleep: 392,
      deepSleep: 58,
      remSleep: 88,
      deepRatio: 15,
      remRatio: 22,
      restingHr: 57,
      memo: "샘플 기록",
      createdAt: new Date().toISOString()
    },
    {
      id: createId(),
      type: "sleep",
      date: daysAgo(5),
      sleepScore: 81,
      bodyBattery: 70,
      totalSleep: 425,
      deepSleep: 74,
      remSleep: 96,
      deepRatio: 17,
      remRatio: 23,
      restingHr: 54,
      memo: "",
      createdAt: new Date().toISOString()
    },
    {
      id: createId(),
      type: "sleep",
      date: daysAgo(4),
      sleepScore: 68,
      bodyBattery: 55,
      totalSleep: 360,
      deepSleep: 43,
      remSleep: 80,
      deepRatio: 12,
      remRatio: 22,
      restingHr: 61,
      memo: "",
      createdAt: new Date().toISOString()
    },
    {
      id: createId(),
      type: "sleep",
      date: daysAgo(3),
      sleepScore: 86,
      bodyBattery: 76,
      totalSleep: 452,
      deepSleep: 91,
      remSleep: 105,
      deepRatio: 20,
      remRatio: 23,
      restingHr: 52,
      memo: "",
      createdAt: new Date().toISOString()
    },
    {
      id: createId(),
      type: "run",
      date: daysAgo(2),
      distance: 5.2,
      duration: "00:31:20",
      avgPace: "6:01",
      calories: 360,
      avgSpeed: 9.9,
      avgHr: 148,
      maxHr: 171,
      cadence: 166,
      stride: 1.0,
      verticalRatio: 8.1,
      groundContact: 262,
      memo: "샘플 러닝",
      createdAt: new Date().toISOString()
    },
    {
      id: createId(),
      type: "sleep",
      date: daysAgo(1),
      sleepScore: 79,
      bodyBattery: 68,
      totalSleep: 418,
      deepSleep: 69,
      remSleep: 93,
      deepRatio: 17,
      remRatio: 22,
      restingHr: 55,
      memo: "",
      createdAt: new Date().toISOString()
    }
  ];
}

function getSortedRecords(type = null) {
  return [...state.records]
    .filter((record) => !type || record.type === type)
    .sort((a, b) => {
      const dateDiff = String(b.date).localeCompare(String(a.date));
      if (dateDiff !== 0) return dateDiff;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
}

function createId() {
  return `rec_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function toNumber(value) {
  if (value === "" || value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function average(values) {
  const nums = values.filter(isFiniteNumber);
  if (!nums.length) return null;
  return round(sum(nums) / nums.length, 1);
}

function sum(values) {
  const nums = values.filter(isFiniteNumber);
  if (!nums.length) return null;
  return round(nums.reduce((acc, cur) => acc + cur, 0), 1);
}

function round(value, digits = 1) {
  const pow = 10 ** digits;
  return Math.round(value * pow) / pow;
}

function formatValue(value, unit = "") {
  if (!isFiniteNumber(value)) return "-";
  return `${formatNumber(value)}${unit}`;
}

function formatNumber(value) {
  if (!isFiniteNumber(value)) return "-";
  if (Number.isInteger(value)) return String(value);
  return String(round(value, 1));
}

function formatDate(date) {
  if (!date) return "-";
  return date.replaceAll("-", ".");
}

function formatShortDate(date) {
  if (!date) return "-";
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}
