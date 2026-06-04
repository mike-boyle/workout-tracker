# Developer Workflow & Quality Guidelines (GEMINI.md)

Welcome! This document outlines the engineering workflows, code organization conventions, testing strategies, and quality policies for working on the Workout Tracker codebase.

---

## 1. Code Organization & Component Decompositions

To maintain readability and keep the project manageable as features grow, follow these architectural principles:

### Folder Structure
UI Components should be modular and grouped by their scope under `src/components/` rather than flat files:
- `src/components/layout/` — Layout infrastructure (e.g. Navigation headers, sync badges, loading screens).
- `src/components/session/` — Active workout logging views, exercise cards, rest timers.
- `src/components/dashboard/` — Dashboard calendars, stats cards, and phase section grids.

### File & Component Size Soft Limits
* **Maximum Component Function Size**: Keep React functional components under **150 lines**. If a component grows past this, extract sub-elements (like list items, badges, tables, or sections) into focused subcomponents.
* **Maximum File Size**: Keep source files under **300 lines** of code. Large files slow down code audits and are harder to test.

### Reusable Layout CSS Utilities
Avoid repeating layout styles inline (e.g., `style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}`).
Instead, use the lightweight CSS utility classes defined in [index.css](file:///c:/Users/Mike/dev/p90x/src/index.css):
* **Flexbox**: `.flex`, `.flex-col`, `.items-center`, `.justify-between`, `.flex-wrap`
* **Spacing Gaps**: `.gap-1` (4px), `.gap-2` (8px), `.gap-4` (16px), `.gap-6` (24px), `.gap-8` (32px)
* **Text Colors**: `.text-primary`, `.text-secondary`, `.text-muted`, `.text-cyan`, `.text-green`, `.text-yellow`, `.text-red`, `.text-purple`

---

## 2. Developer Workflows (Solo vs. Subagent Flow)

Depending on the complexity of the task, the agent will operate in either **Solo Flow** or **Subagent Flow**.

### Solo Flow (Working Alone)
If working alone without spawning subagents:
* **Direct Commits**: Committing and merging to `main` directly is preferred. Creating feature branches and PRs is not necessary.
* **Autonomy**: After verifying that all tests, lints, and builds pass successfully, commit and push to GitHub directly without requiring explicit manual approval.

### Subagent Flow (Parallel Subagent & Branch-PR Workflow)
When executing multi-faceted or complex features using subagents:
1. **Task Decomposition**: Split tasks into distinct, independent subtasks.
2. **Branching & Agent Naming**: Spawn a specialized subagent for each subtask.
   * Agent names must represent their feature (e.g., `[Google Drive Integrator]`).
   * Every subagent works in a clean, isolated branch.
3. **PR Creation & Signature Prefix**: When complete, open a PR targeting the `main` branch.
   * **Signature Prefix**: All PR comments must be prefixed with the agent's name/role (e.g., `[Google Drive Integrator]: Added backup sync`).
4. **Self-Correction Loop**: Subagents poll their PR status and comments on GitHub, resolve feedback, and fix any merge conflicts with `main`.
5. **The Software Architect Pattern**: A critic agent reviews open PRs directly on GitHub, posts review feedback, and merges PRs on GitHub once code quality, testing, and design standards are met.

---

## 3. Zero-Lint & Strict Type Safety Policy

We enforce a zero-tolerance policy for code smells, type looseness, and linter warnings.

### Build Failures on Warnings
* The production build script (`npm run build`) runs `npm run lint` and `tsc -b` before compiling.
* Builds must fail immediately on any ESLint warning or TypeScript compilation error.

### Concrete TypeScript Types & Type Predicates
* **Avoid Loose Typing**: Do not use `any` or leave properties untyped.
* **Type Predicates**: Use user-defined type guards (`parameter is Type`) to safely narrow type definitions at runtime when parsing API or file inputs.
* **Global Window Extensions**: Extend the standard global `Window` interface in declaration files instead of casting via `(window as any)`.

### Documented Suppressions
If a linter rule must be suppressed:
1. **Targeted**: Place the suppression directive precisely at the statement line where the warning triggers.
2. **Documented**: Accompany the suppression with an adjacent comment explaining exactly why the rule is being disabled and how safety is maintained.
3. **Form**: Use `// eslint-disable-next-line <rule-name> -- <explanation>`. Avoid generic `/* eslint-disable */` comments.

---

## 4. Testing Strategy & Git Hooks

We enforce automated test verification locally to prevent regressions from being committed or pushed:

* **Unit Tests (Vitest)**:
  - Run E2E and component-level unit tests for the `WorkoutContext` reducer, database storage adapters, and layout components.
  - **Automation**: Verified automatically on every commit via the pre-commit hook (`npm test`).
  - **Manual command**: `npm test` or `npm run test:coverage`.
* **E2E Tests (Playwright)**:
  - Run full-flow browser E2E tests to verify workout logging wizard, skip calculations, multi-cycle rollover logic, and history tracking.
  - **Automation**: Verified automatically before any push to the remote repository via the pre-push hook (`npm run test:e2e`).
  - **Manual command**: `npm run test:e2e` (or `npx playwright test --ui` for visual browser interactive mode).
* **Test-Driven Development (TDD)**: Practicing TDD is highly encouraged to ensure that code interfaces are clean, modular, and highly testable. Before writing implementation code for a new feature, write the corresponding test assertions first, then implement the code to satisfy the tests.
* **Formatting**: Ensure files conform to Prettier styling by running `npm run format` prior to committing.

---

## 5. Developer Pre-Push Checklist

Before committing and pushing code to the remote repository, ensure the following checklist is completed:

- [ ] **Prettier Formatting**: Run `npm run format` to format all changed files with Prettier.
- [ ] **Type-Safety & Zero-Lint Warnings**: Run `npm run build` to confirm there are zero TypeScript compilation errors and zero ESLint warnings (warnings are treated as hard errors).
- [ ] **Unit Tests & 100% Coverage**: Run `npm run test:coverage` to verify all Vitest tests pass and that coverage meets the 100% threshold for covered modules.
- [ ] **Playwright E2E Tests**: Run `npm run test:e2e` to verify all end-to-end user flows (workout logging, cycle rollover, history, analytics) pass without regression.
- [ ] **No Focus Tags**: Ensure no `describe.only`, `test.only`, or `it.only` test filters are committed.
- [ ] **No Leftover Debugging Code**: Verify that no `debugger` statements or verbose/temporary `console.log` logs are left in the codebase.
- [ ] **Up-to-Date Documentation**: Ensure [README.md](file:///c:/Users/Mike/dev/p90x/README.md) is updated with any new feature details, setup instructions, or environment variables.
- [ ] **Checklist & Policy Updates (GEMINI.md)**: Proactively identify any new architectural decisions, workflows, or testing patterns established in the conversation that should be documented in [GEMINI.md](file:///c:/Users/Mike/dev/p90x/GEMINI.md). Always prompt and ask the user before performing updates to [GEMINI.md](file:///c:/Users/Mike/dev/p90x/GEMINI.md).

---

## 6. Software Stack & Core Technologies

This project is built using a modern, type-safe web stack optimized for rapid frontend interactions and reliable offline data synchronization:

### Core Frontend Stack
* **React 19**: Responsive view layer utilizing functional component architectures.
* **TypeScript**: Strict compile-time typing to prevent runtime exceptions.
* **Vite**: Ultra-fast module bundler and hot-reloading development environment.
* **Vanilla CSS**: Curated, custom styles utilizing global CSS variables for design system consistency.

### Data Persistence & Backend Integration
* **IndexedDB & Local Storage**: Workout logs, current progress, and user states are stored client-side using segmented, high-performance local IndexedDB storage (`src/services/storage.ts`) for seamless offline workouts.
* **Firebase SDK (v12)**: Used for cloud features when the user connects:
  - **Firebase Auth**: Identifies users securely via Google OAuth.
  - **Firestore**: Synchronizes workout cycles, history, and user metadata to the cloud for multi-device sync and backups.
  - **Firebase Analytics**: Tracks screen flows, cycle rollovers, and core workout logging events to evaluate feature usage.

### Testing & Verification Tools
* **Vitest**: Executes unit and component tests (e.g. state reducers, components) with lightning-fast execution times.
* **Playwright**: Simulates real browser environments to run complete user flows (E2E) over multiple training cycles.
* **Mock Service Worker (MSW)**: Intercepts all network requests at the API layer during unit/integration tests to ensure no real network traffic escapes to Google/Firebase servers, keeping the test environment fully isolated, deterministic, and fast.

### Code Quality & Standards
* **ESLint**: Standardized coding conventions with strict warning-as-error builds.
* **Prettier**: Code formatter to enforce styling compliance before committing.
* **Husky**: Automated Git hooks running pre-commit checks (unit tests) and pre-push checks (selective E2E tests).



