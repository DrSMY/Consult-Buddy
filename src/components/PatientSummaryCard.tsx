import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Ruler, Weight, Activity } from "lucide-react";

interface PatientSummaryCardProps {
  patientName: string;
  intake: Record<string, any>;
  consultationDate?: string;
}

const PatientSummaryCard = ({ patientName, intake, consultationDate }: PatientSummaryCardProps) => {
  const age = intake.age ? Number(intake.age) : null;
  const gender = intake.gender || null;
  const heightVal = intake.height ? Number(intake.height) : null;
  const weightVal = intake.weight ? Number(intake.weight) : null;
  const bmi = heightVal && weightVal ? Number((weightVal / ((heightVal / 100) ** 2)).toFixed(1)) : null;
  const activityLevel = intake.activity_level || null;
  const bodyShape = intake.body_shape || null;
  const heightFt = heightVal ? Math.floor(heightVal / 30.48) : null;
  const heightIn = heightVal ? Math.round((heightVal / 2.54) % 12) : null;
  const weightLbs = weightVal ? Math.round(weightVal * 2.20462) : null;
  const healthGoals = intake.health_goals
    ? Array.isArray(intake.health_goals)
      ? intake.health_goals
      : [intake.health_goals]
    : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
          <Scale className="h-3.5 w-3.5" /> Patient Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div className="text-sm font-semibold">{patientName}</div>
          {intake.mobile_number && (
            <div className="text-xs text-muted-foreground">{intake.mobile_number}</div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {age && (
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Age</p>
              <p className="text-sm font-bold">{age}y</p>
            </div>
          )}
          {gender && (
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Gender</p>
              <p className="text-sm font-bold">{gender}</p>
            </div>
          )}
          {heightVal && (
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-center gap-1">
                <Ruler className="h-3 w-3" /> Height
              </p>
              <p className="text-sm font-bold">{Math.round(heightVal)} cm</p>
              <p className="text-[10px] text-muted-foreground">{heightFt}'{heightIn}"</p>
            </div>
          )}
          {weightVal && (
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-center gap-1">
                <Weight className="h-3 w-3" /> Weight
              </p>
              <p className="text-sm font-bold">{Math.round(weightVal)} kg</p>
              <p className="text-[10px] text-muted-foreground">{weightLbs} lbs</p>
            </div>
          )}
        </div>

        {bmi && (
          <div className={`p-2.5 rounded-lg flex justify-between items-center ${
            bmi < 18.5 ? "bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300" :
            bmi < 25 ? "bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300" :
            bmi < 30 ? "bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-300" :
            "bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300"
          }`}>
            <span className="text-xs font-bold">BMI: {bmi}</span>
            <span className="text-[10px] font-bold uppercase">
              {bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese"}
            </span>
          </div>
        )}

        {(activityLevel || bodyShape) && (
          <div className="border-t pt-3 space-y-2">
            {activityLevel && (
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3" /> Activity
                </span>
                <Badge variant="outline" className="text-[10px]">{activityLevel}</Badge>
              </div>
            )}
            {bodyShape && (
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-muted-foreground">Body Shape</span>
                <Badge variant="outline" className="text-[10px]">{bodyShape}</Badge>
              </div>
            )}
          </div>
        )}

        {healthGoals.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Health Goals</p>
            <div className="flex flex-wrap gap-1.5">
              {healthGoals.map((goal: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{goal}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientSummaryCard;
