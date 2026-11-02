// Read-only single-window capture. No hook installation, foreground activation,
// cursor movement, keyboard injection, shell text or caller-chosen file paths.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using Microsoft.Win32.SafeHandles;

namespace Alicization.WindowsInput {
  public sealed class VisualWindowOwner {
    public string windowId, processStartTicks, windowClass, desktop;
    public int processId;
  }
  public sealed class VisualRectangle {
    public int left, top, width, height;
    public bool Same(VisualRectangle other) { return other != null && left == other.left && top == other.top && width == other.width && height == other.height; }
  }
  public sealed class VisualWindowAuthority {
    public string userSid, ownerWindowId;
    public uint sessionId, integrityLevel;
  }
  public sealed class VisualWindowGeometry {
    public string coordinateSpace;
    public VisualRectangle clientBounds, virtualScreen;
    public VisualRectangle[] displays;
    public int imageWidth, imageHeight;
    public uint dpiX, dpiY;
  }
  public sealed class VisualWindowSnapshot {
    public bool ok = true, foregroundActivated = false;
    public VisualWindowOwner owner;
    public VisualWindowAuthority authority;
    public VisualWindowGeometry geometry;
    public long observedAt;
    public string imageSha256, png;
    public int inputEvents = 0;
  }
  public static class VisualWindow {
    [StructLayout(LayoutKind.Sequential)] struct Rect { public int left, top, right, bottom; }
    [StructLayout(LayoutKind.Sequential)] struct Point { public int x, y; }
    delegate bool MonitorCallback(IntPtr monitor, IntPtr dc, ref Rect rect, IntPtr data);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr window);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(Point point);
    [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr window, uint flags);
    [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr window, uint command);
    [DllImport("user32.dll", SetLastError=true)] static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr window, StringBuilder value, int count);
    [DllImport("user32.dll")] static extern IntPtr GetThreadDesktop(uint thread);
    [DllImport("user32.dll", SetLastError=true)] static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
    [DllImport("user32.dll")] static extern bool CloseDesktop(IntPtr desktop);
    [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern bool GetUserObjectInformation(IntPtr handle, int index, StringBuilder value, uint bytes, out uint needed);
    [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr window, out Rect rectangle);
    [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr window, ref Point point);
    [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr window);
    [DllImport("user32.dll")] static extern IntPtr GetWindowDpiAwarenessContext(IntPtr window);
    [DllImport("user32.dll", SetLastError=true)] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] static extern int GetSystemMetrics(int index);
    [DllImport("user32.dll")] static extern bool EnumDisplayMonitors(IntPtr dc, IntPtr clip, MonitorCallback callback, IntPtr data);
    [DllImport("user32.dll", SetLastError=true)] static extern bool PrintWindow(IntPtr window, IntPtr dc, uint flags);
    [DllImport("kernel32.dll")] static extern bool ProcessIdToSessionId(uint processId, out uint sessionId);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    [DllImport("advapi32.dll", SetLastError=true)] static extern bool OpenProcessToken(SafeWaitHandle process, uint access, out IntPtr token);
    [DllImport("advapi32.dll", SetLastError=true)] static extern bool GetTokenInformation(IntPtr token, int kind, IntPtr value, int bytes, out int needed);
    [DllImport("advapi32.dll")] static extern IntPtr GetSidSubAuthorityCount(IntPtr sid);
    [DllImport("advapi32.dll")] static extern IntPtr GetSidSubAuthority(IntPtr sid, uint index);

    static string DesktopName(uint thread) {
      var handle = GetThreadDesktop(thread);
      var name = new StringBuilder(256); uint needed;
      if (handle == IntPtr.Zero || !GetUserObjectInformation(handle, 2, name, 512, out needed))
        throw new InvalidOperationException("WINDOWS_VISUAL_DESKTOP_UNAVAILABLE");
      return name.ToString();
    }
    static uint Integrity(IntPtr token) {
      int size; GetTokenInformation(token, 25, IntPtr.Zero, 0, out size);
      if (size < IntPtr.Size || size > 4096) throw new InvalidOperationException("WINDOWS_VISUAL_TOKEN_INVALID");
      var buffer = Marshal.AllocHGlobal(size);
      try {
        if (!GetTokenInformation(token, 25, buffer, size, out size)) throw new InvalidOperationException("WINDOWS_VISUAL_TOKEN_UNAVAILABLE");
        var sid = Marshal.ReadIntPtr(buffer); int count = Marshal.ReadByte(GetSidSubAuthorityCount(sid));
        if (count < 1 || count > 15) throw new InvalidOperationException("WINDOWS_VISUAL_TOKEN_INVALID");
        return unchecked((uint)Marshal.ReadInt32(GetSidSubAuthority(sid, (uint)(count - 1))));
      }
      finally { Marshal.FreeHGlobal(buffer); }
    }
    static VisualWindowAuthority RequireIdentity(VisualWindowOwner expected, SafeWaitHandle process) {
      long value;
      if (expected == null || expected.processId <= 0 || !long.TryParse(expected.windowId, NumberStyles.None, CultureInfo.InvariantCulture, out value) || value <= 0)
        throw new InvalidOperationException("WINDOWS_VISUAL_WINDOW_IDENTITY_INVALID");
      var window = new IntPtr(value); uint actualPid;
      uint thread = GetWindowThreadProcessId(window, out actualPid);
      var name = new StringBuilder(256);
      if (!Native.ProcessAlive(process) || !IsWindow(window) || thread == 0 || actualPid != (uint)expected.processId
        || GetClassName(window, name, name.Capacity) < 1 || name.ToString() != expected.windowClass
        || DesktopName(thread) != expected.desktop || DesktopName(GetCurrentThreadId()) != expected.desktop)
        throw new InvalidOperationException("WINDOWS_VISUAL_WINDOW_IDENTITY_CHANGED");
      if (!IsWindowVisible(window) || IsIconic(window)) throw new InvalidOperationException("WINDOWS_VISUAL_WINDOW_NOT_VISIBLE");
      uint session;
      if (!ProcessIdToSessionId(actualPid, out session) || session != Process.GetCurrentProcess().SessionId)
        throw new InvalidOperationException("WINDOWS_VISUAL_SESSION_CHANGED");
      IntPtr token;
      if (!OpenProcessToken(process, 8, out token)) throw new InvalidOperationException("WINDOWS_VISUAL_OWNER_UNAVAILABLE");
      try {
        using (var identity = new WindowsIdentity(token)) {
          var current = WindowsIdentity.GetCurrent();
          using (current) {
            if (identity.User == null || current.User == null || identity.User.Value != current.User.Value)
              throw new InvalidOperationException("WINDOWS_VISUAL_USER_CHANGED");
          }
          uint integrity = Integrity(token);
          using (var currentProcess = Native.HoldProcess(Process.GetCurrentProcess().Id, Process.GetCurrentProcess().StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture))) {
            IntPtr currentToken;
            if (!OpenProcessToken(currentProcess, 8, out currentToken)) throw new InvalidOperationException("WINDOWS_VISUAL_OWNER_UNAVAILABLE");
            try { if (integrity > Integrity(currentToken)) throw new InvalidOperationException("WINDOWS_VISUAL_INTEGRITY_UNSUPPORTED"); }
            finally { CloseHandle(currentToken); }
          }
          return new VisualWindowAuthority { userSid = identity.User.Value, sessionId = session, integrityLevel = integrity, ownerWindowId = WindowOwnerId(window) };
        }
      }
      finally { CloseHandle(token); }
    }
    static VisualRectangle Client(IntPtr window) {
      Rect rect; var point = new Point();
      if (!GetClientRect(window, out rect) || !ClientToScreen(window, ref point)) throw new InvalidOperationException("WINDOWS_VISUAL_CLIENT_UNAVAILABLE");
      long width = (long)rect.right - rect.left, height = (long)rect.bottom - rect.top;
      if (width < 1 || height < 1 || width > 16384 || height > 16384 || width * height > 16 * 1024 * 1024)
        throw new InvalidOperationException("WINDOWS_VISUAL_CAPTURE_PIXEL_BUDGET");
      return new VisualRectangle { left = point.x, top = point.y, width = (int)width, height = (int)height };
    }
    // Hook-time metadata only: no screenshot, token query, waiting or activation.
    // The caller separately holds the original process handle for its lifetime.
    static string WindowOwnerId(IntPtr window) {
      var owner = GetWindow(window, 4);
      return owner == IntPtr.Zero ? null : owner.ToInt64().ToString(CultureInfo.InvariantCulture);
    }
    // Metadata only. Callers separately retain the original process identity.
    public static bool OwnerContextCurrent(VisualWindowOwner expected, string ownerWindowId) {
      long id;
      if (expected == null || !long.TryParse(expected.windowId, NumberStyles.None, CultureInfo.InvariantCulture, out id) || id <= 0) return false;
      uint pid;
      var window = new IntPtr(id);
      return GetWindowThreadProcessId(window, out pid) != 0 && pid == (uint)expected.processId && WindowOwnerId(window) == ownerWindowId;
    }
    public static bool PointerSurfaceCurrent(VisualWindowOwner expected, VisualRectangle client, int x, int y, string ownerWindowId) {
      var oldDpi = SetThreadDpiAwarenessContext(new IntPtr(-4));
      if (oldDpi == IntPtr.Zero) return false;
      try {
        if (expected == null || client == null || x < client.left || y < client.top || x >= (long)client.left + client.width || y >= (long)client.top + client.height)
          return false;
        var inputDesktop = OpenInputDesktop(0, false, 1);
        if (inputDesktop == IntPtr.Zero) return false;
        try {
          var inputName = new StringBuilder(256); uint needed;
          if (!GetUserObjectInformation(inputDesktop, 2, inputName, 512, out needed) || inputName.ToString() != expected.desktop) return false;
        }
        finally { CloseDesktop(inputDesktop); }
        long id;
        if (!long.TryParse(expected.windowId, NumberStyles.None, CultureInfo.InvariantCulture, out id) || id <= 0) return false;
        var window = new IntPtr(id); uint processId;
        uint thread = GetWindowThreadProcessId(window, out processId);
        var name = new StringBuilder(256);
        if (thread == 0 || processId != (uint)expected.processId || GetForegroundWindow() != window || !IsWindowVisible(window) || IsIconic(window)
          || GetClassName(window, name, 256) < 1 || name.ToString() != expected.windowClass
          || DesktopName(thread) != expected.desktop || DesktopName(GetCurrentThreadId()) != expected.desktop || !Client(window).Same(client) || WindowOwnerId(window) != ownerWindowId)
          return false;
        var hit = WindowFromPoint(new Point { x = x, y = y });
        return hit != IntPtr.Zero && GetAncestor(hit, 2) == window && GetForegroundWindow() == window;
      }
      catch { return false; }
      finally { SetThreadDpiAwarenessContext(oldDpi); }
    }
    public static VisualWindowSnapshot Capture(VisualWindowOwner expected) {
      var oldDpi = SetThreadDpiAwarenessContext(new IntPtr(-4));
      if (oldDpi == IntPtr.Zero) throw new InvalidOperationException("WINDOWS_VISUAL_PHYSICAL_COORDINATES_UNAVAILABLE");
      try {
        using (var process = Native.HoldProcess(expected.processId, expected.processStartTicks)) {
          var authority = RequireIdentity(expected, process);
          var window = new IntPtr(long.Parse(expected.windowId, CultureInfo.InvariantCulture));
          var rectangle = Client(window); uint dpi = GetDpiForWindow(window);
          if (dpi < 48 || dpi > 768) throw new InvalidOperationException("WINDOWS_VISUAL_DPI_UNAVAILABLE");
          var displays = new List<VisualRectangle>();
          MonitorCallback callback = delegate(IntPtr monitor, IntPtr dc, ref Rect rect, IntPtr data) {
            if (displays.Count >= 16) return false;
            displays.Add(new VisualRectangle { left = rect.left, top = rect.top, width = rect.right - rect.left, height = rect.bottom - rect.top });
            return true;
          };
          if (!EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, callback, IntPtr.Zero) || displays.Count == 0)
            throw new InvalidOperationException("WINDOWS_VISUAL_DISPLAYS_UNAVAILABLE");
          var virtualScreen = new VisualRectangle { left = GetSystemMetrics(76), top = GetSystemMetrics(77), width = GetSystemMetrics(78), height = GetSystemMetrics(79) };
          if (virtualScreen.width < 1 || virtualScreen.height < 1 || virtualScreen.width > 32768 || virtualScreen.height > 32768)
            throw new InvalidOperationException("WINDOWS_VISUAL_DISPLAY_BUDGET");
          byte[] png;
          int imageWidth, imageHeight;
          // PrintWindow asks the target to paint in its own coordinate units.
          // A DPI-unaware window can paint 320px while occupying 400 physical
          // pixels at125%. Keep that source raster distinct from physical bounds.
          var windowDpiContext = GetWindowDpiAwarenessContext(window);
          if (windowDpiContext == IntPtr.Zero) throw new InvalidOperationException("WINDOWS_VISUAL_CAPTURE_DPI_UNAVAILABLE");
          VisualRectangle raster;
          var captureContext = SetThreadDpiAwarenessContext(windowDpiContext);
          if (captureContext == IntPtr.Zero) throw new InvalidOperationException("WINDOWS_VISUAL_CAPTURE_DPI_UNAVAILABLE");
          try { raster = Client(window); }
          finally { SetThreadDpiAwarenessContext(captureContext); }
          using (var bitmap = new Bitmap(raster.width, raster.height, PixelFormat.Format32bppArgb)) {
            using (var graphics = Graphics.FromImage(bitmap)) {
              var dc = graphics.GetHdc();
              var drawingContext = SetThreadDpiAwarenessContext(windowDpiContext);
              try {
                if (drawingContext == IntPtr.Zero) throw new InvalidOperationException("WINDOWS_VISUAL_CAPTURE_DPI_UNAVAILABLE");
                if (!PrintWindow(window, dc, 3)) throw new InvalidOperationException("WINDOWS_VISUAL_CAPTURE_UNAVAILABLE");
              }
              finally { if (drawingContext != IntPtr.Zero) SetThreadDpiAwarenessContext(drawingContext); graphics.ReleaseHdc(dc); }
            }
            RequireIdentity(expected, process);
            if (!Client(window).Same(rectangle) || GetDpiForWindow(window) != dpi)
              throw new InvalidOperationException("WINDOWS_VISUAL_CAPTURE_GEOMETRY_CHANGED");
            double scale = Math.Min(1.0, 2048.0 / Math.Max(raster.width, raster.height));
            imageWidth = Math.Max(1, (int)Math.Floor(raster.width * scale));
            imageHeight = Math.Max(1, (int)Math.Floor(raster.height * scale));
            using (var image = new Bitmap(imageWidth, imageHeight, PixelFormat.Format32bppArgb)) {
              using (var graphics = Graphics.FromImage(image)) {
                graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                graphics.DrawImage(bitmap, new Rectangle(0, 0, imageWidth, imageHeight));
              }
              using (var stream = new MemoryStream()) {
                image.Save(stream, ImageFormat.Png);
                if (stream.Length > 4 * 1024 * 1024) throw new InvalidOperationException("WINDOWS_VISUAL_CAPTURE_BYTE_BUDGET");
                png = stream.ToArray();
              }
            }
          }
          var afterAuthority = RequireIdentity(expected, process);
          if (afterAuthority.ownerWindowId != authority.ownerWindowId) throw new InvalidOperationException("WINDOWS_VISUAL_OWNER_CONTEXT_CHANGED");
          if (!Client(window).Same(rectangle) || GetDpiForWindow(window) != dpi)
            throw new InvalidOperationException("WINDOWS_VISUAL_CAPTURE_GEOMETRY_CHANGED");
          string digest;
          using (var sha = SHA256.Create()) digest = BitConverter.ToString(sha.ComputeHash(png)).Replace("-", "").ToLowerInvariant();
          return new VisualWindowSnapshot { owner = expected, authority = authority, geometry = new VisualWindowGeometry { coordinateSpace = "screen-physical", clientBounds = rectangle, virtualScreen = virtualScreen, displays = displays.ToArray(), imageWidth = imageWidth, imageHeight = imageHeight, dpiX = dpi, dpiY = dpi }, observedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), imageSha256 = digest, png = Convert.ToBase64String(png) };
        }
      }
      finally { SetThreadDpiAwarenessContext(oldDpi); }
    }
  }
}
