import { COUNTRIES } from "./data/countries.js";

const uniq = [...new Map(COUNTRIES.map((c) => [c.code, c])).values()];

const els = {
  score: document.getElementById("score"),
  streak: document.getElementById("streak"),
  flag: document.getElementById("flag"),
  choices: document.getElementById("choices"),
  feedback: document.getElementById("feedback"),
  next: document.getElementById("next"),
  restart: document.getElementById("restart"),
  prompt: document.getElementById("prompt"),
};

const state = {
  score: 0,
  streak: 0,
  bestStreak: 0,
  current: null,
  answered: false,
  recent: [],
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickCountry() {
  const pool = uniq.filter((c) => !state.recent.includes(c.code));
  const source = pool.length ? pool : uniq;
  const pick = source[Math.floor(Math.random() * source.length)];
  state.recent = [...state.recent, pick.code].slice(-8);
  return pick;
}

function optionsFor(correct) {
  const distractors = shuffle(uniq.filter((c) => c.code !== correct.code)).slice(0, 3);
  return shuffle([correct, ...distractors]);
}

function flagUrl(code) {
  return `https://flagcdn.com/w640/${code}.png`;
}

function renderRound() {
  state.answered = false;
  state.current = pickCountry();
  els.feedback.hidden = true;
  els.feedback.textContent = "";
  els.feedback.className = "feedback";
  els.next.hidden = true;
  els.prompt.textContent = "Which country is this?";
  els.flag.src = flagUrl(state.current.code);
  els.flag.alt = "Mystery flag";

  const frame = els.flag.closest(".flag-frame");
  frame.style.animation = "none";
  void frame.offsetWidth;
  frame.style.animation = "";

  els.choices.innerHTML = "";
  for (const opt of optionsFor(state.current)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.textContent = opt.name;
    btn.dataset.code = opt.code;
    btn.addEventListener("click", () => onChoose(btn, opt));
    els.choices.appendChild(btn);
  }
  updateStats();
}

function updateStats() {
  els.score.textContent = String(state.score);
  els.streak.textContent = String(state.streak);
}

function onChoose(btn, opt) {
  if (state.answered) return;
  state.answered = true;
  const correct = opt.code === state.current.code;
  const buttons = [...els.choices.querySelectorAll(".choice")];
  for (const b of buttons) {
    b.disabled = true;
    if (b.dataset.code === state.current.code) b.classList.add("correct");
  }
  if (correct) {
    btn.classList.add("correct");
    state.score += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    els.feedback.textContent = "Nice — that’s right.";
    els.feedback.className = "feedback ok";
  } else {
    btn.classList.add("wrong");
    state.streak = 0;
    els.feedback.textContent = `Nope — it’s ${state.current.name}.`;
    els.feedback.className = "feedback bad";
  }
  els.feedback.hidden = false;
  els.next.hidden = false;
  updateStats();
  save();
}

function save() {
  try {
    localStorage.setItem(
      "flags-pwa",
      JSON.stringify({ score: state.score, streak: state.streak, bestStreak: state.bestStreak })
    );
  } catch {}
}

function load() {
  try {
    const raw = localStorage.getItem("flags-pwa");
    if (!raw) return;
    const data = JSON.parse(raw);
    state.bestStreak = data.bestStreak || 0;
  } catch {}
}

els.next.addEventListener("click", renderRound);
els.restart.addEventListener("click", () => {
  state.score = 0;
  state.streak = 0;
  state.recent = [];
  save();
  renderRound();
});

load();
renderRound();
