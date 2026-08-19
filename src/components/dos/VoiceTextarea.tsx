"use client";

import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";

/**
 * Shared text/voice response control (USA-170: one DOS experience,
 * permission-scoped). The full DOS Journey and the participant Journey render
 * this same component, so the response controls cannot drift apart.
 *
 * `autoGrow` is the participant surface's sizing behavior: the field grows
 * with the text instead of scrolling inside itself.
 */

type SpeechRecognitionResultLike = {
  isFinal?: boolean;
  [index: number]: { transcript?: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  const speechWindow = window as SpeechRecognitionWindow;

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function VoiceTextarea({
  autoGrow = false,
  className = "",
  disabled,
  onClick,
  onKeyUp,
  onSelect,
  ...props
}: Omit<ComponentProps<"textarea">, "ref"> & { autoGrow?: boolean }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceSessionRef = useRef<{ after: string; before: string } | null>(null);
  const savedSelectionRef = useRef<{ end: number; start: number } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionConstructor()));

    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!autoGrow || !textarea) {
      return;
    }

    const resize = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    resize();
    textarea.addEventListener("input", resize);

    return () => textarea.removeEventListener("input", resize);
  }, [autoGrow]);

  function rememberSelection() {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    savedSelectionRef.current = {
      end: textarea.selectionEnd ?? textarea.value.length,
      start: textarea.selectionStart ?? textarea.value.length,
    };
  }

  function setTextareaValue(value: string, cursorPosition: number) {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;

    valueSetter?.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();
    textarea.setSelectionRange(cursorPosition, cursorPosition);
    savedSelectionRef.current = { end: cursorPosition, start: cursorPosition };
  }

  function prepareVoiceSession() {
    const textarea = textareaRef.current;

    if (!textarea) {
      return null;
    }

    const savedSelection = savedSelectionRef.current;
    const fallbackCursor = textarea.value.length;
    const start = Math.min(savedSelection?.start ?? fallbackCursor, textarea.value.length);
    const end = Math.min(savedSelection?.end ?? start, textarea.value.length);

    textarea.focus();
    textarea.setSelectionRange(start, end);

    const session = {
      after: textarea.value.slice(end),
      before: textarea.value.slice(0, start),
    };

    voiceSessionRef.current = session;

    return session;
  }

  function applyVoiceTranscript(transcript: string) {
    const session = voiceSessionRef.current;
    const cleanTranscript = transcript.replace(/\s+/g, " ").trim();

    if (!session) {
      return;
    }

    const prefix = session.before && cleanTranscript && !/\s$/.test(session.before) ? " " : "";
    const suffix = session.after && cleanTranscript && !/^\s/.test(session.after) ? " " : "";
    const nextValue = `${session.before}${prefix}${cleanTranscript}${suffix}${session.after}`;
    const nextCursor = session.before.length + prefix.length + cleanTranscript.length;

    setTextareaValue(nextValue, nextCursor);
  }

  function startListening() {
    const Recognition = getSpeechRecognitionConstructor();

    if (!Recognition) {
      return;
    }

    recognitionRef.current?.abort();
    const session = prepareVoiceSession();

    if (!session) {
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = document.documentElement.lang || "en-US";
    recognition.onresult = (event) => {
      const transcriptParts: string[] = [];

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript?.replace(/\s+/g, " ").trim();

        if (transcript) {
          transcriptParts.push(transcript);
        }
      }

      applyVoiceTranscript(transcriptParts.join(" "));
    };
    recognition.onerror = () => {
      setIsListening(false);
      voiceSessionRef.current = null;
    };
    recognition.onend = () => {
      setIsListening(false);
      voiceSessionRef.current = null;
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }

  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    startListening();
  }

  const buttonTitle = isSupported ? (isListening ? "Stop voice input" : "Start voice input") : "Voice input is not available in this browser";

  return (
    <div>
      <div className="relative">
        <textarea
          {...props}
          className={`${className} pr-[7.25rem] max-[360px]:pr-14`}
          disabled={disabled}
          onClick={(event) => {
            rememberSelection();
            onClick?.(event);
          }}
          onKeyUp={(event) => {
            rememberSelection();
            onKeyUp?.(event);
          }}
          onSelect={(event) => {
            rememberSelection();
            onSelect?.(event);
          }}
          ref={textareaRef}
        />
        <button
          aria-label={buttonTitle}
          aria-pressed={isListening}
          className={`absolute bottom-3 right-3 inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 max-[360px]:px-0 ${
            isListening
              ? "border-[#2563EB] bg-[#2563EB] text-white shadow-[0_10px_22px_rgba(37,99,235,0.24)]"
              : "border-transparent bg-transparent text-[#94A3B8] hover:border-[#BFDBFE] hover:bg-[#EBF2FF] hover:text-[#2563EB]"
          } disabled:cursor-not-allowed disabled:border-transparent disabled:bg-transparent disabled:text-[#CBD5E1]`}
          disabled={disabled || !isSupported}
          onClick={toggleListening}
          title={buttonTitle}
          type="button"
        >
          <Mic className="h-4 w-4" aria-hidden="true" strokeWidth={isListening ? 2.4 : 2} />
          <span className="max-[360px]:sr-only">{isListening ? "Listening" : "Voice"}</span>
        </button>
      </div>
    </div>
  );
}
