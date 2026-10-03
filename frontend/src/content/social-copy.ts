import type { Suggestion } from "../types/social";
export const socialCopy = {
  eyebrow: "Conexiones de tu comunidad",
  suggestions: "Personas que podrías conocer",
  suggestionsIntro:
    "Descubre nuevas conexiones a través de las personas que sigues.",
  suggestionsEmpty:
    "No hay sugerencias por ahora. Busca amigos para ampliar tu red.",
  followed: "Ahora sigues a",
  reach: "Hasta dónde llega tu red",
  reachIntro:
    "Personas a las que llegas siguiendo conexiones, hasta tres pasos.",
  reachEmpty: "Tu red aún no tiene conexiones. Empieza siguiendo a un amigo.",
  mutuals: "Seguidos en común",
  mutualsEmpty: "Todavía no siguen a las mismas personas.",
  separation: "Grados de separación",
  separationIntro:
    "El camino más corto entre ustedes, considerando conexiones en ambos sentidos.",
  noPath: "No encontramos un camino entre ustedes dentro de seis pasos.",
  path: "Cadena de conexiones",
  distance: (count: number) => count + (count === 1 ? " paso" : " pasos"),
  followers: (count: number) =>
    count + (count === 1 ? " seguidor" : " seguidores"),
  suggestionReason: (user: Suggestion) => {
    if (!user.enComun) return socialCopy.followers(user.seguidores);
    const names = user.conexiones.slice(0, 2).map((name) => "@" + name);
    const remaining = Math.max(0, user.enComun - names.length);
    if (!names.length)
      return "Seguido por " + user.enComun + " personas que sigues";
    return (
      "Seguido por " +
      names.join(remaining ? ", " : " y ") +
      (remaining ? " y " + remaining + " más" : "")
    );
  },
} as const;
