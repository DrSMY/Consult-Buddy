import React from "react";
import {
  BookOpen, Scale, ThermometerSnowflake, Syringe, Pill, Utensils, AlertTriangle,
  ShieldAlert, Calendar, Activity, Brain, Droplets, FileText, Heart, Sparkles,
  Stethoscope, Clock, Dumbbell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Section {
  title: string;
  content: string;
}

const sectionConfig: Record<string, { icon: React.ReactNode; bg: string; border: string; iconColor: string }> = {
  "INTRODUCTION": {
    icon: <BookOpen className="h-4 w-4" />,
    bg: "bg-teal-50/80 dark:bg-teal-900/10",
    border: "border-teal-200 dark:border-teal-800/30",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  "YOUR DOSE ROUTINE": {
    icon: <Syringe className="h-4 w-4" />,
    bg: "bg-indigo-50/80 dark:bg-indigo-900/10",
    border: "border-indigo-200 dark:border-indigo-800/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  "HOW TO HANDLE YOUR MEDICATION": {
    icon: <ThermometerSnowflake className="h-4 w-4" />,
    bg: "bg-cyan-50/80 dark:bg-cyan-900/10",
    border: "border-cyan-200 dark:border-cyan-800/30",
    iconColor: "text-cyan-600 dark:text-cyan-400",
  },
  "SUPPORT YOUR METABOLISM": {
    icon: <Activity className="h-4 w-4" />,
    bg: "bg-emerald-50/80 dark:bg-emerald-900/10",
    border: "border-emerald-200 dark:border-emerald-800/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  "SUPPORT YOUR RECOVERY": {
    icon: <Heart className="h-4 w-4" />,
    bg: "bg-emerald-50/80 dark:bg-emerald-900/10",
    border: "border-emerald-200 dark:border-emerald-800/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  "SUPPORT YOUR SLEEP": {
    icon: <Brain className="h-4 w-4" />,
    bg: "bg-violet-50/80 dark:bg-violet-900/10",
    border: "border-violet-200 dark:border-violet-800/30",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  "SUPPORT YOUR GUT": {
    icon: <Sparkles className="h-4 w-4" />,
    bg: "bg-green-50/80 dark:bg-green-900/10",
    border: "border-green-200 dark:border-green-800/30",
    iconColor: "text-green-600 dark:text-green-400",
  },
  "SUPPORT YOUR BRAIN": {
    icon: <Brain className="h-4 w-4" />,
    bg: "bg-purple-50/80 dark:bg-purple-900/10",
    border: "border-purple-200 dark:border-purple-800/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  "SUPPORT YOUR HORMONES": {
    icon: <Sparkles className="h-4 w-4" />,
    bg: "bg-rose-50/80 dark:bg-rose-900/10",
    border: "border-rose-200 dark:border-rose-800/30",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  "SUPPORT YOUR SKIN & HAIR": {
    icon: <Sparkles className="h-4 w-4" />,
    bg: "bg-pink-50/80 dark:bg-pink-900/10",
    border: "border-pink-200 dark:border-pink-800/30",
    iconColor: "text-pink-600 dark:text-pink-400",
  },
  "SUPPORT YOUR IMMUNE SYSTEM": {
    icon: <Heart className="h-4 w-4" />,
    bg: "bg-teal-50/80 dark:bg-teal-900/10",
    border: "border-teal-200 dark:border-teal-800/30",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  "SUPPORT YOUR ANTI-INFLAMMATORY RESPONSE": {
    icon: <Heart className="h-4 w-4" />,
    bg: "bg-amber-50/80 dark:bg-amber-900/10",
    border: "border-amber-200 dark:border-amber-800/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  "SUPPORT YOUR LONGEVITY": {
    icon: <Sparkles className="h-4 w-4" />,
    bg: "bg-purple-50/80 dark:bg-purple-900/10",
    border: "border-purple-200 dark:border-purple-800/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  "SUPPORT YOUR RESPONSE": {
    icon: <Sparkles className="h-4 w-4" />,
    bg: "bg-rose-50/80 dark:bg-rose-900/10",
    border: "border-rose-200 dark:border-rose-800/30",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  "SUPPORT YOUR TREATMENT": {
    icon: <Sparkles className="h-4 w-4" />,
    bg: "bg-emerald-50/80 dark:bg-emerald-900/10",
    border: "border-emerald-200 dark:border-emerald-800/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  "WHAT TO EXPECT": {
    icon: <Clock className="h-4 w-4" />,
    bg: "bg-violet-50/80 dark:bg-violet-900/10",
    border: "border-violet-200 dark:border-violet-800/30",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  "PATIENT SUMMARY": {
    icon: <Scale className="h-4 w-4" />,
    bg: "bg-blue-50/80 dark:bg-blue-900/10",
    border: "border-blue-200 dark:border-blue-800/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  "STORAGE INSTRUCTIONS": {
    icon: <ThermometerSnowflake className="h-4 w-4" />,
    bg: "bg-cyan-50/80 dark:bg-cyan-900/10",
    border: "border-cyan-200 dark:border-cyan-800/30",
    iconColor: "text-cyan-600 dark:text-cyan-400",
  },
  "HOW TO INJECT": {
    icon: <Syringe className="h-4 w-4" />,
    bg: "bg-indigo-50/80 dark:bg-indigo-900/10",
    border: "border-indigo-200 dark:border-indigo-800/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  "HOW TO TAKE YOUR MEDICATION": {
    icon: <Pill className="h-4 w-4" />,
    bg: "bg-indigo-50/80 dark:bg-indigo-900/10",
    border: "border-indigo-200 dark:border-indigo-800/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  "NUTRITION & DIET PLAN": {
    icon: <Utensils className="h-4 w-4" />,
    bg: "bg-green-50/80 dark:bg-green-900/10",
    border: "border-green-200 dark:border-green-800/30",
    iconColor: "text-green-600 dark:text-green-400",
  },
  "DIETARY ADVICE": {
    icon: <Utensils className="h-4 w-4" />,
    bg: "bg-green-50/80 dark:bg-green-900/10",
    border: "border-green-200 dark:border-green-800/30",
    iconColor: "text-green-600 dark:text-green-400",
  },
  "COMMON SIDE EFFECTS": {
    icon: <AlertTriangle className="h-4 w-4" />,
    bg: "bg-amber-50/80 dark:bg-amber-900/10",
    border: "border-amber-200 dark:border-amber-800/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  "RED-FLAG SYMPTOMS": {
    icon: <ShieldAlert className="h-4 w-4" />,
    bg: "bg-rose-50/80 dark:bg-rose-900/10",
    border: "border-rose-200 dark:border-rose-800/30",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  "FOLLOW-UP PLAN": {
    icon: <Calendar className="h-4 w-4" />,
    bg: "bg-violet-50/80 dark:bg-violet-900/10",
    border: "border-violet-200 dark:border-violet-800/30",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  "PHYSICAL ACTIVITY": {
    icon: <Dumbbell className="h-4 w-4" />,
    bg: "bg-emerald-50/80 dark:bg-emerald-900/10",
    border: "border-emerald-200 dark:border-emerald-800/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  "CONSISTENCY & MINDSET": {
    icon: <Brain className="h-4 w-4" />,
    bg: "bg-purple-50/80 dark:bg-purple-900/10",
    border: "border-purple-200 dark:border-purple-800/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  "HYDRATION & RECOVERY": {
    icon: <Droplets className="h-4 w-4" />,
    bg: "bg-sky-50/80 dark:bg-sky-900/10",
    border: "border-sky-200 dark:border-sky-800/30",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  "YOUR PRESCRIBED MEDICATIONS": {
    icon: <Pill className="h-4 w-4" />,
    bg: "bg-blue-50/80 dark:bg-blue-900/10",
    border: "border-blue-200 dark:border-blue-800/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  "RECOMMENDED SUPPLEMENTS": {
    icon: <Sparkles className="h-4 w-4" />,
    bg: "bg-amber-50/80 dark:bg-amber-900/10",
    border: "border-amber-200 dark:border-amber-800/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  "REQUIRED LAB TESTS": {
    icon: <Stethoscope className="h-4 w-4" />,
    bg: "bg-cyan-50/80 dark:bg-cyan-900/10",
    border: "border-cyan-200 dark:border-cyan-800/30",
    iconColor: "text-cyan-600 dark:text-cyan-400",
  },
  "IMPORTANT REMINDERS": {
    icon: <Heart className="h-4 w-4" />,
    bg: "bg-rose-50/80 dark:bg-rose-900/10",
    border: "border-rose-200 dark:border-rose-800/30",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  "LIFESTYLE TIPS": {
    icon: <Activity className="h-4 w-4" />,
    bg: "bg-emerald-50/80 dark:bg-emerald-900/10",
    border: "border-emerald-200 dark:border-emerald-800/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  "SCHEDULE & TIMING": {
    icon: <Clock className="h-4 w-4" />,
    bg: "bg-violet-50/80 dark:bg-violet-900/10",
    border: "border-violet-200 dark:border-violet-800/30",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
};

const defaultConfig = {
  icon: <FileText className="h-4 w-4" />,
  bg: "bg-muted/50",
  border: "border-border",
  iconColor: "text-muted-foreground",
};

function getConfig(title: string) {
  // Try exact match first, then fuzzy
  if (sectionConfig[title]) return sectionConfig[title];
  const upper = title.toUpperCase();
  for (const key of Object.keys(sectionConfig)) {
    if (upper.includes(key) || key.includes(upper)) return sectionConfig[key];
  }
  return defaultConfig;
}

function parseInlineFormatting(text: string): React.ReactNode[] {
  // Parse **bold** patterns
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function renderContent(content: string) {
  const lines = content.split("\n").filter((l) => l.trim() !== "");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let numberedItems: React.ReactNode[] = [];

  const flushBullets = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  const flushNumbered = () => {
    if (numberedItems.length > 0) {
      elements.push(
        <ol key={`ol-${elements.length}`} className="space-y-1.5 my-2 list-decimal list-inside">
          {numberedItems}
        </ol>
      );
      numberedItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Bullet points: *, -, •
    if (/^[*\-•]\s+/.test(line)) {
      flushNumbered();
      const text = line.replace(/^[*\-•]\s+/, "");
      listItems.push(
        <li key={`li-${i}`} className="flex items-start gap-2 text-[12px] leading-relaxed text-foreground/80">
          <span className="text-primary mt-1 shrink-0 text-[8px]">●</span>
          <span>{parseInlineFormatting(text)}</span>
        </li>
      );
      continue;
    }

    // Numbered list: 1. or 1)
    if (/^\d+[.)]\s+/.test(line)) {
      flushBullets();
      const text = line.replace(/^\d+[.)]\s+/, "");
      numberedItems.push(
        <li key={`ni-${i}`} className="text-[12px] leading-relaxed text-foreground/80">
          {parseInlineFormatting(text)}
        </li>
      );
      continue;
    }

    // Regular paragraph
    flushBullets();
    flushNumbered();
    elements.push(
      <p key={`p-${i}`} className="text-[12px] leading-relaxed text-foreground/80 my-1">
        {parseInlineFormatting(line)}
      </p>
    );
  }

  flushBullets();
  flushNumbered();
  return elements;
}

interface PatientGuideDisplayProps {
  text: string;
}

export default function PatientGuideDisplay({ text }: PatientGuideDisplayProps) {
  if (!text) {
    return (
      <div className="bg-muted/50 p-4 rounded-lg border text-sm text-muted-foreground">
        Patient guide not yet generated.
      </div>
    );
  }

  // Check if the text uses ::: or --- section delimiters
  const hasSectionDelimiters = /^(?::::\s*.+?\s*::::|---\s*.+?\s*---)$/m.test(text);
  if (!hasSectionDelimiters) {
    // Fallback: plain text
    return (
      <div className="bg-muted/50 p-4 rounded-lg border text-sm whitespace-pre-wrap leading-relaxed">
        {text}
      </div>
    );
  }

  // Parse sections — support both ::: TITLE ::: and --- TITLE ---
  const sectionRegex = /^(?::::\s*(.+?)\s*::::|---\s*(.+?)\s*---)$/gm;
  const sections: Section[] = [];
  let intro = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const titles: { title: string; start: number; end: number }[] = [];
  while ((match = sectionRegex.exec(text)) !== null) {
    titles.push({ title: (match[1] || match[2]).trim(), start: match.index, end: match.index + match[0].length });
  }

  if (titles.length > 0) {
    intro = text.slice(0, titles[0].start).trim();
    for (let i = 0; i < titles.length; i++) {
      const contentEnd = i + 1 < titles.length ? titles[i + 1].start : text.length;
      sections.push({
        title: titles[i].title,
        content: text.slice(titles[i].end, contentEnd).trim(),
      });
    }
  }

  // Detect signature line (e.g., "Dr Sami" or "Dr." at end)
  let signature = "";
  if (sections.length > 0) {
    const lastContent = sections[sections.length - 1].content;
    const sigMatch = lastContent.match(/\n((?:Dr\.?|Warm regards|Best wishes|Kind regards|Sincerely).*)$/is);
    if (sigMatch) {
      signature = sigMatch[1].trim();
      sections[sections.length - 1].content = lastContent.slice(0, lastContent.lastIndexOf(sigMatch[1])).trim();
    }
  }

  return (
    <div className="space-y-3">
      {/* Intro banner */}
      {intro && (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="text-sm leading-relaxed text-foreground/90">
            {renderContent(intro)}
          </div>
        </div>
      )}

      {/* Sections */}
      {sections.map((section, idx) => {
        const config = getConfig(section.title);
        return (
          <Card key={idx} className={`${config.bg} ${config.border} shadow-none`}>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <span className={config.iconColor}>{config.icon}</span>
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-1">
              {renderContent(section.content)}
            </CardContent>
          </Card>
        );
      })}

      {/* Signature */}
      {signature && (
        <div className="text-right pr-2 pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground italic whitespace-pre-wrap">{signature}</p>
        </div>
      )}
    </div>
  );
}
