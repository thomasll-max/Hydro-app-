// The dictation panel of the day's entry (lot 11): a big text area, the browser's microphone when it works here (else a
// short word about the phone keyboard's microphone), « Relire avant d'enregistrer », and « Remplir le journal ». Without
// Claude (`ai` false, lot 11b) the rules fill the sheet, always to check: no review setting, « Remplir la saisie ».
import { Loader2, Mic, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AreaField } from "@/components/hydro/form"
import { Notice } from "@/components/hydro/primitives"
import { useSettings } from "@/app/settings-context"
import { useSpeech } from "@/lib/speech"
import { SwitchRow } from "@/screens/tools/equipment-shared"

export function VoicePanel({ ai, text, onText, busy, error, onFill }: { ai: boolean; text: string; onText: (t: string) => void; busy: boolean; error: string | null; onFill: () => void }) {
  const { t, settings, setVoiceReview } = useSettings()
  const speech = useSpeech(settings.lang, text, onText)
  return (
    <section id="e-voice" aria-labelledby="e-voice-title" className="mt-4 flex flex-col gap-3 rounded-[14px] border border-line p-3.5">
      <div>
        <h3 id="e-voice-title" className="display text-[1.0625rem] leading-tight">
          {t("voice.title")}
        </h3>
        <p className="mt-1 text-[0.78125rem] leading-snug text-fg-3">{t(ai ? "voice.hint" : "voice.hintRules")}</p>
      </div>
      <AreaField id="e-voice-text" label={t("voice.label")} value={text} onChange={onText} placeholder={t("voice.placeholder")} />
      {speech.available ? (
        <Button type="button" variant="outline" id="e-voice-mic" aria-pressed={speech.listening} onClick={speech.listening ? speech.end : speech.begin} className="h-11 self-start px-4 font-semibold">
          {speech.listening ? <Square className="size-4" /> : <Mic className="size-4" />}
          {speech.listening ? t("voice.stop") : t("voice.listen")}
        </Button>
      ) : (
        <p id="e-voice-nomic" className="text-[0.75rem] leading-snug text-fg-3">
          {t("voice.noMic")}
        </p>
      )}
      {speech.listening && (
        <p aria-live="polite" className="-mt-1.5 text-[0.75rem] text-water">
          {t("voice.listening")}
        </p>
      )}
      {/* An instant setting, not part of the entry: changing it does not ask before closing. */}
      {ai && (
        <div data-instant className="border-t border-line pt-1">
          <SwitchRow id="e-voice-review" label={t("voice.review")} hint={t("voice.reviewD")} checked={!!settings.voiceReview} onChange={setVoiceReview} />
        </div>
      )}
      {error && <Notice id="e-voice-error">{error}</Notice>}
      <Button type="button" variant="outline" id="e-voice-fill" onClick={onFill} disabled={!text.trim() || busy} className="h-12 w-full font-semibold">
        {busy && <Loader2 className="animate-spin" />}
        {busy ? t("voice.reading") : t(ai ? "voice.fill" : "voice.fillRules")}
      </Button>
    </section>
  )
}
