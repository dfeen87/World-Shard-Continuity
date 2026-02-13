export type SchemaName = "player-identity" | "asset-ownership" | "world-shard";
export declare class SchemaRegistry {
    private readonly schemaDirAbs;
    private ajv;
    private validators;
    constructor(schemaDirAbs: string);
    private load;
    validateOrThrow<T>(name: SchemaName, data: unknown): T;
}
export declare function defaultSchemaRegistry(baseDir?: string): SchemaRegistry;
