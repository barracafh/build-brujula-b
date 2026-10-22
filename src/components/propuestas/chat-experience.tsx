"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BookOpen, CircleHelp, MessageSquare, Plus, Search, SquarePen } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { site } from "@/config/sitio";
import { entradas } from "@/lib/catalogo";
import { cn } from "@/lib/utils";
import ficha from "../../../ficha.json";
import { ComposerChat, HiloChat } from "./chat-ui";
import { PortadaBrujula } from "./portada-brujula";
import { useChat, type Chat } from "./use-chat";

type Variante = "a" | "b" | "c";
const titulos = {
  a: "¿Qué necesitas resolver?",
  b: "Vamos a ponerlo fácil.",
  c: "¿Por dónde empezamos?",
};
const sugerencias = [
  { nombre: "empleo", frase: "fraseEmpleo" },
  { nombre: "padron", frase: "frasePadron" },
  { nombre: "dni", frase: "fraseDni" },
] as const;

export function ChatExperience({ variante }: { variante: Variante }) {
  const chat = useChat();
  const [catalogo, setCatalogo] = useState(false);
  const activo = chat.turnos.length > 0;
  const t = chat.textos;
  const lateral = variante !== "c";

  return (
    <TooltipProvider delay={250}>
      <div lang={chat.idioma === "ca" ? "ca-valencia" : chat.idioma} className="flex h-full min-h-0 min-w-0 bg-background">
        {lateral && <BarraLateral chat={chat} amplia={variante === "b"} onCatalogo={() => setCatalogo(true)} />}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <span aria-hidden="true" className="font-mono text-2xl text-brand">{ficha.icono}</span>
              <div>
                <span className="block text-lg font-medium tracking-tight">{ficha.nombre.split(" · ")[0]}</span>
                {variante === "c" && <span className="hidden text-xs text-(--text-secondary) sm:block">{t.guia}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-5">
              {variante !== "c" && <nav aria-label="Alternativas de diseño" className="flex gap-1">
                {(["a", "b", "c"] as const).map((id) => (
                  <Link key={id} href={`/${id}`} aria-current={id === variante ? "page" : undefined} aria-label={`Diseño ${id.toUpperCase()}`} className={cn(buttonVariants({ variant: id === variante ? "outline" : "secondary", size: "sm" }), "size-8 p-0 font-mono text-xs")}>{id.toUpperCase()}</Link>
                ))}
              </nav>}
              <IconoAccion texto={t.nueva} icono={<SquarePen />} onClick={chat.reiniciar} className={cn(lateral && "md:hidden")} />
              <Tooltip>
                <TooltipTrigger render={<a href={site.feedbackUrl} aria-label="¿Algo está mal? Avísanos" className={cn(buttonVariants({ variant: "secondary", size: "icon-lg" }), lateral && "md:hidden")} />}>
                  <CircleHelp aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>¿Algo está mal? Avísanos</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <main id="contenido" tabIndex={-1} className="flex min-h-0 min-w-0 flex-1 flex-col outline-none">
            {activo ? (
              <>
                <h1 className="sr-only">{t.conversacion}</h1>
                <HiloChat chat={chat} brujula={variante === "c"} />
                <div className="mx-auto w-full max-w-[800px] shrink-0 px-5 pt-4 pb-4 sm:px-8">
                  <ComposerChat chat={chat} compacta={variante === "c"} onCatalogo={() => setCatalogo(true)} />
                </div>
              </>
            ) : (
              <ScrollArea className="min-h-0 flex-1">
                <div className="grid min-h-full place-items-center px-5 py-12 sm:px-8">
                  <div className={cn("w-full max-w-[720px]", variante === "b" && "max-w-[640px]")}>
                    {variante === "c" ? <PortadaBrujula textos={t} /> : <h1 className={cn("mb-8 text-center text-[clamp(30px,4vw,42px)] leading-tight tracking-tight", variante === "b" && "text-left")}>{titulos[variante]}</h1>}
                    <ComposerChat chat={chat} compacta={variante === "c"} onCatalogo={() => setCatalogo(true)} />
                    {variante !== "c" && <div className={cn("mt-6 flex flex-wrap justify-center gap-2", variante === "b" && "justify-start")} aria-label="Ideas para empezar">
                      {sugerencias.map((s) => <Button key={s.nombre} variant="outline" size="lg" onClick={() => void chat.enviar(t[s.frase])} className="gap-2 px-4">{t[s.nombre]}</Button>)}
                      <Button variant="secondary" size="lg" onClick={() => setCatalogo(true)} className="gap-2 px-4"><Plus aria-hidden="true" /> {t.mas}</Button>
                    </div>}
                  </div>
                </div>
              </ScrollArea>
            )}
          </main>
        </div>
        <CatalogoDialog chat={chat} open={catalogo} onOpenChange={setCatalogo} onElegir={(id) => { chat.abrirEntrada(id); setCatalogo(false); }} />
      </div>
    </TooltipProvider>
  );
}

function BarraLateral({ chat, amplia, onCatalogo }: { chat: Chat; amplia: boolean; onCatalogo: () => void }) {
  const t = chat.textos;
  return (
    <aside aria-label="Navegación" className={cn("hidden w-16 shrink-0 flex-col items-center gap-4 border-r py-5 md:flex", amplia && "w-60 items-stretch bg-muted/40 px-4")}>
      {amplia ? <>
        <p className="mb-3 px-2 text-base font-medium">{t.guia}</p>
        <Button variant="outline" size="lg" onClick={chat.reiniciar} className="min-h-10 justify-start gap-3 px-3"><SquarePen aria-hidden="true" /> {t.nueva}</Button>
        <Button variant="secondary" size="lg" onClick={onCatalogo} className="min-h-10 justify-start gap-3 px-3"><BookOpen aria-hidden="true" /> {t.catalogo}</Button>
        {chat.turnos.length > 0 && <>
          <Separator className="my-3" />
          <p className="px-2 font-mono text-xs text-(--text-secondary)">EN ESTA SESIÓN</p>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1">{chat.turnos.map((t) => <Button key={t.id} variant="secondary" onClick={() => chat.seleccionar(t)} className={cn("h-auto min-h-10 w-full justify-start gap-2 px-2 py-2 text-left font-normal", chat.seleccion === t.id && "bg-muted")}><MessageSquare aria-hidden="true" className="size-3.5" /><span className="truncate">{t.pregunta}</span></Button>)}</div>
          </ScrollArea>
        </>}
      </> : <>
        <IconoAccion texto={t.nueva} icono={<SquarePen />} onClick={chat.reiniciar} />
        <IconoAccion texto={t.catalogo} icono={<BookOpen />} onClick={onCatalogo} />
      </>}
      <div className="mt-auto pt-6">
        <Tooltip>
          <TooltipTrigger render={<a href={site.feedbackUrl} aria-label="¿Algo está mal? Avísanos" className={cn(buttonVariants({ variant: "secondary", size: amplia ? "lg" : "icon-lg" }), amplia && "h-auto min-h-10 w-full justify-start gap-2 px-2 py-2 text-left whitespace-normal")} />}>
            <CircleHelp aria-hidden="true" />{amplia && <span className="text-xs">¿Algo está mal? Avísanos</span>}
          </TooltipTrigger>
          {!amplia && <TooltipContent side="right">¿Algo está mal? Avísanos</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  );
}

function IconoAccion({ texto, icono, onClick, className }: { texto: string; icono: ReactNode; onClick: () => void; className?: string }) {
  return <Tooltip><TooltipTrigger render={<Button variant="secondary" size="icon-lg" aria-label={texto} onClick={onClick} className={className} />}>{icono}</TooltipTrigger><TooltipContent side="bottom">{texto}</TooltipContent></Tooltip>;
}

function CatalogoDialog({ chat, open, onOpenChange, onElegir }: { chat: Chat; open: boolean; onOpenChange: (open: boolean) => void; onElegir: (id: string) => void }) {
  const t = chat.textos;
  const [filtro, setFiltro] = useState("");
  const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visibles = entradas.map((e) => chat.entradaLocalizada(e.id) ?? e).filter((e) => normalizar(`${e.titulo} ${e.frases_usuario.join(" ")}`).includes(normalizar(filtro)));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader><DialogTitle>{t.catalogo}</DialogTitle><DialogDescription className="sr-only">{t.elegir}</DialogDescription></DialogHeader>
        <div className="relative"><label htmlFor="filtrar-catalogo" className="sr-only">{t.buscar}</label><Search aria-hidden="true" className="pointer-events-none absolute top-3 left-3 size-4 text-(--text-secondary)" /><Input id="filtrar-catalogo" placeholder={t.buscar} value={filtro} onChange={(e) => setFiltro(e.target.value)} className="h-10 pl-9 text-base md:text-base" /></div>
        <ScrollArea className="h-[min(52dvh,420px)]">
          <div className="space-y-1 pr-3">{visibles.map((e) => <Button key={e.id} variant="secondary" onClick={() => onElegir(e.id)} className="h-auto min-h-12 w-full justify-start px-3 py-3 text-left text-base font-normal whitespace-normal"><span>{e.titulo}{!e.verificado && <span className="mt-1 block text-xs text-(--text-secondary)">{t.sinVerificar}</span>}</span></Button>)}{visibles.length === 0 && <p role="status" className="p-3 text-base text-(--text-secondary)">{t.sinResultados}</p>}</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
