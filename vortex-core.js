/**
 * ╔══════════════════════════════════════════════════════╗
 * ║           VORTEX SOLVER CORE  v3.0.0                 ║
 * ║  Free · No API keys · Browser-native · Multi-domain  ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Universal AI solver — maths, science, code, history,
 * grammar, logic, finance, and more.
 *
 * ── QUICK START ─────────────────────────────────────────
 *
 *   <script src="vortex-core.js"></script>
 *   <script>
 *     const vortex = new VortexSolver();
 *     vortex.onProgress = (msg, pct) => console.log(msg, pct + '%');
 *
 *     // Solve from plain text (any subject)
 *     const result = await vortex.solve("What causes a rainbow?");
 *
 *     // Solve from text with an explicit template
 *     const result = await vortex.solve("Solve 2x + 3 = 9", "math");
 *
 *     // Solve from an image (OCR → solve)
 *     const result = await vortex.solveFromImage(fileBlob, "math");
 *
 *     // Render a styled card into any container
 *     vortex.renderInto(document.querySelector('#out'), result);
 *   </script>
 *
 * ── RESULT SHAPE ────────────────────────────────────────
 *   {
 *     input:       string,   // original problem text (post-OCR if image)
 *     reasoning:   string,   // full verbose explanation
 *     answer:      string,   // concise final answer
 *     template:    string,   // template id used
 *     model:       string,   // AI model used
 *     durationMs:  number,   // wall-clock time ms
 *     error:       string|null
 *   }
 *
 * ── TEMPLATES ───────────────────────────────────────────
 *   "auto"     – auto-detect subject (default)
 *   "math"     – algebra, calculus, geometry, statistics
 *   "science"  – physics, chemistry, biology, earth science
 *   "code"     – debugging, explanation, generation, complexity
 *   "history"  – events, causes, timelines, significance
 *   "grammar"  – proofreading, rewriting, style analysis
 *   "logic"    – puzzles, proofs, critical thinking
 *   "finance"  – interest, ROI, budgeting, ratios
 *   "language" – translation, etymology, grammar rules
 *   "essay"    – plan, thesis, structure, argue a point
 *
 * GitHub: https://github.com/StuffzEZ/Vortex-Solver
 */

(function (global) {
  "use strict";

  /* ══════════════════════════════════════
   *  CONSTANTS
   * ══════════════════════════════════════ */
  const VERSION  = "3.0.0";
  const ENDPOINT = "https://text.pollinations.ai/";
  const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js";

  /** Model preference list — tried in order on failure */
  const MODELS = ["openai", "mistral", "openai-large"];

  /* ══════════════════════════════════════
   *  TEMPLATE REGISTRY
   *  Each template defines:
   *    id, label, icon, color,
   *    systemPrompt, exampleProblems[],
   *    answerLabel (what to call the result)
   * ══════════════════════════════════════ */
  const TEMPLATES = {
    auto: {
      id: "auto",
      label: "Auto-detect",
      icon: "✦",
      color: "#a78bfa",
      answerLabel: "Answer",
      exampleProblems: [],
      systemPrompt: `You are Vortex Solver, a brilliant universal tutor and expert across every academic discipline.

Your task:
1. Read the problem and IDENTIFY the subject area (maths, science, history, coding, grammar, etc.)
2. State the subject clearly at the top: "Subject: ..."
3. Explain the KEY CONCEPTS needed to solve it.
4. Solve STEP-BY-STEP, numbering each step.
5. Check your work or give a sanity check.
6. End with exactly: "FINAL ANSWER: <answer>"

Be thorough, accurate, and educational. Show all working. Never skip steps.`,
    },

    math: {
      id: "math",
      label: "Mathematics",
      icon: "∑",
      color: "#34d399",
      answerLabel: "Result",
      exampleProblems: [
        "Solve 3x² − 5x + 2 = 0",
        "Find the derivative of f(x) = x³ sin(x)",
        "What is the area of a triangle with base 8 and height 5?",
        "Simplify: (2x³y²) / (4x²y)",
      ],
      systemPrompt: `You are Vortex Solver, an expert mathematics tutor covering algebra, calculus, geometry, trigonometry, statistics, and number theory.

Your task:
1. Identify the type of problem (e.g. "Quadratic equation", "Integral", "Geometry").
2. State the formula or theorem you will use.
3. Solve STEP-BY-STEP, numbering each step.
4. Show all substitutions and simplifications explicitly.
5. Check the answer (substitute back, verify units, etc.).
6. End with exactly: "FINAL ANSWER: <answer>"

Use correct mathematical notation. Never skip steps. Be precise.`,
    },

    science: {
      id: "science",
      label: "Science",
      icon: "⚗",
      color: "#38bdf8",
      answerLabel: "Conclusion",
      exampleProblems: [
        "A car accelerates from rest at 3 m/s². How far does it travel in 5 seconds?",
        "Balance the equation: Fe + O₂ → Fe₂O₃",
        "Explain how mitosis differs from meiosis",
        "What is the wavelength of light with frequency 5×10¹⁴ Hz?",
      ],
      systemPrompt: `You are Vortex Solver, an expert science tutor covering physics, chemistry, biology, earth science, and astronomy.

Your task:
1. Identify the branch of science and specific topic.
2. State the relevant law, principle, or formula.
3. Solve or explain STEP-BY-STEP, numbering each step.
4. Include units at every calculation step.
5. Provide a conceptual explanation of WHY the answer makes sense.
6. End with exactly: "FINAL ANSWER: <answer>"

Be precise. Show unit conversions. Include significant figures where relevant.`,
    },

    code: {
      id: "code",
      label: "Code & CS",
      icon: "</>",
      color: "#fb923c",
      answerLabel: "Solution",
      exampleProblems: [
        "Why does my Python code give an IndexError?",
        "Write a function to reverse a linked list in JavaScript",
        "What is the time complexity of quicksort?",
        "Explain what a closure is in JavaScript with an example",
      ],
      systemPrompt: `You are Vortex Solver, an expert software engineer and computer science tutor.

Your task:
1. Identify the language, concept, or problem type.
2. Explain the ROOT CAUSE if it's a bug, or the APPROACH if it's a task.
3. Provide a complete, working solution with code blocks.
4. Annotate each important line of code with inline comments.
5. Explain time and space complexity where relevant.
6. End with exactly: "FINAL ANSWER: <answer>" (one-line summary of the fix/solution)

Format code in fenced code blocks with language tags. Be concise but complete.`,
    },

    history: {
      id: "history",
      label: "History",
      icon: "⌛",
      color: "#fbbf24",
      answerLabel: "Summary",
      exampleProblems: [
        "What were the main causes of World War I?",
        "Explain the significance of the Magna Carta",
        "Compare the French and American Revolutions",
        "What led to the fall of the Roman Empire?",
      ],
      systemPrompt: `You are Vortex Solver, an expert history tutor with deep knowledge of world history, politics, and social movements.

Your task:
1. Identify the time period, region, and topic.
2. Provide essential CONTEXT (what was happening before).
3. Answer the question or explain the event with SPECIFIC evidence, dates, and names.
4. Analyse CAUSES and CONSEQUENCES.
5. Give the HISTORICAL SIGNIFICANCE (why it matters).
6. End with exactly: "FINAL ANSWER: <answer>" (a concise one-paragraph summary)

Be factually precise. Use dates. Name key figures. Cite specific events as evidence.`,
    },

    grammar: {
      id: "grammar",
      label: "Grammar & Writing",
      icon: "✍",
      color: "#f472b6",
      answerLabel: "Corrected Version",
      exampleProblems: [
        "Fix the grammar: 'Their going to the store and buyed milk'",
        "Improve this sentence: 'The thing was very big and it was also quite fast'",
        "Is 'data' singular or plural?",
        "What is the difference between 'who' and 'whom'?",
      ],
      systemPrompt: `You are Vortex Solver, an expert English language tutor and editor.

Your task:
1. Identify the grammar issue, writing problem, or question type.
2. List each error found with a clear explanation of the rule it violates.
3. Provide the CORRECTED version.
4. Explain the grammar rule(s) involved clearly.
5. Give an additional example to reinforce the rule.
6. End with exactly: "FINAL ANSWER: <answer>" (the corrected text or direct answer)

Be encouraging but precise. Reference official grammar rules by name when relevant.`,
    },

    logic: {
      id: "logic",
      label: "Logic & Puzzles",
      icon: "◈",
      color: "#c084fc",
      answerLabel: "Solution",
      exampleProblems: [
        "If all cats are animals, and Whiskers is a cat, what can we conclude?",
        "Solve the Towers of Hanoi for 3 discs",
        "A man has 12 balls — one is heavier. Find it in 3 weighings.",
        "What is the next term: 2, 6, 12, 20, 30, ...?",
      ],
      systemPrompt: `You are Vortex Solver, an expert logician and puzzle solver with expertise in deductive reasoning, formal logic, and lateral thinking.

Your task:
1. Identify the type of problem (deductive, inductive, puzzle, sequence, etc.).
2. State all GIVEN INFORMATION and what is being asked.
3. Apply logical reasoning STEP-BY-STEP, showing every deduction.
4. Eliminate false possibilities systematically.
5. Verify the answer satisfies all constraints.
6. End with exactly: "FINAL ANSWER: <answer>"

Show your work fully. Never jump to conclusions without justification.`,
    },

    finance: {
      id: "finance",
      label: "Finance & Maths",
      icon: "£",
      color: "#4ade80",
      answerLabel: "Result",
      exampleProblems: [
        "What is the compound interest on £5000 at 4% over 3 years?",
        "Calculate the monthly payment for a £200,000 mortgage at 3.5% over 25 years",
        "What is the ROI if I invest £1000 and get back £1350?",
        "Calculate the break-even point: fixed costs £10,000, price £50, variable cost £20",
      ],
      systemPrompt: `You are Vortex Solver, an expert financial mathematics tutor covering interest, investment, budgeting, and business maths.

Your task:
1. Identify the financial concept (compound interest, ROI, mortgage, etc.).
2. State the exact FORMULA you will use.
3. Substitute all values STEP-BY-STEP with clear labels.
4. Round to 2 decimal places where appropriate.
5. Provide REAL-WORLD CONTEXT for what the number means.
6. End with exactly: "FINAL ANSWER: <answer>"

Include currency symbols. Show all calculations. Explain financial jargon.`,
    },

    language: {
      id: "language",
      label: "Languages",
      icon: "語",
      color: "#67e8f9",
      answerLabel: "Translation / Answer",
      exampleProblems: [
        "Translate 'Good morning, how are you?' into French, Spanish, and Japanese",
        "What is the etymology of the word 'algorithm'?",
        "Explain the difference between 'por' and 'para' in Spanish",
        "Conjugate 'être' in the present tense in French",
      ],
      systemPrompt: `You are Vortex Solver, an expert polyglot and linguist with mastery of etymology, translation, and language structure.

Your task:
1. Identify the language(s) and linguistic topic involved.
2. Provide accurate translations or explanations with PHONETIC pronunciation guides.
3. Explain any GRAMMATICAL RULES that apply.
4. Give EXAMPLES of usage in context.
5. Note any common PITFALLS or false friends.
6. End with exactly: "FINAL ANSWER: <answer>"

Be culturally sensitive. Explain nuance. Provide multiple translations where alternatives exist.`,
    },

    essay: {
      id: "essay",
      label: "Essay & Analysis",
      icon: "¶",
      color: "#f87171",
      answerLabel: "Plan / Answer",
      exampleProblems: [
        "Plan an essay: 'Was Napoleon a hero or a tyrant?'",
        "Write a thesis statement about climate change and economic policy",
        "Analyse the theme of ambition in Macbeth",
        "Argue for or against: 'Social media does more harm than good'",
      ],
      systemPrompt: `You are Vortex Solver, an expert academic writer and literary analyst.

Your task:
1. Identify the essay type (argumentative, analytical, comparative, etc.).
2. Produce a clear THESIS STATEMENT.
3. Outline a full ESSAY STRUCTURE with key points per paragraph.
4. Develop the MAIN ARGUMENTS with supporting evidence and counter-arguments.
5. Suggest strong CONCLUSION points.
6. End with exactly: "FINAL ANSWER: <answer>" (the core thesis or essay plan summary)

Use academic vocabulary. Balance arguments. Reference real examples or texts where possible.`,
    },
  };

  /* ══════════════════════════════════════
   *  LOGGER
   * ══════════════════════════════════════ */
  const log = (level, ...args) => {
    const ts = new Date().toISOString().slice(11, 23);
    const tag = `[Vortex ${VERSION} ${ts}]`;
    if (level === "error") console.error(tag, ...args);
    else if (level === "warn")  console.warn(tag, ...args);
    else                        console.log(tag, ...args);
  };

  /* ══════════════════════════════════════
   *  TESSERACT LAZY LOADER
   * ══════════════════════════════════════ */
  async function ensureTesseract() {
    if (typeof Tesseract !== "undefined") return;
    log("info", "Lazy-loading Tesseract.js from CDN…");
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = TESSERACT_CDN;
      s.onload  = () => { log("info", "Tesseract.js loaded ✓"); res(); };
      s.onerror = () => rej(new Error("Failed to load Tesseract.js"));
      document.head.appendChild(s);
    });
  }

  /* ══════════════════════════════════════
   *  OCR
   * ══════════════════════════════════════ */
  async function runOCR(blob, onProgress) {
    await ensureTesseract();
    log("info", "OCR start — size:", blob.size, "bytes, type:", blob.type);

    const { data } = await Tesseract.recognize(blob, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          const pct = Math.round(m.progress * 40); // 0-40%
          log("info", `OCR ${Math.round(m.progress*100)}%`);
          if (onProgress) onProgress(`Reading image… ${Math.round(m.progress*100)}%`, pct);
        }
      },
    });

    const text = data.text.trim();
    log("info", `OCR complete — ${text.length} chars extracted`);
    log("info", "OCR RAW:\n" + text);
    return text;
  }

  /* ══════════════════════════════════════
   *  AI CALL  (with retry + model fallback)
   * ══════════════════════════════════════ */
  async function callAI(systemPrompt, userPrompt, modelIdx = 0) {
    const model = MODELS[modelIdx] || MODELS[0];
    log("info", `AI call — model:"${model}" system:${systemPrompt.length}c user:${userPrompt.length}c`);

    const body = JSON.stringify({
      model,
      messages: [
        { role: "system",  content: systemPrompt },
        { role: "user",    content: userPrompt   },
      ],
    });

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        log("info", `  Attempt ${attempt}/3…`);
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const text = await res.text();
        log("info", `  AI response — ${text.length} chars`);
        return text;
      } catch (e) {
        log("warn", `  Attempt ${attempt} failed: ${e.message}`);
        if (attempt < 3) await sleep(1000 * attempt);
      }
    }

    if (modelIdx + 1 < MODELS.length) {
      log("warn", `Falling back to model "${MODELS[modelIdx + 1]}"`);
      return callAI(systemPrompt, userPrompt, modelIdx + 1);
    }

    throw new Error("All AI models failed. Check your connection and try again.");
  }

  /* ══════════════════════════════════════
   *  AUTO-DETECT TEMPLATE
   *  Uses the AI itself to classify the
   *  subject before solving.
   * ══════════════════════════════════════ */
  async function detectTemplate(text) {
    log("info", "Auto-detecting template…");
    const validIds = Object.keys(TEMPLATES).filter(k => k !== "auto").join(", ");
    const classifierPrompt = `Classify this problem into EXACTLY ONE category from this list:
${validIds}

Problem:
"""
${text.slice(0, 500)}
"""

Reply with ONLY the category id, nothing else. No punctuation. Just the word.`;

    try {
      const raw = (await callAI(
        "You are a subject classifier. Reply with only a single category id.",
        classifierPrompt
      )).trim().toLowerCase().replace(/[^a-z]/g, "");

      const detected = TEMPLATES[raw] ? raw : "auto";
      log("info", `Auto-detected template: "${detected}" (raw: "${raw}")`);
      return detected;
    } catch (e) {
      log("warn", "Template detection failed, using auto:", e.message);
      return "auto";
    }
  }

  /* ══════════════════════════════════════
   *  EXTRACT FINAL ANSWER
   * ══════════════════════════════════════ */
  function extractAnswer(reasoning) {
    // First try the structured tag
    const match = reasoning.match(/FINAL ANSWER[:\s]+(.+?)(?:\n|$)/i);
    if (match) {
      const ans = match[1].trim();
      log("info", `Answer extracted inline: "${ans}"`);
      return ans;
    }
    // Fallback: last non-empty line
    const lines = reasoning.split("\n").map(l => l.trim()).filter(Boolean);
    const last = lines[lines.length - 1] || "";
    log("warn", "No FINAL ANSWER tag found, using last line:", last);
    return last;
  }

  /* ══════════════════════════════════════
   *  CORE SOLVE PIPELINE
   * ══════════════════════════════════════ */
  async function _pipeline(inputText, templateId, onProgress) {
    const t0 = Date.now();
    log("info", `Pipeline start — template:"${templateId}" input length:${inputText.length}`);

    try {
      // Resolve template
      let resolvedTemplateId = templateId;
      if (!templateId || templateId === "auto") {
        if (onProgress) onProgress("Detecting subject…", 42);
        resolvedTemplateId = await detectTemplate(inputText);
      }

      const tpl = TEMPLATES[resolvedTemplateId] || TEMPLATES["auto"];
      log("info", `Using template: "${tpl.id}" (${tpl.label})`);

      // Solve
      if (onProgress) onProgress(`Solving with ${tpl.label} tutor…`, 55);
      const reasoning = await callAI(tpl.systemPrompt, inputText);
      log("info", `Reasoning complete — ${reasoning.length} chars`);

      // Extract answer
      if (onProgress) onProgress("Extracting answer…", 90);
      const answer = extractAnswer(reasoning);

      if (onProgress) onProgress("Done ✓", 100);

      const result = {
        input:      inputText,
        reasoning,
        answer,
        template:   tpl.id,
        model:      MODELS[0],
        durationMs: Date.now() - t0,
        error:      null,
      };

      log("info", `Pipeline complete — ${result.durationMs}ms — answer: "${answer}"`);
      return result;

    } catch (err) {
      log("error", "Pipeline error:", err);
      return {
        input:      inputText,
        reasoning:  "",
        answer:     "",
        template:   templateId || "auto",
        model:      MODELS[0],
        durationMs: Date.now() - t0,
        error:      err.message,
      };
    }
  }

  /* ══════════════════════════════════════
   *  RENDER HELPER
   *  Drop a styled card into any element.
   * ══════════════════════════════════════ */
  function renderInto(container, result) {
    if (!container) { log("warn", "renderInto: container is null"); return; }

    // Inject styles once
    if (!document.getElementById("__vortex_styles__")) {
      const s = document.createElement("style");
      s.id = "__vortex_styles__";
      s.textContent = `
        .vx-card{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0e1a;color:#e2e8f0;border-radius:16px;padding:24px;border:1px solid #1e2d3d;box-shadow:0 8px 40px rgba(0,0,0,.5)}
        .vx-answer{background:linear-gradient(135deg,#0d2818,#0a2010);border:1px solid rgba(52,211,153,.35);border-radius:12px;padding:18px 22px;margin-bottom:16px;display:flex;align-items:center;gap:16px}
        .vx-answer-label{font-size:.62rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#6ee7b7;margin-bottom:3px}
        .vx-answer-value{font-size:1.5rem;font-weight:800;color:#f0fdf4;word-break:break-word}
        .vx-steps{background:#111827;border-radius:10px;padding:18px 20px;font-size:.88rem;line-height:1.8;white-space:pre-wrap;color:#cbd5e1;max-height:400px;overflow-y:auto;margin-bottom:12px}
        .vx-meta{font-size:.68rem;color:#4b5563;display:flex;gap:12px;flex-wrap:wrap}
        .vx-error{background:#1a0505;border:1px solid #ef4444;border-radius:10px;padding:14px 18px;color:#fca5a5}
        .vx-tpl-badge{display:inline-block;padding:3px 10px;border-radius:100px;font-size:.65rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px}
      `;
      document.head.appendChild(s);
    }

    const tpl = TEMPLATES[result.template] || TEMPLATES["auto"];
    const card = document.createElement("div");
    card.className = "vx-card";

    if (result.error) {
      card.innerHTML = `<div class="vx-error"><strong>Error</strong><br>${esc(result.error)}</div>`;
    } else {
      card.innerHTML = `
        <div class="vx-tpl-badge" style="background:${tpl.color}22;color:${tpl.color};border:1px solid ${tpl.color}44">${tpl.icon} ${tpl.label}</div>
        <div class="vx-answer">
          <div style="flex:1">
            <div class="vx-answer-label">${esc(tpl.answerLabel)}</div>
            <div class="vx-answer-value">${esc(result.answer || "—")}</div>
          </div>
        </div>
        <div class="vx-steps">${esc(result.reasoning)}</div>
        <div class="vx-meta">
          <span>⏱ ${result.durationMs}ms</span>
          <span>🤖 ${esc(result.model)}</span>
          <span>📐 ${esc(tpl.label)}</span>
        </div>
      `;
    }

    container.innerHTML = "";
    container.appendChild(card);
    log("info", "renderInto: card injected");
  }

  /* ══════════════════════════════════════
   *  UTILITIES
   * ══════════════════════════════════════ */
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function esc(s) {
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  /* ══════════════════════════════════════
   *  PUBLIC CLASS
   * ══════════════════════════════════════ */
  class VortexSolver {
    constructor() {
      this.version   = VERSION;
      this.templates = TEMPLATES;
      /** @type {function(string, number): void} */
      this.onProgress = null;
      log("info", `VortexSolver v${VERSION} initialised — ${Object.keys(TEMPLATES).length} templates loaded`);
    }

    /**
     * Solve a text problem.
     * @param {string} text          - The question / problem
     * @param {string} [templateId]  - Template id or "auto" (default)
     * @returns {Promise<SolveResult>}
     */
    async solve(text, templateId = "auto") {
      log("info", `solve() called — template:"${templateId}"`);
      const cb = this.onProgress;
      if (cb) cb("Starting…", 5);
      return _pipeline(text.trim(), templateId, cb);
    }

    /**
     * Solve from an image (File or Blob) — runs OCR then solves.
     * @param {File|Blob} blob
     * @param {string}    [templateId]
     * @returns {Promise<SolveResult>}
     */
    async solveFromImage(blob, templateId = "auto") {
      log("info", `solveFromImage() — template:"${templateId}"`);
      const cb = this.onProgress;
      if (cb) cb("Starting OCR…", 2);

      const text = await runOCR(blob, cb);

      if (!text || text.length < 4) {
        const msg = "OCR could not extract readable text. Try a cleaner, higher-contrast image.";
        log("warn", msg);
        return { input: text, reasoning: "", answer: "", template: templateId, model: MODELS[0], durationMs: 0, error: msg };
      }

      return _pipeline(text, templateId, cb);
    }

    /**
     * Render a result card into a DOM element.
     * @param {HTMLElement} container
     * @param {SolveResult} result
     */
    renderInto(container, result) {
      renderInto(container, result);
    }

    /**
     * Get all available templates.
     * @returns {Object}
     */
    getTemplates() {
      return TEMPLATES;
    }
  }

  /* ══════════════════════════════════════
   *  EXPORT
   * ══════════════════════════════════════ */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = VortexSolver;
  } else {
    global.VortexSolver = VortexSolver;
  }

  log("info", `vortex-core.js loaded — window.VortexSolver ready`);

})(typeof window !== "undefined" ? window : this);
