// Lets Node resolve Moodle-style extension-less relative imports ('./model') used by amd/src.
export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[cm]?js$/.test(specifier)) {
        try {
            return await nextResolve(`${specifier}.js`, context);
        } catch {
            // Fall through to the default resolution.
        }
    }
    return nextResolve(specifier, context);
}
