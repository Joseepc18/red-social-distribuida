import { expect, it } from "vitest";
import { connectionChain, groupByDistance } from "./reach";
import type { ReachableUser } from "../types/social";

const user = (
  username: string,
  distancia: number,
  via: string[] = [],
): ReachableUser => ({
  id: username,
  username,
  nombre: username,
  distancia,
  via,
});

it("groups users by distance, nearest first, keeping their order", () => {
  const groups = groupByDistance([
    user("bruno", 1),
    user("diego", 2, ["carla"]),
    user("carla", 1),
    user("hector", 3, ["carla", "fabian"]),
    user("elena", 2, ["bruno"]),
  ]);

  expect(
    groups.map(({ distance, users }) => [
      distance,
      users.map((member) => member.username),
    ]),
  ).toEqual([
    [1, ["bruno", "carla"]],
    [2, ["diego", "elena"]],
    [3, ["hector"]],
  ]);
});

it("skips distances with nobody", () => {
  expect(groupByDistance([user("hector", 3, ["a", "b"])])).toHaveLength(1);
  expect(groupByDistance([])).toEqual([]);
});

it("builds the chain of connections from the viewer", () => {
  expect(connectionChain(user("diego", 2, ["carla"]))).toBe(
    "Tú → @carla → @diego",
  );
  expect(connectionChain(user("hector", 3, ["carla", "fabian"]))).toBe(
    "Tú → @carla → @fabian → @hector",
  );
  expect(connectionChain(user("bruno", 1))).toBe("Tú → @bruno");
});
