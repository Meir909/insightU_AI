import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { getStore } from "@/lib/server/serverless-store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Candidates can only upload their own resume
  if (session.role === "candidate" && session.entityId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("resume") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, DOC, DOCX, TXT allowed" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Max 5MB" },
        { status: 400 }
      );
    }

    const store = getStore();
    const candidate = store.candidates.find((c: any) => c.id === id) as any;

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // In a real system, upload to S3/Blob storage
    // For demo, we store file metadata
    const fileId = `resume-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    // Read file for basic parsing (in production, use proper PDF parser)
    const text = await file.text().catch(() => "");
    
    // Simple keyword extraction
    const keywords = extractKeywords(text);
    
    candidate.resumeUrl = `/uploads/${fileId}`;
    candidate.resumeMetadata = {
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    };
    candidate.resumeKeywords = keywords;
    candidate.hasResume = true;
    candidate.updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      message: "Resume uploaded successfully",
      fileId,
      keywords,
      nextStep: "application_complete",
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload resume" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Candidates can only view their own
  if (session.role === "candidate" && session.entityId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const store = getStore();
    const candidate = store.candidates.find((c: any) => c.id === id) as any;

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({
      hasResume: candidate.hasResume || false,
      resumeUrl: candidate.resumeUrl,
      resumeMetadata: candidate.resumeMetadata,
      resumeKeywords: candidate.resumeKeywords,
      parsedData: candidate.resumeParsed,
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch resume" },
      { status: 500 }
    );
  }
}

function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  
  // Education keywords
  const eduPatterns = [
    /bachelor|b\.s\.?|b\.a\.?|undergraduate/i,
    /master|m\.s\.?|m\.a\.?|graduate/i,
    /phd|doctorate|doctoral/i,
    /high school|secondary/i,
  ];
  
  // Skill keywords (common tech/soft skills)
  const skillPatterns = [
    /leadership|leader|managed|management/i,
    /teamwork|team|collaboration/i,
    /python|javascript|java|c\+\+|go|rust/i,
    /communication|presentations|public speaking/i,
    /project management|agile|scrum/i,
    /data analysis|machine learning|ai/i,
    /volunteer|community|social impact/i,
  ];
  
  // Achievement keywords
  const achievementPatterns = [
    /award|prize|winner|champion/i,
    /certificate|certified|certification/i,
    /published|publication|research/i,
    /founded|started|launched|created/i,
  ];
  
  [...eduPatterns, ...skillPatterns, ...achievementPatterns].forEach((pattern, idx) => {
    if (pattern.test(text)) {
      const categories = ["education", "skills", "achievements"];
      const category = idx < eduPatterns.length ? categories[0] : 
                      idx < eduPatterns.length + skillPatterns.length ? categories[1] : categories[2];
      keywords.push(`${category}: ${pattern.source.replace(/\\/g, "").replace(/\|/g, "/")}`);
    }
  });
  
  return [...new Set(keywords)].slice(0, 10);
}
