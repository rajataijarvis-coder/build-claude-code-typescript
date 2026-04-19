// src/di/container.ts
export class Container {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  register<T>(token: string, instance: T): void {
    this.services.set(token, instance);
  }

  registerFactory<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory);
  }

  get<T>(token: string): T {
    if (this.services.has(token)) {
      return this.services.get(token) as T;
    }

    if (this.factories.has(token)) {
      const instance = this.factories.get(token)!();
      this.services.set(token, instance);
      return instance as T;
    }

    throw new Error(`Service not found: ${token}`);
  }

  has(token: string): boolean {
    return this.services.has(token) || this.factories.has(token);
  }
}
