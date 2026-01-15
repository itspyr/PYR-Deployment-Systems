
const tickerEl = document.getElementById("cTicker");
const strategyEl = document.getElementById("cStrategy");
const timeframeEl = document.getElementById("cTimeframe");
const entryEl = document.getElementById("cEntry");
const stopEl = document.getElementById("cStop");
const tpEl = document.getElementById("cTP");
const sizeEl = document.getElementById("cSize");
const thesisEl = document.getElementById("cThesis");
const invalidationEl = document.getElementById("cInvalidation");
const stateEl = document.getElementById("cState");
const intentEl = document.getElementById("cIntent");

const challengeBtn = document.getElementById("challengeBtn");
const clearBtn = document.getElementById("clearBtn");
const msgEl = document.getElementById("challengeMsg");
const outEl = document.getElementById("challengeOut");

const LAST_CHALLENGE_KEY = "pyr_last_challenge";
const LAST_SCORE_KEY = "pyr_last_score";

function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
        "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
}

function getLastScore() {
    try { return JSON.parse(localStorage.getItem(LAST_SCORE_KEY) || "null"); }
    catch { return null; }
}

function readInputs() {
    return {
        ticker: (tickerEl.value || "").trim().toUpperCase(),
        strategy: (strategyEl.value || "").trim(),
        timeframe: timeframeEl.value,
        entry: Number(entryEl.value || 0),
        stop: Number(stopEl.value || 0),
        tp: Number(tpEl.value || 0),
        size: (sizeEl.value || "").trim(),
        thesis: (thesisEl.value || "").trim(),
        invalidation: (invalidationEl.value || "").trim(),
        state: stateEl.value,
        intent: intentEl.value,
    };
}

function rr(entry, stop, tp) {
    // Reward: |tp-entry|, Risk: |entry-stop|
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(tp - entry);
    if (!entry || !stop || !tp) return null;
    if (risk === 0) return null;
    return reward / risk;
}

function makeHardQuestions(d) {
    const q = [];

    q.push("What is the single condition that invalidates this trade and forces an exit (no debate)?");
    q.push("If this trade loses, what mistake is most likely: entry too early, stop too wide, sizing too big, or thesis weak?");
    q.push("What would you tell a friend to do if they brought you this exact trade and were feeling how you feel right now?");
    q.push("If you cannot explain this setup in one sentence, why are you risking money on it?");
    q.push("Are you trading for edge or for emotion (relief, boredom, proving a point)?");

    // Add context-based questions
    if (d.timeframe === "intraday") q.push("Intraday: what time-based rule stops you from overtrading if it chops?");
    if (d.timeframe === "swing") q.push("Swing: what’s your plan if it gaps against you overnight?");
    if (d.timeframe === "position") q.push("Position: what evidence would make you reduce exposure, not just ‘hold and hope’?");
    if (d.state === "fomo") q.push("FOMO check: what’s your rule for not chasing (limit entry, pullback level, or no trade)?");
    if (d.state === "revenge") q.push("Revenge check: what’s your cooldown rule before the next trade?");
    if (d.intent === "relief") q.push("Relief intent: what non-trading action gives the same relief without risk?");

    return q;
}

function makeFlags(d, lastScore) {
    const flags = [];
    const suggestions = [];

    if (!d.ticker) flags.push("Missing ticker. Don’t trade unnamed ideas.");
    if (!d.thesis || d.thesis.length < 12) flags.push("Thesis is too thin. If you can’t explain it, you don’t have it.");
    if (!d.invalidation || d.invalidation.length < 10) flags.push("Invalidation is vague. ‘I’ll know’ is not a rule.");

    // Price structure sanity
    if (d.entry && d.stop && d.entry === d.stop) flags.push("Stop equals entry. That’s not an invalidation, that’s noise.");
    if (d.entry && d.stop && Math.abs(d.entry - d.stop) / Math.max(d.entry, 1) < 0.001) {
        flags.push("Stop is extremely tight. That often turns into chop losses or moving the stop.");
    }

    const ratio = rr(d.entry, d.stop, d.tp);
    if (ratio !== null && ratio < 1.2) flags.push(`Risk/Reward looks weak (R:R ≈ ${ratio.toFixed(2)}). Weak trades become emotional trades.`);
    if (ratio !== null && ratio >= 3) suggestions.push(`R:R is strong (≈ ${ratio.toFixed(2)}). Only matters if you respect the stop.`);

    // Emotional state
    if (d.state === "fomo") flags.push("FOMO state detected. This is where chasing and oversized entries happen.");
    if (d.state === "revenge") flags.push("Revenge state detected. Highest risk for breaking rules to ‘get it back’.");
    if (d.state === "stressed") flags.push("Stressed/distracted state. Execution tends to slip.");
    if (d.state === "bored") flags.push("Boredom state. Overtrading risk is high.");

    // Intent
    if (d.intent === "prove") flags.push("Intent is to prove something. That’s ego-driven risk.");
    if (d.intent === "relief") flags.push("Intent is relief. Relief trades are rarely planned trades.");

    // Use Behavioral Risk Score if available
    const scoreVal = lastScore?.score;
    const tierLabel = lastScore?.tier?.label;
    if (typeof scoreVal === "number") {
        if (scoreVal < 50) flags.push(`Your Behavioral Risk Score is ${scoreVal}/100 (${tierLabel}). This is a do-nothing zone unless the plan is perfect.`);
        else if (scoreVal < 65) flags.push(`Your Behavioral Risk Score is ${scoreVal}/100 (${tierLabel}). You need tighter rules and smaller size.`);
    } else {
        suggestions.push("Tip: Run the App check once so this tool can reference your Behavioral Risk Score.");
    }

    // Suggestions that are always useful
    if (d.entry && d.stop && d.entry !== d.stop) {
        suggestions.push("Write a one-line exit rule now: ‘If price hits my stop, I exit. No exceptions.’");
    }
    if (!d.size) suggestions.push("Add position size. ‘I’ll figure it out’ is where people oversize.");
    suggestions.push("If you cannot accept the loss amount emotionally, the size is too big.");

    return { flags, suggestions, ratio };
}

function doNothingDecision(d, flags, lastScore) {
    // Conservative do-nothing logic: emotional state + missing rules + low score
    const missingCore = (!d.stop || !d.entry || !d.tp || !d.invalidation);
    const emotional = (d.state === "revenge" || d.state === "fomo" || d.state === "stressed");
    const reliefOrProve = (d.intent === "relief" || d.intent === "prove");
    const lowScore = (typeof lastScore?.score === "number" && lastScore.score < 50);

    if (missingCore && (emotional || reliefOrProve)) return "DO NOTHING: Missing rules + emotional intent. This is a classic mistake setup.";
    if (lowScore && (emotional || missingCore)) return "DO NOTHING: Your current behavioral risk is too high to trust execution.";
    if (flags.length >= 5) return "DO NOTHING: Too many red flags. Reduce complexity or wait for a cleaner setup.";
    return null;
}

function saveLastChallenge(payload) {
    localStorage.setItem(LAST_CHALLENGE_KEY, JSON.stringify(payload));
}

function renderOutput(d, lastScore) {
    const { flags, suggestions, ratio } = makeFlags(d, lastScore);
    const hardQs = makeHardQuestions(d);
    const doNothing = doNothingDecision(d, flags, lastScore);

    const scoreLine = (typeof lastScore?.score === "number")
        ? `<span class="tag slate">Behavior Score: ${lastScore.score}/100</span>`
        : `<span class="tag slate">Behavior Score: —</span>`;

    const rrLine = (ratio === null)
        ? `<span class="tag slate">R:R: —</span>`
        : `<span class="tag slate">R:R: ${ratio.toFixed(2)}</span>`;

    outEl.innerHTML = `
    <div class="result-block">
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <span class="tag green">Coach</span>
        ${scoreLine}
        ${rrLine}
      </div>

      <h3 style="margin-top:10px;">Trade Snapshot</h3>
      <p style="margin:6px 0 0;">
        <strong>${esc(d.ticker || "—")}</strong>
        ${d.strategy ? `<span class="muted"> • ${esc(d.strategy)}</span>` : ""}
        <span class="muted"> • ${esc(d.timeframe)}</span>
      </p>

      <p class="muted" style="margin:10px 0 0;">
        Entry: <strong>${d.entry ? d.entry : "—"}</strong>
        &nbsp;•&nbsp; Stop: <strong>${d.stop ? d.stop : "—"}</strong>
        &nbsp;•&nbsp; Take profit: <strong>${d.tp ? d.tp : "—"}</strong>
      </p>

      ${doNothing ? `
        <div class="result-block" style="margin-top:12px;">
          <span class="tag red">Do nothing</span>
          <p style="margin:8px 0 0;"><strong>${esc(doNothing)}</strong></p>
          <p class="muted" style="margin:6px 0 0;">If you still trade, size down and enforce the stop with zero exceptions.</p>
        </div>
      ` : ""}

      <div class="result-block" style="margin-top:14px;">
        <span class="tag red">Risk flags</span>
        <ul>${flags.length ? flags.map(x => `<li>${esc(x)}</li>`).join("") : "<li>None</li>"}</ul>
      </div>

      <div class="result-block">
        <span class="tag green">Suggested fixes</span>
        <ul>${suggestions.length ? suggestions.map(x => `<li>${esc(x)}</li>`).join("") : "<li>None</li>"}</ul>
      </div>

      <div class="result-block">
        <span class="tag slate">Hard questions</span>
        <ol style="margin:8px 0 0 18px;">
          ${hardQs.map(x => `<li style="margin:8px 0;">${esc(x)}</li>`).join("")}
        </ol>
      </div>

      <div class="result-block">
        <span class="tag slate">One-line commitment</span>
        <p style="margin:8px 0 0;">
          “If I can’t define invalidation and accept the loss, I don’t take the trade.”
        </p>
      </div>
    </div>
  `;

    // Persist last output for future use (Account page later if you want)
    saveLastChallenge({
        ts: Date.now(),
        inputs: d,
        output: { flags, suggestions, hardQs, ratio, doNothing },
        scoreRef: (typeof lastScore?.score === "number") ? { score: lastScore.score, tier: lastScore.tier, ts: lastScore.ts } : null
    });
}

function clearForm() {
    tickerEl.value = "";
    strategyEl.value = "";
    timeframeEl.value = "intraday";
    entryEl.value = "";
    stopEl.value = "";
    tpEl.value = "";
    sizeEl.value = "";
    thesisEl.value = "";
    invalidationEl.value = "";
    stateEl.value = "calm";
    intentEl.value = "process";
    msgEl.textContent = "";
}

function challengeNow() {
    const d = readInputs();
    const lastScore = getLastScore();

    if (!d.ticker && !d.thesis && !d.entry && !d.stop && !d.tp) {
        msgEl.textContent = "Add at least a ticker or thesis.";
    } else {
        msgEl.textContent = "";
    }

    renderOutput(d, lastScore);
}


/* Buttons */
challengeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    challengeNow();
});

clearBtn.addEventListener("click", (e) => {
    e.preventDefault();
    clearForm();
    outEl.innerHTML = `<p class="muted">Cleared. Fill the form and click Challenge.</p>`;
});

/* Live updates (fresh every input change) */
[
    tickerEl, strategyEl, timeframeEl, entryEl, stopEl, tpEl, sizeEl,
    thesisEl, invalidationEl, stateEl, intentEl
].forEach(el => {
    el.addEventListener("input", challengeNow);
    el.addEventListener("change", challengeNow);
});
