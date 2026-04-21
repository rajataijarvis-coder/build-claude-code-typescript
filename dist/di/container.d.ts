export declare class Container {
    private services;
    private factories;
    register<T>(token: string, instance: T): void;
    registerFactory<T>(token: string, factory: () => T): void;
    get<T>(token: string): T;
    has(token: string): boolean;
}
//# sourceMappingURL=container.d.ts.map