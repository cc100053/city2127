# Q02-A "古い変電所をまたいで育った、空中の水の棚田" — Blender build script.
# Target envelope matches rectenna-farm-canopy.blend: about ±32 m footprint, ≤ 34 m tall.
# Metres, Z up, origin at ground centre. Rebuild the source .blend (from this folder):
#   Blender -b --factory-startup --python-exit-code 1 -P build_hydro_terrace.py -- q02a-hydro-terrace.blend
# or run it inside an open Blender with exec(open(PATH).read()) (clears the scene first).
import bpy, bmesh, math, random
from mathutils import Vector, Matrix

random.seed(2127)
TAU = math.tau

# ---------- reset ----------
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    for d in list(coll):
        coll.remove(d)

# ---------- materials ----------
def principled(m):
    return next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")

def setin(bsdf, names, value):
    for nm in names:
        if nm in bsdf.inputs:
            bsdf.inputs[nm].default_value = value
            return

def mat(name, col, metal=0.0, rough=0.5, emit=None, estr=0.0, alpha=1.0, noise=None, bump=0.0, tiles=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = principled(m)
    setin(b, ["Base Color"], (*col, 1))
    setin(b, ["Metallic"], metal)
    setin(b, ["Roughness"], rough)
    if emit:
        setin(b, ["Emission Color", "Emission"], (*emit, 1))
        setin(b, ["Emission Strength"], estr)
    if alpha < 1:
        setin(b, ["Alpha"], alpha)
        try:
            m.surface_render_method = "BLENDED"
        except Exception:
            pass
    nt = m.node_tree
    if noise:  # vary base colour (weathering / paving)
        tex = nt.nodes.new("ShaderNodeTexNoise")
        tex.inputs["Scale"].default_value = noise
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = (*[c * 0.82 for c in col], 1)
        ramp.color_ramp.elements[1].color = (*[min(1, c * 1.08) for c in col], 1)
        nt.links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    if tiles:  # paving joints in world metres
        tc = nt.nodes.new("ShaderNodeTexCoord")
        br = nt.nodes.new("ShaderNodeTexBrick")
        br.inputs["Scale"].default_value = tiles
        br.inputs["Mortar Size"].default_value = 0.015
        br.inputs["Color1"].default_value = (*col, 1)
        br.inputs["Color2"].default_value = (*[c * 0.9 for c in col], 1)
        br.inputs["Mortar"].default_value = (*[c * 0.8 for c in col], 1)
        nt.links.new(tc.outputs["Object"], br.inputs["Vector"])
        nt.links.new(br.outputs["Color"], b.inputs["Base Color"])
    if bump:
        tex = nt.nodes.new("ShaderNodeTexNoise")
        tex.inputs["Scale"].default_value = 6.0
        bn = nt.nodes.new("ShaderNodeBump")
        bn.inputs["Strength"].default_value = bump
        nt.links.new(tex.outputs["Fac"], bn.inputs["Height"])
        nt.links.new(bn.outputs["Normal"], b.inputs["Normal"])
    return m

MATS = {
    "Concrete":    mat("Concrete", (0.74, 0.75, 0.77), rough=0.45, noise=2.0),
    "OldConcrete": mat("OldConcrete", (0.50, 0.44, 0.35), rough=0.85, noise=3.0),
    "OldWindow":   mat("OldWindow", (0.05, 0.08, 0.12), metal=0.4, rough=0.15),
    "Steel":       mat("Steel", (0.70, 0.74, 0.80), metal=1.0, rough=0.25),
    "SteelDark":   mat("SteelDark", (0.28, 0.31, 0.36), metal=0.8, rough=0.4),
    "House":       mat("House", (0.58, 0.63, 0.70), metal=0.6, rough=0.35),
    "Water":       mat("Water", (0.02, 0.24, 0.33), rough=0.05, bump=0.15),
    "Fall":        mat("Fall", (0.88, 0.94, 1.0), rough=0.5, emit=(0.85, 0.93, 1.0), estr=0.35, alpha=0.8),
    "Foam":        mat("Foam", (0.95, 0.97, 1.0), rough=0.7, emit=(0.9, 0.95, 1.0), estr=0.25, alpha=0.9),
    "Glow":        mat("Glow", (0.45, 0.85, 1.0), emit=(0.35, 0.80, 1.0), estr=8.0),
    "Paving":      mat("Paving", (0.56, 0.49, 0.38), rough=0.8, tiles=0.6),
    "Gravel":      mat("Gravel", (0.33, 0.32, 0.30), rough=0.95, noise=12.0),
    "Grass":       mat("Grass", (0.10, 0.32, 0.05), rough=0.9, noise=4.0),
    "Leaf":        mat("Leaf", (0.08, 0.30, 0.04), rough=0.7),
    "Leaf2":       mat("Leaf2", (0.22, 0.48, 0.07), rough=0.7),
    "Leaf3":       mat("Leaf3", (0.14, 0.40, 0.05), rough=0.7, noise=2.0),
    "OldTrim":     mat("OldTrim", (0.62, 0.57, 0.48), rough=0.7, noise=4.0),
    "OldBase":     mat("OldBase", (0.38, 0.34, 0.28), rough=0.9, noise=5.0),
    "Bark":        mat("Bark", (0.22, 0.14, 0.08), rough=0.9),
    "Ceramic":     mat("Ceramic", (0.95, 0.95, 0.93), rough=0.2),
    "Glass":       mat("Glass", (0.80, 0.90, 0.95), rough=0.05, alpha=0.3),
}

def frame_driver(sock, idx, expr):
    fc = sock.driver_add("default_value", idx)
    fc.driver.expression = expr

def water_mat(name="Water"):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = principled(m)
    setin(b, ["Roughness"], 0.03); setin(b, ["IOR"], 1.33)
    setin(b, ["Specular IOR Level", "Specular"], 0.7)
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.3
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs[6].default_value = (0.0, 0.16, 0.20, 1)
    mix.inputs[7].default_value = (0.02, 0.42, 0.48, 1)
    nt.links.new(lw.outputs["Facing"], mix.inputs[0])
    nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    frame_driver(mp.inputs["Location"], 0, "frame*0.03")
    wv = nt.nodes.new("ShaderNodeTexWave")
    wv.inputs["Scale"].default_value = 0.5; wv.inputs["Distortion"].default_value = 5.0
    wv.inputs["Detail"].default_value = 3.0
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 2.5
    nt.links.new(mp.outputs["Vector"], wv.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
    add = nt.nodes.new("ShaderNodeMath"); add.operation = "ADD"
    nt.links.new(wv.outputs["Fac"], add.inputs[0]); nt.links.new(nz.outputs["Fac"], add.inputs[1])
    bn = nt.nodes.new("ShaderNodeBump"); bn.inputs["Strength"].default_value = 0.25
    nt.links.new(add.outputs[0], bn.inputs["Height"]); nt.links.new(bn.outputs["Normal"], b.inputs["Normal"])
    return m

def stream_mat(name, alpha_lo, speed, emit):
    """White water with vertical streaks that move down over time."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = principled(m)
    setin(b, ["Roughness"], 0.4)
    setin(b, ["Emission Color", "Emission"], (0.85, 0.93, 1.0, 1)); setin(b, ["Emission Strength"], emit)
    try:
        m.surface_render_method = "BLENDED"
    except Exception:
        pass
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (5.0, 5.0, 0.25)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    frame_driver(mp.inputs["Location"], 2, "frame*%f" % speed)
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 3.0; nz.inputs["Detail"].default_value = 8.0
    nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.38; ramp.color_ramp.elements[0].color = (0.45, 0.70, 0.82, 1)
    ramp.color_ramp.elements[1].position = 0.62; ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    nt.links.new(nz.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = alpha_lo; mr.inputs["To Max"].default_value = 1.0
    mr.inputs["From Min"].default_value = 0.35; mr.inputs["From Max"].default_value = 0.65
    nt.links.new(nz.outputs["Fac"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], b.inputs["Alpha"])
    return m

for k in ("Water", "Fall", "Foam"):
    bpy.data.materials.remove(MATS[k])
MATS["Water"] = water_mat()
MATS["Fall"] = stream_mat("Fall", 0.35, -0.12, 0.5)
MATS["Foam"] = stream_mat("Foam", 0.55, 0.05, 0.4)
MATS["Mist"] = mat("Mist", (0.95, 0.97, 1.0), rough=0.9, emit=(0.9, 0.95, 1.0), estr=0.3, alpha=0.18)
MATS["WheelMetal"] = mat("WheelMetal", (0.42, 0.45, 0.50), metal=0.9, rough=0.32)
ALIAS = {"Plaza": "Paving", "Sea": "Water"}
WHEELS = []

# ---------- geometry builder: one bmesh per material ----------
G = {}
def bm_(g):
    if g not in G:
        G[g] = bmesh.new()
    return G[g]

def M4(loc, rot3=None, scale=(1, 1, 1)):
    m = Matrix.Translation(Vector(loc))
    if rot3 is not None:
        m = m @ rot3.to_4x4()
    return m @ Matrix.Diagonal((*scale, 1.0))

def align(d):
    d = Vector(d).normalized()
    up = "Y" if abs(d.y) < 0.99 else "X"
    return d.to_track_quat("Z", up).to_matrix()

def box(g, c, s, rz=0.0, matrix=None):
    m = M4(c, Matrix.Rotation(rz, 3, "Z"), s)
    if matrix is not None:
        m = matrix @ m
    bmesh.ops.create_cube(bm_(g), size=1.0, matrix=m)

def beam(g, p0, p1, w, h):
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    bmesh.ops.create_cube(bm_(g), size=1.0, matrix=M4((p0 + p1) / 2, align(d), (w, h, d.length)))

def cyl(g, p0, p1, r0, r1=None, seg=24):
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    bmesh.ops.create_cone(bm_(g), cap_ends=True, cap_tris=False, segments=seg,
                          radius1=r0, radius2=r0 if r1 is None else r1, depth=d.length,
                          matrix=M4((p0 + p1) / 2, align(d)))

def ico(g, c, r, sub=1, scale=(1, 1, 1)):
    bmesh.ops.create_icosphere(bm_(g), subdivisions=sub, radius=r, matrix=M4(c, None, scale))

def ring(g, cx, cy, rin, rout, z0, z1, a0=0.0, a1=TAU, seg=None, matrix=None):
    """Annulus (or annular sector) between radii, extruded z0..z1."""
    bm = bm_(g)
    full = abs((a1 - a0) - TAU) < 1e-6
    n = seg or max(8, int(abs(a1 - a0) / TAU * 160))
    cnt = n if full else n + 1
    mw = matrix or Matrix.Identity(4)
    rows = []
    for k in range(cnt):
        a = a0 + (a1 - a0) * k / n
        ca, sa = math.cos(a), math.sin(a)
        pts = [(rin, z0), (rout, z0), (rout, z1), (rin, z1)]
        rows.append([bm.verts.new(mw @ Vector((cx + r * ca, cy + r * sa, z))) for r, z in pts])
    for k in range(n):
        A, B = rows[k], rows[(k + 1) % cnt]
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((A[i], B[i], B[j], A[j]))
    if not full:
        bm.faces.new(rows[0])
        bm.faces.new(list(reversed(rows[-1])))

def disk(g, cx, cy, r, z, seg=160):
    bmesh.ops.create_circle(bm_(g), cap_ends=True, cap_tris=False, segments=seg, radius=r,
                            matrix=Matrix.Translation((cx, cy, z)))

def tree(x, y, z=0.0, s=1.0):
    h = 2.6 * s
    cyl("Bark", (x, y, z), (x, y, z + h), 0.2 * s, 0.12 * s, seg=8)
    for _ in range(3):
        a = random.uniform(0, TAU)
        cyl("Bark", (x, y, z + h * 0.7), (x + math.cos(a) * 0.9 * s, y + math.sin(a) * 0.9 * s, z + h * 1.05),
            0.08 * s, 0.05 * s, seg=6)
    g = random.choice(["Leaf", "Leaf2", "Leaf3"])
    ico(g, (x, y, z + h + 1.0 * s), 1.5 * s, sub=2, scale=(1, 1, 0.8))
    for k in range(6):
        a = TAU * k / 6 + random.uniform(-0.3, 0.3)
        rr = random.uniform(0.9, 1.3) * s
        ico(g, (x + math.cos(a) * rr, y + math.sin(a) * rr, z + h + random.uniform(0.2, 1.2) * s),
            random.uniform(0.8, 1.1) * s, sub=2, scale=(1, 1, 0.85))

def polar(c, r, a):
    return Vector((c[0] + r * math.cos(a), c[1] + r * math.sin(a)))

# ---------- layout ----------
POOLS = [((-12.0, 13.0), 27.0, 12.5),
         ((-4.0, 7.0), 20.5, 12.0),
         ((3.0, 0.0), 14.0, 11.5),
         ((10.0, -6.0), 8.0, 11.0)]
BASIN_C, BASIN_W, BASIN_R = (17.0, -15.0), -1.4, 12.0
SUB = (-21.0, -3.0, -10.5, 0.5, 10.0)         # x0, x1, y0, y1, height
YARD = (-22.0, -5.0, -22.0, -12.5)             # x0, x1, y0, y1

def support_z(x, y, below_pool):
    """Height a column can stand on at (x, y), under pool index below_pool."""
    z = 0.0
    if math.dist((x, y), BASIN_C) < BASIN_R + 0.6:
        z = -3.2
    if SUB[0] - 0.5 < x < SUB[1] + 0.5 and SUB[2] - 0.5 < y < SUB[3] + 0.5:
        z = SUB[4] + 0.2
    for c, pz, r in POOLS[below_pool + 1:]:
        if math.dist((x, y), c) < r:
            z = max(z, pz + 0.8)
    return z

# ---------- pools, waterfalls, turbines ----------
def waterfall(c, r, z_top, z_bot, th, half=0.14):
    for off in (0.0, 0.3, 0.6):
        bm = bm_("Fall")
        A, S = 11, 12
        grid = []
        for i in range(A):
            a = th - half + 2 * half * i / (A - 1)
            col = []
            for k in range(S + 1):
                s = k / S
                rad = r + 0.25 + off + 1.7 * math.sqrt(s)
                p = polar(c, rad, a)
                col.append(bm.verts.new((p.x, p.y, z_top - s * (z_top - z_bot))))
            grid.append(col)
        for i in range(A - 1):
            for k in range(S):
                bm.faces.new((grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1]))
    bm = bm_("Fall")                       # curved spill lip feeding the sheet
    prof = [(-1.6, 0.0), (-0.4, 0.0), (0.0, -0.06), (0.15, -0.16), (0.24, -0.32)]
    rows = []
    for i in range(11):
        a = th - half + 2 * half * i / 10
        rows.append([bm.verts.new((*polar(c, r + dr, a), z_top + dz + 0.02)) for dr, dz in prof])
    for i in range(10):
        for k in range(len(prof) - 1):
            bm.faces.new((rows[i][k], rows[i + 1][k], rows[i + 1][k + 1], rows[i][k + 1]))
    for _ in range(30):                    # splash droplets
        a = th + random.uniform(-half * 1.2, half * 1.2)
        p = polar(c, r + 2.2 + random.uniform(-0.8, 1.4), a)
        ico("Foam", (p.x, p.y, z_bot + random.uniform(0.3, 2.2)), random.uniform(0.08, 0.22), sub=1)
    for i in range(10):
        a = th - half + 2 * half * i / 9
        p = polar(c, r + 2.2 + random.uniform(-0.6, 0.8), a)
        ico("Foam", (p.x, p.y, z_bot + 0.1), random.uniform(0.6, 1.1), sub=2, scale=(1, 1, 0.5))
    for i in range(3):
        a = th + random.uniform(-half, half)
        p = polar(c, r + 2.6 + random.uniform(0.0, 1.0), a)
        ico("Mist", (p.x, p.y, z_bot + random.uniform(0.8, 1.4)), random.uniform(0.8, 1.2), sub=2)

def turbine(idx, c, r, z, th, base_z, wa):
    u = Vector((math.cos(th), math.sin(th), 0))
    t = Vector((-math.sin(th), math.cos(th), 0))
    if t.x < 0:            # generator on the screen-right side, as in the image
        t = -t
    ctr = Vector((c[0], c[1], z - 2.4)) + Vector((math.cos(wa), math.sin(wa), 0)) * (r + 1.9)
    g = "Wheel%d" % idx
    R = 3.8                # wheel built at the origin, axle = local Z
    for zz in (-0.8, 0.6):
        ring(g, 0, 0, R - 0.5, R, zz, zz + 0.25, seg=64)
        ring(g, 0, 0, 0.9, 1.2, zz, zz + 0.2, seg=24)
    for k in range(8):
        phi = TAU * k / 8 + 0.2
        for zz in (-0.7, 0.7):
            cyl(g, (1.0 * math.cos(phi), 1.0 * math.sin(phi), zz), ((R - 0.4) * math.cos(phi), (R - 0.4) * math.sin(phi), zz), 0.07, seg=8)
    for k in range(24):
        phi = TAU * k / 24
        for r0, r1, tilt in ((1.1, 2.5, 0.2), (2.4, 3.65, 0.6)):
            rm = (r0 + r1) / 2
            m = Matrix.Rotation(phi, 4, "Z") @ Matrix.Translation((rm, 0, 0)) \
                @ Matrix.Rotation(tilt, 4, "Z") @ Matrix.Diagonal((r1 - r0 + 0.1, 0.1, 1.4, 1))
            bmesh.ops.create_cube(bm_(g), size=1.0, matrix=m)
    cyl(g, (0, 0, -1.1), (0, 0, 1.1), 0.9, seg=24)
    cyl(g, (0, 0, -1.1), (0, 0, -1.6), 0.9, 0.3, seg=24)
    WHEELS.append((g, ctr.copy(), align(t), 1 if idx % 2 == 0 else -1))
    cyl("SteelDark", ctr + t * 1.6, ctr + t * 5.4, 0.4, seg=16)
    for k in range(3):
        cyl("Steel", ctr + t * (2.4 + k * 1.2), ctr + t * (2.55 + k * 1.2), 0.6, seg=16)
    hc = ctr + t * 7.0
    ang = math.atan2(t.y, t.x)
    rot = Matrix.Rotation(ang, 3, "Z")
    def lp(x, y, zz):
        v = rot @ Vector((x, y, 0))
        return (hc.x + v.x, hc.y + v.y, zz)
    box("House", (hc.x, hc.y, hc.z), (2.8, 3.0, 3.0), rz=ang)
    box("House", (hc.x, hc.y, hc.z + 1.8), (1.6, 1.8, 0.6), rz=ang)
    box("SteelDark", lp(0.0, 1.52, hc.z + 0.2), (2.0, 0.06, 1.6), rz=ang)
    for k in range(4):
        box("SteelDark", lp(-1.42, -0.9 + 0.6 * k, hc.z + 0.6), (0.06, 0.4, 1.2), rz=ang)
        box("SteelDark", lp(1.42, -0.9 + 0.6 * k, hc.z + 0.6), (0.06, 0.4, 1.2), rz=ang)
    box("OldWindow", lp(0.0, -1.52, hc.z - 0.5), (0.9, 0.06, 2.0), rz=ang)     # door
    for k in range(3):
        cyl("SteelDark", lp(-0.8 + 0.8 * k, 1.4, hc.z + 1.5), lp(-0.8 + 0.8 * k, 1.4, hc.z + 2.6), 0.12, seg=10)
    box("Glow", (hc.x, hc.y, hc.z + 1.2), (2.85, 3.05, 0.08), rz=ang)
    pz = hc.z - 1.65
    box("SteelDark", (hc.x, hc.y, pz), (4.6, 4.8, 0.25), rz=ang)
    corners = [(-2.2, -2.3), (2.2, -2.3), (2.2, 2.3), (-2.2, 2.3)]
    for (ax, ay), (bx, by) in zip(corners, corners[1:] + corners[:1]):   # railing
        beam("Steel", lp(ax, ay, pz + 1.1), lp(bx, by, pz + 1.1), 0.06, 0.06)
    for ax, ay in corners:
        cyl("Steel", lp(ax, ay, pz), lp(ax, ay, pz + 1.1), 0.05, seg=6)
    top = pz - 0.15
    if top - base_z > 0.5:   # lattice legs down to the pool / basin below
        for ax, ay in corners:
            cyl("SteelDark", lp(ax * 0.8, ay * 0.8, base_z), lp(ax * 0.8, ay * 0.8, top), 0.18, seg=6)
        lc = corners + corners[:1]
        for (ax, ay), (bx, by) in zip(lc, lc[1:]):
            beam("SteelDark", lp(ax * 0.8, ay * 0.8, base_z), lp(bx * 0.8, by * 0.8, top), 0.12, 0.12)

for i, (c, z, r) in enumerate(POOLS):
    nc = POOLS[i + 1][0] if i + 1 < len(POOLS) else BASIN_C
    nz = POOLS[i + 1][1] if i + 1 < len(POOLS) else BASIN_W - 0.8
    th = math.atan2(nc[1] - c[1], nc[0] - c[0])
    g0, g1 = th - 0.3, th + 0.3
    s0, s1 = g1, g0 + TAU
    ring("Concrete", c[0], c[1], 0.01, r, z - 1.6, z, seg=192)
    ring("Steel", c[0], c[1], r, r + 0.05, z - 1.55, z - 1.05, seg=192)
    ring("Steel", c[0], c[1], r, r + 0.05, z - 0.7, z - 0.05, seg=192)
    cyl("Concrete", (c[0], c[1], z - 1.6), (c[0], c[1], z - 3.2), r * 0.6, r * 0.15, seg=96)
    ring("Glow", c[0], c[1], r, r + 0.07, z - 0.98, z - 0.78, seg=192)
    ring("Concrete", c[0], c[1], r - 0.35, r, z, z + 1.0, s0, s1)
    ring("Glass", c[0], c[1], r - 0.2, r - 0.15, z + 1.0, z + 1.6, s0, s1)
    ring("Paving", c[0], c[1], r - 2.2, r - 0.35, z, z + 0.05, s0, s1)
    ring("Grass", c[0], c[1], r - 3.3, r - 2.2, z, z + 0.7, s0, s1)
    ring("Concrete", c[0], c[1], r - 3.5, r - 3.3, z, z + 1.0, s0, s1)
    disk("Water", c[0], c[1], r - 3.5, z + 0.8)
    npost = int((s1 - s0) * r / 1.6)
    for k in range(npost + 1):
        p = polar(c, r - 0.17, s0 + (s1 - s0) * k / npost)
        cyl("Steel", (p.x, p.y, z + 1.0), (p.x, p.y, z + 1.68), 0.04, seg=6)
    ring("Steel", c[0], c[1], r - 0.23, r - 0.11, z + 1.64, z + 1.72, s0, s1)
    nl = int((s1 - s0) * r / 9)
    for k in range(nl):
        p = polar(c, r - 1.9, s0 + (s1 - s0) * (k + 0.5) / nl)
        cyl("Steel", (p.x, p.y, z), (p.x, p.y, z + 3.0), 0.06, seg=6)
        ico("Glow", (p.x, p.y, z + 3.05), 0.15, sub=1)
    ring("Water", c[0], c[1], r - 3.5, r + 0.2, z + 0.75, z + 0.8, g0, g1)
    ring("Steel", c[0], c[1], r - 0.3, r + 0.3, z, z + 0.75, g0, g1)
    # planter shrubs and small trees
    n = int((s1 - s0) * (r - 2.75) / 1.5)
    for k in range(n):
        a = s0 + (s1 - s0) * (k + 0.5) / n
        p = polar(c, r - 2.75, a)
        if k % 3 == 1:
            tree(p.x, p.y, z + 0.7, random.uniform(0.6, 0.8))
        else:
            ico(random.choice(["Leaf", "Leaf2", "Leaf3"]), (p.x, p.y, z + 1.0), 0.6, sub=2, scale=(1, 1, 0.7))
    # underside radial beams
    for k in range(12):
        a = TAU * k / 12
        beam("SteelDark", (*polar(c, 2.0, a), z - 1.8), (*polar(c, r - 0.6, a), z - 1.8), 0.35, 0.5)
    # steel truss skirt under the slab
    ring("SteelDark", c[0], c[1], 0.45 * r - 0.2, 0.45 * r + 0.2, z - 3.2, z - 2.8, seg=48)
    for k in range(24):
        a = TAU * k / 24
        beam("SteelDark", (*polar(c, 0.45 * r, a), z - 3.0), (*polar(c, r - 0.7, a + TAU / 48), z - 1.65), 0.2, 0.2)
        beam("SteelDark", (*polar(c, 0.45 * r, a), z - 3.0), (*polar(c, r - 0.7, a - TAU / 48), z - 1.65), 0.2, 0.2)
    # pilotis
    for da in (-0.9, 0.0, 0.9):
        p = polar(c, 0.55 * r, th + math.pi + da)
        zb = support_z(p.x, p.y, i)
        if zb < z - 3:
            cyl("Concrete", (p.x, p.y, zb), (p.x, p.y, z - 1.8), 0.55, seg=12)
    sgn = 1 if -math.sin(th) > 0 else -1         # +angle points to the generator side (t.x > 0)
    waterfall(c, r, z + 0.8, nz + 0.8, th - sgn * 0.12)
    turbine(i, c, r, z, th, nz + 0.8 if i + 1 < len(POOLS) else -3.2, th + sgn * 0.11)

# ---------- big Y legs ----------
LEG_DEF = [((-26.0, 2.0), (0, 1)), ((-1.0, -16.0), (2, 3)), ((-4.0, 26.0), (0, 1)), ((16.0, 7.0), (2, 3)),
           ((-28.0, 20.0), (0,))]
LEGS = []
for b, idx in LEG_DEF:
    tl = []
    for j in idx:
        pc, pz, pr = POOLS[j]
        v = (Vector(b) - Vector(pc)).normalized() * 0.55 * pr
        tl.append((pc[0] + v.x, pc[1] + v.y, pz - 2.2))
    LEGS.append((b, tl))
for (bx, by), targets in LEGS:
    tz = min(t[2] for t in targets)
    mx = sum(t[0] for t in targets) / len(targets)
    my = sum(t[1] for t in targets) / len(targets)
    F = Vector((bx + (mx - bx) * 0.4, by + (my - by) * 0.4, 0.55 * tz))
    base = Vector((bx, by, 0))
    box("Concrete", (bx, by, 0.4), (3.6, 3.6, 0.8))
    cyl("Concrete", base, F, 1.6, 1.1, seg=6)
    for t in targets:
        cyl("Concrete", F, t, 1.0, 0.6, seg=6)
        cyl("Concrete", t, (t[0], t[1], t[2] + 1.0), 1.4, 1.4, seg=6)
    for sx in (-0.9, 0.9):
        beam("Glow", base + Vector((sx, -1.25, 0.8)), F + Vector((sx * 0.6, -0.85, 0)), 0.12, 0.06)
    if len(targets) == 2:
        m0 = (F + Vector(targets[0])) / 2
        m1 = (F + Vector(targets[1])) / 2
        beam("SteelDark", m0, m1, 0.35, 0.35)
        beam("SteelDark", m0, Vector(targets[1]), 0.25, 0.25)

# ---------- pumping core (pipes up to the top pool) ----------
cc = Vector(POOLS[0][0])
for k in range(6):
    p = cc + Vector((math.cos(TAU * k / 6), math.sin(TAU * k / 6))) * 1.7
    cyl("Steel", (p.x, p.y, 0), (p.x, p.y, 31.5), 0.6, seg=16)
cyl("Steel", (cc.x, cc.y, 0), (cc.x, cc.y, 32.2), 0.9, seg=20)
box("Concrete", (cc.x, cc.y, 0.6), (6.0, 6.0, 1.2))
for zz in range(4, 31, 4):
    ring("SteelDark", cc.x, cc.y, 2.8, 3.0, zz, zz + 0.25, seg=32)
for k in range(4):
    a = TAU * k / 4 + 0.4
    p = cc + Vector((math.cos(a), math.sin(a))) * 2.9
    cyl("SteelDark", (p.x, p.y, 0), (p.x, p.y, 31), 0.15, seg=6)
for k in range(4):
    a = TAU * k / 4 + 0.3
    tp = cc + Vector((math.cos(a), math.sin(a))) * 4.6
    cyl("Steel", (tp.x, tp.y, 27.8), (tp.x, tp.y, 31.6), 1.3, seg=24)
    ico("Steel", (tp.x, tp.y, 31.6), 1.3, sub=2, scale=(1, 1, 0.45))
    for zz in (28.6, 30.6):
        cyl("SteelDark", (tp.x, tp.y, zz), (tp.x, tp.y, zz + 0.15), 1.38, seg=24)
    p0 = cc + Vector((math.cos(a), math.sin(a))) * 1.7
    cyl("Steel", (p0.x, p0.y, 30.6), (tp.x, tp.y, 30.6), 0.55, seg=16)
    ico("Steel", (p0.x, p0.y, 30.6), 0.6, sub=2)
for k in range(6):
    a = TAU * k / 6
    p = cc + Vector((math.cos(a), math.sin(a))) * 1.7
    ico("Steel", (p.x, p.y, 31.5), 0.62, sub=2)
ring("Concrete", cc.x, cc.y, 0.01, 3.4, POOLS[1][1] - 0.2, POOLS[1][1] + 1.2, seg=32)  # collar through pool 2

# ---------- old substation (2026 trace) ----------
x0, x1, y0, y1, H = SUB
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
W, D = x1 - x0, y1 - y0
box("OldBase", (cx, cy, 0.6), (W + 0.8, D + 0.8, 1.2))
box("OldConcrete", (cx, cy, H / 2), (W, D, H))
for zz in (3.75, 6.95):
    box("OldTrim", (cx, cy, zz), (W + 0.35, D + 0.35, 0.22))
box("OldTrim", (cx, cy, H - 0.2), (W + 0.6, D + 0.6, 0.4))
box("OldTrim", (cx, cy, H + 0.1), (W + 0.9, D + 0.9, 0.22))
for (ax, ay, bx, by) in ((x0, y0, x1, y0), (x0, y1, x1, y1), (x0, y0, x0, y1), (x1, y0, x1, y1)):
    beam("OldConcrete", (ax, ay, H + 0.6), (bx, by, H + 0.6), 0.35, 0.9)      # parapet

FLOORS = [(2.5, 1.9), (5.35, 2.4), (8.3, 2.1)]
def facade(o, T, N, length, bay):
    ang = math.atan2(T.y, T.x)
    nb = int(round(length / bay))
    bay = length / nb
    def P(u, out, zz):
        q = o + T * u + N * out
        return (q.x, q.y, zz)
    for k in range(nb + 1):                       # pilasters
        box("OldConcrete", P(k * bay, 0.15, (1.2 + H - 0.4) / 2), (0.6, 0.3, H - 1.6), rz=ang)
    for k in range(nb):
        for f, (zc, hgt) in enumerate(FLOORS):
            for wu in (0.3, 0.7):
                u = (k + wu) * bay
                w = bay * 0.28
                box("OldWindow", P(u, -0.02, zc), (w, 0.12, hgt), rz=ang)
                box("OldTrim", P(u, 0.1, zc - hgt / 2 - 0.08), (w + 0.25, 0.2, 0.14), rz=ang)   # sill
                box("OldTrim", P(u, 0.08, zc + hgt / 2 + 0.1), (w + 0.2, 0.16, 0.2), rz=ang)    # lintel
                for sx in (-1, 1):
                    box("OldTrim", P(u + sx * (w / 2 + 0.05), 0.06, zc), (0.1, 0.14, hgt), rz=ang)
                box("SteelDark", P(u, 0.05, zc), (0.05, 0.06, hgt), rz=ang)              # mullion
                box("SteelDark", P(u, 0.05, zc + hgt * 0.22), (w, 0.06, 0.05), rz=ang)   # transom
        box("OldWindow", P((k + 0.5) * bay, -0.02, 9.55), (bay * 0.55, 0.12, 0.5), rz=ang)  # attic slot

facade(Vector((x0, y0, 0)), Vector((1, 0, 0)), Vector((0, -1, 0)), W, 3.0)
facade(Vector((x1, y1, 0)), Vector((-1, 0, 0)), Vector((0, 1, 0)), W, 3.0)
facade(Vector((x1, y0, 0)), Vector((0, 1, 0)), Vector((1, 0, 0)), D, 2.75)
facade(Vector((x0, y1, 0)), Vector((0, -1, 0)), Vector((-1, 0, 0)), D, 2.75)
# central raised hall
box("OldConcrete", (-12, cy, H + 1.5), (6.0, D - 0.6, 3.0))
box("OldTrim", (-12, cy, H + 3.1), (6.6, D, 0.3))
for k in range(4):
    box("OldWindow", (-14.25 + 1.5 * k, y0 + 0.28, H + 1.5), (0.7, 0.12, 2.0))
    box("OldWindow", (-14.25 + 1.5 * k, y1 - 0.28, H + 1.5), (0.7, 0.12, 2.0))
# entrance with canopy
box("OldWindow", (-12, y0 - 0.06, 1.9), (2.6, 0.12, 3.0))
box("OldTrim", (-12, y0 - 0.9, 3.55), (4.2, 1.8, 0.25))
for sx in (-1.9, 1.9):
    cyl("OldTrim", (-12 + sx, y0 - 1.6, 0), (-12 + sx, y0 - 1.6, 3.45), 0.15, seg=10)
# rooftop plant
for _ in range(10):
    ux, uy = random.uniform(x0 + 1.5, x1 - 1.5), random.uniform(y0 + 1.5, y1 - 1.5)
    if abs(ux + 12) < 3.6:
        continue
    sx, sy = random.uniform(1.2, 2.2), random.uniform(1.0, 1.6)
    box("House", (ux, uy, H + 0.75), (sx, sy, 1.1))
    cyl("SteelDark", (ux, uy, H + 1.3), (ux, uy, H + 1.36), min(sx, sy) * 0.35, seg=16)
beam("Steel", (x0 + 1.0, y0 + 1.0, H + 0.4), (x0 + 1.0, y1 - 1.0, H + 0.4), 0.3, 0.3)
beam("Steel", (x1 - 1.0, y0 + 1.0, H + 0.4), (x1 - 1.0, y1 - 1.0, H + 0.4), 0.3, 0.3)

# ---------- transformer yard ----------
X0, X1, Y0, Y1 = YARD
box("Gravel", ((X0 + X1) / 2, (Y0 + Y1) / 2, 0.06), (X1 - X0, Y1 - Y0, 0.12))
for ry in (-15.0, -19.5):
    for rx in (-19.5, -16.3, -13.1, -9.9, -6.7):
        box("Concrete", (rx, ry, 0.3), (2.6, 2.0, 0.6))
        box("House", (rx, ry, 1.75), (2.0, 1.5, 2.3))
        for f in range(8):
            for side in (-1, 1):
                box("SteelDark", (rx - 0.88 + 0.25 * f, ry + side * 0.95, 1.7), (0.06, 0.45, 1.9))
        cyl("House", (rx - 0.8, ry - 0.5, 3.45), (rx + 0.8, ry - 0.5, 3.45), 0.3, seg=16)   # conservator
        for sx in (-0.6, 0.6):
            cyl("SteelDark", (rx + sx, ry - 0.5, 2.9), (rx + sx, ry - 0.5, 3.2), 0.05, seg=6)
        for ix in (-0.6, 0.0, 0.6):
            x, y = rx + ix, ry + 0.2
            cyl("Ceramic", (x, y, 2.9), (x, y, 5.0), 0.1, seg=8)
            ico("Steel", (x, y, 5.05), 0.14, sub=1)
            for d in range(8):
                zz = 3.05 + d * 0.24
                cyl("Ceramic", (x, y, zz), (x, y, zz + 0.07), 0.26, seg=10)
            cyl("Steel", (x, y, 5.0), (x, y + (1.5 if ry > -17 else -1.5), 6.2), 0.05, seg=6)
for gy in (-13.5, -21.2):
    for gx in (-21.3, -5.5):
        cyl("SteelDark", (gx, gy, 0), (gx, gy, 6.4), 0.18, seg=6)
    beam("SteelDark", (-21.3, gy, 6.3), (-5.5, gy, 6.3), 0.25, 0.4)
beam("SteelDark", (-21.3, -17.25, 6.3), (-5.5, -17.25, 6.3), 0.25, 0.4)
for gx in (-21.3, -5.5):
    beam("SteelDark", (gx, -21.2, 6.3), (gx, -13.5, 6.3), 0.25, 0.4)
cyl("Steel", (-13, -12.6, 3.0), (-13, -10.6, 3.0), 0.3, seg=10)
cyl("Steel", (-9, -12.6, 3.0), (-9, -10.6, 3.0), 0.3, seg=10)

# ---------- ground plaza, basin, sea ----------
box("Plaza", (-6.0, 0.0, -0.5), (52.0, 64.0, 1.0))   # x −32..20, cut by the basin below
for k in range(10):                                     # steps down to the basin water
    rin = BASIN_R - (k + 1) * 0.38
    ring("Paving", BASIN_C[0], BASIN_C[1], rin, BASIN_R, -3.2, 0.0 - (k + 1) * 0.13, 1.75, 4.2)
disk("Water", BASIN_C[0], BASIN_C[1], BASIN_R, BASIN_W)
disk("Concrete", BASIN_C[0], BASIN_C[1], BASIN_R + 0.6, -3.2)
ring("Concrete", BASIN_C[0], BASIN_C[1], BASIN_R, BASIN_R + 0.6, -3.4, 0.3, 0.55, TAU - 0.55)
ring("Concrete", BASIN_C[0], BASIN_C[1], BASIN_R, BASIN_R + 0.6, -3.4, -1.5, -0.55, 0.55)
ring("Concrete", BASIN_C[0], BASIN_C[1], BASIN_R - 0.1, BASIN_R + 0.7, -0.2, 0.3, -0.55, 0.55)
ring("Glow", BASIN_C[0], BASIN_C[1], BASIN_R + 0.6, BASIN_R + 0.66, -0.6, -0.45, 0.55, TAU - 0.55)
ring("Glass", BASIN_C[0], BASIN_C[1], BASIN_R + 0.3, BASIN_R + 0.35, 0.3, 1.2, -0.55, 1.75)
ring("Glass", BASIN_C[0], BASIN_C[1], BASIN_R + 0.3, BASIN_R + 0.35, 0.3, 1.2, 4.2, TAU - 0.55)
for k in range(7):                                      # weir piers and outflow to the sea
    a = -0.55 + 1.1 * k / 6
    p = polar(BASIN_C, BASIN_R + 0.3, a)
    box("Concrete", (p.x, p.y, -1.8), (1.0, 1.0, 3.2), rz=a)
for k in range(6):
    a = -0.55 + 1.1 * (k + 0.5) / 6
    bm = bm_("Fall")
    vs = []
    for i in range(2):
        aa = a - 0.06 + 0.12 * i
        for s in (0.0, 0.5, 1.0):
            p = polar(BASIN_C, BASIN_R + 0.6 + 0.7 * math.sqrt(s), aa)
            vs.append(bm.verts.new((p.x, p.y, BASIN_W - s * 1.25)))
    for s in range(2):
        bm.faces.new((vs[s], vs[3 + s], vs[4 + s], vs[s + 1]))
    p = polar(BASIN_C, BASIN_R + 1.5, a)
    ico("Foam", (p.x, p.y, -2.6), 0.5, sub=1, scale=(1, 1, 0.4))
bmesh.ops.create_grid(bm_("Sea"), x_segments=48, y_segments=256, size=0.5,
                      matrix=M4((26.0, 0.0, -2.7), None, (12.0, 64.0, 1.0)))
box("Concrete", (20.0, 0.0, -1.5), (0.6, 64.0, 3.0))   # sea wall

# light lines toward the town
LINES = [[(-12, -22.5), (-12, -27), (-31.5, -27)],
         [(-8, -22.5), (-8, -30.5), (3, -30.5)],
         [(-5, -17), (0.5, -17), (0.5, -31.5)],
         [(-21.5, -6), (-30, -6), (-30, 10)],
         [(-21.5, -1), (-28, -1), (-28, 31.5)],
         [(-14, 0.5), (-14, 4), (-20, 4), (-20, 31.5)]]
for line in LINES:
    for a, b in zip(line, line[1:]):
        beam("Glow", (a[0], a[1], 0.02), (b[0], b[1], 0.02), 0.22, 0.03)

# trees on the plaza
def blocked(x, y):
    if X0 - 2 < x < X1 + 1 and Y0 - 2 < y < SUB[3] + 1.5:
        return True
    if math.dist((x, y), BASIN_C) < BASIN_R + 2.0 or x > 18.5:
        return True
    if math.dist((x, y), cc) < 4.5:
        return True
    if any(math.dist((x, y), b) < 3.0 for b, _ in LEGS):
        return True
    if -6 < x < 4 and y < -17:
        return True
    return False

placed = 0
while placed < 100:
    x, y = random.uniform(-31, 18), random.uniform(-31, 31)
    if blocked(x, y):
        continue
    s = random.uniform(0.8, 1.2)
    disk("Grass", x, y, 1.8 * s, 0.02, seg=24)
    ring("Concrete", x, y, 1.8 * s, 1.95 * s, 0.0, 0.15, seg=24)
    for _ in range(3):
        a = random.uniform(0, TAU)
        ico(random.choice(["Leaf", "Leaf2", "Leaf3"]), (x + math.cos(a) * 1.1 * s, y + math.sin(a) * 1.1 * s, 0.3),
            0.45 * s, sub=2, scale=(1, 1, 0.7))
    tree(x, y, 0.0, s)
    placed += 1

# ---------- build objects ----------
def MATS_KEY(g):
    return ALIAS.get(g, g)
coll = bpy.data.collections.get("Q02A_HydroTerrace") or bpy.data.collections.new("Q02A_HydroTerrace")
if coll.name not in bpy.context.scene.collection.children:
    bpy.context.scene.collection.children.link(coll)
root = bpy.data.objects.new("q02a_hydro_terrace", None)
coll.objects.link(root)
for g, bm in G.items():
    me = bpy.data.meshes.new("q02a_" + g.lower())
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    try:
        me.set_sharp_from_angle(angle=math.radians(35))
    except Exception:
        pass
    me.materials.append(MATS["WheelMetal"] if g.startswith("Wheel") else MATS[MATS_KEY(g)])
    ob = bpy.data.objects.new("q02a_" + g.lower(), me)
    coll.objects.link(ob)
    ob.parent = root

# cut the basin out of the plaza
pav = bpy.data.objects["q02a_plaza"]
cut_me = bpy.data.meshes.new("cut")
cbm = bmesh.new()
bmesh.ops.create_cone(cbm, cap_ends=True, segments=72, radius1=BASIN_R + 0.6, radius2=BASIN_R + 0.6,
                      depth=4.0, matrix=Matrix.Translation((BASIN_C[0], BASIN_C[1], -1.0)))
cbm.to_mesh(cut_me); cbm.free()
cutter = bpy.data.objects.new("cut", cut_me)
coll.objects.link(cutter)
mod = pav.modifiers.new("basin", "BOOLEAN")
mod.object = cutter
mod.operation = "DIFFERENCE"
mod.solver = "EXACT"
bpy.context.view_layer.objects.active = pav
bpy.ops.object.modifier_apply(modifier="basin")
bpy.data.objects.remove(cutter, do_unlink=True)
bpy.data.meshes.remove(cut_me)

# rotating turbine wheels
for g, ctr, rot, sgn in WHEELS:
    piv = bpy.data.objects.new("q02a_%s_pivot" % g.lower(), None)
    coll.objects.link(piv)
    piv.parent = root
    piv.matrix_world = Matrix.Translation(ctr) @ rot.to_4x4()
    wob = bpy.data.objects["q02a_" + g.lower()]
    wob.parent = piv
    wob.matrix_parent_inverse = Matrix.Identity(4)
    wob.location = (0, 0, 0)
    fc = wob.driver_add("rotation_euler", 2)
    fc.driver.expression = "frame*%f" % (0.06 * sgn)

# gentle ocean swell on the sea strip
sea = bpy.data.objects["q02a_sea"]
oc = sea.modifiers.new("ocean", "OCEAN")
try:
    oc.geometry_mode = "DISPLACE"
except Exception as e:
    print("ocean mode", e)
oc.spatial_size = 20
oc.wave_scale = 0.25
oc.resolution = 10
oc.use_normals = True
fc = oc.driver_add("time")
fc.driver.expression = "frame/24"

# ---------- camera, light, world ----------
cam = bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
bpy.context.scene.collection.objects.link(cam)
cam.location = (6.0, -96.0, 54.0)
cam.data.lens = 50
tgt = bpy.data.objects.new("CamTarget", None)
bpy.context.scene.collection.objects.link(tgt)
tgt.location = (-2.0, 0.0, 9.0)
tc = cam.constraints.new("TRACK_TO")
tc.target = tgt
bpy.context.scene.camera = cam
sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
bpy.context.scene.collection.objects.link(sun)
sun.data.energy = 4.0
sun.data.angle = math.radians(3)
sun.rotation_euler = (math.radians(48), 0, math.radians(35))
w = bpy.context.scene.world or bpy.data.worlds.new("World")
bpy.context.scene.world = w
w.use_nodes = True
bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (0.78, 0.76, 0.72, 1)     # neutral-warm fill light
bg.inputs[1].default_value = 0.55
for n in [n for n in w.node_tree.nodes if n.name in ("SkyCam", "SkyMix", "SkyPath")]:
    w.node_tree.nodes.remove(n)
cam_bg = w.node_tree.nodes.new("ShaderNodeBackground"); cam_bg.name = "SkyCam"
cam_bg.inputs[0].default_value = (0.32, 0.55, 0.90, 1)   # blue sky seen by the camera
cam_bg.inputs[1].default_value = 1.0
lp_ = w.node_tree.nodes.new("ShaderNodeLightPath"); lp_.name = "SkyPath"
mx_ = w.node_tree.nodes.new("ShaderNodeMixShader"); mx_.name = "SkyMix"
wout = next(n for n in w.node_tree.nodes if n.type == "OUTPUT_WORLD")
w.node_tree.links.new(lp_.outputs["Is Camera Ray"], mx_.inputs[0])
w.node_tree.links.new(bg.outputs[0], mx_.inputs[1])
w.node_tree.links.new(cam_bg.outputs[0], mx_.inputs[2])
w.node_tree.links.new(mx_.outputs[0], wout.inputs["Surface"])
try:
    sc0 = bpy.context.scene
    sc0.view_settings.view_transform = "AgX"
    looks = [i.identifier for i in sc0.view_settings.bl_rna.properties["look"].enum_items]
    sc0.view_settings.look = next((l for l in looks if "Punchy" in l), next((l for l in looks if "High Contrast" in l), "None"))
    sc0.view_settings.exposure = -0.3
except Exception as e:
    print("look", e)
sc = bpy.context.scene
sc.render.resolution_x, sc.render.resolution_y = 1600, 1200
sc.unit_settings.system = "METRIC"
sc.frame_start, sc.frame_end = 1, 120
for attr, val in (("use_raytracing", True), ("taa_render_samples", 128), ("use_shadows", True),
                  ("shadow_ray_count", 2), ("shadow_step_count", 8), ("use_gtao", True)):
    try:
        setattr(sc.eevee, attr, val)
    except Exception:
        pass
sun.data.energy = 4.5
sun.data.color = (1.0, 0.93, 0.82)
for n in [n for n in w.node_tree.nodes if n.type == "TEX_SKY"]:
    w.node_tree.nodes.remove(n)

print("BUILT", len(G), "groups")

# viewport (Solid mode) colours: material.diffuse_color only affects the viewport
for m in bpy.data.materials:
    if not m.use_nodes:
        continue
    b = next((x for x in m.node_tree.nodes if x.type == "BSDF_PRINCIPLED"), None)
    if not b:
        continue
    inp = b.inputs["Base Color"]
    col = list(inp.default_value)
    if inp.is_linked:
        src = inp.links[0].from_node
        if src.type == "VALTORGB":
            col = list(src.color_ramp.elements[1].color)
        elif src.type == "TEX_BRICK":
            col = list(src.inputs["Color1"].default_value)
        elif src.type == "MIX":
            col = list(src.inputs[7].default_value)
    m.diffuse_color = (col[0], col[1], col[2], b.inputs["Alpha"].default_value)
for scr in bpy.data.screens:
    for area in scr.areas:
        if area.type == "VIEW_3D":
            area.spaces.active.shading.color_type = "MATERIAL"

# save when a path follows "--" on the command line
import sys
if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 1:
    bpy.context.scene.frame_set(30)
    bpy.ops.wm.save_as_mainfile(filepath=sys.argv[sys.argv.index("--") + 1], compress=True)
