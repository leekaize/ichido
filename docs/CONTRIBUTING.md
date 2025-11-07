# Contributing to ichido

Thank you for considering contributing to ichido. This project believes in **simplicity, accessibility, and respect for diverse practices.**

---

## Core Principles for Contributors

**Every contribution must answer:**
1. **Does it serve the core purpose?** (Honest, forward-only reflection)
2. **Does it respect simplicity?** (Less code is better than more features)
3. **Does it remain belief-neutral?** (Works for atheists, theists, everyone)
4. **Does it preserve privacy?** (No tracking, no external calls, no data harvesting)

**If the answer to any is "no" or "maybe," the feature shouldn't ship.**

---

## Ways to Contribute

### 1. Bug Reports
Found a bug? [Open an issue](https://github.com/leekaize/ichido/issues) with:
- Clear title (e.g., "Editor loses focus on Safari iOS 17")
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS version
- Screenshots if relevant

**Good bug report example:**
```
**Title:** Text disappears after pasting on Firefox 120

**Steps:**
1. Type "hello world"
2. Copy external text
3. Try to paste with Cmd+V
4. Text disappears

**Expected:** Paste is blocked (intended behavior)
**Actual:** Existing text vanishes
**Browser:** Firefox 120, macOS 14.2
```

### 2. Feature Requests
[Start a Discussion](https://github.com/leekaize/ichido/discussions) before coding.

**Required context:**
- **Problem statement:** What user need does this solve?
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
- [ ] Tested on Chrome/Firefox/Safari
- [ ] Tested on mobile
- [ ] No new dependencies added
- [ ] TypeScript builds without errors
- [ ] Existing tests pass

## Screenshots
[If UI changes, add before/after screenshots]
```

---

## Development Guidelines

### File Structure
```
src/
├── main.ts              # Entry point, initialization
├── app.ts               # App state and orchestration
├── modules/
│   ├── state.ts         # LocalStorage operations
│   ├── editor.ts        # Editor logic and rendering
│   ├── ui.ts            # UI components and themes
│   └── prompts.ts       # Guided mode prompt system
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
- **Direct contact:** [maintainer email](mailto:leekaize@example.com)

---

**Remember:** The best contribution is often removing code, not adding it.