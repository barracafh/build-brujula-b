import { resolverConsulta } from "@/lib/consulta";
import { detectarIdioma, normalizarIdioma, textosPara } from "@/lib/idioma";
import { porId } from "@/lib/catalogo";

// Las consultas viajan por POST y no se guardan ni se registran. "historial"
// son las frases anteriores de la conversación por voz: solo contexto del
// turno, para que el modelo entienda seguimientos, nunca se guarda.
export async function POST(req: Request) {
  const datos = await req.json().catch(() => null) as Record<string, unknown> | null;
  const texto = datos?.texto;
  const idioma = normalizarIdioma(datos?.idioma) ?? "es";
  const t = textosPara(typeof texto === "string" ? detectarIdioma(texto, idioma) : idioma);
  if (typeof texto !== "string" || !texto.trim()) return error(t.vacio);
  if (texto.length > 2000) return error(t.largo);
  if (datos?.entradaId !== undefined && (typeof datos.entradaId !== "string" || !porId(datos.entradaId))) return error(t.entradaInvalida);
  const previas = Array.isArray(datos?.historial)
    ? datos.historial
        .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
        .slice(-4)
        .map((f) => f.trim().slice(0, 500))
    : [];
  const resultado = await resolverConsulta({ texto: texto.trim(), idioma, entradaId: typeof datos?.entradaId === "string" ? datos.entradaId : undefined, historial: previas });
  return Response.json(resultado, { headers: { "cache-control": "no-store" } });
}

const error = (mensaje: string) => Response.json({ error: mensaje }, { status: 400, headers: { "cache-control": "no-store" } });
