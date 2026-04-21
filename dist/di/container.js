// src/di/container.ts
export class Container {
    services = new Map();
    factories = new Map();
    register(token, instance) {
        this.services.set(token, instance);
    }
    registerFactory(token, factory) {
        this.factories.set(token, factory);
    }
    get(token) {
        if (this.services.has(token)) {
            return this.services.get(token);
        }
        if (this.factories.has(token)) {
            const instance = this.factories.get(token)();
            this.services.set(token, instance);
            return instance;
        }
        throw new Error(`Service not found: ${token}`);
    }
    has(token) {
        return this.services.has(token) || this.factories.has(token);
    }
}
//# sourceMappingURL=container.js.map