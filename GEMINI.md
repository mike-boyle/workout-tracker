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
   * **Signature Prefix**: All PR descriptions and comments must be prefixed with the agent's name/role (e.g., `[Google Drive Integrator]: Added backup sync`).
4. **Self-Correction Loop**: Subagents poll their PR status and comments on GitHub, resolve feedback, and fix any merge conflicts with `main`.
5. **The Distinguished Engineer Pattern**: A critic agent reviews open PRs directly on GitHub, posts review feedback, and merges PRs on GitHub once code quality, testing, and design standards are met.

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
* **Formatting**: Ensure files conform to Prettier styling by running `npm run format` prior to committing.

