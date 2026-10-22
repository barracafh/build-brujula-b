"use client";

import { useEffect, useState, type ReactNode } from "react";

// Estado de espera de un turno. El modelo del evento tarda a veces 10–20 s:
// pasados unos segundos avisamos de que va lento, y más tarde de que seguimos
// en ello, para que no parezca que se ha colgado.
const TEXTOS = {
  es: { lento: "Está tardando más de lo normal: hay mucha gente consultando.", muyLento: "Seguimos intentándolo. Si no responde, lo intentaremos con nuestro propio catálogo." },
  ca: { lento: "Està tardant més del normal: hi ha molta gent consultant.", muyLento: "Continuem intentant-ho. Si no respon, ho intentarem amb el nostre propi catàleg." },
  en: { lento: "This is taking longer than usual: many people are asking right now.", muyLento: "Still trying. If it does not answer, we will fall back to our own catalogue." },
};
const LENTO_MS = 6_000;
const MUY_LENTO_MS = 15_000;

export function EsperaChat({ idioma = "es", icono, texto }: { idioma?: string; icono: ReactNode; texto: string }) {
  const t = TEXTOS[idioma as keyof typeof TEXTOS] ?? TEXTOS.es;
  const [fase, setFase] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    const a = setTimeout(() => setFase(1), LENTO_MS);
    const b = setTimeout(() => setFase(2), MUY_LENTO_MS);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  return (
    <div role="status" aria-live="polite" className="space-y-3 text-base text-(--text-secondary)">
      <p className="flex items-center gap-3">{icono}{texto}</p>
      {fase >= 1 && <p>{t.lento}</p>}
      {fase >= 2 && <p>{t.muyLento}</p>}
    </div>
  );
}
