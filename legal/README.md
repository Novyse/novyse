# Legal documents — operations runbook

This directory is the canonical source of the Novyse legal texts. The same files feed the
applications, the website and the backend API. Editing them here is the only supported way to
publish a legal change.

## 1. Files managed here

| File | API endpoint | Website page | Notes |
| --- | --- | --- | --- |
| `legal/terms-of-service.md` | `GET https://auth.novyse.com/legal/tos` | `/legal/terms-of-service` | Hosted service terms. |
| `legal/privacy-policy.md` | `GET https://auth.novyse.com/legal/privacy` | `/legal/privacy-policy` | GDPR privacy policy. |
| `LICENSE` (repository root) | `GET https://auth.novyse.com/legal/license` | `/legal/license` | GNU GPL v3.0 text of the client. |

All three files are bundled in the client as the offline fallback. The backend caches the latest
version in RAM and in Redis, and the landing page renders the API version. Never edit the text on
the landing page or in a client source file: change these files and let the pipeline propagate
them.

## 2. Date headers

Every legal document starts with two dates:

```markdown
**Published:** <date the document was first published, never changes>
**Effective:** <published + 30 days> *(Effective immediately for new accounts created on or after the latest update; effective 30 days after publication for existing accounts)*
```

- **Published** is the historical first publication date. It stays fixed for the lifetime of the
  document. Do not bump it when you edit the text.
- **Effective** is the date the new version binds **existing** accounts. It is always **30 days
  after the merge to `production`**, which is normally the same as the publication date of the
  update. The parenthetical is part of the header and must stay: new accounts created on or after
  the update accept the new version immediately, existing accounts are bound from `Effective`.
- The sync workflow computes the notification date from the update timestamp and announces
  `+30 days`; the date written in the header must match that announcement.

`LICENSE` is a verbatim licence text: it has no date header and must not be edited.

## 3. Git flow (`production` vs `development`)

`production` is the branch that the backend, the website and the update workflow read. The
`development` branch (the `dev` branch in day-to-day speech) must stay aligned so that the next
release does not reintroduce an old text.

1. Never edit `legal/` inside a long-lived feature branch. A feature branch that also changes the
   legal texts makes the diff and the notification summary ambiguous.
2. Create a dedicated branch from **`production`**, named `legal/update-YYYY-MM`
   (for example `legal/update-2026-12`).
3. Edit `legal/terms-of-service.md`, `legal/privacy-policy.md` and/or `LICENSE`.
4. Set `Effective:` to the planned merge date **+ 30 days**, and keep `Published:` unchanged.
5. Open a pull request against `production`, review the text, then merge.
6. Immediately after the merge, merge `production` into `development` (or open the back-merge
   pull request) so the two branches hold the same documents.
7. Verify the published endpoints:

   ```bash
   curl -s https://auth.novyse.com/legal | jq '.updatedAt, .hash'
   curl -s https://auth.novyse.com/legal/tos | jq -r '.content' | head
   ```

8. Verify that the in-app notification reached the users (or that it was intentionally skipped,
   see below) and that the landing pages show the new text.

Do not force-push `production` after a legal merge: the workflow has already published the
content and the notification cannot be unsent.

## 4. Commit message rules

The commit message is an operational input, not only a Git note. The workflow reads the head
commit of the push and sends its **body** to the users.

```
Short internal Git title

Clear English summary of the legal changes, written for the users.
It can span several lines. It is sent verbatim in the in-app message.
```

- **First line (title):** technical, internal, for Git history. It is **not** sent to users.
  Example: `Update ToS: unilateral modification clause`.
- **Body (from the third line onward):** a clear, plain-English summary of what changed and why.
  This text is sent automatically, through the official Novyse system account, to every existing
  user. Write it for a non-lawyer: no internal jargon, no ticket numbers, no names of
  contributors. The blank second line is required by Git and separates the title from the body.
- **Only the head commit of the push** is read. If a push contains several commits, squash them
  or make sure the last one carries the user-facing summary.

### `[skip-notify]`

Add `[skip-notify]` anywhere in the commit message when the change must be published but **must
not** notify users. Typical cases: typo fixes, Markdown formatting, link corrections, or a
non-material clarification. The backend still updates its RAM cache, Redis and the API, and the
website and clients receive the new text; no `LEGAL_UPDATE` event is emitted.

### `LICENSE`

A change to `LICENSE` updates `GET /legal/license` but **never** sends a notice: the licence text
is not a contractual or privacy change. A commit that touches only `LICENSE` does not notify even
without `[skip-notify]`. Do not use such a commit to announce a change to the Terms or the Privacy
Policy.

## 5. What happens after the merge

1. The `sync-legal.yml` GitHub Action runs on the push to `production`.
2. It detects the changed files and sends one `POST https://auth.novyse.com/legal` with only the
   changed documents, the commit body as `summary`, and `skipNotify` derived from
   `[skip-notify]`.
3. `authentication` validates the bearer token, merges the received documents with the cached
   ones, writes `legal:docs` to Redis, publishes `legal:sync` so every replica updates its RAM,
   and (unless skipped) publishes a `LEGAL_UPDATE` event.
4. `notify` reads the event, resolves the users with an active in-app notification channel and
   sends the English notice in batches of 50, with a short pause between batches.
5. The clients fetch the new content on the next signup screen open or settings visit, cache it
   locally, and keep serving the bundled copy when offline. The landing page fetches it at build
   time and revalidates it in the browser.

If the action fails (non-2xx response), the deployment is **not** considered done: fix the cause
and re-run it with `workflow_dispatch` (which sends all three files).

## 6. Emergency manual sync

`workflow_dispatch` sends `tos`, `privacy` and `license` together, using the head commit of the
selected branch. Use it only to recover from a failed automatic run. The same rules for the
commit body and `[skip-notify]` apply.

## 7. Checklist for a legal release

- [ ] Branch created from `production`, named `legal/update-YYYY-MM`.
- [ ] `Published:` unchanged, `Effective:` = merge date + 30 days.
- [ ] Header parenthetical about new and existing accounts untouched.
- [ ] Text reviewed by both controllers (Samuele Orazio Durante and Matteo Magnani).
- [ ] Commit title internal; commit body is the user-facing English summary.
- [ ] `[skip-notify]` added only for non-material changes.
- [ ] Merged to `production`, then `production` merged back into `development`.
- [ ] Action green; `/legal` returns the new `updatedAt` and `hash`.
- [ ] In-app notice received (or intentionally skipped).
- [ ] Landing page shows the new version.
