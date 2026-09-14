// features/events/index.ts
// Pure event functions for game state transitions.
// Each event lives in its own subdirectory: features/events/<event-name>/action.ts
// No DB calls — event functions operate on plain state snapshots.
// Route handlers persist results via repositories after calling these.
