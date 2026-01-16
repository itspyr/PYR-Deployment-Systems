// quiz.js

// Storage keys
const KEY_POINTS = "pyr_points";
const KEY_STREAK = "pyr_streak";
const KEY_LAST_DATE = "pyr_last_quiz_date";
const KEY_LAST_SCORE = "pyr_last_quiz_score";
const KEY_LAST_SET = "pyr_last_quiz_set";
function show(el) { if (el) el.style.display = "block"; }
function hide(el) { if (el) el.style.display = "none"; }


// --- Date helpers (daily seed) ---
function todayKey() {
    // local date in YYYY-MM-DD
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

// --- Simple seeded RNG (deterministic) ---
function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return function () {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}

function mulberry32(seed) {
    return function () {
        let t = (seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function seededShuffle(arr, seedStr) {
    const seedGen = xmur3(seedStr);
    const rand = mulberry32(seedGen());
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// --- Pick today’s 5 questions ---
function getTodaysQuiz(bank, count = 5) {
    const seedStr = `PYR_DAILY_${todayKey()}`;
    const shuffled = seededShuffle(bank, seedStr);

    // Simple “balance” pass: try to include different topics
    const picked = [];
    const usedTopics = new Set();

    for (const q of shuffled) {
        if (picked.length >= count) break;
        if (!usedTopics.has(q.topic) || usedTopics.size >= 3) {
            picked.push(q);
            usedTopics.add(q.topic);
        }
    }

    // If still short, fill from start
    let i = 0;
    while (picked.length < count && i < shuffled.length) {
        if (!picked.includes(shuffled[i])) picked.push(shuffled[i]);
        i++;
    }

    return picked.slice(0, count);
}

// --- Points/streak helpers ---
function renderHeaderStats() {
    const p = document.getElementById("pointsVal");
    const s = document.getElementById("streakVal");

    if (p) p.textContent = String(getNum(KEY_POINTS, 0));
    if (s) s.textContent = String(getNum(KEY_STREAK, 0));
}

function getNum(key, fallback = 0) {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) ? n : fallback;
}

function setNum(key, value) {
    localStorage.setItem(key, String(value));
}

function isSameDay(a, b) {
    return a === b;
}

function yesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function awardStreakBonus(streak) {
    if (streak === 3) return 5;
    if (streak === 7) return 15;
    if (streak === 14) return 30;
    return 0;
}

// --- Render + grade (minimal DOM expectations) ---
function renderQuiz(questions) {
    const wrap = document.getElementById("quiz");
    if (!wrap) return;

    wrap.innerHTML = questions.map((q, idx) => {
        const opts = q.choices.map((c, i) => {
            return `
        <label class="quiz-choice">
          <input type="radio" name="q_${idx}" value="${i}">
          <span>${c}</span>
        </label>
      `;
        }).join("");

        return `
      <div class="quiz-q">
        <div class="muted" style="font-size:12px; margin-bottom:6px;">${q.topic.toUpperCase()}</div>
        <div style="font-weight:900; margin-bottom:10px;">${idx + 1}. ${q.prompt}</div>
        <div class="quiz-choices">${opts}</div>
      </div>
    `;
    }).join("");
}

function gradeQuiz(questions) {
    let correct = 0;

    questions.forEach((q, idx) => {
        const picked = document.querySelector(`input[name="q_${idx}"]:checked`);
        const answer = picked ? Number(picked.value) : -1;
        if (answer === q.answerIndex) correct++;
    });

    // Points:
    // Finish: +10
    // Each correct: +2
    // Perfect: +5 bonus
    const base = 10;
    const perCorrect = correct * 2;
    const perfect = (correct === questions.length) ? 5 : 0;

    return { correct, total: questions.length, pointsEarned: base + perCorrect + perfect };
}

function setResultText(text) {
    const el = document.getElementById("quizResult");
    if (el) el.textContent = text;
}

function initDailyQuiz() {
    const bank = window.PYR_QUIZ_BANK || [];
    const today = todayKey();
    renderHeaderStats();


    // Page elements (new)
    const intro = document.getElementById("trainingIntro");
    const quizWrap = document.getElementById("quizWrap");
    const locked = document.getElementById("quizLocked");
    const startBtn = document.getElementById("startQuizBtn");
    const submitBtn = document.getElementById("submitQuizBtn");



    if (!bank.length) {
        setResultText("No questions found. Check quiz_bank.js");
        return;
    }

    // Lock daily attempt
    const lastDate = localStorage.getItem(KEY_LAST_DATE) || "";
    const alreadyDone = isSameDay(lastDate, today);

    // If already completed today → show locked state only
    if (alreadyDone) {
        if (intro) intro.style.display = "none";
        if (quizWrap) quizWrap.style.display = "none";
        if (locked) locked.style.display = "block";

        const lastScore = getNum(KEY_LAST_SCORE, 0);
        setResultText(`Completed today. Last score: ${lastScore}/5`);
        return;
    }

    // Not done yet → show intro first
    if (intro) intro.style.display = "block";
    if (quizWrap) quizWrap.style.display = "none";
    if (locked) locked.style.display = "none";

    // Pick today’s set (same every refresh)
    const todaysSet = getTodaysQuiz(bank, 5);
    localStorage.setItem(KEY_LAST_SET, JSON.stringify(todaysSet.map(q => q.id)));
    document.getElementById("pointsVal") && (document.getElementById("pointsVal").textContent = String(getNum(KEY_POINTS, 0)));
    document.getElementById("streakVal") && (document.getElementById("streakVal").textContent = String(getNum(KEY_STREAK, 0)));

    // Start button shows quiz + renders questions
    if (startBtn) {
        startBtn.addEventListener("click", () => {
            if (intro) intro.style.display = "none";
            if (quizWrap) quizWrap.style.display = "block";
            renderQuiz(todaysSet);
        });
    }

    // Submit handler (this replaces your old btn.addEventListener)
    if (!submitBtn) return;

    submitBtn.addEventListener("click", () => {
        const { correct, total, pointsEarned } = gradeQuiz(todaysSet);

        // Update streak
        const prevDate = localStorage.getItem(KEY_LAST_DATE) || "";
        let streak = getNum(KEY_STREAK, 0);

        if (prevDate === yesterdayKey()) streak += 1;
        else streak = 1;

        const streakBonus = awardStreakBonus(streak);

        // Update points
        const points = getNum(KEY_POINTS, 0);
        const newPoints = points + pointsEarned + streakBonus;

        setNum(KEY_POINTS, newPoints);
        setNum(KEY_STREAK, streak);
        localStorage.setItem(KEY_LAST_DATE, today);
        setNum(KEY_LAST_SCORE, correct);

        renderHeaderStats();


        // Lock the user out until tomorrow
        if (quizWrap) quizWrap.style.display = "none";
        if (locked) locked.style.display = "block";

        setResultText(
            `Score: ${correct}/${total}. +${pointsEarned} pts` +
            (streakBonus ? ` (+${streakBonus} streak bonus)` : "") +
            `. Streak: ${streak} day(s). Total: ${newPoints} pts.`
        );
    });
}


document.addEventListener("DOMContentLoaded", initDailyQuiz);
