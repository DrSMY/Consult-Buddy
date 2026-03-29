

## Add Cancer/Malignancy History Question to Step 2

### What changes

**Single file: `src/data/intakeQuestions.ts`**

Add a new question after `allergies` and before the pregnancy questions (line 38), in the "Health Status & Medical Background" section:

```typescript
{
  id: "cancer_history",
  section: "Health Status & Medical Background",
  question: "Have you or anyone in your close family ever been diagnosed with cancer or any type of tumor/growth?",
  type: "select",
  options: ["No", "Yes - myself", "Yes - a family member", "Yes - both myself and a family member"],
  hasNotes: true
}
```

- **Patient-friendly language**: Uses "cancer or any type of tumor/growth" instead of clinical "malignancy"
- **`hasNotes: true`**: Allows the patient/doctor to add details (type, when, treatment status)
- **Covers both personal and family history** since family history of malignancy is also a clinical red flag for peptide therapy (especially growth-factor peptides)
- **No conditional logic needed** — this applies to all patients regardless of gender or goals

This question will automatically appear on Step 2 of the intake form alongside other health background questions, and the answer will flow through to the consultation AI for clinical consideration.

