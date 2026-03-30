# inVision U - AI-Powered Admissions Platform

**Production-Ready AI Interview & Evaluation System for inDrive's Digital University**

## 🎯 Overview

InsightU is a comprehensive AI-powered admissions platform designed specifically for inVision U — Kazakhstan's premier digital university for "agents of change." The platform goes beyond traditional academic metrics to identify candidates with genuine leadership potential, innovation mindset, and cultural fit.

### Key Differentiators

| Feature | Traditional Admissions | inVision U (InsightU) |
|---------|----------------------|----------------------|
| **Evaluation** | Grades, test scores | AI-powered behavioral analysis |
| **Interview** | Human-only, subjective | AI + human hybrid with explainability |
| **Scoring** | Single dimension | 5-dimension rubric with confidence scores |
| **Files** | Basic resume upload | Video, voice, document analysis |
| **Bias Prevention** | None | Automated bias detection & fairness audit |
| **Decision Support** | Gut feeling | Data-driven with evidence citations |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                        │
│              (React 19, TypeScript, Tailwind)               │
├─────────────────────────────────────────────────────────────┤
│                    API Routes (Node.js)                      │
├─────────────────────────────────────────────────────────────┤
│  Auth  │  Applications  │  AI Interview  │  Analytics       │
│  Video │  Voice Analysis│  Committee   │  Evaluations     │
├─────────────────────────────────────────────────────────────┤
│                     AI Services Layer                        │
│  • GPT-4o (Interview & Evaluation)                          │
│  • Whisper-1 (Speech-to-Text)                             │
│  • Fine-tuned Models (inVision U Specific)                  │
├─────────────────────────────────────────────────────────────┤
│                  Data Persistence Layer                      │
│  PostgreSQL (via Prisma) + S3 (File Storage)              │
├─────────────────────────────────────────────────────────────┤
│                  External Integrations                       │
│  Resend (Email) │  AWS S3 (Files) │  OpenAI (AI)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Features

### 1. Multi-Modal AI Interview

**Text Chat (`/api/chat`)**
- Multi-phase adaptive questioning (Foundation → Deep Dive)
- Behavioral signal detection (confidence, hesitation, evasiveness)
- Real-time scoring updates

**Voice Analysis (`/api/candidates/[id]/voice`)**
- Whisper transcription with 95%+ accuracy
- Voice stress analysis (pitch variation, tremor)
- Filler word detection ("um", "uh", "like")
- Pace analysis (words per minute)

**Video Interview (`/api/candidates/[id]/video`)**
- Frame-by-frame behavioral analysis
- Eye contact tracking
- Posture & gesture recognition
- Micro-expression detection

**Live Interview (`/api/interview/live`)**
- Real-time WebRTC support
- Combined video + voice analysis
- Automatic question advancement

### 2. Advanced Evaluation System

**Structured Rubrics (1-5 scale)**
| Dimension | Weight | Levels |
|-----------|--------|--------|
| Leadership Potential | 30% | Follower → Transformational Leader |
| Change Agent Mindset | 25% | Status Quo → Disruptor |
| Adaptability | 20% | Rigid → Transformer |
| Collaboration | 15% | Isolated → Catalytic |
| Authenticity | 10% | Performative → Integrated |

**Comprehensive Analysis**
- Cross-response consistency checking
- Comparative analysis vs cohort
- InVision U cultural fit assessment
- Potential forecasting (1-2 year, 3-5 year)
- Red flag detection with severity levels

### 3. Committee Review System

- Multi-member voting with bias detection
- Formal/Informal scoring (0-100 each)
- Recommendation tracking (proceed/hold/reject)
- Committee analytics dashboard

### 4. Production-Ready Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Database | PostgreSQL + Prisma | Persistent data storage |
| File Storage | AWS S3 | Resume, video, audio files |
| Email | Resend | Notifications, reminders |
| Rate Limiting | In-memory (Redis in prod) | API protection |
| Security | Custom middleware | Headers, CORS, sanitization |
| Logging | Structured JSON | Monitoring, debugging |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- AWS Account (for S3)
- Resend Account (for email)
- OpenAI API Key

### Installation

```bash
# Clone repository
git clone https://github.com/Meir909/insightU_AI.git
cd insightu-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Set up database
npx prisma generate
npx prisma migrate dev

# Run development server
npm run dev
```

### Environment Variables

```env
# App
NEXT_PUBLIC_APP_URL=https://invisionu.kz

# Database (Required)
DATABASE_URL=postgresql://user:pass@host:5432/invisionu

# AI Services (Required)
OPENAI_API_KEY=sk-...

# File Storage (Required for production)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-central-1
S3_BUCKET_NAME=invisionu-production

# Email (Required for production)
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@invisionu.kz

# Auth
SESSION_SECRET=your-256-bit-secret
COMMITTEE_ACCESS_KEY=committee-secret-key
```

---

## 📊 API Reference

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/session
```

### Candidates

```http
GET    /api/candidates                    # List all (committee only)
GET    /api/candidates/me                 # Current candidate
GET    /api/candidates/[id]               # Candidate details
POST   /api/candidates/[id]/score         # Score candidate
POST   /api/candidates/[id]/resume        # Upload resume
POST   /api/candidates/[id]/video         # Upload video
POST   /api/candidates/[id]/voice         # Upload voice
```

### Interview

```http
POST   /api/chat                          # Send message
POST   /api/chat/upload                   # Upload media
POST   /api/interview/live                # Start live interview
PUT    /api/interview/live                # Submit frame
PATCH  /api/interview/live                # Complete interview
```

### Evaluation

```http
POST   /api/evaluate/comprehensive        # Run full evaluation
GET    /api/analytics                     # Get stats
GET    /api/shortlist                     # Get shortlisted
POST   /api/committee/vote                # Cast vote
```

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

---

## 📦 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
npx vercel --prod
```

### Self-Hosted

```bash
# Build application
npm run build

# Start production server
npm start
```

### Database Migration

```bash
# Generate migration
npx prisma migrate dev --name add_feature

# Deploy migration (production)
npx prisma migrate deploy
```

---

## 🔒 Security

- **Authentication**: Session-based with secure cookies
- **Authorization**: Role-based (candidate, committee, admin)
- **Rate Limiting**: 30 req/min default, 5 req/min for sensitive endpoints
- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **Input Sanitization**: XSS protection
- **Audit Logging**: All actions logged with actor attribution

---

## 📈 Monitoring

### Health Check

```http
GET /api/health
GET /api/service-status
```

### Logs

Structured logging with service-specific loggers:
- `logger.auth` - Authentication events
- `logger.api` - API requests
- `logger.ai` - AI service calls
- `logger.db` - Database operations
- `logger.security` - Security events

---

## 🤝 For inDrive Team

### Customization

**Fine-tuning AI Models**
```bash
# Generate training data
npx ts-node scripts/generate-finetune-data.ts

# Upload to OpenAI and create fine-tune job
# (see lib/services/fine-tuning.ts for workflow)
```

**Custom Evaluation Rubrics**
Edit `lib/services/advanced-evaluation.ts`:
- Modify `inVisionURubrics` array
- Adjust weights (must sum to 100%)
- Add custom criteria

**Email Templates**
Edit `lib/services/email.ts`:
- Welcome email
- Interview reminders
- Decision notifications
- Committee alerts

### Support

- **Issues**: https://github.com/Meir909/insightU_AI/issues
- **Email**: support@invisionu.kz
- **Slack**: #invisionu-admissions

---

## 📄 License

Proprietary - inDrive / inVision U

---

**Built with ❤️ for Kazakhstan's future change agents**
