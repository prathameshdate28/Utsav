# Utsav Design System: Marigold Noir

## 1. Brand Philosophy
**Utsav** (उत्सव — celebration) is an AI event co-planner for weddings, milestone birthdays, and community festivals across India.
The visual identity is **Marigold Noir**: a fusion of the opulent, warm festive traditions of India (Genda phool/marigold yellows, saffron, kumkum, raw silk) grounded in modern, high-contrast, editorial minimalism ("Noir").

---

## 2. Typography
Typography sets an editorial, celebratory tone while maintaining utility and clarity.

- **Headings & Display**: `Fraunces` (Serif with optical size and warm character).
  - Used for `h1`, `h2`, `h3`, page headers, celebratory hero banners, and key stat callouts.
- **UI & Body**: `Inter` (Clean sans-serif).
  - Used for navigation, buttons, forms, tables, badges, helper texts, and data visualizations.

---

## 3. Color Tokens (Marigold Noir)

The palette balances deep noir depth with festive marigold warmth.

### Light Theme (Warm Ivory & Royal Marigold)
- **Background (`--background`)**: `45 25% 98%` (Warm Festive Ivory / Off-white)
- **Foreground (`--foreground`)**: `30 15% 12%` (Deep Charcoal Noir)
- **Card (`--card`)**: `0 0% 100%` (Pure White Card)
- **Card Foreground (`--card-foreground`)**: `30 15% 12%`
- **Popover (`--popover`)**: `0 0% 100%`
- **Popover Foreground (`--popover-foreground`)**: `30 15% 12%`
- **Primary (`--primary`)**: `38 92% 50%` (Luminous Marigold Gold / #F59E0B)
- **Primary Foreground (`--primary-foreground`)**: `30 25% 10%` (Deep Noir on Gold)
- **Secondary (`--secondary`)**: `35 30% 92%` (Soft Sandalwood Cream)
- **Secondary Foreground (`--secondary-foreground`)**: `30 20% 18%`
- **Muted (`--muted`)**: `40 20% 94%`
- **Muted Foreground (`--muted-foreground`)**: `30 10% 45%`
- **Accent (`--accent`)**: `24 95% 53%` (Festive Saffron Orange)
- **Accent Foreground (`--accent-foreground`)**: `0 0% 100%`
- **Destructive (`--destructive`)**: `0 84% 60%` (Sindoor Vermilion)
- **Destructive Foreground (`--destructive-foreground`)**: `0 0% 100%`
- **Border (`--border`)**: `38 25% 88%` (Subtle Brass / Warm Border)
- **Input (`--input`)**: `38 25% 88%`
- **Ring (`--ring`)**: `38 92% 50%`

### Dark Theme (Obsidian Noir & Illuminated Gold)
- **Background (`--background`)**: `240 10% 6%` (Deep Obsidian / #0F0F12)
- **Foreground (`--foreground`)**: `45 20% 96%` (Warm Silk White)
- **Card (`--card`)**: `240 8% 9%` (Midnight Slate Card)
- **Card Foreground (`--card-foreground`)**: `45 20% 96%`
- **Popover (`--popover`)**: `240 8% 9%`
- **Popover Foreground (`--popover-foreground`)**: `45 20% 96%`
- **Primary (`--primary`)**: `38 95% 54%` (Glowing Marigold / #FBBF24)
- **Primary Foreground (`--primary-foreground`)**: `240 10% 6%`
- **Secondary (`--secondary`)**: `240 6% 16%`
- **Secondary Foreground (`--secondary-foreground`)**: `45 20% 90%`
- **Muted (`--muted`)**: `240 6% 16%`
- **Muted Foreground (`--muted-foreground`)**: `40 10% 65%`
- **Accent (`--accent`)**: `24 90% 55%` (Deep Saffron)
- **Accent Foreground (`--accent-foreground`)**: `0 0% 100%`
- **Destructive (`--destructive`)**: `0 70% 50%` (Crimson)
- **Destructive Foreground (`--destructive-foreground`)**: `0 0% 100%`
- **Border (`--border`)**: `240 6% 18%`
- **Input (`--input`)**: `240 6% 18%`
- **Ring (`--ring`)**: `38 95% 54%`

---

## 4. Motion Guidelines
- **Permitted Properties**: Only animate `transform` and `opacity`. Never animate layout-triggering properties (`width`, `height`, `margin`, `padding`, `top`, `left`).
- **Accessibility**: Always respect `prefers-reduced-motion`. In reduced-motion mode, all transitions are instant (`duration: 0` or disabled smooth-scroll).
- **Global Lenis Scroll**: Smooth inertial scroll for modern desktops; disabled if `prefers-reduced-motion` is detected.

---

## 5. UI Guardrails & Disclaimers
1. **Pricing**: Every cost, rate, or calculation must include an explicit disclaimer: *"Estimated price"*.
2. **Vendors**: Every vendor profile or card must clearly display: *"Demo vendor"*.
3. **No Real Businesses**: No real vendor or company names are ever rendered.
4. **Cultural Diversity**: Cultural content and ritual guidance must be phrased: *"commonly practised; traditions vary by family"*.
