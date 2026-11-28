"""Q09-A v2 sign faces, drawn in Blender (text objects in a Japanese font + simple icon meshes, flat Workbench render).

make_textures(out_dir) -> {"gym": path, "yoga": path}. Draws in the current scene inside a temporary collection, renders
each face orthographically to PNG, then removes everything it made and restores the render settings.
- gym: a narrow board (1 : 3), dark ground, 「ジム｜利用状況」 header, three equipment rows (icon, name, five-step
  occupancy bar), the head count; bright (it is lit for the walkway).
- yoga: a small landscape panel, warm dark-brown ground, soft amber text 「ヨガ｜次のクラス」, the next class and places
  left; kept dim.
"""
import math
import os

import bpy

FONTS = (r"C:\Windows\Fonts\BIZ-UDGothicB.ttc", r"C:\Windows\Fonts\NotoSansJP-VF.ttf", r"C:\Windows\Fonts\meiryob.ttc",
         r"C:\Windows\Fonts\YuGothB.ttc")


def _font():
    for p in FONTS:
        if os.path.exists(p):
            try:
                return bpy.data.fonts.load(p, check_existing=True)
            except RuntimeError:
                continue
    raise RuntimeError("no Japanese font found")


class Canvas:
    """Objects drawn on z = 0 in a temporary collection; x right, y up, units = pixels / 100."""

    def __init__(self, scene, w_px, h_px):
        self.scene, self.w, self.h = scene, w_px / 100, h_px / 100
        self.col = bpy.data.collections.new("SIGN_STUDIO")
        scene.collection.children.link(self.col)
        self.mats = {}
        self.font = _font()
        self.z = 0.0

    def mat(self, rgb):
        key = tuple(round(c, 3) for c in rgb)
        if key not in self.mats:
            m = bpy.data.materials.new("sign_tmp_%d" % len(self.mats))
            m.diffuse_color = (*(c ** 2.2 for c in rgb), 1)                    # given as sRGB, stored linear
            self.mats[key] = m
        return self.mats[key]

    def _link(self, ob):
        self.col.objects.link(ob)
        self.z += .001
        ob.location.z = self.z
        return ob

    def rect(self, x0, y0, x1, y1, rgb):
        me = bpy.data.meshes.new("r")
        me.from_pydata([(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0)], [], [(0, 1, 2, 3)])
        me.materials.append(self.mat(rgb))
        return self._link(bpy.data.objects.new("r", me))

    def disc(self, cx, cy, r, rgb, r_in=0.0, n=40):
        vs, fs = [], []
        for i in range(n):
            a = 2 * math.pi * i / n
            vs += [(cx + r * math.cos(a), cy + r * math.sin(a), 0), (cx + r_in * math.cos(a), cy + r_in * math.sin(a), 0)]
        for i in range(n):
            j = (i + 1) % n
            fs.append((2 * i, 2 * j, 2 * j + 1, 2 * i + 1))
        me = bpy.data.meshes.new("d")
        me.from_pydata(vs, [], fs)
        me.materials.append(self.mat(rgb))
        return self._link(bpy.data.objects.new("d", me))

    def bar(self, x0, y0, x1, y1, w, rgb):
        """A stroke from (x0, y0) to (x1, y1), w wide."""
        dx, dy = x1 - x0, y1 - y0
        ln = math.hypot(dx, dy) or 1
        nx, ny = -dy / ln * w / 2, dx / ln * w / 2
        me = bpy.data.meshes.new("b")
        me.from_pydata([(x0 + nx, y0 + ny, 0), (x1 + nx, y1 + ny, 0), (x1 - nx, y1 - ny, 0), (x0 - nx, y0 - ny, 0)], [], [(0, 1, 2, 3)])
        me.materials.append(self.mat(rgb))
        return self._link(bpy.data.objects.new("b", me))

    def text(self, s, x, y, size, rgb, align="CENTER"):
        cu = bpy.data.curves.new("t", "FONT")
        cu.body, cu.font, cu.size = s, self.font, size
        cu.align_x, cu.align_y = align, "CENTER"
        ob = bpy.data.objects.new("t", cu)
        ob.location = (x, y, 0)
        cu.materials.append(self.mat(rgb))
        return self._link(ob)

    def render(self, path, w_px, h_px):
        sc = self.scene
        cam_data = bpy.data.cameras.new("sign_cam")
        cam_data.type, cam_data.ortho_scale = "ORTHO", max(self.w, self.h)
        cam = bpy.data.objects.new("sign_cam", cam_data)
        cam.location = (self.w / 2, self.h / 2, 5)
        self.col.objects.link(cam)
        keep = (sc.camera, sc.render.engine, sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage,
                sc.render.filepath, sc.render.image_settings.file_format, sc.view_settings.view_transform,
                sc.display.shading.light, sc.display.shading.color_type)
        sc.camera = cam
        sc.render.engine = "BLENDER_WORKBENCH"
        sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w_px, h_px, 100
        sc.display.shading.light, sc.display.shading.color_type = "FLAT", "MATERIAL"
        sc.view_settings.view_transform = "Standard"
        sc.render.image_settings.file_format = "PNG"
        sc.render.filepath = path
        hidden = [o for o in sc.objects if o.name not in self.col.objects and not o.hide_render]
        for o in hidden:                                                        # only the sign studio renders
            o.hide_render = True
        bpy.ops.render.render(write_still=True)
        for o in hidden:
            o.hide_render = False
        (sc.camera, sc.render.engine, sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage,
         sc.render.filepath, sc.render.image_settings.file_format, sc.view_settings.view_transform,
         sc.display.shading.light, sc.display.shading.color_type) = keep

    def clear(self):
        for ob in list(self.col.objects):
            data = ob.data
            bpy.data.objects.remove(ob)
            if data is not None and data.users == 0:
                if isinstance(data, bpy.types.Mesh):
                    bpy.data.meshes.remove(data)
                elif isinstance(data, bpy.types.Curve):
                    bpy.data.curves.remove(data)
                elif isinstance(data, bpy.types.Camera):
                    bpy.data.cameras.remove(data)
        bpy.data.collections.remove(self.col)
        for m in self.mats.values():
            bpy.data.materials.remove(m)


def _bike(c, x, y, s, rgb):
    c.disc(x - .32 * s, y - .12 * s, .2 * s, rgb, .14 * s)
    c.disc(x + .32 * s, y - .12 * s, .2 * s, rgb, .14 * s)
    for a, b in (((-.32, -.12), (-.05, .18)), ((-.05, .18), (.28, .18)), ((.28, .18), (.32, -.12)), ((-.05, .18), (.0, -.12)),
                 ((.0, -.12), (-.32, -.12)), ((-.08, .18), (-.14, .3)), ((.26, .18), (.3, .32))):
        c.bar(x + a[0] * s, y + a[1] * s, x + b[0] * s, y + b[1] * s, .05 * s, rgb)


def _machine(c, x, y, s, rgb):
    for xx in (-.3, .3):
        c.bar(x + xx * s, y - .35 * s, x + xx * s, y + .35 * s, .07 * s, rgb)
    c.bar(x - .34 * s, y + .35 * s, x + .34 * s, y + .35 * s, .07 * s, rgb)
    for i in range(5):
        yy = y - .3 * s + i * .1 * s
        c.bar(x - .18 * s, yy, x + .18 * s, yy, .06 * s, rgb)
    c.bar(x, y + .35 * s, x, y + .12 * s, .03 * s, rgb)


def _dumbbell(c, x, y, s, rgb):
    c.bar(x - .3 * s, y, x + .3 * s, y, .06 * s, rgb)
    for xx in (-.3, -.22, .22, .3):
        h = .26 if abs(xx) > .25 else .36
        c.bar(x + xx * s, y - h * s / 2, x + xx * s, y + h * s / 2, .07 * s, rgb)


def make_textures(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    sc = bpy.context.scene
    paths = {}
    # gym: 512 x 1536
    W, H = 512, 1536
    c = Canvas(sc, W, H)
    w, h = c.w, c.h
    c.rect(0, 0, w, h, (.035, .07, .09))
    c.rect(0, h - 1.55, w, h, (.06, .42, .45))                                 # header band (teal)
    c.text("ジム｜利用状況", w / 2, h - .78, .62, (1, 1, 1))
    c.text("GYM  STATUS", w / 2, h - 1.9, .3, (.55, .85, .86))
    rows = (("バイク", _bike, 3), ("マシン", _machine, 2), ("フリーウェイト", _dumbbell, 4))
    for i, (name, icon, level) in enumerate(rows):
        y = h - 3.4 - i * 3.3
        c.rect(.3, y - 1.35, w - .3, y + 1.35, (.07, .13, .16))
        icon(c, 1.35, y + .35, 1.5, (.85, .97, .95))
        c.text(name, 2.45, y + .55, .4 if len(name) < 5 else .3, (1, 1, 1), "LEFT")
        for k in range(5):                                                     # five-step occupancy bar
            col = (.32, .86, .55) if k < level else (.2, .27, .3)
            if k < level and level >= 4:
                col = (.98, .72, .28)
            c.rect(2.45 + k * .5, y - .75, 2.45 + k * .5 + .4, y - .3, col)
        c.text(("空き" if level <= 2 else "やや混雑" if level == 3 else "混雑"), 2.45, y - 1.02, .26, (.8, .9, .9), "LEFT")
    c.rect(.3, 1.2, w - .3, 1.24, (.2, .4, .42))
    c.text("現在 12 人", w / 2, .7, .42, (1, 1, 1))
    paths["gym"] = os.path.join(out_dir, "q09a-sign-gym.png")
    c.render(paths["gym"], W, H)
    c.clear()
    # yoga: 640 x 440, warm and dim
    W, H = 640, 440
    c = Canvas(sc, W, H)
    w, h = c.w, c.h
    amber, soft = (.96, .78, .52), (.78, .62, .44)
    c.rect(0, 0, w, h, (.14, .09, .06))
    c.text("ヨガ｜次のクラス", w / 2, h - .8, .56, amber)
    c.rect(.5, h - 1.45, w - .5, h - 1.41, (.42, .3, .2))
    c.text("19:30  やさしいフロー", w / 2, h - 2.25, .46, (1, .92, .8))
    c.text("空き 4 / 12 名", w / 2, h - 3.2, .36, soft)
    paths["yoga"] = os.path.join(out_dir, "q09a-sign-yoga.png")
    c.render(paths["yoga"], W, H)
    c.clear()
    return paths
