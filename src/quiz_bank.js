window.PYR_QUIZ_BANK = [
    // -------- DISCIPLINE / PROCESS --------
    {
        id: "disc_001",
        type: "mc",
        topic: "discipline",
        difficulty: 1,
        prompt: "You enter a trade exactly as planned, but price moves slightly against you immediately. What matters most right now?",
        choices: [
            "How fast you can exit to avoid pain",
            "Whether your original invalidation is still valid",
            "What other traders on Twitter are doing",
            "Getting back to breakeven as soon as possible"
        ],
        answerIndex: 1,
        explain: "Early noise is normal. Your plan defines when you're wrong."
    },
    {
        id: "disc_002",
        type: "mc",
        topic: "discipline",
        difficulty: 2,
        prompt: "You catch yourself checking the PnL more than the chart during a trade. This usually signals what?",
        choices: [
            "Strong engagement",
            "Healthy awareness",
            "Loss of process focus",
            "Good risk management"
        ],
        answerIndex: 2,
        explain: "When PnL drives decisions, discipline slips."
    },
    {
        id: "disc_003",
        type: "mc",
        topic: "discipline",
        difficulty: 2,
        prompt: "You followed all rules and still took a loss. The most productive response is to:",
        choices: [
            "Avoid that setup next time",
            "Reduce size permanently",
            "Log the trade and move on",
            "Change strategies immediately"
        ],
        answerIndex: 2,
        explain: "Losses happen. Process evaluation beats emotional reaction."
    },

    // -------- EMOTIONAL CONTROL --------
    {
        id: "emotion_001",
        type: "mc",
        topic: "emotion",
        difficulty: 2,
        prompt: "After a win, you feel unusually confident and start scanning for more trades. What’s the real risk here?",
        choices: [
            "Missing opportunities",
            "Overconfidence leading to lower standards",
            "Not trading enough",
            "Letting profits sit too long"
        ],
        answerIndex: 1,
        explain: "Euphoria can quietly loosen your filters."
    },
    {
        id: "emotion_002",
        type: "mc",
        topic: "emotion",
        difficulty: 3,
        prompt: "You’re slightly annoyed after a small loss but tell yourself you’re fine. What’s the best check before the next trade?",
        choices: [
            "Increase size to compensate",
            "Step away briefly and reassess",
            "Jump back in quickly",
            "Switch strategies"
        ],
        answerIndex: 1,
        explain: "Even mild frustration can affect decisions."
    },
    {
        id: "emotion_003",
        type: "mc",
        topic: "emotion",
        difficulty: 3,
        prompt: "A trade hits your stop, then immediately reverses without you. The healthiest response is:",
        choices: [
            "Re-enter immediately",
            "Chase the move",
            "Accept the stop and wait",
            "Remove stops next time"
        ],
        answerIndex: 2,
        explain: "Stops protect capital, not ego."
    },

    // -------- OVERTRADING --------
    {
        id: "overtrade_001",
        type: "mc",
        topic: "overtrading",
        difficulty: 2,
        prompt: "You notice you're taking trades with weaker setups than usual. What’s most likely happening?",
        choices: [
            "Market conditions changed",
            "You’re adapting quickly",
            "You’re forcing activity",
            "Your strategy improved"
        ],
        answerIndex: 2,
        explain: "Lower standards often signal overtrading."
    },
    {
        id: "overtrade_002",
        type: "mc",
        topic: "overtrading",
        difficulty: 3,
        prompt: "A slow market day makes you feel bored and restless. What’s the disciplined move?",
        choices: [
            "Trade smaller",
            "Switch timeframes",
            "Accept inactivity",
            "Try a new strategy"
        ],
        answerIndex: 2,
        explain: "Not trading is still a decision."
    },

    // -------- RISK MANAGEMENT --------
    {
        id: "risk_001",
        type: "mc",
        topic: "risk",
        difficulty: 2,
        prompt: "Which action quietly increases risk without changing position size?",
        choices: [
            "Entering later than planned",
            "Tightening stops",
            "Reducing trade frequency",
            "Waiting for confirmation"
        ],
        answerIndex: 0,
        explain: "Late entries often worsen risk-reward."
    },
    {
        id: "risk_002",
        type: "mc",
        topic: "risk",
        difficulty: 3,
        prompt: "You widen your stop because price is 'almost' turning. What’s the real reason this happens?",
        choices: [
            "Better risk control",
            "Improved flexibility",
            "Emotional attachment",
            "Strategic patience"
        ],
        answerIndex: 2,
        explain: "Stops should be based on structure, not hope."
    },

    // -------- EXECUTION --------
    {
        id: "exec_001",
        type: "mc",
        topic: "execution",
        difficulty: 2,
        prompt: "Your setup is valid, but execution feels rushed. What’s the highest-quality response?",
        choices: [
            "Take it anyway",
            "Reduce size",
            "Skip the trade",
            "Move to a lower timeframe"
        ],
        answerIndex: 2,
        explain: "A good setup with poor execution is still a bad trade."
    },
    {
        id: "exec_002",
        type: "mc",
        topic: "execution",
        difficulty: 3,
        prompt: "You miss your planned entry by a small amount. The trade still looks good. What matters most?",
        choices: [
            "Getting filled",
            "Maintaining your rules",
            "Fear of missing out",
            "Adjusting targets"
        ],
        answerIndex: 1,
        explain: "Consistency builds long-term results."
    },

    // -------- COMMON LOGIC TRAPS --------
    {
        id: "logic_001",
        type: "mc",
        topic: "logic",
        difficulty: 3,
        prompt: "A stock has gone up several days in a row. Why is that alone a weak reason to enter?",
        choices: [
            "It guarantees a pullback",
            "It increases volatility",
            "Past movement doesn’t define future risk",
            "It’s already well known"
        ],
        answerIndex: 2,
        explain: "Trend context matters more than streaks."
    },
    {
        id: "logic_002",
        type: "mc",
        topic: "logic",
        difficulty: 3,
        prompt: "You feel safer trading a familiar ticker even when the setup is unclear. This bias is called:",
        choices: [
            "Market intuition",
            "Comfort bias",
            "Pattern recognition",
            "Experience advantage"
        ],
        answerIndex: 1,
        explain: "Familiarity can hide poor setups."
    },

    // -------- JOURNAL AWARENESS --------
    {
        id: "journal_001",
        type: "mc",
        topic: "journal",
        difficulty: 2,
        prompt: "Why is journaling losing trades especially important?",
        choices: [
            "They hurt more",
            "They reveal execution and discipline issues",
            "They balance the record",
            "They’re easier to remember"
        ],
        answerIndex: 1,
        explain: "Losses often teach more than wins."
    },
    {
        id: "journal_002",
        type: "mc",
        topic: "journal",
        difficulty: 3,
        prompt: "A journal note that says 'bad trade' is least helpful because it:",
        choices: [
            "Is too negative",
            "Lacks actionable detail",
            "Focuses on emotion",
            "Takes too long to write"
        ],
        answerIndex: 1,
        explain: "Specifics drive improvement."
    },

    // -------- META / SELF-AWARENESS --------
    {
        id: "meta_001",
        type: "mc",
        topic: "awareness",
        difficulty: 3,
        prompt: "You notice your best trades happen earlier in the session. What’s the smartest adjustment?",
        choices: [
            "Trade more later",
            "Ignore the pattern",
            "Focus effort earlier",
            "Increase size early"
        ],
        answerIndex: 2,
        explain: "Lean into strengths, not habits."
    },
    {
        id: "meta_002",
        type: "mc",
        topic: "awareness",
        difficulty: 3,
        prompt: "What’s a subtle sign that you should stop trading for the day?",
        choices: [
            "Two losses",
            "Feeling the need to make something happen",
            "Low volume",
            "One red trade"
        ],
        answerIndex: 1,
        explain: "Urgency often precedes mistakes."
    }

    // You can continue expanding this pattern easily to 100+
];
