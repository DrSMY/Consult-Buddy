

## Approach: Colorful, Icon-Rich Patient Guide PDF

Since the PDF is generated via `window.open()` + `print()`, we're working with pure HTML/CSS in a standalone window. Here's how to make it attractive:

### Strategy

**Inline SVG icons** — We can embed SVG icons directly in the HTML string (no external dependencies needed in the print window). We'll map each section title to a colored SVG icon, matching the same icon/color scheme already used in `PatientGuideDisplay.tsx`.

**Colored section headers** — Each section gets a unique background color on its header bar (teal for intro, blue for patient summary, green for nutrition, amber for side effects, rose for red flags, etc.).

**Visual enhancements:**
- Gradient header banner with the PeptiDOC branding
- Colored left border accent on each section card
- Soft pastel background tints per section
- Styled bullet points with colored dots
- A professional footer with branding

### What changes

**Single file: `src/utils/printGuide.ts`**

1. Add an `SVG_ICONS` map — inline SVG strings for each section type (syringe, pill, utensils, alert-triangle, etc.), sourced from Lucide icon paths
2. Add a `SECTION_COLORS` map — matching the color scheme from `PatientGuideDisplay.tsx` (teal, blue, green, amber, rose, violet, etc.)
3. Update the HTML template:
   - Header: gradient teal banner with logo-style text
   - Intro: teal-tinted card with a book icon
   - Each section: colored left border, tinted header background with inline SVG icon, white content area
   - Bullets: colored dot markers instead of plain dots
   - Footer: styled PeptiDOC branding strip
4. All styles use `!important` where needed for print compatibility and `-webkit-print-color-adjust: exact` to ensure colors print

### No functional changes
- Same parsing logic, same section detection, same text formatting
- Only the visual presentation of the generated HTML changes

