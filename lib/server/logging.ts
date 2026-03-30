/**
 * Logging Service
 * Production-ready logging with structured output
 */

import { prisma } from './prisma';

// ============================================================================
// LOG LEVELS
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const CURRENT_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 'info';

// ============================================================================
// STRUCTURED LOG ENTRY
// ============================================================================

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  requestId?: string;
  userId?: string;
  duration?: number;
}

// ============================================================================
// LOGGER CLASS
// ============================================================================

class Logger {
  private service: string;

  constructor(service: string) {
    this.service = service;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL];
  }

  private formatEntry(level: LogLevel, message: string, meta?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      ...meta,
    };
  }

  private output(entry: LogEntry): void {
    // Console output with colors
    const colors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
      fatal: '\x1b[35m', // Magenta
    };
    
    const reset = '\x1b[0m';
    const color = colors[entry.level];
    
    const logLine = `${color}[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.service}: ${entry.message}${reset}`;
    
    if (entry.level === 'error' || entry.level === 'fatal') {
      console.error(logLine);
      if (entry.error) console.error(entry.error);
      if (entry.context) console.error('Context:', entry.context);
    } else if (entry.level === 'warn') {
      console.warn(logLine);
    } else {
      console.log(logLine);
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return;
    const entry = this.formatEntry('debug', message, { context });
    this.output(entry);
  }

  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('info')) return;
    const entry = this.formatEntry('info', message, { context });
    this.output(entry);
  }

  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return;
    const entry = this.formatEntry('warn', message, { context });
    this.output(entry);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    if (!this.shouldLog('error')) return;
    const entry = this.formatEntry('error', message, {
      context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      } : undefined,
    });
    this.output(entry);
  }

  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    const entry = this.formatEntry('fatal', message, {
      context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      } : undefined,
    });
    this.output(entry);
    
    // Fatal errors should be logged to database
    this.persistLog(entry).catch(console.error);
  }

  // Request tracking
  startRequest(requestId: string, userId?: string): RequestTracker {
    const startTime = Date.now();
    
    return {
      finish: (message: string, meta?: any) => {
        const duration = Date.now() - startTime;
        this.info(message, {
          ...meta,
          requestId,
          userId,
          duration,
        });
      },
      error: (message: string, error?: Error) => {
        const duration = Date.now() - startTime;
        this.error(message, error, {
          requestId,
          userId,
          duration,
        });
      },
    };
  }

  private async persistLog(entry: LogEntry): Promise<void> {
    try {
      // Only persist error and fatal logs to database
      if (entry.level !== 'error' && entry.level !== 'fatal') return;
      
      // Use audit log table for persistent error logging
      await prisma.auditLog.create({
        data: {
          action: 'ERROR',
          entityType: 'system',
          entityId: entry.service,
          actorType: 'system',
          actorName: entry.service,
          details: {
            level: entry.level,
            message: entry.message,
            error: entry.error,
            context: entry.context,
          },
        },
      });
    } catch (err) {
      // If DB logging fails, at least we have console output
      console.error('Failed to persist log:', err);
    }
  }
}

interface RequestTracker {
  finish: (message: string, meta?: any) => void;
  error: (message: string, error?: Error) => void;
}

// ============================================================================
// SERVICE-SPECIFIC LOGGERS
// ============================================================================

export const logger = {
  auth: new Logger('auth'),
  api: new Logger('api'),
  ai: new Logger('ai'),
  db: new Logger('db'),
  email: new Logger('email'),
  s3: new Logger('s3'),
  scoring: new Logger('scoring'),
  interview: new Logger('interview'),
  security: new Logger('security'),
  general: new Logger('app'),
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export function measurePerformance<T>(
  fn: () => Promise<T>,
  operation: string,
  service: keyof typeof logger
): Promise<T> {
  const start = Date.now();
  const log = logger[service];
  
  return fn()
    .then(result => {
      const duration = Date.now() - start;
      log.info(`${operation} completed`, { duration, operation });
      return result;
    })
    .catch(error => {
      const duration = Date.now() - start;
      log.error(`${operation} failed`, error, { duration, operation });
      throw error;
    });
}

// ============================================================================
// ERROR BOUNDARY HELPERS
// ============================================================================

export function logError(
  service: keyof typeof logger,
  operation: string,
  error: unknown,
  context?: Record<string, any>
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  logger[service].error(`${operation} failed`, err, context);
}

export function logWarning(
  service: keyof typeof logger,
  message: string,
  context?: Record<string, any>
): void {
  logger[service].warn(message, context);
}

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export function withLogging(
  handler: (req: NextRequest) => Promise<NextResponse>,
  operation: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const start = Date.now();
    const requestId = crypto.randomUUID();
    
    logger.api.info(`${operation} started`, {
      requestId,
      method: request.method,
      url: request.url,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0],
    });
    
    try {
      const response = await handler(request);
      const duration = Date.now() - start;
      
      logger.api.info(`${operation} completed`, {
        requestId,
        status: response.status,
        duration,
      });
      
      // Add request ID header for tracing
      response.headers.set('X-Request-Id', requestId);
      
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      
      logger.api.error(`${operation} failed`, error as Error, {
        requestId,
        duration,
      });
      
      throw error;
    }
  };
}
