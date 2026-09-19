import { buildTrainingSession, recordTrainingAnswer } from "./training-engine.mjs";

const state = {
  data: null,
  trainingData: null,
  resources: [],
  resourceFilter: "all",
  openedWords: new Set(JSON.parse(localStorage.getItem("italiano-flow:opened") || "[]")),
  reviewIndex: 0,
  trainingMode: "mixed",
  trainingSession: [],
  trainingIndex: 0,
  trainingAnswered: false,
  trainingSelection: null,
  trainingStats: JSON.parse(localStorage.getItem("italiano-flow:training-stats") || "{}"),
  installPrompt: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value = "") {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

function setView(name) {
  $$(".view").forEach((view) => view.classList.toggle("is-active", view.dataset.view === name));
  $$(".nav-item").forEach((item) => {
    const active = item.dataset.nav === name;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-current", active ? "page" : "false");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderToday() {
  const lesson = state.data.lesson;
  $("#todayDate").textContent = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  $("#lessonTitle").textContent = lesson.title;
  $("#lessonSummary").textContent = lesson.summary;
  updateVocabProgress();
}

function highlightVocabulary(text, words) {
  let safe = escapeHtml(text);
  const tokens = [...words].sort((a, b) => b.length - a.length);
  for (const token of tokens) {
    const plain = token.replace(/^l[’']|^un\s|^gli\s|^i\s|^le\s/i, "").split(" X ")[0];
    const expression = plain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (expression.length < 4) continue;
    safe = safe.replace(new RegExp(`\\b(${expression}[a-zàèéìòóù]*)\\b`, "giu"), "<mark>$1</mark>");
  }
  return safe;
}

function renderLesson() {
  const { lesson, vocabulary } = state.data;
  $("#articleTitle").textContent = lesson.title;
  $("#articleWordCount").textContent = `≈ ${lesson.wordCount} parole`;
  $("#articleBody").innerHTML = lesson.paragraphs
    .map((paragraph) => `<p>${highlightVocabulary(paragraph, vocabulary.map((word) => word.term))}</p>`)
    .join("");
  $("#vocabList").innerHTML = vocabulary.map((word, index) => {
    const opened = state.openedWords.has(word.id);
    return `<button class="vocab-item" type="button" data-word="${escapeHtml(word.id)}" aria-expanded="${opened}">
      <span class="vocab-head"><span><span class="vocab-index">${String(index + 1).padStart(2, "0")}</span> <strong>${escapeHtml(word.term)}</strong></span><span aria-hidden="true">${opened ? "−" : "+"}</span></span>
      <span class="vocab-detail" ${opened ? "" : "hidden"}><span>${escapeHtml(word.definition)}</span><br><em>${escapeHtml(word.collocation)}</em></span>
    </button>`;
  }).join("");
  updateVocabProgress();
}

function updateVocabProgress() {
  const count = state.openedWords.size;
  const goal = state.data?.vocabulary?.length || 20;
  $("#vocabProgress").textContent = `${count}/${goal}`;
  $("#openedCounter").textContent = `${count} aperte`;
  $("#vocabRing").style.setProperty("--progress", `${Math.min(360, count / goal * 360)}deg`);
  $("#progressHint").textContent = count === goal ? "Obiettivo completato: ora usale in frasi nuove." : `Ancora ${goal - count} da scoprire oggi.`;
}

function renderResources() {
  const items = state.resourceFilter === "all"
    ? state.resources
    : state.resources.filter((item) => item.topics.includes(state.resourceFilter) || item.type === state.resourceFilter);
  $("#resourceList").innerHTML = items.length ? items.map((item) => `<article class="resource-card">
    <div class="resource-top"><span>${escapeHtml(item.source)} · ${escapeHtml(item.level)}</span><span>${escapeHtml(item.type)}</span></div>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.description || "Apri la fonte per leggere o ascoltare il contenuto originale.")}</p>
    <div class="resource-footer"><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Apri la fonte ↗</a><span class="rights-pill">${escapeHtml(item.usage)}</span></div>
  </article>`).join("") : `<p class="muted">Nessuna risorsa in questa categoria. Esegui l'aggiornamento o cambia filtro.</p>`;
}

const trainingTypeLabels = {
  mixed: "Percorso misto",
  meaning: "Scegli il significato",
  lookalike: "Parole simili",
  context: "Completa il contesto",
  grammar: "Tempo e forma",
  sense: "Significato nel contesto",
  phrase: "Espressioni e collocazioni",
};

function currentTrainingQuestion() {
  return state.trainingSession[state.trainingIndex] || null;
}

function renderTrainingQuestion() {
  const question = currentTrainingQuestion();
  if (!question) return;
  const total = state.trainingSession.length;
  const mastered = state.trainingStats[question.wordId]?.status === "reviewing";
  $("#trainingType").textContent = trainingTypeLabels[question.type] || question.type;
  $("#trainingLevel").textContent = `${question.level}${mastered ? " · ripasso" : ""}`;
  $("#trainingCounter").textContent = `${state.trainingIndex + 1} / ${total}`;
  $("#trainingProgressBar").style.width = `${(state.trainingIndex + 1) / total * 100}%`;
  $("#trainingLemma").textContent = question.type === "meaning" || state.trainingAnswered
    ? `${question.lemma} · ${question.pos}`
    : "Leggi tutta la frase prima di scegliere.";
  $("#training-question").textContent = question.prompt;
  $("#trainingOptions").innerHTML = question.options.map((option, index) => {
    const isCorrect = option === question.answer;
    const isSelected = option === state.trainingSelection;
    const classNames = ["training-option"];
    if (state.trainingAnswered && isCorrect) classNames.push("is-correct");
    if (state.trainingAnswered && isSelected && !isCorrect) classNames.push("is-wrong");
    return `<button class="${classNames.join(" ")}" type="button" data-training-option="${index}" ${state.trainingAnswered ? "disabled" : ""}>
      <span>${String.fromCharCode(65 + index)}</span><strong>${escapeHtml(option)}</strong>
    </button>`;
  }).join("");

  const feedback = $("#trainingFeedback");
  feedback.hidden = !state.trainingAnswered;
  if (!state.trainingAnswered) return;
  const correct = state.trainingSelection === question.answer;
  $("#trainingResult").textContent = correct ? "Esatto — ora guarda come cambia nel contesto." : `Non ancora. La risposta corretta è: ${question.answer}`;
  $("#trainingResult").className = `feedback-result ${correct ? "is-correct" : "is-wrong"}`;
  $("#trainingExplanation").textContent = question.explanation;
  $("#trainingFamily").textContent = question.family.join(" · ");
  $("#trainingLookalikes").textContent = question.lookalikes.join(" · ");
  $("#trainingExamples").innerHTML = question.examples.map((example) => `<article class="training-example">
    <span>${escapeHtml(example.form)}</span>
    <p lang="it">${escapeHtml(example.text)}</p>
    <small>${escapeHtml(example.translation)}</small>
    <em>${escapeHtml(example.note)}</em>
  </article>`).join("");
  $("#nextTrainingQuestion").textContent = state.trainingIndex + 1 === total ? "Ricomincia il percorso" : "Prossima domanda";
}

function startTraining(mode = "mixed") {
  state.trainingMode = mode;
  state.trainingSession = buildTrainingSession(state.trainingData, mode);
  state.trainingIndex = 0;
  state.trainingAnswered = false;
  state.trainingSelection = null;
  $$("[data-training-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.trainingMode === mode));
  renderTrainingQuestion();
}

function answerTrainingQuestion(optionIndex) {
  if (state.trainingAnswered) return;
  const question = currentTrainingQuestion();
  const selected = question?.options?.[optionIndex];
  if (!question || selected === undefined) return;
  state.trainingSelection = selected;
  state.trainingAnswered = true;
  state.trainingStats = recordTrainingAnswer(state.trainingStats, question.wordId, selected === question.answer);
  localStorage.setItem("italiano-flow:training-stats", JSON.stringify(state.trainingStats));
  renderTrainingQuestion();
}

function nextTrainingQuestion() {
  state.trainingIndex = (state.trainingIndex + 1) % state.trainingSession.length;
  state.trainingAnswered = false;
  state.trainingSelection = null;
  renderTrainingQuestion();
  $("#trainingCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

function openReview() {
  const cards = state.data.cards;
  if (!cards.length) return;
  const card = cards[state.reviewIndex % cards.length];
  $("#cardFront").textContent = card.front;
  $("#cardBack").textContent = `${card.back}${card.example ? ` · ${card.example}` : ""}`;
  $("#answerPanel").hidden = true;
  $("#showAnswer").hidden = false;
  $("#reviewDialog").showModal();
}

function parseSubtitleText(raw) {
  const normalized = raw.replace(/^\uFEFF/, "").replace(/\r/g, "").trim();
  if (!normalized) return [];
  const blocks = normalized.replace(/^WEBVTT[^\n]*\n+/, "").split(/\n{2,}/);
  return blocks.map((block) => {
    const lines = block.split("\n").filter(Boolean);
    const timeIndex = lines.findIndex((line) => /\d{1,2}:\d{2}(?::\d{2})?[,.]\d{3}\s*-->/.test(line));
    if (timeIndex < 0) return null;
    return {
      time: lines[timeIndex].split("-->")[0].trim(),
      text: lines.slice(timeIndex + 1).join(" ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
    };
  }).filter((cue) => cue?.text);
}

function extractCandidates(cues) {
  const stop = new Set("a ad al alla alle anche che chi ci con da dal dalla dei del delle di e è gli ha hai hanno il in io la le lo ma mi ne nel nella no non o per però più quale quando questo questa se sei si sono su sul tra tu un una uno vi come cosa tutto tutti essere fare avere molto già poi sua suo loro mia mio ti".split(" "));
  const counts = new Map();
  for (const cue of cues) {
    const words = cue.text.toLocaleLowerCase("it-IT").match(/[a-zàèéìòóù]{4,}/giu) || [];
    for (const word of words) {
      if (stop.has(word)) continue;
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, 20);
}

function renderSubtitleResults(cues) {
  const candidates = extractCandidates(cues);
  $("#subtitleResults").hidden = false;
  $("#cueCount").textContent = `${cues.length} segmenti`;
  $("#candidateList").innerHTML = candidates.map(([word, count]) => `<span class="candidate">${escapeHtml(word)} · ${count}</span>`).join("");
  $("#cueList").innerHTML = cues.slice(0, 30).map((cue) => `<article class="cue"><time>${escapeHtml(cue.time)}</time><p>${escapeHtml(cue.text)}</p></article>`).join("");
  localStorage.setItem("italiano-flow:last-subtitle", JSON.stringify({ cueCount: cues.length, candidates, savedAt: new Date().toISOString() }));
}

function bindEvents() {
  $$("[data-nav], [data-go]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.nav || button.dataset.go)));
  $("#vocabList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-word]");
    if (!button) return;
    const id = button.dataset.word;
    state.openedWords.has(id) ? state.openedWords.delete(id) : state.openedWords.add(id);
    localStorage.setItem("italiano-flow:opened", JSON.stringify([...state.openedWords]));
    renderLesson();
  });
  $$(".filter-chip").forEach((button) => button.addEventListener("click", () => {
    state.resourceFilter = button.dataset.filter;
    $$(".filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
    renderResources();
  }));
  $$("[data-training-mode]").forEach((button) => button.addEventListener("click", () => startTraining(button.dataset.trainingMode)));
  $("#trainingOptions").addEventListener("click", (event) => {
    const button = event.target.closest("[data-training-option]");
    if (button) answerTrainingQuestion(Number(button.dataset.trainingOption));
  });
  $("#nextTrainingQuestion").addEventListener("click", nextTrainingQuestion);
  $("#reviewShortcut").addEventListener("click", openReview);
  $("#showAnswer").addEventListener("click", () => { $("#answerPanel").hidden = false; $("#showAnswer").hidden = true; });
  $$("[data-rating]").forEach((button) => button.addEventListener("click", () => {
    state.reviewIndex += 1;
    localStorage.setItem("italiano-flow:review-index", String(state.reviewIndex));
    $("#reviewDialog").close();
  }));
  $("#subtitleFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    $("#subtitlePaste").value = await file.text();
    $("#subtitleMessage").textContent = `${file.name} pronto per l'analisi.`;
  });
  $("#parseSubtitles").addEventListener("click", () => {
    const cues = parseSubtitleText($("#subtitlePaste").value);
    if (!cues.length) {
      $("#subtitleMessage").textContent = "Non ho trovato segmenti validi. Controlla il formato SRT/VTT.";
      $("#subtitleResults").hidden = true;
      return;
    }
    $("#subtitleMessage").textContent = `Analisi completata: ${cues.length} segmenti, elaborati solo in locale.`;
    renderSubtitleResults(cues);
  });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
    $("#installButton").hidden = false;
  });
  $("#installButton").addEventListener("click", async () => {
    if (!state.installPrompt) return;
    await state.installPrompt.prompt();
    state.installPrompt = null;
    $("#installButton").hidden = true;
  });
}

async function init() {
  try {
    [state.data, state.resources, state.trainingData] = await Promise.all([
      loadJson("./data/learning-data.json"),
      loadJson("./data/resources.json"),
      loadJson("./data/vocabulary-training.json"),
    ]);
    state.reviewIndex = Number(localStorage.getItem("italiano-flow:review-index") || 0);
    renderToday();
    renderLesson();
    renderResources();
    startTraining("mixed");
    bindEvents();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    document.body.innerHTML = `<main class="app-shell"><section class="system-card"><h1>Impossibile caricare il demo</h1><p>${escapeHtml(error.message)}</p><p>Avvia il server locale dalla cartella del progetto; non aprire index.html direttamente.</p></section></main>`;
  }
}

init();
