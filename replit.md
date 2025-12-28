# SOL15 Prediction Markets

## Overview

SOL15 is a decentralized prediction market platform where users bet on SOL/USD price movements within 15-minute windows. Users place binary bets (UP or DOWN) on whether the price will increase or decrease. The platform uses pari-mutuel payouts where winners share the entire pool proportionally, with a 1% fee charged upfront when placing bets.

**Key Features:**
- 15-minute prediction markets for SOL/USD
- Binary outcomes: UP (price increases) or DOWN (price decreases)
- Pari-mutuel payout system
- Pyth Oracle integration for real-time price feeds
- Runs on Solana Devnet

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React with TypeScript using Vite as the build tool
- **Routing:** Wouter for lightweight client-side routing
- **State Management:** TanStack React Query for server state and caching
- **UI Components:** shadcn/ui component library with Radix UI primitives
- **Styling:** Tailwind CSS with custom design tokens for trading colors (up/down indicators)
- **Path aliases:** `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Framework:** Express.js with TypeScript
- **API Pattern:** RESTful endpoints under `/api/` prefix
- **Storage:** In-memory storage with interface abstraction (IStorage) for future database integration
- **Build:** esbuild for server bundling, Vite for client bundling

### Data Layer
- **ORM:** Drizzle ORM configured for PostgreSQL
- **Schema Location:** `shared/schema.ts` contains all type definitions and validation schemas using Zod
- **Database Config:** `drizzle.config.ts` configured for PostgreSQL with migrations in `/migrations`

### Solana/Blockchain Integration
- **Program Location:** `programs/pm15/` contains the Anchor/Rust smart contract
- **Keeper Service:** `keeper/` directory contains TypeScript service for:
  - Creating new markets every 15 minutes
  - Closing expired markets
  - Resolving markets with Pyth oracle prices
- **Oracle:** Pyth Pull Oracle (Solana Receiver) for SOL/USD price feeds
- **Network:** Solana Devnet

### Key Design Decisions

1. **Pari-mutuel System:** Winners share the pool proportionally rather than fixed odds, simplifying the smart contract logic and ensuring the platform always has sufficient funds for payouts.

2. **Upfront Fee Collection:** The 1% fee is collected when bets are placed rather than at payout, simplifying claim logic and ensuring fee collection.

3. **Permissionless Resolution:** Anyone can call close/resolve market functions, reducing dependency on the keeper service for liveness.

4. **In-memory Storage Pattern:** The backend uses an interface-based storage abstraction (`IStorage`) allowing easy migration from in-memory to PostgreSQL without changing business logic.

5. **Shared Schema:** Types and validation schemas are shared between frontend and backend via `shared/schema.ts`, ensuring type safety across the stack.

## External Dependencies

### Blockchain Services
- **Solana Devnet RPC:** `https://api.devnet.solana.com`
- **Pyth Oracle Program:** `rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ` (Solana Receiver on Devnet)
- **SOL/USD Feed ID:** `0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d`

### Database
- PostgreSQL (via `DATABASE_URL` environment variable)
- Drizzle ORM for schema management and queries

### Key NPM Packages
- `@tanstack/react-query` - Server state management
- `drizzle-orm` / `drizzle-zod` - Database ORM and validation
- `express` - Backend server
- `wouter` - Client routing
- `zod` - Schema validation
- `@solana/web3.js` - Solana blockchain interactions (in keeper)
- `@pythnetwork/pyth-solana-receiver` - Pyth oracle integration (in keeper)

### Development Tools
- `tsx` - TypeScript execution
- `vite` - Frontend dev server and bundler
- `esbuild` - Server bundling
- `tailwindcss` - CSS framework