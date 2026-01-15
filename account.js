const accountInfoEl = document.getElementById("accountInfo");
const savedEl = document.getElementById("saved");
const logoutBtn = document.getElementById("logout");

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

function render() {
    const session = getSession();
    if (!session || !session.email) {
        // Not logged in → send to login
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
        savedEl.innerHTML = `
      <p><strong>Account Size:</strong> $${plan.accountSize}</p>
      <p><strong>Experience:</strong> ${plan.experience}</p>
      <p><strong>Risk Style:</strong> ${plan.riskStyle}</p>
      <p><strong>Goal:</strong> ${plan.goal}</p>
      <p class="muted">Saved: ${new Date(plan.savedAt).toLocaleString()}</p>
    `;
    }
}

logoutBtn.addEventListener("click", () => {
    clearSession();
    window.location.href = "login.html";
});

render();
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

    // load existing
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
