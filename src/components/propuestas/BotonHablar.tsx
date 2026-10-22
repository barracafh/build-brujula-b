"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ruta } from "@/config/sitio";
import { resumenVoz } from "@/lib/resumen";
import type { Chat } from "./use-chat";

type Estado = "aparado" | "escuchando" | "entendiendo" | "hablando";

// El micrófono del chat: hablas, la frase entra como un turno del chat y, si
// la respuesta es del catálogo, la voz la lee completa con lo que devuelve la
// API. Nada se guarda: las frases viven en memoria hasta recargar la página.
export function BotonHablar({ chat }: { chat: Chat }) {
  const [estado, setEstado] = useState<Estado>("aparado");
  const [aviso, setAviso] = useState<string | null>(null);
  const grabadora = useRef<MediaRecorder | null>(null);
  const reproducidor = useRef<HTMLAudioElement | null>(null);
  const apagador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activo = useRef(true);
  // La frase que espera respuesta del chat; cuando llega, se lee en voz alta.
  const pendiente = useRef<string | null>(null);

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

  // Cuando el turno de la voz termina, se lee: solo respuestas del catálogo en
  // castellano (la voz habla español) y sin pregunta de aclaración pendiente.
  useEffect(() => {
    const frase = pendiente.current;
    if (!frase) return;
    const turno = chat.turnos[chat.turnos.length - 1];
    if (!turno || turno.pregunta !== frase || turno.estado === "cargando") return;
    pendiente.current = null;
    const resultado = turno.resultado;
    if (
      turno.estado === "listo" &&
      resultado &&
      !resultado.aclaracion &&
      !resultado.fueraCatalogo &&
      turno.enfoque === undefined &&
      (resultado.idioma ?? "es") === "es"
    ) {
      setEstado("hablando");
      void decir(resumenVoz(resultado));
    } else {
      setEstado("aparado");
    }
    // resumenVoz y decir son estables; el desencadenante son los turnos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.turnos]);

  const decir = useCallback(async (texto: string) => {
    try {
      const respuesta = await fetch(ruta("/api/voz/hablar"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      const audio = new Audio(URL.createObjectURL(await respuesta.blob()));
      reproducidor.current = audio;
      audio.onended = () => {
        if (activo.current) setEstado("aparado");
      };
      await audio.play();
    } catch {
      if (activo.current) setEstado("aparado");
    }
  }, []);

  // Escuchar → entender → enviar al chat (que pinta la respuesta).
  const escuchar = useCallback(async () => {
    setAviso(null);
    pararVoz();
    let flujo: MediaStream;
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setAviso("No hay micrófono o no le hemos dado permiso. Revisa los permisos del navegador.");
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
      void conversar(new File([trozo], `audio.${formato || "webm"}`, { type: trozo.type }));
    };
    recorder.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pararVoz]);

  const conversar = useCallback(
    async (audio: File) => {
      setEstado("entendiendo");
      try {
        const cuerpo = new FormData();
        cuerpo.append("audio", audio);
        const resEscucha = await fetch(ruta("/api/voz/transcribir"), {
          method: "POST",
          body: cuerpo,
        });
        const datos = (await resEscucha.json()) as { texto?: string; error?: string };
        const frase = datos.texto?.trim();
        if (!resEscucha.ok || !frase) {
          setEstado("aparado");
          setAviso(datos.error ?? "No te he oído bien. Pulsa el micrófono y habla de nuevo.");
          return;
        }
        chat.setTexto(frase);
        pendiente.current = frase;
        await chat.enviar(frase);
        // Si el chat no llegó a crear el turno (estaba ocupado), se apaga.
        if (pendiente.current === frase) {
          pendiente.current = null;
          setEstado("aparado");
        }
      } catch {
        pendiente.current = null;
        setEstado("aparado");
        setAviso("La conversación por voz ha fallado. Prueba de nuevo o escribe tu consulta.");
      }
      // chat.enviar y chat.setTexto cambian en cada render del chat.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [chat],
  );

  const leyenda: Record<Estado, string> = {
    aparado: "Hablar",
    escuchando: "Escuchando…",
    entendiendo: "Entendiendo…",
    hablando: "Cortar la voz",
  };
  const ocupado = estado !== "aparado" && estado !== "hablando";

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={estado === "aparado" ? "secondary" : "outline"}
        size="icon-lg"
        onClick={() => {
          if (estado === "hablando") pararVoz();
          else if (estado === "aparado") void escuchar();
        }}
        disabled={ocupado || chat.cargando}
        aria-pressed={estado !== "aparado"}
        aria-label={leyenda[estado]}
        title={leyenda[estado]}
      >
        <Mic
          aria-hidden="true"
          className={
            estado === "escuchando"
              ? "text-brand [animation:pulso_1.2s_ease-in-out_infinite] motion-reduce:animate-none"
              : ""
          }
        />
      </Button>
      <p role="status" aria-live="polite" className="sr-only">
        {aviso ?? leyenda[estado]}
      </p>
    </div>
  );
}
