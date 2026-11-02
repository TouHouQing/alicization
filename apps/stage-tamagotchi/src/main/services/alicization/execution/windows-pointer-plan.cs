// Finite image-bound actions. The native boundary independently validates the
// entire route and derives flags itself; no caller-supplied SendInput payload.
using System;
using System.Collections.Generic;

namespace Alicization.WindowsInput {
  public sealed class PointerPoint { public int x, y; }
  public sealed class PointerAction { public string kind, button; public int wheel; public PointerPoint[] points; }
  public static class PointerPlan {
    static bool Contains(VisualRectangle rect, int x, int y) {
      return rect != null && rect.width > 0 && rect.height > 0 && x >= rect.left && y >= rect.top && (long)x < (long)rect.left + rect.width && (long)y < (long)rect.top + rect.height;
    }
    static bool Visible(VisualWindowGeometry geometry, int x, int y) {
      if (!Contains(geometry.clientBounds, x, y) || !Contains(geometry.virtualScreen, x, y)) return false;
      foreach (var display in geometry.displays) if (Contains(display, x, y)) return true;
      return false;
    }
    public static int Button(PointerAction action) { return action.button == "left" ? 1 : action.button == "right" ? 2 : action.button == "middle" ? 4 : 0; }
    public static int EventCount(PointerAction action) { return action.kind == "scroll" ? 2 : action.points.Length + 2; }
    public static void Validate(PointerAction action, VisualWindowGeometry geometry) {
      if (action == null || geometry == null || geometry.coordinateSpace != "screen-physical" || geometry.displays == null || geometry.displays.Length < 1 || geometry.displays.Length > 16
        || geometry.clientBounds == null || geometry.virtualScreen == null || geometry.virtualScreen.width < 1 || geometry.virtualScreen.height < 1 || geometry.virtualScreen.width > 32768 || geometry.virtualScreen.height > 32768
        || geometry.imageWidth < 1 || geometry.imageWidth > 4096 || geometry.imageHeight < 1 || geometry.imageHeight > 4096 || geometry.dpiX < 48 || geometry.dpiX > 768 || geometry.dpiY < 48 || geometry.dpiY > 768
        || action.points == null || action.points.Length < 1 || action.points.Length > 33)
        throw new InvalidOperationException("WINDOWS_POINTER_PLAN_INVALID");
      if ((action.kind == "click" && (Button(action) == 0 || action.points.Length != 1 || action.wheel != 0))
        || (action.kind == "drag" && (action.button != "left" || action.points.Length < 3 || action.wheel != 0))
        || (action.kind == "scroll" && (action.button != "none" || action.points.Length != 1 || action.wheel == 0 || action.wheel < -1200 || action.wheel > 1200 || action.wheel % 120 != 0))
        || (action.kind != "click" && action.kind != "drag" && action.kind != "scroll"))
        throw new InvalidOperationException("WINDOWS_POINTER_ACTION_INVALID");
      foreach (var display in geometry.displays) {
        if (display == null || display.width < 1 || display.height < 1 || display.width > 32768 || display.height > 32768
          || !Contains(geometry.virtualScreen, display.left, display.top) || !Contains(geometry.virtualScreen, checked(display.left + display.width - 1), checked(display.top + display.height - 1)))
          throw new InvalidOperationException("WINDOWS_POINTER_DISPLAY_INVALID");
      }
      PointerPoint previous = null;
      foreach (var point in action.points) {
        if (point == null || point.x < -131072 || point.x > 131072 || point.y < -131072 || point.y > 131072 || !Visible(geometry, point.x, point.y))
          throw new InvalidOperationException("WINDOWS_POINTER_POINT_OUTSIDE_DISPLAY");
        if (previous != null) {
          int dx = point.x - previous.x, dy = point.y - previous.y, distance = Math.Max(Math.Abs(dx), Math.Abs(dy));
          for (int step = 0; step <= distance; step++) {
            double fraction = distance == 0 ? 0 : (double)step / distance;
            if (!Visible(geometry, previous.x + (int)Math.Round(dx * fraction), previous.y + (int)Math.Round(dy * fraction)))
              throw new InvalidOperationException("WINDOWS_POINTER_ROUTE_CROSSES_GAP");
          }
        }
        previous = point;
      }
      if (action.kind == "drag" && action.points[0].x == previous.x && action.points[0].y == previous.y)
        throw new InvalidOperationException("WINDOWS_POINTER_DRAG_ZERO_DISTANCE");
    }
    public static void RequireSnapshot(VisualWindowSnapshot expected, PointerAction action) {
      Validate(action, expected.geometry);
      var actual = VisualWindow.Capture(expected.owner);
      var a = actual.geometry; var b = expected.geometry;
      if (!a.clientBounds.Same(b.clientBounds) || !a.virtualScreen.Same(b.virtualScreen) || a.displays.Length != b.displays.Length
        || a.imageWidth != b.imageWidth || a.imageHeight != b.imageHeight || a.dpiX != b.dpiX || a.dpiY != b.dpiY
        || actual.imageSha256 != expected.imageSha256 || actual.authority.userSid != expected.authority.userSid
        || actual.authority.sessionId != expected.authority.sessionId || actual.authority.integrityLevel != expected.authority.integrityLevel || actual.authority.ownerWindowId != expected.authority.ownerWindowId)
        throw new InvalidOperationException("WINDOWS_POINTER_OBSERVATION_CHANGED");
      for (int index = 0; index < a.displays.Length; index++) if (!a.displays[index].Same(b.displays[index])) throw new InvalidOperationException("WINDOWS_POINTER_DISPLAYS_CHANGED");
      foreach (var point in action.points) if (!VisualWindow.PointerSurfaceCurrent(expected.owner, b.clientBounds, point.x, point.y, expected.authority.ownerWindowId)) throw new InvalidOperationException("WINDOWS_POINTER_SURFACE_CHANGED");
      // Raw images never enter input receipts. Capture's only retained value is
      // its content digest and actual physical geometry.
      actual.png = null;
    }
    public static InputEvent Move(PointerPoint point, VisualWindowGeometry geometry, ulong tag) {
      var screen = geometry.virtualScreen;
      int x = Math.Max(1, (int)Math.Ceiling((double)(point.x - screen.left) * 65536 / screen.width));
      int y = Math.Max(1, (int)Math.Ceiling((double)(point.y - screen.top) * 65536 / screen.height));
      return Event(0xC001, x, y, 0, tag);
    }
    public static InputEvent Event(uint flags, int x, int y, int data, ulong tag) {
      return new InputEvent { Type = 0, Data = new InputUnion { Mouse = new MouseEvent { X = x, Y = y, Data = unchecked((uint)data), Flags = flags, ExtraInfo = new UIntPtr(tag) } } };
    }
    public static uint DownFlag(int button) { return button == 1 ? 2u : button == 2 ? 8u : button == 4 ? 32u : 0u; }
    public static uint UpFlag(int button) { return DownFlag(button) * 2; }
    public static int DownMessage(int button) { return button == 1 ? 0x201 : button == 2 ? 0x204 : 0x207; }
  }
}
