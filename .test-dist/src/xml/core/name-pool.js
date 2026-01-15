"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XmlNamePool = void 0;
class XmlNamePool {
    #byString = new Map();
    #strings = [];
    intern(name) {
        const existing = this.#byString.get(name);
        if (existing !== undefined)
            return existing;
        const id = this.#strings.length;
        this.#strings.push(name);
        this.#byString.set(name, id);
        return id;
    }
    toString(id) {
        const s = this.#strings[id];
        if (s === undefined)
            throw new Error(`NameId out of range: ${id}`);
        return s;
    }
}
exports.XmlNamePool = XmlNamePool;
