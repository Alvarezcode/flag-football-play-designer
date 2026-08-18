import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({
  getPlayForCoach: vi.fn(),
  listPlaysForCoach: vi.fn(),
  createPlayForCoach: vi.fn(),
  updatePlayForCoach: vi.fn(),
  deletePlayForCoach: vi.fn(),
  getOrCreateStudyLinkForCoach: vi.fn(),
  regenerateStudyLinkForCoach: vi.fn(),
  getSharedStudyPlaybook: vi.fn(),
}));

vi.mock("./db", () => db);

const { appRouter } = await import("./routers");

function coachContext(id: number): TrpcContext {
  return {
    user: { id, openId: `coach-${id}`, name: `Coach ${id}`, email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("study links", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a study link only for its authenticated owner", async () => {
    db.getOrCreateStudyLinkForCoach.mockResolvedValue({ id: 1, userId: 4, token: "study-token-that-is-long-enough", createdAt: new Date(), updatedAt: new Date() });
    const owner = appRouter.createCaller(coachContext(4));

    await expect(owner.study.getLink()).resolves.toMatchObject({ userId: 4 });
    expect(db.getOrCreateStudyLinkForCoach).toHaveBeenCalledWith(4);
  });

  it("lets only the authenticated coach replace a link and revoke the prior token", async () => {
    db.regenerateStudyLinkForCoach.mockResolvedValue({ token: "replacement-study-token-that-is-long" });
    const owner = appRouter.createCaller(coachContext(4));
    const anonymousPlayer = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

    await expect(owner.study.regenerateLink()).resolves.toEqual({ token: "replacement-study-token-that-is-long" });
    await expect(anonymousPlayer.study.regenerateLink()).rejects.toBeDefined();
    expect(db.regenerateStudyLinkForCoach).toHaveBeenCalledTimes(1);
    expect(db.regenerateStudyLinkForCoach).toHaveBeenCalledWith(4);
  });

  it("allows anonymous players to read a valid shared playbook without edit procedures", async () => {
    const token = "study-token-that-is-long-enough";
    db.getSharedStudyPlaybook.mockResolvedValue({ coachName: "Coach Dario", plays: [] });
    const player = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

    await expect(player.study.get({ token })).resolves.toEqual({ coachName: "Coach Dario", plays: [] });
    expect(db.getSharedStudyPlaybook).toHaveBeenCalledWith(token);
  });

  it("connects coach link creation to an anonymous player’s read-only playbook retrieval", async () => {
    const token = "linked-study-token-that-is-long-enough";
    const sharedPlaybook = { coachName: "Coach Dario", plays: [{ id: 8, name: "Flood Right" }] };
    db.getOrCreateStudyLinkForCoach.mockResolvedValue({ id: 1, userId: 4, token, createdAt: new Date(), updatedAt: new Date() });
    db.getSharedStudyPlaybook.mockImplementation(async (requestedToken: string) => requestedToken === token ? sharedPlaybook : undefined);

    const coach = appRouter.createCaller(coachContext(4));
    const player = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    const link = await coach.study.getLink();

    await expect(player.study.get({ token: link.token })).resolves.toEqual(sharedPlaybook);
    expect(db.getOrCreateStudyLinkForCoach).toHaveBeenCalledWith(4);
    expect(db.getSharedStudyPlaybook).toHaveBeenCalledWith(token);
  });

  it("does not expose a revoked or invalid study link", async () => {
    db.getSharedStudyPlaybook.mockResolvedValue(undefined);
    const player = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

    await expect(player.study.get({ token: "study-token-that-is-long-enough" })).rejects.toThrow("This study link is no longer available.");
  });
});
