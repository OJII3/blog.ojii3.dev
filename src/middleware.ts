import { defineMiddleware } from "astro:middleware";
import { createAuth } from "./auth";

export const onRequest = defineMiddleware(async (context, next) => {
	const url = new URL(context.request.url);
	if (
		!url.pathname.startsWith("/admin") &&
		!url.pathname.startsWith("/api/auth")
	) {
		return next();
	}

	const auth = createAuth();
	const sessionData = await auth.api.getSession({
		headers: context.request.headers,
	});

	context.locals.session = sessionData?.session ?? null;
	context.locals.user = sessionData?.user ?? null;

	return next();
});
