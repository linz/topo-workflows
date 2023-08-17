let
  pkgs = import (
    builtins.fetchTarball {
      url = "https://github.com/nixos/nixpkgs/archive/d934204a0f8d9198e1e4515dd6fec76a139c87f0.tar.gz";
      sha256 = "1zfby2jsfkag275aibp81bx1g1cc305qbcy94gqw0g6zki70k1lx";
    }
  ) {};
in
  pkgs.mkShell {
    packages = [
      pkgs.argo
      pkgs.awscli2
      pkgs.bashInteractive
      pkgs.kubectl
      pkgs.kubernetes-helm
      pkgs.nodejs
    ];
    shellHook = ''
      ln --force --symbolic "${pkgs.kubernetes-helm}/bin/helm" "${pkgs.kubectl}/bin/kubectl" "${pkgs.nodejs}/bin/node" .
    '';
  }
