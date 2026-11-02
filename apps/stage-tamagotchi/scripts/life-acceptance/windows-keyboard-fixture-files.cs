using System;
using System.IO;
using System.Text;

// Fixture IPC only. Sharing violations must never open a modal UI or turn a
// partially written command into an acknowledged focus change.
public static class AlicizationKeyboardFixtureFiles {
  public static string ReadCommand(string path) {
    try {
      using (var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete)) {
        if (stream.Length != 32) return null;
        var bytes = new byte[33];
        int length = stream.Read(bytes, 0, bytes.Length);
        if (length != 32) return null;
        string value = Encoding.ASCII.GetString(bytes, 0, length);
        foreach (char item in value) if (!(item >= '0' && item <= '9') && !(item >= 'a' && item <= 'f')) return null;
        return value;
      }
    } catch (IOException) { return null; }
  }

  public static bool WriteState(string path, string value) {
    string pending = path + "." + Guid.NewGuid().ToString("N") + ".pending";
    try {
      byte[] bytes = new UTF8Encoding(false).GetBytes(value);
      using (var stream = new FileStream(pending, FileMode.CreateNew, FileAccess.Write, FileShare.Read)) {
        stream.Write(bytes, 0, bytes.Length);
        stream.Flush(true);
      }
      if (File.Exists(path)) File.Replace(pending, path, null);
      else File.Move(pending, path);
      return true;
    } catch (IOException) { return false; }
    finally {
      // This exact path was created by this call; never clean unrelated files.
      if (File.Exists(pending)) File.Delete(pending);
    }
  }
}
