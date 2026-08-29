// The seeded job-card skeleton — what we know before the full brief lands (7 Sep).
// Live canon = supabase/schema.sql (same list in SQL); this copy feeds local/demo mode.
export const SEED_TASKS = [
  // ① Set up
  { station: 1, title: "Confirm you're in the RIGHT tutor WhatsApp group", note: "13 groups exist — the wrong one means missing A2 information. Check with the tutor if unsure." },
  { station: 1, title: "Watch for the tutor's email with the group list", note: "Names, phone numbers, emails of the other three." },
  { station: 1, title: "Create the group WhatsApp and get all four in", note: "Someone unreachable? Contact the tutor immediately — that's the official route." },
  { station: 1, title: "Everyone clocks in on this board once", note: "Proves the login works before it matters." },
  { station: 1, title: "Ask the tutor: is the A2 mark shared or split?", note: "This decides how much each member's part counts." },
  // ② Decode the brief
  { station: 2, title: "Everyone reads the full brief — same day it lands" },
  { station: 2, title: "List the four tasks, lengths and rubric on this card", note: "Edit this card's note once the brief is out." },
  { station: 2, title: "Divide the work — name an owner per task" },
  { station: 2, title: "Set internal deadlines — group cut-off Friday 18 Sep, not the 20th" },
  // ③ Read like markers
  { station: 3, title: "Everyone reads student X's essay in full" },
  { station: 3, title: "Read the conclusion FIRST — the thesis lives there", note: "The intro's thesis is a reworded version of what their conclusion already says." },
  { station: 3, title: "List the body's main ideas, in order", note: "That list, turned into a sentence, IS the preview." },
  // ④ Build the introduction
  { station: 4, title: "Draft the background (about 2 sentences)" },
  { station: 4, title: "Draft the problem statement", note: "Ends with a mental question mark." },
  { station: 4, title: "Draft the thesis — reworded from student X's conclusion" },
  { station: 4, title: "Turn the main-idea list into the preview sentence" },
  { station: 4, title: "Assemble: ONE paragraph, no line breaks, 3+ connectors", note: "Follow the formula. Signpost phrases are fine and expected." },
  { station: 4, title: "Check against the Addendum C checklist", note: "Workbook printed p.269." },
  // ⑤ Tasks 2–4 (unpublished)
  { station: 5, title: "Task 2 — details land 7 Sep" },
  { station: 5, title: "Task 3 — details land 7 Sep" },
  { station: 5, title: "Task 4 — details land 7 Sep" },
  // ⑥ Submit
  { station: 6, title: "Full-group read-through of everything" },
  { station: 6, title: "Any references in NWU Harvard style" },
  { station: 6, title: "Submit on eFundi — due Sun 20 Sep 23:55", note: "Problems? Email the lecturer BEFORE the deadline. No extensions." },
  { station: 6, title: "Screenshot the submission confirmation into WhatsApp" },
];
