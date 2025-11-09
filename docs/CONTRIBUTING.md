# Contributing to ichido

Thank you for considering contributing to ichido. This document outlines our standards and process.

---

## Core Philosophy

Before contributing, understand our design principles:

1. **Simplicity over features** - Every addition costs maintenance
2. **Privacy is non-negotiable** - No external calls, no tracking
3. **Zero runtime dependencies** - Vanilla TypeScript only
4. **Belief-neutral design** - Works for all worldviews

Read [PHILOSOPHY.md](./PHILOSOPHY.md) before proposing features.

---

## Ways to Contribute

### 1. Report Bugs

**Before filing:**

- Search existing [issues](https://github.com/leekaize/ichido/issues)
- Test in incognito/private mode
- Clear localStorage and retry

**Bug report template:**

```markdown
## Environment

- Browser: [Chrome 120 / Firefox 119 / Safari 17]
- OS: [macOS / Windows / iOS / Android]
- ichido version: [from package.json]

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

## Console Errors

[Paste any errors from DevTools Console]
```

### 2. Suggest Features

**Requirements:**

- Serves 80%+ of users
- Maintains zero dependencies
- Respects privacy
- Belief-neutral design

**Feature proposal template:**

```markdown
## Problem

[What user need does this address?]

## Proposed Solution

[How would it work?]

## Alternatives Considered

[What simpler options exist?]

## Complexity Cost

[What code/maintenance does this add?]

## Belief Neutrality

[Works for all worldviews?]
```

**Discussion checklist:**

- **Belief neutrality check:** Does it work for all worldviews?
- **Complexity cost:** What does this add to the codebase?
- **Alternative solutions:** What simpler approaches exist?

**We reject features that:**

- Add external dependencies without extraordinary justification
- Require backend infrastructure
- Compromise privacy or simplicity
- Favor one belief system over others

### 3. Code Contributions

**Before you code:**

1. Check [open issues](https://github.com/leekaize/ichido/issues)
2. Comment on the issue you want to work on
3. Wait for maintainer confirmation
4. Fork the repo

**Development setup:**

```bash
git clone https://github.com/YOUR_USERNAME/ichido.git
cd ichido
npm install
npm run dev
```

**Code standards:**

- TypeScript strict mode (no `any` types)
- Preserve zero runtime dependencies
- Max function length: 30 lines
- Max file length: 300 lines
- Use semantic variable names
- Add JSDoc comments for public functions

**Testing checklist:**

- [ ] Unit tests pass: `npm test`
- [ ] Type check passes: `npm run type-check`
- [ ] Works in Chrome, Firefox, Safari
- [ ] Works on mobile (iOS Safari, Android Chrome)
- [ ] Keyboard navigation functional
- [ ] No console errors
- [ ] localStorage operations succeed
- [ ] Theme switching works
- [ ] All existing features still work

**Pull Request template:**

```markdown
## Problem

[Describe the issue this PR solves]

## Solution

[Explain your approach]

## Testing

- [ ] Unit tests added/updated
- [ ] Tested on Chrome/Firefox/Safari
- [ ] Tested on mobile
- [ ] No new dependencies added
- [ ] TypeScript builds without errors
- [ ] All tests pass

## Screenshots

[If UI changes, add before/after screenshots]
```

---

## Development Guidelines

### File Structure

```
src/
├── main.ts              # Entry point, initialization
├── app.ts               # Application orchestration
├── types.ts             # TypeScript interfaces
├── config.ts            # Configuration constants
├── icons.ts             # SVG definitions
├── modules/
│   ├── state.ts         # localStorage operations
│   ├── editor.ts        # Editor logic and rendering
│   ├── ui.ts            # UI components and themes
│   └── prompts.ts       # Guided mode system
└── styles/
    └── main.css         # All styling (no CSS-in-JS)
```

### TypeScript Patterns

**Good:**

```typescript
interface Draft {
  id: number;
  date: string;
  content: string;
}

function saveDraft(draft: Draft): void {
  localStorage.setItem('draft', JSON.stringify(draft));
}
```

**Bad:**

```typescript
function saveDraft(d: any) {
  localStorage.setItem('draft', JSON.stringify(d));
}
```

### Testing Guidelines

**Unit Tests (Vitest)**

- Test modules in isolation
- Mock DOM when necessary
- Test edge cases and error handling
- Keep tests under 50 lines

```typescript
// tests/unit/state.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../../src/modules/state';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    localStorage.clear();
    stateManager = new StateManager();
  });

  it('returns empty array when no archives exist', () => {
    expect(stateManager.getArchives()).toEqual([]);
  });
});
```

**E2E Tests (Playwright)**

- Test complete user flows
- Verify cross-browser compatibility
- Check localStorage persistence
- Test mobile interactions

```typescript
// tests/e2e/writing-flow.spec.ts
import { test, expect } from '@playwright/test';

test('writes and saves reflection', async ({ page }) => {
  await page.goto('/');
  await page.locator('#editor').click();
  await page.keyboard.type('test reflection ');

  const archives = await page.evaluate(() => {
    return localStorage.getItem('ichido_archives');
  });

  expect(archives).toContain('test reflection');
});
```

**Running Tests:**

```bash
npm test                 # Unit tests
npm run test:coverage    # With coverage report
npm run test:e2e         # E2E tests (requires build)
npm run test:e2e:ui      # Interactive E2E mode
```

### Performance Rules

- **No unnecessary re-renders** - Only update DOM when content changes
- **Debounce localStorage writes** - Don't save on every keystroke
- **Lazy load archives** - Only render when overlay opens
- **Efficient selectors** - Use IDs, not complex queries

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add evening reflection prompts
fix: resolve Safari paste prevention bug
docs: update PHILOSOPHY.md with new examples
refactor: simplify editor focus logic
test: add unit tests for StateManager
```

---

## Priority Contribution Areas

### High Priority

- **Accessibility improvements**
  - Screen reader support
  - Better keyboard navigation
  - ARIA labels
  - Focus indicators
- **Internationalization**
  - UI translations (i18n setup)
  - Neutral prompt translations
  - RTL language support
- **Mobile optimization**
  - Touch gesture refinement
  - Virtual keyboard handling
  - iOS Safari quirks

### Medium Priority

- **Export formats**
  - Markdown export
  - Plain text export
  - PDF generation (optional)
- **Optional plugins system**
  - Custom prompt templates
  - Local encryption
  - Archive search
- **Testing infrastructure**
  - Fix E2E test issues ([#1](https://github.com/leekaize/ichido/issues/1))
  - Add more edge case coverage

### Low Priority (Research Phase)

- End-to-end encrypted sync (must remain optional)
- PWA offline manifest improvements
- Custom theme editor

---

## What We Won't Accept

**Hard No:**

- Analytics or tracking (even "privacy-friendly")
- External API calls without explicit user consent
- Features that require accounts/authentication
- Complexity for edge cases affecting <1% of users
- Dependencies that double bundle size
- Religion-specific features (use plugins instead)

**Example rejected features:**

- "Add Facebook login to sync across devices" ❌
- "Integrate with OpenAI for prayer suggestions" ❌
- "Add Catholic saint of the day widget" ❌
- "Track streaks with leaderboard" ❌

---

## Code Review Process

1. **Automated checks** (GitHub Actions)

   - TypeScript compilation
   - Unit tests
   - Bundle size analysis
   - No new dependencies alert

2. **Maintainer review** (48-hour target)

   - Code quality check
   - Philosophy alignment
   - Complexity cost assessment

3. **Feedback loop**

   - Requested changes must address maintainer concerns
   - Discussion happens in PR comments
   - Stale PRs (30 days no activity) auto-close

4. **Merge criteria**
   - All checks pass
   - Maintainer approval
   - No merge conflicts
   - Clear commit history

---

## Community Guidelines

**Be Kind:** Respectful disagreement is welcome. Personal attacks are not.

**Be Humble:** Your solution might not be the best. Stay open.

**Be Patient:** Maintainers are human with limited time.

**Be Specific:** "This is bad" helps no one. "Function X has O(n²) complexity, here's O(n) alternative" helps everyone.

---

## Questions?

- **Usage questions:** [Discussions](https://github.com/leekaize/ichido/discussions)
- **Bug reports:** [Issues](https://github.com/leekaize/ichido/issues)
- **Design philosophy:** Read [PHILOSOPHY.md](./PHILOSOPHY.md)

---

**Remember:** The best contribution is often removing code, not adding it.
