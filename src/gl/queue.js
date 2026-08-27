/* == gl/queue.js ==
   the draw queue that both passes replay
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ------------------------------------------------------------- draw queue */
/* Everything is queued once, then replayed for the shadow map and the frame. */
const MAT_POOL = [], NRM_POOL = [];
let matUsed = 0, nrmUsed = 0;
function takeMat(){ if(matUsed >= MAT_POOL.length) MAT_POOL.push(new Float32Array(16)); return MAT_POOL[matUsed++]; }
function takeNrm(){ if(nrmUsed >= NRM_POOL.length) NRM_POOL.push(new Float32Array(9)); return NRM_POOL[nrmUsed++]; }

const Q_OPAQUE = [], Q_ALPHA = [];
const DEFAULT_MAT = {rough:0.82, metal:0.0, emis:0.0, alpha:1.0, kind:0, accent:[0,0,0]};

function m3normal(ry,rx,rz,sx,sy,sz,out){
  const cy=Math.cos(ry), sy2=Math.sin(ry), cx=Math.cos(rx||0), sx2=Math.sin(rx||0),
        cz=Math.cos(rz||0), sz2=Math.sin(rz||0);
  const r00 = cy*cz + sy2*sx2*sz2, r01 = -cy*sz2 + sy2*sx2*cz, r02 = sy2*cx;
  const r10 = cx*sz2,              r11 = cx*cz,                r12 = -sx2;
  const r20 = -sy2*cz + cy*sx2*sz2,r21 = sy2*sz2 + cy*sx2*cz,  r22 = cy*cx;
  const ix = 1/sx, iy = 1/sy, iz = 1/sz;
  out[0]=r00*ix; out[1]=r10*ix; out[2]=r20*ix;
  out[3]=r01*iy; out[4]=r11*iy; out[5]=r21*iy;
  out[6]=r02*iz; out[7]=r12*iz; out[8]=r22*iz;
  return out;
}

/* the one call every visible thing goes through */
function draw(mesh, x,y,z, ry,rx,rz, sx,sy,sz, alb, mat){
  mat = mat || DEFAULT_MAT;
  const m = takeMat(), n = takeNrm();
  m4trs(x,y,z, ry,rx||0,rz||0, sx,sy,sz, m);
  m3normal(ry,rx||0,rz||0, sx,sy,sz, n);
  const item = {mesh, m, n, alb,
    rough: mat.rough===undefined?0.82:mat.rough,
    metal: mat.metal||0, emis: mat.emis||0,
    alpha: mat.alpha===undefined?1:mat.alpha,
    kind: mat.kind||0, accent: mat.accent||BLACK3,
    shadow: mat.shadow!==false && (mat.alpha===undefined||mat.alpha>=1)
            && (mat.kind||0)!==3 && (mat.kind||0)!==6};
  (item.alpha < 1 || item.kind===3 || item.kind===6 ? Q_ALPHA : Q_OPAQUE).push(item);
  return item;
}
const BLACK3 = [0,0,0];
function resetQueue(){ Q_OPAQUE.length = 0; Q_ALPHA.length = 0; matUsed = 0; nrmUsed = 0; }

let boundMesh = null, boundProg = null;
function bindMesh(mesh, prog){
  if(boundMesh === mesh && boundProg === prog) return;
  boundMesh = mesh; boundProg = prog;
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vb);
  gl.enableVertexAttribArray(prog.aPos);
  gl.vertexAttribPointer(prog.aPos, 3, gl.FLOAT, false, 0, 0);
  if(prog.aNor >= 0){
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nb);
    gl.enableVertexAttribArray(prog.aNor);
    gl.vertexAttribPointer(prog.aNor, 3, gl.FLOAT, false, 0, 0);
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ib);
}
let drawCalls = 0;
function replay(list, prog, withMaterial){
  for(let i=0;i<list.length;i++){
    const it = list[i];
    bindMesh(it.mesh, prog);
    gl.uniformMatrix4fv(prog.u.uModel, false, it.m);
    if(withMaterial){
      gl.uniformMatrix3fv(prog.u.uNMat, false, it.n);
      gl.uniform3fv(prog.u.uAlb, it.alb);
      gl.uniform3fv(prog.u.uAccent, it.accent);
      gl.uniform1f(prog.u.uRough, it.rough);
      gl.uniform1f(prog.u.uMetal, it.metal);
      gl.uniform1f(prog.u.uEmis, it.emis);
      gl.uniform1f(prog.u.uAlpha, it.alpha);
      gl.uniform1i(prog.u.uKind, it.kind);
    }
    gl.drawElements(gl.TRIANGLES, it.mesh.count, gl.UNSIGNED_SHORT, 0);
    drawCalls++;
  }
}
function fullscreen(prog){
  bindMesh(MESH_QUAD, prog);
  gl.drawElements(gl.TRIANGLES, MESH_QUAD.count, gl.UNSIGNED_SHORT, 0);
  drawCalls++;
}
