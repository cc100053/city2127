"""Q09-C v2 sign faces, drawn in Blender (text in a Japanese font + simple shapes, flat Workbench render). Canvas is the
one written for the Q09-A / Q09-B v2 signs (copied here, as neither is on main).

make_textures(out_dir) -> {"utsuwa", "kosho", "garden", "poster": path}. Draws in the current scene inside a temporary
collection, renders each face orthographically to PNG, then removes everything it made and restores the render settings.
- utsuwa: the pottery shop's tall lightbox, 「うつわ」 written top to bottom, dark on warm amber, a small pot mark.
- kosho: the bookshop's hanging blade, 「古書」 top to bottom, warm white on indigo, an open-book mark.
- garden: the stair's direction screen, 「空中庭園 ↑」, white on a dark translucent teal (alpha is set on the material).
- poster: the corner wall's day poster 「本日、陶芸体験」, a wheel mark, the time and the shop.
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



def _pot(c, x, y, s, rgb):
    c.disc(x, y, .5 * s, rgb)
    c.rect(x - .22 * s, y + .3 * s, x + .22 * s, y + .75 * s, rgb)
    c.rect(x - .32 * s, y + .7 * s, x + .32 * s, y + .82 * s, rgb)


def _book(c, x, y, s, rgb):
    for sg in (-1, 1):
        c.bar(x, y - .3 * s, x + sg * .7 * s, y - .18 * s, .08 * s, rgb)
        c.bar(x + sg * .7 * s, y - .18 * s, x + sg * .7 * s, y + .4 * s, .08 * s, rgb)
        c.bar(x, y + .28 * s, x + sg * .7 * s, y + .4 * s, .08 * s, rgb)
    c.bar(x, y - .3 * s, x, y + .28 * s, .06 * s, rgb)


def _vertical(c, text, w, top, step, size, rgb):
    for k, ch in enumerate(text):
        c.text(ch, w / 2, top - k * step, size, rgb)


def make_textures(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    sc = bpy.context.scene
    paths = {}
    # うつわ: 300 x 1100, warm amber ground
    c = Canvas(sc, 300, 1100)
    w, h = c.w, c.h
    c.rect(0, 0, w, h, (.98, .72, .32))
    c.rect(.14, .14, w - .14, h - .14, (1.0, .8, .42))
    _vertical(c, "うつわ", w, h - 1.6, 2.45, 2.0, (.24, .12, .05))
    _pot(c, w / 2, 1.0, 1.1, (.45, .22, .08))
    paths["utsuwa"] = os.path.join(out_dir, "q09c-sign-utsuwa.png")
    c.render(paths["utsuwa"], 300, 1100)
    c.clear()
    # 古書: 300 x 800, indigo ground
    c = Canvas(sc, 300, 800)
    w, h = c.w, c.h
    c.rect(0, 0, w, h, (.11, .16, .38))
    c.rect(.12, .12, w - .12, h - .12, (.13, .19, .44))
    _vertical(c, "古書", w, h - 1.65, 2.55, 2.1, (.98, .95, .86))
    _book(c, w / 2, 1.15, .95, (.95, .82, .5))
    paths["kosho"] = os.path.join(out_dir, "q09c-sign-kosho.png")
    c.render(paths["kosho"], 300, 800)
    c.clear()
    # 空中庭園 ↑: 700 x 520, dark teal (the material makes it translucent)
    c = Canvas(sc, 700, 520)
    w, h = c.w, c.h
    c.rect(0, 0, w, h, (.03, .2, .22))
    c.bar(w / 2, 1.05, w / 2, 2.75, .32, (.55, 1, .92))                             # arrow shaft and head
    c.bar(w / 2, 3.05, w / 2 - .85, 2.15, .32, (.55, 1, .92))
    c.bar(w / 2, 3.05, w / 2 + .85, 2.15, .32, (.55, 1, .92))
    c.text("空中庭園", w / 2, h - 1.05, .95, (1, 1, 1))
    c.text("階段・エレベーター  5 m", w / 2, .5, .32, (.7, .95, .9))
    paths["garden"] = os.path.join(out_dir, "q09c-sign-garden.png")
    c.render(paths["garden"], 700, 520)
    c.clear()
    # 本日、陶芸体験: 800 x 1100 poster
    c = Canvas(sc, 800, 1100)
    w, h = c.w, c.h
    c.rect(0, 0, w, h, (.96, .91, .82))
    c.rect(0, h - 3.2, w, h, (.72, .36, .2))
    c.text("本日、", w / 2, h - 1.0, .95, (1, .95, .86))
    c.text("陶芸体験", w / 2, h - 2.3, 1.35, (1, .95, .86))
    c.disc(w / 2, 4.6, 1.8, (.45, .3, .22))                                     # wheel and a pot on it
    c.disc(w / 2, 4.6, 1.5, (.6, .42, .3))
    c.rect(w / 2 - .7, 4.75, w / 2 + .7, 5.9, (.8, .55, .38))
    c.rect(w / 2 - .45, 5.9, w / 2 + .45, 6.3, (.8, .55, .38))
    c.text("18:00 / 19:30", w / 2, 2.0, .62, (.3, .18, .1))
    c.text("予約なし・どなたでも", w / 2, 1.15, .42, (.4, .26, .16))
    c.text("うつわ工房", w / 2, .45, .36, (.6, .34, .18))
    paths["poster"] = os.path.join(out_dir, "q09c-poster-touge.png")
    c.render(paths["poster"], 800, 1100)
    c.clear()
    return paths