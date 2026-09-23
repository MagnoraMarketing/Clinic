"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Voice demo in the browser via the Web Speech API (en-GB). The real AIbooking Voice
// runs server-side with telephony; this lets anyone try voice without any setup.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;
const LANG = "en-GB";

export function useSpeech(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<Recognition>(null);
  const cb = useRef(onFinal);
  cb.current = onFinal;

  useEffect(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec: Recognition = new SR();
    rec.lang = LANG;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let text = "";
      let final = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) final = true;
      }
      setInterim(text);
      if (final) {
        setInterim("");
        cb.current(text.trim());
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => rec.abort();
  }, []);

  const start = useCallback(() => {
    if (!recRef.current) return;
    window.speechSynthesis?.cancel();
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      /* already started */
    }
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    const synth = window.speechSynthesis;
    if (!synth) return onDone?.();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\p{Extended_Pictographic}|️|✓/gu, "").replace(/DKK (\d)/g, "$1 kroner "));
    u.lang = LANG;
    u.rate = 1.03;
    const voice = synth.getVoices().find((v) => v.lang === LANG) ?? synth.getVoices().find((v) => v.lang.startsWith("en"));
    if (voice) u.voice = voice;
    u.onend = () => onDone?.();
    synth.speak(u);
  }, []);

  return { supported, listening, interim, start, stop, speak };
}
