# Prompt design

## Principles

- Keep Gemini server-side and require strict JSON for structured planning output.
- Treat user-provided event details as context, not as instructions to ignore
  validation or disclose secrets.
- Ask for practical, culturally neutral suggestions; phrase ritual guidance as
  common practices and explicitly note that traditions vary by family.
- Keep all arithmetic outside model prompts. TypeScript computes allocations,
  dates, and readiness.
- Label generated prices as estimates and use only clearly fictional demo
  vendor names.

## Seed generation

`scripts/generate-seed.ts` asks Gemini for INR benchmarks, ceremony sequences,
planning templates, and vendor attributes at temperature 0.3. Zod validates
the requested shape and sanity checks reject impossible ranges. The failed
section is regenerated once with the validation errors included.

## Demo pipeline

The demo pipeline generates a plan against the `Blueprint` schema, requests a
structured critique and score, refines the plan using that critique, and
validates the final plan before it is saved. The prompt set covers a Jaipur
wedding, a Pune birthday, and a Thane community celebration. For image prompts,
each event uses one locked style prefix derived from its theme palette and six
distinct tile subjects.

## Change log

- 2026-10-29: Added plan-schema and seed-generation prompt constraints, including
  schema-first output, price plausibility bounds, retry behavior, and consistent
  image style directions.
