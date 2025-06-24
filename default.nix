{ pkgs ? import <nixpkgs> {} }:

let
  # Get this hash by:
  # 1. First run with fake hash (sha256-AAAAAAAA...)
  # 2. Copy the actual hash from the error message
  npmDepsHash = "sha256-ACTUALHASHHERE"; # REPLACE THIS
in
pkgs.stdenv.mkDerivation rec {
  pname = "minesweeperbot";
  version = "1.0.0";
  src = ./.;

  npmDeps = pkgs.fetchNpmDeps {
    src = src;
    hash = npmDepsHash;
  };

  nativeBuildInputs = [
    pkgs.nodejs_22
  ];

  configurePhase = ''
    runHook preConfigure
    export HOME=$(mktemp -d)
    runHook postConfigure
  '';

  buildPhase = ''
    runHook preBuild

    # Create node_modules from pre-fetched deps
    cp -r $npmDeps node_modules
    chmod -R +w node_modules  # Make writable for npm

    # Verify offline installation
    npm ci --omit=dev --offline --no-audit --no-fund

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/libexec/${pname}
    cp -r ./* $out/libexec/${pname}/

    mkdir -p $out/bin
    cat <<EOF > $out/bin/${pname}
#!/bin/sh
exec ${pkgs.nodejs_22}/bin/node $out/libexec/${pname}/index.js
EOF
    chmod +x $out/bin/${pname}

    runHook postInstall
  '';

  meta = {
    description = "minesweeper bot for OWOP";
    platforms = pkgs.lib.platforms.linux;
  };
}