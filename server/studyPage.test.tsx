import React, { type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

const fieldProps = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>> }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    study: {
      get: {
        useQuery: () => ({
          isLoading: false,
          isError: false,
          data: {
            coachName: "Coach Dario",
            plays: [{
              id: 1,
              name: "Flood Right",
              formation: "Trips Right",
              playType: "pass",
              notes: "Study the outside receiver first.",
              diagram: {
                orientation: "horizontal",
                format: "5v5",
                players: [{ id: "qb", label: "QB", side: "offense", x: 40, y: 50 }],
                routes: [],
                ball: { x: 46, y: 50 },
              },
            }],
          },
        }),
      },
    },
  },
}));

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
  useRoute: () => [true, { token: "study-token-that-is-long-enough" }],
}));

vi.mock("@/components/PlayField", () => ({
  default: (props: Record<string, unknown>) => {
    fieldProps.calls.push(props);
    return <div data-testid="readonly-field" />;
  },
  PlayThumbnail: () => <div data-testid="play-thumb" />,
}));

let StudyPlaybook: ComponentType;

beforeAll(async () => {
  StudyPlaybook = (await import("../client/src/pages/StudyPlaybook")).default;
});

describe("public player study page", () => {
  it("renders a valid shared playbook with a read-only field and no coaching editor controls", () => {
    fieldProps.calls.length = 0;
    const markup = renderToStaticMarkup(<StudyPlaybook />);

    expect(markup).toContain("Coach Dario’s playbook");
    expect(markup).toContain("Flood Right");
    expect(markup).toContain("Read-only access");
    expect(markup).toContain("Coach’s note");
    expect(markup).toContain("Watch play");
    expect(markup).toContain("Replay from the beginning");
    expect(markup).not.toContain("Save to playbook");
    expect(markup).not.toContain("Clear all");
    expect(fieldProps.calls[0]).toMatchObject({
      readOnly: true,
      activeTool: "select",
      activePlayerId: null,
      selectedRouteId: null,
      playbackProgress: 0,
    });
  });
});
