import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createPlayForCoach, deletePlayForCoach, getOrCreateStudyLinkForCoach, getPlayForCoach, getSharedStudyPlaybook, listPlaysForCoach, regenerateStudyLinkForCoach, updatePlayForCoach } from "./db";
import { playInputSchema } from "./playbookSchema";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  playbook: router({
    list: protectedProcedure.query(({ ctx }) => listPlaysForCoach(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const play = await getPlayForCoach(input.id, ctx.user.id);
      if (!play) throw new Error("Play not found");
      return play;
    }),
    create: protectedProcedure.input(playInputSchema).mutation(({ ctx, input }) => createPlayForCoach(ctx.user.id, input)),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), play: playInputSchema })).mutation(async ({ ctx, input }) => {
      const play = await updatePlayForCoach(input.id, ctx.user.id, input.play);
      if (!play) throw new Error("Play not found");
      return play;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deletePlayForCoach(input.id, ctx.user.id)),
  }),
  study: router({
    getLink: protectedProcedure.mutation(({ ctx }) => getOrCreateStudyLinkForCoach(ctx.user.id)),
    regenerateLink: protectedProcedure.mutation(({ ctx }) => regenerateStudyLinkForCoach(ctx.user.id)),
    get: publicProcedure.input(z.object({ token: z.string().min(20).max(64) })).query(async ({ input }) => {
      const studyPlaybook = await getSharedStudyPlaybook(input.token);
      if (!studyPlaybook) throw new Error("This study link is no longer available.");
      return studyPlaybook;
    }),
  }),
});

export type AppRouter = typeof appRouter;
