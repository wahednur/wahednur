import type { Me } from "./types";

/** Display only. The API decides what staff may actually do. */
export const isStaff = (me: Me) => me.roles.includes("owner") || me.roles.includes("staff");
