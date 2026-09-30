import type { SubmitEvent } from "react";
import type { Profile } from "../types/api";
import { Input } from "./Input";
import { Button } from "./Button";
import { profileCopy, copy } from "../content/copy";
interface ProfileEditorProps {
  readonly profile: Profile;
  readonly busy: boolean;
  readonly onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  readonly onCancel: () => void;
}
export function ProfileEditor({
  profile,
  busy,
  onSubmit,
  onCancel,
}: ProfileEditorProps) {
  return (
    <form
      onSubmit={onSubmit}
      aria-label={profileCopy.edit}
      className="space-y-5"
    >
      <fieldset disabled={busy} className="space-y-5">
        <Input
          label={profileCopy.name}
          name="nombre"
          defaultValue={profile.nombre}
          required
        />
        <div className="field">
          <label htmlFor="profile-bio">{profileCopy.bio}</label>
          <textarea
            className="input min-h-32 resize-y"
            id="profile-bio"
            name="bio"
            defaultValue={profile.bio ?? ""}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit">
            {busy ? copy.loading : profileCopy.save}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            {profileCopy.cancel}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
