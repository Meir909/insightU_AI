# InsightU AI — Frontend Master Prompt v2.0
# Claude Code | Next.js 14 | inDrive × inVision U Brand
# Decentrathon 5.0 | Deadline: 5 April

---

## 🧠 РОЛЬ

Ты — senior frontend engineer и UI/UX дизайнер. Твоя задача — построить **Admin Dashboard для InsightU AI** в точном соответствии с брендом inDrive и inVision U.

Работай автономно. Создавай файлы сразу, не жди разрешения.

---

## 🎨 ДИЗАЙН-СИСТЕМА — inDrive × inVision U Brand

### Анализ бренда
- **inDrive:** кислотно-зелёный (`#C8F000`) + чёрный + белый. Очень bold, резкий, энергичный. Нет полутонов — только контраст.
- **inVision U:** чистый, светлый, вдохновляющий. Много белого пространства, тот же зелёный как акцент.
- **Комбинация для Dashboard:** тёмная тема (чёрный/очень тёмный серый) + кислотно-зелёный как главный акцент = энергия inDrive + серьёзность платформы.

### Цветовая палитра (СТРОГО соблюдай)
```css
/* ───── БРЕНД ЦВЕТА ───── */
--brand-green: #C8F000;        /* ГЛАВНЫЙ АКЦЕНТ — inDrive зелёный */
--brand-green-dim: #9BBB00;    /* приглушённый зелёный для hover */
--brand-green-glow: rgba(200, 240, 0, 0.25);  /* glow эффект */
--brand-green-subtle: rgba(200, 240, 0, 0.08); /* фоны */

/* ───── ТЁМНЫЙ ФОН ───── */
--bg-base: #0C0C0C;            /* основной фон — почти чёрный */
--bg-surface: #141414;         /* карточки, панели */
--bg-elevated: #1C1C1C;        /* hover состояния, поднятые элементы */
--bg-overlay: #222222;         /* dropdown, tooltip */

/* ───── ГРАНИЦЫ ───── */
--border-default: rgba(255,255,255,0.06);
--border-hover: rgba(200,240,0,0.3);
--border-active: rgba(200,240,0,0.6);

/* ───── ТЕКСТ ───── */
--text-primary: #FFFFFF;
--text-secondary: #A0A0A0;
--text-muted: #555555;

/* ───── СТАТУСНЫЕ ЦВЕТА (нейтральные, не конкурируют с зелёным) ───── */
--status-high: #C8F000;        /* высокий скор — бренд-зелёный */
--status-mid: #F5A623;         /* средний — янтарный */
--status-low: #E53935;         /* низкий — красный */
--status-flag: #FF6B35;        /* флаг — оранжевый */
--status-ai: #BF5AF2;          /* AI-детектор — фиолетовый */

/* ───── БЕЛЫЙ ВАРИАНТ (для светлых блоков) ───── */
--white-surface: #FFFFFF;
--white-secondary: #F5F5F5;
```

### Типографика
```
Основной: Inter (400, 500, 600, 700, 800, 900)
Mono (цифры, коды): JetBrains Mono (600)
Заголовки: Inter 800-900, letter-spacing: -0.03em
Акцентные числа: JetBrains Mono 700, color: #C8F000
```

### Дизайн-принципы
- **Чёрный + кислотный зелёный** — никаких синих, фиолетовых, голубых акцентов (они конкурируют с брендом)
- **Резкий контраст** — белый текст на чёрном, зелёный на чёрном — как у inDrive
- **Нет размытых фонов (glassmorphism)** — чистые тёмные поверхности, чёткие границы
- **Bold типографика** — заголовки жирные, числа крупные
- **Зелёный glow** — вместо синего неона используем `box-shadow: 0 0 24px rgba(200,240,0,0.3)`
- **Острые/rounded-xl радиусы** — 12-16px, не плавные пузыри
- **Анимации** — быстрые (200-300ms), нет slow-motion эффектов

---

## 📦 УСТАНОВКА

```bash
npx create-next-app@latest insightu-frontend --typescript --tailwind --app
cd insightu-frontend

# Анимации
npm install framer-motion

# Radix UI
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip @radix-ui/react-tabs @radix-ui/react-progress

# Утилиты
npm install class-variance-authority clsx tailwind-merge lucide-react

# 3D
npm install @react-three/fiber @react-three/drei three @types/three

# Чарты
npm install recharts

# Таблицы
npm install @tanstack/react-table

# Auth
npm install @clerk/nextjs

# Дополнительно
npm install react-intersection-observer react-hot-toast
```

---

## 📁 СТРУКТУРА ПРОЕКТА

```
insightu-frontend/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── dashboard/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── candidates/[id]/page.tsx
│       ├── shortlist/page.tsx
│       └── analytics/page.tsx
│
├── components/
│   ├── 3d/
│   │   ├── ScoreSphere.tsx
│   │   ├── FloatingShapes.tsx
│   │   └── GridPlane.tsx
│   ├── dashboard/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── KPICard.tsx
│   │   ├── CandidateTable.tsx
│   │   ├── ScoreRadar.tsx
│   │   ├── ExplainabilityBlock.tsx
│   │   ├── AIDetectionBadge.tsx
│   │   ├── ConfidenceRing.tsx
│   │   └── ActivityFeed.tsx
│   └── ui/
│       ├── GreenButton.tsx
│       ├── AnimatedNumber.tsx
│       ├── StatusBadge.tsx
│       └── ScoreBar.tsx
│
├── lib/
│   ├── types.ts
│   ├── utils.ts
│   └── mock-data.ts
│
├── hooks/
│   └── useAnimatedScore.ts
│
├── middleware.ts
└── tailwind.config.ts
```

---

## ⚙️ КОНФИГУРАЦИЯ

### `tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#C8F000',
          dim: '#9BBB00',
        },
        bg: {
          base: '#0C0C0C',
          surface: '#141414',
          elevated: '#1C1C1C',
          overlay: '#222222',
        },
        status: {
          high: '#C8F000',
          mid: '#F5A623',
          low: '#E53935',
          flag: '#FF6B35',
          ai: '#BF5AF2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
        'rotate-slow': 'rotate 20s linear infinite',
        'slide-up': 'slideUp 0.3s ease',
        'fade-in': 'fadeIn 0.25s ease',
        'scan': 'scan 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        pulseGreen: {
          '0%,100%': { boxShadow: '0 0 16px rgba(200,240,0,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(200,240,0,0.5)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '50%,100%': { transform: 'translateY(100%)' },
        },
      },
      boxShadow: {
        'green': '0 0 24px rgba(200,240,0,0.3)',
        'green-lg': '0 0 48px rgba(200,240,0,0.4)',
        'green-sm': '0 0 12px rgba(200,240,0,0.2)',
        'surface': '0 1px 0 rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [],
}
export default config
```

### `app/globals.css`
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

body {
  background: #0C0C0C;
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Custom scrollbar */
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-track { background: #141414; }
::-webkit-scrollbar-thumb { background: #C8F000; border-radius: 2px; }

/* Green glow text */
.text-glow-green {
  color: #C8F000;
  text-shadow: 0 0 20px rgba(200,240,0,0.5);
}

/* Noise grain overlay */
.grain::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
  pointer-events: none;
  border-radius: inherit;
  z-index: 1;
}

/* Green accent line */
.accent-line {
  width: 40px;
  height: 3px;
  background: #C8F000;
  border-radius: 2px;
}

/* Dot grid background */
.dot-grid {
  background-image: radial-gradient(circle, rgba(200,240,0,0.08) 1px, transparent 1px);
  background-size: 28px 28px;
}
```

---

## 🧩 КОМПОНЕНТЫ — ПОЛНАЯ РЕАЛИЗАЦИЯ

---

### `components/3d/FloatingShapes.tsx`
```tsx
'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

function WireBox({ position, rotation, size, speed }: {
  position: [number,number,number]
  rotation: [number,number,number]
  size: number
  speed: number
}) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    if (!ref.current) return
    ref.current.rotation.x += speed * 0.7
    ref.current.rotation.y += speed
    ref.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * 0.5 + position[0]) * 0.5
  })
  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial color="#C8F000" wireframe transparent opacity={0.12} />
    </mesh>
  )
}

function WireSphere({ position, size, speed }: {
  position: [number,number,number]
  size: number
  speed: number
}) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    if (!ref.current) return
    ref.current.rotation.y += speed
    ref.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * speed * 2) * 0.4
  })
  return (
    <mesh ref={ref} position={position}>
      <icosahedronGeometry args={[size, 1]} />
      <meshStandardMaterial color="#C8F000" wireframe transparent opacity={0.10} />
    </mesh>
  )
}

function GreenParticles({ count = 120 }) {
  const ref = useRef<THREE.Points>(null)
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i*3]   = (Math.random()-0.5)*18
    positions[i*3+1] = (Math.random()-0.5)*14
    positions[i*3+2] = (Math.random()-0.5)*8 - 3
  }
  useFrame(() => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      pos[i*3+1] += 0.01
      if (pos[i*3+1] > 7) pos[i*3+1] = -7
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#C8F000" transparent opacity={0.5} sizeAttenuation />
    </points>
  )
}

export function FloatingShapes() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0,0,10], fov: 55 }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[5,5,5]} color="#C8F000" intensity={1.5} />

        <WireBox position={[-5,2,-2]} rotation={[0.3,0.5,0]} size={1.6} speed={0.003} />
        <WireBox position={[5,-1,-3]} rotation={[0.1,0.2,0.4]} size={1.2} speed={0.004} />
        <WireBox position={[0,4,-5]} rotation={[0,0.3,0.1]} size={2.0} speed={0.002} />
        <WireSphere position={[-4,-2,-2]} size={1.0} speed={0.005} />
        <WireSphere position={[4,3,-4]} size={1.4} speed={0.003} />
        <GreenParticles count={150} />
      </Canvas>
    </div>
  )
}
```

---

### `components/3d/ScoreSphere.tsx`
```tsx
'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo } from 'react'
import { Text, MeshDistortMaterial, Ring } from '@react-three/drei'
import * as THREE from 'three'

function Sphere({ score }: { score: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((s) => {
    if (!ref.current) return
    ref.current.rotation.y += 0.004
    ref.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.4) * 0.08
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.006
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(s.clock.elapsedTime * 0.3) * 0.1
    }
  })

  return (
    <>
      {/* Main sphere */}
      <mesh ref={ref}>
        <sphereGeometry args={[1.6, 64, 64]} />
        <MeshDistortMaterial
          color="#C8F000"
          transparent
          opacity={0.12}
          distort={0.25}
          speed={1.5}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Wireframe overlay */}
      <mesh>
        <sphereGeometry args={[1.62, 16, 16]} />
        <meshStandardMaterial color="#C8F000" wireframe transparent opacity={0.08} />
      </mesh>

      {/* Orbiting ring */}
      <mesh ref={ringRef} rotation={[Math.PI/2, 0, 0]}>
        <torusGeometry args={[2.1, 0.025, 16, 100]} />
        <meshStandardMaterial
          color="#C8F000"
          transparent
          opacity={0.4}
          emissive="#C8F000"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Score text */}
      <Text
        fontSize={0.85}
        color="#C8F000"
        anchorX="center"
        anchorY="middle"
      >
        {score}
      </Text>
      <Text
        fontSize={0.22}
        color="#888888"
        anchorX="center"
        anchorY="middle"
        position={[0, -0.65, 0]}
      >
        / 100
      </Text>
    </>
  )
}

export function ScoreSphere({ score }: { score: number }) {
  return (
    <div style={{ width: 220, height: 220 }}>
      <Canvas camera={{ position: [0,0,5], fov: 50 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[3,3,3]} color="#C8F000" intensity={3} />
        <pointLight position={[-3,-3,3]} color="#ffffff" intensity={0.5} />
        <Sphere score={score} />
      </Canvas>
    </div>
  )
}
```

---

### `components/3d/GridPlane.tsx`
```tsx
'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Grid } from '@react-three/drei'

function AnimatedGrid() {
  const ref = useRef<any>(null)
  useFrame((s) => {
    if (ref.current) {
      ref.current.position.z = (s.clock.elapsedTime * 0.5) % 2
    }
  })
  return (
    <group ref={ref}>
      <Grid
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.3}
        cellColor="#C8F000"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#C8F000"
        fadeDistance={20}
        fadeStrength={2}
        infiniteGrid
      />
    </group>
  )
}

export function GridPlane() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-30">
      <Canvas camera={{ position: [0, 6, 0], rotation: [-Math.PI/2.5, 0, 0], fov: 70 }}>
        <AnimatedGrid />
      </Canvas>
    </div>
  )
}
```

---

### `components/ui/GreenButton.tsx`
```tsx
'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GreenButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'solid' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  icon?: React.ReactNode
  className?: string
}

const variants = {
  solid:   'bg-brand-green text-black font-bold hover:bg-brand-dim hover:shadow-green',
  outline: 'border border-brand-green text-brand-green hover:bg-brand-green hover:text-black hover:shadow-green',
  ghost:   'text-[#A0A0A0] hover:text-white hover:bg-white/5 border border-transparent',
  danger:  'border border-status-low/40 text-status-low hover:bg-status-low/10',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
}

export function GreenButton({ children, onClick, variant = 'solid', size = 'md', disabled, icon, className }: GreenButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled}
      transition={{ duration: 0.15 }}
      className={cn(
        'flex items-center gap-2 transition-all duration-200 font-semibold',
        variants[variant], sizes[size],
        disabled && 'opacity-30 cursor-not-allowed',
        className
      )}
    >
      {icon}
      {children}
    </motion.button>
  )
}
```

---

### `components/ui/AnimatedNumber.tsx`
```tsx
'use client'
import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'

export function AnimatedNumber({
  value,
  duration = 1200,
  decimals = 0,
  prefix = '',
  suffix = '',
}: {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
}) {
  const [display, setDisplay] = useState(0)
  const { ref, inView } = useInView({ triggerOnce: true })

  useEffect(() => {
    if (!inView) return
    const start = Date.now()
    const timer = setInterval(() => {
      const progress = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setDisplay(eased * value)
      if (progress >= 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [inView, value, duration])

  return (
    <span ref={ref}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  )
}
```

---

### `components/ui/ScoreBar.tsx`
```tsx
'use client'
import { motion } from 'framer-motion'

export function ScoreBar({ label, score, weight, index = 0 }: {
  label: string
  score: number
  weight: number
  index?: number
}) {
  const color = score >= 75 ? '#C8F000' : score >= 50 ? '#F5A623' : '#E53935'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#A0A0A0]">
          {label}
          <span className="ml-1 text-[#555] text-[10px]">×{weight}</span>
        </span>
        <span className="font-mono font-bold text-sm" style={{ color }}>
          {score.toFixed(0)}
        </span>
      </div>
      {/* Track */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: color,
            boxShadow: score >= 75 ? `0 0 8px ${color}80` : 'none'
          }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.06 }}
        />
      </div>
    </div>
  )
}
```

---

### `components/dashboard/KPICard.tsx`
```tsx
'use client'
import { motion } from 'framer-motion'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { LucideIcon } from 'lucide-react'

interface KPICardProps {
  title: string
  value: number
  suffix?: string
  decimals?: number
  change?: number
  icon: LucideIcon
  highlight?: boolean   // зелёный акцент
  index?: number
}

export function KPICard({ title, value, suffix, decimals = 0, change, icon: Icon, highlight, index = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      whileHover={{ y: -3 }}
      className={`
        relative overflow-hidden rounded-2xl p-6 border transition-all duration-200 group
        ${highlight
          ? 'bg-brand-green border-brand-green/30'
          : 'bg-bg-surface border-white/5 hover:border-brand-green/20'}
      `}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-5">
        <div className={`p-2.5 rounded-xl ${highlight ? 'bg-black/20' : 'bg-white/4'}`}>
          <Icon className={`w-4 h-4 ${highlight ? 'text-black' : 'text-brand-green'}`} />
        </div>
        {change !== undefined && (
          <span className={`text-[11px] font-mono font-bold px-2 py-1 rounded-lg ${
            change >= 0
              ? 'text-brand-green bg-brand-green/10'
              : 'text-status-low bg-status-low/10'
          }`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>

      {/* Value */}
      <p className={`text-4xl font-black font-mono tracking-tight mb-1 ${
        highlight ? 'text-black' : 'text-brand-green'
      }`}>
        <AnimatedNumber value={value} decimals={decimals} suffix={suffix ?? ''} />
      </p>
      <p className={`text-sm font-medium ${highlight ? 'text-black/70' : 'text-[#A0A0A0]'}`}>
        {title}
      </p>

      {/* Decoration */}
      {!highlight && (
        <div className="absolute bottom-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-full h-full bg-brand-green/5 rounded-tl-3xl" />
        </div>
      )}
    </motion.div>
  )
}
```

---

### `components/dashboard/Sidebar.tsx`
```tsx
'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Star, BarChart2, Zap, ChevronRight } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard',           icon: LayoutDashboard, label: 'Обзор' },
  { href: '/dashboard/shortlist', icon: Star,             label: 'Шорт-лист' },
  { href: '/dashboard/analytics', icon: BarChart2,        label: 'Аналитика' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <motion.aside
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed left-0 top-0 h-screen w-60 bg-bg-surface border-r border-white/5 flex flex-col z-50"
    >
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          {/* inDrive-style logo mark */}
          <div className="w-9 h-9 rounded-xl bg-brand-green flex items-center justify-center shadow-green-sm">
            <Zap className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-black text-sm text-white tracking-tight">InsightU AI</p>
            <p className="text-[10px] text-[#555] font-medium">inVision U · Admin</p>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold">Навигация</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.1 }}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150',
                  active
                    ? 'bg-brand-green text-black'
                    : 'text-[#A0A0A0] hover:text-white hover:bg-white/4'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {label}
                </div>
                {active && <ChevronRight className="w-3 h-3" />}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Decentrathon badge */}
      <div className="mx-3 mb-3 p-3 rounded-xl bg-brand-green/5 border border-brand-green/15">
        <p className="text-[10px] text-brand-green font-bold uppercase tracking-wider mb-0.5">Decentrathon 5.0</p>
        <p className="text-[10px] text-[#555]">AI inDrive Track</p>
      </div>

      {/* User */}
      <div className="p-4 border-t border-white/5 flex items-center gap-3">
        <UserButton afterSignOutUrl="/sign-in" />
        <div>
          <p className="text-xs font-semibold text-white">Комиссия</p>
          <p className="text-[10px] text-[#555]">inVision U</p>
        </div>
      </div>
    </motion.aside>
  )
}
```

---

### `components/dashboard/CandidateTable.tsx`
```tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search, ArrowUpDown, AlertTriangle, Star, ChevronRight } from 'lucide-react'
import type { Candidate } from '@/lib/types'

function ScorePill({ score }: { score: number }) {
  if (score >= 75) return (
    <span className="font-mono font-bold text-sm text-brand-green bg-brand-green/10 px-3 py-1 rounded-lg">
      {score.toFixed(1)}
    </span>
  )
  if (score >= 50) return (
    <span className="font-mono font-bold text-sm text-status-mid bg-status-mid/10 px-3 py-1 rounded-lg">
      {score.toFixed(1)}
    </span>
  )
  return (
    <span className="font-mono font-bold text-sm text-status-low bg-status-low/10 px-3 py-1 rounded-lg">
      {score.toFixed(1)}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed:   { label: 'Завершён',   cls: 'text-white/50 bg-white/5' },
    shortlisted: { label: 'Шорт-лист', cls: 'text-brand-green bg-brand-green/10' },
    flagged:     { label: 'Флаг',       cls: 'text-status-flag bg-status-flag/10' },
    rejected:    { label: 'Отклонён',   cls: 'text-status-low bg-status-low/10' },
    in_progress: { label: 'В процессе', cls: 'text-[#555] bg-white/3' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'text-[#555]' }
  return <span className={`text-[11px] px-2 py-1 rounded-lg font-semibold ${cls}`}>{label}</span>
}

function AiPill({ prob }: { prob: number }) {
  const pct = Math.round(prob * 100)
  const cls = pct >= 70 ? 'text-status-ai bg-status-ai/10'
    : pct >= 40 ? 'text-status-mid bg-status-mid/10'
    : 'text-brand-green bg-brand-green/10'
  return <span className={`font-mono text-[11px] font-bold px-2 py-1 rounded-lg ${cls}`}>{pct}%</span>
}

export function CandidateTable({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortDesc, setSortDesc] = useState(true)

  const filtered = candidates
    .filter(c => c.id.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortDesc ? b.final_score - a.final_score : a.final_score - b.final_score)

  return (
    <div className="rounded-2xl bg-bg-surface border border-white/5 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg-elevated border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-brand-green/30 transition-colors"
          />
        </div>
        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-white/5 rounded-xl text-xs text-[#A0A0A0] hover:text-white hover:border-white/10 transition-all"
        >
          <ArrowUpDown className="w-3 h-3" />
          {sortDesc ? 'Убывание' : 'Возрастание'}
        </button>
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            {['#', 'Кандидат', 'Итог', 'Мышление', 'Рост', 'AI', 'Статус', ''].map((h, i) => (
              <th key={i} className="text-left px-4 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {filtered.map((c, i) => (
              <motion.tr
                key={c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.025 }}
                onClick={() => router.push(`/dashboard/candidates/${c.id}`)}
                className="border-b border-white/3 hover:bg-white/2 cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3.5 text-[#555] font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-lg bg-brand-green/10 border border-brand-green/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-brand-green">{String.fromCharCode(65 + i)}</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#A0A0A0]">{c.id.slice(0,8)}</span>
                    {c.needs_manual_review && (
                      <AlertTriangle className="w-3 h-3 text-status-flag" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5"><ScorePill score={c.final_score} /></td>
                <td className="px-4 py-3.5 font-mono text-sm text-[#A0A0A0]">{c.cognitive?.toFixed(0)}</td>
                <td className="px-4 py-3.5 font-mono text-sm text-[#A0A0A0]">{c.growth?.toFixed(0)}</td>
                <td className="px-4 py-3.5"><AiPill prob={c.ai_detection_prob} /></td>
                <td className="px-4 py-3.5"><StatusPill status={c.status} /></td>
                <td className="px-4 py-3.5">
                  <ChevronRight className="w-4 h-4 text-[#333] group-hover:text-brand-green transition-colors" />
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>

      <div className="px-4 py-3 text-[11px] text-[#555]">
        {filtered.length} из {candidates.length} кандидатов
      </div>
    </div>
  )
}
```

---

### `components/dashboard/ScoreRadar.tsx`
```tsx
'use client'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip
} from 'recharts'

const LABELS: Record<string, string> = {
  cognitive: 'Мышление', leadership: 'Лидерство', growth: 'Рост',
  decision: 'Решения', motivation: 'Мотивация', authenticity: 'Аутентичность',
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-overlay border border-white/8 rounded-xl px-3 py-2 text-xs">
      <p className="text-white font-semibold">{payload[0].payload.subject}</p>
      <p className="text-brand-green font-mono font-bold text-base">{payload[0].value}</p>
    </div>
  )
}

export function ScoreRadar({ scores }: { scores: Record<string, number> }) {
  const data = Object.entries(LABELS).map(([key, label]) => ({
    subject: label,
    score: scores[key] ?? 0,
    fullMark: 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.05)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#A0A0A0', fontSize: 11, fontFamily: 'Inter' }}
        />
        <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false} />
        <Radar
          dataKey="score"
          stroke="#C8F000"
          fill="#C8F000"
          fillOpacity={0.1}
          strokeWidth={1.5}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
```

---

### `components/dashboard/ConfidenceRing.tsx`
```tsx
'use client'
import { motion } from 'framer-motion'

export function ConfidenceRing({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = pct >= 80 ? '#C8F000' : pct >= 50 ? '#F5A623' : '#E53935'
  const label = pct >= 80 ? 'Высокая' : pct >= 50 ? 'Умеренная' : 'Низкая'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90">
          <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
          <motion.circle
            cx="48" cy="48" r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black font-mono" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold" style={{ color }}>{label}</p>
        <p className="text-[10px] text-[#555]">уверенность AI</p>
      </div>
    </div>
  )
}
```

---

### `components/dashboard/AIDetectionBadge.tsx`
```tsx
'use client'
import { motion } from 'framer-motion'
import { ShieldCheck, AlertTriangle, Zap } from 'lucide-react'

export function AIDetectionBadge({ probability, signals = [] }: {
  probability: number
  signals?: string[]
}) {
  const pct = Math.round(probability * 100)

  const cfg = pct < 30
    ? { icon: ShieldCheck, label: 'Аутентично',    color: '#C8F000', bg: 'bg-brand-green/5',    border: 'border-brand-green/15' }
    : pct < 70
    ? { icon: AlertTriangle, label: 'Неопределённо', color: '#F5A623', bg: 'bg-status-mid/5',   border: 'border-status-mid/15' }
    : { icon: Zap,           label: 'Вероятно AI',  color: '#BF5AF2', bg: 'bg-status-ai/5',    border: 'border-status-ai/15' }

  const Icon = cfg.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-xl p-4 border ${cfg.bg} ${cfg.border}`}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
        <div>
          <p className="text-[10px] text-[#555] uppercase tracking-wider">AI-детектор</p>
          <p className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label} — {pct}%</p>
        </div>
      </div>

      <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full"
          style={{ background: cfg.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9 }}
        />
      </div>

      {signals.slice(0,3).map((s, i) => (
        <p key={i} className="text-[11px] text-[#555] leading-relaxed">· {s}</p>
      ))}
    </motion.div>
  )
}
```

---

### `components/dashboard/ExplainabilityBlock.tsx`
```tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { BarChart2, Quote, Users } from 'lucide-react'
import { ScoreBar } from '@/components/ui/ScoreBar'

const TABS = [
  { id: 'features', label: 'Признаки', icon: BarChart2 },
  { id: 'quotes',   label: 'Цитаты',   icon: Quote },
  { id: 'compare',  label: 'Сравнение', icon: Users },
]

const DIMS: Record<string, string> = {
  cognitive: 'Мышление', leadership: 'Лидерство', growth: 'Рост',
  decision: 'Решения', motivation: 'Мотивация', authenticity: 'Аутентичность',
}
const WEIGHTS: Record<string, number> = {
  cognitive: 0.25, leadership: 0.20, growth: 0.20,
  decision: 0.15, motivation: 0.10, authenticity: 0.10,
}

export function ExplainabilityBlock({ scores, reasoning, keyQuotes = [], percentiles = {} }: {
  scores: Record<string, number>
  reasoning: string
  keyQuotes?: string[]
  percentiles?: Record<string, number>
}) {
  const [tab, setTab] = useState('features')

  return (
    <div className="rounded-2xl bg-bg-surface border border-white/5 p-5">
      <p className="text-[10px] text-[#555] uppercase tracking-widest font-bold mb-4">Explainability</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-elevated rounded-xl p-1 mb-5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              tab === id
                ? 'bg-brand-green text-black'
                : 'text-[#555] hover:text-white'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'features' && (
          <motion.div key="f" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3">
            {Object.entries(DIMS).map(([k, label], i) => (
              <ScoreBar key={k} label={label} score={scores[k]??0} weight={WEIGHTS[k]} index={i} />
            ))}
            {reasoning && (
              <div className="mt-4 p-3 bg-bg-elevated rounded-xl border border-white/4">
                <p className="text-xs text-[#A0A0A0] leading-relaxed">{reasoning}</p>
              </div>
            )}
          </motion.div>
        )}

        {tab === 'quotes' && (
          <motion.div key="q" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-2">
            {keyQuotes.length === 0
              ? <p className="text-[#555] text-xs text-center py-8">Цитаты не найдены</p>
              : keyQuotes.map((q, i) => (
                <div key={i} className="flex gap-2 p-3 bg-bg-elevated rounded-xl border border-white/4">
                  <div className="w-0.5 bg-brand-green rounded-full shrink-0" />
                  <p className="text-xs text-[#A0A0A0] italic leading-relaxed">«{q}»</p>
                </div>
              ))
            }
          </motion.div>
        )}

        {tab === 'compare' && (
          <motion.div key="c" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3">
            <p className="text-[11px] text-[#555] mb-3">Процентиль в текущем пуле</p>
            {Object.entries(DIMS).map(([key, label]) => {
              const pct = percentiles[key] ?? Math.round(Math.random()*40+40)
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-[11px] text-[#555] w-22 shrink-0">{label}</span>
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-brand-green"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-brand-green w-14 text-right">
                    Top {100-pct}%
                  </span>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

## 📄 СТРАНИЦЫ

### `app/sign-in/[[...sign-in]]/page.tsx`
```tsx
'use client'
import { SignIn } from '@clerk/nextjs'
import { FloatingShapes } from '@/components/3d/FloatingShapes'
import { GridPlane } from '@/components/3d/GridPlane'
import dynamic from 'next/dynamic'

const FloatingShapesDynamic = dynamic(() => import('@/components/3d/FloatingShapes').then(m=>({default:m.FloatingShapes})), {ssr:false})
const GridPlaneDynamic = dynamic(() => import('@/components/3d/GridPlane').then(m=>({default:m.GridPlane})), {ssr:false})

export default function SignInPage() {
  return (
    <div className="relative min-h-screen bg-bg-base flex items-center justify-center overflow-hidden">
      <GridPlaneDynamic />
      <FloatingShapesDynamic />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Brand */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-brand-green flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="black" strokeWidth="0"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xl font-black text-white tracking-tight">InsightU AI</p>
              <p className="text-xs text-[#555]">inVision U × inDrive</p>
            </div>
          </div>

          {/* Tagline */}
          <p className="text-4xl font-black text-white tracking-tight leading-none mb-2">
            Отбор нового<br />
            <span className="text-brand-green">поколения лидеров</span>
          </p>
          <p className="text-sm text-[#555] mt-3">Войдите как член приёмной комиссии</p>
        </div>

        <SignIn appearance={{
          variables: {
            colorBackground: '#141414',
            colorText: '#FFFFFF',
            colorPrimary: '#C8F000',
            colorTextSecondary: '#A0A0A0',
            colorInputBackground: '#1C1C1C',
            colorInputText: '#FFFFFF',
            borderRadius: '12px',
          },
          elements: {
            card: 'border border-white/5',
            formButtonPrimary: 'bg-brand-green text-black font-bold hover:bg-brand-dim',
          }
        }} />

        {/* Decentrathon badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-green/20 bg-brand-green/5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
          <span className="text-xs text-brand-green font-semibold">Decentrathon 5.0 · AI inDrive</span>
        </div>
      </div>
    </div>
  )
}
```

### `app/dashboard/page.tsx`
```tsx
'use client'
import { motion } from 'framer-motion'
import { Users, TrendingUp, Star, AlertTriangle } from 'lucide-react'
import { KPICard } from '@/components/dashboard/KPICard'
import { CandidateTable } from '@/components/dashboard/CandidateTable'
import { MOCK_CANDIDATES } from '@/lib/mock-data'

export default function DashboardPage() {
  const c = MOCK_CANDIDATES
  const avg = c.reduce((s,x)=>s+x.final_score,0)/c.length
  const shortlisted = c.filter(x=>x.status==='shortlisted').length
  const flagged = c.filter(x=>x.needs_manual_review).length

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1 h-5 rounded-full bg-brand-green" />
          <p className="text-xs text-[#555] uppercase tracking-widest font-bold">InsightU AI</p>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Панель отбора</h1>
        <p className="text-sm text-[#555] mt-1">Decentrathon 5.0 · {c.length} кандидатов в системе</p>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Кандидатов" value={c.length} icon={Users} index={0} highlight />
        <KPICard title="Средний скор" value={avg} decimals={1} icon={TrendingUp} index={1} />
        <KPICard title="Шорт-лист" value={shortlisted} icon={Star} index={2} />
        <KPICard title="На проверку" value={flagged} icon={AlertTriangle} index={3} />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/5" />
        <p className="text-[10px] text-[#555] uppercase tracking-widest">Все кандидаты</p>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      {/* Table */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.3 }}>
        <CandidateTable candidates={c} />
      </motion.div>
    </div>
  )
}
```

### `app/dashboard/candidates/[id]/page.tsx`
```tsx
'use client'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Star, Flag } from 'lucide-react'
import { ScoreRadar } from '@/components/dashboard/ScoreRadar'
import { ExplainabilityBlock } from '@/components/dashboard/ExplainabilityBlock'
import { AIDetectionBadge } from '@/components/dashboard/AIDetectionBadge'
import { ConfidenceRing } from '@/components/dashboard/ConfidenceRing'
import { GreenButton } from '@/components/ui/GreenButton'
import { MOCK_CANDIDATES } from '@/lib/mock-data'
import dynamic from 'next/dynamic'

const ScoreSphere = dynamic(() => import('@/components/3d/ScoreSphere').then(m=>({default:m.ScoreSphere})), {ssr:false})

export default function CandidatePage() {
  const { id } = useParams()
  const router = useRouter()
  const c = MOCK_CANDIDATES.find(x=>x.id===id) ?? MOCK_CANDIDATES[0]

  const dims = {
    cognitive: c.cognitive, leadership: c.leadership, growth: c.growth,
    decision: c.decision, motivation: c.motivation, authenticity: c.authenticity,
  }

  return (
    <div className="p-8">
      {/* Back */}
      <button onClick={()=>router.back()} className="flex items-center gap-2 text-[#555] hover:text-white mb-6 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <motion.div initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1 h-4 rounded-full bg-brand-green" />
            <p className="text-[10px] text-[#555] font-mono uppercase">ID: {c.id.slice(0,12)}...</p>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Кандидат #{String.fromCharCode(65 + MOCK_CANDIDATES.indexOf(c))}
          </h1>
        </motion.div>
        <div className="flex gap-2">
          <GreenButton variant="solid" icon={<Star className="w-3.5 h-3.5"/>}>Шорт-лист</GreenButton>
          <GreenButton variant="danger" icon={<Flag className="w-3.5 h-3.5"/>}>Флаг</GreenButton>
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Column 1 */}
        <div className="space-y-4">
          {/* Score sphere */}
          <div className="rounded-2xl bg-bg-surface border border-white/5 p-6 flex flex-col items-center">
            <p className="text-[10px] text-[#555] uppercase tracking-widest mb-3">Итоговый скор</p>
            <ScoreSphere score={Math.round(c.final_score)} />
            <div className="mt-3 text-center">
              <p className="text-brand-green font-black font-mono text-5xl">{c.final_score.toFixed(1)}</p>
              <p className="text-[#555] text-xs mt-1">из 100 возможных</p>
            </div>
          </div>

          {/* Confidence */}
          <div className="rounded-2xl bg-bg-surface border border-white/5 p-5 flex justify-center">
            <ConfidenceRing confidence={c.confidence} />
          </div>

          {/* AI Detection */}
          <AIDetectionBadge probability={c.ai_detection_prob} signals={c.ai_signals} />
        </div>

        {/* Column 2 */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-bg-surface border border-white/5 p-5">
            <p className="text-[10px] text-[#555] uppercase tracking-widest mb-4">Профиль измерений</p>
            <ScoreRadar scores={dims} />
          </div>
          <ExplainabilityBlock
            scores={dims}
            reasoning={c.reasoning ?? ''}
            keyQuotes={c.key_quotes}
          />
        </div>

        {/* Column 3 */}
        <div className="space-y-3">
          {[
            { label: 'Цели кандидата',   value: c.goals },
            { label: 'Опыт',             value: c.experience },
            { label: 'Мотивация',        value: c.motivation_text },
            { label: 'Фрагмент эссе',    value: c.essay_excerpt },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-bg-surface border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-0.5 h-3 bg-brand-green rounded-full" />
                <p className="text-[10px] text-[#555] uppercase tracking-wider font-bold">{label}</p>
              </div>
              <p className="text-xs text-[#A0A0A0] leading-relaxed">{value ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

## 📐 DATA & LAYOUT

### `app/dashboard/layout.tsx`
```tsx
import { Sidebar } from '@/components/dashboard/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg-base dot-grid">
      <Sidebar />
      <main className="ml-60 flex-1">{children}</main>
    </div>
  )
}
```

### `lib/types.ts`
```typescript
export interface Candidate {
  id: string
  status: 'in_progress'|'completed'|'shortlisted'|'rejected'|'flagged'
  final_score: number
  cognitive: number
  leadership: number
  growth: number
  decision: number
  motivation: number
  authenticity: number
  confidence: number
  ai_detection_prob: number
  ai_signals?: string[]
  needs_manual_review: boolean
  reasoning?: string
  key_quotes?: string[]
  goals?: string
  experience?: string
  motivation_text?: string
  essay_excerpt?: string
}
```

### `lib/mock-data.ts`
Создай массив `MOCK_CANDIDATES` из 15 реалистичных кандидатов с разными скорами (диапазон 32–91), разными статусами. Тексты на русском — реалистичные истории молодых казахстанцев с конкретными деталями: проекты, соревнования, города. Несколько кандидатов должны иметь `needs_manual_review: true` и `ai_detection_prob > 0.7`.

### `lib/utils.ts`
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## 🔐 AUTH

### `middleware.ts`
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
const isProtected = createRouteMatcher(['/dashboard(.*)'])
export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth().protect()
})
export const config = {
  matcher: ['/((?!_next|.*\\..*).*)','/(api|trpc)(.*)'],
}
```

---

## ✅ ПОРЯДОК СБОРКИ

1. `create-next-app` + все `npm install`
2. `tailwind.config.ts` + `globals.css`
3. `lib/utils.ts` + `lib/types.ts` + `lib/mock-data.ts` (15 кандидатов)
4. `components/ui/` — все 4 базовых компонента
5. `components/3d/` — `FloatingShapes`, `ScoreSphere`, `GridPlane` (dynamic import с `ssr:false`)
6. `components/dashboard/Sidebar.tsx`
7. `components/dashboard/KPICard.tsx`, `CandidateTable.tsx`, `ScoreRadar.tsx`
8. `components/dashboard/ConfidenceRing.tsx`, `AIDetectionBadge.tsx`, `ExplainabilityBlock.tsx`
9. `middleware.ts` + `sign-in` страница
10. `dashboard/layout.tsx` → `dashboard/page.tsx` → `candidates/[id]/page.tsx`
11. `shortlist/page.tsx` + `analytics/page.tsx`

---

## ⚠️ КРИТИЧЕСКИЕ ПРАВИЛА

- **Никакого синего, фиолетового, голубого** в качестве основного акцента — только `#C8F000` (бренд inDrive)
- `@react-three/fiber` — только `'use client'` + `dynamic(() => import(...), { ssr: false })`
- `'use client'` на всех компонентах с хуками, motion, Three.js
- Все цифры/скоры — `font-mono font-bold text-brand-green`
- Hover состояния: всегда `border-brand-green/20` + `shadow-green-sm`
- Активный nav item: `bg-brand-green text-black` (не синий!)

---

*InsightU AI Frontend v2.0 · inDrive Brand · Decentrathon 5.0*
