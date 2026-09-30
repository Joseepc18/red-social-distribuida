import { useNavigate, useParams } from "react-router";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { ProfileEditor } from "../components/ProfileEditor";
import { StatusMessage } from "../components/StatusMessage";
import { UserCard } from "../components/UserCard";
import { ProfileGraph } from "../components/ProfileGraph";
import { copy, profileCopy } from "../content/copy";
import { PostList } from "../components/PostList";
import { postsCopy } from "../content/posts-copy";
import { chatCopy } from "../content/chat-copy";
import { chat } from "../services/chat";
import { errorMessage } from "../lib/api";
interface ProfilePageProps {
  readonly userId?: string;
}
export function ProfilePage(_props: ProfilePageProps) {
  const { id } = useParams();
  const { session } = useAuth();
  return (
    <ProfileContent
      key={id ?? session?.user.id}
      userId={id ?? session?.user.id ?? ""}
    />
  );
}
function ProfileContent({ userId = "" }: ProfilePageProps) {
  const state = useProfile(userId);
  const navigate = useNavigate();
  const [startingChat, setStartingChat] = useState(false);
  const [chatError, setChatError] = useState("");
  if (state.loading) return <StatusMessage message={copy.loading} />;
  if (state.error || !state.data)
    return (
      <StatusMessage
        message={state.error ?? copy.serverError}
        error
        onRetry={state.reload}
      />
    );
  const { profile, followers, following } = state.data;
  const list = state.list === "followers" ? followers : following;
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{copy.member}</p>
        <h1>{state.own ? copy.profile : profileCopy.title}</h1>
      </div>
      <Card className="overflow-hidden !p-0">
        <div className="profile-cover" />
        <div className="relative space-y-6 px-6 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="-mt-10 rounded-full ring-4 ring-surface-container-lowest dark:ring-inverse-surface">
              <Avatar name={profile.nombre} large />
            </div>
            {state.own ? (
              <Button
                variant="secondary"
                onClick={state.startEditing}
                disabled={state.editing || state.busy}
              >
                {profileCopy.edit}
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={state.following ? "secondary" : "primary"}
                  onClick={state.toggleFollow}
                  disabled={state.busy}
                >
                  {state.busy
                    ? copy.loading
                    : state.following
                      ? profileCopy.unfollow
                      : profileCopy.follow}
                </Button>
                <Button
                  variant="secondary"
                  disabled={startingChat}
                  onClick={async () => {
                    setStartingChat(true);
                    setChatError("");
                    try {
                      const conversation = await chat.create(profile.id);
                      navigate(
                        "/chat?conversacion=" +
                          encodeURIComponent(conversation.id),
                      );
                    } catch (error: unknown) {
                      setChatError(errorMessage(error) || chatCopy.startError);
                    } finally {
                      setStartingChat(false);
                    }
                  }}
                >
                  {startingChat ? copy.loading : chatCopy.start}
                </Button>
              </div>
            )}
          </div>
          <div>
            <h2 className="break-words text-2xl">{profile.nombre}</h2>
            <p className="muted mt-1 break-all">@{profile.username}</p>
            <p className="mt-5 max-w-2xl whitespace-pre-wrap break-words leading-relaxed">
              {profile.bio || profileCopy.noBio}
            </p>
          </div>
          {state.mutationError && (
            <StatusMessage message={state.mutationError} error />
          )}
          {chatError && <StatusMessage message={chatError} error />}
          {state.notice && <StatusMessage message={state.notice} />}
          {state.editing && (
            <ProfileEditor
              profile={profile}
              busy={state.busy}
              onSubmit={state.save}
              onCancel={state.cancelEditing}
            />
          )}
        </div>
      </Card>
      <section className="space-y-5" aria-label={postsCopy.userPosts}>
        <h2>{postsCopy.userPosts}</h2>
        <PostList
          key={userId}
          path={"/usuarios/" + encodeURIComponent(userId) + "/posts"}
        />
      </section>
      {!state.own && (
        <ProfileGraph key={userId + ":" + state.following} userId={userId} />
      )}
      <Card>
        <div
          className="mb-6 flex flex-wrap gap-3"
          role="group"
          aria-label={profileCopy.connections}
        >
          <Button
            variant={state.list === "followers" ? "primary" : "secondary"}
            aria-pressed={state.list === "followers"}
            onClick={() => state.selectList("followers")}
          >
            {followers.length} {profileCopy.followers}
          </Button>
          <Button
            variant={state.list === "following" ? "primary" : "secondary"}
            aria-pressed={state.list === "following"}
            onClick={() => state.selectList("following")}
          >
            {following.length} {profileCopy.following}
          </Button>
        </div>
        <h2 className="mb-4">
          {state.list === "followers"
            ? profileCopy.followers
            : profileCopy.following}
        </h2>
        {list.length ? (
          <div className="grid gap-3">
            {list.map((user) => (
              <UserCard key={user.id} user={user} compact />
            ))}
          </div>
        ) : (
          <StatusMessage message={profileCopy.empty} />
        )}
      </Card>
    </div>
  );
}
