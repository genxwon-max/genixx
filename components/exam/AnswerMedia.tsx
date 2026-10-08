"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type SVGProps,
} from "react";
import { joinUpload, splitUpload } from "@/lib/exam";
import { dropMedia, saveMedia, useMediaUrl } from "@/lib/answerMedia";
import { shrinkImage } from "@/lib/productStore";

/**
 * 소리와 사진을 다루는 칸 — 듣기(ListenClip) · 음성 입력(DictateBar · DictateButton) ·
 * 사진 올리기(ImageAnswer).
 *
 * 셋 다 고딕으로 적는다. 발문과 보기는 시험지의 글이지만 여기 단추와 안내는 화면이 하는
 * 말이다(서술형의 글자 수 표시와 같은 규칙).
 */

const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const box =
  "relative z-20 rounded-[2px] border border-exam-line bg-white px-4 py-3.5 font-sans text-exam-text";
const btn =
  "inline-flex h-10 shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 rounded-[2px] border px-4 text-[13px] font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-exam-text";
const btnInk = `${btn} border-exam-text bg-exam-text text-white hover:bg-exam-text/90`;
const btnLine = `${btn} border-exam-line bg-white text-exam-text hover:border-exam-muted hover:bg-exam-raised disabled:cursor-default disabled:opacity-50 disabled:hover:border-exam-line disabled:hover:bg-white`;
const note = "text-[12px] leading-relaxed text-exam-muted";

/* ───────────────────────── 듣기 ───────────────────────── */

/**
 * 음성을 듣는 단추 — 음성 파일이 있는 자료 · 문항에 선다.
 *
 * 브라우저의 재생 막대를 그대로 두지 않는다. 브라우저마다 모양이 다르고, 내려받기 · 재생
 * 속도 같은 시험지에 없어야 할 메뉴가 딸려 온다.
 *
 * 단추를 button으로 두지 않는 까닭 — 해석 화면은 문항을 fieldset disabled로 잠근다. 답은
 * 잠겨야 하지만 자료는 다시 들을 수 있어야 한다.
 */
export function ListenClip({
  src,
  label = "듣기",
}: {
  src: string;
  /** 처음 누르기 전의 단추 이름 */
  label?: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [length, setLength] = useState(0);
  const [heard, setHeard] = useState(false);
  const [failed, setFailed] = useState(false);

  const total = length;
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setFailed(true));
    else a.pause();
  };

  return (
    <div className={`${box} flex items-center gap-3`}>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setLength(d);
        }}
        onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setHeard(true);
          setAt(0);
        }}
        onError={() => setFailed(true)}
      />
      <span
        role="button"
        tabIndex={0}
        aria-pressed={playing}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          toggle();
        }}
        className={`${btnInk} min-w-[7.5rem]`}
      >
        {playing ? <PauseIcon className="h-4 w-4" /> : <SpeakerIcon className="h-4 w-4" />}
        {playing ? "일시정지" : at > 0 ? "이어서 듣기" : heard ? "다시 듣기" : label}
      </span>
      {failed ? (
        <p className={note}>음성을 재생하지 못했습니다. 잠시 후 다시 눌러 주세요.</p>
      ) : (
        <>
          <span aria-hidden className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-exam-line">
            <span
              className="block h-full bg-exam-text"
              style={{ width: `${total ? Math.min(100, (at / total) * 100) : 0}%` }}
            />
          </span>
          <span className="shrink-0 text-[12px] tabular-nums text-exam-muted">
            {clock(at)}
            {total > 0 && ` / ${clock(total)}`}
          </span>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── 음성 입력 ───────────────────────── */

/* 브라우저의 음성 인식(Web Speech API) — 타입이 표준 lib에 없어 쓰는 만큼만 적는다 */
type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type Recognizer = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognizerOf(): (new () => Recognizer) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, (new () => Recognizer) | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const speechError = (code: string) => {
  if (code === "not-allowed" || code === "service-not-allowed")
    return "마이크 사용이 차단되어 있습니다. 주소창 왼쪽의 마이크 권한을 허용한 뒤 다시 눌러 주세요.";
  if (code === "audio-capture")
    return "마이크를 찾지 못했습니다. 마이크가 연결되어 있는지 확인해 주세요.";
  if (code === "network") return "음성을 글로 바꾸지 못했습니다. 인터넷 연결을 확인해 주세요.";
  return "음성 입력을 시작하지 못했습니다. 잠시 후 다시 눌러 주세요.";
};

/** 지금 듣고 있는 칸을 멈추는 손잡이 — 마이크는 하나라 한 번에 한 칸만 듣는다 */
let stopActive: (() => void) | null = null;

const subscribeNever = () => () => {};

/** 이미 쓴 글 뒤에 말한 것을 잇는다 */
export const addSpoken = (written: string, spoken: string) =>
  written && !/\s$/.test(written) ? `${written} ${spoken}` : written + spoken;

/**
 * 음성 입력 — 말한 것을 글로 바꿔(STT) 답 칸에 넣는다.
 *
 * 녹음을 답으로 내는 것이 아니다. 답은 여전히 글이고, 손으로 치는 대신 말로 적을 뿐이라
 * 받아 적힌 글은 아이가 그대로 고칠 수 있다. 말이 한 마디 끝날 때마다 onText로 넘긴다.
 *
 * 음성 인식이 없는 브라우저(파이어폭스)에서는 supported가 false다 — 단추를 세우지 않는다.
 */
function useDictation(onText: (text: string) => void) {
  const supported = useSyncExternalStore(
    subscribeNever,
    () => recognizerOf() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const rec = useRef<Recognizer | null>(null);
  /* 듣는 동안에도 답이 바뀐다 — 받아 적을 때는 맨 마지막 것에 잇는다 */
  const latest = useRef(onText);
  useEffect(() => {
    latest.current = onText;
  });

  /* 다른 문항으로 넘어가면 그만 듣는다 */
  useEffect(() => () => rec.current?.abort(), []);

  const start = () => {
    const Ctor = recognizerOf();
    if (!Ctor) return;
    stopActive?.();
    const r = new Ctor();
    const halt = () => r.stop();
    r.lang = "ko-KR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let done = "";
      let heard = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) done += res[0].transcript;
        else heard += res[0].transcript;
      }
      if (done.trim()) latest.current(done.trim());
      setInterim(heard);
    };
    r.onerror = (e) => {
      /* 말없이 지나간 것 · 우리가 멈춘 것은 문제가 아니다 */
      if (e.error !== "no-speech" && e.error !== "aborted") setError(speechError(e.error));
    };
    r.onend = () => {
      if (rec.current === r) rec.current = null;
      if (stopActive === halt) stopActive = null;
      setListening(false);
      setInterim("");
    };
    try {
      r.start();
    } catch {
      setError(speechError(""));
      return;
    }
    rec.current = r;
    stopActive = halt;
    setError("");
    setListening(true);
  };

  return {
    supported,
    listening,
    interim,
    error,
    toggle: () => (listening ? rec.current?.stop() : start()),
  };
}

/**
 * 긴 글 칸 아래의 음성 입력 줄 — 왼쪽에 단추와 듣는 중인 말, 오른쪽에 글자 수(children).
 */
export function DictateBar({
  onText,
  children,
}: {
  onText: (text: string) => void;
  children?: ReactNode;
}) {
  const d = useDictation(onText);
  return (
    <div className="relative z-20 mt-2 font-sans">
      <div className="flex items-center gap-3">
        {d.supported && (
          <button
            type="button"
            onClick={d.toggle}
            aria-pressed={d.listening}
            className={d.listening ? btnInk : btnLine}
          >
            {d.listening ? <StopIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
            {d.listening ? "음성 입력 끝내기" : "음성 입력"}
          </button>
        )}
        {d.listening ? (
          <p role="status" className="flex min-w-0 items-center gap-2 text-[12px] text-exam-muted">
            <span aria-hidden className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-rose-600" />
            <span className="truncate">{d.interim || "듣고 있습니다. 말하면 글로 입력됩니다."}</span>
          </p>
        ) : (
          d.supported && <p className={`min-w-0 ${note}`}>말로 답하면 글로 입력됩니다.</p>
        )}
        <p className="ml-auto shrink-0 text-[12px] tabular-nums text-exam-muted">{children}</p>
      </div>
      {d.error && (
        <p role="alert" className="mt-2 text-[12px] font-bold text-rose-600">
          {d.error}
        </p>
      )}
    </div>
  );
}

/** 괄호 칸 옆의 작은 음성 입력 단추 — 짧은 칸 · 쓰는 칸 */
export function DictateButton({
  onText,
  label,
}: {
  onText: (text: string) => void;
  /** 칸 이름 — 낭독기가 어느 칸의 단추인지 읽는다 */
  label?: string;
}) {
  const d = useDictation(onText);
  if (!d.supported) return null;
  const name = `${label ? `${label} ` : ""}음성 입력${d.listening ? " 끝내기" : ""}`;
  return (
    <span className="relative z-20 shrink-0 font-sans">
      <button
        type="button"
        onClick={d.toggle}
        aria-pressed={d.listening}
        aria-label={name}
        title={d.listening ? "음성 입력 끝내기" : "음성 입력"}
        className={`${d.listening ? btnInk : btnLine} w-10 px-0`}
      >
        {d.listening ? <StopIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
      </button>
      {d.listening && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-rose-600"
        />
      )}
      {d.error && (
        <span
          role="alert"
          className="absolute right-0 top-full z-10 mt-1 w-60 rounded-[2px] border border-rose-300 bg-white px-2.5 py-2 text-[12px] font-bold leading-relaxed text-rose-600"
        >
          {d.error}
        </span>
      )}
    </span>
  );
}

/* ───────────────────────── 사진 올리기 ───────────────────────── */

/** 올린 사진의 긴 변(px) — 공책 글씨가 읽힐 만큼 */
const PHOTO_MAX_PX = 1600;

/**
 * 사진으로 답하는 칸 — 종이에 쓰거나 그린 것을 찍어 올린다.
 *
 * 사진은 한 문항에 한 장이다. 원본을 그대로 담지 않고 긴 변을 줄여 담는다 — 휴대폰 사진은
 * 한 장이 수 MB라 몇 문항만 올려도 저장소가 찬다.
 */
export function ImageAnswer({
  value,
  onAnswer,
}: {
  value: number | string | undefined;
  onAnswer: (value: string) => void;
}) {
  const saved = splitUpload(value);
  const { url, missing } = useMediaUrl(saved?.key ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("사진 파일만 올릴 수 있습니다. (JPG · PNG 등)");
      return;
    }
    setBusy(true);
    try {
      const small = await (await fetch(await shrinkImage(file, PHOTO_MAX_PX))).blob();
      const key = await saveMedia(small);
      onAnswer(joinUpload({ media: "image", key }));
      if (saved) dropMedia(saved.key);
    } catch {
      setError("사진을 올리지 못했습니다. 다른 사진으로 다시 올려 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (saved) dropMedia(saved.key);
    onAnswer("");
  };

  /* 파일 칸은 숨기고 이름표를 단추처럼 세운다 — 잠긴 화면(fieldset disabled)에서는 칸이
     잠겨 눌러도 열리지 않는다 */
  const picker = (text: string, ink: boolean) => (
    <label
      className={`${ink ? btnInk : btnLine} has-[:disabled]:cursor-default has-[:disabled]:opacity-50`}
    >
      <CameraIcon className="h-4 w-4" />
      {busy ? "올리는 중" : text}
      <input
        type="file"
        accept="image/*"
        disabled={busy}
        className="sr-only"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );

  return (
    <div className="mt-7">
      <div className={box}>
        {saved ? (
          <div className="space-y-3">
            {url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={url}
                alt="올린 사진"
                draggable={false}
                className="mx-auto max-h-[22rem] w-auto max-w-full rounded-[2px] border border-exam-line"
              />
            ) : (
              <p className={note}>
                {missing
                  ? "올린 사진을 이 기기에서 찾을 수 없습니다. 다시 올려 주세요."
                  : "사진을 불러오는 중입니다."}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {picker("사진 바꾸기", false)}
              <button type="button" onClick={remove} disabled={busy} className={btnLine}>
                삭제
              </button>
              <span className="ml-auto text-[12px] font-bold text-emerald-700">
                사진을 올렸습니다
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {picker("사진 올리기", true)}
            <p className={note}>종이에 쓰거나 그린 것을 찍어서 올리세요.</p>
          </div>
        )}
      </div>
      <Hint error={error}>사진은 한 장만 올릴 수 있습니다. 글씨가 잘 보이게 찍어 주세요.</Hint>
    </div>
  );
}

/* ───────────────────────── 조각 ───────────────────────── */

/** 칸 아래 한 줄 — 안내이거나, 방금 생긴 문제 */
function Hint({ error, children }: { error: string; children: ReactNode }) {
  return error ? (
    <p role="alert" className="relative z-20 mt-2 font-sans text-[12px] font-bold text-rose-600">
      {error}
    </p>
  ) : (
    <p className={`relative z-20 mt-2 font-sans ${note}`}>{children}</p>
  );
}

const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function SpeakerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M8 5v14M16 5v14" />
    </svg>
  );
}

function StopIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

function MicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function CameraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
