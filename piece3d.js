/* LA PLAGE · the piece in 3D
   Turns a garment cut-out into a real-looking piece of fabric you can tilt with a finger.
   The outline of the photo is given a little body (a garment laid flat, softly rounded at the seams),
   the photo itself carries the fabric's folds and colour, and a soft light glides across it as it
   tilts. It tilts, it does not spin: the piece always faces you, like holding it up to the light.
   Drawn with WebGL; no libraries. window.LaPlage3D.mount(host) returns { show(src), start(), stop(), reset() }. */
(() => {
  'use strict';
  const GRID = 150;          // vertices across the garment; the outline itself comes from the texture, so it stays crisp
  // the garment's body: its seams round off over a short distance, and the panels between them swell
  // gently, the way fabric sits over a body, without ever puffing up like an inflatable
  const EDGE = 0;        // depth reached just inside the seams, as a share of the width
  const ROUND = 0.11;        // how far in from the edge the seams finish rounding, as a share of the width
  const SWELL = 0;       // the extra, gentle swell across each panel
    const TILT_Y = 0.36, TILT_X = 0.2;   // the furthest it tilts, in radians (about 21° and 11°): enough to feel it, never edge-on
  const TEX = 1024;

  const vert = `
  attribute vec3 aPos; attribute vec3 aNor; attribute vec2 aUv;
  uniform mat4 uMvp; uniform mat3 uRot; uniform float uSide;
  varying vec3 vNor; varying vec2 vUv; varying float vDepth;
  void main(){
    vec3 p = vec3(aPos.xy, aPos.z * uSide);
    vec3 n = normalize(vec3(aNor.xy, aNor.z * uSide));
    vNor = uRot * n; vUv = aUv; vDepth = aPos.z;
    gl_Position = uMvp * vec4(p, 1.0);
  }`;
  const frag = `
  precision highp float;
  uniform sampler2D uFront; uniform sampler2D uBack; uniform float uSide; uniform float uHasBack; uniform float uShow;
  varying vec3 vNor; varying vec2 vUv; varying float vDepth;
  void main(){
    float shape = texture2D(uFront, vUv).a;                     // the outline always comes from the front photo
    if (shape < 0.3 || uShow < 0.5) discard;
    vec4 c;
    if (uSide > 0.0) c = texture2D(uFront, vUv);
    else {
      // the back: its own photo when there is one, otherwise the front print turned around (the patch reads the right way)
      vec2 b = vec2(1.0 - vUv.x, vUv.y);
      c = uHasBack > 0.5 ? texture2D(uBack, b) : texture2D(uFront, b);
      if (c.a < 0.5) c = texture2D(uFront, vUv);
    }
    vec3 col = c.rgb / max(c.a, 0.001);
    vec3 n = normalize(vNor);
    // the photo already holds the fabric's folds and colour, so the light only breathes over it:
    // a gentle key from the top left, and a soft woven sheen that slides across as it tilts
    vec3 key = normalize(vec3(-0.35, 0.5, 0.8));
    float d = dot(n, key);
    float sheen = pow(max(dot(n, normalize(key + vec3(0.0, 0.0, 1.0))), 0.0), 10.0);
    vec3 light = col * (0.8 + 0.3 * d) + vec3(1.0, 0.98, 0.94) * sheen * 0.06;
    float a = smoothstep(0.3, 0.7, shape);                        // soft outline (with alpha-to-coverage)
    gl_FragColor = vec4(light * a, a);
  }`;

  // 4x4 helpers, column-major
  const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
  const persp = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]); };
  const rotXY = (rx, ry) => {
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
    // R = Rx * Ry
    return new Float32Array([cy, sx * sy, -cx * sy, 0, 0, cx, sx, 0, sy, -sx * cy, cx * cy, 0, 0, 0, 0, 1]);
  };

  function mount(host) {
    const canvas = document.createElement('canvas');
    canvas.className = 'piece3d';
    canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
    if (!gl) return null;
    host.appendChild(canvas);

    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); throw new Error(gl.getProgramInfoLog(prog)); }
    gl.useProgram(prog);
    const U = (n) => gl.getUniformLocation(prog, n);
    const A = (n) => gl.getAttribLocation(prog, n);
    const buf = { pos: gl.createBuffer(), nor: gl.createBuffer(), uv: gl.createBuffer(), idx: gl.createBuffer() };
    let count = 0, aspect = 1, ready = false, hasBack = false;
    const texFront = gl.createTexture(), texBack = gl.createTexture();
    gl.uniform1i(U('uFront'), 0); gl.uniform1i(U('uBack'), 1);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);

    // the image is drawn into a square power-of-two canvas so it can be mip-mapped (smooth when small)
    const pot = document.createElement('canvas'); pot.width = pot.height = TEX;
    const pctx = pot.getContext('2d');
    const upload = (tex, img) => {
      pctx.clearRect(0, 0, TEX, TEX); pctx.drawImage(img, 0, 0, TEX, TEX);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pot);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };

    // the body: a grid over the photo, pushed out by how far each point lies inside the outline
    const build = (img) => {
      aspect = img.naturalHeight / img.naturalWidth;
      const gx = GRID, gy = Math.max(8, Math.round(GRID * aspect));
      const m = document.createElement('canvas'); m.width = gx; m.height = gy;
      const mc = m.getContext('2d', { willReadFrequently: true }); mc.drawImage(img, 0, 0, gx, gy);
      const a = mc.getImageData(0, 0, gx, gy).data;
      const INF = 1e9, d = new Float32Array(gx * gy);
      for (let i = 0; i < gx * gy; i++) d[i] = a[i * 4 + 3] > 110 ? INF : 0;
      // chamfer distance to the outline, two passes
      const at = (x, y) => (x < 0 || y < 0 || x >= gx || y >= gy ? 0 : d[y * gx + x]);
      for (let y = 0; y < gy; y++) for (let x = 0; x < gx; x++) { const i = y * gx + x; if (!d[i]) continue; d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414); }
      for (let y = gy - 1; y >= 0; y--) for (let x = gx - 1; x >= 0; x--) { const i = y * gx + x; if (!d[i]) continue; d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414); }
      // a rounded profile, then softened so the light glides over it
      const R = ROUND * gx;
      let z = new Float32Array(gx * gy);
      const R2 = R * 3.2;
      for (let i = 0; i < z.length; i++) {
        const t = Math.min(d[i] / R, 1), u = Math.min(d[i] / R2, 1);
        z[i] = EDGE * Math.sqrt(1 - (1 - t) * (1 - t)) + SWELL * u * u * (3 - 2 * u);
      }
      for (let pass = 0; pass < 2; pass++) {
        const o = new Float32Array(z.length);
        for (let y = 0; y < gy; y++) for (let x = 0; x < gx; x++) {
          let s = 0, w = 0;
          for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const xx = x + k, yy = y + j; if (xx < 0 || yy < 0 || xx >= gx || yy >= gy) continue; s += z[yy * gx + xx]; w++; }
          o[y * gx + x] = d[y * gx + x] ? s / w : 0;
        }
        z = o;
      }
      const pos = new Float32Array(gx * gy * 3), nor = new Float32Array(gx * gy * 3), uv = new Float32Array(gx * gy * 2);
      const sx = 1 / (gx - 1), sy = aspect / (gy - 1);
      const Z = (x, y) => z[Math.min(gy - 1, Math.max(0, y)) * gx + Math.min(gx - 1, Math.max(0, x))];
      for (let y = 0; y < gy; y++) for (let x = 0; x < gx; x++) {
        const i = y * gx + x;
        pos[i * 3] = x * sx - 0.5; pos[i * 3 + 1] = aspect / 2 - y * sy; pos[i * 3 + 2] = z[i];
        const nx = -(Z(x + 1, y) - Z(x - 1, y)) / (2 * sx), ny = (Z(x, y + 1) - Z(x, y - 1)) / (2 * sy);
        const l = Math.hypot(nx, ny, 1); nor[i * 3] = nx / l; nor[i * 3 + 1] = ny / l; nor[i * 3 + 2] = 1 / l;
        uv[i * 2] = x / (gx - 1); uv[i * 2 + 1] = y / (gy - 1);
      }
      const idx = new Uint16Array((gx - 1) * (gy - 1) * 6); let k = 0;
      for (let y = 0; y < gy - 1; y++) for (let x = 0; x < gx - 1; x++) {
        const i = y * gx + x;
        idx[k++] = i; idx[k++] = i + gx; idx[k++] = i + 1; idx[k++] = i + 1; idx[k++] = i + gx; idx[k++] = i + gx + 1;
      }
      const put = (b, data, loc, size) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); };
      put(buf.pos, pos, A('aPos'), 3); put(buf.nor, nor, A('aNor'), 3); put(buf.uv, uv, A('aUv'), 2);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      count = idx.length;
    };

    const load = (src) => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
    let want = '';
    const show = (front, back) => {
      const key = `${front}|${back || ''}`;   // a back photo is optional; the piece only shows its front
      if (key === want) return Promise.resolve(ready);
      want = key; ready = false;
      return Promise.all([load(front), back ? load(back) : null]).then(([f, b]) => {
        if (want !== key) return false;
        build(f); upload(texFront, f);
        hasBack = !!b; if (b) upload(texBack, b);
        ready = true;
        return true;
      }).catch((err) => { console.error('[LA PLAGE] 3D', err); return false; });
    };

    let last = 0, raf = 0, running = false;
    canvas.style.touchAction = 'pan-y';   // the piece is flat and still: touches scroll the page

    const resize = () => {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    };
    const frame = (now) => {
      raf = running ? requestAnimationFrame(frame) : 0;
      last = now;
      resize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (!ready || !count) return;
      const asp = canvas.width / canvas.height, fov = 0.5, dist = 3.2;
      // fit the piece inside the stage with a little air, whichever way the stage is shaped
      const halfH = Math.tan(fov / 2) * dist, fit = Math.min(halfH * asp * 2 * 0.86, halfH * 2 * 0.86 / aspect);
      const model = new Float32Array([fit, 0, 0, 0, 0, fit, 0, 0, 0, 0, fit, 0, 0, 0, 0, 1]);
      const rot = rotXY(0, 0);
      const view = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -dist, 1]);
      const mvp = mul(persp(fov, asp, 0.1, 20), mul(view, mul(rot, model)));
      gl.uniformMatrix4fv(U('uMvp'), false, mvp);
      gl.uniformMatrix3fv(U('uRot'), false, new Float32Array([rot[0], rot[1], rot[2], rot[4], rot[5], rot[6], rot[8], rot[9], rot[10]]));
      gl.uniform1f(U('uHasBack'), hasBack ? 1 : 0); gl.uniform1f(U('uShow'), 1);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texFront);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, hasBack ? texBack : texFront);
      gl.uniform1f(U('uSide'), 1); gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
    };
    const start = () => { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); raf = 0; };
    const reset = () => {};
    return { canvas, show, start, stop, reset, isReady: () => ready };
  }

  window.LaPlage3D = { mount };
})();
