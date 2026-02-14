

# Patient Intake & Consultation Assistant

## Overview
A clinic consultation assistant for peptide therapy programs. It guides doctors through patient intake via voice or text, recommends peptide protocols from your protocol database, and auto-generates doctor notes, patient guidelines, and next steps.

---

## Phase 1: Authentication & Team Access
- **Sign-up / Login page** with email & password (Supabase Auth)
- **User profiles** with name and role (Doctor, Nurse, Admin)
- **Role-based access** so only authorized clinic staff can use the app
- Secure session management

## Phase 2: Program Selection Dashboard
- After login, a clean dashboard showing available programs
- **Peptides Program** card (active) — ready to use
- **Weight Loss / GLP-1** card (coming soon) — placeholder for future
- Easy to add new programs later

## Phase 3: Peptide Protocol Knowledge Base
- Import your peptide protocol data (from your spreadsheet) into the database
- Store all peptide details: names, categories, indications, dosing, contraindications, safety info, and reconstitution instructions
- This data powers the AI recommendations during consultations

## Phase 4: Patient Intake Flow
- **Step-by-step guided questionnaire** for each consultation
- Questions cover: patient demographics, medical history, current medications, allergies, lab results, and treatment goals
- **Speech-to-text input** — tap a mic button to dictate answers instead of typing
- Progress indicator showing where you are in the intake
- Ability to save partial intakes and resume later

## Phase 5: AI-Powered Consultation Assistant
- After intake is complete, the AI analyzes patient answers against your peptide protocol database
- **Recommends specific peptides** with dosages, frequencies, and combinations
- **Flags contraindications** and safety concerns based on patient history
- Doctor reviews and approves/modifies recommendations before finalizing

## Phase 6: Document Generation
Three auto-generated outputs after each consultation:

1. **Doctor Note** — Clinical summary with patient info, findings, selected protocol, and rationale
2. **Next Steps** — Follow-up schedule, lab orders, monitoring plan
3. **Patient Guidelines** — Patient-friendly instructions on their peptide therapy, administration, what to expect, and when to seek help

- All documents viewable in-app and copyable
- Consultation history saved per patient

## Design & Experience
- Clean, professional medical-style interface
- Mobile-friendly so it works on tablets during consultations
- Dark/light mode support
- Fast, minimal clicks — optimized for busy clinic workflows

