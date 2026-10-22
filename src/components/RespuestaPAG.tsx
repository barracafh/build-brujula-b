import type { Ref } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Fuentes } from "@/components/Fuentes";
import { PAG, nombreFuente, type Resultado } from "@/lib/catalogo";
import type { ResultadoPAG } from "@/lib/pag";

// Respuesta construida con la ficha oficial del PAG cuando el catálogo no
// tiene el trámite. Misma composición que una respuesta del catálogo, pero
// todo el contenido viene de la ficha: nada se redacta aquí.
export function RespuestaPAG({
  pag,
  actual,
  onElegir,
  tituloRef,
}: {
  pag: NonNullable<Resultado["pag"]>;
  actual: ResultadoPAG;
  onElegir: (codigoSia: string) => void;
  tituloRef?: Ref<HTMLHeadingElement>;
}) {
  const destino = actual.enlaceWeb ?? actual.url;
  const otros = pag.resultados.filter((r) => r.codigoSia !== actual.codigoSia);
  const fuentes = [
    { nombre: `Ficha SIA ${actual.codigoSia} · Punto de Acceso General`, url: actual.url },
    ...(actual.enlaceWeb
      ? [{ nombre: nombreFuente(actual.enlaceWeb), url: actual.enlaceWeb }]
      : []),
    PAG,
  ];

  return (
    <article
      aria-labelledby="respuesta-titulo"
      className="text-lg [&>*+*]:mt-8"
    >
      <div>
        <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
          Trámite · {actual.administracion}
        </p>
        <h2
          id="respuesta-titulo"
          ref={tituloRef}
          tabIndex={-1}
          className="mt-3 font-sans text-[clamp(30px,5vw,44px)] leading-[1.08] tracking-[-0.03em] outline-none"
        >
          {actual.titulo}
        </h2>
        <p className="mt-3 text-[15px] text-(--text-secondary)">
          {actual.departamento}
          {actual.centroDirectivo && ` · ${actual.centroDirectivo}`}
        </p>
        <p className="mt-3 text-[15px] text-(--text-secondary)">
          Este trámite no está en nuestro catálogo comprobado: lo que ves es la
          ficha oficial del Punto de Acceso General. Confirma pasos y plazos en
          la sede.
        </p>
      </div>

      {actual.descripcion && <p>{actual.descripcion}</p>}

      {/* La tarjeta con el sol: cómo se tramita, que es lo que decide el siguiente paso. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
        <Card
          render={<section />}
          className="gap-2 px-6 py-6 text-base ring-0 [background:radial-gradient(120%_90%_at_100%_0%,#ffd34d_0%,rgba(255,211,77,0)_60%),var(--brand-yellow)]"
        >
          <h3 className="text-sm font-medium">Cómo se tramita</h3>
          <p>{actual.nivelTramitacion ?? "Consulta la ficha oficial."}</p>
        </Card>
        <Card
          render={<section />}
          className="gap-2 bg-muted px-6 py-6 text-base ring-0"
        >
          <h3 className="text-sm font-medium text-(--text-secondary)">
            Quién lo gestiona
          </h3>
          <p>{actual.departamento}</p>
        </Card>
        <Card
          render={<section />}
          className="gap-2 bg-muted px-6 py-6 text-base ring-0"
        >
          <h3 className="text-sm font-medium text-(--text-secondary)">
            Código SIA
          </h3>
          <p className="font-mono">{actual.codigoSia}</p>
        </Card>
      </div>

      <Card
        render={<section />}
        className="flex-row flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 py-6 text-base"
      >
        <div className="min-w-0 flex-[1_1_260px]">
          <p className="text-sm text-(--text-secondary)">
            {actual.enlaceWeb ? "Dónde se hace" : "Dónde informarse"}
          </p>
          <h3 className="mt-1 text-lg leading-[1.35] font-medium">
            {actual.enlaceWeb ? nombreFuente(actual.enlaceWeb) : "Ficha del trámite en el PAG"}
          </h3>
          <p className="mt-1 font-mono text-sm text-(--text-secondary) [overflow-wrap:anywhere]">
            {new URL(destino).hostname}
          </p>
        </div>
        <a
          href={destino}
          className={cn(
            buttonVariants({ variant: "sunset", size: "lg" }),
            "max-md:w-full",
          )}
        >
          {actual.enlaceWeb ? "Ir a la web oficial" : "Ver la ficha oficial"}{" "}
          <span aria-hidden="true">↗</span>
        </a>
      </Card>

      <Fuentes fuentes={fuentes} />

      {otros.length > 0 && (
        <section aria-labelledby="otros-pag" className="text-base">
          <h3 id="otros-pag" className="text-sm font-medium text-(--text-secondary)">
            También puede ser
          </h3>
          <ul className="mt-3 divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
            {otros.map((r) => (
              <li key={r.codigoSia}>
                <button
                  type="button"
                  onClick={() => onElegir(r.codigoSia)}
                  className="flex min-h-11 w-full items-center justify-between gap-4 px-4 py-3 text-left text-base transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{r.administracion}</Badge>
                      <span className="font-mono text-xs text-(--text-secondary)">
                        SIA {r.codigoSia}
                      </span>
                    </span>
                    <span className="mt-1.5 block font-medium [overflow-wrap:anywhere]">
                      {r.titulo}
                    </span>
                    <span className="block text-sm text-(--text-secondary)">
                      {r.departamento}
                    </span>
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[15px] text-(--text-secondary)">
            <a href={pag.url} className="underline underline-offset-4">
              Ver todos los resultados en el buscador oficial
            </a>
          </p>
        </section>
      )}
    </article>
  );
}
