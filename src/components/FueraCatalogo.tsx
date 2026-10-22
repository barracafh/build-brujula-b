import type { Ref } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Fuentes } from "@/components/Fuentes";
import { PAG, entradas } from "@/lib/catalogo";

// Cuando la frase no encaja con el catálogo lo decimos y remitimos al buscador
// oficial, en vez de forzar un parecido.
export function FueraCatalogo({
  tituloRef,
}: {
  tituloRef?: Ref<HTMLHeadingElement>;
}) {
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
          href={PAG.url}
          className={cn(
            buttonVariants({ variant: "sunset", size: "lg" }),
            "max-md:w-full",
          )}
        >
          Buscar en el PAG <span aria-hidden="true">↗</span>
        </a>
      </Card>

      <Fuentes fuentes={[PAG]} />
    </article>
  );
}
