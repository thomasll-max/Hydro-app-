// Outils → Demander à Claude (lot 6, Claude version only): a question about the selected space, sent with what the app
// knows (stage, targets with sources, last entries, last tank, missing data). Spends the viewer's own Claude usage:
// only on an explicit "Demander"; the first call asks the viewer's consent. A photo can go with the question (lot 12c)
// only where the view may send images (`sample: {images: true}` declared): otherwise its button is not there.
import { useEffect, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { AreaField } from "@/components/hydro/form"
import { Label, Reveal, SourceNote, Notice } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useGrow } from "@/app/grow-context"
import { todayIso } from "@/calc/stage"
import { askContext, askPrompt, ASK_SUGGESTIONS, MAX_TURNS, type AskPhoto, type AskTurn } from "@/calc/ask"
import { useSample, useSampleImages, type SampleError } from "@/lib/sample"
import { compressPhoto } from "@/lib/photo"
import { photoBlob } from "@/lib/thumbs"
import { takePendingPhoto } from "@/lib/ask-photo"
import { cn } from "@/lib/utils"

export function AskTool() {
  const { t, settings, dm } = useSettings()
  const { grow, space, cycle, targetsFor, all, equipment, assignments, photoUrl } = useGrow()
  const sample = useSample()
  const images = useSampleImages()
  // The photo to send with the next question: its JPEG, a preview, and what is known about it.
  const [photo, setPhoto] = useState<{ blob: Blob; url: string; meta: AskPhoto } | null>(null)
  useEffect(() => {
    // A photo handed by the gallery (« Demander à Claude » on a photo).
    const p = takePendingPhoto()
    if (!p) return
    photoUrl(p.id)
      .then((src) => photoBlob(src))
      .then((blob) => blob && setPhoto({ blob, url: URL.createObjectURL(blob), meta: { date: p.date, space: p.space, plant: p.plant, tags: p.tags } }))
  }, [photoUrl])
  const [q, setQ] = useState("")
  const [turns, setTurns] = useState<AskTurn[]>([])
  const [live, setLive] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const stop = useRef<AbortController | null>(null)

  if (!sample) return <p className="text-[0.8125rem] leading-[1.45] text-fg-3">{t("ask.unavailable")}</p>
  if (!space) return <p className="text-[0.8125rem] text-fg-3">{t("lgt.noSpace")}</p>

  const ask = async (question: string) => {
    const text = question.trim()
    if (!text || live != null || blocked) return
    const today = todayIso()
    const ctx = askContext({ grow, space, cycle, targets: cycle ? targetsFor(today, cycle) : null, entries: all.entries, mixes: all.mixes, equipment, assignments }, today)
    const sent = images ? photo : null
    const input = askPrompt(ctx, text, turns, settings.lang, sent?.meta)
    // The question as kept in the thread: the photo said in words (images are not sent again with later turns).
    const shown = sent ? `${t("ask.photoFrom", { date: dm(sent.meta.date) })} · ${text}` : text
    setErr(null)
    setQ("")
    setLive("")
    const ac = new AbortController()
    stop.current = ac
    try {
      const res = await sample(input, { onText: ({ text: whole }) => setLive(whole), signal: ac.signal, cache: false, ...(sent ? { images: [sent.blob] } : {}) })
      setTurns((h) => [...h, { role: "user" as const, content: shown }, { role: "assistant" as const, content: res.text }].slice(-MAX_TURNS * 2))
      if (sent) setPhoto(null)
    } catch (e) {
      const x = e as SampleError
      if (x.code === "not_granted") setBlocked(true)
      setErr(x.code === "not_granted" ? t("ask.notGranted") : x.code === "rate_limited" ? t("ask.rateLimited") : x.code === "aborted" ? t("ask.stopped") : t("ask.error"))
      if (x.text) setTurns((h) => [...h, { role: "user" as const, content: text }, { role: "assistant" as const, content: x.text! }])
    } finally {
      setLive(null)
      stop.current = null
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Reveal i={0}>
        <Card className="gap-2.5">
          <Label>{t("ask.title", { space: space.name })}</Label>
          <p className="text-[0.78125rem] leading-[1.45] text-fg-2">{t("ask.desc")}</p>
          {turns.length === 0 && live == null && (
            <div className="flex flex-wrap gap-1.5">
              {ASK_SUGGESTIONS.map((k) => (
                <button key={k} type="button" onClick={() => ask(t(k))} disabled={blocked} className="min-h-11 rounded-[10px] border border-line-strong px-3 py-2 text-left text-[0.78125rem] font-medium text-fg-2 hover:text-fg">
                  {t(k)}
                </button>
              ))}
            </div>
          )}
        </Card>
      </Reveal>

      {(turns.length > 0 || live != null) && (
        <Reveal i={1}>
          <Card className="gap-3" id="ask-thread">
            {turns.map((m, i) => (
              <Bubble key={i} me={m.role === "user"} text={m.content} />
            ))}
            {live != null && <Bubble me={false} text={live || t("ask.thinking")} pending />}
            {live != null && (
              <Button variant="outline" className="h-11 self-start" onClick={() => stop.current?.abort()}>
                {t("ask.stop")}
              </Button>
            )}
          </Card>
        </Reveal>
      )}

      <Reveal i={2}>
        <Card className="gap-2.5">
          <AreaField id="ask-q" label={turns.length ? t("ask.followUp") : t("ask.question")} value={q} onChange={setQ} placeholder={t("ask.placeholder")} />
          {images && photo && (
            <div className="flex items-center gap-2.5" id="ask-photo">
              <img src={photo.url} alt="" className="size-16 rounded-[8px] border border-line object-cover" />
              <span className="min-w-0 flex-1 text-[0.8125rem] text-fg-2">{t("ask.photoFrom", { date: dm(photo.meta.date) })}</span>
              <button type="button" onClick={() => setPhoto(null)} aria-label={t("ask.photoRemove")} className="flex size-11 items-center justify-center rounded-[10px] text-fg-2" id="ask-photo-remove">
                <X className="size-5" />
              </button>
            </div>
          )}
          {/* A label around the file field: touching it opens the phone's picker itself (a click sent by code is not
              always let through in the Claude app), and « image/* » like the day's entry (a list of types can keep
              the picker shut). The photo is turned into a JPEG before it goes. */}
          {images && !photo && (
            <label className={cn(buttonVariants({ variant: "outline" }), "h-11 cursor-pointer self-start has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-water")} id="ask-photo-add">
              <ImagePlus className="size-4" /> {t("ask.photoAdd")}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ""
                  if (!f) return
                  const blob = await compressPhoto(f)
                  if (!blob.type.startsWith("image/")) return setErr(t("ask.error"))
                  setPhoto({ blob, url: URL.createObjectURL(blob), meta: { date: todayIso(), space: space.name } })
                }}
              />
            </label>
          )}
          {err && <Notice>{err}</Notice>}
          <div className="flex gap-2">
            {turns.length > 0 && (
              <Button variant="outline" className="h-12" onClick={() => setTurns([])} disabled={live != null}>
                {t("ask.new")}
              </Button>
            )}
            <Button className="h-12 flex-1" onClick={() => ask(q)} disabled={!q.trim() || live != null || blocked}>
              {t("ask.send")}
            </Button>
          </div>
        </Card>
      </Reveal>
      <SourceNote>{t("ask.note")}</SourceNote>
    </div>
  )
}

function Bubble({ me, text, pending }: { me: boolean; text: string; pending?: boolean }) {
  return (
    <div className={cn("max-w-[92%] rounded-[14px] px-3.5 py-2.5 text-[0.84375rem] leading-[1.5] whitespace-pre-wrap", me ? "self-end bg-surface-2 text-fg" : "self-start border border-line text-fg", pending && "opacity-90")}>
      {text}
    </div>
  )
}
