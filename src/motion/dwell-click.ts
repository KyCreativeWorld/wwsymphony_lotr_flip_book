// Web-only helpers for pressing things with the tracker cursor, by sending the same events a
// mouse would.

const CLICKABLE = '[role="button"], a[href], button, input, select, textarea';

// The clickable element under a point on the screen, if it can be clicked right now.
export function clickableAt(x: number, y: number): HTMLElement | null {
  const element = document.elementFromPoint(x, y)?.closest<HTMLElement>(CLICKABLE);
  if (!element) return null;
  if (element.getAttribute('aria-disabled') === 'true' || (element as HTMLButtonElement).disabled) {
    return null;
  }
  return element;
}

// Tells an element the cursor came in or left, so hover effects (like a portrait growing) show.
export function sendHover(element: HTMLElement, entering: boolean, x: number, y: number) {
  const init = { clientX: x, clientY: y, pointerType: 'mouse', isPrimary: true };
  element.dispatchEvent(new PointerEvent(entering ? 'pointerenter' : 'pointerleave', init));
  element.dispatchEvent(new MouseEvent(entering ? 'mouseenter' : 'mouseleave', init));
}

export function sendClick(element: HTMLElement, x: number, y: number) {
  if (element.matches('input, select, textarea')) {
    element.focus();
    return;
  }
  element.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
  );
}
