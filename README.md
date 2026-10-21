# Utsav (उत्सव) — AI Event Co-Planner

> An AI event co-planner for weddings, milestone birthdays, and community festivals in India. Built for contest & portfolio.

---

## 🌟 Overview

Planning Indian celebrations involves complex multi-day ceremonies (Haldi, Mehendi, Sangeet, Muhurat), vast guest lists, intricate vendor logistics, and budget allocations. 

**Utsav** pairs AI conversational intelligence with **deterministic calculation engines** to give planners, couples, and families a reliable, transparent co-pilot.

### Core Pillars
1. **Deterministic Calculations (`src/lib/engine/`)**: All budget totals, what-if sliders, due dates, and readiness scores are computed purely in code with 100% unit test coverage. The LLM never calculates totals.
2. **Resilient AI Pipeline**: Every Gemini response is strictly validated with Zod schemas with automatic single-retry and cached fallbacks. Secrets are never exposed to the client.
3. **Marigold Noir Design System**: Celebrating Indian festive culture (Fraunces serif headings, Marigold and Noir palette) grounded in accessible, modern web design.
4. **Honest Disclaimers**: All prices are labeled as estimates, all service partners are demo vendors, and cultural rituals note that *"traditions vary by family"*.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, React 19, Strict TypeScript)
- **Styling**: Tailwind CSS, shadcn/ui design patterns, Lucide icons
- **Typography**: Fraunces (Headings) & Inter (UI) via `next/font`
- **Animation & Motion**: Framer Motion, Lenis Smooth Scroll (respects `prefers-reduced-motion`)
- **Data & Charts**: Recharts, Canvas Confetti
- **Validation & AI**: Zod, `@google/genai` (server-side only)
- **Testing**: Vitest
- **Deployment**: Vercel

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/utsav.git
cd utsav

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
```

### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Validation

```bash
# Run unit tests (Vitest)
npm run test

# Type check (strict TypeScript)
npm run typecheck

# Lint check
npm run lint

# Production build
npm run build
```

---

## ⚖️ License
This project is licensed under the [MIT License](LICENSE).
