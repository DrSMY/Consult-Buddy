

# Weight Loss / GLP-1 Program Integration

## Overview
Integrate the DocSlim weight loss flow into DOCassist as the second program path ("Weight Loss / GLP-1"), adapting the uploaded components to match the existing architecture and DOCassist design system.

## What Gets Built

The Weight Loss / GLP-1 program will be a **3-step intake + treatment + summary** flow, mirroring the logic from the uploaded DocSlim code but adapted to work within DOCassist's existing routing, database, and UI patterns.

### Step 1: Identity & Demographics
- Patient name, mobile, booking ref, age, gender
- Height (cm/ft toggle) and Weight (kg/lbs toggle)
- Auto-calculated BMI with color-coded category badge
- AI Smart Fill (paste raw text, auto-extract fields using Lovable AI)

### Step 2: Clinical Analysis & Medical History
- Auto-calculated BMR, daily maintenance calories, and weight-loss target calories (Mifflin-St Jeor formula)
- Activity level selector (Sedentary, Lightly Active, Moderately Active, Very Active) with multiplier descriptions
- Chronic illnesses and current medications (free text)
- Previous GLP-1 use toggle with medication/dose history
- Pregnancy screening for female patients

### Step 3: Treatment Plan
- GLP-1 medication selector: Mounjaro, Wegovy, Ozempic, Rybelsus, Other
- Dose picker with medication-specific options (e.g., Mounjaro: 2.5mg, 5mg, 7.5mg, 10mg, 12.5mg, 15mg)
- Blood test required toggle
- Additional treatment notes
- Auto-generated Clinical Suggestion (doctor's note) incorporating BMI category, medication, dose, protein targets, calorie targets, GLP-1 history
- AI-generated Patient Care Guide
- Summary/Review screen with copy-to-clipboard for clinical record and patient guide

## Technical Plan

### 1. New Data File: `src/data/glp1Config.ts`
Define all GLP-1 specific constants extracted from the uploaded code:
- `Gender`, `ActivityLevel`, `MedicationType` enums
- Dose arrays: `MOUNJARO_DOSES`, `WEGOVY_DOSES`, `OZEMPIC_DOSES`, `RYBELSUS_DOSES`
- `ACTIVITY_MULTIPLIERS` and `ACTIVITY_DESCRIPTIONS` records
- `GLP1Patient` interface (the patient data shape for the weight-loss flow)
- `TreatmentPlan` interface
- BMI/BMR calculation helpers

### 2. New Page: `src/pages/WeightLossIntake.tsx`
A single multi-step page component (replaces the 3 separate DocSlim components) with internal step state:
- **Step 0 - Selection**: New Patient vs Follow-up (from `SelectionPage.tsx` logic)
- **Step 1 - Identity**: Adapted from `IdentityForm.tsx` -- patient demographics, height/weight with unit toggles, smart fill
- **Step 2 - Clinical**: Adapted from `PatientForm.tsx` -- BMI/BMR/calorie display, activity level, medical history, GLP-1 history
- **Step 3 - Treatment**: Adapted from `TreatmentForm.tsx` -- medication selection, dose, blood test, notes, auto-generated clinical suggestion, AI patient guide generation
- On submit: saves to existing `consultations` table with `program: "weight-loss"`

### 3. New Page: `src/pages/WeightLossConsultation.tsx`
The review/summary page after submission (adapted from `SummaryReview.tsx`):
- Clinical Record section with copy button
- Patient Care Guide section with copy button
- Uses data from the `consultations` table `ai_recommendations` JSON field

### 4. Update Dashboard: `src/pages/Dashboard.tsx`
- Change `active: false` to `active: true` for the Weight Loss card
- Route click to `/program/weight-loss`

### 5. Update Router: `src/App.tsx`
- Add route for `/weight-loss/:id` pointing to the consultation review page
- The existing `/program/weight-loss` route already maps to `PatientIntake`, but we'll create a conditional: if `programId === "weight-loss"`, render `WeightLossIntake` instead

### 6. Backend Function for AI Guide Generation
- Create or update the existing `consultation` edge function to handle a `generate-glp1-guide` action
- Uses Lovable AI (Gemini) to generate a patient-facing care guide based on the clinical data (medication, dose, BMI, protein targets, etc.)
- No external API key needed

### 7. Database
- No schema changes needed -- the existing `consultations` table handles this via its flexible `intake_answers` (JSON) and `ai_recommendations` (JSON) columns, plus the `program` field set to `"weight-loss"`

## File Summary

| Action | File |
|--------|------|
| Create | `src/data/glp1Config.ts` |
| Create | `src/pages/WeightLossIntake.tsx` |
| Create | `src/pages/WeightLossConsultation.tsx` |
| Edit | `src/pages/Dashboard.tsx` (enable weight-loss card) |
| Edit | `src/App.tsx` (add routes + conditional rendering) |
| Edit | `supabase/functions/consultation/index.ts` (add GLP-1 guide generation) |

