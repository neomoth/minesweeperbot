{ pkgs ? import<nixpkgs> {} }:

with pkgs; stdenv.mkDerviation rec {
	pname = "minesweeperbot";
	version = "1.0.0";
	src = ./.;

	serverRuntime = pkgs.nodejs_22;

	nativeBuildInputs = [
		pkgs.nodejs_22
		pkgs.nodePackages.npm
	];

	buildPhase = ''
		mkdir -p $out/bin $out/libexec/${pname}
		cp -r ./* $out/libexec/${pname}/
		cd $out/libexec/${pname}/
		npm ci --omit=dev
	'';

	installPhase = ''
		cat <<EOF > $out/libexec/${pname}
#!/bin/sh
exec ${serverRuntime}/bin/node '$out/libexec/${pname}/index.js
EOF
		chmod +x $out/bin/${pname}
	'';

	meta = {
		description="minesweeper bot for OWOP";
		platforms = pkgs.lib.platforms.linux;
	};
}