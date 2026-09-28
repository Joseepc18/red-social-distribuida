// Shared interface copy. User records are always loaded from the API.
export const copy = {
  brand: "NodoUni",
  tagline: "Red Social Universitaria",
  community: "Tu comunidad, más cerca.",
  intro:
    "Un espacio para conectar con tus compañeros y compartir lo que estás construyendo.",
  navigation: "Navegación principal",
  skip: "Ir al contenido",
  logout: "Cerrar sesión",
  login: "Iniciar sesión",
  register: "Crear una cuenta",
  explore: "Explorar personas",
  discover: "Descubrir",
  profile: "Mi perfil",
  back: "Volver al inicio",
  loading: "Cargando…",
  retry: "Volver a intentar",
  empty: "Todavía no hay resultados.",
  guest: "Bienvenido a tu comunidad",
  sessionExpired: "Tu sesión terminó. Inicia sesión para continuar.",
  connectionError:
    "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  serverError: "No pudimos completar la solicitud. Inténtalo de nuevo.",
  invalidResponse: "El servidor devolvió una respuesta inesperada.",
  notFound: "No encontramos esta página",
  notFoundBody: "Comprueba la dirección o vuelve al inicio.",
  soon: "Próximamente",
  waiting:
    "Estamos preparando este espacio. Mientras tanto, puedes explorar tu comunidad.",
  newPost: "Nueva publicación",
  search: "Buscar personas",
  feed: "Feed principal",
  chat: "Mensajes privados",
  member: "Comunidad universitaria",
} as const;
export const navigation = [
  { to: "/feed", label: copy.feed, icon: "feed" },
  { to: "/explorar", label: copy.explore, icon: "people" },
  { to: "/descubrir", label: copy.discover, icon: "compass" },
  { to: "/chat", label: copy.chat, icon: "chat" },
  { to: "/perfil", label: copy.profile, icon: "profile" },
] as const;
export const pages = {
  feed: {
    title: copy.feed,
    description:
      "Aquí encontrarás las publicaciones de las personas que sigues.",
  },
  explore: {
    title: copy.explore,
    description: "Encuentra compañeros y amplía tu red universitaria.",
  },
  profile: {
    title: copy.profile,
    description: "Tu lugar en la comunidad universitaria.",
  },
  post: {
    title: "Publicación",
    description: "Las publicaciones de tu comunidad estarán disponibles aquí.",
  },
  chat: {
    title: copy.chat,
    description: "Un espacio para conversar con tus compañeros.",
  },
  login: {
    title: copy.login,
    description: "Pronto podrás acceder a tu comunidad universitaria.",
  },
  register: {
    title: copy.register,
    description: "Pronto podrás formar parte de la comunidad.",
  },
} as const;
export const authCopy = {
  eyebrow: "Conecta · Comparte · Aprende",
  loginTitle: "Qué bueno verte de nuevo",
  loginIntro:
    "Inicia sesión para encontrar a tus compañeros y formar parte de la conversación.",
  registerTitle: "Tu próxima conexión empieza aquí",
  registerIntro: "Crea tu perfil y encuentra tu lugar en la comunidad.",
  name: "Nombre completo",
  username: "Nombre de usuario",
  email: "Correo electrónico",
  password: "Contraseña",
  hasAccount: "¿Ya tienes una cuenta?",
  noAccount: "¿Primera vez en NodoUni?",
  registered:
    "Tu cuenta está lista. Inicia sesión con el usuario y la contraseña que elegiste.",
  required: "Completa los campos obligatorios sin dejarlos en blanco.",
  image: "/images/community.png",
  imageAlt: "Estudiante leyendo en una biblioteca universitaria",
  photoCaption: "Las buenas ideas crecen en comunidad.",
  photoDetail: "Un lugar para aprender juntos.",
  footer: "NodoUni · Red social universitaria",
} as const;
export const profileCopy = {
  title: "Perfil de la comunidad",
  edit: "Editar perfil",
  name: "Nombre completo",
  bio: "Biografía",
  save: "Guardar cambios",
  cancel: "Cancelar",
  saved: "Tu perfil se actualizó.",
  required: "Escribe tu nombre antes de guardar.",
  noBio: "Aún no hay una biografía.",
  followers: "Seguidores",
  following: "Seguidos",
  connections: "Conexiones del perfil",
  follow: "Seguir",
  unfollow: "Dejar de seguir",
  view: "Ver perfil",
  empty: "Esta lista todavía está vacía.",
} as const;
export const peopleCopy = {
  eyebrow: "Tu red universitaria",
  title: "Encuentra a tu comunidad",
  intro:
    "Conecta con tus compañeros. Busca por nombre o usuario y visita sus perfiles para conocerlos mejor.",
  placeholder: "Nombre o usuario…",
  search: "Buscar",
  results: "Resultados de búsqueda",
  people: "personas",
  person: "persona",
  emptyTitle: "No encontramos coincidencias",
  emptyBody: "Prueba con otro nombre o usuario.",
} as const;
