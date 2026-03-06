

## Diagnosis

The current PDF template has two issues causing the "only header/footer have color" appearance:

1. **`.section-content` forces `background: white`** (line 188) — this overrides the colored section background, so only the tiny section header bar shows color while the actual content is plain white.
2. **Subtle pastel tints are too faint** — even when fixed, the colors need to be more vivid to be noticeable in print.

The icons and color-mapping code is already in place and working. The fix is purely CSS/template adjustments.

## Plan — Single file: `src/utils/printGuide.ts`

### Changes

1. **Remove `background: white` from `.section-content`** — let the section's tinted background show through the content area
2. **Increase color saturation** on section backgrounds so they're clearly visible in print (e.g., `#f0fdfa` → a slightly richer tint)
3. **Add a colored accent bar** at the top of each section content area (a thin gradient divider between header and content)
4. **Make section icons larger** (18px → 22px) so they're more prominent
5. **Add a subtle colored left-border stripe** that runs the full height of each section (already present at 4px, increase to 5px for more visual weight)
6. **Style bullet points larger** (7px → 9px colored dots) for more visual pop
7. **Add a subtle background gradient to the page body** so it's not plain white between sections

No external dependencies or images needed — all visual richness comes from CSS colors, gradients, and the existing inline SVG icons. Nothing from the user is required.

### Preview note
I cannot render a live preview of the print window, but after implementation you can click **Print / PDF** on any consultation to see the result immediately. The print dialog's preview will show the full colorful layout before you commit to printing.

