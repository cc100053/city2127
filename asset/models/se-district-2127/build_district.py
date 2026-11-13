"""Build SE district variants in metres; tower Y is authored at 100 m and normalized at runtime."""
import math, os, sys, random
import bpy
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from geo_helpers import Acc, cyl, obox, finish_mesh, material, blob, tube, sweep, circle_pts, ring_section, rot
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'city-kit-2127'))
import modules as M  # shared library modules (asset/models/LIBRARY.md)

ROLES = {'district_white': ((.94,.94,.90,1), None, .5), 'district_room': ((.68,.43,.27,1), (.85,.40,.15,1), 1.2), 'district_amber': ((1,.52,.08,1), (1,.42,.04,1), .5), 'district_green': ((.25,.48,.18,1), None, .5), 'district_dark': ((.065,.052,.045,1), None, .5), 'district_glass': ((.86,.92,.95,.16), None, .5), 'district_floor': ((.46,.30,.19,1), (.62,.28,.10,1), 1.6),
         # R4: lit interiors (orange light seeps out through the glass) and people/furniture that read as people, not black silhouettes.
         'district_glow': ((1,.62,.28,1), (1,.55,.18,1), 2.4), 'district_skin': ((.80,.57,.42,1), None, .5), 'district_cloth_a': ((.17,.30,.50,1), None, .5), 'district_cloth_b': ((.80,.28,.20,1), None, .5), 'district_wood': ((.50,.33,.20,1), None, .5),
         'district_slate': ((.20,.22,.25,1), None, .5), 'district_fabric': ((.84,.60,.47,1), None, .5), 'district_skin_b': ((.52,.35,.26,1), None, .5), 'district_cloth_c': ((.20,.50,.46,1), None, .5)}

def build(kind):
    a={k:Acc() for k in ROLES}; w,r,amber,green,dark,glass,floor,glow,skin,clA,clB,wood,slate,fabric,skinB,clC=(a[k] for k in ROLES)
    rng=random.Random(sum(map(ord,kind))*7919)  # fixed seed per variant: irregular layout, identical on every rebuild
    def box(mat,x,y,z,sx,sy,sz): obox(mat,(x,y,z),(sx,sy,sz))
    def disc(mat,x,z,radius,y,h): cyl(mat,x,z,radius,y,y+h,32)
    # Rooms, lifts, doorways, residents and furnishing are shared library modules (asset/models/LIBRARY.md); district_* roles map onto module roles.
    ctx=M.Ctx({'white':w,'room':r,'amber':amber,'green':green,'dark':dark,'glass':glass,'floor':floor,'glow':glow,'skin':skin,'skin_b':skinB,
               'cloth_a':clA,'cloth_b':clB,'cloth_c':clC,'wood':wood,'slate':slate,'fabric':fabric},rng)
    room=lambda *q:M.glass_room(ctx,*q); lift=lambda *q:M.glass_lift(ctx,*q); furnish=lambda *q:M.furnish(ctx,*q)
    Rect=lambda *q:M.Rect(ctx,*q); Ring=lambda *q:M.Ring(ctx,*q); entrance_glass=lambda *q:M.ring_doorways(ctx,*q)
    def podium(): disc(w,0,0,18.5,0,2)
    if kind=='frame':
        podium()
        for x in [-12,12]:
            for z in [-12,12]: box(w,x,51,z,4,98,4)
        for y in [16,30,44,58,72,86,99]:
            box(w,0,y,0,27.8,1.4,27.8); box(green,0,y+1,0,22,.6,22)
            for edge in [-12.8,12.8]:
                box(amber,0,y-.85,edge,26,.24,.24); box(amber,edge,y-.85,0,.24,.24,26)
        for y in [17,45,73]: room(0,0,y,17,17,10)
        for y in [31.7,59.7]:
            for x,z in [(-8,-7),(-4,-8),(2,-7),(7,-7),(-8,6),(-4,7),(2,7),(7,6)]: blob(green,(x,y+.35,z),(2.2,1.3,1.8),sub=1)
        def diagonal(z, lo, hi, flip):
            x0,x1=(-12,12) if flip else (12,-12)
            dx,dy=x1-x0,hi-lo; length=math.hypot(dx,dy); nx,ny=-dy/length*1.2,dx/length*1.2
            v=[(x0+sx*nx,lo+sx*ny,z+sz*1.2) for sx,sz in [(-1,-1),(1,-1),(1,1),(-1,1)]] + [(x1+sx*nx,hi+sx*ny,z+sz*1.2) for sx,sz in [(-1,-1),(1,-1),(1,1),(-1,1)]]
            w.solid(v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
        for z in [-12,12]:
            diagonal(z,5,52,False); diagonal(z,52,98,True)
    elif kind=='terraced':
        podium()
        box(w,0,4.9,0,32,.4,26)
        for x in [-14,14]:
            for z in [-10,10]: box(w,x,3.5,z,1,3,1)
        for y0,y1,wx,wz in [(5,40,32,26),(40,72,24,20),(72,100,16,14)]:
            height=(y1-y0-3)/2
            nf=max(1,round(height/5.5))  # real floors (about 5 m each) instead of one 16 m hall, so people and furniture read at scale
            for base in (y0,y0+height+1.2):
                for fl in range(nf): room(0,0,base+fl*height/nf,wx-2,wz-2,height/nf-(.2 if fl<nf-1 else 0))
            box(w,0,y0+height+.6,0,wx-.8,1.4,wz-.8)
            for x,z in [(-wx/3,-wz/3),(0,-wz/3),(wx/3,-wz/3)]: blob(green,(x,y1+1.8,z),(1.4,1,1.4),sub=1)
            box(w,0,y1,0,wx,1.5,wz); box(green,0,y1+1,0,wx-2,.7,wz-2)
            for side in [-1,1]:
                box(amber,0,y1-1.1,side*(wz/2-.2),wx-.5,.3,.25); box(amber,side*(wx/2-.2),y1-1.1,0,.25,.3,wz-.5)
        # Exposed +X/+Z corner faces the east review after this slot's yaw.
        lift(13.6,11,2,98,43)
        for x in [-1.3,1.3]: box(w,x,2.12,13,.24,4.2,.24)
        box(amber,0,4.15,13,2.8,.18,.24)
    elif kind=='twin':
        podium()
        for x,top in [(-10.5,100),(10.5,84)]:
            disc(r,x,0,3.2,5,top-5)
            tube(glass,x,0,7.8,5,top,32)
            for y in range(12,top,8):
                disc(w,x,0,8.5,y,1)
                disc(floor,x,0,7.5,y+.98,.08); cyl(glow,x,0,7.5,y-.08,y,16)
                sweep(amber,lambda k:circle_pts(x,0,8.5,32,k),ring_section(0,.25,y+1,y+1.24),caps=(False,False),closed=True)
                furnish(Ring(x,0,3.4,7.5),y+1.06,6.9,2 if y % 16 == 12 else 1,1)
            for ang in [0,math.pi/2,math.pi,3*math.pi/2]: box(w,x+7.4*math.cos(ang),top/2,7.4*math.sin(ang),.8,top-.4,.8)
            disc(green,x,0,7.5,top,1)
        for y in [40,72]:
            box(w,0,y+.2,0,15,3,7); box(r,0,y+2.5,0,14,2.6,.3); box(floor,0,y+1.75,0,14,.1,6.4); box(glow,0,y+3.55,0,13,.06,5.6)
            for z in [-3.05,3.05]:
                box(glass,0,y+2.5,z,14,2.6,.1)
                for x in [-6.5,-3.2,0,3.2,6.5]: box(w,x,y+2.5,z,.2,2.6,.2)
            furnish(Rect(0,0,14,6.4),y+1.8,2.3,2,1)
        # Guide attaches to the camera-facing side of the left shaft.
        lift(-3.7,-6.5,2,94,43,2.6,2.4)
        for y in [10,45,75]: box(w,-5.3,y,-6.5,3.2,.6,.6)
    elif kind=='twist':
        podium()
        for k in range(18):
            y=5+k*5; side=24-k*.35; angle=k*.097
            # The planes turn with the original stepped family.
            t=(math.cos(angle),math.sin(angle)); n=(-math.sin(angle),math.cos(angle))
            obox(w,(0,y+4.6,0),(side, .6,side),t,n)
            obox(floor,(0,y-.05,0),(side-2,.3,side-2),t,n)
            for sign in [-1,1]:
                for vx,vz in [t,n]:
                    obox(glass,(sign*vx*(side/2-.2),y+2.2,sign*vz*(side/2-.2)),(side,4.1,.08),(-vz,vx),(vx,vz))
            obox(glow,(0,y+4.05,0),(side-2,.06,side-2),t,n)
            furnish(Rect(0,0,side-2,side-2,angle),y+.11,4.0,3,2)
        for y in [40,72]:
            disc(w,0,0,18,y,2); disc(green,0,0,17,y+2,.5); disc(amber,0,0,18,y-.3,.25)
            for x,z in [(-10,-7),(-5,-10),(2,-11),(8,-8)]: blob(green,(x,y+3,z),(1.8,1.1,1.6),sub=1)
        lift(9,-7,2,98,33)
        for x in [-1.3,1.3]: box(w,x,2.02,-11,.22,4,.22)
        box(amber,0,3.98,-11,2.8,.18,.2)
        # Second entry faces +X at the south review yaw, inside the existing plinth.
        box(dark,11.2,2,-.15,.16,3.8,2.5)
        for z in [-1.5,1.5]: box(w,11.3,2.02,z,.2,4,.2)
        box(amber,11.34,4.05,0,.2,.18,2.9)
    elif kind=='double':
        disc(w,0,0,9,0,.7); disc(floor,0,0,7.2,.68,.1); disc(r,0,0,3.4,0.7,6.4)
        disc(w,0,0,12,7.1,1.2); disc(green,0,0,11.5,8.3,.3)
        disc(floor,0,0,6.2,8.58,.1); disc(r,0,0,2.8,8.6,3.7); disc(w,0,0,9,12.3,1.2); disc(green,0,0,8,13.5,1.2)
        hh_low=6.4
        disc(glow,0,0,6.8,7.02,.08); disc(glow,0,0,5.8,12.22,.08)
        for y,rad in [(.7,7.1),(8.6,6.1)]:
            hh=hh_low if y < 2 else 3.8  # lower pillars and glass now reach the 7.1 m slab; before, they stopped 2.6 m short and floated
            if y < 2: entrance_glass(rad+.6,y,y+hh)
            else: tube(glass,0,0,rad+.6,y,y+hh,32)
            for k in range(12):
                ang=k*math.pi/6; x,z=(rad+.15)*math.cos(ang),(rad+.15)*math.sin(ang)
                box(w,x,y+hh/2,z,.25,hh,.25)
        furnish(Ring(0,0,3.6,7.0),.78,hh_low,4,2); furnish(Ring(0,0,3.0,6.1),8.68,3.6,3,2)
        sweep(amber,lambda k:circle_pts(0,0,9,32,k),ring_section(0,.2,12.12,12.24),caps=(False,False),closed=True);box(amber,0,2,7.2,2.5,.18,.25)
    else:
        # Annular roof as a broad rim around the planted central tree.
        disc(w,0,0,10.5,0,.7)
        sweep(floor,lambda k:circle_pts(0,0,9.75,32,k),ring_section(0,4.8,.68,.78),caps=(False,False),closed=True)
        sweep(r,lambda k:circle_pts(0,0,4.8,32,k),ring_section(0,2,.7,4.4),caps=(False,False),closed=True)
        sweep(w,lambda k:circle_pts(0,0,10.5,32,k),ring_section(0,4.5,4.4,5.2),caps=(False,False),closed=True)
        sweep(green,lambda k:circle_pts(0,0,10,32,k),ring_section(0,4.1,5.2,5.5),caps=(False,False),closed=True)
        disc(wood,0,0,.6,.02,8); blob(green,(0,8.30,0),(4.3,2.8,4.3),sub=2)
        entrance_glass(10.1,.7,4.4)
        sweep(glow,lambda k:circle_pts(0,0,9.6,32,k),ring_section(0,4.6,4.3,4.38),caps=(False,False),closed=True)
        for k in range(12):
            ang=k*math.pi/6; x,z=9.8*math.cos(ang),9.8*math.sin(ang); box(w,x,2.5,z,.3,4,.3)
        furnish(Ring(0,0,4.9,10.0),.78,3.5,5,3)
        sweep(amber,lambda k:circle_pts(0,0,10.55,32,k),ring_section(0,.2,4.2,4.32),caps=(False,False),closed=True)
    if kind in ('twist','terraced','twin','frame'):
        x=-10.5 if kind=='twin' else 0
        roof,top={'twist':(94,107),'terraced':(100,111),'twin':(100.5,112),'frame':(99,110)}[kind]
        disc(w,x,0,.5,roof,top-roof)
    return a

def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root=bpy.data.objects.new('ROOT_SE_DISTRICT_2127',None);bpy.context.scene.collection.objects.link(root)
    mats={k:material(k,rgba,.6,emit=emit,emit_strength=st) for k,(rgba,emit,st) in ROLES.items()}
    total=0
    for kind in ['twist','terraced','twin','frame','double','ring']:
        variant=bpy.data.objects.new('district_'+kind,None);bpy.context.scene.collection.objects.link(variant);variant.parent=root
        for role,acc in build(kind).items():
            if not acc.v: continue
            ob=finish_mesh(kind+'_'+role,acc,mats[role]);bpy.context.scene.collection.objects.link(ob);ob.parent=variant
            uv=ob.data.uv_layers.new(name='UVMap')
            for poly in ob.data.polygons:
                axis=max(range(3),key=lambda i:abs(poly.normal[i])); dims=[i for i in range(3) if i != axis]
                for li in poly.loop_indices:
                    v=ob.data.vertices[ob.data.loops[li].vertex_index].co
                    uv.data[li].uv=(v[dims[0]]/100,v[dims[1]]/100)
            total+=sum(len(p.vertices)-2 for p in ob.data.polygons)
    bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE,'se-district-2127.blend'))
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE,'se-district-2127.glb'),export_format='GLB',export_yup=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
    print('TOTAL',total)
if __name__=='__main__': main()
