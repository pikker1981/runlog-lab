/* =========================
   RunLog Lab - script.js
   Feature Update:
   - View Tabs
   - Record Tabs
   - Edit
   - Weekly / Monthly Summary
   ========================= */

const STORAGE_KEY = "runlog_lab_records_v1";

const state = {
  records: loadRecords(),
  currentView: "dashboard",
  currentTab: "running",
};

/* =========================
   DOM
   ========================= */

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

const latestScoreValue = $("#latestScoreValue");
const latestScoreLabel = $("#latestScoreLabel");
const latestDate = $("#latestDate");

const weeklyRunDistance = $("#weeklyRunDistance");
const monthlyRunDistance = $("#monthlyRunDistance");
const weeklySleepTime = $("#weeklySleepTime");
const monthlySleepScore = $("#monthlySleepScore");

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

/* =========================
   Init
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  setTodayDefaults();
  render();
});

/* =========================
   Events
   ========================= */

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

/* =========================
   Storage
   ========================= */

function loadRecords() {
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
    console.error("저장 데이터를 불러오지 못했습니다.", error);

    return {
      running: [],
      sleep: [],
    };
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

/* =========================
   Running Submit / Edit
   ========================= */

function handleRunningSubmit(event) {
  event.preventDefault();

  const formData = new FormData(runningForm);
  const editId = editingRunningId ? editingRunningId.value : "";

  const record = {
    id: editId || createId(),
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
    createdAt: editId
      ? getExistingCreatedAt("running", editId)
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!record.date || record.distanceKm <= 0 || record.durationMin <= 0) {
    alert("러닝 날짜, 총 거리, 시간을 확인해줘.");
    return;
  }

  record.score = calculateRunningScore(record);

  if (editId) {
    state.records.running = state.records.running.map((item) =>
      item.id === editId ? record : item
    );
  } else {
    state.records.running.unshift(record);
  }

  saveRecords();
  cancelRunningEdit(false);
  runningForm.reset();
  setTodayDefaults();
  render();
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

/* =========================
   Sleep Submit / Edit
   ========================= */

function handleSleepSubmit(event) {
  event.preventDefault();

  const formData = new FormData(sleepForm);
  const editId = editingSleepId ? editingSleepId.value : "";

  const totalSleepMin = toNumber(formData.get("totalSleepMin"));
  const deepSleepMin = toNumber(formData.get("deepSleepMin"));
  const remSleepMin = toNumber(formData.get("remSleepMin"));

  const record = {
    id: editId || createId(),
    date: formData.get("sleepDate"),
    totalSleepMin,
    deepSleepMin,
    remSleepMin,
    restingHeartRate: toNumber(formData.get("restingHeartRate")),
    sleepStart: formData.get("sleepStart"),
    sleepEnd: formData.get("sleepEnd"),
    memo: sanitizeText(formData.get("sleepMemo")),
    createdAt: editId
      ? getExistingCreatedAt("sleep", editId)
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!record.date || record.totalSleepMin <= 0) {
    alert("수면 날짜와 총 수면 시간을 확인해줘.");
    return;
  }

  if (record.deepSleepMin + record.remSleepMin > record.totalSleepMin) {
    alert("깊은 수면과 REM 수면의 합이 총 수면 시간을 넘을 수 없어.");
    return;
  }

  record.deepSleepRatio = getRatio(record.deepSleepMin, record.totalSleepMin);
  record.remSleepRatio = getRatio(record.remSleepMin, record.totalSleepMin);
  record.score = calculateSleepScore(record);

  if (editId) {
    state.records.sleep = state.records.sleep.map((item) =>
      item.id === editId ? record : item
    );
  } else {
    state.records.sleep.unshift(record);
  }

  saveRecords();
  cancelSleepEdit(false);
  sleepForm.reset();
  setTodayDefaults();
  render();
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

/* =========================
   Render
   ========================= */

function render() {
  sortRecords();
  renderViewTabs();
  renderRecordTabs();
  renderRunningTable();
  renderSleepTable();
  renderDashboard();
  renderPeriodSummary();
  renderLatestSummary();
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
              <button class="btn btn-secondary" onclick="startRunningEdit('${record.id}')">
                수정
              </button>
              <button class="btn btn-danger" onclick="deleteRunningRecord('${record.id}')">
                삭제
              </button>
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
          <td>${formatNumber(record.deepSleepRatio, 1)}%</td>
          <td>${formatNumber(record.remSleepRatio, 1)}%</td>
          <td>${formatNumber(record.restingHeartRate, 0)} bpm</td>
          <td><strong>${record.score}</strong></td>
          <td>
            <div class="table-actions">
              <button class="btn btn-secondary" onclick="startSleepEdit('${record.id}')">
                수정
              </button>
              <button class="btn btn-danger" onclick="deleteSleepRecord('${record.id}')">
                삭제
              </button>
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

  setTextAll(avgSleepScoreElements, formatNumber(avg(records, "score"), 0));

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

  if (monthlySleepScore) {
    monthlySleepScore.textContent = formatNumber(avg(monthlySleep, "score"), 0);
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

  latestScoreValue.textContent = latest.score;
  latestScoreLabel.textContent = getScoreLabel(latest.score);

  const typeLabel = latest.type === "running" ? "러닝" : "수면";
  latestDate.textContent = `${formatDate(latest.date)} 기준 최신 ${typeLabel} 기록`;
}

/* =========================
   Delete / Reset
   ========================= */

function deleteRunningRecord(id) {
  const confirmed = confirm("이 러닝 기록을 삭제할까?");
  if (!confirmed) return;

  state.records.running = state.records.running.filter((record) => record.id !== id);

  saveRecords();
  render();
}

function deleteSleepRecord(id) {
  const confirmed = confirm("이 수면 기록을 삭제할까?");
  if (!confirmed) return;

  state.records.sleep = state.records.sleep.filter((record) => record.id !== id);

  saveRecords();
  render();
}

function handleReset() {
  const confirmed = confirm("모든 러닝/수면 기록을 삭제할까?");
  if (!confirmed) return;

  state.records = {
    running: [],
    sleep: [],
  };

  saveRecords();
  cancelRunningEdit(false);
  cancelSleepEdit(false);
  render();
}

/* =========================
   Helpers
   ========================= */

function createId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

function getExistingCreatedAt(type, id) {
  const record = state.records[type].find((item) => item.id === id);
  return record?.createdAt || new Date().toISOString();
}

function sortRecords() {
  state.records.running.sort((a, b) => new Date(b.date) - new Date(a.date));
  state.records.sleep.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/* =========================
   Expose functions
   ========================= */

window.deleteRunningRecord = deleteRunningRecord;
window.deleteSleepRecord = deleteSleepRecord;
window.startRunningEdit = startRunningEdit;
window.startSleepEdit = startSleepEdit;
