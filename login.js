const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const msgEl = document.getElementById("msg");
const stateEl = document.getElementById("state");
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");

function setMsg(text) {
    msgEl.textContent = text;
}

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem("pyr_users") || "[]");
    } catch {
        return [];
    }
}

function getSession() {
    try {
        return JSON.parse(localStorage.getItem("pyr_session") || "null");
    } catch {
        return null;
    }
}

function setSession(email) {
    localStorage.setItem("pyr_session", JSON.stringify({ email, ts: Date.now() }));
}

function clearSession() {
    localStorage.removeItem("pyr_session");
}

function renderState() {
    const session = getSession();
    if (!session) {
        stateEl.innerHTML = `<p class="muted">Not logged in.</p>`;
        return;
    }
    stateEl.innerHTML = `
    <p><strong>Logged in:</strong> ${session.email}</p>
    <p class="muted">Session created: ${new Date(session.ts).toLocaleString()}</p>
  `;
}

loginBtn.addEventListener("click", () => {
    const email = (emailEl.value || "").trim().toLowerCase();
    const password = passEl.value || "";

    if (!email) return setMsg("Enter your email.");
    if (!password) return setMsg("Enter your password.");

    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (!user || user.password !== password) {
        return setMsg("Incorrect email or password.");
    }

    setSession(email);
    setMsg("Logged in. Redirecting to the app...");
    renderState();

    setTimeout(() => {
        window.location.href = "app.html";
    }, 700);
});

logoutBtn.addEventListener("click", () => {
    clearSession();
    setMsg("Logged out.");
    renderState();
});

renderState();
