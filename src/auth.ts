import { createRemoteJWKSet, jwtVerify } from "jose";

export type AccessIdentity = {
	id: string;
	email: string | null;
	name: string | null;
};

export type AccessAuthConfig = {
	required: boolean;
	teamDomain?: string;
	audience?: string;
};

type AccessRuntimeEnv = {
	ACCESS_AUTH_REQUIRED?: string;
	ACCESS_TEAM_DOMAIN?: string;
	ACCESS_AUDIENCE?: string;
};

const remoteJwksByTeamDomain = new Map<
	string,
	ReturnType<typeof createRemoteJWKSet>
>();

const getRemoteJwks = (teamDomain: string) => {
	const cached = remoteJwksByTeamDomain.get(teamDomain);
	if (cached) {
		return cached;
	}

	const remoteJwks = createRemoteJWKSet(
		new URL(`${teamDomain}/cdn-cgi/access/certs`),
	);
	remoteJwksByTeamDomain.set(teamDomain, remoteJwks);
	return remoteJwks;
};

export const getAccessAuthConfig = async (): Promise<AccessAuthConfig> => {
	const { env } = await import("cloudflare:workers");
	const runtimeEnv = env as unknown as AccessRuntimeEnv;

	return {
		required: runtimeEnv.ACCESS_AUTH_REQUIRED !== "false",
		teamDomain: runtimeEnv.ACCESS_TEAM_DOMAIN?.replace(/\/$/, ""),
		audience: runtimeEnv.ACCESS_AUDIENCE,
	};
};

export const verifyAccessToken = async (
	headers: Headers,
	config: AccessAuthConfig,
): Promise<AccessIdentity | null> => {
	if (!config.required) {
		return null;
	}

	if (!config.teamDomain || !config.audience) {
		return null;
	}

	const token = headers.get("Cf-Access-Jwt-Assertion");
	if (!token) {
		return null;
	}

	try {
		const { payload } = await jwtVerify(
			token,
			getRemoteJwks(config.teamDomain),
			{
				issuer: config.teamDomain,
				audience: config.audience,
			},
		);

		if (typeof payload.sub !== "string" || payload.sub.length === 0) {
			return null;
		}

		return {
			id: payload.sub,
			email: typeof payload.email === "string" ? payload.email : null,
			name: typeof payload.name === "string" ? payload.name : null,
		};
	} catch {
		return null;
	}
};

export const getAccessIdentity = async (
	headers: Headers,
	config?: AccessAuthConfig,
) => verifyAccessToken(headers, config ?? (await getAccessAuthConfig()));
