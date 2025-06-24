{ pkgs ? import <nixpkgs> {}, nodejs }:

pkgs.buildNpmPackage {
  pname = "minesweeperbot";
  version = "1.0.0";
  src = ./.;

  inherit nodejs;

  npmDeps = pkgs.importNpmLock {
    npmRoot = ./.;
  };

  postBuild = ''
    npx next-sitemap
  '';

  installPhase = ''
    runHook preInstall
    npx pagefind --site ./out
    mv out $out
    runHook postInstall
  '';

  npmConfigHook = pkgs.importNpmLock.npmConfigHook;
}