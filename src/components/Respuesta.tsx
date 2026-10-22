import type { Ref } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Fuentes } from "@/components/Fuentes";
import { fuentesDe, type Entrada } from "@/lib/catalogo";
import { Despues, FilaEntrada } from "./Despues";

// Una entrada del catálogo compuesta como manda Sol: titular, pasos, tarjetas,
// dónde se hace y fuentes. Todo el texto sale del catálogo.
export function Respuesta({
  entrada,
  alternativas,
  confianza,
  onElegir,
  tituloRef,
}: {
  entrada: Entrada;
  alternativas: Entrada[];
  confianza: "alta" | "baja";
  onElegir: (id: string) => void;
  tituloRef?: Ref<HTMLHeadingElement>;
}) {
  const destino = entrada.enlace_tramite ?? entrada.enlace_info;
  return (
    <article
      aria-labelledby="respuesta-titulo"
      className="text-lg [&>*+*]:mt-8"
    >
      <div>
        <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
          {entrada.tipo === "ayuda" ? "Ayuda" : "Trámite"} ·{" "}
          {entrada.administracion}
        </p>
        <h2
          id="respuesta-titulo"
          ref={tituloRef}
          tabIndex={-1}
          className="mt-3 font-sans text-[clamp(30px,5vw,44px)] leading-[1.08] tracking-[-0.03em] outline-none"
        >
          {entrada.titulo}
        </h2>
        <p className="mt-3 text-[15px] text-(--text-secondary)">
          {entrada.organismo}
        </p>
        {confianza === "baja" && (
          <p className="mt-3 text-[15px] text-(--text-secondary)">
            No estamos seguros de que sea esto. Si no encaja, prueba con otras
            palabras.
          </p>
        )}
      </div>

      {!entrada.verificado && (
        <Card
          render={<section aria-label="Aviso" />}
          className="gap-2 bg-muted px-6 py-6 text-base ring-0"
        >
          <h3 className="text-sm font-medium">
            Entrada sin comprobar en la sede oficial
          </h3>
          <p>
            Los requisitos están tomados de la ley, pero no hemos podido
            confirmar el procedimiento en la sede. Confírmalo antes de actuar
            {!entrada.enlace_tramite &&
              ": infórmate en los servicios sociales de tu municipio o en el 012"}
            .
          </p>
          {entrada.nota && (
            <details className="text-[15px] text-(--text-secondary)">
              <summary className="cursor-pointer font-medium">
                Por qué lo decimos
              </summary>
              <p className="mt-2">{entrada.nota}</p>
            </details>
          )}
        </Card>
      )}

      <ol className="grid gap-5">
        {entrada.pasos.map((paso, i) => (
          <li
            key={paso}
            className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 md:grid-cols-[32px_minmax(0,1fr)] md:gap-x-4"
          >
            <span className="text-[22px] leading-[1.1] font-light text-brand tabular-nums md:text-[26px]">
              {i + 1}
            </span>
            <p>{paso}</p>
          </li>
        ))}
      </ol>

      {/* Una sola tarjeta con el sol por vista: el plazo, que es lo que se pierde. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
        <Card
          render={<section />}
          className="gap-2 bg-muted px-6 py-6 text-base ring-0"
        >
          <h3 className="text-sm font-medium text-(--text-secondary)">
            Documentación
          </h3>
          <ul className="grid gap-2">
            {entrada.documentacion.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </Card>
        <Card
          render={<section />}
          className="gap-2 px-6 py-6 text-base ring-0 [background:radial-gradient(120%_90%_at_100%_0%,#ffd34d_0%,rgba(255,211,77,0)_60%),var(--brand-yellow)]"
        >
          <h3 className="text-sm font-medium">Plazo</h3>
          <p>{entrada.plazo ?? "Sin plazo fijo: se puede pedir en cualquier momento."}</p>
        </Card>
        <Card
          render={<section />}
          className="gap-2 bg-muted px-6 py-6 text-base ring-0"
        >
          <h3 className="text-sm font-medium text-(--text-secondary)">
            Requisitos
          </h3>
          <ul className="grid gap-2">
            {entrada.requisitos_clave.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        render={<section />}
        className="flex-row flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 py-6 text-base"
      >
        <div className="min-w-0 flex-[1_1_260px]">
          <p className="text-sm text-(--text-secondary)">
            {entrada.enlace_tramite ? "Dónde se hace" : "Dónde informarse"}
          </p>
          <h3 className="mt-1 text-lg leading-[1.35] font-medium">
            {entrada.organismo}
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
          {entrada.enlace_tramite ? "Ir a la sede oficial" : "Más información"}{" "}
          <span aria-hidden="true">↗</span>
        </a>
      </Card>

      <Fuentes fuentes={fuentesDe(entrada)} />

      {alternativas.length > 0 && (
        <section aria-labelledby="alternativas" className="text-base">
          <h3
            id="alternativas"
            className="text-sm font-medium text-(--text-secondary)"
          >
            Otros resultados de tu búsqueda
          </h3>
          <ul className="mt-3 divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
            {alternativas.map((a) => (
              <li key={a.id}>
                <FilaEntrada entrada={a} onElegir={onElegir} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Despues entrada={entrada} onElegir={onElegir} />
    </article>
  );
}
