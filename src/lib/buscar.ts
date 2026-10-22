import { entradas, type Entrada } from "./catalogo";
import sinonimos from "@/datos/sinonimos.json";

// Buscador por palabras sobre el catálogo. Hace dos cosas: resuelve al instante
// las frases que ya conocemos (y evita una llamada al modelo) y responde cuando
// el modelo no está disponible. No decide nada por su cuenta cuando duda: eso
// se deja al clasificador.
export type Coincidencia = {
  entrada: Entrada;
  puntuacion: number;
  // Una frase conocida, o dos palabras distintivas: suficiente para no preguntar al modelo.
  fuerte: boolean;
};

// Palabras que no distinguen un trámite de otro, en castellano y valenciano.
const VACIAS = new Set(
  `a al algo ante como con cuando de del desde donde el ella ellos en entre es
   eso esta este esto estoy ha hay he la las le les lo los me mi mis muy ni no
   nos o para pero por que quiero se si sin sobre soy su sus te tengo tiene tu
   tus un una unas unos y ya necesito puedo hacer voy va dia dias
   els una un em et vull puc tinc hi per amb que com on soc estic`
    .split(/\s+/)
    .filter(Boolean),
);

export const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .replace(/@/g, "a")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Plural simple: «hijos» y «hijo» cuentan como lo mismo.
const raiz = (t: string) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t);

export const terminos = (texto: string) =>
  normalizar(texto)
    .split(" ")
    .filter((t) => t.length >= 3 && !VACIAS.has(t))
    .map(raiz);

const indice = entradas.map((entrada) => {
  const extra = (sinonimos as Record<string, string[]>)[entrada.id] ?? [];
  const frases = [entrada.titulo, ...entrada.frases_usuario, ...extra].map(normalizar);
  return { entrada, frases, terminos: new Set(frases.flatMap(terminos)) };
});

// Una palabra vale más cuanto en menos entradas aparece.
const frecuencia = new Map<string, number>();
for (const { terminos: ts } of indice)
  for (const t of ts) frecuencia.set(t, (frecuencia.get(t) ?? 0) + 1);
const peso = (t: string) => 1 / (frecuencia.get(t) ?? entradas.length);

export function buscar(texto: string, max = 3): Coincidencia[] {
  const consulta = normalizar(texto);
  const palabras = terminos(consulta);
  if (!palabras.length) return [];

  const candidatas = indice
    .map(({ entrada, frases, terminos: ts }) => {
      // Si varias entradas reconocen la frase, gana la que reconoce el trozo
      // más largo: «hijos y no llego a fin de mes» es más concreto que «no
      // llego a fin de mes».
      const reconocida = frases
        .filter(
          (f) =>
            (f.length >= 8 && consulta.includes(f)) ||
            (consulta.length >= 12 && f.includes(consulta)),
        )
        .reduce((mayor, f) => Math.max(mayor, f.length), 0);
      const conocida = reconocida > 0;
      const comunes = palabras.filter((p) => ts.has(p));
      const puntuacion =
        comunes.reduce((s, p) => s + peso(p), 0) +
        (conocida ? 5 + reconocida / 20 : 0);
      return {
        entrada,
        puntuacion,
        fuerte: conocida || (comunes.length >= 2 && puntuacion >= 1.2),
      };
    })
    .filter((c) => c.puntuacion >= 0.5)
    .sort((a, b) => b.puntuacion - a.puntuacion);

  // Las alternativas tienen que acercarse a la primera; lo demás es ruido.
  const mejor = candidatas[0]?.puntuacion ?? 0;
  return candidatas
    .filter((c) => c.fuerte || c.puntuacion >= mejor / 2)
    .slice(0, max);
}
