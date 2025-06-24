let
  pkgs = import <nixpkgs> {};
in
pkgs.buildNpmPackage {
  pname = "minesweeperbot";
  version = "1.0.0";

  src = ./.;

  npmDepsHash = "sha256-oiZFqvbVqXZTjpcmZee+7YGjjF+5ZaUg3ciKVpPigNk=";

  npmPackFlags = ["--ignore-scripts"];
  dontNpmBuild = true;

  # This ensures that node-gyp can build native modules
  nativeBuildInputs = with pkgs; [
    pkg-config
    python3
    nodejs_22
  ];

  buildInputs = with pkgs; [
    cairo
    libpng
    pango
    pixman
    giflib
    glib
    zlib
  ];

  # Some modules still want this for compatibility
  env = {
    PKG_CONFIG_PATH = pkgs.lib.makeSearchPath "lib/pkgconfig" [
      pkgs.cairo
      pkgs.libpng
      pkgs.pango
      pkgs.pixman
      pkgs.giflib
      pkgs.glib
      pkgs.zlib
    ];
    NODE_OPTIONS = "--openssl-legacy-provider";
  };

  meta = {
    description = "minesweeper bot for OWOP";
    license = pkgs.lib.licenses.mit;
  };
}