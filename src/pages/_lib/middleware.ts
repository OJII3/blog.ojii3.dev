import { defineMiddleware } from "astro:middleware";
import { getAccessAuthConfig, getAccessIdentity } from "@/auth";
import { withNoStore } from "./cache-control";

const PRIVATE_ROUTES_PREFIX = "/admin";
const PRODUCTION_HOSTNAME = "blog.ojii3.dev";
const ADMIN_HOSTNAME = "admin.blog.ojii3.dev";

const shouldCheckAdmin = (pathname: string) => {
	return pathname.startsWith(PRIVATE_ROUTES_PREFIX);
};

export const onRequest = defineMiddleware(async (context, next) => {
	const url = new URL(context.request.url);

	if (!shouldCheckAdmin(url.pathname)) {
		return next();
	}

	const accessConfig = await getAccessAuthConfig();
	context.locals.user = await getAccessIdentity(
		context.request.headers,
		accessConfig,
	);

	if (accessConfig.required && !context.locals.user) {
		if (url.hostname === PRODUCTION_HOSTNAME) {
			const adminUrl = new URL(url);
			adminUrl.hostname = ADMIN_HOSTNAME;
			return withNoStore(context.redirect(adminUrl.toString()));
		}

		return withNoStore(
			new Response("Unauthorized", {
				status: 401,
				headers: { "Content-Type": "text/plain; charset=utf-8" },
			}),
		);
	}

	return withNoStore(await next());
});
