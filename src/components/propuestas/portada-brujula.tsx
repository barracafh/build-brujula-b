import { cn } from "@/lib/utils";
import styles from "./portada-brujula.module.css";
import { Escritura } from "./escritura";
import { textosPara, type Textos } from "@/lib/idioma";

// Motivo decorativo de orientación: usa únicamente los tokens de Sol.
// La aguja se orienta una vez y respeta la preferencia de movimiento reducido.
export function RosaBrujula({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 128 128"
      fill="none"
      className={cn(styles.rosa, "size-20 shrink-0 sm:size-24", className)}
    >
      <circle cx="64" cy="64" r="43" className="stroke-border" />
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          d={i % 3 === 0 ? "M64 22v8" : "M64 22v4"}
          transform={`rotate(${i * 30} 64 64)`}
          className="stroke-border"
          strokeLinecap="round"
        />
      ))}
      <g className="fill-(--text-secondary) font-mono text-[9px]" textAnchor="middle">
        <text x="64" y="12">N</text>
        <text x="118" y="67">E</text>
        <text x="64" y="122">S</text>
        <text x="10" y="67">O</text>
      </g>
      <g className={styles.aguja}>
        <path d="m64 30 10 34H54Z" className="fill-brand" />
        <path d="m64 98 10-34H54Z" className="fill-foreground" />
        <circle cx="64" cy="64" r="4" className="fill-background stroke-border" />
      </g>
    </svg>
  );
}

export function PortadaBrujula({ textos = textosPara("es") }: { textos?: Textos }) {
  return (
    <div className={cn(styles.presentacion, "mb-8 text-center")}>
      <RosaBrujula className="mx-auto mb-6" />
      <h1 className="text-[clamp(30px,4vw,44px)] leading-[1.2] tracking-tight">
        <Escritura texto={textos.bienvenida} etiqueta={textos.escribiendo} />
      </h1>
    </div>
  );
}
