import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/workCategories";
import { openToken, RESOURCE } from "@/lib/mcpOAuth";
import { addActionToExistingTask } from "@/lib/mcpActionWorkflow";
import { normalizeMcpTitle, projectMaterialTitle } from "@/lib/mcpTitles";
import { captureProjectMaterial, projectSearchVariants, resolveExistingProject } from "@/lib/mcpProjectWorkflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const todayDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const write = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

function toolResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], structuredContent: value as Record<string, unknown> };
}

function toolError(error: unknown) {
  return { isError: true, content: [{ type: "text" as const, text: error instanceof Error ? error.message : "MediaOS request failed" }] };
}

async function executeManagerOperation(origin: string, accessToken: string, body: Record<string, unknown>) {
  const response = await fetch(new URL("/api/v1/manager", origin), {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json().catch(() => null) as { data?: unknown; error?: string } | null;
  if (!response.ok) throw new Error(result?.error ?? `MediaOS manager API returned ${response.status}`);
  return result?.data;
}

async function searchManager(origin: string, accessToken: string, query: string) {
  const url = new URL("/api/v1/manager", origin);
  url.searchParams.set("q", query);
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const result = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : `MediaOS manager API returned ${response.status}`);
  return result ?? {};
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const payload = token ? await openToken(token, "access") : null;
  const supabaseToken = payload?.supabase_access_token;
  const e2eUser = process.env.NODE_ENV !== "production" && process.env.OAUTH_E2E === "1" && supabaseToken === "oauth-e2e-access" && payload?.user_id === "00000000-0000-4000-8000-000000000001"
    ? { id: payload.user_id, email: "oauth-e2e@example.invalid", user_metadata: { full_name: "" } }
    : null;
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: supabaseToken ? { headers: { Authorization: `Bearer ${supabaseToken}` } } : {},
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: { user }, error } = e2eUser
    ? { data: { user: e2eUser }, error: null }
    : supabaseToken ? await supabase.auth.getUser(supabaseToken) : { data: { user: null }, error: new Error("unauthorized") };
  if (!payload || error || !user || user.id !== payload.user_id) {
    const response = NextResponse.json({ error: "unauthorized" }, { status: 401 });
    response.headers.set("WWW-Authenticate", `Bearer resource_metadata="${new URL("/.well-known/oauth-protected-resource", request.url).href}", scope="mediaos:read mediaos:write"`);
    return response;
  }
  const scopeSet = new Set((payload.scope ?? "mediaos:read mediaos:write").split(/\s+/));
  const callManager = (body: Record<string, unknown>) => {
    if (!scopeSet.has("mediaos:write")) throw new Error("This connection has read-only permission");
    return executeManagerOperation(request.nextUrl.origin, supabaseToken!, body);
  };

  const mcp = new McpServer({ name: "mediaos", version: "2.1.0" }, { instructions: "Use MediaOS as the source of truth for the user's projects, tasks, actions, documents, and materials. A request to create a project means the existing Project entity in the Projects column; search first and never create a same-name duplicate. Projects stay in the Projects column. Before creating a task, search existing tasks and read likely matches. A request to add an item to a list/task means create an action inside the existing task, not a new task. Use add_action_to_existing_task; if the list match is missing or ambiguous, ask the user. For a thought such as 'Идея для Таши: ...', use create_project_material: resolve one project, preserve the full original wording in material notes, and link the ordinary note material directly to that project. For 'Какие материалы есть по Таше?', use get_project_materials. Do not convert thoughts into tasks or special material types. Strip explicit assistant-command wrappers from saved titles (создай проект, добавь, запиши, внеси, напомни, купи/купить) while preserving meaningful task verbs such as 'сдать'. If a meaning or target is unclear, ask instead of guessing. After every write, require the tool's read-after-write verification before reporting success; otherwise say it could not be confirmed. Project context includes linked documents, material notes, and task/action history available in MediaOS; never invent missing facts. Use a new UUID idempotency_key per intended create and reuse it on retries. Categories are ideas, intentions, commitments, projects, wishes." });
  const uid = user.id;
  async function loadDocumentMaterials(documentIds: string[]) {
    if (!documentIds.length) return { links: [], materials: [] };
    const { data: links, error: linkError } = await supabase.from("document_materials").select("id,document_id,material_id,user_id,created_at").eq("user_id", uid).in("document_id", documentIds);
    if (linkError) throw linkError;
    const materialIds = [...new Set((links ?? []).map((link) => link.material_id))];
    const { data: materials, error: materialError } = materialIds.length
      ? await supabase.from("materials").select("id,title,material_type,notes,created_at,updated_at").eq("user_id", uid).in("id", materialIds)
      : { data: [], error: null };
    if (materialError) throw materialError;
    return { links: links ?? [], materials: materials ?? [] };
  }

  async function writeManagerAndVerify(body: Record<string, unknown>) {
    const result = await callManager(body) as Record<string, unknown>;
    const op = body.op;
    if (op === "unlink" || op === "unlink_material") {
      const table = op === "unlink_material" && body.target_kind === "document" ? "document_materials" : "work_links";
      const { data, error: readError } = await supabase.from(table).select("id").eq("id", String(body.id)).eq("user_id", uid).maybeSingle();
      if (readError) throw readError;
      if (data) throw new Error("MediaOS did not confirm unlink after saving; do not report success");
      return { ok: true, write_verification: "read_after_write" };
    }

    let table: "projects" | "tasks" | "actions" | "work_links" | "materials" | "document_materials";
    const resultObject = result as Record<string, unknown>;
    const nestedMaterial = resultObject.material as Record<string, unknown> | undefined;
    let id = typeof resultObject.id === "string" ? resultObject.id : typeof nestedMaterial?.id === "string" ? nestedMaterial.id : "";
    if (op === "create_project" || (op === "update" && body.kind === "project")) table = "projects";
    else if (op === "create_task" || (op === "update" && body.kind === "task") || (op === "complete" && body.kind === "task")) table = "tasks";
    else if (op === "create_action" || (op === "update" && body.kind === "action") || (op === "complete" && body.kind === "action")) table = "actions";
    else if (op === "link") table = "work_links";
    else if (op === "create_material" || op === "update_material" || ((op === "archive" || op === "restore") && body.kind === "material")) table = "materials";
    else if (op === "link_material") table = body.target_kind === "document" ? "document_materials" : "work_links";
    else if ((op === "archive" || op === "restore") && body.kind === "project") table = "projects";
    else if ((op === "archive" || op === "restore") && body.kind === "task") table = "tasks";
    else throw new Error("Unsupported write verification operation");

    if (op === "link" && !id) {
      const { parent_kind, parent_id, target_kind, target_id } = body;
      const parentColumn = parent_kind === "project" ? "project_id" : "task_id";
      const targetColumn = target_kind === "document" ? "document_id" : "material_id";
      let query = supabase.from("work_links").select("*").eq("user_id", uid);
      query = query.eq(parentColumn, String(parent_id)).eq(targetColumn, String(target_id));
      const { data, error: readError } = await query.maybeSingle();
      if (readError) throw readError;
      if (!data) throw new Error("MediaOS did not confirm link after saving; do not report success");
      return { ...data, write_verification: "read_after_write" };
    }

    if (!id && typeof body.id === "string") id = body.id;
    if (!id) throw new Error("MediaOS did not return an identifier to verify; do not report success");
    const { data: persisted, error: readError } = await supabase.from(table).select("*").eq("id", id).eq("user_id", uid).maybeSingle();
    if (readError) throw readError;
    if (!persisted) throw new Error("MediaOS did not confirm the write after saving; do not report success");

    const expected: Record<string, unknown> = {};
    if (op === "create_project") Object.assign(expected, { name: body.title, description: body.description ?? "", category: body.category });
    if (op === "create_task") Object.assign(expected, { title: body.title, project_id: body.project_id ?? null, category: body.category, due_date: body.due_date ?? null, event_at: body.event_at ?? null, description: body.description ?? "", notes: body.description ?? "" });
    if (op === "create_action") Object.assign(expected, { title: body.title, task_id: body.task_id, due_date: body.due_date ?? null, description: body.description ?? "" });
    if (op === "create_material") Object.assign(expected, { title: body.title, notes: body.notes || null, material_type: "other" });
    if (typeof body.submission_id === "string") expected.submission_id = body.submission_id;
    if (op === "update") {
      for (const [key, value] of Object.entries(body)) {
        if (!["op", "kind", "id"].includes(key) && value !== undefined) expected[body.kind === "project" && key === "title" ? "name" : key] = value;
      }
    }
    if (op === "complete") expected[body.kind === "task" ? "completed" : "done"] = body.value;
    if (op === "update_material") {
      if (typeof body.title === "string") expected.title = body.title.trim();
      if (typeof body.notes === "string") expected.notes = body.notes;
      if (typeof body.append_text === "string") {
        const oldNotes = typeof resultObject.previous_notes === "string" ? resultObject.previous_notes : resultObject.previous_notes === null ? "" : undefined;
        if (oldNotes !== undefined) expected.notes = oldNotes.trim() ? `${oldNotes.trim()}\n\n${body.append_text.trim()}` : body.append_text.trim();
      }
    }
    if (op === "archive") expected.archived_at = persisted.archived_at;
    if (op === "restore") expected.archived_at = null;
    for (const [key, value] of Object.entries(expected)) {
      if (persisted[key] !== value) throw new Error(`MediaOS read-back mismatch for ${key}; do not report success`);
    }
    if (op === "archive" && !persisted.archived_at) throw new Error("MediaOS did not confirm archived_at after saving; do not report success");
    return { ...persisted, write_verification: "read_after_write" };
  }

  mcp.registerTool("get_profile", {
    title: "Get connected MediaOS profile",
    description: "Return the account represented by these OAuth credentials. Use this to identify which MediaOS profile is connected.",
    inputSchema: {}, outputSchema: z.object({ id: z.string(), email: z.string().optional(), name: z.string().optional() }),
    annotations: readOnly, _meta: { "openai/profile": true },
  }, async () => toolResult({ id: uid, ...(user.email ? { email: user.email } : {}), ...(typeof user.user_metadata?.full_name === "string" ? { name: user.user_metadata.full_name } : {}) }));

  mcp.registerTool("search_mediaos", {
    title: "Search MediaOS", description: "Search projects, tasks, actions, documents and materials by title or text. Before creating a task, search the user's phrasing and read likely matches. For requests to add an item to an existing list or task, choose the existing task and create an action; do not create a new task. If the match is unclear, ask the user.",
    inputSchema: { query: z.string().min(1).max(200).describe("Search terms in Russian or English") }, annotations: readOnly,
  }, async ({ query }) => {
    try {
      const q = query.trim();
      if (!q) return toolResult({ projects: [], tasks: [], actions: [], documents: [], materials: [] });
      const result = await searchManager(request.nextUrl.origin, supabaseToken!, q) as Record<string, unknown>;
      return toolResult({ projects: result.projects ?? [], tasks: result.tasks ?? [], actions: result.actions ?? [], documents: result.documents ?? [], materials: result.materials ?? [] });
    } catch (err) { return toolError(err); }
  });

  mcp.registerTool("get_project_context", {
    title: "Read full project context", description: "Read one project and all its tasks, actions, linked documents (including content and publication status), materials and notes. Use this before answering what happened, where work stopped, or planning next steps. Requires a project ID from search_mediaos.",
    inputSchema: { project_id: z.string().uuid() }, annotations: readOnly,
  }, async ({ project_id }) => {
    try {
      const { data: project, error: projectError } = await supabase.from("projects").select("*").eq("id", project_id).eq("user_id", uid).maybeSingle();
      if (projectError) throw projectError;
      if (!project) throw new Error("Project not found");
      const [{ data: tasks, error: taskError }, { data: links, error: linkError }] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", uid).eq("project_id", project_id).order("sort_order"),
        supabase.from("work_links").select("*").eq("user_id", uid).eq("project_id", project_id),
      ]);
      if (taskError) throw taskError;
      if (linkError) throw linkError;
      const taskIds = (tasks ?? []).map((task) => task.id);
      const taskLinksPromise = taskIds.length ? supabase.from("work_links").select("*").eq("user_id", uid).in("task_id", taskIds) : Promise.resolve({ data: [], error: null });
      const { data: actions, error: actionError } = taskIds.length ? await supabase.from("actions").select("*").eq("user_id", uid).in("task_id", taskIds).order("sort_order") : { data: [], error: null };
      const { data: taskLinks, error: taskLinkError } = await taskLinksPromise;
      if (actionError) throw actionError;
      if (taskLinkError) throw taskLinkError;
      const allLinks = [...(links ?? []), ...(taskLinks ?? [])];
      const documentIds = [...new Set(allLinks.map((link) => link.document_id).filter(Boolean))] as string[];
      const materialIds = [...new Set(allLinks.map((link) => link.material_id).filter(Boolean))] as string[];
      const [{ data: documents, error: documentError }, { data: linkedMaterials, error: linkedMaterialError }, documentMaterialContext] = await Promise.all([
        documentIds.length ? supabase.from("documents").select("id,title,document_type,content_md,preview,site_status,site_locale,site_slug,site_published_at,created_at,updated_at").eq("user_id", uid).in("id", documentIds) : Promise.resolve({ data: [], error: null }),
        materialIds.length ? supabase.from("materials").select("id,title,material_type,notes,created_at,updated_at").eq("user_id", uid).in("id", materialIds) : Promise.resolve({ data: [], error: null }),
        loadDocumentMaterials(documentIds),
      ]);
      if (documentError) throw documentError;
      if (linkedMaterialError) throw linkedMaterialError;
      const materials = [...new Map([...(linkedMaterials ?? []), ...documentMaterialContext.materials].map((material) => [material.id, material])).values()];
      return toolResult({ project, tasks: tasks ?? [], actions: actions ?? [], links: allLinks, document_material_links: documentMaterialContext.links, documents: documents ?? [], materials });
    } catch (err) { return toolError(err); }
  });

  mcp.registerTool("get_project_materials", {
    title: "Read project materials",
    description: "Search for one existing project by name, then return ordinary materials directly linked to it and materials linked to its documents. Use for requests such as 'Какие материалы есть по Таше?'. If the project match is missing or ambiguous, ask which project the user means.",
    inputSchema: { project_query: z.string().min(1).max(200) }, annotations: readOnly,
  }, async ({ project_query }) => {
    try {
      let resolution: ReturnType<typeof resolveExistingProject> | undefined;
      for (const query of projectSearchVariants(project_query)) {
        const result = await searchManager(request.nextUrl.origin, supabaseToken!, query) as { projects?: { id: string; name: string }[] };
        resolution = resolveExistingProject(query, result.projects ?? []);
        if (resolution.status === "found" || resolution.reason === "multiple_project_matches") break;
      }
      if (!resolution || resolution.status !== "found") return toolResult({ found: false, needs_clarification: true, reason: resolution?.reason ?? "no_project_match", candidates: resolution?.candidates ?? [] });
      const project = resolution.project;
      const { data: links, error: linksError } = await supabase.from("work_links").select("material_id,document_id").eq("user_id", uid).eq("project_id", project.id);
      if (linksError) throw linksError;
      const directMaterialIds = (links ?? []).map((link) => link.material_id).filter(Boolean) as string[];
      const documentIds = (links ?? []).map((link) => link.document_id).filter(Boolean) as string[];
      const { data: documentLinks, error: documentLinksError } = documentIds.length
        ? await supabase.from("document_materials").select("material_id").eq("user_id", uid).in("document_id", documentIds)
        : { data: [], error: null };
      if (documentLinksError) throw documentLinksError;
      const materialIds = [...new Set([...directMaterialIds, ...(documentLinks ?? []).map((link) => link.material_id)])];
      const { data: materials, error: materialsError } = materialIds.length
        ? await supabase.from("materials").select("id,title,material_type,notes,file_url_or_path,created_at,updated_at").eq("user_id", uid).in("id", materialIds).order("created_at", { ascending: false })
        : { data: [], error: null };
      if (materialsError) throw materialsError;
      return toolResult({ found: true, project, materials: materials ?? [] });
    } catch (err) { return toolError(err); }
  });

  mcp.registerTool("get_material", {
    title: "Read a material",
    description: "Read one existing Material by its ID, including full notes, file information, creation time, and archive status. Use search_mediaos first to identify the right material.",
    inputSchema: { material_id: z.string().uuid() }, annotations: readOnly,
  }, async ({ material_id }) => {
    try {
      const { data, error: readError } = await supabase.from("materials").select("*").eq("id", material_id).eq("user_id", uid).maybeSingle();
      if (readError) throw readError;
      if (!data) throw new Error("Material not found");
      return toolResult({ material: data });
    } catch (err) { return toolError(err); }
  });

  mcp.registerTool("get_task_context", {
    title: "Read full task context", description: "Read one task, its parent project, all actions, and documents/materials linked directly to the task or through those documents. Use this for questions about progress, deadlines, notes, and what remains.",
    inputSchema: { task_id: z.string().uuid() }, annotations: readOnly,
  }, async ({ task_id }) => {
    try {
      const { data: task, error: taskError } = await supabase.from("tasks").select("*").eq("id", task_id).eq("user_id", uid).maybeSingle();
      if (taskError) throw taskError;
      if (!task) throw new Error("Task not found");
      const [{ data: project, error: projectError }, { data: actions, error: actionError }, { data: links, error: linkError }] = await Promise.all([
        task.project_id ? supabase.from("projects").select("*").eq("id", task.project_id).eq("user_id", uid).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from("actions").select("*").eq("user_id", uid).eq("task_id", task_id).order("sort_order"),
        supabase.from("work_links").select("*").eq("user_id", uid).eq("task_id", task_id),
      ]);
      if (projectError) throw projectError;
      if (actionError) throw actionError;
      if (linkError) throw linkError;
      const documentIds = [...new Set((links ?? []).map((link) => link.document_id).filter(Boolean))] as string[];
      const materialIds = [...new Set((links ?? []).map((link) => link.material_id).filter(Boolean))] as string[];
      const [{ data: documents, error: documentError }, { data: linkedMaterials, error: linkedMaterialError }, documentMaterialContext] = await Promise.all([
        documentIds.length ? supabase.from("documents").select("id,title,document_type,content_md,preview,site_status,site_locale,site_slug,site_published_at,created_at,updated_at").eq("user_id", uid).in("id", documentIds) : Promise.resolve({ data: [], error: null }),
        materialIds.length ? supabase.from("materials").select("id,title,material_type,notes,created_at,updated_at").eq("user_id", uid).in("id", materialIds) : Promise.resolve({ data: [], error: null }),
        loadDocumentMaterials(documentIds),
      ]);
      if (documentError) throw documentError;
      if (linkedMaterialError) throw linkedMaterialError;
      const materials = [...new Map([...(linkedMaterials ?? []), ...documentMaterialContext.materials].map((material) => [material.id, material])).values()];
      return toolResult({ project, task, actions: actions ?? [], links: links ?? [], document_material_links: documentMaterialContext.links, documents: documents ?? [], materials });
    } catch (err) { return toolError(err); }
  });

  mcp.registerTool("get_document_context", {
    title: "Read document context", description: "Open a MediaOS document with its complete saved Markdown, publication metadata, and attached materials and notes. Use only IDs returned by search_mediaos.",
    inputSchema: { document_id: z.string().uuid() }, annotations: readOnly,
  }, async ({ document_id }) => {
    try {
      const [{ data: document, error: documentError }, documentMaterialContext] = await Promise.all([
        supabase.from("documents").select("id,title,document_type,content_md,preview,site_status,site_locale,site_slug,site_published_at,created_at,updated_at").eq("id", document_id).eq("user_id", uid).maybeSingle(),
        loadDocumentMaterials([document_id]),
      ]);
      if (documentError) throw documentError;
      if (!document) throw new Error("Document not found");
      return toolResult({ document, document_material_links: documentMaterialContext.links, materials: documentMaterialContext.materials });
    } catch (err) { return toolError(err); }
  });

  mcp.registerTool("get_today", {
    title: "Read Today work", description: "Return incomplete tasks and actions whose due date is today or overdue, matching MediaOS Today. Dates use Europe/Moscow.",
    inputSchema: {}, annotations: readOnly,
  }, async () => {
    try {
      const today = todayDate();
      const [{ data: tasks, error: tasksError }, { data: actions, error: actionsError }] = await Promise.all([
        supabase.from("tasks").select("id,title,due_date,event_at,completed,project_id,category").eq("user_id", uid).is("archived_at", null).eq("completed", false).or(`due_date.lte.${today},event_at.lte.${today}T20:59:59+00:00`).order("due_date"),
        supabase.from("actions").select("id,title,task_id,due_date,done,tasks!inner(id,title,due_date,completed,archived_at)").eq("user_id", uid).eq("done", false).eq("tasks.completed", false).is("tasks.archived_at", null).not("due_date", "is", null).lte("due_date", today).order("due_date"),
      ]);
      if (tasksError) throw tasksError;
      if (actionsError) throw actionsError;
      return toolResult({ date: today, tasks: tasks ?? [], actions: actions ?? [] });
    } catch (err) { return toolError(err); }
  });

  const key = z.string().uuid().describe("A new UUID for this intended creation. Reuse the same value if retrying the same request; use another UUID for a separate item.");
  mcp.registerTool("create_project", {
    title: "Create project", description: "Create a Project entity in the Projects Kanban column. Search first; if an exact or ambiguous name already exists, return it for confirmation instead of making a duplicate. Project category is fixed to projects. Repeating the same idempotency key returns the original project.",
    inputSchema: { title: z.string().min(1).max(500), description: z.string().optional(), idempotency_key: key }, annotations: write,
  }, async ({ title, description, idempotency_key }) => {
    try {
      const normalizedTitle = normalizeMcpTitle(title);
      if (!normalizedTitle) throw new Error("Project title is empty after removing the assistant command");
      const search = await searchManager(request.nextUrl.origin, supabaseToken!, normalizedTitle) as { projects?: { id: string; name: string; submission_id?: string | null }[] };
      const existing = resolveExistingProject(normalizedTitle, search.projects ?? []);
      if (existing.status === "found") {
        if (existing.match === "partial") return toolResult({ created: false, needs_clarification: true, reason: "similar_project_name", candidates: existing.candidates });
        if (existing.project.submission_id === idempotency_key) return toolResult(await writeManagerAndVerify({ op: "create_project", title: normalizedTitle, description, category: "projects", submission_id: idempotency_key }));
        return toolResult({ created: false, already_exists: true, project: existing.project, needs_clarification: false });
      }
      if (existing.reason !== "no_project_match") return toolResult({ created: false, needs_clarification: true, reason: existing.reason, candidates: existing.candidates });
      return toolResult(await writeManagerAndVerify({ op: "create_project", title: normalizedTitle, description, category: "projects", submission_id: idempotency_key }));
    } catch (err) { return toolError(err); }
  });

  mcp.registerTool("create_project_material", {
    title: "Save material directly to a project",
    description: "Save an ordinary note material directly on an existing project, not as a task. For 'Идея для Таши: мышь должна появиться в кадре дважды', pass project_query='Таши' and content with the exact full original wording; the saved material title is the idea text, notes preserve the original phrase, and created_at comes from MediaOS. Searches first, asks if project or material title is ambiguous, and confirms the material plus project link by reading them back. Reuse idempotency_key on retries.",
    inputSchema: { project_query: z.string().min(1).max(200), content: z.string().min(1).max(5000), idempotency_key: key }, annotations: write,
  }, async (input) => {
    try {
      const result = await captureProjectMaterial(input, {
        searchProjects: async (query) => {
          const search = await searchManager(request.nextUrl.origin, supabaseToken!, query) as { projects?: { id: string; name: string }[] };
          return search.projects ?? [];
        },
        searchMaterials: async (query) => {
          const search = await searchManager(request.nextUrl.origin, supabaseToken!, query) as { materials?: { id: string; title: string }[] };
          return search.materials ?? [];
        },
        readMaterial: async (materialId, projectId) => {
          const [{ data: material, error: materialError }, { data: link, error: linkError }] = await Promise.all([
            supabase.from("materials").select("id,title,notes,created_at").eq("id", materialId).eq("user_id", uid).maybeSingle(),
            supabase.from("work_links").select("id,project_id,material_id").eq("user_id", uid).eq("project_id", projectId).eq("material_id", materialId).maybeSingle(),
          ]);
          if (materialError) throw materialError;
          if (linkError) throw linkError;
          return material ? { ...material, project_id: projectId, linked_to_project: !!link } : null;
        },
        createAndLink: async (item) => {
          const saved = await callManager({ op: "create_project_material", project_id: item.project_id, title: item.title, notes: item.notes, submission_id: item.idempotency_key }) as { material?: { id?: string } } | null;
          if (!saved?.material?.id) throw new Error("MediaOS did not return the saved material identifier");
          return { id: saved.material.id };
        },
      }, projectMaterialTitle);
      return toolResult(result);
    } catch (err) { return toolError(err); }
  });

  mcp.registerTool("create_material", {
    title: "Create a text material",
    description: "Create an ordinary text Material, optionally linked to one existing project, task, or document. Search for existing materials first; an exact title collision requires confirmation instead of creating a duplicate. Reuse idempotency_key on retries. Confirms the saved text and requested relationship by reading them back.",
    inputSchema: { title: z.string().min(1).max(500), notes: z.string().max(50000).optional(), project_id: z.string().uuid().optional(), task_id: z.string().uuid().optional(), document_id: z.string().uuid().optional(), idempotency_key: key }, annotations: write,
  }, async ({ title, notes, project_id, task_id, document_id, idempotency_key }) => {
    try {
      const normalizedTitle = normalizeMcpTitle(title);
      if (!normalizedTitle) throw new Error("Material title is empty after removing the assistant command");
      const targets = [project_id, task_id, document_id].filter(Boolean);
      if (targets.length > 1) throw new Error("Link the material to only one project, task, or document per create request");
      const result = await callManager({ op: "create_material", title: normalizedTitle, notes, project_id, task_id, document_id, submission_id: idempotency_key }) as { material?: { id?: string }; already_saved?: boolean } | null;
      const id = result?.material?.id;
      if (!id) throw new Error("MediaOS did not return a material identifier");
      const { data: saved, error: readError } = await supabase.from("materials").select("*").eq("id", id).eq("user_id", uid).maybeSingle();
      if (readError) throw readError;
      if (!saved || saved.title !== normalizedTitle || saved.notes !== (notes || null) || saved.material_type !== "other") throw new Error("MediaOS did not confirm the material text after saving; do not report success");
      let link: unknown = null;
      const targetKind = project_id ? "project" : task_id ? "task" : document_id ? "document" : null;
      const targetId = project_id ?? task_id ?? document_id;
      if (targetKind && targetId) {
        const { data: linkData, error: linkError } = targetKind === "document"
          ? await supabase.from("document_materials").select("id,document_id,material_id,created_at").eq("user_id", uid).eq("document_id", targetId).eq("material_id", id).maybeSingle()
          : await supabase.from("work_links").select("id,project_id,task_id,material_id,created_at").eq("user_id", uid).eq(targetKind === "project" ? "project_id" : "task_id", targetId).eq("material_id", id).maybeSingle();
        if (linkError) throw linkError;
        if (!linkData) throw new Error("MediaOS did not confirm the material relationship after saving; do not report success");
        link = linkData;
      }
      return toolResult({ material: saved, link, already_saved: result?.already_saved ?? false, write_verification: "read_after_write" });
    } catch (err) { return toolError(err); }
  });

  mcp.registerTool("update_material", {
    title: "Edit or append to a material",
    description: "Edit an existing material by ID. Supply title and/or replacement notes, or append_text to add a passage after the existing notes. Search/read first and never create a second material to make an edit. The updated row is read back before success is returned.",
    inputSchema: { material_id: z.string().uuid(), title: z.string().max(500).optional(), notes: z.string().max(50000).optional(), append_text: z.string().max(50000).optional() }, annotations: write,
  }, async ({ material_id, title, notes, append_text }) => {
    try {
      const result = await writeManagerAndVerify({ op: "update_material", id: material_id, ...(title !== undefined ? { title: normalizeMcpTitle(title) } : {}), ...(notes !== undefined ? { notes } : {}), ...(append_text !== undefined ? { append_text } : {}) });
      return toolResult(result);
    } catch (err) { return toolError(err); }
  });

  mcp.registerTool("link_material", {
    title: "Link a material",
    description: "Link an existing material to one project, task, or document without copying or changing it. Document links use the existing document_materials relationship. Confirms the link by reading it back.",
    inputSchema: { material_id: z.string().uuid(), target_kind: z.enum(["project", "task", "document"]), target_id: z.string().uuid() }, annotations: write,
  }, async ({ material_id, target_kind, target_id }) => {
    try { return toolResult(await writeManagerAndVerify({ op: "link_material", material_id, target_kind, target_id })); }
    catch (err) { return toolError(err); }
  });

  mcp.registerTool("unlink_material", {
    title: "Unlink a material",
    description: "Remove only the selected material relationship, not the material or document itself. Provide the relationship ID returned by the corresponding read/link tool and its target_kind.",
    inputSchema: { id: z.string().uuid(), target_kind: z.enum(["project", "task", "document"]) }, annotations: write,
  }, async ({ id, target_kind }) => {
    try { return toolResult(await writeManagerAndVerify({ op: "unlink_material", id, target_kind })); }
    catch (err) { return toolError(err); }
  });

  mcp.registerTool("archive_work_item", {
    title: "Archive a project, task, or material",
    description: "Reversibly archive one project, task, or material. No related records or links are deleted. Archived records remain searchable. Task completion is separate from archiving.",
    inputSchema: { kind: z.enum(["project", "task", "material"]), id: z.string().uuid() }, annotations: write,
  }, async ({ kind, id }) => {
    try { return toolResult(await writeManagerAndVerify({ op: "archive", kind, id })); }
    catch (err) { return toolError(err); }
  });

  mcp.registerTool("restore_work_item", {
    title: "Restore an archived project, task, or material",
    description: "Restore one archived project, task, or material to its existing category and relationships. Confirms archived_at is cleared by reading the row back.",
    inputSchema: { kind: z.enum(["project", "task", "material"]), id: z.string().uuid() }, annotations: write,
  }, async ({ kind, id }) => {
    try { return toolResult(await writeManagerAndVerify({ op: "restore", kind, id })); }
    catch (err) { return toolError(err); }
  });

  mcp.registerTool("create_task", {
    title: "Create a new outcome task", description: "Create a distinct outcome task only when the user explicitly asks for a new task/result. Before calling, use search_mediaos and read likely matching tasks. Do not use for adding an item to an existing list/task; use add_action_to_existing_task instead. Reuse idempotency_key on retries. The tool confirms success only after reading the saved row back from MediaOS.",
    inputSchema: { title: z.string().min(1).max(500), description: z.string().optional(), project_id: z.string().uuid().optional(), category: z.enum(CATEGORIES).default("intentions"), due_date: z.string().date().optional(), event_at: z.string().datetime().optional(), idempotency_key: key }, annotations: write,
  }, async ({ title, description, project_id, category, due_date, event_at, idempotency_key }) => { try { const normalizedTitle = normalizeMcpTitle(title); if (!normalizedTitle) throw new Error("Task title is empty after removing the assistant command"); return toolResult(await writeManagerAndVerify({ op: "create_task", title: normalizedTitle, description, project_id, category, due_date, event_at, submission_id: idempotency_key })); } catch (err) { return toolError(err); } });

  mcp.registerTool("create_action", {
    title: "Create action", description: "Create a concrete action under a known existing task ID. For a task name or list name, first search and read the task; if there is no single clear match, ask instead of creating a task. Success is returned only after the action is read back from MediaOS. Reuse idempotency_key for retries.",
    inputSchema: { title: z.string().min(1).max(500), description: z.string().optional(), task_id: z.string().uuid(), due_date: z.string().date().optional(), idempotency_key: key }, annotations: write,
  }, async ({ title, description, task_id, due_date, idempotency_key }) => { try { const normalizedTitle = normalizeMcpTitle(title); if (!normalizedTitle) throw new Error("Action title is empty after removing the assistant command"); return toolResult(await writeManagerAndVerify({ op: "create_action", title: normalizedTitle, description, task_id, due_date, submission_id: idempotency_key })); } catch (err) { return toolError(err); } });

  mcp.registerTool("add_action_to_existing_task", {
    title: "Add action to an existing task", description: "Find an existing task using MediaOS search, then add one action to it. Does not create tasks. If the task is missing or the results are ambiguous, returns candidates without writing; ask the user to choose. Confirms success only after reading the saved action back from MediaOS.",
    inputSchema: { task_query: z.string().min(1).max(200).describe("The task/list name from the user's request"), title: z.string().min(1).max(500).describe("The action to add"), description: z.string().optional(), due_date: z.string().date().optional(), idempotency_key: key }, annotations: write,
  }, async ({ task_query, title, description, due_date, idempotency_key }) => {
    try {
      const normalizedTitle = normalizeMcpTitle(title);
      if (!normalizedTitle) throw new Error("Action title is empty after removing the assistant command");
      const result = await addActionToExistingTask({ task_query, title: normalizedTitle, description, due_date, idempotency_key }, {
        searchTasks: async (query) => {
          const search = await searchManager(request.nextUrl.origin, supabaseToken!, query) as { tasks?: { id: string; title: string; project_id?: string | null; category?: string }[] };
          return search.tasks ?? [];
        },
        createAction: async (input) => {
          const saved = await callManager({ op: "create_action", ...input, submission_id: input.idempotency_key }) as { id?: string } | null;
          if (!saved?.id) throw new Error("MediaOS did not return the action identifier");
          return { id: saved.id };
        },
        readAction: async (id, taskId) => {
          const { data, error: readError } = await supabase.from("actions").select("id,task_id,title,description,due_date").eq("id", id).eq("task_id", taskId).eq("user_id", uid).maybeSingle();
          if (readError) throw readError;
          return data;
        },
      });
      if (result.created && result.action.title !== normalizeMcpTitle(title)) throw new Error("MediaOS read-back found a different action title; do not report success");
      return toolResult(result);
    } catch (err) { return toolError(err); }
  });

  mcp.registerTool("update_work_item", {
    title: "Update project, task or action", description: "Edit a project's name/description, a task's title/notes/category/deadline/project, or an action's title/notes/deadline/task. Use only fields explicitly supplied by the user or approved plan.",
    inputSchema: { kind: z.enum(["project", "task", "action"]), id: z.string().uuid(), title: z.string().max(500).optional(), description: z.string().optional(), category: z.enum(CATEGORIES).optional(), due_date: z.string().date().nullable().optional(), event_at: z.string().datetime().nullable().optional(), project_id: z.string().uuid().nullable().optional(), task_id: z.string().uuid().optional() }, annotations: write,
  }, async ({ kind, id, ...fields }) => { try { return toolResult(await writeManagerAndVerify({ op: "update", kind, id, ...fields })); } catch (err) { return toolError(err); } });

  mcp.registerTool("move_work_item", {
    title: "Move task to category", description: "Move a task between the five Kanban categories; this changes its category, not execution status. Projects are fixed in the Projects column and are reordered only within that column on the board.",
    inputSchema: { kind: z.literal("task"), id: z.string().uuid(), category: z.enum(CATEGORIES) }, annotations: write,
  }, async ({ kind, id, category }) => { try { return toolResult(await writeManagerAndVerify({ op: "update", kind, id, category })); } catch (err) { return toolError(err); } });

  mcp.registerTool("complete_work_item", {
    title: "Mark task or action complete", description: "Set a task's completion or an action's done state. This is separate from moving a card between categories.",
    inputSchema: { kind: z.enum(["task", "action"]), id: z.string().uuid(), completed: z.boolean() }, annotations: write,
  }, async ({ kind, id, completed }) => { try { return toolResult(await writeManagerAndVerify({ op: "complete", kind, id, value: completed })); } catch (err) { return toolError(err); } });

  mcp.registerTool("link_mediaos_resource", {
    title: "Link document or material", description: "Attach a document or material to a project or task. Use IDs found via search_mediaos; duplicate links are returned without creating another row.",
    inputSchema: { parent_kind: z.enum(["project", "task"]), parent_id: z.string().uuid(), target_kind: z.enum(["document", "material"]), target_id: z.string().uuid() }, annotations: write,
  }, async (input) => { try { return toolResult(await writeManagerAndVerify({ op: "link", ...input })); } catch (err) { return toolError(err); } });

  mcp.registerTool("unlink_mediaos_resource", {
    title: "Unlink document or material", description: "Remove a project/task relationship to a document or material. The underlying document/material is never deleted.",
    inputSchema: { link_id: z.string().uuid() }, annotations: write,
  }, async ({ link_id }) => { try { return toolResult(await writeManagerAndVerify({ op: "unlink", id: link_id })); } catch (err) { return toolError(err); } });

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await mcp.connect(transport);
  return transport.handleRequest(request);
}

export function GET() { return new NextResponse("MCP Streamable HTTP endpoint. Send JSON-RPC requests with POST.", { status: 405, headers: { Allow: "POST", "Content-Type": "text/plain" } }); }
export function DELETE() { return new NextResponse(null, { status: 405, headers: { Allow: "POST" } }); }
