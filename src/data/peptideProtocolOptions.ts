// AUTO-GENERATED from NEW_PEPTIDE_PROTOCOL.xlsx (Protocols sheet)
// Source of truth for peptide dosing/protocol options.

export interface ProtocolOption {
  strength: string;
  doseAmount: string;
  doseVolume: string;
  time: string;
  protocolType: string;
  route: string;
  duration: string;
  cycle: string;
  summary: string;
}

export const PEPTIDE_PROTOCOL_OPTIONS: Record<string, ProtocolOption[]> = {
  "AOD-9604": [
    {
      "strength": "1200mcg/ml - 5ml vial",
      "doseAmount": "300 mcg",
      "doseVolume": "0.25 ml (25 units)",
      "time": "Once daily (Morning - empty stomach)",
      "protocolType": "Preferred Protocol",
      "route": "Subcutaneous injection",
      "duration": "20 Days",
      "cycle": "8-12 weeks cycle",
      "summary": "AOD-9604 1200mcg/ml taken 25 units in the morning (Vial lasts 20 days)"
    },
    {
      "strength": "1200mcg/ml - 5ml vial",
      "doseAmount": "250 mcg",
      "doseVolume": "0.20 ml (20 units) x 2",
      "time": "Twice daily (Morning/Bedtime)",
      "protocolType": "Alternative Protocol",
      "route": "Subcutaneous injection",
      "duration": "12.5 Days",
      "cycle": "8-12 weeks cycle",
      "summary": "AOD-9604 1200mcg/ml taken 20 units twice daily (Vial lasts 12.5 days)"
    }
  ],
  "Epitalon": [
    {
      "strength": "10mg/vial - 5ml vial",
      "doseAmount": "2000 mcg (2mg)",
      "doseVolume": "1 ml (100 units)",
      "time": "Every 3 days (Morning)",
      "protocolType": "Standard Protocol",
      "route": "Subcutaneous injection",
      "duration": "15 Days (5 doses)",
      "cycle": "15 days total cycle",
      "summary": "Epitalon 10mg/vial taken 100 units every 3 days (Vial lasts 15 days)"
    },
    {
      "strength": "10mg/vial - 5ml vial",
      "doseAmount": "1000 mcg (1mg) x 2",
      "doseVolume": "0.5 ml (50 units) x 2",
      "time": "Twice daily (AM/PM) every 3 days",
      "protocolType": "Split-Dose Protocol",
      "route": "Subcutaneous injection",
      "duration": "15 Days (10 doses)",
      "cycle": "15 days total cycle",
      "summary": "Epitalon 10mg/vial taken 50 units twice daily every 3 days (Vial lasts 15 days)"
    },
    {
      "strength": "10mg/vial - 5ml vial",
      "doseAmount": "2000 mcg (2mg)",
      "doseVolume": "1 ml (100 units)",
      "time": "Once daily (Morning)",
      "protocolType": "Intensive Protocol",
      "route": "Subcutaneous injection",
      "duration": "5 Days (5 doses)",
      "cycle": "10 days total cycle",
      "summary": "Epitalon 10mg/vial taken 100 units daily (Vial lasts 5 days)"
    }
  ],
  "BPC-157": [
    {
      "strength": "2000mcg/ml - 5ml Vial",
      "doseAmount": "300 mcg",
      "doseVolume": "0.15 ml (15 units)",
      "time": "Daily morning (empty stomach)",
      "protocolType": "Standard Protocol",
      "route": "Subcutaneous injection",
      "duration": "33 Days",
      "cycle": "4-12 weeks",
      "summary": "BPC-157 2000mcg/ml taken 15 units daily morning (Vial lasts 33 days)"
    }
  ],
  "CJC-1295": [
    {
      "strength": "1000 mcg/ml - 5ml vial",
      "doseAmount": "100 mcg",
      "doseVolume": "0.1 ml (10 units)",
      "time": "5 days ON / 2 days OFF (Bedtime)",
      "protocolType": "Standard Protocol",
      "route": "Subcutaneous injection",
      "duration": "10 Weeks",
      "cycle": "8-10 weeks cycle",
      "summary": "CJC-1295 taken 10 units bedtime (Vial lasts 10 weeks)"
    }
  ],
  "Ipamorelin": [
    {
      "strength": "2000mcg/ml - 5ml Vial",
      "doseAmount": "200 mcg",
      "doseVolume": "0.1 ml (10 units)",
      "time": "5 days ON / 2 days OFF (Evening)",
      "protocolType": "Standard Protocol",
      "route": "Subcutaneous injection",
      "duration": "10 Weeks",
      "cycle": "3 months cycle",
      "summary": "Ipamorelin taken 10 units evening (Vial lasts 10 weeks)"
    }
  ],
  "CJC/Ipamorelin Blend": [
    {
      "strength": "1mg/2mg per ml - 5ml",
      "doseAmount": "100mcg / 200mcg",
      "doseVolume": "0.1 ml (10 units)",
      "time": "5 days ON / 2 days OFF (Bedtime)",
      "protocolType": "Standard Protocol",
      "route": "Subcutaneous injection",
      "duration": "10 Weeks",
      "cycle": "10 weeks cycle",
      "summary": "CJC/Ipamorelin Blend taken 10 units bedtime (Vial lasts 10 weeks)"
    }
  ],
  "Thymosin Alpha-1": [
    {
      "strength": "3000mcg/ml - 5ml vial",
      "doseAmount": "450 mcg",
      "doseVolume": "0.15 ml (15 units)",
      "time": "Once daily (Morning)",
      "protocolType": "Standard Protocol",
      "route": "Subcutaneous injection",
      "duration": "33 Days",
      "cycle": "1 month cycle",
      "summary": "Thymosin Alpha-1 taken 15 units daily (Vial lasts 33 days)"
    },
    {
      "strength": "3000mcg/ml - 5ml vial",
      "doseAmount": "1500 mcg (1.5mg)",
      "doseVolume": "0.5 ml (50 units)",
      "time": "Twice a week (Mon/Thu)",
      "protocolType": "Preferred Protocol",
      "route": "Subcutaneous injection",
      "duration": "5 Weeks",
      "cycle": "4-6 weeks cycle",
      "summary": "Thymosin Alpha-1 taken 50 units twice a week (Vial lasts 5 weeks)"
    }
  ],
  "MOTS-C": [
    {
      "strength": "10mg/ml - 5ml vial",
      "doseAmount": "10 mg",
      "doseVolume": "1 ml (100 units)",
      "time": "Once weekly before exercise",
      "protocolType": "Preferred (Greenfield)",
      "route": "Subcutaneous injection",
      "duration": "5 Weeks",
      "cycle": "10 weeks per year",
      "summary": "MOTS-C taken 100 units once weekly (Vial lasts 5 weeks)"
    },
    {
      "strength": "10mg/ml - 5ml vial",
      "doseAmount": "5 mg",
      "doseVolume": "0.5 ml (50 units)",
      "time": "3 times weekly before exercise",
      "protocolType": "Alternative (Seed)",
      "route": "Subcutaneous injection",
      "duration": "3.3 Weeks",
      "cycle": "4-6 weeks cycle",
      "summary": "MOTS-C taken 50 units 3x weekly (Vial lasts 3.3 weeks)"
    }
  ],
  "DSIP": [
    {
      "strength": "1000mcg/ml - 2ml vial",
      "doseAmount": "100 mcg",
      "doseVolume": "0.1 ml (10 units)",
      "time": "Daily 3 hours before bed",
      "protocolType": "Initial Protocol",
      "route": "Subcutaneous injection",
      "duration": "20 Days",
      "cycle": "2-4 weeks",
      "summary": "DSIP taken 10 units daily bedtime (Vial lasts 20 days)"
    },
    {
      "strength": "1000mcg/ml - 2ml vial",
      "doseAmount": "100 mcg",
      "doseVolume": "0.1 ml (10 units)",
      "time": "Every 3 days 3 hours before bed",
      "protocolType": "Maintenance Protocol",
      "route": "Subcutaneous injection",
      "duration": "60 Days",
      "cycle": "4-8 weeks maintenance",
      "summary": "DSIP taken 10 units every 3 days (Vial lasts 60 days)"
    }
  ],
  "Thymosin Beta (TB-500)": [
    {
      "strength": "3000mcg/ml - 5ml Vial",
      "doseAmount": "750 mcg",
      "doseVolume": "0.25 ml (25 units)",
      "time": "Once daily",
      "protocolType": "Standard Protocol",
      "route": "Subcutaneous injection",
      "duration": "20 Days",
      "cycle": "4-12 weeks",
      "summary": "TB-500 taken 25 units daily (Vial lasts 20 days)"
    }
  ],
  "GHK-Cu": [
    {
      "strength": "10mg/ml - 5ml vial",
      "doseAmount": "2 mg",
      "doseVolume": "0.2 ml (20 units)",
      "time": "Once daily",
      "protocolType": "Standard Protocol",
      "route": "Subcutaneous injection",
      "duration": "25 Days",
      "cycle": "6 weeks on/off",
      "summary": "GHK-Cu taken 20 units daily (Vial lasts 25 days)"
    }
  ],
  "PT-141": [
    {
      "strength": "10mg/ml - 2ml vial",
      "doseAmount": "1-2 mg",
      "doseVolume": "0.1-0.2 ml (10-20 units)",
      "time": "On demand before activity",
      "protocolType": "Standard Protocol",
      "route": "Subcutaneous injection",
      "duration": "10-20 Doses",
      "cycle": "Max twice a week",
      "summary": "PT-141 taken 10-20 units as needed"
    }
  ],
  "Semax": [
    {
      "strength": "1mg/ml - 5ml vial",
      "doseAmount": "300 mcg",
      "doseVolume": "0.3 ml (30 units)",
      "time": "Twice weekly",
      "protocolType": "Standard Protocol",
      "route": "Subcutaneous injection",
      "duration": "8 Weeks",
      "cycle": "4-6 weeks cycle",
      "summary": "Semax taken 30 units twice weekly (Vial lasts 8 weeks)"
    }
  ],
  "Selank": [
    {
      "strength": "1mg/ml - 5ml vial",
      "doseAmount": "300 mcg",
      "doseVolume": "0.3 ml (30 units)",
      "time": "Twice weekly",
      "protocolType": "Standard Protocol",
      "route": "Subcutaneous injection",
      "duration": "8 Weeks",
      "cycle": "4-6 weeks cycle",
      "summary": "Selank taken 30 units twice weekly (Vial lasts 8 weeks)"
    }
  ],
  "Kisspeptin-10": [
    {
      "strength": "100mcg/ml - 4ml vial",
      "doseAmount": "10 mcg",
      "doseVolume": "0.1 ml (10 units)",
      "time": "Daily before bed",
      "protocolType": "Standard Protocol",
      "route": "Subcutaneous injection",
      "duration": "40 Days",
      "cycle": "Max 40 days",
      "summary": "Kisspeptin-10 taken 10 units daily before bed"
    }
  ],
  "KPV": [
    {
      "strength": "2mg/ml - 4ml vial",
      "doseAmount": "500 mcg",
      "doseVolume": "0.25 ml (25 units)",
      "time": "Once daily",
      "protocolType": "Standard Protocol",
      "route": "Subcutaneous injection",
      "duration": "16 Days",
      "cycle": "4-6 weeks cycle",
      "summary": "KPV taken 25 units daily (Vial lasts 16 days)"
    }
  ],
  "BPC-157 Capsules": [
    {
      "strength": "500 mcg Capsules",
      "doseAmount": "500 mcg",
      "doseVolume": "1 Capsule",
      "time": "Daily morning (empty stomach)",
      "protocolType": "Preferred Protocol",
      "route": "Oral capsules",
      "duration": "30 Days",
      "cycle": "3 months+",
      "summary": "BPC-157 Capsules 1 capsule daily"
    },
    {
      "strength": "500 mcg Capsules",
      "doseAmount": "1000 mcg",
      "doseVolume": "2 Capsules",
      "time": "Twice daily (or 2 once daily)",
      "protocolType": "Alternative Protocol",
      "route": "Oral capsules",
      "duration": "15 Days",
      "cycle": "4-8 weeks",
      "summary": "BPC-157 Capsules 2 capsules daily"
    }
  ],
  "PT-141 Nasal": [
    {
      "strength": "10mg in 15ml bottle",
      "doseAmount": "nan",
      "doseVolume": "1-2 pumps",
      "time": "On demand before activity",
      "protocolType": "Preferred Protocol",
      "route": "Intranasal spray",
      "duration": "~30-50 uses",
      "cycle": "Max 3x weekly",
      "summary": "PT-141 Nasal 1-2 pumps as needed"
    }
  ],
  "Semax Nasal": [
    {
      "strength": "3mg/ml (10ml)",
      "doseAmount": "nan",
      "doseVolume": "2-3 sprays daily",
      "time": "Once or twice daily",
      "protocolType": "Cognitive Protocol",
      "route": "Intranasal spray",
      "duration": "~25-30 Days",
      "cycle": "2-4 weeks cycle",
      "summary": "Semax Nasal 2-3 sprays daily"
    }
  ],
  "Selank Nasal": [
    {
      "strength": "3mg/ml (10ml)",
      "doseAmount": "nan",
      "doseVolume": "2-3 sprays daily",
      "time": "Once or twice daily",
      "protocolType": "Anxiolytic Protocol",
      "route": "Intranasal spray",
      "duration": "~25-30 Days",
      "cycle": "2-4 weeks cycle",
      "summary": "Selank Nasal 2-3 sprays daily"
    }
  ],
  "KPV + BPC-157": [
    {
      "strength": "500mcg / 250mcg",
      "doseAmount": "750 mcg Total",
      "doseVolume": "1 Capsule",
      "time": "Once daily (morning)",
      "protocolType": "Preferred Protocol",
      "route": "Oral capsules",
      "duration": "30 Days",
      "cycle": "6-8 weeks",
      "summary": "KPV+BPC 1 capsule daily"
    }
  ],
  "Dihexa Capsules": [
    {
      "strength": "10-20 mg",
      "doseAmount": "10-20 mg",
      "doseVolume": "1 Capsule",
      "time": "Once daily",
      "protocolType": "Cognitive Protocol",
      "route": "Oral capsules",
      "duration": "30 Days",
      "cycle": "4-8 weeks",
      "summary": "Dihexa 1 capsule daily"
    }
  ],
  "GHK-Cu Facial Serum": [
    {
      "strength": "0.3% - 0.5% Serum",
      "doseAmount": "nan",
      "doseVolume": "Apply thin layer",
      "time": "Daily at night",
      "protocolType": "Skincare Protocol",
      "route": "Topical serum",
      "duration": "30-60 Days",
      "cycle": "Continuous",
      "summary": "GHK-Cu Serum applied nightly"
    }
  ],
  "GHK-Cu Scalp Foam": [
    {
      "strength": "0.1% - 0.19% Foam",
      "doseAmount": "nan",
      "doseVolume": "Massage into scalp",
      "time": "Daily at night",
      "protocolType": "Hair Protocol",
      "route": "Topical foam",
      "duration": "30 Days",
      "cycle": "Continuous",
      "summary": "GHK-Cu Foam applied nightly"
    }
  ]
};

// Aliases mapping alternate / AI-generated names to canonical keys above
export const PEPTIDE_ALIASES: Record<string, string> = {
  "CJC": "CJC-1295",
  "CJC1295": "CJC-1295",
  "CJC + Ipamorelin": "CJC/Ipamorelin Blend",
  "CJC/Ipamorelin": "CJC/Ipamorelin Blend",
  "TB-500": "Thymosin Beta (TB-500)",
  "TB500": "Thymosin Beta (TB-500)",
  "Thymosin Beta-4": "Thymosin Beta (TB-500)",
  "Thymosin Alpha 1": "Thymosin Alpha-1",
  "TA-1": "Thymosin Alpha-1",
  "BPC157": "BPC-157",
  "BPC 157": "BPC-157",
  "BPC-157 (Capsules)": "BPC-157 Capsules",
  "BPC-157 Oral": "BPC-157 Capsules",
  "PT-141 (Nasal)": "PT-141 Nasal",
  "Bremelanotide Nasal": "PT-141 Nasal",
  "Semax (Nasal)": "Semax Nasal",
  "Selank (Nasal)": "Selank Nasal",
  "GHK-Cu Injection": "GHK-Cu",
  "GHK-Cu (Injection)": "GHK-Cu",
  "GHK-Cu (Topical/Scalp)": "GHK-Cu Scalp Foam",
  "BPC-157 (Injection)": "BPC-157",
  "BPC-157 (Capsules)": "BPC-157 Capsules",
  "CJC/Ipamorelin (Combo)": "CJC/Ipamorelin Blend",
  "CJC/Ipamorelin Combo": "CJC/Ipamorelin Blend",
  "TB-500": "Thymosin Beta (TB-500)",
  "PT-141 (Injection)": "PT-141",
  "PT-141 (Nasal Spray)": "PT-141 Nasal",
  "Semax (Injection)": "Semax",
  "Selank (Injection)": "Selank",
  "KPV (Injection)": "KPV",
  "KPV (Capsules)": "KPV",
  "KPV + BPC-157 (Capsules)": "KPV + BPC-157",
  "Dihexa (2.5mg)": "Dihexa Capsules",
  "Dihexa (20mg)": "Dihexa Capsules",
};

export function getProtocolOptions(name: string): ProtocolOption[] {
  if (!name) return [];
  const direct = PEPTIDE_PROTOCOL_OPTIONS[name];
  if (direct) return direct;
  const aliased = PEPTIDE_ALIASES[name];
  if (aliased && PEPTIDE_PROTOCOL_OPTIONS[aliased]) return PEPTIDE_PROTOCOL_OPTIONS[aliased];
  // case-insensitive fallback
  const lower = name.toLowerCase().trim();
  for (const k of Object.keys(PEPTIDE_PROTOCOL_OPTIONS)) {
    if (k.toLowerCase() === lower) return PEPTIDE_PROTOCOL_OPTIONS[k];
  }
  for (const [a, c] of Object.entries(PEPTIDE_ALIASES)) {
    if (a.toLowerCase() === lower) return PEPTIDE_PROTOCOL_OPTIONS[c] || [];
  }
  return [];
}

// Parse "0.15 ml (15 units)" → 0.15
export function extractMl(doseVolume: string): number | null {
  const m = doseVolume.match(/(\d+(?:\.\d+)?)\s*ml/i);
  return m ? parseFloat(m[1]) : null;
}

// Parse "5ml Vial" / "5 ml vial" → 5
export function extractVialMl(strength: string): number | null {
  const m = strength.match(/(\d+(?:\.\d+)?)\s*ml/i);
  return m ? parseFloat(m[1]) : null;
}

// Map protocol "Time of Administration" text → frequency value used in calculator
export function inferFrequency(time: string): string | null {
  const t = time.toLowerCase();
  if (t.includes("twice daily") || t.includes("twice a day")) return "daily"; // 2x daily handled elsewhere
  if (t.includes("once daily") || t.includes("daily")) return "daily";
  if (t.includes("every 3 days") || t.includes("every other day")) return "every other day";
  if (t.includes("5 days on")) return "5 days per week";
  if (t.includes("3 times weekly") || t.includes("3x weekly") || t.includes("3 times a week")) return "3 times per week";
  if (t.includes("twice a week") || t.includes("2x weekly")) return "2x per week";
  if (t.includes("once weekly") || t.includes("weekly")) return "weekly";
  return null;
}
