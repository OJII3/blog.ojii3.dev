import { ActionError } from "astro:actions";
import { auth as defaultAuth } from "@/auth";

type GetSession = (context: {
	headers: Headers;
}) => Promise<{ user: unknown | null } | null>;

export async function requireAdmin(
	headers: Headers,
	getSession: GetSession = defaultAuth.api.getSession,
) {
	const session = await getSession({ headers });
	if (!session?.user) {
		throw new ActionError({ code: "UNAUTHORIZED" });
	}
	return session.user;
}
