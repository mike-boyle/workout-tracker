# Workout Tracker

🚀 **[Live Demo / Hosted Application](https://mike-boyle.github.io/workout-tracker/)**

A premium, client-side React web application designed to track workouts over multiple 13-week (91-day) cycles. Hosted on GitHub Pages, the application stores data locally in the browser using a high-performance **IndexedDB** key-value store and syncs securely to Google Drive via OAuth for cloud backup.

---

## 📋 Table of Contents

1. [Core Features](#core-features)
2. [Tech Stack](#tech-stack)
3. [Project Directory Layout](#project-directory-layout)
4. [Data Schemas](#data-schemas)
5. [Google Drive Backup Sync Flow](#google-drive-backup-sync-flow)
6. [Design System & Aesthetics](#design-system--aesthetics)
7. [Testing Strategy](#testing-strategy)
8. [Vercel React Best Practices Checklist](#vercel-react-best-practices-checklist)
9. [Setup & Development Commands](#setup--development-commands)

---

## 🚀 Core Features

1. **Multiple Workout Programs Support:**
   - **P90X Classic:** The standard 91-day, 13-week schedule divided into 3 distinct training phases.
   - **Test Workout Split:** A compact 7-day program split designed for quick validation, development, and unit/E2E testing.
2. **Dual-View Workout Sessions:**
   - **Wizard View (Guided):** A sequential card-based guided wizard for active workouts. Auto-loads previous set records for direct progressive-overload comparison, prompts for reps, weight, and assistance (e.g. bands, chairs, weighted vests), includes skip buttons, and features a rest-period stopwatch with audio buzzer notifications.
   - **Full Sheet View:** A comprehensive tabular sheet displaying all exercises and sets at once, ideal for reviewing past entries or editing logs in bulk.
3. **Smart Comparative Overload Badge:** Displays the reps and weights logged in the most recent session for the same exercise and set, prompting you to push past previous limits.
4. **Fast-Forward & Day Skips:** Track days 1–91 manually or use the fast-forward option to skip ahead to a specific day, which automatically creates back-filled skipped logs for intermediate days.
5. **Historical Analytics:** Visual progress charts (using Chart.js) tracking strength and endurance progression across multiple 91-day cycles.
6. **Robust Client-Side Database:** Stores user data using IndexedDB, featuring automatic migrations to cleanly upgrade older localStorage database schemas.
7. **Cloud Backup Integration:** Secure client-side OAuth2 connection via Google Identity Services (GIS) to sync and backup your metadata and cycle logs to your Google Drive App Data folder.

---

## 🛠️ Tech Stack

- **Framework:** React 19 (TypeScript)
- **Build Tool:** Vite
- **Database:** IndexedDB (via a custom lightweight async key-value transaction store) with automated localStorage migrations
- **Styling:** CSS Variables (Vanilla CSS) implementing a premium, responsive glassmorphism design (backdrop filters, color gradients, micro-animations)
- **Charts:** Chart.js with standard React wrappers (`react-chartjs-2`)
- **Unit Testing:** Vitest + React Testing Library + JSDOM
- **E2E Testing:** Playwright
- **Authentication/Storage:** Google Identity Services (GIS) & Google Client Library (`gapi`) for Google Drive App Data folder backup integration

---

## 📂 Project Directory Layout

```text
workout-tracker/
├── Fitness Guide/           # Original PDF manuals & Excel worksheets
│   └── ...
├── src/
│   ├── components/          # Reusable UI Components
│   │   ├── layout/          # Layout subcomponents (LoadingScreen, SettingsPanel, SyncBadge)
│   │   ├── session/         # Session subcomponents (ExerciseCard, ResistanceSheetView, ResistanceWizardView)
│   │   ├── dashboard/       # Dashboard subcomponents (DayCard, AdherenceCard, PhaseSection)
│   │   ├── Dashboard.tsx    # Main dashboard coordinator
│   │   ├── WorkoutSession.tsx # Main workout session router
│   │   ├── History.tsx      # Cycle management, stats, & data reset actions
│   │   ├── HistoryCharts.tsx # Chart.js visualizations
│   │   ├── RestTimer.tsx    # Rest stopwatch/alert buzzer
│   │   └── Layout.tsx       # Main header & settings wrapper
│   ├── contexts/
│   │   └── WorkoutContext.tsx # Global state context provider, reducer, and actions
│   ├── data/
│   │   └── schedule.ts      # Extracted P90X Classic schedule & exercises DB
│   ├── services/
│   │   ├── storage.ts       # IndexedDB wrapper, migrations & backup validations
│   │   └── gdrive.ts        # Google Drive API auth & file sync module
│   ├── index.css            # Premium dark-mode glassmorphic styles
│   ├── utils/
│   │   └── wizard.ts        # Exercise ordering & wizard step generator
│   ├── App.css              # Base styles & animation classes
│   ├── App.tsx              # Main Router and view manager
│   ├── config.ts            # Client OAuth settings
│   ├── types.ts             # TypeScript type declarations
│   └── main.tsx             # React DOM entry point
├── tests/
│   ├── components.test.tsx  # React component tests for logger / dashboard
│   ├── gdrive.test.ts       # Google Drive client and flow unit tests
│   ├── setup.ts             # Vitest test environment initialization
│   ├── storage.test.ts      # Unit tests for IndexedDB and migrations
│   ├── workout.test.tsx     # State transition, skips, and cycle unit tests
│   └── e2e/                 # Playwright end-to-end integration tests
│       ├── test-workout-flow.spec.ts
│       └── workout-flow.spec.ts
├── vite.config.ts           # Vite + Vitest config
├── playwright.config.ts     # Playwright test suite runner config
├── tsconfig.json            # TypeScript project settings
├── GEMINI.md                # Code organization, workflow, and quality guidelines
└── README.md                # This file (Project reference documentation)
```

---

## 📊 Data Schemas

To facilitate multi-cycle tracking, program swapping, and scalability, the state models are defined below:

```typescript
// Metadata structure for individual exercises
export interface ExerciseInfo {
  id: string; // e.g. "cb_standard_pushup"
  name: string; // e.g. "Standard Push-ups"
  type: 'bodyweight' | 'weighted';
  setCount: number; // 1 or 2
}

// Workout program definition
export interface WorkoutInfo {
  id: string; // e.g. "chest_and_back"
  name: string; // e.g. "Chest & Back"
  type: 'resistance' | 'cardio' | 'stretch';
  exercises: string[]; // List of ExerciseInfo IDs
  abRipper: boolean; // True if Ab Ripper X is appended
}

// Individual set logging details
export interface SetLog {
  reps: number;
  weight: number;
  assisted: boolean; // True if using bands/chair (bodyweight) or extra weight (weighted)
}

// Workout session completion log
export interface WorkoutLog {
  id: string; // `cycle_${cycle}_week_${week}_day_${day}`
  cycle: number; // Active cycle number (1, 2, ...)
  week: number; // Week number (1-13)
  day: number; // Day of the week (1-7)
  workoutId: string; // References WorkoutInfo.id or "rest"
  dateCompleted: string; // ISO timestamp
  skipped: boolean; // True if marked as skipped
  exercises: {
    [exerciseId: string]: SetLog[]; // Array matching exercise.setCount length
  };
  abRipperCompleted: boolean;
  comments: string;
}

// Cycle stats
export interface CycleStats {
  completedCount: number;
  skippedCount: number;
  totalDays: number;
}

// Global user settings & program-state mapping
export interface UserMetadata {
  version: number;
  currentCycle: number;
  currentWeek: number; // 1-13
  currentDay: number; // 1-7
  gdriveLinked: boolean;
  metadataFileId?: string;
  cycleFileIds?: { [cycle: number]: string };
  cycleTimestamps?: { [cycle: number]: string };
  cycleStats?: { [cycle: number]: CycleStats };
  activeProgramId?: string;
  programs?: {
    [programId: string]: {
      currentCycle: number;
      currentWeek: number;
      currentDay: number;
      cycleStats?: { [cycle: number]: CycleStats };
    };
  };
}
```

---

## ☁️ Google Drive Backup Sync Flow

Since the application is serverless, the sync flow runs entirely client-side:

```mermaid
sequenceDiagram
    participant User as Gym User
    participant App as React App (IndexedDB)
    participant GIS as Google Identity Services SDK
    participant Drive as Google Drive AppData Folder

    User->>App: Click "Link Google Drive"
    App->>GIS: Request OAuth 2.0 Token (drive.appdata scope)
    GIS->>User: Display Google Auth Prompt
    User->>GIS: Approve permissions
    GIS->>App: Return Access Token
    App->>Drive: Query for 'workout-tracker-data.json'
    alt File exists
        Drive->>App: Fetch JSON file content
        App->>App: Merge remote logs with IndexedDB
    else File does not exist
        App->>Drive: Create new file 'workout-tracker-data.json'
    end
    App->>App: Update gdriveLinked = true in database
    Note over App,Drive: Auto-Sync on workout completion
    User->>App: Click "Complete Workout"
    App->>App: Commit log to IndexedDB
    App->>Drive: Upload updated UserState JSON
    Drive->>App: Confirm upload
```

---

## 🎨 Design System & Aesthetics

The application implements a premium, dark-mode, mobile-first **glassmorphism** design:

- **Colors:** Deep obsidian backgrounds (`#0B0C10`), translucent dark slate panels, and vibrant electric blue and violet accent gradients (`#1F2833`, `#45F3FF`, `#6F00FF`).
- **Typography:** Sleek modern typography featuring **Outfit** and **Inter** imported from Google Fonts.
- **Glass Effect:** High-contrast `backdrop-filter: blur(12px) saturate(180%)` with thin borders (`rgba(255, 255, 255, 0.08)`).
- **Responsiveness:** Fluid styling layouts optimized for in-gym smartphone use, with oversized touch areas and inputs for wet/sweaty hands.

---

## 🧪 Testing Strategy

We maintain a strict quality assurance suite, keeping test coverage high across both state logic and core modules:

1. **Unit & Component Testing (Vitest):**
   - **Reducer Testing:** Validates that `WorkoutContext` transitions state correctly for actions like `START_SESSION`, `SAVE_SET`, `SKIP_DAY`, and `START_NEW_CYCLE`.
   - **Storage Migrations Testing:** Validates that old localStorage database schemas auto-migrate cleanly to IndexedDB keyValue segments without data loss.
   - **Component Interlocking:** Verifies guided logging, comparison badges, and layout panels render correctly under the custom provider.
2. **End-to-End Testing (Playwright):**
   - Tests entire user interaction flows, page navigation, session logs, skips, and cycle progressions inside a headless browser environment.

---

## ⚡ Vercel React Best Practices Checklist

When modifying or writing code, adhere to these key performance practices:

- **Eliminate Rendering Waterfalls:** Put independent promise operations in `Promise.all` inside services.
- **Avoid Expensive Re-renders:**
  - Wrap complex computations in `useMemo`.
  - Use `useCallback` for functions passed as props to memoized children.
  - Implement functional updates in state calls: `setState(prev => ...)` instead of depending on raw closures.
- **Local Storage Caching:** Read database states asynchronously during layout mount, displaying a clean loader spinner during database preparation.
- **Conditional Rendering:** Use React's ternary operators `condition ? <A /> : null` instead of logical AND `&&` to avoid accidental `0` or empty element rendering issues.

---

## 💻 Setup & Development Commands

### Installation

```bash
npm install
```

### Local Dev Server

Runs a local hot-reloading development server:

```bash
npm run dev
```

### Running Unit Tests

Runs the Vitest test runner:

```bash
npm run test
```

### Running End-to-End Tests

Runs the Playwright browser integration tests:

```bash
npx playwright test
```

### Linter & Formatter Checks

Check for ESLint rules and auto-format files using Prettier:

```bash
# Run ESLint check
npm run lint

# Auto-format codebase
npm run format
```

### Production Build

Checks type safety, linting constraints, and packages a minified production bundle:

```bash
npm run build
```
