# Liminal Build

This repository currently contains the Story 0 foundation scaffold for the
Liminal Build platform shell. It uses a pnpm workspace with one real app
package at `apps/platform` plus root-level Convex and test scaffolding.

## Requirements

- Node `24.14.x`
- pnpm `10.x`

## Quick start

1. Install pnpm if needed.
2. Run `pnpm install`.
3. Copy `.env.example` to `.env` and fill in the required values when you are
   ready to run the server locally.
4. Use `pnpm red-verify` to validate formatting, linting, type checking, and
   build health.

Detailed local bootstrap guidance lives in `docs/setup/local-bootstrap.md`.

