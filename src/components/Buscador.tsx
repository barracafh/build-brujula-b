"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ruta } from "@/config/sitio";
import { PAG, porId, type Resultado } from "@/lib/catalogo";
import { Conversacion } from "./Conversacion";
import { FueraCatalogo } from "./FueraCatalogo";
import { Respuesta } from "./Respuesta";
import { RespuestaPAG } from "./RespuestaPAG";

const MAXIMO = 2000;

// El formulario y el área de respuesta. Lo que se escribe viaja una sola vez al
// servidor (POST) y no se guarda en ningún sitio; el resto de la navegación
// («Y después», otros resultados) se resuelve con el catálogo en el navegador.
export function Buscador({ ejemplos }: { ejemplos: string[] }) {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<
    "inicio" | "cargando" | "listo" | "error"
  >("inicio");
  const [aviso, setAviso] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [actual, setActual] = useState<string | null>(null);
  // Fuera de catálogo: qué ficha del PAG se está viendo.
  const [actualPag, setActualPag] = useState<string | null>(null);
  // La consulta al modelo puede tardar varios segundos cuando hay mucha gente:
  // pasado 1,5 s enseñamos una barra para que no parezca que se ha colgado.
  const [lento, setLento] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const pendiente = useRef<AbortController | null>(null);
  const avisoLento = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Al llegar una respuesta, o al cambiar de entrada, el foco va al titular:
  // así quien navega con teclado o lector de pantalla no se pierde.
  useEffect(() => {
    if (estado === "listo") titulo.current?.focus();
  }, [estado, actual, actualPag]);

  // La consulta al servidor, compartida por el buscador escrito y la voz. Lo
  // que se escribe o habla viaja una sola vez (POST) y no se guarda en ningún
  // sitio; el resto de la navegación se resuelve con el catálogo en el navegador.
  async function consultar(
    frase: string,
    historial: string[] = [],
  ): Promise<Resultado> {
    const limpia = frase.trim();
    if (!limpia) throw new Error("Cuéntanos qué te pasa en una frase.");
    if (limpia.length > MAXIMO)
      throw new Error(`Escribe como máximo ${MAXIMO} caracteres.`);
    pendiente.current?.abort();
    const control = new AbortController();
    pendiente.current = control;
    try {
      const res = await fetch(ruta("/api/tramite"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texto: limpia, historial: historial.slice(-4) }),
        signal: control.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as Resultado;
    } finally {
      // Solo la petición vigente apaga la barra; una abortada ya no manda.
      if (pendiente.current === control) {
        if (avisoLento.current) clearTimeout(avisoLento.current);
        setLento(false);
      }
    }
  }

  async function enviar(frase: string) {
    const limpia = frase.trim();
    if (!limpia) return setAviso("Cuéntanos qué te pasa en una frase.");
    if (limpia.length > MAXIMO)
      return setAviso(`Escribe como máximo ${MAXIMO} caracteres.`);
    setAviso(null);
    setEstado("cargando");
    setLento(false);
    if (avisoLento.current) clearTimeout(avisoLento.current);
    avisoLento.current = setTimeout(() => setLento(true), 1500);
    try {
      const datos = await consultar(frase);
      setResultado(datos);
      setActual(datos.entradas[0]?.id ?? null);
      setActualPag(datos.pag?.resultados[0]?.codigoSia ?? null);
      setEstado("listo");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setEstado("error");
    }
  }

  const alEnviar = (e: FormEvent) => {
    e.preventDefault();
    void enviar(texto);
  };
  // Intro envía; Mayús+Intro hace salto de línea, como en cualquier chat.
  const alTeclear = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void enviar(texto);
    }
  };
  const elegir = (id: string) => setActual(id);

  const entrada = actual ? porId(actual) : undefined;
  const alternativas =
    resultado?.entradas.filter((e) => e.id !== entrada?.id) ?? [];

  return (
    <>
      <form onSubmit={alEnviar} className="mt-10" noValidate>
        <label htmlFor="situacion" className="block text-sm font-medium">
          ¿Qué te pasa?
        </label>
        <Textarea
          id="situacion"
          name="situacion"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={alTeclear}
          rows={3}
          maxLength={MAXIMO + 1}
          placeholder="Por ejemplo: me han echado del trabajo"
          aria-describedby="ayuda-texto estado-busqueda"
          aria-invalid={aviso ? true : undefined}
          className="mt-2 text-lg md:text-lg"
        />
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Button
            type="submit"
            variant="sunset"
            size="lg"
            disabled={estado === "cargando"}
          >
            {estado === "cargando" ? "Buscando…" : "Buscar el trámite"}
          </Button>
          <p id="ayuda-texto" className="text-sm text-(--text-secondary)">
            Con tus palabras, en castellano o en valenciano. No guardamos lo que
            escribes.
          </p>
        </div>
        <p
          id="estado-busqueda"
          role="status"
          aria-live="polite"
          className="mt-2 min-h-5 text-sm text-destructive"
        >
          {aviso}
        </p>
      </form>

      <Conversacion consultar={consultar} />

      {estado === "inicio" && ejemplos.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-(--text-secondary)">Prueba con un ejemplo</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {ejemplos.map((ejemplo) => (
              <li key={ejemplo}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTexto(ejemplo);
                    void enviar(ejemplo);
                  }}
                >
                  {ejemplo}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section aria-label="Respuesta" className="mt-16">
        {estado === "cargando" && lento && (
          <div role="status" aria-live="polite" className="text-base">
            <div
              role="progressbar"
              aria-label="Consultando el catálogo"
              className="h-1 w-full overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full w-1/3 rounded-full bg-brand [animation:deslizar_1.4s_ease-in-out_infinite] motion-reduce:w-full motion-reduce:animate-none" />
            </div>
            <p className="mt-3 text-(--text-secondary)">
              Consultando el catálogo… Con mucha gente conectada puede tardar
              unos segundos.
            </p>
          </div>
        )}
        {estado === "error" && (
          <p role="alert" className="text-lg">
            No hemos podido consultar el catálogo. Inténtalo de nuevo en un
            momento o busca directamente en el{" "}
            <a href={PAG.url} className="underline underline-offset-4">
              buscador oficial de trámites
            </a>
            .
          </p>
        )}
        {estado === "listo" &&
          resultado?.fueraCatalogo &&
          (resultado.pag && resultado.pag.resultados.length > 0 ? (
            <RespuestaPAG
              key={actualPag ?? "pag"}
              pag={resultado.pag}
              actual={
                resultado.pag.resultados.find((r) => r.codigoSia === actualPag) ??
                resultado.pag.resultados[0]
              }
              onElegir={setActualPag}
              tituloRef={titulo}
            />
          ) : (
            <FueraCatalogo urlBusqueda={resultado.pag?.url} tituloRef={titulo} />
          ))}
        {estado === "listo" && entrada && (
          <Respuesta
            key={entrada.id}
            entrada={entrada}
            alternativas={alternativas}
            confianza={resultado?.confianza ?? "alta"}
            onElegir={elegir}
            tituloRef={titulo}
          />
        )}
      </section>
    </>
  );
}
