import { useEffect, useState } from "react";
import StatusIcon from "./StatusIcon";
import { useMedia } from "@/hooks/useMedia";
import Avatar from "../Avatar";
// COMMENTED OUT: react-audio-visualize is not compatible with React 19
// import { AudioVisualizer } from "react-audio-visualize";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { nameInitials } from "@/utils/FormatUtils";
import { type MessageRow, type OutgoingStatus } from "@/supabase/client";
import { Download, LoaderCircle, Mic2, Pause, Play } from "lucide-react";
dayjs.extend(duration);

const VOICE_WAVEFORM = [
  10, 16, 22, 14, 26, 34, 20, 12, 28, 38, 24, 16, 32, 42, 30, 18, 26, 36, 22,
  12, 20, 30, 40, 26, 16, 24, 34, 44, 28, 18, 32, 38, 24, 14, 22, 30, 18, 12,
  26, 36, 22, 16,
];

export default function AudioMessage({
  message,
  orgName,
  convName,
}: {
  message: MessageRow;
  orgName: string;
  convName: string;
}) {
  if (!(message.direction === "incoming" || message.direction === "outgoing")) {
    throw new Error(`Message with id ${message.id} is not a BaseMessage.`);
  }

  const content = message.content;
  if (content.type !== "file" || content.kind !== "audio") {
    throw new Error(`Message with id ${message.id} is not an audio message.`);
  }

  const { load, startLoad, cancelLoad } = useMedia(message);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [paused, setPaused] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekTime, setSeekTime] = useState(0);

  useEffect(() => {
    // Upload new recordings immediately and fetch stored voice notes so the
    // player can show a duration and play control instead of a download state.
    if (load.type === "upload" && load.status === "pending") {
      startLoad();
    }

    if (
      content.file.voice === true &&
      load.type === "download" &&
      load.status === "pending"
    ) {
      startLoad();
    }
  }, [content.file.voice, load.status, load.type]);

  useEffect(() => {
    if (load.blob) {
      const objectUrl = URL.createObjectURL(load.blob);
      const audio = new Audio(objectUrl);

      const updateDuration = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
      };

      audio.preload = "metadata";
      audio.onloadedmetadata = updateDuration;
      audio.ondurationchange = updateDuration;
      audio.ontimeupdate = () => setTime(audio.currentTime);
      audio.onpause = () => setPaused(true);
      audio.onplay = () => setPaused(false);
      audio.onended = () => {
        audio.currentTime = 0;
        setTime(0);
      };

      setAudio(audio);

      return () => {
        audio.pause();
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [load.blob]);

  const handleAudioControl = () => {
    if (load.status === "done") {
      if (audio && paused) void audio.play();
      if (audio && !paused) audio.pause();
    } else if (load.status === "loading") {
      cancelLoad();
    } else {
      startLoad();
    }
  };

  const seekAudio = (value: number) => {
    if (!audio) return;
    audio.currentTime = value;
    setTime(value);
    setSeekTime(0);
  };

  if (content.file.voice === true) {
    const progress = duration > 0 ? (seekTime || time) / duration : 0;
    const displayedDuration = time > 0 ? time : duration;

    return (
      <div className="w-[min(320px,calc(100vw-96px))] min-w-[240px] px-2.5 py-2">
        <div className="flex min-h-[58px] items-center gap-3">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:brightness-110 disabled:cursor-wait disabled:opacity-80"
            onClick={handleAudioControl}
            aria-label={paused ? "Play voice note" : "Pause voice note"}
            disabled={load.status === "loading"}
          >
            {(load.status === "pending" || load.status === "error") && (
              <Download className="h-5 w-5" aria-hidden="true" />
            )}
            {load.status === "loading" && (
              <LoaderCircle
                className="h-5 w-5 animate-spin"
                aria-hidden="true"
              />
            )}
            {load.status === "done" && paused && (
              <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
            )}
            {load.status === "done" && !paused && (
              <Pause className="h-5 w-5 fill-current" aria-hidden="true" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="relative flex h-8 items-center justify-between gap-px overflow-hidden">
              {VOICE_WAVEFORM.map((height, index) => (
                <span
                  key={index}
                  className={
                    "min-w-px flex-1 rounded-full " +
                    (index / VOICE_WAVEFORM.length <= progress
                      ? "bg-primary"
                      : "bg-muted-foreground/45")
                  }
                  style={{ height }}
                />
              ))}
              <input
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                type="range"
                min={0}
                max={duration || 1}
                step={0.01}
                value={seekTime || time}
                disabled={!audio}
                aria-label="Seek voice note"
                onInput={(event) =>
                  setSeekTime(Number(event.currentTarget.value))
                }
                onPointerUp={(event) =>
                  seekAudio(Number(event.currentTarget.value))
                }
              />
            </div>

            <div className="mt-1 flex items-center justify-between gap-3 text-[11px] leading-none text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mic2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {dayjs.duration(displayedDuration, "seconds").format("m:ss")}
              </span>
              <span className="flex items-center">
                {dayjs(message.timestamp).format("HH:mm")}
                {message.direction === "outgoing" && (
                  <StatusIcon {...(message.status as OutgoingStatus)} />
                )}
              </span>
            </div>
          </div>
        </div>

        {content.artifacts?.some(
          (artifact) =>
            artifact.type === "text" && artifact.kind === "transcription",
        ) && (
          <div className="border-t border-border/40 px-1 pt-1.5 text-[13px] italic text-muted-foreground">
            {(() => {
              const transcription = content.artifacts?.find(
                (artifact) =>
                  artifact.type === "text" && artifact.kind === "transcription",
              );
              return transcription?.type === "text" ? transcription.text : "";
            })()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={"w-[320px]"}>
      {/* Audio player */}
      <div
        className={
          "py-[3px] flex items-center" +
          (message.direction === "incoming"
            ? " pl-[11px] pr-[7px]"
            : " pr-[11px] pl-[7px]")
        }
      >
        {/* Controls */}
        <div
          className={
            "grow flex items-center pb-[5px]" +
            (message.direction === "incoming" ? " mr-[11px]" : " ml-[11px]")
          }
        >
          {/* Load/Play/Pause button */}
          <button
            className="mr-[12px] -mt-[1px]"
            onClick={() => {
              if (load.status === "done") {
                if (audio && paused) {
                  audio.play();
                }
                if (audio && !paused) {
                  audio.pause();
                }
              } else if (load.status === "loading") {
                cancelLoad();
              } else {
                startLoad();
              }
            }}
          >
            {(load.status === "pending" || load.status === "error") && (
              <svg
                className={
                  "w-[34px] h-[34px] text-gray-light transition" +
                  (load.type === "upload" ? " -scale-y-100" : "")
                }
              >
                <use href="/icons.svg#download" />
              </svg>
            )}
            {load.status === "loading" && (
              <svg className="w-[34px] h-[34px]">
                <use className="text-gray-light" href="/icons.svg#cancel" />
                <use className="text-gray-light spin" href="/icons.svg#spin" />
              </svg>
            )}
            {load.status === "done" && (
              <>
                {paused && (
                  <svg className="w-[34px] h-[34px]">
                    <use className="text-primary" href="/icons.svg#play" />
                  </svg>
                )}
                {!paused && (
                  <svg className="w-[34px] h-[34px]">
                    <use className="text-primary" href="/icons.svg#pause" />
                  </svg>
                )}
              </>
            )}
          </button>

          {/* Progress bar */}
          <div className="relative px-[12px]">
            {audio && (
              <input
                className="left-[6px] h-full absolute cursor-pointer [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]::bg-primary"
                type="range"
                min={0}
                max={duration}
                step={0.01}
                value={seekTime || time}
                onInput={(event) => {
                  setSeekTime(Number(event.currentTarget.value));
                }}
                onMouseUp={(event) => {
                  if (!audio) {
                    return;
                  }
                  audio.currentTime = Number(event.currentTarget.value);
                  setTime(Number(event.currentTarget.value));
                  setSeekTime(0);
                }}
              />
            )}
            {/* REPLACED: AudioVisualizer with simple progress bar for React 19 compatibility */}
            {load.blob && (
              <div className="relative w-[166px] h-[24px] bg-black/10 dark:bg-white/10 rounded-sm overflow-hidden">
                {/* Progress indicator */}
                <div
                  className="absolute top-0 left-0 h-full bg-primary transition-all duration-100"
                  style={{
                    width:
                      duration > 0
                        ? `${((seekTime || time) / duration) * 100}%`
                        : "0%",
                  }}
                />
                {/* Simple waveform-like bars */}
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-around px-1">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[2px] bg-primary/50 rounded-full"
                      style={{
                        height: `${Math.random() * 60 + 40}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* ORIGINAL CODE (commented out for reference):
            {load.blob && (
              <AudioVisualizer
                blob={load.blob}
                width={166}
                height={24}
                barWidth={2.5}
                gap={1.5}
                barColor={"#b0ceae"}
                barPlayedColor={"#728977"}
                currentTime={seekTime || time}
              />
            )}
            */}
            {duration > 0 && (
              <div className="absolute left-0 -bottom-[22px] text-[11px] text-muted-foreground">
                {dayjs.duration(time || duration, "seconds").format("m:ss")}
              </div>
            )}
            {/* Timestamp */}
            <div
              className={
                "text-[11px] text-muted-foreground absolute -bottom-[22px] flex items-center" +
                (message.direction === "incoming"
                  ? " right-0"
                  : " -right-[7px]")
              }
            >
              {dayjs(message.timestamp).format("HH:mm")}
              {message.direction === "outgoing" && (
                <StatusIcon {...(message.status as OutgoingStatus)} />
              )}
            </div>
          </div>
        </div>

        {/* Avatar */}
        <div
          className={
            "relative" +
            (message.direction === "incoming" ? " order-last" : " order-first")
          }
        >
          <Avatar
            // TODO: use agent name and pic - cabra 16/01/2025
            fallback={nameInitials(
              (message.direction === "incoming" ? convName : orgName) || "?",
            )}
            size={55}
            className="bg-primary text-xl"
          />
          <svg
            className={
              "w-[19px] h-[26px] absolute -bottom-[2px]" +
              (message.direction === "incoming" ? " left-0" : " right-0")
            }
          >
            {/* TODO: out message mic background should match the green background of the message - cabra 05/06/2024 */}
            <use className="text-primary" href="/icons.svg#mic" />
          </svg>
        </div>
      </div>

      {/* Caption */}
      {content.text && (
        <div className="pl-[6px] pt-[6px] pb-[5px] pr-[4px] text-muted-foreground">
          {content.text}
        </div>
      )}

      {/* Transcription - from artifacts with kind "transcription" */}
      {content.artifacts &&
        content.artifacts.some(
          (a) => a.type === "text" && a.kind === "transcription",
        ) && (
          <div className="pl-[6px] pt-[6px] pb-[5px] pr-[4px] text-muted-foreground text-[13px] italic">
            {(() => {
              const transcription = content.artifacts.find(
                (a) => a.type === "text" && a.kind === "transcription",
              );
              return transcription?.type === "text" ? transcription.text : "";
            })()}
          </div>
        )}
    </div>
  );
}
