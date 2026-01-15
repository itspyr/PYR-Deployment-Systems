const accountInfoEl = document.getElementById("accountInfo");
const savedEl = document.getElementById("saved");
const logoutBtn = document.getElementById("logout");
const scoreEl = document.getElementById("accountScore");

function getUsers() {
    try { return JSON.parse(localStorage.getItem("pyr_users") || "[]"); }
    catch { return []; }
}

function getSession() {
    try { return JSON.parse(localStorage.getItem("pyr_session") || "null"); }
    catch { return null; }
}

function clearSession() {
    localStorage.removeItem("pyr_session");
}

function getSavedPlan(email) {
    try {
        const all = JSON.parse(localStorage.getItem("pyr_plans") || "{}");
        return all[email] || null;
    } catch {
        return null;
    }
}

function getLastScore() {
    try { return JSON.parse(localStorage.getItem("pyr_last_score") || "null"); }
    catch { return null; }
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function renderScoreCard(payload) {
    if (!scoreEl) return;

    if (!payload || typeof payload.score !== "number") {
        scoreEl.innerHTML = `
          <div class="score-top">
            <div>
              <div class="score-title">Behavioral Risk Score</div>
              <div class="muted" style="margin-top:6px;">Run a check in the App to generate your score.</div>
            </div>
            <span class="score-pill">—</span>
          </div>
          <div class="score-bar"><div class="score-bar-fill" style="width:0%"></div></div>
        `;
        return;
    }

    const score = clamp(payload.score, 0, 100);
    const tier = payload.tier || { label: "—", tag: "slate" };
    const topReasons = payload.topReasons || [];
    const nextAction = payload.nextAction || "Keep it simple and protect sizing.";

    scoreEl.innerHTML = `
      <div class="score-top">
        <div>
          <div class="score-title">Behavioral Risk Score</div>
          <div class="muted" style="margin-top:6px;">Always-on behavioral safety score.</div>
        </div>
        <span class="score-pill">${score} <span class="muted" style="font-weight:800;">/ 100</span></span>
      </div>

      <div class="score-bar">
        <div class="score-bar-fill" style="width:${score}%"></div>
      </div>

      <div class="score-meta">
        <span class="tag ${tier.tag || "slate"}">Tier: ${tier.label || "—"}</span>
      </div>

      <div class="score-reasons">
        <div class="muted" style="font-weight:800; margin-bottom:6px;">Top reasons</div>
        <ul>
          ${topReasons.length ? topReasons.map(r => `<li>${r.text} <span class="muted">(−${r.pts})</span></li>`).join("") : "<li>None</li>"}
        </ul>
      </div>

      <div class="score-next">
        <div class="muted" style="font-weight:800; margin-bottom:6px;">Next action</div>
        <div>${nextAction}</div>
      </div>
    `;
}

function render() {
    const session = getSession();
    if (!session || !session.email) {
        window.location.href = "login.html";
        return;
    }

    const users = getUsers();
    const user = users.find(u => u.email === session.email);

    accountInfoEl.innerHTML = `
      <p><strong>Name:</strong> ${user?.name || "Unknown"}</p>
      <p><strong>Email:</strong> ${session.email}</p>
      <p class="muted">Logged in: ${new Date(session.ts).toLocaleString()}</p>
    `;

    const plan = getSavedPlan(session.email);
    if (!plan) {
        savedEl.innerHTML = `<p class="muted">Nothing saved yet. Go to the app and run a check.</p>`;
    } else {
        const money = (n) => {
            const x = Number(n || 0);
            return x.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        };

        savedEl.innerHTML = `
      <div class="standing-card">
        <div class="standing-top">
          <div>
            <div class="standing-label">Account Value</div>
            <div class="standing-balance">$${money(plan.accountSize)}</div>
            <div class="standing-sub muted">Primary goal: <strong>${plan.goal}</strong></div>
          </div>

          <div class="standing-badge">
            <div class="standing-badge-title">Status</div>
            <div class="standing-badge-value">Active</div>
          </div>
        </div>

        <div class="standing-row">
          <div class="chip">
            <div class="chip-k">Experience</div>
            <div class="chip-v">${plan.experience}</div>
          </div>

          <div class="chip">
            <div class="chip-k">Risk Style</div>
            <div class="chip-v">${plan.riskStyle}</div>
          </div>

          <div class="chip">
            <div class="chip-k">Last Saved</div>
            <div class="chip-v">${new Date(plan.savedAt).toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;
    }


    // Score source preference:
    // 1) last score (fresh) if newer
    // 2) plan score snapshot if present
    const lastScore = getLastScore();
    const planScore = plan?.scoreSnapshot ? {
        score: plan.scoreSnapshot.score,
        tier: plan.scoreSnapshot.tier,
        ts: plan.scoreSnapshot.ts
    } : null;

    let best = null;
    if (lastScore && planScore) best = (lastScore.ts >= planScore.ts) ? lastScore : planScore;
    else best = lastScore || planScore;

    renderScoreCard(best);
}

logoutBtn.addEventListener("click", () => {
    clearSession();
    window.location.href = "login.html";
});

render();

// username MVP (unchanged)
(function usernameMVP(){
    const input = document.getElementById("usernameInput");
    const btn = document.getElementById("saveUsernameBtn");
    const status = document.getElementById("usernameStatus");
    if (!input || !btn) return;

    const KEY = "pyr_username";

    function norm(u){
        return (u || "").trim().toLowerCase();
    }

    function valid(u){
        return /^[a-z0-9_]{3,20}$/.test(u);
    }

    const existing = localStorage.getItem(KEY);
    if (existing) input.value = existing;

    btn.addEventListener("click", () => {
        const u = norm(input.value);

        if (!valid(u)){
            status.textContent = "Use 3–20 chars: letters, numbers, underscore.";
            return;
        }

        localStorage.setItem(KEY, u);
        status.textContent = `Saved as @${u}`;
        setTimeout(() => { if (status.textContent === `Saved as @${u}`) status.textContent = ""; }, 1800);
    });
})();
