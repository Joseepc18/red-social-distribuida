import { Link } from "react-router";
import { useTheme } from "../context/theme-context";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
interface SettingsPageProps {
  readonly children?: never;
}
export function SettingsPage(_props: SettingsPageProps) {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-6">
      <header>
        <h1>Configuración</h1>
        <p className="muted mt-2">Haz de ZENIT tu espacio.</p>
      </header>
      <section className="card space-y-4">
        <h2>Apariencia</h2>
        <p className="muted text-sm">Elige el tema para este navegador.</p>
        <div className="flex gap-3">
          <Button
            variant={theme === "light" ? "primary" : "secondary"}
            aria-pressed={theme === "light"}
            onClick={() => setTheme("light")}
          >
            <Icon name="sun" />
            Claro
          </Button>
          <Button
            variant={theme === "dark" ? "primary" : "secondary"}
            aria-pressed={theme === "dark"}
            onClick={() => setTheme("dark")}
          >
            <Icon name="moon" />
            Oscuro
          </Button>
        </div>
      </section>
      <Link to="/perfil" className="text-link inline-flex gap-2 items-center">
        <Icon name="profile" />
        Editar mi perfil
      </Link>
    </div>
  );
}
