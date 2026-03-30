import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getAuthSession } from "@/lib/server/auth";
import { getStore } from "@/lib/server/serverless-store";

const applicationSchema = z.object({
  // Personal info
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+7\d{10}$/, "Use Kazakhstan format: +7XXXXXXXXXX"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  city: z.string().min(2).max(50),
  
  // Education
  educationLevel: z.enum(["high_school", "bachelor", "master", "other"]),
  schoolName: z.string().min(2).max(100),
  graduationYear: z.number().min(2020).max(2030),
  
  // Formal achievements
  achievements: z.array(z.object({
    type: z.enum(["academic", "competition", "project", "certificate", "other"]),
    title: z.string().min(5).max(200),
    description: z.string().min(10).max(500),
    year: z.number().min(2015).max(2026),
  })).max(10),
  
  // Informal qualities
  motivation: z.object({
    whyVisionU: z.string().min(50).max(2000),
    goals: z.string().min(50).max(2000),
    changeAgentVision: z.string().min(50).max(2000),
  }),
  
  // Experience
  hasLeadershipExperience: z.boolean(),
  leadershipDescription: z.string().max(1000).optional(),
  hasTeamExperience: z.boolean(),
  teamExperienceDescription: z.string().max(1000).optional(),
  
  // Skills
  skills: z.array(z.string()).max(15),
  languages: z.array(z.object({
    language: z.string(),
    level: z.enum(["beginner", "intermediate", "advanced", "native"]),
  })),
  
  // Portfolio
  portfolioLinks: z.array(z.object({
    type: z.enum(["github", "linkedin", "website", "other"]),
    url: z.string().url(),
    description: z.string().max(200).optional(),
  })).max(5),
  
  // Additional
  howDidYouHear: z.enum(["social_media", "friend", "school", "university", "other"]),
  agreeToTerms: z.literal(true),
});

export async function POST(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only candidates can submit applications
  if (session.role !== "candidate") {
    return NextResponse.json({ error: "Only candidates can submit applications" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const application = applicationSchema.parse(body);

    const store = getStore();
    
    // Find or create candidate record
    let candidate = store.candidates.find((c: any) => c.email?.toLowerCase() === application.email.toLowerCase());
    
    if (!candidate) {
      // Create new candidate from application
      candidate = {
        id: session.entityId,
        code: `IU-${String(store.candidates.length + 2401).padStart(4, '0')}`,
        name: application.fullName,
        email: application.email,
        phone: application.phone,
        city: application.city,
        program: 'inVision U Applicant',
        goals: application.motivation.goals,
        experience: application.leadershipDescription || application.teamExperienceDescription || 'No experience provided',
        motivationText: application.motivation.whyVisionU,
        essayExcerpt: application.motivation.changeAgentVision,
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any;
      
      store.candidates.push(candidate!);
    } else {
      // Update existing candidate
      const c = candidate as any;
      c.name = application.fullName;
      c.city = application.city;
      c.goals = application.motivation.goals;
      c.experience = application.leadershipDescription || application.teamExperienceDescription || c.experience;
      c.motivationText = application.motivation.whyVisionU;
      c.essayExcerpt = application.motivation.changeAgentVision;
      c.status = "completed";
      c.updatedAt = new Date().toISOString();
      // Extended fields
      c.dateOfBirth = application.dateOfBirth;
      c.educationLevel = application.educationLevel;
      c.schoolName = application.schoolName;
      c.graduationYear = application.graduationYear;
      c.achievements = application.achievements;
      c.hasLeadershipExperience = application.hasLeadershipExperience;
      c.hasTeamExperience = application.hasTeamExperience;
      c.skills = application.skills;
      c.languages = application.languages;
      c.portfolioLinks = application.portfolioLinks;
      c.howDidYouHear = application.howDidYouHear;
      c.applicationCompleted = true;
      c.applicationSubmittedAt = new Date().toISOString();
    }

    // Calculate completeness score
    const completenessScore = calculateCompleteness(application);
    
    // Calculate formal achievements score
    const formalScore = calculateFormalAchievementsScore(application);
    
    // Calculate informal qualities score
    const informalScore = calculateInformalQualitiesScore(application);

    return NextResponse.json({
      success: true,
      candidateId: (candidate as any).id,
      code: (candidate as any).code,
      scores: {
        completeness: completenessScore,
        formalAchievements: formalScore,
        informalQualities: informalScore,
        overall: Math.round((completenessScore * 0.2 + formalScore * 0.3 + informalScore * 0.5) * 10) / 10,
      },
      nextStep: "interview_scheduled",
      message: "Application submitted successfully! You will be contacted for an interview.",
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit application" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const store = getStore();
    
    // Candidate sees own application
    if (session.role === "candidate") {
      const candidate = store.candidates.find((c: any) => c.id === session.entityId);
      if (!candidate) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
      
      return NextResponse.json({
        candidate: {
          id: candidate.id,
          code: candidate.code,
          status: candidate.status,
          applicationCompleted: (candidate as any).applicationCompleted || false,
          submittedAt: (candidate as any).applicationSubmittedAt,
        },
        canEdit: candidate.status === "in_progress",
      });
    }
    
    // Committee sees all applications
    if (session.role === "committee") {
      const applications = store.candidates
        .filter((c: any) => c.applicationCompleted)
        .map((c: any) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          email: c.email,
          city: c.city,
          status: c.status,
          educationLevel: (c as any).educationLevel,
          skills: (c as any).skills,
          achievements: (c as any).achievements?.length || 0,
          submittedAt: (c as any).applicationSubmittedAt,
        }));
      
      return NextResponse.json({ applications, count: applications.length });
    }

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch application" },
      { status: 500 }
    );
  }
}

function calculateCompleteness(app: z.infer<typeof applicationSchema>): number {
  let score = 0;
  let max = 100;
  
  // Personal info (20 points)
  score += 20;
  
  // Education (15 points)
  score += 15;
  
  // Achievements (20 points)
  score += Math.min(20, app.achievements.length * 4);
  
  // Motivation (25 points)
  const motivationLength = app.motivation.whyVisionU.length + app.motivation.goals.length + app.motivation.changeAgentVision.length;
  score += Math.min(25, motivationLength / 20);
  
  // Experience (10 points)
  if (app.hasLeadershipExperience && app.leadershipDescription) score += 5;
  if (app.hasTeamExperience && app.teamExperienceDescription) score += 5;
  
  // Skills (5 points)
  score += Math.min(5, app.skills.length);
  
  // Portfolio (5 points)
  score += Math.min(5, app.portfolioLinks.length * 2);
  
  return Math.min(100, Math.round(score));
}

function calculateFormalAchievementsScore(app: z.infer<typeof applicationSchema>): number {
  let score = 50; // Base score
  
  // Education level
  const eduWeights = { high_school: 0, bachelor: 5, master: 10, other: 2 };
  score += eduWeights[app.educationLevel];
  
  // Achievements weight
  const achievementWeights = {
    academic: 5,
    competition: 7,
    project: 6,
    certificate: 3,
    other: 2,
  };
  
  app.achievements.forEach(ach => {
    score += achievementWeights[ach.type];
  });
  
  // Portfolio quality
  app.portfolioLinks.forEach(link => {
    if (link.type === "github") score += 3;
    if (link.type === "linkedin") score += 2;
    if (link.type === "website") score += 2;
  });
  
  return Math.min(100, Math.round(score));
}

function calculateInformalQualitiesScore(app: z.infer<typeof applicationSchema>): number {
  let score = 40; // Base score
  
  // Motivation depth
  const whyLength = app.motivation.whyVisionU.length;
  const goalsLength = app.motivation.goals.length;
  const visionLength = app.motivation.changeAgentVision.length;
  
  score += Math.min(15, whyLength / 20);
  score += Math.min(15, goalsLength / 20);
  score += Math.min(15, visionLength / 20);
  
  // Leadership mindset
  if (app.hasLeadershipExperience) score += 5;
  if (app.leadershipDescription && app.leadershipDescription.length > 100) score += 5;
  
  // Team orientation
  if (app.hasTeamExperience) score += 5;
  
  // Skill diversity
  score += Math.min(10, app.skills.length * 2);
  
  // Language skills
  const langLevels = { beginner: 1, intermediate: 2, advanced: 3, native: 4 };
  const langScore = app.languages.reduce((sum, l) => sum + langLevels[l.level], 0);
  score += Math.min(10, langScore * 2);
  
  return Math.min(100, Math.round(score));
}
