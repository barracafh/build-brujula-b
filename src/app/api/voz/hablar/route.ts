import { hablar } from "@/lib/voz";

// POST {"texto": "…"} → audio (audio/mpeg). La voz lee lo que devuelve
// /api/tramite; aquí solo se convierte en voz. Nada se guarda.
const MAXIMO = 1500;

export async function POST(req: Request) {
  const { texto } = (await req.json().catch(() => ({}))) as { texto?: unknown };
  if (typeof texto !== "string" || !texto.trim())
    return error("No hay nada que leer.");
  if (texto.length > MAXIMO) return error("El texto es demasiado largo.");

  try {
    const audio = await hablar(texto.trim());
    return new Response(audio.datos, {
      headers: {
        "content-type": audio.tipo,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    console.warn(`voz/hablar: ${(e as Error).message}`);
    return error("No hemos podido generar la voz. Inténtalo de nuevo.");
  }
}

const error = (mensaje: string) =>
  Response.json({ error: mensaje }, { status: 503 });
