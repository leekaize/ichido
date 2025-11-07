# ichido (一度)

**A minimalist space for honest reflection.**

Write what matters. Once. Without revision.

![ichido Screenshot](./ichido.png)

## Philosophy

**ichido** (一度, "once" or "one time") embodies a simple truth: authentic expression comes before perfect editing.

The interface enforces forward-only writing. Once you complete a word (spacebar), it becomes immutable. This constraint creates space for:
- **Honest intention setting** without self-censorship
- **Gratitude practice** that captures first impressions
- **Reflective dialogue** with what you hold sacred (universe, future self, loved ones, the divine)

No affiliation required. No beliefs enforced. Just presence and attention.

---

## Core Principles

1. **Presence over Perfection** - The inability to edit keeps you in the present moment
2. **Simplicity as Feature** - Zero configuration, zero distractions, zero data tracking
3. **Privacy by Design** - Everything stays in your browser's local storage
4. **Open by Default** - MIT licensed, fully auditable, self-hostable

---

## Features

- **Forward-Only Writing** - Completed words cannot be edited
- **Guided Mode** (Optional) - Neutral prompts for morning/evening reflection
- **Auto-Save** - Every word persists automatically
- **Archive System** - Review past reflections, copy or delete them
- **Theme Support** - Light, Dark, Auto (follows system preference)
- **Offline-First** - Works without internet connection
- **Zero Tracking** - No analytics, no external requests, no data collection

---

## Quick Start

### Option 1: Use Online
Visit [leekaize.github.io/ichido](https://ichido.leekaize.com)

### Option 2: Run Locally
```bash
# Clone repository
git clone https://github.com/leekaize/ichido.git
cd ichido

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Option 3: Self-Host
```bash
npm run build
# Deploy the `dist/` folder to any static host
# (Netlify, Vercel, GitHub Pages, your own server)
```

---

## Development

Built with:
- **TypeScript** - Type safety and better tooling
- **Vite** - Lightning-fast dev server and optimized builds
- **Vanilla CSS** - No framework overhead, full control
- **Zero Runtime Dependencies** - Pure browser APIs

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run type-check # TypeScript validation
```

---

## Use Cases

**For Anyone:**
- Daily journaling without overthinking
- Morning intention setting
- Evening gratitude practice
- Dialogue with future self

**For Spiritual Practice:**
- Prayer journaling (any tradition)
- Meditation reflections
- Discernment processes
- Contemplative writing

**For Creative Work:**
- Freewriting sessions
- Idea capture without editing
- Stream-of-consciousness drafts

---

## Contributing

We welcome contributions that align with ichido's core philosophy: **simplicity, accessibility, and respect for diverse practices.**

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

Key areas for contribution:
- **Accessibility improvements** - Screen reader support, keyboard navigation
- **Internationalization** - Translations for UI and guided prompts
- **Mobile optimization** - Touch interactions, responsive design
- **Optional features** - Export formats, encryption, sync (as opt-in plugins)

---

## Privacy & Data

**What we collect:** Nothing.

**Where your data lives:** Your browser's localStorage only.

**How to export:** Use the "Copy" button on any reflection in Archives.

**How to delete:** Click "Delete" on individual reflections, or clear browser data.

---

## Roadmap

**Current:** v1.0 - Core experience with guided mode

**Exploring:**
- Mobile app (PWA first, native later)
- Optional end-to-end encrypted sync
- Plugin system for custom prompts
- Export to PDF/Markdown
- Accessibility audit and improvements

We ship slowly. Every feature must justify its complexity cost.

---

## Philosophy Deep Dive

Read [PHILOSOPHY.md](./docs/PHILOSOPHY.md) for the full design reasoning.

**TLDR:** This app believes:
1. Authentic expression > polished performance
2. Constraints enable creativity
3. Privacy is not negotiable
4. Simplicity serves everyone

---

## Support

- **Questions:** [Open a Discussion](https://github.com/leekaize/ichido/discussions)
- **Bugs:** [File an Issue](https://github.com/leekaize/ichido/issues)
- **Donations:** [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/P5P01KE5GQ)

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

Built by [Lee Kai Ze](https://github.com/leekaize) with the belief that honest reflection should be accessible to everyone.