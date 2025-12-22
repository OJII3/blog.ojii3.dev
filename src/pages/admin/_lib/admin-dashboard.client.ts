import { actions } from "astro:actions";

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

const handleDeploy = async (deployBtn: HTMLElement) => {
	if (!confirm("Deploy workflow をトリガーしますか？")) {
		return;
	}

	try {
		deployBtn.setAttribute("disabled", "true");
		deployBtn.textContent = "Deploying...";

		await actions.triggerDeploy();

		alert("Deploy workflow がトリガーされました！");
		deployBtn.textContent = "Deploy";
	} catch (error) {
		console.error(error);
		alert(
			`エラーが発生しました: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		deployBtn.textContent = "Deploy";
	} finally {
		deployBtn.removeAttribute("disabled");
	}
};

export const setupAdminDashboard = (
	deployBtnId = "admin-deploy-btn",
	logoutBtnId = "admin-logout-btn",
) => {
	const deployBtn = document.getElementById(deployBtnId);
	const logoutBtn = document.getElementById(logoutBtnId);

	deployBtn?.addEventListener("click", () => handleDeploy(deployBtn));
	logoutBtn?.addEventListener("click", handleLogout);
};
