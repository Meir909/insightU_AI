import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";
import { createAuditLog, createResume, getCandidateById, getAuthenticatedAccountByToken } from "@/lib/server/prisma";
import { uploadResume, validateFile } from "@/lib/services/s3";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { id } = await params;
  if (session.role === "candidate" && session.entityId !== id) {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  try {
    const formData = await request.formData();
    const file = formData.get("resume");
    if (!(file instanceof File)) {
      return addSecurityHeaders(NextResponse.json({ error: "No file provided" }, { status: 400 }));
    }

    const validation = validateFile(file, "resume");
    if (!validation.valid) {
      return addSecurityHeaders(NextResponse.json({ error: validation.error }, { status: 400 }));
    }

    const candidate = await getCandidateById(id);
    if (!candidate) {
      return addSecurityHeaders(NextResponse.json({ error: "Candidate not found" }, { status: 404 }));
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const upload = await uploadResume(bytes, file.name, file.type, id);
    if (!upload.success || !upload.url) {
      return addSecurityHeaders(
        NextResponse.json({ error: upload.error || "Failed to upload resume" }, { status: 500 }),
      );
    }

    const extractedText = await file.text().catch(() => "");
    const keywords = extractKeywords(extractedText);

    const resume = await createResume({
      candidateId: id,
      fileName: file.name,
      fileUrl: upload.url,
      fileSize: file.size,
      mimeType: file.type,
      extractedText,
      keywords,
    });

    const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
    await createAuditLog({
      action: "RESUME_UPLOADED",
      entityType: "resume",
      entityId: resume.id,
      actorId: persistedSession?.account.id,
      actorType: session.role,
      actorName: session.name,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        candidateId: id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        keywords,
      },
    });

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        message: "Resume uploaded successfully",
        resume: {
          url: resume.fileUrl,
          fileName: resume.fileName,
          fileSize: resume.fileSize,
          mimeType: resume.mimeType,
          keywords: resume.keywords,
        },
      }),
    );
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to upload resume" },
        { status: 500 },
      ),
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { id } = await params;
  if (session.role === "candidate" && session.entityId !== id) {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  try {
    const candidate = await getCandidateById(id);
    if (!candidate) {
      return addSecurityHeaders(NextResponse.json({ error: "Candidate not found" }, { status: 404 }));
    }

    return addSecurityHeaders(
      NextResponse.json({
        hasResume: Boolean(candidate.resume),
        resumeUrl: candidate.resume?.fileUrl,
        resumeMetadata: candidate.resume
          ? {
              fileName: candidate.resume.fileName,
              fileSize: candidate.resume.fileSize,
              mimeType: candidate.resume.mimeType,
              uploadedAt: candidate.resume.updatedAt.toISOString(),
            }
          : null,
        resumeKeywords: candidate.resume?.keywords ?? [],
        parsedData: {
          extractedText: candidate.resume?.extractedText ?? "",
        },
      }),
    );
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch resume" },
        { status: 500 },
      ),
    );
  }
}

function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  const patterns = [
    /leadership|leader|managed|management/i,
    /teamwork|team|collaboration/i,
    /python|javascript|java|c\+\+|go|rust/i,
    /communication|presentation|public speaking/i,
    /project management|agile|scrum/i,
    /data analysis|machine learning|ai/i,
    /volunteer|community|social impact/i,
  ];

  patterns.forEach((pattern) => {
    if (pattern.test(text)) {
      keywords.push(pattern.source.replace(/\\/g, "").replace(/\|/g, "/"));
    }
  });

  return [...new Set(keywords)].slice(0, 10);
}
