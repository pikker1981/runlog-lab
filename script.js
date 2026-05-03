const SUPABASE_URL = "https://snpdddkwtqmihhtfentt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucGRkZGt3dHFtaWhodGZlbnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjI5NjgsImV4cCI6MjA5MzMzODk2OH0.bO9ttF6D1OeNmpuENIzMh0Urv3LOIJYlyg-IdexjUjQ";

const STORAGE_KEY = "runlog_lab_records_v1";

const TREND_AXIS_MIN = 50;
const TREND_AXIS_MAX = 100;
const TREND_AXIS_TICKS = [100, 90, 80, 70, 60, 50];

const hasSupabaseConfig =
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes("여기에") &&
  !SUPABASE_ANON_KEY.includes("여기에") &&
  window.supabase;

const supabaseClient = hasSupabaseConfig
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const state = {
  records: {
    running: [],
    sleep: [],
  },
  currentView: "dashboard",
  currentTab: "running",
  currentTrendType: "running",
  currentTrendMetric: "distanceKm",
  currentTrendRange: "1",
};

const trendMetricConfig = {
  running: [
    { key: "distanceKm", label: "총 거리", unit: "km", digits: 2 },
    { key: "durationMin", label: "시간", unit: "분", digits: 0 },
    { key: "avgPace", label: "평균 페이스", unit: "분/km", digits: 0, parser: paceToSeconds, formatter: formatPaceSeconds },
    { key: "calories", label: "총 칼로리", unit: "kcal", digits: 0 },
    { key: "avgSpeed", label: "평균 속력", unit: "km/h", digits: 1 },
    { key: "avgHeartRate", label: "평균 심박수", unit: "bpm", digits: 0 },
    { key: "maxHeartRate", label: "최대 심박수", unit: "bpm", digits: 0 },
    { key: "cadence", label: "케이던스", unit: "spm", digits: 0 },
    { key: "strideLength", label: "평균 보폭", unit: "m", digits: 2 },
    { key: "verticalRatio", label: "수직 비율", unit: "%", digits: 1 },
    { key: "groundContactTime", label: "지면 접촉 시간", unit: "ms", digits: 0 },
    { key: "score", label: "앱점수", unit: "점", digits: 0 },
  ],
  sleep: [
    { key: "totalSleepMin", label: "총 수면 시간", unit: "분", digits: 0, formatter: formatDuration },
    { key: "sleepScore", label: "수면 점수", unit: "점", digits: 0 },
    { key: "bodyBatteryScore", label: "바디 배터리", unit: "점", digits: 0 },
    { key: "deepSleepMin", label: "깊은 수면", unit: "분", digits: 0, formatter: formatDuration },
    { key: "remSleepMin", label: "REM 수면", unit: "분", digits: 0, formatter: formatDuration },
    { key: "deepSleepRatio", label: "깊은 수면 비율", unit: "%", digits: 1 },
    { key: "remSleepRatio", label: "REM 수면 비율", unit: "%", digits: 1 },
    { key: "restingHeartRate", label: "안정시 심박수", unit: "bpm", digits: 0 },
    { key: "score", label: "앱점수", unit: "점", digits: 0 },
  ],
};

let trendAnimationFrameId = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const runningForm = $("#runningForm");
const sleepForm = $("#sleepForm");

const runningTableBody = $("#runningTableBody");
const sleepTableBody = $("#sleepTableBody");

const totalRunDistanceElements = $$("[data-total-run-distance]");
const avgSleepScoreElements = $$("[data-avg-sleep-score]");

const avgRunPace = $("#avgRunPace");
const avgRunHeartRate = $("#avgRunHeartRate");
const totalRunCalories = $("#totalRunCalories");

const avgSleepTime = $("#avgSleepTime");
const avgDeepSleepRatio = $("#avgDeepSleepRatio");
const avgRemSleepRatio = $("#avgRemSleepRatio");
const avgBodyBatteryScore = $("#avgBodyBatteryScore");

const latestScoreValue = $("#latestScoreValue");
const latestScoreLabel = $("#latestScoreLabel");
const latestDate = $("#latestDate");

const weeklyRunDistance = $("#weeklyRunDistance");
const monthlyRunDistance = $("#monthlyRunDistance");
const weeklySleepTime = $("#weeklySleepTime");
const monthlyBodyBatteryScore = $("#monthlyBodyBatteryScore");

const emptyRunning = $("#emptyRunning");
const emptySleep = $("#emptySleep");

const resetButton = $("#resetButton");

const editingRunningId = $("#editingRunningId");
const editingSleepId = $("#editingSleepId");

const runningSubmitButton = $("#runningSubmitButton");
const sleepSubmitButton = $("#sleepSubmitButton");

const runningEditingBanner = $("#runningEditingBanner");
const sleepEditingBanner = $("#sleepEditingBanner");

const cancelRunningEditButton = $("#cancelRunningEditButton");
const cancelSleepEditButton = $("#cancelSleepEditButton");

const trendTypeSelect = $("#trendType");
const trendMetricSelect = $("#trendMetric");
const trendRangeTabs = $("#trendRangeTabs");
const trendChart = $("#trendChart");
const trendLatestValue = $("#trendLatestValue");
const trendAverageValue = $("#trendAverageValue");
const trendMaxValue = $("#trendMaxValue");
const trendMinValue = $("#trendMinValue");
const trendNote = $("#trendNote");

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  setTodayDefaults();

  if (!hasSupabaseConfig) {
    alert(
      "Supabase 설정값이 없습니다. script.js 상단의 SUPABASE_URL, SUPABASE_ANON_KEY를 입력해줘."
    );
    state.records = loadLocalFallbackRecords();
    render();
    return;
  }

  await loadRemoteRecords();
  render();
});

function bindEvents() {
  if (runningForm) {
    runningForm.addEventListener("submit", handleRunningSubmit);
  }

  if (sleepForm) {
    sleepForm.addEventListener("submit", handleSleepSubmit);
  }

  if (resetButton) {
    resetButton.addEventListener("click", handleReset);
  }

  if (cancelRunningEditButton) {
    cancelRunningEditButton.addEventListener("click", cancelRunningEdit);
  }

  if (cancelSleepEditButton) {
    cancelSleepEditButton.addEventListener("click", cancelSleepEdit);
  }

  bindTrendEvents();

  $$("[data-view-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetView = button.dataset.viewTab;
      const targetRecordTab = button.dataset.recordTabTarget;

      state.currentView = targetView || "dashboard";

      if (targetRecordTab) {
        state.currentTab = targetRecordTab;
      }

      renderViewTabs();
      renderRecordTabs();

      if (state.currentView === "trend") {
        requestAnimationFrame(renderTrendChart);
      }

      scrollToCurrentView();
    });
  });

  $$("[data-record-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentTab = button.dataset.recordTab;
      renderRecordTabs();
    });
  });
}

async function loadRemoteRecords() {
  try {
    const [runningResponse, sleepResponse] = await Promise.all([
      supabaseClient
        .from("running_records")
        .select("*")
        .order("record_date", { ascending: false })
        .order("created_at", { ascending: false }),

      supabaseClient
        .from("sleep_records")
        .select("*")
        .order("record_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (runningResponse.error) throw runningResponse.error;
    if (sleepResponse.error) throw sleepResponse.error;

    state.records.running = runningResponse.data.map(mapRunningFromDb);
    state.records.sleep = sleepResponse.data.map(mapSleepFromDb);

    saveLocalFallbackRecords();
  } catch (error) {
    console.error("Supabase 데이터를 불러오지 못했습니다.", error);
    alert("Supabase 데이터를 불러오지 못했습니다. 콘솔 오류를 확인해줘.");

    state.records = loadLocalFallbackRecords();
  }
}

function loadLocalFallbackRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        running: [],
        sleep: [],
      };
    }

    const parsed = JSON.parse(raw);

    return {
      running: Array.isArray(parsed.running) ? parsed.running : [],
      sleep: Array.isArray(parsed.sleep) ? parsed.sleep : [],
    };
  } catch (error) {
    console.error("로컬 백업 데이터를 불러오지 못했습니다.", error);

    return {
      running: [],
      sleep: [],
    };
  }
}

function saveLocalFallbackRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function mapRunningFromDb(row) {
  return {
    id: row.id,
    date: row.record_date,
    distanceKm: toNumber(row.distance_km),
    durationMin: toNumber(row.duration_min),
    avgPace: row.avg_pace || "",
    calories: toNumber(row.calories),
    avgSpeed: toNumber(row.avg_speed),
    avgHeartRate: toNumber(row.avg_heart_rate),
    maxHeartRate: toNumber(row.max_heart_rate),
    cadence: toNumber(row.cadence),
    strideLength: toNumber(row.stride_length),
    verticalRatio: toNumber(row.vertical_ratio),
    groundContactTime: toNumber(row.ground_contact_time),
    memo: row.memo || "",
    score: toNumber(row.score),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSleepFromDb(row) {
  return {
    id: row.id,
    date: row.record_date,
    totalSleepMin: toNumber(row.total_sleep_min),
    sleepScore: toNumber(row.sleep_score),
    bodyBatteryScore: toNumber(row.body_battery_score),
    deepSleepMin: toNumber(row.deep_sleep_min),
    remSleepMin: toNumber(row.rem_sleep_min),
    deepSleepRatio: toNumber(row.deep_sleep_ratio),
    remSleepRatio: toNumber(row.rem_sleep_ratio),
    restingHeartRate: toNumber(row.resting_heart_rate),
    sleepStart: row.sleep_start || "",
    sleepEnd: row.sleep_end || "",
    memo: row.memo || "",
    score: toNumber(row.score),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRunningToDb(record) {
  return {
    record_date: record.date,
    distance_km: record.distanceKm,
    duration_min: record.durationMin,
    avg_pace: record.avgPace,
    calories: record.calories,
    avg_speed: record.avgSpeed,
    avg_heart_rate: record.avgHeartRate,
    max_heart_rate: record.maxHeartRate,
    cadence: record.cadence,
    stride_length: record.strideLength,
    vertical_ratio: record.verticalRatio,
    ground_contact_time: record.groundContactTime,
    memo: record.memo,
    score: record.score,
    updated_at: new Date().toISOString(),
  };
}

function mapSleepToDb(record) {
  return {
    record_date: record.date,
    total_sleep_min: record.totalSleepMin,
    sleep_score: record.sleepScore,
    body_battery_score: record.bodyBatteryScore,
    deep_sleep_min: record.deepSleepMin,
    rem_sleep_min: record.remSleepMin,
    deep_sleep_ratio: record.deepSleepRatio,
    rem_sleep_ratio: record.remSleepRatio,
    resting_heart_rate: record.restingHeartRate,
    sleep_start: record.sleepStart || null,
    sleep_end: record.sleepEnd || null,
    memo: record.memo,
    score: record.score,
    updated_at: new Date().toISOString(),
  };
}

async function handleRunningSubmit(event) {
  event.preventDefault();

  const formData = new FormData(runningForm);
  const editId = editingRunningId ? editingRunningId.value : "";

  const record = {
    id: editId || "",
    date: formData.get("runDate"),
    distanceKm: toNumber(formData.get("distanceKm")),
    durationMin: toNumber(formData.get("durationMin")),
    avgPace: sanitizeText(formData.get("avgPace")),
    calories: toNumber(formData.get("calories")),
    avgSpeed: toNumber(formData.get("avgSpeed")),
    avgHeartRate: toNumber(formData.get("avgHeartRate")),
    maxHeartRate: toNumber(formData.get("maxHeartRate")),
    cadence: toNumber(formData.get("cadence")),
    strideLength: toNumber(formData.get("strideLength")),
    verticalRatio: toNumber(formData.get("verticalRatio")),
    groundContactTime: toNumber(formData.get("groundContactTime")),
    memo: sanitizeText(formData.get("runMemo")),
  };

  if (!record.date || record.distanceKm <= 0 || record.durationMin <= 0) {
    alert("러닝 날짜, 총 거리, 시간을 확인해줘.");
    return;
  }

  record.score = calculateRunningScore(record);

  try {
    if (editId) {
      const { data, error } = await supabaseClient
        .from("running_records")
        .update(mapRunningToDb(record))
        .eq("id", editId)
        .select()
        .single();

      if (error) throw error;

      const updatedRecord = mapRunningFromDb(data);

      state.records.running = state.records.running.map((item) =>
        item.id === editId ? updatedRecord : item
      );
    } else {
      const { data, error } = await supabaseClient
        .from("running_records")
        .insert(mapRunningToDb(record))
        .select()
        .single();

      if (error) throw error;

      state.records.running.unshift(mapRunningFromDb(data));
    }

    saveLocalFallbackRecords();
    cancelRunningEdit(false);
    runningForm.reset();
    setTodayDefaults();
    render();
  } catch (error) {
    console.error("러닝 저장 실패", error);
    alert("러닝 기록 저장에 실패했습니다. Supabase 설정과 RLS 정책을 확인해줘.");
  }
}

function startRunningEdit(id) {
  const record = state.records.running.find((item) => item.id === id);
  if (!record || !runningForm) return;

  state.currentView = "input";
  state.currentTab = "running";

  renderViewTabs();
  renderRecordTabs();

  $("#runDate").value = record.date || "";
  $("#distanceKm").value = record.distanceKm || "";
  $("#durationMin").value = record.durationMin || "";
  $("#avgPace").value = record.avgPace || "";
  $("#calories").value = record.calories || "";
  $("#avgSpeed").value = record.avgSpeed || "";
  $("#avgHeartRate").value = record.avgHeartRate || "";
  $("#maxHeartRate").value = record.maxHeartRate || "";
  $("#cadence").value = record.cadence || "";
  $("#strideLength").value = record.strideLength || "";
  $("#verticalRatio").value = record.verticalRatio || "";
  $("#groundContactTime").value = record.groundContactTime || "";
  $("#runMemo").value = record.memo || "";

  if (editingRunningId) editingRunningId.value = record.id;
  if (runningSubmitButton) runningSubmitButton.textContent = "러닝 수정 저장";
  if (runningEditingBanner) runningEditingBanner.classList.add("active");

  scrollToCurrentView();
}

function cancelRunningEdit(shouldReset = true) {
  if (editingRunningId) editingRunningId.value = "";
  if (runningSubmitButton) runningSubmitButton.textContent = "러닝 저장";
  if (runningEditingBanner) runningEditingBanner.classList.remove("active");

  if (shouldReset && runningForm) {
    runningForm.reset();
    setTodayDefaults();
  }
}

function calculateRunningScore(record) {
  let score = 100;

  const paceSeconds = paceToSeconds(record.avgPace);

  if (paceSeconds) {
    if (paceSeconds <= 300) score -= 0;
    else if (paceSeconds <= 360) score -= 8;
    else if (paceSeconds <= 420) score -= 16;
    else score -= 26;
  } else {
    score -= 8;
  }

  if (record.avgHeartRate > 0) {
    if (record.avgHeartRate <= 150) score -= 0;
    else if (record.avgHeartRate <= 165) score -= 8;
    else if (record.avgHeartRate <= 178) score -= 16;
    else score -= 24;
  }

  if (record.cadence > 0) {
    if (record.cadence >= 165 && record.cadence <= 185) score -= 0;
    else if (record.cadence >= 155 && record.cadence < 165) score -= 6;
    else if (record.cadence > 185 && record.cadence <= 195) score -= 6;
    else score -= 12;
  }

  if (record.verticalRatio > 0) {
    if (record.verticalRatio <= 8) score -= 0;
    else if (record.verticalRatio <= 10) score -= 6;
    else score -= 12;
  }

  if (record.groundContactTime > 0) {
    if (record.groundContactTime <= 250) score -= 0;
    else if (record.groundContactTime <= 280) score -= 6;
    else score -= 12;
  }

  return clamp(Math.round(score), 0, 100);
}

async function handleSleepSubmit(event) {
  event.preventDefault();

  const formData = new FormData(sleepForm);
  const editId = editingSleepId ? editingSleepId.value : "";

  const totalSleepMin = toNumber(formData.get("totalSleepMin"));
  const deepSleepMin = toNumber(formData.get("deepSleepMin"));
  const remSleepMin = toNumber(formData.get("remSleepMin"));

  const record = {
    id: editId || "",
    date: formData.get("sleepDate"),
    totalSleepMin,
    sleepScore: toNumber(formData.get("sleepScore")),
    bodyBatteryScore: toNumber(formData.get("bodyBatteryScore")),
    deepSleepMin,
    remSleepMin,
    restingHeartRate: toNumber(formData.get("restingHeartRate")),
    sleepStart: formData.get("sleepStart"),
    sleepEnd: formData.get("sleepEnd"),
    memo: sanitizeText(formData.get("sleepMemo")),
  };

  if (!record.date || record.totalSleepMin <= 0) {
    alert("수면 날짜와 총 수면 시간을 확인해줘.");
    return;
  }

  if (!isScoreInRange(record.sleepScore)) {
    alert("수면 점수는 0~100 사이로 입력해줘.");
    return;
  }

  if (!isScoreInRange(record.bodyBatteryScore)) {
    alert("바디 배터리 점수는 0~100 사이로 입력해줘.");
    return;
  }

  if (record.deepSleepMin + record.remSleepMin > record.totalSleepMin) {
    alert("깊은 수면과 REM 수면의 합이 총 수면 시간을 넘을 수 없어.");
    return;
  }

  record.deepSleepRatio = getRatio(record.deepSleepMin, record.totalSleepMin);
  record.remSleepRatio = getRatio(record.remSleepMin, record.totalSleepMin);
  record.score = calculateSleepScore(record);

  try {
    if (editId) {
      const { data, error } = await supabaseClient
        .from("sleep_records")
        .update(mapSleepToDb(record))
        .eq("id", editId)
        .select()
        .single();

      if (error) throw error;

      const updatedRecord = mapSleepFromDb(data);

      state.records.sleep = state.records.sleep.map((item) =>
        item.id === editId ? updatedRecord : item
      );
    } else {
      const { data, error } = await supabaseClient
        .from("sleep_records")
        .insert(mapSleepToDb(record))
        .select()
        .single();

      if (error) throw error;

      state.records.sleep.unshift(mapSleepFromDb(data));
    }

    saveLocalFallbackRecords();
    cancelSleepEdit(false);
    sleepForm.reset();
    setTodayDefaults();
    render();
  } catch (error) {
    console.error("수면 저장 실패", error);
    alert("수면 기록 저장에 실패했습니다. Supabase 설정과 RLS 정책을 확인해줘.");
  }
}

function startSleepEdit(id) {
  const record = state.records.sleep.find((item) => item.id === id);
  if (!record || !sleepForm) return;

  state.currentView = "input";
  state.currentTab = "sleep";

  renderViewTabs();
  renderRecordTabs();

  $("#sleepDate").value = record.date || "";
  $("#totalSleepMin").value = record.totalSleepMin || "";
  $("#sleepScore").value = record.sleepScore || "";
  $("#bodyBatteryScore").value = record.bodyBatteryScore || "";
  $("#deepSleepMin").value = record.deepSleepMin || "";
  $("#remSleepMin").value = record.remSleepMin || "";
  $("#restingHeartRate").value = record.restingHeartRate || "";
  $("#sleepStart").value = record.sleepStart || "";
  $("#sleepEnd").value = record.sleepEnd || "";
  $("#sleepMemo").value = record.memo || "";

  if (editingSleepId) editingSleepId.value = record.id;
  if (sleepSubmitButton) sleepSubmitButton.textContent = "수면 수정 저장";
  if (sleepEditingBanner) sleepEditingBanner.classList.add("active");

  scrollToCurrentView();
}

function cancelSleepEdit(shouldReset = true) {
  if (editingSleepId) editingSleepId.value = "";
  if (sleepSubmitButton) sleepSubmitButton.textContent = "수면 저장";
  if (sleepEditingBanner) sleepEditingBanner.classList.remove("active");

  if (shouldReset && sleepForm) {
    sleepForm.reset();
    setTodayDefaults();
  }
}

function calculateSleepScore(record) {
  let score = 100;
  const totalHours = record.totalSleepMin / 60;

  if (totalHours >= 7 && totalHours <= 9) score -= 0;
  else if (totalHours >= 6 && totalHours < 7) score -= 10;
  else if (totalHours > 9 && totalHours <= 10) score -= 8;
  else if (totalHours >= 5 && totalHours < 6) score -= 22;
  else score -= 35;

  if (record.deepSleepRatio >= 13 && record.deepSleepRatio <= 23) score -= 0;
  else if (record.deepSleepRatio >= 10 && record.deepSleepRatio < 13) score -= 8;
  else if (record.deepSleepRatio > 23 && record.deepSleepRatio <= 28) score -= 6;
  else score -= 16;

  if (record.remSleepRatio >= 20 && record.remSleepRatio <= 25) score -= 0;
  else if (record.remSleepRatio >= 16 && record.remSleepRatio < 20) score -= 8;
  else if (record.remSleepRatio > 25 && record.remSleepRatio <= 30) score -= 6;
  else score -= 16;

  if (record.restingHeartRate > 0) {
    if (record.restingHeartRate <= 60) score -= 0;
    else if (record.restingHeartRate <= 70) score -= 6;
    else if (record.restingHeartRate <= 80) score -= 12;
    else score -= 20;
  }

  return clamp(Math.round(score), 0, 100);
}

function render() {
  sortRecords();
  renderViewTabs();
  renderRecordTabs();
  renderRunningTable();
  renderSleepTable();
  renderDashboard();
  renderPeriodSummary();
  renderLatestSummary();
  renderTrendMetricOptions();
  renderTrendChart();
}

function renderViewTabs() {
  $$("[data-view-tab]").forEach((button) => {
    const isActive = button.dataset.viewTab === state.currentView;
    button.classList.toggle("active", isActive);
  });

  $$("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("hide", panel.dataset.viewPanel !== state.currentView);
  });
}

function renderRecordTabs() {
  $$("[data-record-tab]").forEach((button) => {
    const isActive = button.dataset.recordTab === state.currentTab;

    button.classList.toggle("btn-primary", isActive);
    button.classList.toggle("btn-secondary", !isActive);
  });

  $$("[data-record-panel]").forEach((panel) => {
    panel.classList.toggle("hide", panel.dataset.recordPanel !== state.currentTab);
  });
}

function renderRunningTable() {
  if (!runningTableBody) return;

  const records = state.records.running;

  runningTableBody.innerHTML = records
    .map((record) => {
      return `
        <tr>
          <td><strong>${formatDate(record.date)}</strong></td>
          <td>${formatNumber(record.distanceKm, 2)} km</td>
          <td>${formatDuration(record.durationMin)}</td>
          <td>${record.avgPace || "-"}</td>
          <td>${formatNumber(record.avgHeartRate, 0)} bpm</td>
          <td>${formatNumber(record.cadence, 0)} spm</td>
          <td><strong>${record.score}</strong></td>
          <td>
            <div class="table-actions">
              <button class="btn btn-secondary" onclick="startRunningEdit('${record.id}')">수정</button>
              <button class="btn btn-danger" onclick="deleteRunningRecord('${record.id}')">삭제</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  if (emptyRunning) {
    emptyRunning.classList.toggle("hide", records.length > 0);
  }
}

function renderSleepTable() {
  if (!sleepTableBody) return;

  const records = state.records.sleep;

  sleepTableBody.innerHTML = records
    .map((record) => {
      return `
        <tr>
          <td><strong>${formatDate(record.date)}</strong></td>
          <td>${formatDuration(record.totalSleepMin)}</td>
          <td>${formatNullableScore(record.sleepScore)}</td>
          <td>${formatNullableScore(record.bodyBatteryScore)}</td>
          <td>${formatNumber(record.deepSleepRatio, 1)}%</td>
          <td>${formatNumber(record.remSleepRatio, 1)}%</td>
          <td>${formatNumber(record.restingHeartRate, 0)} bpm</td>
          <td><strong>${record.score}</strong></td>
          <td>
            <div class="table-actions">
              <button class="btn btn-secondary" onclick="startSleepEdit('${record.id}')">수정</button>
              <button class="btn btn-danger" onclick="deleteSleepRecord('${record.id}')">삭제</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  if (emptySleep) {
    emptySleep.classList.toggle("hide", records.length > 0);
  }
}

function renderDashboard() {
  renderRunningDashboard();
  renderSleepDashboard();
}

function renderRunningDashboard() {
  const records = state.records.running;

  setTextAll(
    totalRunDistanceElements,
    formatNumber(sum(records, "distanceKm"), 1)
  );

  if (avgRunPace) {
    avgRunPace.textContent = calculateAveragePace(records);
  }

  if (avgRunHeartRate) {
    avgRunHeartRate.textContent = formatNumber(avg(records, "avgHeartRate"), 0);
  }

  if (totalRunCalories) {
    totalRunCalories.textContent = formatNumber(sum(records, "calories"), 0);
  }
}

function renderSleepDashboard() {
  const records = state.records.sleep;

  setTextAll(avgSleepScoreElements, formatNumber(avg(records, "sleepScore"), 0));

  if (avgBodyBatteryScore) {
    avgBodyBatteryScore.textContent = formatNumber(
      avg(records, "bodyBatteryScore"),
      0
    );
  }

  if (avgSleepTime) {
    avgSleepTime.textContent = formatDuration(avg(records, "totalSleepMin"));
  }

  if (avgDeepSleepRatio) {
    avgDeepSleepRatio.textContent = `${formatNumber(
      avg(records, "deepSleepRatio"),
      1
    )}%`;
  }

  if (avgRemSleepRatio) {
    avgRemSleepRatio.textContent = `${formatNumber(
      avg(records, "remSleepRatio"),
      1
    )}%`;
  }
}

function renderPeriodSummary() {
  const weeklyRunning = filterRecentDays(state.records.running, 7);
  const monthlyRunning = filterRecentDays(state.records.running, 30);
  const weeklySleep = filterRecentDays(state.records.sleep, 7);
  const monthlySleep = filterRecentDays(state.records.sleep, 30);

  if (weeklyRunDistance) {
    weeklyRunDistance.textContent = formatNumber(
      sum(weeklyRunning, "distanceKm"),
      1
    );
  }

  if (monthlyRunDistance) {
    monthlyRunDistance.textContent = formatNumber(
      sum(monthlyRunning, "distanceKm"),
      1
    );
  }

  if (weeklySleepTime) {
    weeklySleepTime.textContent = formatDuration(avg(weeklySleep, "totalSleepMin"));
  }

  if (monthlyBodyBatteryScore) {
    monthlyBodyBatteryScore.textContent = formatNumber(
      avg(monthlySleep, "bodyBatteryScore"),
      0
    );
  }
}

function renderLatestSummary() {
  if (!latestScoreValue || !latestScoreLabel || !latestDate) return;

  const latestRunning = state.records.running[0]
    ? {
        ...state.records.running[0],
        type: "running",
      }
    : null;

  const latestSleep = state.records.sleep[0]
    ? {
        ...state.records.sleep[0],
        type: "sleep",
      }
    : null;

  const latest = [latestRunning, latestSleep]
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  if (!latest) {
    latestScoreValue.textContent = "-";
    latestScoreLabel.textContent = "No Data";
    latestDate.textContent = "기록을 입력하면 최신 점수가 표시됩니다.";
    return;
  }

  if (latest.type === "sleep" && latest.sleepScore > 0) {
    latestScoreValue.textContent = latest.sleepScore;
    latestScoreLabel.textContent = "Sleep Score";
    latestDate.textContent = `${formatDate(latest.date)} 기준 최신 수면 기록`;
    return;
  }

  latestScoreValue.textContent = latest.score;
  latestScoreLabel.textContent = getScoreLabel(latest.score);

  const typeLabel = latest.type === "running" ? "러닝" : "수면";
  latestDate.textContent = `${formatDate(latest.date)} 기준 최신 ${typeLabel} 기록`;
}

async function deleteRunningRecord(id) {
  const confirmed = confirm("이 러닝 기록을 삭제할까?");
  if (!confirmed) return;

  try {
    const { error } = await supabaseClient
      .from("running_records")
      .delete()
      .eq("id", id);

    if (error) throw error;

    state.records.running = state.records.running.filter((record) => record.id !== id);
    saveLocalFallbackRecords();
    render();
  } catch (error) {
    console.error("러닝 삭제 실패", error);
    alert("러닝 기록 삭제에 실패했습니다.");
  }
}

async function deleteSleepRecord(id) {
  const confirmed = confirm("이 수면 기록을 삭제할까?");
  if (!confirmed) return;

  try {
    const { error } = await supabaseClient
      .from("sleep_records")
      .delete()
      .eq("id", id);

    if (error) throw error;

    state.records.sleep = state.records.sleep.filter((record) => record.id !== id);
    saveLocalFallbackRecords();
    render();
  } catch (error) {
    console.error("수면 삭제 실패", error);
    alert("수면 기록 삭제에 실패했습니다.");
  }
}

async function handleReset() {
  const confirmed = confirm("모든 러닝/수면 기록을 삭제할까?");
  if (!confirmed) return;

  try {
    const [runningResponse, sleepResponse] = await Promise.all([
      supabaseClient.from("running_records").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabaseClient.from("sleep_records").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    ]);

    if (runningResponse.error) throw runningResponse.error;
    if (sleepResponse.error) throw sleepResponse.error;

    state.records = {
      running: [],
      sleep: [],
    };

    saveLocalFallbackRecords();
    cancelRunningEdit(false);
    cancelSleepEdit(false);
    render();
  } catch (error) {
    console.error("전체 초기화 실패", error);
    alert("전체 초기화에 실패했습니다.");
  }
}


function bindTrendEvents() {
  if (trendTypeSelect) {
    trendTypeSelect.addEventListener("change", () => {
      state.currentTrendType = trendTypeSelect.value;
      state.currentTrendMetric = trendMetricConfig[state.currentTrendType][0].key;
      renderTrendMetricOptions();
      renderTrendChart();
    });
  }

  if (trendMetricSelect) {
    trendMetricSelect.addEventListener("change", () => {
      state.currentTrendMetric = trendMetricSelect.value;
      renderTrendChart();
    });
  }

  if (trendRangeTabs) {
    trendRangeTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-trend-range]");
      if (!button) return;

      state.currentTrendRange = button.dataset.trendRange;

      $$("[data-trend-range]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });

      renderTrendChart();
    });
  }

  window.addEventListener("resize", debounce(renderTrendChart, 160));
}

function renderTrendMetricOptions() {
  if (!trendMetricSelect) return;

  const metrics = trendMetricConfig[state.currentTrendType] || [];

  if (!metrics.length) return;

  const hasMetric = metrics.some((metric) => metric.key === state.currentTrendMetric);

  if (!hasMetric) {
    state.currentTrendMetric = metrics[0].key;
  }

  trendMetricSelect.innerHTML = metrics
    .map((metric) => {
      const selected = metric.key === state.currentTrendMetric ? "selected" : "";
      return `<option value="${metric.key}" ${selected}>${metric.label}</option>`;
    })
    .join("");

  if (trendTypeSelect) {
    trendTypeSelect.value = state.currentTrendType;
  }
}

function renderTrendChart() {
  if (!trendChart) return;

  const data = getTrendData();
  updateTrendSummary(data);
  resizeTrendCanvas();

  if (trendAnimationFrameId) {
    cancelAnimationFrame(trendAnimationFrameId);
  }

  animateTrendChart(data);
}

function getTrendData() {
  const metric = getCurrentTrendMetric();
  const sourceRecords = state.records[state.currentTrendType] || [];

  const grouped = new Map();

  sourceRecords.forEach((record) => {
    const date = record.date;
    if (!date) return;

    const value = getTrendMetricValue(record, metric);
    if (!Number.isFinite(value) || value <= 0) return;

    const dateKey = String(date).slice(0, 10);

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }

    grouped.get(dateKey).push(value);
  });

  const groupedData = Array.from(grouped.entries())
    .map(([date, values]) => ({
      date,
      value: values.reduce((acc, value) => acc + value, 0) / values.length,
      hasData: true,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (state.currentTrendRange === "all" || groupedData.length === 0) {
    return groupedData;
  }

  const days = Number(state.currentTrendRange);
  const latest = new Date(groupedData[groupedData.length - 1].date);
  latest.setHours(23, 59, 59, 999);

  const start = new Date(latest);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  const valueByDate = new Map(groupedData.map((item) => [item.date, item.value]));
  const timeline = [];

  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    const dateKey = toDateKey(date);
    const value = valueByDate.get(dateKey);

    timeline.push({
      date: dateKey,
      value: Number.isFinite(value) ? value : null,
      hasData: Number.isFinite(value),
    });
  }

  return timeline;
}

function getTrendMetricValue(record, metric) {
  if (metric.parser) {
    return metric.parser(record[metric.key]);
  }

  return toNumber(record[metric.key]);
}

function updateTrendSummary(data) {
  const metric = getCurrentTrendMetric();

  if (!trendLatestValue || !trendAverageValue || !trendMaxValue || !trendMinValue) return;

  if (!data.length) {
    trendLatestValue.textContent = "-";
    trendAverageValue.textContent = "-";
    trendMaxValue.textContent = "-";
    trendMinValue.textContent = "-";

    if (trendNote) {
      trendNote.textContent = "표시할 기록이 없습니다. 해당 유형의 기록을 먼저 입력해줘.";
    }

    return;
  }

  const validData = data.filter((item) => Number.isFinite(item.value));

  if (!validData.length) {
    trendLatestValue.textContent = "-";
    trendAverageValue.textContent = "-";
    trendMaxValue.textContent = "-";
    trendMinValue.textContent = "-";

    if (trendNote) {
      trendNote.textContent = "선택한 기간에 표시할 기록이 없습니다.";
    }

    return;
  }

  const values = validData.map((item) => item.value);
  const latest = validData[validData.length - 1].value;
  const averageValue = values.reduce((acc, value) => acc + value, 0) / values.length;

  trendLatestValue.textContent = formatTrendValue(latest, metric);
  trendAverageValue.textContent = formatTrendValue(averageValue, metric);
  trendMaxValue.textContent = formatTrendValue(Math.max(...values), metric);
  trendMinValue.textContent = formatTrendValue(Math.min(...values), metric);

  if (trendNote) {
    const rangeLabel = getTrendRangeLabel();
    const chartType = state.currentTrendRange === "1" || state.currentTrendRange === "7"
      ? "막대 + 선"
      : "선";
    const axisConfig = getTrendAxisConfig(metric);

    trendNote.textContent = `${rangeLabel} · ${metric.label} · 좌측 축 ${axisConfig.label} 고정 · 날짜 순서 기준 · ${chartType} 그래프로 표시 중`;
  }
}

function resizeTrendCanvas() {
  const wrapper = trendChart.parentElement;
  const width = Math.max(280, wrapper ? wrapper.clientWidth - 28 : 720);
  const height = window.innerWidth <= 900 ? 330 : 420;
  const dpr = window.devicePixelRatio || 1;

  trendChart.style.width = `${width}px`;
  trendChart.style.height = `${height}px`;
  trendChart.width = Math.floor(width * dpr);
  trendChart.height = Math.floor(height * dpr);

  const ctx = trendChart.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function animateTrendChart(data) {
  const startedAt = performance.now();
  const duration = 850;

  function frame(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = easeOutCubic(progress);
    const pulse = 0.5 + Math.sin(now / 230) * 0.5;

    drawTrendChart(data, eased, pulse);

    // 그래프 극값 포인트는 계속 깜빡여야 하므로, 초기 등장 애니메이션이 끝난 뒤에도 프레임을 유지한다.
    trendAnimationFrameId = requestAnimationFrame(frame);
  }

  trendAnimationFrameId = requestAnimationFrame(frame);
}

function drawTrendChart(data, progress, pulse = 1) {
  const ctx = trendChart.getContext("2d");
  const width = parseFloat(trendChart.style.width) || 720;
  const height = parseFloat(trendChart.style.height) || 420;

  ctx.clearRect(0, 0, width, height);

  const padding = {
    top: 28,
    right: 30,
    bottom: 54,
    left: 68,
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  drawTrendGrid(ctx, padding, chartWidth, chartHeight, getTrendAxisConfig(getCurrentTrendMetric()));

  const validData = data.filter((item) => Number.isFinite(item.value));

  if (!validData.length) {
    drawTrendEmpty(ctx, width, height);
    return;
  }

  const metric = getCurrentTrendMetric();
  const axisConfig = getTrendAxisConfig(metric);
  const min = axisConfig.min;
  const max = axisConfig.max;
  const slotCount = Math.max(data.length, 1);
  const slotWidth = chartWidth / slotCount;

  const points = data.map((item, index) => {
    const x = padding.left + slotWidth * (index + 0.5);

    if (!Number.isFinite(item.value)) {
      return {
        ...item,
        x,
        y: null,
        axisValue: null,
      };
    }

    const axisValue = getTrendAxisDisplayValue(item.value, metric, axisConfig);
    const clippedAxisValue = clamp(axisValue, min, max);
    const ratio = (clippedAxisValue - min) / (max - min || 1);
    const y = padding.top + chartHeight - ratio * chartHeight;

    return { ...item, x, y, axisValue };
  });

  drawTrendYAxis(ctx, padding, chartHeight, axisConfig);
  drawTrendXAxis(ctx, points, padding, chartHeight);

  const validPoints = points.filter((point) => Number.isFinite(point.value) && Number.isFinite(point.y) && Number.isFinite(point.axisValue));

  const extremeInfo = getTrendExtremeInfo(validPoints, metric);

  if (state.currentTrendRange === "1" || state.currentTrendRange === "7") {
    drawTrendBars(ctx, validPoints, padding, chartHeight, progress, slotWidth);
  }

  drawTrendLine(ctx, validPoints, progress);
  drawTrendDots(ctx, validPoints, progress);
  drawTrendExtremePulse(ctx, extremeInfo, pulse, progress);
  drawTrendValueLabels(ctx, validPoints, metric, extremeInfo, progress);
}

function drawTrendGrid(ctx, padding, chartWidth, chartHeight, axisConfig) {
  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
  ctx.lineWidth = 1;

  axisConfig.ticks.forEach((value) => {
    const ratio = (value - axisConfig.min) / (axisConfig.max - axisConfig.min || 1);
    const y = padding.top + chartHeight - ratio * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();
  });

  ctx.strokeStyle = "rgba(148, 163, 184, 0.26)";
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.stroke();
  ctx.restore();
}

function drawTrendYAxis(ctx, padding, chartHeight, axisConfig) {
  ctx.save();
  ctx.fillStyle = "rgba(203, 213, 225, 0.76)";
  ctx.font = "12px Pretendard, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  axisConfig.ticks.forEach((value) => {
    const ratio = (value - axisConfig.min) / (axisConfig.max - axisConfig.min || 1);
    const y = padding.top + chartHeight - ratio * chartHeight;
    ctx.fillText(formatTrendAxisTick(value), padding.left - 8, y);
  });

  ctx.restore();
}

function drawTrendXAxis(ctx, points, padding, chartHeight) {
  ctx.save();
  ctx.fillStyle = "rgba(203, 213, 225, 0.76)";
  ctx.font = "12px Pretendard, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const range = state.currentTrendRange;
  const maxLabelCount = window.innerWidth <= 900 ? 4 : 7;
  const step = range === "7" || range === "1"
    ? 1
    : Math.max(1, Math.ceil(points.length / maxLabelCount));

  points.forEach((point, index) => {
    const isLast = index === points.length - 1;
    if (index % step !== 0 && !isLast) return;
    ctx.fillText(formatShortDate(point.date), point.x, padding.top + chartHeight + 16);
  });

  ctx.restore();
}

function drawTrendBars(ctx, points, padding, chartHeight, progress, slotWidth) {
  ctx.save();
  const baseline = padding.top + chartHeight;
  const baseWidth = Number.isFinite(slotWidth) ? slotWidth : 86;
  const barWidth = Math.min(46, Math.max(18, baseWidth * 0.38));

  points.forEach((point) => {
    const animatedHeight = (baseline - point.y) * progress;
    const x = point.x - barWidth / 2;
    const y = baseline - animatedHeight;

    const gradient = ctx.createLinearGradient(0, y, 0, baseline);
    gradient.addColorStop(0, "rgba(163, 230, 53, 0.46)");
    gradient.addColorStop(1, "rgba(163, 230, 53, 0.08)");

    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, x, y, barWidth, animatedHeight, 9);
    ctx.fill();
  });

  ctx.restore();
}

function drawTrendLine(ctx, points, progress) {
  if (!points.length) return;

  ctx.save();
  ctx.strokeStyle = "#a3e635";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(163, 230, 53, 0.34)";
  ctx.shadowBlur = 10;

  const totalSegments = Math.max(points.length - 1, 1);
  const animatedLength = totalSegments * progress;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i += 1) {
    if (i <= Math.floor(animatedLength)) {
      ctx.lineTo(points[i].x, points[i].y);
    } else if (i === Math.floor(animatedLength) + 1) {
      const localProgress = animatedLength - Math.floor(animatedLength);
      const prev = points[i - 1];
      const next = points[i];
      const x = prev.x + (next.x - prev.x) * localProgress;
      const y = prev.y + (next.y - prev.y) * localProgress;
      ctx.lineTo(x, y);
      break;
    }
  }

  if (points.length === 1) {
    ctx.lineTo(points[0].x, points[0].y);
  }

  ctx.stroke();
  ctx.restore();
}

function drawTrendDots(ctx, points, progress) {
  ctx.save();

  points.forEach((point, index) => {
    const dotProgress = Math.max(0, Math.min(1, progress * points.length - index));
    if (dotProgress <= 0) return;

    ctx.beginPath();
    ctx.fillStyle = "#0b0f14";
    ctx.strokeStyle = "#a3e635";
    ctx.lineWidth = 3;
    ctx.arc(point.x, point.y, 5 * dotProgress, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  ctx.restore();
}


function getTrendExtremeInfo(points, metric) {
  if (!points.length) {
    return {
      maxPoint: null,
      minPoint: null,
      labelPoint: null,
    };
  }

  const maxPoint = points.reduce((best, point) => {
    if (!best) return point;
    if (point.value > best.value) return point;
    if (point.value === best.value && new Date(point.date) > new Date(best.date)) return point;
    return best;
  }, null);

  const minPoint = points.reduce((best, point) => {
    if (!best) return point;
    if (point.value < best.value) return point;
    if (point.value === best.value && new Date(point.date) > new Date(best.date)) return point;
    return best;
  }, null);

  const labelPoint = metric && metric.key === "restingHeartRate" ? minPoint : maxPoint;

  return {
    maxPoint,
    minPoint,
    labelPoint,
  };
}

function drawTrendExtremePulse(ctx, extremeInfo, pulse, progress) {
  if (!extremeInfo || progress < 0.98) return;

  const points = [extremeInfo.maxPoint, extremeInfo.minPoint]
    .filter(Boolean)
    .filter((point, index, arr) => arr.findIndex((item) => item.date === point.date && item.value === point.value) === index);

  if (!points.length) return;

  ctx.save();

  points.forEach((point) => {
    const radius = 9 + pulse * 9;
    const alpha = 0.18 + pulse * 0.42;

    ctx.beginPath();
    ctx.fillStyle = `rgba(163, 230, 53, ${alpha})`;
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = `rgba(163, 230, 53, ${0.55 + pulse * 0.35})`;
    ctx.lineWidth = 2;
    ctx.arc(point.x, point.y, 6 + pulse * 2, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.restore();
}

function drawTrendValueLabels(ctx, points, metric, extremeInfo, progress) {
  if (!points.length || progress < 0.94) return;

  const labelTargets = state.currentTrendRange === "1" || state.currentTrendRange === "7"
    ? points
    : extremeInfo && extremeInfo.labelPoint
      ? [extremeInfo.labelPoint]
      : [];

  if (!labelTargets.length) return;

  ctx.save();
  ctx.font = "800 12px Pretendard, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  labelTargets.forEach((point) => {
    drawTrendSingleValueLabel(ctx, point, metric);
  });

  ctx.restore();
}

function drawTrendSingleValueLabel(ctx, point, metric) {
  const label = formatTrendLabelValue(point.value, metric);
  const paddingX = 7;
  const boxHeight = 22;
  const textWidth = ctx.measureText(label).width;
  const boxWidth = textWidth + paddingX * 2;
  const canvasWidth = parseFloat(trendChart.style.width) || 720;

  let x = point.x;
  let y = point.y - 24;

  if (y < 18) {
    y = point.y + 24;
  }

  x = clamp(x, boxWidth / 2 + 4, canvasWidth - boxWidth / 2 - 4);

  ctx.save();
  ctx.shadowColor = "rgba(163, 230, 53, 0.32)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "rgba(11, 15, 20, 0.88)";
  ctx.strokeStyle = "rgba(163, 230, 53, 0.52)";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 11);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(label, x, y + 0.5);
  ctx.restore();
}

function formatTrendLabelValue(value, metric) {
  if (!Number.isFinite(value)) return "-";

  if (metric && metric.key === "totalSleepMin") {
    return `${Math.round(value)}분`;
  }

  if (metric && (metric.key === "deepSleepMin" || metric.key === "remSleepMin")) {
    return `${Math.round(value)}분`;
  }

  if (metric && metric.key === "avgPace") {
    return formatPaceSeconds(value);
  }

  const digits = metric && Number.isFinite(metric.digits) ? metric.digits : 1;
  const formatted = value.toLocaleString("ko-KR", {
    maximumFractionDigits: digits,
  });

  return metric && metric.unit ? `${formatted}${metric.unit}` : formatted;
}

function drawTrendEmpty(ctx, width, height) {
  ctx.save();
  ctx.fillStyle = "rgba(203, 213, 225, 0.8)";
  ctx.font = "800 15px Pretendard, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("표시할 기록이 없습니다.", width / 2, height / 2);
  ctx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const safeHeight = Math.max(0, height);
  const safeRadius = Math.min(radius, safeHeight / 2, width / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + safeHeight - safeRadius);
  ctx.quadraticCurveTo(x + width, y + safeHeight, x + width - safeRadius, y + safeHeight);
  ctx.lineTo(x + safeRadius, y + safeHeight);
  ctx.quadraticCurveTo(x, y + safeHeight, x, y + safeHeight - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}


function getTrendAxisConfig(metric) {
  const key = metric ? metric.key : "";

  if (key === "totalSleepMin") {
    return { min: 300, max: 500, ticks: [500, 450, 400, 350, 300], label: "300~500분", mode: "raw" };
  }

  if (key === "deepSleepMin" || key === "remSleepMin") {
    return { min: 0, max: 200, ticks: [200, 150, 100, 50, 0], label: "0~200분", mode: "raw" };
  }

  if (key === "deepSleepRatio" || key === "remSleepRatio") {
    return { min: 0, max: 50, ticks: [50, 40, 30, 20, 10, 0], label: "0~50%", mode: "raw" };
  }

  if (key === "restingHeartRate") {
    return { min: 40, max: 70, ticks: [70, 65, 60, 55, 50, 45, 40], label: "40~70bpm", mode: "raw" };
  }

  return { min: TREND_AXIS_MIN, max: TREND_AXIS_MAX, ticks: TREND_AXIS_TICKS, label: "50~100", mode: "score" };
}

function getTrendAxisDisplayValue(value, metric, axisConfig) {
  const raw = toNumber(value);

  if (!Number.isFinite(raw)) {
    return axisConfig.min;
  }

  if (axisConfig.mode === "raw") {
    return raw;
  }

  return getTrendAxisScore(raw, metric);
}

function formatTrendAxisTick(value) {
  if (!Number.isFinite(value)) return "-";

  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(/\.0$/, "");
}

function getTrendAxisScore(value, metric) {
  const raw = toNumber(value);

  if (!Number.isFinite(raw)) return TREND_AXIS_MIN;

  if (metric && metric.key === "totalSleepMin") {
    return scoreSleepDurationForAxis(raw);
  }

  if (metric && (metric.key === "deepSleepRatio" || metric.key === "remSleepRatio")) {
    return scoreRatioForAxis(raw, metric.key);
  }

  if (metric && (metric.key === "deepSleepMin" || metric.key === "remSleepMin")) {
    return normalizeToAxis(raw, 0, 120);
  }

  if (metric && metric.key === "restingHeartRate") {
    return normalizeToAxis(raw, 90, 50, true);
  }

  if (metric && (metric.key === "score" || metric.key === "sleepScore" || metric.key === "bodyBatteryScore")) {
    return clamp(raw, TREND_AXIS_MIN, TREND_AXIS_MAX);
  }

  if (metric && metric.key === "avgPace") {
    return normalizeToAxis(raw, 420, 300, true);
  }

  if (metric && metric.key === "avgHeartRate") {
    return normalizeToAxis(raw, 178, 130, true);
  }

  if (metric && metric.key === "maxHeartRate") {
    return normalizeToAxis(raw, 195, 150, true);
  }

  if (metric && metric.key === "cadence") {
    return scoreTargetRangeForAxis(raw, 165, 185, 145, 200);
  }

  if (metric && metric.key === "verticalRatio") {
    return normalizeToAxis(raw, 11, 7, true);
  }

  if (metric && metric.key === "groundContactTime") {
    return normalizeToAxis(raw, 310, 220, true);
  }

  const absoluteRange = getAbsoluteRangeForMetric(metric ? metric.key : "");
  return normalizeToAxis(raw, absoluteRange.min, absoluteRange.max, false);
}

function getAbsoluteRangeForMetric(key) {
  const ranges = {
    distanceKm: { min: 0, max: 10 },
    durationMin: { min: 0, max: 60 },
    calories: { min: 0, max: 700 },
    avgSpeed: { min: 6, max: 13 },
    strideLength: { min: 0.6, max: 1.3 },
  };

  return ranges[key] || { min: 0, max: 100 };
}

function normalizeToAxis(value, minValue, maxValue, inverse = false) {
  if (!Number.isFinite(value)) return TREND_AXIS_MIN;

  const low = Math.min(minValue, maxValue);
  const high = Math.max(minValue, maxValue);
  const safeRange = high - low || 1;
  const clipped = clamp(value, low, high);
  let ratio = (clipped - low) / safeRange;

  if (inverse) {
    ratio = 1 - ratio;
  }

  return TREND_AXIS_MIN + ratio * (TREND_AXIS_MAX - TREND_AXIS_MIN);
}

function scoreSleepDurationForAxis(minutes) {
  const hours = minutes / 60;

  if (hours >= 7 && hours <= 9) return 100;
  if (hours >= 6 && hours < 7) return normalizeToAxis(hours, 5, 7, false);
  if (hours > 9 && hours <= 10) return normalizeToAxis(hours, 10, 9, false);
  if (hours >= 5 && hours < 6) return normalizeToAxis(hours, 4, 6, false);

  return TREND_AXIS_MIN;
}

function scoreRatioForAxis(value, key) {
  if (key === "deepSleepRatio") {
    return scoreTargetRangeForAxis(value, 13, 23, 5, 32);
  }

  if (key === "remSleepRatio") {
    return scoreTargetRangeForAxis(value, 20, 25, 10, 35);
  }

  return normalizeToAxis(value, 0, 100);
}

function scoreTargetRangeForAxis(value, targetMin, targetMax, hardMin, hardMax) {
  if (!Number.isFinite(value)) return TREND_AXIS_MIN;

  if (value >= targetMin && value <= targetMax) {
    return TREND_AXIS_MAX;
  }

  if (value < targetMin) {
    return normalizeToAxis(value, hardMin, targetMin, false);
  }

  return normalizeToAxis(value, hardMax, targetMax, false);
}

function getCurrentTrendMetric() {
  const metrics = trendMetricConfig[state.currentTrendType] || [];
  return metrics.find((metric) => metric.key === state.currentTrendMetric) || metrics[0];
}

function formatTrendValue(value, metric) {
  if (!Number.isFinite(value)) return "-";

  if (metric.formatter) {
    return metric.formatter(value);
  }

  const formatted = value.toLocaleString("ko-KR", {
    maximumFractionDigits: metric.digits ?? 1,
  });

  return metric.unit ? `${formatted}${metric.unit}` : formatted;
}

function formatTrendAxisValue(value) {
  if (!Number.isFinite(value)) return "-";

  if (Math.abs(value) >= 1000) {
    return Math.round(value).toLocaleString("ko-KR");
  }

  if (Math.abs(value) >= 100) {
    return value.toFixed(0);
  }

  if (Math.abs(value) >= 10) {
    return value.toFixed(1).replace(/\.0$/, "");
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatPaceSeconds(seconds) {
  const total = Math.round(toNumber(seconds));
  if (total <= 0) return "-";

  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function getTrendRangeLabel() {
  if (state.currentTrendRange === "all") return "전체 추이";
  return `${state.currentTrendRange}일 추이`;
}

function formatShortDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function debounce(callback, delay) {
  let timer = null;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isScoreInRange(value) {
  if (value === 0) return true;
  return value >= 0 && value <= 100;
}

function getRatio(part, total) {
  if (!total || total <= 0) return 0;
  return (part / total) * 100;
}

function sum(records, key) {
  return records.reduce((acc, record) => acc + toNumber(record[key]), 0);
}

function avg(records, key) {
  const values = records
    .map((record) => toNumber(record[key]))
    .filter((value) => value > 0);

  if (values.length === 0) return 0;

  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function formatNumber(value, digits = 1) {
  const number = toNumber(value);

  if (number === 0) return "0";

  return number.toLocaleString("ko-KR", {
    maximumFractionDigits: digits,
  });
}

function formatNullableScore(value) {
  const number = toNumber(value);

  if (number <= 0) return "-";

  return `${formatNumber(number, 0)}점`;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDuration(minutes) {
  const total = Math.round(toNumber(minutes));

  if (total <= 0) return "0분";

  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours <= 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;

  return `${hours}시간 ${mins}분`;
}

function paceToSeconds(pace) {
  if (!pace || typeof pace !== "string") return 0;

  const normalized = pace.trim();

  if (!normalized.includes(":")) return 0;

  const [min, sec] = normalized.split(":").map(Number);

  if (!Number.isFinite(min) || !Number.isFinite(sec)) return 0;
  if (min < 0 || sec < 0 || sec >= 60) return 0;

  return min * 60 + sec;
}

function calculateAveragePace(records) {
  const validRecords = records.filter(
    (record) => record.distanceKm > 0 && record.durationMin > 0
  );

  if (validRecords.length === 0) return "-";

  const totalDistance = sum(validRecords, "distanceKm");
  const totalMinutes = sum(validRecords, "durationMin");

  if (totalDistance <= 0) return "-";

  const paceMin = totalMinutes / totalDistance;
  const minutes = Math.floor(paceMin);
  const seconds = Math.round((paceMin - minutes) * 60);

  if (seconds === 60) {
    return `${minutes + 1}:00`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getScoreLabel(score) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Normal";
  if (score >= 60) return "Caution";
  return "Poor";
}

function setTextAll(elements, value) {
  elements.forEach((element) => {
    element.textContent = value;
  });
}

function sanitizeText(value) {
  if (!value) return "";

  return String(value)
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .trim();
}

function setTodayDefaults() {
  const today = new Date().toISOString().slice(0, 10);

  const runDate = $("#runDate");
  const sleepDate = $("#sleepDate");

  if (runDate && !runDate.value) {
    runDate.value = today;
  }

  if (sleepDate && !sleepDate.value) {
    sleepDate.value = today;
  }
}

function scrollToCurrentView() {
  const targetPanel = $(`[data-view-panel="${state.currentView}"]`);

  if (!targetPanel) return;

  targetPanel.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function filterRecentDays(records, days) {
  const now = new Date();
  const start = new Date();

  start.setDate(now.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  return records.filter((record) => {
    const date = new Date(record.date);
    if (Number.isNaN(date.getTime())) return false;

    return date >= start && date <= now;
  });
}

function sortRecords() {
  state.records.running.sort((a, b) => new Date(b.date) - new Date(a.date));
  state.records.sleep.sort((a, b) => new Date(b.date) - new Date(a.date));
}

window.deleteRunningRecord = deleteRunningRecord;
window.deleteSleepRecord = deleteSleepRecord;
window.startRunningEdit = startRunningEdit;
window.startSleepEdit = startSleepEdit;
