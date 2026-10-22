"use client";

import { useEffect, useState, type ReactNode } from "react";
import { textosPara, type Textos } from "@/lib/idioma";

// Estado de espera de un turno. El modelo del evento tarda a veces 10–20 s:
// pasados unos segundos avisamos de que va lento, y más tarde de que seguimos
// en ello, para que no parezca que se ha colgado.
const LENTO_MS = 6_000;
const MUY_LENTO_MS = 15_000;

export function EsperaChat({ idioma = "es", icono, texto, textos }: { idioma?: string; icono: ReactNode; texto: string; textos?: Textos }) {
  const t = textosPara(idioma, textos);
  const [fase, setFase] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    const a = setTimeout(() => setFase(1), LENTO_MS);
    const b = setTimeout(() => setFase(2), MUY_LENTO_MS);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  return (
    <div role="status" aria-live="polite" className="space-y-3 text-base text-(--text-secondary)">
      <p className="flex items-center gap-3">{icono}{texto}</p>
      {fase >= 1 && <p>{t.esperaLenta}</p>}
      {fase >= 2 && <p>{t.esperaMuyLenta}</p>}
    </div>
  );
}
