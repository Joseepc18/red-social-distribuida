import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthPage } from "./pages/AuthPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PeoplePage } from "./pages/PeoplePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { FeedPage } from "./pages/FeedPage";
import { PostPage } from "./pages/PostPage";
import { ChatPage } from "./pages/ChatPage";
import { DiscoverPage } from "./pages/DiscoverPage";
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
          <Route path="feed" element={<FeedPage />} />
          <Route path="descubrir" element={<DiscoverPage />} />
          <Route path="explorar" element={<PeoplePage />} />
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
