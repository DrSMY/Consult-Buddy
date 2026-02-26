

## Make Patient Guide Display More Attractive

The patient guide text uses a consistent `::: SECTION NAME :::` format. Instead of rendering it as plain monospace text, I'll parse these sections and render each as a styled card with an appropriate icon and color — without changing the text content itself.

### Changes

**New file: `src/components/PatientGuideDisplay.tsx`**
- A reusable component that takes the raw guide text string and parses it into sections based on the `::: SECTION_NAME :::` delimiter
- Each section renders as a color-coded card with a matching icon:
  - INTRODUCTION → BookOpen icon, teal
  - PATIENT SUMMARY → Scale icon, blue
  - STORAGE INSTRUCTIONS → ThermometerSnowflake icon, cyan
  - HOW TO INJECT / HOW TO TAKE → Syringe/Pill icon, indigo
  - NUTRITION & DIET / DIETARY ADVICE → Utensils icon, green
  - COMMON SIDE EFFECTS → AlertTriangle icon, amber
  - RED-FLAG SYMPTOMS → ShieldAlert icon, rose
  - FOLLOW-UP PLAN → Calendar icon, violet
  - PHYSICAL ACTIVITY → Activity icon, emerald
  - CONSISTENCY & MINDSET → Brain icon, purple
  - HYDRATION & RECOVERY → Droplets icon, sky
  - YOUR PRESCRIBED MEDICATIONS → Pill icon, blue
  - Unknown sections → FileText icon, gray
- The greeting line (before the first `:::`) renders as a highlighted intro banner
- Bullet points (`*   **Bold:**`) and numbered lists are parsed and rendered with proper formatting (bold labels, indented sub-items)
- The signature line (Dr Sami) renders as a styled footer
- Falls back to the plain text display if no `:::` sections are detected (for non-standard guides)

**`src/pages/WeightLossConsultation.tsx`**
- Replace the plain `<div className="whitespace-pre-wrap">` patient guide block with `<PatientGuideDisplay text={patientGuide} />`
- Keep the copy/WhatsApp buttons unchanged (they still copy the raw text)

**`src/pages/Consultation.tsx`**
- Replace the plain `<div className="whitespace-pre-wrap">` for `buildActionPlan.patientGuide` with `<PatientGuideDisplay text={patientGuide} />`

### Technical Details
- Parsing logic: split text by regex `/^:::\s*(.+?)\s*:::$/gm`, extract section titles and content
- Each section's content is further parsed: lines starting with `*` or `-` become list items, numbered lines become ordered lists, `**text**` patterns are rendered as `<strong>`
- The component is purely presentational — no text modification. The raw text is preserved for copy/WhatsApp
- Section-to-icon mapping uses a simple lookup object
- Responsive: cards stack vertically, work on mobile

