const accountSizeEl = document.getElementById("accountSize");
const experienceEl = document.getElementById("experience");
const riskStyleEl = document.getElementById("riskStyle");
const goalEl = document.getElementById("goal");
const runBtn = document.getElementById("run");
const resultsEl = document.getElementById("results");

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

    const html = `
    <h3>Warnings</h3>
    <ul>${warnings.length ? warnings.map(w => `<li>${w}</li>`).join("") : "<li>None</li>"}</ul>

    <h3>Suggestions</h3>
    <ul>${suggestions.length ? suggestions.map(s => `<li>${s}</li>`).join("") : "<li>None</li>"}</ul>

    <h3>Summary</h3>
    <p><strong>Account:</strong> $${accountSize || "?"} | <strong>Experience:</strong> ${experience} | <strong>Risk:</strong> ${riskStyle} | <strong>Goal:</strong> ${goal}</p>
  `;

    resultsEl.innerHTML = html;
}

if (runBtn && resultsEl && accountSizeEl && experienceEl && riskStyleEl && goalEl) {
    runBtn.addEventListener("click", runCheck);
}

(function tradingJournalMVP() {
    // You need an identifier for the logged-in account.
    // If you already store it, replace this lookup with your real value.
    // Fallback tries to read an email from the page or localStorage.
    function getAccountId() {
        // Try localStorage first (recommended you store this during login)
        const storedEmail = localStorage.getItem("pyr_email");
        if (storedEmail) return storedEmail.toLowerCase();

        // Try to detect an email in the DOM if you render it
        const bodyText = document.body.innerText || "";
        const match = bodyText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        if (match) return match[0].toLowerCase();

        return "guest";
    }

    const accountId = getAccountId();
    const storageKey = `pyr_journal_${accountId}`;

    // Elements
    const prevBtn = document.getElementById("prevTradeBtn");
    const nextBtn = document.getElementById("nextTradeBtn");
    const newBtn = document.getElementById("newTradeBtn");
    const saveBtn = document.getElementById("saveTradeBtn");
    const delBtn = document.getElementById("deleteTradeBtn");

    const statusEl = document.getElementById("journalStatus");
    const savedNoteEl = document.getElementById("journalSavedNote");

    const listEl = document.getElementById("journalListItems");
    const searchEl = document.getElementById("journalSearch");

    const fields = {
        date: document.getElementById("tDate"),
        ticker: document.getElementById("tTicker"),
        strategy: document.getElementById("tStrategy"),
        entry: document.getElementById("tEntry"),
        exit: document.getElementById("tExit"),
        size: document.getElementById("tSize"),
        result: document.getElementById("tResult"),
        thesis: document.getElementById("tThesis"),
        execution: document.getElementById("tExecution"),
        notes: document.getElementById("tNotes"),
    };

    if (!prevBtn || !saveBtn || !fields.ticker) return; // not on account page

    let trades = loadTrades();
    let currentIndex = trades.length > 0 ? 0 : -1; // -1 means blank new page not yet saved
    let currentId = null; // id of the trade currently loaded, null means new page

    function nowISO() {
        return new Date().toISOString();
    }

    function loadTrades() {
        try {
            const raw = localStorage.getItem(storageKey);
            const arr = raw ? JSON.parse(raw) : [];
            // newest first
            arr.sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));
            return Array.isArray(arr) ? arr : [];
        } catch {
            return [];
        }
    }

    function saveTrades() {
        localStorage.setItem(storageKey, JSON.stringify(trades));
    }

    function blankTrade() {
        return {
            id: null,
            date: "",
            ticker: "",
            strategy: "",
            entry: "",
            exit: "",
            size: "",
            result: "",
            thesis: "",
            execution: "",
            notes: "",
            createdAt: null,
            updatedAt: null,
        };
    }

    function readForm() {
        return {
            id: currentId,
            date: fields.date.value || "",
            ticker: (fields.ticker.value || "").trim().toUpperCase(),
            strategy: (fields.strategy.value || "").trim(),
            entry: fields.entry.value || "",
            exit: fields.exit.value || "",
            size: (fields.size.value || "").trim(),
            result: fields.result.value || "",
            thesis: (fields.thesis.value || "").trim(),
            execution: (fields.execution.value || "").trim(),
            notes: (fields.notes.value || "").trim(),
            createdAt: null,
            updatedAt: null,
        };
    }

    function writeForm(t) {
        fields.date.value = t.date || "";
        fields.ticker.value = t.ticker || "";
        fields.strategy.value = t.strategy || "";
        fields.entry.value = t.entry || "";
        fields.exit.value = t.exit || "";
        fields.size.value = t.size || "";
        fields.result.value = t.result || "";
        fields.thesis.value = t.thesis || "";
        fields.execution.value = t.execution || "";
        fields.notes.value = t.notes || "";
    }

    function setStatus() {
        const totalSaved = trades.length;
        if (currentId === null) {
            // new page
            statusEl.textContent = totalSaved === 0 ? "New Page (nothing saved yet)" : `New Page • Saved trades: ${totalSaved}`;
        } else {
            const pos = trades.findIndex(t => t.id === currentId);
            statusEl.textContent = pos >= 0 ? `Page ${pos + 1} of ${totalSaved}` : `Page ? of ${totalSaved}`;
        }

        prevBtn.disabled = trades.length === 0;
        nextBtn.disabled = trades.length === 0;
        delBtn.disabled = currentId === null;
    }

    function toast(msg) {
        savedNoteEl.textContent = msg;
        setTimeout(() => {
            if (savedNoteEl.textContent === msg) savedNoteEl.textContent = "";
        }, 1800);
    }

    function renderList() {
        const q = (searchEl.value || "").trim().toUpperCase();

        const filtered = trades.filter(t => {
            if (!q) return true;
            const hay = `${t.ticker || ""} ${t.strategy || ""} ${t.thesis || ""} ${t.notes || ""}`.toUpperCase();
            return hay.includes(q);
        });

        listEl.innerHTML = "";

        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="muted">No trades yet.</div>`;
            return;
        }

        filtered.forEach(t => {
            const left = document.createElement("div");
            const right = document.createElement("div");
            const wrap = document.createElement("div");
            wrap.className = "journal-item";

            const title = document.createElement("div");
            title.innerHTML = `<strong>${t.ticker || "UNTITLED"}</strong> <span class="muted">${t.strategy || ""}</span>`;

            const meta = document.createElement("div");
            const date = t.date ? t.date : (t.updatedAt ? t.updatedAt.slice(0, 10) : "");
            meta.className = "muted";
            meta.textContent = `${date}${t.result ? " • " + t.result : ""}`;

            left.appendChild(title);
            left.appendChild(meta);

            const openBtn = document.createElement("button");
            openBtn.className = "btn small ghost";
            openBtn.textContent = "Open";
            openBtn.onclick = () => openTradeById(t.id);

            right.appendChild(openBtn);

            wrap.appendChild(left);
            wrap.appendChild(right);
            listEl.appendChild(wrap);
        });
    }

    function openTradeById(id) {
        const t = trades.find(x => x.id === id);
        if (!t) return;

        currentId = t.id;
        currentIndex = trades.findIndex(x => x.id === id);
        writeForm(t);
        setStatus();
        toast("Opened");
    }

    function openPrev() {
        if (trades.length === 0) return;

        if (currentId === null) {
            // new page -> go to first saved
            openTradeById(trades[0].id);
            return;
        }

        const idx = trades.findIndex(t => t.id === currentId);
        const prev = idx + 1; // because newest first and "prev" means older
        if (prev < trades.length) openTradeById(trades[prev].id);
        else toast("End");
    }

    function openNext() {
        if (trades.length === 0) return;

        if (currentId === null) {
            openTradeById(trades[0].id);
            return;
        }

        const idx = trades.findIndex(t => t.id === currentId);
        const next = idx - 1;
        if (next >= 0) openTradeById(trades[next].id);
        else toast("Newest");
    }

    function newPage() {
        currentId = null;
        currentIndex = -1;
        writeForm(blankTrade());
        setStatus();
        toast("New page");
    }

    function upsertCurrent() {
        const t = readForm();

        if (!t.ticker) {
            toast("Add a ticker first");
            fields.ticker.focus();
            return;
        }

        const stamp = nowISO();

        if (!t.id) {
            t.id = crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
            t.createdAt = stamp;
            t.updatedAt = stamp;
            trades.unshift(t); // newest first
            currentId = t.id;
            currentIndex = 0;
            toast("Saved");
        } else {
            const i = trades.findIndex(x => x.id === t.id);
            if (i >= 0) {
                t.createdAt = trades[i].createdAt || stamp;
                t.updatedAt = stamp;
                trades[i] = { ...trades[i], ...t, updatedAt: stamp };
                toast("Updated");
            } else {
                t.createdAt = stamp;
                t.updatedAt = stamp;
                trades.unshift(t);
                toast("Saved");
            }
        }

        saveTrades();
        setStatus();
        renderList();
    }

    function deleteCurrent() {
        if (!currentId) return;

        const i = trades.findIndex(t => t.id === currentId);
        if (i < 0) return;

        trades.splice(i, 1);
        saveTrades();

        if (trades.length > 0) {
            openTradeById(trades[Math.max(0, i - 1)].id);
        } else {
            newPage();
        }

        renderList();
        toast("Deleted");
    }

    // Wire up
    prevBtn.addEventListener("click", openPrev);
    nextBtn.addEventListener("click", openNext);
    newBtn.addEventListener("click", newPage);
    saveBtn.addEventListener("click", upsertCurrent);
    delBtn.addEventListener("click", deleteCurrent);
    searchEl.addEventListener("input", renderList);

    // Initial load
    if (trades.length > 0) {
        openTradeById(trades[0].id);
    } else {
        newPage();
    }
    renderList();
})();

