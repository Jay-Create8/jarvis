import{A as Ke,B as M,C as Q,D as se,E as Ee,F as W,G,H as qe,I as H,J as v,K as Ye,N as Ze,P as j,Q as Je,R as $e,S as et,U as tt,V as it,W as we,X as st,Y as rt,Z as Ce,fa as Se,g as Ie,h as Ge,i as C,ia as X,j as Oe,k as Ve,ka as ot,l as ke,la as at,m as te,n as Qe,o as We,p as N,pa as nt,r as je,s as ie,t as d,u as Xe,v as z,wa as lt,x as I,ya as ht}from"./chunk-OF6KIFO7.js";var re={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};var m=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},vt=new Ze(-1,1,1,-1,0,1),Re=class extends W{constructor(){super(),this.setAttribute("position",new Ee([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Ee([0,2,0,0,2,0],2))}},Tt=new Re,_=class{constructor(e){this._mesh=new G(Tt,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,vt)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}};var oe=class extends m{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof v?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=H.clone(e.uniforms),this.material=new v({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new _(this.material)}render(e,t,r){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=r.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}};var K=class extends m{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,r){let o=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let n,f;this.inverse?(n=0,f=1):(n=1,f=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(o.REPLACE,o.REPLACE,o.REPLACE),i.buffers.stencil.setFunc(o.ALWAYS,n,4294967295),i.buffers.stencil.setClear(f),i.buffers.stencil.setLocked(!0),e.setRenderTarget(r),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(o.EQUAL,1,4294967295),i.buffers.stencil.setOp(o.KEEP,o.KEEP,o.KEEP),i.buffers.stencil.setLocked(!0)}},ae=class extends m{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}};var ne=class{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){let r=e.getSize(new d);this._width=r.width,this._height=r.height,t=new z(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:N}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new oe(re),this.copyPass.material.blending=Ge,this.clock=new lt}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());let t=this.renderer.getRenderTarget(),r=!1;for(let o=0,i=this.passes.length;o<i;o++){let n=this.passes[o];if(n.enabled!==!1){if(n.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(o),n.render(this.renderer,this.writeBuffer,this.readBuffer,e,r),n.needsSwap){if(r){let f=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(f.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(f.EQUAL,1,4294967295)}this.swapBuffers()}K!==void 0&&(n instanceof K?r=!0:n instanceof ae&&(r=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new d);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let r=this._width*this._pixelRatio,o=this._height*this._pixelRatio;this.renderTarget1.setSize(r,o),this.renderTarget2.setSize(r,o);for(let i=0;i<this.passes.length;i++)this.passes[i].setSize(r,o)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var le=class extends m{constructor(e,t,r=null,o=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=r,this.clearColor=o,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new M}render(e,t,r){let o=e.autoClear;e.autoClear=!1;let i,n;this.overrideMaterial!==null&&(n=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:r),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=n),e.autoClear=o}};var ut={name:"LuminosityHighPassShader",shaderID:"luminosityHighPass",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new M(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};var O=class c extends m{constructor(e,t,r,o){super(),this.strength=t!==void 0?t:1,this.radius=r,this.threshold=o,this.resolution=e!==void 0?new d(e.x,e.y):new d(256,256),this.clearColor=new M(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let i=Math.round(this.resolution.x/2),n=Math.round(this.resolution.y/2);this.renderTargetBright=new z(i,n,{type:N}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let p=0;p<this.nMips;p++){let P=new z(i,n,{type:N});P.texture.name="UnrealBloomPass.h"+p,P.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(P);let B=new z(i,n,{type:N});B.texture.name="UnrealBloomPass.v"+p,B.texture.generateMipmaps=!1,this.renderTargetsVertical.push(B),i=Math.round(i/2),n=Math.round(n/2)}let f=ut;this.highPassUniforms=H.clone(f.uniforms),this.highPassUniforms.luminosityThreshold.value=o,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new v({uniforms:this.highPassUniforms,vertexShader:f.vertexShader,fragmentShader:f.fragmentShader}),this.separableBlurMaterials=[];let l=[3,5,7,9,11];i=Math.round(this.resolution.x/2),n=Math.round(this.resolution.y/2);for(let p=0;p<this.nMips;p++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(l[p])),this.separableBlurMaterials[p].uniforms.invSize.value=new d(1/i,1/n),i=Math.round(i/2),n=Math.round(n/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;let S=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=S,this.bloomTintColors=[new I(1,1,1),new I(1,1,1),new I(1,1,1),new I(1,1,1),new I(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;let V=re;this.copyUniforms=H.clone(V.uniforms),this.blendMaterial=new v({uniforms:this.copyUniforms,vertexShader:V.vertexShader,fragmentShader:V.fragmentShader,blending:C,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new M,this.oldClearAlpha=1,this.basic=new Q,this.fsQuad=new _(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,t){let r=Math.round(e/2),o=Math.round(t/2);this.renderTargetBright.setSize(r,o);for(let i=0;i<this.nMips;i++)this.renderTargetsHorizontal[i].setSize(r,o),this.renderTargetsVertical[i].setSize(r,o),this.separableBlurMaterials[i].uniforms.invSize.value=new d(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2)}render(e,t,r,o,i){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();let n=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),i&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=r.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let f=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this.fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=f.texture,this.separableBlurMaterials[l].uniforms.direction.value=c.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=c.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this.fsQuad.render(e),f=this.renderTargetsVertical[l];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,i&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(r),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=n}getSeperableBlurMaterial(e){let t=[];for(let r=0;r<e;r++)t.push(.39894*Math.exp(-.5*r*r/(e*e))/e);return new v({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new d(.5,.5)},direction:{value:new d(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(e){return new v({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}};O.BlurDirectionX=new d(1,0);O.BlurDirectionY=new d(0,1);var ft={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`
	
		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};var he=class extends m{constructor(){super();let e=ft;this.uniforms=H.clone(e.uniforms),this.material=new nt({name:e.name,uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader}),this.fsQuad=new _(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,r){this.uniforms.tDiffuse.value=r.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},Xe.getTransfer(this._outputColorSpace)===je&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===Oe?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===Ve?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===ke?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===te?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===Qe?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===We&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}};function $t(c,e){let t=new Je({canvas:c,antialias:!0,powerPreference:"high-performance"});t.setClearColor(132620,1),t.toneMapping=te,t.toneMappingExposure=.85;let r=new et;r.fog=new $e(132620,.06);let o=new Ye(42,1,.1,100);o.position.set(0,0,9);let i=new M(3007231),n=new M(3007231),f={uTime:{value:0},uColor:{value:i},uLevel:{value:0}},l=new j;r.add(l);let S=new j;l.add(S);let V=new v({uniforms:f,transparent:!0,depthWrite:!1,blending:C,vertexShader:`
      uniform float uTime; uniform float uLevel;
      varying vec3 vN; varying vec3 vV; varying float vD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
      void main(){
        vec3 p = position;
        float d = sin(p.x*6.0+uTime*2.1)*sin(p.y*7.0-uTime*1.7)*sin(p.z*5.0+uTime*1.3);
        p += normal * d * (0.04 + uLevel*0.16);
        vD = d;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      uniform vec3 uColor; uniform float uLevel; uniform float uTime;
      varying vec3 vN; varying vec3 vV; varying float vD;
      void main(){
        float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.2);
        vec3 c = mix(uColor, vec3(1.0), 0.25 + vD*0.4);
        float a = f*1.1 + 0.05 + uLevel*0.25;
        gl_FragColor = vec4(c * a, a);
      }`}),p=new G(new X(.62,24),V);S.add(p);let P=new G(new at(.16,32,32),new Q({color:12581119}));S.add(P);let B=[],ue=s=>(B.push(s),s),fe=s=>ue(new it({color:i,transparent:!0,opacity:s,blending:C,depthWrite:!1})),q=new we(new Se(new X(1,1)),fe(.35)),ce=new we(new Se(new X(1.32,0)),fe(.28));S.add(q,ce);let ct=new X(1,1),dt=new Ce(ct,new rt({color:16777215,size:.05,transparent:!0,opacity:.7,blending:C,depthWrite:!1}));q.add(dt);let _e=s=>ue(new Q({color:i,transparent:!0,opacity:s,side:Ie,blending:C,depthWrite:!1})),Pe=[];function Y(s,a,h,u,x,ze,ee,mt){let L=new j;for(let be=0;be<h;be++){let pt=Math.PI*2/h-u,gt=new G(new ot(s,s+a,64,1,be*Math.PI*2/h,pt),_e(x));L.add(gt)}return L.rotation.set(ze,ee,0),L.userData.speed=mt,l.add(L),Pe.push(L),L}Y(1.62,.035,3,.45,.9,1.25,.2,.35),Y(1.78,.012,1,0,.45,-1.1,.5,-.2),Y(1.95,.05,24,.07,.4,Math.PI/2,0,.5),Y(2.2,.02,2,1.6,.85,.4,-.9,-.8);let ye=new tt(new qe(.012,.09,.012),_e(.5),180),k=new Ke;for(let s=0;s<180;s++){let a=s/180*Math.PI*2,h=s%15===0;k.position.set(Math.cos(a)*2.45,Math.sin(a)*2.45,0),k.rotation.z=a+Math.PI/2,k.scale.set(1,h?2.2:1,1),k.updateMatrix(),ye.setMatrixAt(s,k.matrix)}let Z=new j;Z.add(ye),Z.rotation.x=Math.PI/2-.55,l.add(Z);let de=256,J=new Float32Array(de*3),me=new W;me.setAttribute("position",new se(J,3));let Ae=new st(me,fe(.95));S.add(Ae);let pe=2600,He=new Float32Array(pe*3),Be=new Float32Array(pe);for(let s=0;s<pe;s++){let a=2.6+Math.pow(Math.random(),1.5)*9,h=Math.random()*Math.PI*2,u=Math.acos(2*Math.random()-1);He.set([a*Math.sin(u)*Math.cos(h),a*Math.sin(u)*Math.sin(h)*.75,a*Math.cos(u)],s*3),Be[s]=Math.random()}let ge=new W;ge.setAttribute("position",new se(He,3)),ge.setAttribute("seed",new se(Be,1));let Fe=new v({uniforms:{...f,uPR:{value:1}},transparent:!0,depthWrite:!1,blending:C,vertexShader:`
      attribute float seed; uniform float uTime; uniform float uLevel; uniform float uPR; varying float vA;
      void main(){
        vec3 p = position;
        float r = length(p);
        p *= 1.0 + sin(uTime*0.8 + seed*30.0)*0.015 + uLevel*0.06*(1.0/(r*0.3));
        vec4 mv = modelViewMatrix*vec4(p,1.0);
        gl_PointSize = (1.2 + seed*2.6) * uPR * (9.0 / -mv.z);
        vA = 0.25 + 0.75*abs(sin(uTime*(0.4+seed) + seed*20.0));
        gl_Position = projectionMatrix*mv;
      }`,fragmentShader:`
      uniform vec3 uColor; varying float vA;
      void main(){ float d = length(gl_PointCoord-0.5); if(d>0.5) discard; float a = smoothstep(0.5,0.0,d)*vA; gl_FragColor = vec4(mix(uColor,vec3(1.0),0.2)*a*0.8, a); }`}),De=new Ce(ge,Fe);r.add(De);let F=new ht(7,24,10,96,16777215,16777215);ue(F.material),F.material.transparent=!0,F.material.opacity=.16,F.material.blending=C,F.material.depthWrite=!1,F.position.y=-2.9;let D=new ne(t);D.addPass(new le(r,o));let ve=new O(new d(256,256),.7,.45,.12);D.addPass(ve),D.addPass(new he);let y=0,b=0;function $(){let s=Math.min(window.devicePixelRatio||1,1.75);y=c.clientWidth,b=c.clientHeight,t.setPixelRatio(s),t.setSize(y,b,!1),D.setPixelRatio(s),D.setSize(y,b),ve.resolution.set(y/2,b/2),Fe.uniforms.uPR.value=s,o.aspect=y/b,o.updateProjectionMatrix();let a=e.getBoundingClientRect(),h=2*Math.tan(ie.degToRad(o.fov/2))*o.position.z,u=a.top+a.height/2;l.position.y=(.5-u/b)*h,l.position.x=((a.left+a.width/2)/y-.5)*h*(y/b);let x=Math.min(a.height/b*h,a.width/b*h*.95)/5.6;l.scale.setScalar(x)}new ResizeObserver($).observe(c),new ResizeObserver($).observe(e),new MutationObserver(()=>{let s=0,a=()=>{$(),++s<40&&requestAnimationFrame(a)};a()}).observe(document.body,{attributes:!0,attributeFilter:["class"]}),$();let g={x:0,y:0,tx:0,ty:0};addEventListener("pointermove",s=>{g.tx=(s.clientX/innerWidth-.5)*1.2,g.ty=(s.clientY/innerHeight-.5)*1},{passive:!0}),addEventListener("deviceorientation",s=>{s.gamma!=null&&(g.tx=ie.clamp(s.gamma/30,-1,1)*1.1,g.ty=ie.clamp((s.beta-45)/40,-1,1)*.9)},{passive:!0});let E={idle:{c:3007231,spin:1,lvl:.08},wake:{c:2078207,spin:.7,lvl:.05},listen:{c:4063144,spin:1.6,lvl:.4},think:{c:16756782,spin:4.5,lvl:.35},speak:{c:8385535,spin:1.8,lvl:.6},error:{c:16726862,spin:.4,lvl:.1},music:{c:12610559,spin:1.3,lvl:.5},build:{c:16739285,spin:3,lvl:.45}},T=E.idle,w=1,U=0,Ue=0,Te=!0,xe=performance.now(),R=0,A=0;function Me(s){if(!Te)return;requestAnimationFrame(Me);let a=Math.min(.05,(s-xe)/1e3);xe=s,R+=a,i.lerp(n,.06);for(let u of B)u.color.copy(i);w+=(T.spin-w)*.05;let h=T.lvl;(T===E.speak||T===E.music)&&(h=T.lvl*(.55+.45*Math.abs(Math.sin(R*9)*Math.sin(R*3.7+1))+Math.random()*.15)),T===E.listen&&(h=.25+Math.random()*.35),h=Math.max(h,Ue),U+=(h-U)*.18,A*=.93,f.uTime.value=R,f.uLevel.value=U+A,S.rotation.y+=a*.25*w,q.rotation.x+=a*.15*w,q.rotation.z-=a*.1*w,ce.rotation.y-=a*.22*w,ce.rotation.x+=a*.06,Pe.forEach((u,x)=>{u.rotateZ(a*u.userData.speed*w)}),Z.rotation.z+=a*.05*w,De.rotation.y+=a*.012*(1+w*.3),P.scale.setScalar(1+U*.6+A+Math.sin(R*3)*.04),p.scale.setScalar(1+A*.4);for(let u=0;u<de;u++){let x=u/de*Math.PI*2,ee=1.12+(Math.sin(x*6+R*4.5)*.5+Math.sin(x*13-R*7)*.35+Math.sin(x*3+R*2)*.15)*(.03+U*.28);J[u*3]=Math.cos(x)*ee,J[u*3+1]=Math.sin(x)*ee,J[u*3+2]=0}me.attributes.position.needsUpdate=!0,Ae.lookAt(o.position),g.x+=(g.tx-g.x)*.05,g.y+=(g.ty-g.y)*.05,o.position.x=g.x*1.4,o.position.y=-g.y*1.1,o.lookAt(0,0,0),ve.strength=.6+U*.5+A*.6,D.render(a)}requestAnimationFrame(Me),document.addEventListener("visibilitychange",()=>{Te=document.visibilityState==="visible",Te&&(xe=performance.now(),requestAnimationFrame(Me))});let Le={holo:{idle:3007231,wake:2078207,speak:8385535,think:16756782},warm:{idle:16747069,wake:16738847,speak:16761466,think:16769162}},Ne="idle";return{setMode(s){Ne=s,T=E[s]||E.idle,n.set(T.c)},setPalette(s){let a=Le[s]||Le.holo;for(let u of Object.keys(a))E[u].c=a[u];T=E[Ne]||E.idle,n.set(T.c),P.material.color.set(s==="warm"?16769732:12581119);let h=s==="warm"?459779:132620;return t.setClearColor(h,1),r.fog.color.set(h),s},setLevel(s){Ue=s},pulse(s=.6){A=Math.max(A,s)}}}export{$t as createHUD};
