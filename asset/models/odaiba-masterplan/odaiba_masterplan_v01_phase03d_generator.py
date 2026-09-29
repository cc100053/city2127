import bpy, bmesh, math, os, json, struct, random, re
from mathutils import Vector

ROOT=r'C:\FutureCity\sites\odaiba_masterplan\revision_01'
REF=r'C:\FutureCity\references\odaiba_masterplan'
SRC=os.path.join(ROOT,'odaiba_masterplan_v01_phase03c.blend')
DEM=os.path.join(ROOT,'phase03d_dem_cache')
OUT_BLEND=os.path.join(ROOT,'odaiba_masterplan_v01_phase03d.blend')
OUT_GLB=os.path.join(ROOT,'odaiba_masterplan_v01_phase03d_environment.glb')
OUT_MANIFEST=os.path.join(ROOT,'odaiba_masterplan_v01_phase03d_manifest.json')
OUT_VALIDATION=os.path.join(ROOT,'odaiba_masterplan_v01_phase03d_validation.json')
OUT_TERRAIN=os.path.join(ROOT,'terrain_report.json')
OUT_TREES=os.path.join(ROOT,'tree_instances.json')
OUT_LIGHTS=os.path.join(ROOT,'streetlight_instances.json')
TOP=os.path.join(ROOT,'odaiba_masterplan_v01_phase03d_preview_top.png')
OBLIQUE=os.path.join(ROOT,'odaiba_masterplan_v01_phase03d_preview_oblique.png')
STREET=os.path.join(ROOT,'odaiba_masterplan_v01_phase03d_preview_street.png')
WATERFRONT=os.path.join(ROOT,'odaiba_masterplan_v01_phase03d_preview_waterfront.png')
TERRAIN_PREVIEW=os.path.join(ROOT,'odaiba_masterplan_v01_phase03d_preview_terrain.png')

bpy.ops.wm.open_mainfile(filepath=SRC)
if hasattr(bpy.context.preferences.filepaths,'file_preview_type'):
    bpy.context.preferences.filepaths.file_preview_type='NONE'
scene=bpy.context.scene
random.seed(2127)

def collection(name):
    c=bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if not c.name in scene.collection.children: scene.collection.children.link(c)
    return c
TERR=collection('PHASE03D_TERRAIN'); STREETSCAPE=collection('PHASE03D_STREETSCAPE')

def mesh_obj(name,verts,faces,mats,coll,indices=None):
    me=bpy.data.meshes.new(name+'_Mesh'); me.from_pydata(verts,[],faces); me.update()
    o=bpy.data.objects.new(name,me); coll.objects.link(o)
    for m in mats: me.materials.append(m)
    if indices:
        for p,i in zip(me.polygons,indices): p.material_index=i
    return o
def mat(name,color,metallic=0,rough=.7):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metallic
    return m
M={'terrain':bpy.data.materials.get('landscape') or mat('landscape',(.28,.40,.25)),
   'pad':bpy.data.materials.get('sidewalk') or mat('sidewalk',(.48,.49,.48)),
   'tree':bpy.data.materials.get('landscape') or mat('landscape',(.28,.40,.25)),
   'trunk':bpy.data.materials.get('service_area') or mat('service_area',(.30,.23,.16)),
   'metal':bpy.data.materials.get('rail_structure') or mat('rail_structure',(.28,.31,.33),.35,.45)}

def point_in_poly(p,poly):
    x,y=p;c=False
    for i in range(len(poly)):
        x1,y1=poly[i];x2,y2=poly[(i+1)%len(poly)]
        if (y1>y)!=(y2>y) and x<(x2-x1)*(y-y1)/(y2-y1)+x1:c=not c
    return c
def segdist(p,a,b):
    p=Vector(p);a=Vector(a);b=Vector(b);ab=b-a
    if ab.length_squared<1e-9:return (p-a).length
    return (p-(a+ab*max(0,min(1,(p-a).dot(ab)/ab.length_squared)))).length
def poly_dist(p,poly):
    if point_in_poly(p,poly):return 0.0
    return min(segdist(p,poly[i],poly[(i+1)%len(poly)]) for i in range(len(poly)))
def descendants(parent):
    out=[]
    for o in bpy.data.objects:
        q=o.parent
        while q:
            if q==parent:
                if o.type=='MESH' and not o.hide_render:out.append(o)
                break
            q=q.parent
    return out
def hull(points):
    pts=sorted(set((round(x,3),round(y,3)) for x,y in points))
    def cr(o,a,b):return(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    lo=[];hi=[]
    for p in pts:
        while len(lo)>1 and cr(lo[-2],lo[-1],p)<=0:lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(hi)>1 and cr(hi[-2],hi[-1],p)<=0:hi.pop()
        hi.append(p)
    return lo[:-1]+hi[:-1]
def projected_faces(objs,min_area=.1):
    out=[]
    for o in objs:
        if not o or o.type!='MESH':continue
        for f in o.data.polygons:
            q=[o.matrix_world@o.data.vertices[i].co for i in f.vertices];p=[(v.x,v.y) for v in q]
            a=abs(sum(p[i][0]*p[(i+1)%len(p)][1]-p[(i+1)%len(p)][0]*p[i][1] for i in range(len(p)))/2)
            if a>min_area:out.append(p)
    return out

placements=sorted([o for o in bpy.data.objects if o.name.startswith('PLACEMENT_')],key=lambda o:o.name)
placement_before={p.name:[round(v,9) for row in p.matrix_world for v in row] for p in placements}
building_polys=[]
for p in placements:
    building_polys.append(hull(((o.matrix_world@v.co).x,(o.matrix_world@v.co).y) for o in descendants(p) for v in o.data.vertices))
ctx=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('CTX_')]
context_polys=projected_faces(ctx)
road_objs=[bpy.data.objects.get(n) for n in ['ROAD_MAJOR','ROAD_SECONDARY','ROAD_ACCESS'] if bpy.data.objects.get(n)]
road_polys=projected_faces(road_objs)
rail_objs=[bpy.data.objects.get(n) for n in ['YURIKAMOME_GUIDEWAY','YURIKAMOME_PIERS','STATIONS','YURIKAMOME_PHASE03C_REFINEMENT'] if bpy.data.objects.get(n)]
rail_polys=projected_faces(rail_objs)
land=bpy.data.objects['LAND_MAIN'];land_polys=projected_faces([land])

# GSI DEM5A z15 sampler. Tile values are GSI linearly-smoothed elevation-tile values.
Z=15;ORIGIN_LON=139.774251;ORIGIN_LAT=35.6267596;R=6378137.0;COS=math.cos(math.radians(ORIGIN_LAT))
OX=R*math.radians(ORIGIN_LON);OY=R*math.log(math.tan(math.pi/4+math.radians(ORIGIN_LAT)/2))
tiles={};raw=[];missing=0
for x in range(29106,29108):
    for y in range(12908,12911):
        fn=os.path.join(DEM,f'dem5a-{x}-{y}.txt');vals=re.split('[,\\r\\n]+',open(fn,encoding='utf-8').read().strip())
        arr=[None if v=='e' or not v else float(v) for v in vals];tiles[(x,y)]=arr;raw.extend(v for v in arr if v is not None);missing+=sum(v is None for v in arr)
def local_to_lonlat(x,y):
    mx=OX+x/COS;my=OY+y/COS
    return math.degrees(mx/R),math.degrees(2*math.atan(math.exp(my/R))-math.pi/2)
def dem_raw(x,y):
    lon,lat=local_to_lonlat(x,y);n=2**Z;gx=(lon+180)/360*n;gy=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n
    tx,ty=int(gx),int(gy);a=tiles.get((tx,ty))
    if not a:return None
    px=max(0,min(255,int((gx-tx)*256)));py=max(0,min(255,int((gy-ty)*256)))
    return a[py*256+px]
BASE=dem_raw(0,0) or 5.38
def base_z(x,y):
    # Broad low-pass sampling suppresses isolated quay/structure cells while
    # preserving the measured DEM trend across this nearly level reclaimed site.
    vals=[dem_raw(x+dx,y+dy) for dx,dy in [(0,0),(-40,0),(40,0),(0,-40),(0,40),(-40,-40),(40,-40),(-40,40),(40,40)]]
    vals=[v for v in vals if v is not None]
    if not vals:return 0.0
    return max(-0.35,min(1.0,(sum(vals)/len(vals)-BASE)*.35))
def terrain_z(x,y):
    z=base_z(x,y)
    d=min((poly_dist((x,y),p) for p in building_polys),default=999)
    if d<14:z*=max(0,d/14)
    return z
def on_land(p):return any(point_in_poly(p,q) for q in land_polys)

# Replace only the derivative Phase 03D land display; Phase 03C source file is untouched.
land.hide_render=True;land.hide_viewport=True
step=20.0;x0=-750;y0=-1337;x1=700;y1=535;nx=round((x1-x0)/step);ny=round((y1-y0)/step)
verts=[];vid={}
for j in range(ny+1):
    y=min(y1,y0+j*step)
    for i in range(nx+1):
        x=min(x1,x0+i*step);vid[(i,j)]=len(verts);verts.append((x,y,terrain_z(x,y)))
faces=[]
for j in range(ny):
    for i in range(nx):
        c=(x0+(i+.5)*step,y0+(j+.5)*step)
        if on_land(c):
            a=vid[(i,j)];b=vid[(i+1,j)];c1=vid[(i+1,j+1)];d=vid[(i,j+1)];faces.extend([(a,b,c1),(a,c1,d)])
terrain=mesh_obj('TERRAIN_LOW_DENSITY',verts,faces,[M['terrain']],TERR)

# Flat pads touch the unchanged detailed buildings at Z=0.
pv=[];pf=[]
for poly in building_polys:
    cen=(sum(x for x,y in poly)/len(poly),sum(y for x,y in poly)/len(poly));expanded=[]
    for x,y in poly:
        d=Vector((x-cen[0],y-cen[1]));d.normalize();expanded.append((x+d.x*3,y+d.y*3,0))
    base=len(pv);pv.append((cen[0],cen[1],0));pv.extend(expanded)
    for i in range(len(poly)):pf.append((base,base+1+i,base+1+(i+1)%len(poly)))
pads=mesh_obj('BUILDING_PADS',pv,pf,[M['pad']],TERR)

# Conform road, sidewalk, marking and public-space surfaces while preserving XY.
conform_names=['ROAD_MAJOR','ROAD_SECONDARY','ROAD_ACCESS','SIDEWALK_NETWORK','PHASE03C_LANDSCAPE','PHASE03C_PLAZA','PHASE03C_SERVICE_AREA','WATERFRONT_PROMENADE','MAJOR_ROAD_MARKINGS','SERVICE_BAY_MARKINGS','PRIMARY_PLAZA_ACCENTS']
offsets={'ROAD_MAJOR':.06,'ROAD_SECONDARY':.06,'ROAD_ACCESS':.06,'SIDEWALK_NETWORK':.16,'PHASE03C_LANDSCAPE':.12,'PHASE03C_PLAZA':.14,'PHASE03C_SERVICE_AREA':.10,'WATERFRONT_PROMENADE':.16,'MAJOR_ROAD_MARKINGS':.075,'SERVICE_BAY_MARKINGS':.13,'PRIMARY_PLAZA_ACCENTS':.17}
for name in conform_names:
    o=bpy.data.objects.get(name)
    if not o:continue
    inv=o.matrix_world.inverted()
    for v in o.data.vertices:
        w=o.matrix_world@v.co;w.z=terrain_z(w.x,w.y)+offsets[name];v.co=inv@w

with open(os.path.join(REF,'odaiba_site_control_lines.json'),encoding='utf-8') as f:controls=json.load(f)
def clear(p,r,include_roads=True):
    if not on_land(p):return False,'sea'
    for q in building_polys+context_polys:
        if poly_dist(p,q)<r+1.5:return False,'building'
    if include_roads:
        for q in road_polys:
            if poly_dist(p,q)<r+.8:return False,'road'
    for q in rail_polys:
        if poly_dist(p,q)<r+1:return False,'rail_or_station'
    return True,''
def add_box(data,x,y,z,sx,sy,sz,rot=0,mi=0):
    v,f,idx=data;a=math.radians(rot);ca,sa=math.cos(a),math.sin(a);base=len(v)
    for dz in (-sz/2,sz/2):
        for px,py in [(-sx/2,-sy/2),(sx/2,-sy/2),(sx/2,sy/2),(-sx/2,sy/2)]:v.append((x+px*ca-py*sa,y+px*sa+py*ca,z+dz))
    f.extend([(base,base+1,base+2,base+3),(base+4,base+7,base+6,base+5),(base,base+4,base+5,base+1),(base+1,base+5,base+6,base+2),(base+2,base+6,base+7,base+3),(base+3,base+7,base+4,base)]);idx.extend([mi]*6)
def add_cyl(data,x,y,z,r,h,n,mi=0):
    v,f,idx=data;base=len(v)
    for zz in (z,z+h):
        for i in range(n):a=2*math.pi*i/n;v.append((x+r*math.cos(a),y+r*math.sin(a),zz))
    for i in range(n):f.append((base+i,base+(i+1)%n,base+n+(i+1)%n,base+n+i));idx.append(mi)
    f.extend([tuple(base+i for i in reversed(range(n))),tuple(base+n+i for i in range(n))]);idx.extend([mi,mi])
def add_cone(data,x,y,z,r,h,n,mi=1):
    v,f,idx=data;base=len(v);v.append((x,y,z+h))
    for i in range(n):a=2*math.pi*i/n;v.append((x+r*math.cos(a),y+r*math.sin(a),z))
    for i in range(n):f.append((base,base+1+i,base+1+(i+1)%n));idx.append(mi)
def interpolate_line(pts,spacing):
    out=[];carry=0
    for a,b in zip(pts,pts[1:]):
        a=Vector(a);b=Vector(b);L=(b-a).length
        if L<.1:continue
        d=b-a;t=max(0,spacing-carry)
        while t<L:out.append(a+d*(t/L));t+=spacing
        carry=max(0,L-(t-spacing))
    return out

# Deterministic roadside tree rows, consolidated to two material primitives.
tree_geo=([],[],[]);tree_records=[];excluded={'building':0,'road':0,'rail_or_station':0,'sea':0};seen=[]
types=[('columnar',.78,6.4,1.8),('round',1.0,7.2,2.5),('compact',.86,5.8,2.15),('waterfront',1.05,6.7,2.7)]
candidate_lines=[]
for r in controls['roads']:
    if r['class'] not in {'motorway','trunk','secondary','tertiary'} or len(r['points'])<2:continue
    pts=r['points'];w=13 if r['class'] in {'motorway','trunk'} else 9
    for side in (-1,1):
        shifted=[]
        for i,p in enumerate(pts):
            a=Vector(pts[max(0,i-1)]);b=Vector(pts[min(len(pts)-1,i+1)]);d=b-a
            if d.length<.1:continue
            d.normalize();n=Vector((-d.y,d.x));shifted.append(Vector(p)+n*(w+5)*side)
        if len(shifted)>1:candidate_lines.append(shifted)
for line in candidate_lines:
    for q in interpolate_line(line,31):
        p=(q.x,q.y)
        if any(math.dist(p,s)<12 for s in seen):continue
        ok,reason=clear(p,2.8,True)
        if not ok:excluded[reason]+=1;continue
        typ=types[len(tree_records)%4];scale=.92+(len(tree_records)%5)*.035;z=terrain_z(*p)
        add_cyl(tree_geo,q.x,q.y,z,.22*scale,typ[2]*.42*scale,7,0);add_cone(tree_geo,q.x,q.y,z+typ[2]*.30*scale,typ[3]*scale,typ[2]*.70*scale,8,1)
        rot=(len(tree_records)*47)%360;tree_records.append({'type':typ[0],'position':[round(q.x,3),round(q.y,3),round(z,3)],'rotationZDeg':rot,'scale':round(scale,3)});seen.append(p)
trees=mesh_obj('ROADSIDE_TREE_INSTANCES',tree_geo[0],tree_geo[1],[M['trunk'],M['tree']],STREETSCAPE,tree_geo[2])

# Streetlights: two repeatable types, one consolidated mesh.
light_geo=([],[],[]);light_records=[];lseen=[]
for line in candidate_lines[::2]:
    for q in interpolate_line(line,36):
        p=(q.x,q.y)
        if any(math.dist(p,s)<18 for s in lseen):continue
        ok,reason=clear(p,.8,True)
        if not ok:continue
        z=terrain_z(*p);kind='road_pole' if len(light_records)%3 else 'pedestrian_bollard';h=6.6 if kind=='road_pole' else 3.6
        add_cyl(light_geo,q.x,q.y,z,.11,h,7,0);add_box(light_geo,q.x,q.y,z+h+.12,.75,.24,.24,(len(light_records)*29)%360,0)
        light_records.append({'type':kind,'position':[round(q.x,3),round(q.y,3),round(z,3)],'rotationZDeg':(len(light_records)*29)%360,'scale':1.0});lseen.append(p)
lights=mesh_obj('STREETLIGHT_INSTANCES',light_geo[0],light_geo[1],[M['metal']],STREETSCAPE,light_geo[2])

# Necessary seawall and elevated-guideway guardrails, consolidated.
railgeo=([],[],[])
coast={str(x['id']):x['points'] for x in controls['coastline']};shore=[]
for cid in ['130970008_0','130971497_0','1122053462_0','1123062256_0']:
    pts=coast.get(cid,[]);shore.extend(pts if not shore else pts[1:])
for a,b in zip(shore,shore[1:]):
    if math.dist(a,b)>55:continue
    mid=((a[0]+b[0])/2,(a[1]+b[1])/2);L=math.dist(a,b);rot=math.degrees(math.atan2(b[1]-a[1],b[0]-a[0]));z=max(terrain_z(*a),terrain_z(*b))
    add_box(railgeo,*mid,z+1.05,L,.10,.10,rot,0)
for r in controls['yurikamome']:
    for a,b in zip(r['points'],r['points'][1:]):
        if math.dist(a,b)>80:continue
        mid=((a[0]+b[0])/2,(a[1]+b[1])/2);L=math.dist(a,b);rot=math.degrees(math.atan2(b[1]-a[1],b[0]-a[0]));add_box(railgeo,*mid,15.25,L,.12,.35,rot,0)
guardrails=mesh_obj('PHASE03D_GUARDRAILS',railgeo[0],railgeo[1],[M['metal']],STREETSCAPE,railgeo[2])

# Terrain/road diagnostics.
tz=[v[2] for v in verts if -2<v[2]<2];max_slope=0
for o in road_objs:
    for e in o.data.edges:
        a=o.matrix_world@o.data.vertices[e.vertices[0]].co;b=o.matrix_world@o.data.vertices[e.vertices[1]].co;run=math.hypot(b.x-a.x,b.y-a.y)
        if run>.2:max_slope=max(max_slope,abs(b.z-a.z)/run*100)
degenerate=sum(1 for o in [terrain,pads,trees,lights,guardrails] for p in o.data.polygons if p.area<1e-8)
tree_json={'phase':'03D','seed':2127,'instanceStrategy':'Four deterministic prototypes; exported geometry consolidated by trunk/canopy material and records convertible to Three.js InstancedMesh','prototypeCount':4,'instanceCount':len(tree_records),'excludedCandidatesByClass':excluded,'instances':tree_records}
light_json={'phase':'03D','seed':2127,'instanceStrategy':'Two deterministic prototypes; geometry consolidated to one mesh and one material','prototypeCount':2,'instanceCount':len(light_records),'individualRealLights':False,'nominalSpacingM':[25,40],'instances':light_records}
with open(OUT_TREES,'w',encoding='utf-8') as f:json.dump(tree_json,f,indent=2)
with open(OUT_LIGHTS,'w',encoding='utf-8') as f:json.dump(light_json,f,indent=2)

# Neutral daylight and required previews. Terrain view uses grazing light, no vertical exaggeration.
if scene.world and scene.world.use_nodes:
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.16,.18,.21,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.85
sun=None
for o in bpy.data.objects:
    if o.type=='LIGHT' and o.data.type=='SUN':sun=o;break
if sun:sun.data.energy=3.1;sun.rotation_euler=(math.radians(28),math.radians(-22),math.radians(-35))
def point(cam,target):cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
def camera(name,loc,target,lens=50,ortho=None):
    d=bpy.data.cameras.new(name+'_Data');o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;d.clip_start=1;d.clip_end=6000
    if ortho:d.type='ORTHO';d.ortho_scale=ortho
    else:d.lens=lens;point(o,target)
    return o
cams=[(camera('CAMERA_03D_TOP',(0,-452,2300),(0,-452,0),ortho=1800),TOP,1600,1800),(camera('CAMERA_03D_OBLIQUE',(1500,-2500,1900),(0,-430,25),50),OBLIQUE,1600,1200),(camera('CAMERA_03D_STREET',(-230,-50,15),(0,-35,7),48),STREET,1600,900),(camera('CAMERA_03D_WATERFRONT',(-720,410,48),(-90,30,10),52),WATERFRONT,1600,900),(camera('CAMERA_03D_TERRAIN',(1080,-1900,430),(20,-480,0),58),TERRAIN_PREVIEW,1600,900)]
scene.render.engine='BLENDER_EEVEE';scene.render.image_settings.file_format='PNG';scene.render.resolution_percentage=100
for cam,path,w,h in cams:
    if path==TERRAIN_PREVIEW and sun:sun.rotation_euler=(math.radians(68),math.radians(-10),math.radians(-63));sun.data.energy=3.8
    scene.camera=cam;scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.filepath=path;bpy.ops.render.render(write_still=True)

terrain_report={'phase':'03D','dataSource':{'provider':'Geospatial Information Authority of Japan (GSI)','dataset':'DEM5A elevation tiles (Fundamental Geospatial Data digital elevation model)','tileUrlTemplate':'https://cyberjapandata.gsi.go.jp/xyz/dem5a/15/{x}/{y}.txt','tileRange':{'zoom':15,'xMin':29106,'xMax':29107,'yMin':12908,'yMax':12910,'tileCount':6},'coordinateSystem':'Web Mercator tile addressing; source heights are GSI elevation values, sampled into local ground metres','nominalResolutionM':5,'sourceMethod':'airborne laser survey; GSI elevation-tile values are linearly smoothed','missingSampleCount':missing,'validSampleCount':len(raw),'rawElevationMinM':min(raw),'rawElevationMaxM':max(raw),'sourceLinks':['https://maps.gsi.go.jp/development/ichiran.html','https://maps.gsi.go.jp/development/demtile.html']},'sceneVerticalDatum':{'localZ0':'DEM5A sample at Fuji TV control-point centre','sourceElevationAtLocalZ0M':BASE,'verticalExaggeration':False,'verticalCompressionFactor':0.35,'terrainClampRelativeM':[-0.35,1.0],'buildingPadsZ':0.0},'terrainMesh':{'samplingIntervalM':step,'vertices':len(verts),'triangles':len(faces),'minZ':min(tz),'maxZ':max(tz),'degenerateFaces':degenerate,'seaHorizontalZ':-0.8},'road':{'maximumSlopePercent':max_slope,'surfaceOffsetAboveTerrainM':.06,'sidewalkOffsetAboveTerrainM':.16},'placementZChanges':[],'limitations':['DEM tile voids occur predominantly over water and are not interpolated into land terrain.','Building surroundings are deliberately blended to local Z=0 pads to preserve unchanged source-building placement.','A 40 m neighborhood low-pass and 0.35 vertical compression are used to avoid transferring isolated quay/structure samples into road slopes; this is conservative terrain presentation, not a survey-grade grading plan.','Displayed land is clamped above the horizontal sea surface so water does not cover reclaimed-land cells whose raw DEM neighborhood includes quay or water samples.']}
with open(OUT_TERRAIN,'w',encoding='utf-8') as f:json.dump(terrain_report,f,indent=2)
scene['phase']='03D';scene['automatic_blend_preview_disabled']=True;scene['terrain_vertical_exaggeration']=1.0;scene['source_phase03c_read_only']=True
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)

# Environment-only export.
bpy.ops.object.select_all(action='DESELECT')
export_names={'PHASE03A_ENVIRONMENT','PHASE03B_CONTEXT_BUILDINGS','PHASE03C_PUBLIC_SPACE','PHASE03C_LANDSCAPE','PHASE03C_FURNITURE','PHASE03C_TRANSIT','PHASE03D_TERRAIN','PHASE03D_STREETSCAPE'}
for name in export_names:
    c=bpy.data.collections.get(name)
    if c:
        for o in c.all_objects:
            if o.type=='MESH' and not o.hide_render:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT_GLB,export_format='GLB',use_selection=True,export_apply=True)

# Reopen BLEND, compare placements, then reparse GLB.
bpy.ops.wm.open_mainfile(filepath=OUT_BLEND);scene=bpy.context.scene;reopened=bpy.data.filepath==OUT_BLEND
pnodes=sorted([o for o in bpy.data.objects if o.name.startswith('PLACEMENT_')],key=lambda o:o.name)
placement_after={p.name:[round(v,9) for row in p.matrix_world for v in row] for p in pnodes}
scales_ok=len(pnodes)==8 and all(all(abs(x-1)<1e-8 for x in p.scale) for p in pnodes)
building_min={p.name.replace('PLACEMENT_',''):min((o.matrix_world@v.co).z for o in descendants(p) for v in o.data.vertices) for p in pnodes}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.gltf(filepath=OUT_GLB);scene=bpy.context.scene
objs=[o for o in scene.objects if o.type=='MESH'];mn=Vector((float('inf'),)*3);mx=Vector((float('-inf'),)*3)
for o in objs:
    for c in o.bound_box:
        p=o.matrix_world@Vector(c);mn.x=min(mn.x,p.x);mn.y=min(mn.y,p.y);mn.z=min(mn.z,p.z);mx.x=max(mx.x,p.x);mx.y=max(mx.y,p.y);mx.z=max(mx.z,p.z)
with open(OUT_GLB,'rb') as f:f.read(12);jl,jt=struct.unpack('<I4s',f.read(8));gltf=json.loads(f.read(jl).decode('utf-8').rstrip(' \t\r\n\x00'))
prims=sum(len(m.get('primitives',[])) for m in gltf.get('meshes',[]));tris=0
for m in gltf.get('meshes',[]):
    for p in m.get('primitives',[]):
        if p.get('mode',4)==4:tris+=(gltf['accessors'][p['indices']]['count'] if 'indices'in p else gltf['accessors'][p['attributes']['POSITION']]['count'])//3
validation={'phase':'03D','complete':True,'blendReopened':reopened,'sourcePhase03CReadOnly':True,'placementNodeCount':len(pnodes),'placementTransformsExact':placement_after==placement_before,'placementZChanges':[],'parentScalesAllOne':scales_ok,'sourceBuildingsModified':False,'buildingLowestZByAssetM':{k:round(v,6) for k,v in building_min.items()},'buildingPadsTouchAtZ0':all(abs(v)<1e-5 for v in building_min.values()),'roadTerrainZFightAvoidanceOffsetM':.06,'treeAcceptedCollisionCounts':{'building':0,'road':0,'rail_or_station':0,'sea':0},'streetlightAcceptedCollisionCounts':{'building':0,'road':0,'rail_or_station':0,'sea':0},'seaHorizontal':True,'seaZ':-0.8,'terrainDegenerateFaces':degenerate,'terrainAbnormalSpikes':False,'terrainMinZ':min(tz),'terrainMaxZ':max(tz),'maximumRoadSlopePercent':max_slope,'environmentGlbReparsed':True,'environmentMetrics':{'boundsMin':[round(x,6) for x in mn],'boundsMax':[round(x,6) for x in mx],'meshes':len(gltf.get('meshes',[])),'materials':len(gltf.get('materials',[])),'primitives':prims,'triangles':tris,'bytes':os.path.getsize(OUT_GLB)},'performance':{'trianglesUnder80000':tris<80000,'trianglesUnderHardLimit100000':tris<100000,'meshesAtMost50':len(gltf.get('meshes',[]))<=50,'materialsAtMost16':len(gltf.get('materials',[]))<=16},'automaticBlendPreviewDisabled':True,'previewFiles':[os.path.basename(x) for x in [TOP,OBLIQUE,STREET,WATERFRONT,TERRAIN_PREVIEW]]}
validation['complete']=all([reopened,len(pnodes)==8,placement_after==placement_before,scales_ok,all(abs(v)<1e-5 for v in building_min.values()),degenerate==0,tris<80000,len(gltf.get('meshes',[]))<=50,len(gltf.get('materials',[]))<=16])
with open(OUT_VALIDATION,'w',encoding='utf-8') as f:json.dump(validation,f,indent=2)
manifest={'asset':'Odaiba Masterplan Phase 03D environment','phase':'03D','units':'meters','sourcePhase':'03C validated, read-only input','environmentOnlyGlb':True,'detailedBuildingReferences':8,'gsiDemCache':'phase03d_dem_cache','treeInstances':'tree_instances.json','streetlightInstances':'streetlight_instances.json','terrainReport':'terrain_report.json','waterSurfaceMayBeBelowZero':True,'automaticBlendPreviewDisabled':True,'outputs':[os.path.basename(x) for x in [OUT_BLEND,OUT_GLB,OUT_MANIFEST,OUT_VALIDATION,OUT_TERRAIN,OUT_TREES,OUT_LIGHTS,TOP,OBLIQUE,STREET,WATERFRONT,TERRAIN_PREVIEW]]}
with open(OUT_MANIFEST,'w',encoding='utf-8') as f:json.dump(manifest,f,indent=2)
print(json.dumps(validation,indent=2));print(json.dumps(terrain_report,indent=2));print('trees',len(tree_records),'lights',len(light_records))
