

## Root Cause

The section parsing regex in `printGuide.ts` line 81 is:
```
/^(?::::\s*(.+?)\s*::::|---\s*(.+?)\s*---)$/gm
```
It expects **4 colons** (`::::`) but the consultation edge function generates section markers with **3 colons** (`::: INTRODUCTION :::`). Because nothing matches, the entire guide renders as plain unstyled text -- no colored cards, no icons, no section backgrounds.

## Fix -- Single file: `src/utils/printGuide.ts`

**Line 81**: Change the regex to match 3+ colons instead of exactly 4:
```
/^(?:::+\s*(.+?)\s*:::+|---\s*(.+?)\s*---)$/gm
```

This single character change (`:::+` instead of `::::`) will make the regex match `::: TITLE :::` correctly. Once matched, all the existing icon mapping, color mapping, and section card rendering will work as designed -- colored backgrounds, SVG icons in headers, tinted bullet dots, the full layout.

Additionally, some section titles in the guide don't exactly match the keys in `SECTION_COLORS` / `SVG_ICONS` (e.g., `"NUTRITION & DIET STRUCTURE"` vs `"NUTRITION & DIET PLAN"`, `"HOW TO TAKE"` vs `"HOW TO TAKE YOUR MEDICATION"`, `"COMMON SIDE EFFECTS & MANAGEMENT"` vs `"COMMON SIDE EFFECTS"`). The fuzzy matching via `includes()` in `getColors`/`getIcon` handles most of these, but I will add a few missing key variants to ensure full coverage:
- `"NUTRITION & DIET STRUCTURE"` 
- `"COMMON SIDE EFFECTS & MANAGEMENT"`
- `"HOW TO TAKE"`
- `"PHYSICAL ACTIVITY PLAN"`
- `"NUTRITION & DIETARY ADVICE"`
- `"FOLLOW-UP"`

