/**
 * Rate Limiting & Security Middleware
 * Production-ready protection against abuse and attacks
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// RATE LIMITING (In-Memory - for serverless use Redis in production)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
};

const STRICT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 5, // 5 requests per minute for sensitive endpoints
};

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `${identifier}:${Math.floor(now / config.windowMs)}`;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }
  
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }
  
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

// ============================================================================
// RATE LIMIT MIDDLEWARE
// ============================================================================

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Get client identifier (IP + user agent hash)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const identifier = `${ip}:${userAgent.slice(0, 50)}`;
    
    const result = rateLimit(identifier, config);
    
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again after ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(config?.maxRequests || DEFAULT_RATE_LIMIT.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(result.resetTime),
            'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
          },
        }
      );
    }
    
    const response = await handler(request);
    
    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', String(config?.maxRequests || DEFAULT_RATE_LIMIT.maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(result.resetTime));
    
    return response;
  };
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

export const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.openai.com https://*.amazonaws.com",
    "media-src 'self' blob: https:",
    "frame-ancestors 'none'",
  ].join('; '),
};

export function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// ============================================================================
// CORS HANDLING
// ============================================================================

export function handleCORS(request: NextRequest, allowedOrigins: string[] = []): NextResponse | null {
  const origin = request.headers.get('origin');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    
    if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    return response;
  }
  
  return null;
}

export function withCORS(
  handler: (req: NextRequest) => Promise<NextResponse>,
  allowedOrigins: string[] = []
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle preflight
    const corsResponse = handleCORS(request, allowedOrigins);
    if (corsResponse) return corsResponse;
    
    // Process request
    const response = await handler(request);
    
    // Add CORS headers to actual response
    const origin = request.headers.get('origin');
    if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  };
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

export function redactPIIText(input: string): string {
  return input
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\+?\d[\d\s().-]{8,}\d/g, "[redacted-phone]")
    .replace(/\bhttps?:\/\/[^\s]+/gi, "[redacted-link]");
}

export function redactPIIFromUnknown<T>(value: T): T {
  if (typeof value === "string") {
    return redactPIIText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactPIIFromUnknown(item)) as T;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(record).map(([key, item]) => [key, redactPIIFromUnknown(item)]),
    ) as T;
  }

  return value;
}

export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  if (Array.isArray(obj)) {
    return obj.map((value) =>
      typeof value === "string"
        ? sanitizeString(value)
        : typeof value === "object" && value !== null
          ? sanitizeObject(value)
          : value,
    ) as unknown as Record<string, any>;
  }

  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

export function validateContentType(request: NextRequest, allowedTypes: string[]): boolean {
  const contentType = request.headers.get('content-type') || '';
  return allowedTypes.some(type => contentType.includes(type));
}

export function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}

// ============================================================================
// AUTH MIDDLEWARE HELPERS
// ============================================================================

export function extractToken(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  // Check cookie
  const cookie = request.cookies.get('session')?.value;
  if (cookie) {
    return cookie;
  }
  
  return null;
}

// ============================================================================
// ERROR RESPONSE HELPERS
// ============================================================================

export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized', message },
    { status: 401, headers: securityHeaders }
  );
}

export function forbiddenResponse(message = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { error: 'Forbidden', message },
    { status: 403, headers: securityHeaders }
  );
}

export function badRequestResponse(message: string, details?: any): NextResponse {
  return NextResponse.json(
    { error: 'Bad Request', message, details },
    { status: 400, headers: securityHeaders }
  );
}

export function notFoundResponse(message = 'Not Found'): NextResponse {
  return NextResponse.json(
    { error: 'Not Found', message },
    { status: 404, headers: securityHeaders }
  );
}

export function internalErrorResponse(message = 'Internal Server Error'): NextResponse {
  return NextResponse.json(
    { error: 'Internal Server Error', message },
    { status: 500, headers: securityHeaders }
  );
}
