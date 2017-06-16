declare var window: any;

export const enum ExecutionEnvironment {
    Node,
    Browser,
}

export function getExecutionEnvironment() {
    if (typeof window !== "undefined") {
        return ExecutionEnvironment.Browser;
    }
    else {
        return ExecutionEnvironment.Node;
    }
}

export function compareValues<T>(a: T, b: T) {
    if (a === b) return 0;
    if (a === undefined || a === null) return -1;
    if (b === undefined || b === null) return +1;
    return a < b ? -1 : a > b ? +1 : 0;
}


const caseInsensitiveCollator = typeof Intl === "object" ? new Intl.Collator(/*locales*/ undefined, { usage: "sort", sensitivity: "accent" }) : undefined;
const caseSensitiveCollator = typeof Intl === "object" ? new Intl.Collator(/*locales*/ undefined, { usage: "sort", sensitivity: "variant" }) : undefined;

export function compareStrings(a: string | undefined, b: string | undefined, ignoreCase?: boolean) {
    if (a === b) return 0;
    if (a === undefined) return -1;
    if (b === undefined) return +1;
    const collator = ignoreCase ? caseInsensitiveCollator : caseSensitiveCollator;
    if (collator) {
        return collator.compare(a, b);
    }
    else if (ignoreCase) {
        a = a.toUpperCase();
        b = b.toUpperCase();
    }
    return a < b ? -1 : a > b ? +1 : 0;
}

export namespace compareStrings {
    export function caseSensitive(a: string | undefined, b: string | undefined) {
        return compareStrings(a, b, /*ignoreCase*/ false);
    }
    export function caseInsensitive(a: string | undefined, b: string | undefined) {
        return compareStrings(a, b, /*ignoreCase*/ true);
    }
}

export function stableSort<T>(array: T[], comparer: (x: T, y: T) => number = compareValues) {
    return array
        .map((_, i) => i) // create array of indices
        .sort((x, y) => comparer(array[x], array[y]) || compareValues(x, y)) // sort indices by value then position
        .map(i => array[i]); // get sorted array
}
