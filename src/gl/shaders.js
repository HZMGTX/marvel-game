/* == gl/shaders.js ==
   the shaders: sun, shadow, sky, facades, bloom, tonemap
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ------------------------------------------------------------------ shaders */
const COMMON_NOISE = `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), u.x),
             mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){ return vnoise(p)*0.6 + vnoise(p*2.3)*0.26 + vnoise(p*5.1)*0.14; }
`;

const VS_MAIN = `
attribute vec3 aPos, aNor;
uniform mat4 uProj, uView, uModel, uLightVP;
uniform mat3 uNMat;
varying vec3 vW, vN;
varying vec4 vLS;
void main(){
  vec4 w = uModel * vec4(aPos, 1.0);
  vW = w.xyz;
  vN = uNMat * aNor;
  vLS = uLightVP * w;
  gl_Position = uProj * uView * w;
}`;

const FS_MAIN = `
precision highp float;
varying vec3 vW, vN;
varying vec4 vLS;
uniform vec3 uAlb, uCam, uSunDir, uSunCol, uSkyCol, uGrdCol, uFogCol, uAccent;
uniform float uRough, uMetal, uEmis, uAlpha, uFogD, uTonemap, uShadowOn, uTexel, uTime, uNight;
uniform int uKind;
uniform sampler2D uShadow;
` + COMMON_NOISE + `
float unpack(vec4 c){ return dot(c, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0)); }
float shadowAt(){
  if(uShadowOn < 0.5) return 1.0;
  vec3 p = vLS.xyz / vLS.w * 0.5 + 0.5;
  if(p.x < 0.005 || p.x > 0.995 || p.y < 0.005 || p.y > 0.995 || p.z > 1.0) return 1.0;
  float bias = 0.0022;
  float s = 0.0;
  for(int y=-1; y<=1; y++){
    for(int x=-1; x<=1; x++){
      float d = unpack(texture2D(uShadow, p.xy + vec2(float(x), float(y))*uTexel));
      s += (p.z - bias > d) ? 0.0 : 1.0;
    }
  }
  return s / 9.0;
}
vec3 acesFilm(vec3 x){
  return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0);
}
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vW);
  vec3 alb = uAlb;
  float rough = uRough, metal = uMetal, ao = 1.0, emis = uEmis;

  if(uKind == 1){                                   /* asphalt, kerbs and paint */
    /* distance in metres from the nearest street centre-line, matching the
       76 m block grid the world is actually built on */
    vec2 f = fract((vW.xz + 190.0) / 76.0);
    vec2 q = min(f, 1.0 - f) * 76.0;
    float m = min(q.x, q.y);
    float g = fbm(vW.xz * 0.9);
    alb *= 0.86 + g*0.28;
    float onRoad = 1.0 - smoothstep(9.5, 11.0, m);
    alb = mix(alb*1.18, alb*0.74, onRoad);         /* pavement pale, tarmac dark */
    vec2 dash = abs(fract(vW.xz/7.0) - 0.5);
    float line = (1.0 - smoothstep(0.09, 0.20, m)) * step(0.30, dash.x + dash.y) * onRoad;
    alb = mix(alb, vec3(0.30, 0.27, 0.15), line*0.5);
    float kerb = 1.0 - smoothstep(0.20, 0.55, abs(m - 10.2));
    alb = mix(alb, alb*1.22, kerb*0.45);
    rough = 0.94;
    ao = 0.86 + 0.14*g;
  }
  if(uKind == 2){                                   /* building facade */
    vec2 uv = (abs(N.x) > 0.5) ? vec2(vW.z, vW.y) : vec2(vW.x, vW.y);
    if(abs(N.y) < 0.5){
      vec2 cell = floor(uv / vec2(2.6, 3.4));
      vec2 f = fract(uv / vec2(2.6, 3.4));
      float r = h21(cell + floor(vW.xz*0.031));
      float frameX = step(0.16, f.x) * step(f.x, 0.84);
      float frameY = step(0.20, f.y) * step(f.y, 0.78);
      float win = frameX * frameY;
      float lit = step(0.58, r) * uNight;    /* nobody leaves the lights on at noon */
      vec3 glass = mix(vec3(0.03,0.035,0.06), uAccent*1.4, lit);
      alb = mix(alb * (0.86 + 0.14*h21(cell*1.7)), glass, win);
      emis += win * lit * (0.55 + 0.45*h21(cell*3.1));
      rough = mix(0.85, 0.12, win);
      metal = mix(0.0, 0.55, win);
      /* ledges every few floors */
      float ledge = 1.0 - smoothstep(0.0, 0.06, abs(fract(uv.y/13.6) - 0.5));
      alb = mix(alb, alb*1.35, ledge*0.7);
      ao = 0.55 + 0.45 * smoothstep(0.0, 26.0, vW.y);
    } else {
      alb *= 0.7 + 0.3*fbm(vW.xz*1.4);
      rough = 0.9;
    }
  }
  if(uKind == 5){                                   /* sky dome */
    vec3 dir = normalize(vW - uCam);
    float t = clamp(dir.y*1.5 + 0.12, 0.0, 1.0);
    vec3 c = mix(uFogCol, uAlb, t*t*0.85 + t*0.15);
    float sd = max(dot(dir, uSunDir), 0.0);
    c += uSunCol * (pow(sd, 900.0)*9.0 + pow(sd, 12.0)*0.22 + pow(sd, 3.0)*0.05);
    float cl = fbm(dir.xz/max(0.10, dir.y+0.22)*1.6 + uTime*0.008);
    c = mix(c, mix(c, uSkyCol*2.4, 0.55), smoothstep(0.55, 0.85, cl) * smoothstep(0.02, 0.30, dir.y));
    float st = step(0.9975, h21(floor(dir.xz*260.0/max(0.2,dir.y+0.4))));
    c += vec3(st) * smoothstep(0.25, 0.9, dir.y) * (1.0 - smoothstep(0.10, 0.45, length(uSunCol)*0.3));
    if(uTonemap > 0.5) c = pow(acesFilm(c), vec3(1.0/2.2));
    gl_FragColor = vec4(c, 1.0);
    return;
  }
  if(uKind == 3){                                   /* unlit — effects, glass */
    vec3 c = alb * (1.0 + uEmis*2.4);
    if(uTonemap > 0.5) c = pow(acesFilm(c), vec3(1.0/2.2));
    gl_FragColor = vec4(c, uAlpha);
    return;
  }

  float sh = shadowAt();
  vec3 L = uSunDir;
  float ndl = max(dot(N, L), 0.0);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), mix(6.0, 190.0, 1.0 - rough));
  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);

  vec3 amb = mix(uGrdCol, uSkyCol, N.y*0.5 + 0.5) * ao;
  vec3 diffuse = alb * (amb + uSunCol * ndl * sh);
  vec3 specCol = mix(vec3(0.055), alb, metal);
  float specK = (uKind == 1) ? 0.10 : 1.0;
  vec3 specular = specCol * spec * sh * uSunCol * (1.0 - rough*0.8) * 1.7 * specK;
  /* a rough surface has no mirror in it: without this the ground picks up a
     grazing sky wash all the way to the horizon and the city goes flat */
  vec3 rim = uSkyCol * fres * 0.42 * (1.0 - metal*0.4) * (1.0 - rough*0.85);

  vec3 col = diffuse + specular + rim + alb*emis*1.9;

  float d = length(vW - uCam);
  float fog = 1.0 - exp(-d * uFogD);
  fog *= mix(1.0, 0.35, clamp((vW.y - 6.0)/60.0, 0.0, 1.0));
  col = mix(col, uFogCol, clamp(fog, 0.0, 0.95));

  if(uTonemap > 0.5) col = pow(acesFilm(col), vec3(1.0/2.2));
  gl_FragColor = vec4(col, uAlpha);
}`;

const VS_DEPTH = `
attribute vec3 aPos;
uniform mat4 uLightVP, uModel;
void main(){ gl_Position = uLightVP * uModel * vec4(aPos, 1.0); }`;
const FS_DEPTH = `
precision highp float;
vec4 pack(float v){
  vec4 c = fract(v * vec4(1.0, 255.0, 65025.0, 16581375.0));
  c -= c.yzww * vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0);
  return c;
}
void main(){ gl_FragColor = pack(gl_FragCoord.z); }`;

const VS_FLAT = `
attribute vec3 aPos;
varying vec2 vUV;
void main(){ vUV = aPos.xy*0.5 + 0.5; gl_Position = vec4(aPos.xy, 0.0, 1.0); }`;

const FS_BRIGHT = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D uTex;
uniform float uThresh;
void main(){
  vec3 c = texture2D(uTex, vUV).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = vec4(c * smoothstep(uThresh, uThresh + 0.7, l), 1.0);
}`;

const FS_BLUR = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uDir;
void main(){
  vec3 c = texture2D(uTex, vUV).rgb * 0.2270270270;
  c += texture2D(uTex, vUV + uDir*1.3846153846).rgb * 0.3162162162;
  c += texture2D(uTex, vUV - uDir*1.3846153846).rgb * 0.3162162162;
  c += texture2D(uTex, vUV + uDir*3.2307692308).rgb * 0.0702702703;
  c += texture2D(uTex, vUV - uDir*3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}`;

const FS_POST = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D uTex, uBloom;
uniform float uBloomAmt, uTime, uHurt, uVig;
vec3 acesFilm(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
void main(){
  vec2 uv = vUV;
  vec3 c = texture2D(uTex, uv).rgb;
  c += texture2D(uBloom, uv).rgb * uBloomAmt;
  /* a red pull at the edges when the body you are wearing is hurting */
  float r = length(uv - 0.5);
  c = mix(c, vec3(0.55, 0.04, 0.03), uHurt * smoothstep(0.18, 0.72, r));
  c *= 1.0 - uVig * smoothstep(0.32, 0.92, r);
  c = acesFilm(c * 0.94);
  c = pow(c, vec3(1.0/2.2));
  float g = fract(sin(dot(uv*vec2(1.0,1.3) + uTime*0.0007, vec2(127.1,311.7)))*43758.5453);
  c += (g - 0.5) * 0.018;
  gl_FragColor = vec4(c, 1.0);
}`;

const P_MAIN   = program(VS_MAIN, FS_MAIN, "main");
const P_DEPTH  = program(VS_DEPTH, FS_DEPTH, "depth");
const P_BRIGHT = program(VS_FLAT, FS_BRIGHT, "bright");
const P_BLUR   = program(VS_FLAT, FS_BLUR, "blur");
const P_POST   = program(VS_FLAT, FS_POST, "post");

/* ------------------------------------------------------------ framebuffers */
function makeTarget(w,h,filter){
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter||gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter||gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const rb = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return {fb, tex, rb, w, h};
}
const QUALITY = {
  high:   {shadow:1024, bloom:true,  scale:1.0,  shadowRange:70},
  medium: {shadow:768,  bloom:true,  scale:0.85, shadowRange:60},
  low:    {shadow:0,    bloom:false, scale:0.75, shadowRange:0}
};
let quality = "high";
let SHADOW = null, SCENE = null, BLOOM_A = null, BLOOM_B = null;

function buildTargets(){
  const q = QUALITY[quality];
  if(SHADOW){ gl.deleteFramebuffer(SHADOW.fb); gl.deleteTexture(SHADOW.tex); SHADOW = null; }
  if(q.shadow) SHADOW = makeTarget(q.shadow, q.shadow, gl.NEAREST);
  const w = Math.max(2, Math.floor(CV.width * q.scale)), h = Math.max(2, Math.floor(CV.height * q.scale));
  [SCENE, BLOOM_A, BLOOM_B].forEach(t=>{ if(t){ gl.deleteFramebuffer(t.fb); gl.deleteTexture(t.tex); gl.deleteRenderbuffer(t.rb); } });
  SCENE = null; BLOOM_A = null; BLOOM_B = null;
  if(q.bloom){
    SCENE   = makeTarget(w, h);
    BLOOM_A = makeTarget(Math.max(2,w>>2), Math.max(2,h>>2));
    BLOOM_B = makeTarget(Math.max(2,w>>2), Math.max(2,h>>2));
  }
}
