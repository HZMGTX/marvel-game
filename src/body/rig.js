/* == body/rig.js ==
   local-to-world, bones and joints
   Part of Multiverse Vessel. Loaded in order from index.html. */

function L2W(e, x, y, z, pitch, out){
  const rl = e.bank || 0;                      /* banking into a turn, in flight */
  if(rl){ const cr = Math.cos(rl), sr = Math.sin(rl);
          const nx = x*cr - y*sr; y = x*sr + y*cr; x = nx; }
  const cp = Math.cos(pitch||0), sp = Math.sin(pitch||0);
  const ry2 = y*cp - z*sp, rz2 = y*sp + z*cp;
  const c = Math.cos(e.yaw), s = Math.sin(e.yaw);
  out[0] = e.x + x*c + rz2*s;
  out[1] = e.y + ry2;
  out[2] = e.z - x*s + rz2*c;
  return out;
}
const _a = [0,0,0], _b = [0,0,0];

/* a limb between two world points. A torso is wider than it is deep and an
   arm is not, so the two radii are separate — one number for both is what
   made everybody look like a stack of drainpipes. */
function bone(ax,ay,az, bx,by,bz, r, alb, mat, mesh, rz){
  const dx=bx-ax, dy=by-ay, dz=bz-az;
  const len = Math.hypot(dx,dy,dz) || 0.0001;
  const rx = Math.acos(Math.max(-1, Math.min(1, dy/len)));
  const ry = Math.atan2(dx, dz);
  draw(mesh||MESH_TAPER, (ax+bx)/2, (ay+by)/2, (az+bz)/2, ry, rx, 0,
       r*2, len, (rz===undefined?r:rz)*2, alb, mat);
}
function joint(x,y,z, r, alb, mat){ draw(MESH_SPH, x,y,z, 0,0,0, r*2,r*2,r*2, alb, mat); }
/* a joint that is not a ball: shoulders, hips and skulls are none of them round */
function lump(x,y,z, sx,sy,sz, yaw, pitch, roll, alb, mat){
  draw(MESH_SPH, x,y,z, yaw||0, pitch||0, roll||0, sx,sy,sz, alb, mat);
}
