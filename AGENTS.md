# MediaOS repository instructions

- Product model: Project groups Tasks; Task is an outcome; Action is work toward a Task and does not complete it automatically; Document is publication content.
- The five Kanban columns (Ideas, Intentions, Commitments, Projects, Wishes) are movable card categories, never execution states.
- Preserve document Markdown, media, materials, publication metadata, public routes, and URLs when changing task management.
- Use Supabase user sessions and owner-scoped RLS. Do not expose service-role credentials or arbitrary SQL to integrations.
- Keep Obsidian as an external `obsidian://` link; do not copy or sync vault contents.
- Add schema changes as migrations. Avoid reading or changing unrelated user data.
