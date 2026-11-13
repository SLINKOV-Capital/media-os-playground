# MediaOS MCP for ChatGPT

## Endpoint and authorization

- Streamable HTTP MCP endpoint: `https://app.soloten.com/api/mcp`
- Protected resource metadata: `https://app.soloten.com/.well-known/oauth-protected-resource`
- OAuth authorization server metadata: `https://app.soloten.com/.well-known/oauth-authorization-server`
- Authorization and token endpoints: `/oauth/authorize` and `/oauth/token`
- OAuth uses CIMD for ChatGPT's published client document, authorization code + PKCE S256, a user consent page, encrypted short-lived codes/tokens, and the existing Supabase email/password session. `MCP_OAUTH_ENCRYPTION_KEY` is a sensitive 32-byte base64 key configured in Vercel Production.
- Access tokens contain a short-lived, encrypted wrapper around the Supabase user's access token; the MCP server validates both the wrapper and current Supabase user. No service-role key is used.
- All database access uses the existing Supabase project, authenticated user JWT and owner-scoped RLS. Mutations go through `/api/v1/manager`; no model input is executed as SQL.

## Available tools

Read-only:

- `get_profile` — the connected MediaOS account.
- `search_mediaos` — search projects, tasks, actions, documents and materials.
- `get_project_context` — project, tasks, actions, related documents and their saved content/publication metadata, materials and notes.
- `get_project_materials` — materials linked directly to a project or to its documents, with creation dates.
- `get_material` — read one material and its full saved notes, metadata, and archive marker.
- `get_task_context` — task, parent project, actions, related documents and materials.
- `get_document_context` — full saved document Markdown, publication metadata, attached materials and notes.
- `get_today` — incomplete tasks and actions overdue or due today, using the Today page date rules.
- `add_action_to_existing_task` — search an existing task and add an action under its ID. It does not create tasks; if the task cannot be identified safely, it returns candidates without writing.

Write:

- `create_project`, `create_task`, `create_action` — create work after user request/approval; create calls take a UUID `idempotency_key` that must be reused on retries. Projects are always stored in the Projects Kanban column, and same-name projects are checked before creation.
- `create_project_material` — save an ordinary text material (`material_type: other`) with the original wording in `materials.notes`, linked directly to one existing project through `work_links`. It verifies the material, timestamp and project link by reading them back. Repeating the same title and wording for the same project returns the existing confirmed material rather than creating another.
- `create_material`, `update_material` — create an ordinary text material or edit its title/notes; `append_text` adds to existing notes while preserving them.
- `link_material`, `unlink_material` — attach or detach an existing material to/from a project, task, or document. Document attachments use the existing `document_materials` relation; project/task links use `work_links`.
- `archive_work_item`, `restore_work_item` — reversibly archive or restore projects, tasks, and materials. Search results still include archived records and expose `archived_at`.
- `update_work_item` — update project/task/action title, description, category, due date, event time, or parent relation.
- `move_work_item` — move a task between the five categories. Projects cannot leave the Projects column; they can be reordered within it.
- `complete_work_item` — set the task completed or action done flag independently from category.
- `link_mediaos_resource`, `unlink_mediaos_resource` — manage document/material relationships without deleting the underlying content.

## Write and task-selection guarantees

- Every MCP write is followed by an owner-scoped read from MediaOS. A tool reports success only if the saved row/link (or unlink absence) matches the requested values.
- For a request to add an item to an existing task/list, use `add_action_to_existing_task`. It reuses the existing manager search API, writes only after a unique title match, and returns clarification candidates without writing for missing or ambiguous matches.
- `create_task` is for a distinct outcome explicitly requested by the user. Search first; do not use it to add an item to an existing list.
- Before a project is created, MediaOS searches the existing project list. Exact duplicates are returned without writing; similar or ambiguous matches are returned for clarification.
- MCP strips explicit assistant-command wrappers from new titles (for example, `Купи телогрейку` becomes `Телогрейка`) and keeps meaningful action verbs such as `Сдать отчёт`. It does not rewrite existing records.
- Project thoughts are ordinary materials, not tasks or a new material type. Their original request is saved in `notes`; project lookup and material retrieval use the existing manager search and project-material links.
- Material creation uses the existing Materials table. It does not delete or rewrite document-material links. A matching material title is surfaced for clarification rather than silently creating another copy.
- Project/task/material “delete” operations in the Manager and Materials UI now archive records. Restoring clears only `archived_at`; task completion stays independent. Database foreign keys reject physical deletion when it would cascade through actions or saved relationships.
- MCP can enforce these rules only when a client calls the corresponding tool. It cannot force ChatGPT (or another MCP client) to choose the right tool from natural language, nor verify what the assistant later tells the user. That client behavior needs a separate cross-chat acceptance test.

## Google Drive project folders

The ChatGPT Google Drive connector is available in the current ChatGPT session, but its authorization is not available to the MediaOS Vercel runtime. The Production project currently has no Google Drive credentials, and the `projects` table has no folder URL field. Automatic folder creation and saving the folder link are therefore not active. Do not create or configure a new authorization flow until the user approves a backend-access method.

## Add to ChatGPT

In ChatGPT on the web, open **Plugins**, choose **+ → Add custom MCP server**, enter the name `MediaOS` and URL above, choose **OAuth**, review the connection warning, then create it as a plugin and install it. The first use opens MediaOS sign-in (if needed) and an explicit consent screen. The OAuth flow uses ChatGPT's CIMD client metadata document and requires no copied keys or tokens.

When planning, first use search/context tools. Create or change data only when the user explicitly asks or approves the proposed plan. Reuse the same `idempotency_key` if a create call is retried.

## Deployment notes

The Vercel Production environment requires `MCP_OAUTH_ENCRYPTION_KEY` as a sensitive secret. Generate a new 32-byte random base64 value for a fresh deployment if the current Vercel secret has been removed; do not commit it or place it in any `NEXT_PUBLIC_*` variable. If rotating it, deploy during a reconnect window because existing MCP tokens will no longer decrypt.
