// The CLI's user-facing error type.
//
// A CliError carries a message meant for the person at the terminal — a missing input file, a bad
// flag, an unbuilt asset. The top-level catch in cli.js prints it as ONE clean line (`enscribe: <msg>`,
// no stack); anything else that escapes is treated as an unexpected bug and printed WITH its stack.
// So "throw a CliError" is how any CLI code says "this is the user's problem, and here is how to fix
// it" — the message names the problem AND the remedy (mirroring readInput()'s fs-error wrapping).
//
// It lives in its own module — rather than inline in cli.js — so BOTH cli.js and build-live.js can
// throw it. cli.js imports build-live.js (buildLiveFolder/copyShellAssets), so build-live.js importing
// CliError back from cli.js would be a circular import; a shared leaf module has no cycle. Extracted in
// the #413 C1/C3 hygiene slice, which made copyShellAssets' unbuilt-bundle failure a clean CliError too.
export class CliError extends Error {}
