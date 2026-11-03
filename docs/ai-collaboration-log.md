# AI Collaboration Log

Running record of how AI agents were directed, what they got wrong, and how output was verified.
Feeds the README's *AI Collaboration Narrative* (Constitution: Development Workflow).

| Date | Phase | Agent / tool | What happened | Verification / correction |
|---|---|---|---|---|
| 2026-11-02 | plan | Claude Code (`/speckit-plan`) | Generated plan, research (R1–R17), data model, OpenAPI contract, quickstart | Contract linted with `redocly lint --extends=recommended` (16 style errors fixed: summaries, `security: []`, tag descriptions) |
| 2026-11-02 | plan | Claude Code | Contract used a `discriminator` on boolean `available`; `openapi-typescript` generated `available: "true"` (string), which would break UI narrowing | Caught by generating types and inspecting output; discriminator removed, regenerated types now `available: true \| false` |
| 2026-11-02 | plan | Claude Code | 409 conflict had no reason for "reviewed technician/bay taken but slot still bookable with other resources" | Added `PROPOSED_RESOURCE_TAKEN` to `UnavailableReason`, documented in research R8 |
