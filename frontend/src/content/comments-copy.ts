export const commentsCopy = {
  title: "Comentarios",
  text: "Texto del comentario",
  replyText: (name: string) => "Respuesta a " + name,
  placeholder: "Escribe un comentario…",
  replyPlaceholder: (name: string) => "Responde a " + name + "…",
  submit: "Comentar",
  reply: "Responder",
  sending: "Enviando…",
  cancel: "Cancelar",
  empty: "Todavía no hay comentarios. Sé la primera persona en comentar.",
  invalid:
    "Escribe entre 1 y 280 caracteres, sin contar los espacios de los extremos.",
  showReplies: (count: number) =>
    "Ver " + count + (count === 1 ? " respuesta" : " respuestas"),
  hideReplies: "Ocultar respuestas",
  count: (count: number) =>
    count + (count === 1 ? " comentario" : " comentarios"),
} as const;
