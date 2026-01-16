const accountSizeEl = document.getElementById("accountSize");
const experienceEl = document.getElementById("experience");
const riskStyleEl = document.getElementById("riskStyle");
const goalEl = document.getElementById("goal");
const runBtn = document.getElementById("run");
const resultsEl = document.getElementById("results");
const saveBtn = document.getElementById("save");
const saveMsgEl = document.getElementById("saveMsg");

function tag(type) {
    if (type === "warning") return `<span class="tag red">Warning</span>`;
    if (type === "suggestion") return `<span class="tag green">Suggestion</span>`;
    return `<span class="tag slate">Summary</span>`;
}

function getSession() {
    try { return JSON.parse(localStorage.getItem("pyr_session") || "null"); }
    catch { return null; }
}

function savePlanForUser(email, plan) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem("pyr_plans") || "{}"); } catch {}
    all[email] = plan;
    localStorage.setItem("pyr_plans", JSON.stringify(all));
}

/* =========================
   Behavioral Risk Score (0-100)
   ========================= */
const SCORE_KEY = "pyr_last_score";

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function tierFor(score) {
    if (score >= 80) return { label: "Strong", tag: "green" };
    if (score >= 65) return { label: "Solid", tag: "slate" };
    if (score >= 50) return { label: "Elevated", tag: "red" };
    return { label: "Blow-up zone", tag: "red" };
}

function computeBehaviorScore({ accountSize, experience, riskStyle, goal }) {
    let score = 100;
    const reasons = [];

    // A) Experience vs Risk Style (0–35)
    const expRiskPenalty = {
        beginner:      { aggressive: 35, balanced: 18, conservative: 10 },
        intermediate:  { aggressive: 20, balanced: 8,  conservative: 4  },
        advanced:      { aggressive: 10, balanced: 4,  conservative: 2  },
    };
    const a = expRiskPenalty?.[experience]?.[riskStyle] ?? 0;
    if (a) {
        score -= a;
        reasons.push({
            k: "expRisk",
            pts: a,
            text: `${experience} experience + ${riskStyle} risk tends to amplify emotional mistakes.`,
        });
    }

    // B) Goal vs Risk Style (0–25)
    const goalRiskPenalty = {
        income:    { aggressive: 25, balanced: 12, conservative: 6 },
        growth:    { aggressive: 12, balanced: 6,  conservative: 4 },
        preserve:  { aggressive: 18, balanced: 8,  conservative: 2 },
    };
    const b = goalRiskPenalty?.[goal]?.[riskStyle] ?? 0;
    if (b) {
        score -= b;
        reasons.push({
            k: "goalRisk",
            pts: b,
            text: `Goal "${goal}" conflicts with ${riskStyle} risk expectations.`,
        });
    }

    // C) Account size stress (0–20)
    let c = 0;
    if (accountSize > 0 && accountSize < 2000) c = 20;
    else if (accountSize < 5000) c = 14;
    else if (accountSize < 10000) c = 10;
    else if (accountSize < 25000) c = 6;
    else if (accountSize >= 25000) c = 2;

    if (accountSize > 0 && c) {
        score -= c;
        reasons.push({
            k: "acctSize",
            pts: c,
            text: `Smaller accounts make sizing errors and tilt more expensive.`,
        });
    }

    // D) Consistency (0–20) using what you already have
    // - no saved plan yet (per session email) -> -8
    // - no journal trades saved -> -6 (uses existing key format pyr_journal_<email>)
    // - last score missing (first time) -> handled in UI, not penalty
    let d = 0;
    let consistencyNotes = [];

    const session = getSession();
    const email = session?.email || "";
    if (email) {
        // saved plan check
        let hasPlan = false;
        try {
            const allPlans = JSON.parse(localStorage.getItem("pyr_plans") || "{}");
            hasPlan = !!allPlans[email];
        } catch {}

        if (!hasPlan) {
            d += 8;
            consistencyNotes.push("No saved plan yet");
        }

        // journal check (your account page stores under pyr_journal_<email>)
        let hasTrades = false;
        try {
            const raw = localStorage.getItem(`pyr_journal_${email}`);
            const arr = raw ? JSON.parse(raw) : [];
            hasTrades = Array.isArray(arr) && arr.length > 0;
        } catch {}

        if (!hasTrades) {
            d += 6;
            consistencyNotes.push("No journal entries saved yet");
        }
    } else {
        // not logged in = no long-term consistency signals
        d += 6;
        consistencyNotes.push("Not logged in (no consistency signals)");
    }

    if (d) {
        score -= d;
        reasons.push({
            k: "consistency",
            pts: d,
            text: `Consistency gap: ${consistencyNotes.join(", ")}.`,
        });
    }

    score = clamp(score, 0, 100);

    // Sort reasons by penalty weight, take top 2
    reasons.sort((x, y) => (y.pts || 0) - (x.pts || 0));
    const topReasons = reasons.slice(0, 2);

    const tier = tierFor(score);

    // Next action (simple but useful)
    let nextAction = "Keep it simple and protect sizing.";
    if (score < 50) {
        nextAction = "Switch to balanced risk, simplify goal, and cap position size hard.";
    } else if (score < 65) {
        nextAction = "Reduce risk one notch or align goal to match your risk style.";
    } else if (score < 80) {
        nextAction = "Lock your plan for 2 weeks and stop changing settings daily.";
    } else {
        nextAction = "Maintain. Don’t raise risk unless your execution stays clean.";
    }

    return { score, tier, topReasons, nextAction };
}

function persistLastScore(payload) {
    localStorage.setItem(SCORE_KEY, JSON.stringify(payload));
}

function readCurrentInputs() {
    return {
        accountSize: Number(accountSizeEl.value || 0),
        experience: experienceEl.value,
        riskStyle: riskStyleEl.value,
        goal: goalEl.value,
    };
}

/* ---------- Score UI (always on, live) ---------- */
function ensureScoreMount() {
    if (!resultsEl) return null;

    let mount = document.getElementById("pyrScoreBlock");
    if (mount) return mount;

    // If results has the default paragraph, keep it, but add score above it.
    mount = document.createElement("div");
    mount.id = "pyrScoreBlock";
    mount.className = "score-card";
    resultsEl.prepend(mount);
    return mount;
}

function renderScoreLive() {
    const mount = ensureScoreMount();
    if (!mount) return;

    const inputs = readCurrentInputs();

    // If they haven't entered account size yet, show a "waiting" state.
    if (!inputs.accountSize || inputs.accountSize <= 0) {
        mount.innerHTML = `
          <div class="score-top">
            <div>
              <div class="score-title">Behavioral Risk Score</div>
              <div class="muted" style="margin-top:6px;">Enter your account size to calculate your score.</div>
            </div>
            <span class="score-pill">—</span>
          </div>
          <div class="score-bar"><div class="score-bar-fill" style="width:0%"></div></div>
        `;
        return;
    }

    const out = computeBehaviorScore(inputs);

    // store last score (freshly generated, live)
    persistLastScore({
        ts: Date.now(),
        inputs,
        score: out.score,
        tier: out.tier,
        topReasons: out.topReasons,
        nextAction: out.nextAction
    });

    const fill = clamp(out.score, 0, 100);

    mount.innerHTML = `
      <div class="score-top">
        <div>
          <div class="score-title">Behavioral Risk Score</div>
          <div class="muted" style="margin-top:6px;">Higher is safer. Built to protect behavior, not predict price.</div>
        </div>
        <span class="score-pill">${out.score} <span class="muted" style="font-weight:800;">/ 100</span></span>
      </div>

      <div class="score-bar" aria-label="Behavioral risk score bar">
        <div class="score-bar-fill" style="width:${fill}%"></div>
      </div>

      <div class="score-meta">
        <span class="tag ${out.tier.tag}">Tier: ${out.tier.label}</span>
      </div>

      <div class="score-reasons">
        <div class="muted" style="font-weight:800; margin-bottom:6px;">Top reasons</div>
        <ul>
          ${out.topReasons.length ? out.topReasons.map(r => `<li>${r.text} <span class="muted">(−${r.pts})</span></li>`).join("") : "<li>None</li>"}
        </ul>
      </div>

      <div class="score-next">
        <div class="muted" style="font-weight:800; margin-bottom:6px;">Next action</div>
        <div>${out.nextAction}</div>
      </div>
    `;
}

/* ---------- Run Check (warnings/suggestions) ---------- */
function runCheck() {
    const accountSize = Number(accountSizeEl.value || 0);
    const experience = experienceEl.value;
    const riskStyle = riskStyleEl.value;
    const goal = goalEl.value;

    const warnings = [];
    const suggestions = [];

    if (accountSize <= 0) warnings.push("Enter your account size.");

    if (experience === "beginner" && riskStyle === "aggressive") {
        warnings.push("Aggressive risk + beginner experience is a common blow-up combo.");
        suggestions.push("Start balanced until you build reps and rules.");
    }

    if (goal === "income" && riskStyle === "aggressive") {
        warnings.push("Weekly income goal usually breaks when risk is too high.");
        suggestions.push("Cap position size and avoid chasing premiums.");
    }

    if (accountSize > 0 && accountSize < 2000) {
        warnings.push("Small account: fees and mistakes hurt more.");
        suggestions.push("Use smaller sizing and focus on consistency.");
    }

    // IMPORTANT: do NOT overwrite the live score block.
    // We'll render the check output below it.
    let checkMount = document.getElementById("pyrCheckBlock");
    if (!checkMount) {
        checkMount = document.createElement("div");
        checkMount.id = "pyrCheckBlock";
        resultsEl.appendChild(checkMount);
    }

    checkMount.innerHTML = `
      <div class="result-block">
        ${tag("warning")}
        <h3>Warnings</h3>
        <ul>${warnings.length ? warnings.map(w => `<li>${w}</li>`).join("") : "<li>None</li>"}</ul>
      </div>

      <div class="result-block">
        ${tag("suggestion")}
        <h3>Suggestions</h3>
        <ul>${suggestions.length ? suggestions.map(s => `<li>${s}</li>`).join("") : "<li>None</li>"}</ul>
      </div>

      <div class="result-block">
        ${tag("summary")}
        <h3>Summary</h3>
        <p><strong>Account:</strong> $${accountSize || "?"}
        &nbsp;•&nbsp; <strong>Experience:</strong> ${experience}
        &nbsp;•&nbsp; <strong>Risk:</strong> ${riskStyle}
        &nbsp;•&nbsp; <strong>Goal:</strong> ${goal}</p>
      </div>
    `;
}

/* ---------- Save Plan (wire ONCE, not inside runCheck) ---------- */
function onSavePlan() {
    const session = getSession();
    if (!session || !session.email) {
        saveMsgEl.textContent = "You must be logged in to save. Redirecting...";
        setTimeout(() => window.location.href = "login.html", 700);
        return;
    }

    const inputs = readCurrentInputs();

    if (!inputs.accountSize || inputs.accountSize <= 0) {
        saveMsgEl.textContent = "Enter your account size before saving.";
        return;
    }

    // pull last score snapshot
    let lastScore = null;
    try { lastScore = JSON.parse(localStorage.getItem(SCORE_KEY) || "null"); } catch {}

    const plan = {
        accountSize: inputs.accountSize,
        experience: inputs.experience,
        riskStyle: inputs.riskStyle,
        goal: inputs.goal,
        scoreSnapshot: lastScore ? {
            score: lastScore.score,
            tier: lastScore.tier,
            ts: lastScore.ts
        } : null,
        savedAt: Date.now()
    };

    savePlanForUser(session.email, plan);
    saveMsgEl.textContent = "Saved. Open Account to view it.";
}

/* ---------- Wiring ---------- */
runBtn.addEventListener("click", runCheck);
saveBtn.addEventListener("click", onSavePlan);

// LIVE score updates
["input", "change"].forEach(evt => {
    accountSizeEl.addEventListener(evt, renderScoreLive);
    experienceEl.addEventListener(evt, renderScoreLive);
    riskStyleEl.addEventListener(evt, renderScoreLive);
    goalEl.addEventListener(evt, renderScoreLive);
});

// initial render
renderScoreLive();
