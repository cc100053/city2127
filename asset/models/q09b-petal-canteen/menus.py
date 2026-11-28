"""Q09-B v2 menu faces and the entrance lightbox, drawn in Blender (text in a Japanese font + simple icon meshes, flat
Workbench render). Canvas is the one written for the Q09-A v2 signs (copied here, as Q09-A is not on main).

make_textures(out_dir) -> {"menu_0".."menu_2": path, "lightbox": path}. Draws in the current scene inside a temporary
collection, renders each face orthographically to PNG, then removes everything it made and restores the render settings.
- menu panels (three dishes): warm dark ground, a copper 「本日のおすすめ」 band, a dish icon, the dish and its price.
- lightbox: 「港の食堂」 written top to bottom in indigo on warm white.
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


def _donburi(c, x, y, s):
    """Rice bowl seen from the side: bowl, rice mound, toppings."""
    c.disc(x, y + .12 * s, .42 * s, (.97, .95, .9))                             # rice mound
    for dx, col in ((-.2, (.95, .45, .3)), (.0, (.98, .62, .35)), (.2, (.35, .65, .4))):
        c.disc(x + dx * s, y + .32 * s, .13 * s, col)                           # fish / egg / greens
    c.rect(x - .5 * s, y - .32 * s, x + .5 * s, y + .1 * s, (.55, .18, .14))     # lacquered bowl
    c.rect(x - .22 * s, y - .42 * s, x + .22 * s, y - .32 * s, (.45, .14, .1))


def _fish(c, x, y, s):
    """Grilled fish on a long plate."""
    c.rect(x - .6 * s, y - .18 * s, x + .6 * s, y - .08 * s, (.92, .9, .86))
    c.disc(x - .05 * s, y + .08 * s, .22 * s, (.82, .55, .3))
    c.bar(x - .45 * s, y + .08 * s, x + .3 * s, y + .08 * s, .3 * s, (.82, .55, .3))
    c.bar(x + .3 * s, y + .08 * s, x + .5 * s, y + .22 * s, .1 * s, (.7, .45, .25))
    c.bar(x + .3 * s, y + .08 * s, x + .5 * s, y - .06 * s, .1 * s, (.7, .45, .25))
    c.disc(x - .36 * s, y + .12 * s, .04 * s, (.2, .15, .1))


def _tempura(c, x, y, s):
    """Tempura on a plate."""
    c.rect(x - .55 * s, y - .2 * s, x + .55 * s, y - .1 * s, (.92, .9, .86))
    for dx, ang in ((-.25, .5), (0, .2), (.25, -.2)):
        c.bar(x + dx * s - .1 * s, y - .1 * s, x + dx * s + ang * .3 * s, y + .45 * s, .2 * s, (.95, .78, .4))


def make_textures(out_dir):
    """Menu panels (three designs, 1024 x 312) for the ring over the kitchen and the entrance lightbox (300 x 1300)."""
    os.makedirs(out_dir, exist_ok=True)
    sc = bpy.context.scene
    paths = {}
    dishes = (("海鮮丼", "¥980", _donburi), ("焼き魚定食", "¥880", _fish), ("天ぷら定食", "¥920", _tempura))
    W, H = 1024, 312
    for i, (name, price, icon) in enumerate(dishes):
        c = Canvas(sc, W, H)
        w, h = c.w, c.h
        c.rect(0, 0, w, h, (.09, .06, .05))                                     # warm dark ground
        c.rect(0, h - .62, w, h, (.72, .42, .18))                              # copper header band
        c.text("本日のおすすめ", w / 2, h - .32, .4, (1, .96, .88))
        c.rect(.25, .2, 2.65, h - .82, (.16, .11, .08))                         # dish icon tile
        icon(c, 1.45, 1.15, 1.6)
        c.text(name, 2.95, 1.55, .58, (1, .93, .8), "LEFT")
        c.text(price, w - .35, .72, .52, (.98, .76, .42), "RIGHT")
        c.text("お箸・お盆は入口で", 2.95, .65, .26, (.78, .66, .52), "LEFT")
        paths["menu_%d" % i] = os.path.join(out_dir, "q09b-menu-%d.png" % i)
        c.render(paths["menu_%d" % i], W, H)
        c.clear()
    # vertical lightbox: 港の食堂, written top to bottom, indigo on warm white, a copper rule
    W, H = 300, 1300
    c = Canvas(sc, W, H)
    w, h = c.w, c.h
    c.rect(0, 0, w, h, (.98, .95, .88))
    c.rect(.12, .12, w - .12, h - .12, (.98, .95, .88))
    for k, ch in enumerate("港の食堂"):
        c.text(ch, w / 2, h - 1.7 - k * 2.45, 2.05, (.13, .16, .32))
    c.rect(.35, .55, w - .35, .62, (.72, .42, .18))
    c.text("HARBOR CANTEEN", w / 2, .32, .2, (.45, .32, .2))
    paths["lightbox"] = os.path.join(out_dir, "q09b-lightbox.png")
    c.render(paths["lightbox"], W, H)
    c.clear()
    return paths
