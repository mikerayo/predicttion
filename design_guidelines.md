# Design Guidelines: SOL15 Prediction Markets - Cyberpunk Edition

## Design Approach
**Selected Approach:** Design System (Utility-Focused) with Cyberpunk/Fintech Aesthetic
**Visual Reference:** pimpcard.org - terminal-style trading interface with hacker aesthetic
**Core Principle:** Immediate data access meets dark cyberpunk elegance. Zero friction between user and market action.

## Color System
**Foundation:**
- Background: Pure black (#000000)
- Surface/Cards: #0A0A0A with subtle border (#12274A at 20% opacity)
- Deep Blue Accent: #12274A (primary interactive elements, borders, glows)

**Trading Indicators:**
- UP/Bullish: #00FF88 (bright green, cyberpunk neon)
- DOWN/Bearish: #FF0055 (hot pink/red, neon contrast)
- Neutral/Info: #00D4FF (cyan accent)

**Text Hierarchy:**
- Primary: #FFFFFF (high-value data, headers)
- Secondary: #A0A0A0 (labels, meta information)
- Tertiary: #606060 (captions, timestamps)
- Monospace data: #00FF88 or #FF0055 depending on direction

**Status Colors:**
- Open: #00FF88
- Closed: #FFB800
- Resolved: #00D4FF
- Cancelled: #606060

## Typography
**Fonts (Google Fonts CDN):**
- UI Text: Inter (400, 500, 600, 700)
- Financial Data: JetBrains Mono (400, 500, 700)

**Scale:**
- Hero Numbers: text-6xl font-mono font-bold (price displays)
- Page Titles: text-3xl font-bold
- Card Headers: text-xl font-semibold
- Prices/Pools: text-2xl font-mono font-bold
- Countdown: text-3xl font-mono (glowing effect)
- Body: text-base
- Labels: text-sm font-medium uppercase tracking-wider (terminal-style)
- Technical Data: text-xs font-mono

## Layout System
**Spacing:** Tailwind units 2, 4, 6, 8, 12, 16, 20
**Grid:** max-w-7xl container, 3-column market cards (lg:grid-cols-3 md:grid-cols-2)
**Card Padding:** p-6 (mobile), p-8 (desktop)
**Section Gaps:** gap-6 (cards), mb-12 (sections)

## Component Library

**Navigation Bar:**
- Fixed top, h-16, backdrop-blur-md bg-black/80
- Left: Logo with glowing accent
- Center: Network badge (DEVNET - with pulsing indicator)
- Right: Treasury balance (monospace) + Wallet connect button
- Bottom border: 1px #12274A glow

**Dashboard Stats Grid:**
- 4 cards (responsive: lg:grid-cols-4 md:grid-cols-2)
- Each card: Black background, subtle blue border glow, rounded-xl
- Large monospace numbers (text-4xl), small uppercase labels
- Metrics: Active Markets | Total Volume (SOL) | Your Positions | Claimable
- Hover: Border glow intensifies

**Market Card (Core Component):**
- Container: rounded-xl, border border-[#12274A]/20, bg-[#0A0A0A]
- Header: Flex row with market ID (monospace small), status badge (rounded-full pill), countdown timer (right-aligned, large monospace with subtle glow)
- Price Display Section: Center-aligned, massive monospace numbers showing Start → Current price with animated arrow
- Betting Panels: 2-column grid (stacks on mobile)
  - LEFT: UP panel - green accent border on hover, green button
  - RIGHT: DOWN panel - red accent border on hover, red button
  - Each panel: SOL input (dark, monospace), pool display, fee breakdown (terminal-style small text), large action button
- Center Divider: Vertical line with "VS" badge
- Footer: Your position summary (if any), claim button (glowing when enabled)

**Terminal-Style Data Blocks:**
- Monospace font throughout
- Labels: Uppercase, tracked, dim gray
- Values: Bright white or colored (green/red/cyan)
- Format: `LABEL............VALUE` (dot leaders for alignment)
- Border: Subtle cyan glow on left edge (border-l-2 border-cyan-500/50)

**Input Fields:**
- Dark background (#050505), border (#12274A/30)
- Focus: Border glows (#12274A), blue shadow
- Monospace for numerical inputs
- Placeholder: dim gray italic
- Helper text below: Small monospace, cyan for info, red for errors

**Buttons:**
- UP Button: bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/50, hover:bg-[#00FF88]/20
- DOWN Button: bg-[#FF0055]/10 text-[#FF0055] border border-[#FF0055]/50, hover:bg-[#FF0055]/20  
- Claim Button: bg-[#12274A] text-white border border-[#00D4FF]/50, hover:glow effect
- All: rounded-lg, px-8 py-4, font-semibold, transition-all
- Disabled: opacity-40, cursor-not-allowed

**Status Badges:**
- Pill shape (rounded-full), px-3 py-1, text-xs font-mono uppercase
- Glowing border matching status color
- Background: status color at 10% opacity

**Price Update Indicators:**
- Flash animation on price change (green flash for up, red for down)
- Arrow icons (↑↓) with matching color
- Percentage change in parentheses

## Visual Treatments

**Glow Effects:**
- Active cards: box-shadow with blue glow
- Countdown timers: text-shadow cyan glow when < 5min remaining
- Buttons on hover: subtle color-matched outer glow
- Borders: Use opacity and shadow for depth

**Terminal Aesthetic:**
- Scanline overlay (subtle) on data-heavy sections
- Dotted grid background (very subtle, #12274A/5)
- Monospace everywhere for numbers and technical data
- Uppercase labels with letter-spacing

**Animations (Minimal):**
- Price updates: 200ms flash
- Countdown: Pulse when < 60s
- Hover states: 150ms transition-all
- Loading: Subtle pulse on skeleton states
- No elaborate scroll animations

**Depth System:**
- Cards: 1px border + subtle inner shadow
- Modals: Strong outer glow (shadow-2xl with blue tint)
- Hover elevation: Increase glow, not position

## Layout Structure

**Landing Page:**
- No hero image - immediate utility
- Dashboard stats grid (top)
- Active markets grid (3 columns)
- Resolved markets section (collapsed/expandable)

**Market Detail View:**
- Full-width expanded market card
- Historical outcome display (terminal table)
- Your position breakdown (detailed terminal-style)

**Icons:** Heroicons via CDN (outline style, #00D4FF color for info icons, status-colored for directional)