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
    <div className="settings-page">
      <header className="settings-heading">
        <h1>Configuración</h1>
        <p className="muted mt-2">Haz de ZENIT tu espacio.</p>
      </header>
      <section
        className="settings-option"
        aria-labelledby="settings-appearance"
      >
        <div>
          <h2 id="settings-appearance">Apariencia</h2>
          <p className="muted mt-2 text-sm">
            Elige el tema para este navegador.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant={theme === "light" ? "primary" : "secondary"}
            className="theme-option"
            aria-pressed={theme === "light"}
            onClick={() => setTheme("light")}
          >
            <Icon name="sun" />
            Claro
          </Button>
          <Button
            variant={theme === "dark" ? "primary" : "secondary"}
            className="theme-option"
            aria-pressed={theme === "dark"}
            onClick={() => setTheme("dark")}
          >
            <Icon name="moon" />
            Oscuro
          </Button>
        </div>
      </section>
      <section className="settings-option">
        <div>
          <h2>Perfil</h2>
          <p className="muted mt-2 text-sm">Actualiza tu nombre y biografía.</p>
        </div>
        <Link to="/perfil" className="text-link inline-flex gap-2 items-center">
          <Icon name="profile" />
          Editar mi perfil
        </Link>
      </section>
    </div>
  );
}
