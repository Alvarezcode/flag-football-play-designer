import { z } from "zod";

const point = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export const diagramSchema = z.object({
  orientation: z.enum(["horizontal", "vertical"]),
  format: z.enum(["5v5", "7v7"]),
  players: z.array(z.object({
    id: z.string().min(1).max(80),
    label: z.string().min(1).max(16),
    side: z.enum(["offense", "defense"]),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  })).max(30),
  routes: z.array(z.object({
    id: z.string().min(1).max(80),
    playerId: z.string().min(1).max(80),
    points: z.array(point).min(2).max(160),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    style: z.enum(["solid", "dashed", "dotted"]),
    kind: z.enum(["go", "slant", "curl", "block", "motion", "custom"]),
  })).max(80),
  ball: point,
});

export const playInputSchema = z.object({
  name: z.string().trim().min(1, "A play name is required.").max(120),
  formation: z.string().trim().max(120),
  playType: z.enum(["run", "pass"]),
  notes: z.string().trim().max(2000),
  diagram: diagramSchema,
});
