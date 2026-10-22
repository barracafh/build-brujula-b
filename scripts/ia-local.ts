// Suplente local del modelo para desarrollo. Habla la misma API que HelmCode
// (la de OpenAI), así que la app no cambia: basta con apuntar HELMCODE_BASE_URL
// a http://localhost:8787/v1 en .env.local.
//
//   bun scripts/ia-local.ts                 solo responde lo que está en las fixtures
//   IA_LOCAL_CLAUDE=1 bun scripts/ia-local.ts   lo que falte se pregunta a `claude -p` y se guarda
//
// Una frase sin fixture devuelve 500 a propósito: así nunca se confunde con
// «fuera de catálogo». La app entonces cae al buscador por palabras y el
// resultado sale con origen "respaldo", que scripts/probar.ts marca.
import { resolve } from "node:path";

const RUTA = resolve(import.meta.dir, "fixtures-clasificador.json");
const PUERTO = Number(process.env.IA_LOCAL_PUERTO ?? 8787);
const usarClaude = process.env.IA_LOCAL_CLAUDE === "1";

type Fixtures = Record<string, string[]>;
type Mensaje = {
  role: string;
  content: string | { type: string; text?: string }[];
};

const clave = (frase: string) => frase.trim().toLowerCase();
const leer = (): Promise<Fixtures> => Bun.file(RUTA).json();
const guardar = (f: Fixtures) =>
  Bun.write(RUTA, JSON.stringify(f, null, 2) + "\n");

const respuesta = (ids: string[]) =>
  Response.json({
    id: "ia-local",
    object: "chat.completion",
    model: "local",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: JSON.stringify({ ids }) },
        finish_reason: "stop",
      },
    ],
  });

const textoDe = (m?: Mensaje) =>
  typeof m?.content === "string"
    ? m.content
    : (m?.content?.find((p) => p.type === "text")?.text ?? "");

async function preguntarClaude(sistema: string, frase: string) {
  const proc = Bun.spawn(
    [
      "claude",
      "-p",
      "--output-format",
      "text",
      `${sistema}\n\nFrase del ciudadano:\n${frase}`,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const salida = await new Response(proc.stdout).text();
  await proc.exited;
  const json = salida.match(/\{[\s\S]*\}/);
  if (!json) throw new Error(`claude no devolvió JSON: ${salida.slice(0, 200)}`);
  const { ids } = JSON.parse(json[0]) as { ids?: unknown };
  return Array.isArray(ids) ? ids.filter((i) => typeof i === "string") : [];
}

Bun.serve({
  port: PUERTO,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    if (req.method !== "POST" || !pathname.endsWith("/chat/completions"))
      return new Response("ia-local: POST /v1/chat/completions", {
        status: 404,
      });

    const { messages = [] } = (await req.json()) as { messages?: Mensaje[] };
    const sistema = textoDe(messages.find((m) => m.role === "system"));
    const frase = textoDe([...messages].reverse().find((m) => m.role === "user"));
    const fixtures = await leer();
    const k = clave(frase);

    if (k in fixtures) {
      console.log(`fixture  ${JSON.stringify(frase)} → ${fixtures[k].join(", ") || "∅"}`);
      return respuesta(fixtures[k]);
    }
    if (!usarClaude) {
      console.log(`SIN FIXTURE ${JSON.stringify(frase)}`);
      return Response.json(
        {
          error: {
            message: `ia-local: sin fixture para ${JSON.stringify(frase)}. Añádela a scripts/fixtures-clasificador.json o arranca con IA_LOCAL_CLAUDE=1.`,
          },
        },
        { status: 500 },
      );
    }
    try {
      const ids = await preguntarClaude(sistema, frase);
      fixtures[k] = ids;
      await guardar(fixtures);
      console.log(`claude   ${JSON.stringify(frase)} → ${ids.join(", ") || "∅"}`);
      return respuesta(ids);
    } catch (e) {
      console.error(`ERROR    ${JSON.stringify(frase)}: ${(e as Error).message}`);
      return Response.json({ error: { message: String(e) } }, { status: 500 });
    }
  },
});

console.log(
  `ia-local en http://localhost:${PUERTO}/v1 (${usarClaude ? "fixtures + claude -p" : "solo fixtures"})`,
);
