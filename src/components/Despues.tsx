import { Badge } from "@/components/ui/badge";
import { relacionadas, type Entrada } from "@/lib/catalogo";

// «Y después, ¿qué?»: los trámites y ayudas que el catálogo encadena con el
// actual (campo `relacionados`). No hay modelo de por medio: es una consulta.
export function Despues({
  entrada,
  onElegir,
}: {
  entrada: Entrada;
  onElegir: (id: string) => void;
}) {
  const siguientes = relacionadas(entrada);
  if (!siguientes.length) return null;
  return (
    <section aria-labelledby="despues" className="text-base">
      <h2
        id="despues"
        className="font-sans text-[clamp(24px,3.5vw,32px)] leading-[1.15] tracking-[-0.02em]"
      >
        Y después, ¿qué?
      </h2>
      <p className="mt-2 text-[15px] text-(--text-secondary)">
        Lo que suele venir a continuación. Cada uno con sus pasos y su fuente.
      </p>
      <ul className="mt-4 divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
        {siguientes.map((s) => (
          <li key={s.id}>
            <FilaEntrada entrada={s} onElegir={onElegir} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FilaEntrada({
  entrada,
  onElegir,
}: {
  entrada: Entrada;
  onElegir: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onElegir(entrada.id)}
      className="flex min-h-11 w-full items-center justify-between gap-4 px-4 py-3 text-left text-base transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {entrada.tipo === "ayuda" ? "Ayuda" : "Trámite"}
          </Badge>
          {!entrada.verificado && (
            <Badge variant="secondary">Sin comprobar</Badge>
          )}
        </span>
        <span className="mt-1.5 block font-medium">{entrada.titulo}</span>
        <span className="block text-sm text-(--text-secondary)">
          {entrada.organismo}
        </span>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  );
}
