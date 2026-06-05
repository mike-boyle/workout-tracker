# Developer Workflow & Quality Guidelines (GEMINI.md)

Welcome! This document outlines the engineering workflows, code organization conventions, testing strategies, and quality policies for working on the Workout Tracker codebase.

---

## 1. Code Organization & Component Decompositions

To maintain readability and keep the project manageable as features grow, follow these architectural principles:

### Folder Structure

UI Components should be modular and grouped by their scope under `src/components/` rather than flat files:

- `src/components/ui/` — Core layout and typography primitives (`Flex`, `Grid`, `Card`, `Badge`, `Heading`, `Text`) to decouple layout styling from component logic.
- `src/components/layout/` — Layout infrastructure (e.g. Navigation headers, sync badges, loading screens).
- `src/components/session/` — Active workout logging views, exercise cards, rest timers.
- `src/components/dashboard/` — Dashboard calendars, stats cards, and phase section grids.

### Core UI Primitives Convention

To avoid repeating layout styles inline (like `style={{ display: 'flex', gap: '8px' }}`) and to maintain branding consistency, always use UI primitives:

- **Layout Layouts**: Use `<Flex>` (for flexbox direction, justification, alignment, and gaps) and `<Grid>` (for layout column layouts).
- **Containers**: Use `<Card>` to enclose logical regions in standard glassmorphic styles.
- **Typography & UI Labels**: Use `<Heading>` (level 1-6) and `<Text>` (body scales, weights, and color variants) for all text labels.
- **Status Badges**: Use `<Badge>` for status elements (like Active, Skipped, Syncing, etc.).

### File & Component Size Soft Limits

- **Maximum Component Function Size**: Keep React functional components under **150 lines**. If a component grows past this, extract sub-elements (like list items, badges, tables, or sections) into focused subcomponents.
- **Maximum File Size**: Keep source files under **300 lines of code**. Large files slow down code audits and are harder to test.

### Reusable Layout CSS Utilities

Avoid repeating layout styles inline. While the styling primitives (`Flex`, `Grid`) are preferred, you can also leverage direct lightweight CSS utility classes defined in [index.css](src/index.css):

- **Flexbox**: `.flex`, `.flex-col`, `.items-center`, `.justify-between`, `.flex-wrap`
- **Spacing Gaps**: `.gap-1` (4px), `.gap-2` (8px), `.gap-4` (16px), `.gap-6` (24px), `.gap-8` (32px)
- **Text Colors**: `.text-primary`, `.text-secondary`, `.text-muted`, `.text-cyan`, `.text-green`, `.text-yellow`, `.text-red`, `.text-purple`

---

## 2. Developer Workflows (Solo vs. Subagent Flow)

Depending on the complexity of the task, the agent will operate in either **Solo Flow** or **Subagent Flow**.

### Solo Flow (Working Alone)

If working alone without spawning subagents:

- **Direct Commits**: Committing and merging to `main` directly is preferred. Creating feature branches and PRs is not necessary.
- **Autonomy**: After verifying that all tests, lints, and builds pass successfully, commit and push to GitHub directly without requiring explicit manual approval.

### Subagent Flow (Parallel Subagent & Branch-PR Workflow)

When executing multi-faceted or complex features using subagents:

1. **Task Decomposition**: Split tasks into distinct, independent subtasks.
2. **Branching & Agent Naming**: Spawn a specialized subagent for each subtask.
   - Agent names must represent their feature (e.g., `[Google Drive Integrator]`).
   - Every subagent works in a clean, isolated branch.
3. **PR Creation & Signature Prefix**: When complete, open a PR targeting the `main` branch.
   - **Signature Prefix**: All PR comments must be prefixed with the agent's name/role (e.g., `[Google Drive Integrator]: Added backup sync`).
4. **Self-Correction Loop**: Subagents poll their PR status and comments on GitHub, resolve feedback, and fix any merge conflicts with `main`.
5. **The Software Architect Pattern**: A critic agent reviews open PRs directly on GitHub, posts review feedback, and merges PRs on GitHub once code quality, testing, and design standards are met.
   - **Merging Pull Requests**: Always merge pull requests **via GitHub** rather than merging branches locally and pushing to `main`. This must be performed using either the `gh` command-line utility (e.g., `gh pr merge <pr-number> --merge`) or the GitHub MCP server (e.g., `merge_pull_request`). Merging through GitHub ensures that GitHub integration states, checks, and PR flows are properly updated and closed.

---

## 3. Zero-Lint & Strict Type Safety Policy

We enforce a zero-tolerance policy for code smells, type looseness, and linter warnings.

### Build Failures on Warnings

- The production build script (`npm run build`) runs `npm run lint` and `tsc -b` before compiling.
- Builds must fail immediately on any ESLint warning or TypeScript compilation error.

### Concrete TypeScript Types & Type Predicates

- **Avoid Loose Typing**: Do not use `any` or leave properties untyped.
- **Type Predicates**: Use user-defined type guards (`parameter is Type`) to safely narrow type definitions at runtime when parsing API or file inputs.
- **Global Window Extensions**: Extend the standard global `Window` interface in declaration files instead of casting via `(window as any)`.

### Documented Suppressions

If a linter rule must be suppressed:

1. **Targeted**: Place the suppression directive precisely at the statement line where the warning triggers.
2. **Documented**: Accompany the suppression with an adjacent comment explaining exactly why the rule is being disabled and how safety is maintained.
3. **Form**: Use `// eslint-disable-next-line <rule-name> -- <explanation>`. Avoid generic `/* eslint-disable */` comments.

---

## 4. Testing Strategy & Git Hooks

We enforce automated test verification locally to prevent regressions from being committed or pushed:

- **Unit Tests (Vitest)**:
  - Run E2E and component-level unit tests for the `WorkoutContext` reducer, database storage adapters, and layout components.
  - **Automation**: Verified automatically on every commit via the pre-commit hook (`npm test`).
  - **Manual command**: `npm test` or `npm run test:coverage`.
- **Visual Smoke Tests (Playwright)**:
  - Perform visual regression checks against dashboard, settings, history, and analytics layouts to detect design shifts.
  - **Automation**: Executed automatically during the pre-push hook (`npm run test:visual`) before the E2E suite runs.
  - **Manual command**: `npm run test:visual` to assert, or `npm run test:visual:update` to regenerate baseline snapshots.
- **E2E Tests (Playwright)**:
  - Run full-flow browser E2E tests to verify workout logging wizard, skip calculations, multi-cycle rollover logic, and history tracking.
  - **Automation**: Verified automatically before any push to the remote repository via the pre-push hook (`npm run test:e2e`).
  - **Manual command**: `npm run test:e2e` (or `npx playwright test --ui` for visual browser interactive mode).
- **Firestore Security Rules Tests**:
  - Run unit tests for database security permissions, collection locks, and field validation constraints using `@firebase/rules-unit-testing`.
  - **Automation**: Verified automatically in `.husky/pre-commit` _only if_ the security rules file ([firestore.rules](file:///c:/Users/Mike/dev/p90x/firebase/firestore.rules)) or the rules test file ([firestore.rules.test.ts](file:///c:/Users/Mike/dev/p90x/tests/firestore.rules.test.ts)) has staged changes. This limits friction for general commits while ensuring strict validation before pushing rules.
  - **Manual command**: `npm run test:rules`
  - **Dependency**: Requires **Java (JDK 21 or higher)** to run the Firebase Emulator Suite.
- **Test-Driven Development (TDD)**: Practicing TDD is highly encouraged to ensure that code interfaces are clean, modular, and highly testable. Before writing implementation code for a new feature, write the corresponding test assertions first, then implement the code to satisfy the tests.
- **Formatting**: Ensure files conform to Prettier styling by running `npm run format` prior to committing.

### Code Coverage Practices & V8 Ignore Patterns

To maintain 100% statement, branch, function, and line coverage while preserving high code quality and type safety:

1. **Prefer Type Assertions Over Silent Fallbacks**:
   - Do not use silent fallbacks (e.g. `|| 'unknown'` or `|| 'p90x'`) or defensive conditionals to satisfy TypeScript if you expect a value to always be defined at runtime.
   - Use the type assertion utilities (`assert`, `assertDefined`) from `src/utils/assert.ts` to narrow types and validate invariants. This enables the TypeScript compiler to narrow types cleanly without introducing unreachable defensive branch code.
   - If an assertion fails, the top-level `ErrorBoundary` will catch the failure and present a recovery screen (Reload Page / Reset Database) to the user.
2. **Environment-Specific Branch Coverage**:
   - Environment-specific conditions (such as checking `import.meta.env.DEV` to configure debugging tokens or emulators) cannot be cleanly reached or mocked across all test files due to Vitest module caching.
   - For environment-specific branches only, use targeted `/* v8 ignore next */` or `/* v8 ignore start/stop */` comments. General defensive code or missing data checks must not use `v8 ignore`.
3. **Global State Pollution & Cleanup**:
   - JSDOM does not reload/reset the global `window` state (like `window.location.hash` or custom global properties) between tests.
   - Proactively reset modified global properties in a `beforeEach` hook of the relevant describe block (e.g. `window.location.hash = ''`) to ensure tests run in isolation and prevent order-dependent failures.

### Accessible Selector Priorities (Testing Library & Playwright)

To ensure that both unit/integration tests (Vitest + React Testing Library) and E2E tests (Playwright) reflect the actual user experience and promote accessible layouts, always follow the Testing Library query priority recommendations:

1. **Top Priority - Accessible to Everyone**:
   - Query interactive controls (like buttons, links) by their ARIA role and accessible name: `screen.getByRole('button', { name: 'Save' })` or `page.getByRole('button', { name: 'Save' })`.
   - Prefer `getByLabelText` or `page.getByLabel()` for form fields (ensuring inputs are bound to `<label htmlFor="...">` tags).
   - Use `getByText` or `page.getByText()` for non-interactive elements (headings, labels, paragraphs, spans).
2. **Avoid CSS Class & Layout Selectors**:
   - Never query elements using styling/layout class names like `page.locator('.logo-section p')` or `page.locator('.glass-panel-hover')` if role-based or text-based queries are possible.
   - For custom interactive components (like clickable dashboard cards or expandable summaries), supply a semantic `role="button"` and an `aria-label`/`aria-expanded` tag to make them discoverable via accessibility tree lookups.
3. **Use Exact Matches to Resolve Ambiguity**:
   - In lists or cards that might contain partial matches (e.g. a status badge "Skipped" vs a notes log comment "Notes: Skipped"), use precise regex or exact matching constraints: `getByText('Skipped', { exact: true })` to prevent Playwright/Testing Library strict-mode locator resolution violations.

---

## 5. Developer Pre-Push Checklist

Before committing and pushing code to the remote repository, ensure the following checklist is completed:

- [ ] **Prettier Formatting**: Run `npm run format` to format all changed files with Prettier.
- [ ] **Type-Safety & Zero-Lint Warnings**: Run `npm run build` to confirm there are zero TypeScript compilation errors and zero ESLint warnings (warnings are treated as hard errors).
- [ ] **Unit Tests & 100% Coverage**: Run `npm run test:coverage` to verify all Vitest tests pass and that coverage meets the 100% threshold for covered modules.
- [ ] **Playwright E2E Tests**: Run `npm run test:e2e` to verify all end-to-end user flows (workout logging, cycle rollover, history, analytics) pass without regression.
- [ ] **No Focus Tags**: Ensure no `describe.only`, `test.only`, or `it.only` test filters are committed.
- [ ] **No Leftover Debugging Code**: Verify that no `debugger` statements or verbose/temporary `console.log` logs are left in the codebase.
- [ ] **Up-to-Date Documentation**: Ensure [README.md](README.md) is updated with any new feature details, setup instructions, or environment variables.
- [ ] **Firebase Analytics Tracking**: Verify that all new UI page/view routes or key interactive workflows (e.g. starting a cycle, completing workouts, toggling settings) have corresponding Firebase Analytics event tracking integrated.
- [ ] **Checklist & Policy Updates (GEMINI.md)**: Proactively identify any new architectural decisions, workflows, or testing patterns established in the conversation that should be documented in [GEMINI.md](GEMINI.md). Always prompt and ask the user before performing updates to [GEMINI.md](GEMINI.md).

---

## 6. Software Stack & Core Technologies

This project is built using a modern, type-safe web stack optimized for rapid frontend interactions and reliable offline data synchronization:

### Core Frontend Stack

- **React 19**: Responsive view layer utilizing functional component architectures.
- **TypeScript**: Strict compile-time typing to prevent runtime exceptions.
- **Vite**: Ultra-fast module bundler and hot-reloading development environment.
- **Vanilla CSS**: Curated, custom styles utilizing global CSS variables for design system consistency.

### Data Persistence & Backend Integration

- **IndexedDB & Local Storage**: Workout logs, current progress, and user states are stored client-side using segmented, high-performance local IndexedDB storage (`src/services/storage.ts`) for seamless offline workouts.
- **Firebase SDK (v12)**: Used for cloud features when the user connects:
  - **Firebase Auth**: Identifies users securely via Google OAuth.
  - **Firestore**: Synchronizes workout cycles, history, and user metadata to the cloud for multi-device sync and backups.
    - _Security Rules_: Database security permissions and validation constraints are maintained locally in [firebase/firestore.rules](file:///c:/Users/Mike/dev/p90x/firebase/firestore.rules). These local rules must be synced with the Firebase Console (either via manual console upload or using the Firebase CLI) whenever access patterns or schema requirements change.
  - **Local Emulator Integration**:
    - Supports running Firestore and Auth locally during interactive development.
    - **Activation**: Set the environment variable `VITE_USE_FIREBASE_EMULATOR=true` when starting the development server (`npm run dev`).
    - Connects Firestore to `localhost:8080` and Auth to `http://localhost:9099`.
    - Requires starting the Firebase Emulator Suite separately in your terminal using `firebase emulators:start` (which requires Java JDK 21+).
  - **Firebase Analytics**: Tracks screen flows, cycle rollovers, and core workout logging events to evaluate feature usage.

### Testing & Verification Tools

- **Vitest**: Executes unit and component tests (e.g. state reducers, components) with lightning-fast execution times.
- **Playwright**: Simulates real browser environments to run complete user flows (E2E) over multiple training cycles.
- **Mock Service Worker (MSW)**: Intercepts all network requests at the API layer during unit/integration tests to ensure no real network traffic escapes to Google/Firebase servers, keeping the test environment fully isolated, deterministic, and fast.

### Code Quality & Standards

- **ESLint**: Standardized coding conventions with strict warning-as-error builds.
- **Prettier**: Code formatter to enforce styling compliance before committing.
- **Husky**: Automated Git hooks running pre-commit checks (unit tests) and pre-push checks (selective E2E tests).
