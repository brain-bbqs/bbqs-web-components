/**
 * Stopping work that is already running.
 *
 * A long job (a multi-gigabyte hash, an encode, an upload) is minutes of work, and how long it will
 * take is not apparent before it starts. So every step of one takes an `AbortSignal` and reports
 * the same way when it is tripped, which is what lets a UI tell "the visitor asked for this to
 * stop" apart from "this failed", and hand the controls back rather than leaving an error on screen.
 */

/** Thrown by whichever step noticed the signal first. */
export class InterruptedError extends Error {
  constructor(message = "Stopped.") {
    super(message);
    this.name = "InterruptedError";
  }
}

/**
 * True for the error above and for the aborts the machinery underneath raises for the same reason:
 * `fetch` and `@ffmpeg/ffmpeg` reject with a `DOMException` named `AbortError`, and mediabunny's
 * `Conversion` with its own `ConversionCanceledError`. All three mean the visitor pressed Stop, and
 * none of them is a failure to report.
 */
export function isInterruption(e: unknown): boolean {
  if (e instanceof InterruptedError) return true;
  // Read off the object rather than through `instanceof Error`: a `DOMException` does not inherit
  // from Error everywhere it is thrown, and what identifies all three of these is the name anyway.
  const name = typeof e === "object" && e !== null && "name" in e ? String(e.name) : "";
  return name === "AbortError" || name === "ConversionCanceledError";
}

/**
 * Ends the step about to be taken when the signal is already tripped. Called between the pieces of
 * work a job is made of, so that a stop lands within one step rather than at the end of the whole
 * run, however little of the work underneath can itself be aborted mid-flight.
 */
export function throwIfInterrupted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new InterruptedError();
}
