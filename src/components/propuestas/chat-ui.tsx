"use client";

import { useEffect, useId, useRef } from "react";
import { ArrowUp, BookOpen, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import ficha from "../../../ficha.json";
import { RespuestaChat } from "./respuesta-chat";
import { RosaBrujula } from "./portada-brujula";
import type { Chat } from "./use-chat";
import { textosPara } from "@/lib/idioma";

export function ComposerChat({ chat, compacta = false, onCatalogo }: { chat: Chat; compacta?: boolean; onCatalogo: () => void }) {
  const id = useId();
  const t = chat.textos;
  return (
    <form onSubmit={(event) => { event.preventDefault(); void chat.enviar(chat.texto); }}>
      <label htmlFor={id} className="sr-only">{t.mensaje}</label>
      <InputGroup className={cn("rounded-2xl bg-background p-2 has-disabled:bg-background has-disabled:opacity-100", compacta && "gap-1")}>
        <InputGroupTextarea
          id={id}
          ref={chat.campo}
          value={chat.texto}
          onChange={(event) => chat.setTexto(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void chat.enviar(chat.texto);
            }
          }}
          rows={compacta ? 1 : 2}
          maxLength={2001}
          placeholder={t.placeholder}
          aria-invalid={Boolean(chat.aviso)}
          aria-describedby={compacta ? `${id}-error` : `${id}-nota ${id}-error`}
          className={cn("max-h-40 px-4 py-3 text-base placeholder:text-(--text-secondary) md:text-base", compacta ? "min-h-14" : "min-h-16")}
        />
        <InputGroupAddon align={compacta ? "inline-end" : "block-end"} className={cn("justify-between gap-3 px-3 pb-2", compacta && "px-1 py-0")}>
          <Tooltip>
            <TooltipTrigger render={<Button variant="secondary" size="icon-lg" onClick={onCatalogo} aria-label={t.catalogo} className={cn(compacta && "hidden sm:inline-flex")} />}><BookOpen aria-hidden="true" /></TooltipTrigger>
            <TooltipContent>{t.catalogo}</TooltipContent>
          </Tooltip>
          <Button type="submit" variant="sunset" size="icon-lg" aria-label={chat.cargando ? t.buscando : t.enviar} disabled={chat.cargando || !chat.texto.trim()} className="size-10 rounded-xl">
            {chat.cargando ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <ArrowUp aria-hidden="true" className="size-5" />}
          </Button>
        </InputGroupAddon>
      </InputGroup>
      <p id={`${id}-error`} role="alert" className={cn("text-base text-destructive", chat.aviso && "mt-3")}>{chat.aviso}</p>
      {!compacta && <p id={`${id}-nota`} className="mt-3 text-center text-xs text-(--text-secondary)">{t.privacidad}</p>}
    </form>
  );
}

export function HiloChat({ chat, brujula = false }: { chat: Chat; brujula?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const ultimo = useRef<HTMLDivElement>(null);
  const seguir = useRef(true);
  const anterior = useRef(0);
  const seleccionAnterior = useRef(chat.seleccion);
  const ultimaRespuesta = [...chat.turnos].reverse().find((t) => t.resultado?.entradas.length)?.id;

  useEffect(() => {
    const contenedor = panel.current;
    const nuevo = chat.turnos.length > anterior.current;
    const cambioSeleccion = seleccionAnterior.current !== chat.seleccion;
    anterior.current = chat.turnos.length;
    seleccionAnterior.current = chat.seleccion;
    const seleccionado = cambioSeleccion ? contenedor?.querySelector<HTMLElement>(`[data-turno="${chat.seleccion}"]`) : ultimo.current;
    if (contenedor && seleccionado && (nuevo || cambioSeleccion || seguir.current)) {
      contenedor.scrollTop += seleccionado.getBoundingClientRect().top - contenedor.getBoundingClientRect().top - 32;
    }
  }, [chat.turnos, chat.seleccion]);

  return (
    <ScrollArea
      viewportRef={panel}
      onViewportScroll={() => { const el = panel.current; if (el) seguir.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160; }}
      className="min-h-0 flex-1"
    >
      <div role="log" aria-label={chat.textos.conversacion} aria-live="polite" aria-relevant="additions text" className="mx-auto w-full max-w-[800px] space-y-14 px-5 py-8 sm:space-y-16 sm:px-8">
        {chat.turnos.map((turno, i) => {
          const t = textosPara(turno.idioma, turno.resultado?.textos);
          return (
          <div key={turno.id} data-turno={turno.id} lang={turno.idioma === "ca" ? "ca-valencia" : turno.idioma} ref={i === chat.turnos.length - 1 ? ultimo : undefined} className="space-y-8">
            <div className="flex justify-end"><p className="max-w-[90%] rounded-2xl bg-muted px-5 py-3 text-base leading-relaxed [overflow-wrap:anywhere]"><span className="sr-only">{t.tu}: </span>{turno.pregunta}</p></div>
            <div className="min-w-0">
              <div className="mb-5 flex items-center gap-2.5"><span aria-hidden="true" className="font-mono text-xl text-brand">{ficha.icono}</span><span className="text-sm font-medium">Brújula</span></div>
              {turno.estado === "cargando" ? <p role="status" className="flex items-center gap-3 text-base text-(--text-secondary)">{brujula ? <RosaBrujula className="size-8 sm:size-8" /> : <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}{t.buscando}</p> : turno.estado === "error" ? <div className="space-y-4"><p role="alert" className="text-base">{t.noConsulta}</p><Button variant="outline" disabled={chat.cargando} onClick={() => void chat.enviar(turno.pregunta)}>{t.reintentar}</Button></div> : <RespuestaChat turno={turno} chat={chat} destacar={turno.id === ultimaRespuesta} />}
            </div>
          </div>
        ); })}
      </div>
    </ScrollArea>
  );
}
