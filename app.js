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

    saveBtn.addEventListener("click", () => {
        const session = getSession();
        if (!session || !session.email) {
            saveMsgEl.textContent = "You must be logged in to save. Redirecting...";
            setTimeout(() => window.location.href = "login.html", 700);
            return;
        }

        const plan = {
            accountSize: Number(accountSizeEl.value || 0),
            experience: experienceEl.value,
            riskStyle: riskStyleEl.value,
            goal: goalEl.value,
            savedAt: Date.now()
        };

        if (!plan.accountSize || plan.accountSize <= 0) {
            saveMsgEl.textContent = "Enter your account size before saving.";
            return;
        }

        savePlanForUser(session.email, plan);
        saveMsgEl.textContent = "Saved. Open Account to view it.";
    });

    resultsEl.innerHTML = `
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

runBtn.addEventListener("click", runCheck);
