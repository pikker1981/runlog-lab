const SUPABASE_URL = "https://snpdddkwtqmihhtfentt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucGRkZGt3dHFtaWhodGZlbnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjI5NjgsImV4cCI6MjA5MzMzODk2OH0.bO9ttF6D1OeNmpuENIzMh0Urv3LOIJYlyg-IdexjUjQ";

const STORAGE_KEY = "runlog_lab_records_v1";

const TREND_AXIS_MIN = 50;
const TREND_AXIS_MAX = 100;
const TREND_AXIS_TICKS = [100, 90, 80, 70, 60, 50];
const TREND_HIGHLIGHT_RGB = "204, 255, 0";
const TREND_HIGHLIGHT_HEX = "#ccff00";
const TREND_MAX_HEX = "#00ffc2";
const TREND_MAX_RGB = "0, 255, 194";
const TREND_MIN_HEX = "#ff3d7f";
const TREND_MIN_RGB = "255, 61, 127";
const TREND_GRID_RGBA = "rgba(255, 255, 255, 0.06)";
const TREND_GRID_STRONG_RGBA = "rgba(255, 255, 255, 0.16)";
const TREND_AXIS_TEXT_RGBA = "rgba(255, 255, 255, 0.52)";


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
  currentTrendRange: "7",
  currentHistoryPage: 1,
  historyDatesPerPage: 5,
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
let trendRenderedPoints = [];
let trendHoverPointKey = null;


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
    state.currentHistoryPage = 1;
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
    state.currentHistoryPage = 1;
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
  const breakdown = calculateSleepScoreBreakdown(record);
  const score = 100 + breakdown.totalImpact;

  return clamp(Math.round(score), 0, 100);
}



function getHighScoreBonus(value) {
  const score = toNumber(value);

  if (score >= 95) return 4;
  if (score >= 90) return 3;
  if (score >= 85) return 2;
  if (score >= 80) return 1;

  return 0;
}

function calculateSleepScoreBreakdown(record) {
  const totalHours = record.totalSleepMin / 60;

  let totalSleepPenalty = 0;
  let deepSleepPenalty = 0;
  let remSleepPenalty = 0;
  let restingHeartRatePenalty = 0;

  let totalSleepBonus = 0;
  let deepSleepBonus = 0;
  let remSleepBonus = 0;
  let restingHeartRateBonus = 0;
  const sleepScoreBonus = getHighScoreBonus(record.sleepScore);
  const bodyBatteryBonus = getHighScoreBonus(record.bodyBatteryScore);

  if (totalHours >= 7 && totalHours <= 9) {
    totalSleepPenalty = 0;
    totalSleepBonus = totalHours >= 7.5 && totalHours <= 8.5 ? 8 : 5;
  } else if (totalHours >= 6 && totalHours < 7) totalSleepPenalty = 10;
  else if (totalHours > 9 && totalHours <= 10) totalSleepPenalty = 8;
  else if (totalHours >= 5 && totalHours < 6) totalSleepPenalty = 22;
  else totalSleepPenalty = 35;

  if (record.deepSleepRatio >= 13 && record.deepSleepRatio <= 23) {
    deepSleepPenalty = 0;
    deepSleepBonus = record.deepSleepRatio >= 15 && record.deepSleepRatio <= 21 ? 5 : 3;
  } else if (record.deepSleepRatio >= 10 && record.deepSleepRatio < 13) deepSleepPenalty = 8;
  else if (record.deepSleepRatio > 23 && record.deepSleepRatio <= 28) deepSleepPenalty = 6;
  else deepSleepPenalty = 16;

  if (record.remSleepRatio >= 20 && record.remSleepRatio <= 25) {
    remSleepPenalty = 0;
    remSleepBonus = record.remSleepRatio >= 21 && record.remSleepRatio <= 24 ? 5 : 3;
  } else if (record.remSleepRatio >= 16 && record.remSleepRatio < 20) remSleepPenalty = 8;
  else if (record.remSleepRatio > 25 && record.remSleepRatio <= 30) remSleepPenalty = 6;
  else remSleepPenalty = 16;

  if (record.restingHeartRate > 0) {
    if (record.restingHeartRate <= 55) {
      restingHeartRatePenalty = 0;
      restingHeartRateBonus = 5;
    } else if (record.restingHeartRate <= 60) {
      restingHeartRatePenalty = 0;
      restingHeartRateBonus = 2;
    } else if (record.restingHeartRate <= 70) restingHeartRatePenalty = 6;
    else if (record.restingHeartRate <= 80) restingHeartRatePenalty = 12;
    else restingHeartRatePenalty = 20;
  }

  const totalPenalty =
    totalSleepPenalty +
    deepSleepPenalty +
    remSleepPenalty +
    restingHeartRatePenalty;

  const totalBonus =
    totalSleepBonus +
    deepSleepBonus +
    remSleepBonus +
    restingHeartRateBonus +
    sleepScoreBonus +
    bodyBatteryBonus;

  return {
    totalSleepPenalty,
    deepSleepPenalty,
    remSleepPenalty,
    restingHeartRatePenalty,
    totalSleepBonus,
    deepSleepBonus,
    remSleepBonus,
    restingHeartRateBonus,
    sleepScoreBonus,
    bodyBatteryBonus,
    totalPenalty,
    totalBonus,
    totalImpact: totalBonus - totalPenalty,
  };
}

function getSleepScoreImpact(penalty, bonus) {
  const penaltyValue = toNumber(penalty);
  const bonusValue = toNumber(bonus);

  if (penaltyValue > 0) {
    return -penaltyValue;
  }

  if (bonusValue > 0) {
    return bonusValue;
  }

  return 0;
}

function formatSleepScoreImpactBadge(value) {
  const impact = toNumber(value);

  if (impact > 0) {
    return `<span class="score-reason score-reason-bonus">+${formatNumber(impact, 0)}</span>`;
  }

  if (impact < 0) {
    return `<span class="score-reason score-reason-penalty">${formatNumber(impact, 0)}</span>`;
  }

  return '<span class="score-reason score-reason-neutral">0</span>';
}

function formatSleepValueWithReason(value, penalty, bonus = 0) {
  const impact = getSleepScoreImpact(penalty, bonus);

  return `
    <span class="sleep-value-with-reason">
      <span>${value}</span>
      ${formatSleepScoreImpactBadge(impact)}
    </span>
  `;
}


function render() {
  sortRecords();
  normalizeHistoryPage();
  renderViewTabs();
  renderRecordTabs();
  renderRunningTable();
  renderSleepTable();
  renderHistoryPagination();
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

  const allRecords = state.records.running;
  const records = filterRecordsByCurrentHistoryPage(allRecords);

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
    emptyRunning.classList.toggle("hide", allRecords.length > 0);
  }
}

function renderSleepTable() {
  if (!sleepTableBody) return;

  const allRecords = state.records.sleep;
  const records = filterRecordsByCurrentHistoryPage(allRecords);

  sleepTableBody.innerHTML = records
    .map((record) => {
      const scoreReason = calculateSleepScoreBreakdown(record);

      return `
        <tr>
          <td><strong>${formatDate(record.date)}</strong></td>
          <td>${formatSleepValueWithReason(formatDuration(record.totalSleepMin), scoreReason.totalSleepPenalty, scoreReason.totalSleepBonus)}</td>
          <td>${formatSleepValueWithReason(formatNullableScore(record.sleepScore), 0, scoreReason.sleepScoreBonus)}</td>
          <td>${formatSleepValueWithReason(formatNullableScore(record.bodyBatteryScore), 0, scoreReason.bodyBatteryBonus)}</td>
          <td>${formatSleepValueWithReason(`${formatNumber(record.deepSleepRatio, 1)}%`, scoreReason.deepSleepPenalty, scoreReason.deepSleepBonus)}</td>
          <td>${formatSleepValueWithReason(`${formatNumber(record.remSleepRatio, 1)}%`, scoreReason.remSleepPenalty, scoreReason.remSleepBonus)}</td>
          <td>${formatSleepValueWithReason(`${formatNumber(record.restingHeartRate, 0)} bpm`, scoreReason.restingHeartRatePenalty, scoreReason.restingHeartRateBonus)}</td>
          <td>
            <span class="app-score-with-reason">
              <strong>${calculateSleepScore(record)}</strong>
              ${formatSleepScoreImpactBadge(scoreReason.totalImpact)}
            </span>
          </td>
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
    emptySleep.classList.toggle("hide", allRecords.length > 0);
  }
}


function getAllHistoryDates() {
  const dates = [
    ...state.records.running.map((record) => record.date),
    ...state.records.sleep.map((record) => record.date),
  ]
    .filter(Boolean)
    .map((date) => String(date).slice(0, 10));

  return Array.from(new Set(dates)).sort((a, b) => new Date(b) - new Date(a));
}

function getHistoryPageInfo() {
  const dates = getAllHistoryDates();
  const perPage = state.historyDatesPerPage || 5;
  const totalPages = Math.max(1, Math.ceil(dates.length / perPage));
  const currentPage = clamp(state.currentHistoryPage || 1, 1, totalPages);
  const startIndex = (currentPage - 1) * perPage;
  const pageDates = dates.slice(startIndex, startIndex + perPage);

  return {
    dates,
    pageDates,
    currentPage,
    totalPages,
    startIndex,
    endIndex: Math.min(startIndex + perPage, dates.length),
    totalDates: dates.length,
  };
}

function normalizeHistoryPage() {
  const info = getHistoryPageInfo();
  state.currentHistoryPage = info.currentPage;
}

function filterRecordsByCurrentHistoryPage(records) {
  const info = getHistoryPageInfo();

  if (!info.pageDates.length) {
    return [];
  }

  const pageDateSet = new Set(info.pageDates);

  return records.filter((record) => {
    const dateKey = record.date ? String(record.date).slice(0, 10) : "";
    return pageDateSet.has(dateKey);
  });
}

function ensureHistoryPaginationElement() {
  let pagination = $("#historyPagination");

  if (pagination) {
    return pagination;
  }

  const grid = $("#history .dashboard-grid");

  if (!grid) {
    return null;
  }

  pagination = document.createElement("div");
  pagination.id = "historyPagination";
  pagination.className = "history-pagination card card-full";
  grid.appendChild(pagination);

  return pagination;
}

function renderHistoryPagination() {
  const pagination = ensureHistoryPaginationElement();

  if (!pagination) {
    return;
  }

  const info = getHistoryPageInfo();

  if (info.totalDates <= state.historyDatesPerPage) {
    pagination.classList.add("hide");
    pagination.innerHTML = "";
    return;
  }

  pagination.classList.remove("hide");

  const firstDate = info.pageDates[0] ? formatDate(info.pageDates[0]) : "-";
  const lastDate = info.pageDates[info.pageDates.length - 1]
    ? formatDate(info.pageDates[info.pageDates.length - 1])
    : "-";

  pagination.innerHTML = `
    <div class="history-pagination-inner">
      <div class="history-pagination-copy">
        <div class="history-pagination-title">기록 페이지</div>
        <div class="history-pagination-desc">
          날짜 ${info.startIndex + 1}–${info.endIndex} / 총 ${info.totalDates}일 · ${firstDate} ~ ${lastDate}
        </div>
      </div>

      <div class="history-pagination-actions">
        <button
          type="button"
          class="btn btn-secondary"
          data-history-page-action="prev"
          ${info.currentPage <= 1 ? "disabled" : ""}
        >
          이전
        </button>

        <span class="history-page-indicator">
          ${info.currentPage} / ${info.totalPages}
        </span>

        <button
          type="button"
          class="btn btn-primary"
          data-history-page-action="next"
          ${info.currentPage >= info.totalPages ? "disabled" : ""}
        >
          다음
        </button>
      </div>
    </div>
  `;

  pagination
    .querySelectorAll("[data-history-page-action]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.historyPageAction;
        const latestInfo = getHistoryPageInfo();

        if (action === "prev") {
          state.currentHistoryPage = Math.max(1, latestInfo.currentPage - 1);
        }

        if (action === "next") {
          state.currentHistoryPage = Math.min(
            latestInfo.totalPages,
            latestInfo.currentPage + 1
          );
        }

        renderRunningTable();
        renderSleepTable();
        renderHistoryPagination();
      });
    });
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

  const latestAppScore = latest.type === "sleep" ? calculateSleepScore(latest) : latest.score;

  latestScoreValue.textContent = latestAppScore;
  latestScoreLabel.textContent = getScoreLabel(latestAppScore);

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
    state.currentHistoryPage = 1;

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

  if (trendChart) {
    trendChart.addEventListener("mousemove", handleTrendChartPointerMove);
    trendChart.addEventListener("mouseleave", clearTrendChartHover);
    trendChart.addEventListener("touchstart", handleTrendChartPointerMove, { passive: true });
    trendChart.addEventListener("touchmove", handleTrendChartPointerMove, { passive: true });
    trendChart.addEventListener("touchend", clearTrendChartHover);
  }

  window.addEventListener("resize", debounce(renderTrendChart, 160));
}

function handleTrendChartPointerMove(event) {
  if (!trendChart || !trendRenderedPoints.length) return;

  const pointer = getTrendPointerPosition(event);
  if (!pointer) return;

  const nearest = findNearestTrendPoint(pointer.x, pointer.y);
  const nextKey = nearest ? getTrendPointKey(nearest) : null;

  if (trendHoverPointKey !== nextKey) {
    trendHoverPointKey = nextKey;
  }
}

function clearTrendChartHover() {
  trendHoverPointKey = null;
}

function getTrendPointerPosition(event) {
  const source = event.touches && event.touches.length ? event.touches[0] : event;
  if (!source || typeof source.clientX !== "number" || typeof source.clientY !== "number") {
    return null;
  }

  const rect = trendChart.getBoundingClientRect();

  return {
    x: source.clientX - rect.left,
    y: source.clientY - rect.top,
  };
}

function findNearestTrendPoint(x, y) {
  let nearest = null;
  let nearestDistance = Infinity;

  trendRenderedPoints.forEach((point) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;

    const dx = point.x - x;
    const dy = point.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  });

  return nearestDistance <= 34 ? nearest : null;
}

function getTrendPointKey(point) {
  if (!point) return "";
  return `${point.date}|${point.value}|${point.x}`;
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
  if (state.currentTrendType === "sleep" && metric && metric.key === "score") {
    return calculateSleepScore(record);
  }

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
    const chartType = state.currentTrendRange === "7" || state.currentTrendRange === "14"
      ? "네온 막대 + 라인"
      : "네온 라인";
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
  const duration = 1100;

  function frame(now) {
    const progress = Math.min((now - startedAt) / duration, 1);

    // 진입이 끝난 뒤에도 트래블링 스파크와 극값 글로우가 호흡하도록 프레임을 계속 돌린다.
    drawTrendChart(data, progress, now);
    trendAnimationFrameId = requestAnimationFrame(frame);
  }

  trendAnimationFrameId = requestAnimationFrame(frame);
}

function drawTrendChart(data, progress, now) {
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
    trendRenderedPoints = [];
    trendHoverPointKey = null;
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

  trendRenderedPoints = validPoints.map((point) => ({ ...point }));

  const extremeInfo = getTrendExtremeInfo(validPoints, metric);

  // 진입 애니메이션 페이즈 분할
  const lineT = easeInOutCubic(clamp(progress / 0.55, 0, 1));
  const areaT = easeOutCubic(clamp((progress - 0.2) / 0.5, 0, 1));
  const dotsT = clamp((progress - 0.45) / 0.5, 0, 1);
  const barsT = easeOutCubic(clamp((progress - 0.15) / 0.55, 0, 1));
  const labelGate = progress >= 0.86;
  const breath = 0.5 + Math.sin(now / 820) * 0.5;
  const showBars = state.currentTrendRange === "7" || state.currentTrendRange === "14";

  if (showBars) {
    drawTrendBars(ctx, validPoints, padding, chartHeight, barsT, slotWidth, extremeInfo);
  } else {
    drawTrendArea(ctx, validPoints, areaT, padding, chartHeight);
  }
  drawTrendLine(ctx, validPoints, lineT);
  drawTrendDots(ctx, validPoints, dotsT, extremeInfo);
  drawTrendExtremePulse(ctx, extremeInfo, breath, progress);
  drawTrendTravelingSpark(ctx, validPoints, progress, now);

  if (labelGate) {
    drawTrendValueLabels(ctx, validPoints, metric, extremeInfo, progress);
  }

  drawTrendHoverValueLabel(ctx, validPoints, metric, extremeInfo);
}

function getTrendPointVariant(point, extremeInfo) {
  if (!point || !extremeInfo) return "default";
  const same = (a, b) => !!a && !!b && a.date === b.date && a.value === b.value;
  if (same(point, extremeInfo.maxPoint)) return "max";
  if (same(point, extremeInfo.minPoint)) return "min";
  return "default";
}

function getTrendAccentPalette(variant) {
  if (variant === "max") return { hex: TREND_MAX_HEX, rgb: TREND_MAX_RGB };
  if (variant === "min") return { hex: TREND_MIN_HEX, rgb: TREND_MIN_RGB };
  return { hex: TREND_HIGHLIGHT_HEX, rgb: TREND_HIGHLIGHT_RGB };
}

function drawTrendGrid(ctx, padding, chartWidth, chartHeight, axisConfig) {
  ctx.save();
  ctx.strokeStyle = TREND_GRID_RGBA;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 6]);

  axisConfig.ticks.forEach((value) => {
    const ratio = (value - axisConfig.min) / (axisConfig.max - axisConfig.min || 1);
    const y = padding.top + chartHeight - ratio * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();
  });

  ctx.setLineDash([]);
  ctx.strokeStyle = TREND_GRID_STRONG_RGBA;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.stroke();
  ctx.restore();
}

function drawTrendYAxis(ctx, padding, chartHeight, axisConfig) {
  ctx.save();
  ctx.fillStyle = TREND_AXIS_TEXT_RGBA;
  ctx.font = "12px \"Pretendard Variable\", Pretendard, system-ui, sans-serif";
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
  ctx.fillStyle = TREND_AXIS_TEXT_RGBA;
  ctx.font = "12px \"Pretendard Variable\", Pretendard, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const range = state.currentTrendRange;
  const maxLabelCount = window.innerWidth <= 900 ? 4 : 7;
  // 7일은 그대로 모두 표기. 14일·이상은 폭에 맞춰 자동 솎아냄.
  const step = range === "7"
    ? 1
    : Math.max(1, Math.ceil(points.length / maxLabelCount));

  const lastIndex = points.length - 1;
  const lastStepIndex = Math.floor(lastIndex / step) * step;
  // 마지막 라벨이 직전 step 라벨과 step/2 이상 떨어졌을 때만 별도 표기 (인접 충돌 방지)
  const showLast = (lastIndex - lastStepIndex) >= Math.ceil(step / 2);

  points.forEach((point, index) => {
    const onStep = index % step === 0;
    const isLast = index === lastIndex;
    if (!onStep && !(isLast && showLast)) return;
    ctx.fillText(formatShortDate(point.date), point.x, padding.top + chartHeight + 16);
  });

  ctx.restore();
}

function drawTrendBars(ctx, points, padding, chartHeight, progress, slotWidth, extremeInfo) {
  if (!points.length || progress <= 0) return;

  const baseline = padding.top + chartHeight;
  const isMobile = window.innerWidth <= 900;
  const baseWidth = Number.isFinite(slotWidth) ? slotWidth : 60;
  const maxBarWidth = isMobile ? 22 : 32;
  const barWidth = Math.min(maxBarWidth, Math.max(10, baseWidth * 0.38));
  const radius = Math.min(7, barWidth / 2);

  ctx.save();

  points.forEach((point, index) => {
    // 좌 → 우 웨이브로 차오르는 스태거
    const stagger = points.length > 1 ? index / (points.length - 1) : 0;
    const startAt = stagger * 0.4;
    const localT = clamp((progress - startAt) / 0.6, 0, 1);
    if (localT <= 0) return;

    const eased = easeOutCubic(localT);
    const fullHeight = baseline - point.y;
    const animatedHeight = fullHeight * eased;
    if (animatedHeight <= 0.5) return;

    const x = point.x - barWidth / 2;
    const y = baseline - animatedHeight;

    const variant = getTrendPointVariant(point, extremeInfo);
    const palette = getTrendAccentPalette(variant);
    const isExtreme = variant !== "default";
    const topAlpha = isExtreme ? 0.4 : 0.3;

    // 1) 본체 그라디언트 — 위는 형광, 아래는 거의 투명 (LED 튈브에 빛이 차오르는 느낌)
    const bodyGrad = ctx.createLinearGradient(0, y, 0, baseline);
    bodyGrad.addColorStop(0, `rgba(${palette.rgb}, ${topAlpha * localT})`);
    bodyGrad.addColorStop(0.45, `rgba(${palette.rgb}, ${0.14 * localT})`);
    bodyGrad.addColorStop(1, `rgba(${palette.rgb}, 0)`);

    ctx.fillStyle = bodyGrad;
    drawTopRoundedRect(ctx, x, y, barWidth, animatedHeight, radius);
    ctx.fill();

    // 2) 좌측 글래스 시인 — 에지에 언딛 흔 광택
    const sheenGrad = ctx.createLinearGradient(x, 0, x + barWidth, 0);
    sheenGrad.addColorStop(0, `rgba(255, 255, 255, ${0.1 * localT})`);
    sheenGrad.addColorStop(0.35, "rgba(255, 255, 255, 0)");
    sheenGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sheenGrad;
    drawTopRoundedRect(ctx, x, y, barWidth, animatedHeight, radius);
    ctx.fill();

    // 3) 상단 형광 캡 — LED 튜브 윗자리 글로우
    if (animatedHeight > 4) {
      ctx.save();
      ctx.shadowColor = `rgba(${palette.rgb}, 0.9)`;
      ctx.shadowBlur = isExtreme ? 14 : 10;
      ctx.globalAlpha = localT;
      ctx.fillStyle = palette.hex;
      drawRoundedRect(ctx, x, y - 0.6, barWidth, 2.4, 1.2);
      ctx.fill();
      ctx.restore();
    }
  });

  ctx.restore();
}

function drawTrendLine(ctx, points, progress) {
  if (!points.length || points.length < 2 || progress <= 0) return;

  // 전체 경로 길이 계산 → lineDashOffset 기반 스무스 리빌
  let totalLen = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    totalLen += Math.sqrt(dx * dx + dy * dy);
  }
  if (totalLen <= 0) return;

  ctx.save();
  ctx.strokeStyle = TREND_HIGHLIGHT_HEX;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = `rgba(${TREND_HIGHLIGHT_RGB}, 0.55)`;
  ctx.shadowBlur = 18;

  ctx.setLineDash([totalLen, totalLen]);
  ctx.lineDashOffset = totalLen * (1 - progress);

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.restore();
}

function drawTrendDots(ctx, points, progress, extremeInfo) {
  if (!points.length || progress <= 0) return;

  ctx.save();

  points.forEach((point, index) => {
    // 각 포인트가 순차적으로 스프링 바운스(overshoot) 하며 팝인
    const stagger = points.length > 1 ? index / (points.length - 1) : 0;
    const startAt = stagger * 0.75;
    const localT = clamp((progress - startAt) / 0.25, 0, 1);
    if (localT <= 0) return;

    const eased = easeOutBack(localT);
    const variant = getTrendPointVariant(point, extremeInfo);
    const palette = getTrendAccentPalette(variant);
    const isExtreme = variant !== "default";
    const baseR = Math.max(0, 5 * eased);
    const r = isExtreme ? baseR * 1.18 : baseR;

    // 외곽 형광 헤일로
    ctx.beginPath();
    ctx.fillStyle = `rgba(${palette.rgb}, ${(isExtreme ? 0.3 : 0.22) * localT})`;
    ctx.arc(point.x, point.y, r + (isExtreme ? 8 : 6), 0, Math.PI * 2);
    ctx.fill();

    // 네온 링
    ctx.shadowColor = `rgba(${palette.rgb}, 0.9)`;
    ctx.shadowBlur = isExtreme ? 20 : 14;
    ctx.beginPath();
    ctx.fillStyle = palette.hex;
    ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
    ctx.fill();

    // 흰 코어 LED
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.arc(point.x, point.y, Math.max(1.2, r * 0.42), 0, Math.PI * 2);
    ctx.fill();
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

function drawTrendExtremePulse(ctx, extremeInfo, breath, progress) {
  if (!extremeInfo || progress < 0.85) return;

  const entries = [
    { point: extremeInfo.maxPoint, variant: "max" },
    { point: extremeInfo.minPoint, variant: "min" },
  ].filter((e) => e.point);

  if (!entries.length) return;

  // max === min 인 단일 포인트 시나리오 중복 제거
  const seen = new Set();
  const unique = entries.filter((e) => {
    const k = `${e.point.date}|${e.point.value}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  ctx.save();

  unique.forEach(({ point, variant }) => {
    // 숨쉬는 듯한 스테디 글로우 — max/min 에 따라 다른 형광 색 적용
    const palette = getTrendAccentPalette(variant);
    const radius = 13 + breath * 5;
    const alpha = 0.16 + breath * 0.2;

    ctx.beginPath();
    ctx.fillStyle = `rgba(${palette.rgb}, ${alpha})`;
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawTrendValueLabels(ctx, points, metric, extremeInfo, progress) {
  if (!points.length || progress < 0.86) return;

  const labelTargets = getTrendValueLabelTargets(points, extremeInfo);

  if (!labelTargets.length) return;

  ctx.save();
  ctx.font = "800 12px \"Pretendard Variable\", Pretendard, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  labelTargets.forEach((point) => {
    const variant = getTrendPointVariant(point, extremeInfo);
    drawTrendSingleValueLabel(ctx, point, metric, false, variant);
  });

  ctx.restore();
}

function getTrendValueLabelTargets(points, extremeInfo) {
  if (state.currentTrendRange === "7" || state.currentTrendRange === "14") {
    return points;
  }

  if (!extremeInfo) return [];

  return [extremeInfo.maxPoint, extremeInfo.minPoint]
    .filter(Boolean)
    .filter((point, index, arr) => {
      return arr.findIndex((item) => {
        return item.date === point.date && item.value === point.value;
      }) === index;
    });
}

function drawTrendSingleValueLabel(ctx, point, metric, isHover = false, variant = "default") {
  const palette = getTrendAccentPalette(variant);
  const label = formatTrendLabelValue(point.value, metric);
  const paddingX = 8;
  const boxHeight = 22;
  const textWidth = ctx.measureText(label).width;
  const boxWidth = textWidth + paddingX * 2;
  const canvasWidth = parseFloat(trendChart.style.width) || 720;

  let x = point.x;
  let y = point.y - (isHover ? 32 : 24);

  if (y < 18) {
    y = point.y + 26;
  }

  x = clamp(x, boxWidth / 2 + 4, canvasWidth - boxWidth / 2 - 4);

  ctx.save();

  if (isHover) {
    // 호버: 블랙 필 + 변신별 네온 보더 + 네온 텍스트 (강조 대비)
    ctx.shadowColor = `rgba(${palette.rgb}, 0.6)`;
    ctx.shadowBlur = 14;
    ctx.fillStyle = "rgba(10, 10, 10, 0.96)";
    ctx.strokeStyle = palette.hex;
    ctx.lineWidth = 1.2;
    drawRoundedRect(ctx, x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 11);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = palette.hex;
  } else {
    // 고정 레이블: 네온 필 + 블랙 텍스트 (시그니처 배지 느낌)
    ctx.shadowColor = `rgba(${palette.rgb}, 0.55)`;
    ctx.shadowBlur = 16;
    ctx.fillStyle = palette.hex;
    drawRoundedRect(ctx, x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 11);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0a0a0a";
  }

  ctx.fillText(label, x, y + 0.5);
  ctx.restore();
}

function drawTrendHoverValueLabel(ctx, points, metric, extremeInfo) {
  if (!trendHoverPointKey || !points.length) return;

  const target = points.find((point) => getTrendPointKey(point) === trendHoverPointKey);
  if (!target) return;

  const info = extremeInfo || getTrendExtremeInfo(points, metric);
  const fixedTargets = getTrendValueLabelTargets(points, info);
  const isAlreadyFixed = fixedTargets.some((point) => getTrendPointKey(point) === trendHoverPointKey);

  if (isAlreadyFixed) return;

  ctx.save();
  ctx.font = "850 12px \"Pretendard Variable\", Pretendard, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const variant = getTrendPointVariant(target, info);
  drawTrendSingleValueLabel(ctx, target, metric, true, variant);

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
  ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
  ctx.font = "600 15px \"Pretendard Variable\", Pretendard, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("표시할 기록이 없습니다.", width / 2, height / 2);
  ctx.restore();
}

function drawTrendArea(ctx, points, progress, padding, chartHeight) {
  if (points.length < 2 || progress <= 0) return;

  const baseline = padding.top + chartHeight;
  const topY = Math.min(...points.map((p) => p.y));

  const gradient = ctx.createLinearGradient(0, topY, 0, baseline);
  gradient.addColorStop(0, `rgba(${TREND_HIGHLIGHT_RGB}, ${0.34 * progress})`);
  gradient.addColorStop(1, `rgba(${TREND_HIGHLIGHT_RGB}, 0)`);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(points[0].x, baseline);
  points.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, baseline);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTrendTravelingSpark(ctx, points, progress, now) {
  // 진입 애니메이션이 끝난 뒤, 라인을 따라 무한히 흐르는 형광 스파크
  if (progress < 1 || points.length < 2) return;

  const segLens = [];
  let totalLen = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const l = Math.sqrt(dx * dx + dy * dy);
    segLens.push(l);
    totalLen += l;
  }
  if (totalLen <= 0) return;

  const cycle = 2600;
  const t = (now % cycle) / cycle;
  const target = t * totalLen;

  let acc = 0;
  let sx = points[0].x;
  let sy = points[0].y;
  for (let i = 0; i < segLens.length; i += 1) {
    if (acc + segLens[i] >= target) {
      const localT = segLens[i] > 0 ? (target - acc) / segLens[i] : 0;
      sx = points[i].x + (points[i + 1].x - points[i].x) * localT;
      sy = points[i].y + (points[i + 1].y - points[i].y) * localT;
      break;
    }
    acc += segLens[i];
  }

  // 루프 시작/끝에서 부드럽게 페이드
  const edge = Math.min(t, 1 - t);
  const edgeFade = edge < 0.06 ? edge / 0.06 : 1;

  ctx.save();

  // 외곽 네온 오라
  ctx.fillStyle = `rgba(${TREND_HIGHLIGHT_RGB}, ${0.28 * edgeFade})`;
  ctx.beginPath();
  ctx.arc(sx, sy, 12, 0, Math.PI * 2);
  ctx.fill();

  // 중심 흰 코어 + 강한 글로우
  ctx.shadowColor = `rgba(${TREND_HIGHLIGHT_RGB}, 0.95)`;
  ctx.shadowBlur = 22;
  ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * edgeFade})`;
  ctx.beginPath();
  ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
  ctx.fill();

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

function drawTopRoundedRect(ctx, x, y, width, height, radius) {
  const safeHeight = Math.max(0, height);
  const r = Math.min(radius, safeHeight, width / 2);

  ctx.beginPath();
  ctx.moveTo(x, y + safeHeight);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + safeHeight);
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

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function easeOutBack(value) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
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
