
CREATE TABLE public.weight_loss_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text,
  mechanism_of_action text,
  indications_uae text,
  administration text,
  available_doses text,
  how_it_works_patient text,
  how_to_use text,
  missed_dose text,
  storage_handling text,
  what_to_expect text,
  common_side_effects text,
  contraindications text,
  scientific_information text,
  key_advantages text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.weight_loss_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read weight loss medications"
  ON public.weight_loss_medications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert weight loss medications"
  ON public.weight_loss_medications FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update weight loss medications"
  ON public.weight_loss_medications FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete weight loss medications"
  ON public.weight_loss_medications FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_weight_loss_medications_updated_at
  BEFORE UPDATE ON public.weight_loss_medications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.weight_loss_medications (name, category, mechanism_of_action, indications_uae, administration, available_doses, how_it_works_patient, how_to_use, missed_dose, storage_handling, what_to_expect, common_side_effects, contraindications, scientific_information, key_advantages) VALUES
(
  'Wegovy',
  'Injectable GLP-1',
  'Semaglutide is a long-acting GLP-1 receptor agonist that mimics the endogenous incretin hormone GLP-1. It acts on brain appetite centers to increase satiety, slows gastric emptying, and improves glucose-dependent insulin secretion.',
  E'• Chronic weight management in adults with BMI ≥30 kg/m², or BMI ≥27 kg/m² with at least one weight-related comorbidity\n• Pediatric patients aged 12 years and older with obesity (BMI ≥95th percentile)\n• Reduction of major adverse cardiovascular events in adults with established CVD',
  'Subcutaneous injection once weekly in the abdomen, thigh, or upper arm.',
  E'Prefilled single-dose pens: 0.25 mg, 0.5 mg, 1 mg, 1.7 mg, 2.4 mg.\nMaintenance: 1.7 mg or 2.4 mg weekly (adults); 2.4 mg weekly (adolescents).',
  'Wegovy mimics a natural hormone called GLP-1 that your body produces after eating. Think of it as a "fullness messenger" — it travels to your brain to tell you that you are satisfied with less food. It also slows down how quickly food leaves your stomach, so you feel full longer. Additionally, it helps your pancreas release insulin only when needed, which improves blood sugar control. Most patients begin noticing reduced appetite within the first 1-2 weeks, with weight loss typically becoming measurable by week 4-8.',
  E'• Inject once weekly, on the same day each week, at any time of day\n• Injection sites: abdomen (at least 2 inches from the navel), front of thigh, or back of upper arm\n• Rotate injection sites each week to avoid skin irritation\n• Single-use disposable pen — discard in a sharps container after use\n• No need to count clicks or hold the button — the pen delivers the full dose automatically\n• Tip: Set a weekly phone reminder (e.g., Sunday evening or Monday morning)',
  'If you miss a dose and your next scheduled dose is more than 2 days (48 hours) away, take the missed dose as soon as possible. If your next dose is less than 2 days away, skip the missed dose and resume your regular schedule. Do not take two doses within 2 days of each other.',
  E'• Refrigerate at 2-8°C (36-46°F) in the original carton to protect from light\n• Pen may be stored at room temperature (below 30°C) for up to 28 days after first use\n• Do not freeze. If frozen, discard the pen even if thawed\n• Keep out of reach of children and pets',
  E'Week 1-4: Reduced appetite and early satiety begin. Mild nausea common but usually resolves. Average weight loss: 1-2%.\nWeek 5-12: Appetite suppression more pronounced. Most patients achieve 5-8% weight reduction by week 12.\nMonth 6-12: Continued gradual weight loss; average total loss 10-15% at 12 months. Some achieve 20%+.\nMaintenance: Long-term therapy typically required to sustain weight loss.',
  'Nausea, diarrhea, vomiting, constipation, abdominal pain, headache, fatigue, dyspepsia, injection-site reactions. GI symptoms usually mild-to-moderate and improve with continued use.',
  'Personal or family history of medullary thyroid carcinoma (MTC), Multiple Endocrine Neoplasia syndrome type 2 (MEN 2), pregnancy, breastfeeding, hypersensitivity to semaglutide.',
  'Semaglutide is a GLP-1 receptor agonist with 94% homology to native human GLP-1, modified with a C18 fatty di-acid chain and hydrophilic spacer for albumin binding, extending half-life to ~165 hours (~7 days), enabling once-weekly dosing. SELECT trial (NEJM 2023) demonstrated 20% reduction in MACE in adults with established CVD and overweight/obesity. STEP 1 showed mean weight loss of 14.9% at 68 weeks vs 2.4% with placebo. STEP TEENs demonstrated efficacy in adolescents 12-17 with BMI reduction of 16.1% at 68 weeks. SC bioavailability ~80%; peak plasma concentration at 24-72h. Metabolized via proteolytic cleavage and beta-oxidation; renal elimination minimal.',
  NULL
),
(
  'Mounjaro',
  'Injectable Dual GIP/GLP-1',
  'Tirzepatide is a dual GIP and GLP-1 receptor agonist. By activating both incretin pathways, it produces enhanced appetite suppression and greater weight reduction compared to selective GLP-1 agonists.',
  E'• Registered for obesity pharmacotherapy in the UAE alongside lifestyle modification\n• Type 2 diabetes management',
  'Subcutaneous injection once weekly. If a dose is missed, take within 4 days (96 hours); otherwise skip.',
  E'Prefilled pens: 2.5 mg, 5 mg, 7.5 mg, 10 mg, 12.5 mg, 15 mg.\nMaximum: 15 mg weekly.',
  'Mounjaro works through two natural hormone pathways — GLP-1 and GIP. GLP-1 reduces appetite and slows stomach emptying, while GIP enhances the body''s response to food intake and supports metabolic health. Together, these dual actions produce stronger appetite suppression and greater weight loss than single-hormone medications. Many patients report feeling significantly less interested in food within the first 2 weeks. The combination also appears to improve how the body processes fats and sugars, leading to better metabolic markers beyond just weight loss.',
  E'• Inject subcutaneously once weekly, same day, any time of day, with or without meals\n• Approved injection sites: abdomen, thigh, or upper arm — rotate sites each week\n• Pen is multi-dose; follow the dose indicator window to confirm delivery\n• Inject the full dose and hold against the skin for at least 10 seconds\n• Tip: Prime your pen before first use as instructed in the package leaflet',
  'If you miss a dose, take it as soon as possible within 4 days (96 hours). If more than 4 days have passed, skip the missed dose and take the next dose on the regular day. Do not take two doses within 3 days of each other.',
  E'• Refrigerate at 2-8°C (36-46°F) in original carton to protect from light\n• May be stored at room temperature up to 30°C for up to 21 days after first use\n• Do not freeze or expose to excessive heat. Discard if frozen',
  E'Week 1-4: Appetite reduction begins within days. Nausea may occur but usually mild-to-moderate and transient. Average early weight loss: 2-4% by week 4.\nMonth 3-6: Significant weight reduction; most patients achieve 10-15% loss by month 6.\nMonth 12: Average weight loss 15-22% depending on dose (SURMOUNT-1: 15 mg dose produced 20.9% mean weight loss at 72 weeks). 15 mg dose generally produces greatest effect but requires longest titration.',
  'Nausea, diarrhea, decreased appetite, vomiting, constipation, dyspepsia, abdominal pain, injection-site reactions. Generally dose-dependent and improve over time.',
  'Personal or family history of medullary thyroid carcinoma (MTC), Multiple Endocrine Neoplasia syndrome type 2 (MEN 2), pregnancy, breastfeeding, hypersensitivity to tirzepatide.',
  'Tirzepatide is a dual GIP/GLP-1 receptor agonist (twincretin) developed by Eli Lilly. 39-amino acid linear peptide with balanced affinity at both GIP and GLP-1 receptors. Incorporates a C20 fatty di-acid moiety via hydrophilic linker for albumin binding, achieving half-life ~120 hours (5 days). SURMOUNT-1 (NEJM 2022) showed dose-dependent weight loss: 5 mg (15%), 10 mg (19.5%), 15 mg (20.9%) at 72 weeks. SURMOUNT-5 head-to-head showed superior weight loss vs semaglutide 2.4 mg. Also significant improvements in HbA1c, lipid profiles, blood pressure, and inflammatory markers.',
  NULL
),
(
  'Rybelsus',
  'Oral GLP-1',
  'Oral semaglutide; same active ingredient as Wegovy in tablet form. Activates GLP-1 receptor to reduce appetite, slow gastric emptying, and improve glucose control. Uses absorption enhancer SNAC for transcellular gastric absorption.',
  E'• Type 2 diabetes management in adults\n• Off-label for weight management (requires informed consent)\n• Not approved for pediatric use',
  E'Oral tablet once daily on a completely empty stomach with no more than 120 mL of plain water.\nWait at least 30 minutes before eating, drinking, or taking other medications.\nSwallow tablet whole — do not chew, crush, or split.',
  'Tablets: 3 mg, 7 mg, 14 mg.',
  'Rybelsus contains the same active ingredient as Wegovy (semaglutide) but in tablet form. It activates the GLP-1 receptor to reduce appetite, slow stomach emptying, and improve blood sugar control. Because it passes through the digestive system, only a small portion is absorbed — this is why it must be taken on a completely empty stomach with a small amount of water only. The absorption enhancer (SNAC) temporarily protects the peptide from stomach acid and helps it cross the stomach lining into the bloodstream.',
  E'• Take on a completely empty stomach immediately upon waking — no food, drink (except water), or other medications before the tablet\n• Swallow with no more than 120 mL (half a cup) of plain water only\n• Swallow whole — do not chew, crush, or split\n• Wait at least 30 minutes before eating, drinking anything else, or taking other medications\n• Tip: Keep the tablet and water on your bedside table; take it first thing before getting out of bed\n• Tip: Set a kitchen timer for 30 minutes',
  'If you miss a dose, skip the missed dose and take your next dose the following morning on an empty stomach. Do not take two doses on the same day or extra tablets to make up for a missed dose.',
  E'• Store in the original blister pack at room temperature (below 30°C)\n• Keep tablets in the blister until ready to use; do not remove in advance\n• Protect from moisture and light',
  E'Week 1-4: Appetite reduction begins; some notice effects within days. Mild nausea or stomach discomfort may occur, especially if taken without proper fasting. Weight loss of 1-3% typical in the first month.\nMonth 3-6: Continued gradual weight loss averaging 5-10% at 6 months. Because oral absorption is less efficient than injection, results may be less pronounced than Wegovy. The 14 mg dose produces ~60-70% of the weight-loss effect seen with injectable semaglutide 2.4 mg.\nLong-term therapy required to maintain results.',
  'Nausea, abdominal pain, diarrhea, decreased appetite, vomiting, constipation. Most GI symptoms are mild and resolve with continued use.',
  'Personal or family history of medullary thyroid carcinoma (MTC), Multiple Endocrine Neoplasia syndrome type 2 (MEN 2), pregnancy, breastfeeding, hypersensitivity to semaglutide.',
  'Rybelsus uses the absorption enhancer SNAC (sodium N-[8-(2-hydroxybenzoyl)amino]caprylate) for transcellular gastric absorption. Bioavailability ~0.5-1.5% (vs ~80% for SC). PIONEER program (1-8) showed HbA1c reductions 1.0-1.4% and modest weight loss 3.5-4.4 kg at 26-52 weeks. STEP 8 trial showed inferior weight loss vs SC semaglutide 2.4 mg (oral 14 mg: 9.6% vs SC 2.4 mg: 15.8% at 68 weeks).',
  NULL
),
(
  'Foundayo',
  'Oral GLP-1 (Small Molecule)',
  'Foundayo (orforglipron) is a small-molecule, non-peptide GLP-1 receptor agonist. Its structure allows efficient absorption without special formulation requirements.',
  E'• Chronic weight management in adults with obesity (BMI ≥30) or overweight (BMI ≥27) with comorbidities\n• Approved by UAE MOHAP in April 2026 — among the first countries globally',
  'Oral tablet once daily, with or without food, no water restrictions.',
  E'Tablets: 0.8 mg, 2.5 mg, 5.5 mg, 9 mg, 14.5 mg, 17.2 mg.\nMaximum: 17.2 mg daily.',
  'Foundayo (orforglipron) is a small-molecule GLP-1 receptor agonist taken as a daily oral tablet. Unlike other GLP-1 medications that are large proteins requiring injection, Foundayo is a small chemical compound that your body absorbs efficiently from the gut — no special fasting, water restrictions, or injection technique needed. It activates the same GLP-1 receptor as Wegovy and Mounjaro, reducing appetite, slowing stomach emptying, and improving blood sugar control. Because it is not a protein, it does not require cold-chain storage and can be taken with or without food. This makes it the most convenient GLP-1 option currently available.',
  E'• Take one tablet once daily at any time of day — with or without food\n• No fasting requirement; no water volume restrictions; no waiting period before eating\n• Swallow the tablet whole with a glass of water\n• Can be taken alongside other medications (no significant CYP450 interactions)\n• Tip: Choose a consistent time each day (e.g., with breakfast or before bed) to build a routine',
  'If you miss a dose, take it as soon as you remember on the same day. If you do not remember until the next day, skip the missed dose and take your next dose at the regular time. Do not take two doses at the same time.',
  E'• Store at room temperature (20-25°C) in the original container with desiccant\n• No refrigeration required — major advantage for travel and storage\n• Protect from moisture and heat; do not remove the desiccant packet',
  E'Week 1-4: Appetite reduction begins within the first weeks. Mild GI side effects possible during titration.\nMonth 3-6: Progressive weight reduction comparable to injectable GLP-1 agents in clinical trials.\nLong-term: ATTAIN trials show meaningful sustained weight loss with daily oral dosing; ideal for needle-averse patients.',
  'Nausea, diarrhea, constipation, vomiting, dyspepsia, decreased appetite. Generally mild and dose-dependent.',
  'Personal or family history of medullary thyroid carcinoma (MTC), Multiple Endocrine Neoplasia syndrome type 2 (MEN 2), pregnancy, breastfeeding, hypersensitivity to orforglipron.',
  'Orforglipron is a non-peptide small-molecule GLP-1 receptor agonist developed by Eli Lilly. As a small molecule (not a peptide), it bypasses the absorption challenges of peptide-based oral therapies — no SNAC enhancer or fasting protocol needed. Half-life supports once-daily dosing. ATTAIN-1 and ATTAIN-2 trials demonstrated significant weight loss and HbA1c reduction comparable to injectable GLP-1 agents, with a similar GI tolerability profile. No clinically significant CYP450-mediated drug interactions identified to date. Approved by UAE MOHAP April 2026.',
  E'• No injection required — daily oral tablet\n• Can be taken with or without food\n• No water restrictions or fasting periods\n• No cold-chain storage requirements\n• Ideal for travel and needle-averse patients'
);
