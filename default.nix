let
  pkgs = import <nixpkgs> {};
in
pkgs.buildNpmPackage {
  pname = "minesweeperbot";
  version = "1.0.0";

  src = ./.;

  npmDepsHash = "sha256-oiZFqvbVqXZTjpcmZee+7YGjjF+5ZaUg3ciKVpPigNk=";

  npmPackFlags = ["--ignore-scripts"];

  NODE_OPTIONS = "--openssl-legacy-provider";

  meta = {
    description = "minesweeper bot for OWOP";
  };
}