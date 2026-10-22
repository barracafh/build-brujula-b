"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ruta } from "@/config/sitio";
import { resumenVoz } from "@/lib/resumen";
import type { Resultado } from "@/lib/catalogo";

type Turno = { frase: string; audio?: string };
type Estado =
  | "aparado"
  | "escuchando"
  | "entendiendo"
  | "consultando"
  | "hablando";

// Conversación por voz: pulsa el micrófono, habla, y Brújula contesta en voz
// alta con ElevenLabs. Nada se guarda: las frases viven en memoria hasta que
// se recarga la página. El historial solo viaja con cada consulta para que el
// modelo entienda preguntas de seguimiento («¿y después?»).
export function Conversacion({
  consultar,
}: {
  consultar: (frase: string, historial: string[]) => Promise<Resultado>;
}) {
  const [estado, setEstado] = useState<Estado>("aparado");
  const [aviso, setAviso] = useState<string | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const frases = useRef<string[]>([]);
  const grabadora = useRef<MediaRecorder | null>(null);
  const reproducidor = useRef<HTMLAudioElement | null>(null);
  const apagador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activo = useRef(true);

  useEffect(() => {
    activo.current = true;
    return () => {
      activo.current = false;
      if (apagador.current) clearTimeout(apagador.current);
      grabadora.current?.stream.getTracks().forEach((t) => t.stop());
      reproducidor.current?.pause();
    };
  }, []);

  const pararVoz = useCallback(() => {
    reproducidor.current?.pause();
    if (reproducidor.current) reproducidor.current.currentTime = 0;
    setEstado("aparado");
  }, []);

  // La conversación entera: escuchar → entender → consultar → hablar.
  const conversar = useCallback(
    async (audio: File) => {
      setEstado("entendiendo");
      try {
        // 1. Escuchar (Scribe v2 de ElevenLabs, con respaldo en HelmCode).
        const cuerpo = new FormData();
        cuerpo.append("audio", audio);
        const resEscucha = await fetch(ruta("/api/voz/transcribir"), {
          method: "POST",
          body: cuerpo,
        });
        const datosEscucha = (await resEscucha.json()) as {
          texto?: string;
          error?: string;
        };
        const frase = datosEscucha.texto?.trim();
        if (!resEscucha.ok || !frase) {
          setEstado("aparado");
          setAviso(
            datosEscucha.error ??
              "No te he oído bien. Pulsa el micrófono y habla de nuevo.",
          );
          return;
        }
        frases.current = [...frases.current.slice(-4), frase];
        setTurnos((t) => [...t, { frase }]);

        // 2. Pensar: la misma consulta que el buscador escrito, con historial.
        setEstado("consultando");
        const resultado = await consultar(frase, frases.current.slice(0, -1));

        // 3. Hablar: resumen compuesto con el catálogo, voz de ElevenLabs.
        setEstado("hablando");
        const resVoz = await fetch(ruta("/api/voz/hablar"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ texto: resumenVoz(resultado) }),
        });
        if (!resVoz.ok) throw new Error(`HTTP ${resVoz.status}`);
        const url = URL.createObjectURL(await resVoz.blob());
        setTurnos((t) =>
          t.map((u, i) => (i === t.length - 1 ? { ...u, audio: url } : u)),
        );
        const respuesta = new Audio(url);
        reproducidor.current = respuesta;
        respuesta.onended = () => {
          if (activo.current) setEstado("aparado");
        };
        await respuesta.play();
      } catch {
        setEstado("aparado");
        setAviso(
          "La conversación por voz ha fallado. Prueba de nuevo o escribe tu consulta.",
        );
      }
    },
    [consultar],
  );

  const escuchar = useCallback(async () => {
    setAviso(null);
    pararVoz();
    let flujo: MediaStream;
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setAviso(
        "No hay micrófono o no le hemos dado permiso. Revisa los permisos del navegador.",
      );
      return;
    }
    setEstado("escuchando");
    // Safari graba en mp4 y Chrome en webm: la extensión viaja con el fichero.
    const formato = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "webm"
      : MediaRecorder.isTypeSupported("audio/mp4")
        ? "mp4"
        : "";
    const recorder = new MediaRecorder(flujo, {
      mimeType: formato === "webm" ? "audio/webm;codecs=opus" : undefined,
    });
    grabadora.current = recorder;
    const trozos: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && trozos.push(e.data);
    // Corta sola a los 30 s para que nadie se quede grabando sin querer.
    apagador.current = setTimeout(
      () => recorder.state !== "inactive" && recorder.stop(),
      30_000,
    );
    recorder.onstop = () => {
      flujo.getTracks().forEach((t) => t.stop());
      if (!activo.current) return;
      const trozo = trozos[0];
      if (!trozo) {
        setEstado("aparado");
        setAviso("No se ha oído nada. Pulsa y habla de nuevo.");
        return;
      }
      void conversar(
        new File([trozo], `audio.${formato || "webm"}`, { type: trozo.type }),
      );
    };
    recorder.start();
  }, [conversar, pararVoz]);

  const leyenda: Record<Estado, string> = {
    aparado: "Pulsa y habla",
    escuchando: "Escuchando… pulsa para terminar",
    entendiendo: "Entendiendo lo que has dicho…",
    consultando: "Buscando el trámite…",
    hablando: "Respondiendo… pulsa para cortar",
  };
  const ocupado = estado === "entendiendo" || estado === "consultando";

  return (
    <section aria-label="Conversación por voz" className="mt-10">
      <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
        O háblame
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={estado === "aparado" ? "outline" : "secondary"}
          size="lg"
          onClick={() => {
            if (estado === "hablando") pararVoz();
            else if (estado === "aparado") void escuchar();
            else if (!ocupado) grabadora.current?.stop();
          }}
          disabled={ocupado}
          aria-pressed={estado !== "aparado"}
        >
          <Mic
            aria-hidden="true"
            className={
              estado === "escuchando"
                ? "text-brand [animation:pulso_1.2s_ease-in-out_infinite] motion-reduce:animate-none"
                : ""
            }
          />
          {leyenda[estado]}
        </Button>
        <p className="text-sm text-(--text-secondary)">
          Castellano o valenciano. No guardamos tu voz ni tus frases.
        </p>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="mt-2 min-h-5 text-sm text-destructive"
      >
        {aviso}
      </p>
      {turnos.length > 0 && (
        <ol className="mt-4 grid gap-3 text-base">
          {turnos.map((turno, i) => (
            <li key={i} className="rounded-xl bg-muted px-4 py-3">
              <p>
                <span className="font-mono text-xs text-(--text-secondary) uppercase">
                  Has dicho
                </span>{" "}
                {turno.frase}
              </p>
              {turno.audio && estado === "aparado" && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="mt-1 -ml-2 h-auto px-2"
                  onClick={() => {
                    reproducidor.current?.pause();
                    const repite = new Audio(turno.audio);
                    reproducidor.current = repite;
                    repite.onended = () => setEstado("aparado");
                    void repite.play();
                  }}
                >
                  Volver a escuchar la respuesta
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
