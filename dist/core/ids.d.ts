export type IdPrefix = "pid" | "aid" | "wid" | "sid" | "gid" | "ent" | "tx";
export declare function newId(prefix: IdPrefix, bytes?: number): string;
export declare function assertId(prefix: IdPrefix, value: string): void;
