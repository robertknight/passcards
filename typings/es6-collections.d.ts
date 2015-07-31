// es6-collections provides polyfills for Map, Set
// and WeakSet. It exposes them on the global object
// rather than via modules.export
declare module "es6-collections" {
}

// subset of ES6 type declarations taken from
// TypeScript's lib.core.es6.d.ts
interface Map<K, V> {
    clear(): void;
    delete(key: K): boolean;
    forEach(callbackfn: (value: V, index: K, map: Map<K, V>) => void, thisArg?: any): void;
    get(key: K): V;
    has(key: K): boolean;
    set(key: K, value?: V): Map<K, V>;
    size: number;
}

interface MapConstructor {
    new <K, V>(): Map<K, V>;
    prototype: Map<any, any>;
}
declare var Map: MapConstructor;

interface Set<T> {
    add(value: T): Set<T>;
    clear(): void;
    delete(value: T): boolean;
    forEach(callbackfn: (value: T, index: T, set: Set<T>) => void, thisArg?: any): void;
    has(value: T): boolean;
    size: number;
}

interface SetConstructor {
    new <T>(): Set<T>;
    prototype: Set<any>;
}
declare var Set: SetConstructor;

