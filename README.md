# Chinese-Learning

AI Mandarin tutor: topic-based vocabulary, voice conversation practice, and graded learning reports in 24 native languages.

## Business Context

- **Category:** education product
- **Audience:** learners, teachers, parents, and education operators who need a clearer learning or exam-prep workflow.
- **Repository status:** Private repository. Treat as internal work unless the owner explicitly decides to publish it.
- **Topics:** ai, chinese-learning, fastapi, language-learning, mandarin, openai, python, react

## What This Project Is For

- AI Mandarin tutor: topic-based vocabulary, voice conversation practice, and graded learning reports in 24 native languages.
- Give users a concrete learning workflow instead of a loose collection of content.
- Make progress, practice, review, or recommendation steps easier to repeat.

## Where It Fits

This repository supports productized learning workflows: diagnostic input, guided practice, review loops, and a clearer handoff between learner, teacher, and software.

## Technical Overview

- **Primary language:** Python
- **Detected stack:** Python, Node.js / JavaScript tooling, Yarn, Python dependencies, Docker, React, Tailwind CSS
- **Default branch:** `main`
- **Visibility:** `PRIVATE`
- **License:** Private/internal terms

## Repository Map

- `.devcontainer`
- `.dockerignore`
- `.emergent`
- `.env.example`
- `Dockerfile`
- `README.md`
- `SECURITY.md`
- `backend`
- `frontend`
- `scripts`
- `tests`

## Quick Start

Use the commands that match the current project state:

```bash
yarn install
yarn start
yarn run build
yarn run test
```

| Command | Purpose |
|---|---|
| `yarn start` | react-scripts start |
| `yarn run build` | react-scripts build |
| `yarn run test` | react-scripts test |

## Operating Notes

- Keep real credentials out of the repository. Use local environment files, GitHub repository secrets, or the deployment platform secret manager.
- If a `.env.example` file exists, treat it as documentation only; never commit filled-in `.env` files.
- Before publishing screenshots, demos, or client examples, remove private names, internal paths, account IDs, and API endpoints.
- The `Repository Hygiene` workflow is intended as a lightweight guardrail, not a replacement for product-specific tests.

## Delivery Checklist

- [ ] README describes the user, business outcome, and operating boundary.
- [ ] Setup or preview commands are current.
- [ ] No real secrets, private user data, or machine-local state are tracked.
- [ ] Screenshots, demos, or sample outputs are safe to share publicly when the repository is public.
- [ ] Product-specific tests or smoke checks are documented before production use.

## Roadmap

- Tighten the fastest path from clone to useful demo.
- Add project-specific screenshots, sample outputs, or a short walkthrough where useful.
- Promote repeated manual steps into scripts, tests, or documented workflows.
- Keep security, privacy, and licensing boundaries explicit as the project evolves.

## Maintainer Notes

Maintained by [Tony Sheng](https://github.com/shengdabai). This README is written as a business-facing handoff: it should help a future collaborator, client, or reviewer understand why the repository exists, how to inspect it, and what must be true before it is reused or shipped.
