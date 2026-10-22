// La voz ahora es de ElevenLabs con su SDK oficial: Scribe v2 escucha y Flash
// v2.5 habla (el modelo de menor latencia por HTTP, según su guía). Si no hay
// clave o ElevenLabs falla, se vuelve a HelmCode (`whisper` y `kokoro`) para que
// la demo no se caiga. Como `ia.ts`, esto se llama solo desde el servidor: las
// claves no existen en el navegador. Ni el audio ni la transcripción se guardan.
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const BASE_HELM = process.env.HELMCODE_BASE_URL ?? "https://api.helmcode.com/v1";

// Voz de ElevenLabs: Maria, andaluza, cálida y clara (añadida desde la
// biblioteca de voces). Se puede cambiar con ELEVENLABS_VOICE_ID en .env.local.
export const VOZ_POR_DEFECTO = "ef_dora";
const VOZ_ELEVEN = process.env.ELEVENLABS_VOICE_ID ?? "GszuzIPs4fVZTjP0EXrv";
const MODELO_STT = process.env.ELEVENLABS_STT_MODEL ?? "scribe_v2";
const MODELO_TTS = process.env.ELEVENLABS_TTS_MODEL ?? "eleven_flash_v2_5";

let cliente: ElevenLabsClient | null = null;

function clienteEleven(): ElevenLabsClient | null {
  const clave = process.env.ELEVENLABS_API_KEY;
  if (!clave?.trim()) return null;
  cliente ??= new ElevenLabsClient({ apiKey: clave.trim() });
  return cliente;
}

function claveHelm() {
  const k = process.env.HELMCODE_API_KEY;
  if (!k) throw new Error("Falta ELEVENLABS_API_KEY o HELMCODE_API_KEY en .env.local");
  return k;
}

// Todos los límites son compartidos: ante un 429, espera lo que diga el error
// y reintenta una vez, como en ia.ts. Nada de llamadas en bucle.
async function conReintento<T>(accion: () => Promise<T>): Promise<T> {
  try {
    return await accion();
  } catch (e) {
    const estado = (e as { status?: number }).status;
    if (estado !== 429) throw e;
    await new Promise((r) => setTimeout(r, 2000));
    return await accion();
  }
}

export type Audio = { datos: ArrayBuffer; tipo: string };

// Escucha: audio grabado en el navegador → texto. Scribe v2 entiende castellano
// y valenciano; el navegador manda la extensión correcta (Safari graba mp4,
// Chrome webm) porque el formato se deduce del nombre del fichero.
export async function transcribir(audio: File): Promise<string> {
  const c = clienteEleven();
  if (c) {
    try {
      const r = await conReintento(() =>
        c.speechToText.convert({ file: audio, modelId: MODELO_STT }),
      );
      // Texto vacío = silencio real, se devuelve tal cual; sin campo `text`,
      // respuesta inservible y probamos con el respaldo.
      if (r.text !== undefined) return r.text.trim();
      throw new Error("Scribe no devolvió texto");
    } catch (e) {
      // Solo el motivo del fallo, nunca el contenido del audio.
      console.warn(`voz: Scribe no disponible, pruebo con HelmCode (${(e as Error).message})`);
    }
  }
  return transcribirHelm(audio);
}

async function transcribirHelm(audio: File): Promise<string> {
  const cuerpo = new FormData();
  cuerpo.append("model", process.env.HELMCODE_STT_MODEL ?? "whisper");
  cuerpo.append("file", audio, audio.name || "audio.webm");
  const res = await conReintento(() =>
    fetch(`${BASE_HELM}/audio/transcriptions`, {
      method: "POST",
      body: cuerpo,
      headers: { authorization: `Bearer ${claveHelm()}` },
      signal: AbortSignal.timeout(20_000),
    }),
  );
  if (!res.ok) throw new Error(`HelmCode respondió ${res.status}`);
  const datos = (await res.json()) as { text?: string };
  return (datos.text ?? "").trim();
}

// Habla: texto → audio para el navegador. Flash v2.5 es el modelo recomendado
// para voz conversacional en tiempo real (~75 ms por tramo).
export async function hablar(texto: string): Promise<Audio> {
  const c = clienteEleven();
  if (c) {
    try {
      const stream = await conReintento(() =>
        c.textToSpeech.convert(VOZ_ELEVEN, {
          text: texto,
          modelId: MODELO_TTS,
          outputFormat: "mp3_44100_128",
        }),
      );
      return { datos: await new Response(stream).arrayBuffer(), tipo: "audio/mpeg" };
    } catch (e) {
      console.warn(`voz: Flash no disponible, pruebo con HelmCode (${(e as Error).message})`);
    }
  }
  return hablarHelm(texto);
}

async function hablarHelm(texto: string): Promise<Audio> {
  const res = await conReintento(() =>
    fetch(`${BASE_HELM}/audio/speech`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${claveHelm()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.HELMCODE_TTS_MODEL ?? "kokoro",
        voice: process.env.HELMCODE_TTS_VOICE ?? VOZ_POR_DEFECTO,
        input: texto,
      }),
      signal: AbortSignal.timeout(20_000),
    }),
  );
  if (!res.ok) throw new Error(`HelmCode respondió ${res.status}`);
  return { datos: await res.arrayBuffer(), tipo: "audio/mpeg" };
}
