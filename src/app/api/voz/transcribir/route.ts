import { transcribir } from "@/lib/voz";

// POST multipart con el audio grabado → {"texto": "…"}. El audio viaja una vez
// al servidor y no se guarda ni se registra: como en /api/tramite, es un POST
// para que la frase no acabe en los logs.
export async function POST(req: Request) {
  const cuerpo = await req.formData().catch(() => null);
  const audio = cuerpo?.get("audio");
  if (!(audio instanceof File) || audio.size === 0)
    return error("No ha llegado audio. Pulsa el micrófono y habla de nuevo.");
  // Un minuto de voz son menos de 5 MB en cualquier formato de navegador.
  if (audio.size > 8_000_000) return error("El audio es demasiado largo.");

  try {
    const texto = await transcribir(audio);
    return Response.json({ texto }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.warn(`voz/transcribir: ${(e as Error).message}`);
    return error("No hemos podido escucharte. Inténtalo de nuevo en un momento.");
  }
}

const error = (mensaje: string) =>
  Response.json({ error: mensaje }, { status: 400 });
