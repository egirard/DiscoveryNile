{
  description = "DiscoveryNile development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = import nixpkgs { inherit system; };
      in {
        devShells.default = pkgs.mkShell {
          # Add `jdk` here if the project uses the Firebase emulators.
          packages = with pkgs; [ bun git ];
          shellHook = ''
            # Keep Playwright browser downloads stable across `nix develop --command` invocations.
            export XDG_CACHE_HOME="$PWD/.cache"
            echo "DiscoveryNile dev shell: bun $(bun --version)"
          '';
        };
      });
}
