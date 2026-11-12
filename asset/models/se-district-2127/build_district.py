"""Build SE district variants in metres; tower Y is authored at 100 m and normalized at runtime."""
import math, os, sys
import bpy
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from geo_helpers import Acc, cyl, obox, finish_mesh, material, blob, tube, sweep, circle_pts, ring_section

ROLES = {'district_white': ((.94,.94,.90,1), None), 'district_room': ((.79,.59,.42,1), (.80,.47,.24,1)), 'district_amber': ((1,.52,.08,1), (1,.42,.04,1)), 'district_green': ((.25,.48,.18,1), None), 'district_dark': ((.24,.20,.18,1), None), 'district_glass': ((.8,.92,.95,.18), None)}

def build(kind):
    a={k:Acc() for k in ROLES}; w,r,amber,green,dark,glass=(a[k] for k in ROLES)
    def box(mat,x,y,z,sx,sy,sz): obox(mat,(x,y,z),(sx,sy,sz))
    def disc(mat,x,z,radius,y,h): cyl(mat,x,z,radius,y,y+h,32)
    def person(x,y,z,scale=1):
        box(dark,x,y+1.05*scale,z,.5*scale,1.2*scale,.36*scale)
        disc(dark,x,z,.25*scale,y+1.65*scale,.45*scale)
    def room(x,z,y,width,depth,height):
        box(r,x,y+height/2,z,width-5,height,depth-5)
        # Pale walls are recessed behind open-facing frames; dark figures and counters sit proud of both facades.
        for side in [-1,1]:
            for dx in [-.34,0,.34]:
                box(w,x+dx*width,y+height/2,z+side*(depth/2+.06),.18,height,.16)
            for dx in [-.2,.2]: person(x+dx*width,y,z+side*(depth/2-.35),1.2)
            box(dark,x,y+.55,z+side*(depth/2-.4),width*.3,1.1,.3)
            box(glass,x,y+height/2,z+side*(depth/2+.55),width,height,.08)
            for dz in [-.3,0,.3]:
                box(w,x+side*(width/2+.06),y+height/2,z+dz*depth,.16,height,.18)
            for dz in [-.2,.2]: person(x+side*(width/2-.35),y,z+dz*depth,1.2)
            box(dark,x+side*(width/2-.4),y+.55,z,.3,1.1,depth*.3)
            box(glass,x+side*(width/2+.55),y+height/2,z,.08,height,depth)
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
            room(0,0,y0,wx-2,wz-2,y1-y0-2)
            box(w,0,y1,0,wx,1.5,wz); box(green,0,y1+1,0,wx-2,.7,wz-2)
            for side in [-1,1]:
                box(amber,0,y1-1.1,side*(wz/2-.2),wx-.5,.3,.25); box(amber,side*(wx/2-.2),y1-1.1,0,.25,.3,wz-.5)
        box(w,14,50,0,1,96,1); box(amber,14,50,0,.32,95.6,.32); box(w,14,50,0,2.5,4,2.5)
    elif kind=='twin':
        podium()
        for x,top in [(-10.5,100),(10.5,84)]:
            disc(r,x,0,4.8,5,top-5)
            tube(glass,x,0,7.8,5,top,32)
            for y in range(12,top,8):
                disc(w,x,0,8.5,y,1)
                sweep(amber,lambda k:circle_pts(x,0,8.5,32,k),ring_section(0,.25,y+1,y+1.24),caps=(False,False),closed=True)
                for ang in [0,math.pi/2,math.pi,3*math.pi/2]:
                    person(x+7.4*math.cos(ang),y+1,7.4*math.sin(ang),1.15)
            for ang in [0,math.pi/2,math.pi,3*math.pi/2]: box(w,x+7.4*math.cos(ang),top/2,7.4*math.sin(ang),.8,top-.4,.8)
            disc(green,x,0,7.5,top,1)
        for y in [40,72]: box(w,0,y+.2,0,15,3,7); box(r,0,y+2.2,0,14,2,6)
        box(amber,0,50,4,.5,95,.5); box(w,0,50,4,2.5,4,2)
    elif kind=='twist':
        podium()
        for k in range(18):
            y=5+k*5; side=24-k*.35; angle=k*.097
            # The planes turn with the original stepped family.
            t=(math.cos(angle),math.sin(angle)); n=(-math.sin(angle),math.cos(angle))
            obox(r,(0,y+2.2,0),(side-5,4.2,side-5),t,n); obox(w,(0,y+4.6,0),(side, .6,side),t,n)
            for sign in [-1,1]:
                for vx,vz in [t,n]:
                    obox(glass,(sign*vx*(side/2-.2),y+2.2,sign*vz*(side/2-.2)),(side,4.1,.08),(-vz,vx),(vx,vz))
            if k%3==0:
                for x in [-5,5]: person(x,y+.2,side/2,1.0)
        for y in [40,72]: disc(w,0,0,18,y,2); disc(green,0,0,17,y+2,.5); disc(amber,0,0,18,y-.3,.25)
        box(amber,11,50,0,.5,95,.5); box(w,11,35,0,2,4,2)
    elif kind=='double':
        disc(w,0,0,9,0,.7); disc(r,0,0,4.6,0.7,6.4)
        disc(w,0,0,12,7.1,1.2); disc(green,0,0,11.5,8.3,.3)
        disc(r,0,0,3.8,8.6,3.7); disc(w,0,0,9,12.3,1.2); disc(green,0,0,8,13.5,1.2)
        for y,rad in [(1,7.1),(8.6,6.1)]:
            tube(glass,0,0,rad+.6,y,y+3.8,32)
            for k in range(12):
                ang=k*math.pi/6; x,z=(rad+.15)*math.cos(ang),(rad+.15)*math.sin(ang)
                box(w,x,y+2,z,.25,3.8,.25)
                if k%2==0: person(x,y,z,1.15)
                else: box(dark,x,y+1,z,.8,.25,.8)
        sweep(amber,lambda k:circle_pts(0,0,9,32,k),ring_section(0,.2,12.12,12.24),caps=(False,False),closed=True);box(amber,0,2,7.2,2.5,.18,.25)
    else:
        # Annular roof as a broad rim around the planted central tree.
        disc(w,0,0,10.5,0,.7)
        sweep(r,lambda k:circle_pts(0,0,7.3,32,k),ring_section(0,3,.7,4.4),caps=(False,False),closed=True)
        sweep(w,lambda k:circle_pts(0,0,10.5,32,k),ring_section(0,4.5,4.4,5.2),caps=(False,False),closed=True)
        sweep(green,lambda k:circle_pts(0,0,10,32,k),ring_section(0,4.1,5.2,5.5),caps=(False,False),closed=True)
        disc(dark,0,0,.6,.02,8); blob(green,(0,8.84,0),(4.3,2.8,4.3),sub=1)
        tube(glass,0,0,10.1,.7,4.4,32)
        for k in range(12):
            ang=k*math.pi/6; x,z=9.8*math.cos(ang),9.8*math.sin(ang); box(w,x,2.5,z,.3,4,.3)
            if k%2==0: person(x,.7,z,1.15)
            else: box(dark,x,1.7,z,.8,.25,.8)
        sweep(amber,lambda k:circle_pts(0,0,10.55,32,k),ring_section(0,.2,4.2,4.32),caps=(False,False),closed=True)
    if kind in ('twist','terraced','twin','frame'):
        x=-10.5 if kind=='twin' else 0
        roof,top={'twist':(94,107),'terraced':(100,111),'twin':(100.5,112),'frame':(99,110)}[kind]
        disc(w,x,0,.5,roof,top-roof)
    return a

def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root=bpy.data.objects.new('ROOT_SE_DISTRICT_2127',None);bpy.context.scene.collection.objects.link(root)
    mats={k:material(k,rgba,.6,emit=emit,emit_strength=.5) for k,(rgba,emit) in ROLES.items()}
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
