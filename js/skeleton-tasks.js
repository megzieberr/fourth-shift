// The job-card board — rebuilt 7 Sep when the real A2 brief landed.
// Live canon = Supabase (reseeded via MCP, 2026-09-07); this copy feeds local/demo mode.
// Demo mode has no real members, so role cards carry the role in the title instead of an assignee.
export const SEED_TASKS = [
  // ① Set up
  { station: 1, title: "Confirm you're in the RIGHT tutor WhatsApp group", note: "13 groups exist — the wrong one means missing A2 information. Check with the tutor if unsure." },
  { station: 1, title: "Watch for the tutor's email with the group list", note: "Names, phone numbers, emails of the other three." },
  { station: 1, title: "Create the group WhatsApp and get all four in", note: "Someone unreachable? Contact the tutor immediately — that's the official route." },
  { station: 1, title: "Everyone clocks in on this board once", note: "Proves the login works before it matters." },
  // ② Decode the brief
  { station: 2, title: "Everyone reads the full brief — same day it lands" },
  { station: 2, title: "List the four tasks, lengths and rubric on this card", note: "T1 reflection /11 · T2 intro /25 · T3 reflection /5 · T4 prompt /4 + reflection /5. Paragraphs are ±120 words; the intro 110–150." },
  { station: 2, title: "Set internal deadlines — group cut-off Friday 18 Sep, not the 20th" },
  // ③ Task 1 · Source check (11)
  { station: 3, title: "Everyone: find the Xu, David & Kim (2018) article — NWU Library → Google Scholar", note: "Match the exact title — Scholar's listing shows the wrong authors; the lecturer herself ended up finding the PDF via plain Google. Everyone downloads their own copy." },
  { station: 3, title: "Everyone: fill the CARS checklist on it (individually — never submitted)", note: "Credibility · Accuracy · Reasonableness · Support. Feeds your version of the paragraph." },
  { station: 3, title: "Typewriter: v1 of the reflection — 120 words, rough on purpose", note: "How source evaluation supports academic integrity: easiest criteria + why, hardest + why, how NWU Library sourcing changes 'credible'. Lecturer: don't polish v1." },
  { station: 3, title: "Flow master: v2 — paragraph shape, linking words, hedging", note: "Topic sentence → support → concluding sentence. 5 of the 11 marks are structure." },
  { station: 3, title: "Word wizard: v3 — vocabulary, spelling, grammar" },
  { station: 3, title: "Rubric guardian: v4 — final version (this one is marked)", note: "Check every instruction + all 3 rubric rows: content 5 · structure 5 · language 1." },
  // ④ Task 2 · The introduction (25)
  { station: 4, title: "Everyone reads student X's essay in full" },
  { station: 4, title: "Read the conclusion FIRST — the thesis lives there", note: "The intro's thesis is a reworded version of what their conclusion already says." },
  { station: 4, title: "List the body's main ideas, in order", note: "That list, turned into a sentence, IS the preview." },
  { station: 4, title: "Typewriter: v1 of the intro — 110–150 words, ONE paragraph", note: "Background (±2 sentences) → problem → thesis (reworded from their conclusion) → preview (their headings as a sentence). Rough is fine — the polish comes in v2–v4." },
  { station: 4, title: "Flow master: v2 — linking words, hedging, text-reference format", note: "Lecturer put reference-format checking here. At least three connectors; signpost phrases are fine and expected." },
  { station: 4, title: "Word wizard: v3 — vocabulary, spelling, grammar" },
  { station: 4, title: "Rubric guardian: v4 — final version (this one is marked)", note: "5 marks each: background · problem · thesis · preview · language. Word count 110–150, one paragraph, no line breaks. Addendum C checklist, workbook p.269." },
  // ⑤ Task 3 · AI feedback (5)
  { station: 5, title: "T3 · Everyone: run BOTH given prompts on the finished intro (individually — never submitted)", note: "By Sun 13 Sep · Any AI tool. Prompt 1 = cohesion/clarity/formality; Prompt 2 = background/problem/thesis/preview. Keep both outputs — the reflection must quote specifics." },
  { station: 5, title: "Typewriter: v1 of the reflection — 120 words", note: "By Mon 14 Sep · Name the preferred prompt, refer to specific feedback from BOTH, connect the choice to what a good academic introduction contains." },
  { station: 5, title: "Flow master: v2 — flow, linking words, hedging" },
  { station: 5, title: "Word wizard: v3 — vocabulary, spelling, grammar" },
  { station: 5, title: "Rubric guardian: v4 — final version (this one is marked)", note: "Rubric: prompt choice + engagement with feedback 3 · alignment with intro elements 2." },
  // ⑥ Task 4 · Prompt + paragraph (9)
  { station: 5, title: "T4 · Everyone: feed the essay + final intro to an AI, generate the alternative Xu et al. paragraph", note: "Use the group's developing prompt. Check that every source the AI cites actually EXISTS — the lecturer asks for this specifically." },
  { station: 5, title: "Everyone: fill the 4.2 comparison table (individually — never submitted)", note: "Original vs AI paragraph: focus · sources · clarity of argument · register/style · relevance to the essay aim. Feeds the reflection." },
  { station: 5, title: "Typewriter: v1 of BOTH — the prompt and the 120-word reflection", note: "Prompt: instruct a body paragraph from the Xu et al. source with academic structure. The lecturer wants to SEE the prompt develop across versions. Reflection: ≥3 table aspects — weaknesses, improvements, what you'd adopt, limitations." },
  { station: 5, title: "Flow master: v2 of both" },
  { station: 5, title: "Word wizard: v3 of both" },
  { station: 5, title: "Rubric guardian: v4 of both (marked: prompt /4, reflection /5)" },
  // ⑦ Wrap
  { station: 7, title: "Full-group read-through of everything" },
  { station: 7, title: "Any references in NWU Harvard style" },
  { station: 7, title: "Portfolio complete ON the Google Sheet by Sun 20 Sep 23:55", note: "Nothing is submitted on eFundi — marking happens on the Sheet and the group's /50 lands on eFundi after. Problems? Email the lecturer BEFORE the deadline. No extensions." },
  { station: 7, title: "Version-history check: all four names show edits from their OWN accounts", note: "File → Version history is the contribution evidence the tutor and lecturer read. Work online in the Sheet, each from your own Google account." },
];
