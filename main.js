import { fetchEventOprs, fetchEventRankings } from "./api.js";
import { t } from "./i18n.js";
import { buildRankedTeams } from "./rankLogic.js";
import { calculateWinChance } from "./predictor.js";

const STORAGE_KEYS = {
  apiKey: "frc-dashboard-api-key",
  language: "frc-dashboard-language",
};

const state = {
  language: localStorage.getItem(STORAGE_KEYS.language) || "zh",
  oprMap: {},
  rankings: [],
  activeTab: "rankings",
  eventKey: "",
};

const elements = {
  html: document.documentElement,
  languageToggle: document.getElementById("language-toggle"),
  apiKeyInput: document.getElementById("api-key-input"),
  eventKeyInput: document.getElementById("event-key-input"),
  fetchButton: document.getElementById("fetch-button"),
  statusBanner: document.getElementById("status-banner"),
  tabButtons: [...document.querySelectorAll(".tab-button")],
  tabPanels: [...document.querySelectorAll(".tab-panel")],
  rankingsBody: document.getElementById("rankings-body"),
  eventSummary: document.getElementById("event-summary"),
  predictButton: document.getElementById("predict-button"),
  teamInputs: [...document.querySelectorAll(".team-input")],
  redOprTotal: document.getElementById("red-opr-total"),
  blueOprTotal: document.getElementById("blue-opr-total"),
  redWinValue: document.getElementById("red-win-value"),
  blueWinValue: document.getElementById("blue-win-value"),
  redBar: document.getElementById("red-bar"),
  blueBar: document.getElementById("blue-bar"),
  predictorNotes: document.getElementById("predictor-notes"),
  pageTitle: document.getElementById("page-title"),
  pageSubtitle: document.getElementById("page-subtitle"),
  apiKeyLabel: document.getElementById("api-key-label"),
  eventKeyLabel: document.getElementById("event-key-label"),
  rankingsHeading: document.getElementById("rankings-heading"),
  rankingsDescription: document.getElementById("rankings-description"),
  predictorHeading: document.getElementById("predictor-heading"),
  predictorDescription: document.getElementById("predictor-description"),
  redAllianceTitle: document.getElementById("red-alliance-title"),
  blueAllianceTitle: document.getElementById("blue-alliance-title"),
  redWinLabel: document.getElementById("red-win-label"),
  blueWinLabel: document.getElementById("blue-win-label"),
  footerText: document.getElementById("footer-text"),
  colRank: document.getElementById("col-rank"),
  colTeam: document.getElementById("col-team"),
  colOpr: document.getElementById("col-opr"),
  colTier: document.getElementById("col-tier"),
  colRecord: document.getElementById("col-record"),
};

function initialize() {
  elements.apiKeyInput.value = localStorage.getItem(STORAGE_KEYS.apiKey) || "";
  applyTranslations();
  applyTabState();
  renderRankings();
  updatePredictorView();
  bindEvents();
}

function bindEvents() {
  elements.languageToggle.addEventListener("click", () => {
    state.language = state.language === "zh" ? "en" : "zh";
    localStorage.setItem(STORAGE_KEYS.language, state.language);
    applyTranslations();
    renderRankings();
    updatePredictorView();
  });

  elements.fetchButton.addEventListener("click", loadEventData);
  elements.predictButton.addEventListener("click", updatePredictorView);

  elements.apiKeyInput.addEventListener("input", (event) => {
    localStorage.setItem(STORAGE_KEYS.apiKey, event.target.value.trim());
  });

  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      applyTabState();
    });
  });

  elements.teamInputs.forEach((input) => {
    input.addEventListener("input", updatePredictorView);
  });
}

async function loadEventData() {
  const apiKey = elements.apiKeyInput.value.trim();
  const eventKey = elements.eventKeyInput.value.trim();

  if (!apiKey) {
    showStatus("error", t(state.language, "missingApiKey"));
    return;
  }

  if (!eventKey) {
    showStatus("error", t(state.language, "missingEventKey"));
    return;
  }

  showStatus("loading", t(state.language, "loading"));
  elements.fetchButton.disabled = true;
  elements.fetchButton.classList.add("opacity-70", "cursor-not-allowed");

  try {
    const [oprData, rankingsData] = await Promise.all([
      fetchEventOprs(eventKey, apiKey),
      fetchEventRankings(eventKey, apiKey),
    ]);

    state.oprMap = oprData.oprs || {};
    state.rankings = buildRankedTeams(state.oprMap, rankingsData.rankings || []);
    state.eventKey = eventKey;

    renderRankings();
    updatePredictorView();
    showStatus("success", `${t(state.language, "statusSuccess")} ${t(state.language, "loadedSummary", { eventKey, count: state.rankings.length })}`);
  } catch (error) {
    const key = mapErrorToTranslation(error);
    showStatus("error", t(state.language, key));
  } finally {
    elements.fetchButton.disabled = false;
    elements.fetchButton.classList.remove("opacity-70", "cursor-not-allowed");
  }
}

function mapErrorToTranslation(error) {
  switch (error.message) {
    case "INVALID_API_KEY":
      return "invalidApiKey";
    case "EVENT_NOT_FOUND":
      return "eventNotFound";
    default:
      return "fetchFailed";
  }
}

function renderRankings() {
  if (!state.rankings.length) {
    elements.rankingsBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-10 text-center text-slate-500">${t(state.language, "emptyRankings")}</td>
      </tr>
    `;
    elements.eventSummary.textContent = t(state.language, "noDataLoaded");
    return;
  }

  elements.rankingsBody.innerHTML = state.rankings
    .map((team) => {
      const record = formatRecord(team.ranking);
      return `
        <tr class="hover:bg-white/[0.03]">
          <td class="px-4 py-3 font-medium text-white">${team.rank}</td>
          <td class="px-4 py-3">
            <div class="font-semibold text-cyan-200">frc${team.teamNumber}</div>
            <div class="text-xs text-slate-400">${team.ranking?.sort_orders_info?.[0]?.name || ""}</div>
          </td>
          <td class="px-4 py-3 text-slate-200">${team.opr.toFixed(2)}</td>
          <td class="px-4 py-3">
            <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold ${team.tier.colorClass}">
              ${t(state.language, team.tier.key)}
            </span>
          </td>
          <td class="px-4 py-3 text-slate-300">${record}</td>
        </tr>
      `;
    })
    .join("");

  elements.eventSummary.textContent = t(state.language, "loadedSummary", {
    eventKey: state.eventKey,
    count: state.rankings.length,
  });
}

function formatRecord(ranking) {
  if (!ranking?.record) {
    return t(state.language, "unknownRecord");
  }

  const { wins = 0, losses = 0, ties = 0 } = ranking.record;
  return `${wins}-${losses}-${ties}`;
}

function updatePredictorView() {
  const redAlliance = elements.teamInputs
    .filter((input) => input.dataset.alliance === "red")
    .map((input) => input.value);
  const blueAlliance = elements.teamInputs
    .filter((input) => input.dataset.alliance === "blue")
    .map((input) => input.value);

  const result = calculateWinChance(redAlliance, blueAlliance, state.oprMap);
  const redPercent = (result.redChance * 100).toFixed(1);
  const bluePercent = (result.blueChance * 100).toFixed(1);

  elements.redOprTotal.textContent = `OPR: ${result.redTotal.toFixed(2)}`;
  elements.blueOprTotal.textContent = `OPR: ${result.blueTotal.toFixed(2)}`;
  elements.redWinValue.textContent = `${redPercent}%`;
  elements.blueWinValue.textContent = `${bluePercent}%`;
  elements.redBar.style.width = `${redPercent}%`;
  elements.blueBar.style.width = `${bluePercent}%`;

  elements.predictorNotes.textContent = state.rankings.length
    ? t(state.language, "predictorReady")
    : t(state.language, "predictorWaiting");
}

function applyTranslations() {
  const lang = state.language;
  elements.html.lang = lang === "zh" ? "zh-Hant" : "en";
  elements.languageToggle.textContent = t(lang, "languageToggle");
  elements.pageTitle.textContent = t(lang, "pageTitle");
  elements.pageSubtitle.textContent = t(lang, "pageSubtitle");
  elements.apiKeyLabel.textContent = t(lang, "apiKey");
  elements.eventKeyLabel.textContent = t(lang, "eventKey");
  elements.apiKeyInput.placeholder = t(lang, "apiKeyPlaceholder");
  elements.eventKeyInput.placeholder = t(lang, "eventKeyPlaceholder");
  elements.fetchButton.textContent = t(lang, "fetchData");
  elements.tabButtons.find((button) => button.dataset.tab === "rankings").textContent = t(lang, "rankingsTab");
  elements.tabButtons.find((button) => button.dataset.tab === "predictor").textContent = t(lang, "predictorTab");
  elements.rankingsHeading.textContent = t(lang, "rankingsHeading");
  elements.rankingsDescription.textContent = t(lang, "rankingsDescription");
  elements.predictorHeading.textContent = t(lang, "predictorHeading");
  elements.predictorDescription.textContent = t(lang, "predictorDescription");
  elements.redAllianceTitle.textContent = t(lang, "redAlliance");
  elements.blueAllianceTitle.textContent = t(lang, "blueAlliance");
  elements.predictButton.textContent = t(lang, "predict");
  elements.redWinLabel.textContent = t(lang, "redSide");
  elements.blueWinLabel.textContent = t(lang, "blueSide");
  elements.footerText.textContent = t(lang, "footer");
  elements.colRank.textContent = t(lang, "rank");
  elements.colTeam.textContent = t(lang, "team");
  elements.colOpr.textContent = t(lang, "opr");
  elements.colTier.textContent = t(lang, "tier");
  elements.colRecord.textContent = t(lang, "record");

  const redInputs = elements.teamInputs.filter((input) => input.dataset.alliance === "red");
  const blueInputs = elements.teamInputs.filter((input) => input.dataset.alliance === "blue");
  [...redInputs, ...blueInputs].forEach((input, index) => {
    const key = index % 3 === 0 ? "teamPlaceholder1" : index % 3 === 1 ? "teamPlaceholder2" : "teamPlaceholder3";
    input.placeholder = t(lang, key);
  });

  if (!state.rankings.length) {
    elements.eventSummary.textContent = t(lang, "noDataLoaded");
  } else {
    elements.eventSummary.textContent = t(lang, "loadedSummary", {
      eventKey: state.eventKey,
      count: state.rankings.length,
    });
  }
}

function applyTabState() {
  elements.tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === state.activeTab;
    button.className = isActive
      ? "tab-button rounded-full bg-cyanGlow px-4 py-2 text-sm font-semibold text-slate-950 transition"
      : "tab-button rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10";
  });

  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.panel !== state.activeTab);
  });
}

function showStatus(type, message) {
  const palette = {
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    error: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    loading: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  };

  elements.statusBanner.className = `mt-4 rounded-2xl border px-4 py-3 text-sm ${palette[type]}`;
  elements.statusBanner.textContent = message;
  elements.statusBanner.classList.remove("hidden");
}

initialize();
