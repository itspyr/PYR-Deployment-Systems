// challenge.js (upgraded "Coach Engine")

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
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function getLastScore() {
    try { return JSON.parse(localStorage.getItem(LAST_SCORE_KEY) || "null"); }
    catch { return null; }
}
const outWrap = document.getElementById("challengeOutWrap");

let scanTimer = null;
let lastHitIds = new Set();
let lastCoachSig = "";



function flashCoach() {
    if (!outWrap) return;
    outWrap.classList.remove("flash"); // reset so it can replay
    // force reflow so animation restarts cleanly
    void outWrap.offsetWidth;
    outWrap.classList.add("flash");
}


function pulseScan() {
    if (!outWrap) return;
    outWrap.classList.add("is-scanning");
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
        outWrap.classList.remove("is-scanning");
    }, 650);
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
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(tp - entry);
    if (!entry || !stop || !tp) return null;
    if (risk === 0) return null;
    return reward / risk;
}

/* ---------------------------
   Text + pattern engine
---------------------------- */
function normText(s) {
    return String(s || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function splitSentences(s) {
    const t = String(s || "").replace(/\s+/g, " ").trim();
    if (!t) return [];
    // split lightly but keep short
    return t.split(/(?<=[.!?])\s+/).slice(0, 10);
}

function snippetAround(text, matchIndex, radius = 42) {
    if (!text) return "";
    const start = Math.max(0, matchIndex - radius);
    const end = Math.min(text.length, matchIndex + radius);
    return text.slice(start, end).trim();
}

function toRegex(pat) {
    if (pat instanceof RegExp) return pat;
    // string -> loose word boundary match
    const safe = String(pat).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${safe}\\b`, "i");
}

/**
 * Each rule can be:
 * - weight: severity/importance
 * - cat: category
 * - patterns: array of strings or regex
 * - why: what it usually leads to
 * - fix: what to do instead
 * - ask: a forcing question
 */
const RULES = [
    // FOMO / chasing
    {
        id: "fomo_chase",
        cat: "FOMO / Chasing",
        weight: 12,
        patterns: [
            /don'?t (want|wanna) to miss/i,
            /can'?t miss/i,
            /running without me/i,
            /\bchase\b/i,
            /\bchasing\b/i,
            /late (but|so) i/i,
            /already moved/i,
            /i need(ed)? a fill/i,
            /everyone (is|was) buying/i,
            /it'?s going to the moon/i
        ],
        why: "Chasing turns entries into hope. Stops get ignored because you already feel behind.",
        fix: "Pre-define a level. If you miss it, you pass. No market owes you a fill.",
        ask: "What is the exact price/condition that makes this a valid entry, not a chase?"
    },

    // Revenge trading
    {
        id: "revenge",
        cat: "Tilt / Revenge",
        weight: 16,
        patterns: [
            /make it back/i,
            /get it back/i,
            /i (was|am) down/i,
            /needed a win/i,
            /i can'?t end red/i,
            /\btilt(ed)?\b/i,
            /\brevenge\b/i,
            /owe(s)? me/i
        ],
        why: "Revenge trades are rarely planned. They turn risk into a mood.",
        fix: "Cooldown rule: 10 minutes off screens, then only A+ setups at half size.",
        ask: "If this loses, are you emotionally able to stop trading today?"
    },

    // Hope language
    {
        id: "hope_language",
        cat: "Hope / Narrative",
        weight: 10,
        patterns: [
            /it has to/i,
            /should bounce/i,
            /due for/i,
            /no way it keeps/i,
            /it'?ll come back/i,
            /just a dip/i,
            /give it room/i,
            /i think it will/i
        ],
        why: "Hope language is a signal you do not have a clean invalidation.",
        fix: "Replace feelings with conditions: 'If X breaks, thesis is invalid.'",
        ask: "What specific event proves you wrong, in one sentence?"
    },

    // Averaging down / doubling
    {
        id: "avg_down",
        cat: "Sizing / Averaging",
        weight: 14,
        patterns: [
            /average down/i,
            /add(ing)? (more|on dips|on the way down)/i,
            /double down/i,
            /scale in/i,
            /i'?ll buy more if/i,
            /i'?ll keep adding/i
        ],
        why: "Averaging is how good trades become account-level mistakes when you are wrong.",
        fix: "If you add, it must be on confirmation, with a new stop, and never to avoid taking a loss.",
        ask: "Is your add planned before entry, or is it a reaction to pain?"
    },

    // Guru / social bias
    {
        id: "social_bias",
        cat: "External Influence",
        weight: 9,
        patterns: [
            /twitter said/i,
            /discord said/i,
            /youtube said/i,
            /someone said/i,
            /i saw a post/i,
            /analyst said/i,
            /insider/i,
            /\bguru\b/i,
            /flow looks crazy/i
        ],
        why: "Outsourcing conviction makes you outsource exits too. You will not own the loss.",
        fix: "If you cannot restate the edge in your own words, you do not have it.",
        ask: "If that source disappears, do you still take this trade? Why?"
    },

    // Overconfidence / certainty
    {
        id: "certainty",
        cat: "Overconfidence",
        weight: 10,
        patterns: [
            /free money/i,
            /guaranteed/i,
            /can'?t lose/i,
            /no brainer/i,
            /\block\b/i,
            /easy/i,
            /sure thing/i
        ],
        why: "Certainty is where stops move and size creeps.",
        fix: "Speak in probabilities. Define max loss. Accept the loss before entry.",
        ask: "What is your max loss and what is your plan if you are wrong immediately?"
    },

    // News / catalyst risk
    {
        id: "event_risk",
        cat: "Event / Catalyst Risk",
        weight: 8,
        patterns: [
            /\bearnings\b/i,
            /\bfomc\b/i,
            /\bcpi\b/i,
            /\bjobs report\b/i,
            /\bpowell\b/i,
            /\bgap\b/i,
            /\bpre[- ]?market\b/i,
            /\bafter hours\b/i
        ],
        why: "Event risk can invalidate stops (gaps). You need a plan that survives a gap.",
        fix: "If you hold through catalysts, size down and define worst-case gap plan.",
        ask: "If it gaps through your stop, what do you do, and what is acceptable damage?"
    },

    // Sloppy invalidation
    {
        id: "vague_invalidation",
        cat: "Plan Quality",
        weight: 13,
        patterns: [
            /i'?ll know/i,
            /if it feels/i,
            /if it looks weak/i,
            /if it dumps/i,
            /i'?ll watch it/i,
            /play it by ear/i
        ],
        why: "Vague invalidation is how winners turn into 'I held because maybe'.",
        fix: "Define an objective level or condition. No debate wording.",
        ask: "Rewrite invalidation using a level or condition: break, reclaim, hold, close."
    },

    // Timeframe mismatch
    {
        id: "timeframe_drift",
        cat: "Timeframe Drift",
        weight: 11,
        patterns: [
            /i'?ll swing it if/i,
            /i can hold it/i,
            /turn it into/i,
            /long term now/i,
            /i'?ll just hold/i,
            /invest now/i
        ],
        why: "Timeframe drift is the silent killer. Stops get removed because the plan changed after entry.",
        fix: "Decide timeframe before entry. If it changes, it must be planned and rules-based.",
        ask: "What is the timeframe BEFORE entry, and what makes you exit within that timeframe?"
    },

    // Liquidity / spread (options style)
    {
        id: "liquidity",
        cat: "Execution / Liquidity",
        weight: 7,
        patterns: [
            /\bwide spread\b/i,
            /\bno liquidity\b/i,
            /\bslippage\b/i,
            /\bthin\b/i,
            /\b0dte\b/i,
            /\bweekly\b/i,
            /\blotto\b/i
        ],
        why: "Bad fills turn good ideas into bad trades.",
        fix: "Trade liquid names. Set limit orders. If spread is ugly, pass.",
        ask: "Are you choosing this because it is cheap, or because it is liquid and tradable?"
    },

    // Emotional tells in the text itself
    {
        id: "emotion_words",
        cat: "Emotional Pressure",
        weight: 8,
        patterns: [
            /nervous/i,
            /scared/i,
            /anxious/i,
            /stressed/i,
            /angry/i,
            /frustrated/i,
            /bored/i,
            /desperate/i,
            /panic/i
        ],
        why: "Emotion compresses decision-making and pushes you to violate the plan.",
        fix: "If emotion is high, reduce size or do nothing. You cannot out-trade your nervous system.",
        ask: "If you had to cut size by 50%, would you still take this trade?"
    },

    // Missing sizing
    {
        id: "no_size",
        cat: "Risk Control",
        weight: 9,
        patterns: [
            /i'?ll size later/i,
            /not sure size/i,
            /wing it/i,
            /full port/i,
            /\ball in\b/i,
            /\byolo\b/i
        ],
        why: "Size is the trade. Without it, the plan is not real.",
        fix: "Define max loss per trade. Then size the position to that risk.",
        ask: "What is your max loss in dollars, not in feelings?"
    },
];

function runPatternEngine(d) {
    const joined = normText([d.strategy, d.size, d.thesis, d.invalidation].join(" | "));
    const matches = [];

    for (const rule of RULES) {
        for (const p of rule.patterns) {
            const rx = toRegex(p);
            const m = rx.exec(joined);
            if (m) {
                const idx = m.index ?? 0;
                matches.push({
                    id: rule.id,
                    cat: rule.cat,
                    weight: rule.weight,
                    hit: m[0],
                    quote: snippetAround(joined, idx, 46),
                    why: rule.why,
                    fix: rule.fix,
                    ask: rule.ask,
                });
                break;
            }
        }
    }

    // de-dup by id
    const seen = new Set();
    return matches.filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

/* ---------------------------
   Trade plan analysis
---------------------------- */
function missingPieces(d) {
    const missing = [];

    if (!d.ticker) missing.push({ key: "ticker", label: "Ticker", why: "You are trading an idea with no label. That is how rules get fuzzy." });
    if (!d.strategy || d.strategy.length < 3) missing.push({ key: "strategy", label: "Strategy", why: "Name the play. Breakout, pullback, mean reversion, trend, catalyst, etc." });
    if (!d.thesis || d.thesis.length < 20) missing.push({ key: "thesis", label: "Thesis", why: "Your edge is not written. If it is not clear, it is not real." });
    if (!d.invalidation || d.invalidation.length < 18) missing.push({ key: "invalidation", label: "Invalidation", why: "If you cannot define wrong, you cannot define risk." });

    const hasEntry = !!d.entry;
    const hasStop = !!d.stop;
    const hasTP = !!d.tp;

    if (!hasEntry) missing.push({ key: "entry", label: "Entry", why: "You need a trigger. Otherwise you will chase or hesitate." });
    if (!hasStop) missing.push({ key: "stop", label: "Stop", why: "Stops are the difference between trading and gambling." });
    if (!hasTP) missing.push({ key: "tp", label: "Take profit", why: "You need a plan to get paid, not just a plan to be right." });

    if (!d.size) missing.push({ key: "size", label: "Position size", why: "Without size, the plan is not executable. Size is the trade." });

    return missing;
}

function sanityChecks(d) {
    const flags = [];
    const notes = [];

    if (d.entry && d.stop && d.entry === d.stop) flags.push("Stop equals entry. That is not invalidation, that is noise.");
    if (d.entry && d.stop && Math.abs(d.entry - d.stop) / Math.max(d.entry, 1) < 0.001) {
        flags.push("Stop is extremely tight. Tight stops cause chop losses or stop-moving behavior.");
        notes.push("Tight stops can work, but only if you accept multiple small losses as part of the strategy.");
    }

    if (d.entry && d.tp && d.tp === d.entry) flags.push("Take profit equals entry. That is not a target.");

    // R:R
    const ratio = rr(d.entry, d.stop, d.tp);
    if (ratio !== null) {
        if (ratio < 1.0) flags.push(`R:R is upside down (≈ ${ratio.toFixed(2)}). You are risking more than you are targeting.`);
        else if (ratio < 1.25) flags.push(`R:R is thin (≈ ${ratio.toFixed(2)}). Thin R:R becomes psychological pressure.`);
        else if (ratio >= 3.0) notes.push(`R:R is strong (≈ ${ratio.toFixed(2)}). Respecting the stop is the entire job.`);
    }

    // Timeframe-specific check
    if (d.timeframe === "intraday") {
        notes.push("Intraday rule: define a time stop. If it does not work by X time, exit.");
    }
    if (d.timeframe === "swing") {
        notes.push("Swing rule: define your overnight risk. Gaps happen. Size accordingly.");
    }
    if (d.timeframe === "position") {
        notes.push("Position rule: define what changes your thesis, not just price noise.");
    }

    return { flags, notes, ratio };
}

/* ---------------------------
   Scoring model (0-100)
---------------------------- */
function scoreTrade(d, missing, patternHits, checks, lastScore) {
    // Components
    let clarity = 100;
    let riskStruct = 100;
    let discipline = 100;
    let emotion = 100;
    let edge = 100;

    // Missing pieces hit clarity and discipline hard
    for (const m of missing) {
        if (["ticker", "strategy"].includes(m.key)) clarity -= 6;
        if (["thesis"].includes(m.key)) edge -= 16;
        if (["invalidation"].includes(m.key)) riskStruct -= 18;
        if (["entry", "stop", "tp"].includes(m.key)) riskStruct -= 12;
        if (["size"].includes(m.key)) discipline -= 12;
    }

    // Pattern hits affect discipline/emotion/edge depending on cat
    for (const hit of patternHits) {
        const w = hit.weight;
        if (hit.cat.includes("FOMO")) { emotion -= w; discipline -= Math.floor(w * 0.7); }
        else if (hit.cat.includes("Tilt")) { emotion -= w + 2; discipline -= w; }
        else if (hit.cat.includes("Hope")) { edge -= w; riskStruct -= Math.floor(w * 0.5); }
        else if (hit.cat.includes("Sizing")) { discipline -= w; riskStruct -= Math.floor(w * 0.5); }
        else if (hit.cat.includes("External")) { edge -= Math.floor(w * 0.8); discipline -= Math.floor(w * 0.3); }
        else if (hit.cat.includes("Overconfidence")) { discipline -= Math.floor(w * 0.7); emotion -= Math.floor(w * 0.4); }
        else if (hit.cat.includes("Event")) { riskStruct -= Math.floor(w * 0.7); }
        else if (hit.cat.includes("Plan")) { clarity -= Math.floor(w * 0.5); riskStruct -= Math.floor(w * 0.7); }
        else if (hit.cat.includes("Timeframe")) { clarity -= Math.floor(w * 0.5); discipline -= Math.floor(w * 0.6); }
        else if (hit.cat.includes("Execution")) { discipline -= Math.floor(w * 0.7); }
        else if (hit.cat.includes("Emotional")) { emotion -= w; }
        else if (hit.cat.includes("Risk Control")) { discipline -= w; riskStruct -= Math.floor(w * 0.5); }
    }

    // Structural flags
    if (checks.flags.length) {
        riskStruct -= Math.min(18, checks.flags.length * 6);
        discipline -= Math.min(12, checks.flags.length * 3);
    }

    // R:R shaping
    if (checks.ratio !== null) {
        if (checks.ratio < 1.0) { riskStruct -= 18; edge -= 10; }
        else if (checks.ratio < 1.25) { riskStruct -= 10; }
        else if (checks.ratio >= 2.0) { edge += 5; }
    }

    // Self-reported state + intent (hard weight)
    const emotionalState = d.state;
    if (emotionalState === "fomo") emotion -= 18;
    if (emotionalState === "revenge") emotion -= 24;
    if (emotionalState === "stressed") emotion -= 16;
    if (emotionalState === "bored") emotion -= 10;

    const intent = d.intent;
    if (intent === "prove") discipline -= 14;
    if (intent === "relief") discipline -= 12;
    if (intent === "money") discipline -= 4; // not bad, but tends to push decisions

    // Reference Behavioral Risk Score from App (if available)
    if (typeof lastScore?.score === "number") {
        if (lastScore.score < 50) { discipline -= 10; emotion -= 10; }
        else if (lastScore.score < 65) { discipline -= 6; }
    }

    clarity = clamp(Math.round(clarity), 0, 100);
    riskStruct = clamp(Math.round(riskStruct), 0, 100);
    discipline = clamp(Math.round(discipline), 0, 100);
    emotion = clamp(Math.round(emotion), 0, 100);
    edge = clamp(Math.round(edge), 0, 100);

    // Weighted composite
    const composite = clamp(
        Math.round(
            clarity * 0.20 +
            riskStruct * 0.25 +
            discipline * 0.25 +
            emotion * 0.15 +
            edge * 0.15
        ),
        0,
        100
    );

    let tier = { label: "Green", note: "Clean enough to execute if you stay honest.", color: "green" };
    if (composite < 50) tier = { label: "Red", note: "High risk of a bad decision. Do nothing or rebuild the plan.", color: "red" };
    else if (composite < 65) tier = { label: "Yellow", note: "Tradable only if you simplify and size down.", color: "slate" };
    else if (composite < 80) tier = { label: "Good", note: "Solid plan. Execution is the job now.", color: "green" };

    return { clarity, riskStruct, discipline, emotion, edge, composite, tier };
}

/* ---------------------------
   Coaching output builder
---------------------------- */
function buildStrengths(d, missing, hits, checks) {
    const strengths = [];

    if (d.ticker) strengths.push("Clear instrument selected. No vague 'idea' trading.");
    if (d.strategy && d.strategy.length >= 3) strengths.push("Strategy is named. That helps rules stay consistent.");
    if (d.thesis && d.thesis.length >= 35) strengths.push("Thesis has enough detail to be reviewed later.");
    if (d.invalidation && d.invalidation.length >= 25) strengths.push("Invalidation exists. Most people skip this and pay for it.");
    if (d.size) strengths.push("Size is specified. You are treating risk like a real variable.");
    if (checks.ratio !== null && checks.ratio >= 1.5) strengths.push(`Risk/reward is reasonable (R:R ≈ ${checks.ratio.toFixed(2)}).`);

    // If they are calm + process intent
    if (d.state === "calm" && d.intent === "process") strengths.push("State and intent are aligned with good execution.");

    // If not many pattern hits
    if (hits.length === 0) strengths.push("No obvious behavioral red flags detected in your wording. Good sign.");

    // Avoid fluff
    return strengths.slice(0, 6);
}

function buildFixes(d, missing, hits, checks, lastScore) {
    const fixes = [];

    // Missing pieces first (most actionable)
    for (const m of missing) {
        fixes.push(`Add ${m.label}: ${m.why}`);
    }

    // Structural check flags
    for (const f of checks.flags) fixes.push(f);

    // Pattern-based fixes
    hits
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 6)
        .forEach(h => fixes.push(`${h.cat}: ${h.fix}`));

    // Score-based coaching
    if (typeof lastScore?.score === "number") {
        if (lastScore.score < 50) fixes.push("Your Behavioral Risk Score is low. Treat today like defense: fewer trades, smaller size, tighter rules.");
        else if (lastScore.score < 65) fixes.push("Your Behavioral Risk Score suggests you need more structure. Pre-commit to the stop and do not improvise.");
    } else {
        fixes.push("Tip: Run the App check once so this tool can reference your Behavioral Risk Score.");
    }

    // Always-useful line
    fixes.push("Pre-commit: if stop hits, you exit. No 'wait for a bounce'. No exceptions.");

    // Keep it sharp
    return fixes.slice(0, 10);
}

function buildMissingQuestions(d, missing) {
    const qs = [];

    // Base forcing questions
    qs.push("What is your entry trigger in one sentence (level/condition, not vibes)?");
    qs.push("What is your invalidation in one sentence (no debate wording)?");
    qs.push("What is your max loss in dollars, and will you accept it without moving the stop?");
    qs.push("If you miss the entry, what is your rule (pass, wait pullback, or new plan)?");

    // Context questions
    if (d.timeframe === "intraday") qs.push("Intraday: what is your time stop (when do you exit if it goes nowhere)?");
    if (d.timeframe === "swing") qs.push("Swing: what is your gap plan if it opens through your stop?");
    if (d.timeframe === "position") qs.push("Position: what is the thesis breaker, not just a red candle?");

    // Add questions from missing keys
    const missKeys = new Set(missing.map(m => m.key));
    if (missKeys.has("size")) qs.push("What position size keeps you emotionally neutral if it goes against you fast?");
    if (missKeys.has("tp")) qs.push("Where are you taking profit, and what is your plan if it gets there quickly?");
    if (missKeys.has("strategy")) qs.push("Name the play: breakout, pullback, mean reversion, trend, catalyst. Which is it and why?");

    return qs.slice(0, 8);
}

function doNothingDecision(d, score, missing, hits, checks, lastScore) {
    const missingCore = missing.some(m => ["stop", "invalidation", "entry"].includes(m.key));
    const emotional = (d.state === "revenge" || d.state === "fomo" || d.state === "stressed");
    const intentBad = (d.intent === "relief" || d.intent === "prove");
    const lowBehavior = (typeof lastScore?.score === "number" && lastScore.score < 50);
    const rrBad = (checks.ratio !== null && checks.ratio < 1.0);

    const bigHits = hits.some(h => ["revenge", "fomo_chase", "avg_down"].includes(h.id));

    if (score.tier.label === "Red") return "DO NOTHING: This plan is not stable enough to trust your execution.";
    if (missingCore && (emotional || intentBad)) return "DO NOTHING: Missing rules plus emotional pressure equals predictable mistakes.";
    if (lowBehavior && (emotional || missingCore)) return "DO NOTHING: Your current behavioral risk is too high to trust discretion.";
    if (rrBad && (emotional || bigHits)) return "DO NOTHING: Bad R:R plus pressure is a classic account leak.";
    if (hits.length >= 5) return "DO NOTHING: Too many behavioral tells. Simplify or wait for a cleaner setup.";

    return null;
}

function renderOutput(d, lastScore) {
    const missing = missingPieces(d);
    const checks = sanityChecks(d);
    const hits = runPatternEngine(d);
    const score = scoreTrade(d, missing, hits, checks, lastScore);

    const strengths = buildStrengths(d, missing, hits, checks);
    const fixes = buildFixes(d, missing, hits, checks, lastScore);
    const hardQs = buildMissingQuestions(d, missing);

    const doNothing = doNothingDecision(d, score, missing, hits, checks, lastScore);

    const scoreLine = (typeof lastScore?.score === "number")
        ? `<span class="tag slate">Behavior Score: ${lastScore.score}/100</span>`
        : `<span class="tag slate">Behavior Score: —</span>`;

    const rrLine = (checks.ratio === null)
        ? `<span class="tag slate">R:R: —</span>`
        : `<span class="tag slate">R:R: ${checks.ratio.toFixed(2)}</span>`;

    const coachScore = `<span class="tag ${score.tier.color}">Coach Score: ${score.composite}/100</span>`;

    // Top signals (quotes)
    const topSignals = hits
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 4);

    const signalsHtml = topSignals.length
        ? `
      <div class="result-block" style="margin-top:14px;">
        <span class="tag slate">Signals detected</span>
        <ul>
          ${topSignals.map(s => `
            <li>
              <strong>${esc(s.cat)}:</strong> ${esc(s.why)}
              <div class="muted" style="margin-top:6px; font-size:12px;">Matched: "${esc(s.hit)}"</div>
            </li>
          `).join("")}
        </ul>
      </div>
    `
        : "";

    const missingHtml = missing.length
        ? `
      <div class="result-block" style="margin-top:14px;">
        <span class="tag red">Missing pieces</span>
        <ul>
          ${missing.map(m => `<li><strong>${esc(m.label)}:</strong> ${esc(m.why)}</li>`).join("")}
        </ul>
      </div>
    `
        : `
      <div class="result-block" style="margin-top:14px;">
        <span class="tag green">Plan completeness</span>
        <ul><li>Core pieces are present. Now it is about quality and execution.</li></ul>
      </div>
    `;

    const strengthsHtml = strengths.length
        ? `
      <div class="result-block" style="margin-top:14px;">
        <span class="tag green">What is strong</span>
        <ul>${strengths.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      </div>
    `
        : "";

    const fixesHtml = `
    <div class="result-block" style="margin-top:14px;">
      <span class="tag red">Tighten this</span>
      <ul>${fixes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>
  `;

    const questionsHtml = `
    <div class="result-block">
      <span class="tag slate">Hard questions</span>
      <ol style="margin:8px 0 0 18px;">
        ${hardQs.map(x => `<li style="margin:8px 0;">${esc(x)}</li>`).join("")}
      </ol>
    </div>
  `;

    const scoreBreakdownHtml = `
    <div class="result-block" style="margin-top:14px;">
      <span class="tag slate">Score breakdown</span>
      <ul>
        <li><strong>Clarity:</strong> ${score.clarity}/100</li>
        <li><strong>Risk structure:</strong> ${score.riskStruct}/100</li>
        <li><strong>Discipline:</strong> ${score.discipline}/100</li>
        <li><strong>Emotional pressure:</strong> ${score.emotion}/100</li>
        <li><strong>Edge quality:</strong> ${score.edge}/100</li>
      </ul>
      <p class="muted" style="margin:8px 0 0;">${esc(score.tier.note)}</p>
    </div>
  `;

    const doNothingHtml = doNothing
        ? `
      <div class="result-block" style="margin-top:12px;">
        <span class="tag red">Do nothing</span>
        <p style="margin:8px 0 0;"><strong>${esc(doNothing)}</strong></p>
        <p class="muted" style="margin:6px 0 0;">
          If you still insist on trading: cut size, define invalidation in one line, and treat the stop like a contract.
        </p>
      </div>
    `
        : "";

    const snapshot = `
    <h3 style="margin-top:10px;">Trade snapshot</h3>
    <p style="margin:6px 0 0;">
      <strong>${esc(d.ticker || "—")}</strong>
      ${d.strategy ? `<span class="muted"> • ${esc(d.strategy)}</span>` : ""}
      <span class="muted"> • ${esc(d.timeframe)}</span>
      <span class="muted"> • State: ${esc(d.state)} • Intent: ${esc(d.intent)}</span>
    </p>
    <p class="muted" style="margin:10px 0 0;">
      Entry: <strong>${d.entry ? d.entry : "—"}</strong>
      &nbsp;•&nbsp; Stop: <strong>${d.stop ? d.stop : "—"}</strong>
      &nbsp;•&nbsp; Take profit: <strong>${d.tp ? d.tp : "—"}</strong>
      ${d.size ? `&nbsp;•&nbsp; Size: <strong>${esc(d.size)}</strong>` : ""}
    </p>
  `;

    // Pro-style one-liner based on the plan
    let verdictLine = "Verdict: You are close, but the plan needs one more pass before risking money.";
    if (score.composite >= 80 && !doNothing) verdictLine = "Verdict: This is clean enough. Your edge is only as good as your stop discipline.";
    if (score.composite < 65) verdictLine = "Verdict: This is not tight enough. Simplify, reduce size, or wait.";
    if (doNothing) verdictLine = "Verdict: Do nothing. Fix the plan first, then trade it like a robot.";

    outEl.innerHTML = `
    <div class="result-block">
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <span class="tag green">Coach</span>
        ${coachScore}
        ${scoreLine}
        ${rrLine}
      </div>

      <p style="margin:10px 0 0;"><strong>${esc(verdictLine)}</strong></p>

      ${snapshot}
      ${doNothingHtml}
      ${missingHtml}
      ${strengthsHtml}
      ${signalsHtml}
      ${fixesHtml}
      ${scoreBreakdownHtml}
      ${questionsHtml}

      <div class="result-block">
        <span class="tag slate">One-line commitment</span>
        <p style="margin:8px 0 0;">
          "If my invalidation is not objective and my max loss is not acceptable, I do not take the trade."
        </p>
      </div>
    </div>
  `;

    saveLastChallenge({
        ts: Date.now(),
        inputs: d,
        output: {
            missing,
            checks,
            hits,
            score,
            strengths,
            fixes,
            hardQs,
            doNothing
        },
        scoreRef: (typeof lastScore?.score === "number")
            ? { score: lastScore.score, tier: lastScore.tier, ts: lastScore.ts }
            : null
    });
    return {
        hitIds: hits.map(h => h.id),
        composite: score.composite,
        tier: score.tier.label,
        missingCount: missing.length,
        doNothing: !!doNothing,
        rr: (checks.ratio === null) ? null : Number(checks.ratio.toFixed(2))
    };


}

function saveLastChallenge(payload) {
    localStorage.setItem(LAST_CHALLENGE_KEY, JSON.stringify(payload));
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
    pulseScan();

    const d = readInputs();
    const lastScore = getLastScore();

    const hasAnything =
        !!d.ticker || !!d.thesis || !!d.invalidation || !!d.strategy ||
        !!d.entry || !!d.stop || !!d.tp || !!d.size;

    if (!hasAnything) {
        msgEl.textContent = "Add at least a ticker or thesis.";
        return [];
    }

    msgEl.textContent = "";

    // render once
    const res = renderOutput(d, lastScore) || {};
    const hitIds = res.hitIds || [];

    // build a signature of meaningful coach output
    const sig = [
        hitIds.join(","),                 // detected rules
        res.composite ?? "",               // score
        res.tier ?? "",                    // tier
        res.missingCount ?? "",            // missing pieces
        res.doNothing ? "DN1" : "DN0",     // do nothing toggle
        res.rr ?? ""                       // risk:reward
    ].join("|");

    // flash when coach output meaningfully changes
    if (sig && sig !== lastCoachSig) {
        flashCoach();
    }
    lastCoachSig = sig;

    return hitIds;
}




/* Buttons (safe) */
if (challengeBtn) {
    challengeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        challengeNow();
    });
}

if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        clearForm();
        outEl.innerHTML = `<p class="muted">Cleared. Fill the form and click Challenge.</p>`;
    });
}

/* Live updates */
[
    tickerEl, strategyEl, timeframeEl, entryEl, stopEl, tpEl, sizeEl,
    thesisEl, invalidationEl, stateEl, intentEl
].filter(Boolean).forEach(el => {
    el.addEventListener("input", challengeNow);
    el.addEventListener("change", challengeNow);
});
