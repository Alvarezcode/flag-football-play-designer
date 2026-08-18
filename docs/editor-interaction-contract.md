# Editor Interaction Contract

The editor accepts **pointer events** so a coach can use a finger, stylus, trackpad, or mouse. Player tokens and the football remain within the field bounds. Only one drag target may be active at a time, and releasing or cancelling a pointer interaction always returns the editor to an idle drag state.

Routes begin on a selected player. A route is persisted to the active diagram only once it contains two or more distinct points; this prevents a simple selection tap from producing an empty arrow. Pointer jitter smaller than 0.65 field units is ignored to keep hand-drawn paths clean.

Undo removes the latest saved route only. Clearing a selected player removes only that player’s routes, and clearing all removes every finalized route. These rules are covered by the deterministic tests under `shared/*.test.ts`.

## Duplicate-key regression safeguard

The reported React warning was traced to a route being eligible for finalization more than once during a pointer interaction. Repeating that finalization could place the same route ID in the rendered route array twice. The editor now keeps an interaction-local route reference, clears it before committing the finalized path, and rejects a route ID that already exists. Field and thumbnail renderer keys also include the list position as a defensive safeguard for previously persisted duplicate IDs.
