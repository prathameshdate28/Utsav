# Architecture decisions

## Why Gemini

Gemini provides a single server-side API for structured planning responses,
critique/refinement, and image generation. Keeping the API behind route handlers
means the browser never receives an API key. Model output remains untrusted and
is parsed and validated before use.

## Why no vector database

The current product uses a small, curated set of local seed and demo data.
Keyword lookup and direct JSON loading are simpler, cheaper, and easier to audit
at this scale. A vector index would add operational complexity without a
demonstrated retrieval need; revisit only when the real vendor corpus grows.

## Why no authentication

This prototype is a single-user planning experience with browser-local
persistence and read-only compressed share plans. Authentication would add
account and privacy responsibilities without enabling a current requirement.
Shared plans must remain validated and read-only; user-specific collaboration
would require an explicit auth and data-retention design.

## Deterministic calculations

Budget math, date reflow, dependency ordering, and readiness are pure TypeScript
functions covered by Vitest. AI may suggest content, but it does not calculate
totals or override dependency constraints.
