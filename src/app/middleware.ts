import { defineMiddleware } from "astro:middleware";
import { auth } from "@/auth";

const PRIVATE_ROUTES_PREFIX = "/admin";
const AUTH_API_PREFIX = "/api/auth";
const LOGIN_ROUTE = "/login";

const shouldCheckSession = (pathname: string) => {
	return (
		pathname.startsWith(PRIVATE_ROUTES_PREFIX) ||
		pathname.startsWith(AUTH_API_PREFIX) ||
		pathname === LOGIN_ROUTE
	);
};

export const onRequest = defineMiddleware(async (context, next) => {
	const url = new URL(context.request.url);

	if (!shouldCheckSession(url.pathname)) {
		return next();
	}

	const sessionData = await auth.api.getSession({
		headers: context.request.headers,
	});

	context.locals.session = sessionData?.session ?? null;
	context.locals.user = sessionData?.user ?? null;

	// Redirect logic
	const isPrivateRoute = url.pathname.startsWith(PRIVATE_ROUTES_PREFIX);
	const isLoginRoute = url.pathname === LOGIN_ROUTE;

	if (isPrivateRoute) {
		if (!context.locals.user) {
			const redirectTo = url.pathname + url.search;
			return context.redirect(
				`${LOGIN_ROUTE}?redirectTo=${encodeURIComponent(redirectTo)}`,
			);
		}
	} else if (isLoginRoute && context.locals.user) {
		// If already logged in and trying to access /login, redirect to /admin
		return context.redirect(PRIVATE_ROUTES_PREFIX);
	}

	return next();
});

