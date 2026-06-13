# Chinese-Learning

AI Mandarin tutor: topic-based vocabulary, voice conversation practice, and graded learning reports in 24 native languages.

## Business Context

- **Category:** security and governance tool
- **Audience:** builders and operators who need safer repositories, cleaner handoffs, and repeatable security checks.
- **Repository status:** Private/internal repository. Treat it as an internal work asset unless the owner explicitly decides to publish it.
- **Topics:** ai, chinese-learning, fastapi, language-learning, mandarin, openai, python, react

## What This Project Is For

- AI Mandarin tutor: topic-based vocabulary, voice conversation practice, and graded learning reports in 24 native languages.
- Find repository risks early without exposing secrets in reports.
- Make security review repeatable across public and private codebases.

## Where It Fits

This repository belongs in the trust-and-safety layer of the workbench: it helps make code, configuration, and public handoffs safer before they are reused or shown to clients.

## Technical Overview

- **Primary language:** Python
- **Detected stack:** Python, Node.js, Python dependencies, Docker, React, Tailwind CSS
- **Default branch:** `main`
- **Visibility:** `PRIVATE`
- **License:** Private/internal terms

## Repository Map

- `backend`
- `frontend`
- `scripts`
- `tests`
- `.devcontainer`
- `.dockerignore`
- `.emergent`
- `.env.example`
- `Dockerfile`
- `README.md`
- `SECURITY.md`
- `backend_test.py`

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
| `yarn install` | Install project dependencies. |
| `yarn start` | react-scripts start |
| `yarn run build` | react-scripts build |
| `yarn run test` | react-scripts test |

## Operating Notes

- Keep real credentials out of the repository. Use local environment files, GitHub repository secrets, or the deployment platform secret manager.
- If a `.env.example` file exists, treat it as documentation only; never commit filled-in `.env` files.
- Before publishing screenshots, demos, or client examples, remove private names, internal paths, account IDs, and API endpoints.
- The `Repository Hygiene` workflow is a lightweight guardrail, not a replacement for product-specific tests.

## Delivery Checklist

- [ ] README describes the user, business outcome, and operating boundary.
- [ ] Setup or preview commands are current and do not rely on private machine state.
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
