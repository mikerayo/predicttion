# Design Guidelines: SOL15 Prediction Markets

## Design Approach
**Selected Approach:** Design System (Utility-Focused)
**Rationale:** This is a financial trading application requiring efficiency, data clarity, and trust. Users need to make quick decisions on time-sensitive markets.

**Design Direction:** Modern DeFi/Trading Platform
Draw inspiration from: Uniswap's clarity, Linear's precision, Coinbase's trustworthiness
Focus on: Data hierarchy, real-time updates, decision-making speed

## Core Design Elements

### A. Typography
- **Primary Font:** Inter (via Google Fonts CDN)
- **Monospace Font:** JetBrains Mono (for prices, timers, numbers)

**Hierarchy:**
- Page Titles: text-4xl font-bold (Inter)
- Section Headers: text-2xl font-semibold
- Market Cards: text-xl font-semibold
- Prices/Numbers: text-2xl font-mono font-bold (JetBrains Mono)
- Countdown Timers: text-lg font-mono
- Body Text: text-base font-normal
- Labels/Meta: text-sm font-medium
- Captions: text-xs text-opacity-70

### B. Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4, p-6, p-8
- Section margins: mb-8, mb-12, mb-16
- Card spacing: gap-6, gap-8
- Button padding: px-6 py-3, px-8 py-4

**Grid System:**
- Desktop: 2-3 column market cards (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Mobile: Single column stack
- Container: max-w-7xl mx-auto px-4

### C. Component Library

**Navigation:**
- Fixed top bar: Logo left, Wallet connect right
- Height: h-16
- Contains: Network indicator (Devnet), Treasury balance display
- Clean horizontal layout with subtle bottom border

**Market Card (Primary Component):**
- Elevated card with subtle border
- Header: Market timeframe (start → end time), Status badge
- Body split in 2 columns:
  - Left: UP betting panel (price display, total pool, bet input, UP button)
  - Right: DOWN betting panel (identical structure)
- Center divider: VS indicator
- Footer: Countdown timer (large, prominent), current price live
- Status badges: Open (green), Closed (yellow), Resolved (blue), Cancelled (gray)

**Price Display Component:**
- Monospace font, large size
- Start price vs End price comparison
- Arrow indicator (↑ green for up, ↓ red for down)
- Expo formatting handled clearly

**Betting Panel:**
- SOL input field with validation
- Fee preview (shows: Gross → Fee (1%) → Net)
- Large action button (UP = green accent, DOWN = red accent)
- Min bet indicator below input

**Position Display:**
- Your bets: UP amount | DOWN amount
- Net total at risk
- Potential payout calculator (live)
- Claim button (enabled when resolved, shows payout amount)

**Dashboard Stats:**
- 4-column stat cards on desktop (2 on tablet, 1 on mobile)
- Metrics: Active Markets, Total Volume, Your Active Bets, Claimable Winnings
- Large numbers, small labels

**Forms:**
- Input fields: Rounded, clear borders, focus states
- Labels above inputs
- Helper text below (fees, minimums)
- Error states with clear messaging

**Buttons:**
- Primary (UP): Large, high contrast, green accent
- Primary (DOWN): Large, high contrast, red accent  
- Secondary (Claim): Standard size, blue accent
- Disabled states: Reduced opacity, cursor-not-allowed
- Sizes: px-6 py-3 (default), px-8 py-4 (large)

**Data Tables (Optional):**
- Market history view
- Sortable columns: Time, Result, Pool Size, Your Position, Payout
- Sticky header, zebra striping

**Toast Notifications:**
- Transaction success/failure feedback
- Position on screen: top-right
- Auto-dismiss with manual close option

### D. Visual Treatments

**Depth & Elevation:**
- Cards: Subtle border + minimal shadow (shadow-sm)
- Interactive elements: Hover lift effect (hover:shadow-md transition)
- Modals: Strong shadow (shadow-xl)

**Data Visualization:**
- Pool distribution: Horizontal bar showing UP vs DOWN ratio
- Winner indicator: Checkmark icon + highlight
- Live countdown: Large, center-aligned, updates per second

**Micro-interactions:**
- Button hover: Slight scale (hover:scale-105)
- Card hover: Shadow increase
- Loading states: Pulse animation on data refresh
- Price updates: Flash animation on change

**Responsive Behavior:**
- Desktop: Side-by-side UP/DOWN panels in market cards
- Tablet: Stack UP/DOWN vertically within cards
- Mobile: Full-width stacked layout, larger touch targets

## Images
No hero image required for this application. This is a utility-first trading interface where immediate data access is critical. Users should see market cards and stats immediately upon landing.

**Icon Usage:**
- Use Heroicons (via CDN)
- Icons needed: Clock (timer), TrendingUp/TrendingDown, CheckCircle, XCircle, ExclamationTriangle, Wallet, Chart
- Size: w-5 h-5 (inline), w-8 h-8 (prominent)

## Layout Specifications

**Landing View:**
- Dashboard stats row (4 cards)
- Active markets grid below (3 columns desktop)
- No hero - immediate utility

**Market Detail View:**
- Full-width market card (expanded)
- Your position prominently displayed
- Historical price chart (optional enhancement)
- Claim section if resolved

**Wallet Connection:**
- Solana Wallet Adapter standard UI
- Network switcher (locked to Devnet with indicator)