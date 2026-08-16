import { ActionError } from "astro:actions";
import {
	type AccessAuthConfig,
	type AccessIdentity,
	getAccessAuthConfig,
	getAccessIdentity,
} from "@/auth";

type GetIdentity = (
	headers: Headers,
	config: AccessAuthConfig,
) => Promise<AccessIdentity | null>;

const PREVIEW_IDENTITY: AccessIdentity = {
	id: "preview",
	email: null,
	name: "Preview",
};

export async function requireAdmin(
	headers: Headers,
	config?: AccessAuthConfig,
	getIdentity: GetIdentity = getAccessIdentity,
) {
	const accessConfig = config ?? (await getAccessAuthConfig());
	if (!accessConfig.required) {
		return PREVIEW_IDENTITY;
	}

	const user = await getIdentity(headers, accessConfig);
	if (!user) {
		throw new ActionError({ code: "UNAUTHORIZED" });
	}
	return user;
}
