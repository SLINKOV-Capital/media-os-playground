import { AppShell } from "@/components/AppShell";
import { MaterialsListEditor } from "@/components/MaterialsListEditor";
import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createClient } from "@/lib/supabase/server";
import { MATERIAL_TYPES } from "@/lib/materialTypes";
import { importCloudMailImagePreview } from "@/lib/materialPreviewImport";
import type { Material } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";

type MaterialsPageProps = {
  searchParams: Promise<{ q?: string; type?: string }>;
};

export default async function MaterialsPage({
  searchParams,
}: MaterialsPageProps) {
  const { q, type } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  let query = supabase
    .from("materials")
    .select("*")
    .eq("user_id", user.id)
    .order("title", { ascending: true });

  if (q?.trim()) {
    query = query.ilike("title", `%${q.trim()}%`);
  }

  if (type?.trim()) {
    query = query.eq("material_type", type.trim());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch materials:", error.message);
  }

  const materials = await Promise.all(
    ((data ?? []) as Material[]).map(async (material) => {
      const hasCorrectlyNamedImportedPreview = /\/preview\.(?:gif|jpg|png)$/i.test(
        material.preview_url ?? ""
      );

      if (
        material.material_type !== "image" ||
        hasCorrectlyNamedImportedPreview
      ) {
        return material;
      }

      const importedPreviewUrl = await importCloudMailImagePreview({
        supabase,
        userId: user.id,
        materialId: material.id,
        fileUrlOrPath: material.file_url_or_path,
      });

      if (!importedPreviewUrl) {
        return material;
      }

      const { error: previewError } = await supabase
        .from("materials")
        .update({ preview_url: importedPreviewUrl })
        .eq("id", material.id)
        .eq("user_id", user.id);

      if (previewError) {
        console.error(
          "Failed to save recovered material preview:",
          previewError.message
        );
        return material;
      }

      return { ...material, preview_url: importedPreviewUrl };
    })
  );
  const activeType = type?.trim() ?? "";

  return (
    <AppShell>
      <div className="content-page">
        <header className="content-header">
          <div>
            <h1 className="content-title">Материалы</h1>
            <p className="content-subtitle">
              Глобальная библиотека источников, файлов и ссылок
            </p>
          </div>
          <Link href="/materials/new" className="notion-new-button">
            + Новый материал
          </Link>
        </header>

        <div className="materials-toolbar">
          <form method="get" className="materials-search-form">
            {activeType && (
              <input type="hidden" name="type" value={activeType} />
            )}
            <input
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Поиск по названию…"
              className="materials-search-input"
            />
          </form>

          <div className="materials-type-filters">
            <Link
              href={
                q?.trim()
                  ? `/materials?q=${encodeURIComponent(q.trim())}`
                  : "/materials"
              }
              className={`material-type-filter${activeType === "" ? " is-active" : ""}`}
            >
              Все
            </Link>
            {MATERIAL_TYPES.map((item) => {
              const params = new URLSearchParams();
              if (q?.trim()) {
                params.set("q", q.trim());
              }
              params.set("type", item.value);

              return (
                <Link
                  key={item.value}
                  href={`/materials?${params.toString()}`}
                  className={`material-type-filter${
                    activeType === item.value ? " is-active" : ""
                  }`}
                >
                  {item.icon} {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {materials.length === 0 ? (
          <div className="empty-state">
            <p>{q || activeType ? "Ничего не найдено" : "Пока нет материалов"}</p>
            {!q && !activeType && (
              <Link href="/materials/new" className="text-link">
                Создать первый материал
              </Link>
            )}
          </div>
        ) : (
          <MaterialsListEditor materials={materials} />
        )}
      </div>
    </AppShell>
  );
}
