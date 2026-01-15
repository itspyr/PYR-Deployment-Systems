const users = JSON.parse(localStorage.getItem("pyr_users") || "[]");

document.getElementById("signup").onclick = () => {
    const name = nameEl.value.trim();
    const email = emailEl.value.trim().toLowerCase();
    const password = passEl.value;

    if (!name || !email || !password) return msg("Fill all fields");

    if (users.find(u => u.email === email)) {
        return msg("Account already exists");
    }

    users.push({ name, email, password });
    localStorage.setItem("pyr_users", JSON.stringify(users));

    localStorage.setItem("pyr_session", JSON.stringify({ email, ts: Date.now() }));

    window.location.href = "account.html";
};
