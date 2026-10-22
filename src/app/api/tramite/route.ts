import { buscar } from "@/lib/buscar";
import { clasificar } from "@/lib/clasificar";
import { porId, type Entrada, type Resultado } from "@/lib/catalogo";

// POST {"texto": "me han echado del trabajo"} → Resultado.
// Lo que escribe el ciudadano no se guarda ni se registra en ningún sitio; por
// eso es un POST y no una URL con la frase, que acabaría en los logs del servidor.
export async function POST(req: Request) {
  const { texto } = (await req.json().catch(() => ({}))) as { texto?: unknown };
  if (typeof texto !== "string" || !texto.trim())
    return error("Cuéntanos qué te pasa en una frase.");
  if (texto.length > 2000)
    return error("Escribe como máximo 2.000 caracteres.");

  // El modelo decide en cada petición; el buscador por palabras solo responde
  // si el modelo no contesta (sin clave, error, tiempo agotado o JSON roto).
  let ids: string[];
  let origen: Resultado["origen"];
  let confianza: Resultado["confianza"] = "alta";

  const ia = await clasificar(texto);
  if (ia) {
    ids = ia;
    origen = "ia";
  } else {
    const frases = buscar(texto);
    ids = frases.map((c) => c.entrada.id);
    origen = frases[0]?.fuerte ? "frases" : "respaldo";
    if (origen === "respaldo" && ids.length) confianza = "baja";
  }

  const entradas = ids
    .map(porId)
    .filter((e): e is Entrada => Boolean(e));
  const resultado: Resultado = {
    entradas,
    fueraCatalogo: entradas.length === 0,
    confianza,
    origen,
  };
  return Response.json(resultado, {
    headers: { "cache-control": "no-store" },
  });
}

const error = (mensaje: string) =>
  Response.json({ error: mensaje }, { status: 400 });
