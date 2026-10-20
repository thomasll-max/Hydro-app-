// The browser's speech recognition for the dictation (lot 11): SpeechRecognition / webkitSpeechRecognition, in the
// app's language, continuous, the words shown as they come. Absent (Brave, Firefox) or refused (microphone denied, a
// frame without the microphone): `available` turns false and the text area stays, for the phone keyboard's microphone.
import { useEffect, useRef, useState } from "react"
import type { Lang } from "@/i18n/types"

type Alt = { transcript: string }
type ResultList = { length: number; [i: number]: { isFinal: boolean; 0: Alt } }
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { resultIndex: number; results: ResultList }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

export const SPEECH_LANG: Record<Lang, string> = { fr: "fr-FR", en: "en-US", de: "de-DE" }

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * `text` grows while listening (what was there before, then the final words, then the words still being heard).
 * `refused` is set when the browser has no recognition or the microphone was denied.
 */
export function useSpeech(lang: Lang, base: string, onText: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [refused, setRefused] = useState(() => !ctor())
  const rec = useRef<Recognition | null>(null)
  const start = useRef("")
  const finals = useRef("")
  useEffect(() => () => rec.current?.abort(), [])

  const begin = () => {
    const C = ctor()
    if (!C) return setRefused(true)
    const r = new C()
    r.lang = SPEECH_LANG[lang]
    r.continuous = true
    r.interimResults = true
    start.current = base.trim() ? `${base.trim()} ` : ""
    finals.current = ""
    r.onresult = (e) => {
      let interim = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0].transcript
        if (e.results[i].isFinal) finals.current += piece
        else interim += piece
      }
      onText(`${start.current}${finals.current}${interim}`.replace(/\s+/g, " ").trimStart())
    }
    r.onerror = (e) => {
      // Refused or impossible here (a frame without the microphone): the keyboard's microphone remains.
      if (["not-allowed", "service-not-allowed", "audio-capture"].includes(e.error)) setRefused(true)
    }
    r.onend = () => {
      setListening(false)
      rec.current = null
    }
    try {
      r.start()
      rec.current = r
      setListening(true)
    } catch {
      setRefused(true)
    }
  }
  const end = () => rec.current?.stop()
  return { available: !refused, listening, begin, end }
}
