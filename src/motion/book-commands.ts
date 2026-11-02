// Commands sent to the book from outside it: motion tracker swipes and the mini map beside the
// book. The book listens for these alongside its arrow keys, so other code doesn't need to know
// how the book turns its pages.
export type BookCommand = 'next' | 'previous' | 'map';

type Listener = (command: BookCommand) => void;

const listeners = new Set<Listener>();

export function sendBookCommand(command: BookCommand) {
  listeners.forEach((listener) => listener(command));
}

// Returns a function that stops listening.
export function onBookCommand(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
