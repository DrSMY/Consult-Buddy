

## Add "Send WhatsApp" to Completed Consultations

### How It Works
- Uses `wa.me` deep links to open WhatsApp with the patient's phone number and the guide text pre-filled
- You press send from your own WhatsApp -- no API keys or third-party accounts needed
- The patient's mobile number is already captured during intake

### Changes

**`src/pages/WeightLossIntake.tsx`** (Step 3 - Summary):
- Add a "Send WhatsApp" button next to the "Copy Guide" button on the Patient Care Guide card
- Clicking it opens `https://wa.me/{phone}?text={encodedGuide}` in a new tab
- The phone number comes from `patient.mobileNumber`, the guide from `treatment.patientGuide`

**`src/pages/WeightLossConsultation.tsx`** (Completed consultation review):
- Add a "Send WhatsApp" button next to the "Copy" button on the Patient Care Guide card
- Same `wa.me` link logic using the patient data from the consultation record

**`src/pages/Consultation.tsx`** (Peptide consultation - Patient Guide tab):
- Add a "Send WhatsApp" button next to the "Copy" button on the Patient Guidelines tab
- Uses the patient's mobile number from intake answers and the generated patient guidelines text

### Technical Details
- Phone number is sanitized: strips spaces, dashes, and ensures it starts with a country code
- Guide text is URI-encoded for the WhatsApp URL
- If no phone number is available, the button is disabled with a tooltip explaining why
- Uses the MessageCircle icon from lucide-react for the WhatsApp button
- Opens in a new tab so the consultation page stays open

### No backend or database changes needed
