{
  lib,
  stdenvNoCC,

  pnpm,

  cacert,
  gitMinimal,
  nodejs,
}:

stdenvNoCC.mkDerivation (final: {
  pname = "alicization";
  version = (builtins.fromJSON (builtins.readFile ../package.json)).version;

  src = ../.;

  pnpmDeps = pnpm.fetchDeps {
    inherit (final) pname version src;
    fetcherVersion = 2;
    hash = builtins.readFile ./pnpm-deps-hash.txt;
  };

  # Cache of assets downloaded during vite build
  assets = stdenvNoCC.mkDerivation {
    pname = "alicization-assets";
    inherit (final) version src pnpmDeps;

    nativeBuildInputs = [
      cacert # For network request
      gitMinimal # For unplugin-info
      nodejs
      pnpm.configHook
    ];

    buildPhase = ''
      runHook preBuild

      pnpm run build:packages
      pnpm -F @proj-alicization/stage-web run build

      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall

      mkdir -p "$out"
      cp -r .cache/* "$out"
      cp -r apps/stage-web/.cache/assets/* "$out"

      runHook postInstall
    '';

    outputHashMode = "recursive";
    outputHashAlgo = "sha256";
    outputHash = builtins.readFile ./assets-hash.txt;
  };

  meta = {
    description = "Self-hostable AI waifu / companion / VTuber";
    longDescription = ''
      Alicization is a soul container of AI waifu / virtual characters to bring them into our world,
      wishing to achieve Neuro-sama's altitude. It's completely LLM and AI driven, capable of
      realtime voice chat, playing Minecraft and Factorio. It can be run in browser or on desktop.
      This is the desktop version.
    '';
    homepage = "https://github.com/TouHouQing/alicization";
    changelog = "https://github.com/TouHouQing/alicization/releases/tag/v${final.version}";
    # While Alicization itself is licensed under MIT, it uses the nonfree Cubism SDK. Whether it's
    # redistributable remains a question, so we say it's not.
    license = lib.licenses.unfree;
    platforms = [
      "x86_64-linux"
      "aarch64-linux"
      "x86_64-darwin"
      "aarch64-darwin"
    ];
    mainProgram = final.pname;
    maintainers = with lib.maintainers; [ weathercold ];
  };
})
