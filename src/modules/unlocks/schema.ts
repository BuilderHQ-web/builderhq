/**
 * unlocks · drizzle schema.
 *
 * DB tables owned by this module. Real Drizzle definitions land in
 * Phase 1 (auth, users, profiles) and grow module by module from there.
 * Cross-module reads should go through service.ts on the owning module,
 * never by importing this file from outside the module.
 */
export {};
