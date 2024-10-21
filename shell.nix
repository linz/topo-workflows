let
  pkgs = import (builtins.fetchTarball {
    name = "nixos-unstable-2024-09-17";
    url = "https://github.com/nixos/nixpkgs/archive/345c263f2f53a3710abe117f28a5cb86d0ba4059.tar.gz";
    sha256 = "1llzyzw7a0jqdn7p3px0sqa35jg24v5pklwxdybwbmbyr2q8cf5j";
  }) { };
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
