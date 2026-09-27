import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { pages } from './data/mockData'
interface AppProps { readonly children?: never }
export function App(_props: AppProps) {
  return <Routes><Route element={<AppLayout />}>
    <Route index element={<Navigate to="/feed" replace />} />
    <Route path="login" element={<PlaceholderPage {...pages.login} />} />
    <Route path="registro" element={<PlaceholderPage {...pages.register} />} />
    <Route path="feed" element={<PlaceholderPage {...pages.feed} />} />
    <Route path="explorar" element={<PlaceholderPage {...pages.explore} />} />
    <Route path="perfil" element={<PlaceholderPage {...pages.profile} />} />
    <Route path="usuarios/:id" element={<PlaceholderPage {...pages.profile} />} />
    <Route path="posts/:id" element={<PlaceholderPage {...pages.post} />} />
    <Route path="chat" element={<PlaceholderPage {...pages.chat} />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route></Routes>
}
