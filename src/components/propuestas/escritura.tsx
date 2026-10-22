"use client";

import { useEffect, useState } from "react";

// La bienvenida es texto de interfaz: no consume una llamada al modelo.
// Se reserva su altura completa para que la escritura no mueva el formulario.
export function Escritura({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [letras, setLetras] = useState(0);
  const [esperando, setEsperando] = useState(true);
  const caracteres = Array.from(texto);

  useEffect(() => {
    const preferencia = window.matchMedia("(prefers-reduced-motion: reduce)");
    let intervalo: ReturnType<typeof setInterval> | undefined;
    let inicio: ReturnType<typeof setTimeout> | undefined;
    const completar = () => {
      if (inicio) clearTimeout(inicio);
      if (intervalo) clearInterval(intervalo);
      setLetras(Array.from(texto).length); setEsperando(false);
    };
    if (preferencia.matches) completar();
    else {
      setLetras(0); setEsperando(true);
      inicio = setTimeout(() => {
        setEsperando(false);
        let i = 0;
        intervalo = setInterval(() => {
          setLetras(++i);
          if (i >= Array.from(texto).length && intervalo) clearInterval(intervalo);
        }, 32);
      }, 420);
    }
    const cambiar = () => { if (preferencia.matches) completar(); };
    preferencia.addEventListener("change", cambiar);
    return () => { if (inicio) clearTimeout(inicio); if (intervalo) clearInterval(intervalo); preferencia.removeEventListener("change", cambiar); };
  }, [texto]);

  return (
    <>
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true" className="grid [&>span]:[grid-area:1/1]">
        <span className="invisible">{texto}</span>
        <span>
          {esperando ? <span aria-label={etiqueta} className="inline-flex items-center gap-2 py-3">{[0, 1, 2].map((i) => <span key={i} className="size-2 rounded-full bg-foreground motion-safe:animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />)}</span> : <>{caracteres.slice(0, letras).join("")}{letras < caracteres.length && <span className="ml-1 inline-block h-[0.8em] w-px bg-foreground align-baseline" />}</>}
        </span>
      </span>
    </>
  );
}
