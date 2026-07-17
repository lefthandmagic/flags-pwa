import { COUNTRIES } from "./data/countries.js";

const uniq = [...new Map(COUNTRIES.map((c) => [c.code, c])).values()];
const MAX_LIVES = 3;
const STREAK_MILESTONES = [
  { at: 5, kind: "streak", title: "On a roll", body: "5 correct in a row. Keep it going." },
  { at: 10, kind: "streak", title: "Double digits", body: "10 in a row. Proper geography brain." },
  { at: 20, kind: "streak", title: "Flag machine", body: "20 streak. Absolute menace." },
  { at: 50, kind: "streak", title: "Cartographer", body: "50 in a row. The atlas fears you." },
];
const SCORE_MILESTONES = [
  { at: 10, kind: "score", title: "Getting started", body: "10 flags down. Solid start." },
  { at: 25, kind: "score", title: "Quarter century", body: "25 correct. You’re building a real tally." },
  { at: 50, kind: "score", title: "Half a hundred", body: "50 score. Proper quiz form." },
  { at: 100, kind: "score", title: "Century", body: "100 correct. Most people never get here." },
  { at: 150, kind: "score", title: "Deep cut", body: "150 score. You’re into the hard ones." },
  { at: 200, kind: "score", title: "World tour", body: "200 correct. Nearly the whole map." },
];

const els = {
  score: document.getElementById("score"),
  streak: document.getElementById("streak"),
  lives: document.getElementById("lives"),
  meta: document.getElementById("meta"),
  flag: document.getElementById("flag"),
  choices: document.getElementById("choices"),
  feedback: document.getElementById("feedback"),
  next: document.getElementById("next"),
  restart: document.getElementById("restart"),
  prompt: document.getElementById("prompt"),
  celebrate: document.getElementById("celebrate"),
  celebrateKicker: document.getElementById("celebrate-kicker"),
  celebrateTitle: document.getElementById("celebrate-title"),
  celebrateBody: document.getElementById("celebrate-body"),
  celebrateContinue: document.getElementById("celebrate-continue"),
  gameover: document.getElementById("gameover"),
  gameoverBody: document.getElementById("gameover-body"),
  gameoverRestart: document.getElementById("gameover-restart"),
  cleared: document.getElementById("cleared"),
  clearedBody: document.getElementById("cleared-body"),
  clearedRestart: document.getElementById("cleared-restart"),
};

const state = {
  score: 0,
  streak: 0,
  bestStreak: 0,
  lives: MAX_LIVES,
  seen: new Set(),
  current: null,
  answered: false,
  loadToken: 0,
  celebrateQueue: [],
  skipBroken: false,
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function remaining() {
  return uniq.filter((c) => !state.seen.has(c.code));
}

function pickCountry() {
  const pool = remaining();
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function optionsFor(correct) {
  const distractors = shuffle(uniq.filter((c) => c.code !== correct.code)).slice(0, 3);
  return shuffle([correct, ...distractors]);
}

function flagUrls(code) {
  return [
    `https://flagcdn.com/w320/${code}.png`,
    `https://flagcdn.com/${code}.svg`,
    `https://flagcdn.com/w160/${code}.png`,
  ];
}

function loadFlag(code) {
  const token = ++state.loadToken;
  const urls = flagUrls(code);
  let i = 0;

  return new Promise((resolve, reject) => {
    const tryNext = () => {
      if (token !== state.loadToken) return;
      if (i >= urls.length) {
        reject(new Error("flag load failed"));
        return;
      }
      const url = urls[i++];
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (token !== state.loadToken) return;
        els.flag.src = url;
        els.flag.alt = "Mystery flag";
        resolve(url);
      };
      img.onerror = () => tryNext();
      img.src = url;
    };
    els.flag.removeAttribute("src");
    els.flag.alt = "Loading flag…";
    tryNext();
  });
}

function livesMarkup() {
  return "♥".repeat(state.lives) + "♡".repeat(MAX_LIVES - state.lives);
}

function updateStats() {
  els.score.textContent = String(state.score);
  els.streak.textContent = String(state.streak);
  els.lives.textContent = livesMarkup();
  els.lives.classList.toggle("low", state.lives === 1);
  els.meta.textContent = `${state.seen.size} / ${uniq.length} seen · ${remaining().length} left`;
}

function hideOverlays() {
  els.celebrate.hidden = true;
  els.gameover.hidden = true;
  els.cleared.hidden = true;
}

function showCelebrate(milestone) {
  const kicker = milestone.kind === "score" ? "Score milestone" : "Streak";
  els.celebrateKicker.textContent = kicker;
  els.celebrateTitle.textContent = milestone.title;
  els.celebrateBody.textContent = `${milestone.body}\n\nScore: ${state.score} · Streak: ${state.streak}`;
  els.celebrate.hidden = false;
}

function queueMilestones() {
  const scoreHit = SCORE_MILESTONES.find((m) => m.at === state.score);
  const streakHit = STREAK_MILESTONES.find((m) => m.at === state.streak);
  // Score first, then streak — separate screens if both fire on the same answer.
  if (scoreHit) state.celebrateQueue.push(scoreHit);
  if (streakHit) state.celebrateQueue.push(streakHit);
}

function drainCelebrateOrContinue() {
  if (state.celebrateQueue.length) {
    showCelebrate(state.celebrateQueue.shift());
    return true;
  }
  return false;
}

function showGameOver() {
  els.gameoverBody.textContent = `Score ${state.score} · best streak ${state.bestStreak} · flags seen ${state.seen.size}/${uniq.length}.\n\nYou lost all your lives.`;
  els.gameover.hidden = false;
}

function showCleared() {
  els.clearedBody.textContent = `Every flag in this deck, done.\nScore ${state.score} · best streak ${state.bestStreak} · lives left ${state.lives}.`;
  els.cleared.hidden = false;
}

function renderRound() {
  if (state.lives <= 0) {
    showGameOver();
    return;
  }

  const next = pickCountry();
  if (!next) {
    showCleared();
    return;
  }

  hideOverlays();
  state.answered = false;
  state.current = next;
  els.feedback.hidden = true;
  els.feedback.textContent = "";
  els.feedback.className = "feedback";
  els.next.hidden = true;
  els.prompt.textContent = "Which country is this?";

  const frame = els.flag.closest(".flag-frame");
  frame.style.animation = "none";
  void frame.offsetWidth;
  frame.style.animation = "";

  state.skipBroken = false;
  loadFlag(state.current.code).catch(() => {
    els.flag.alt = `Flag failed to load (${state.current.name})`;
    els.feedback.hidden = false;
    els.feedback.className = "feedback bad";
    els.feedback.textContent = "Flag image didn’t load — tap Next to skip (won’t cost a life).";
    els.next.hidden = false;
    state.skipBroken = true;
  });

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

function onChoose(btn, opt) {
  if (state.answered || state.lives <= 0) return;
  state.answered = true;

  // Once answered (right or wrong), never show this flag again this session.
  state.seen.add(state.current.code);

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
    queueMilestones();
  } else {
    btn.classList.add("wrong");
    state.streak = 0;
    state.lives -= 1;
    els.feedback.textContent =
      state.lives > 0
        ? `Nope — it’s ${state.current.name}. ${state.lives} ${state.lives === 1 ? "life" : "lives"} left.`
        : `Nope — it’s ${state.current.name}. That was your last life.`;
    els.feedback.className = "feedback bad";
  }

  els.feedback.hidden = false;
  els.next.hidden = false;
  els.next.textContent = state.lives <= 0 ? "See results" : "Next flag";
  updateStats();
}

function goNext() {
  if (state.skipBroken && state.current) {
    state.seen.add(state.current.code);
    state.skipBroken = false;
  }
  if (state.lives <= 0) {
    showGameOver();
    return;
  }
  if (drainCelebrateOrContinue()) return;
  if (!remaining().length) {
    showCleared();
    return;
  }
  renderRound();
}

function restart() {
  state.score = 0;
  state.streak = 0;
  state.lives = MAX_LIVES;
  state.seen = new Set();
  state.celebrateQueue = [];
  state.answered = false;
  state.skipBroken = false;
  hideOverlays();
  els.next.textContent = "Next flag";
  renderRound();
}

els.next.addEventListener("click", goNext);
els.restart.addEventListener("click", restart);
els.celebrateContinue.addEventListener("click", () => {
  els.celebrate.hidden = true;
  if (drainCelebrateOrContinue()) return;
  if (!remaining().length) {
    showCleared();
    return;
  }
  renderRound();
});
els.gameoverRestart.addEventListener("click", restart);
els.clearedRestart.addEventListener("click", restart);

renderRound();
