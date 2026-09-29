# Agent instructions

## Language: English on GitHub, always

**All text that reaches GitHub must be in English** — PR titles and bodies, issue titles
and bodies, commit messages, review comments and release notes. No exceptions for agents:
a Spanish PR body is a defect even when the code is correct.

Spanish is fine in Multica issues, in this workspace and in conversation with the
maintainer. The product's Spanish copy belongs in `i18n/es.po`, not in the source.

See `CONTRIBUTING.md` for the full table of what goes where.

## Before you open a PR

1. **Read the files you are about to change** — including the callers. A helper that looks
   fine in isolation can be reached with an argument shape it does not expect.
2. **Assert the shape of what you send.** Mocks accept anything, so a test that only
   checks "the client was called" cannot catch a malformed payload. Assert the values.
3. **Prove the test can fail.** Run it against the unfixed code and confirm it goes red.
   A test that never fails protects nothing.
4. **Keep the diff scoped.** One concern per PR; unrelated cleanups go in their own PR.
5. **Write the body in English**, with what broke, why, and how you verified it.

## Deploying a fix

A change applied by hand on a client's container layer is **not durable** — the next
rebuild or recreate reverts it. Always also land it in the repo and say so in the PR,
naming the file and the commit the client is actually running.
