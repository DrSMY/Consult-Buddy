export interface IntakeQuestion {
  id: string;
  section: string;
  question: string;
  type: "text" | "number" | "select" | "multiselect" | "conditional-text";
  options?: string[];
  conditionalOn?: { questionId: string; value: string };
  unit?: string;
  /** If true, show a Yes/No gate before revealing options */
  hasGate?: boolean;
  /** Label for the Yes/No gate (defaults to "Do you have any?") */
  gateLabel?: string;
  /** If true, include an "Other" free-text option */
  hasOther?: boolean;
  /** If true, include a notes textarea below the question */
  hasNotes?: boolean;
}

export const intakeSections = [
  "Demographics & Baseline",
  "Health Status & Medical Background",
  "Primary Health Objectives",
  "Objective-Specific Questions",
];

export const intakeQuestions: IntakeQuestion[] = [
  // SECTION 1: Demographics
  { id: "gender", section: "Demographics & Baseline", question: "Gender", type: "select", options: ["Male", "Female"] },
  { id: "age", section: "Demographics & Baseline", question: "Age", type: "number", unit: "years" },
  { id: "height", section: "Demographics & Baseline", question: "Height", type: "number", unit: "cm" },
  { id: "weight", section: "Demographics & Baseline", question: "Weight", type: "number", unit: "kg" },
  { id: "body_shape", section: "Demographics & Baseline", question: "Body shape (select closest match)", type: "select", options: ["Lean", "Athletic", "Average", "Overweight", "Central/Abdominal fat dominant"] },
  { id: "activity_level", section: "Demographics & Baseline", question: "Activity level", type: "select", options: ["Sedentary", "Light activity", "Regular training (3-4x/week)", "Intense training (5+ times/week)"] },

  // SECTION 2: Health Status
  { id: "health_conditions", section: "Health Status & Medical Background", question: "Do you have any known health conditions?", type: "multiselect", hasGate: true, gateLabel: "Do you have any known health conditions?", hasOther: true, hasNotes: true, options: ["High blood pressure", "High cholesterol", "Prediabetes or diabetes", "Thyroid disorder", "Hormonal imbalance (e.g., low testosterone, PCOS)", "Autoimmune or inflammatory condition", "Chronic joint, muscle, or back pain", "Sleep disorder (insomnia, sleep apnea, etc.)", "Mental health condition (stress, anxiety, depression)"] },
  { id: "allergies", section: "Health Status & Medical Background", question: "Do you have any known allergies or sensitivities?", type: "multiselect", hasGate: true, gateLabel: "Do you have any known allergies or sensitivities?", hasOther: true, hasNotes: true, options: ["Medications", "Vitamins or supplements", "Food allergies", "Environmental allergies"] },
  { id: "is_pregnant", section: "Health Status & Medical Background", question: "Are you currently pregnant?", type: "select", options: ["No", "Yes"], conditionalOn: { questionId: "gender", value: "Female" } },
  { id: "is_breastfeeding", section: "Health Status & Medical Background", question: "Are you currently breastfeeding?", type: "select", options: ["No", "Yes"], conditionalOn: { questionId: "gender", value: "Female" } },

  // SECTION 3: Health Goals
  { id: "health_goals", section: "Primary Health Objectives", question: "What are your main health goals? (Select all that apply)", type: "multiselect", hasOther: true, hasNotes: true, options: ["Healthy aging & longevity", "Build muscle & recover better", "Heal injuries & reduce pain", "Improve metabolism & reduce belly fat", "Improve sleep & reset body clock", "Cognitive function & mood enhancement", "Sexual health", "Immune function & inflammation", "Gut health", "Skin & hair"] },

  // SECTION 4: Objective-specific - Longevity
  { id: "energy_levels", section: "Objective-Specific Questions", question: "How would you rate your overall energy levels?", type: "select", options: ["Very good", "Good", "Moderate", "Low"], conditionalOn: { questionId: "health_goals", value: "Healthy aging & longevity" } },
  { id: "recovery_decline", section: "Objective-Specific Questions", question: "Do you feel your recovery, resilience, or stamina has declined?", type: "select", options: ["No", "Slightly", "Moderately", "Significantly"], conditionalOn: { questionId: "health_goals", value: "Healthy aging & longevity" } },
  { id: "sick_frequency", section: "Objective-Specific Questions", question: "How often do you get sick (colds, flu, infections)?", type: "select", options: ["Rarely", "1-2 times/year", "3-4 times/year", "Frequently"], conditionalOn: { questionId: "health_goals", value: "Healthy aging & longevity" } },
  { id: "inflammation", section: "Objective-Specific Questions", question: "Do you experience persistent inflammation, aches, or stiffness?", type: "select", options: ["No", "Occasionally", "Often", "Constantly"], conditionalOn: { questionId: "health_goals", value: "Healthy aging & longevity" } },

  // Build muscle
  { id: "training_frequency", section: "Objective-Specific Questions", question: "How often do you train or exercise?", type: "select", options: ["0-1x/week", "2-3x/week", "4-5x/week", "6+ times/week"], conditionalOn: { questionId: "health_goals", value: "Build muscle & recover better" } },
  { id: "muscle_plateau", section: "Objective-Specific Questions", question: "Do you feel your muscle gains or strength have plateaued?", type: "select", options: ["No", "Slightly", "Yes", "Declining"], conditionalOn: { questionId: "health_goals", value: "Build muscle & recover better" } },
  { id: "workout_recovery", section: "Objective-Specific Questions", question: "How well do you recover after workouts?", type: "select", options: ["Very well", "Acceptable", "Poorly", "Need several days"], conditionalOn: { questionId: "health_goals", value: "Build muscle & recover better" } },
  { id: "soreness", section: "Objective-Specific Questions", question: "Do you experience excessive soreness or fatigue after training?", type: "select", options: ["Rarely", "Sometimes", "Often", "Almost always"], conditionalOn: { questionId: "health_goals", value: "Build muscle & recover better" } },

  // Heal injuries
  { id: "current_injury", section: "Objective-Specific Questions", question: "Do you currently have an injury or chronic pain?", type: "select", options: ["No", "Mild", "Moderate", "Severe"], conditionalOn: { questionId: "health_goals", value: "Heal injuries & reduce pain" } },
  { id: "injury_type", section: "Objective-Specific Questions", question: "What best describes the issue?", type: "select", options: ["Muscle strain", "Tendon/ligament", "Joint pain", "Post-surgery", "Multiple areas"], conditionalOn: { questionId: "health_goals", value: "Heal injuries & reduce pain" } },
  { id: "injury_duration", section: "Objective-Specific Questions", question: "How long has the issue been present?", type: "select", options: ["<1 month", "1-3 months", "3-6 months", ">6 months"], conditionalOn: { questionId: "health_goals", value: "Heal injuries & reduce pain" } },
  { id: "conventional_treatments", section: "Objective-Specific Questions", question: "Have conventional treatments helped?", type: "select", options: ["Yes", "Partially", "No"], conditionalOn: { questionId: "health_goals", value: "Heal injuries & reduce pain" } },

  // Metabolism
  { id: "fat_storage", section: "Objective-Specific Questions", question: "Where do you tend to store fat the most?", type: "select", options: ["Evenly", "Hips/thighs", "Abdomen/belly", "Mostly visceral/belly"], conditionalOn: { questionId: "health_goals", value: "Improve metabolism & reduce belly fat" } },
  { id: "fat_loss_struggle", section: "Objective-Specific Questions", question: "Have you struggled to lose fat despite diet or exercise?", type: "select", options: ["No", "Occasionally", "Yes", "Long-term struggle"], conditionalOn: { questionId: "health_goals", value: "Improve metabolism & reduce belly fat" } },
  { id: "energy_crashes", section: "Objective-Specific Questions", question: "Do you experience energy crashes or sugar cravings?", type: "select", options: ["Rarely", "Sometimes", "Often", "Daily"], conditionalOn: { questionId: "health_goals", value: "Improve metabolism & reduce belly fat" } },
  { id: "insulin_resistance", section: "Objective-Specific Questions", question: "Have you ever been told you have insulin resistance, prediabetes, or metabolic syndrome?", type: "select", options: ["No", "Borderline", "Yes"], conditionalOn: { questionId: "health_goals", value: "Improve metabolism & reduce belly fat" } },

  // Sleep
  { id: "sleep_quality", section: "Objective-Specific Questions", question: "How would you rate your sleep quality?", type: "select", options: ["Very good", "Good", "Poor", "Very poor"], conditionalOn: { questionId: "health_goals", value: "Improve sleep & reset body clock" } },
  { id: "sleep_issue", section: "Objective-Specific Questions", question: "Do you struggle more with falling asleep or staying asleep?", type: "select", options: ["Falling asleep", "Staying asleep", "Both", "Neither"], conditionalOn: { questionId: "health_goals", value: "Improve sleep & reset body clock" } },
  { id: "sleep_hours", section: "Objective-Specific Questions", question: "How many hours of sleep do you get on average?", type: "select", options: ["<5", "5-6", "6-7", "7-8", ">8"], conditionalOn: { questionId: "health_goals", value: "Improve sleep & reset body clock" } },
  { id: "sleep_refreshed", section: "Objective-Specific Questions", question: "Do you wake up feeling refreshed?", type: "select", options: ["Always", "Sometimes", "Rarely", "Never"], conditionalOn: { questionId: "health_goals", value: "Improve sleep & reset body clock" } },

  // Additional notes
  { id: "additional_notes", section: "Objective-Specific Questions", question: "Any additional notes or concerns for the doctor?", type: "text" },
];

export function getVisibleQuestions(answers: Record<string, string | string[]>): IntakeQuestion[] {
  return intakeQuestions.filter((q) => {
    if (!q.conditionalOn) return true;
    const depAnswer = answers[q.conditionalOn.questionId];
    if (!depAnswer) return false;
    if (Array.isArray(depAnswer)) {
      return depAnswer.some((a) => a.includes(q.conditionalOn!.value));
    }
    return String(depAnswer).includes(q.conditionalOn.value);
  });
}
