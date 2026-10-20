// The tags of a photo (lot 12b): the observation tags of the journal, and free tags (« trichomes », « racines »…), the
// ones used before offered first. In the viewer they are saved at once; in the day's entry, with the entry.
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { secondary } from "@/components/hydro/styles"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { cleanTag, freeTagsUsed, type PhotoTags } from "@/calc/gallery"
import { OBS_TAGS, type Entry, type ObsTag } from "@/model/types"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"

/** The tags of one photo: the observation tags, and free tags (the ones used before are offered first). */
export function TagsEditor({ entry, photoId, onSave, local }: { entry: Entry; photoId: string; onSave?: (e: Entry) => Promise<unknown>; local?: { tags: PhotoTags; set: (t: PhotoTags) => void } }) {
  const { t } = useSettings()
  const { all } = useGrow()
  const [draft, setDraft] = useState("")
  const tags: PhotoTags = local ? local.tags : (entry.photoTags?.[photoId] ?? {})
  const used = useMemo(() => freeTagsUsed(all.entries), [all.entries])
  const offered = [...new Set([...(tags.free ?? []), ...used])].slice(0, 12)
  const write = async (next: PhotoTags) => {
    const clean: PhotoTags = { ...(next.obs?.length ? { obs: next.obs } : {}), ...(next.free?.length ? { free: next.free } : {}) }
    if (local) return local.set(clean)
    const map = { ...(entry.photoTags ?? {}) }
    if (clean.obs || clean.free) map[photoId] = clean
    else delete map[photoId]
    try {
      await onSave?.({ ...entry, photoTags: Object.keys(map).length ? map : undefined })
    } catch (e) {
      toast.error(t("common.saveError", { reason: (e as Error)?.message ?? "?" }))
    }
  }
  const toggleObs = (x: ObsTag) => write({ ...tags, obs: tags.obs?.includes(x) ? tags.obs.filter((y) => y !== x) : [...(tags.obs ?? []), x] })
  const toggleFree = (x: string) => write({ ...tags, free: tags.free?.includes(x) ? tags.free.filter((y) => y !== x) : [...(tags.free ?? []), x] })
  const add = () => {
    const x = cleanTag(draft)
    setDraft("")
    if (x && !tags.free?.includes(x)) write({ ...tags, free: [...(tags.free ?? []), x] })
  }
  const chip = (on: boolean) => cn("hit h-9 shrink-0 rounded-full border px-3 text-[0.75rem] font-semibold whitespace-nowrap", on ? "border-fg bg-fg text-background" : "border-line-strong text-fg-2")
  return (
    <div className="mt-3 flex flex-col gap-2" id="photo-tags" role="group" aria-label={t("ph.tagsOf")}>
      <span className="text-[0.8125rem] font-semibold text-fg-2">{t("ph.tags")}</span>
      <div className="flex flex-wrap gap-1.5">
        {OBS_TAGS.filter((x) => x !== "other").map((x) => (
          <button key={x} type="button" aria-pressed={!!tags.obs?.includes(x)} className={chip(!!tags.obs?.includes(x))} onClick={() => toggleObs(x)} data-tag={`obs:${x}`}>
            {t(`obs.${x}` as MessageKey)}
          </button>
        ))}
        {offered.map((x) => (
          <button key={x} type="button" aria-pressed={!!tags.free?.includes(x)} className={chip(!!tags.free?.includes(x))} onClick={() => toggleFree(x)} data-tag={`free:${x}`}>
            {x}
          </button>
        ))}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("ph.tagPh")}
          maxLength={30}
          aria-label={t("ph.tagPh")}
          className="h-11 min-w-0 flex-1 rounded-[10px] border border-line-strong bg-transparent px-3 text-[0.875rem] outline-none focus-visible:border-water"
          id="photo-tag-input"
        />
        <button type="submit" className={secondary} disabled={!cleanTag(draft)} id="photo-tag-add">
          {t("ph.tagAdd")}
        </button>
      </form>
    </div>
  )
}

