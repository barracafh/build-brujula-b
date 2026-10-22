import type { Ref } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Fuentes } from "@/components/Fuentes";
import { PAG, entradas, type Resultado } from "@/lib/catalogo";

// Cuando la frase no encaja con el catálogo lo decimos y remitimos al buscador
// oficial, en vez de forzar un parecido. Si el PAG ha devuelto resultados para
// la consulta que propuso el modelo, los enseñamos tal cual, con su enlace a la
// ficha oficial: no añadimos nada que no esté en el PAG.
export function FueraCatalogo({
  pag,
  tituloRef,
}: {
  pag?: Resultado["pag"];
  tituloRef?: Ref<HTMLHeadingElement>;
}) {
  const urlBuscador = pag?.url ?? PAG.url;
  return (
    <article
      aria-labelledby="respuesta-titulo"
      className="text-lg [&>*+*]:mt-8"
    >
      <div>
        <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
          Sin coincidencia
        </p>
        <h2
          id="respuesta-titulo"
          ref={tituloRef}
          tabIndex={-1}
          className="mt-3 font-sans text-[clamp(30px,5vw,44px)] leading-[1.08] tracking-[-0.03em] outline-none"
        >
          No encontramos este trámite en nuestro catálogo
        </h2>
        <p className="mt-3 text-[15px] text-(--text-secondary)">
          Cubrimos {entradas.length} trámites y ayudas habituales para quien
          vive en València. Si lo tuyo es otra cosa, el buscador oficial del
          Estado reúne todos los procedimientos con su enlace a la sede. También
          puedes probar a contarlo con otras palabras.
        </p>
      </div>

      {pag && pag.resultados.length > 0 && (
        <section aria-labelledby="pag-resultados" className="text-base">
          <h3 id="pag-resultados" className="text-sm font-medium text-(--text-secondary)">
            Lo que encuentra el buscador oficial para{" "}
            <span className="font-mono">«{pag.consulta}»</span>
          </h3>
          <ul className="mt-3 divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
            {pag.resultados.map((r) => (
              <li key={r.codigoSia}>
                <a
                  href={r.url}
                  className="flex min-h-11 items-center justify-between gap-4 px-4 py-3 transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
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
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[15px] text-(--text-secondary)">
            Son fichas del Punto de Acceso General; cada una enlaza a la sede
            que gestiona el trámite. No las hemos comprobado una a una.
          </p>
        </section>
      )}

      <Card
        render={<section />}
        className="flex-row flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 py-6 text-base"
      >
        <div className="min-w-0 flex-[1_1_260px]">
          <p className="text-sm text-(--text-secondary)">Dónde se busca</p>
          <h3 className="mt-1 text-lg leading-[1.35] font-medium">
            Buscador de trámites del Punto de Acceso General
          </h3>
          <p className="mt-1 font-mono text-sm text-(--text-secondary)">
            {new URL(PAG.url).hostname}
          </p>
        </div>
        <a
          href={urlBuscador}
          className={cn(
            buttonVariants({ variant: "sunset", size: "lg" }),
            "max-md:w-full",
          )}
        >
          {pag ? "Ver más en el PAG" : "Buscar en el PAG"}{" "}
          <span aria-hidden="true">↗</span>
        </a>
      </Card>

      <Fuentes fuentes={[PAG]} />
    </article>
  );
}
