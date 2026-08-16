{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    systems.url = "github:nix-systems/default";
  };

  outputs =
    inputs@{
      self,
      systems,
      nixpkgs,
      flake-parts,
      ...
    }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = import inputs.systems;
      perSystem =
        {
          config,
          pkgs,
          system,
          ...
        }:
        {
          _module.args.pkgs = import inputs.nixpkgs {
            inherit system;
            config.allowUnfreePredicate = package:
              builtins.elem (nixpkgs.lib.getName package) [
                "terraform"
              ];
          };

          devShells.default = pkgs.mkShell {
            packages = with pkgs; [
              bun # as a package manager
              nodejs-slim_24 # wrangler dev requires nodejs
              terraform
            ];
            shellHook = ''
              bun --version > .bun-version
            '';
          };
        };
    };
}
