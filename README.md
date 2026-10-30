# Approval queue template for floo

An internal approval queue: team members submit requests for discounts, purchases, access or time off, and admins approve or reject them with a comment.

## What you get

- **Team sign-in with roles.** Invite-only login in front of every page. Members see their own requests; admins see the whole queue and decide.
- **A queue admins can work.** Filter by status and category, open a request, approve or reject it with a comment.
- **An audit trail on every request.** Who submitted it, who decided, when, and why, recorded at the moment of each action.
- **Managed Postgres.** Tables and migrations with Drizzle, applied once per deploy.
- **An agent API.** List, submit and decide requests over a key-authenticated JSON API, described by a generated OpenAPI document, so an agent can work the same queue your team does.

## Deploy with your agent

Paste this into Claude Code, Codex or Cursor:

```text
Deploy the template at https://github.com/getfloo/approval-queue-template on floo for me.
Follow https://getfloo.com/agents.md to create a floo-hosted project, replace its
starter code with this template's files (keep the project's [app] name in
floo.app.toml), push, and give me the live URL.
```

Or by hand: click **Use this template** on GitHub to create your own repository, then connect it to floo. The floo GitHub App must be installed on the repository's owner and linked once with `floo apps github setup`.

```sh
floo apps github connect owner/repo
floo deploys watch
```

Invite your team. Admins can approve; members can only submit:

```sh
floo apps invite finance@example.com --role admin
floo apps invite rep@example.com --role member
```

## Customize

Give your agent prompts like these:

- "Stop admins from approving their own requests, and show the request as needing another admin."
- "Add a cost center field to requests, require it for purchases, and add it as a queue filter."
- "Let admins reopen a decided request, and keep every decision in a history table shown on the request page."
- "Require two admin approvals for purchases above an amount set in one constant."
- "Add a CSV export of the filtered queue for the monthly finance review."

## Local development

```sh
npm install
floo dev --fixture-user you@example.com --fixture-role admin
floo run --service web -- npm run seed
```

`floo dev` runs the migrations and starts the app against your dev database. Open the auth-proxied URL it prints to be signed in as the fixture user; use `--fixture-role member` to see the app as a member. `npm run seed` adds sample requests to an empty dev database, once; it never runs in production. `npm test` runs the type check, lint and tests without a database.

## How it works

| Route | Who | What |
| --- | --- | --- |
| `/` | Everyone | Your requests and their status |
| `/requests/new` | Everyone | Submit a request |
| `/requests/[id]` | The requester and admins | Details, audit trail, and the approve/reject form for admins |
| `/queue` | Admins | Every request, filtered by status and category |
| `/api-docs` | Everyone | The API reference |
| `/api/*` | App API keys | The JSON API |

**Roles.** floo sends each signed-in person's role (`admin` or `member`) to the app. The server checks it on every page and action; hiding a button is never the permission.

**Data model.** One `requests` table: title, category (`discount`, `purchase`, `access`, `time_off`, `other`), optional amount, justification, status (`pending`, `approved`, `rejected`), who submitted it, and who decided, when and with what comment. A request is decided once. A `users` table keeps the people who have signed in.

**API.** Every `/api` call needs an app API key with the `api` scope. To approve or reject, the key also needs `approvals.decide`, and its consumer is recorded as the decider.

| Method | Path | Does |
| --- | --- | --- |
| `GET` | `/api/requests?status=&category=` | List requests. Keys with `approvals.decide` see all; others see their own. |
| `POST` | `/api/requests` | Submit a request as the key's consumer |
| `POST` | `/api/requests/{id}/decision` | Approve or reject a pending request |
| `GET` | `/api/openapi.json` | The OpenAPI document |

```sh
floo apps consumers create queue-agent
floo apps keys create queue-agent --consumer queue-agent --scope api --scope approvals.decide
curl -H "Authorization: Bearer $KEY" "https://<your-app-url>/api/requests?status=pending"
```

`AGENTS.md` is the working guide for coding agents: layout, identity rules, schema changes, and adding endpoints.

---

Built on [floo](https://getfloo.com): build internal software.
