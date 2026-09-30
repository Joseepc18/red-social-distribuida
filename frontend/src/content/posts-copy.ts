export const postsCopy = {
  intro: "Ideas, avances y preguntas de las personas que sigues.",
  compose: "Comparte con tu comunidad",
  text: "Texto de la publicación",
  placeholder:
    "Comparte una idea, un avance de proyecto o un recurso académico…",
  image: "Añadir imagen",
  imageHelp: "PNG, JPEG o GIF · Hasta 5 MiB y 20 megapíxeles.",
  preview: "Vista previa de la imagen adjunta",
  removeImage: "Quitar imagen",
  publish: "Publicar",
  publishing: "Publicando…",
  created: "Tu publicación está lista.",
  view: "Ver publicación",
  detail: "Publicación",
  discover: "Descubrir",
  discoverRefresh: "Actualizar",
  discoverIntro:
    "Publicaciones que llamaron la atención de las personas que sigues.",
  discoverEmpty: "Todavía no hay publicaciones para descubrir.",
  reactedByFollowing: (count: number) =>
    "Reaccionada por " +
    count +
    (count === 1 ? " persona que sigues" : " personas que sigues"),
  userPosts: "Publicaciones",
  more: "Cargar más publicaciones",
  emptyFeed: "Tu feed está por comenzar",
  emptyFeedBody: "Sigue a tus compañeros para ver aquí sus publicaciones.",
  emptyProfile: "Este perfil aún no tiene publicaciones.",
  end: "Has visto todas las publicaciones disponibles.",
  invalidText:
    "Escribe entre 1 y 5000 caracteres, sin contar los espacios de los extremos.",
  invalidImage: "Elige una imagen PNG, JPEG o GIF de hasta 5 MiB.",
  imageAlt: "Imagen de la publicación",
  imageError: "No pudimos cargar la imagen.",
  reactions: (count: number) =>
    count + (count === 1 ? " reacción" : " reacciones"),
  react: "Me gusta",
  unreact: "Quitar Me gusta",
  reactionLabel: (reacted: boolean, count: number) =>
    (reacted ? "Quitar Me gusta" : "Me gusta") +
    ", " +
    postsCopy.reactions(count),
  reactionError: "No pudimos actualizar tu reacción. Inténtalo de nuevo.",
} as const;
