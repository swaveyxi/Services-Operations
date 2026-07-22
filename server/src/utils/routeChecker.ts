// Get allowed methods on a requested path, traversing nested routers with prefix stripping.
export const getMatchedMethods = (stack: any[], path: string): string[] => {
  const matchedMethods: string[] = [];

  for (const layer of stack) {
    if (layer.route) {
      if (layer.match(path)) {
        const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
        matchedMethods.push(...methods);
      }
    } else if (layer.handle?.stack) {
      if (layer.match(path)) {
        // layer.path is set by match() to the portion consumed by this mount prefix
        const stripped = path.slice(layer.path.length) || '/';
        const nested = getMatchedMethods(layer.handle.stack, stripped);
        matchedMethods.push(...nested);
      }
    }
  }

  return [...new Set(matchedMethods)];
};
