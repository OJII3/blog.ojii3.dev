import type { APIRoute } from "astro";
import { createAuth } from "../../../auth.ts";

export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
	return createAuth(ctx.locals.runtime.env.DB).handler(ctx.request);
};
