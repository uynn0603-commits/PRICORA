const cleanups = [];

export function onCleanup(fn) {
  cleanups.push(fn);
}

export function runCleanups() {
  while (cleanups.length) {
    const fn = cleanups.pop();
    try {
      fn();
    } catch (error) {
      console.error(error);
    }
  }
}
