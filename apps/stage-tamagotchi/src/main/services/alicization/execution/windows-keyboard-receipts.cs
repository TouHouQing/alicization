// A guardian must preserve release evidence even when its actor/Node stdout
// pipe disappears. Paths are derived from the bounded session nonce, never
// from model arguments, and existing roots/files cannot be overwritten.
using System;
using System.IO;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;

// Opt in without changing machine policy or loading an unverified .config file.
// Source: Microsoft .NET Framework 4.6.2 long path support.
[assembly: System.Runtime.Versioning.TargetFramework(".NETFramework,Version=v4.6.2")]

namespace Alicization.WindowsInput {
  public sealed class InputReceipts {
    readonly string root, marker;
    public string Root { get { return root; } }
    static string FilePath(string value) {
      // Explicit extended paths keep Win32 file/ACL calls independent of the
      // machine-wide long-path setting. Public protocol paths stay canonical.
      if (value.StartsWith(@"\\?\", StringComparison.Ordinal)) return value;
      return value.StartsWith(@"\\", StringComparison.Ordinal) ? @"\\?\UNC\" + value.Substring(2) : @"\\?\" + value;
    }
    InputReceipts(string name, ulong tag, string hash) {
      if (name == null || hash == null || tag == 0
        || !Regex.IsMatch(name, @"\ALocal\\AlicizationInput_[a-f0-9]{32}\z", RegexOptions.CultureInvariant)
        || !Regex.IsMatch(hash, @"\A[a-f0-9]{64}\z", RegexOptions.CultureInvariant))
        throw new InvalidOperationException("WINDOWS_KEYBOARD_RECEIPT_BINDING_INVALID");
      // TEMP can fall back elsewhere when invalid or too long. Both native
      // participants load these same verified bytes in the protected root.
      root = Path.Combine(Path.GetDirectoryName(typeof(InputReceipts).Assembly.Location), "alicization-owned-input-" + name.Substring(name.Length - 32));
      marker = "AlicizationOwnedInputReceipt1\n" + hash + "\n" + tag.ToString(System.Globalization.CultureInfo.InvariantCulture) + "\n";
    }
    void AssertRoot() {
      var directory = new DirectoryInfo(FilePath(root));
      if (!directory.Exists || (directory.Attributes & FileAttributes.ReparsePoint) != 0)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_RECEIPT_ROOT_CHANGED");
      var security = directory.GetAccessControl();
      if (!security.AreAccessRulesProtected)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_RECEIPT_ACL_CHANGED");
      var allowed = new [] { WindowsIdentity.GetCurrent().User.Value, "S-1-5-18", "S-1-5-32-544" };
      var rules = security.GetAccessRules(true, true, typeof(SecurityIdentifier));
      if (rules.Count != 3) throw new InvalidOperationException("WINDOWS_KEYBOARD_RECEIPT_ACL_CHANGED");
      foreach (FileSystemAccessRule rule in rules) {
        if (Array.IndexOf(allowed, rule.IdentityReference.Value) < 0 || rule.IsInherited || rule.AccessControlType != AccessControlType.Allow
          || rule.FileSystemRights != FileSystemRights.FullControl)
          throw new InvalidOperationException("WINDOWS_KEYBOARD_RECEIPT_ACL_CHANGED");
      }
      var owner = new FileInfo(FilePath(Path.Combine(root, "session-owner.txt")));
      if (!owner.Exists || owner.Length > 256 || (owner.Attributes & FileAttributes.ReparsePoint) != 0 || File.ReadAllText(owner.FullName, Encoding.UTF8) != marker)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_RECEIPT_OWNER_CHANGED");
    }
    public static InputReceipts Create(string name, ulong tag, string hash) {
      var result = new InputReceipts(name, tag, hash);
      if (Directory.Exists(FilePath(result.root)) || File.Exists(FilePath(result.root)))
        throw new InvalidOperationException("WINDOWS_KEYBOARD_RECEIPT_ROOT_EXISTS");
      var security = new DirectorySecurity();
      security.SetAccessRuleProtection(true, false);
      foreach (var sid in new [] { WindowsIdentity.GetCurrent().User, new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null), new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null) })
        security.AddAccessRule(new FileSystemAccessRule(sid, FileSystemRights.FullControl, InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow));
      Directory.CreateDirectory(FilePath(result.root), security);
      using (var file = new FileStream(FilePath(Path.Combine(result.root, "session-owner.txt")), FileMode.CreateNew, FileAccess.Write, FileShare.Read)) {
        var bytes = Encoding.UTF8.GetBytes(result.marker);
        file.Write(bytes, 0, bytes.Length); file.Flush(true);
      }
      result.AssertRoot();
      return result;
    }
    public static InputReceipts OpenGuardian(string name, ulong tag, string hash) {
      var result = new InputReceipts(name, tag, hash);
      result.AssertRoot();
      return result;
    }
    public void Save(bool actor, string json) {
      if (json == null || Encoding.UTF8.GetByteCount(json) > 16384)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_RECEIPT_BUDGET");
      AssertRoot();
      using (var file = new FileStream(FilePath(Path.Combine(root, actor ? "actor-result.json" : "guardian-release.json")), FileMode.CreateNew, FileAccess.Write, FileShare.Read, 4096, FileOptions.WriteThrough)) {
        var bytes = new UTF8Encoding(false).GetBytes(json);
        file.Write(bytes, 0, bytes.Length); file.Flush(true);
      }
    }
  }
}
