import { randomBytes } from "node:crypto";
import { ValidationError } from "./errors.js";
function base64url(buf) {
    return buf
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}
export function newId(prefix, bytes = 16) {
    if (bytes < 8 || bytes > 64)
        throw new ValidationError("Invalid id byte length.");
    return `${prefix}_${base64url(randomBytes(bytes))}`;
}
export function assertId(prefix, value) {
    const re = new RegExp(`^${prefix}_[A-Za-z0-9_-]{10,}$`);
    if (!re.test(value))
        throw new ValidationError(`Invalid ${prefix} id.`, { value });
}
