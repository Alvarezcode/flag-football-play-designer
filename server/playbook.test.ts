import { beforeEach, describe, expect, it, vi } from "vitest";
import { playInputSchema } from "./playbookSchema";
import type { TrpcContext } from "./_core/context";
import { UNAUTHED_ERR_MSG } from "../shared/const";

const db = vi.hoisted(() => ({
  getPlayForCoach: vi.fn(),
  listPlaysForCoach: vi.fn(),
  createPlayForCoach: vi.fn(),
  updatePlayForCoach: vi.fn(),
  deletePlayForCoach: vi.fn(),
}));

vi.mock("./db", () => db);

const { appRouter } = await import("./routers");

const diagram = {
  orientation: "horizontal" as const,
  format: "5v5" as const,
  players: [{ id: "quarterback", label: "Q", side: "offense" as const, x: 45, y: 52 }],
  routes: [],
  ball: { x: 50, y: 50 },
};

const validPlay = {
  name: "Flood right",
  formation: "Trips",
  playType: "pass" as const,
  notes: "Read outside first.",
  diagram,
};

function coachContext(id: number): TrpcContext {
  return {
    user: {
      id,
      openId: `coach-${id}`,
      email: `coach-${id}@example.com`,
      name: `Coach ${id}`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("playbook input validation", () => {
  it("accepts a complete play diagram", () => {
    expect(playInputSchema.parse({
      name: "Flood right",
      formation: "Trips",
      playType: "pass",
      notes: "Read the outside receiver first.",
      diagram,
    }).name).toBe("Flood right");
  });

  it("rejects a saved play without a name", () => {
    expect(() => playInputSchema.parse({
      name: " ",
      formation: "Trips",
      playType: "pass",
      notes: "",
      diagram,
    })).toThrow("A play name is required.");
  });
});

describe("private playbook access", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not expose a playbook list without an authenticated coach", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await expect(caller.playbook.list()).rejects.toMatchObject({ message: UNAUTHED_ERR_MSG });
  });

  it("scopes get, update, and delete requests to the requesting coach", async () => {
    db.getPlayForCoach.mockImplementation(async (_id: number, userId: number) => userId === 1 ? { id: 15, ...validPlay } : undefined);
    db.updatePlayForCoach.mockImplementation(async (_id: number, userId: number) => userId === 1 ? { id: 15, ...validPlay } : undefined);
    db.deletePlayForCoach.mockImplementation(async (_id: number, userId: number) => userId === 1);

    const otherCoach = appRouter.createCaller(coachContext(2));

    await expect(otherCoach.playbook.get({ id: 15 })).rejects.toThrow("Play not found");
    await expect(otherCoach.playbook.update({ id: 15, play: validPlay })).rejects.toThrow("Play not found");
    await expect(otherCoach.playbook.delete({ id: 15 })).resolves.toBe(false);

    expect(db.getPlayForCoach).toHaveBeenCalledWith(15, 2);
    expect(db.updatePlayForCoach).toHaveBeenCalledWith(15, 2, validPlay);
    expect(db.deletePlayForCoach).toHaveBeenCalledWith(15, 2);
  });
});
