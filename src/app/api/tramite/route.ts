import { resolverConsulta } from "@/lib/consulta";
import { detectarIdioma, normalizarIdioma, textosPara } from "@/lib/idioma";
import { porId } from "@/lib/catalogo";

// Las consultas viajan por POST y no se guardan ni se registran.
export async function POST(req: Request) {
  const datos = await req.json().catch(() => null) as Record<string, unknown> | null;
  const texto = datos?.texto;
  const idioma = normalizarIdioma(datos?.idioma) ?? "es";
  const t = textosPara(typeof texto === "string" ? detectarIdioma(texto, idioma) : idioma);
  if (typeof texto !== "string" || !texto.trim()) return error(t.vacio);
  if (texto.length > 2000) return error(t.largo);
  if (datos?.entradaId !== undefined && (typeof datos.entradaId !== "string" || !porId(datos.entradaId))) return error(t.entradaInvalida);
  const resultado = await resolverConsulta({ texto: texto.trim(), idioma, entradaId: typeof datos?.entradaId === "string" ? datos.entradaId : undefined });
  return Response.json(resultado, { headers: { "cache-control": "no-store" } });
}

const error = (mensaje: string) => Response.json({ error: mensaje }, { status: 400, headers: { "cache-control": "no-store" } });
