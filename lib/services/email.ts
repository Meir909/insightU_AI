/**
 * Email Service using Resend
 * Production-ready email notifications for inVision U
 */

import { Resend } from 'resend';
import { prisma } from '@/lib/server/prisma';

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@invisionu.kz';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://invisionu.kz';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function welcomeTemplate(candidateName: string, candidateCode: string): EmailTemplate {
  return {
    subject: 'Welcome to inVision U - Your Application Journey Begins',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Welcome to inVision U!</h2>
        <p>Dear ${candidateName},</p>
        <p>Thank you for starting your application to <strong>inVision U</strong> - Kazakhstan's premier digital university for change agents.</p>
        
        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Your Application Code:</strong> ${candidateCode}</p>
          <p style="margin: 10px 0 0 0; color: #666;">Please save this code for your reference.</p>
        </div>
        
        <h3 style="color: #2d3748;">Next Steps:</h3>
        <ol>
          <li>Complete your profile information</li>
          <li>Upload your resume/CV</li>
          <li>Participate in the AI-powered interview</li>
          <li>Submit any additional materials (portfolio, etc.)</li>
        </ol>
        
        <p><a href="${APP_URL}/dashboard" style="background: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Continue Your Application</a></p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions, please contact us at nurmiko22@gmail.com
        </p>
      </div>
    `,
    text: `
Welcome to inVision U!

Dear ${candidateName},

Thank you for starting your application to inVision U - Kazakhstan's premier digital university for change agents.

Your Application Code: ${candidateCode}
Please save this code for your reference.

Next Steps:
1. Complete your profile information
2. Upload your resume/CV
3. Participate in the AI-powered interview
4. Submit any additional materials (portfolio, etc.)

Continue Your Application: ${APP_URL}/dashboard

If you have any questions, please contact us at nurmiko22@gmail.com
    `,
  };
}

function interviewReminderTemplate(candidateName: string, progress: number): EmailTemplate {
  return {
    subject: 'Complete Your inVision U Interview',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Don't Forget to Complete Your Interview</h2>
        <p>Dear ${candidateName},</p>
        <p>You've completed <strong>${progress}%</strong> of your AI interview. You're doing great!</p>
        
        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">The interview is a crucial part of your application. It helps us understand:</p>
          <ul style="margin: 10px 0;">
            <li>Your leadership potential</li>
            <li>Problem-solving approach</li>
            <li>Communication skills</li>
            <li>Motivation and goals</li>
          </ul>
        </div>
        
        <p><a href="${APP_URL}/interview" style="background: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Continue Interview</a></p>
      </div>
    `,
    text: `
Don't Forget to Complete Your Interview

Dear ${candidateName},

You've completed ${progress}% of your AI interview. You're doing great!

The interview is a crucial part of your application. It helps us understand:
- Your leadership potential
- Problem-solving approach
- Communication skills
- Motivation and goals

Continue Interview: ${APP_URL}/interview
    `,
  };
}

function decisionTemplate(
  candidateName: string,
  decision: 'shortlisted' | 'rejected' | 'accepted' | 'waitlisted'
): EmailTemplate {
  const templates: Record<string, { subject: string; message: string; color: string }> = {
    shortlisted: {
      subject: 'Congratulations! You\'ve Been Shortlisted for inVision U',
      message: `
        <p>We are delighted to inform you that you have been <strong>shortlisted</strong> for admission to inVision U!</p>
        <p>Your application stood out among many talented candidates. The committee was impressed by your:</p>
        <ul>
          <li>Leadership potential</li>
          <li>Innovative mindset</li>
          <li>Alignment with our mission</li>
        </ul>
        <p><strong>Next Step:</strong> You will be contacted shortly for a final interview with our admissions committee.</p>
      `,
      color: '#48bb78',
    },
    accepted: {
      subject: '🎉 Welcome to inVision U Class of 2025!',
      message: `
        <p><strong>Congratulations!</strong> We are thrilled to offer you admission to inVision U.</p>
        <p>You have been selected to join a community of change agents who will shape the future of Kazakhstan and beyond.</p>
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Confirm your enrollment by [DATE]</li>
          <li>Complete enrollment paperwork</li>
          <li>Join our onboarding session</li>
        </ol>
        <p>We can't wait to see what you'll achieve!</p>
      `,
      color: '#38a169',
    },
    waitlisted: {
      subject: 'inVision U Application Update',
      message: `
        <p>Thank you for your interest in inVision U.</p>
        <p>Your application has been placed on our <strong>waitlist</strong>. This means you are a qualified candidate, and we may be able to offer you admission if spots become available.</p>
        <p>We will notify you of any updates to your status by [DATE].</p>
      `,
      color: '#ed8936',
    },
    rejected: {
      subject: 'inVision U Application Decision',
      message: `
        <p>Thank you for your interest in inVision U and for taking the time to complete your application.</p>
        <p>After careful consideration, we are unable to offer you admission at this time. This decision reflects the highly competitive nature of our selection process, not your potential.</p>
        <p>We encourage you to continue developing your skills and consider applying again in the future.</p>
        <p>We wish you all the best in your future endeavors.</p>
      `,
      color: '#718096',
    },
  };

  const t = templates[decision];

  return {
    subject: t.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${t.color}; padding: 20px; border-radius: 8px 8px 0 0; color: white;">
          <h2 style="margin: 0;">Application Update</h2>
        </div>
        <div style="background: #f7fafc; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Dear ${candidateName},</p>
          ${t.message}
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            If you have any questions, please contact admissions@invisionu.kz
          </p>
        </div>
      </div>
    `,
    text: `
Application Update

Dear ${candidateName},

${t.message.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')}

If you have any questions, please contact admissions@invisionu.kz
    `,
  };
}

function committeeNotificationTemplate(
  committeeName: string,
  candidateName: string,
  candidateCode: string,
  action: 'new_application' | 'evaluation_complete' | 'vote_needed'
): EmailTemplate {
  const templates: Record<string, { subject: string; message: string }> = {
    new_application: {
      subject: `New Application Review: ${candidateName}`,
      message: `<p>A new application has been submitted and is ready for review.</p>`,
    },
    evaluation_complete: {
      subject: `AI Evaluation Complete: ${candidateName}`,
      message: `<p>The AI evaluation for this candidate has been completed. Please review the scores and provide your assessment.</p>`,
    },
    vote_needed: {
      subject: `Your Vote Needed: ${candidateName}`,
      message: `<p>This candidate is awaiting your committee vote. Please log in to review and cast your decision.</p>`,
    },
  };

  const t = templates[action];

  return {
    subject: t.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Committee Notification</h2>
        <p>Dear ${committeeName},</p>
        ${t.message}
        
        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Candidate:</strong> ${candidateName}</p>
          <p style="margin: 5px 0 0 0;"><strong>Code:</strong> ${candidateCode}</p>
        </div>
        
        <p><a href="${APP_URL}/dashboard/candidates" style="background: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Review Candidate</a></p>
      </div>
    `,
    text: `
Committee Notification

Dear ${committeeName},

${t.message.replace(/<[^>]*>/g, '')}

Candidate: ${candidateName}
Code: ${candidateCode}

Review Candidate: ${APP_URL}/dashboard/candidates
    `,
  };
}

// ============================================================================
// EMAIL SERVICE FUNCTIONS
// ============================================================================

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  candidateId?: string;
  template: string;
}

async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.log('[Email] Development mode - email not sent:', {
        to: options.to,
        subject: options.subject,
      });
      return { success: true };
    }

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    // Log to database
    await prisma.emailLog.create({
      data: {
        to: options.to,
        subject: options.subject,
        template: options.template,
        status: 'sent',
        candidateId: options.candidateId,
        sentAt: new Date(),
      },
    });

    console.log('[Email] Sent successfully:', result.data?.id);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log failure
    await prisma.emailLog.create({
      data: {
        to: options.to,
        subject: options.subject,
        template: options.template,
        status: 'failed',
        candidateId: options.candidateId,
        error: errorMessage,
      },
    });

    console.error('[Email] Failed to send:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function sendWelcomeEmail(
  to: string,
  candidateName: string,
  candidateCode: string,
  candidateId: string
) {
  const template = welcomeTemplate(candidateName, candidateCode);
  
  return sendEmail({
    to,
    ...template,
    candidateId,
    template: 'welcome',
  });
}

export async function sendInterviewReminder(
  to: string,
  candidateName: string,
  progress: number,
  candidateId: string
) {
  const template = interviewReminderTemplate(candidateName, progress);
  
  return sendEmail({
    to,
    ...template,
    candidateId,
    template: 'interview_reminder',
  });
}

export async function sendDecisionEmail(
  to: string,
  candidateName: string,
  decision: 'shortlisted' | 'rejected' | 'accepted' | 'waitlisted',
  candidateId: string
) {
  const template = decisionTemplate(candidateName, decision);
  
  return sendEmail({
    to,
    ...template,
    candidateId,
    template: `decision_${decision}`,
  });
}

export async function sendCommitteeNotification(
  to: string,
  committeeName: string,
  candidateName: string,
  candidateCode: string,
  action: 'new_application' | 'evaluation_complete' | 'vote_needed'
) {
  const template = committeeNotificationTemplate(committeeName, candidateName, candidateCode, action);
  
  return sendEmail({
    to,
    ...template,
    template: `committee_${action}`,
  });
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export async function sendBulkInterviewReminders() {
  // Find candidates with incomplete interviews
  const candidates = await prisma.candidate.findMany({
    where: {
      status: 'in_progress',
      interviewSession: {
        status: 'active',
        progress: {
          lt: 100,
          gt: 0,
        },
      },
    },
    include: {
      interviewSession: true,
      account: {
        select: {
          email: true,
        },
      },
    },
  });

  const results = [];
  
  for (const candidate of candidates) {
    if (!candidate.account?.email) continue;
    
    const result = await sendInterviewReminder(
      candidate.account.email,
      candidate.fullName,
      candidate.interviewSession!.progress,
      candidate.id
    );
    
    results.push({
      candidateId: candidate.id,
      success: result.success,
    });
  }

  console.log(`[Email] Sent ${results.filter(r => r.success).length}/${results.length} reminders`);
  return results;
}

// ============================================================================
// EMAIL LOG QUERIES
// ============================================================================

export async function getEmailLogs(candidateId?: string) {
  return prisma.emailLog.findMany({
    where: candidateId ? { candidateId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function getPendingEmails() {
  return prisma.emailLog.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
  });
}
