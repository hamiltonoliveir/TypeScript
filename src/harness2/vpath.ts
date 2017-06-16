import { compareStrings } from "./utils";

export function normalizeSlashes(path: string): string {
    return path.replace(/\s*[\\/]\s*/g, "/").trim();
}

const rootRegExp = /^[\\/]([\\/](.*?[\\/](.*?[\\/])?)?)?|^[a-zA-Z]:[\\/]?|^\w+:\/{2}[^\\/]*[\\/]?/;
function getRootLength(path: string) {
    const match = rootRegExp.exec(path);
    return match ? match[0].length : 0;
}

export function isAbsolute(path: string) {
    return rootRegExp.test(path);
}

const trailingSeperatorRegExp = /[\\/]$/;
export function hasTrailingSeperator(path: string) {
    return trailingSeperatorRegExp.test(path);
}

function reduce(components: string[]) {
    const normalized = [components[0]];
    for (let i = 1; i < components.length; i++) {
        const component = components[i];
        if (component === ".") continue;
        if (component === ".." && normalized.length > 0 && normalized[normalized.length - 1] !== "..") {
            normalized.pop();
        }
        else {
            normalized.push(component);
        }
    }
    return normalized;
}

export function normalize(path: string): string {
    const components = reduce(parse(normalizeSlashes(path)));
    return components.length > 1 && hasTrailingSeperator(path) ? format(components) + "/" : format(components);
}

export function combine(path: string, ...paths: string[]) {
    path = normalizeSlashes(path);
    for (let name of paths) {
        name = normalizeSlashes(name);
        if (name.length === 0) continue;
        if (path.length === 0 || isAbsolute(name)) {
            path = name;
        }
        else {
            path = hasTrailingSeperator(path) ? path + name : path + "/" + name;
        }
    }
    return path;
}

export function resolve(path: string, ...paths: string[]) {
    return normalize(combine(path, ...paths));
}

export function relative(from: string, to: string, ignoreCase: boolean) {
    if (!isAbsolute(from)) throw new Error("Path not absolute: from");
    if (!isAbsolute(to)) throw new Error("Path not absolute: to");

    const fromComponents = reduce(parse(from));
    const toComponents = reduce(parse(to));

    let start: number;
    for (start = 0; start < fromComponents.length && start < toComponents.length; start++) {
        if (compareStrings(fromComponents[start], toComponents[start], ignoreCase)) {
            break;
        }
    }

    if (start === 0) {
        return format(toComponents);
    }

    const components = toComponents.slice(start);
    for (; start < fromComponents.length; start++) {
        components.unshift("..");
    }

    return format(["", ...components]);
}

export function parse(path: string) {
    // if (hasTrailingSeperator(path)) path = path.substring(0, path.length - 1);
    const rootLength = getRootLength(path);
    const root = path.substring(0, rootLength);
    const rest = path.substring(rootLength).split(/\/+/g);
    if (rest.length && !rest[rest.length - 1]) rest.pop();
    return [root, ...rest.map(component => component.trim())];
}

export function format(components: string[]) {
    return components.length ? components[0] + components.slice(1).join("/") : "";
}

export function basename(path: string) {
    path = normalizeSlashes(path);
    return path.substr(Math.max(getRootLength(path), path.lastIndexOf("/") + 1));
}

export function dirname(path: string) {
    path = normalizeSlashes(path);
    return path.substr(0, Math.max(getRootLength(path), path.lastIndexOf("/")));
}