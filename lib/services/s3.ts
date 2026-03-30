/**
 * S3 File Storage Service
 * Production-ready file upload/download using AWS S3
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';

// ============================================================================
// S3 CLIENT CONFIGURATION
// ============================================================================

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'invisionu-uploads';
const S3_PREFIX = process.env.S3_PREFIX || 'production';

// ============================================================================
// UPLOAD CONFIGURATION
// ============================================================================

export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: {
    resume: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    video: [
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-msvideo',
    ],
    audio: [
      'audio/mpeg',
      'audio/wav',
      'audio/webm',
      'audio/mp4',
    ],
    image: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.',
    ],
  },
};

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  file: File | { name: string; size: number; type: string },
  type: 'resume' | 'video' | 'audio' | 'image' | 'document'
): ValidationResult {
  // Check file size
  if (file.size > UPLOAD_CONFIG.maxFileSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB`,
    };
  }

  // Check MIME type
  const allowedTypes = UPLOAD_CONFIG.allowedMimeTypes[type];
  if (!allowedTypes.some(t => file.type.startsWith(t.replace('application/vnd.openxmlformats-officedocument.', 'application/vnd.openxmlformats-officedocument')))) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

// ============================================================================
// UPLOAD FUNCTIONS
// ============================================================================

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
  size: number;
  mimeType: string;
}

export async function uploadFile(
  file: Buffer | Uint8Array,
  originalName: string,
  mimeType: string,
  candidateId: string,
  type: 'resumes' | 'videos' | 'audio' | 'documents' | 'portfolios'
): Promise<UploadResult> {
  try {
    // Check if S3 is configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.S3_BUCKET_NAME) {
      console.warn('[S3] S3 not configured, using mock upload');
      
      // Return mock URL for development
      const mockKey = `${S3_PREFIX}/${type}/${candidateId}/${nanoid()}-${originalName}`;
      return {
        success: true,
        url: `https://mock-s3.invisionu.kz/${mockKey}`,
        key: mockKey,
        size: file.length,
        mimeType,
      };
    }

    // Generate unique key
    const extension = originalName.split('.').pop() || '';
    const key = `${S3_PREFIX}/${type}/${candidateId}/${nanoid()}-${Date.now()}.${extension}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: mimeType,
      Metadata: {
        'candidate-id': candidateId,
        'original-name': originalName,
        'upload-type': type,
      },
    });

    await s3Client.send(command);

    // Generate public URL
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    console.log('[S3] Upload successful:', { key, size: file.length });

    return {
      success: true,
      url,
      key,
      size: file.length,
      mimeType,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[S3] Upload failed:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
      size: file.length,
      mimeType,
    };
  }
}

// ============================================================================
// DOWNLOAD & URL FUNCTIONS
// ============================================================================

export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string | null> {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID) {
      console.warn('[S3] S3 not configured, returning mock URL');
      return `https://mock-s3.invisionu.kz/${key}`;
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('[S3] Failed to generate signed URL:', error);
    return null;
  }
}

export async function getFileMetadata(key: string) {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID) {
      return null;
    }

    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    return {
      size: response.ContentLength,
      lastModified: response.LastModified,
      contentType: response.ContentType,
      metadata: response.Metadata,
    };
  } catch (error) {
    console.error('[S3] Failed to get metadata:', error);
    return null;
  }
}

// ============================================================================
// DELETE FUNCTIONS
// ============================================================================

export async function deleteFile(key: string): Promise<boolean> {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID) {
      console.warn('[S3] S3 not configured, mock delete');
      return true;
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log('[S3] Delete successful:', key);
    return true;
  } catch (error) {
    console.error('[S3] Delete failed:', error);
    return false;
  }
}

// ============================================================================
// RESUME UPLOAD HELPERS
// ============================================================================

export async function uploadResume(
  file: Buffer,
  originalName: string,
  mimeType: string,
  candidateId: string
): Promise<UploadResult> {
  return uploadFile(file, originalName, mimeType, candidateId, 'resumes');
}

export async function uploadVideo(
  file: Buffer,
  originalName: string,
  mimeType: string,
  candidateId: string
): Promise<UploadResult> {
  return uploadFile(file, originalName, mimeType, candidateId, 'videos');
}

export async function uploadAudio(
  file: Buffer,
  originalName: string,
  mimeType: string,
  candidateId: string
): Promise<UploadResult> {
  return uploadFile(file, originalName, mimeType, candidateId, 'audio');
}

export async function uploadDocument(
  file: Buffer,
  originalName: string,
  mimeType: string,
  candidateId: string
): Promise<UploadResult> {
  return uploadFile(file, originalName, mimeType, candidateId, 'documents');
}

export async function uploadPortfolio(
  file: Buffer,
  originalName: string,
  mimeType: string,
  candidateId: string
): Promise<UploadResult> {
  return uploadFile(file, originalName, mimeType, candidateId, 'portfolios');
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export async function deleteCandidateFiles(candidateId: string): Promise<number> {
  if (!process.env.AWS_ACCESS_KEY_ID) {
    console.warn('[S3] S3 not configured, mock batch delete');
    return 0;
  }

  // Note: In production, you'd list objects with prefix and delete them
  // This is a simplified version
  console.log('[S3] Would delete all files for candidate:', candidateId);
  return 0;
}
