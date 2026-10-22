"use client";

import { ArrowRight, ArrowUpRight, BookOpen } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fuentes, type Source } from "@/components/Fuentes";
import { fuentesDe, PAG, relacionadas } from "@/lib/catalogo";
import { textosPara, type Textos } from "@/lib/idioma";
import { cn } from "@/lib/utils";
import type { Chat, Enfoque, TurnoChat } from "./use-chat";
import { RespuestaPAGChat } from "./respuesta-pag-chat";

export function RespuestaChat({ turno, chat, destacar = false }: { turno: TurnoChat; chat: Chat; destacar?: boolean }) {
  const t = textosPara(turno.resultado?.idioma ?? turno.idioma, turno.resultado?.textos);
  const aclaracion = turno.resultado?.aclaracion;
  if (aclaracion) return (
    <article className="space-y-5 text-base">
      <p className="text-lg leading-relaxed">{aclaracion.ayuda ? t.ayudaAmbito : aclaracion.opciones.length === 2 && aclaracion.opciones.includes("local") && aclaracion.opciones.includes("nacional") ? t.ambitoPregunta : t.ambitoGeneral}</p>
      <div className="flex flex-wrap gap-2" aria-label={t.ambitoGeneral}>
        {aclaracion.opciones.map((ambito) => <Button key={ambito} variant="outline" size="lg" disabled={chat.cargando} onClick={() => chat.elegirAmbito(ambito, turno)} className="h-auto min-h-11 px-4 py-2 whitespace-normal">{t[ambito]}</Button>)}
        {!aclaracion.ayuda && <Button variant="secondary" size="lg" disabled={chat.cargando} onClick={() => chat.elegirAmbito("desconocido", turno)} className="min-h-11 px-4">{t.noSe}</Button>}
      </div>
      {aclaracion.ayuda && <div className="flex flex-wrap gap-3"><a href={PAG.url} className={buttonVariants({ variant: "outline", size: "lg" })}>{t.buscador}<ArrowUpRight aria-hidden="true" /></a><FuentesPopover fuentes={[PAG]} textos={t} /></div>}
    </article>
  );

  const entrada = turno.resultado?.entradas[0];
  // Fuera de catálogo: si el buscador oficial del PAG tiene fichas, la primera es la respuesta.
  const pag = turno.resultado?.pag;
  if ((!entrada || turno.resultado?.fueraCatalogo) && pag && pag.resultados.length > 0) return (
    <RespuestaPAGChat turno={turno} pag={pag} destacar={destacar} />
  );
  if (!entrada || turno.resultado?.fueraCatalogo) return (
    <article className="space-y-6 text-base"><p>{t.noConfirmado}</p><div className="flex flex-wrap items-center gap-3"><a href={pag?.url ?? PAG.url} className={buttonVariants({ variant: "outline", size: "lg" })}>{t.buscador}<ArrowUpRight aria-hidden="true" /></a><FuentesPopover fuentes={[PAG]} textos={t} /></div></article>
  );

  const enfoque = turno.enfoque ?? "resumen";
  const resumen = enfoque === "resumen";
  const titulos: Record<Enfoque, string> = { resumen: t.tramite, pasos: t.pasoAPaso, documentacion: t.documentosTitulo, requisitos: t.requisitos, plazo: t.plazo, sede: t.donde, relacionados: t.relacionados };
  const siguientes = turno.resultado?.relacionadas
    ? turno.resultado.relacionadas.filter((e) => entrada.relacionados.includes(e.id))
    : relacionadas(entrada);
  const destino = entrada.enlace_tramite ?? entrada.enlace_info;
  const fuentes = enfoque === "relacionados" ? [...new Map([entrada, ...siguientes].flatMap(fuentesDe).map((f) => [f.url, f])).values()] : fuentesDe(entrada);
  const traducida = (turno.resultado?.idioma ?? turno.idioma ?? "es") !== "es";

  if (turno.resultado?.traduccionDisponible === false) return (
    <article className="space-y-5 text-base"><p>{t.noTraduccion}</p><div className="flex flex-wrap gap-3"><a href={destino} className={buttonVariants({ variant: "outline", size: "lg" })}>{t.informacion}<ArrowUpRight aria-hidden="true" /></a><FuentesPopover fuentes={fuentes} textos={t} /></div></article>
  );

  function contenido(tipo: Enfoque) {
    if (tipo === "pasos") return <ol className="space-y-5">{entrada!.pasos.map((paso, i) => <li key={paso} className="grid grid-cols-[20px_minmax(0,1fr)] gap-4"><span aria-hidden="true" className="pt-0.5 font-mono text-xs text-brand">{String(i + 1).padStart(2, "0")}</span><span className="leading-7">{paso}</span></li>)}</ol>;
    if (tipo === "documentacion") return <Lista items={entrada!.documentacion} />;
    if (tipo === "requisitos") return <Lista items={entrada!.requisitos_clave} />;
    if (tipo === "plazo") return <Card className={cn("ring-0", destacar ? "bg-brand-yellow" : "bg-muted")}><CardHeader><CardTitle>{t.plazoSolicitud}</CardTitle></CardHeader><CardContent className="text-base leading-7">{entrada!.plazo ?? t.noPlazo}</CardContent></Card>;
    if (tipo === "sede") return <p className="text-base leading-7">{entrada!.organismo}</p>;
    if (tipo === "relacionados") return <div className="space-y-2">{siguientes.length === 0 && <p>{t.noRelacionados}</p>}{siguientes.map((e) => <Button key={e.id} variant="outline" disabled={chat.cargando} onClick={() => chat.abrirEntrada(e.id)} className="h-auto min-h-12 w-full justify-between gap-4 px-4 py-3 text-left text-base font-normal whitespace-normal"><span>{e.titulo}{!e.verificado && <span className="mt-1 block text-xs text-(--text-secondary)">{t.sinVerificar}</span>}</span><ArrowRight aria-hidden="true" /></Button>)}</div>;
    return null;
  }

  return (
    <article className="min-w-0 space-y-6 text-base [overflow-wrap:anywhere]">
      <h2 className="text-2xl leading-snug sm:text-3xl">{resumen ? entrada.titulo : titulos[enfoque]}</h2>
      {turno.resultado?.confianza === "baja" && <p className="text-base text-(--text-secondary)">{t.orientativa}</p>}
      {!entrada.verificado && <Card className="gap-2 bg-muted ring-0"><CardContent className="text-base leading-7">{t.avisoVerificacion}</CardContent></Card>}
      {resumen ? (
        <Tabs defaultValue="pasos" className="gap-6">
          <TabsList variant="line" aria-label={t.tramite} className="w-full justify-start gap-4 p-0 group-data-[orientation=horizontal]/tabs:h-11">
            <TabsTrigger value="pasos" className="flex-none px-0 text-xs sm:px-1 sm:text-sm">{t.pasos}</TabsTrigger>
            <TabsTrigger value="documentacion" className="flex-none px-0 text-xs sm:px-1 sm:text-sm">{t.documentos}</TabsTrigger>
            <TabsTrigger value="requisitos" className="flex-none px-0 text-xs sm:px-1 sm:text-sm">{t.requisitos}</TabsTrigger>
            <TabsTrigger value="plazo" className="flex-none px-0 text-xs sm:px-1 sm:text-sm">{t.plazo}</TabsTrigger>
          </TabsList>
          {(["pasos", "documentacion", "requisitos", "plazo"] as const).map((tipo) => <TabsContent key={tipo} value={tipo} className="text-base">{contenido(tipo)}</TabsContent>)}
        </Tabs>
      ) : contenido(enfoque)}
      <Separator />
      <div className="flex flex-wrap items-center gap-3">
        <a href={destino} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2 px-4")} aria-label={`${entrada.enlace_tramite ? t.sede : t.informacion} · ${entrada.organismo}`}>{entrada.enlace_tramite ? t.sede : t.informacion}<ArrowUpRight aria-hidden="true" /></a>
        <FuentesPopover fuentes={fuentes} textos={t} traducida={traducida} />
        {enfoque !== "relacionados" && siguientes.length > 0 && <Button variant="secondary" size="lg" disabled={chat.cargando} onClick={() => chat.preguntar(t.preguntaDespues, "relacionados", turno.resultado)} className="gap-2 px-3">{t.despues}<ArrowRight aria-hidden="true" /></Button>}
      </div>
    </article>
  );
}

function Lista({ items }: { items: string[] }) {
  return <ul className="list-disc space-y-4 pl-5 text-base leading-7 marker:text-(--text-secondary)">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export function FuentesPopover({ fuentes, textos = textosPara("es"), traducida = false }: { fuentes: Source[]; textos?: Textos; traducida?: boolean }) {
  return <Popover><PopoverTrigger render={<Button variant="secondary" size="lg" className="gap-2 px-3" />}><BookOpen aria-hidden="true" />{textos.fuentes} ({fuentes.length})</PopoverTrigger><PopoverContent align="start" sideOffset={8} className="w-[min(480px,calc(100vw-32px))] gap-4 p-4 shadow-(--shadow-soft)"><PopoverTitle className="sr-only">{textos.fuentesOficiales}</PopoverTitle><ScrollArea className="max-h-[60dvh] **:data-[slot=scroll-area-viewport]:max-h-[60dvh]"><Fuentes fuentes={fuentes} titulo={textos.fuentesOficiales} />{traducida && <p className="mt-4 text-sm text-(--text-secondary)">{textos.traduccion}</p>}</ScrollArea></PopoverContent></Popover>;
}
