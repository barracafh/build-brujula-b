"use client";

import { useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Source } from "@/components/Fuentes";
import { nombreFuente, PAG, type Resultado } from "@/lib/catalogo";
import { cn } from "@/lib/utils";
import { FuentesPopover } from "./respuesta-chat";
import type { TurnoChat } from "./use-chat";

// Respuesta del chat cuando el catálogo no tiene el trámite pero el buscador
// oficial del PAG sí: se enseña la ficha oficial del primer resultado con la
// misma composición que una respuesta del catálogo. Todo el contenido viene de
// la ficha; aquí no se redacta nada.
const TEXTOS = {
  es: {
    aviso: "Este trámite no está en nuestro catálogo comprobado: es la ficha oficial del Punto de Acceso General. Confirma pasos y plazos en la sede.",
    comoSeTramita: "Cómo se tramita",
    sinNivel: "Consulta la ficha oficial.",
    gestiona: "Lo gestiona",
    web: "Web oficial",
    ficha: "Ficha oficial",
    tambien: "También puede ser",
    verTodos: "Ver todos los resultados en el buscador oficial",
    fichaPag: "Ficha SIA",
  },
  ca: {
    aviso: "Este tràmit no està en el nostre catàleg comprovat: és la fitxa oficial del Punt d'Accés General. Confirma passos i terminis en la seu.",
    comoSeTramita: "Com es tramita",
    sinNivel: "Consulta la fitxa oficial.",
    gestiona: "Ho gestiona",
    web: "Web oficial",
    ficha: "Fitxa oficial",
    tambien: "També pot ser",
    verTodos: "Veure tots els resultats en el cercador oficial",
    fichaPag: "Fitxa SIA",
  },
  en: {
    aviso: "This procedure is not in our verified catalogue: this is the official record from the Punto de Acceso General. Confirm steps and deadlines with the office.",
    comoSeTramita: "How it is processed",
    sinNivel: "See the official record.",
    gestiona: "Managed by",
    web: "Official website",
    ficha: "Official record",
    tambien: "It could also be",
    verTodos: "See all results in the official search",
    fichaPag: "SIA record",
  },
};

export function RespuestaPAGChat({
  turno,
  pag,
  destacar = false,
}: {
  turno: TurnoChat;
  pag: NonNullable<Resultado["pag"]>;
  destacar?: boolean;
}) {
  const idioma = turno.resultado?.idioma ?? turno.idioma ?? "es";
  const t = TEXTOS[idioma as keyof typeof TEXTOS] ?? TEXTOS.es;
  const [codigo, setCodigo] = useState(pag.resultados[0].codigoSia);
  const actual = pag.resultados.find((r) => r.codigoSia === codigo) ?? pag.resultados[0];
  const otros = pag.resultados.filter((r) => r.codigoSia !== actual.codigoSia);
  const destino = actual.enlaceWeb ?? actual.url;
  const fuentes: Source[] = [
    { nombre: `${t.fichaPag} ${actual.codigoSia} · Punto de Acceso General`, url: actual.url },
    ...(actual.enlaceWeb ? [{ nombre: nombreFuente(actual.enlaceWeb), url: actual.enlaceWeb }] : []),
    PAG,
  ];

  return (
    <article className="min-w-0 space-y-6 text-base [overflow-wrap:anywhere]">
      <div className="space-y-2">
        <h2 className="text-2xl leading-snug sm:text-3xl">{actual.titulo}</h2>
        <p className="text-base text-(--text-secondary)">
          {actual.departamento}
          {actual.centroDirectivo && ` · ${actual.centroDirectivo}`}
          {" · "}
          <span className="font-mono text-sm">SIA {actual.codigoSia}</span>
        </p>
      </div>
      <p className="text-base text-(--text-secondary)">{t.aviso}</p>
      {actual.descripcion && <p className="leading-7">{actual.descripcion}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className={cn("gap-2 ring-0", destacar ? "bg-brand-yellow" : "bg-muted")}>
          <CardHeader><CardTitle>{t.comoSeTramita}</CardTitle></CardHeader>
          <CardContent className="text-base leading-7">{actual.nivelTramitacion ?? t.sinNivel}</CardContent>
        </Card>
        <Card className="gap-2 bg-muted ring-0">
          <CardHeader><CardTitle>{t.gestiona}</CardTitle></CardHeader>
          <CardContent className="text-base leading-7">{actual.departamento}</CardContent>
        </Card>
      </div>
      <Separator />
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={destino}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2 px-4")}
          aria-label={`${actual.enlaceWeb ? t.web : t.ficha} · ${actual.titulo}`}
        >
          {actual.enlaceWeb ? t.web : t.ficha}
          <ArrowUpRight aria-hidden="true" />
        </a>
        <FuentesPopover fuentes={fuentes} />
      </div>
      {otros.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-(--text-secondary)">{t.tambien}</p>
          {otros.map((r) => (
            <Button
              key={r.codigoSia}
              variant="outline"
              onClick={() => setCodigo(r.codigoSia)}
              className="h-auto min-h-12 w-full justify-between gap-4 px-4 py-3 text-left text-base font-normal whitespace-normal"
            >
              <span>
                {r.titulo}
                <span className="mt-1 block text-xs text-(--text-secondary)">{r.departamento}</span>
              </span>
              <ArrowRight aria-hidden="true" />
            </Button>
          ))}
          <p className="text-sm">
            <a href={pag.url} className="underline underline-offset-4">{t.verTodos}</a>
          </p>
        </div>
      )}
    </article>
  );
}
