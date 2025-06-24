{ pkgs ? import <nixpkgs> {} }:

with pkgs; pkgs.buildNpmPackage rec {
  pname = "minesweeperbot";
  version = "1.0.0";
  src = ./.;

  npmDeps = pkgs.importNpmLock {
    npmRoot = ./.;
  };

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

  npmConfigHook = pkgs.importNpmLock.npmConfigHook;
}