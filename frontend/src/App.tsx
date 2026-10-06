import { Navigate, Route, Routes } from "react-router";
import { SettingsPage } from "./pages/SettingsPage";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthPage } from "./pages/AuthPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PeoplePage } from "./pages/PeoplePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { FeedPage } from "./pages/FeedPage";
import { PostPage } from "./pages/PostPage";
import { ChatPage } from "./pages/ChatPage";
import { SuggestionsPage } from "./pages/SuggestionsPage";
interface AppProps {
  readonly children?: never;
}
export function App(_props: AppProps) {
  return (
    <Routes>
      <Route path="login" element={<AuthPage key="login" mode="login" />} />
      <Route
        path="registro"
        element={<AuthPage key="register" mode="register" />}
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/feed" replace />} />
          <Route path="configuracion" element={<SettingsPage />} />
          <Route path="feed" element={<FeedPage />} />
          <Route
            path="descubrir"
            element={<Navigate to="/feed?vista=para-ti" replace />}
          />
          <Route path="explorar" element={<PeoplePage />} />
          <Route path="sugerencias" element={<SuggestionsPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="usuarios/:id" element={<ProfilePage />} />
          <Route path="posts/:id" element={<PostPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
