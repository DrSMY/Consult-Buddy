INSERT INTO public.weight_loss_medications (
  name, category, mechanism_of_action, indications_uae, administration, available_doses,
  how_it_works_patient, how_to_use, missed_dose, storage_handling, what_to_expect,
  common_side_effects, contraindications, scientific_information, key_advantages
) VALUES (
  'Wegovy Pill',
  'Oral GLP-1 Receptor Agonist (semaglutide tablet)',
  'Oral semaglutide — a GLP-1 receptor agonist that increases satiety, slows gastric emptying, and reduces appetite, leading to reduced caloric intake and weight loss.',
  'Approved in the UAE (April 2026) for chronic weight management in adults with obesity (BMI ≥ 30) or overweight (BMI ≥ 27) with at least one weight-related comorbidity, as an adjunct to a reduced-calorie diet and increased physical activity.',
  'Oral tablet once daily in the morning on an empty stomach (after ~8 hours fasting). Swallow whole with up to ½ cup (≤120 mL) of plain water. Wait at least 30 minutes before eating, drinking, or taking other oral medications.',
  E'Tablets: 1.5 mg, 4 mg, 9 mg, and 25 mg\nMaintenance dose: 25 mg once daily\nEscalate every 30 days as tolerated (1.5 → 4 → 9 → 25 mg)',
  'Wegovy Pill is the oral form of semaglutide. It works on the same hunger-regulating pathway as the injection — helping you feel full sooner, stay full longer, and naturally eat less.',
  E'1. Take 1 tablet each morning on an empty stomach (after ~8 hours fasting)\n2. Swallow whole with a small sip of water (up to ½ cup)\n3. Wait 30 minutes before eating, drinking, or taking any other medication\n4. Do not split, crush, or chew the tablet',
  'If you miss a dose, skip it and take your next dose the following morning. Do not take two tablets on the same day.',
  'Store at room temperature in original blister pack. Protect from moisture. No refrigeration required.',
  E'Appetite suppression often begins within the first 1–2 weeks. Meaningful weight loss is typically seen by weeks 8–12. Clinical data (OASIS 4) show up to ~17% body weight reduction at the 25 mg maintenance dose.',
  'Nausea, vomiting, diarrhea, constipation, abdominal discomfort. Most are mild-to-moderate, occur during initiation or dose escalation, and improve over time.',
  'Personal or family history of medullary thyroid carcinoma (MTC), Multiple Endocrine Neoplasia syndrome type 2 (MEN 2), hypersensitivity to semaglutide, pregnancy, breastfeeding. Use with caution in patients with history of pancreatitis or severe GI disease.',
  'Based on >8 years of established semaglutide safety data. OASIS 4 trial demonstrated superior weight loss versus other oral GLP-1 agents. Indirect comparison shows 14× higher odds of staying on therapy due to better GI tolerability versus orforglipron.',
  E'• More effective and faster oral GLP-1 for weight loss currently available\n• Up to 17% mean body weight reduction at 25 mg\n• 14× better GI tolerability vs other oral GLP-1s\n• Convenient once-daily oral tablet — no injections, no refrigeration\n• Compatible with common medications (oral contraceptives, statins)\n• Supports cardiovascular risk reduction in ASCVD patients with obesity/overweight\n• Backed by 8+ years of established semaglutide safety profile'
)
ON CONFLICT (name) DO UPDATE SET
  category = EXCLUDED.category,
  mechanism_of_action = EXCLUDED.mechanism_of_action,
  indications_uae = EXCLUDED.indications_uae,
  administration = EXCLUDED.administration,
  available_doses = EXCLUDED.available_doses,
  how_it_works_patient = EXCLUDED.how_it_works_patient,
  how_to_use = EXCLUDED.how_to_use,
  missed_dose = EXCLUDED.missed_dose,
  storage_handling = EXCLUDED.storage_handling,
  what_to_expect = EXCLUDED.what_to_expect,
  common_side_effects = EXCLUDED.common_side_effects,
  contraindications = EXCLUDED.contraindications,
  scientific_information = EXCLUDED.scientific_information,
  key_advantages = EXCLUDED.key_advantages,
  updated_at = now();