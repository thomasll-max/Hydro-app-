// Export of a cycle's review (lot 12a): a CSV (";" separator, decimal comma in French and German, like the journal's
// CSV) and a simple printable HTML page (no PDF to generate: the phone prints or saves it as PDF itself).
import type { Lang } from "@/i18n/types"
import type { CycleReview, ReviewRow, ReviewUnit } from "@/calc/review"
import { reviewRows } from "@/calc/review"
import type { StageKey } from "@/model/types"
import { csvCell } from "./backup"

export type ReviewText = {
  lang: Lang
  /** Head of the CSV, already in the language (« Section;Étape;Mesure;… »). */
  head: string
  section: (s: ReviewRow["section"]) => string
  stage: (s: StageKey) => string
  label: (r: ReviewRow) => string
  unit: (u: ReviewUnit) => string
  /** A number as shown in the app (HTML), a date with the year. */
  num: (v: number, digits: number) => string
  date: (iso: string) => string
}

export function reviewCsv(rv: CycleReview, x: ReviewText): string {
  const c = (v: unknown) => csvCell(v, x.lang)
  const lines = reviewRows(rv).map((r) =>
    [
      c(x.section(r.section)),
      c(r.stage ? x.stage(r.stage) : ""),
      c(x.label(r)),
      r.date ? c(r.date) : c(r.value),
      c(x.unit(r.unit)),
      c(r.line?.min),
      c(r.line?.max),
      c(r.line?.n),
      r.line?.withTarget ? c(`${r.line.inTarget}/${r.line.withTarget}`) : "",
    ].join(";"),
  )
  return [x.head, ...lines].join("\n")
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/** A page to print: the title, then one table per section, then the notes; light, no script, no outside resource. */
export function reviewHtml(rv: CycleReview, x: ReviewText, p: { title: string; sub: string; foot: string; missing: string; notes: { label: string; text: string }[]; extra?: { title: string; lines: string[] }[] }): string {
  const rows = reviewRows(rv)
  const cell = (r: ReviewRow) => (r.date ? x.date(r.date) : r.value != null ? `${x.num(r.value, r.digits)}${x.unit(r.unit) ? ` ${x.unit(r.unit)}` : ""}` : `<i>${esc(p.missing)}</i>`)
  const table = (list: ReviewRow[]) =>
    `<table>${list
      .map((r) => {
        const more = r.line ? ` <small>${esc(`${x.num(r.line.min, r.digits)}–${x.num(r.line.max, r.digits)} · n ${r.line.n}${r.line.withTarget ? ` · ${r.line.inTarget}/${r.line.withTarget}` : ""}`)}</small>` : ""
        return `<tr><th>${esc(x.label(r))}</th><td>${r.date || r.value != null ? esc(cell(r)) : cell(r)}${more}</td></tr>`
      })
      .join("")}</table>`
  const sections: string[] = []
  for (const s of ["result", "calendar", "conduct", "tanks"] as const) {
    const list = rows.filter((r) => r.section === s)
    if (!list.length) continue
    if (s === "conduct") {
      const stages = [...new Set(list.map((r) => r.stage!))]
      sections.push(`<h2>${esc(x.section(s))}</h2>${stages.map((st) => `<h3>${esc(x.stage(st))}</h3>${table(list.filter((r) => r.stage === st))}`).join("")}`)
    } else sections.push(`<h2>${esc(x.section(s))}</h2>${table(list)}`)
  }
  for (const e of p.extra ?? []) if (e.lines.length) sections.push(`<h2>${esc(e.title)}</h2><ul>${e.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`)
  const notes = p.notes.filter((n) => n.text.trim()).map((n) => `<h3>${esc(n.label)}</h3><p>${esc(n.text).replace(/\n/g, "<br>")}</p>`)
  return `<!doctype html><html lang="${x.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.title)}</title><style>
body{font:15px/1.45 system-ui,sans-serif;color:#18201b;margin:24px auto;max-width:720px;padding:0 16px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:22px 0 6px;border-bottom:1px solid #ccd3cf;padding-bottom:4px}h3{font-size:15px;margin:14px 0 4px}
table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #e3e8e5;vertical-align:top}th{font-weight:500;width:45%}
td{font-variant-numeric:tabular-nums}small{color:#5c6862}i{color:#7a857f}p.sub{color:#5c6862;margin:0}footer{margin-top:28px;color:#7a857f;font-size:12px}
@media print{body{margin:0}h2{break-after:avoid}tr{break-inside:avoid}}
</style></head><body><h1>${esc(p.title)}</h1><p class="sub">${esc(p.sub)}</p>${sections.join("")}${notes.length ? notes.join("") : ""}<footer>${esc(p.foot)}</footer></body></html>`
}
