{lib,buildNpmPackage,fetchFromGithub,}:

buildNpmPackage(finalAttrs: {
	pname="minesweeperbot";
	version="1.0.0";

	src = ./.;

	npmDepsHash="sha256-8kHZmODo5El+WxWk1XG383mapgJPRODGOkbmEyqOB5M=";

	npmPackFlags = ["--ignore-scripts"];

	NODE_OPTIONS = "--openssl-legacy-provider";

	meta = {
		description = "minesweeper bot for OWOP";
        platforms = pkgs.lib.platforms.linux;
	};
})