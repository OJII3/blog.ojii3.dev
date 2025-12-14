import type { APIRoute } from "astro";
import { createAuth } from "@/config/auth";

export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
	return createAuth().handler(ctx.request);
};
