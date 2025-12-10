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

	// Redirect logic for admin pages
	if (url.pathname.startsWith("/admin")) {
		if (!context.locals.user) {
			return context.redirect("/login");
		}
	} else if (url.pathname === "/login" && context.locals.user) {
		// If already logged in and trying to access /login, redirect to /admin
		return context.redirect("/admin");
	}

	return next();
});
