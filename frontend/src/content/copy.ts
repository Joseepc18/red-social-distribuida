// Shared interface copy. User records are always loaded from the API.
export const copy = {
  brand: "ZENIT",
  tagline: "Conecta. Comparte. Aprende.",
  community: "Tu comunidad, más cerca.",
  intro:
    "Un espacio para conectar con tus compañeros y compartir lo que estás construyendo.",
  navigation: "Navegación principal",
  skip: "Ir al contenido",
  logout: "Cerrar sesión",
  login: "Iniciar sesión",
  register: "Crear una cuenta",
  explore: "Amigos",
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
  newPost: "Nueva publicación",
  search: "Buscar personas",
  feed: "Inicio",
  chat: "Mensajes",
  member: "Comunidad universitaria",
} as const;
export const navigation = [
  { to: "/feed", label: copy.feed, icon: "feed" },
  { to: "/explorar", label: copy.explore, icon: "people" },
  { to: "/chat", label: copy.chat, icon: "chat" },
] as const;
export const homeCopy = {
  sidebarTagline: "Un espacio para compartir lo que nos conecta.",
  communityLabel: "ZENIT · Comunidad universitaria",
  feedTabsLabel: "Tipo de publicaciones",
  forYou: "Para ti",
  following: "Siguiendo",
  suggestedPosts: "Publicaciones para ti",
  followEyebrow: "Tu red",
  followTitle: "A quién seguir",
  follow: "Seguir",
  viewProfile: (name: string) => "Ver perfil de " + name,
  followPerson: (name: string) => "Seguir a " + name,
  followPending: "…",
  showSuggestions: "Ver todas las sugerencias",
  globalSearchPlaceholder: "Buscar personas en ZENIT…",
  globalSearchResults: "Resultados de personas",
  searchEmpty: "No encontramos personas con ese nombre o usuario.",
  communityEyebrow: "Comunidad universitaria",
  communityTitle: "Amplía tu red",
  communityDescription: "Busca compañeros y conexiones mutuas.",
  findPeople: "Buscar personas",
  motto: "ZENIT · Conecta. Comparte. Aprende.",
} as const;
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
  eyebrow: "Acceso a ZENIT",
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
  noAccount: "¿Primera vez en ZENIT?",
  registered:
    "Tu cuenta está lista. Inicia sesión con el usuario y la contraseña que elegiste.",
  required: "Completa los campos obligatorios sin dejarlos en blanco.",
  footer: "ZENIT · Red social universitaria",
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
  title: "Amigos",
  tabsLabel: "Listas de personas",
  suggestionsShortcut: "Sugerencias",
  friendsEmpty:
    "Aquí aparecerán las personas con las que se siguen mutuamente.",
  followersEmpty: "Todavía no tienes seguidores.",
  followingEmpty: "Todavía no sigues a nadie.",
  filterLabel: "Filtrar esta lista",
  filterPlaceholder: "Nombre o usuario…",
  filterEmpty: "No hay coincidencias en esta lista.",
} as const;
