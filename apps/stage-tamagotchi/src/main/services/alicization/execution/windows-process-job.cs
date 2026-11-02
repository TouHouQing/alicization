// Finite process ownership, not an OS security sandbox. Ordinary CreateProcess
// descendants inherit this job, including detached console processes. WMI,
// service, remote and other out-of-process handoffs need separate reconciliation.
// https://learn.microsoft.com/windows/win32/procthread/job-objects
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Script.Serialization;

namespace Alicization.ProcessJobs {
  public static class Program {
    [StructLayout(LayoutKind.Sequential)] struct BasicLimits {
      public long ProcessTime, JobTime;
      public uint Flags;
      public UIntPtr MinimumWorkingSet, MaximumWorkingSet;
      public uint ActiveLimit;
      public UIntPtr Affinity;
      public uint Priority, Scheduling;
    }
    [StructLayout(LayoutKind.Sequential)] struct IoCounters {
      public ulong Reads, Writes, Other, ReadBytes, WriteBytes, OtherBytes;
    }
    [StructLayout(LayoutKind.Sequential)] struct ExtendedLimits {
      public BasicLimits Basic;
      public IoCounters Io;
      public UIntPtr ProcessMemory, JobMemory, PeakProcessMemory, PeakJobMemory;
    }
    [StructLayout(LayoutKind.Sequential)] struct Accounting {
      public long UserTime, KernelTime, ThisUserTime, ThisKernelTime;
      public uint PageFaults, TotalProcesses, ActiveProcesses, TerminatedProcesses;
    }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] struct Startup {
      public int Size;
      public string Reserved, Desktop, Title;
      public uint X, Y, Width, Height, XChars, YChars, Fill, Flags;
      public ushort Show, ReservedSize;
      public IntPtr ReservedBytes, Input, Output, Error;
    }
    [StructLayout(LayoutKind.Sequential)] struct StartupEx { public Startup Basic; public IntPtr Attributes; }
    [StructLayout(LayoutKind.Sequential)] struct ProcessInfo {
      public IntPtr Process, Thread;
      public uint ProcessId, ThreadId;
    }
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern IntPtr CreateJobObject(IntPtr security, string name);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool SetInformationJobObject(IntPtr job, int kind, ref ExtendedLimits limits, uint size);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool QueryInformationJobObject(IntPtr job, int kind, out Accounting value, uint size, IntPtr written);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, uint flags, ref UIntPtr bytes);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, UIntPtr attribute, IntPtr value, UIntPtr bytes, IntPtr previous, IntPtr returned);
    [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool TerminateJobObject(IntPtr job, uint code);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool TerminateProcess(IntPtr process, uint code);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool GetExitCodeProcess(IntPtr process, out uint code);
    [DllImport("kernel32.dll", SetLastError = true)] static extern uint ResumeThread(IntPtr thread);
    [DllImport("kernel32.dll", SetLastError = true)] static extern uint WaitForSingleObject(IntPtr handle, uint timeout);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int kind);
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern bool CreateProcessW(string executable, StringBuilder command, IntPtr processSecurity, IntPtr threadSecurity, bool inherit, uint flags, IntPtr environment, string cwd, ref StartupEx startup, out ProcessInfo process);

    static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 524288, RecursionLimit = 16 };
    static readonly UTF8Encoding Utf8 = new UTF8Encoding(false, true);
    static byte[] Key;
    static string Root, Nonce, Binding;
    static int GuardId, ParentId;
    static long Expires;
    static Process Parent;
    static IntPtr ParentHandle, Job;
    static ProcessInfo Child;
    static bool Started, Assigned;
    static string Stage = "REQUEST";
    static long Now() { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); }
    static Dictionary<string, object> Object(object value) {
      var result = value as Dictionary<string, object>;
      if (result == null) throw new InvalidOperationException("OBJECT");
      return result;
    }
    static string Text(Dictionary<string, object> value, string name, int maximum) {
      object raw;
      var result = value.TryGetValue(name, out raw) ? raw as string : null;
      if (String.IsNullOrEmpty(result) || result.Length > maximum || result.IndexOf('\0') >= 0) throw new InvalidOperationException("TEXT");
      return result;
    }
    static long Integer(Dictionary<string, object> value, string name, long minimum, long maximum) {
      object raw;
      if (!value.TryGetValue(name, out raw) || (!(raw is int) && !(raw is long))) throw new InvalidOperationException("INTEGER");
      long result = Convert.ToInt64(raw, CultureInfo.InvariantCulture);
      if (result < minimum || result > maximum) throw new InvalidOperationException("INTEGER_RANGE");
      return result;
    }
    static byte[] Hex(string text) {
      if (!Regex.IsMatch(text, @"\A[a-f0-9]{64}\z", RegexOptions.CultureInvariant)) throw new InvalidOperationException("HASH");
      var result = new byte[32];
      for (int index = 0; index < result.Length; index++) result[index] = Convert.ToByte(text.Substring(index * 2, 2), 16);
      return result;
    }
    static string Hash(byte[] value) {
      using (var hmac = new HMACSHA256(Key)) return BitConverter.ToString(hmac.ComputeHash(value)).Replace("-", "").ToLowerInvariant();
    }
    static Dictionary<string, object> Decode(string text, bool initial) {
      var envelope = Object(Json.DeserializeObject(text));
      if (envelope.Count != (initial ? 3 : 2)) throw new InvalidOperationException("ENVELOPE");
      if (initial) Key = Hex(Text(envelope, "key", 64));
      byte[] bytes = Convert.FromBase64String(Text(envelope, "payload", 350000));
      if (bytes.Length > 262144) throw new InvalidOperationException("BUDGET");
      byte[] actual = Hex(Text(envelope, "mac", 64)), expected = Hex(Hash(bytes));
      int mismatch = 0;
      for (int index = 0; index < expected.Length; index++) mismatch |= actual[index] ^ expected[index];
      if (mismatch != 0) throw new InvalidOperationException("MAC");
      return Object(Json.DeserializeObject(Utf8.GetString(bytes)));
    }
    static string ReadInitial() {
      // Read exactly through the control prefix, without a StreamReader's
      // read-ahead. The real process inherits the remaining original stdin.
      Stream input = Console.OpenStandardInput();
      var bytes = new List<byte>();
      while (true) {
        int value = input.ReadByte();
        if (value == -1) throw new InvalidOperationException("EOF");
        if (value == 10) return Utf8.GetString(bytes.ToArray());
        if (bytes.Count >= 524288) throw new InvalidOperationException("PREFIX_BUDGET");
        bytes.Add((byte)value);
      }
    }
    static Dictionary<string, object> ReadControl(string name, string kind) {
      string path = Path.Combine(Root, name);
      if (!File.Exists(path)) return null;
      if ((File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0) throw new InvalidOperationException("CONTROL_REPARSE");
      var bytes = File.ReadAllBytes(path);
      if (bytes.Length > 16384) throw new InvalidOperationException("CONTROL_BUDGET");
      var value = Decode(Utf8.GetString(bytes), false);
      if (Integer(value, "version", 1, 1) != 1 || Text(value, "kind", 16) != kind || Text(value, "nonce", 64) != Nonce || Text(value, "bindingHash", 64) != Binding || Integer(value, "guardPid", 1, int.MaxValue) != GuardId || Integer(value, "parentPid", 1, int.MaxValue) != ParentId) throw new InvalidOperationException("CONTROL_BINDING");
      return value;
    }
    static void WriteReceipt(string name, object value) {
      byte[] bytes = Utf8.GetBytes(Json.Serialize(value));
      string text = Json.Serialize(new { payload = Convert.ToBase64String(bytes), mac = Hash(bytes) });
      string destination = Path.Combine(Root, name), pending = destination + "." + Guid.NewGuid().ToString("N") + ".pending";
      try {
        using (var stream = new FileStream(pending, FileMode.CreateNew, FileAccess.Write, FileShare.Read)) {
          byte[] encoded = Utf8.GetBytes(text);
          stream.Write(encoded, 0, encoded.Length);
          stream.Flush(true);
        }
        File.Move(pending, destination);
      }
      finally { if (File.Exists(pending)) File.Delete(pending); }
    }
    static string Quote(string value) {
      var output = new StringBuilder("\"");
      int backslashes = 0;
      foreach (char character in value) {
        if (character == '\\') { backslashes++; continue; }
        if (character == '"') output.Append('\\', backslashes * 2 + 1);
        else output.Append('\\', backslashes);
        backslashes = 0;
        output.Append(character);
      }
      output.Append('\\', backslashes * 2);
      return output.Append('"').ToString();
    }
    static uint ActiveProcesses() {
      if (Job == IntPtr.Zero) return 0;
      Accounting value;
      if (!QueryInformationJobObject(Job, 1, out value, (uint)Marshal.SizeOf(typeof(Accounting)), IntPtr.Zero)) throw new InvalidOperationException("JOB_QUERY");
      return value.ActiveProcesses;
    }
    static bool ParentAlive() { return WaitForSingleObject(ParentHandle, 0) == 258; }
    static bool StopTree() {
      if (Job != IntPtr.Zero && Assigned) TerminateJobObject(Job, 130);
      else if (Child.Process != IntPtr.Zero) TerminateProcess(Child.Process, 130);
      long deadline = Now() + 5000;
      do {
        if (ActiveProcesses() == 0 && (Child.Process == IntPtr.Zero || WaitForSingleObject(Child.Process, 0) == 0)) return true;
        Thread.Sleep(20);
      } while (Now() < deadline);
      return false;
    }
    static bool Run(Dictionary<string, object> request, out uint exitCode, out string reason) {
      exitCode = 125;
      reason = "admission-refused";
      ParentId = (int)Integer(request, "parentProcessId", 1, int.MaxValue);
      if (ParentId == GuardId) throw new InvalidOperationException("SELF_PARENT");
      Parent = Process.GetProcessById(ParentId);
      ParentHandle = Parent.Handle;
      if (!ParentAlive() || ReadControl("stop.json", "stop") != null) { reason = "stopped-before-create"; return true; }
      string executable = Text(request, "executable", 32760), cwd = Text(request, "cwd", 32760);
      if (!Path.IsPathRooted(executable) || !executable.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) || !File.Exists(executable) || !Path.IsPathRooted(cwd) || !Directory.Exists(cwd)) throw new InvalidOperationException("TARGET");
      object raw;
      var arguments = request.TryGetValue("arguments", out raw) ? raw as object[] : null;
      if (arguments == null || arguments.Length > 512) throw new InvalidOperationException("ARGUMENTS");
      var command = new StringBuilder(Quote(executable));
      foreach (object argument in arguments) {
        var text = argument as string;
        if (text == null || text.Length > 32760 || text.IndexOf('\0') >= 0) throw new InvalidOperationException("ARGUMENT");
        command.Append(' ').Append(Quote(text));
      }
      if (request.TryGetValue("shellCommandLine", out raw) && raw != null) {
        if (!String.Equals(Path.GetFullPath(executable), Path.Combine(Environment.SystemDirectory, "cmd.exe"), StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("SHELL_TARGET");
        command = new StringBuilder(Text(request, "shellCommandLine", 32760));
      }
      if (command.Length > 32760) throw new InvalidOperationException("COMMAND_BUDGET");
      Stage = "JOB_CREATE";
      Job = CreateJobObject(IntPtr.Zero, null);
      if (Job == IntPtr.Zero) throw new InvalidOperationException("JOB_CREATE");
      var limits = new ExtendedLimits();
      limits.Basic.Flags = 0x2000; // KILL_ON_JOB_CLOSE; no breakaway permission.
      Stage = "JOB_LIMITS";
      if (!SetInformationJobObject(Job, 9, ref limits, (uint)Marshal.SizeOf(typeof(ExtendedLimits)))) throw new InvalidOperationException("JOB_LIMITS");
      // Job membership is part of creation. A separate create/assign pair can
      // leave a suspended orphan when its guard dies between the two calls.
      // Windows 10+ PROC_THREAD_ATTRIBUTE_JOB_LIST; no direct-spawn fallback.
      IntPtr attributes = IntPtr.Zero, jobHandles = IntPtr.Zero;
      bool initialized = false;
      try {
        UIntPtr size = UIntPtr.Zero;
        Stage = "ATTRIBUTES_SIZE";
        InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref size);
        ulong count = size.ToUInt64();
        if (count == 0 || count > 1048576) throw new InvalidOperationException("ATTRIBUTES_SIZE");
        attributes = Marshal.AllocHGlobal((int)count);
        Stage = "ATTRIBUTES_INIT";
        if (!InitializeProcThreadAttributeList(attributes, 1, 0, ref size)) throw new InvalidOperationException("ATTRIBUTES_INIT");
        initialized = true;
        jobHandles = Marshal.AllocHGlobal(IntPtr.Size);
        Marshal.WriteIntPtr(jobHandles, Job);
        Stage = "JOB_ATTRIBUTE";
        if (!UpdateProcThreadAttribute(attributes, 0, new UIntPtr(0x0002000D), jobHandles, new UIntPtr((uint)IntPtr.Size), IntPtr.Zero, IntPtr.Zero)) throw new InvalidOperationException("JOB_ATTRIBUTE");
        var startup = new StartupEx { Basic = new Startup { Size = Marshal.SizeOf(typeof(StartupEx)), Flags = 0x101, Show = 0, Input = GetStdHandle(-10), Output = GetStdHandle(-11), Error = GetStdHandle(-12) }, Attributes = attributes };
        Stage = "CHILD_CREATE";
        if (!CreateProcessW(executable, command, IntPtr.Zero, IntPtr.Zero, true, 0x08080404, IntPtr.Zero, cwd, ref startup, out Child)) throw new InvalidOperationException("CHILD_CREATE");
        Assigned = true;
      }
      finally {
        if (initialized) DeleteProcThreadAttributeList(attributes);
        if (jobHandles != IntPtr.Zero) Marshal.FreeHGlobal(jobHandles);
        if (attributes != IntPtr.Zero) Marshal.FreeHGlobal(attributes);
      }
      string guardTicks = Process.GetCurrentProcess().StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture);
      string childTicks;
      using (var child = Process.GetProcessById((int)Child.ProcessId)) childTicks = child.StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture);
      Stage = "READY";
      WriteReceipt("ready.json", new { version = 1, kind = "ready", nonce = Nonce, bindingHash = Binding, guardPid = GuardId, guardStartTicks = guardTicks, parentPid = ParentId, parentStartTicks = Parent.StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture), rootPid = Child.ProcessId, rootStartTicks = childTicks, started = false });
      Stage = "ADMISSION";
      while (Now() < Expires && ParentAlive()) {
        if (ReadControl("stop.json", "stop") != null) { reason = "stopped-before-resume"; return StopTree(); }
        var admission = ReadControl("go.json", "go");
        if (admission != null) {
          long current = Now(), authorizedAt = Integer(admission, "authorizedAt", 1, long.MaxValue), until = Integer(admission, "expiresAt", 1, long.MaxValue);
          if (Integer(admission, "rootPid", 1, int.MaxValue) != Child.ProcessId || authorizedAt > current || current - authorizedAt > 2000 || until <= current || until > Expires) throw new InvalidOperationException("ADMISSION_EXPIRED");
          Stage = "RESUME";
          if (ResumeThread(Child.Thread) == uint.MaxValue) throw new InvalidOperationException("RESUME");
          Started = true;
          break;
        }
        Thread.Sleep(15);
      }
      if (!Started) { reason = ParentAlive() ? "admission-expired" : "parent-exited"; return StopTree(); }
      reason = "completed";
      while (WaitForSingleObject(Child.Process, 25) == 258) {
        if (!ParentAlive()) { reason = "parent-exited"; break; }
        if (ReadControl("stop.json", "stop") != null) { reason = "stopped"; break; }
      }
      Stage = "DRAIN";
      if (reason != "completed" || ActiveProcesses() > 0) {
        if (!StopTree()) { reason = "drain-unverified"; return false; }
      }
      if (!GetExitCodeProcess(Child.Process, out exitCode)) throw new InvalidOperationException("EXIT_CODE");
      return ActiveProcesses() == 0;
    }
    public static int Main(string[] args) {
      uint exitCode = 125;
      string reason = "guard-failed", error = null;
      bool stopped = false;
      try {
        if (args.Length != 1) return 125;
        Root = Path.GetFullPath(args[0]);
        if (!Directory.Exists(Root) || (File.GetAttributes(Root) & FileAttributes.ReparsePoint) != 0) return 125;
        var request = Decode(ReadInitial(), true);
        if (request.Count != 10 || Integer(request, "version", 1, 1) != 1) throw new InvalidOperationException("REQUEST");
        Nonce = Text(request, "nonce", 64); Hex(Nonce);
        Binding = Text(request, "bindingHash", 64); Hex(Binding);
        Text(request, "owner", 512);
        Expires = Integer(request, "expiresAt", 1, long.MaxValue);
        if (Expires <= Now() || Expires - Now() > 120000) throw new InvalidOperationException("EXPIRY");
        GuardId = Process.GetCurrentProcess().Id;
        stopped = Run(request, out exitCode, out reason);
      }
      catch (Exception) {
        error = "WINDOWS_PROCESS_JOB_" + Stage + "_" + Marshal.GetLastWin32Error().ToString(CultureInfo.InvariantCulture);
        reason = "guard-failed";
        try { stopped = StopTree(); } catch { stopped = false; }
      }
      finally {
        try {
          if (Key != null && Nonce != null && Binding != null && Root != null) WriteReceipt("result.json", new { version = 1, kind = "result", nonce = Nonce, bindingHash = Binding, guardPid = GuardId, parentPid = ParentId, rootPid = Child.ProcessId, started = Started, treeStopped = stopped, activeProcesses = stopped ? 0 : -1, exitCode = exitCode, reason = reason, errorCode = error, observedAt = Now() });
        }
        catch { stopped = false; }
        if (Job != IntPtr.Zero) CloseHandle(Job);
        if (Child.Thread != IntPtr.Zero) CloseHandle(Child.Thread);
        if (Child.Process != IntPtr.Zero) CloseHandle(Child.Process);
        if (Parent != null) Parent.Dispose();
      }
      return stopped && reason == "completed" && error == null ? unchecked((int)exitCode) : 125;
    }
  }
}
