import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Pause,
  Play,
  RotateCcw,
  Send,
  Square,
  Trash2,
} from "lucide-react";
import { supabase } from "@/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";

const MAX_RECORDING_SECONDS = 600;
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

export function preferredRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((mime) => MediaRecorder.isTypeSupported(mime));
}

export function formatRecordingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function VoiceRecorder({
  organizationId,
  onCancel,
  onSend,
}: {
  organizationId: string;
  onCancel: () => void;
  onSend: (file: File) => void;
}) {
  const { translate: t } = useTranslation();
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const chunksRef = useRef<Blob[]>([]);
  const previewRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<
    "requesting" | "recording" | "paused" | "preview" | "converting" | "error"
  >("requesting");
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState<Blob>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [error, setError] = useState<string>();

  const releaseMicrophone = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
  };

  useEffect(() => {
    let disposed = false;
    const start = async () => {
      const mimeType = preferredRecordingMimeType();
      if (!navigator.mediaDevices?.getUserMedia || !mimeType) {
        setError(t("Este navegador no admite la grabación de voz"));
        setState("error");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 64_000,
        });
        recorderRef.current = recorder;
        chunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          releaseMicrophone();
          if (!disposed && blob.size > 0) {
            setRecording(blob);
            setPreviewUrl(URL.createObjectURL(blob));
            setState("preview");
          }
        };
        recorder.start(250);
        setState("recording");
      } catch {
        setError(t("No se pudo acceder al micrófono"));
        setState("error");
      }
    };
    void start();
    return () => {
      disposed = true;
      if (recorderRef.current?.state !== "inactive")
        recorderRef.current?.stop();
      releaseMicrophone();
    };
  }, []);

  useEffect(() => {
    if (state !== "recording") return;
    const timer = window.setInterval(
      () =>
        setSeconds((value) => {
          if (value + 1 >= MAX_RECORDING_SECONDS) recorderRef.current?.stop();
          return Math.min(value + 1, MAX_RECORDING_SECONDS);
        }),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [state]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const cancel = () => {
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    releaseMicrophone();
    onCancel();
  };

  const convertAndSend = async () => {
    const baseUrl = import.meta.env.VITE_VOICE_TRANSCODER_URL as
      | string
      | undefined;
    if (!recording || !baseUrl) {
      setError(t("El servicio de voz no está configurado"));
      setState("error");
      return;
    }
    setState("converting");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token)
        throw new Error(t("Tu sesión ha caducado"));
      const response = await fetch(
        `${baseUrl.replace(/\/$/, "")}/v1/voice/transcode`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            "X-Organization-Id": organizationId,
            "Content-Type": recording.type || "audio/webm",
          },
          body: recording,
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          body.error || t("No se pudo preparar el mensaje de voz"),
        );
      }
      const audio = await response.blob();
      onSend(
        new File([audio], `voice-${Date.now()}.ogg`, {
          type: "audio/ogg; codecs=opus",
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("No se pudo preparar el mensaje de voz"),
      );
      setState("error");
    }
  };

  return (
    <div
      className="flex min-h-[50px] flex-1 items-center gap-3 px-2"
      role="group"
      aria-label={t("Grabadora de voz")}
    >
      <button
        type="button"
        onClick={cancel}
        className="rounded-full p-2 text-destructive hover:bg-destructive/10"
        title={t("Cancelar grabación")}
      >
        <Trash2 className="h-5 w-5" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${state === "recording" ? "animate-pulse bg-red-500" : "bg-muted-foreground"}`}
        />
        <span className="w-12 text-sm tabular-nums">
          {formatRecordingTime(seconds)}
        </span>
        {state === "preview" && previewUrl ? (
          <audio
            ref={previewRef}
            src={previewUrl}
            controls
            className="h-9 min-w-0 flex-1"
          />
        ) : (
          <span className="truncate text-sm text-muted-foreground">
            {error ||
              (state === "requesting"
                ? t("Solicitando micrófono")
                : state === "converting"
                  ? t("Preparando mensaje de voz")
                  : state === "paused"
                    ? t("Grabación pausada")
                    : t("Grabando"))}
          </span>
        )}
      </div>
      {state === "recording" && (
        <button
          type="button"
          className="rounded-full p-2 hover:bg-accent"
          onClick={() => {
            recorderRef.current?.pause();
            setState("paused");
          }}
          title={t("Pausar")}
        >
          <Pause className="h-5 w-5" />
        </button>
      )}
      {state === "paused" && (
        <button
          type="button"
          className="rounded-full p-2 hover:bg-accent"
          onClick={() => {
            recorderRef.current?.resume();
            setState("recording");
          }}
          title={t("Continuar")}
        >
          <Mic className="h-5 w-5" />
        </button>
      )}
      {(state === "recording" || state === "paused") && (
        <button
          type="button"
          className="rounded-full bg-primary p-2 text-primary-foreground"
          onClick={() => recorderRef.current?.stop()}
          title={t("Detener")}
        >
          <Square className="h-5 w-5" />
        </button>
      )}
      {state === "preview" && previewUrl && (
        <button
          type="button"
          className="rounded-full p-2 hover:bg-accent"
          onClick={() => void previewRef.current?.play()}
          title={t("Reproducir")}
        >
          <Play className="h-5 w-5" />
        </button>
      )}
      {state === "preview" && (
        <button
          type="button"
          className="rounded-full bg-primary p-2 text-primary-foreground"
          onClick={() => void convertAndSend()}
          title={t("Enviar mensaje de voz")}
        >
          <Send className="h-5 w-5" />
        </button>
      )}
      {state === "converting" && (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      )}
      {state === "error" && recording && (
        <button
          type="button"
          className="rounded-full bg-primary p-2 text-primary-foreground"
          onClick={() => void convertAndSend()}
          title={t("Reintentar")}
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
