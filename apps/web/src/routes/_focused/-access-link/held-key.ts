// The key of the access link being opened, held in memory only, never in
// the address or the history's state: once the link opens, the address bar
// shows `/access` alone, and a reload forgets the key.
let held: string | undefined;

export function holdAccessKey(key: string): void {
  held = key;
}

export function heldAccessKey(): string | undefined {
  return held;
}

export function forgetAccessKey(): void {
  held = undefined;
}
