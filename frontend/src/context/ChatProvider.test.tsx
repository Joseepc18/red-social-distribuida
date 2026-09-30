import { useEffect } from "react";
import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { ChatProvider } from "./ChatProvider";
import { useChat, type ChatState } from "./chat-context";
import { chat } from "../services/chat";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ session: { token: "token", user: { id: "me" } } }),
}));
vi.mock("../services/chat", () => ({
  chat: {
    list: vi.fn(),
    history: vi.fn(),
    socketUrl: () => "ws://localhost/ws/chat",
  },
}));
const conversation = {
  id: "c1",
  creadaEn: "2026-01-01",
  participante: { id: "other", nombre: "Otra persona", username: "other" },
};
const message = {
  id: "m1",
  conversacionId: "c1",
  autorId: "other",
  texto: "Hola",
  fecha: "2026-01-01T10:00:00Z",
};
class Socket extends EventTarget {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 1;
  send = vi.fn();
  constructor() {
    super();
    Socket.instances.push(this);
    queueMicrotask(() => this.dispatchEvent(new Event("open")));
  }
  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }
  receive(value = message) {
    this.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({ tipo: "mensaje", mensaje: value }),
      }),
    );
  }
}
let state: ChatState;
function Probe() {
  const value = useChat();
  useEffect(() => {
    state = value;
  }, [value]);
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <output>{location.pathname}</output>
      <button onClick={() => navigate("/chat")}>Open chat</button>
    </>
  );
}
function setup() {
  return render(
    <MemoryRouter initialEntries={["/feed"]}>
      <ChatProvider>
        <Probe />
      </ChatProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  Socket.instances = [];
  vi.stubGlobal("WebSocket", Socket);
  vi.mocked(chat.list).mockResolvedValue([conversation]);
  vi.mocked(chat.history).mockResolvedValue({
    mensajes: [],
    siguienteAntes: null,
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
});

it("keeps one socket and conversation drafts across route changes, and closes on logout/unmount", async () => {
  const view = setup();
  await waitFor(() => expect(state.status).toBe("connected"));
  act(() => state.setDraft("c1", "Borrador pendiente"));
  fireEvent.click(screen.getByText("Open chat"));
  expect(screen.getByText("/chat")).toBeInTheDocument();
  expect(Socket.instances).toHaveLength(1);
  expect(state.drafts.c1).toBe("Borrador pendiente");
  view.unmount();
  expect(Socket.instances[0].readyState).toBe(3);
});

it("receives a first conversation from the feed even while the initial list is pending, without duplicate badges", async () => {
  let resolveList!: (value: []) => void;
  vi.mocked(chat.list).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveList = resolve;
    }),
  );
  setup();
  await waitFor(() => expect(state.status).toBe("connected"));
  act(() => {
    Socket.instances[0].receive();
    Socket.instances[0].receive();
  });
  await act(async () => {
    resolveList([]);
  });
  await waitFor(() => expect(state.conversations).toEqual([conversation]));
  expect(state.unread.c1).toBe(1);
  expect(state.histories.c1.messages).toEqual([message]);
  act(() => state.markRead("c1"));
  expect(state.unread.c1).toBe(0);
});

it("merges REST with live events and preserves the older history cursor on refresh", async () => {
  setup();
  await waitFor(() => expect(state.status).toBe("connected"));
  act(() => Socket.instances[0].receive());
  vi.mocked(chat.history).mockResolvedValueOnce({
    mensajes: [message],
    siguienteAntes: "page-2",
  });
  await act(async () => {
    await state.loadHistory("c1");
  });
  expect(state.histories.c1.messages).toEqual([message]);
  vi.mocked(chat.history).mockResolvedValueOnce({
    mensajes: [],
    siguienteAntes: "page-3",
  });
  await act(async () => {
    await state.loadHistory("c1", "page-2");
  });
  vi.mocked(chat.history).mockResolvedValueOnce({
    mensajes: [message],
    siguienteAntes: "page-2",
  });
  await act(async () => {
    await state.loadHistory("c1");
  });
  expect(state.histories.c1.nextCursor).toBe("page-3");
});

it("reloads conversations and known histories after reconnecting", async () => {
  setup();
  await waitFor(() => expect(state.status).toBe("connected"));
  await act(async () => {
    await state.loadHistory("c1");
  });
  vi.useFakeTimers();
  act(() => Socket.instances[0].close());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(Socket.instances).toHaveLength(2);
  expect(state.status).toBe("connected");
  expect(chat.history).toHaveBeenCalledTimes(2);
  expect(chat.list).toHaveBeenCalledTimes(2);
});
