export interface Clock {
  now(): number;
}

export interface ManualClock extends Clock {
  advance(milliseconds: number): void;
}

export function systemClock(): Clock {
  return { now: () => Date.now() };
}

export function manualClock(start = 0): ManualClock {
  let time = start;

  return {
    now: () => time,
    advance(milliseconds: number) {
      time += milliseconds;
    },
  };
}
