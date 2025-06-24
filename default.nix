{ pkgs ? import <nixpkgs> {} }:

with pkgs; stdenv.mkDerivation rec {
  pname = "minesweeperbot";
  version = "1.0.0";
  src = ./.;

  serverRuntime = pkgs.nodejs_22;

  nativeBuildInputs = [
    pkgs.nodejs_22
    npmHooks.npmInstallHook
  ];

  npmDeps = fetchNpmDeps {
    src = ./.;
    hash = "sha256-8kHZmODo5El+WxWk1XG383mapgJPRODGOkbmEyqOB5M="; # Temporary placeholder
  };

  buildPhase = ''
    export HOME=$(mktemp -d)
    mkdir -p $out/libexec/${pname}
    cp -r ./* $out/libexec/${pname}/
    cd $out/libexec/${pname}/
    export NPM_CONFIG_FUND=false
    export NPM_CONFIG_AUDIT=false
    npm ci --omit=dev --offline
  '';

  installPhase = ''
    mkdir -p $out/bin
    cat <<EOF > $out/bin/${pname}
#!/bin/sh
exec ${serverRuntime}/bin/node $out/libexec/${pname}/index.js
EOF
    chmod +x $out/bin/${pname}
  '';

  meta = {
    description = "minesweeper bot for OWOP";
    platforms = pkgs.lib.platforms.linux;
  };
}