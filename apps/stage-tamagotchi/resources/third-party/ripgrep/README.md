# Bounded native local text search

Windows x64 ripgrep 15.2.0 is the unmodified official release binary. The archive was downloaded through the official GitHub release asset API and checked against its published SHA-256 before extracting exact named entries. Runtime verification checks the executable's exact size and hash. The application does not download tools at runtime or use an executable from PATH.

- Repository: https://github.com/BurntSushi/ripgrep
- Source commit: `e89fff89ac9af12e8d4ce9d5fd07beb408ca730f`
- Official archive: https://github.com/BurntSushi/ripgrep/releases/download/15.2.0/ripgrep-15.2.0-x86_64-pc-windows-msvc.zip
- Archive SHA-256: `71b2fef860abe467217a538ff31de02f5258807c0129f771846f87bd029aafc5`
- Executable SHA-256: `14231169855ec5205cf5a1b6f1db358ff4aed4247c86b69ce8aae647c77f6680`
- Executable bytes: `4218880`
- License: MIT or Unlicense, with original COPYING, LICENSE-MIT and UNLICENSE retained beside the binary.

The fixed argv, JSON match stream, result/byte limits and cancellation approach were studied from Pi's grep implementation at commit `35dfa757378bd7a8570670e99c2687bdd1039a06`: https://github.com/earendil-works/pi/blob/35dfa757378bd7a8570670e99c2687bdd1039a06/packages/coding-agent/src/core/tools/grep.ts . Its upstream MIT notice is retained in `pi-LICENSE`.

Search is a bounded local read under the existing filesystem permission, current action owner and cancellation signal. It introduces no write, network transmission or shell execution capability. Matching line previews are search observations, and do not prove a complete file read or exhaustive directory inventory. Native execution uses the existing signed Windows Job owner and must settle its process tree before returning. The portable search binary is only enabled on its verified supported platform.
