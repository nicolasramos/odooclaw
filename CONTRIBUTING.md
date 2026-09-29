# Contributing to OdooClaw

## Language: everything on GitHub is written in English

**Every text artifact that lands on GitHub must be written in English.** This is a
standing rule, not a preference. It covers:

- Pull request titles and descriptions
- Issue titles and descriptions
- Commit messages
- Review comments and review replies
- Release notes and changelogs

The reason is reach and reviewability: GitHub is the public face of the project and many
readers (and the wider Odoo/OCA community) do not read Spanish. A PR nobody can read is a
PR nobody can review. **Spanish is fine in Multica issues and in the workspace — it is
not fine on GitHub.**

This applies to agents as much as to people. If you are an automated contributor, treat
this file as binding: producing a PR body in Spanish is a defect, even if the code is
perfect.

### Where the boundary sits

| Surface | Language |
|---|---|
| GitHub PR title / body | **English** |
| GitHub issue title / body | **English** |
| Commit messages | **English** |
| GitHub review comments | **English** |
| Code, identifiers, comments in source | **English** |
| User-facing strings shipped to the product | **English in the source**, translated through `i18n/` |
| Multica issues, internal notes, chat with the maintainer | Spanish is fine |

The product itself is localized through Odoo's `i18n` machinery (`es.po` for the Spanish
UI). Localized copy belongs in the `.po` files, **not** hard-coded in the source.

## Pull requests

- Branch off `main` and keep the diff scoped to one concern.
- Title in English, using conventional-commit form: `fix(scope): ...`, `feat(scope): ...`.
- In the description, state **what was broken, why, and how you verified it**. A test
  that goes red against the old code is worth more than a paragraph of prose.
- If the fix is a hotfix deployed by hand on a client, say so explicitly and point at the
  PR that makes it permanent — a container-layer change is reverted by the next rebuild.

### Tests

A test that cannot fail protects nothing. When you fix a bug, add a test that **fails
against the unfixed code** and passes with the fix, and say in the PR that you ran it both
ways. Mocks accept any argument, so a test asserting only "the client was called" will not
catch a malformed payload — assert the shape of what is sent.

## Reporting bugs

Open a GitHub issue (in English) or a Multica issue (Spanish is fine). Include:

- The exact error text, not a paraphrase of it.
- Enough reproduction detail to run it.
- The Odoo version and the deployment shape (doodba, bare metal, which database).

## Secrets

Never commit credentials. Provider keys belong in the environment or an untracked env
file. If a fix seems to require putting a secret into a tracked file (`config.json` is
tracked), the fix is in the wrong place — see PR #91 for the pattern to follow.
