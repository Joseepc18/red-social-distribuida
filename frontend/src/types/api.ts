export interface UserSummary {
  readonly id: string;
  readonly username: string;
  readonly nombre: string;
}
export interface Profile extends UserSummary {
  readonly bio: string | null;
}
export interface Session {
  readonly token: string;
  readonly user: Profile;
}
export interface ApiErrorBody {
  readonly error: string;
  readonly mensaje: string;
}
