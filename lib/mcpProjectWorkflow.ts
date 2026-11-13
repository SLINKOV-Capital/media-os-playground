export type ExistingProject = { id: string; name: string; submission_id?: string | null };

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

export function findDuplicateProjectName(title: string, candidates: ExistingProject[], exclude?: { id?: string; submission_id?: string | null }) {
  const wanted = normalize(title);
  if (!wanted) return null;
  return candidates.find((project) => {
    if (exclude?.id && project.id === exclude.id) return false;
    if (exclude?.submission_id && project.submission_id === exclude.submission_id) return false;
    return normalize(project.name) === wanted;
  }) ?? null;
}

export function resolveExistingProject(query: string, candidates: ExistingProject[]) {
  const normalizedQuery = normalize(query);
  const unique = [...new Map(candidates.map((project) => [project.id, project])).values()];
  const exact = unique.filter((project) => normalize(project.name) === normalizedQuery);
  if (exact.length === 1) return { status: "found" as const, match: "exact" as const, project: exact[0], candidates: exact };
  if (exact.length > 1) return { status: "clarify" as const, reason: "duplicate_exact_names", candidates: exact };
  const matches = unique.filter((project) => {
    const name = normalize(project.name);
    return !!normalizedQuery && (name.includes(normalizedQuery) || normalizedQuery.includes(name));
  });
  if (matches.length === 1) return { status: "found" as const, match: "partial" as const, project: matches[0], candidates: matches };
  return {
    status: "clarify" as const,
    reason: matches.length ? "multiple_project_matches" : "no_project_match",
    candidates: matches.length ? matches : unique,
  };
}

/** Search variants still go through the existing MediaOS search endpoint. */
export function projectSearchVariants(query: string) {
  const value = query.trim();
  const variants = [value];
  const normalized = value.replace(/[.!?,:;]+$/u, "").trim();
  if (/[^\s][иы]$/iu.test(normalized)) {
    const stem = normalized.slice(0, -1).trim();
    if (stem.length >= 3 && !variants.includes(stem)) variants.push(stem);
  }
  return variants;
}

export type PersistedProjectMaterial = {
  id: string;
  project_id: string;
  title: string;
  notes: string | null;
  created_at: string;
  linked_to_project: boolean;
};

export type CaptureProjectMaterialInput = {
  project_query: string;
  content: string;
  idempotency_key: string;
};

export type CaptureProjectMaterialDependencies = {
  searchProjects: (query: string) => Promise<ExistingProject[]>;
  searchMaterials: (query: string) => Promise<{ id: string; title: string }[]>;
  readMaterial: (materialId: string, projectId: string) => Promise<PersistedProjectMaterial | null>;
  createAndLink: (input: { project_id: string; title: string; notes: string; idempotency_key: string }) => Promise<{ id: string }>;
};

function normalizeTitle(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

export async function captureProjectMaterial(
  input: CaptureProjectMaterialInput,
  dependencies: CaptureProjectMaterialDependencies,
  titleForContent: (content: string) => string,
) {
  const queries = projectSearchVariants(input.project_query);
  const projectCandidates = new Map<string, ExistingProject>();
  let resolution: ReturnType<typeof resolveExistingProject> | undefined;
  for (const query of queries) {
    for (const project of await dependencies.searchProjects(query)) projectCandidates.set(project.id, project);
    if (projectCandidates.size) {
      resolution = resolveExistingProject(query, [...projectCandidates.values()]);
      if (resolution.status === "found" || resolution.reason === "multiple_project_matches") break;
    }
  }
  resolution ??= resolveExistingProject(input.project_query, [...projectCandidates.values()]);
  if (resolution.status !== "found") {
    return { created: false as const, needs_clarification: true as const, reason: resolution.reason, candidates: resolution.candidates };
  }

  const title = titleForContent(input.content);
  const notes = input.content;
  if (!title || !notes) throw new Error("A material title and original content are required");
  const matches = await dependencies.searchMaterials(title);
  const exactMatches = [...new Map(matches.filter((item) => normalizeTitle(item.title) === normalizeTitle(title)).map((item) => [item.id, item])).values()];
  if (exactMatches.length) {
    if (exactMatches.length === 1) {
      const saved = await dependencies.readMaterial(exactMatches[0].id, resolution.project.id);
      if (saved?.linked_to_project && saved.project_id === resolution.project.id && saved.title === title && saved.notes === notes && saved.created_at) {
        return { created: false as const, already_saved: true as const, project: resolution.project, material: saved, verification: { read_after_write: true as const } };
      }
    }
    return { created: false as const, needs_clarification: true as const, reason: "material_title_exists", candidates: exactMatches, project: resolution.project };
  }

  const created = await dependencies.createAndLink({ project_id: resolution.project.id, title, notes, idempotency_key: input.idempotency_key });
  const saved = await dependencies.readMaterial(created.id, resolution.project.id);
  if (!saved || saved.id !== created.id || saved.project_id !== resolution.project.id || !saved.linked_to_project || saved.title !== title || saved.notes !== notes || !saved.created_at) {
    throw new Error("MediaOS did not confirm the project material after saving; do not report success");
  }
  return { created: true as const, project: resolution.project, material: saved, verification: { read_after_write: true as const } };
}
