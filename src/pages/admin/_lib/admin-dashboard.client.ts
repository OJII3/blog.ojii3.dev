const handleLogout = async () => {
	const { signOut } = await import("@/pages/admin/_lib/auth/auth-client");
	await signOut({
		fetchOptions: {
			onSuccess: () => {
				window.location.href = "/login";
			},
		},
	});
};

export const setupAdminDashboard = (logoutBtnId = "admin-logout-btn") => {
	const logoutBtn = document.getElementById(logoutBtnId);

	logoutBtn?.addEventListener("click", handleLogout);
};
