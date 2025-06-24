{ nixpkgs ? import <nixpkgs> {  } }:
with nixpkgs; buildNpmPackage rec {
	name = "minesweeperbot";
	npmDepsHash = "sha256-oiZFqvbVqXZTjpcmZee+7YGjjF+5ZaUg3ciKVpPigNk=";

	src = fetchGit {
		url = ./.;
	};

	enableParallelBuilding = true;
	nodejs = pkgs.nodejs_20;
	nativeBuildInputs = [
		python3
		node-gyp
		nodejs
		#npmHooks.npmInstallHook
	];

	# Grab the dependencies for running later
	buildPhase = ''
		mkdir -p $out/bin $out/libexec/${name}
		cp package.json $out/libexec/${name}/
		cp -r node_modules $out/libexec/${name}/
		cp -r src $out/libexec/${name}/
	'';

	# Write a script to the output folder that invokes the entrypoint of the application
	installPhase = ''
		cat <<EOF > $out/bin/${name}
#!${runtimeShell}
exec ${nodejs}/bin/node '$out/libexec/${name}/src/server.js';
EOF
		chmod a+x $out/bin/${name}
	'';

	meta = {
		description = "minesweeper bot for owop";
		platforms = lib.platforms.linux;
	};
}