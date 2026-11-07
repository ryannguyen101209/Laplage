/* LA PLAGE · live ocean
   A sea under an open sky, drawn on the GPU every frame: rolling swell, sun glitter,
   soft drifting clouds and haze at the horizon. It is computed per pixel, so it stays
   sharp at any size, 4K screens included. No libraries. */
(() => {
  'use strict';
  const canvas = document.querySelector('[data-ocean]');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) { canvas.closest('.hero')?.classList.add('no-ocean'); return; }

  const vert = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const frag = `
  precision highp float;
  uniform vec2 uRes; uniform float uTime; uniform vec2 uLook;
  const vec3 SUN = vec3(0.42, 0.26, 0.87);

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }

  vec3 sky(vec3 rd){
    vec3 sun = normalize(SUN);
    float y = max(rd.y, 0.0);
    vec3 col = mix(vec3(0.62, 0.80, 0.92), vec3(0.06, 0.27, 0.58), pow(y, 0.42));
    float s = max(dot(rd, sun), 0.0);
    col += vec3(1.0, 0.80, 0.55) * pow(s, 10.0) * 0.22;
    col += vec3(1.0, 0.95, 0.85) * smoothstep(0.9993, 0.9998, s) * 1.2;   // a small, crisp sun disc
    if (rd.y > 0.0) {
      vec2 cp = rd.xz / (rd.y + 0.07) * 0.9 + vec2(uTime * 0.010, uTime * 0.004);
      float c = smoothstep(0.50, 0.86, fbm(cp));
      float shade = fbm(cp * 1.7 + 3.0);
      vec3 cc = mix(vec3(0.86, 0.91, 0.96), vec3(1.0), shade) + vec3(0.18, 0.12, 0.04) * pow(s, 3.0);
      col = mix(col, cc, c * smoothstep(0.0, 0.18, rd.y) * 0.9);
    }
    return col;
  }

  // one travelling sine: adds its height gradient to g
  void wave(vec2 p, vec2 d, float k, float a, float w, inout vec2 g){
    float ph = dot(normalize(d), p) * k + uTime * w;
    g += normalize(d) * (a * k * cos(ph));
  }

  void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec3 ro = vec3(0.0, 2.4, 0.0);
    vec3 rd = normalize(vec3(uv.x + uLook.x * 0.06, uv.y - 0.06 + uLook.y * 0.03, 1.5));
    vec3 col;
    if (rd.y >= -0.0005) {
      col = sky(rd);
    } else {
      float t = -ro.y / rd.y;
      vec3 pos = ro + rd * t;
      vec2 p = pos.xz;
      vec2 g = vec2(0.0);
      wave(p, vec2( 1.0,  0.35), 0.55, 0.080, 1.10, g);
      wave(p, vec2(-0.6,  1.00), 0.90, 0.050, 1.45, g);
      wave(p, vec2( 0.2,  1.00), 1.60, 0.030, 2.05, g);
      wave(p, vec2( 1.0, -0.70), 2.40, 0.018, 2.60, g);
      wave(p, vec2(-1.0, -0.25), 3.70, 0.010, 3.30, g);
      wave(p, vec2( 0.4, -1.00), 5.30, 0.006, 4.10, g);
      // fine ripples, fading with distance
      float fade = exp(-t * 0.035);
      vec2 q = p * 2.2 + vec2(uTime * 0.35, uTime * 0.21);
      float n0 = fbm(q), nx = fbm(q + vec2(0.06, 0.0)), nz = fbm(q + vec2(0.0, 0.06));
      g += vec2(nx - n0, nz - n0) * 2.2 * fade;
      vec3 n = normalize(vec3(-g.x, 1.0, -g.y));

      vec3 sun = normalize(SUN);
      float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
      vec3 refl = reflect(rd, n); refl.y = abs(refl.y);
      vec3 deep = vec3(0.004, 0.07, 0.15);
      vec3 body = vec3(0.00, 0.30, 0.42);
      float sss = pow(max(dot(n, vec3(0.0, 1.0, 0.0)), 0.0), 3.0) * 0.35;
      vec3 water = mix(deep, body, sss + 0.25 * fade);
      col = mix(water, sky(refl) * 0.9, clamp(fres * 0.85, 0.0, 1.0));
      col += vec3(1.0, 0.92, 0.78) * pow(max(dot(refl, sun), 0.0), 380.0) * 6.0;   // sun glitter
      col += vec3(1.0, 0.90, 0.75) * pow(max(dot(refl, sun), 0.0), 40.0) * 0.18;
      // haze toward the horizon
      float haze = (1.0 - exp(-t * 0.006)) * 0.85;
      col = mix(col, sky(normalize(vec3(rd.x, 0.002, rd.z))), haze);
    }
    // gentle vignette and tone
    col *= 1.0 - 0.22 * dot(uv * 0.85, uv * 0.85);
    col = clamp(col, 0.0, 1.0);
    col = col * col * (3.0 - 2.0 * col) * 0.35 + col * 0.65;   // a touch of filmic contrast
    col = pow(col, vec3(0.95));
    gl_FragColor = vec4(col, 1.0);
  }`;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.closest('.hero')?.classList.add('no-ocean'); return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uLook = gl.getUniformLocation(prog, 'uLook');

  // full device resolution, capped at about 8.3 million pixels (a 4K screen)
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const max = 3840 * 2160;
    if (r.width * r.height * dpr * dpr > max) dpr = Math.sqrt(max / (r.width * r.height));
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener('resize', resize);

  // the view follows the pointer a touch
  let lx = 0, ly = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', (e) => {
    tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * -2;
  }, { passive: true });

  let visible = true, raf = 0;
  const t0 = performance.now();
  const frame = () => {
    raf = 0;
    if (!visible || document.hidden) return;
    lx += (tx - lx) * 0.04; ly += (ty - ly) * 0.04;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (performance.now() - t0) / 1000);
    gl.uniform2f(uLook, lx, ly);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  };
  // only draw while the ocean is on screen
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(frame); });
  canvas.closest('.hero')?.classList.add('has-ocean');
  raf = requestAnimationFrame(frame);
})();
