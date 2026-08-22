/* == gl/context.js ==
   matrix maths, colour, the WebGL context, the meshes
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ==========================================================================
   RENDERER
   Hand-written WebGL. Sun with a real shadow map, sky-and-ground ambient,
   specular and rim, exponential fog, bloom, filmic tonemap. No assets.
   ========================================================================== */

/* ------------------------------------------------------------------ maths */
function m4(){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); }
function m4mul(a,b,out){
  out = out || new Float32Array(16);
  for(let i=0;i<4;i++){
    const a0=a[i],a1=a[i+4],a2=a[i+8],a3=a[i+12];
    out[i]   = a0*b[0] +a1*b[1] +a2*b[2] +a3*b[3];
    out[i+4] = a0*b[4] +a1*b[5] +a2*b[6] +a3*b[7];
    out[i+8] = a0*b[8] +a1*b[9] +a2*b[10]+a3*b[11];
    out[i+12]= a0*b[12]+a1*b[13]+a2*b[14]+a3*b[15];
  }
  return out;
}
function m4persp(fovy,aspect,near,far,out){
  out = out||new Float32Array(16);
  const f=1/Math.tan(fovy/2), nf=1/(near-far);
  out.fill(0); out[0]=f/aspect; out[5]=f; out[10]=(far+near)*nf; out[11]=-1; out[14]=2*far*near*nf;
  return out;
}
function m4ortho(l,r,b,t,n,f,out){
  out = out||new Float32Array(16); out.fill(0);
  out[0]=2/(r-l); out[5]=2/(t-b); out[10]=-2/(f-n); out[15]=1;
  out[12]=-(r+l)/(r-l); out[13]=-(t+b)/(t-b); out[14]=-(f+n)/(f-n);
  return out;
}
function m4look(eye,at,up,out){
  out = out||new Float32Array(16);
  let zx=eye[0]-at[0], zy=eye[1]-at[1], zz=eye[2]-at[2];
  let l=Math.hypot(zx,zy,zz)||1; zx/=l; zy/=l; zz/=l;
  let xx=up[1]*zz-up[2]*zy, xy=up[2]*zx-up[0]*zz, xz=up[0]*zy-up[1]*zx;
  l=Math.hypot(xx,xy,xz)||1; xx/=l; xy/=l; xz/=l;
  const yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
  out[0]=xx; out[1]=yx; out[2]=zx; out[3]=0;
  out[4]=xy; out[5]=yy; out[6]=zy; out[7]=0;
  out[8]=xz; out[9]=yz; out[10]=zz; out[11]=0;
  out[12]=-(xx*eye[0]+xy*eye[1]+xz*eye[2]);
  out[13]=-(yx*eye[0]+yy*eye[1]+yz*eye[2]);
  out[14]=-(zx*eye[0]+zy*eye[1]+zz*eye[2]);
  out[15]=1; return out;
}
/* full TRS with yaw, pitch, roll — written out to avoid allocating */
function m4trs(tx,ty,tz, ry,rx,rz, sx,sy,sz, out){
  const cy=Math.cos(ry), sy2=Math.sin(ry), cx=Math.cos(rx||0), sx2=Math.sin(rx||0),
        cz=Math.cos(rz||0), sz2=Math.sin(rz||0);
  /* R = Ry * Rx * Rz */
  const r00 = cy*cz + sy2*sx2*sz2, r01 = -cy*sz2 + sy2*sx2*cz, r02 = sy2*cx;
  const r10 = cx*sz2,              r11 = cx*cz,                r12 = -sx2;
  const r20 = -sy2*cz + cy*sx2*sz2,r21 = sy2*sz2 + cy*sx2*cz,  r22 = cy*cx;
  out[0]=r00*sx; out[1]=r10*sx; out[2]=r20*sx; out[3]=0;
  out[4]=r01*sy; out[5]=r11*sy; out[6]=r21*sy; out[7]=0;
  out[8]=r02*sz; out[9]=r12*sz; out[10]=r22*sz; out[11]=0;
  out[12]=tx; out[13]=ty; out[14]=tz; out[15]=1;
  return out;
}
function hexToRgb(h){ return [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255]; }
/* sRGB in, linear out — the shader works in linear and tonemaps at the end */
function srgb(h){ const c = hexToRgb(h); return c.map(v => Math.pow(v, 2.2)); }

/* ------------------------------------------------------------------ setup */
const CV = document.getElementById("game");
let gl = CV.getContext("webgl", {antialias:true, alpha:false, depth:true, stencil:false,
                                 powerPreference:"high-performance"})
      || CV.getContext("experimental-webgl", {antialias:true, alpha:false});
if(!gl){
  document.body.innerHTML = '<div style="padding:40px;font:16px system-ui;color:#EDE7DA;background:#07060E;height:100vh">'
    + 'This game needs WebGL and this browser will not give it. Try a different browser.</div>';
  throw new Error("no webgl");
}
gl.getExtension("OES_element_index_uint");

function compile(type, src, label){
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src); gl.compileShader(sh);
  if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
    console.error(label+" shader:", gl.getShaderInfoLog(sh));
  return sh;
}
function program(vs, fs, label){
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs, label+" vs"));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs, label+" fs"));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(label+" link:", gl.getProgramInfoLog(p));
  p.u = new Proxy({}, {get:(t,k)=>{ if(!(k in t)) t[k] = gl.getUniformLocation(p, k); return t[k]; }});
  p.aPos = gl.getAttribLocation(p,"aPos");
  p.aNor = gl.getAttribLocation(p,"aNor");
  return p;
}

/* -------------------------------------------------------------- geometry */
function makeMesh(pos, nor, idx){
  const vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
  const nb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nor), gl.STATIC_DRAW);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  return {vb, nb, ib, count:idx.length};
}
/* a unit cube, hard edges */
const MESH_BOX = (()=>{
  const p=[],n=[],idx=[];
  const F=[[[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5],[1,0,0]],
           [[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5],[-1,0,0]],
           [[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[0,1,0]],
           [[-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[0,-1,0]],
           [[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5],[0,0,1]],
           [[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5],[0,0,-1]]];
  F.forEach((f,fi)=>{
    const b = fi*4;
    for(let i=0;i<4;i++){ p.push(...f[i]); n.push(...f[4]); }
    idx.push(b,b+1,b+2, b,b+2,b+3);
  });
  return makeMesh(p,n,idx);
})();
/* a smooth sphere, radius .5 */
function buildSphere(lat, lon){
  const p=[],n=[],idx=[];
  for(let i=0;i<=lat;i++){
    const th = i/lat*Math.PI, st=Math.sin(th), ct=Math.cos(th);
    for(let j=0;j<=lon;j++){
      const ph = j/lon*2*Math.PI, sp=Math.sin(ph), cp=Math.cos(ph);
      const x=cp*st, y=ct, z=sp*st;
      n.push(x,y,z); p.push(x*.5,y*.5,z*.5);
    }
  }
  for(let i=0;i<lat;i++) for(let j=0;j<lon;j++){
    const a=i*(lon+1)+j, b=a+lon+1;
    idx.push(a,b,a+1, b,b+1,a+1);
  }
  return makeMesh(p,n,idx);
}
const MESH_SPH = buildSphere(14,18);
const MESH_SPH_LO = buildSphere(7,9);
/* a tapered tube along Y, height 1 centred, bottom radius .5, top radius .5*t */
function buildTube(sides, t, caps){
  const p=[],n=[],idx=[];
  const slope = (0.5 - 0.5*t);
  for(let ring=0; ring<2; ring++){
    const y = ring? .5 : -.5, r = ring? .5*t : .5;
    for(let i=0;i<=sides;i++){
      const a=i/sides*2*Math.PI, c=Math.cos(a), s=Math.sin(a);
      p.push(c*r, y, s*r);
      const ny = slope;
      const l = Math.hypot(1,ny);
      n.push(c/l, ny/l, s/l);
    }
  }
  for(let i=0;i<sides;i++){
    const a=i, b=i+sides+1;
    idx.push(a,b,a+1, b,b+1,a+1);
  }
  if(caps){
    for(let ring=0; ring<2; ring++){
      const y = ring? .5 : -.5, r = ring? .5*t : .5, base = p.length/3;
      p.push(0,y,0); n.push(0, ring?1:-1, 0);
      for(let i=0;i<=sides;i++){
        const a=i/sides*2*Math.PI;
        p.push(Math.cos(a)*r, y, Math.sin(a)*r); n.push(0, ring?1:-1, 0);
      }
      for(let i=0;i<sides;i++){
        if(ring) idx.push(base, base+1+i, base+2+i);
        else     idx.push(base, base+2+i, base+1+i);
      }
    }
  }
  return makeMesh(p,n,idx);
}
const MESH_TUBE   = buildTube(14, 1.0, true);
const MESH_TAPER  = buildTube(14, 0.72, true);
const MESH_TAPER2 = buildTube(14, 0.50, true);
const MESH_FLARE  = buildTube(16, 1.34, true);
const MESH_TUBE_LO= buildTube(7, 1.0, true);
const MESH_QUAD = makeMesh([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0],[0,0,1, 0,0,1, 0,0,1, 0,0,1],[0,1,2,0,2,3]);
