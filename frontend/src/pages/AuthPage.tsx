import { Link, Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useAuthForm } from "../hooks/useAuthForm";
import { AuthPanel } from "../components/AuthPanel";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Icon } from "../components/Icon";
import { StatusMessage } from "../components/StatusMessage";
import { authCopy, copy } from "../content/copy";
interface AuthPageProps {
  readonly mode: "login" | "register";
}
export function AuthPage({ mode }: AuthPageProps) {
  const { session } = useAuth();
  const form = useAuthForm(mode);
  const register = mode === "register";
  if (session) return <Navigate to={form.destination} replace />;
  return (
    <main className="auth-layout">
      <AuthPanel />
      <section className="auth-form-panel">
        <div className="auth-mobile-brand lg:hidden">
          <Brand showTagline={false} />
        </div>
        <div className="w-full max-w-md">
          <p className="eyebrow">{authCopy.eyebrow}</p>
          <h2 className="text-3xl">
            {register ? authCopy.registerTitle : authCopy.loginTitle}
          </h2>
          <p className="muted mb-8 mt-3 leading-relaxed">
            {register ? authCopy.registerIntro : authCopy.loginIntro}
          </p>
          {!register && form.registered && (
            <div className="mb-5">
              <StatusMessage message={authCopy.registered} />
            </div>
          )}
          {form.error && (
            <div className="mb-5">
              <StatusMessage message={form.error} error />
            </div>
          )}
          <form
            onSubmit={form.submit}
            className="space-y-5"
            aria-label={register ? copy.register : copy.login}
          >
            <fieldset disabled={form.busy} className="space-y-5">
              {register && (
                <Input
                  label={authCopy.name}
                  name="nombre"
                  autoComplete="name"
                  required
                />
              )}
              <Input
                label={authCopy.username}
                name="username"
                autoComplete="username"
                defaultValue={form.username}
                autoCapitalize="none"
                spellCheck={false}
                required
              />
              {register && (
                <Input
                  label={authCopy.email}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              )}
              <Input
                label={authCopy.password}
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
              />
              <Button className="w-full" type="submit">
                {form.busy
                  ? copy.loading
                  : register
                    ? copy.register
                    : copy.login}
                <Icon name="arrow" />
              </Button>
            </fieldset>
          </form>
          <p className="muted mt-7 text-center text-sm">
            {register ? authCopy.hasAccount : authCopy.noAccount}{" "}
            <Link
              className="text-link"
              state={{ from: form.destination }}
              to={register ? "/login" : "/registro"}
            >
              {register ? copy.login : copy.register}
            </Link>
          </p>
          <p className="muted mt-12 text-center text-xs leading-relaxed">
            {authCopy.footer}
          </p>
        </div>
      </section>
    </main>
  );
}
