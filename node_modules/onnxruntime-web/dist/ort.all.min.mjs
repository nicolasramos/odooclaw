/*!
 * ONNX Runtime Web v1.30.0
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var Hw=Object.create;var fo=Object.defineProperty;var qw=Object.getOwnPropertyDescriptor;var jw=Object.getOwnPropertyNames;var Kw=Object.getPrototypeOf,Xw=Object.prototype.hasOwnProperty;var dr=(r=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(r,{get:(e,n)=>(typeof require<"u"?require:e)[n]}):r)(function(r){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+r+'" is not supported')});var A=(r,e,n)=>()=>{if(n)throw n[0];try{return r&&(e=r(r=0)),e}catch(t){throw n=[t],t}};var X=(r,e)=>()=>{try{return e||r((e={exports:{}}).exports,e),e.exports}catch(n){throw e=0,n}},pr=(r,e)=>{for(var n in e)fo(r,n,{get:e[n],enumerable:!0})},kl=(r,e,n,t)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of jw(e))!Xw.call(r,o)&&o!==n&&fo(r,o,{get:()=>e[o],enumerable:!(t=qw(e,o))||t.enumerable});return r};var ue=(r,e,n)=>(n=r!=null?Hw(Kw(r)):{},kl(e||!r||!r.__esModule?fo(n,"default",{value:r,enumerable:!0}):n,r)),kr=r=>kl(fo({},"__esModule",{value:!0}),r);var ho,Wn,On,Zw,Ll,hs=A(()=>{"use strict";ho=new Map,Wn=[],On=(r,e,n)=>{if(e&&typeof e.init=="function"&&typeof e.createInferenceSessionHandler=="function"){let t=ho.get(r);if(t===void 0)ho.set(r,{backend:e,priority:n});else{if(t.priority>n)return;if(t.priority===n&&t.backend!==e)throw new Error(`cannot register backend "${r}" using priority ${n}`)}if(n>=0){let o=Wn.indexOf(r);o!==-1&&Wn.splice(o,1);for(let i=0;i<Wn.length;i++)if(ho.get(Wn[i]).priority<=n){Wn.splice(i,0,r);return}Wn.push(r)}return}throw new TypeError("not a valid backend")},Zw=async r=>{let e=ho.get(r);if(!e)return"backend not found.";if(e.initialized)return e.backend;if(e.aborted)return e.error;{let n=!!e.initPromise;try{return n||(e.initPromise=e.backend.init(r)),await e.initPromise,e.initialized=!0,e.backend}catch(t){return n||(e.error=`${t}`,e.aborted=!0),e.error}finally{delete e.initPromise}}},Ll=async r=>{let e=r.executionProviders||[],n=e.map(u=>typeof u=="string"?u:u.name),t=n.length===0?Wn:n,o,i=[],s=new Set;for(let u of t){let l=await Zw(u);typeof l=="string"?i.push({name:u,err:l}):(o||(o=l),o===l&&s.add(u))}if(!o)throw new Error(`no available backend found. ERR: ${i.map(u=>`[${u.name}] ${u.err}`).join(", ")}`);for(let{name:u,err:l}of i)n.includes(u)&&console.warn(`removing requested execution provider "${u}" from session options because it is not available: ${l}`);let a=e.filter(u=>s.has(typeof u=="string"?u:u.name));return[o,new Proxy(r,{get:(u,l)=>l==="executionProviders"?a:Reflect.get(u,l)})]}});var Nl=A(()=>{"use strict";hs()});var Rl,zl=A(()=>{"use strict";Rl="1.30.0"});var Bl,Ue,ms=A(()=>{"use strict";zl();Bl="warning",Ue={wasm:{},webgl:{},webgpu:{},versions:{common:Rl},set logLevel(r){if(r!==void 0){if(typeof r!="string"||["verbose","info","warning","error","fatal"].indexOf(r)===-1)throw new Error(`Unsupported logging level: ${r}`);Bl=r}},get logLevel(){return Bl}};Object.defineProperty(Ue,"logLevel",{enumerable:!0})});var re,Ml=A(()=>{"use strict";ms();re=Ue});var Vl,Fl,Gl=A(()=>{"use strict";Vl=(r,e)=>{let n=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);n.width=r.dims[3],n.height=r.dims[2];let t=n.getContext("2d");if(t!=null){let o,i;e?.tensorLayout!==void 0&&e.tensorLayout==="NHWC"?(o=r.dims[2],i=r.dims[3]):(o=r.dims[3],i=r.dims[2]);let s=e?.format!==void 0?e.format:"RGB",a=e?.norm,u,l;a===void 0||a.mean===void 0?u=[255,255,255,255]:typeof a.mean=="number"?u=[a.mean,a.mean,a.mean,a.mean]:(u=[a.mean[0],a.mean[1],a.mean[2],0],a.mean[3]!==void 0&&(u[3]=a.mean[3])),a===void 0||a.bias===void 0?l=[0,0,0,0]:typeof a.bias=="number"?l=[a.bias,a.bias,a.bias,a.bias]:(l=[a.bias[0],a.bias[1],a.bias[2],0],a.bias[3]!==void 0&&(l[3]=a.bias[3]));let c=i*o,d=0,p=c,f=c*2,h=-1;s==="RGBA"?(d=0,p=c,f=c*2,h=c*3):s==="RGB"?(d=0,p=c,f=c*2):s==="RBG"&&(d=0,f=c,p=c*2);for(let m=0;m<i;m++)for(let y=0;y<o;y++){let g=(r.data[d++]-l[0])*u[0],b=(r.data[p++]-l[1])*u[1],_=(r.data[f++]-l[2])*u[2],x=h===-1?255:(r.data[h++]-l[3])*u[3];t.fillStyle="rgba("+g+","+b+","+_+","+x+")",t.fillRect(y,m,1,1)}if("toDataURL"in n)return n.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},Fl=(r,e)=>{let n=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),t;if(n!=null){let o,i,s;e?.tensorLayout!==void 0&&e.tensorLayout==="NHWC"?(o=r.dims[2],i=r.dims[1],s=r.dims[3]):(o=r.dims[3],i=r.dims[2],s=r.dims[1]);let a=e!==void 0&&e.format!==void 0?e.format:"RGB",u=e?.norm,l,c;u===void 0||u.mean===void 0?l=[255,255,255,255]:typeof u.mean=="number"?l=[u.mean,u.mean,u.mean,u.mean]:(l=[u.mean[0],u.mean[1],u.mean[2],255],u.mean[3]!==void 0&&(l[3]=u.mean[3])),u===void 0||u.bias===void 0?c=[0,0,0,0]:typeof u.bias=="number"?c=[u.bias,u.bias,u.bias,u.bias]:(c=[u.bias[0],u.bias[1],u.bias[2],0],u.bias[3]!==void 0&&(c[3]=u.bias[3]));let d=i*o;if(e!==void 0&&(e.format!==void 0&&s===4&&e.format!=="RGBA"||s===3&&e.format!=="RGB"&&e.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let p=4,f=0,h=1,m=2,y=3,g=0,b=d,_=d*2,x=-1;a==="RGBA"?(g=0,b=d,_=d*2,x=d*3):a==="RGB"?(g=0,b=d,_=d*2):a==="RBG"&&(g=0,_=d,b=d*2),t=n.createImageData(o,i);for(let T=0;T<i*o;f+=p,h+=p,m+=p,y+=p,T++)t.data[f]=(r.data[g++]-c[0])*l[0],t.data[h]=(r.data[b++]-c[1])*l[1],t.data[m]=(r.data[_++]-c[2])*l[2],t.data[y]=x===-1?255:(r.data[x++]-c[3])*l[3]}else throw new Error("Can not access image data");return t}});var gs,Ul,Wl,Hl,ql,jl,Kl=A(()=>{"use strict";mo();gs=(r,e)=>{if(r===void 0)throw new Error("Image buffer must be defined");if(e.height===void 0||e.width===void 0)throw new Error("Image height and width must be defined");if(e.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:n,width:t}=e,o=e.norm??{mean:255,bias:0},i,s;typeof o.mean=="number"?i=[o.mean,o.mean,o.mean,o.mean]:i=[o.mean[0],o.mean[1],o.mean[2],o.mean[3]??255],typeof o.bias=="number"?s=[o.bias,o.bias,o.bias,o.bias]:s=[o.bias[0],o.bias[1],o.bias[2],o.bias[3]??0];let a=e.format!==void 0?e.format:"RGBA",u=e.tensorFormat!==void 0&&e.tensorFormat!==void 0?e.tensorFormat:"RGB",l=n*t,c=u==="RGBA"?new Float32Array(l*4):new Float32Array(l*3),d=4,p=0,f=1,h=2,m=3,y=0,g=l,b=l*2,_=-1;a==="RGB"&&(d=3,p=0,f=1,h=2,m=-1),u==="RGBA"?_=l*3:u==="RBG"?(y=0,b=l,g=l*2):u==="BGR"&&(b=0,g=l,y=l*2);for(let T=0;T<l;T++,p+=d,h+=d,f+=d,m+=d)c[y++]=(r[p]+s[0])/i[0],c[g++]=(r[f]+s[1])/i[1],c[b++]=(r[h]+s[2])/i[2],_!==-1&&m!==-1&&(c[_++]=(r[m]+s[3])/i[3]);return u==="RGBA"?new je("float32",c,[1,4,n,t]):new je("float32",c,[1,3,n,t])},Ul=async(r,e)=>{let n=typeof HTMLImageElement<"u"&&r instanceof HTMLImageElement,t=typeof ImageData<"u"&&r instanceof ImageData,o=typeof ImageBitmap<"u"&&r instanceof ImageBitmap,i=typeof r=="string",s,a=e??{},u=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},l=c=>typeof HTMLCanvasElement<"u"&&c instanceof HTMLCanvasElement||c instanceof OffscreenCanvas?c.getContext("2d"):null;if(n){let c=u();c.width=r.width,c.height=r.height;let d=l(c);if(d!=null){let p=r.height,f=r.width;if(e!==void 0&&e.resizedHeight!==void 0&&e.resizedWidth!==void 0&&(p=e.resizedHeight,f=e.resizedWidth),e!==void 0){if(a=e,e.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");a.tensorFormat="RGBA",a.height=p,a.width=f}else a.tensorFormat="RGBA",a.height=p,a.width=f;d.drawImage(r,0,0),s=d.getImageData(0,0,f,p).data}else throw new Error("Can not access image data")}else if(t){let c,d;if(e!==void 0&&e.resizedWidth!==void 0&&e.resizedHeight!==void 0?(c=e.resizedHeight,d=e.resizedWidth):(c=r.height,d=r.width),e!==void 0&&(a=e),a.format="RGBA",a.height=c,a.width=d,e!==void 0){let p=u();p.width=d,p.height=c;let f=l(p);if(f!=null)f.putImageData(r,0,0),s=f.getImageData(0,0,d,c).data;else throw new Error("Can not access image data")}else s=r.data}else if(o){if(e===void 0)throw new Error("Please provide image config with format for Imagebitmap");let c=u();c.width=r.width,c.height=r.height;let d=l(c);if(d!=null){let p=r.height,f=r.width;return d.drawImage(r,0,0,f,p),s=d.getImageData(0,0,f,p).data,a.height=p,a.width=f,gs(s,a)}else throw new Error("Can not access image data")}else{if(i)return new Promise((c,d)=>{let p=u(),f=l(p);if(!r||!f)return d();let h=new Image;h.crossOrigin="Anonymous",h.src=r,h.onload=()=>{p.width=h.width,p.height=h.height,f.drawImage(h,0,0,p.width,p.height);let m=f.getImageData(0,0,p.width,p.height);a.height=p.height,a.width=p.width,c(gs(m.data,a))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(s!==void 0)return gs(s,a);throw new Error("Input data provided is not supported - aborted tensor creation")},Wl=(r,e)=>{let{width:n,height:t,download:o,dispose:i}=e,s=[1,t,n,4];return new je({location:"texture",type:"float32",texture:r,dims:s,download:o,dispose:i})},Hl=(r,e)=>{let{dataType:n,dims:t,download:o,dispose:i}=e;return new je({location:"gpu-buffer",type:n??"float32",gpuBuffer:r,dims:t,download:o,dispose:i})},ql=(r,e)=>{let{dataType:n,dims:t,download:o,dispose:i}=e;return new je({location:"ml-tensor",type:n??"float32",mlTensor:r,dims:t,download:o,dispose:i})},jl=(r,e,n)=>new je({location:"cpu-pinned",type:r,data:e,dims:n??[e.length]})});var Hn,Lr,Xl,Zl,Jl=A(()=>{"use strict";Hn=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),Lr=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),Xl=!1,Zl=()=>{if(!Xl){Xl=!0;let r=typeof BigInt64Array<"u"&&BigInt64Array.from,e=typeof BigUint64Array<"u"&&BigUint64Array.from,n=globalThis.Float16Array,t=typeof n<"u"&&n.from;r&&(Hn.set("int64",BigInt64Array),Lr.set(BigInt64Array,"int64")),e&&(Hn.set("uint64",BigUint64Array),Lr.set(BigUint64Array,"uint64")),t?(Hn.set("float16",n),Lr.set(n,"float16")):Hn.set("float16",Uint16Array)}}});var Ql,Yl,ec=A(()=>{"use strict";mo();Ql=r=>{let e=1;for(let n=0;n<r.length;n++){let t=r[n];if(typeof t!="number"||!Number.isSafeInteger(t))throw new TypeError(`dims[${n}] must be an integer, got: ${t}`);if(t<0)throw new RangeError(`dims[${n}] must be a non-negative integer, got: ${t}`);e*=t}return e},Yl=(r,e)=>{switch(r.location){case"cpu":return new je(r.type,r.data,e);case"cpu-pinned":return new je({location:"cpu-pinned",data:r.data,type:r.type,dims:e});case"texture":return new je({location:"texture",texture:r.texture,type:r.type,dims:e});case"gpu-buffer":return new je({location:"gpu-buffer",gpuBuffer:r.gpuBuffer,type:r.type,dims:e});case"ml-tensor":return new je({location:"ml-tensor",mlTensor:r.mlTensor,type:r.type,dims:e});default:throw new Error(`tensorReshape: tensor location ${r.location} is not supported`)}}});var je,mo=A(()=>{"use strict";Gl();Kl();Jl();ec();je=class{constructor(e,n,t){Zl();let o,i;if(typeof e=="object"&&"location"in e)switch(this.dataLocation=e.location,o=e.type,i=e.dims,e.location){case"cpu-pinned":{let a=Hn.get(o);if(!a)throw new TypeError(`unsupported type "${o}" to create tensor from pinned buffer`);if(!(e.data instanceof a))throw new TypeError(`buffer should be of type ${a.name}`);this.cpuData=e.data;break}case"texture":{if(o!=="float32")throw new TypeError(`unsupported type "${o}" to create tensor from texture`);this.gpuTextureData=e.texture,this.downloader=e.download,this.disposer=e.dispose;break}case"gpu-buffer":{if(o!=="float32"&&o!=="float16"&&o!=="int32"&&o!=="int64"&&o!=="uint32"&&o!=="uint8"&&o!=="bool"&&o!=="uint4"&&o!=="int4")throw new TypeError(`unsupported type "${o}" to create tensor from gpu buffer`);this.gpuBufferData=e.gpuBuffer,this.downloader=e.download,this.disposer=e.dispose;break}case"ml-tensor":{if(o!=="float32"&&o!=="float16"&&o!=="int32"&&o!=="int64"&&o!=="uint32"&&o!=="uint64"&&o!=="int8"&&o!=="uint8"&&o!=="bool"&&o!=="uint4"&&o!=="int4")throw new TypeError(`unsupported type "${o}" to create tensor from MLTensor`);this.mlTensorData=e.mlTensor,this.downloader=e.download,this.disposer=e.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let a,u;if(typeof e=="string")if(o=e,u=t,e==="string"){if(!Array.isArray(n))throw new TypeError("A string tensor's data must be a string array.");a=n}else{let l=Hn.get(e);if(l===void 0)throw new TypeError(`Unsupported tensor type: ${e}.`);if(Array.isArray(n)){if(e==="float16"&&l===Uint16Array||e==="uint4"||e==="int4")throw new TypeError(`Creating a ${e} tensor from number array is not supported. Please use ${l.name} as data.`);e==="uint64"||e==="int64"?a=l.from(n,BigInt):a=l.from(n)}else if(n instanceof l)a=n;else if(n instanceof Uint8ClampedArray)if(e==="uint8")a=Uint8Array.from(n);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else if(e==="float16"&&n instanceof Uint16Array&&l!==Uint16Array)a=new globalThis.Float16Array(n.buffer,n.byteOffset,n.length);else throw new TypeError(`A ${o} tensor's data must be type of ${l}`)}else if(u=n,Array.isArray(e)){if(e.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let l=typeof e[0];if(l==="string")o="string",a=e;else if(l==="boolean")o="bool",a=Uint8Array.from(e);else throw new TypeError(`Invalid element type of data array: ${l}.`)}else if(e instanceof Uint8ClampedArray)o="uint8",a=Uint8Array.from(e);else{let l=Lr.get(e.constructor);if(l===void 0)throw new TypeError(`Unsupported type for tensor data: ${e.constructor}.`);o=l,a=e}if(u===void 0)u=[a.length];else if(!Array.isArray(u))throw new TypeError("A tensor's dims must be a number array");i=u,this.cpuData=a,this.dataLocation="cpu"}let s=Ql(i);if(this.cpuData&&s!==this.cpuData.length&&!((o==="uint4"||o==="int4")&&Math.ceil(s/2)===this.cpuData.length))throw new Error(`Tensor's size(${s}) does not match data length(${this.cpuData.length}).`);this.type=o,this.dims=i,this.size=s}static async fromImage(e,n){return Ul(e,n)}static fromTexture(e,n){return Wl(e,n)}static fromGpuBuffer(e,n){return Hl(e,n)}static fromMLTensor(e,n){return ql(e,n)}static fromPinnedBuffer(e,n,t){return jl(e,n,t)}toDataURL(e){return Vl(this,e)}toImageData(e){return Fl(this,e)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(e){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let n=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=n,e&&this.disposer&&(this.disposer(),this.disposer=void 0),n}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(e){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return Yl(this,e)}}});var st,bs=A(()=>{"use strict";mo();st=je});var go,tc,at,et,Pn,En,ys=A(()=>{"use strict";ms();go=(r,e)=>{(typeof Ue.trace>"u"?!Ue.wasm.trace:!Ue.trace)||console.timeStamp(`${r}::ORT::${e}`)},tc=(r,e)=>{let n=new Error().stack?.split(/\r\n|\r|\n/g)||[],t=!1;for(let o=0;o<n.length;o++){if(t&&!n[o].includes("TRACE_FUNC")){let i=`FUNC_${r}::${n[o].trim().split(" ")[1]}`;e&&(i+=`::${e}`),go("CPU",i);return}n[o].includes("TRACE_FUNC")&&(t=!0)}},at=r=>{(typeof Ue.trace>"u"?!Ue.wasm.trace:!Ue.trace)||tc("BEGIN",r)},et=r=>{(typeof Ue.trace>"u"?!Ue.wasm.trace:!Ue.trace)||tc("END",r)},Pn=r=>{(typeof Ue.trace>"u"?!Ue.wasm.trace:!Ue.trace)||console.time(`ORT::${r}`)},En=r=>{(typeof Ue.trace>"u"?!Ue.wasm.trace:!Ue.trace)||console.timeEnd(`ORT::${r}`)}});var bo,nc=A(()=>{"use strict";hs();bs();ys();bo=class r{constructor(e){this.handler=e}async run(e,n,t){at(),Pn("InferenceSession.run");let o={},i={};if(typeof e!="object"||e===null||e instanceof st||Array.isArray(e))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let s=!0;if(typeof n=="object"){if(n===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(n instanceof st)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(n)){if(n.length===0)throw new TypeError("'fetches' cannot be an empty array.");s=!1;for(let l of n){if(typeof l!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(l)===-1)throw new RangeError(`'fetches' contains invalid output name: ${l}.`);o[l]=null}if(typeof t=="object"&&t!==null)i=t;else if(typeof t<"u")throw new TypeError("'options' must be an object.")}else{let l=!1,c=Object.getOwnPropertyNames(n);for(let d of this.outputNames)if(c.indexOf(d)!==-1){let p=n[d];(p===null||p instanceof st)&&(l=!0,s=!1,o[d]=p)}if(l){if(typeof t=="object"&&t!==null)i=t;else if(typeof t<"u")throw new TypeError("'options' must be an object.")}else i=n}}else if(typeof n<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let l of this.inputNames)if(typeof e[l]>"u")throw new Error(`input '${l}' is missing in 'feeds'.`);if(s)for(let l of this.outputNames)o[l]=null;let a=await this.handler.run(e,o,i),u={};for(let l in a)if(Object.hasOwnProperty.call(a,l)){let c=a[l];c instanceof st?u[l]=c:u[l]=new st(c.type,c.data,c.dims)}return En("InferenceSession.run"),et(),u}async release(){return this.handler.dispose()}static async create(e,n,t,o){at(),Pn("InferenceSession.create");let i,s={};if(typeof e=="string"){if(i=e,typeof n=="object"&&n!==null)s=n;else if(typeof n<"u")throw new TypeError("'options' must be an object.")}else if(e instanceof Uint8Array){if(i=e,typeof n=="object"&&n!==null)s=n;else if(typeof n<"u")throw new TypeError("'options' must be an object.")}else if(e instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&e instanceof SharedArrayBuffer){let c=e,d=0,p=e.byteLength;if(typeof n=="object"&&n!==null)s=n;else if(typeof n=="number"){if(d=n,!Number.isSafeInteger(d))throw new RangeError("'byteOffset' must be an integer.");if(d<0||d>=c.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${c.byteLength}).`);if(p=e.byteLength-d,typeof t=="number"){if(p=t,!Number.isSafeInteger(p))throw new RangeError("'byteLength' must be an integer.");if(p<=0||d+p>c.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${c.byteLength-d}].`);if(typeof o=="object"&&o!==null)s=o;else if(typeof o<"u")throw new TypeError("'options' must be an object.")}else if(typeof t<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof n<"u")throw new TypeError("'options' must be an object.");i=new Uint8Array(c,d,p)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[a,u]=await Ll(s),l=await a.createInferenceSessionHandler(i,u);return En("InferenceSession.create"),et(),new r(l)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}get inputMetadata(){return this.handler.inputMetadata}get outputMetadata(){return this.handler.outputMetadata}}});var Jw,rc=A(()=>{"use strict";nc();Jw=bo});var oc=A(()=>{"use strict"});var ic=A(()=>{"use strict"});var sc=A(()=>{"use strict"});var ac=A(()=>{"use strict"});var _s={};pr(_s,{InferenceSession:()=>Jw,TRACE:()=>go,TRACE_EVENT_BEGIN:()=>Pn,TRACE_EVENT_END:()=>En,TRACE_FUNC_BEGIN:()=>at,TRACE_FUNC_END:()=>et,Tensor:()=>st,env:()=>re,registerBackend:()=>On});var Ke=A(()=>{"use strict";Nl();Ml();rc();bs();oc();ic();ys();sc();ac()});function Dn(r,e,n,t){if(e===void 0)return Yw(r);if(n===void 0)yo(r,e,1);else if(typeof n=="number"&&t===void 0)yo(r,e,n);else if(typeof n=="string"&&t===void 0)yo(r,n,1,e);else if(typeof n=="string"&&typeof t=="number")yo(r,n,t,e);else throw new TypeError("input is valid")}function Yw(r){return{verbose:Dn.verbose.bind(null,r),info:Dn.info.bind(null,r),warning:Dn.warning.bind(null,r),error:Dn.error.bind(null,r),fatal:Dn.fatal.bind(null,r)}}function yo(r,e,n,t){let o=Nr[t||""]||Nr[""];lc[r]<lc[o.minimalSeverity]||(o.logDateTime&&(e=`${new Date().toISOString()}|${e}`),o.logSourceLocation,Qw[o.provider].log(r,e,t))}var ws,vs,lc,Qw,cc,Nr,Ie,wo,vo,xo,_o,dt=A(()=>{"use strict";ws=class{log(e,n,t){}},vs=class{log(e,n,t){console.log(`${this.color(e)} ${t?"\x1B[35m"+t+"\x1B[0m ":""}${n}`)}color(e){switch(e){case"verbose":return"\x1B[34;40mv\x1B[0m";case"info":return"\x1B[32mi\x1B[0m";case"warning":return"\x1B[30;43mw\x1B[0m";case"error":return"\x1B[31;40me\x1B[0m";case"fatal":return"\x1B[101mf\x1B[0m";default:throw new Error(`unsupported severity: ${e}`)}}},lc={verbose:1e3,info:2e3,warning:4e3,error:5e3,fatal:6e3},Qw={none:new ws,console:new vs},cc={provider:"console",minimalSeverity:"warning",logDateTime:!0,logSourceLocation:!1},Nr={"":cc};(u=>{function r(l,c){u("verbose",l,c)}u.verbose=r;function e(l,c){u("info",l,c)}u.info=e;function n(l,c){u("warning",l,c)}u.warning=n;function t(l,c){u("error",l,c)}u.error=t;function o(l,c){u("fatal",l,c)}u.fatal=o;function i(l){Nr={},s("",l||{})}u.reset=i;function s(l,c){if(l==="*")i(c);else{let d=Nr[l]||cc;Nr[l]={provider:c.provider||d.provider,minimalSeverity:c.minimalSeverity||d.minimalSeverity,logDateTime:c.logDateTime===void 0?d.logDateTime:c.logDateTime,logSourceLocation:c.logSourceLocation===void 0?d.logSourceLocation:c.logSourceLocation}}}u.set=s;function a(l){let c={};l.logLevel&&(c.minimalSeverity=l.logLevel),s("",c)}u.setWithEnv=a})(Dn||={});Ie=Dn,wo=class{constructor(e,n,t,o,i,s){this.category=e;this.name=n;this.startTime=t;this.endCallback=o;this.timer=i;this.ctx=s}async end(){return this.endCallback(this)}async checkTimer(){if(this.ctx===void 0||this.timer===void 0)throw new Error("No webgl timer found");return this.ctx.endTimer(),this.ctx.waitForQueryAndGetTime(this.timer)}},vo=class{constructor(e,n,t,o){this.category=e;this.name=n;this.startTime=t;this.endTime=o}},xo=class{constructor(e,n,t){this._started=!1;this._flushPointer=0;this._started=!1,this._maxNumberEvents=e===void 0?1e4:e,this._flushBatchSize=n===void 0?10:n,this._flushIntervalInMilliseconds=t===void 0?5e3:t}static create(e){return e===void 0?new this:new this(e.maxNumberEvents,e.flushBatchSize,e.flushIntervalInMilliseconds)}start(){this._started=!0,this._timingEvents=[],this._flushTime=_o(),this._flushPointer=0}stop(){for(this._started=!1;this._flushPointer<this._timingEvents.length;this._flushPointer++)this.logOneEvent(this._timingEvents[this._flushPointer])}event(e,n,t,o){let i=this._started?this.begin(e,n,o):void 0,s=!1,a=t();if(a&&typeof a.then=="function")return s=!0,new Promise((u,l)=>{a.then(async c=>{i&&await i.end(),u(c)},async c=>{i&&await i.end(),l(c)})});if(!s&&i){let u=i.end();if(u&&typeof u.then=="function")return new Promise((l,c)=>{u.then(()=>{l(a)},d=>{c(d)})})}return a}begin(e,n,t){if(!this._started)throw new Error("profiler is not started yet");if(t===void 0){let o=_o();return this.flush(o),new wo(e,n,o,i=>this.endSync(i))}else{let o=t.beginTimer();return new wo(e,n,0,async i=>this.end(i),o,t)}}async end(e){let n=await e.checkTimer();this._timingEvents.length<this._maxNumberEvents&&(this._timingEvents.push(new vo(e.category,e.name,e.startTime,n)),this.flush(n))}endSync(e){let n=_o();this._timingEvents.length<this._maxNumberEvents&&(this._timingEvents.push(new vo(e.category,e.name,e.startTime,n)),this.flush(n))}logOneEvent(e){Ie.verbose(`Profiler.${e.category}`,`${(e.endTime-e.startTime).toFixed(2)}ms on event '${e.name}' at ${e.endTime.toFixed(2)}`)}flush(e){if(this._timingEvents.length-this._flushPointer>=this._flushBatchSize||e-this._flushTime>=this._flushIntervalInMilliseconds){for(let n=this._flushPointer;this._flushPointer<n+this._flushBatchSize&&this._flushPointer<this._timingEvents.length;this._flushPointer++)this.logOneEvent(this._timingEvents[this._flushPointer]);this._flushTime=_o()}}get started(){return this._started}},_o=typeof performance<"u"&&performance.now?()=>performance.now():Date.now});function dc(r,e,n){for(let t of n){let o=t[0],i=t[1],s=t[2],a=t[3],u=t[4];if(r.opType===o){for(let l of e)if((l.domain===i||l.domain==="ai.onnx"&&i==="")&&ev(l.version,s))return{opImpl:a,opInit:u}}}throw new TypeError(`cannot resolve operator '${r.opType}' with opsets: ${e.map(t=>`${t.domain||"ai.onnx"} v${t.version}`).join(", ")}`)}function ev(r,e){if(e.endsWith("+")){let n=Number.parseInt(e.substring(0,e.length-1),10);return!isNaN(n)&&n<=r}else if(e.split("-").length===2){let n=e.split("-"),t=Number.parseInt(n[0],10),o=Number.parseInt(n[1],10);return!isNaN(t)&&!isNaN(o)&&t<=r&&r<=o}else return Number.parseInt(e,10)===r}var pc=A(()=>{"use strict"});var fc=X(xs=>{"use strict";xs.__esModule=!0;var tv=(function(){function r(e){if(!e)throw new TypeError("Invalid argument; `value` has no value.");this.value=r.EMPTY,e&&r.isGuid(e)&&(this.value=e)}return r.isGuid=function(e){var n=e.toString();return e&&(e instanceof r||r.validator.test(n))},r.create=function(){return new r([r.gen(2),r.gen(1),r.gen(1),r.gen(1),r.gen(3)].join("-"))},r.createEmpty=function(){return new r("emptyguid")},r.parse=function(e){return new r(e)},r.raw=function(){return[r.gen(2),r.gen(1),r.gen(1),r.gen(1),r.gen(3)].join("-")},r.gen=function(e){for(var n="",t=0;t<e;t++)n+=((1+Math.random())*65536|0).toString(16).substring(1);return n},r.prototype.equals=function(e){return r.isGuid(e)&&this.value===e.toString()},r.prototype.isEmpty=function(){return this.value===r.EMPTY},r.prototype.toString=function(){return this.value},r.prototype.toJSON=function(){return{value:this.value}},r.validator=new RegExp("^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$","i"),r.EMPTY="00000000-0000-0000-0000-000000000000",r})();xs.Guid=tv});function $e(r,e,n){this.low=r|0,this.high=e|0,this.unsigned=!!n}function Je(r){return(r&&r.__isLong__)===!0}function hc(r){var e=Math.clz32(r&-r);return r?31-e:e}function qn(r,e){var n,t,o;return e?(r>>>=0,(o=0<=r&&r<256)&&(t=gc[r],t)?t:(n=ye(r,0,!0),o&&(gc[r]=n),n)):(r|=0,(o=-128<=r&&r<128)&&(t=mc[r],t)?t:(n=ye(r,r<0?-1:0,!1),o&&(mc[r]=n),n))}function ft(r,e){if(isNaN(r))return e?Tn:Tt;if(e){if(r<0)return Tn;if(r>=wc)return Tc}else{if(r<=-yc)return tt;if(r+1>=yc)return xc}return r<0?ft(-r,e).neg():ye(r%hr|0,r/hr|0,e)}function ye(r,e,n){return new $e(r,e,n)}function Is(r,e,n){if(r.length===0)throw Error("empty string");if(typeof e=="number"?(n=e,e=!1):e=!!e,r==="NaN"||r==="Infinity"||r==="+Infinity"||r==="-Infinity")return e?Tn:Tt;if(n=n||10,n<2||36<n)throw RangeError("radix");var t;if((t=r.indexOf("-"))>0)throw Error("interior hyphen");if(t===0)return Is(r.substring(1),e,n).neg();for(var o=ft(To(n,8)),i=Tt,s=0;s<r.length;s+=8){var a=Math.min(8,r.length-s),u=parseInt(r.substring(s,s+a),n);if(a<8){var l=ft(To(n,a));i=i.mul(l).add(ft(u))}else i=i.mul(o),i=i.add(ft(u))}return i.unsigned=e,i}function ht(r,e){return typeof r=="number"?ft(r,e):typeof r=="string"?Is(r,e):ye(r.low,r.high,typeof e=="boolean"?e:r.unsigned)}var pt,mc,gc,To,bc,nv,hr,wc,yc,_c,Tt,Tn,fr,vc,Ts,xc,Tc,tt,F,Cn,Ss=A(()=>{pt=null;try{pt=new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0,1,13,2,96,0,1,127,96,4,127,127,127,127,1,127,3,7,6,0,1,1,1,1,1,6,6,1,127,1,65,0,11,7,50,6,3,109,117,108,0,1,5,100,105,118,95,115,0,2,5,100,105,118,95,117,0,3,5,114,101,109,95,115,0,4,5,114,101,109,95,117,0,5,8,103,101,116,95,104,105,103,104,0,0,10,191,1,6,4,0,35,0,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,126,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,127,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,128,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,129,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,130,34,4,66,32,135,167,36,0,32,4,167,11])),{}).exports}catch{}$e.prototype.__isLong__;Object.defineProperty($e.prototype,"__isLong__",{value:!0});$e.isLong=Je;mc={},gc={};$e.fromInt=qn;$e.fromNumber=ft;$e.fromBits=ye;To=Math.pow;$e.fromString=Is;$e.fromValue=ht;bc=65536,nv=1<<24,hr=bc*bc,wc=hr*hr,yc=wc/2,_c=qn(nv),Tt=qn(0);$e.ZERO=Tt;Tn=qn(0,!0);$e.UZERO=Tn;fr=qn(1);$e.ONE=fr;vc=qn(1,!0);$e.UONE=vc;Ts=qn(-1);$e.NEG_ONE=Ts;xc=ye(-1,2147483647,!1);$e.MAX_VALUE=xc;Tc=ye(-1,-1,!0);$e.MAX_UNSIGNED_VALUE=Tc;tt=ye(0,-2147483648,!1);$e.MIN_VALUE=tt;F=$e.prototype;F.toInt=function(){return this.unsigned?this.low>>>0:this.low};F.toNumber=function(){return this.unsigned?(this.high>>>0)*hr+(this.low>>>0):this.high*hr+(this.low>>>0)};F.toString=function(e){if(e=e||10,e<2||36<e)throw RangeError("radix");if(this.isZero())return"0";if(this.isNegative())if(this.eq(tt)){var n=ft(e),t=this.div(n),o=t.mul(n).sub(this);return t.toString(e)+o.toInt().toString(e)}else return"-"+this.neg().toString(e);for(var i=ft(To(e,6),this.unsigned),s=this,a="";;){var u=s.div(i),l=s.sub(u.mul(i)).toInt()>>>0,c=l.toString(e);if(s=u,s.isZero())return c+a;for(;c.length<6;)c="0"+c;a=""+c+a}};F.getHighBits=function(){return this.high};F.getHighBitsUnsigned=function(){return this.high>>>0};F.getLowBits=function(){return this.low};F.getLowBitsUnsigned=function(){return this.low>>>0};F.getNumBitsAbs=function(){if(this.isNegative())return this.eq(tt)?64:this.neg().getNumBitsAbs();for(var e=this.high!=0?this.high:this.low,n=31;n>0&&(e&1<<n)==0;n--);return this.high!=0?n+33:n+1};F.isSafeInteger=function(){var e=this.high>>21;return e?this.unsigned?!1:e===-1&&!(this.low===0&&this.high===-2097152):!0};F.isZero=function(){return this.high===0&&this.low===0};F.eqz=F.isZero;F.isNegative=function(){return!this.unsigned&&this.high<0};F.isPositive=function(){return this.unsigned||this.high>=0};F.isOdd=function(){return(this.low&1)===1};F.isEven=function(){return(this.low&1)===0};F.equals=function(e){return Je(e)||(e=ht(e)),this.unsigned!==e.unsigned&&this.high>>>31===1&&e.high>>>31===1?!1:this.high===e.high&&this.low===e.low};F.eq=F.equals;F.notEquals=function(e){return!this.eq(e)};F.neq=F.notEquals;F.ne=F.notEquals;F.lessThan=function(e){return this.comp(e)<0};F.lt=F.lessThan;F.lessThanOrEqual=function(e){return this.comp(e)<=0};F.lte=F.lessThanOrEqual;F.le=F.lessThanOrEqual;F.greaterThan=function(e){return this.comp(e)>0};F.gt=F.greaterThan;F.greaterThanOrEqual=function(e){return this.comp(e)>=0};F.gte=F.greaterThanOrEqual;F.ge=F.greaterThanOrEqual;F.compare=function(e){if(Je(e)||(e=ht(e)),this.eq(e))return 0;var n=this.isNegative(),t=e.isNegative();return n&&!t?-1:!n&&t?1:this.unsigned?e.high>>>0>this.high>>>0||e.high===this.high&&e.low>>>0>this.low>>>0?-1:1:this.sub(e).isNegative()?-1:1};F.comp=F.compare;F.negate=function(){return!this.unsigned&&this.eq(tt)?tt:this.not().add(fr)};F.neg=F.negate;F.add=function(e){Je(e)||(e=ht(e));var n=this.high>>>16,t=this.high&65535,o=this.low>>>16,i=this.low&65535,s=e.high>>>16,a=e.high&65535,u=e.low>>>16,l=e.low&65535,c=0,d=0,p=0,f=0;return f+=i+l,p+=f>>>16,f&=65535,p+=o+u,d+=p>>>16,p&=65535,d+=t+a,c+=d>>>16,d&=65535,c+=n+s,c&=65535,ye(p<<16|f,c<<16|d,this.unsigned)};F.subtract=function(e){return Je(e)||(e=ht(e)),this.add(e.neg())};F.sub=F.subtract;F.multiply=function(e){if(this.isZero())return this;if(Je(e)||(e=ht(e)),pt){var n=pt.mul(this.low,this.high,e.low,e.high);return ye(n,pt.get_high(),this.unsigned)}if(e.isZero())return this.unsigned?Tn:Tt;if(this.eq(tt))return e.isOdd()?tt:Tt;if(e.eq(tt))return this.isOdd()?tt:Tt;if(this.isNegative())return e.isNegative()?this.neg().mul(e.neg()):this.neg().mul(e).neg();if(e.isNegative())return this.mul(e.neg()).neg();if(this.lt(_c)&&e.lt(_c))return ft(this.toNumber()*e.toNumber(),this.unsigned);var t=this.high>>>16,o=this.high&65535,i=this.low>>>16,s=this.low&65535,a=e.high>>>16,u=e.high&65535,l=e.low>>>16,c=e.low&65535,d=0,p=0,f=0,h=0;return h+=s*c,f+=h>>>16,h&=65535,f+=i*c,p+=f>>>16,f&=65535,f+=s*l,p+=f>>>16,f&=65535,p+=o*c,d+=p>>>16,p&=65535,p+=i*l,d+=p>>>16,p&=65535,p+=s*u,d+=p>>>16,p&=65535,d+=t*c+o*l+i*u+s*a,d&=65535,ye(f<<16|h,d<<16|p,this.unsigned)};F.mul=F.multiply;F.divide=function(e){if(Je(e)||(e=ht(e)),e.isZero())throw Error("division by zero");if(pt){if(!this.unsigned&&this.high===-2147483648&&e.low===-1&&e.high===-1)return this;var n=(this.unsigned?pt.div_u:pt.div_s)(this.low,this.high,e.low,e.high);return ye(n,pt.get_high(),this.unsigned)}if(this.isZero())return this.unsigned?Tn:Tt;var t,o,i;if(this.unsigned){if(e.unsigned||(e=e.toUnsigned()),e.gt(this))return Tn;if(e.gt(this.shru(1)))return vc;i=Tn}else{if(this.eq(tt)){if(e.eq(fr)||e.eq(Ts))return tt;if(e.eq(tt))return fr;var s=this.shr(1);return t=s.div(e).shl(1),t.eq(Tt)?e.isNegative()?fr:Ts:(o=this.sub(e.mul(t)),i=t.add(o.div(e)),i)}else if(e.eq(tt))return this.unsigned?Tn:Tt;if(this.isNegative())return e.isNegative()?this.neg().div(e.neg()):this.neg().div(e).neg();if(e.isNegative())return this.div(e.neg()).neg();i=Tt}for(o=this;o.gte(e);){t=Math.max(1,Math.floor(o.toNumber()/e.toNumber()));for(var a=Math.ceil(Math.log(t)/Math.LN2),u=a<=48?1:To(2,a-48),l=ft(t),c=l.mul(e);c.isNegative()||c.gt(o);)t-=u,l=ft(t,this.unsigned),c=l.mul(e);l.isZero()&&(l=fr),i=i.add(l),o=o.sub(c)}return i};F.div=F.divide;F.modulo=function(e){if(Je(e)||(e=ht(e)),pt){var n=(this.unsigned?pt.rem_u:pt.rem_s)(this.low,this.high,e.low,e.high);return ye(n,pt.get_high(),this.unsigned)}return this.sub(this.div(e).mul(e))};F.mod=F.modulo;F.rem=F.modulo;F.not=function(){return ye(~this.low,~this.high,this.unsigned)};F.countLeadingZeros=function(){return this.high?Math.clz32(this.high):Math.clz32(this.low)+32};F.clz=F.countLeadingZeros;F.countTrailingZeros=function(){return this.low?hc(this.low):hc(this.high)+32};F.ctz=F.countTrailingZeros;F.and=function(e){return Je(e)||(e=ht(e)),ye(this.low&e.low,this.high&e.high,this.unsigned)};F.or=function(e){return Je(e)||(e=ht(e)),ye(this.low|e.low,this.high|e.high,this.unsigned)};F.xor=function(e){return Je(e)||(e=ht(e)),ye(this.low^e.low,this.high^e.high,this.unsigned)};F.shiftLeft=function(e){return Je(e)&&(e=e.toInt()),(e&=63)===0?this:e<32?ye(this.low<<e,this.high<<e|this.low>>>32-e,this.unsigned):ye(0,this.low<<e-32,this.unsigned)};F.shl=F.shiftLeft;F.shiftRight=function(e){return Je(e)&&(e=e.toInt()),(e&=63)===0?this:e<32?ye(this.low>>>e|this.high<<32-e,this.high>>e,this.unsigned):ye(this.high>>e-32,this.high>=0?0:-1,this.unsigned)};F.shr=F.shiftRight;F.shiftRightUnsigned=function(e){return Je(e)&&(e=e.toInt()),(e&=63)===0?this:e<32?ye(this.low>>>e|this.high<<32-e,this.high>>>e,this.unsigned):e===32?ye(this.high,0,this.unsigned):ye(this.high>>>e-32,0,this.unsigned)};F.shru=F.shiftRightUnsigned;F.shr_u=F.shiftRightUnsigned;F.rotateLeft=function(e){var n;return Je(e)&&(e=e.toInt()),(e&=63)===0?this:e===32?ye(this.high,this.low,this.unsigned):e<32?(n=32-e,ye(this.low<<e|this.high>>>n,this.high<<e|this.low>>>n,this.unsigned)):(e-=32,n=32-e,ye(this.high<<e|this.low>>>n,this.low<<e|this.high>>>n,this.unsigned))};F.rotl=F.rotateLeft;F.rotateRight=function(e){var n;return Je(e)&&(e=e.toInt()),(e&=63)===0?this:e===32?ye(this.high,this.low,this.unsigned):e<32?(n=32-e,ye(this.high<<n|this.low>>>e,this.low<<n|this.high>>>e,this.unsigned)):(e-=32,n=32-e,ye(this.low<<n|this.high>>>e,this.high<<n|this.low>>>e,this.unsigned))};F.rotr=F.rotateRight;F.toSigned=function(){return this.unsigned?ye(this.low,this.high,!1):this};F.toUnsigned=function(){return this.unsigned?this:ye(this.low,this.high,!0)};F.toBytes=function(e){return e?this.toBytesLE():this.toBytesBE()};F.toBytesLE=function(){var e=this.high,n=this.low;return[n&255,n>>>8&255,n>>>16&255,n>>>24,e&255,e>>>8&255,e>>>16&255,e>>>24]};F.toBytesBE=function(){var e=this.high,n=this.low;return[e>>>24,e>>>16&255,e>>>8&255,e&255,n>>>24,n>>>16&255,n>>>8&255,n&255]};$e.fromBytes=function(e,n,t){return t?$e.fromBytesLE(e,n):$e.fromBytesBE(e,n)};$e.fromBytesLE=function(e,n){return new $e(e[0]|e[1]<<8|e[2]<<16|e[3]<<24,e[4]|e[5]<<8|e[6]<<16|e[7]<<24,n)};$e.fromBytesBE=function(e,n){return new $e(e[4]<<24|e[5]<<16|e[6]<<8|e[7],e[0]<<24|e[1]<<16|e[2]<<8|e[3],n)};typeof BigInt=="function"&&($e.fromBigInt=function(e,n){var t=Number(BigInt.asIntN(32,e)),o=Number(BigInt.asIntN(32,e>>BigInt(32)));return ye(t,o,n)},$e.fromValue=function(e,n){return typeof e=="bigint"?$e.fromBigInt(e,n):ht(e,n)},F.toBigInt=function(){var e=BigInt(this.low>>>0),n=BigInt(this.unsigned?this.high>>>0:this.high);return n<<BigInt(32)|e});Cn=$e});var $s=X(Io=>{"use strict";Object.defineProperty(Io,"__esModule",{value:!0});Io.ArgType=void 0;var Ic;(function(r){r[r.INPUT=0]="INPUT",r[r.OUTPUT=1]="OUTPUT"})(Ic||(Io.ArgType=Ic={}))});var So=X(Dt=>{"use strict";Object.defineProperty(Dt,"__esModule",{value:!0});Dt.SIZE_PREFIX_LENGTH=Dt.FILE_IDENTIFIER_LENGTH=Dt.SIZEOF_INT=Dt.SIZEOF_SHORT=void 0;Dt.SIZEOF_SHORT=2;Dt.SIZEOF_INT=4;Dt.FILE_IDENTIFIER_LENGTH=4;Dt.SIZE_PREFIX_LENGTH=4});var As=X(mt=>{"use strict";Object.defineProperty(mt,"__esModule",{value:!0});mt.isLittleEndian=mt.float64=mt.float32=mt.int32=void 0;mt.int32=new Int32Array(2);mt.float32=new Float32Array(mt.int32.buffer);mt.float64=new Float64Array(mt.int32.buffer);mt.isLittleEndian=new Uint16Array(new Uint8Array([1,0]).buffer)[0]===1});var Os=X($o=>{"use strict";Object.defineProperty($o,"__esModule",{value:!0});$o.Encoding=void 0;var Sc;(function(r){r[r.UTF8_BYTES=1]="UTF8_BYTES",r[r.UTF16_STRING=2]="UTF16_STRING"})(Sc||($o.Encoding=Sc={}))});var Es=X(Ao=>{"use strict";Object.defineProperty(Ao,"__esModule",{value:!0});Ao.ByteBuffer=void 0;var Ct=So(),rv=Os(),nt=As(),Ps=class r{constructor(e){this.bytes_=e,this.position_=0,this.text_decoder_=new TextDecoder}static allocate(e){return new r(new Uint8Array(e))}clear(){this.position_=0}bytes(){return this.bytes_}position(){return this.position_}setPosition(e){this.position_=e}capacity(){return this.bytes_.length}readInt8(e){return this.readUint8(e)<<24>>24}readUint8(e){return this.bytes_[e]}readInt16(e){return this.readUint16(e)<<16>>16}readUint16(e){return this.bytes_[e]|this.bytes_[e+1]<<8}readInt32(e){return this.bytes_[e]|this.bytes_[e+1]<<8|this.bytes_[e+2]<<16|this.bytes_[e+3]<<24}readUint32(e){return this.readInt32(e)>>>0}readInt64(e){return BigInt.asIntN(64,BigInt(this.readUint32(e))+(BigInt(this.readUint32(e+4))<<BigInt(32)))}readUint64(e){return BigInt.asUintN(64,BigInt(this.readUint32(e))+(BigInt(this.readUint32(e+4))<<BigInt(32)))}readFloat32(e){return nt.int32[0]=this.readInt32(e),nt.float32[0]}readFloat64(e){return nt.int32[nt.isLittleEndian?0:1]=this.readInt32(e),nt.int32[nt.isLittleEndian?1:0]=this.readInt32(e+4),nt.float64[0]}writeInt8(e,n){this.bytes_[e]=n}writeUint8(e,n){this.bytes_[e]=n}writeInt16(e,n){this.bytes_[e]=n,this.bytes_[e+1]=n>>8}writeUint16(e,n){this.bytes_[e]=n,this.bytes_[e+1]=n>>8}writeInt32(e,n){this.bytes_[e]=n,this.bytes_[e+1]=n>>8,this.bytes_[e+2]=n>>16,this.bytes_[e+3]=n>>24}writeUint32(e,n){this.bytes_[e]=n,this.bytes_[e+1]=n>>8,this.bytes_[e+2]=n>>16,this.bytes_[e+3]=n>>24}writeInt64(e,n){this.writeInt32(e,Number(BigInt.asIntN(32,n))),this.writeInt32(e+4,Number(BigInt.asIntN(32,n>>BigInt(32))))}writeUint64(e,n){this.writeUint32(e,Number(BigInt.asUintN(32,n))),this.writeUint32(e+4,Number(BigInt.asUintN(32,n>>BigInt(32))))}writeFloat32(e,n){nt.float32[0]=n,this.writeInt32(e,nt.int32[0])}writeFloat64(e,n){nt.float64[0]=n,this.writeInt32(e,nt.int32[nt.isLittleEndian?0:1]),this.writeInt32(e+4,nt.int32[nt.isLittleEndian?1:0])}getBufferIdentifier(){if(this.bytes_.length<this.position_+Ct.SIZEOF_INT+Ct.FILE_IDENTIFIER_LENGTH)throw new Error("FlatBuffers: ByteBuffer is too short to contain an identifier.");let e="";for(let n=0;n<Ct.FILE_IDENTIFIER_LENGTH;n++)e+=String.fromCharCode(this.readInt8(this.position_+Ct.SIZEOF_INT+n));return e}__offset(e,n){let t=e-this.readInt32(e);return n<this.readInt16(t)?this.readInt16(t+n):0}__union(e,n){return e.bb_pos=n+this.readInt32(n),e.bb=this,e}__string(e,n){e+=this.readInt32(e);let t=this.readInt32(e);e+=Ct.SIZEOF_INT;let o=this.bytes_.subarray(e,e+t);return n===rv.Encoding.UTF8_BYTES?o:this.text_decoder_.decode(o)}__union_with_string(e,n){return typeof e=="string"?this.__string(n):this.__union(e,n)}__indirect(e){return e+this.readInt32(e)}__vector(e){return e+this.readInt32(e)+Ct.SIZEOF_INT}__vector_len(e){return this.readInt32(e+this.readInt32(e))}__has_identifier(e){if(e.length!=Ct.FILE_IDENTIFIER_LENGTH)throw new Error("FlatBuffers: file identifier must be length "+Ct.FILE_IDENTIFIER_LENGTH);for(let n=0;n<Ct.FILE_IDENTIFIER_LENGTH;n++)if(e.charCodeAt(n)!=this.readInt8(this.position()+Ct.SIZEOF_INT+n))return!1;return!0}createScalarList(e,n){let t=[];for(let o=0;o<n;++o){let i=e(o);i!==null&&t.push(i)}return t}createObjList(e,n){let t=[];for(let o=0;o<n;++o){let i=e(o);i!==null&&t.push(i.unpack())}return t}};Ao.ByteBuffer=Ps});var Ac=X(Oo=>{"use strict";Object.defineProperty(Oo,"__esModule",{value:!0});Oo.Builder=void 0;var $c=Es(),ut=So(),Ds=class r{constructor(e){this.minalign=1,this.vtable=null,this.vtable_in_use=0,this.isNested=!1,this.object_start=0,this.vtables=[],this.vector_num_elems=0,this.force_defaults=!1,this.string_maps=null,this.text_encoder=new TextEncoder;let n;e?n=e:n=1024,this.bb=$c.ByteBuffer.allocate(n),this.space=n}clear(){this.bb.clear(),this.space=this.bb.capacity(),this.minalign=1,this.vtable=null,this.vtable_in_use=0,this.isNested=!1,this.object_start=0,this.vtables=[],this.vector_num_elems=0,this.force_defaults=!1,this.string_maps=null}forceDefaults(e){this.force_defaults=e}dataBuffer(){return this.bb}asUint8Array(){return this.bb.bytes().subarray(this.bb.position(),this.bb.position()+this.offset())}prep(e,n){e>this.minalign&&(this.minalign=e);let t=~(this.bb.capacity()-this.space+n)+1&e-1;for(;this.space<t+e+n;){let o=this.bb.capacity();this.bb=r.growByteBuffer(this.bb),this.space+=this.bb.capacity()-o}this.pad(t)}pad(e){for(let n=0;n<e;n++)this.bb.writeInt8(--this.space,0)}writeInt8(e){this.bb.writeInt8(this.space-=1,e)}writeInt16(e){this.bb.writeInt16(this.space-=2,e)}writeInt32(e){this.bb.writeInt32(this.space-=4,e)}writeInt64(e){this.bb.writeInt64(this.space-=8,e)}writeFloat32(e){this.bb.writeFloat32(this.space-=4,e)}writeFloat64(e){this.bb.writeFloat64(this.space-=8,e)}addInt8(e){this.prep(1,0),this.writeInt8(e)}addInt16(e){this.prep(2,0),this.writeInt16(e)}addInt32(e){this.prep(4,0),this.writeInt32(e)}addInt64(e){this.prep(8,0),this.writeInt64(e)}addFloat32(e){this.prep(4,0),this.writeFloat32(e)}addFloat64(e){this.prep(8,0),this.writeFloat64(e)}addFieldInt8(e,n,t){(this.force_defaults||n!=t)&&(this.addInt8(n),this.slot(e))}addFieldInt16(e,n,t){(this.force_defaults||n!=t)&&(this.addInt16(n),this.slot(e))}addFieldInt32(e,n,t){(this.force_defaults||n!=t)&&(this.addInt32(n),this.slot(e))}addFieldInt64(e,n,t){(this.force_defaults||n!==t)&&(this.addInt64(n),this.slot(e))}addFieldFloat32(e,n,t){(this.force_defaults||n!=t)&&(this.addFloat32(n),this.slot(e))}addFieldFloat64(e,n,t){(this.force_defaults||n!=t)&&(this.addFloat64(n),this.slot(e))}addFieldOffset(e,n,t){(this.force_defaults||n!=t)&&(this.addOffset(n),this.slot(e))}addFieldStruct(e,n,t){n!=t&&(this.nested(n),this.slot(e))}nested(e){if(e!=this.offset())throw new TypeError("FlatBuffers: struct must be serialized inline.")}notNested(){if(this.isNested)throw new TypeError("FlatBuffers: object serialization must not be nested.")}slot(e){this.vtable!==null&&(this.vtable[e]=this.offset())}offset(){return this.bb.capacity()-this.space}static growByteBuffer(e){let n=e.capacity();if(n&3221225472)throw new Error("FlatBuffers: cannot grow buffer beyond 2 gigabytes.");let t=n<<1,o=$c.ByteBuffer.allocate(t);return o.setPosition(t-n),o.bytes().set(e.bytes(),t-n),o}addOffset(e){this.prep(ut.SIZEOF_INT,0),this.writeInt32(this.offset()-e+ut.SIZEOF_INT)}startObject(e){this.notNested(),this.vtable==null&&(this.vtable=[]),this.vtable_in_use=e;for(let n=0;n<e;n++)this.vtable[n]=0;this.isNested=!0,this.object_start=this.offset()}endObject(){if(this.vtable==null||!this.isNested)throw new Error("FlatBuffers: endObject called without startObject");this.addInt32(0);let e=this.offset(),n=this.vtable_in_use-1;for(;n>=0&&this.vtable[n]==0;n--);let t=n+1;for(;n>=0;n--)this.addInt16(this.vtable[n]!=0?e-this.vtable[n]:0);let o=2;this.addInt16(e-this.object_start);let i=(t+o)*ut.SIZEOF_SHORT;this.addInt16(i);let s=0,a=this.space;e:for(n=0;n<this.vtables.length;n++){let u=this.bb.capacity()-this.vtables[n];if(i==this.bb.readInt16(u)){for(let l=ut.SIZEOF_SHORT;l<i;l+=ut.SIZEOF_SHORT)if(this.bb.readInt16(a+l)!=this.bb.readInt16(u+l))continue e;s=this.vtables[n];break}}return s?(this.space=this.bb.capacity()-e,this.bb.writeInt32(this.space,s-e)):(this.vtables.push(this.offset()),this.bb.writeInt32(this.bb.capacity()-e,this.offset()-e)),this.isNested=!1,e}finish(e,n,t){let o=t?ut.SIZE_PREFIX_LENGTH:0;if(n){let i=n;if(this.prep(this.minalign,ut.SIZEOF_INT+ut.FILE_IDENTIFIER_LENGTH+o),i.length!=ut.FILE_IDENTIFIER_LENGTH)throw new TypeError("FlatBuffers: file identifier must be length "+ut.FILE_IDENTIFIER_LENGTH);for(let s=ut.FILE_IDENTIFIER_LENGTH-1;s>=0;s--)this.writeInt8(i.charCodeAt(s))}this.prep(this.minalign,ut.SIZEOF_INT+o),this.addOffset(e),o&&this.addInt32(this.bb.capacity()-this.space),this.bb.setPosition(this.space)}finishSizePrefixed(e,n){this.finish(e,n,!0)}requiredField(e,n){let t=this.bb.capacity()-e,o=t-this.bb.readInt32(t);if(!(n<this.bb.readInt16(o)&&this.bb.readInt16(o+n)!=0))throw new TypeError("FlatBuffers: field "+n+" must be set")}startVector(e,n,t){this.notNested(),this.vector_num_elems=n,this.prep(ut.SIZEOF_INT,e*n),this.prep(t,e*n)}endVector(){return this.writeInt32(this.vector_num_elems),this.offset()}createSharedString(e){if(!e)return 0;if(this.string_maps||(this.string_maps=new Map),this.string_maps.has(e))return this.string_maps.get(e);let n=this.createString(e);return this.string_maps.set(e,n),n}createString(e){if(e==null)return 0;let n;return e instanceof Uint8Array?n=e:n=this.text_encoder.encode(e),this.addInt8(0),this.startVector(1,n.length,1),this.bb.setPosition(this.space-=n.length),this.bb.bytes().set(n,this.space),this.endVector()}createByteVector(e){return e==null?0:(this.startVector(1,e.length,1),this.bb.setPosition(this.space-=e.length),this.bb.bytes().set(e,this.space),this.endVector())}createObjectOffset(e){return e===null?0:typeof e=="string"?this.createString(e):e.pack(this)}createObjectOffsetList(e){let n=[];for(let t=0;t<e.length;++t){let o=e[t];if(o!==null)n.push(this.createObjectOffset(o));else throw new TypeError("FlatBuffers: Argument for createObjectOffsetList cannot contain null.")}return n}createStructOffsetList(e,n){return n(this,e.length),this.createObjectOffsetList(e.slice().reverse()),this.endVector()}};Oo.Builder=Ds});var ve=X(ke=>{"use strict";Object.defineProperty(ke,"__esModule",{value:!0});ke.Encoding=ke.ByteBuffer=ke.Builder=ke.isLittleEndian=ke.int32=ke.float64=ke.float32=ke.SIZE_PREFIX_LENGTH=ke.SIZEOF_SHORT=ke.SIZEOF_INT=ke.FILE_IDENTIFIER_LENGTH=void 0;var Po=So();Object.defineProperty(ke,"FILE_IDENTIFIER_LENGTH",{enumerable:!0,get:function(){return Po.FILE_IDENTIFIER_LENGTH}});Object.defineProperty(ke,"SIZEOF_INT",{enumerable:!0,get:function(){return Po.SIZEOF_INT}});Object.defineProperty(ke,"SIZEOF_SHORT",{enumerable:!0,get:function(){return Po.SIZEOF_SHORT}});Object.defineProperty(ke,"SIZE_PREFIX_LENGTH",{enumerable:!0,get:function(){return Po.SIZE_PREFIX_LENGTH}});var Eo=As();Object.defineProperty(ke,"float32",{enumerable:!0,get:function(){return Eo.float32}});Object.defineProperty(ke,"float64",{enumerable:!0,get:function(){return Eo.float64}});Object.defineProperty(ke,"int32",{enumerable:!0,get:function(){return Eo.int32}});Object.defineProperty(ke,"isLittleEndian",{enumerable:!0,get:function(){return Eo.isLittleEndian}});var ov=Ac();Object.defineProperty(ke,"Builder",{enumerable:!0,get:function(){return ov.Builder}});var iv=Es();Object.defineProperty(ke,"ByteBuffer",{enumerable:!0,get:function(){return iv.ByteBuffer}});var sv=Os();Object.defineProperty(ke,"Encoding",{enumerable:!0,get:function(){return sv.Encoding}})});var ks=X(kt=>{"use strict";var av=kt&&kt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),uv=kt&&kt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),lv=kt&&kt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&av(n,e,t[o]);return uv(n,e),n}})();Object.defineProperty(kt,"__esModule",{value:!0});kt.ArgTypeAndIndex=void 0;var cv=lv(ve()),Oc=$s(),Cs=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsArgTypeAndIndex(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsArgTypeAndIndex(e,n){return e.setPosition(e.position()+cv.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}argType(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readInt8(this.bb_pos+e):Oc.ArgType.INPUT}index(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.readUint32(this.bb_pos+e):0}static startArgTypeAndIndex(e){e.startObject(2)}static addArgType(e,n){e.addFieldInt8(0,n,Oc.ArgType.INPUT)}static addIndex(e,n){e.addFieldInt32(1,n,0)}static endArgTypeAndIndex(e){return e.endObject()}static createArgTypeAndIndex(e,n,t){return r.startArgTypeAndIndex(e),r.addArgType(e,n),r.addIndex(e,t),r.endArgTypeAndIndex(e)}};kt.ArgTypeAndIndex=Cs});var Ls=X(Do=>{"use strict";Object.defineProperty(Do,"__esModule",{value:!0});Do.AttributeType=void 0;var Pc;(function(r){r[r.UNDEFINED=0]="UNDEFINED",r[r.FLOAT=1]="FLOAT",r[r.INT=2]="INT",r[r.STRING=3]="STRING",r[r.TENSOR=4]="TENSOR",r[r.GRAPH=5]="GRAPH",r[r.FLOATS=6]="FLOATS",r[r.INTS=7]="INTS",r[r.STRINGS=8]="STRINGS",r[r.TENSORS=9]="TENSORS",r[r.GRAPHS=10]="GRAPHS",r[r.SPARSE_TENSOR=11]="SPARSE_TENSOR",r[r.SPARSE_TENSORS=12]="SPARSE_TENSORS"})(Pc||(Do.AttributeType=Pc={}))});var Ns=X(Co=>{"use strict";Object.defineProperty(Co,"__esModule",{value:!0});Co.NodeType=void 0;var Ec;(function(r){r[r.Primitive=0]="Primitive",r[r.Fused=1]="Fused"})(Ec||(Co.NodeType=Ec={}))});var zs=X(Lt=>{"use strict";var dv=Lt&&Lt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),pv=Lt&&Lt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),fv=Lt&&Lt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&dv(n,e,t[o]);return pv(n,e),n}})();Object.defineProperty(Lt,"__esModule",{value:!0});Lt.Node=void 0;var hv=fv(ve()),mv=Bs(),Dc=Ns(),Rs=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsNode(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsNode(e,n){return e.setPosition(e.position()+hv.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}name(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb_pos+n,e):null}docString(e){let n=this.bb.__offset(this.bb_pos,6);return n?this.bb.__string(this.bb_pos+n,e):null}domain(e){let n=this.bb.__offset(this.bb_pos,8);return n?this.bb.__string(this.bb_pos+n,e):null}sinceVersion(){let e=this.bb.__offset(this.bb_pos,10);return e?this.bb.readInt32(this.bb_pos+e):0}index(){let e=this.bb.__offset(this.bb_pos,12);return e?this.bb.readUint32(this.bb_pos+e):0}opType(e){let n=this.bb.__offset(this.bb_pos,14);return n?this.bb.__string(this.bb_pos+n,e):null}type(){let e=this.bb.__offset(this.bb_pos,16);return e?this.bb.readInt32(this.bb_pos+e):Dc.NodeType.Primitive}executionProviderType(e){let n=this.bb.__offset(this.bb_pos,18);return n?this.bb.__string(this.bb_pos+n,e):null}inputs(e,n){let t=this.bb.__offset(this.bb_pos,20);return t?this.bb.__string(this.bb.__vector(this.bb_pos+t)+e*4,n):null}inputsLength(){let e=this.bb.__offset(this.bb_pos,20);return e?this.bb.__vector_len(this.bb_pos+e):0}outputs(e,n){let t=this.bb.__offset(this.bb_pos,22);return t?this.bb.__string(this.bb.__vector(this.bb_pos+t)+e*4,n):null}outputsLength(){let e=this.bb.__offset(this.bb_pos,22);return e?this.bb.__vector_len(this.bb_pos+e):0}attributes(e,n){let t=this.bb.__offset(this.bb_pos,24);return t?(n||new mv.Attribute).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}attributesLength(){let e=this.bb.__offset(this.bb_pos,24);return e?this.bb.__vector_len(this.bb_pos+e):0}inputArgCounts(e){let n=this.bb.__offset(this.bb_pos,26);return n?this.bb.readInt32(this.bb.__vector(this.bb_pos+n)+e*4):0}inputArgCountsLength(){let e=this.bb.__offset(this.bb_pos,26);return e?this.bb.__vector_len(this.bb_pos+e):0}inputArgCountsArray(){let e=this.bb.__offset(this.bb_pos,26);return e?new Int32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+e),this.bb.__vector_len(this.bb_pos+e)):null}implicitInputs(e,n){let t=this.bb.__offset(this.bb_pos,28);return t?this.bb.__string(this.bb.__vector(this.bb_pos+t)+e*4,n):null}implicitInputsLength(){let e=this.bb.__offset(this.bb_pos,28);return e?this.bb.__vector_len(this.bb_pos+e):0}static startNode(e){e.startObject(13)}static addName(e,n){e.addFieldOffset(0,n,0)}static addDocString(e,n){e.addFieldOffset(1,n,0)}static addDomain(e,n){e.addFieldOffset(2,n,0)}static addSinceVersion(e,n){e.addFieldInt32(3,n,0)}static addIndex(e,n){e.addFieldInt32(4,n,0)}static addOpType(e,n){e.addFieldOffset(5,n,0)}static addType(e,n){e.addFieldInt32(6,n,Dc.NodeType.Primitive)}static addExecutionProviderType(e,n){e.addFieldOffset(7,n,0)}static addInputs(e,n){e.addFieldOffset(8,n,0)}static createInputsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startInputsVector(e,n){e.startVector(4,n,4)}static addOutputs(e,n){e.addFieldOffset(9,n,0)}static createOutputsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startOutputsVector(e,n){e.startVector(4,n,4)}static addAttributes(e,n){e.addFieldOffset(10,n,0)}static createAttributesVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startAttributesVector(e,n){e.startVector(4,n,4)}static addInputArgCounts(e,n){e.addFieldOffset(11,n,0)}static createInputArgCountsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addInt32(n[t]);return e.endVector()}static startInputArgCountsVector(e,n){e.startVector(4,n,4)}static addImplicitInputs(e,n){e.addFieldOffset(12,n,0)}static createImplicitInputsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startImplicitInputsVector(e,n){e.startVector(4,n,4)}static endNode(e){return e.endObject()}static createNode(e,n,t,o,i,s,a,u,l,c,d,p,f,h){return r.startNode(e),r.addName(e,n),r.addDocString(e,t),r.addDomain(e,o),r.addSinceVersion(e,i),r.addIndex(e,s),r.addOpType(e,a),r.addType(e,u),r.addExecutionProviderType(e,l),r.addInputs(e,c),r.addOutputs(e,d),r.addAttributes(e,p),r.addInputArgCounts(e,f),r.addImplicitInputs(e,h),r.endNode(e)}};Lt.Node=Rs});var Vs=X(ko=>{"use strict";Object.defineProperty(ko,"__esModule",{value:!0});ko.EdgeEnd=void 0;var Ms=class{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}nodeIndex(){return this.bb.readUint32(this.bb_pos)}srcArgIndex(){return this.bb.readInt32(this.bb_pos+4)}dstArgIndex(){return this.bb.readInt32(this.bb_pos+8)}static sizeOf(){return 12}static createEdgeEnd(e,n,t,o){return e.prep(4,12),e.writeInt32(o),e.writeInt32(t),e.writeInt32(n),e.offset()}};ko.EdgeEnd=Ms});var Gs=X(Nt=>{"use strict";var gv=Nt&&Nt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),bv=Nt&&Nt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),yv=Nt&&Nt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&gv(n,e,t[o]);return bv(n,e),n}})();Object.defineProperty(Nt,"__esModule",{value:!0});Nt.NodeEdge=void 0;var _v=yv(ve()),Cc=Vs(),Fs=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsNodeEdge(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsNodeEdge(e,n){return e.setPosition(e.position()+_v.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}nodeIndex(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readUint32(this.bb_pos+e):0}inputEdges(e,n){let t=this.bb.__offset(this.bb_pos,6);return t?(n||new Cc.EdgeEnd).__init(this.bb.__vector(this.bb_pos+t)+e*12,this.bb):null}inputEdgesLength(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.__vector_len(this.bb_pos+e):0}outputEdges(e,n){let t=this.bb.__offset(this.bb_pos,8);return t?(n||new Cc.EdgeEnd).__init(this.bb.__vector(this.bb_pos+t)+e*12,this.bb):null}outputEdgesLength(){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.__vector_len(this.bb_pos+e):0}static startNodeEdge(e){e.startObject(3)}static addNodeIndex(e,n){e.addFieldInt32(0,n,0)}static addInputEdges(e,n){e.addFieldOffset(1,n,0)}static startInputEdgesVector(e,n){e.startVector(12,n,4)}static addOutputEdges(e,n){e.addFieldOffset(2,n,0)}static startOutputEdgesVector(e,n){e.startVector(12,n,4)}static endNodeEdge(e){return e.endObject()}static createNodeEdge(e,n,t,o){return r.startNodeEdge(e),r.addNodeIndex(e,n),r.addInputEdges(e,t),r.addOutputEdges(e,o),r.endNodeEdge(e)}};Nt.NodeEdge=Fs});var Ws=X(Rt=>{"use strict";var wv=Rt&&Rt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),vv=Rt&&Rt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),xv=Rt&&Rt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&wv(n,e,t[o]);return vv(n,e),n}})();Object.defineProperty(Rt,"__esModule",{value:!0});Rt.NodesToOptimizeIndices=void 0;var Tv=xv(ve()),Us=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsNodesToOptimizeIndices(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsNodesToOptimizeIndices(e,n){return e.setPosition(e.position()+Tv.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}nodeIndices(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.readUint32(this.bb.__vector(this.bb_pos+n)+e*4):0}nodeIndicesLength(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__vector_len(this.bb_pos+e):0}nodeIndicesArray(){let e=this.bb.__offset(this.bb_pos,4);return e?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+e),this.bb.__vector_len(this.bb_pos+e)):null}numInputs(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.readUint32(this.bb_pos+e):0}numOutputs(){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.readUint32(this.bb_pos+e):0}hasVariadicInput(){let e=this.bb.__offset(this.bb_pos,10);return e?!!this.bb.readInt8(this.bb_pos+e):!1}hasVariadicOutput(){let e=this.bb.__offset(this.bb_pos,12);return e?!!this.bb.readInt8(this.bb_pos+e):!1}numVariadicInputs(){let e=this.bb.__offset(this.bb_pos,14);return e?this.bb.readUint32(this.bb_pos+e):0}numVariadicOutputs(){let e=this.bb.__offset(this.bb_pos,16);return e?this.bb.readUint32(this.bb_pos+e):0}static startNodesToOptimizeIndices(e){e.startObject(7)}static addNodeIndices(e,n){e.addFieldOffset(0,n,0)}static createNodeIndicesVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addInt32(n[t]);return e.endVector()}static startNodeIndicesVector(e,n){e.startVector(4,n,4)}static addNumInputs(e,n){e.addFieldInt32(1,n,0)}static addNumOutputs(e,n){e.addFieldInt32(2,n,0)}static addHasVariadicInput(e,n){e.addFieldInt8(3,+n,0)}static addHasVariadicOutput(e,n){e.addFieldInt8(4,+n,0)}static addNumVariadicInputs(e,n){e.addFieldInt32(5,n,0)}static addNumVariadicOutputs(e,n){e.addFieldInt32(6,n,0)}static endNodesToOptimizeIndices(e){return e.endObject()}static createNodesToOptimizeIndices(e,n,t,o,i,s,a,u){return r.startNodesToOptimizeIndices(e),r.addNodeIndices(e,n),r.addNumInputs(e,t),r.addNumOutputs(e,o),r.addHasVariadicInput(e,i),r.addHasVariadicOutput(e,s),r.addNumVariadicInputs(e,a),r.addNumVariadicOutputs(e,u),r.endNodesToOptimizeIndices(e)}};Rt.NodesToOptimizeIndices=Us});var qs=X(zt=>{"use strict";var Iv=zt&&zt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),Sv=zt&&zt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),$v=zt&&zt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&Iv(n,e,t[o]);return Sv(n,e),n}})();Object.defineProperty(zt,"__esModule",{value:!0});zt.RuntimeOptimizationRecord=void 0;var Av=$v(ve()),Ov=Ws(),Hs=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsRuntimeOptimizationRecord(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsRuntimeOptimizationRecord(e,n){return e.setPosition(e.position()+Av.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}actionId(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb_pos+n,e):null}nodesToOptimizeIndices(e){let n=this.bb.__offset(this.bb_pos,6);return n?(e||new Ov.NodesToOptimizeIndices).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}producedOpIds(e,n){let t=this.bb.__offset(this.bb_pos,10);return t?this.bb.__string(this.bb.__vector(this.bb_pos+t)+e*4,n):null}producedOpIdsLength(){let e=this.bb.__offset(this.bb_pos,10);return e?this.bb.__vector_len(this.bb_pos+e):0}static startRuntimeOptimizationRecord(e){e.startObject(4)}static addActionId(e,n){e.addFieldOffset(0,n,0)}static addNodesToOptimizeIndices(e,n){e.addFieldOffset(1,n,0)}static addProducedOpIds(e,n){e.addFieldOffset(3,n,0)}static createProducedOpIdsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startProducedOpIdsVector(e,n){e.startVector(4,n,4)}static endRuntimeOptimizationRecord(e){return e.endObject()}};zt.RuntimeOptimizationRecord=Hs});var Ks=X(Bt=>{"use strict";var Pv=Bt&&Bt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),Ev=Bt&&Bt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),Dv=Bt&&Bt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&Pv(n,e,t[o]);return Ev(n,e),n}})();Object.defineProperty(Bt,"__esModule",{value:!0});Bt.RuntimeOptimizationRecordContainerEntry=void 0;var Cv=Dv(ve()),kv=qs(),js=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsRuntimeOptimizationRecordContainerEntry(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsRuntimeOptimizationRecordContainerEntry(e,n){return e.setPosition(e.position()+Cv.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}optimizerName(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb_pos+n,e):null}runtimeOptimizationRecords(e,n){let t=this.bb.__offset(this.bb_pos,6);return t?(n||new kv.RuntimeOptimizationRecord).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}runtimeOptimizationRecordsLength(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.__vector_len(this.bb_pos+e):0}static startRuntimeOptimizationRecordContainerEntry(e){e.startObject(2)}static addOptimizerName(e,n){e.addFieldOffset(0,n,0)}static addRuntimeOptimizationRecords(e,n){e.addFieldOffset(1,n,0)}static createRuntimeOptimizationRecordsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startRuntimeOptimizationRecordsVector(e,n){e.startVector(4,n,4)}static endRuntimeOptimizationRecordContainerEntry(e){let n=e.endObject();return e.requiredField(n,4),n}static createRuntimeOptimizationRecordContainerEntry(e,n,t){return r.startRuntimeOptimizationRecordContainerEntry(e),r.addOptimizerName(e,n),r.addRuntimeOptimizationRecords(e,t),r.endRuntimeOptimizationRecordContainerEntry(e)}};Bt.RuntimeOptimizationRecordContainerEntry=js});var Zs=X(Mt=>{"use strict";var Lv=Mt&&Mt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),Nv=Mt&&Mt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),Rv=Mt&&Mt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&Lv(n,e,t[o]);return Nv(n,e),n}})();Object.defineProperty(Mt,"__esModule",{value:!0});Mt.RuntimeOptimizations=void 0;var zv=Rv(ve()),Bv=Ks(),Xs=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsRuntimeOptimizations(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsRuntimeOptimizations(e,n){return e.setPosition(e.position()+zv.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}records(e,n){let t=this.bb.__offset(this.bb_pos,4);return t?(n||new Bv.RuntimeOptimizationRecordContainerEntry).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}recordsLength(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__vector_len(this.bb_pos+e):0}static startRuntimeOptimizations(e){e.startObject(1)}static addRecords(e,n){e.addFieldOffset(0,n,0)}static createRecordsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startRecordsVector(e,n){e.startVector(4,n,4)}static endRuntimeOptimizations(e){return e.endObject()}static createRuntimeOptimizations(e,n){return r.startRuntimeOptimizations(e),r.addRecords(e,n),r.endRuntimeOptimizations(e)}};Mt.RuntimeOptimizations=Xs});var Rr=X(Lo=>{"use strict";Object.defineProperty(Lo,"__esModule",{value:!0});Lo.TensorDataType=void 0;var kc;(function(r){r[r.UNDEFINED=0]="UNDEFINED",r[r.FLOAT=1]="FLOAT",r[r.UINT8=2]="UINT8",r[r.INT8=3]="INT8",r[r.UINT16=4]="UINT16",r[r.INT16=5]="INT16",r[r.INT32=6]="INT32",r[r.INT64=7]="INT64",r[r.STRING=8]="STRING",r[r.BOOL=9]="BOOL",r[r.FLOAT16=10]="FLOAT16",r[r.DOUBLE=11]="DOUBLE",r[r.UINT32=12]="UINT32",r[r.UINT64=13]="UINT64",r[r.COMPLEX64=14]="COMPLEX64",r[r.COMPLEX128=15]="COMPLEX128",r[r.BFLOAT16=16]="BFLOAT16",r[r.FLOAT8E4M3FN=17]="FLOAT8E4M3FN",r[r.FLOAT8E4M3FNUZ=18]="FLOAT8E4M3FNUZ",r[r.FLOAT8E5M2=19]="FLOAT8E5M2",r[r.FLOAT8E5M2FNUZ=20]="FLOAT8E5M2FNUZ"})(kc||(Lo.TensorDataType=kc={}))});var zr=X(Vt=>{"use strict";var Mv=Vt&&Vt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),Vv=Vt&&Vt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),Fv=Vt&&Vt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&Mv(n,e,t[o]);return Vv(n,e),n}})();Object.defineProperty(Vt,"__esModule",{value:!0});Vt.Tensor=void 0;var Gv=Fv(ve()),Lc=Rr(),Js=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsTensor(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsTensor(e,n){return e.setPosition(e.position()+Gv.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}name(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb_pos+n,e):null}docString(e){let n=this.bb.__offset(this.bb_pos,6);return n?this.bb.__string(this.bb_pos+n,e):null}dims(e){let n=this.bb.__offset(this.bb_pos,8);return n?this.bb.readInt64(this.bb.__vector(this.bb_pos+n)+e*8):BigInt(0)}dimsLength(){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.__vector_len(this.bb_pos+e):0}dataType(){let e=this.bb.__offset(this.bb_pos,10);return e?this.bb.readInt32(this.bb_pos+e):Lc.TensorDataType.UNDEFINED}rawData(e){let n=this.bb.__offset(this.bb_pos,12);return n?this.bb.readUint8(this.bb.__vector(this.bb_pos+n)+e):0}rawDataLength(){let e=this.bb.__offset(this.bb_pos,12);return e?this.bb.__vector_len(this.bb_pos+e):0}rawDataArray(){let e=this.bb.__offset(this.bb_pos,12);return e?new Uint8Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+e),this.bb.__vector_len(this.bb_pos+e)):null}stringData(e,n){let t=this.bb.__offset(this.bb_pos,14);return t?this.bb.__string(this.bb.__vector(this.bb_pos+t)+e*4,n):null}stringDataLength(){let e=this.bb.__offset(this.bb_pos,14);return e?this.bb.__vector_len(this.bb_pos+e):0}externalDataOffset(){let e=this.bb.__offset(this.bb_pos,16);return e?this.bb.readInt64(this.bb_pos+e):BigInt("-1")}static startTensor(e){e.startObject(7)}static addName(e,n){e.addFieldOffset(0,n,0)}static addDocString(e,n){e.addFieldOffset(1,n,0)}static addDims(e,n){e.addFieldOffset(2,n,0)}static createDimsVector(e,n){e.startVector(8,n.length,8);for(let t=n.length-1;t>=0;t--)e.addInt64(n[t]);return e.endVector()}static startDimsVector(e,n){e.startVector(8,n,8)}static addDataType(e,n){e.addFieldInt32(3,n,Lc.TensorDataType.UNDEFINED)}static addRawData(e,n){e.addFieldOffset(4,n,0)}static createRawDataVector(e,n){e.startVector(1,n.length,1);for(let t=n.length-1;t>=0;t--)e.addInt8(n[t]);return e.endVector()}static startRawDataVector(e,n){e.startVector(1,n,1)}static addStringData(e,n){e.addFieldOffset(5,n,0)}static createStringDataVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startStringDataVector(e,n){e.startVector(4,n,4)}static addExternalDataOffset(e,n){e.addFieldInt64(6,n,BigInt("-1"))}static endTensor(e){return e.endObject()}static createTensor(e,n,t,o,i,s,a,u){return r.startTensor(e),r.addName(e,n),r.addDocString(e,t),r.addDims(e,o),r.addDataType(e,i),r.addRawData(e,s),r.addStringData(e,a),r.addExternalDataOffset(e,u),r.endTensor(e)}};Vt.Tensor=Js});var Ys=X(Ft=>{"use strict";var Uv=Ft&&Ft.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),Wv=Ft&&Ft.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),Hv=Ft&&Ft.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&Uv(n,e,t[o]);return Wv(n,e),n}})();Object.defineProperty(Ft,"__esModule",{value:!0});Ft.SparseTensor=void 0;var qv=Hv(ve()),Nc=zr(),Qs=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsSparseTensor(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsSparseTensor(e,n){return e.setPosition(e.position()+qv.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}values(e){let n=this.bb.__offset(this.bb_pos,4);return n?(e||new Nc.Tensor).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}indices(e){let n=this.bb.__offset(this.bb_pos,6);return n?(e||new Nc.Tensor).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}dims(e){let n=this.bb.__offset(this.bb_pos,8);return n?this.bb.readInt64(this.bb.__vector(this.bb_pos+n)+e*8):BigInt(0)}dimsLength(){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.__vector_len(this.bb_pos+e):0}static startSparseTensor(e){e.startObject(3)}static addValues(e,n){e.addFieldOffset(0,n,0)}static addIndices(e,n){e.addFieldOffset(1,n,0)}static addDims(e,n){e.addFieldOffset(2,n,0)}static createDimsVector(e,n){e.startVector(8,n.length,8);for(let t=n.length-1;t>=0;t--)e.addInt64(n[t]);return e.endVector()}static startDimsVector(e,n){e.startVector(8,n,8)}static endSparseTensor(e){return e.endObject()}};Ft.SparseTensor=Qs});var ta=X(Gt=>{"use strict";var jv=Gt&&Gt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),Kv=Gt&&Gt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),Xv=Gt&&Gt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&jv(n,e,t[o]);return Kv(n,e),n}})();Object.defineProperty(Gt,"__esModule",{value:!0});Gt.MapType=void 0;var Zv=Xv(ve()),Rc=Rr(),Jv=Br(),ea=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsMapType(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsMapType(e,n){return e.setPosition(e.position()+Zv.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}keyType(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readInt32(this.bb_pos+e):Rc.TensorDataType.UNDEFINED}valueType(e){let n=this.bb.__offset(this.bb_pos,6);return n?(e||new Jv.TypeInfo).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}static startMapType(e){e.startObject(2)}static addKeyType(e,n){e.addFieldInt32(0,n,Rc.TensorDataType.UNDEFINED)}static addValueType(e,n){e.addFieldOffset(1,n,0)}static endMapType(e){return e.endObject()}};Gt.MapType=ea});var ra=X(Ut=>{"use strict";var Qv=Ut&&Ut.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),Yv=Ut&&Ut.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),ex=Ut&&Ut.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&Qv(n,e,t[o]);return Yv(n,e),n}})();Object.defineProperty(Ut,"__esModule",{value:!0});Ut.SequenceType=void 0;var tx=ex(ve()),nx=Br(),na=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsSequenceType(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsSequenceType(e,n){return e.setPosition(e.position()+tx.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}elemType(e){let n=this.bb.__offset(this.bb_pos,4);return n?(e||new nx.TypeInfo).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}static startSequenceType(e){e.startObject(1)}static addElemType(e,n){e.addFieldOffset(0,n,0)}static endSequenceType(e){return e.endObject()}static createSequenceType(e,n){return r.startSequenceType(e),r.addElemType(e,n),r.endSequenceType(e)}};Ut.SequenceType=na});var oa=X(No=>{"use strict";Object.defineProperty(No,"__esModule",{value:!0});No.DimensionValueType=void 0;var zc;(function(r){r[r.UNKNOWN=0]="UNKNOWN",r[r.VALUE=1]="VALUE",r[r.PARAM=2]="PARAM"})(zc||(No.DimensionValueType=zc={}))});var sa=X(Wt=>{"use strict";var rx=Wt&&Wt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),ox=Wt&&Wt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),ix=Wt&&Wt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&rx(n,e,t[o]);return ox(n,e),n}})();Object.defineProperty(Wt,"__esModule",{value:!0});Wt.DimensionValue=void 0;var sx=ix(ve()),Bc=oa(),ia=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsDimensionValue(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsDimensionValue(e,n){return e.setPosition(e.position()+sx.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}dimType(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readInt8(this.bb_pos+e):Bc.DimensionValueType.UNKNOWN}dimValue(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.readInt64(this.bb_pos+e):BigInt("0")}dimParam(e){let n=this.bb.__offset(this.bb_pos,8);return n?this.bb.__string(this.bb_pos+n,e):null}static startDimensionValue(e){e.startObject(3)}static addDimType(e,n){e.addFieldInt8(0,n,Bc.DimensionValueType.UNKNOWN)}static addDimValue(e,n){e.addFieldInt64(1,n,BigInt("0"))}static addDimParam(e,n){e.addFieldOffset(2,n,0)}static endDimensionValue(e){return e.endObject()}static createDimensionValue(e,n,t,o){return r.startDimensionValue(e),r.addDimType(e,n),r.addDimValue(e,t),r.addDimParam(e,o),r.endDimensionValue(e)}};Wt.DimensionValue=ia});var ua=X(Ht=>{"use strict";var ax=Ht&&Ht.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),ux=Ht&&Ht.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),lx=Ht&&Ht.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&ax(n,e,t[o]);return ux(n,e),n}})();Object.defineProperty(Ht,"__esModule",{value:!0});Ht.Dimension=void 0;var cx=lx(ve()),dx=sa(),aa=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsDimension(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsDimension(e,n){return e.setPosition(e.position()+cx.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}value(e){let n=this.bb.__offset(this.bb_pos,4);return n?(e||new dx.DimensionValue).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}denotation(e){let n=this.bb.__offset(this.bb_pos,6);return n?this.bb.__string(this.bb_pos+n,e):null}static startDimension(e){e.startObject(2)}static addValue(e,n){e.addFieldOffset(0,n,0)}static addDenotation(e,n){e.addFieldOffset(1,n,0)}static endDimension(e){return e.endObject()}static createDimension(e,n,t){return r.startDimension(e),r.addValue(e,n),r.addDenotation(e,t),r.endDimension(e)}};Ht.Dimension=aa});var ca=X(qt=>{"use strict";var px=qt&&qt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),fx=qt&&qt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),hx=qt&&qt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&px(n,e,t[o]);return fx(n,e),n}})();Object.defineProperty(qt,"__esModule",{value:!0});qt.Shape=void 0;var mx=hx(ve()),gx=ua(),la=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsShape(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsShape(e,n){return e.setPosition(e.position()+mx.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}dim(e,n){let t=this.bb.__offset(this.bb_pos,4);return t?(n||new gx.Dimension).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}dimLength(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__vector_len(this.bb_pos+e):0}static startShape(e){e.startObject(1)}static addDim(e,n){e.addFieldOffset(0,n,0)}static createDimVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startDimVector(e,n){e.startVector(4,n,4)}static endShape(e){return e.endObject()}static createShape(e,n){return r.startShape(e),r.addDim(e,n),r.endShape(e)}};qt.Shape=la});var pa=X(jt=>{"use strict";var bx=jt&&jt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),yx=jt&&jt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),_x=jt&&jt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&bx(n,e,t[o]);return yx(n,e),n}})();Object.defineProperty(jt,"__esModule",{value:!0});jt.TensorTypeAndShape=void 0;var wx=_x(ve()),vx=ca(),Mc=Rr(),da=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsTensorTypeAndShape(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsTensorTypeAndShape(e,n){return e.setPosition(e.position()+wx.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}elemType(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readInt32(this.bb_pos+e):Mc.TensorDataType.UNDEFINED}shape(e){let n=this.bb.__offset(this.bb_pos,6);return n?(e||new vx.Shape).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}static startTensorTypeAndShape(e){e.startObject(2)}static addElemType(e,n){e.addFieldInt32(0,n,Mc.TensorDataType.UNDEFINED)}static addShape(e,n){e.addFieldOffset(1,n,0)}static endTensorTypeAndShape(e){return e.endObject()}};jt.TensorTypeAndShape=da});var fa=X(mr=>{"use strict";Object.defineProperty(mr,"__esModule",{value:!0});mr.TypeInfoValue=void 0;mr.unionToTypeInfoValue=xx;mr.unionListToTypeInfoValue=Tx;var Vc=ta(),Fc=ra(),Gc=pa(),Ro;(function(r){r[r.NONE=0]="NONE",r[r.tensor_type=1]="tensor_type",r[r.sequence_type=2]="sequence_type",r[r.map_type=3]="map_type"})(Ro||(mr.TypeInfoValue=Ro={}));function xx(r,e){switch(Ro[r]){case"NONE":return null;case"tensor_type":return e(new Gc.TensorTypeAndShape);case"sequence_type":return e(new Fc.SequenceType);case"map_type":return e(new Vc.MapType);default:return null}}function Tx(r,e,n){switch(Ro[r]){case"NONE":return null;case"tensor_type":return e(n,new Gc.TensorTypeAndShape);case"sequence_type":return e(n,new Fc.SequenceType);case"map_type":return e(n,new Vc.MapType);default:return null}}});var Br=X(Kt=>{"use strict";var Ix=Kt&&Kt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),Sx=Kt&&Kt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),$x=Kt&&Kt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&Ix(n,e,t[o]);return Sx(n,e),n}})();Object.defineProperty(Kt,"__esModule",{value:!0});Kt.TypeInfo=void 0;var Ax=$x(ve()),Uc=fa(),ha=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsTypeInfo(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsTypeInfo(e,n){return e.setPosition(e.position()+Ax.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}denotation(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb_pos+n,e):null}valueType(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.readUint8(this.bb_pos+e):Uc.TypeInfoValue.NONE}value(e){let n=this.bb.__offset(this.bb_pos,8);return n?this.bb.__union(e,this.bb_pos+n):null}static startTypeInfo(e){e.startObject(3)}static addDenotation(e,n){e.addFieldOffset(0,n,0)}static addValueType(e,n){e.addFieldInt8(1,n,Uc.TypeInfoValue.NONE)}static addValue(e,n){e.addFieldOffset(2,n,0)}static endTypeInfo(e){return e.endObject()}static createTypeInfo(e,n,t,o){return r.startTypeInfo(e),r.addDenotation(e,n),r.addValueType(e,t),r.addValue(e,o),r.endTypeInfo(e)}};Kt.TypeInfo=ha});var ga=X(Xt=>{"use strict";var Ox=Xt&&Xt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),Px=Xt&&Xt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),Ex=Xt&&Xt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&Ox(n,e,t[o]);return Px(n,e),n}})();Object.defineProperty(Xt,"__esModule",{value:!0});Xt.ValueInfo=void 0;var Dx=Ex(ve()),Cx=Br(),ma=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsValueInfo(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsValueInfo(e,n){return e.setPosition(e.position()+Dx.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}name(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb_pos+n,e):null}docString(e){let n=this.bb.__offset(this.bb_pos,6);return n?this.bb.__string(this.bb_pos+n,e):null}type(e){let n=this.bb.__offset(this.bb_pos,8);return n?(e||new Cx.TypeInfo).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}static startValueInfo(e){e.startObject(3)}static addName(e,n){e.addFieldOffset(0,n,0)}static addDocString(e,n){e.addFieldOffset(1,n,0)}static addType(e,n){e.addFieldOffset(2,n,0)}static endValueInfo(e){return e.endObject()}};Xt.ValueInfo=ma});var zo=X(Zt=>{"use strict";var kx=Zt&&Zt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),Lx=Zt&&Zt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),Nx=Zt&&Zt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&kx(n,e,t[o]);return Lx(n,e),n}})();Object.defineProperty(Zt,"__esModule",{value:!0});Zt.Graph=void 0;var Rx=Nx(ve()),zx=zs(),Bx=Gs(),Mx=Zs(),Vx=Ys(),Fx=zr(),Gx=ga(),ba=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsGraph(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsGraph(e,n){return e.setPosition(e.position()+Rx.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}initializers(e,n){let t=this.bb.__offset(this.bb_pos,4);return t?(n||new Fx.Tensor).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}initializersLength(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__vector_len(this.bb_pos+e):0}nodeArgs(e,n){let t=this.bb.__offset(this.bb_pos,6);return t?(n||new Gx.ValueInfo).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}nodeArgsLength(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.__vector_len(this.bb_pos+e):0}nodes(e,n){let t=this.bb.__offset(this.bb_pos,8);return t?(n||new zx.Node).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}nodesLength(){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.__vector_len(this.bb_pos+e):0}maxNodeIndex(){let e=this.bb.__offset(this.bb_pos,10);return e?this.bb.readUint32(this.bb_pos+e):0}nodeEdges(e,n){let t=this.bb.__offset(this.bb_pos,12);return t?(n||new Bx.NodeEdge).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}nodeEdgesLength(){let e=this.bb.__offset(this.bb_pos,12);return e?this.bb.__vector_len(this.bb_pos+e):0}inputs(e,n){let t=this.bb.__offset(this.bb_pos,14);return t?this.bb.__string(this.bb.__vector(this.bb_pos+t)+e*4,n):null}inputsLength(){let e=this.bb.__offset(this.bb_pos,14);return e?this.bb.__vector_len(this.bb_pos+e):0}outputs(e,n){let t=this.bb.__offset(this.bb_pos,16);return t?this.bb.__string(this.bb.__vector(this.bb_pos+t)+e*4,n):null}outputsLength(){let e=this.bb.__offset(this.bb_pos,16);return e?this.bb.__vector_len(this.bb_pos+e):0}sparseInitializers(e,n){let t=this.bb.__offset(this.bb_pos,18);return t?(n||new Vx.SparseTensor).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}sparseInitializersLength(){let e=this.bb.__offset(this.bb_pos,18);return e?this.bb.__vector_len(this.bb_pos+e):0}runtimeOptimizations(e){let n=this.bb.__offset(this.bb_pos,20);return n?(e||new Mx.RuntimeOptimizations).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}static startGraph(e){e.startObject(9)}static addInitializers(e,n){e.addFieldOffset(0,n,0)}static createInitializersVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startInitializersVector(e,n){e.startVector(4,n,4)}static addNodeArgs(e,n){e.addFieldOffset(1,n,0)}static createNodeArgsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startNodeArgsVector(e,n){e.startVector(4,n,4)}static addNodes(e,n){e.addFieldOffset(2,n,0)}static createNodesVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startNodesVector(e,n){e.startVector(4,n,4)}static addMaxNodeIndex(e,n){e.addFieldInt32(3,n,0)}static addNodeEdges(e,n){e.addFieldOffset(4,n,0)}static createNodeEdgesVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startNodeEdgesVector(e,n){e.startVector(4,n,4)}static addInputs(e,n){e.addFieldOffset(5,n,0)}static createInputsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startInputsVector(e,n){e.startVector(4,n,4)}static addOutputs(e,n){e.addFieldOffset(6,n,0)}static createOutputsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startOutputsVector(e,n){e.startVector(4,n,4)}static addSparseInitializers(e,n){e.addFieldOffset(7,n,0)}static createSparseInitializersVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startSparseInitializersVector(e,n){e.startVector(4,n,4)}static addRuntimeOptimizations(e,n){e.addFieldOffset(8,n,0)}static endGraph(e){return e.endObject()}};Zt.Graph=ba});var Bs=X(Jt=>{"use strict";var Ux=Jt&&Jt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),Wx=Jt&&Jt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),Hx=Jt&&Jt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&Ux(n,e,t[o]);return Wx(n,e),n}})();Object.defineProperty(Jt,"__esModule",{value:!0});Jt.Attribute=void 0;var qx=Hx(ve()),Wc=Ls(),Hc=zo(),qc=zr(),ya=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsAttribute(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsAttribute(e,n){return e.setPosition(e.position()+qx.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}name(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb_pos+n,e):null}docString(e){let n=this.bb.__offset(this.bb_pos,6);return n?this.bb.__string(this.bb_pos+n,e):null}type(){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.readInt32(this.bb_pos+e):Wc.AttributeType.UNDEFINED}f(){let e=this.bb.__offset(this.bb_pos,10);return e?this.bb.readFloat32(this.bb_pos+e):0}i(){let e=this.bb.__offset(this.bb_pos,12);return e?this.bb.readInt64(this.bb_pos+e):BigInt("0")}s(e){let n=this.bb.__offset(this.bb_pos,14);return n?this.bb.__string(this.bb_pos+n,e):null}t(e){let n=this.bb.__offset(this.bb_pos,16);return n?(e||new qc.Tensor).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}g(e){let n=this.bb.__offset(this.bb_pos,18);return n?(e||new Hc.Graph).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}floats(e){let n=this.bb.__offset(this.bb_pos,20);return n?this.bb.readFloat32(this.bb.__vector(this.bb_pos+n)+e*4):0}floatsLength(){let e=this.bb.__offset(this.bb_pos,20);return e?this.bb.__vector_len(this.bb_pos+e):0}floatsArray(){let e=this.bb.__offset(this.bb_pos,20);return e?new Float32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+e),this.bb.__vector_len(this.bb_pos+e)):null}ints(e){let n=this.bb.__offset(this.bb_pos,22);return n?this.bb.readInt64(this.bb.__vector(this.bb_pos+n)+e*8):BigInt(0)}intsLength(){let e=this.bb.__offset(this.bb_pos,22);return e?this.bb.__vector_len(this.bb_pos+e):0}strings(e,n){let t=this.bb.__offset(this.bb_pos,24);return t?this.bb.__string(this.bb.__vector(this.bb_pos+t)+e*4,n):null}stringsLength(){let e=this.bb.__offset(this.bb_pos,24);return e?this.bb.__vector_len(this.bb_pos+e):0}tensors(e,n){let t=this.bb.__offset(this.bb_pos,26);return t?(n||new qc.Tensor).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}tensorsLength(){let e=this.bb.__offset(this.bb_pos,26);return e?this.bb.__vector_len(this.bb_pos+e):0}graphs(e,n){let t=this.bb.__offset(this.bb_pos,28);return t?(n||new Hc.Graph).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}graphsLength(){let e=this.bb.__offset(this.bb_pos,28);return e?this.bb.__vector_len(this.bb_pos+e):0}static startAttribute(e){e.startObject(13)}static addName(e,n){e.addFieldOffset(0,n,0)}static addDocString(e,n){e.addFieldOffset(1,n,0)}static addType(e,n){e.addFieldInt32(2,n,Wc.AttributeType.UNDEFINED)}static addF(e,n){e.addFieldFloat32(3,n,0)}static addI(e,n){e.addFieldInt64(4,n,BigInt("0"))}static addS(e,n){e.addFieldOffset(5,n,0)}static addT(e,n){e.addFieldOffset(6,n,0)}static addG(e,n){e.addFieldOffset(7,n,0)}static addFloats(e,n){e.addFieldOffset(8,n,0)}static createFloatsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addFloat32(n[t]);return e.endVector()}static startFloatsVector(e,n){e.startVector(4,n,4)}static addInts(e,n){e.addFieldOffset(9,n,0)}static createIntsVector(e,n){e.startVector(8,n.length,8);for(let t=n.length-1;t>=0;t--)e.addInt64(n[t]);return e.endVector()}static startIntsVector(e,n){e.startVector(8,n,8)}static addStrings(e,n){e.addFieldOffset(10,n,0)}static createStringsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startStringsVector(e,n){e.startVector(4,n,4)}static addTensors(e,n){e.addFieldOffset(11,n,0)}static createTensorsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startTensorsVector(e,n){e.startVector(4,n,4)}static addGraphs(e,n){e.addFieldOffset(12,n,0)}static createGraphsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startGraphsVector(e,n){e.startVector(4,n,4)}static endAttribute(e){return e.endObject()}};Jt.Attribute=ya});var wa=X(Qt=>{"use strict";var jx=Qt&&Qt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),Kx=Qt&&Qt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),Xx=Qt&&Qt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&jx(n,e,t[o]);return Kx(n,e),n}})();Object.defineProperty(Qt,"__esModule",{value:!0});Qt.DeprecatedKernelCreateInfos=void 0;var Zx=Xx(ve()),_a=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsDeprecatedKernelCreateInfos(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsDeprecatedKernelCreateInfos(e,n){return e.setPosition(e.position()+Zx.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}nodeIndices(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.readUint32(this.bb.__vector(this.bb_pos+n)+e*4):0}nodeIndicesLength(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__vector_len(this.bb_pos+e):0}nodeIndicesArray(){let e=this.bb.__offset(this.bb_pos,4);return e?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+e),this.bb.__vector_len(this.bb_pos+e)):null}kernelDefHashes(e){let n=this.bb.__offset(this.bb_pos,6);return n?this.bb.readUint64(this.bb.__vector(this.bb_pos+n)+e*8):BigInt(0)}kernelDefHashesLength(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.__vector_len(this.bb_pos+e):0}static startDeprecatedKernelCreateInfos(e){e.startObject(2)}static addNodeIndices(e,n){e.addFieldOffset(0,n,0)}static createNodeIndicesVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addInt32(n[t]);return e.endVector()}static startNodeIndicesVector(e,n){e.startVector(4,n,4)}static addKernelDefHashes(e,n){e.addFieldOffset(1,n,0)}static createKernelDefHashesVector(e,n){e.startVector(8,n.length,8);for(let t=n.length-1;t>=0;t--)e.addInt64(n[t]);return e.endVector()}static startKernelDefHashesVector(e,n){e.startVector(8,n,8)}static endDeprecatedKernelCreateInfos(e){return e.endObject()}static createDeprecatedKernelCreateInfos(e,n,t){return r.startDeprecatedKernelCreateInfos(e),r.addNodeIndices(e,n),r.addKernelDefHashes(e,t),r.endDeprecatedKernelCreateInfos(e)}};Qt.DeprecatedKernelCreateInfos=_a});var jc=X(Yt=>{"use strict";var Jx=Yt&&Yt.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),Qx=Yt&&Yt.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),Yx=Yt&&Yt.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&Jx(n,e,t[o]);return Qx(n,e),n}})();Object.defineProperty(Yt,"__esModule",{value:!0});Yt.DeprecatedNodeIndexAndKernelDefHash=void 0;var eT=Yx(ve()),va=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsDeprecatedNodeIndexAndKernelDefHash(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsDeprecatedNodeIndexAndKernelDefHash(e,n){return e.setPosition(e.position()+eT.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}nodeIndex(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readUint32(this.bb_pos+e):0}kernelDefHash(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.readUint64(this.bb_pos+e):BigInt("0")}static startDeprecatedNodeIndexAndKernelDefHash(e){e.startObject(2)}static addNodeIndex(e,n){e.addFieldInt32(0,n,0)}static addKernelDefHash(e,n){e.addFieldInt64(1,n,BigInt("0"))}static endDeprecatedNodeIndexAndKernelDefHash(e){return e.endObject()}static createDeprecatedNodeIndexAndKernelDefHash(e,n,t){return r.startDeprecatedNodeIndexAndKernelDefHash(e),r.addNodeIndex(e,n),r.addKernelDefHash(e,t),r.endDeprecatedNodeIndexAndKernelDefHash(e)}};Yt.DeprecatedNodeIndexAndKernelDefHash=va});var Ta=X(en=>{"use strict";var tT=en&&en.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),nT=en&&en.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),rT=en&&en.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&tT(n,e,t[o]);return nT(n,e),n}})();Object.defineProperty(en,"__esModule",{value:!0});en.DeprecatedSubGraphSessionState=void 0;var oT=rT(ve()),iT=Ia(),xa=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsDeprecatedSubGraphSessionState(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsDeprecatedSubGraphSessionState(e,n){return e.setPosition(e.position()+oT.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}graphId(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb_pos+n,e):null}sessionState(e){let n=this.bb.__offset(this.bb_pos,6);return n?(e||new iT.DeprecatedSessionState).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}static startDeprecatedSubGraphSessionState(e){e.startObject(2)}static addGraphId(e,n){e.addFieldOffset(0,n,0)}static addSessionState(e,n){e.addFieldOffset(1,n,0)}static endDeprecatedSubGraphSessionState(e){let n=e.endObject();return e.requiredField(n,4),n}};en.DeprecatedSubGraphSessionState=xa});var Ia=X(tn=>{"use strict";var sT=tn&&tn.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),aT=tn&&tn.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),uT=tn&&tn.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&sT(n,e,t[o]);return aT(n,e),n}})();Object.defineProperty(tn,"__esModule",{value:!0});tn.DeprecatedSessionState=void 0;var lT=uT(ve()),cT=wa(),dT=Ta(),Sa=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsDeprecatedSessionState(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsDeprecatedSessionState(e,n){return e.setPosition(e.position()+lT.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}kernels(e){let n=this.bb.__offset(this.bb_pos,4);return n?(e||new cT.DeprecatedKernelCreateInfos).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}subGraphSessionStates(e,n){let t=this.bb.__offset(this.bb_pos,6);return t?(n||new dT.DeprecatedSubGraphSessionState).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}subGraphSessionStatesLength(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.__vector_len(this.bb_pos+e):0}static startDeprecatedSessionState(e){e.startObject(2)}static addKernels(e,n){e.addFieldOffset(0,n,0)}static addSubGraphSessionStates(e,n){e.addFieldOffset(1,n,0)}static createSubGraphSessionStatesVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startSubGraphSessionStatesVector(e,n){e.startVector(4,n,4)}static endDeprecatedSessionState(e){return e.endObject()}static createDeprecatedSessionState(e,n,t){return r.startDeprecatedSessionState(e),r.addKernels(e,n),r.addSubGraphSessionStates(e,t),r.endDeprecatedSessionState(e)}};tn.DeprecatedSessionState=Sa});var Aa=X(nn=>{"use strict";var pT=nn&&nn.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),fT=nn&&nn.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),hT=nn&&nn.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&pT(n,e,t[o]);return fT(n,e),n}})();Object.defineProperty(nn,"__esModule",{value:!0});nn.KernelTypeStrArgsEntry=void 0;var mT=hT(ve()),gT=ks(),$a=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsKernelTypeStrArgsEntry(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsKernelTypeStrArgsEntry(e,n){return e.setPosition(e.position()+mT.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}kernelTypeStr(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb_pos+n,e):null}args(e,n){let t=this.bb.__offset(this.bb_pos,6);return t?(n||new gT.ArgTypeAndIndex).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}argsLength(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.__vector_len(this.bb_pos+e):0}static startKernelTypeStrArgsEntry(e){e.startObject(2)}static addKernelTypeStr(e,n){e.addFieldOffset(0,n,0)}static addArgs(e,n){e.addFieldOffset(1,n,0)}static createArgsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startArgsVector(e,n){e.startVector(4,n,4)}static endKernelTypeStrArgsEntry(e){let n=e.endObject();return e.requiredField(n,4),n}static createKernelTypeStrArgsEntry(e,n,t){return r.startKernelTypeStrArgsEntry(e),r.addKernelTypeStr(e,n),r.addArgs(e,t),r.endKernelTypeStrArgsEntry(e)}};nn.KernelTypeStrArgsEntry=$a});var Pa=X(rn=>{"use strict";var bT=rn&&rn.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),yT=rn&&rn.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),_T=rn&&rn.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&bT(n,e,t[o]);return yT(n,e),n}})();Object.defineProperty(rn,"__esModule",{value:!0});rn.OpIdKernelTypeStrArgsEntry=void 0;var wT=_T(ve()),vT=Aa(),Oa=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsOpIdKernelTypeStrArgsEntry(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsOpIdKernelTypeStrArgsEntry(e,n){return e.setPosition(e.position()+wT.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}opId(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb_pos+n,e):null}kernelTypeStrArgs(e,n){let t=this.bb.__offset(this.bb_pos,6);return t?(n||new vT.KernelTypeStrArgsEntry).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}kernelTypeStrArgsLength(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.__vector_len(this.bb_pos+e):0}static startOpIdKernelTypeStrArgsEntry(e){e.startObject(2)}static addOpId(e,n){e.addFieldOffset(0,n,0)}static addKernelTypeStrArgs(e,n){e.addFieldOffset(1,n,0)}static createKernelTypeStrArgsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startKernelTypeStrArgsVector(e,n){e.startVector(4,n,4)}static endOpIdKernelTypeStrArgsEntry(e){let n=e.endObject();return e.requiredField(n,4),n}static createOpIdKernelTypeStrArgsEntry(e,n,t){return r.startOpIdKernelTypeStrArgsEntry(e),r.addOpId(e,n),r.addKernelTypeStrArgs(e,t),r.endOpIdKernelTypeStrArgsEntry(e)}};rn.OpIdKernelTypeStrArgsEntry=Oa});var Da=X(on=>{"use strict";var xT=on&&on.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),TT=on&&on.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),IT=on&&on.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&xT(n,e,t[o]);return TT(n,e),n}})();Object.defineProperty(on,"__esModule",{value:!0});on.KernelTypeStrResolver=void 0;var ST=IT(ve()),$T=Pa(),Ea=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsKernelTypeStrResolver(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsKernelTypeStrResolver(e,n){return e.setPosition(e.position()+ST.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}opKernelTypeStrArgs(e,n){let t=this.bb.__offset(this.bb_pos,4);return t?(n||new $T.OpIdKernelTypeStrArgsEntry).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}opKernelTypeStrArgsLength(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__vector_len(this.bb_pos+e):0}static startKernelTypeStrResolver(e){e.startObject(1)}static addOpKernelTypeStrArgs(e,n){e.addFieldOffset(0,n,0)}static createOpKernelTypeStrArgsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startOpKernelTypeStrArgsVector(e,n){e.startVector(4,n,4)}static endKernelTypeStrResolver(e){return e.endObject()}static createKernelTypeStrResolver(e,n){return r.startKernelTypeStrResolver(e),r.addOpKernelTypeStrArgs(e,n),r.endKernelTypeStrResolver(e)}};on.KernelTypeStrResolver=Ea});var ka=X(sn=>{"use strict";var AT=sn&&sn.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),OT=sn&&sn.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),PT=sn&&sn.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&AT(n,e,t[o]);return OT(n,e),n}})();Object.defineProperty(sn,"__esModule",{value:!0});sn.OperatorSetId=void 0;var ET=PT(ve()),Ca=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsOperatorSetId(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsOperatorSetId(e,n){return e.setPosition(e.position()+ET.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}domain(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb_pos+n,e):null}version(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.readInt64(this.bb_pos+e):BigInt("0")}static startOperatorSetId(e){e.startObject(2)}static addDomain(e,n){e.addFieldOffset(0,n,0)}static addVersion(e,n){e.addFieldInt64(1,n,BigInt("0"))}static endOperatorSetId(e){return e.endObject()}static createOperatorSetId(e,n,t){return r.startOperatorSetId(e),r.addDomain(e,n),r.addVersion(e,t),r.endOperatorSetId(e)}};sn.OperatorSetId=Ca});var Na=X(an=>{"use strict";var DT=an&&an.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),CT=an&&an.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),kT=an&&an.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&DT(n,e,t[o]);return CT(n,e),n}})();Object.defineProperty(an,"__esModule",{value:!0});an.StringStringEntry=void 0;var LT=kT(ve()),La=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsStringStringEntry(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsStringStringEntry(e,n){return e.setPosition(e.position()+LT.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}key(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb_pos+n,e):null}value(e){let n=this.bb.__offset(this.bb_pos,6);return n?this.bb.__string(this.bb_pos+n,e):null}static startStringStringEntry(e){e.startObject(2)}static addKey(e,n){e.addFieldOffset(0,n,0)}static addValue(e,n){e.addFieldOffset(1,n,0)}static endStringStringEntry(e){return e.endObject()}static createStringStringEntry(e,n,t){return r.startStringStringEntry(e),r.addKey(e,n),r.addValue(e,t),r.endStringStringEntry(e)}};an.StringStringEntry=La});var za=X(un=>{"use strict";var NT=un&&un.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),RT=un&&un.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),zT=un&&un.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&NT(n,e,t[o]);return RT(n,e),n}})();Object.defineProperty(un,"__esModule",{value:!0});un.Model=void 0;var BT=zT(ve()),MT=zo(),VT=ka(),FT=Na(),Ra=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsModel(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsModel(e,n){return e.setPosition(e.position()+BT.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}irVersion(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readInt64(this.bb_pos+e):BigInt("0")}opsetImport(e,n){let t=this.bb.__offset(this.bb_pos,6);return t?(n||new VT.OperatorSetId).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}opsetImportLength(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.__vector_len(this.bb_pos+e):0}producerName(e){let n=this.bb.__offset(this.bb_pos,8);return n?this.bb.__string(this.bb_pos+n,e):null}producerVersion(e){let n=this.bb.__offset(this.bb_pos,10);return n?this.bb.__string(this.bb_pos+n,e):null}domain(e){let n=this.bb.__offset(this.bb_pos,12);return n?this.bb.__string(this.bb_pos+n,e):null}modelVersion(){let e=this.bb.__offset(this.bb_pos,14);return e?this.bb.readInt64(this.bb_pos+e):BigInt("0")}docString(e){let n=this.bb.__offset(this.bb_pos,16);return n?this.bb.__string(this.bb_pos+n,e):null}graph(e){let n=this.bb.__offset(this.bb_pos,18);return n?(e||new MT.Graph).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}graphDocString(e){let n=this.bb.__offset(this.bb_pos,20);return n?this.bb.__string(this.bb_pos+n,e):null}metadataProps(e,n){let t=this.bb.__offset(this.bb_pos,22);return t?(n||new FT.StringStringEntry).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+t)+e*4),this.bb):null}metadataPropsLength(){let e=this.bb.__offset(this.bb_pos,22);return e?this.bb.__vector_len(this.bb_pos+e):0}static startModel(e){e.startObject(10)}static addIrVersion(e,n){e.addFieldInt64(0,n,BigInt("0"))}static addOpsetImport(e,n){e.addFieldOffset(1,n,0)}static createOpsetImportVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startOpsetImportVector(e,n){e.startVector(4,n,4)}static addProducerName(e,n){e.addFieldOffset(2,n,0)}static addProducerVersion(e,n){e.addFieldOffset(3,n,0)}static addDomain(e,n){e.addFieldOffset(4,n,0)}static addModelVersion(e,n){e.addFieldInt64(5,n,BigInt("0"))}static addDocString(e,n){e.addFieldOffset(6,n,0)}static addGraph(e,n){e.addFieldOffset(7,n,0)}static addGraphDocString(e,n){e.addFieldOffset(8,n,0)}static addMetadataProps(e,n){e.addFieldOffset(9,n,0)}static createMetadataPropsVector(e,n){e.startVector(4,n.length,4);for(let t=n.length-1;t>=0;t--)e.addOffset(n[t]);return e.endVector()}static startMetadataPropsVector(e,n){e.startVector(4,n,4)}static endModel(e){return e.endObject()}};un.Model=Ra});var Kc=X(ln=>{"use strict";var GT=ln&&ln.__createBinding||(Object.create?function(r,e,n,t){t===void 0&&(t=n);var o=Object.getOwnPropertyDescriptor(e,n);(!o||("get"in o?!e.__esModule:o.writable||o.configurable))&&(o={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(r,t,o)}:function(r,e,n,t){t===void 0&&(t=n),r[t]=e[n]}),UT=ln&&ln.__setModuleDefault||(Object.create?function(r,e){Object.defineProperty(r,"default",{enumerable:!0,value:e})}:function(r,e){r.default=e}),WT=ln&&ln.__importStar||(function(){var r=function(e){return r=Object.getOwnPropertyNames||function(n){var t=[];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[t.length]=o);return t},r(e)};return function(e){if(e&&e.__esModule)return e;var n={};if(e!=null)for(var t=r(e),o=0;o<t.length;o++)t[o]!=="default"&&GT(n,e,t[o]);return UT(n,e),n}})();Object.defineProperty(ln,"__esModule",{value:!0});ln.InferenceSession=void 0;var HT=WT(ve()),qT=Da(),jT=za(),Ba=class r{constructor(){this.bb=null,this.bb_pos=0}__init(e,n){return this.bb_pos=e,this.bb=n,this}static getRootAsInferenceSession(e,n){return(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static getSizePrefixedRootAsInferenceSession(e,n){return e.setPosition(e.position()+HT.SIZE_PREFIX_LENGTH),(n||new r).__init(e.readInt32(e.position())+e.position(),e)}static bufferHasIdentifier(e){return e.__has_identifier("ORTM")}ortVersion(e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb_pos+n,e):null}model(e){let n=this.bb.__offset(this.bb_pos,6);return n?(e||new jT.Model).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}kernelTypeStrResolver(e){let n=this.bb.__offset(this.bb_pos,10);return n?(e||new qT.KernelTypeStrResolver).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}static startInferenceSession(e){e.startObject(4)}static addOrtVersion(e,n){e.addFieldOffset(0,n,0)}static addModel(e,n){e.addFieldOffset(1,n,0)}static addKernelTypeStrResolver(e,n){e.addFieldOffset(3,n,0)}static endInferenceSession(e){return e.endObject()}static finishInferenceSessionBuffer(e,n){e.finish(n,"ORTM")}static finishSizePrefixedInferenceSessionBuffer(e,n){e.finish(n,"ORTM",!0)}};ln.InferenceSession=Ba});var KT,XT,Bo,gt,ZT,JT,QT,YT,e0,t0,n0,r0,Ma,Va,o0,i0,s0,a0,Fa,u0,l0,c0,d0,p0,f0,h0,m0,g0,b0,y0,_0,w0,Mr,Ga,v0,Ua,x0,Xc=A(()=>{"use strict";KT=ue($s()),XT=ue(ks()),Bo=ue(Bs()),gt=ue(Ls()),ZT=ue(wa()),JT=ue(jc()),QT=ue(Ia()),YT=ue(Ta()),e0=ue(ua()),t0=ue(sa()),n0=ue(oa()),r0=ue(Vs()),Ma=ue(zo()),Va=ue(Kc()),o0=ue(Aa()),i0=ue(Da()),s0=ue(ta()),a0=ue(za()),Fa=ue(zs()),u0=ue(Gs()),l0=ue(Ns()),c0=ue(Ws()),d0=ue(Pa()),p0=ue(ka()),f0=ue(qs()),h0=ue(Ks()),m0=ue(Zs()),g0=ue(ra()),b0=ue(ca()),y0=ue(Ys()),_0=ue(Na()),w0=ue(zr()),Mr=ue(Rr()),Ga=ue(pa()),v0=ue(Br()),Ua=ue(fa()),x0=ue(ga())});var Vr=A(()=>{"use strict";Xc()});var Jc=X((i3,Zc)=>{"use strict";Zc.exports=T0;function T0(r,e){for(var n=new Array(arguments.length-1),t=0,o=2,i=!0;o<arguments.length;)n[t++]=arguments[o++];return new Promise(function(a,u){n[t]=function(c){if(i)if(i=!1,c)u(c);else{for(var d=new Array(arguments.length-1),p=0;p<d.length;)d[p++]=arguments[p];a.apply(null,d)}};try{r.apply(e||null,n)}catch(l){i&&(i=!1,u(l))}})}});var td=X(ed=>{"use strict";var Vo=ed;Vo.length=function(e){var n=e.length;if(!n)return 0;for(var t=0;--n%4>1&&e.charAt(n)==="=";)++t;return Math.ceil(e.length*3)/4-t};var gr=new Array(64),Yc=new Array(123);for(It=0;It<64;)Yc[gr[It]=It<26?It+65:It<52?It+71:It<62?It-4:It-59|43]=It++;var It;Vo.encode=function(e,n,t){for(var o=null,i=[],s=0,a=0,u;n<t;){var l=e[n++];switch(a){case 0:i[s++]=gr[l>>2],u=(l&3)<<4,a=1;break;case 1:i[s++]=gr[u|l>>4],u=(l&15)<<2,a=2;break;case 2:i[s++]=gr[u|l>>6],i[s++]=gr[l&63],a=0;break}s>8191&&((o||(o=[])).push(String.fromCharCode.apply(String,i)),s=0)}return a&&(i[s++]=gr[u],i[s++]=61,a===1&&(i[s++]=61)),o?(s&&o.push(String.fromCharCode.apply(String,i.slice(0,s))),o.join("")):String.fromCharCode.apply(String,i.slice(0,s))};var Qc="invalid encoding";Vo.decode=function(e,n,t){for(var o=t,i=0,s,a=0;a<e.length;){var u=e.charCodeAt(a++);if(u===61&&i>1)break;if((u=Yc[u])===void 0)throw Error(Qc);switch(i){case 0:s=u,i=1;break;case 1:n[t++]=s<<2|(u&48)>>4,s=u,i=2;break;case 2:n[t++]=(s&15)<<4|(u&60)>>2,s=u,i=3;break;case 3:n[t++]=(s&3)<<6|u,i=0;break}}if(i===1)throw Error(Qc);return t-o};Vo.test=function(e){return/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(e)}});var rd=X((a3,nd)=>{"use strict";nd.exports=Fo;function Fo(){this._listeners=Object.create(null)}Fo.prototype.on=function(e,n,t){return(this._listeners[e]||(this._listeners[e]=[])).push({fn:n,ctx:t||this}),this};Fo.prototype.off=function(e,n){if(e===void 0)this._listeners=Object.create(null);else if(n===void 0)this._listeners[e]=[];else{var t=this._listeners[e];if(!t)return this;for(var o=0;o<t.length;)t[o].fn===n?t.splice(o,1):++o}return this};Fo.prototype.emit=function(e){var n=this._listeners[e];if(n){for(var t=[],o=1;o<arguments.length;)t.push(arguments[o++]);for(o=0;o<n.length;)n[o].fn.apply(n[o++].ctx,t)}return this}});var cd=X((u3,ld)=>{"use strict";ld.exports=od(od);function od(r){return typeof Float32Array<"u"?(function(){var e=new Float32Array([-0]),n=new Uint8Array(e.buffer),t=n[3]===128;function o(u,l,c){e[0]=u,l[c]=n[0],l[c+1]=n[1],l[c+2]=n[2],l[c+3]=n[3]}function i(u,l,c){e[0]=u,l[c]=n[3],l[c+1]=n[2],l[c+2]=n[1],l[c+3]=n[0]}r.writeFloatLE=t?o:i,r.writeFloatBE=t?i:o;function s(u,l){return n[0]=u[l],n[1]=u[l+1],n[2]=u[l+2],n[3]=u[l+3],e[0]}function a(u,l){return n[3]=u[l],n[2]=u[l+1],n[1]=u[l+2],n[0]=u[l+3],e[0]}r.readFloatLE=t?s:a,r.readFloatBE=t?a:s})():(function(){function e(t,o,i,s){var a=o<0?1:0;if(a&&(o=-o),o===0)t(1/o>0?0:2147483648,i,s);else if(isNaN(o))t(2143289344,i,s);else if(o>34028234663852886e22)t((a<<31|2139095040)>>>0,i,s);else if(o<11754943508222875e-54)t((a<<31|Math.round(o/1401298464324817e-60))>>>0,i,s);else{var u=Math.floor(Math.log(o)/Math.LN2),l=Math.round(o*Math.pow(2,-u)*8388608)&8388607;t((a<<31|u+127<<23|l)>>>0,i,s)}}r.writeFloatLE=e.bind(null,id),r.writeFloatBE=e.bind(null,sd);function n(t,o,i){var s=t(o,i),a=(s>>31)*2+1,u=s>>>23&255,l=s&8388607;return u===255?l?NaN:a*(1/0):u===0?a*1401298464324817e-60*l:a*Math.pow(2,u-150)*(l+8388608)}r.readFloatLE=n.bind(null,ad),r.readFloatBE=n.bind(null,ud)})(),typeof Float64Array<"u"?(function(){var e=new Float64Array([-0]),n=new Uint8Array(e.buffer),t=n[7]===128;function o(u,l,c){e[0]=u,l[c]=n[0],l[c+1]=n[1],l[c+2]=n[2],l[c+3]=n[3],l[c+4]=n[4],l[c+5]=n[5],l[c+6]=n[6],l[c+7]=n[7]}function i(u,l,c){e[0]=u,l[c]=n[7],l[c+1]=n[6],l[c+2]=n[5],l[c+3]=n[4],l[c+4]=n[3],l[c+5]=n[2],l[c+6]=n[1],l[c+7]=n[0]}r.writeDoubleLE=t?o:i,r.writeDoubleBE=t?i:o;function s(u,l){return n[0]=u[l],n[1]=u[l+1],n[2]=u[l+2],n[3]=u[l+3],n[4]=u[l+4],n[5]=u[l+5],n[6]=u[l+6],n[7]=u[l+7],e[0]}function a(u,l){return n[7]=u[l],n[6]=u[l+1],n[5]=u[l+2],n[4]=u[l+3],n[3]=u[l+4],n[2]=u[l+5],n[1]=u[l+6],n[0]=u[l+7],e[0]}r.readDoubleLE=t?s:a,r.readDoubleBE=t?a:s})():(function(){function e(t,o,i,s,a,u){var l=s<0?1:0;if(l&&(s=-s),s===0)t(0,a,u+o),t(1/s>0?0:2147483648,a,u+i);else if(isNaN(s))t(0,a,u+o),t(2146959360,a,u+i);else if(s>17976931348623157e292)t(0,a,u+o),t((l<<31|2146435072)>>>0,a,u+i);else{var c;if(s<22250738585072014e-324)c=s/5e-324,t(c>>>0,a,u+o),t((l<<31|c/4294967296)>>>0,a,u+i);else{var d=Math.floor(Math.log(s)/Math.LN2);d===1024&&(d=1023),c=s*Math.pow(2,-d),t(c*4503599627370496>>>0,a,u+o),t((l<<31|d+1023<<20|c*1048576&1048575)>>>0,a,u+i)}}}r.writeDoubleLE=e.bind(null,id,0,4),r.writeDoubleBE=e.bind(null,sd,4,0);function n(t,o,i,s,a){var u=t(s,a+o),l=t(s,a+i),c=(l>>31)*2+1,d=l>>>20&2047,p=4294967296*(l&1048575)+u;return d===2047?p?NaN:c*(1/0):d===0?c*5e-324*p:c*Math.pow(2,d-1075)*(p+4503599627370496)}r.readDoubleLE=n.bind(null,ad,0,4),r.readDoubleBE=n.bind(null,ud,4,0)})(),r}function id(r,e,n){e[n]=r&255,e[n+1]=r>>>8&255,e[n+2]=r>>>16&255,e[n+3]=r>>>24}function sd(r,e,n){e[n]=r>>>24,e[n+1]=r>>>16&255,e[n+2]=r>>>8&255,e[n+3]=r&255}function ad(r,e){return(r[e]|r[e+1]<<8|r[e+2]<<16|r[e+3]<<24)>>>0}function ud(r,e){return(r[e]<<24|r[e+1]<<16|r[e+2]<<8|r[e+3])>>>0}});var pd=X((l3,dd)=>{"use strict";dd.exports=I0;function I0(r){try{if(typeof dr!="function")return null;var e=dr(r);return e&&(e.length||Object.keys(e).length)?e:null}catch{return null}}});var hd=X(fd=>{"use strict";var Ha=fd,Wa="\uFFFD";Ha.length=function(e){for(var n=0,t=0,o=0;o<e.length;++o)t=e.charCodeAt(o),t<128?n+=1:t<2048?n+=2:(t&64512)===55296&&(e.charCodeAt(o+1)&64512)===56320?(++o,n+=4):n+=3;return n};Ha.read=function(e,n,t){if(t-n<1)return"";for(var o="",i=n;i<t;){var s=e[i++];if(s<=127)o+=String.fromCharCode(s);else if(s>=192&&s<224){var a=(s&31)<<6|e[i++]&63;o+=a>=128?String.fromCharCode(a):Wa}else if(s>=224&&s<240){var u=(s&15)<<12|(e[i++]&63)<<6|e[i++]&63;o+=u>=2048?String.fromCharCode(u):Wa}else if(s>=240){var l=(s&7)<<18|(e[i++]&63)<<12|(e[i++]&63)<<6|e[i++]&63;l<65536||l>1114111?o+=Wa:(l-=65536,o+=String.fromCharCode(55296+(l>>10)),o+=String.fromCharCode(56320+(l&1023)))}}return o};Ha.write=function(e,n,t){for(var o=t,i,s,a=0;a<e.length;++a)i=e.charCodeAt(a),i<128?n[t++]=i:i<2048?(n[t++]=i>>6|192,n[t++]=i&63|128):(i&64512)===55296&&((s=e.charCodeAt(a+1))&64512)===56320?(i=65536+((i&1023)<<10)+(s&1023),++a,n[t++]=i>>18|240,n[t++]=i>>12&63|128,n[t++]=i>>6&63|128,n[t++]=i&63|128):(n[t++]=i>>12|224,n[t++]=i>>6&63|128,n[t++]=i&63|128);return t-o}});var gd=X((p3,md)=>{"use strict";md.exports=S0;function S0(r,e,n){var t=n||8192,o=t>>>1,i=null,s=t;return function(u){if(u<1||u>o)return r(u);s+u>t&&(i=r(t),s=0);var l=e.call(i,s,s+=u);return s&7&&(s=(s|7)+1),l}}});var yd=X((f3,bd)=>{"use strict";bd.exports=He;var Fr=Ln();function He(r,e){this.lo=r>>>0,this.hi=e>>>0}var jn=He.zero=new He(0,0);jn.toNumber=function(){return 0};jn.zzEncode=jn.zzDecode=function(){return this};jn.length=function(){return 1};var $0=He.zeroHash="\0\0\0\0\0\0\0\0";He.fromNumber=function(e){if(e===0)return jn;var n=e<0;n&&(e=-e);var t=e>>>0,o=(e-t)/4294967296>>>0;return n&&(o=~o>>>0,t=~t>>>0,++t>4294967295&&(t=0,++o>4294967295&&(o=0))),new He(t,o)};He.from=function(e){if(typeof e=="number")return He.fromNumber(e);if(Fr.isString(e))if(Fr.Long)e=Fr.Long.fromString(e);else return He.fromNumber(parseInt(e,10));return e.low||e.high?new He(e.low>>>0,e.high>>>0):jn};He.prototype.toNumber=function(e){if(!e&&this.hi>>>31){var n=~this.lo+1>>>0,t=~this.hi>>>0;return n||(t=t+1>>>0),-(n+t*4294967296)}return this.lo+this.hi*4294967296};He.prototype.toLong=function(e){return Fr.Long?new Fr.Long(this.lo|0,this.hi|0,!!e):{low:this.lo|0,high:this.hi|0,unsigned:!!e}};var kn=String.prototype.charCodeAt;He.fromHash=function(e){return e===$0?jn:new He((kn.call(e,0)|kn.call(e,1)<<8|kn.call(e,2)<<16|kn.call(e,3)<<24)>>>0,(kn.call(e,4)|kn.call(e,5)<<8|kn.call(e,6)<<16|kn.call(e,7)<<24)>>>0)};He.prototype.toHash=function(){return String.fromCharCode(this.lo&255,this.lo>>>8&255,this.lo>>>16&255,this.lo>>>24,this.hi&255,this.hi>>>8&255,this.hi>>>16&255,this.hi>>>24)};He.prototype.zzEncode=function(){var e=this.hi>>31;return this.hi=((this.hi<<1|this.lo>>>31)^e)>>>0,this.lo=(this.lo<<1^e)>>>0,this};He.prototype.zzDecode=function(){var e=-(this.lo&1);return this.lo=((this.lo>>>1|this.hi<<31)^e)>>>0,this.hi=(this.hi>>>1^e)>>>0,this};He.prototype.length=function(){var e=this.lo,n=(this.lo>>>28|this.hi<<4)>>>0,t=this.hi>>>24;return t===0?n===0?e<16384?e<128?1:2:e<2097152?3:4:n<16384?n<128?5:6:n<2097152?7:8:t<128?9:10}});var _d=X((Gr,qa)=>{(function(r,e){function n(t){return t.default||t}typeof define=="function"&&define.amd?define([],function(){var t={};return e(t),n(t)}):typeof Gr=="object"?(e(Gr),typeof qa=="object"&&(qa.exports=n(Gr))):(function(){var t={};e(t),r.Long=n(t)})()})(typeof globalThis<"u"?globalThis:typeof self<"u"?self:Gr,function(r){"use strict";Object.defineProperty(r,"__esModule",{value:!0}),r.default=void 0;var e=null;try{e=new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0,1,13,2,96,0,1,127,96,4,127,127,127,127,1,127,3,7,6,0,1,1,1,1,1,6,6,1,127,1,65,0,11,7,50,6,3,109,117,108,0,1,5,100,105,118,95,115,0,2,5,100,105,118,95,117,0,3,5,114,101,109,95,115,0,4,5,114,101,109,95,117,0,5,8,103,101,116,95,104,105,103,104,0,0,10,191,1,6,4,0,35,0,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,126,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,127,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,128,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,129,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,130,34,4,66,32,135,167,36,0,32,4,167,11])),{}).exports}catch{}function n(C,w,k){this.low=C|0,this.high=w|0,this.unsigned=!!k}n.prototype.__isLong__,Object.defineProperty(n.prototype,"__isLong__",{value:!0});function t(C){return(C&&C.__isLong__)===!0}function o(C){var w=Math.clz32(C&-C);return C?31-w:w}n.isLong=t;var i={},s={};function a(C,w){var k,V,W;return w?(C>>>=0,(W=0<=C&&C<256)&&(V=s[C],V)?V:(k=l(C,0,!0),W&&(s[C]=k),k)):(C|=0,(W=-128<=C&&C<128)&&(V=i[C],V)?V:(k=l(C,C<0?-1:0,!1),W&&(i[C]=k),k))}n.fromInt=a;function u(C,w){if(isNaN(C))return w?x:_;if(w){if(C<0)return x;if(C>=y)return N}else{if(C<=-g)return B;if(C+1>=g)return E}return C<0?u(-C,w).neg():l(C%m|0,C/m|0,w)}n.fromNumber=u;function l(C,w,k){return new n(C,w,k)}n.fromBits=l;var c=Math.pow;function d(C,w,k){if(C.length===0)throw Error("empty string");if(typeof w=="number"?(k=w,w=!1):w=!!w,C==="NaN"||C==="Infinity"||C==="+Infinity"||C==="-Infinity")return w?x:_;if(k=k||10,k<2||36<k)throw RangeError("radix");var V;if((V=C.indexOf("-"))>0)throw Error("interior hyphen");if(V===0)return d(C.substring(1),w,k).neg();for(var W=u(c(k,8)),U=_,K=0;K<C.length;K+=8){var te=Math.min(8,C.length-K),ne=parseInt(C.substring(K,K+te),k);if(te<8){var Ae=u(c(k,te));U=U.mul(Ae).add(u(ne))}else U=U.mul(W),U=U.add(u(ne))}return U.unsigned=w,U}n.fromString=d;function p(C,w){return typeof C=="number"?u(C,w):typeof C=="string"?d(C,w):l(C.low,C.high,typeof w=="boolean"?w:C.unsigned)}n.fromValue=p;var f=65536,h=1<<24,m=f*f,y=m*m,g=y/2,b=a(h),_=a(0);n.ZERO=_;var x=a(0,!0);n.UZERO=x;var T=a(1);n.ONE=T;var S=a(1,!0);n.UONE=S;var P=a(-1);n.NEG_ONE=P;var E=l(-1,2147483647,!1);n.MAX_VALUE=E;var N=l(-1,-1,!0);n.MAX_UNSIGNED_VALUE=N;var B=l(0,-2147483648,!1);n.MIN_VALUE=B;var D=n.prototype;D.toInt=function(){return this.unsigned?this.low>>>0:this.low},D.toNumber=function(){return this.unsigned?(this.high>>>0)*m+(this.low>>>0):this.high*m+(this.low>>>0)},D.toString=function(w){if(w=w||10,w<2||36<w)throw RangeError("radix");if(this.isZero())return"0";if(this.isNegative())if(this.eq(B)){var k=u(w),V=this.div(k),W=V.mul(k).sub(this);return V.toString(w)+W.toInt().toString(w)}else return"-"+this.neg().toString(w);for(var U=u(c(w,6),this.unsigned),K=this,te="";;){var ne=K.div(U),Ae=K.sub(ne.mul(U)).toInt()>>>0,se=Ae.toString(w);if(K=ne,K.isZero())return se+te;for(;se.length<6;)se="0"+se;te=""+se+te}},D.getHighBits=function(){return this.high},D.getHighBitsUnsigned=function(){return this.high>>>0},D.getLowBits=function(){return this.low},D.getLowBitsUnsigned=function(){return this.low>>>0},D.getNumBitsAbs=function(){if(this.isNegative())return this.eq(B)?64:this.neg().getNumBitsAbs();for(var w=this.high!=0?this.high:this.low,k=31;k>0&&(w&1<<k)==0;k--);return this.high!=0?k+33:k+1},D.isSafeInteger=function(){var w=this.high>>21;return w?this.unsigned?!1:w===-1&&!(this.low===0&&this.high===-2097152):!0},D.isZero=function(){return this.high===0&&this.low===0},D.eqz=D.isZero,D.isNegative=function(){return!this.unsigned&&this.high<0},D.isPositive=function(){return this.unsigned||this.high>=0},D.isOdd=function(){return(this.low&1)===1},D.isEven=function(){return(this.low&1)===0},D.equals=function(w){return t(w)||(w=p(w)),this.unsigned!==w.unsigned&&this.high>>>31===1&&w.high>>>31===1?!1:this.high===w.high&&this.low===w.low},D.eq=D.equals,D.notEquals=function(w){return!this.eq(w)},D.neq=D.notEquals,D.ne=D.notEquals,D.lessThan=function(w){return this.comp(w)<0},D.lt=D.lessThan,D.lessThanOrEqual=function(w){return this.comp(w)<=0},D.lte=D.lessThanOrEqual,D.le=D.lessThanOrEqual,D.greaterThan=function(w){return this.comp(w)>0},D.gt=D.greaterThan,D.greaterThanOrEqual=function(w){return this.comp(w)>=0},D.gte=D.greaterThanOrEqual,D.ge=D.greaterThanOrEqual,D.compare=function(w){if(t(w)||(w=p(w)),this.eq(w))return 0;var k=this.isNegative(),V=w.isNegative();return k&&!V?-1:!k&&V?1:this.unsigned?w.high>>>0>this.high>>>0||w.high===this.high&&w.low>>>0>this.low>>>0?-1:1:this.sub(w).isNegative()?-1:1},D.comp=D.compare,D.negate=function(){return!this.unsigned&&this.eq(B)?B:this.not().add(T)},D.neg=D.negate,D.add=function(w){t(w)||(w=p(w));var k=this.high>>>16,V=this.high&65535,W=this.low>>>16,U=this.low&65535,K=w.high>>>16,te=w.high&65535,ne=w.low>>>16,Ae=w.low&65535,se=0,L=0,z=0,ce=0;return ce+=U+Ae,z+=ce>>>16,ce&=65535,z+=W+ne,L+=z>>>16,z&=65535,L+=V+te,se+=L>>>16,L&=65535,se+=k+K,se&=65535,l(z<<16|ce,se<<16|L,this.unsigned)},D.subtract=function(w){return t(w)||(w=p(w)),this.add(w.neg())},D.sub=D.subtract,D.multiply=function(w){if(this.isZero())return this;if(t(w)||(w=p(w)),e){var k=e.mul(this.low,this.high,w.low,w.high);return l(k,e.get_high(),this.unsigned)}if(w.isZero())return this.unsigned?x:_;if(this.eq(B))return w.isOdd()?B:_;if(w.eq(B))return this.isOdd()?B:_;if(this.isNegative())return w.isNegative()?this.neg().mul(w.neg()):this.neg().mul(w).neg();if(w.isNegative())return this.mul(w.neg()).neg();if(this.lt(b)&&w.lt(b))return u(this.toNumber()*w.toNumber(),this.unsigned);var V=this.high>>>16,W=this.high&65535,U=this.low>>>16,K=this.low&65535,te=w.high>>>16,ne=w.high&65535,Ae=w.low>>>16,se=w.low&65535,L=0,z=0,ce=0,ze=0;return ze+=K*se,ce+=ze>>>16,ze&=65535,ce+=U*se,z+=ce>>>16,ce&=65535,ce+=K*Ae,z+=ce>>>16,ce&=65535,z+=W*se,L+=z>>>16,z&=65535,z+=U*Ae,L+=z>>>16,z&=65535,z+=K*ne,L+=z>>>16,z&=65535,L+=V*se+W*Ae+U*ne+K*te,L&=65535,l(ce<<16|ze,L<<16|z,this.unsigned)},D.mul=D.multiply,D.divide=function(w){if(t(w)||(w=p(w)),w.isZero())throw Error("division by zero");if(e){if(!this.unsigned&&this.high===-2147483648&&w.low===-1&&w.high===-1)return this;var k=(this.unsigned?e.div_u:e.div_s)(this.low,this.high,w.low,w.high);return l(k,e.get_high(),this.unsigned)}if(this.isZero())return this.unsigned?x:_;var V,W,U;if(this.unsigned){if(w.unsigned||(w=w.toUnsigned()),w.gt(this))return x;if(w.gt(this.shru(1)))return S;U=x}else{if(this.eq(B)){if(w.eq(T)||w.eq(P))return B;if(w.eq(B))return T;var K=this.shr(1);return V=K.div(w).shl(1),V.eq(_)?w.isNegative()?T:P:(W=this.sub(w.mul(V)),U=V.add(W.div(w)),U)}else if(w.eq(B))return this.unsigned?x:_;if(this.isNegative())return w.isNegative()?this.neg().div(w.neg()):this.neg().div(w).neg();if(w.isNegative())return this.div(w.neg()).neg();U=_}for(W=this;W.gte(w);){V=Math.max(1,Math.floor(W.toNumber()/w.toNumber()));for(var te=Math.ceil(Math.log(V)/Math.LN2),ne=te<=48?1:c(2,te-48),Ae=u(V),se=Ae.mul(w);se.isNegative()||se.gt(W);)V-=ne,Ae=u(V,this.unsigned),se=Ae.mul(w);Ae.isZero()&&(Ae=T),U=U.add(Ae),W=W.sub(se)}return U},D.div=D.divide,D.modulo=function(w){if(t(w)||(w=p(w)),e){var k=(this.unsigned?e.rem_u:e.rem_s)(this.low,this.high,w.low,w.high);return l(k,e.get_high(),this.unsigned)}return this.sub(this.div(w).mul(w))},D.mod=D.modulo,D.rem=D.modulo,D.not=function(){return l(~this.low,~this.high,this.unsigned)},D.countLeadingZeros=function(){return this.high?Math.clz32(this.high):Math.clz32(this.low)+32},D.clz=D.countLeadingZeros,D.countTrailingZeros=function(){return this.low?o(this.low):o(this.high)+32},D.ctz=D.countTrailingZeros,D.and=function(w){return t(w)||(w=p(w)),l(this.low&w.low,this.high&w.high,this.unsigned)},D.or=function(w){return t(w)||(w=p(w)),l(this.low|w.low,this.high|w.high,this.unsigned)},D.xor=function(w){return t(w)||(w=p(w)),l(this.low^w.low,this.high^w.high,this.unsigned)},D.shiftLeft=function(w){return t(w)&&(w=w.toInt()),(w&=63)===0?this:w<32?l(this.low<<w,this.high<<w|this.low>>>32-w,this.unsigned):l(0,this.low<<w-32,this.unsigned)},D.shl=D.shiftLeft,D.shiftRight=function(w){return t(w)&&(w=w.toInt()),(w&=63)===0?this:w<32?l(this.low>>>w|this.high<<32-w,this.high>>w,this.unsigned):l(this.high>>w-32,this.high>=0?0:-1,this.unsigned)},D.shr=D.shiftRight,D.shiftRightUnsigned=function(w){return t(w)&&(w=w.toInt()),(w&=63)===0?this:w<32?l(this.low>>>w|this.high<<32-w,this.high>>>w,this.unsigned):w===32?l(this.high,0,this.unsigned):l(this.high>>>w-32,0,this.unsigned)},D.shru=D.shiftRightUnsigned,D.shr_u=D.shiftRightUnsigned,D.rotateLeft=function(w){var k;return t(w)&&(w=w.toInt()),(w&=63)===0?this:w===32?l(this.high,this.low,this.unsigned):w<32?(k=32-w,l(this.low<<w|this.high>>>k,this.high<<w|this.low>>>k,this.unsigned)):(w-=32,k=32-w,l(this.high<<w|this.low>>>k,this.low<<w|this.high>>>k,this.unsigned))},D.rotl=D.rotateLeft,D.rotateRight=function(w){var k;return t(w)&&(w=w.toInt()),(w&=63)===0?this:w===32?l(this.high,this.low,this.unsigned):w<32?(k=32-w,l(this.high<<k|this.low>>>w,this.low<<k|this.high>>>w,this.unsigned)):(w-=32,k=32-w,l(this.low<<k|this.high>>>w,this.high<<k|this.low>>>w,this.unsigned))},D.rotr=D.rotateRight,D.toSigned=function(){return this.unsigned?l(this.low,this.high,!1):this},D.toUnsigned=function(){return this.unsigned?this:l(this.low,this.high,!0)},D.toBytes=function(w){return w?this.toBytesLE():this.toBytesBE()},D.toBytesLE=function(){var w=this.high,k=this.low;return[k&255,k>>>8&255,k>>>16&255,k>>>24,w&255,w>>>8&255,w>>>16&255,w>>>24]},D.toBytesBE=function(){var w=this.high,k=this.low;return[w>>>24,w>>>16&255,w>>>8&255,w&255,k>>>24,k>>>16&255,k>>>8&255,k&255]},n.fromBytes=function(w,k,V){return V?n.fromBytesLE(w,k):n.fromBytesBE(w,k)},n.fromBytesLE=function(w,k){return new n(w[0]|w[1]<<8|w[2]<<16|w[3]<<24,w[4]|w[5]<<8|w[6]<<16|w[7]<<24,k)},n.fromBytesBE=function(w,k){return new n(w[4]<<24|w[5]<<16|w[6]<<8|w[7],w[0]<<24|w[1]<<16|w[2]<<8|w[3],k)},typeof BigInt=="function"&&(n.fromBigInt=function(w,k){var V=Number(BigInt.asIntN(32,w)),W=Number(BigInt.asIntN(32,w>>BigInt(32)));return l(V,W,k)},n.fromValue=function(w,k){return typeof w=="bigint"?n.fromBigInt(w,k):p(w,k)},D.toBigInt=function(){var w=BigInt(this.low>>>0),k=BigInt(this.unsigned?this.high>>>0:this.high);return k<<BigInt(32)|w});var j=r.default=n})});var Ln=X(ja=>{"use strict";var J=ja;J.asPromise=Jc();J.base64=td();J.EventEmitter=rd();J.float=cd();J.inquire=pd();J.utf8=hd();J.pool=gd();J.LongBits=yd();function wd(r){return r==="__proto__"||r==="prototype"||r==="constructor"}J.isUnsafeProperty=wd;J.isNode=!!(typeof global<"u"&&global&&global.process&&global.process.versions&&global.process.versions.node);J.global=J.isNode&&global||typeof window<"u"&&window||typeof self<"u"&&self||ja;J.emptyArray=Object.freeze?Object.freeze([]):[];J.emptyObject=Object.freeze?Object.freeze({}):{};J.isInteger=Number.isInteger||function(e){return typeof e=="number"&&isFinite(e)&&Math.floor(e)===e};J.isString=function(e){return typeof e=="string"||e instanceof String};J.isObject=function(e){return e&&typeof e=="object"};J.isset=J.isSet=function(e,n){var t=e[n];return t!=null&&Object.hasOwnProperty.call(e,n)?typeof t!="object"||(Array.isArray(t)?t.length:Object.keys(t).length)>0:!1};J.Buffer=(function(){try{var r=J.global.Buffer;return r.prototype.utf8Write?r:null}catch{return null}})();J._Buffer_from=null;J._Buffer_allocUnsafe=null;J.newBuffer=function(e){return typeof e=="number"?J.Buffer?J._Buffer_allocUnsafe(e):new J.Array(e):J.Buffer?J._Buffer_from(e):typeof Uint8Array>"u"?e:new Uint8Array(e)};J.Array=typeof Uint8Array<"u"?Uint8Array:Array;J.Long=J.global.dcodeIO&&J.global.dcodeIO.Long||J.global.Long||(function(){try{var r=_d();return r&&r.isLong?r:null}catch{return null}})();J.key2Re=/^true|false|0|1$/;J.key32Re=/^-?(?:0|[1-9][0-9]*)$/;J.key64Re=/^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/;J.longToHash=function(e){return e?J.LongBits.from(e).toHash():J.LongBits.zeroHash};J.longFromHash=function(e,n){var t=J.LongBits.fromHash(e);return J.Long?J.Long.fromBits(t.lo,t.hi,n):t.toNumber(!!n)};function vd(r){var e=typeof arguments[arguments.length-1]=="boolean",n=e?arguments.length-1:arguments.length;e=e&&arguments[arguments.length-1];for(var t=1;t<n;++t){var o=arguments[t];if(o)for(var i=Object.keys(o),s=0;s<i.length;++s)!wd(i[s])&&(r[i[s]]===void 0||!e)&&(r[i[s]]=o[i[s]])}return r}J.merge=vd;J.nestingLimit=32;J.recursionLimit=100;J.makeProp=function(e,n){Object.defineProperty(e,n,{enumerable:!0,configurable:!0,writable:!0})};J.lcFirst=function(e){return e.charAt(0).toLowerCase()+e.substring(1)};function xd(r){function e(n,t){if(!(this instanceof e))return new e(n,t);Object.defineProperty(this,"message",{get:function(){return n}}),Error.captureStackTrace?Error.captureStackTrace(this,e):Object.defineProperty(this,"stack",{value:new Error().stack||""}),t&&vd(this,t)}return e.prototype=Object.create(Error.prototype,{constructor:{value:e,writable:!0,enumerable:!1,configurable:!0},name:{get:function(){return r},set:void 0,enumerable:!1,configurable:!0},toString:{value:function(){return this.name+": "+this.message},writable:!0,enumerable:!1,configurable:!0}}),e}J.newError=xd;J.ProtocolError=xd("ProtocolError");J.oneOfGetter=function(e){for(var n={},t=0;t<e.length;++t)n[e[t]]=1;return function(){for(var o=Object.keys(this),i=o.length-1;i>-1;--i)if(n[o[i]]===1&&this[o[i]]!==void 0&&this[o[i]]!==null)return o[i]}};J.oneOfSetter=function(e){return function(n){for(var t=0;t<e.length;++t)e[t]!==n&&delete this[e[t]]}};J.toJSONOptions={longs:String,enums:String,bytes:String,json:!0};J._configure=function(){var r=J.Buffer;if(!r){J._Buffer_from=J._Buffer_allocUnsafe=null;return}J._Buffer_from=r.from!==Uint8Array.from&&r.from||function(n,t){return new r(n,t)},J._Buffer_allocUnsafe=r.allocUnsafe||function(n){return new r(n)}}});var eu=X((m3,$d)=>{"use strict";$d.exports=_e;var bt=Ln(),Ka,Go=bt.LongBits,Td=bt.base64,Id=bt.utf8;function Ur(r,e,n){this.fn=r,this.len=e,this.next=void 0,this.val=n}function Za(){}function A0(r){this.head=r.head,this.tail=r.tail,this.len=r.len,this.next=r.states}function _e(){this.len=0,this.head=new Ur(Za,0,0),this.tail=this.head,this.states=null}var Sd=function(){return bt.Buffer?function(){return(_e.create=function(){return new Ka})()}:function(){return new _e}};_e.create=Sd();_e.alloc=function(e){return new bt.Array(e)};bt.Array!==Array&&(_e.alloc=bt.pool(_e.alloc,bt.Array.prototype.subarray));_e.prototype._push=function(e,n,t){return this.tail=this.tail.next=new Ur(e,n,t),this.len+=n,this};function Ja(r,e,n){e[n]=r&255}function O0(r,e,n){for(;r>127;)e[n++]=r&127|128,r>>>=7;e[n]=r}function Qa(r,e){this.len=r,this.next=void 0,this.val=e}Qa.prototype=Object.create(Ur.prototype);Qa.prototype.fn=O0;_e.prototype.uint32=function(e){return this.len+=(this.tail=this.tail.next=new Qa((e=e>>>0)<128?1:e<16384?2:e<2097152?3:e<268435456?4:5,e)).len,this};_e.prototype.int32=function(e){return(e|=0)<0?this._push(Ya,10,Go.fromNumber(e)):this.uint32(e)};_e.prototype.sint32=function(e){return this.uint32((e<<1^e>>31)>>>0)};function Ya(r,e,n){for(var t=r.lo,o=r.hi;o;)e[n++]=t&127|128,t=(t>>>7|o<<25)>>>0,o>>>=7;for(;t>127;)e[n++]=t&127|128,t=t>>>7;e[n++]=t}_e.prototype.uint64=function(e){var n=Go.from(e);return this._push(Ya,n.length(),n)};_e.prototype.int64=_e.prototype.uint64;_e.prototype.sint64=function(e){var n=Go.from(e).zzEncode();return this._push(Ya,n.length(),n)};_e.prototype.bool=function(e){return this._push(Ja,1,e?1:0)};function Xa(r,e,n){e[n]=r&255,e[n+1]=r>>>8&255,e[n+2]=r>>>16&255,e[n+3]=r>>>24}_e.prototype.fixed32=function(e){return this._push(Xa,4,e>>>0)};_e.prototype.sfixed32=_e.prototype.fixed32;_e.prototype.fixed64=function(e){var n=Go.from(e);return this._push(Xa,4,n.lo)._push(Xa,4,n.hi)};_e.prototype.sfixed64=_e.prototype.fixed64;_e.prototype.float=function(e){return this._push(bt.float.writeFloatLE,4,e)};_e.prototype.double=function(e){return this._push(bt.float.writeDoubleLE,8,e)};var P0=bt.Array.prototype.set?function(e,n,t){n.set(e,t)}:function(e,n,t){for(var o=0;o<e.length;++o)n[t+o]=e[o]};_e.prototype.bytes=function(e){var n=e.length>>>0;if(!n)return this._push(Ja,1,0);if(bt.isString(e)){var t=_e.alloc(n=Td.length(e));Td.decode(e,t,0),e=t}return this.uint32(n)._push(P0,n,e)};_e.prototype.string=function(e){var n=Id.length(e);return n?this.uint32(n)._push(Id.write,n,e):this._push(Ja,1,0)};_e.prototype.fork=function(){return this.states=new A0(this),this.head=this.tail=new Ur(Za,0,0),this.len=0,this};_e.prototype.reset=function(){return this.states?(this.head=this.states.head,this.tail=this.states.tail,this.len=this.states.len,this.states=this.states.next):(this.head=this.tail=new Ur(Za,0,0),this.len=0),this};_e.prototype.ldelim=function(){var e=this.head,n=this.tail,t=this.len;return this.reset().uint32(t),t&&(this.tail.next=e.next,this.tail=n,this.len+=t),this};_e.prototype.finish=function(){for(var e=this.head.next,n=this.constructor.alloc(this.len),t=0;e;)e.fn(e.val,n,t),t+=e.len,e=e.next;return n};_e._configure=function(r){Ka=r,_e.create=Sd(),Ka._configure()}});var Pd=X((g3,Od)=>{"use strict";Od.exports=cn;var Ad=eu();(cn.prototype=Object.create(Ad.prototype)).constructor=cn;var Nn=Ln();function cn(){Ad.call(this)}cn._configure=function(){cn.alloc=Nn._Buffer_allocUnsafe,cn.writeBytesBuffer=Nn.Buffer&&Nn.Buffer.prototype instanceof Uint8Array&&Nn.Buffer.prototype.set.name==="set"?function(e,n,t){n.set(e,t)}:function(e,n,t){if(e.copy)e.copy(n,t,0,e.length);else for(var o=0;o<e.length;)n[t++]=e[o++]}};cn.prototype.bytes=function(e){Nn.isString(e)&&(e=Nn._Buffer_from(e,"base64"));var n=e.length>>>0;return this.uint32(n),n&&this._push(cn.writeBytesBuffer,n,e),this};function E0(r,e,n){r.length<40?Nn.utf8.write(r,e,n):e.utf8Write?e.utf8Write(r,n):e.write(r,n)}cn.prototype.string=function(e){var n=Nn.Buffer.byteLength(e);return this.uint32(n),n&&this._push(E0,n,e),this};cn._configure()});var ru=X((b3,Ld)=>{"use strict";Ld.exports=Ne;var yt=Ln(),nu,Cd=yt.LongBits,D0=yt.utf8;function St(r,e){return RangeError("index out of range: "+r.pos+" + "+(e||1)+" > "+r.len)}function Ne(r){this.buf=r,this.pos=0,this.len=r.length}var Ed=typeof Uint8Array<"u"?function(e){if(e instanceof Uint8Array||Array.isArray(e))return new Ne(e);throw Error("illegal buffer")}:function(e){if(Array.isArray(e))return new Ne(e);throw Error("illegal buffer")},kd=function(){return yt.Buffer?function(n){return(Ne.create=function(o){return yt.Buffer.isBuffer(o)?new nu(o):Ed(o)})(n)}:Ed};Ne.create=kd();Ne.prototype._slice=yt.Array.prototype.subarray||yt.Array.prototype.slice;Ne.prototype.uint32=(function(){var e=4294967295;return function(){if(e=(this.buf[this.pos]&127)>>>0,this.buf[this.pos++]<128||(e=(e|(this.buf[this.pos]&127)<<7)>>>0,this.buf[this.pos++]<128)||(e=(e|(this.buf[this.pos]&127)<<14)>>>0,this.buf[this.pos++]<128)||(e=(e|(this.buf[this.pos]&127)<<21)>>>0,this.buf[this.pos++]<128)||(e=(e|(this.buf[this.pos]&15)<<28)>>>0,this.buf[this.pos++]<128))return e;if((this.pos+=5)>this.len)throw this.pos=this.len,St(this,10);return e}})();Ne.prototype.int32=function(){return this.uint32()|0};Ne.prototype.sint32=function(){var e=this.uint32();return e>>>1^-(e&1)|0};function tu(){var r=new Cd(0,0),e=0;if(this.len-this.pos>4){for(;e<4;++e)if(r.lo=(r.lo|(this.buf[this.pos]&127)<<e*7)>>>0,this.buf[this.pos++]<128)return r;if(r.lo=(r.lo|(this.buf[this.pos]&127)<<28)>>>0,r.hi=(r.hi|(this.buf[this.pos]&127)>>4)>>>0,this.buf[this.pos++]<128)return r;e=0}else{for(;e<3;++e){if(this.pos>=this.len)throw St(this);if(r.lo=(r.lo|(this.buf[this.pos]&127)<<e*7)>>>0,this.buf[this.pos++]<128)return r}return r.lo=(r.lo|(this.buf[this.pos++]&127)<<e*7)>>>0,r}if(this.len-this.pos>4){for(;e<5;++e)if(r.hi=(r.hi|(this.buf[this.pos]&127)<<e*7+3)>>>0,this.buf[this.pos++]<128)return r}else for(;e<5;++e){if(this.pos>=this.len)throw St(this);if(r.hi=(r.hi|(this.buf[this.pos]&127)<<e*7+3)>>>0,this.buf[this.pos++]<128)return r}throw Error("invalid varint encoding")}Ne.prototype.bool=function(){return this.uint32()!==0};function Uo(r,e){return(r[e-4]|r[e-3]<<8|r[e-2]<<16|r[e-1]<<24)>>>0}Ne.prototype.fixed32=function(){if(this.pos+4>this.len)throw St(this,4);return Uo(this.buf,this.pos+=4)};Ne.prototype.sfixed32=function(){if(this.pos+4>this.len)throw St(this,4);return Uo(this.buf,this.pos+=4)|0};function Dd(){if(this.pos+8>this.len)throw St(this,8);return new Cd(Uo(this.buf,this.pos+=4),Uo(this.buf,this.pos+=4))}Ne.prototype.float=function(){if(this.pos+4>this.len)throw St(this,4);var e=yt.float.readFloatLE(this.buf,this.pos);return this.pos+=4,e};Ne.prototype.double=function(){if(this.pos+8>this.len)throw St(this,4);var e=yt.float.readDoubleLE(this.buf,this.pos);return this.pos+=8,e};Ne.prototype.bytes=function(){var e=this.uint32(),n=this.pos,t=this.pos+e;if(t>this.len)throw St(this,e);if(this.pos+=e,Array.isArray(this.buf))return this.buf.slice(n,t);if(n===t){var o=yt.Buffer;return o?o.alloc(0):new this.buf.constructor(0)}return this._slice.call(this.buf,n,t)};Ne.prototype.string=function(){var e=this.bytes();return D0.read(e,0,e.length)};Ne.prototype.skip=function(e){if(typeof e=="number"){if(this.pos+e>this.len)throw St(this,e);this.pos+=e}else do if(this.pos>=this.len)throw St(this);while(this.buf[this.pos++]&128);return this};Ne.recursionLimit=yt.recursionLimit;Ne.prototype.skipType=function(r,e){if(e===void 0&&(e=0),e>Ne.recursionLimit)throw Error("maximum nesting depth exceeded");switch(r){case 0:this.skip();break;case 1:this.skip(8);break;case 2:this.skip(this.uint32());break;case 3:for(;(r=this.uint32()&7)!==4;)this.skipType(r,e+1);break;case 5:this.skip(4);break;default:throw Error("invalid wire type "+r+" at offset "+this.pos)}return this};Ne._configure=function(r){nu=r,Ne.create=kd(),nu._configure();var e=yt.Long?"toLong":"toNumber";yt.merge(Ne.prototype,{int64:function(){return tu.call(this)[e](!1)},uint64:function(){return tu.call(this)[e](!0)},sint64:function(){return tu.call(this).zzDecode()[e](!1)},fixed64:function(){return Dd.call(this)[e](!0)},sfixed64:function(){return Dd.call(this)[e](!1)}})}});var Bd=X((y3,zd)=>{"use strict";zd.exports=Kn;var Rd=ru();(Kn.prototype=Object.create(Rd.prototype)).constructor=Kn;var Nd=Ln();function Kn(r){Rd.call(this,r)}Kn._configure=function(){Nd.Buffer&&(Kn.prototype._slice=Nd.Buffer.prototype.slice)};Kn.prototype.string=function(){var e=this.uint32();return this.buf.utf8Slice?this.buf.utf8Slice(this.pos,this.pos=Math.min(this.pos+e,this.len)):this.buf.toString("utf-8",this.pos,this.pos=Math.min(this.pos+e,this.len))};Kn._configure()});var Vd=X((_3,Md)=>{"use strict";Md.exports=Wr;var ou=Ln();(Wr.prototype=Object.create(ou.EventEmitter.prototype)).constructor=Wr;function Wr(r,e,n){if(typeof r!="function")throw TypeError("rpcImpl must be a function");ou.EventEmitter.call(this),this.rpcImpl=r,this.requestDelimited=!!e,this.responseDelimited=!!n}Wr.prototype.rpcCall=function r(e,n,t,o,i){if(!o)throw TypeError("request must be specified");var s=this;if(!i)return ou.asPromise(r,s,e,n,t,o);if(!s.rpcImpl){setTimeout(function(){i(Error("already ended"))},0);return}try{return s.rpcImpl(e,n[s.requestDelimited?"encodeDelimited":"encode"](o).finish(),function(u,l){if(u)return s.emit("error",u,e),i(u);if(l===null){s.end(!0);return}if(!(l instanceof t))try{l=t[s.responseDelimited?"decodeDelimited":"decode"](l)}catch(c){return s.emit("error",c,e),i(c)}return s.emit("data",l,e),i(null,l)})}catch(a){s.emit("error",a,e),setTimeout(function(){i(a)},0);return}};Wr.prototype.end=function(e){return this.rpcImpl&&(e||this.rpcImpl(null,null,null),this.rpcImpl=null,this.emit("end").off()),this}});var Gd=X(Fd=>{"use strict";var C0=Fd;C0.Service=Vd()});var Wd=X((v3,Ud)=>{"use strict";Ud.exports=Object.create(null)});var jd=X(qd=>{"use strict";var rt=qd;rt.build="minimal";rt.Writer=eu();rt.BufferWriter=Pd();rt.Reader=ru();rt.BufferReader=Bd();rt.util=Ln();rt.rpc=Gd();rt.roots=Wd();rt.configure=Hd;function Hd(){rt.util._configure(),rt.Writer._configure(rt.BufferWriter),rt.Reader._configure(rt.BufferReader)}Hd()});var Xd=X((T3,Kd)=>{"use strict";Kd.exports=jd()});var br=X((I3,Zd)=>{"use strict";var Ee=Xd(),G=Ee.Reader,Me=Ee.Writer,I=Ee.util,v=Ee.roots.default||(Ee.roots.default={});v.onnx=(function(){var r={};return r.Version=(function(){var e={},n=Object.create(e);return n[e[0]="_START_VERSION"]=0,n[e[1]="IR_VERSION_2017_10_10"]=1,n[e[2]="IR_VERSION_2017_10_30"]=2,n[e[3]="IR_VERSION_2017_11_3"]=3,n[e[4]="IR_VERSION_2019_1_22"]=4,n[e[5]="IR_VERSION_2019_3_18"]=5,n[e[6]="IR_VERSION_2019_9_19"]=6,n[e[7]="IR_VERSION_2020_5_8"]=7,n[e[8]="IR_VERSION_2021_7_30"]=8,n[e[9]="IR_VERSION"]=9,n})(),r.AttributeProto=(function(){function e(n){if(this.floats=[],this.ints=[],this.strings=[],this.tensors=[],this.graphs=[],this.sparseTensors=[],this.typeProtos=[],n)for(var t=Object.keys(n),o=0;o<t.length;++o)n[t[o]]!=null&&(this[t[o]]=n[t[o]])}return e.prototype.name="",e.prototype.refAttrName="",e.prototype.docString="",e.prototype.type=0,e.prototype.f=0,e.prototype.i=I.Long?I.Long.fromBits(0,0,!1):0,e.prototype.s=I.newBuffer([]),e.prototype.t=null,e.prototype.g=null,e.prototype.sparseTensor=null,e.prototype.tp=null,e.prototype.floats=I.emptyArray,e.prototype.ints=I.emptyArray,e.prototype.strings=I.emptyArray,e.prototype.tensors=I.emptyArray,e.prototype.graphs=I.emptyArray,e.prototype.sparseTensors=I.emptyArray,e.prototype.typeProtos=I.emptyArray,e.create=function(t){return new e(t)},e.encode=function(t,o){if(o||(o=Me.create()),t.name!=null&&Object.hasOwnProperty.call(t,"name")&&o.uint32(10).string(t.name),t.f!=null&&Object.hasOwnProperty.call(t,"f")&&o.uint32(21).float(t.f),t.i!=null&&Object.hasOwnProperty.call(t,"i")&&o.uint32(24).int64(t.i),t.s!=null&&Object.hasOwnProperty.call(t,"s")&&o.uint32(34).bytes(t.s),t.t!=null&&Object.hasOwnProperty.call(t,"t")&&v.onnx.TensorProto.encode(t.t,o.uint32(42).fork()).ldelim(),t.g!=null&&Object.hasOwnProperty.call(t,"g")&&v.onnx.GraphProto.encode(t.g,o.uint32(50).fork()).ldelim(),t.floats!=null&&t.floats.length){o.uint32(58).fork();for(var i=0;i<t.floats.length;++i)o.float(t.floats[i]);o.ldelim()}if(t.ints!=null&&t.ints.length){o.uint32(66).fork();for(var i=0;i<t.ints.length;++i)o.int64(t.ints[i]);o.ldelim()}if(t.strings!=null&&t.strings.length)for(var i=0;i<t.strings.length;++i)o.uint32(74).bytes(t.strings[i]);if(t.tensors!=null&&t.tensors.length)for(var i=0;i<t.tensors.length;++i)v.onnx.TensorProto.encode(t.tensors[i],o.uint32(82).fork()).ldelim();if(t.graphs!=null&&t.graphs.length)for(var i=0;i<t.graphs.length;++i)v.onnx.GraphProto.encode(t.graphs[i],o.uint32(90).fork()).ldelim();if(t.docString!=null&&Object.hasOwnProperty.call(t,"docString")&&o.uint32(106).string(t.docString),t.tp!=null&&Object.hasOwnProperty.call(t,"tp")&&v.onnx.TypeProto.encode(t.tp,o.uint32(114).fork()).ldelim(),t.typeProtos!=null&&t.typeProtos.length)for(var i=0;i<t.typeProtos.length;++i)v.onnx.TypeProto.encode(t.typeProtos[i],o.uint32(122).fork()).ldelim();if(t.type!=null&&Object.hasOwnProperty.call(t,"type")&&o.uint32(160).int32(t.type),t.refAttrName!=null&&Object.hasOwnProperty.call(t,"refAttrName")&&o.uint32(170).string(t.refAttrName),t.sparseTensor!=null&&Object.hasOwnProperty.call(t,"sparseTensor")&&v.onnx.SparseTensorProto.encode(t.sparseTensor,o.uint32(178).fork()).ldelim(),t.sparseTensors!=null&&t.sparseTensors.length)for(var i=0;i<t.sparseTensors.length;++i)v.onnx.SparseTensorProto.encode(t.sparseTensors[i],o.uint32(186).fork()).ldelim();return o},e.encodeDelimited=function(t,o){return this.encode(t,o).ldelim()},e.decode=function(t,o){t instanceof G||(t=G.create(t));for(var i=o===void 0?t.len:t.pos+o,s=new v.onnx.AttributeProto;t.pos<i;){var a=t.uint32();switch(a>>>3){case 1:{s.name=t.string();break}case 21:{s.refAttrName=t.string();break}case 13:{s.docString=t.string();break}case 20:{s.type=t.int32();break}case 2:{s.f=t.float();break}case 3:{s.i=t.int64();break}case 4:{s.s=t.bytes();break}case 5:{s.t=v.onnx.TensorProto.decode(t,t.uint32());break}case 6:{s.g=v.onnx.GraphProto.decode(t,t.uint32());break}case 22:{s.sparseTensor=v.onnx.SparseTensorProto.decode(t,t.uint32());break}case 14:{s.tp=v.onnx.TypeProto.decode(t,t.uint32());break}case 7:{if(s.floats&&s.floats.length||(s.floats=[]),(a&7)===2)for(var u=t.uint32()+t.pos;t.pos<u;)s.floats.push(t.float());else s.floats.push(t.float());break}case 8:{if(s.ints&&s.ints.length||(s.ints=[]),(a&7)===2)for(var u=t.uint32()+t.pos;t.pos<u;)s.ints.push(t.int64());else s.ints.push(t.int64());break}case 9:{s.strings&&s.strings.length||(s.strings=[]),s.strings.push(t.bytes());break}case 10:{s.tensors&&s.tensors.length||(s.tensors=[]),s.tensors.push(v.onnx.TensorProto.decode(t,t.uint32()));break}case 11:{s.graphs&&s.graphs.length||(s.graphs=[]),s.graphs.push(v.onnx.GraphProto.decode(t,t.uint32()));break}case 23:{s.sparseTensors&&s.sparseTensors.length||(s.sparseTensors=[]),s.sparseTensors.push(v.onnx.SparseTensorProto.decode(t,t.uint32()));break}case 15:{s.typeProtos&&s.typeProtos.length||(s.typeProtos=[]),s.typeProtos.push(v.onnx.TypeProto.decode(t,t.uint32()));break}default:t.skipType(a&7);break}}return s},e.decodeDelimited=function(t){return t instanceof G||(t=new G(t)),this.decode(t,t.uint32())},e.verify=function(t){if(typeof t!="object"||t===null)return"object expected";if(t.name!=null&&t.hasOwnProperty("name")&&!I.isString(t.name))return"name: string expected";if(t.refAttrName!=null&&t.hasOwnProperty("refAttrName")&&!I.isString(t.refAttrName))return"refAttrName: string expected";if(t.docString!=null&&t.hasOwnProperty("docString")&&!I.isString(t.docString))return"docString: string expected";if(t.type!=null&&t.hasOwnProperty("type"))switch(t.type){default:return"type: enum value expected";case 0:case 1:case 2:case 3:case 4:case 5:case 11:case 13:case 6:case 7:case 8:case 9:case 10:case 12:case 14:break}if(t.f!=null&&t.hasOwnProperty("f")&&typeof t.f!="number")return"f: number expected";if(t.i!=null&&t.hasOwnProperty("i")&&!I.isInteger(t.i)&&!(t.i&&I.isInteger(t.i.low)&&I.isInteger(t.i.high)))return"i: integer|Long expected";if(t.s!=null&&t.hasOwnProperty("s")&&!(t.s&&typeof t.s.length=="number"||I.isString(t.s)))return"s: buffer expected";if(t.t!=null&&t.hasOwnProperty("t")){var o=v.onnx.TensorProto.verify(t.t);if(o)return"t."+o}if(t.g!=null&&t.hasOwnProperty("g")){var o=v.onnx.GraphProto.verify(t.g);if(o)return"g."+o}if(t.sparseTensor!=null&&t.hasOwnProperty("sparseTensor")){var o=v.onnx.SparseTensorProto.verify(t.sparseTensor);if(o)return"sparseTensor."+o}if(t.tp!=null&&t.hasOwnProperty("tp")){var o=v.onnx.TypeProto.verify(t.tp);if(o)return"tp."+o}if(t.floats!=null&&t.hasOwnProperty("floats")){if(!Array.isArray(t.floats))return"floats: array expected";for(var i=0;i<t.floats.length;++i)if(typeof t.floats[i]!="number")return"floats: number[] expected"}if(t.ints!=null&&t.hasOwnProperty("ints")){if(!Array.isArray(t.ints))return"ints: array expected";for(var i=0;i<t.ints.length;++i)if(!I.isInteger(t.ints[i])&&!(t.ints[i]&&I.isInteger(t.ints[i].low)&&I.isInteger(t.ints[i].high)))return"ints: integer|Long[] expected"}if(t.strings!=null&&t.hasOwnProperty("strings")){if(!Array.isArray(t.strings))return"strings: array expected";for(var i=0;i<t.strings.length;++i)if(!(t.strings[i]&&typeof t.strings[i].length=="number"||I.isString(t.strings[i])))return"strings: buffer[] expected"}if(t.tensors!=null&&t.hasOwnProperty("tensors")){if(!Array.isArray(t.tensors))return"tensors: array expected";for(var i=0;i<t.tensors.length;++i){var o=v.onnx.TensorProto.verify(t.tensors[i]);if(o)return"tensors."+o}}if(t.graphs!=null&&t.hasOwnProperty("graphs")){if(!Array.isArray(t.graphs))return"graphs: array expected";for(var i=0;i<t.graphs.length;++i){var o=v.onnx.GraphProto.verify(t.graphs[i]);if(o)return"graphs."+o}}if(t.sparseTensors!=null&&t.hasOwnProperty("sparseTensors")){if(!Array.isArray(t.sparseTensors))return"sparseTensors: array expected";for(var i=0;i<t.sparseTensors.length;++i){var o=v.onnx.SparseTensorProto.verify(t.sparseTensors[i]);if(o)return"sparseTensors."+o}}if(t.typeProtos!=null&&t.hasOwnProperty("typeProtos")){if(!Array.isArray(t.typeProtos))return"typeProtos: array expected";for(var i=0;i<t.typeProtos.length;++i){var o=v.onnx.TypeProto.verify(t.typeProtos[i]);if(o)return"typeProtos."+o}}return null},e.fromObject=function(t){if(t instanceof v.onnx.AttributeProto)return t;var o=new v.onnx.AttributeProto;switch(t.name!=null&&(o.name=String(t.name)),t.refAttrName!=null&&(o.refAttrName=String(t.refAttrName)),t.docString!=null&&(o.docString=String(t.docString)),t.type){default:if(typeof t.type=="number"){o.type=t.type;break}break;case"UNDEFINED":case 0:o.type=0;break;case"FLOAT":case 1:o.type=1;break;case"INT":case 2:o.type=2;break;case"STRING":case 3:o.type=3;break;case"TENSOR":case 4:o.type=4;break;case"GRAPH":case 5:o.type=5;break;case"SPARSE_TENSOR":case 11:o.type=11;break;case"TYPE_PROTO":case 13:o.type=13;break;case"FLOATS":case 6:o.type=6;break;case"INTS":case 7:o.type=7;break;case"STRINGS":case 8:o.type=8;break;case"TENSORS":case 9:o.type=9;break;case"GRAPHS":case 10:o.type=10;break;case"SPARSE_TENSORS":case 12:o.type=12;break;case"TYPE_PROTOS":case 14:o.type=14;break}if(t.f!=null&&(o.f=Number(t.f)),t.i!=null&&(I.Long?(o.i=I.Long.fromValue(t.i)).unsigned=!1:typeof t.i=="string"?o.i=parseInt(t.i,10):typeof t.i=="number"?o.i=t.i:typeof t.i=="object"&&(o.i=new I.LongBits(t.i.low>>>0,t.i.high>>>0).toNumber())),t.s!=null&&(typeof t.s=="string"?I.base64.decode(t.s,o.s=I.newBuffer(I.base64.length(t.s)),0):t.s.length>=0&&(o.s=t.s)),t.t!=null){if(typeof t.t!="object")throw TypeError(".onnx.AttributeProto.t: object expected");o.t=v.onnx.TensorProto.fromObject(t.t)}if(t.g!=null){if(typeof t.g!="object")throw TypeError(".onnx.AttributeProto.g: object expected");o.g=v.onnx.GraphProto.fromObject(t.g)}if(t.sparseTensor!=null){if(typeof t.sparseTensor!="object")throw TypeError(".onnx.AttributeProto.sparseTensor: object expected");o.sparseTensor=v.onnx.SparseTensorProto.fromObject(t.sparseTensor)}if(t.tp!=null){if(typeof t.tp!="object")throw TypeError(".onnx.AttributeProto.tp: object expected");o.tp=v.onnx.TypeProto.fromObject(t.tp)}if(t.floats){if(!Array.isArray(t.floats))throw TypeError(".onnx.AttributeProto.floats: array expected");o.floats=[];for(var i=0;i<t.floats.length;++i)o.floats[i]=Number(t.floats[i])}if(t.ints){if(!Array.isArray(t.ints))throw TypeError(".onnx.AttributeProto.ints: array expected");o.ints=[];for(var i=0;i<t.ints.length;++i)I.Long?(o.ints[i]=I.Long.fromValue(t.ints[i])).unsigned=!1:typeof t.ints[i]=="string"?o.ints[i]=parseInt(t.ints[i],10):typeof t.ints[i]=="number"?o.ints[i]=t.ints[i]:typeof t.ints[i]=="object"&&(o.ints[i]=new I.LongBits(t.ints[i].low>>>0,t.ints[i].high>>>0).toNumber())}if(t.strings){if(!Array.isArray(t.strings))throw TypeError(".onnx.AttributeProto.strings: array expected");o.strings=[];for(var i=0;i<t.strings.length;++i)typeof t.strings[i]=="string"?I.base64.decode(t.strings[i],o.strings[i]=I.newBuffer(I.base64.length(t.strings[i])),0):t.strings[i].length>=0&&(o.strings[i]=t.strings[i])}if(t.tensors){if(!Array.isArray(t.tensors))throw TypeError(".onnx.AttributeProto.tensors: array expected");o.tensors=[];for(var i=0;i<t.tensors.length;++i){if(typeof t.tensors[i]!="object")throw TypeError(".onnx.AttributeProto.tensors: object expected");o.tensors[i]=v.onnx.TensorProto.fromObject(t.tensors[i])}}if(t.graphs){if(!Array.isArray(t.graphs))throw TypeError(".onnx.AttributeProto.graphs: array expected");o.graphs=[];for(var i=0;i<t.graphs.length;++i){if(typeof t.graphs[i]!="object")throw TypeError(".onnx.AttributeProto.graphs: object expected");o.graphs[i]=v.onnx.GraphProto.fromObject(t.graphs[i])}}if(t.sparseTensors){if(!Array.isArray(t.sparseTensors))throw TypeError(".onnx.AttributeProto.sparseTensors: array expected");o.sparseTensors=[];for(var i=0;i<t.sparseTensors.length;++i){if(typeof t.sparseTensors[i]!="object")throw TypeError(".onnx.AttributeProto.sparseTensors: object expected");o.sparseTensors[i]=v.onnx.SparseTensorProto.fromObject(t.sparseTensors[i])}}if(t.typeProtos){if(!Array.isArray(t.typeProtos))throw TypeError(".onnx.AttributeProto.typeProtos: array expected");o.typeProtos=[];for(var i=0;i<t.typeProtos.length;++i){if(typeof t.typeProtos[i]!="object")throw TypeError(".onnx.AttributeProto.typeProtos: object expected");o.typeProtos[i]=v.onnx.TypeProto.fromObject(t.typeProtos[i])}}return o},e.toObject=function(t,o){o||(o={});var i={};if((o.arrays||o.defaults)&&(i.floats=[],i.ints=[],i.strings=[],i.tensors=[],i.graphs=[],i.typeProtos=[],i.sparseTensors=[]),o.defaults){if(i.name="",i.f=0,I.Long){var s=new I.Long(0,0,!1);i.i=o.longs===String?s.toString():o.longs===Number?s.toNumber():s}else i.i=o.longs===String?"0":0;o.bytes===String?i.s="":(i.s=[],o.bytes!==Array&&(i.s=I.newBuffer(i.s))),i.t=null,i.g=null,i.docString="",i.tp=null,i.type=o.enums===String?"UNDEFINED":0,i.refAttrName="",i.sparseTensor=null}if(t.name!=null&&t.hasOwnProperty("name")&&(i.name=t.name),t.f!=null&&t.hasOwnProperty("f")&&(i.f=o.json&&!isFinite(t.f)?String(t.f):t.f),t.i!=null&&t.hasOwnProperty("i")&&(typeof t.i=="number"?i.i=o.longs===String?String(t.i):t.i:i.i=o.longs===String?I.Long.prototype.toString.call(t.i):o.longs===Number?new I.LongBits(t.i.low>>>0,t.i.high>>>0).toNumber():t.i),t.s!=null&&t.hasOwnProperty("s")&&(i.s=o.bytes===String?I.base64.encode(t.s,0,t.s.length):o.bytes===Array?Array.prototype.slice.call(t.s):t.s),t.t!=null&&t.hasOwnProperty("t")&&(i.t=v.onnx.TensorProto.toObject(t.t,o)),t.g!=null&&t.hasOwnProperty("g")&&(i.g=v.onnx.GraphProto.toObject(t.g,o)),t.floats&&t.floats.length){i.floats=[];for(var a=0;a<t.floats.length;++a)i.floats[a]=o.json&&!isFinite(t.floats[a])?String(t.floats[a]):t.floats[a]}if(t.ints&&t.ints.length){i.ints=[];for(var a=0;a<t.ints.length;++a)typeof t.ints[a]=="number"?i.ints[a]=o.longs===String?String(t.ints[a]):t.ints[a]:i.ints[a]=o.longs===String?I.Long.prototype.toString.call(t.ints[a]):o.longs===Number?new I.LongBits(t.ints[a].low>>>0,t.ints[a].high>>>0).toNumber():t.ints[a]}if(t.strings&&t.strings.length){i.strings=[];for(var a=0;a<t.strings.length;++a)i.strings[a]=o.bytes===String?I.base64.encode(t.strings[a],0,t.strings[a].length):o.bytes===Array?Array.prototype.slice.call(t.strings[a]):t.strings[a]}if(t.tensors&&t.tensors.length){i.tensors=[];for(var a=0;a<t.tensors.length;++a)i.tensors[a]=v.onnx.TensorProto.toObject(t.tensors[a],o)}if(t.graphs&&t.graphs.length){i.graphs=[];for(var a=0;a<t.graphs.length;++a)i.graphs[a]=v.onnx.GraphProto.toObject(t.graphs[a],o)}if(t.docString!=null&&t.hasOwnProperty("docString")&&(i.docString=t.docString),t.tp!=null&&t.hasOwnProperty("tp")&&(i.tp=v.onnx.TypeProto.toObject(t.tp,o)),t.typeProtos&&t.typeProtos.length){i.typeProtos=[];for(var a=0;a<t.typeProtos.length;++a)i.typeProtos[a]=v.onnx.TypeProto.toObject(t.typeProtos[a],o)}if(t.type!=null&&t.hasOwnProperty("type")&&(i.type=o.enums===String?v.onnx.AttributeProto.AttributeType[t.type]===void 0?t.type:v.onnx.AttributeProto.AttributeType[t.type]:t.type),t.refAttrName!=null&&t.hasOwnProperty("refAttrName")&&(i.refAttrName=t.refAttrName),t.sparseTensor!=null&&t.hasOwnProperty("sparseTensor")&&(i.sparseTensor=v.onnx.SparseTensorProto.toObject(t.sparseTensor,o)),t.sparseTensors&&t.sparseTensors.length){i.sparseTensors=[];for(var a=0;a<t.sparseTensors.length;++a)i.sparseTensors[a]=v.onnx.SparseTensorProto.toObject(t.sparseTensors[a],o)}return i},e.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},e.getTypeUrl=function(t){return t===void 0&&(t="type.googleapis.com"),t+"/onnx.AttributeProto"},e.AttributeType=(function(){var n={},t=Object.create(n);return t[n[0]="UNDEFINED"]=0,t[n[1]="FLOAT"]=1,t[n[2]="INT"]=2,t[n[3]="STRING"]=3,t[n[4]="TENSOR"]=4,t[n[5]="GRAPH"]=5,t[n[11]="SPARSE_TENSOR"]=11,t[n[13]="TYPE_PROTO"]=13,t[n[6]="FLOATS"]=6,t[n[7]="INTS"]=7,t[n[8]="STRINGS"]=8,t[n[9]="TENSORS"]=9,t[n[10]="GRAPHS"]=10,t[n[12]="SPARSE_TENSORS"]=12,t[n[14]="TYPE_PROTOS"]=14,t})(),e})(),r.ValueInfoProto=(function(){function e(n){if(n)for(var t=Object.keys(n),o=0;o<t.length;++o)n[t[o]]!=null&&(this[t[o]]=n[t[o]])}return e.prototype.name="",e.prototype.type=null,e.prototype.docString="",e.create=function(t){return new e(t)},e.encode=function(t,o){return o||(o=Me.create()),t.name!=null&&Object.hasOwnProperty.call(t,"name")&&o.uint32(10).string(t.name),t.type!=null&&Object.hasOwnProperty.call(t,"type")&&v.onnx.TypeProto.encode(t.type,o.uint32(18).fork()).ldelim(),t.docString!=null&&Object.hasOwnProperty.call(t,"docString")&&o.uint32(26).string(t.docString),o},e.encodeDelimited=function(t,o){return this.encode(t,o).ldelim()},e.decode=function(t,o){t instanceof G||(t=G.create(t));for(var i=o===void 0?t.len:t.pos+o,s=new v.onnx.ValueInfoProto;t.pos<i;){var a=t.uint32();switch(a>>>3){case 1:{s.name=t.string();break}case 2:{s.type=v.onnx.TypeProto.decode(t,t.uint32());break}case 3:{s.docString=t.string();break}default:t.skipType(a&7);break}}return s},e.decodeDelimited=function(t){return t instanceof G||(t=new G(t)),this.decode(t,t.uint32())},e.verify=function(t){if(typeof t!="object"||t===null)return"object expected";if(t.name!=null&&t.hasOwnProperty("name")&&!I.isString(t.name))return"name: string expected";if(t.type!=null&&t.hasOwnProperty("type")){var o=v.onnx.TypeProto.verify(t.type);if(o)return"type."+o}return t.docString!=null&&t.hasOwnProperty("docString")&&!I.isString(t.docString)?"docString: string expected":null},e.fromObject=function(t){if(t instanceof v.onnx.ValueInfoProto)return t;var o=new v.onnx.ValueInfoProto;if(t.name!=null&&(o.name=String(t.name)),t.type!=null){if(typeof t.type!="object")throw TypeError(".onnx.ValueInfoProto.type: object expected");o.type=v.onnx.TypeProto.fromObject(t.type)}return t.docString!=null&&(o.docString=String(t.docString)),o},e.toObject=function(t,o){o||(o={});var i={};return o.defaults&&(i.name="",i.type=null,i.docString=""),t.name!=null&&t.hasOwnProperty("name")&&(i.name=t.name),t.type!=null&&t.hasOwnProperty("type")&&(i.type=v.onnx.TypeProto.toObject(t.type,o)),t.docString!=null&&t.hasOwnProperty("docString")&&(i.docString=t.docString),i},e.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},e.getTypeUrl=function(t){return t===void 0&&(t="type.googleapis.com"),t+"/onnx.ValueInfoProto"},e})(),r.NodeProto=(function(){function e(n){if(this.input=[],this.output=[],this.attribute=[],n)for(var t=Object.keys(n),o=0;o<t.length;++o)n[t[o]]!=null&&(this[t[o]]=n[t[o]])}return e.prototype.input=I.emptyArray,e.prototype.output=I.emptyArray,e.prototype.name="",e.prototype.opType="",e.prototype.domain="",e.prototype.attribute=I.emptyArray,e.prototype.docString="",e.create=function(t){return new e(t)},e.encode=function(t,o){if(o||(o=Me.create()),t.input!=null&&t.input.length)for(var i=0;i<t.input.length;++i)o.uint32(10).string(t.input[i]);if(t.output!=null&&t.output.length)for(var i=0;i<t.output.length;++i)o.uint32(18).string(t.output[i]);if(t.name!=null&&Object.hasOwnProperty.call(t,"name")&&o.uint32(26).string(t.name),t.opType!=null&&Object.hasOwnProperty.call(t,"opType")&&o.uint32(34).string(t.opType),t.attribute!=null&&t.attribute.length)for(var i=0;i<t.attribute.length;++i)v.onnx.AttributeProto.encode(t.attribute[i],o.uint32(42).fork()).ldelim();return t.docString!=null&&Object.hasOwnProperty.call(t,"docString")&&o.uint32(50).string(t.docString),t.domain!=null&&Object.hasOwnProperty.call(t,"domain")&&o.uint32(58).string(t.domain),o},e.encodeDelimited=function(t,o){return this.encode(t,o).ldelim()},e.decode=function(t,o){t instanceof G||(t=G.create(t));for(var i=o===void 0?t.len:t.pos+o,s=new v.onnx.NodeProto;t.pos<i;){var a=t.uint32();switch(a>>>3){case 1:{s.input&&s.input.length||(s.input=[]),s.input.push(t.string());break}case 2:{s.output&&s.output.length||(s.output=[]),s.output.push(t.string());break}case 3:{s.name=t.string();break}case 4:{s.opType=t.string();break}case 7:{s.domain=t.string();break}case 5:{s.attribute&&s.attribute.length||(s.attribute=[]),s.attribute.push(v.onnx.AttributeProto.decode(t,t.uint32()));break}case 6:{s.docString=t.string();break}default:t.skipType(a&7);break}}return s},e.decodeDelimited=function(t){return t instanceof G||(t=new G(t)),this.decode(t,t.uint32())},e.verify=function(t){if(typeof t!="object"||t===null)return"object expected";if(t.input!=null&&t.hasOwnProperty("input")){if(!Array.isArray(t.input))return"input: array expected";for(var o=0;o<t.input.length;++o)if(!I.isString(t.input[o]))return"input: string[] expected"}if(t.output!=null&&t.hasOwnProperty("output")){if(!Array.isArray(t.output))return"output: array expected";for(var o=0;o<t.output.length;++o)if(!I.isString(t.output[o]))return"output: string[] expected"}if(t.name!=null&&t.hasOwnProperty("name")&&!I.isString(t.name))return"name: string expected";if(t.opType!=null&&t.hasOwnProperty("opType")&&!I.isString(t.opType))return"opType: string expected";if(t.domain!=null&&t.hasOwnProperty("domain")&&!I.isString(t.domain))return"domain: string expected";if(t.attribute!=null&&t.hasOwnProperty("attribute")){if(!Array.isArray(t.attribute))return"attribute: array expected";for(var o=0;o<t.attribute.length;++o){var i=v.onnx.AttributeProto.verify(t.attribute[o]);if(i)return"attribute."+i}}return t.docString!=null&&t.hasOwnProperty("docString")&&!I.isString(t.docString)?"docString: string expected":null},e.fromObject=function(t){if(t instanceof v.onnx.NodeProto)return t;var o=new v.onnx.NodeProto;if(t.input){if(!Array.isArray(t.input))throw TypeError(".onnx.NodeProto.input: array expected");o.input=[];for(var i=0;i<t.input.length;++i)o.input[i]=String(t.input[i])}if(t.output){if(!Array.isArray(t.output))throw TypeError(".onnx.NodeProto.output: array expected");o.output=[];for(var i=0;i<t.output.length;++i)o.output[i]=String(t.output[i])}if(t.name!=null&&(o.name=String(t.name)),t.opType!=null&&(o.opType=String(t.opType)),t.domain!=null&&(o.domain=String(t.domain)),t.attribute){if(!Array.isArray(t.attribute))throw TypeError(".onnx.NodeProto.attribute: array expected");o.attribute=[];for(var i=0;i<t.attribute.length;++i){if(typeof t.attribute[i]!="object")throw TypeError(".onnx.NodeProto.attribute: object expected");o.attribute[i]=v.onnx.AttributeProto.fromObject(t.attribute[i])}}return t.docString!=null&&(o.docString=String(t.docString)),o},e.toObject=function(t,o){o||(o={});var i={};if((o.arrays||o.defaults)&&(i.input=[],i.output=[],i.attribute=[]),o.defaults&&(i.name="",i.opType="",i.docString="",i.domain=""),t.input&&t.input.length){i.input=[];for(var s=0;s<t.input.length;++s)i.input[s]=t.input[s]}if(t.output&&t.output.length){i.output=[];for(var s=0;s<t.output.length;++s)i.output[s]=t.output[s]}if(t.name!=null&&t.hasOwnProperty("name")&&(i.name=t.name),t.opType!=null&&t.hasOwnProperty("opType")&&(i.opType=t.opType),t.attribute&&t.attribute.length){i.attribute=[];for(var s=0;s<t.attribute.length;++s)i.attribute[s]=v.onnx.AttributeProto.toObject(t.attribute[s],o)}return t.docString!=null&&t.hasOwnProperty("docString")&&(i.docString=t.docString),t.domain!=null&&t.hasOwnProperty("domain")&&(i.domain=t.domain),i},e.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},e.getTypeUrl=function(t){return t===void 0&&(t="type.googleapis.com"),t+"/onnx.NodeProto"},e})(),r.TrainingInfoProto=(function(){function e(n){if(this.initializationBinding=[],this.updateBinding=[],n)for(var t=Object.keys(n),o=0;o<t.length;++o)n[t[o]]!=null&&(this[t[o]]=n[t[o]])}return e.prototype.initialization=null,e.prototype.algorithm=null,e.prototype.initializationBinding=I.emptyArray,e.prototype.updateBinding=I.emptyArray,e.create=function(t){return new e(t)},e.encode=function(t,o){if(o||(o=Me.create()),t.initialization!=null&&Object.hasOwnProperty.call(t,"initialization")&&v.onnx.GraphProto.encode(t.initialization,o.uint32(10).fork()).ldelim(),t.algorithm!=null&&Object.hasOwnProperty.call(t,"algorithm")&&v.onnx.GraphProto.encode(t.algorithm,o.uint32(18).fork()).ldelim(),t.initializationBinding!=null&&t.initializationBinding.length)for(var i=0;i<t.initializationBinding.length;++i)v.onnx.StringStringEntryProto.encode(t.initializationBinding[i],o.uint32(26).fork()).ldelim();if(t.updateBinding!=null&&t.updateBinding.length)for(var i=0;i<t.updateBinding.length;++i)v.onnx.StringStringEntryProto.encode(t.updateBinding[i],o.uint32(34).fork()).ldelim();return o},e.encodeDelimited=function(t,o){return this.encode(t,o).ldelim()},e.decode=function(t,o){t instanceof G||(t=G.create(t));for(var i=o===void 0?t.len:t.pos+o,s=new v.onnx.TrainingInfoProto;t.pos<i;){var a=t.uint32();switch(a>>>3){case 1:{s.initialization=v.onnx.GraphProto.decode(t,t.uint32());break}case 2:{s.algorithm=v.onnx.GraphProto.decode(t,t.uint32());break}case 3:{s.initializationBinding&&s.initializationBinding.length||(s.initializationBinding=[]),s.initializationBinding.push(v.onnx.StringStringEntryProto.decode(t,t.uint32()));break}case 4:{s.updateBinding&&s.updateBinding.length||(s.updateBinding=[]),s.updateBinding.push(v.onnx.StringStringEntryProto.decode(t,t.uint32()));break}default:t.skipType(a&7);break}}return s},e.decodeDelimited=function(t){return t instanceof G||(t=new G(t)),this.decode(t,t.uint32())},e.verify=function(t){if(typeof t!="object"||t===null)return"object expected";if(t.initialization!=null&&t.hasOwnProperty("initialization")){var o=v.onnx.GraphProto.verify(t.initialization);if(o)return"initialization."+o}if(t.algorithm!=null&&t.hasOwnProperty("algorithm")){var o=v.onnx.GraphProto.verify(t.algorithm);if(o)return"algorithm."+o}if(t.initializationBinding!=null&&t.hasOwnProperty("initializationBinding")){if(!Array.isArray(t.initializationBinding))return"initializationBinding: array expected";for(var i=0;i<t.initializationBinding.length;++i){var o=v.onnx.StringStringEntryProto.verify(t.initializationBinding[i]);if(o)return"initializationBinding."+o}}if(t.updateBinding!=null&&t.hasOwnProperty("updateBinding")){if(!Array.isArray(t.updateBinding))return"updateBinding: array expected";for(var i=0;i<t.updateBinding.length;++i){var o=v.onnx.StringStringEntryProto.verify(t.updateBinding[i]);if(o)return"updateBinding."+o}}return null},e.fromObject=function(t){if(t instanceof v.onnx.TrainingInfoProto)return t;var o=new v.onnx.TrainingInfoProto;if(t.initialization!=null){if(typeof t.initialization!="object")throw TypeError(".onnx.TrainingInfoProto.initialization: object expected");o.initialization=v.onnx.GraphProto.fromObject(t.initialization)}if(t.algorithm!=null){if(typeof t.algorithm!="object")throw TypeError(".onnx.TrainingInfoProto.algorithm: object expected");o.algorithm=v.onnx.GraphProto.fromObject(t.algorithm)}if(t.initializationBinding){if(!Array.isArray(t.initializationBinding))throw TypeError(".onnx.TrainingInfoProto.initializationBinding: array expected");o.initializationBinding=[];for(var i=0;i<t.initializationBinding.length;++i){if(typeof t.initializationBinding[i]!="object")throw TypeError(".onnx.TrainingInfoProto.initializationBinding: object expected");o.initializationBinding[i]=v.onnx.StringStringEntryProto.fromObject(t.initializationBinding[i])}}if(t.updateBinding){if(!Array.isArray(t.updateBinding))throw TypeError(".onnx.TrainingInfoProto.updateBinding: array expected");o.updateBinding=[];for(var i=0;i<t.updateBinding.length;++i){if(typeof t.updateBinding[i]!="object")throw TypeError(".onnx.TrainingInfoProto.updateBinding: object expected");o.updateBinding[i]=v.onnx.StringStringEntryProto.fromObject(t.updateBinding[i])}}return o},e.toObject=function(t,o){o||(o={});var i={};if((o.arrays||o.defaults)&&(i.initializationBinding=[],i.updateBinding=[]),o.defaults&&(i.initialization=null,i.algorithm=null),t.initialization!=null&&t.hasOwnProperty("initialization")&&(i.initialization=v.onnx.GraphProto.toObject(t.initialization,o)),t.algorithm!=null&&t.hasOwnProperty("algorithm")&&(i.algorithm=v.onnx.GraphProto.toObject(t.algorithm,o)),t.initializationBinding&&t.initializationBinding.length){i.initializationBinding=[];for(var s=0;s<t.initializationBinding.length;++s)i.initializationBinding[s]=v.onnx.StringStringEntryProto.toObject(t.initializationBinding[s],o)}if(t.updateBinding&&t.updateBinding.length){i.updateBinding=[];for(var s=0;s<t.updateBinding.length;++s)i.updateBinding[s]=v.onnx.StringStringEntryProto.toObject(t.updateBinding[s],o)}return i},e.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},e.getTypeUrl=function(t){return t===void 0&&(t="type.googleapis.com"),t+"/onnx.TrainingInfoProto"},e})(),r.ModelProto=(function(){function e(n){if(this.opsetImport=[],this.metadataProps=[],this.trainingInfo=[],this.functions=[],n)for(var t=Object.keys(n),o=0;o<t.length;++o)n[t[o]]!=null&&(this[t[o]]=n[t[o]])}return e.prototype.irVersion=I.Long?I.Long.fromBits(0,0,!1):0,e.prototype.opsetImport=I.emptyArray,e.prototype.producerName="",e.prototype.producerVersion="",e.prototype.domain="",e.prototype.modelVersion=I.Long?I.Long.fromBits(0,0,!1):0,e.prototype.docString="",e.prototype.graph=null,e.prototype.metadataProps=I.emptyArray,e.prototype.trainingInfo=I.emptyArray,e.prototype.functions=I.emptyArray,e.create=function(t){return new e(t)},e.encode=function(t,o){if(o||(o=Me.create()),t.irVersion!=null&&Object.hasOwnProperty.call(t,"irVersion")&&o.uint32(8).int64(t.irVersion),t.producerName!=null&&Object.hasOwnProperty.call(t,"producerName")&&o.uint32(18).string(t.producerName),t.producerVersion!=null&&Object.hasOwnProperty.call(t,"producerVersion")&&o.uint32(26).string(t.producerVersion),t.domain!=null&&Object.hasOwnProperty.call(t,"domain")&&o.uint32(34).string(t.domain),t.modelVersion!=null&&Object.hasOwnProperty.call(t,"modelVersion")&&o.uint32(40).int64(t.modelVersion),t.docString!=null&&Object.hasOwnProperty.call(t,"docString")&&o.uint32(50).string(t.docString),t.graph!=null&&Object.hasOwnProperty.call(t,"graph")&&v.onnx.GraphProto.encode(t.graph,o.uint32(58).fork()).ldelim(),t.opsetImport!=null&&t.opsetImport.length)for(var i=0;i<t.opsetImport.length;++i)v.onnx.OperatorSetIdProto.encode(t.opsetImport[i],o.uint32(66).fork()).ldelim();if(t.metadataProps!=null&&t.metadataProps.length)for(var i=0;i<t.metadataProps.length;++i)v.onnx.StringStringEntryProto.encode(t.metadataProps[i],o.uint32(114).fork()).ldelim();if(t.trainingInfo!=null&&t.trainingInfo.length)for(var i=0;i<t.trainingInfo.length;++i)v.onnx.TrainingInfoProto.encode(t.trainingInfo[i],o.uint32(162).fork()).ldelim();if(t.functions!=null&&t.functions.length)for(var i=0;i<t.functions.length;++i)v.onnx.FunctionProto.encode(t.functions[i],o.uint32(202).fork()).ldelim();return o},e.encodeDelimited=function(t,o){return this.encode(t,o).ldelim()},e.decode=function(t,o){t instanceof G||(t=G.create(t));for(var i=o===void 0?t.len:t.pos+o,s=new v.onnx.ModelProto;t.pos<i;){var a=t.uint32();switch(a>>>3){case 1:{s.irVersion=t.int64();break}case 8:{s.opsetImport&&s.opsetImport.length||(s.opsetImport=[]),s.opsetImport.push(v.onnx.OperatorSetIdProto.decode(t,t.uint32()));break}case 2:{s.producerName=t.string();break}case 3:{s.producerVersion=t.string();break}case 4:{s.domain=t.string();break}case 5:{s.modelVersion=t.int64();break}case 6:{s.docString=t.string();break}case 7:{s.graph=v.onnx.GraphProto.decode(t,t.uint32());break}case 14:{s.metadataProps&&s.metadataProps.length||(s.metadataProps=[]),s.metadataProps.push(v.onnx.StringStringEntryProto.decode(t,t.uint32()));break}case 20:{s.trainingInfo&&s.trainingInfo.length||(s.trainingInfo=[]),s.trainingInfo.push(v.onnx.TrainingInfoProto.decode(t,t.uint32()));break}case 25:{s.functions&&s.functions.length||(s.functions=[]),s.functions.push(v.onnx.FunctionProto.decode(t,t.uint32()));break}default:t.skipType(a&7);break}}return s},e.decodeDelimited=function(t){return t instanceof G||(t=new G(t)),this.decode(t,t.uint32())},e.verify=function(t){if(typeof t!="object"||t===null)return"object expected";if(t.irVersion!=null&&t.hasOwnProperty("irVersion")&&!I.isInteger(t.irVersion)&&!(t.irVersion&&I.isInteger(t.irVersion.low)&&I.isInteger(t.irVersion.high)))return"irVersion: integer|Long expected";if(t.opsetImport!=null&&t.hasOwnProperty("opsetImport")){if(!Array.isArray(t.opsetImport))return"opsetImport: array expected";for(var o=0;o<t.opsetImport.length;++o){var i=v.onnx.OperatorSetIdProto.verify(t.opsetImport[o]);if(i)return"opsetImport."+i}}if(t.producerName!=null&&t.hasOwnProperty("producerName")&&!I.isString(t.producerName))return"producerName: string expected";if(t.producerVersion!=null&&t.hasOwnProperty("producerVersion")&&!I.isString(t.producerVersion))return"producerVersion: string expected";if(t.domain!=null&&t.hasOwnProperty("domain")&&!I.isString(t.domain))return"domain: string expected";if(t.modelVersion!=null&&t.hasOwnProperty("modelVersion")&&!I.isInteger(t.modelVersion)&&!(t.modelVersion&&I.isInteger(t.modelVersion.low)&&I.isInteger(t.modelVersion.high)))return"modelVersion: integer|Long expected";if(t.docString!=null&&t.hasOwnProperty("docString")&&!I.isString(t.docString))return"docString: string expected";if(t.graph!=null&&t.hasOwnProperty("graph")){var i=v.onnx.GraphProto.verify(t.graph);if(i)return"graph."+i}if(t.metadataProps!=null&&t.hasOwnProperty("metadataProps")){if(!Array.isArray(t.metadataProps))return"metadataProps: array expected";for(var o=0;o<t.metadataProps.length;++o){var i=v.onnx.StringStringEntryProto.verify(t.metadataProps[o]);if(i)return"metadataProps."+i}}if(t.trainingInfo!=null&&t.hasOwnProperty("trainingInfo")){if(!Array.isArray(t.trainingInfo))return"trainingInfo: array expected";for(var o=0;o<t.trainingInfo.length;++o){var i=v.onnx.TrainingInfoProto.verify(t.trainingInfo[o]);if(i)return"trainingInfo."+i}}if(t.functions!=null&&t.hasOwnProperty("functions")){if(!Array.isArray(t.functions))return"functions: array expected";for(var o=0;o<t.functions.length;++o){var i=v.onnx.FunctionProto.verify(t.functions[o]);if(i)return"functions."+i}}return null},e.fromObject=function(t){if(t instanceof v.onnx.ModelProto)return t;var o=new v.onnx.ModelProto;if(t.irVersion!=null&&(I.Long?(o.irVersion=I.Long.fromValue(t.irVersion)).unsigned=!1:typeof t.irVersion=="string"?o.irVersion=parseInt(t.irVersion,10):typeof t.irVersion=="number"?o.irVersion=t.irVersion:typeof t.irVersion=="object"&&(o.irVersion=new I.LongBits(t.irVersion.low>>>0,t.irVersion.high>>>0).toNumber())),t.opsetImport){if(!Array.isArray(t.opsetImport))throw TypeError(".onnx.ModelProto.opsetImport: array expected");o.opsetImport=[];for(var i=0;i<t.opsetImport.length;++i){if(typeof t.opsetImport[i]!="object")throw TypeError(".onnx.ModelProto.opsetImport: object expected");o.opsetImport[i]=v.onnx.OperatorSetIdProto.fromObject(t.opsetImport[i])}}if(t.producerName!=null&&(o.producerName=String(t.producerName)),t.producerVersion!=null&&(o.producerVersion=String(t.producerVersion)),t.domain!=null&&(o.domain=String(t.domain)),t.modelVersion!=null&&(I.Long?(o.modelVersion=I.Long.fromValue(t.modelVersion)).unsigned=!1:typeof t.modelVersion=="string"?o.modelVersion=parseInt(t.modelVersion,10):typeof t.modelVersion=="number"?o.modelVersion=t.modelVersion:typeof t.modelVersion=="object"&&(o.modelVersion=new I.LongBits(t.modelVersion.low>>>0,t.modelVersion.high>>>0).toNumber())),t.docString!=null&&(o.docString=String(t.docString)),t.graph!=null){if(typeof t.graph!="object")throw TypeError(".onnx.ModelProto.graph: object expected");o.graph=v.onnx.GraphProto.fromObject(t.graph)}if(t.metadataProps){if(!Array.isArray(t.metadataProps))throw TypeError(".onnx.ModelProto.metadataProps: array expected");o.metadataProps=[];for(var i=0;i<t.metadataProps.length;++i){if(typeof t.metadataProps[i]!="object")throw TypeError(".onnx.ModelProto.metadataProps: object expected");o.metadataProps[i]=v.onnx.StringStringEntryProto.fromObject(t.metadataProps[i])}}if(t.trainingInfo){if(!Array.isArray(t.trainingInfo))throw TypeError(".onnx.ModelProto.trainingInfo: array expected");o.trainingInfo=[];for(var i=0;i<t.trainingInfo.length;++i){if(typeof t.trainingInfo[i]!="object")throw TypeError(".onnx.ModelProto.trainingInfo: object expected");o.trainingInfo[i]=v.onnx.TrainingInfoProto.fromObject(t.trainingInfo[i])}}if(t.functions){if(!Array.isArray(t.functions))throw TypeError(".onnx.ModelProto.functions: array expected");o.functions=[];for(var i=0;i<t.functions.length;++i){if(typeof t.functions[i]!="object")throw TypeError(".onnx.ModelProto.functions: object expected");o.functions[i]=v.onnx.FunctionProto.fromObject(t.functions[i])}}return o},e.toObject=function(t,o){o||(o={});var i={};if((o.arrays||o.defaults)&&(i.opsetImport=[],i.metadataProps=[],i.trainingInfo=[],i.functions=[]),o.defaults){if(I.Long){var s=new I.Long(0,0,!1);i.irVersion=o.longs===String?s.toString():o.longs===Number?s.toNumber():s}else i.irVersion=o.longs===String?"0":0;if(i.producerName="",i.producerVersion="",i.domain="",I.Long){var s=new I.Long(0,0,!1);i.modelVersion=o.longs===String?s.toString():o.longs===Number?s.toNumber():s}else i.modelVersion=o.longs===String?"0":0;i.docString="",i.graph=null}if(t.irVersion!=null&&t.hasOwnProperty("irVersion")&&(typeof t.irVersion=="number"?i.irVersion=o.longs===String?String(t.irVersion):t.irVersion:i.irVersion=o.longs===String?I.Long.prototype.toString.call(t.irVersion):o.longs===Number?new I.LongBits(t.irVersion.low>>>0,t.irVersion.high>>>0).toNumber():t.irVersion),t.producerName!=null&&t.hasOwnProperty("producerName")&&(i.producerName=t.producerName),t.producerVersion!=null&&t.hasOwnProperty("producerVersion")&&(i.producerVersion=t.producerVersion),t.domain!=null&&t.hasOwnProperty("domain")&&(i.domain=t.domain),t.modelVersion!=null&&t.hasOwnProperty("modelVersion")&&(typeof t.modelVersion=="number"?i.modelVersion=o.longs===String?String(t.modelVersion):t.modelVersion:i.modelVersion=o.longs===String?I.Long.prototype.toString.call(t.modelVersion):o.longs===Number?new I.LongBits(t.modelVersion.low>>>0,t.modelVersion.high>>>0).toNumber():t.modelVersion),t.docString!=null&&t.hasOwnProperty("docString")&&(i.docString=t.docString),t.graph!=null&&t.hasOwnProperty("graph")&&(i.graph=v.onnx.GraphProto.toObject(t.graph,o)),t.opsetImport&&t.opsetImport.length){i.opsetImport=[];for(var a=0;a<t.opsetImport.length;++a)i.opsetImport[a]=v.onnx.OperatorSetIdProto.toObject(t.opsetImport[a],o)}if(t.metadataProps&&t.metadataProps.length){i.metadataProps=[];for(var a=0;a<t.metadataProps.length;++a)i.metadataProps[a]=v.onnx.StringStringEntryProto.toObject(t.metadataProps[a],o)}if(t.trainingInfo&&t.trainingInfo.length){i.trainingInfo=[];for(var a=0;a<t.trainingInfo.length;++a)i.trainingInfo[a]=v.onnx.TrainingInfoProto.toObject(t.trainingInfo[a],o)}if(t.functions&&t.functions.length){i.functions=[];for(var a=0;a<t.functions.length;++a)i.functions[a]=v.onnx.FunctionProto.toObject(t.functions[a],o)}return i},e.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},e.getTypeUrl=function(t){return t===void 0&&(t="type.googleapis.com"),t+"/onnx.ModelProto"},e})(),r.StringStringEntryProto=(function(){function e(n){if(n)for(var t=Object.keys(n),o=0;o<t.length;++o)n[t[o]]!=null&&(this[t[o]]=n[t[o]])}return e.prototype.key="",e.prototype.value="",e.create=function(t){return new e(t)},e.encode=function(t,o){return o||(o=Me.create()),t.key!=null&&Object.hasOwnProperty.call(t,"key")&&o.uint32(10).string(t.key),t.value!=null&&Object.hasOwnProperty.call(t,"value")&&o.uint32(18).string(t.value),o},e.encodeDelimited=function(t,o){return this.encode(t,o).ldelim()},e.decode=function(t,o){t instanceof G||(t=G.create(t));for(var i=o===void 0?t.len:t.pos+o,s=new v.onnx.StringStringEntryProto;t.pos<i;){var a=t.uint32();switch(a>>>3){case 1:{s.key=t.string();break}case 2:{s.value=t.string();break}default:t.skipType(a&7);break}}return s},e.decodeDelimited=function(t){return t instanceof G||(t=new G(t)),this.decode(t,t.uint32())},e.verify=function(t){return typeof t!="object"||t===null?"object expected":t.key!=null&&t.hasOwnProperty("key")&&!I.isString(t.key)?"key: string expected":t.value!=null&&t.hasOwnProperty("value")&&!I.isString(t.value)?"value: string expected":null},e.fromObject=function(t){if(t instanceof v.onnx.StringStringEntryProto)return t;var o=new v.onnx.StringStringEntryProto;return t.key!=null&&(o.key=String(t.key)),t.value!=null&&(o.value=String(t.value)),o},e.toObject=function(t,o){o||(o={});var i={};return o.defaults&&(i.key="",i.value=""),t.key!=null&&t.hasOwnProperty("key")&&(i.key=t.key),t.value!=null&&t.hasOwnProperty("value")&&(i.value=t.value),i},e.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},e.getTypeUrl=function(t){return t===void 0&&(t="type.googleapis.com"),t+"/onnx.StringStringEntryProto"},e})(),r.TensorAnnotation=(function(){function e(n){if(this.quantParameterTensorNames=[],n)for(var t=Object.keys(n),o=0;o<t.length;++o)n[t[o]]!=null&&(this[t[o]]=n[t[o]])}return e.prototype.tensorName="",e.prototype.quantParameterTensorNames=I.emptyArray,e.create=function(t){return new e(t)},e.encode=function(t,o){if(o||(o=Me.create()),t.tensorName!=null&&Object.hasOwnProperty.call(t,"tensorName")&&o.uint32(10).string(t.tensorName),t.quantParameterTensorNames!=null&&t.quantParameterTensorNames.length)for(var i=0;i<t.quantParameterTensorNames.length;++i)v.onnx.StringStringEntryProto.encode(t.quantParameterTensorNames[i],o.uint32(18).fork()).ldelim();return o},e.encodeDelimited=function(t,o){return this.encode(t,o).ldelim()},e.decode=function(t,o){t instanceof G||(t=G.create(t));for(var i=o===void 0?t.len:t.pos+o,s=new v.onnx.TensorAnnotation;t.pos<i;){var a=t.uint32();switch(a>>>3){case 1:{s.tensorName=t.string();break}case 2:{s.quantParameterTensorNames&&s.quantParameterTensorNames.length||(s.quantParameterTensorNames=[]),s.quantParameterTensorNames.push(v.onnx.StringStringEntryProto.decode(t,t.uint32()));break}default:t.skipType(a&7);break}}return s},e.decodeDelimited=function(t){return t instanceof G||(t=new G(t)),this.decode(t,t.uint32())},e.verify=function(t){if(typeof t!="object"||t===null)return"object expected";if(t.tensorName!=null&&t.hasOwnProperty("tensorName")&&!I.isString(t.tensorName))return"tensorName: string expected";if(t.quantParameterTensorNames!=null&&t.hasOwnProperty("quantParameterTensorNames")){if(!Array.isArray(t.quantParameterTensorNames))return"quantParameterTensorNames: array expected";for(var o=0;o<t.quantParameterTensorNames.length;++o){var i=v.onnx.StringStringEntryProto.verify(t.quantParameterTensorNames[o]);if(i)return"quantParameterTensorNames."+i}}return null},e.fromObject=function(t){if(t instanceof v.onnx.TensorAnnotation)return t;var o=new v.onnx.TensorAnnotation;if(t.tensorName!=null&&(o.tensorName=String(t.tensorName)),t.quantParameterTensorNames){if(!Array.isArray(t.quantParameterTensorNames))throw TypeError(".onnx.TensorAnnotation.quantParameterTensorNames: array expected");o.quantParameterTensorNames=[];for(var i=0;i<t.quantParameterTensorNames.length;++i){if(typeof t.quantParameterTensorNames[i]!="object")throw TypeError(".onnx.TensorAnnotation.quantParameterTensorNames: object expected");o.quantParameterTensorNames[i]=v.onnx.StringStringEntryProto.fromObject(t.quantParameterTensorNames[i])}}return o},e.toObject=function(t,o){o||(o={});var i={};if((o.arrays||o.defaults)&&(i.quantParameterTensorNames=[]),o.defaults&&(i.tensorName=""),t.tensorName!=null&&t.hasOwnProperty("tensorName")&&(i.tensorName=t.tensorName),t.quantParameterTensorNames&&t.quantParameterTensorNames.length){i.quantParameterTensorNames=[];for(var s=0;s<t.quantParameterTensorNames.length;++s)i.quantParameterTensorNames[s]=v.onnx.StringStringEntryProto.toObject(t.quantParameterTensorNames[s],o)}return i},e.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},e.getTypeUrl=function(t){return t===void 0&&(t="type.googleapis.com"),t+"/onnx.TensorAnnotation"},e})(),r.GraphProto=(function(){function e(n){if(this.node=[],this.initializer=[],this.sparseInitializer=[],this.input=[],this.output=[],this.valueInfo=[],this.quantizationAnnotation=[],n)for(var t=Object.keys(n),o=0;o<t.length;++o)n[t[o]]!=null&&(this[t[o]]=n[t[o]])}return e.prototype.node=I.emptyArray,e.prototype.name="",e.prototype.initializer=I.emptyArray,e.prototype.sparseInitializer=I.emptyArray,e.prototype.docString="",e.prototype.input=I.emptyArray,e.prototype.output=I.emptyArray,e.prototype.valueInfo=I.emptyArray,e.prototype.quantizationAnnotation=I.emptyArray,e.create=function(t){return new e(t)},e.encode=function(t,o){if(o||(o=Me.create()),t.node!=null&&t.node.length)for(var i=0;i<t.node.length;++i)v.onnx.NodeProto.encode(t.node[i],o.uint32(10).fork()).ldelim();if(t.name!=null&&Object.hasOwnProperty.call(t,"name")&&o.uint32(18).string(t.name),t.initializer!=null&&t.initializer.length)for(var i=0;i<t.initializer.length;++i)v.onnx.TensorProto.encode(t.initializer[i],o.uint32(42).fork()).ldelim();if(t.docString!=null&&Object.hasOwnProperty.call(t,"docString")&&o.uint32(82).string(t.docString),t.input!=null&&t.input.length)for(var i=0;i<t.input.length;++i)v.onnx.ValueInfoProto.encode(t.input[i],o.uint32(90).fork()).ldelim();if(t.output!=null&&t.output.length)for(var i=0;i<t.output.length;++i)v.onnx.ValueInfoProto.encode(t.output[i],o.uint32(98).fork()).ldelim();if(t.valueInfo!=null&&t.valueInfo.length)for(var i=0;i<t.valueInfo.length;++i)v.onnx.ValueInfoProto.encode(t.valueInfo[i],o.uint32(106).fork()).ldelim();if(t.quantizationAnnotation!=null&&t.quantizationAnnotation.length)for(var i=0;i<t.quantizationAnnotation.length;++i)v.onnx.TensorAnnotation.encode(t.quantizationAnnotation[i],o.uint32(114).fork()).ldelim();if(t.sparseInitializer!=null&&t.sparseInitializer.length)for(var i=0;i<t.sparseInitializer.length;++i)v.onnx.SparseTensorProto.encode(t.sparseInitializer[i],o.uint32(122).fork()).ldelim();return o},e.encodeDelimited=function(t,o){return this.encode(t,o).ldelim()},e.decode=function(t,o){t instanceof G||(t=G.create(t));for(var i=o===void 0?t.len:t.pos+o,s=new v.onnx.GraphProto;t.pos<i;){var a=t.uint32();switch(a>>>3){case 1:{s.node&&s.node.length||(s.node=[]),s.node.push(v.onnx.NodeProto.decode(t,t.uint32()));break}case 2:{s.name=t.string();break}case 5:{s.initializer&&s.initializer.length||(s.initializer=[]),s.initializer.push(v.onnx.TensorProto.decode(t,t.uint32()));break}case 15:{s.sparseInitializer&&s.sparseInitializer.length||(s.sparseInitializer=[]),s.sparseInitializer.push(v.onnx.SparseTensorProto.decode(t,t.uint32()));break}case 10:{s.docString=t.string();break}case 11:{s.input&&s.input.length||(s.input=[]),s.input.push(v.onnx.ValueInfoProto.decode(t,t.uint32()));break}case 12:{s.output&&s.output.length||(s.output=[]),s.output.push(v.onnx.ValueInfoProto.decode(t,t.uint32()));break}case 13:{s.valueInfo&&s.valueInfo.length||(s.valueInfo=[]),s.valueInfo.push(v.onnx.ValueInfoProto.decode(t,t.uint32()));break}case 14:{s.quantizationAnnotation&&s.quantizationAnnotation.length||(s.quantizationAnnotation=[]),s.quantizationAnnotation.push(v.onnx.TensorAnnotation.decode(t,t.uint32()));break}default:t.skipType(a&7);break}}return s},e.decodeDelimited=function(t){return t instanceof G||(t=new G(t)),this.decode(t,t.uint32())},e.verify=function(t){if(typeof t!="object"||t===null)return"object expected";if(t.node!=null&&t.hasOwnProperty("node")){if(!Array.isArray(t.node))return"node: array expected";for(var o=0;o<t.node.length;++o){var i=v.onnx.NodeProto.verify(t.node[o]);if(i)return"node."+i}}if(t.name!=null&&t.hasOwnProperty("name")&&!I.isString(t.name))return"name: string expected";if(t.initializer!=null&&t.hasOwnProperty("initializer")){if(!Array.isArray(t.initializer))return"initializer: array expected";for(var o=0;o<t.initializer.length;++o){var i=v.onnx.TensorProto.verify(t.initializer[o]);if(i)return"initializer."+i}}if(t.sparseInitializer!=null&&t.hasOwnProperty("sparseInitializer")){if(!Array.isArray(t.sparseInitializer))return"sparseInitializer: array expected";for(var o=0;o<t.sparseInitializer.length;++o){var i=v.onnx.SparseTensorProto.verify(t.sparseInitializer[o]);if(i)return"sparseInitializer."+i}}if(t.docString!=null&&t.hasOwnProperty("docString")&&!I.isString(t.docString))return"docString: string expected";if(t.input!=null&&t.hasOwnProperty("input")){if(!Array.isArray(t.input))return"input: array expected";for(var o=0;o<t.input.length;++o){var i=v.onnx.ValueInfoProto.verify(t.input[o]);if(i)return"input."+i}}if(t.output!=null&&t.hasOwnProperty("output")){if(!Array.isArray(t.output))return"output: array expected";for(var o=0;o<t.output.length;++o){var i=v.onnx.ValueInfoProto.verify(t.output[o]);if(i)return"output."+i}}if(t.valueInfo!=null&&t.hasOwnProperty("valueInfo")){if(!Array.isArray(t.valueInfo))return"valueInfo: array expected";for(var o=0;o<t.valueInfo.length;++o){var i=v.onnx.ValueInfoProto.verify(t.valueInfo[o]);if(i)return"valueInfo."+i}}if(t.quantizationAnnotation!=null&&t.hasOwnProperty("quantizationAnnotation")){if(!Array.isArray(t.quantizationAnnotation))return"quantizationAnnotation: array expected";for(var o=0;o<t.quantizationAnnotation.length;++o){var i=v.onnx.TensorAnnotation.verify(t.quantizationAnnotation[o]);if(i)return"quantizationAnnotation."+i}}return null},e.fromObject=function(t){if(t instanceof v.onnx.GraphProto)return t;var o=new v.onnx.GraphProto;if(t.node){if(!Array.isArray(t.node))throw TypeError(".onnx.GraphProto.node: array expected");o.node=[];for(var i=0;i<t.node.length;++i){if(typeof t.node[i]!="object")throw TypeError(".onnx.GraphProto.node: object expected");o.node[i]=v.onnx.NodeProto.fromObject(t.node[i])}}if(t.name!=null&&(o.name=String(t.name)),t.initializer){if(!Array.isArray(t.initializer))throw TypeError(".onnx.GraphProto.initializer: array expected");o.initializer=[];for(var i=0;i<t.initializer.length;++i){if(typeof t.initializer[i]!="object")throw TypeError(".onnx.GraphProto.initializer: object expected");o.initializer[i]=v.onnx.TensorProto.fromObject(t.initializer[i])}}if(t.sparseInitializer){if(!Array.isArray(t.sparseInitializer))throw TypeError(".onnx.GraphProto.sparseInitializer: array expected");o.sparseInitializer=[];for(var i=0;i<t.sparseInitializer.length;++i){if(typeof t.sparseInitializer[i]!="object")throw TypeError(".onnx.GraphProto.sparseInitializer: object expected");o.sparseInitializer[i]=v.onnx.SparseTensorProto.fromObject(t.sparseInitializer[i])}}if(t.docString!=null&&(o.docString=String(t.docString)),t.input){if(!Array.isArray(t.input))throw TypeError(".onnx.GraphProto.input: array expected");o.input=[];for(var i=0;i<t.input.length;++i){if(typeof t.input[i]!="object")throw TypeError(".onnx.GraphProto.input: object expected");o.input[i]=v.onnx.ValueInfoProto.fromObject(t.input[i])}}if(t.output){if(!Array.isArray(t.output))throw TypeError(".onnx.GraphProto.output: array expected");o.output=[];for(var i=0;i<t.output.length;++i){if(typeof t.output[i]!="object")throw TypeError(".onnx.GraphProto.output: object expected");o.output[i]=v.onnx.ValueInfoProto.fromObject(t.output[i])}}if(t.valueInfo){if(!Array.isArray(t.valueInfo))throw TypeError(".onnx.GraphProto.valueInfo: array expected");o.valueInfo=[];for(var i=0;i<t.valueInfo.length;++i){if(typeof t.valueInfo[i]!="object")throw TypeError(".onnx.GraphProto.valueInfo: object expected");o.valueInfo[i]=v.onnx.ValueInfoProto.fromObject(t.valueInfo[i])}}if(t.quantizationAnnotation){if(!Array.isArray(t.quantizationAnnotation))throw TypeError(".onnx.GraphProto.quantizationAnnotation: array expected");o.quantizationAnnotation=[];for(var i=0;i<t.quantizationAnnotation.length;++i){if(typeof t.quantizationAnnotation[i]!="object")throw TypeError(".onnx.GraphProto.quantizationAnnotation: object expected");o.quantizationAnnotation[i]=v.onnx.TensorAnnotation.fromObject(t.quantizationAnnotation[i])}}return o},e.toObject=function(t,o){o||(o={});var i={};if((o.arrays||o.defaults)&&(i.node=[],i.initializer=[],i.input=[],i.output=[],i.valueInfo=[],i.quantizationAnnotation=[],i.sparseInitializer=[]),o.defaults&&(i.name="",i.docString=""),t.node&&t.node.length){i.node=[];for(var s=0;s<t.node.length;++s)i.node[s]=v.onnx.NodeProto.toObject(t.node[s],o)}if(t.name!=null&&t.hasOwnProperty("name")&&(i.name=t.name),t.initializer&&t.initializer.length){i.initializer=[];for(var s=0;s<t.initializer.length;++s)i.initializer[s]=v.onnx.TensorProto.toObject(t.initializer[s],o)}if(t.docString!=null&&t.hasOwnProperty("docString")&&(i.docString=t.docString),t.input&&t.input.length){i.input=[];for(var s=0;s<t.input.length;++s)i.input[s]=v.onnx.ValueInfoProto.toObject(t.input[s],o)}if(t.output&&t.output.length){i.output=[];for(var s=0;s<t.output.length;++s)i.output[s]=v.onnx.ValueInfoProto.toObject(t.output[s],o)}if(t.valueInfo&&t.valueInfo.length){i.valueInfo=[];for(var s=0;s<t.valueInfo.length;++s)i.valueInfo[s]=v.onnx.ValueInfoProto.toObject(t.valueInfo[s],o)}if(t.quantizationAnnotation&&t.quantizationAnnotation.length){i.quantizationAnnotation=[];for(var s=0;s<t.quantizationAnnotation.length;++s)i.quantizationAnnotation[s]=v.onnx.TensorAnnotation.toObject(t.quantizationAnnotation[s],o)}if(t.sparseInitializer&&t.sparseInitializer.length){i.sparseInitializer=[];for(var s=0;s<t.sparseInitializer.length;++s)i.sparseInitializer[s]=v.onnx.SparseTensorProto.toObject(t.sparseInitializer[s],o)}return i},e.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},e.getTypeUrl=function(t){return t===void 0&&(t="type.googleapis.com"),t+"/onnx.GraphProto"},e})(),r.TensorProto=(function(){function e(n){if(this.dims=[],this.floatData=[],this.int32Data=[],this.stringData=[],this.int64Data=[],this.externalData=[],this.doubleData=[],this.uint64Data=[],n)for(var t=Object.keys(n),o=0;o<t.length;++o)n[t[o]]!=null&&(this[t[o]]=n[t[o]])}return e.prototype.dims=I.emptyArray,e.prototype.dataType=0,e.prototype.segment=null,e.prototype.floatData=I.emptyArray,e.prototype.int32Data=I.emptyArray,e.prototype.stringData=I.emptyArray,e.prototype.int64Data=I.emptyArray,e.prototype.name="",e.prototype.docString="",e.prototype.rawData=I.newBuffer([]),e.prototype.externalData=I.emptyArray,e.prototype.dataLocation=0,e.prototype.doubleData=I.emptyArray,e.prototype.uint64Data=I.emptyArray,e.create=function(t){return new e(t)},e.encode=function(t,o){if(o||(o=Me.create()),t.dims!=null&&t.dims.length){o.uint32(10).fork();for(var i=0;i<t.dims.length;++i)o.int64(t.dims[i]);o.ldelim()}if(t.dataType!=null&&Object.hasOwnProperty.call(t,"dataType")&&o.uint32(16).int32(t.dataType),t.segment!=null&&Object.hasOwnProperty.call(t,"segment")&&v.onnx.TensorProto.Segment.encode(t.segment,o.uint32(26).fork()).ldelim(),t.floatData!=null&&t.floatData.length){o.uint32(34).fork();for(var i=0;i<t.floatData.length;++i)o.float(t.floatData[i]);o.ldelim()}if(t.int32Data!=null&&t.int32Data.length){o.uint32(42).fork();for(var i=0;i<t.int32Data.length;++i)o.int32(t.int32Data[i]);o.ldelim()}if(t.stringData!=null&&t.stringData.length)for(var i=0;i<t.stringData.length;++i)o.uint32(50).bytes(t.stringData[i]);if(t.int64Data!=null&&t.int64Data.length){o.uint32(58).fork();for(var i=0;i<t.int64Data.length;++i)o.int64(t.int64Data[i]);o.ldelim()}if(t.name!=null&&Object.hasOwnProperty.call(t,"name")&&o.uint32(66).string(t.name),t.rawData!=null&&Object.hasOwnProperty.call(t,"rawData")&&o.uint32(74).bytes(t.rawData),t.doubleData!=null&&t.doubleData.length){o.uint32(82).fork();for(var i=0;i<t.doubleData.length;++i)o.double(t.doubleData[i]);o.ldelim()}if(t.uint64Data!=null&&t.uint64Data.length){o.uint32(90).fork();for(var i=0;i<t.uint64Data.length;++i)o.uint64(t.uint64Data[i]);o.ldelim()}if(t.docString!=null&&Object.hasOwnProperty.call(t,"docString")&&o.uint32(98).string(t.docString),t.externalData!=null&&t.externalData.length)for(var i=0;i<t.externalData.length;++i)v.onnx.StringStringEntryProto.encode(t.externalData[i],o.uint32(106).fork()).ldelim();return t.dataLocation!=null&&Object.hasOwnProperty.call(t,"dataLocation")&&o.uint32(112).int32(t.dataLocation),o},e.encodeDelimited=function(t,o){return this.encode(t,o).ldelim()},e.decode=function(t,o){t instanceof G||(t=G.create(t));for(var i=o===void 0?t.len:t.pos+o,s=new v.onnx.TensorProto;t.pos<i;){var a=t.uint32();switch(a>>>3){case 1:{if(s.dims&&s.dims.length||(s.dims=[]),(a&7)===2)for(var u=t.uint32()+t.pos;t.pos<u;)s.dims.push(t.int64());else s.dims.push(t.int64());break}case 2:{s.dataType=t.int32();break}case 3:{s.segment=v.onnx.TensorProto.Segment.decode(t,t.uint32());break}case 4:{if(s.floatData&&s.floatData.length||(s.floatData=[]),(a&7)===2)for(var u=t.uint32()+t.pos;t.pos<u;)s.floatData.push(t.float());else s.floatData.push(t.float());break}case 5:{if(s.int32Data&&s.int32Data.length||(s.int32Data=[]),(a&7)===2)for(var u=t.uint32()+t.pos;t.pos<u;)s.int32Data.push(t.int32());else s.int32Data.push(t.int32());break}case 6:{s.stringData&&s.stringData.length||(s.stringData=[]),s.stringData.push(t.bytes());break}case 7:{if(s.int64Data&&s.int64Data.length||(s.int64Data=[]),(a&7)===2)for(var u=t.uint32()+t.pos;t.pos<u;)s.int64Data.push(t.int64());else s.int64Data.push(t.int64());break}case 8:{s.name=t.string();break}case 12:{s.docString=t.string();break}case 9:{s.rawData=t.bytes();break}case 13:{s.externalData&&s.externalData.length||(s.externalData=[]),s.externalData.push(v.onnx.StringStringEntryProto.decode(t,t.uint32()));break}case 14:{s.dataLocation=t.int32();break}case 10:{if(s.doubleData&&s.doubleData.length||(s.doubleData=[]),(a&7)===2)for(var u=t.uint32()+t.pos;t.pos<u;)s.doubleData.push(t.double());else s.doubleData.push(t.double());break}case 11:{if(s.uint64Data&&s.uint64Data.length||(s.uint64Data=[]),(a&7)===2)for(var u=t.uint32()+t.pos;t.pos<u;)s.uint64Data.push(t.uint64());else s.uint64Data.push(t.uint64());break}default:t.skipType(a&7);break}}return s},e.decodeDelimited=function(t){return t instanceof G||(t=new G(t)),this.decode(t,t.uint32())},e.verify=function(t){if(typeof t!="object"||t===null)return"object expected";if(t.dims!=null&&t.hasOwnProperty("dims")){if(!Array.isArray(t.dims))return"dims: array expected";for(var o=0;o<t.dims.length;++o)if(!I.isInteger(t.dims[o])&&!(t.dims[o]&&I.isInteger(t.dims[o].low)&&I.isInteger(t.dims[o].high)))return"dims: integer|Long[] expected"}if(t.dataType!=null&&t.hasOwnProperty("dataType")&&!I.isInteger(t.dataType))return"dataType: integer expected";if(t.segment!=null&&t.hasOwnProperty("segment")){var i=v.onnx.TensorProto.Segment.verify(t.segment);if(i)return"segment."+i}if(t.floatData!=null&&t.hasOwnProperty("floatData")){if(!Array.isArray(t.floatData))return"floatData: array expected";for(var o=0;o<t.floatData.length;++o)if(typeof t.floatData[o]!="number")return"floatData: number[] expected"}if(t.int32Data!=null&&t.hasOwnProperty("int32Data")){if(!Array.isArray(t.int32Data))return"int32Data: array expected";for(var o=0;o<t.int32Data.length;++o)if(!I.isInteger(t.int32Data[o]))return"int32Data: integer[] expected"}if(t.stringData!=null&&t.hasOwnProperty("stringData")){if(!Array.isArray(t.stringData))return"stringData: array expected";for(var o=0;o<t.stringData.length;++o)if(!(t.stringData[o]&&typeof t.stringData[o].length=="number"||I.isString(t.stringData[o])))return"stringData: buffer[] expected"}if(t.int64Data!=null&&t.hasOwnProperty("int64Data")){if(!Array.isArray(t.int64Data))return"int64Data: array expected";for(var o=0;o<t.int64Data.length;++o)if(!I.isInteger(t.int64Data[o])&&!(t.int64Data[o]&&I.isInteger(t.int64Data[o].low)&&I.isInteger(t.int64Data[o].high)))return"int64Data: integer|Long[] expected"}if(t.name!=null&&t.hasOwnProperty("name")&&!I.isString(t.name))return"name: string expected";if(t.docString!=null&&t.hasOwnProperty("docString")&&!I.isString(t.docString))return"docString: string expected";if(t.rawData!=null&&t.hasOwnProperty("rawData")&&!(t.rawData&&typeof t.rawData.length=="number"||I.isString(t.rawData)))return"rawData: buffer expected";if(t.externalData!=null&&t.hasOwnProperty("externalData")){if(!Array.isArray(t.externalData))return"externalData: array expected";for(var o=0;o<t.externalData.length;++o){var i=v.onnx.StringStringEntryProto.verify(t.externalData[o]);if(i)return"externalData."+i}}if(t.dataLocation!=null&&t.hasOwnProperty("dataLocation"))switch(t.dataLocation){default:return"dataLocation: enum value expected";case 0:case 1:break}if(t.doubleData!=null&&t.hasOwnProperty("doubleData")){if(!Array.isArray(t.doubleData))return"doubleData: array expected";for(var o=0;o<t.doubleData.length;++o)if(typeof t.doubleData[o]!="number")return"doubleData: number[] expected"}if(t.uint64Data!=null&&t.hasOwnProperty("uint64Data")){if(!Array.isArray(t.uint64Data))return"uint64Data: array expected";for(var o=0;o<t.uint64Data.length;++o)if(!I.isInteger(t.uint64Data[o])&&!(t.uint64Data[o]&&I.isInteger(t.uint64Data[o].low)&&I.isInteger(t.uint64Data[o].high)))return"uint64Data: integer|Long[] expected"}return null},e.fromObject=function(t){if(t instanceof v.onnx.TensorProto)return t;var o=new v.onnx.TensorProto;if(t.dims){if(!Array.isArray(t.dims))throw TypeError(".onnx.TensorProto.dims: array expected");o.dims=[];for(var i=0;i<t.dims.length;++i)I.Long?(o.dims[i]=I.Long.fromValue(t.dims[i])).unsigned=!1:typeof t.dims[i]=="string"?o.dims[i]=parseInt(t.dims[i],10):typeof t.dims[i]=="number"?o.dims[i]=t.dims[i]:typeof t.dims[i]=="object"&&(o.dims[i]=new I.LongBits(t.dims[i].low>>>0,t.dims[i].high>>>0).toNumber())}if(t.dataType!=null&&(o.dataType=t.dataType|0),t.segment!=null){if(typeof t.segment!="object")throw TypeError(".onnx.TensorProto.segment: object expected");o.segment=v.onnx.TensorProto.Segment.fromObject(t.segment)}if(t.floatData){if(!Array.isArray(t.floatData))throw TypeError(".onnx.TensorProto.floatData: array expected");o.floatData=[];for(var i=0;i<t.floatData.length;++i)o.floatData[i]=Number(t.floatData[i])}if(t.int32Data){if(!Array.isArray(t.int32Data))throw TypeError(".onnx.TensorProto.int32Data: array expected");o.int32Data=[];for(var i=0;i<t.int32Data.length;++i)o.int32Data[i]=t.int32Data[i]|0}if(t.stringData){if(!Array.isArray(t.stringData))throw TypeError(".onnx.TensorProto.stringData: array expected");o.stringData=[];for(var i=0;i<t.stringData.length;++i)typeof t.stringData[i]=="string"?I.base64.decode(t.stringData[i],o.stringData[i]=I.newBuffer(I.base64.length(t.stringData[i])),0):t.stringData[i].length>=0&&(o.stringData[i]=t.stringData[i])}if(t.int64Data){if(!Array.isArray(t.int64Data))throw TypeError(".onnx.TensorProto.int64Data: array expected");o.int64Data=[];for(var i=0;i<t.int64Data.length;++i)I.Long?(o.int64Data[i]=I.Long.fromValue(t.int64Data[i])).unsigned=!1:typeof t.int64Data[i]=="string"?o.int64Data[i]=parseInt(t.int64Data[i],10):typeof t.int64Data[i]=="number"?o.int64Data[i]=t.int64Data[i]:typeof t.int64Data[i]=="object"&&(o.int64Data[i]=new I.LongBits(t.int64Data[i].low>>>0,t.int64Data[i].high>>>0).toNumber())}if(t.name!=null&&(o.name=String(t.name)),t.docString!=null&&(o.docString=String(t.docString)),t.rawData!=null&&(typeof t.rawData=="string"?I.base64.decode(t.rawData,o.rawData=I.newBuffer(I.base64.length(t.rawData)),0):t.rawData.length>=0&&(o.rawData=t.rawData)),t.externalData){if(!Array.isArray(t.externalData))throw TypeError(".onnx.TensorProto.externalData: array expected");o.externalData=[];for(var i=0;i<t.externalData.length;++i){if(typeof t.externalData[i]!="object")throw TypeError(".onnx.TensorProto.externalData: object expected");o.externalData[i]=v.onnx.StringStringEntryProto.fromObject(t.externalData[i])}}switch(t.dataLocation){default:if(typeof t.dataLocation=="number"){o.dataLocation=t.dataLocation;break}break;case"DEFAULT":case 0:o.dataLocation=0;break;case"EXTERNAL":case 1:o.dataLocation=1;break}if(t.doubleData){if(!Array.isArray(t.doubleData))throw TypeError(".onnx.TensorProto.doubleData: array expected");o.doubleData=[];for(var i=0;i<t.doubleData.length;++i)o.doubleData[i]=Number(t.doubleData[i])}if(t.uint64Data){if(!Array.isArray(t.uint64Data))throw TypeError(".onnx.TensorProto.uint64Data: array expected");o.uint64Data=[];for(var i=0;i<t.uint64Data.length;++i)I.Long?(o.uint64Data[i]=I.Long.fromValue(t.uint64Data[i])).unsigned=!0:typeof t.uint64Data[i]=="string"?o.uint64Data[i]=parseInt(t.uint64Data[i],10):typeof t.uint64Data[i]=="number"?o.uint64Data[i]=t.uint64Data[i]:typeof t.uint64Data[i]=="object"&&(o.uint64Data[i]=new I.LongBits(t.uint64Data[i].low>>>0,t.uint64Data[i].high>>>0).toNumber(!0))}return o},e.toObject=function(t,o){o||(o={});var i={};if((o.arrays||o.defaults)&&(i.dims=[],i.floatData=[],i.int32Data=[],i.stringData=[],i.int64Data=[],i.doubleData=[],i.uint64Data=[],i.externalData=[]),o.defaults&&(i.dataType=0,i.segment=null,i.name="",o.bytes===String?i.rawData="":(i.rawData=[],o.bytes!==Array&&(i.rawData=I.newBuffer(i.rawData))),i.docString="",i.dataLocation=o.enums===String?"DEFAULT":0),t.dims&&t.dims.length){i.dims=[];for(var s=0;s<t.dims.length;++s)typeof t.dims[s]=="number"?i.dims[s]=o.longs===String?String(t.dims[s]):t.dims[s]:i.dims[s]=o.longs===String?I.Long.prototype.toString.call(t.dims[s]):o.longs===Number?new I.LongBits(t.dims[s].low>>>0,t.dims[s].high>>>0).toNumber():t.dims[s]}if(t.dataType!=null&&t.hasOwnProperty("dataType")&&(i.dataType=t.dataType),t.segment!=null&&t.hasOwnProperty("segment")&&(i.segment=v.onnx.TensorProto.Segment.toObject(t.segment,o)),t.floatData&&t.floatData.length){i.floatData=[];for(var s=0;s<t.floatData.length;++s)i.floatData[s]=o.json&&!isFinite(t.floatData[s])?String(t.floatData[s]):t.floatData[s]}if(t.int32Data&&t.int32Data.length){i.int32Data=[];for(var s=0;s<t.int32Data.length;++s)i.int32Data[s]=t.int32Data[s]}if(t.stringData&&t.stringData.length){i.stringData=[];for(var s=0;s<t.stringData.length;++s)i.stringData[s]=o.bytes===String?I.base64.encode(t.stringData[s],0,t.stringData[s].length):o.bytes===Array?Array.prototype.slice.call(t.stringData[s]):t.stringData[s]}if(t.int64Data&&t.int64Data.length){i.int64Data=[];for(var s=0;s<t.int64Data.length;++s)typeof t.int64Data[s]=="number"?i.int64Data[s]=o.longs===String?String(t.int64Data[s]):t.int64Data[s]:i.int64Data[s]=o.longs===String?I.Long.prototype.toString.call(t.int64Data[s]):o.longs===Number?new I.LongBits(t.int64Data[s].low>>>0,t.int64Data[s].high>>>0).toNumber():t.int64Data[s]}if(t.name!=null&&t.hasOwnProperty("name")&&(i.name=t.name),t.rawData!=null&&t.hasOwnProperty("rawData")&&(i.rawData=o.bytes===String?I.base64.encode(t.rawData,0,t.rawData.length):o.bytes===Array?Array.prototype.slice.call(t.rawData):t.rawData),t.doubleData&&t.doubleData.length){i.doubleData=[];for(var s=0;s<t.doubleData.length;++s)i.doubleData[s]=o.json&&!isFinite(t.doubleData[s])?String(t.doubleData[s]):t.doubleData[s]}if(t.uint64Data&&t.uint64Data.length){i.uint64Data=[];for(var s=0;s<t.uint64Data.length;++s)typeof t.uint64Data[s]=="number"?i.uint64Data[s]=o.longs===String?String(t.uint64Data[s]):t.uint64Data[s]:i.uint64Data[s]=o.longs===String?I.Long.prototype.toString.call(t.uint64Data[s]):o.longs===Number?new I.LongBits(t.uint64Data[s].low>>>0,t.uint64Data[s].high>>>0).toNumber(!0):t.uint64Data[s]}if(t.docString!=null&&t.hasOwnProperty("docString")&&(i.docString=t.docString),t.externalData&&t.externalData.length){i.externalData=[];for(var s=0;s<t.externalData.length;++s)i.externalData[s]=v.onnx.StringStringEntryProto.toObject(t.externalData[s],o)}return t.dataLocation!=null&&t.hasOwnProperty("dataLocation")&&(i.dataLocation=o.enums===String?v.onnx.TensorProto.DataLocation[t.dataLocation]===void 0?t.dataLocation:v.onnx.TensorProto.DataLocation[t.dataLocation]:t.dataLocation),i},e.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},e.getTypeUrl=function(t){return t===void 0&&(t="type.googleapis.com"),t+"/onnx.TensorProto"},e.DataType=(function(){var n={},t=Object.create(n);return t[n[0]="UNDEFINED"]=0,t[n[1]="FLOAT"]=1,t[n[2]="UINT8"]=2,t[n[3]="INT8"]=3,t[n[4]="UINT16"]=4,t[n[5]="INT16"]=5,t[n[6]="INT32"]=6,t[n[7]="INT64"]=7,t[n[8]="STRING"]=8,t[n[9]="BOOL"]=9,t[n[10]="FLOAT16"]=10,t[n[11]="DOUBLE"]=11,t[n[12]="UINT32"]=12,t[n[13]="UINT64"]=13,t[n[14]="COMPLEX64"]=14,t[n[15]="COMPLEX128"]=15,t[n[16]="BFLOAT16"]=16,t[n[17]="FLOAT8E4M3FN"]=17,t[n[18]="FLOAT8E4M3FNUZ"]=18,t[n[19]="FLOAT8E5M2"]=19,t[n[20]="FLOAT8E5M2FNUZ"]=20,t})(),e.Segment=(function(){function n(t){if(t)for(var o=Object.keys(t),i=0;i<o.length;++i)t[o[i]]!=null&&(this[o[i]]=t[o[i]])}return n.prototype.begin=I.Long?I.Long.fromBits(0,0,!1):0,n.prototype.end=I.Long?I.Long.fromBits(0,0,!1):0,n.create=function(o){return new n(o)},n.encode=function(o,i){return i||(i=Me.create()),o.begin!=null&&Object.hasOwnProperty.call(o,"begin")&&i.uint32(8).int64(o.begin),o.end!=null&&Object.hasOwnProperty.call(o,"end")&&i.uint32(16).int64(o.end),i},n.encodeDelimited=function(o,i){return this.encode(o,i).ldelim()},n.decode=function(o,i){o instanceof G||(o=G.create(o));for(var s=i===void 0?o.len:o.pos+i,a=new v.onnx.TensorProto.Segment;o.pos<s;){var u=o.uint32();switch(u>>>3){case 1:{a.begin=o.int64();break}case 2:{a.end=o.int64();break}default:o.skipType(u&7);break}}return a},n.decodeDelimited=function(o){return o instanceof G||(o=new G(o)),this.decode(o,o.uint32())},n.verify=function(o){return typeof o!="object"||o===null?"object expected":o.begin!=null&&o.hasOwnProperty("begin")&&!I.isInteger(o.begin)&&!(o.begin&&I.isInteger(o.begin.low)&&I.isInteger(o.begin.high))?"begin: integer|Long expected":o.end!=null&&o.hasOwnProperty("end")&&!I.isInteger(o.end)&&!(o.end&&I.isInteger(o.end.low)&&I.isInteger(o.end.high))?"end: integer|Long expected":null},n.fromObject=function(o){if(o instanceof v.onnx.TensorProto.Segment)return o;var i=new v.onnx.TensorProto.Segment;return o.begin!=null&&(I.Long?(i.begin=I.Long.fromValue(o.begin)).unsigned=!1:typeof o.begin=="string"?i.begin=parseInt(o.begin,10):typeof o.begin=="number"?i.begin=o.begin:typeof o.begin=="object"&&(i.begin=new I.LongBits(o.begin.low>>>0,o.begin.high>>>0).toNumber())),o.end!=null&&(I.Long?(i.end=I.Long.fromValue(o.end)).unsigned=!1:typeof o.end=="string"?i.end=parseInt(o.end,10):typeof o.end=="number"?i.end=o.end:typeof o.end=="object"&&(i.end=new I.LongBits(o.end.low>>>0,o.end.high>>>0).toNumber())),i},n.toObject=function(o,i){i||(i={});var s={};if(i.defaults){if(I.Long){var a=new I.Long(0,0,!1);s.begin=i.longs===String?a.toString():i.longs===Number?a.toNumber():a}else s.begin=i.longs===String?"0":0;if(I.Long){var a=new I.Long(0,0,!1);s.end=i.longs===String?a.toString():i.longs===Number?a.toNumber():a}else s.end=i.longs===String?"0":0}return o.begin!=null&&o.hasOwnProperty("begin")&&(typeof o.begin=="number"?s.begin=i.longs===String?String(o.begin):o.begin:s.begin=i.longs===String?I.Long.prototype.toString.call(o.begin):i.longs===Number?new I.LongBits(o.begin.low>>>0,o.begin.high>>>0).toNumber():o.begin),o.end!=null&&o.hasOwnProperty("end")&&(typeof o.end=="number"?s.end=i.longs===String?String(o.end):o.end:s.end=i.longs===String?I.Long.prototype.toString.call(o.end):i.longs===Number?new I.LongBits(o.end.low>>>0,o.end.high>>>0).toNumber():o.end),s},n.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},n.getTypeUrl=function(o){return o===void 0&&(o="type.googleapis.com"),o+"/onnx.TensorProto.Segment"},n})(),e.DataLocation=(function(){var n={},t=Object.create(n);return t[n[0]="DEFAULT"]=0,t[n[1]="EXTERNAL"]=1,t})(),e})(),r.SparseTensorProto=(function(){function e(n){if(this.dims=[],n)for(var t=Object.keys(n),o=0;o<t.length;++o)n[t[o]]!=null&&(this[t[o]]=n[t[o]])}return e.prototype.values=null,e.prototype.indices=null,e.prototype.dims=I.emptyArray,e.create=function(t){return new e(t)},e.encode=function(t,o){if(o||(o=Me.create()),t.values!=null&&Object.hasOwnProperty.call(t,"values")&&v.onnx.TensorProto.encode(t.values,o.uint32(10).fork()).ldelim(),t.indices!=null&&Object.hasOwnProperty.call(t,"indices")&&v.onnx.TensorProto.encode(t.indices,o.uint32(18).fork()).ldelim(),t.dims!=null&&t.dims.length){o.uint32(26).fork();for(var i=0;i<t.dims.length;++i)o.int64(t.dims[i]);o.ldelim()}return o},e.encodeDelimited=function(t,o){return this.encode(t,o).ldelim()},e.decode=function(t,o){t instanceof G||(t=G.create(t));for(var i=o===void 0?t.len:t.pos+o,s=new v.onnx.SparseTensorProto;t.pos<i;){var a=t.uint32();switch(a>>>3){case 1:{s.values=v.onnx.TensorProto.decode(t,t.uint32());break}case 2:{s.indices=v.onnx.TensorProto.decode(t,t.uint32());break}case 3:{if(s.dims&&s.dims.length||(s.dims=[]),(a&7)===2)for(var u=t.uint32()+t.pos;t.pos<u;)s.dims.push(t.int64());else s.dims.push(t.int64());break}default:t.skipType(a&7);break}}return s},e.decodeDelimited=function(t){return t instanceof G||(t=new G(t)),this.decode(t,t.uint32())},e.verify=function(t){if(typeof t!="object"||t===null)return"object expected";if(t.values!=null&&t.hasOwnProperty("values")){var o=v.onnx.TensorProto.verify(t.values);if(o)return"values."+o}if(t.indices!=null&&t.hasOwnProperty("indices")){var o=v.onnx.TensorProto.verify(t.indices);if(o)return"indices."+o}if(t.dims!=null&&t.hasOwnProperty("dims")){if(!Array.isArray(t.dims))return"dims: array expected";for(var i=0;i<t.dims.length;++i)if(!I.isInteger(t.dims[i])&&!(t.dims[i]&&I.isInteger(t.dims[i].low)&&I.isInteger(t.dims[i].high)))return"dims: integer|Long[] expected"}return null},e.fromObject=function(t){if(t instanceof v.onnx.SparseTensorProto)return t;var o=new v.onnx.SparseTensorProto;if(t.values!=null){if(typeof t.values!="object")throw TypeError(".onnx.SparseTensorProto.values: object expected");o.values=v.onnx.TensorProto.fromObject(t.values)}if(t.indices!=null){if(typeof t.indices!="object")throw TypeError(".onnx.SparseTensorProto.indices: object expected");o.indices=v.onnx.TensorProto.fromObject(t.indices)}if(t.dims){if(!Array.isArray(t.dims))throw TypeError(".onnx.SparseTensorProto.dims: array expected");o.dims=[];for(var i=0;i<t.dims.length;++i)I.Long?(o.dims[i]=I.Long.fromValue(t.dims[i])).unsigned=!1:typeof t.dims[i]=="string"?o.dims[i]=parseInt(t.dims[i],10):typeof t.dims[i]=="number"?o.dims[i]=t.dims[i]:typeof t.dims[i]=="object"&&(o.dims[i]=new I.LongBits(t.dims[i].low>>>0,t.dims[i].high>>>0).toNumber())}return o},e.toObject=function(t,o){o||(o={});var i={};if((o.arrays||o.defaults)&&(i.dims=[]),o.defaults&&(i.values=null,i.indices=null),t.values!=null&&t.hasOwnProperty("values")&&(i.values=v.onnx.TensorProto.toObject(t.values,o)),t.indices!=null&&t.hasOwnProperty("indices")&&(i.indices=v.onnx.TensorProto.toObject(t.indices,o)),t.dims&&t.dims.length){i.dims=[];for(var s=0;s<t.dims.length;++s)typeof t.dims[s]=="number"?i.dims[s]=o.longs===String?String(t.dims[s]):t.dims[s]:i.dims[s]=o.longs===String?I.Long.prototype.toString.call(t.dims[s]):o.longs===Number?new I.LongBits(t.dims[s].low>>>0,t.dims[s].high>>>0).toNumber():t.dims[s]}return i},e.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},e.getTypeUrl=function(t){return t===void 0&&(t="type.googleapis.com"),t+"/onnx.SparseTensorProto"},e})(),r.TensorShapeProto=(function(){function e(n){if(this.dim=[],n)for(var t=Object.keys(n),o=0;o<t.length;++o)n[t[o]]!=null&&(this[t[o]]=n[t[o]])}return e.prototype.dim=I.emptyArray,e.create=function(t){return new e(t)},e.encode=function(t,o){if(o||(o=Me.create()),t.dim!=null&&t.dim.length)for(var i=0;i<t.dim.length;++i)v.onnx.TensorShapeProto.Dimension.encode(t.dim[i],o.uint32(10).fork()).ldelim();return o},e.encodeDelimited=function(t,o){return this.encode(t,o).ldelim()},e.decode=function(t,o){t instanceof G||(t=G.create(t));for(var i=o===void 0?t.len:t.pos+o,s=new v.onnx.TensorShapeProto;t.pos<i;){var a=t.uint32();a>>>3===1?(s.dim&&s.dim.length||(s.dim=[]),s.dim.push(v.onnx.TensorShapeProto.Dimension.decode(t,t.uint32()))):t.skipType(a&7)}return s},e.decodeDelimited=function(t){return t instanceof G||(t=new G(t)),this.decode(t,t.uint32())},e.verify=function(t){if(typeof t!="object"||t===null)return"object expected";if(t.dim!=null&&t.hasOwnProperty("dim")){if(!Array.isArray(t.dim))return"dim: array expected";for(var o=0;o<t.dim.length;++o){var i=v.onnx.TensorShapeProto.Dimension.verify(t.dim[o]);if(i)return"dim."+i}}return null},e.fromObject=function(t){if(t instanceof v.onnx.TensorShapeProto)return t;var o=new v.onnx.TensorShapeProto;if(t.dim){if(!Array.isArray(t.dim))throw TypeError(".onnx.TensorShapeProto.dim: array expected");o.dim=[];for(var i=0;i<t.dim.length;++i){if(typeof t.dim[i]!="object")throw TypeError(".onnx.TensorShapeProto.dim: object expected");o.dim[i]=v.onnx.TensorShapeProto.Dimension.fromObject(t.dim[i])}}return o},e.toObject=function(t,o){o||(o={});var i={};if((o.arrays||o.defaults)&&(i.dim=[]),t.dim&&t.dim.length){i.dim=[];for(var s=0;s<t.dim.length;++s)i.dim[s]=v.onnx.TensorShapeProto.Dimension.toObject(t.dim[s],o)}return i},e.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},e.getTypeUrl=function(t){return t===void 0&&(t="type.googleapis.com"),t+"/onnx.TensorShapeProto"},e.Dimension=(function(){function n(o){if(o)for(var i=Object.keys(o),s=0;s<i.length;++s)o[i[s]]!=null&&(this[i[s]]=o[i[s]])}n.prototype.dimValue=null,n.prototype.dimParam=null,n.prototype.denotation="";var t;return Object.defineProperty(n.prototype,"value",{get:I.oneOfGetter(t=["dimValue","dimParam"]),set:I.oneOfSetter(t)}),n.create=function(i){return new n(i)},n.encode=function(i,s){return s||(s=Me.create()),i.dimValue!=null&&Object.hasOwnProperty.call(i,"dimValue")&&s.uint32(8).int64(i.dimValue),i.dimParam!=null&&Object.hasOwnProperty.call(i,"dimParam")&&s.uint32(18).string(i.dimParam),i.denotation!=null&&Object.hasOwnProperty.call(i,"denotation")&&s.uint32(26).string(i.denotation),s},n.encodeDelimited=function(i,s){return this.encode(i,s).ldelim()},n.decode=function(i,s){i instanceof G||(i=G.create(i));for(var a=s===void 0?i.len:i.pos+s,u=new v.onnx.TensorShapeProto.Dimension;i.pos<a;){var l=i.uint32();switch(l>>>3){case 1:{u.dimValue=i.int64();break}case 2:{u.dimParam=i.string();break}case 3:{u.denotation=i.string();break}default:i.skipType(l&7);break}}return u},n.decodeDelimited=function(i){return i instanceof G||(i=new G(i)),this.decode(i,i.uint32())},n.verify=function(i){if(typeof i!="object"||i===null)return"object expected";var s={};if(i.dimValue!=null&&i.hasOwnProperty("dimValue")&&(s.value=1,!I.isInteger(i.dimValue)&&!(i.dimValue&&I.isInteger(i.dimValue.low)&&I.isInteger(i.dimValue.high))))return"dimValue: integer|Long expected";if(i.dimParam!=null&&i.hasOwnProperty("dimParam")){if(s.value===1)return"value: multiple values";if(s.value=1,!I.isString(i.dimParam))return"dimParam: string expected"}return i.denotation!=null&&i.hasOwnProperty("denotation")&&!I.isString(i.denotation)?"denotation: string expected":null},n.fromObject=function(i){if(i instanceof v.onnx.TensorShapeProto.Dimension)return i;var s=new v.onnx.TensorShapeProto.Dimension;return i.dimValue!=null&&(I.Long?(s.dimValue=I.Long.fromValue(i.dimValue)).unsigned=!1:typeof i.dimValue=="string"?s.dimValue=parseInt(i.dimValue,10):typeof i.dimValue=="number"?s.dimValue=i.dimValue:typeof i.dimValue=="object"&&(s.dimValue=new I.LongBits(i.dimValue.low>>>0,i.dimValue.high>>>0).toNumber())),i.dimParam!=null&&(s.dimParam=String(i.dimParam)),i.denotation!=null&&(s.denotation=String(i.denotation)),s},n.toObject=function(i,s){s||(s={});var a={};return s.defaults&&(a.denotation=""),i.dimValue!=null&&i.hasOwnProperty("dimValue")&&(typeof i.dimValue=="number"?a.dimValue=s.longs===String?String(i.dimValue):i.dimValue:a.dimValue=s.longs===String?I.Long.prototype.toString.call(i.dimValue):s.longs===Number?new I.LongBits(i.dimValue.low>>>0,i.dimValue.high>>>0).toNumber():i.dimValue,s.oneofs&&(a.value="dimValue")),i.dimParam!=null&&i.hasOwnProperty("dimParam")&&(a.dimParam=i.dimParam,s.oneofs&&(a.value="dimParam")),i.denotation!=null&&i.hasOwnProperty("denotation")&&(a.denotation=i.denotation),a},n.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},n.getTypeUrl=function(i){return i===void 0&&(i="type.googleapis.com"),i+"/onnx.TensorShapeProto.Dimension"},n})(),e})(),r.TypeProto=(function(){function e(t){if(t)for(var o=Object.keys(t),i=0;i<o.length;++i)t[o[i]]!=null&&(this[o[i]]=t[o[i]])}e.prototype.tensorType=null,e.prototype.sequenceType=null,e.prototype.mapType=null,e.prototype.optionalType=null,e.prototype.sparseTensorType=null,e.prototype.denotation="";var n;return Object.defineProperty(e.prototype,"value",{get:I.oneOfGetter(n=["tensorType","sequenceType","mapType","optionalType","sparseTensorType"]),set:I.oneOfSetter(n)}),e.create=function(o){return new e(o)},e.encode=function(o,i){return i||(i=Me.create()),o.tensorType!=null&&Object.hasOwnProperty.call(o,"tensorType")&&v.onnx.TypeProto.Tensor.encode(o.tensorType,i.uint32(10).fork()).ldelim(),o.sequenceType!=null&&Object.hasOwnProperty.call(o,"sequenceType")&&v.onnx.TypeProto.Sequence.encode(o.sequenceType,i.uint32(34).fork()).ldelim(),o.mapType!=null&&Object.hasOwnProperty.call(o,"mapType")&&v.onnx.TypeProto.Map.encode(o.mapType,i.uint32(42).fork()).ldelim(),o.denotation!=null&&Object.hasOwnProperty.call(o,"denotation")&&i.uint32(50).string(o.denotation),o.sparseTensorType!=null&&Object.hasOwnProperty.call(o,"sparseTensorType")&&v.onnx.TypeProto.SparseTensor.encode(o.sparseTensorType,i.uint32(66).fork()).ldelim(),o.optionalType!=null&&Object.hasOwnProperty.call(o,"optionalType")&&v.onnx.TypeProto.Optional.encode(o.optionalType,i.uint32(74).fork()).ldelim(),i},e.encodeDelimited=function(o,i){return this.encode(o,i).ldelim()},e.decode=function(o,i){o instanceof G||(o=G.create(o));for(var s=i===void 0?o.len:o.pos+i,a=new v.onnx.TypeProto;o.pos<s;){var u=o.uint32();switch(u>>>3){case 1:{a.tensorType=v.onnx.TypeProto.Tensor.decode(o,o.uint32());break}case 4:{a.sequenceType=v.onnx.TypeProto.Sequence.decode(o,o.uint32());break}case 5:{a.mapType=v.onnx.TypeProto.Map.decode(o,o.uint32());break}case 9:{a.optionalType=v.onnx.TypeProto.Optional.decode(o,o.uint32());break}case 8:{a.sparseTensorType=v.onnx.TypeProto.SparseTensor.decode(o,o.uint32());break}case 6:{a.denotation=o.string();break}default:o.skipType(u&7);break}}return a},e.decodeDelimited=function(o){return o instanceof G||(o=new G(o)),this.decode(o,o.uint32())},e.verify=function(o){if(typeof o!="object"||o===null)return"object expected";var i={};if(o.tensorType!=null&&o.hasOwnProperty("tensorType")){i.value=1;{var s=v.onnx.TypeProto.Tensor.verify(o.tensorType);if(s)return"tensorType."+s}}if(o.sequenceType!=null&&o.hasOwnProperty("sequenceType")){if(i.value===1)return"value: multiple values";i.value=1;{var s=v.onnx.TypeProto.Sequence.verify(o.sequenceType);if(s)return"sequenceType."+s}}if(o.mapType!=null&&o.hasOwnProperty("mapType")){if(i.value===1)return"value: multiple values";i.value=1;{var s=v.onnx.TypeProto.Map.verify(o.mapType);if(s)return"mapType."+s}}if(o.optionalType!=null&&o.hasOwnProperty("optionalType")){if(i.value===1)return"value: multiple values";i.value=1;{var s=v.onnx.TypeProto.Optional.verify(o.optionalType);if(s)return"optionalType."+s}}if(o.sparseTensorType!=null&&o.hasOwnProperty("sparseTensorType")){if(i.value===1)return"value: multiple values";i.value=1;{var s=v.onnx.TypeProto.SparseTensor.verify(o.sparseTensorType);if(s)return"sparseTensorType."+s}}return o.denotation!=null&&o.hasOwnProperty("denotation")&&!I.isString(o.denotation)?"denotation: string expected":null},e.fromObject=function(o){if(o instanceof v.onnx.TypeProto)return o;var i=new v.onnx.TypeProto;if(o.tensorType!=null){if(typeof o.tensorType!="object")throw TypeError(".onnx.TypeProto.tensorType: object expected");i.tensorType=v.onnx.TypeProto.Tensor.fromObject(o.tensorType)}if(o.sequenceType!=null){if(typeof o.sequenceType!="object")throw TypeError(".onnx.TypeProto.sequenceType: object expected");i.sequenceType=v.onnx.TypeProto.Sequence.fromObject(o.sequenceType)}if(o.mapType!=null){if(typeof o.mapType!="object")throw TypeError(".onnx.TypeProto.mapType: object expected");i.mapType=v.onnx.TypeProto.Map.fromObject(o.mapType)}if(o.optionalType!=null){if(typeof o.optionalType!="object")throw TypeError(".onnx.TypeProto.optionalType: object expected");i.optionalType=v.onnx.TypeProto.Optional.fromObject(o.optionalType)}if(o.sparseTensorType!=null){if(typeof o.sparseTensorType!="object")throw TypeError(".onnx.TypeProto.sparseTensorType: object expected");i.sparseTensorType=v.onnx.TypeProto.SparseTensor.fromObject(o.sparseTensorType)}return o.denotation!=null&&(i.denotation=String(o.denotation)),i},e.toObject=function(o,i){i||(i={});var s={};return i.defaults&&(s.denotation=""),o.tensorType!=null&&o.hasOwnProperty("tensorType")&&(s.tensorType=v.onnx.TypeProto.Tensor.toObject(o.tensorType,i),i.oneofs&&(s.value="tensorType")),o.sequenceType!=null&&o.hasOwnProperty("sequenceType")&&(s.sequenceType=v.onnx.TypeProto.Sequence.toObject(o.sequenceType,i),i.oneofs&&(s.value="sequenceType")),o.mapType!=null&&o.hasOwnProperty("mapType")&&(s.mapType=v.onnx.TypeProto.Map.toObject(o.mapType,i),i.oneofs&&(s.value="mapType")),o.denotation!=null&&o.hasOwnProperty("denotation")&&(s.denotation=o.denotation),o.sparseTensorType!=null&&o.hasOwnProperty("sparseTensorType")&&(s.sparseTensorType=v.onnx.TypeProto.SparseTensor.toObject(o.sparseTensorType,i),i.oneofs&&(s.value="sparseTensorType")),o.optionalType!=null&&o.hasOwnProperty("optionalType")&&(s.optionalType=v.onnx.TypeProto.Optional.toObject(o.optionalType,i),i.oneofs&&(s.value="optionalType")),s},e.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},e.getTypeUrl=function(o){return o===void 0&&(o="type.googleapis.com"),o+"/onnx.TypeProto"},e.Tensor=(function(){function t(o){if(o)for(var i=Object.keys(o),s=0;s<i.length;++s)o[i[s]]!=null&&(this[i[s]]=o[i[s]])}return t.prototype.elemType=0,t.prototype.shape=null,t.create=function(i){return new t(i)},t.encode=function(i,s){return s||(s=Me.create()),i.elemType!=null&&Object.hasOwnProperty.call(i,"elemType")&&s.uint32(8).int32(i.elemType),i.shape!=null&&Object.hasOwnProperty.call(i,"shape")&&v.onnx.TensorShapeProto.encode(i.shape,s.uint32(18).fork()).ldelim(),s},t.encodeDelimited=function(i,s){return this.encode(i,s).ldelim()},t.decode=function(i,s){i instanceof G||(i=G.create(i));for(var a=s===void 0?i.len:i.pos+s,u=new v.onnx.TypeProto.Tensor;i.pos<a;){var l=i.uint32();switch(l>>>3){case 1:{u.elemType=i.int32();break}case 2:{u.shape=v.onnx.TensorShapeProto.decode(i,i.uint32());break}default:i.skipType(l&7);break}}return u},t.decodeDelimited=function(i){return i instanceof G||(i=new G(i)),this.decode(i,i.uint32())},t.verify=function(i){if(typeof i!="object"||i===null)return"object expected";if(i.elemType!=null&&i.hasOwnProperty("elemType")&&!I.isInteger(i.elemType))return"elemType: integer expected";if(i.shape!=null&&i.hasOwnProperty("shape")){var s=v.onnx.TensorShapeProto.verify(i.shape);if(s)return"shape."+s}return null},t.fromObject=function(i){if(i instanceof v.onnx.TypeProto.Tensor)return i;var s=new v.onnx.TypeProto.Tensor;if(i.elemType!=null&&(s.elemType=i.elemType|0),i.shape!=null){if(typeof i.shape!="object")throw TypeError(".onnx.TypeProto.Tensor.shape: object expected");s.shape=v.onnx.TensorShapeProto.fromObject(i.shape)}return s},t.toObject=function(i,s){s||(s={});var a={};return s.defaults&&(a.elemType=0,a.shape=null),i.elemType!=null&&i.hasOwnProperty("elemType")&&(a.elemType=i.elemType),i.shape!=null&&i.hasOwnProperty("shape")&&(a.shape=v.onnx.TensorShapeProto.toObject(i.shape,s)),a},t.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},t.getTypeUrl=function(i){return i===void 0&&(i="type.googleapis.com"),i+"/onnx.TypeProto.Tensor"},t})(),e.Sequence=(function(){function t(o){if(o)for(var i=Object.keys(o),s=0;s<i.length;++s)o[i[s]]!=null&&(this[i[s]]=o[i[s]])}return t.prototype.elemType=null,t.create=function(i){return new t(i)},t.encode=function(i,s){return s||(s=Me.create()),i.elemType!=null&&Object.hasOwnProperty.call(i,"elemType")&&v.onnx.TypeProto.encode(i.elemType,s.uint32(10).fork()).ldelim(),s},t.encodeDelimited=function(i,s){return this.encode(i,s).ldelim()},t.decode=function(i,s){i instanceof G||(i=G.create(i));for(var a=s===void 0?i.len:i.pos+s,u=new v.onnx.TypeProto.Sequence;i.pos<a;){var l=i.uint32();l>>>3===1?u.elemType=v.onnx.TypeProto.decode(i,i.uint32()):i.skipType(l&7)}return u},t.decodeDelimited=function(i){return i instanceof G||(i=new G(i)),this.decode(i,i.uint32())},t.verify=function(i){if(typeof i!="object"||i===null)return"object expected";if(i.elemType!=null&&i.hasOwnProperty("elemType")){var s=v.onnx.TypeProto.verify(i.elemType);if(s)return"elemType."+s}return null},t.fromObject=function(i){if(i instanceof v.onnx.TypeProto.Sequence)return i;var s=new v.onnx.TypeProto.Sequence;if(i.elemType!=null){if(typeof i.elemType!="object")throw TypeError(".onnx.TypeProto.Sequence.elemType: object expected");s.elemType=v.onnx.TypeProto.fromObject(i.elemType)}return s},t.toObject=function(i,s){s||(s={});var a={};return s.defaults&&(a.elemType=null),i.elemType!=null&&i.hasOwnProperty("elemType")&&(a.elemType=v.onnx.TypeProto.toObject(i.elemType,s)),a},t.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},t.getTypeUrl=function(i){return i===void 0&&(i="type.googleapis.com"),i+"/onnx.TypeProto.Sequence"},t})(),e.Map=(function(){function t(o){if(o)for(var i=Object.keys(o),s=0;s<i.length;++s)o[i[s]]!=null&&(this[i[s]]=o[i[s]])}return t.prototype.keyType=0,t.prototype.valueType=null,t.create=function(i){return new t(i)},t.encode=function(i,s){return s||(s=Me.create()),i.keyType!=null&&Object.hasOwnProperty.call(i,"keyType")&&s.uint32(8).int32(i.keyType),i.valueType!=null&&Object.hasOwnProperty.call(i,"valueType")&&v.onnx.TypeProto.encode(i.valueType,s.uint32(18).fork()).ldelim(),s},t.encodeDelimited=function(i,s){return this.encode(i,s).ldelim()},t.decode=function(i,s){i instanceof G||(i=G.create(i));for(var a=s===void 0?i.len:i.pos+s,u=new v.onnx.TypeProto.Map;i.pos<a;){var l=i.uint32();switch(l>>>3){case 1:{u.keyType=i.int32();break}case 2:{u.valueType=v.onnx.TypeProto.decode(i,i.uint32());break}default:i.skipType(l&7);break}}return u},t.decodeDelimited=function(i){return i instanceof G||(i=new G(i)),this.decode(i,i.uint32())},t.verify=function(i){if(typeof i!="object"||i===null)return"object expected";if(i.keyType!=null&&i.hasOwnProperty("keyType")&&!I.isInteger(i.keyType))return"keyType: integer expected";if(i.valueType!=null&&i.hasOwnProperty("valueType")){var s=v.onnx.TypeProto.verify(i.valueType);if(s)return"valueType."+s}return null},t.fromObject=function(i){if(i instanceof v.onnx.TypeProto.Map)return i;var s=new v.onnx.TypeProto.Map;if(i.keyType!=null&&(s.keyType=i.keyType|0),i.valueType!=null){if(typeof i.valueType!="object")throw TypeError(".onnx.TypeProto.Map.valueType: object expected");s.valueType=v.onnx.TypeProto.fromObject(i.valueType)}return s},t.toObject=function(i,s){s||(s={});var a={};return s.defaults&&(a.keyType=0,a.valueType=null),i.keyType!=null&&i.hasOwnProperty("keyType")&&(a.keyType=i.keyType),i.valueType!=null&&i.hasOwnProperty("valueType")&&(a.valueType=v.onnx.TypeProto.toObject(i.valueType,s)),a},t.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},t.getTypeUrl=function(i){return i===void 0&&(i="type.googleapis.com"),i+"/onnx.TypeProto.Map"},t})(),e.Optional=(function(){function t(o){if(o)for(var i=Object.keys(o),s=0;s<i.length;++s)o[i[s]]!=null&&(this[i[s]]=o[i[s]])}return t.prototype.elemType=null,t.create=function(i){return new t(i)},t.encode=function(i,s){return s||(s=Me.create()),i.elemType!=null&&Object.hasOwnProperty.call(i,"elemType")&&v.onnx.TypeProto.encode(i.elemType,s.uint32(10).fork()).ldelim(),s},t.encodeDelimited=function(i,s){return this.encode(i,s).ldelim()},t.decode=function(i,s){i instanceof G||(i=G.create(i));for(var a=s===void 0?i.len:i.pos+s,u=new v.onnx.TypeProto.Optional;i.pos<a;){var l=i.uint32();l>>>3===1?u.elemType=v.onnx.TypeProto.decode(i,i.uint32()):i.skipType(l&7)}return u},t.decodeDelimited=function(i){return i instanceof G||(i=new G(i)),this.decode(i,i.uint32())},t.verify=function(i){if(typeof i!="object"||i===null)return"object expected";if(i.elemType!=null&&i.hasOwnProperty("elemType")){var s=v.onnx.TypeProto.verify(i.elemType);if(s)return"elemType."+s}return null},t.fromObject=function(i){if(i instanceof v.onnx.TypeProto.Optional)return i;var s=new v.onnx.TypeProto.Optional;if(i.elemType!=null){if(typeof i.elemType!="object")throw TypeError(".onnx.TypeProto.Optional.elemType: object expected");s.elemType=v.onnx.TypeProto.fromObject(i.elemType)}return s},t.toObject=function(i,s){s||(s={});var a={};return s.defaults&&(a.elemType=null),i.elemType!=null&&i.hasOwnProperty("elemType")&&(a.elemType=v.onnx.TypeProto.toObject(i.elemType,s)),a},t.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},t.getTypeUrl=function(i){return i===void 0&&(i="type.googleapis.com"),i+"/onnx.TypeProto.Optional"},t})(),e.SparseTensor=(function(){function t(o){if(o)for(var i=Object.keys(o),s=0;s<i.length;++s)o[i[s]]!=null&&(this[i[s]]=o[i[s]])}return t.prototype.elemType=0,t.prototype.shape=null,t.create=function(i){return new t(i)},t.encode=function(i,s){return s||(s=Me.create()),i.elemType!=null&&Object.hasOwnProperty.call(i,"elemType")&&s.uint32(8).int32(i.elemType),i.shape!=null&&Object.hasOwnProperty.call(i,"shape")&&v.onnx.TensorShapeProto.encode(i.shape,s.uint32(18).fork()).ldelim(),s},t.encodeDelimited=function(i,s){return this.encode(i,s).ldelim()},t.decode=function(i,s){i instanceof G||(i=G.create(i));for(var a=s===void 0?i.len:i.pos+s,u=new v.onnx.TypeProto.SparseTensor;i.pos<a;){var l=i.uint32();switch(l>>>3){case 1:{u.elemType=i.int32();break}case 2:{u.shape=v.onnx.TensorShapeProto.decode(i,i.uint32());break}default:i.skipType(l&7);break}}return u},t.decodeDelimited=function(i){return i instanceof G||(i=new G(i)),this.decode(i,i.uint32())},t.verify=function(i){if(typeof i!="object"||i===null)return"object expected";if(i.elemType!=null&&i.hasOwnProperty("elemType")&&!I.isInteger(i.elemType))return"elemType: integer expected";if(i.shape!=null&&i.hasOwnProperty("shape")){var s=v.onnx.TensorShapeProto.verify(i.shape);if(s)return"shape."+s}return null},t.fromObject=function(i){if(i instanceof v.onnx.TypeProto.SparseTensor)return i;var s=new v.onnx.TypeProto.SparseTensor;if(i.elemType!=null&&(s.elemType=i.elemType|0),i.shape!=null){if(typeof i.shape!="object")throw TypeError(".onnx.TypeProto.SparseTensor.shape: object expected");s.shape=v.onnx.TensorShapeProto.fromObject(i.shape)}return s},t.toObject=function(i,s){s||(s={});var a={};return s.defaults&&(a.elemType=0,a.shape=null),i.elemType!=null&&i.hasOwnProperty("elemType")&&(a.elemType=i.elemType),i.shape!=null&&i.hasOwnProperty("shape")&&(a.shape=v.onnx.TensorShapeProto.toObject(i.shape,s)),a},t.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},t.getTypeUrl=function(i){return i===void 0&&(i="type.googleapis.com"),i+"/onnx.TypeProto.SparseTensor"},t})(),e})(),r.OperatorSetIdProto=(function(){function e(n){if(n)for(var t=Object.keys(n),o=0;o<t.length;++o)n[t[o]]!=null&&(this[t[o]]=n[t[o]])}return e.prototype.domain="",e.prototype.version=I.Long?I.Long.fromBits(0,0,!1):0,e.create=function(t){return new e(t)},e.encode=function(t,o){return o||(o=Me.create()),t.domain!=null&&Object.hasOwnProperty.call(t,"domain")&&o.uint32(10).string(t.domain),t.version!=null&&Object.hasOwnProperty.call(t,"version")&&o.uint32(16).int64(t.version),o},e.encodeDelimited=function(t,o){return this.encode(t,o).ldelim()},e.decode=function(t,o){t instanceof G||(t=G.create(t));for(var i=o===void 0?t.len:t.pos+o,s=new v.onnx.OperatorSetIdProto;t.pos<i;){var a=t.uint32();switch(a>>>3){case 1:{s.domain=t.string();break}case 2:{s.version=t.int64();break}default:t.skipType(a&7);break}}return s},e.decodeDelimited=function(t){return t instanceof G||(t=new G(t)),this.decode(t,t.uint32())},e.verify=function(t){return typeof t!="object"||t===null?"object expected":t.domain!=null&&t.hasOwnProperty("domain")&&!I.isString(t.domain)?"domain: string expected":t.version!=null&&t.hasOwnProperty("version")&&!I.isInteger(t.version)&&!(t.version&&I.isInteger(t.version.low)&&I.isInteger(t.version.high))?"version: integer|Long expected":null},e.fromObject=function(t){if(t instanceof v.onnx.OperatorSetIdProto)return t;var o=new v.onnx.OperatorSetIdProto;return t.domain!=null&&(o.domain=String(t.domain)),t.version!=null&&(I.Long?(o.version=I.Long.fromValue(t.version)).unsigned=!1:typeof t.version=="string"?o.version=parseInt(t.version,10):typeof t.version=="number"?o.version=t.version:typeof t.version=="object"&&(o.version=new I.LongBits(t.version.low>>>0,t.version.high>>>0).toNumber())),o},e.toObject=function(t,o){o||(o={});var i={};if(o.defaults)if(i.domain="",I.Long){var s=new I.Long(0,0,!1);i.version=o.longs===String?s.toString():o.longs===Number?s.toNumber():s}else i.version=o.longs===String?"0":0;return t.domain!=null&&t.hasOwnProperty("domain")&&(i.domain=t.domain),t.version!=null&&t.hasOwnProperty("version")&&(typeof t.version=="number"?i.version=o.longs===String?String(t.version):t.version:i.version=o.longs===String?I.Long.prototype.toString.call(t.version):o.longs===Number?new I.LongBits(t.version.low>>>0,t.version.high>>>0).toNumber():t.version),i},e.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},e.getTypeUrl=function(t){return t===void 0&&(t="type.googleapis.com"),t+"/onnx.OperatorSetIdProto"},e})(),r.OperatorStatus=(function(){var e={},n=Object.create(e);return n[e[0]="EXPERIMENTAL"]=0,n[e[1]="STABLE"]=1,n})(),r.FunctionProto=(function(){function e(n){if(this.input=[],this.output=[],this.attribute=[],this.attributeProto=[],this.node=[],this.opsetImport=[],n)for(var t=Object.keys(n),o=0;o<t.length;++o)n[t[o]]!=null&&(this[t[o]]=n[t[o]])}return e.prototype.name="",e.prototype.input=I.emptyArray,e.prototype.output=I.emptyArray,e.prototype.attribute=I.emptyArray,e.prototype.attributeProto=I.emptyArray,e.prototype.node=I.emptyArray,e.prototype.docString="",e.prototype.opsetImport=I.emptyArray,e.prototype.domain="",e.create=function(t){return new e(t)},e.encode=function(t,o){if(o||(o=Me.create()),t.name!=null&&Object.hasOwnProperty.call(t,"name")&&o.uint32(10).string(t.name),t.input!=null&&t.input.length)for(var i=0;i<t.input.length;++i)o.uint32(34).string(t.input[i]);if(t.output!=null&&t.output.length)for(var i=0;i<t.output.length;++i)o.uint32(42).string(t.output[i]);if(t.attribute!=null&&t.attribute.length)for(var i=0;i<t.attribute.length;++i)o.uint32(50).string(t.attribute[i]);if(t.node!=null&&t.node.length)for(var i=0;i<t.node.length;++i)v.onnx.NodeProto.encode(t.node[i],o.uint32(58).fork()).ldelim();if(t.docString!=null&&Object.hasOwnProperty.call(t,"docString")&&o.uint32(66).string(t.docString),t.opsetImport!=null&&t.opsetImport.length)for(var i=0;i<t.opsetImport.length;++i)v.onnx.OperatorSetIdProto.encode(t.opsetImport[i],o.uint32(74).fork()).ldelim();if(t.domain!=null&&Object.hasOwnProperty.call(t,"domain")&&o.uint32(82).string(t.domain),t.attributeProto!=null&&t.attributeProto.length)for(var i=0;i<t.attributeProto.length;++i)v.onnx.AttributeProto.encode(t.attributeProto[i],o.uint32(90).fork()).ldelim();return o},e.encodeDelimited=function(t,o){return this.encode(t,o).ldelim()},e.decode=function(t,o){t instanceof G||(t=G.create(t));for(var i=o===void 0?t.len:t.pos+o,s=new v.onnx.FunctionProto;t.pos<i;){var a=t.uint32();switch(a>>>3){case 1:{s.name=t.string();break}case 4:{s.input&&s.input.length||(s.input=[]),s.input.push(t.string());break}case 5:{s.output&&s.output.length||(s.output=[]),s.output.push(t.string());break}case 6:{s.attribute&&s.attribute.length||(s.attribute=[]),s.attribute.push(t.string());break}case 11:{s.attributeProto&&s.attributeProto.length||(s.attributeProto=[]),s.attributeProto.push(v.onnx.AttributeProto.decode(t,t.uint32()));break}case 7:{s.node&&s.node.length||(s.node=[]),s.node.push(v.onnx.NodeProto.decode(t,t.uint32()));break}case 8:{s.docString=t.string();break}case 9:{s.opsetImport&&s.opsetImport.length||(s.opsetImport=[]),s.opsetImport.push(v.onnx.OperatorSetIdProto.decode(t,t.uint32()));break}case 10:{s.domain=t.string();break}default:t.skipType(a&7);break}}return s},e.decodeDelimited=function(t){return t instanceof G||(t=new G(t)),this.decode(t,t.uint32())},e.verify=function(t){if(typeof t!="object"||t===null)return"object expected";if(t.name!=null&&t.hasOwnProperty("name")&&!I.isString(t.name))return"name: string expected";if(t.input!=null&&t.hasOwnProperty("input")){if(!Array.isArray(t.input))return"input: array expected";for(var o=0;o<t.input.length;++o)if(!I.isString(t.input[o]))return"input: string[] expected"}if(t.output!=null&&t.hasOwnProperty("output")){if(!Array.isArray(t.output))return"output: array expected";for(var o=0;o<t.output.length;++o)if(!I.isString(t.output[o]))return"output: string[] expected"}if(t.attribute!=null&&t.hasOwnProperty("attribute")){if(!Array.isArray(t.attribute))return"attribute: array expected";for(var o=0;o<t.attribute.length;++o)if(!I.isString(t.attribute[o]))return"attribute: string[] expected"}if(t.attributeProto!=null&&t.hasOwnProperty("attributeProto")){if(!Array.isArray(t.attributeProto))return"attributeProto: array expected";for(var o=0;o<t.attributeProto.length;++o){var i=v.onnx.AttributeProto.verify(t.attributeProto[o]);if(i)return"attributeProto."+i}}if(t.node!=null&&t.hasOwnProperty("node")){if(!Array.isArray(t.node))return"node: array expected";for(var o=0;o<t.node.length;++o){var i=v.onnx.NodeProto.verify(t.node[o]);if(i)return"node."+i}}if(t.docString!=null&&t.hasOwnProperty("docString")&&!I.isString(t.docString))return"docString: string expected";if(t.opsetImport!=null&&t.hasOwnProperty("opsetImport")){if(!Array.isArray(t.opsetImport))return"opsetImport: array expected";for(var o=0;o<t.opsetImport.length;++o){var i=v.onnx.OperatorSetIdProto.verify(t.opsetImport[o]);if(i)return"opsetImport."+i}}return t.domain!=null&&t.hasOwnProperty("domain")&&!I.isString(t.domain)?"domain: string expected":null},e.fromObject=function(t){if(t instanceof v.onnx.FunctionProto)return t;var o=new v.onnx.FunctionProto;if(t.name!=null&&(o.name=String(t.name)),t.input){if(!Array.isArray(t.input))throw TypeError(".onnx.FunctionProto.input: array expected");o.input=[];for(var i=0;i<t.input.length;++i)o.input[i]=String(t.input[i])}if(t.output){if(!Array.isArray(t.output))throw TypeError(".onnx.FunctionProto.output: array expected");o.output=[];for(var i=0;i<t.output.length;++i)o.output[i]=String(t.output[i])}if(t.attribute){if(!Array.isArray(t.attribute))throw TypeError(".onnx.FunctionProto.attribute: array expected");o.attribute=[];for(var i=0;i<t.attribute.length;++i)o.attribute[i]=String(t.attribute[i])}if(t.attributeProto){if(!Array.isArray(t.attributeProto))throw TypeError(".onnx.FunctionProto.attributeProto: array expected");o.attributeProto=[];for(var i=0;i<t.attributeProto.length;++i){if(typeof t.attributeProto[i]!="object")throw TypeError(".onnx.FunctionProto.attributeProto: object expected");o.attributeProto[i]=v.onnx.AttributeProto.fromObject(t.attributeProto[i])}}if(t.node){if(!Array.isArray(t.node))throw TypeError(".onnx.FunctionProto.node: array expected");o.node=[];for(var i=0;i<t.node.length;++i){if(typeof t.node[i]!="object")throw TypeError(".onnx.FunctionProto.node: object expected");o.node[i]=v.onnx.NodeProto.fromObject(t.node[i])}}if(t.docString!=null&&(o.docString=String(t.docString)),t.opsetImport){if(!Array.isArray(t.opsetImport))throw TypeError(".onnx.FunctionProto.opsetImport: array expected");o.opsetImport=[];for(var i=0;i<t.opsetImport.length;++i){if(typeof t.opsetImport[i]!="object")throw TypeError(".onnx.FunctionProto.opsetImport: object expected");o.opsetImport[i]=v.onnx.OperatorSetIdProto.fromObject(t.opsetImport[i])}}return t.domain!=null&&(o.domain=String(t.domain)),o},e.toObject=function(t,o){o||(o={});var i={};if((o.arrays||o.defaults)&&(i.input=[],i.output=[],i.attribute=[],i.node=[],i.opsetImport=[],i.attributeProto=[]),o.defaults&&(i.name="",i.docString="",i.domain=""),t.name!=null&&t.hasOwnProperty("name")&&(i.name=t.name),t.input&&t.input.length){i.input=[];for(var s=0;s<t.input.length;++s)i.input[s]=t.input[s]}if(t.output&&t.output.length){i.output=[];for(var s=0;s<t.output.length;++s)i.output[s]=t.output[s]}if(t.attribute&&t.attribute.length){i.attribute=[];for(var s=0;s<t.attribute.length;++s)i.attribute[s]=t.attribute[s]}if(t.node&&t.node.length){i.node=[];for(var s=0;s<t.node.length;++s)i.node[s]=v.onnx.NodeProto.toObject(t.node[s],o)}if(t.docString!=null&&t.hasOwnProperty("docString")&&(i.docString=t.docString),t.opsetImport&&t.opsetImport.length){i.opsetImport=[];for(var s=0;s<t.opsetImport.length;++s)i.opsetImport[s]=v.onnx.OperatorSetIdProto.toObject(t.opsetImport[s],o)}if(t.domain!=null&&t.hasOwnProperty("domain")&&(i.domain=t.domain),t.attributeProto&&t.attributeProto.length){i.attributeProto=[];for(var s=0;s<t.attributeProto.length;++s)i.attributeProto[s]=v.onnx.AttributeProto.toObject(t.attributeProto[s],o)}return i},e.prototype.toJSON=function(){return this.constructor.toObject(this,Ee.util.toJSONOptions)},e.getTypeUrl=function(t){return t===void 0&&(t="type.googleapis.com"),t+"/onnx.FunctionProto"},e})(),r})();Zd.exports=v});function yr(r,e){if(!r)throw new Error(typeof e=="string"?e:e())}function qr(r){return new TextDecoder().decode(r)}var De,Xn,iu,Qe,Wo,Xe,ot,Z,Hr,Zn,Jn,Qn,xe=A(()=>{"use strict";Ss();De=ue(br());Yn();Xn=class{static arraysEqual(e,n){if(e.length!==n.length)return!1;for(let t=0;t<e.length;t++)if(e[t]!==n[t])return!1;return!0}},iu=class{static preprocessInputShapes(e,n){let t=e.length===1?[1,e[0]]:e,o=n.length===1?[n[0],1]:n;return[t,o]}static postprocessOutputShape(e,n,t){n===1&&e.splice(e.length-2,1),t===1&&e.pop()}static calcMatMulShape(e,n){return e[1]!==n[0]?void 0:[e[0],n[1]]}},Qe=class r{static calcShape(e,n,t=!1){let o=e.length,i=n.length;if(o===0)return n;if(i===0)return e;let s=Math.max(e.length,n.length),a=new Array(s);if(t){if(o<2||i<2)return;let u=iu.calcMatMulShape([e[o-2],e[o-1]],[n[i-2],n[i-1]]);if(u===void 0)return;[a[s-2],a[s-1]]=u}for(let u=t?3:1;u<=s;u++){let l=o-u<0?1:e[o-u],c=i-u<0?1:n[i-u];if(l!==c&&l>1&&c>1)return;a[s-u]=Math.max(l,c)}return a}static index(e,n){let t=new Array(n.length);return r.fillIndex(e,n,t),t}static fillIndex(e,n,t){let o=e.length-n.length;for(let i=0;i<n.length;i++)t[i]=e[o+i]%n[i]}static calc(e,n,t,o,i){let s=r.calcShape(e.dims,n.dims);if(s){if(o&&!Z.areEqual(s,e.dims))return;let a=Z.size(s),u=o?e:new Fe(s,i||e.type);if(s.length===0)u.set([],t(e.get([]),n.get([])));else{let l=new Array(s.length),c=new Array(e.dims.length),d=new Array(n.dims.length),p=0,f=0,h=!1,m=!1;e.dims.length===0&&(p=e.get([]),h=!0),n.dims.length===0&&(f=n.get([]),m=!0);let y;for(let g=0;g<a;g++){y=g;for(let b=s.length-1;b>=0;b--)l[b]=y%s[b],y=Math.floor(y/s[b]);h||(r.fillIndex(l,e.dims,c),p=e.get(c)),m||(r.fillIndex(l,n.dims,d),f=n.get(d)),u.set(l,t(p,f))}}return u}}static isValidBroadcast(e,n){let t=e.length,o=n.length;if(t>o)return!1;for(let i=1;i<=t;i++)if(e[t-i]!==1&&e[t-i]!==n[o-i])return!1;return!0}static getBroadcastDims(e,n){let t=e.length,o=[];for(let i=0;i<t;i++){let s=t-1-i,a=e[s]||1;(n[n.length-1-i]||1)>1&&a===1&&o.unshift(s)}return o}},Wo=class{static getShapeOfGemmResult(e,n,t,o,i){if(e.length!==2||t.length!==2)throw new Error("shape need to be of size 2");let s,a,u;n?(s=e[1],a=e[0]):(s=e[0],a=e[1]);let l=-1;if(o?(u=t[0],l=1):(u=t[1],l=0),t[l]!==a)throw new Error("dimension mismatch");if(s<=0||u<=0||a<=0)throw new Error("invalid shape specified");if(i&&!Qe.isValidBroadcast(i,[s,u]))throw new Error("gemm: invalid bias shape for broadcast");return[s,u,a]}},Xe=class r{static tensorDataTypeFromProto(e){switch(e){case De.onnx.TensorProto.DataType.INT8:return"int8";case De.onnx.TensorProto.DataType.UINT8:return"uint8";case De.onnx.TensorProto.DataType.BOOL:return"bool";case De.onnx.TensorProto.DataType.INT16:return"int16";case De.onnx.TensorProto.DataType.UINT16:return"uint16";case De.onnx.TensorProto.DataType.INT32:return"int32";case De.onnx.TensorProto.DataType.UINT32:return"uint32";case De.onnx.TensorProto.DataType.FLOAT:return"float32";case De.onnx.TensorProto.DataType.DOUBLE:return"float64";case De.onnx.TensorProto.DataType.STRING:return"string";case De.onnx.TensorProto.DataType.INT64:return"int32";case De.onnx.TensorProto.DataType.UINT64:return"uint32";default:throw new Error(`unsupported data type: ${De.onnx.TensorProto.DataType[e]}`)}}static tensorDataTypeStringToEnum(e){switch(e){case"int8":return De.onnx.TensorProto.DataType.INT8;case"uint8":return De.onnx.TensorProto.DataType.UINT8;case"bool":return De.onnx.TensorProto.DataType.BOOL;case"int16":return De.onnx.TensorProto.DataType.INT16;case"uint16":return De.onnx.TensorProto.DataType.UINT16;case"int32":return De.onnx.TensorProto.DataType.INT32;case"uint32":return De.onnx.TensorProto.DataType.UINT32;case"float32":return De.onnx.TensorProto.DataType.FLOAT;case"float64":return De.onnx.TensorProto.DataType.DOUBLE;case"string":return De.onnx.TensorProto.DataType.STRING;case"int64":return De.onnx.TensorProto.DataType.INT64;case"uint64":return De.onnx.TensorProto.DataType.UINT64;default:throw new Error(`unsupported data type: ${e}`)}}static tensorDimsFromProto(e){return e.map(n=>Cn.isLong(n)?n.toNumber():n)}static tensorValueTypeFromProto(e){return{tensorType:r.tensorDataTypeFromProto(e.elemType),shape:{dims:r.tensorDimsFromProto(e.shape.dim.map(n=>n.dimValue))}}}static tensorDimsFromORTFormat(e){let n=[];for(let t=0;t<e.dimsLength();t++)n.push(ot.longToNumber(e.dims(t)));return n}static tensorAttributesFromORTFormat(e){let n=[];for(let t=0;t<e.attributesLength();t++)n.push(e.attributes(t));return n}},ot=class{static longToNumber(e){return Cn.isLong(e)?e.toNumber():typeof e=="bigint"?Number(e):e}static isLong(e){return Cn.isLong(e)||typeof e=="bigint"}},Z=class r{static size(e){return r.getSizeFromDimensionRange(e,0,e.length)}static sizeFromDimension(e,n){if(n<0||n>e.length)throw new Error(`invalid dimension of ${n} for sizeFromDimension as Tensor has ${e.length} dimensions.`);return r.getSizeFromDimensionRange(e,n,e.length)}static sizeToDimension(e,n){if(n<0||n>e.length)throw new Error(`invalid dimension of ${n} for sizeToDimension as Tensor has ${e.length} dimensions.`);return r.getSizeFromDimensionRange(e,0,n)}static getSizeFromDimensionRange(e,n,t){let o=1;for(let i=n;i<t;i++){if(e[i]<=0)throw new Error("cannot get valid size from specified dimension range. Most likely the range contains 0 or negative values in them.");o*=e[i]}return o}static computeStrides(e){let n=e.length;if(n===0)return[];if(n===1)return[1];let t=new Array(n);t[n-1]=1,t[n-2]=e[n-1];for(let o=n-3;o>=0;--o)t[o]=t[o+1]*e[o+1];return t}static transpose(e){return e.slice().reverse()}static indicesToOffset(e,n,t){t===void 0&&(t=e.length);let o=0;for(let i=0;i<t;++i)o+=n[i]*e[i];return o}static offsetToIndices(e,n){let t=n.length;if(t===0)return[];if(t===1)return[e*n[0]];let o=new Array(n.length);for(let i=0;i<o.length-1;++i)o[i]=Math.floor(e/n[i]),e-=o[i]*n[i];return o[o.length-1]=e,o}static normalizeAxis(e,n){if(e<-n&&e>=n)throw new Error("unsupported axis for this operation.");return e<0?e+n:e}static normalizeAxes(e,n){return e.map(t=>this.normalizeAxis(t,n))}static incrementIndex(e,n,t){if(n.length===0||e.length===0)throw new Error("Index incrementing unsupported for scalar Tensor");if(t===void 0)t=n.length;else if(t<=0||t>n.length)throw new Error("Incorrect axis to increment on");for(let o=t-1;o>=0&&(e[o]++,!(e[o]<n[o]));--o)e[o]=0}static calculateReshapedDims(e,n){if(n.length===0){if(e.length===0||r.size(e)===1)return[];throw new Error("cannot reshape to a scalar Tensor")}let t=n.length,o=new Array(t),i=-1,s=1;for(let u=0;u<t;u++){if(n[u]<-1)throw new Error("a dimension in shape hints cannot be less than -1");if(n[u]===-1){if(i!==-1)throw new Error("at most one dimension in shape hints can be -1");i=u}else{if(n[u]===0){if(u>=e.length)throw new Error("the dimension with value zero exceeds the dimension size of the input tensor");o[u]=e[u]}else o[u]=n[u];s*=o[u]}}let a=r.size(e);if(i!==-1){if(a%s!==0)throw new Error(`the input tensor cannot be reshaped to the requested shape. Input shape: [${e}] Output shape: [${n}]`);o[i]=a/s}else if(s!==a)throw new Error("reshapedDims and originalDims don't have matching sizes");return o}static sortBasedOnPerm(e,n){return n?n.map(t=>e[t]):e.slice().reverse()}static padShape(e,n){let t=e.length;return e.map((o,i)=>o+n[i]+n[i+t])}static areEqual(e,n){return e.length!==n.length?!1:e.every((t,o)=>t===n[o])}static validateDimsAndCalcSize(e){if(e.length>6)throw new TypeError("Only rank 0 to 6 is supported for tensor shape.");let n=1;for(let t of e){if(!Number.isInteger(t))throw new TypeError(`Invalid shape: ${t} is not an integer`);if(t<0||t>2147483647)throw new TypeError(`Invalid shape: length ${t} is not allowed`);n*=t}return n}static flattenShape(e,n){n<0&&(n+=e.length);let t=e.reduce((s,a)=>s*a,1),o=e.slice(n).reduce((s,a)=>s*a,1);return[t/o,o]}static squeezeShape(e,n){let t=new Array;n=r.normalizeAxes(n,e.length);for(let o=0;o<e.length;o++){let i=n.indexOf(o)>=0;if(i&&e[o]!==1)throw new Error("squeeze an axis of size different than 1");(n.length===0&&e[o]>1||n.length>0&&!i)&&t.push(e[o])}return t}static unsqueezeShape(e,n){let t=new Array(e.length+n.length);t.fill(0);for(let i=0;i<n.length;i++){let s=r.normalizeAxis(n[i],t.length);if(s>=t.length)throw new Error("'axes' has an out of range axis");if(t[s]!==0)throw new Error("'axes' has a duplicate axis");t[s]=1}let o=0;for(let i=0;i<t.length;i++)t[i]===0&&(t[i]=e[o++]);if(o!==e.length)throw new Error("the unsqueezed dimension could not be established");return t}},Hr=class r{static splitShape(e,n,t,o){if(t.length===0){if(!o)throw new Error("need to know number of outputs when the 'split' attribute is not specified");r.determineSplit(e[n],o,t)}let i=[],s=[0];for(let a=0;a<t.length;++a){a!==0&&s.push(s[a-1]+t[a-1]);let u=e.slice();u[n]=t[a],i.push(u)}return[i,s]}static determineSplit(e,n,t){if(e%n!==0)throw new Error("cannot split tensor to equal sized parts");for(let o=0;o<n;++o)t.push(e/n)}},Zn=class r{static adjustPoolAttributes(e,n,t,o,i,s){if(!e&&t.length!==n.length-2)throw new Error("length of specified kernel shapes should be 2 less than length of input dimensions");if(e)for(let a=0;a<n.length-2;a++)a>=t.length?t.push(n[a+2]):t[a]=n[a+2];for(let a=0;a<t.length;a++)if(a<o.length){if(o[a]<0)throw new Error("strides should be greater than or equal to 1")}else o.push(1);for(let a=0;a<t.length;a++)if(a<i.length){if(i[a]<0)throw new Error("dilations should be greater than or equal to 1")}else i.push(1);for(let a=0;a<t.length*2;a++)if(a<s.length){if(s[a]<0)throw new Error("pad should be greater than or equal to 1")}else s.push(0);for(let a=0;a<t.length;a++){if(t[a]<=0)throw new Error("kernel shapes need to be greater than 0");if(s[a]>=t[a]||s[a+t.length]>=t[a])throw new Error("pads should be smaller than kernel")}}static adjustPadsBasedOnAutoPad(e,n,t,o,i,s){if(s){if(i.length!==2*(e.length-2))throw new Error("length of pads should be twice the length of data dimensions");if(n.length!==e.length-2)throw new Error("length of strides should be the length of data dimensions");if(o.length!==e.length-2)throw new Error("length of kernel shapes should be the length of data dimensions");for(let a=0;a<e.length-2;a++)r.adjustPadAndReturnShape(e[a+2],n[a],t[a],o[a],i,a,a+e.length-2,s)}}static computePoolOutputShape(e,n,t,o,i,s,a,u=0){if(n.length<=0)throw new Error("input shape must be of size greater than 0");let l=[n[0],n[1]];return r.computeShapeHelper(e,n,l,t,o,i,s,a,u),l}static computeConvOutputShape(e,n,t,o,i,s,a){if(e.length<=0||n.length<=0)throw new Error("invalid input tensor dims or invalid filter tensor dims");let u=[e[0],n[0]];return r.computeShapeHelper(!1,e,u,t,o,i,s,a),u}static computeShapeHelper(e,n,t,o,i,s,a,u,l=0){if(e)for(let c=0;c<n.length-2;c++)t.push(1);else for(let c=0;c<n.length-2;c++)t.push(r.adjustPadAndReturnShape(n[c+2],o[c],i[c],s[c],a,c,c+n.length-2,u,l))}static computeOutputSize(e,n,t,o,i){let s=Math.floor(e/n)+1;return i===1&&(s=Math.ceil(e/n)+1,(s-1)*n>=t+o&&(s-=1)),s}static adjustPadAndReturnShape(e,n,t,o,i,s,a,u,l=0){let c=t*(o-1)+1;if(u&&u!=="NOTSET")switch(u){case"VALID":return i[s]=0,i[a]=0,r.computeOutputSize(e-c,n,e,0,l);case"SAME_LOWER":case"SAME_UPPER":if(t!==1)throw new Error("Dilation not supported for SAME_UPPER or SAME_LOWER");{let p=(Math.floor((e+n-1)/n)-1)*n+o-e;return i[s]=Math.floor(u==="SAME_LOWER"?(p+1)/2:p/2),i[a]=p-i[s],r.computeOutputSize(e+i[s]+i[a]-c,n,e,i[s],l)}default:throw new Error("Unsupported AutoPad type")}else return r.computeOutputSize(e+i[s]+i[a]-c,n,e,i[s],l)}},Jn=-34028234663852886e22,Qn=34028234663852886e22});function k0(r){switch(r){case"bool":case"int8":case"uint8":return 1;case"int16":case"uint16":return 2;case"int32":case"uint32":case"float32":return 4;case"float64":return 8;default:throw new Error(`cannot calculate sizeof() on type ${r}`)}}function Jd(r){switch(r){case pe.onnx.TensorProto.DataType.UINT8:case pe.onnx.TensorProto.DataType.INT8:case pe.onnx.TensorProto.DataType.BOOL:return 1;case pe.onnx.TensorProto.DataType.UINT16:case pe.onnx.TensorProto.DataType.INT16:return 2;case pe.onnx.TensorProto.DataType.FLOAT:case pe.onnx.TensorProto.DataType.INT32:case pe.onnx.TensorProto.DataType.UINT32:return 4;case pe.onnx.TensorProto.DataType.INT64:case pe.onnx.TensorProto.DataType.DOUBLE:case pe.onnx.TensorProto.DataType.UINT64:return 8;default:throw new Error(`cannot calculate sizeof() on type ${pe.onnx.TensorProto.DataType[r]}`)}}function L0(r,e){return new(ep(e))(r)}function ep(r){switch(r){case"bool":case"uint8":return Uint8Array;case"int8":return Int8Array;case"int16":return Int16Array;case"uint16":return Uint16Array;case"int32":return Int32Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"float32":return Float32Array;case"float64":return Float64Array;default:throw new Error("unspecified error")}}function su(r,e){if(e===pe.onnx.TensorProto.DataType.INT64||e===Mr.TensorDataType.INT64){if(r.greaterThanOrEqual(2147483648)||r.lessThan(-2147483648))throw new TypeError("int64 is not supported")}else if(e===pe.onnx.TensorProto.DataType.UINT32||e===Mr.TensorDataType.UINT32||e===pe.onnx.TensorProto.DataType.UINT64||e===Mr.TensorDataType.UINT64){if(r.greaterThanOrEqual(4294967296)||r.lessThan(0))throw new TypeError("uint64 is not supported")}else throw new TypeError(`not a LONG type: ${pe.onnx.TensorProto.DataType[e]}`);return r.toNumber()}function Qd(r,e,n){switch(e){case pe.onnx.TensorProto.DataType.BOOL:case pe.onnx.TensorProto.DataType.UINT8:return r.getUint8(n);case pe.onnx.TensorProto.DataType.INT8:return r.getInt8(n);case pe.onnx.TensorProto.DataType.UINT16:return r.getUint16(n,!0);case pe.onnx.TensorProto.DataType.INT16:return r.getInt16(n,!0);case pe.onnx.TensorProto.DataType.FLOAT:return r.getFloat32(n,!0);case pe.onnx.TensorProto.DataType.INT32:return r.getInt32(n,!0);case pe.onnx.TensorProto.DataType.UINT32:return r.getUint32(n,!0);case pe.onnx.TensorProto.DataType.INT64:return su(Cn.fromBits(r.getUint32(n,!0),r.getUint32(n+4,!0),!1),e);case pe.onnx.TensorProto.DataType.DOUBLE:return r.getFloat64(n,!0);case pe.onnx.TensorProto.DataType.UINT64:return su(Cn.fromBits(r.getUint32(n,!0),r.getUint32(n+4,!0),!0),e);default:throw new Error(`cannot read from DataView for type ${pe.onnx.TensorProto.DataType[e]}`)}}var Yd,pe,Fe,Yn=A(()=>{"use strict";Yd=ue(fc());Ss();Vr();pe=ue(br());xe();Fe=class r{constructor(e,n,t,o,i,s=Yd.Guid.create()){this.dims=e;this.type=n;this.dataProvider=t;this.asyncDataProvider=o;this.cache=i;this.dataId=s;this.size=Z.validateDimsAndCalcSize(e);let a=this.size,u=t===void 0&&o===void 0&&i===void 0;if(i!==void 0&&i.length!==a)throw new RangeError("Input dims doesn't match data length.");if(n==="string"){if(i!==void 0&&(!Array.isArray(i)||!i.every(l=>typeof l=="string")))throw new TypeError("cache should be a string array");u&&(this.cache=new Array(a))}else{if(i!==void 0){let l=ep(n);if(!(i instanceof l))throw new TypeError(`cache should be type ${l.name}`)}if(u){let l=new ArrayBuffer(a*k0(n));this.cache=L0(l,n)}}}get data(){if(this.cache===void 0){let e=this.dataProvider(this.dataId);if(e.length!==this.size)throw new Error("Length of data provided by the Data Provider is inconsistent with the dims of this Tensor.");this.cache=e}return this.cache}get stringData(){if(this.type!=="string")throw new TypeError("data type is not string");return this.data}get integerData(){switch(this.type){case"uint8":case"int8":case"uint16":case"int16":case"int32":case"uint32":case"bool":return this.data;default:throw new TypeError("data type is not integer (uint8, int8, uint16, int16, int32, uint32, bool)")}}get floatData(){switch(this.type){case"float32":case"float64":return this.data;default:throw new TypeError("data type is not float (float32, float64)")}}get numberData(){if(this.type!=="string")return this.data;throw new TypeError("type cannot be non-number (string)")}get(e){return this.data[Z.indicesToOffset(e,this.strides)]}set(e,n){this.data[Z.indicesToOffset(e,this.strides)]=n}async getData(){return this.cache===void 0&&(this.cache=await this.asyncDataProvider(this.dataId)),this.cache}get strides(){return this._strides||(this._strides=Z.computeStrides(this.dims)),this._strides}static fromProto(e){if(!e)throw new Error("cannot construct Value from an empty tensor");let n=Xe.tensorDataTypeFromProto(e.dataType),t=Xe.tensorDimsFromProto(e.dims),o=new r(t,n);if(n==="string")e.stringData.forEach((i,s)=>{o.data[s]=qr(i)});else if(e.rawData&&typeof e.rawData.byteLength=="number"&&e.rawData.byteLength>0){let i=o.data,s=new DataView(e.rawData.buffer,e.rawData.byteOffset,e.rawData.byteLength),a=Jd(e.dataType),u=e.rawData.byteLength/a;if(e.rawData.byteLength%a!==0)throw new Error("invalid buffer length");if(i.length!==u)throw new Error("buffer length mismatch");for(let l=0;l<u;l++){let c=Qd(s,e.dataType,l*a);i[l]=c}}else{let i;switch(e.dataType){case pe.onnx.TensorProto.DataType.FLOAT:i=e.floatData;break;case pe.onnx.TensorProto.DataType.INT32:case pe.onnx.TensorProto.DataType.INT16:case pe.onnx.TensorProto.DataType.UINT16:case pe.onnx.TensorProto.DataType.INT8:case pe.onnx.TensorProto.DataType.UINT8:case pe.onnx.TensorProto.DataType.BOOL:i=e.int32Data;break;case pe.onnx.TensorProto.DataType.INT64:i=e.int64Data;break;case pe.onnx.TensorProto.DataType.DOUBLE:i=e.doubleData;break;case pe.onnx.TensorProto.DataType.UINT32:case pe.onnx.TensorProto.DataType.UINT64:i=e.uint64Data;break;default:throw new Error("unspecific error")}if(i==null)throw new Error("failed to populate data from a tensorproto value");let s=o.data;if(s.length!==i.length)throw new Error("array length mismatch");for(let a=0;a<i.length;a++){let u=i[a];Cn.isLong(u)?s[a]=su(u,e.dataType):s[a]=u}}return o}static fromData(e,n,t){return new r(n,t,void 0,void 0,e)}static fromOrtTensor(e){if(!e)throw new Error("cannot construct Value from an empty tensor");let n=Xe.tensorDimsFromORTFormat(e),t=Xe.tensorDataTypeFromProto(e.dataType()),o=new r(n,t);if(t==="string")for(let i=0;i<e.stringDataLength();i++)o.data[i]=e.stringData(i);else if(e.rawDataArray()&&typeof e.rawDataLength()=="number"&&e.rawDataLength()>0){let i=o.data,s=new DataView(e.rawDataArray().buffer,e.rawDataArray().byteOffset,e.rawDataLength()),a=Jd(e.dataType()),u=e.rawDataLength()/a;if(e.rawDataLength()%a!==0)throw new Error("invalid buffer length");if(i.length!==u)throw new Error("buffer length mismatch");for(let l=0;l<u;l++){let c=Qd(s,e.dataType(),l*a);i[l]=c}}return o}}});function Y(r){return r===1?N0:R0}function tp(r){let e=Y(r);return`${e.version}
      precision highp float;
      ${e.attribute} vec3 position;
      ${e.attribute} vec2 textureCoord;

      ${e.varyingVertex} vec2 TexCoords;

      void main()
      {
          gl_Position = vec4(position, 1.0);
          TexCoords = textureCoord;
      }`}function np(r){let e=Y(r);return`${e.version}
    precision highp float;
    precision highp int;
    precision highp sampler2D;
    ${e.varyingFrag} vec2 TexCoords;
    ${e.outputDeclaration}
    const vec2 halfCR = vec2(0.5, 0.5);

    // Custom vector types to handle higher dimenalities.
    struct ivec5
    {
      int x;
      int y;
      int z;
      int w;
      int u;
    };

    struct ivec6
    {
      int x;
      int y;
      int z;
      int w;
      int u;
      int v;
    };

    int imod(int x, int y) {
      return x - y * (x / y);
    }

    `}function rp(r,e){let n=Y(r);return`
  void main() {
    int indices[${e}];
    toVec(TexCoords, indices);
    vec4 result = vec4(process(indices));
    ${n.output} = result;
  }
  `}var N0,R0,Le=A(()=>{"use strict";N0={version:"",attribute:"attribute",varyingVertex:"varying",varyingFrag:"varying",texture2D:"texture2D",output:"gl_FragColor",outputDeclaration:""},R0={version:"#version 300 es",attribute:"in",varyingVertex:"out",varyingFrag:"in",texture2D:"texture",output:"outputColor",outputDeclaration:"out vec4 outputColor;"}});var he=A(()=>{"use strict"});async function au(r,e=t=>0,n){return new Promise((t,o)=>{let i=0,s=()=>{if(r()){t();return}i++;let a=e(i);if(n!=null&&i>=n){o();return}setTimeout(s,a)};s()})}function Ho(r){return yr(typeof r<"u"&&r.length!==0,()=>"empty string found for sampler name"),"get"+r.charAt(0).toUpperCase()+r.slice(1)}function op(r){return yr(typeof r<"u"&&r.length!==0,()=>"empty string found for sampler name"),"get"+r.charAt(0).toUpperCase()+r.slice(1)+"AtOutCoords"}function _r(r,e){let n=JSON.parse(JSON.stringify(r));return n=e,n}function wr(r,e){return e.map(n=>r[n]).join(", ")}function Ye(r){if(r<=1)return"int";if(r===2)return"ivec2";if(r===3)return"ivec3";if(r===4)return"ivec4";if(r===5)return"ivec5";if(r===6)return"ivec6";throw Error(`GPU for rank ${r} is not yet supported`)}function $t(r=6){return["x","y","z","w","u","v"].slice(0,r)}var dn=A(()=>{"use strict";xe()});function z0(r,e){return $t(e).map(n=>`${r}.${n}`)}function vr(r,e){return e===1?[r]:z0(r,e)}function pn(){return`
    float getChannel(vec4 frag, int dim) {
      int modCoord = imod(dim, 2);
      return modCoord == 0 ? frag.r : frag.g;
    }

    float getChannel(vec4 frag, vec2 innerDims) {
      vec2 modCoord = mod(innerDims, 2.);
      return modCoord.x == 0. ?
        (modCoord.y == 0. ? frag.r : frag.g) :
        (modCoord.y == 0. ? frag.b : frag.a);
    }
  `}var er=A(()=>{"use strict";dn()});function M0(r,e,n){if(r===0)return"false";if(r===1)return`rc > ${e[0]}`;let t="";for(let o=r-2;o<r;o++)t+=`${n[o]} >= ${e[o-r+2]}`,o<r-1&&(t+="||");return t}function V0(r,e){let n=r.length;if(n===0)return"getA(), 0, 0, 0";if(n===1)return`getA(rc),
            rc + 1 >= ${r[0]} ? 0. : getA(rc + 1),
            0, 0`;let t="r, c",o="r, cp1",i="rp1, c",s="rp1, cp1",a="";if(n>2)for(let u=0;u<n-2;++u)a=a+`${e[u]},`;return`getA(${a}${t}),
          rEdge ? 0. : getA(${a}${i}),
          cEdge ? 0. : getA(${a}${o}),
          rEdge || cEdge ? 0. : getA(${a}${s})`}function F0(r,e,n,t){return r===0||r===1?"":`
    int r = ${e[r-2]};
    int c = ${e[r-1]};
    int rp1 = ${e[r-2]} + 1;
    int cp1 = ${e[r-1]} + 1;
    bool rEdge = rp1 >= ${t};
    bool cEdge = cp1 >= ${n};
    `}var ip,B0,sp,ap=A(()=>{"use strict";Le();he();dn();er();ip={name:"pack",inputNames:["A"],inputTypes:[1]},B0=(r,e)=>{let n=Y(r.session.backend.glContext.version),t=e.dims,o=t.length,i=e.dims.length,s=Ye(i),a=vr("rc",i),u=F0(i,a,t[t.length-2],t[t.length-1]),l;o===0?l=[1,1]:o===1?l=[t[0],1]:l=[t[i-1],t[i-2]];let c=M0(i,l,a),d=V0(t,a),p=`
        void main() {
          ${s} rc = getOutputCoords();

          if(${c}) {
            ${n.output} = vec4(0);
          } else {
            ${u}

            ${n.output} = vec4(${d});
          }
        }
      `;return{...ip,hasMain:!0,output:{dims:e.dims,type:e.type,textureType:2},shaderSource:p}},sp=(r,e)=>({...ip,get:()=>B0(r,e)})});function uu(r){if(r.length===0)return[1,1,1];let e=1;for(let n=0;n<r.length-2;++n)e*=r[n];return[e,r.length>1?r[r.length-2]:1,r[r.length-1]]}function lp(r,e){let n=!1;return r.length===0||e.length===0?n=!0:r.length<2||e.length<2?n=r[r.length-1]===e[e.length-1]:n=r[r.length-1]===e[e.length-1]&&r[r.length-2]===e[e.length-2],n}function W0(r){let e=Z.computeStrides(r),n=["b","r","c"],t="index";return`
    ivec3 inputCoordsFromReshapedOutCoords(int index) {
      ${e.map((i,s)=>{let a=`int ${n[s]} = ${t} / ${i}`,u=s===e.length-1?`int ${n[s+1]} = ${t} - ${n[s]} * ${i}`:`index -= ${n[s]} * ${i}`;return`${a}; ${u};`}).join("")}
      return ivec3(b, r, c);
    }
  `}function H0(r){let e=Z.computeStrides(r);return`
  int getFlattenedIndex(ivec3 coords) {
    // reverse y, z order
    return coords.x * ${e[0]} + coords.z * ${e[1]} + coords.y;
  }
`}var G0,U0,up,cp=A(()=>{"use strict";xe();Le();he();er();G0=r=>({name:"Reshape (packed)",inputTypes:[2],inputNames:["A"],cacheHint:`${r}`}),U0=(r,e,n,t)=>{let o=e.dims,i=t,s="";for(let l=0;l<4;l++){let c="";switch(l){case 0:c="outputCoords = rc;";break;case 1:c="outputCoords = ivec3(rc.x, rc.y+1, rc.z);";break;case 2:c="outputCoords = ivec3(rc.x, rc.y, rc.z+1);";break;case 3:c="outputCoords = ivec3(rc.x, rc.y+1, rc.z+1);";break;default:throw new Error}s+=`
        ${c}
        ${l>0?"if(outputCoords.y < rows && outputCoords.z < cols){":""}
          int flattenedIndex = getFlattenedIndex(outputCoords);

          ivec3 inputRC = inputCoordsFromReshapedOutCoords(flattenedIndex);
          vec2 innerDims = vec2(float(inputRC.y),float(inputRC.z));

          result[${l}] = getChannel(getA(inputRC.x, inputRC.y, inputRC.z), innerDims);

        ${l>0?"}":""}
      `}let a=Y(r.session.backend.glContext.version),u=`
      ${W0(o)}
      ${H0(i)}
      ${pn()}

      void main() {
        ivec3 rc = getOutputCoords();

        vec4 result = vec4(0.0);

        ivec3 outputCoords;
        int rows = ${i[2]};
        int cols = ${i[1]};

        ${s}
        ${a.output} = result;
      }
    `;return{...n,output:{dims:i,type:e.type,textureType:2},shaderSource:u,hasMain:!0}},up=(r,e,n)=>{let t=G0(n);return{...t,get:()=>U0(r,e,t,n)}}});var lu,dp=A(()=>{"use strict";Le();he();lu=(r,e)=>{let n=e.shape,t=Y(r.session.backend.glContext.version),o=`
    const float FLOAT_MAX = 1.70141184e38;
    const float FLOAT_MIN = 1.17549435e-38;

    bool isNaN(float val) {
      return (val < 1.0 || 0.0 < val || val == 0.0) ? false : true;
    }

    highp vec4 encodeAsUint8(highp float v) {
      if (isNaN(v)) {
        return vec4(255, 255, 255, 255);
      }

      highp float av = abs(v);

      if(av < FLOAT_MIN) {
        return vec4(0.0, 0.0, 0.0, 0.0);
      } else if(v > FLOAT_MAX) {
        return vec4(0.0, 0.0, 128.0, 127.0) / 255.0;
      } else if(v < -FLOAT_MAX) {
        return vec4(0.0, 0.0,  128.0, 255.0) / 255.0;
      }

      highp vec4 c = vec4(0,0,0,0);

      highp float e = floor(log2(av));
      highp float m = exp2(fract(log2(av))) - 1.0;

      c[2] = floor(128.0 * m);
      m -= c[2] / 128.0;
      c[1] = floor(32768.0 * m);
      m -= c[1] / 32768.0;
      c[0] = floor(8388608.0 * m);

      highp float ebias = e + 127.0;
      c[3] = floor(ebias / 2.0);
      ebias -= c[3] * 2.0;
      c[2] += floor(ebias) * 128.0;

      c[3] += 128.0 * step(0.0, -v);

      return c / 255.0;
    }

    void main() {
      float value = ${t.texture2D}(X,TexCoords).r;
      ${t.output} = encodeAsUint8(value);
    }`,i={name:"Uint8Encode",inputTypes:[0],inputNames:["X"],output:{dims:n,type:e.tensor.type,textureType:3},shaderSource:o,hasMain:!0};return r.executeProgram(i,[e.tensor])}});function j0(r,e){if(r===1)return"rc";let n="";for(let t=0;t<r;t++)n+=e[t],t<r-1&&(n+=",");return n}var pp,q0,fp,hp=A(()=>{"use strict";Le();he();dn();er();pp={name:"unpack",inputNames:["A"],inputTypes:[2]},q0=(r,e)=>{let n=e.dims.length,t=vr("rc",n),o=t.slice(-2),i=Ye(n),s=pn(),u=e.dims.length===0?"":j0(n,t),l=n<=1?"rc":`vec2(${o.join(",")})`,c=Y(r.session.backend.glContext.version),d=`
    ${s}
    void main() {
      ${i} rc = getOutputCoords();

       // Sample the texture with the coords to get the rgba channel value.
       vec4 packedInput = getA(${u});

       ${c.output} = vec4(getChannel(packedInput, ${l}), 0, 0, 0);
     }
   `;return{...pp,hasMain:!0,output:{dims:e.dims,type:e.type,textureType:0},shaderSource:d}},fp=(r,e)=>({...pp,get:()=>q0(r,e)})});var qo,jr,jo,Kr=A(()=>{"use strict";dt();qo=class{constructor(e,n=1){if(n===1)this.internalFormat=e.R32F,this.format=e.RED,this.textureType=e.FLOAT,this.channelSize=n;else if(n===4)this.internalFormat=e.RGBA32F,this.format=e.RGBA,this.textureType=e.FLOAT,this.channelSize=n;else throw new Error(`Invalid number of channels: ${n}`)}encode(e,n){let t,o;return e.constructor!==Float32Array&&(Ie.warning("Encoder","data was not of type Float32; creating new Float32Array"),o=new Float32Array(e)),n*this.channelSize>e.length?(Ie.warning("Encoder","Source data too small. Allocating larger array"),o=e,t=this.allocate(n*this.channelSize),o.forEach((i,s)=>t[s]=i)):(o=e,t=o),t}allocate(e){return new Float32Array(e*4)}decode(e,n){return this.channelSize===1?e.filter((o,i)=>i%4===0).subarray(0,n):e.subarray(0,n)}},jr=class{constructor(e,n=1,t){if(n!==1&&n!==4)throw new Error(`Invalid number of channels: ${n}`);this.internalFormat=e.RGBA,this.format=e.RGBA,this.channelSize=n,this.textureType=t||e.FLOAT}encode(e,n){let t=e;return this.channelSize===1&&(Ie.verbose("Encoder","Exploding into a larger array"),t=this.allocate(n),e.forEach((o,i)=>t[i*4]=o)),t}allocate(e){return new Float32Array(e*4)}decode(e,n){return this.channelSize===1?e.filter((o,i)=>i%4===0).subarray(0,n):e.subarray(0,n)}},jo=class{constructor(e,n=1){this.channelSize=4;if(n===1)this.internalFormat=e.ALPHA,this.format=e.ALPHA,this.textureType=e.UNSIGNED_BYTE,this.channelSize=n;else if(n===4)this.internalFormat=e.RGBA,this.format=e.RGBA,this.textureType=e.UNSIGNED_BYTE,this.channelSize=n;else throw new Error(`Invalid number of channels: ${n}`)}encode(e,n){return new Uint8Array(e.buffer,e.byteOffset,e.byteLength)}allocate(e){return new Uint8Array(e*this.channelSize)}decode(e,n){if(e instanceof Uint8Array)return e.subarray(0,n);throw new Error(`Invalid array type: ${e.constructor}`)}}});var Xr,mp,cu,gp=A(()=>{"use strict";xe();he();Xr=(r,e,n)=>{let t=n===0||n===1?1:4,o=n===2,i=n===1||n===2,s=n===4?e.length-1:void 0,a=n===4?e.map((u,l)=>l===e.length-1?u*4:u):void 0;return cu(r,e,t,a,{isPacked:o,reverseWH:i,breakAxis:s})},mp=(r,e,n)=>{let t=Xr(r,e,n);return[t.width,t.height]},cu=(r,e,n=1,t,o)=>{let i=!!(o&&o.isPacked),[s,a]=r.computeTextureWH(i&&t||e,o),u=e.length,l=e.slice(0);if(u===0&&(l=[1]),n===1)t=e;else if(i){if(n!==4)throw new Error("a packed texture must be 4-channel");t=e,u>0&&(l[u-1]=Math.ceil(l[u-1]/2)),u>1&&(l[u-2]=Math.ceil(l[u-2]/2))}else if(!t)throw new Error("Unpacked shape is needed when using channels > 1");return{width:s,height:a,channels:n,isPacked:i,shape:l,strides:Z.computeStrides(l),unpackedShape:t,reversedWH:o&&o.reverseWH}}});var X0,Ko,yp=A(()=>{"use strict";dt();Yn();xe();ap();cp();dp();hp();Kr();gp();he();X0=(r,e)=>{let n=e.map(o=>`${o.unpackedShape.join(",")};${o.width}x${o.height}`).join("_"),t=r.name;return r.cacheHint&&(t+="["+r.cacheHint+"]"),t+=":"+n,t},Ko=class{constructor(e){this.session=e;this.packedTextureDataCache=new Map,this.unpackedTextureDataCache=new Map}calculateTextureWidthAndHeight(e,n){return mp(this.session.layoutStrategy,e,n)}executeProgram(e,n){if(n.length<e.inputNames.length)throw new Error(`Input size mustn't be less than ${e.inputNames.length}.`);if(e.inputNames.length!==e.inputTypes.length)throw new Error("input names size does not match input types");let t=[];for(let l=0;l<e.inputNames.length;++l)t[l]=this.getOrCreateTextureData(n[l],e.inputTypes[l]);let o=X0(e,t),i=this.session.programManager.getArtifact(o),s=i?i.programInfo:typeof e.get=="function"?e.get():e,a=Xr(this.session.layoutStrategy,s.output.dims,s.output.textureType),u=this.createTextureData(a,s.output.type);return i||(i=this.session.programManager.build(s,t,u),this.session.programManager.setArtifact(o,i)),this.runProgram(i,t,u),u}run(e,n){return this.executeProgram(e,n).tensor}runProgram(e,n,t){for(let o=0;o<n.length;++o)if(!!n[o].isPacked!=(e.programInfo.inputTypes[o]===2))throw new Error(`input[${o}] property packed inconsistent`);if(!!t.isPacked!=(e.programInfo.output.textureType===2))throw new Error("output property packed inconsistent");this.session.programManager.run(e,n,t)}getOrCreateTextureData(e,n){let t=this.getTextureData(e.dataId,n===2);if(!t&&(t=this.getTextureData(e.dataId,n!==2),t))return n===2?this.pack(t):this.unpack(t);if(!t){let o=Xr(this.session.layoutStrategy,e.dims,n);if(n===4){let a=e.dims;if(a.length===4){let u=[a[0],Math.ceil(a[1]*a[2]*a[3]/4)],l=Xr(this.session.layoutStrategy,u,n),c=e.numberData;if(a[1]*a[2]*a[3]%4!==0){let d=a[0],p=a[1]*a[2]*a[3],f=Math.ceil(p*1/4)*4,h=d*f;c=new Float32Array(h);for(let m=0;m<d;++m){let y=m*p,g=m*f+m%1*p;c.set(e.numberData.subarray(y,y+p),g)}}return this.createTextureData(l,e.type,c,e,1)}}if(n===2){let i=cu(this.session.layoutStrategy,e.dims,1,[],{reverseWH:!0}),s=this.createTextureData(i,e.type,e.numberData,e,1);t=this.pack(s)}else t=this.createTextureData(o,e.type,e.numberData,e,1)}return t}createTextureDataFromLayoutBindTensor(e,n,t,o){return this.createTextureData(e,n,t,o,1)}createTextureData(e,n,t,o,i){Ie.verbose("InferenceHandler",`Creating TextureData: layout:[${JSON.stringify(e)}]`);let s=this.session.textureManager.createTextureFromLayout(n,e,t,i);return this.createTextureDataFromTexture(e,n,s,o)}reshapeUnpacked(e,n){let t=this.getOrCreateTextureData(e,0),o={channels:t.channels,height:t.height,width:t.width,shape:n.length!==0?n:[1],strides:Z.computeStrides(n),unpackedShape:n};return this.createTextureDataFromTexture(o,e.type,t.texture).tensor}reshapePacked(e,n){let t=this.getOrCreateTextureData(e,2);if(lp(e.dims,n)){let l={channels:t.channels,height:t.height,width:t.width,shape:n.length!==0?n:[1],strides:Z.computeStrides(n),unpackedShape:n,isPacked:!0};return this.createTextureDataFromTexture(l,e.type,t.texture).tensor}let o=uu(e.dims),i=uu(n),s=this.reshapePacked(e,o),a=this.run(up(this,s,i),[s]);return this.reshapePacked(a,n)}cast(e,n){let t=this.getOrCreateTextureData(e,0);return this.createTextureDataFromTexture(t,n,t.texture).tensor}createTextureDataFromTexture(e,n,t,o,i){let s={...e,tensor:o||new Fe(e.unpackedShape,n,a=>this.readTexture(s),async a=>this.readTextureAsync(s),void 0,i),texture:t};return this.setTextureData(s.tensor.dataId,s,e.isPacked),s}getTextureData(e,n=!1){return this.session.isInitializer(e)?this.session.getTextureData(e,n):n?this.packedTextureDataCache.get(e):this.unpackedTextureDataCache.get(e)}setTextureData(e,n,t=!1){this.session.isInitializer(e)?this.session.setTextureData(e,n,t):(t?this.packedTextureDataCache:this.unpackedTextureDataCache).set(e,n)}isTextureLayoutCached(e,n=!1){return!!this.getTextureData(e.dataId,n)}dispose(){this.session.textureManager.clearActiveTextures(),this.packedTextureDataCache.forEach(e=>this.session.textureManager.releaseTexture(e)),this.packedTextureDataCache=new Map,this.unpackedTextureDataCache.forEach(e=>this.session.textureManager.releaseTexture(e)),this.unpackedTextureDataCache=new Map}readTexture(e){return e.isPacked?this.readTexture(this.unpack(e)):this.session.backend.glContext.isFloat32DownloadSupported?this.session.textureManager.readTexture(e,e.tensor.type,e.channels):this.session.textureManager.readUint8TextureAsFloat(lu(this,e))}async readTextureAsync(e){return e.isPacked?this.readTextureAsync(this.unpack(e)):this.session.backend.glContext.isFloat32DownloadSupported?this.session.textureManager.readTextureAsync(e,e.tensor.type,e.channels):this.session.textureManager.readUint8TextureAsFloat(lu(this,e))}pack(e){return this.executeProgram(sp(this,e.tensor),[e.tensor])}unpack(e){return this.executeProgram(fp(this,e.tensor),[e.tensor])}}});var du,de,qe=A(()=>{"use strict";du=class{constructor(e){Object.assign(this,e)}get cacheKey(){return this.key||(this.key=Object.getOwnPropertyNames(this).sort().map(e=>`${this[e]}`).join(";")),this.key}},de=r=>new du(r)});var _p,wp,vp,Z0,J0,xp=A(()=>{"use strict";qe();Le();he();_p={name:"BatchNormalization",inputNames:["A","Scale","B","Mean","Variance"],inputTypes:[0,0,0,0,0]},wp=(r,e,n)=>(J0(e),[r.run({..._p,cacheHint:n.cacheKey,get:()=>Z0(r,e,n)},e)]),vp=r=>{let e=r.attributes.getFloat("epsilon",1e-5),n=r.attributes.getFloat("momentum",.9),t=r.attributes.getInt("spatial",1);return de({epsilon:e,momentum:n,spatial:t})},Z0=(r,e,n)=>{let t=Y(r.session.backend.glContext.version),o=e[0].dims.length,[i,s]=r.calculateTextureWidthAndHeight(e[1].dims,0),a=`
  float process(int[${o}] indices) {
    vec2 position = offsetToCoords(indices[1], ${i}, ${s});
    float scale = getColorAsFloat(${t.texture2D}(Scale, position));
    float mean = getColorAsFloat(${t.texture2D}(Mean, position));
    float variance = getColorAsFloat(${t.texture2D}(Variance, position));
    float b = getColorAsFloat(${t.texture2D}(B, position));

    return scale * ( (_A(indices) - mean) / sqrt(variance + float(${n.epsilon})) ) + b;
  }`;return{..._p,output:{dims:e[0].dims,type:e[0].type,textureType:0},shaderSource:a}},J0=r=>{if(!r||r.length!==5)throw new Error("BatchNormalization requires 5 inputs.");let e=r[0],n=r[1],t=r[2],o=r[3],i=r[4];if(e.dims.length<3||n.dims.length!==1||t.dims.length!==1||o.dims.length!==1||i.dims.length!==1)throw new Error("invalid input shape.");if(n.dims[0]!==e.dims[1]||t.dims[0]!==e.dims[1]||o.dims[0]!==e.dims[1]||i.dims[0]!==e.dims[1])throw new Error("invalid input shape.");if(e.type!=="float32"&&e.type!=="float64"||n.type!=="float32"&&n.type!=="float64"||t.type!=="float32"&&t.type!=="float64"||o.type!=="float32"&&o.type!=="float64"||i.type!=="float32"&&i.type!=="float64")throw new Error("invalid input tensor types.")}});var Xo,_t,H,Zr,Zo,In=A(()=>{"use strict";Xo=class{constructor(e,n,t,o){this.glContext=e;this.programInfo=n;this.inputTextureLayouts=t;this.outputTextureLayout=o}},_t=class{constructor(e){this.context=e}},H=class{constructor(e,n){this.routineBody=e;this.dependencies=n}},Zr=class{constructor(e,n,t){this.name=e;t?this.dependencies=t:this.dependencies=[],n&&(this.routineBody=n)}addDependency(e){e&&this.dependencies.push(e)}},Zo=class{static returnOrderedNodes(e){if(!e||e.length===0)return[];if(e.length===1)return e;let n=new Set,t=new Set,o=new Array;return this.createOrderedNodes(e,n,t,o),o}static createOrderedNodes(e,n,t,o){for(let i=0;i<e.length;++i)this.dfsTraverse(e[i],n,t,o)}static dfsTraverse(e,n,t,o){if(!e||t.has(e.name))return;if(n.has(e.name))throw new Error("Cyclic dependency detected. Can't topologically sort routines needed for shader.");n.add(e.name);let i=e.dependencies;if(i&&i.length>0)for(let s=0;s<i.length;++s)this.dfsTraverse(i[s],n,t,o);o.push(e),t.add(e.name),n.delete(e.name)}}});function Y0(){let r="add_";return{body:`
  float ${r}(float a, float b) {
    return a + b;
  }
  vec4 ${r}(vec4 v1, vec4 v2) {
    return v1 + v2;
  }
  `,name:r,type:0}}function eI(){let r="div_";return{body:`
  float ${r}(float a, float b) {
    return a / b;
  }
  vec4 ${r}(vec4 v1, vec4 v2) {
    return v1 / v2;
  }
  `,name:r,type:0}}function tI(){let r="mul_";return{body:`
  float ${r}(float a, float b) {
    return a * b;
  }
  vec4 ${r}(vec4 v1, vec4 v2) {
    return v1 * v2;
  }
  `,name:r,type:0}}function nI(){let r="sub_";return{body:`
  float ${r}(float a, float b) {
    return a - b;
  }
  vec4 ${r}(vec4 v1, vec4 v2) {
    return v1 - v2;
  }
  `,name:r,type:0}}function rI(){let r="equal_";return{body:`
  float ${r}(float a, float b) {
    return float(a == b);
  }
  vec4 ${r}(vec4 v1, vec4 v2) {
    return vec4(equal(v1, v2));
  }
  `,name:r,type:0}}function oI(){let r="greater_";return{body:`
  float ${r}(float a, float b) {
    return float(a > b);
  }
  vec4 ${r}(vec4 v1, vec4 v2) {
    return vec4( v1.r > v2.r ,
      v1.g > v2.g,
      v1.b > v2.b,
      v1.a > v2.a );
  }
  `,name:r,type:0}}function iI(){let r="less_";return{body:`
  float ${r}(float a, float b) {
    return float(a < b);
  }
  vec4 ${r}(vec4 v1, vec4 v2) {
    return vec4( v1.r < v2.r ,
                v1.g < v2.g,
                v1.b < v2.b,
                v1.a < v2.a );
  }
  `,name:r,type:0}}function sI(){let r="and_";return{body:`
  float ${r}(float a, float b) {
    return float( bool(a) && bool(b) );
  }
  vec4 ${r}(vec4 v1, vec4 v2) {
    bvec4 b1 = bvec4(v1);
    bvec4 b2 = bvec4(v2);
    return vec4( b1.r && b2.r ,
                b1.g && b2.g,
                b1.b && b2.b,
                b1.a && b2.a );
  }
  `,name:r,type:0}}function aI(){return{body:`
  float or_(float a, float b) {
    return float( bool(a) || bool(b) );
  }
  vec4 or_(vec4 v1, vec4 v2) {
    bvec4 b1 = bvec4(v1);
    bvec4 b2 = bvec4(v2);
    return vec4( b1.r || b2.r ,
                b1.g || b2.g,
                b1.b || b2.b,
                b1.a || b2.a );
  }
  `,name:"or_",type:0}}function uI(){let r="xor_";return{body:`
  float ${r}(float a, float b) {
    return float( bool(a) ^^ bool(b) );
  }
  vec4 ${r}(vec4 v1, vec4 v2) {
    bvec4 b1 = bvec4(v1);
    bvec4 b2 = bvec4(v2);
    return vec4( b1.r ^^ b2.r ,
                b1.g ^^ b2.g,
                b1.b ^^ b2.b,
                b1.a ^^ b2.a );
  }
  `,name:r,type:0}}function lI(){return dI("pow")}function cI(){let r="prelu_";return{body:`
  float ${r}(float a, float b) {
    return a < 0.0 ? a * b: a;
  }
  vec4 ${r}(vec4 v1, vec4 v2) {
    return vec4(
      v1.r < 0.0 ? v1.r * v2.r: v1.r,
      v1.g < 0.0 ? v1.g * v2.g: v1.g,
      v1.b < 0.0 ? v1.b * v2.b: v1.b,
      v1.a < 0.0 ? v1.a * v2.a: v1.a
      );
  }
  `,name:r,type:0}}function dI(r){let e=`${r}_`;return{body:`
  float ${e}(float a, float b) {
    return ${r}(a, b);
  }
  vec4 ${e}(vec4 v1, vec4 v2) {
    return ${r}(v1, v2);
  }
  `,name:e,type:0}}var wt,pI,Tp,Ip,Sp,$p,Ap,Op,Pp,Ep,Dp,Cp,kp,Lp,Np=A(()=>{"use strict";xe();In();Le();he();wt=(r,e,n,t=e[0].type,o)=>{let i=r.session.pack?2:0;return{name:n.name,inputNames:["A","B"],inputTypes:[i,i],cacheHint:o,get:()=>pI(r,e,n,t)}},pI=(r,e,n,t=e[0].type)=>{let o=r.session.pack?2:0,i=!Z.areEqual(e[0].dims,e[1].dims),s=e[0].dims,a=r.session.pack;if(i){let c=Qe.calcShape(e[0].dims,e[1].dims,!1);if(!c)throw new Error("Can't perform binary op on the given tensors");s=c;let d=s.length,p=e[0].dims.length!==0?e[0].dims.length:1,f=e[1].dims.length!==0?e[1].dims.length:1,h=e[0].dims.length!==0?"bcastIndices_A(indices, aindices);":"aindices[0] = 0;",m=e[1].dims.length!==0?"bcastIndices_B(indices, bindices);":"bindices[0] = 0;",y=Y(r.session.backend.glContext.version),g=a?`
      ${n.body}
      void main() {
        vec4 a = getAAtOutCoords();
        vec4 b = getBAtOutCoords();
        vec4 result = ${n.name}(a, b);
        ${y.output} = result;
      }`:`
      ${n.body}
      float process(int indices[${d}]) {
        int aindices[${p}];
        int bindices[${f}];
        ${h}
        ${m}
        return ${n.name}(_A(aindices), _B(bindices));
      }`;return{name:n.name,inputNames:["A","B"],inputTypes:[o,o],output:{dims:s,type:t,textureType:o},shaderSource:g,hasMain:a}}let u=Y(r.session.backend.glContext.version),l=`
    ${n.body}
    void main() {
      vec4 v1 = ${u.texture2D}(A, TexCoords);
      vec4 v2 = ${u.texture2D}(B, TexCoords);
      vec4 result = ${n.name}(v1, v2);
      ${u.output} = result;
    }
    `;return{name:n.name,inputNames:["A","B"],inputTypes:[o,o],output:{dims:e[0].dims,type:t,textureType:o},shaderSource:l,hasMain:!0}},Tp=(r,e)=>[r.run(wt(r,e,Y0()),e)],Ip=(r,e)=>[r.run(wt(r,e,sI(),"bool"),e)],Sp=(r,e)=>[r.run(wt(r,e,eI()),e)],$p=(r,e)=>[r.run(wt(r,e,rI(),"bool"),e)],Ap=(r,e)=>[r.run(wt(r,e,oI(),"bool"),e)],Op=(r,e)=>[r.run(wt(r,e,iI(),"bool"),e)],Pp=(r,e)=>[r.run(wt(r,e,tI()),e)],Ep=(r,e)=>[r.run(wt(r,e,aI(),"bool"),e)],Dp=(r,e)=>[r.run(wt(r,e,lI()),e)],Cp=(r,e)=>[r.run(wt(r,e,cI()),e)],kp=(r,e)=>[r.run(wt(r,e,nI()),e)],Lp=(r,e)=>[r.run(wt(r,e,uI(),"bool"),e)]});var Rp,zp,hI,Bp=A(()=>{"use strict";xe();Rp=(r,e,n)=>(hI(e),[r.cast(e[0],n)]),zp=r=>Xe.tensorDataTypeFromProto(r.attributes.getInt("to")),hI=r=>{if(!r||r.length!==1)throw new Error("Cast requires 1 input.");if(r[0].type==="string")throw new Error("Invalid input type.")}});var mI,gI,Mp,Jo,Vp=A(()=>{"use strict";Le();he();dn();er();mI=(r,e)=>({name:"Concat (packed)",inputNames:Array.from({length:r},(n,t)=>`X${t}`),inputTypes:Array(r).fill(2),cacheHint:e}),gI=(r,e,n,t)=>{let o=n[0].dims.slice();if(t>=o.length||t<-1*o.length)throw new Error("axis specified for concat doesn't match input dimensionality");t<0&&(t=o.length+t);let i=o.slice(0);for(let T=1;T<n.length;T++){let S=n[T].dims.slice();for(let P=0;P<o.length;P++)if(P===t)i[t]+=S[P];else if(o[P]!==S[P])throw new Error("non concat dimensions must match")}let s=i.length,a=vr("coords",s),u=Ye(s),l=pn(),c=n.map(T=>T.dims),d=$t(s),p=new Array(c.length-1);p[0]=c[0][t];for(let T=1;T<p.length;T++)p[T]=p[T-1]+c[T][t];let f=d[t],h=d.slice(-2),m=d.join(),y=`if (${f} < ${p[0]}) {
        return getChannel(
            getX0(${m}), vec2(${h.join()}));
        }`;for(let T=1;T<p.length;T++){let S=p[T-1];y+=`
            if (${f} < ${p[T]}  && ${f} >= ${p[T-1]}) {
              return getChannel(
                getX${T}(${Jo(d,f,S)}),
                vec2(${Jo(h,f,S)}));
            }`}let g=p.length,b=p[p.length-1];y+=`
            return getChannel(
              getX${g}(${Jo(d,f,b)}),
              vec2(${Jo(h,f,b)}));`;let _=Y(r.session.backend.glContext.version),x=`
          ${l}
          float getValue(${d.map(T=>"int "+T)}) {
            ${y}
          }

          void main() {
            ${u} coords = getOutputCoords();
            int lastDim = coords.${d[s-1]};
            coords.${d[s-1]} = coords.${d[s-2]};
            coords.${d[s-2]} = lastDim;

            vec4 result = vec4(getValue(${a}), 0., 0., 0.);

            ${a[s-1]} = ${a[s-1]} + 1;
            if (${a[s-1]} < ${i[s-1]}) {
              result.g = getValue(${a});
            }

            ${a[s-2]} = ${a[s-2]} + 1;
            if (${a[s-2]} < ${i[s-2]}) {
              result.a = getValue(${a});
            }

            ${a[s-1]} = ${a[s-1]} - 1;
            if (${a[s-2]} < ${i[s-2]} &&
                ${a[s-1]} < ${i[s-1]}) {
              result.b = getValue(${a});
            }
            ${_.output} = result;
          }
        `;return{...e,output:{dims:i,type:n[0].type,textureType:2},shaderSource:x,hasMain:!0}},Mp=(r,e,n)=>{let t=mI(e.length,n.cacheKey);return{...t,get:()=>gI(r,t,e,n.axis)}},Jo=(r,e,n)=>{let t=r.indexOf(e);return r.map((i,s)=>s===t?`${i} - ${n}`:i).join()}});var Fp,bI,yI,_I,Gp,wI,vI,xI,Up,TI,Wp=A(()=>{"use strict";qe();he();Vp();Fp=(r,e,n)=>(TI(e),r.session.pack&&e[0].dims.length>1?[r.run(Mp(r,e,n),e)]:[r.run(_I(r,e,n),e)]),bI=(r,e)=>({name:"Concat",inputNames:Array.from({length:r},(n,t)=>`X${t}`),inputTypes:Array(r).fill(0),cacheHint:e}),yI=(r,e,n,t)=>{let o=n[0].dims.slice();if(t>=o.length||t<-1*o.length)throw new Error("axis specified for concat doesn't match input dimensionality");t<0&&(t=o.length+t);let i=o.slice(0);for(let f=1;f<n.length;f++){let h=n[f].dims.slice();for(let m=0;m<o.length;m++)if(m===t)i[t]+=h[m];else if(o[m]!==h[m])throw new Error("non concat dimensions must match")}let s=i.length,a=new Array(n.length),u=0;for(let f=0;f<a.length;++f)u+=n[f].dims[t],a[f]=u;let l="";n.length<5?l=Gp(a):l=wI(a);let c=vI(n.length,s),d=xI(a),p=`
        ${c}
        ${d}
        ${l}
        float process(int indices[${s}]) {
          int textureIndex = getTextureWhereDataResides (indices[${t}]);

          if(textureIndex != 0) {
            indices[${t}] = indices[${t}] - int(getSizeInConcatAxisValueFromIndex(textureIndex-int(1)));
          }

          return fetchDataFromCorrectTexture(textureIndex, indices);
        }`;return{...e,output:{dims:i,type:n[0].type,textureType:0},shaderSource:p}},_I=(r,e,n)=>{let t=bI(e.length,n.cacheKey);return{...t,get:()=>yI(r,t,e,n.axis)}},Gp=r=>`int getTextureWhereDataResides(int index) {
      ${r.map((n,t)=>`if(index<${n}) {return ${t};}
`).join("")}
    }`,wI=r=>Gp(r),vI=(r,e)=>{let n=[`float fetchDataFromCorrectTexture(int textureIndex, int indices[${e}]) {`];for(let t=0;t<r;++t)t===0?n.push(`	if (textureIndex == ${t}) { return _X${t}(indices); }`):t===r-1?n.push(`	else { return _X${t}(indices); }`):n.push(`	else if (textureIndex == ${t}) { return _X${t}(indices); }`);return n.push("	}"),n.join(`
`)},xI=r=>{let e=["int getSizeInConcatAxisValueFromIndex(int index) {"];for(let n=0;n<r.length;++n)n===0?e.push(`	if (index == ${n}) { return ${r[n]}; }`):n===r.length-1?e.push(`	else { return ${r[n]}; }`):e.push(`	else if (index == ${n}) { return ${r[n]}; }`);return e.push("	}"),e.join(`
`)},Up=r=>de({axis:r.attributes.getInt("axis")}),TI=r=>{if(!r||r.length<1)throw new Error("too few inputs");let e=r[0].type,n=r[0].dims.length;if(e==="string")throw new Error("string tensor is not supported yet");for(let t of r){if(t.type!==e)throw new Error("input tensors should be one type");if(t.dims.length!==n)throw new Error("input tensors should have the same shape")}}});function II(){return vt("abs")}function SI(){return vt("acos")}function $I(){return vt("asin")}function AI(){return vt("atan")}function OI(){return vt("ceil")}function PI(){return vt("cos")}function EI(r){return{body:`
  const float alpha = float(${r});

  float elu_(float a) {
    return a >= 0.0 ? a: (exp(a) - 1.0) * alpha;
  }
  vec4 elu_(vec4 v) {
    return vec4(elu_(v.x), elu_(v.y), elu_(v.z), elu_(v.w));
  }
  `,name:"elu",type:0}}function DI(){return vt("exp")}function CI(){return vt("floor")}function pu(r,e){let n="clip";return{body:`
  const float min = float(${r});
  const float max = float(${e});

  float ${n}_(float a) {
    return clamp(a, min, max);
  }
  vec4 ${n}_(vec4 v) {
    return clamp(v, min, max);
  }
  `,name:n,type:0}}function kI(){let r="indentity";return{body:`
  float ${r}_(float a) {
    return a;
  }
  vec4 ${r}_(vec4 v) {
    return v;
  }
  `,name:r,type:0}}function LI(r){let e="leakyRelu";return{body:`
  const float alpha = float(${r});

  float ${e}_(float a) {
    return a < 0.0 ? a * alpha : a;
  }
  vec4 ${e}_(vec4 v) {
    return vec4(${e}_(v.x), ${e}_(v.y), ${e}_(v.z), ${e}_(v.w));
  }
  `,name:e,type:0}}function NI(){return vt("log")}function RI(){return{body:`
  float neg_(float a) {
    return -a;
  }
  vec4 neg_(vec4 v) {
    return -v;
  }
  `,name:"neg",type:0}}function zI(){return{body:`
  float not_(float a) {
    return float( ! bool(a) );
  }
  bool not_(bool a) {
    return !a;
  }
  vec4 not_(vec4 v) {
    return vec4(!bool(v.x), !bool(v.y), !bool(v.z), !bool(v.w));
  }
  bvec4 not_(bvec4 v) {
    return bvec4(!v.x, !v.y, !v.z, !v.w);
  }
  `,name:"not",type:0}}function BI(){return vt("sin")}function fu(){let r="relu";return{body:`
  float ${r}_(float a) {
    return max( a, 0.0 );
  }
  vec4 ${r}_(vec4 v) {
    return max( v, 0.0 );
  }
  `,name:r,type:0}}function hu(){let r="sigmoid";return{body:`
  float ${r}_(float a) {
    return 1.0 / (1.0 + exp(-a));
  }
  vec4 ${r}_(vec4 v) {
    return 1.0 / (1.0 + exp(-v));
  }
  `,name:r,type:0}}function MI(){return vt("sqrt")}function VI(){return vt("tan")}function FI(){let r="tanh";return{body:`
  float ${r}_(float a) {
    a = clamp(a, -10., 10.);
    a = exp(2.*a);
    return (a - 1.) / (a + 1.);
  }
  vec4 ${r}_(vec4 v) {
    v = clamp(v, -10., 10.);
    v = exp(2.*v);
    return (v - 1.) / (v + 1.);
  }
  `,name:r,type:0}}function vt(r){return{body:`
  float ${r}_(float a) {
    return ${r}(a);
  }
  vec4 ${r}_(vec4 v) {
    return ${r}(v);
  }
  `,name:r,type:0}}var GI,Ve,Hp,qp,jp,Kp,mu,Xp,Zp,UI,Jp,Qp,Yp,ef,tf,nf,gu,rf,of,sf,af,uf,lf,cf,df,pf,ff,hf,bu=A(()=>{"use strict";qe();xe();In();Le();he();GI=(r,e,n,t)=>{let o=r.session.pack?2:0,i=Y(r.session.backend.glContext.version);return{...e,output:{dims:n.dims,type:n.type,textureType:o},shaderSource:`
     ${t.body}
     void main() {
       vec4 v = ${i.texture2D}(A, TexCoords);
       v = ${t.name}_(v);
       ${i.output} = v;
     }
     `,hasMain:!0}},Ve=(r,e,n,t)=>{let o=r.session.pack?2:0,i={name:n.name,inputTypes:[o],inputNames:["A"],cacheHint:t};return{...i,get:()=>GI(r,i,e,n)}},Hp=(r,e)=>[r.run(Ve(r,e[0],II()),e)],qp=(r,e)=>[r.run(Ve(r,e[0],SI()),e)],jp=(r,e)=>[r.run(Ve(r,e[0],$I()),e)],Kp=(r,e)=>[r.run(Ve(r,e[0],AI()),e)],mu=(r,e,n)=>[r.run(Ve(r,e[0],pu(n.min,n.max),n.cacheKey),e)],Xp=r=>de({min:r.attributes.getFloat("min",Jn),max:r.attributes.getFloat("max",Qn)}),Zp=(r,e)=>{let n=UI(r,e);return mu(r,[e[0]],n)},UI=(r,e)=>{if(e.length>=3&&(!r.session.isInitializer(e[1].dataId)||!r.session.isInitializer(e[2].dataId)))throw new Error("dynamic clip attributes are not allowed");let n=e.length>=3?e[1].numberData[0]:Jn,t=e.length>=3?e[2].numberData[0]:Qn;return de({min:n,max:t})},Jp=(r,e)=>[r.run(Ve(r,e[0],OI()),e)],Qp=(r,e)=>[r.run(Ve(r,e[0],PI()),e)],Yp=(r,e,n)=>[r.run(Ve(r,e[0],EI(n.alpha),n.cacheKey),e)],ef=r=>de({alpha:r.attributes.getFloat("alpha",1)}),tf=(r,e)=>[r.run(Ve(r,e[0],DI()),e)],nf=(r,e)=>[r.run(Ve(r,e[0],CI()),e)],gu=(r,e)=>[r.run(Ve(r,e[0],kI()),e)],rf=(r,e,n)=>[r.run(Ve(r,e[0],LI(n.alpha),n.cacheKey),e)],of=r=>de({alpha:r.attributes.getFloat("alpha",.01)}),sf=(r,e)=>[r.run(Ve(r,e[0],NI()),e)],af=(r,e)=>[r.run(Ve(r,e[0],RI()),e)],uf=(r,e)=>[r.run(Ve(r,e[0],zI()),e)],lf=(r,e)=>[r.run(Ve(r,e[0],fu()),e)],cf=(r,e)=>[r.run(Ve(r,e[0],hu()),e)],df=(r,e)=>[r.run(Ve(r,e[0],BI()),e)],pf=(r,e)=>[r.run(Ve(r,e[0],MI()),e)],ff=(r,e)=>[r.run(Ve(r,e[0],VI()),e)],hf=(r,e)=>[r.run(Ve(r,e[0],FI()),e)]});function fn(r){let e;switch(r.activation){case"Relu":e=fu();break;case"Sigmoid":e=hu();break;case"Clip":e=pu(r.clipMin,r.clipMax);break;default:return{activationFunction:"",applyActivation:""}}let n=e.name,t=e.body,o=`value = ${n}_(value);`;return{activationFunction:t,applyActivation:o}}var xr,tr=A(()=>{"use strict";xe();bu();xr=r=>{let e=r.getString("activation","");if(e==="Clip"){let[n,t]=r.getFloats("activation_params",[Jn,Qn]);return{activation:e,clipMax:t,clipMin:n,activationCacheKey:`${e}:${n},${t}`}}return{activation:e,activationCacheKey:e}}});var HI,qI,mf,gf=A(()=>{"use strict";dt();Le();he();Qo();tr();HI=(r,e)=>({name:"GroupedConv",inputNames:r?["X","W","Bias"]:["X","W"],inputTypes:r?[0,0,0]:[0,0],cacheHint:e}),qI=(r,e,n,t)=>{let i=e.length>2?"value += getBias(output_channel);":"",s=e[0].dims.slice(),a=e[1].dims.slice(),u=a[0]/t.group;Ie.verbose("GroupedConv",`autpPad:${t.autoPad}, dilations:${t.dilations}, group:${t.group}, kernelShape:${t.kernelShape}, pads:${t.pads}, strides:${t.strides}`);let l=Tr(s,a,t.dilations,t.pads,t.strides),c=Y(r.session.backend.glContext.version),{activationFunction:d,applyActivation:p}=fn(t),f=`
  const ivec2 strides = ivec2(${t.strides[0]}, ${t.strides[1]});
  const ivec2 pads = ivec2(${t.pads[0]}, ${t.pads[1]});
  ${d}
  void main() {
    ivec4 coords = getOutputCoords();
    int batch = coords.x;
    int output_channel = coords.y;
    ivec2 xRCCorner = coords.zw * strides - pads;
    int group_id = output_channel / ${u};

    float value = 0.0;
    for (int wInChannel = 0; wInChannel < ${a[1]}; wInChannel++) {
      int input_channel = group_id * ${a[1]} + wInChannel;
      for (int wHeight = 0; wHeight < ${a[2]}; wHeight++) {
        int xHeight = xRCCorner.x + wHeight * ${t.dilations[0]};

        if (xHeight < 0 || xHeight >= ${s[2]}) {
          continue;
        }

        for (int wWidth = 0; wWidth < ${a[3]}; wWidth++) {
          int xWidth = xRCCorner.y + wWidth * ${t.dilations[1]};
          if (xWidth < 0 || xWidth >= ${s[3]}) {
            continue;
          }

          float xVal = getX(batch, input_channel, xWidth, xHeight);
          float wVal = getW(output_channel, wInChannel, wWidth, wHeight);
          value += xVal*wVal;
        }
      }
    }
    ${i}
    ${p}
    ${c.output} = vec4(value, .0, .0, .0);
  }
`;return{...n,output:{dims:l,type:e[0].type,textureType:0},shaderSource:f,hasMain:!0}},mf=(r,e,n)=>{let t=HI(e.length>2,n.cacheKey);return{...t,get:()=>qI(r,e,t,n)}}});var jI,KI,bf,yf=A(()=>{"use strict";Le();he();er();jI=r=>({name:"Im2Col (packed)",inputNames:["A"],inputTypes:[2],cacheHint:r}),KI=(r,e,n,t,o,i)=>{let s=n.dims,a=t.dims,u=2,l=3,c=o.length,d=[a[1]*a[2]*a[3],o[2]*o[3]],p=a[2]*a[3],f=pn(),h=Y(r.session.backend.glContext.version),m="";for(let g=0;g<=1;g++)for(let b=0;b<=1;b++)m+=`
            blockIndex = rc.x + ${b};
            pos = rc.y + ${g};

            if(blockIndex < ${d[1]} && pos < ${d[0]}) {
              offsetY = int(blockIndex / (${o[c-1]})) * ${i.strides[0]} -
                ${i.pads[0]};
              d0 = offsetY + ${i.dilations[0]} * (imod(pos, ${p}) / ${a[2]});

              if(d0 < ${s[u]} && d0 >= 0) {
                offsetX = imod(blockIndex, ${o[c-1]}) * ${i.strides[1]} -
                  ${i.pads[1]};
                d1 = offsetX + ${i.dilations[1]} * imod(imod(pos, ${p}), ${a[2]});

                if(d1 < ${s[l]} && d1 >= 0) {

                  ch = int(float(pos)/ ${p}.);
                    innerDims = vec2(d0, d1);
                    result[${g*2+b}] = getChannel(
                      getA(0, ch, int(innerDims.x),
                      int(innerDims.y)), innerDims);
                }
              }
            }

          `;let y=`
      ${f}

      void main() {
        ivec2 rc = getOutputCoords();
          vec4 result = vec4(0.0);
          int blockIndex, pos, offsetY, d0, offsetX, d1, ch;
          vec2 innerDims;
          ${m}
          ${h.output} = result;
      }
            `;return{...e,output:{dims:d,type:n.type,textureType:2},shaderSource:y,hasMain:!0}},bf=(r,e,n,t,o)=>{let i=jI(o.cacheKey);return{...i,get:()=>KI(r,i,e,n,t,o)}}});function ZI(r,e,n){let t=e[0].dims,o=e[1].dims,i=Qe.calcShape(t,o,!0);if(!i)throw new Error("Can't use matmul on the given tensors");let s=Ye(i.length),a=$t(),{activationFunction:u,applyActivation:l}=fn(n),c=e.length>2,d=c?"value += getBiasForMatmul();":"",p=c?`${_u(s,a,e[2].dims,i,!1)}`:"",f=i.length,h=t.length,m=o.length,y=t[t.length-1],g=`
    ${u}
    ${p}
    float process(int indices[${f}]) {
        int a[${h}];
        int b[${m}];
        bcastMatmulIndices_A(indices, a);
        bcastMatmulIndices_B(indices, b);

        float value;
        for (int k=0; k<${y}; ++k) {
            a[${h-1}] = k;
            b[${m-2}] = k;
            value += _A(a) * _B(b);
        }
        ${d}
        ${l}
        return value;
    }`;return{...r,output:{dims:i,type:e[0].type,textureType:0},shaderSource:g}}function yu(r,e){let n=XI(r.length>2,e.activationCacheKey);return{...n,get:()=>ZI(n,r,e)}}function _u(r,e,n,t,o){let i="",s=n.length,a=t.length,u=a-s;a<2&&s>0?i="coords":i=n.map((m,y)=>`coords.${e[y+u]}`).join(", ");let c=Qe.getBroadcastDims(n,t).map(m=>`coords.${e[m+u]} = 0;`).join(`
`),p=Z.size(n)===1,f="vec4(outputValue.xx, outputValue.yy)";return p&&(f="vec4(outputValue.x)"),o?`
vec4 getBiasForMatmul() {
  ${r} coords = getOutputCoords();
  ${c}
  vec4 outputValue = getBias(${i});
  return ${f};
}`:`
float getBiasForMatmul() {
  ${r} coords = getOutputCoords();
  ${c}
  return getBias(coords.x);
}`}var _f,wf,XI,JI,Yo=A(()=>{"use strict";xe();he();dn();tr();wu();_f=(r,e,n)=>(JI(e),r.session.pack?[r.run(ei(r,e,n),e)]:[r.run(yu(e,n),e)]),wf=r=>xr(r.attributes),XI=(r,e)=>({name:"MatMul",inputNames:r?["A","B","Bias"]:["A","B"],inputTypes:r?[0,0,0]:[0,0],cacheHint:e});JI=r=>{if(!r||r.length!==2)throw new Error("MatMul requires 2 inputs.");if(r[0].dims[r[0].dims.length-1]!==r[1].dims[r[1].dims.length-2])throw new Error("shared dimension does not match.");if(r[0].type!=="float32"&&r[0].type!=="float64"||r[1].type!=="float32"&&r[1].type!=="float64")throw new Error("inputs should be float type");if(r[0].type!==r[1].type)throw new Error("inputs types should match")}});function e2(r,e,n,t){let o=[],i=[],s=n[0].dims,a=n[1].dims,u=s.length,l=a.length,c=t.length,d=c-u,p=c-l;o=s.map((_,x)=>`coords.${e[x+d]}`),o[u-1]="i*2",o.join(", "),i=a.map((_,x)=>`coords.${e[x+p]}`),i[l-2]="i*2",i.join(", ");let f=Qe.getBroadcastDims(s,t),h=Qe.getBroadcastDims(a,t),m=f.map(_=>`coords.${e[_+d]} = 0;`).join(`
`),y=h.map(_=>`coords.${e[_+p]} = 0;`).join(`
`),g=`int lastDim = coords.${e[c-1]};
  coords.${e[c-1]} = coords.${e[c-2]};
  coords.${e[c-2]} = lastDim;`;return`
vec4 getAAtOutCoordsMatmul(int i) {
  ${r} coords = getOutputCoords();
  ${g}
  ${m}
  vec4 outputValue = getA(${o});
  return outputValue;
}

vec4 getBAtOutCoordsMatmul(int i) {
  ${r} coords = getOutputCoords();
  ${g}
  ${y}
  vec4 outputValue = getB(${i});
  return outputValue;
}`}function t2(r,e){let n="";for(let t=0;t<e-2;t++)n+=`rc.${r[t]}, `;return n+=`rc.${r[e-2]}, i*2`,n}function n2(r,e){let n="";for(let t=0;t<e-2;t++)n+=`rc.${r[t]}, `;return n+=`i*2, rc.${r[e-1]}`,n}var QI,YI,ei,wu=A(()=>{"use strict";xe();Le();he();dn();tr();Yo();QI=(r,e)=>({name:"MatMul (packed)",inputNames:r?["A","B","Bias"]:["A","B"],inputTypes:r?[2,2,2]:[2,2],cacheHint:e}),YI=(r,e,n,t)=>{let o=n.length>2,i=o?"value += getBiasForMatmul();":"",s=n[0].dims,a=n[1].dims,u=Qe.calcShape(s,a,!0),l=!Z.areEqual(n[0].dims,n[1].dims);if(!u)throw new Error("Can't use matmul on the given tensors");let c=s[s.length-1],d=Math.ceil(c/2),p=s.length,f=a.length,h=Y(r.session.backend.glContext.version),m=Ye(u.length),y=u.length,g=$t(),{activationFunction:b,applyActivation:_}=fn(t),x=o?`${_u(m,g,n[2].dims,u,!0)}`:"",T=l?`${e2(m,g,n,u)}`:"",S=l?"getAAtOutCoordsMatmul(i)":`getA(${t2(g,p)})`,P=l?"getBAtOutCoordsMatmul(i)":`getB(${n2(g,f)})`,E=l?"":`${m} rc =
          getOutputCoords(); int lastDim = rc.${g[y-1]}; rc.${g[y-1]} =
          rc.${g[y-2]}; rc.${g[y-2]} = lastDim;
      `,N=`
            ${T}
            ${x}
            ${b}
            void main() {
              ${E}

              vec4 value = vec4(0);
              for (int i = 0; i < ${d}; i++) {
                vec4 a = ${S};
                vec4 b = ${P};

                value += (a.rrbb * b.rgrg);
                value += (a.ggaa * b.baba);
              }
              ${i}
              ${_}
              ${h.output} = value;
            }`;return{...e,output:{dims:u,type:n[0].type,textureType:2},shaderSource:N,hasMain:!0}},ei=(r,e,n)=>{let t=QI(e.length>2,n.activationCacheKey);return{...t,get:()=>YI(r,t,e,n)}}});var vf,xf=A(()=>{"use strict";Qo();yf();wu();vf=(r,e,n)=>{let t=e[0].dims,o=e[1].dims,i=Tr(t,o,n.dilations,n.pads,n.strides),s=r.run(bf(r,e[0],e[1],i,n),[e[0]]),a=r.reshapePacked(e[1],[o[0],o[1]*o[2]*o[3]]),u=e.length===3?[a,s,e[2]]:[a,s],l=r.run(ei(r,u,n),u);return r.reshapePacked(l,i)}});var r2,o2,Tf,vu,xu=A(()=>{"use strict";he();r2=r=>({name:"Im2Col",inputNames:["X"],inputTypes:[0],cacheHint:r}),o2=(r,e,n,t,o,i)=>{let s=n.dims,a=t.dims,u=o.length,l=vu(s,a,o,4),c=`
        const int XC = ${s[1]};
        const int XH = ${s[2]};
        const int XW = ${s[3]};
        const int KH = ${i.kernelShape[0]};
        const int KW = ${i.kernelShape[1]};
        const int dilationH = ${i.dilations[0]};
        const int dilationW = ${i.dilations[1]};
        const int strideH = ${i.strides[0]};
        const int strideW = ${i.strides[1]};
        const int padH = ${i.pads[0]};
        const int padW = ${i.pads[1]};
        const int KHKW = KH*KW;
        const int XCKHKW = XC * KHKW;
        const int outputChannels = 4;
        vec4 process(int indices[${u}]) {
          int b  = indices[0]; // batch size
          int oh = indices[1] * strideH - padH; //output height
          int ow = indices[2] * strideW - padW; //output width
          int p = indices[3] * outputChannels; //patch
          vec4 value = vec4(0.0);
          for(int i=0; i < outputChannels; ++i) {
            if(p < XCKHKW) {
              int patchC = p / KHKW;
              int patchH = (p - patchC*KHKW) / KW;
              int patchW = (p - patchC*KHKW) - patchH * KW;
              int xh2 = oh + patchH * dilationH;
              int xw2 = ow + patchW * dilationW;
              int x[${s.length}];
              x[0] = b;
              x[1] = patchC;
              x[2] = xh2;
              x[3] = xw2;
              if(xh2 >= 0 &&
                  xh2 < XH &&
                  xw2 >= 0 &&
                  xw2 < XW) {
                value[i] = _X(x);
              }
            }
            ++p;
          }
          return value;
        }
        `;return{...e,output:{dims:l,type:n.type,textureType:4},shaderSource:c}},Tf=(r,e,n,t,o)=>{let i=r2(o.cacheKey);return{...i,get:()=>o2(r,i,e,n,t,o)}},vu=(r,e,n,t=4)=>[n[0],n[2],n[3],Math.ceil(r[1]*e[2]*e[3]/t)]});var i2,s2,If,Sf=A(()=>{"use strict";xe();Le();he();tr();xu();i2=(r,e)=>({name:"ConvDotProduct",inputNames:r?["Im2Col","K","B"]:["Im2Col","K"],inputTypes:r?[0,4,0]:[0,4],cacheKey:e.activationCacheKey}),s2=(r,e,n,t,o)=>{let i=n[0].dims,s=n[1].dims,a=[s[0],Math.ceil(i[1]*s[2]*s[3]/4)],u=vu(i,s,t),[l,c]=r.calculateTextureWidthAndHeight(a,4),d=Z.computeStrides(u),[p,f]=r.calculateTextureWidthAndHeight(u,4),h=t.length,m=n.length<3?"0.0":"_B(b)",y=Math.ceil(i[1]*s[2]*s[3]/4),{activationFunction:g,applyActivation:b}=fn(o),_=Y(r.session.backend.glContext.version),x=`
${g}
float process(int indices[${h}]) {
  int b[1];
  b[0] = indices[1];
  int im2col[4];
  im2col[0] = indices[0];
  im2col[1] = indices[2];
  im2col[2] = indices[3];
  int im2colOffset = im2col[0] * ${d[0]} + im2col[1] * ${d[1]} + im2col[2] * ${d[2]};
  int kernelOffset = indices[1] * ${a[1]};
  float value = ${m};
  for (int i = 0; i < ${y}; ++i) {
    vec2 im2colCoords = offsetToCoords(im2colOffset, ${p}, ${f});
    vec2 kernelCoords = offsetToCoords(kernelOffset, ${l}, ${c});
    value += dot(${_.texture2D}(Im2Col, im2colCoords), ${_.texture2D}(K, kernelCoords));
    ++im2colOffset;
    ++kernelOffset;
  }
  ${b}
  return value;
}`;return{...e,output:{dims:t,type:n[0].type,textureType:0},shaderSource:x}},If=(r,e,n,t)=>{let o=i2(e.length>2,t);return{...o,get:()=>s2(r,o,e,n,t)}}});var Tr,Tu,a2,u2,l2,c2,Iu,d2,Qo=A(()=>{"use strict";qe();xe();gf();xf();Sf();tr();xu();Yo();Tr=(r,e,n,t,o)=>{let i=r[0],s=r.slice(2),a=s.length,u=e[0],c=e.slice(2).map((h,m)=>h+(h-1)*(n[m]-1)),p=s.map((h,m)=>h+t[m]+t[m+a]).map((h,m)=>Math.floor((h-c[m]+o[m])/o[m]));return[i,u].concat(...p)},Tu=(r,e,n)=>(d2(e,n),a2(r,e,n)),a2=(r,e,n)=>{let t=c2(n,e),o=r.session.pack,i=t.kernelShape[0]===1&&t.kernelShape[1]===1;return t.group>1?[r.run(mf(r,e,t),e)]:i&&o?[u2(r,e,t)]:o&&e[0].dims.length===4&&e[0].dims[0]===1&&!i?[vf(r,e,t)]:[l2(r,e,t)]},u2=(r,e,n)=>{let t=e[0].dims,o=e[1].dims,i=Tr(t,o,n.dilations,n.pads,n.strides),s=r.reshapeUnpacked(e[0],[t[1],t[2]*t[3]]),a=r.reshapeUnpacked(e[1],[o[0],o[1]]),u=e.length>2?[a,s,e[2]]:[a,s],l=r.run(yu(u,n),u);return r.reshapeUnpacked(l,i)},l2=(r,e,n)=>{let t=e[0].dims,o=e[1].dims,i=Tr(t,o,n.dilations,n.pads,n.strides),s=r.run(Tf(r,e[0],e[1],i,n),[e[0]]),a=e.length===3?[s,e[1],e[2]]:[s,e[1]];return r.run(If(r,e,i,n),a)},c2=(r,e)=>{let n=r.kernelShape.slice();if(r.kernelShape.length===0)for(let i=2;i<e[1].dims.length;++i)n.push(e[1].dims[i]);let t=r.pads.slice();Zn.adjustPadsBasedOnAutoPad(e[0].dims,r.strides,r.dilations,n,t,r.autoPad);let o=Object.assign({},r);return Object.assign(o,{kernelShape:n,pads:t,cacheKey:r.cacheKey}),o},Iu=r=>{let e=r.attributes,n=xr(e),t=e.getString("auto_pad","NOTSET"),o=e.getInts("dilations",[1,1]),i=e.getInt("group",1),s=e.getInts("kernel_shape",[]),a=e.getInts("pads",[0,0,0,0]),u=e.getInts("strides",[1,1]);return de({autoPad:t,dilations:o,group:i,kernelShape:s,pads:a,strides:u,...n})},d2=(r,e)=>{if(!r||r.length!==2&&r.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(r[0].dims.length!==4||r[1].dims.length!==4)throw new Error("currently only support 2-dimensional conv");let n=r[0].dims[1],t=r[1].dims[1]*e.group;if(n!==t)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");if(r.length===3&&(r[2].dims.length!==1||r[1].dims[0]!==r[2].dims[0]))throw new Error("invalid bias");let o=r[0].dims.length-2;if(e.dilations.length!==o)throw new Error(`dilations should be ${o}D`);if(e.strides.length!==o)throw new Error(`strides should be ${o}D`);if(e.pads.length!==o*2)throw new Error(`pads should be ${o*2}D`);if(e.kernelShape.length!==0&&e.kernelShape.length!==r[1].dims.length-2)throw new Error("invalid kernel shape");if(r[0].type!=="float32"||r[1].type!=="float32")throw new Error("Conv input(X,W) should be float tensor");if(r.length===3&&r[2].type!=="float32")throw new Error("Conv input(bias) should be float tensor")}});var p2,f2,h2,$f,m2,g2,b2,y2,_2,w2,Af,v2,Of=A(()=>{"use strict";qe();Le();he();tr();p2=(r,e,n,t,o,i)=>(r-1)*e+n+(t-1)*o+1-i,f2=(r,e,n,t,o)=>{let i=Math.floor(r/2);e==="SAME_UPPER"?(n[t]=i,n[o]=r-i):e==="SAME_LOWER"&&(n[t]=r-i,n[o]=i)},h2=(r,e,n,t,o,i,s,a)=>{let u=r.length-2,l=a.length===0;for(let c=0;c<u;++c){let d=l?r[c+2]*i[c]:a[c],p=p2(r[c+2],i[c],o[c],e[c],n[c],d);f2(p,t,o,c,c+u),l&&a.push(i[c]*(r[c+2]-1)+s[c]+(e[c]-1)*n[c]+1-o[c]-o[c+u])}},$f=(r,e,n)=>(v2(e,n),m2(r,e,n)),m2=(r,e,n)=>{let t=w2(n,e);return[_2(r,e,t)]},g2=(r,e)=>({name:"ConvTranspose",inputNames:r?["X","W","B"]:["X","W"],inputTypes:r?[0,0,0]:[0,0],cacheHint:e}),b2=(r,e,n,t)=>{let i=e.length>2?"getB(output_channel)":"0.0",s=e[0].dims,a=e[1].dims,u=a[1],l=a[0]/t.group,c=[e[0].dims[0],e[1].dims[1]*t.group,...t.outputShape],d=Y(r.session.backend.glContext.version),{activationFunction:p,applyActivation:f}=fn(t),h=`
  const ivec2 strides = ivec2(${t.strides[0]}, ${t.strides[1]});
  const ivec2 pads = ivec2(${t.pads[0]}, ${t.pads[1]});
  ${p}
  void main() {
    ivec4 coords = getOutputCoords();
    int batch = coords.x;
    int output_channel = coords.y;

    ivec2 loc = coords.zw + pads;

    int group_id = output_channel / ${u};
    int wOutChannel = output_channel - group_id * ${u};

    float value = ${i};
    for (int inChannelOffset = 0; inChannelOffset < ${l}; inChannelOffset++) {
      int input_channel = group_id * ${l} + inChannelOffset;
      for (int wWOff = 0; wWOff < ${a[2]}; wWOff++) {
        for (int wHOff = 0; wHOff < ${a[3]}; wHOff++) {
          ivec2 wOff = ivec2(wWOff * ${t.dilations[0]}, wHOff * ${t.dilations[1]});
          ivec2 wLoc = loc - wOff;
          ivec2 wLocIn = wLoc / strides;
          if (
            wLocIn * strides == wLoc &&
            wLocIn.x >= 0 && wLocIn.x < ${s[2]} &&
            wLocIn.y >= 0 && wLocIn.y < ${s[3]}
          ) {
            float xVal = getX(batch, input_channel, wLocIn.y, wLocIn.x);
            float wVal = getW(input_channel, wOutChannel, wHOff, wWOff);
            value += xVal * wVal;
          }
        }
      }
    }
    ${f}
    ${d.output} = vec4(value, .0, .0, .0);
  }
`;return{...n,output:{dims:c,type:e[0].type,textureType:0},shaderSource:h,hasMain:!0}},y2=(r,e,n)=>{let t=g2(e.length>2,n.cacheKey);return{...t,get:()=>b2(r,e,t,n)}},_2=(r,e,n)=>r.run(y2(r,e,n),e),w2=(r,e)=>{let n=r.kernelShape.slice();if(r.kernelShape.length===0)for(let a=2;a<e[1].dims.length;++a)n.push(e[1].dims[a]);let t=r.pads.slice(),o=r.outputShape.slice(),i=e[0].dims;h2(i,n,r.dilations,r.autoPad,t,r.strides,r.outputPadding,o);let s=Object.assign({},r);return Object.assign(s,{kernelShape:n,pads:t,outputShape:o,cacheKey:r.cacheKey}),s},Af=r=>{let e=r.attributes,n=xr(e),t=e.getString("auto_pad","NOTSET"),o=e.getInts("dilations",[1,1]),i=e.getInt("group",1),s=e.getInts("kernel_shape",[]),a=e.getInts("output_padding",[0,0]),u=e.getInts("output_shape",[]),l=e.getInts("pads",[0,0,0,0]),c=e.getInts("strides",[1,1]);return de({autoPad:t,dilations:o,group:i,kernelShape:s,outputPadding:a,outputShape:u,pads:l,strides:c,...n})},v2=(r,e)=>{if(!r||r.length!==2&&r.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(r[0].dims.length!==4||r[1].dims.length!==4)throw new Error("currently only support 2-dimensional conv");let n=r[0].dims[1],t=r[1].dims[0];if(n!==t)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");let o=r[1].dims[1]*e.group;if(r.length===3&&(r[2].dims.length!==1||r[2].dims[0]!==o))throw new Error("invalid bias");let i=r[0].dims.length-2;if(e.dilations.length!==i)throw new Error(`dilations should be ${i}D`);if(e.strides.length!==i)throw new Error(`strides should be ${i}D`);if(e.pads.length!==i*2)throw new Error(`pads should be ${i*2}D`);if(e.outputPadding.length!==i)throw new Error(`output_padding should be ${i}D`);if(e.kernelShape.length!==0&&e.kernelShape.length!==r[1].dims.length-2)throw new Error("invalid kernel shape");if(e.outputShape.length!==0&&e.outputShape.length!==r[0].dims.length-2)throw new Error("invalid output shape");if(r[0].type!=="float32"||r[1].type!=="float32")throw new Error("ConvTranspose input(X,W) should be float tensor");if(r.length===3&&r[2].type!=="float32")throw new Error("ConvTranspose input(bias) should be float tensor")}});var Pf,nr,Ef,x2,Df,T2,I2,S2,ti=A(()=>{"use strict";qe();xe();he();Pf={name:"Transpose",inputNames:["A"],inputTypes:[0]},nr=(r,e,n)=>(S2(e),[r.run({...Pf,cacheHint:n.cacheKey,get:()=>x2(r,e[0],n.perm)},e)]),Ef=r=>de({perm:r.attributes.getInts("perm",[])}),x2=(r,e,n)=>{let t=e.dims;n=Df(t,n);let o=T2(t,n),i=t.length,s=`
      ${I2("perm",n,i)}
      float process(int indices[${i}]) {
        int a[${i}];
        perm(a, indices);
        return _A(a);
      }`;return{...Pf,output:{dims:o,type:e.type,textureType:0},shaderSource:s}},Df=(r,e)=>(e&&e.length!==r.length&&(e=[...r.keys()].reverse()),e),T2=(r,e)=>(e=Df(r,e),Z.sortBasedOnPerm(r,e)),I2=(r,e,n)=>{let t=[];t.push(`void ${r}(out int a[${n}], int src[${n}]) {`);for(let o=0;o<n;++o)t.push(`	a[${e[o]}]=src[${o}];`);return t.push("	}"),t.join(`
`)},S2=r=>{if(!r||r.length!==1)throw new Error("Transpose requires 1 input.");if(r[0].type!=="float32"&&r[0].type!=="float64")throw new Error("input should be float tensor")}});var Cf,kf,$2,Lf=A(()=>{"use strict";ti();Cf=(r,e,n)=>{$2(e);let t=n.blocksize,o=t*t,i=n.mode==="DCR"?[0,3,4,1,5,2]:[0,1,4,2,5,3],s=n.mode==="DCR"?[e[0].dims[0],t,t,e[0].dims[1]/o,e[0].dims[2],e[0].dims[3]]:[e[0].dims[0],e[0].dims[1]/o,t,t,e[0].dims[2],e[0].dims[3]],a=r.reshapeUnpacked(e[0],s),u={perm:i,cacheKey:`${i}`},[l]=nr(r,[a],u),c=[e[0].dims[0],e[0].dims[1]/o,e[0].dims[2]*t,e[0].dims[3]*t];return[r.reshapeUnpacked(l,c)]},kf=r=>{let e=r.attributes.getInt("blocksize");if(e<1)throw new Error(`blocksize must be >= 1, but got : ${e} for DepthToSpace`);let n=r.attributes.getString("mode","DCR");if(n!=="DCR"&&n!=="CRD")throw new Error(`unrecognized mode: ${n} for DepthToSpace`);return{mode:n,blocksize:e}},$2=r=>{if(r.length!==1)throw new Error(`DepthToSpace expect 1 inputs, but got ${r.length}`);if(r[0].type==="string"||r[0].dims.length!==4)throw new TypeError("DepthToSpace input should be a 4-D numeric tensor")}});var Nf,Rf,A2,zf=A(()=>{"use strict";xe();Nf=(r,e,n)=>{A2(e,n);let t=Z.flattenShape(e[0].dims,n);return[r.reshapeUnpacked(e[0],t)]},Rf=r=>r.attributes.getInt("axis",1),A2=(r,e)=>{if(!r||r.length!==1)throw new Error("Flatten requires 1 input.");let n=r[0].dims.length;if(n===0)throw new Error("scalar tensor is not supported.");if(e<-n||e>n)throw new Error("Invalid axis");if(r[0].type==="string")throw new Error("string tensor is not supported.")}});var Rn,Jr=A(()=>{"use strict";Rn=["float32","float64","int32","int16","int8","uint16","uint32","uint8"]});var Bf,Mf,O2,P2,E2,D2,Vf=A(()=>{"use strict";qe();Jr();xe();he();Bf=(r,e,n)=>(D2(e,n.axis),[r.run(E2(r,e,n),e)]),Mf=r=>de({axis:r.attributes.getInt("axis",0)}),O2={name:"Gather",inputNames:["A","B"],inputTypes:[0,0]},P2=(r,e,n,t)=>{let o=n[0].dims.slice(),i=n[1].dims.slice(),s=new Array(o.length+i.length-1);t=Z.normalizeAxis(t,o.length);let a=[];for(let p=0;p<s.length;p++)p<t?(s[p]=o[p],a.push(`inputIdx[${p}] = outputIdx[${p}];`)):p<t+i.length?(s[p]=i[p-t],a.push(`indexDataIdx[${p-t}] = outputIdx[${p}];`)):(s[p]=o[p-i.length+1],a.push(`inputIdx[${p-i.length+1}] = outputIdx[${p}];`));let u=s.length||1,l=o.length,c=i.length||1,d=`
      float process(int outputIdx[${u}]) {
        int inputIdx[${l}];
        int indexDataIdx[${c}];
        indexDataIdx[0] = 0;
        ${a.join(`
        `)}
        int idx = int(_B(indexDataIdx));
        inputIdx[${t}] = idx < 0 ? idx + ${o[t]} : idx;
        return _A(inputIdx);
      }`;return{...e,output:{dims:s,type:n[0].type,textureType:0},shaderSource:d}},E2=(r,e,n)=>{let t={...O2,cacheHint:n.cacheKey};return{...t,get:()=>P2(r,t,e,n.axis)}},D2=(r,e)=>{if(!r||r.length!==2)throw new Error("Gather requires 2 inputs.");let n=r[0].dims.length;if(n<1)throw new Error("Invalid input shape.");if(e<-n||e>n-1)throw new Error("Invalid axis.");if(Rn.indexOf(r[0].type)===-1)throw new Error("Invaid input type.");if(r[1].type!=="int32"&&r[1].type!=="int16")throw new Error("Invaid input type.")}});var Su,Ff,Gf,Uf,C2,k2,L2,Wf=A(()=>{"use strict";qe();xe();he();Su=(r,e,n)=>(L2(e,n),[r.run(C2(e,n),e)]),Ff=(r,e)=>{let n=r.attributes.getInt("transA",0)!==0,t=r.attributes.getInt("transB",0)!==0,o=r.attributes.getFloat("alpha",1),i=r.attributes.getFloat("beta",1);return de({transA:n,transB:t,alpha:o,beta:i,isOptionalC:e})},Gf=r=>Ff(r,!1),Uf=r=>Ff(r,!0),C2=(r,e)=>{let n={name:"Gemm",inputNames:r.length===3?["A","B","C"]:["A","B"],inputTypes:r.length===3?[0,0,0]:[0,0],key:e.cacheKey};return{...n,get:()=>k2(n,r,e)}},k2=(r,e,n)=>{let t=e[0].dims.slice(),o=e[1].dims.slice(),[i,s]=Wo.getShapeOfGemmResult(t,n.transA,o,n.transB,e.length===3?e[2].dims:void 0),a=[i,s];if(!a)throw new Error("Can't use gemm on the given tensors");let u=t[t.length-1],l="";n.transA&&(u=t[0]),n.transA&&n.transB?l="value += _A_T(a) * _B_T(b);":n.transA&&!n.transB?l="value += _A_T(a) * _B(b);":!n.transA&&n.transB?l="value += _A(a) * _B_T(b);":!n.transA&&!n.transB&&(l="value += _A(a) * _B(b);");let c=a.length,d=e.length===3?`int c[${e[2].dims.length}];`:"",p=e.length===3?"bcastIndices_C(indices, c);":"",f=e.length===3?"value += beta * _C(c);":"",h=`
      float process(int indices[${c}]) {
          int a[${c}];
          int b[${c}];
          ${d}

          copyVec(indices, a);
          copyVec(indices, b);
          ${p}

          float value = 0.0;
          for (int k=0; k<${u}; ++k) {
              a[${c-1}] = k;
              b[${c-2}] = k;
              ${l}
          }

          value = value * alpha;
          ${f}
          return value;
      }`;return{...r,output:{dims:a,type:e[0].type,textureType:0},variables:[{name:"alpha",type:"float",data:n.alpha},{name:"beta",type:"float",data:n.beta}],shaderSource:h}},L2=(r,e)=>{if(!r)throw new Error("Input is missing");if(e.isOptionalC&&(r.length<2||r.length>3))throw new Error("Invaid input shape.");if(!e.isOptionalC&&r.length!==3)throw new Error("Gemm requires 3 inputs");if(r.length===3&&r[2].dims.length!==1&&r[2].dims.length!==2)throw new Error("Invalid input shape of C");if(r[0].type!=="float32"&&r[0].type!=="float64"||r[1].type!=="float32"&&r[1].type!=="float64"||r.length===3&&r[2].type!=="float32"&&r[2].type!=="float64")throw new Error("Invalid input type.");if(r[0].type!==r[1].type||r.length===3&&r[0].type!==r[2].type)throw new Error("Input types are mismatched")}});var Hf,qf,N2,R2,z2,B2,M2,jf=A(()=>{"use strict";qe();he();Hf=(r,e,n)=>(M2(e),[r.run(z2(r,e,n),e)]),qf=r=>{let e=r.attributes.getFloat("scale"),n=r.attributes.getFloats("bias");return de({scale:e,bias:n})},N2={name:"ImageScaler",inputNames:["X"],inputTypes:[0]},R2=(r,e,n,t)=>{let o=n[0].dims.slice(),i=o.length,a=`
      ${B2(t.bias.length)}
      float process(int indices[${i}]) {
        return _X(indices) * scale + getBias(bias, indices[1]);
      }`;return{...e,output:{dims:o,type:n[0].type,textureType:0},variables:[{name:"bias",type:"float",arrayLength:t.bias.length,data:t.bias},{name:"scale",type:"float",data:t.scale}],shaderSource:a}},z2=(r,e,n)=>{let t={...N2,cacheHint:n.cacheKey};return{...t,get:()=>R2(r,t,e,n)}},B2=r=>{let e=[`float getBias(float bias[${r}], int channel) {`];for(let n=0;n<r;++n)n===0?e.push(`	if (channel == ${n}) { return bias[${n}]; }`):n===r-1?e.push(`	else { return bias[${n}]; }`):e.push(`	else if (channel == ${n}) { return bias[${n}]; }`);return e.push("	}"),e.join(`
`)},M2=r=>{if(!r||r.length!==1)throw new Error("ImageScaler requires 1 input.");if(r[0].dims.length!==4)throw new Error("Invalid input shape.");if(r[0].type!=="float32"&&r[0].type!=="float64")throw new Error("Invalid input type.")}});var Xf,Zf,Kf,V2,F2,G2,U2,W2,H2,Jf=A(()=>{"use strict";Le();he();Xf=(r,e,n)=>{H2(e);let t=r.run(F2(e[0]),e);return[r.run(W2(r,e[0],n,t.dims),[e[0],t,e[1],e[2]])]},Zf=r=>r.attributes.getFloat("epsilon",1e-5),Kf={name:"InstanceNormalization_MeanAndVariance",inputNames:["X"],inputTypes:[0]},V2=(r,e)=>{let n=e.dims.slice(),t=n[1],o=n[2]*n[3],i=[n[0],t],s=`
      vec4 process(int[2] indices) {
        vec4 v = vec4(0.0);
        int a[4];
        a[0] = indices[0];
        a[1] = indices[1];
        float temp = 0.0;
        for(int a2=0; a2<${n[2]}; a2++) {
          a[2] = a2;
          for(int a3=0; a3<${n[3]}; a3++) {
            a[3] = a3;
            float x = _X(a);
            temp += x;
          }
        }
        float mean = temp / float(${o});
        temp = 0.0;
        for(int a2=0; a2<${n[2]}; a2++) {
          a[2] = a2;
          for(int a3=0; a3<${n[3]}; a3++) {
            a[3] = a3;
            float x = _X(a);
            temp += (x - mean) * (x - mean);
          }
        }
        v.r = mean;
        v.g = temp / float(${o});

        return v;
      }`;return{...r,output:{dims:i,type:e.type,textureType:4},shaderSource:s}},F2=r=>({...Kf,get:()=>V2(Kf,r)}),G2={name:"InstanceNormalization_ComputeOutput",inputNames:["X","MeanAndVariance","Scale","B"],inputTypes:[0,4,0,0]},U2=(r,e,n,t,o)=>{let i=Y(r.session.backend.glContext.version),[s,a]=r.calculateTextureWidthAndHeight(o,4),[u,l]=[s/4,a],c=`
      vec4 get_MeanAndVariance(int[2] mv) {
        int offset = indicesToOffset_MeanAndVariance(mv);
        vec2 coords = offsetToCoords(offset, ${u}, ${l});
        return ${i.texture2D}(MeanAndVariance, coords);
      }

      float process(int[4] indices) {
        int mv[2];
        mv[0] = indices[0];
        mv[1] = indices[1];
        vec4 mean_and_variance = get_MeanAndVariance(mv);
        float mean = mean_and_variance.r;
        float variance = mean_and_variance.g;

        int sb[1];
        sb[0] = indices[1];
        float scale = _Scale(sb);
        float b = _B(sb);

        return scale * (_X(indices) - mean) / sqrt(variance + epsilon) + b;
      }`;return{...e,output:{dims:n.dims,type:n.type,textureType:0},variables:[{name:"epsilon",type:"float",data:t}],shaderSource:c}},W2=(r,e,n,t)=>{let o={...G2,cacheHint:`${n}`};return{...o,get:()=>U2(r,o,e,n,t)}},H2=r=>{if(!r||r.length!==3)throw new Error("InstanceNormalization requires 3 inputs.");let e=r[0],n=r[1],t=r[2];if(e.dims.length<3||n.dims.length!==1||t.dims.length!==1)throw new Error("Invalid input shape.");if(n.dims[0]!==e.dims[1]||t.dims[0]!==e.dims[1])throw new Error("Input shapes are mismatched.");if(e.type!=="float32"&&e.type!=="float64"||n.type!=="float32"&&n.type!=="float64"||t.type!=="float32"&&t.type!=="float64")throw new Error("Invalid input type.");if(r[0].dims.length!==4)throw new Error("Only support 4-D input shape.")}});function q2(r,e){let n=r[0].dims[1],t=r[0].dims.length,o=-Math.floor((e.size-1)/2),i=Math.ceil((e.size-1)/2),s=`float(${e.alpha}) / float(${e.size})`,a=`float(${e.bias})`,u=`float(${e.beta})`,l=`
    float process(int indices[${t}]) {
        int c = indices[1];
        float x = _X(indices);
        float square_sum = 0.0;

        for (int i = ${o}; i <= ${i}; i++) {
          int idx = c + i;
          if (c >= 0 && c < ${n}) {
            indices[1] = idx;
            float j = _X(indices);
            square_sum += j * j;
          }
        }
        return x / pow(${a} + ${s} * square_sum, ${u});
    }`;return{...eh,cacheHint:e.cacheKey,output:{dims:r[0].dims,type:r[0].type,textureType:0},shaderSource:l}}function j2(r,e){return{...eh,cacheHint:e.cacheKey,get:()=>q2(r,e)}}var Qf,Yf,eh,K2,th=A(()=>{"use strict";qe();he();Qf=(r,e,n)=>(K2(e),[r.run(j2(e,n),e)]),Yf=r=>{let e=r.attributes.getFloat("alpha",1e-4),n=r.attributes.getFloat("beta",.75),t=r.attributes.getFloat("bias",1),o=r.attributes.getInt("size");return de({alpha:e,beta:n,bias:t,size:o})},eh={name:"LRN",inputNames:["X"],inputTypes:[0]};K2=r=>{if(!r||r.length!==1)throw new Error("LRN requires 1 input.");if(r[0].dims.length!==4)throw new Error('currently only support LRN for input with "NCHW" format');if(r[0].type!=="float32")throw new Error("input should be float type")}});var X2,$u,nh,rh,oh,Z2,J2,Q2,Y2,e1,t1,n1,r1,ih=A(()=>{"use strict";qe();xe();Le();he();X2={name:"Pad",inputNames:["A"],inputTypes:[0]},$u=(r,e,n)=>(Q2(e),[r.run({...X2,cacheHint:n.cacheKey,get:()=>J2(r,e[0],n)},e)]),nh=r=>{let e=r.attributes.getString("mode","constant"),n=r.attributes.getFloat("value",0),t=r.attributes.getInts("pads");return de({mode:e,value:n,pads:t})},rh=(r,e,n)=>{Y2(e);let t=Z2(r,e,n);return $u(r,[e[0]],t)},oh=r=>r.attributes.getString("mode","constant"),Z2=(r,e,n)=>{if(!r.session.isInitializer(e[1].dataId)||e.length>=3&&!r.session.isInitializer(e[2].dataId))throw new Error("dynamic pad attributes are not allowed");let t=Array.from(e[1].integerData),o=e.length>=3?e[2].floatData[0]:0;return de({mode:n,pads:t,value:o})},J2=(r,e,n)=>{let t=Z.padShape(e.dims.slice(),n.pads),o=t.length,s=`
      ${e1(r,e,n)}
      float process(int[${o}] indices) {
          return padA(indices);
      }`;return{name:"Pad",inputNames:["A"],inputTypes:[0],output:{dims:t,type:e.type,textureType:0},shaderSource:s}},Q2=r=>{if(!r||r.length!==1)throw new Error("Pad requires 1 input");if(r[0].type!=="float32"&&r[0].type!=="float64")throw new Error("Invalid input type.")},Y2=r=>{if(!r||r.length!==2&&r.length!==3)throw new Error("Pad requires 2 or 3 inputs");if(r[1].type!=="int32")throw new Error("Invalid input type.");if(r.length>=3&&r[2].type==="string")throw new Error("Invalid input type.")},e1=(r,e,n)=>{let t=Y(r.session.backend.glContext.version),[o,i]=r.calculateTextureWidthAndHeight(e.dims,0),s=Z.computeStrides(e.dims);switch(n.mode){case"constant":return t1(t,e.dims,s,o,i,n.pads,n.value);case"reflect":return n1(t,e.dims,s,o,i,n.pads);case"edge":return r1(t,e.dims,s,o,i,n.pads);default:throw new Error("Invalid mode")}},t1=(r,e,n,t,o,i,s)=>{let a=e.length,u="";for(let l=a-1;l>=0;--l)u+=`
        k = m[${l}] - ${i[l]};
        if (k < 0)  return constant;
        if (k >= ${e[l]}) return constant;
        offset += k * ${n[l]};
        `;return`
      float padA(int m[${a}]) {
        const float constant = float(${s});
        int offset = 0;
        int k = 0;
        ${u}
        vec2 coords = offsetToCoords(offset, ${t}, ${o});
        float value = getColorAsFloat(${r.texture2D}(A, coords));
        return value;
      }
      `},n1=(r,e,n,t,o,i)=>{let s=e.length,a="";for(let u=s-1;u>=0;--u)a+=`
        k = m[${u}] - ${i[u]};
        if (k < 0) { k = -k; }
        {
          const int _2n_1 = ${2*(e[u]-1)};
          k = int( mod( float(k), float(_2n_1) ) ) ;
          if(k >= ${e[u]}) { k = _2n_1 - k; }
        }
        offset += k * ${n[u]};
        `;return`
      float padA(int m[${s}]) {
        int offset = 0;
        int k = 0;
        ${a}
        vec2 coords = offsetToCoords(offset, ${t}, ${o});
        float value = getColorAsFloat(${r.texture2D}(A, coords));
        return value;
      }
      `},r1=(r,e,n,t,o,i)=>{let s=e.length,a="";for(let u=s-1;u>=0;--u)a+=`
        k = m[${u}] - ${i[u]};
        if (k < 0)  k = 0;
        if (k >= ${e[u]}) k = ${e[u]-1};
        offset += k * ${n[u]};
      `;return`
      float padA(int m[${s}]) {
        int offset = 0;
        int k = 0;
        ${a}
        vec2 coords = offsetToCoords(offset, ${t}, ${o});
        float value = getColorAsFloat(${r.texture2D}(A, coords));
        return value;
      }
      `}});var ah,uh,lh,ch,dh,ph,fh,hh,mh,o1,sh,gh,ri,bh,ni,i1,yh=A(()=>{"use strict";qe();xe();he();ah=(r,e,n)=>{ri(e);let t={name:"AveragePool",inputNames:["X"],inputTypes:[0],cacheHint:n.cacheKey};return[r.run({...t,get:()=>lh(e,t,!1,n)},e)]},uh=r=>{let e=r.attributes.getString("auto_pad","NOTSET"),n=r.attributes.getInt("ceil_mode",0),t=r.attributes.getInt("count_include_pad",0)!==0,o=r.attributes.getInts("kernel_shape"),i=r.attributes.getInts("strides",[]),s=r.attributes.getInts("pads",[]);if(n!==0)throw new Error("using ceil() in shape computation is not yet supported for AveragePool");return de({autoPad:e,ceilMode:n,countIncludePad:t,kernelShape:o,strides:i,pads:s})},lh=(r,e,n,t)=>{let[o,i]=mh(r,t,n),s=Z.size(o.kernelShape),a="value += _X(x);",u="";o.countIncludePad?u+=`value /= float(${s});`:u+=`value /= float(${s} - pad);`;let c=`
        ${bh(r[0].dims,o,a,u,"0.0")}
      `;return{...e,output:{dims:i,type:r[0].type,textureType:0},shaderSource:c}},ch=(r,e,n)=>{ri(e);let t={name:"GlobalAveragePool",inputNames:["X"],inputTypes:[0],cacheHint:`${n.countIncludePad}`};return[r.run({...t,get:()=>lh(e,t,!0,n)},e)]},dh=r=>{let e=r.attributes.getInt("count_include_pad",0)!==0;return de({autoPad:"",ceilMode:0,countIncludePad:e,kernelShape:[],strides:[],pads:[]})},ph=(r,e,n)=>{ri(e);let t={name:"MaxPool",inputNames:["X"],inputTypes:[0],cacheHint:n.cacheKey};return[r.run({...t,get:()=>hh(e,t,!1,n)},e)]},fh=r=>{let e=r.attributes.getString("auto_pad","NOTSET"),n=r.attributes.getInt("ceil_mode",0),t=r.attributes.getInts("kernel_shape"),o=r.attributes.getInts("strides",[]),i=r.attributes.getInts("pads",[]),s=r.attributes.getInt("storage_order",0),a=r.attributes.getInts("dilations",[]);if(s!==0)throw new Error("column major storage order is not yet supported for MaxPool");if(n!==0)throw new Error("using ceil() in shape computation is not yet supported for MaxPool");return de({autoPad:e,ceilMode:n,countIncludePad:!1,kernelShape:t,strides:o,pads:i,storageOrder:s,dilations:a})},hh=(r,e,n,t)=>{let[o,i]=mh(r,t,n),l=`
      ${bh(r[0].dims,o,`
      value = max(_X(x), value);
    `,"","-1e5")}
    `;return{...e,output:{dims:i,type:r[0].type,textureType:0},shaderSource:l}},mh=(r,e,n)=>{let t=r[0].dims.slice(),o=Object.hasOwnProperty.call(e,"dilations"),i=e.kernelShape.slice(),s=e.strides.slice(),a=o?e.dilations.slice():[],u=e.pads.slice();Zn.adjustPoolAttributes(n,t,i,s,a,u);let l=Zn.computePoolOutputShape(n,t,s,a,i,u,e.autoPad),c=Object.assign({},e);return o?Object.assign(c,{kernelShape:i,strides:s,pads:u,dilations:a,cacheKey:e.cacheKey}):Object.assign(c,{kernelShape:i,strides:s,pads:u,cacheKey:e.cacheKey}),[c,l]},o1={autoPad:"",ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[],cacheKey:""},sh={name:"GlobalMaxPool",inputNames:["X"],inputTypes:[0]},gh=(r,e)=>(ri(e),[r.run({...sh,get:()=>hh(e,sh,!0,o1)},e)]),ri=r=>{if(!r||r.length!==1)throw new Error("Pool ops requires 1 input.");if(r[0].type!=="float32"&&r[0].type!=="float64")throw new Error("Invalid input type.")},bh=(r,e,n,t,o)=>{let i=r.length;if(e.kernelShape.length<=2){let s=e.kernelShape[e.kernelShape.length-1],a=e.strides[e.strides.length-1],u=e.pads[e.pads.length/2-1],l=e.pads[e.pads.length-1],c=r[i-1],d="",p="",f="";if(u+l!==0?d=`
          for (int i = 0; i < ${s}; i++) {
            x[${i} - 1] = indices[${i} - 1] * ${a} - ${u} + i;
            if (x[${i} - 1] < 0 || x[${i} - 1] >= ${c}) {
              pad++;
              continue;
            }
            ${n}
          }`:d=`
          for (int i = 0; i < ${s}; i++) {
            x[${i} - 1] = indices[${i} - 1] * ${a} - ${u} + i;
            ${n}
          }`,e.kernelShape.length===2){let m=e.kernelShape[e.kernelShape.length-2],y=e.strides[e.strides.length-2],g=e.pads[e.pads.length/2-2],b=e.pads[e.pads.length-2],_=r[i-2];g+b!==0?p=`
            for (int j = 0; j < ${m}; j++) {
              x[${i} - 2] = indices[${i} - 2] * ${y} - ${g} + j;
              if (x[${i} - 2] < 0 || x[${i} - 2] >= ${_}) {
                pad+= ${s};
                continue;
              }
          `:p=`
            for (int j = 0; j < ${m}; j++) {
              x[${i} - 2] = indices[${i} - 2] * ${y} - ${g} + j;
            `,f=`
          }
        `}return`
        float process(int indices[${i}]) {
          int x[${i}];
          copyVec(indices, x);

          float value = ${o};
          int pad = 0;
          ${p}
          ${d}
          ${f}
          ${t}
          return value;
        }
      `}else{let s=Z.size(e.kernelShape),a=Z.computeStrides(e.kernelShape),u=a.length,l=e.pads.length,c=i1(u),d=ni(r,"inputDims"),p=ni(e.pads,"pads"),f=ni(a,"kernelStrides"),h=ni(e.strides,"strides"),m=e.pads.reduce((b,_)=>b+_),y="";return m?y=`
            if (x[j] >= inputDims[j] || x[j] < 0) {
              pad++;
              isPad = true;
              break;
            }
          }
          if (!isPad) {
            ${n}
          }`:y=`
          }
          ${n}
        `,`
        ${c}
        float process(int indices[${i}]) {
          int x[${i}];
          copyVec(indices, x);
          int offset[${u}];
          int pads[${l}];
          int inputDims[${i}];
          int kernelStrides[${u}];
          int strides[${u}];
          ${p}
          ${d}
          ${h}
          ${f}

          float value = ${o};
          int pad = 0;
          bool isPad = false;
          for (int i = 0; i < ${s}; i++) {
            offsetToIndices(i, kernelStrides, offset);
            isPad = false;
            for (int j = ${i} - ${u}; j < ${i}; j++) {
              x[j] = indices[j] * strides[j - ${i} + ${u}]
                + offset[j - ${i} + ${u}] - pads[j - 2];
              ${y}
          }
          ${t}

          return value;
        }
      `}},ni=(r,e)=>{let n="";for(let t=0;t<r.length;t++)n+=`
      ${e}[${t}] = ${r[t]};
    `;return n},i1=r=>`
  void offsetToIndices(int offset, int[${r}] strides, out int[${r}] indices) {
    if (${r} == 0) {
      return;
    }
    for (int i = 0; i < ${r} - 1; ++i) {
      indices[i] = offset / strides[i];
      offset -= indices[i] * strides[i];
    }
    indices[${r} - 1] = offset;
  }`});var rr,zn,s1,a1,_h,wh,vh,xh,Th,Ih,Sh,$h=A(()=>{"use strict";qe();Jr();xe();he();rr=(r,e,n,t,o)=>{a1(e);let i={name:t,inputNames:["A"],inputTypes:[0]};return[r.run({...i,cacheHint:n.cacheKey,get:()=>s1(r,e,n,t,o,i)},e)]},zn=r=>{let e=r.attributes.getInts("axes",[]),n=r.attributes.getInt("keepdims",1)===1;return de({axes:e,keepDims:n})},s1=(r,e,n,t,o,i)=>{let s=[],a=e[0].dims.length||1,u=[],l=Z.normalizeAxes(n.axes,e[0].dims.length),c=o(e,l),d=c[1];for(let h=0;h<e[0].dims.length;h++)l.indexOf(h)>=0||l.length===0?(n.keepDims&&s.push(1),d=`
          for(int j${h} = 0; j${h} < ${e[0].dims[h]}; j${h}++) {
            inputIdx[${h}] = j${h};
            ${d}
          }`):(u.push(`inputIdx[${h}] = outputIdx[${s.length}];`),s.push(e[0].dims[h]));let f=`
      float process(int outputIdx[${s.length||1}]) {
        float value;                 // final result
        int inputIdx[${a}];      // addressing input data
        ${u.join(`
`)}
        ${c[0]}       // init ops for reduce max/min
        ${d}
        ${c[2]}       // final computation for reduce mean
        return value;
      }`;return{...i,output:{dims:s,type:e[0].type,textureType:0},shaderSource:f}},a1=r=>{if(!r||r.length!==1)throw new Error("Reduce op requires 1 input.");if(Rn.indexOf(r[0].type)===-1)throw new Error("Invalid input type.")},_h=(r,e,n)=>rr(r,e,n,"ReduceSum",()=>["value = 0.0;","value += _A(inputIdx);",""]),wh=(r,e,n)=>rr(r,e,n,"ReduceMean",(o,i)=>{let s=1;for(let a=0;a<o[0].dims.length;a++)(i.indexOf(a)>=0||i.length===0)&&(s*=o[0].dims[a]);return["value = 0.0;","value += _A(inputIdx);",`value /= ${s}.;`]}),vh=(r,e,n)=>rr(r,e,n,"ReduceMax",(o,i)=>{let s=[];for(let a=0;a<o[0].dims.length;a++)(i.indexOf(a)>=0||i.length===0)&&s.push(`inputIdx[${a}] = 0;`);return[`${s.join(`
`)}
value = _A(inputIdx);`,"value = max(value, _A(inputIdx));",""]}),xh=(r,e,n)=>rr(r,e,n,"ReduceMin",(o,i)=>{let s=[];for(let a=0;a<o[0].dims.length;a++)(i.indexOf(a)>=0||i.length===0)&&s.push(`inputIdx[${a}] = 0;`);return[`${s.join(`
`)}
value = _A(inputIdx);`,"value = min(value, _A(inputIdx));",""]}),Th=(r,e,n)=>rr(r,e,n,"ReduceProd",()=>["value = 1.0;","value *= _A(inputIdx);",""]),Ih=(r,e,n)=>rr(r,e,n,"ReduceLogSum",()=>["value = 0.0;","value += _A(inputIdx);","value = log(value);"]),Sh=(r,e,n)=>rr(r,e,n,"ReduceLogSumSquare",()=>["float t; value = 0.0;","t = _A(inputIdx); value += t * t;",""])});var Ah,Oh=A(()=>{"use strict";xe();Ah=(r,e)=>{let n=Z.calculateReshapedDims(e[0].dims,e[1].integerData);return r.session.pack?[r.reshapePacked(e[0],n)]:[r.reshapeUnpacked(e[0],n)]}});var Ph,Au,Eh,Dh,Qr,u1,Ou,oi,Pu=A(()=>{"use strict";qe();Le();he();Ph={name:"Upsample",inputNames:["X"],inputTypes:[0]},Au=(r,e,n)=>(Ou(e,n),[r.run({...Ph,cacheHint:n.cacheKey,get:()=>u1(r,e,n)},e)]),Eh=r=>Qr(r,7),Dh=r=>Qr(r,9),Qr=(r,e)=>{let n=e>=10,t=r.attributes.getString("mode","nearest");if(t!=="nearest"&&t!=="linear"&&(e<11||t!=="cubic"))throw new Error(`unrecognized mode: ${t}`);let o=[];e<9&&(o=r.attributes.getFloats("scales"),oi(o,t,n));let i=r.attributes.getFloat("extrapolation_value",0),s=e>10?r.attributes.getString("coordinate_transformation_mode","half_pixel"):"asymmetric";if(["asymmetric","pytorch_half_pixel","tf_half_pixel_for_nn","align_corners","tf_crop_and_resize","half_pixel"].indexOf(s)===-1)throw new Error(`coordinate_transform_mode '${s}' is not supported`);let a=s==="tf_crop_and_resize",u=a,l=t==="nearest"&&e>=11?r.attributes.getString("nearest_mode","round_prefer_floor"):"";if(["round_prefer_floor","round_prefer_ceil","floor","ceil",""].indexOf(l)===-1)throw new Error(`nearest_mode '${l}' is not supported`);let c=r.attributes.getFloat("cubic_coeff_a",-.75),d=r.attributes.getInt("exclude_outside",0)!==0;if(d&&t!=="cubic")throw new Error("exclude_outside can be set to 1 only when mode is CUBIC.");let p=e<11?!0:t==="nearest"&&s==="asymmetric"&&l==="floor",f=0,h=0,m=0;return e>10?r.inputs.length>2?(f=1,h=2,m=3):(h=1,m=2):e===9&&(h=1),de({opset:e,isResize:n,mode:t,scales:o,extrapolationValue:i,coordinateTransformMode:s,useExtrapolation:u,needRoiInput:a,nearestMode:l,cubicCoefficientA:c,excludeOutside:d,useNearest2xOptimization:p,roiInputIdx:f,scalesInputIdx:h,sizesInputIdx:m})},u1=(r,e,n)=>{let t=Y(r.session.backend.glContext.version),[o,i]=r.calculateTextureWidthAndHeight(e[0].dims,0),s=e[0].dims.map((m,y)=>Math.floor(m*n.scales[y])),[a,u]=r.calculateTextureWidthAndHeight(s,0),l=s.length,c=new Array(l),d=new Array(l),p=`
      int output_pitches[${l}];
      int input_pitches[${l}];
      `;for(let m=l-1;m>=0;m--)c[m]=m===l-1?1:c[m+1]*s[m+1],d[m]=m===l-1?1:d[m+1]*e[0].dims[m+1],p+=`
        output_pitches[${m}] = ${c[m]};
        input_pitches[${m}] = ${d[m]};
        `;let f=`
      float getInputFloat(int index) {
        vec2 coords = offsetToCoords(index, ${o}, ${i});
        float value = getColorAsFloat(${t.texture2D}(X, coords));
        return value;
      }
      `,h=n.mode==="nearest"?`
    ${f}
    float process(int indices[${l}]) {
      int input_index = 0;
      int output_index = coordsToOffset(TexCoords, ${a}, ${u});

      ${p}

      int d, m;
      for (int dim = 0; dim < ${l}; ++dim) {
        d = output_index / output_pitches[dim];
        m = output_index - d * output_pitches[dim];
        output_index = m;

        if (scales[dim] != 1 && d > 0) {
          int d2 = d / scales[dim];
          m = d - d2 * scales[dim];
          d = d2;
        }
        input_index += input_pitches[dim] * d;
      }

      return getInputFloat(input_index);
    }`:l===4?`
    ${f}
    float process(int indices[4]) {
      int input_index = 0;
      int output_index = coordsToOffset(TexCoords, ${a}, ${u});

      ${p}

      int m;
      int index_of_dim0, index_of_dim1, index_of_dim2, index_of_dim3;
      index_of_dim0 = output_index / output_pitches[0];
      m = output_index - index_of_dim0 * output_pitches[0];
      index_of_dim1 = m / output_pitches[1];
      m = m - index_of_dim1 * output_pitches[1];
      index_of_dim2 = m / output_pitches[2];
      m = m - index_of_dim2 * output_pitches[2];
      index_of_dim3 = m;

      int index_of_input_dim2, index_of_input_dim3, x_offset, y_offset;
      index_of_input_dim2 = index_of_dim2 / scales[2];
      y_offset = index_of_dim2 - index_of_input_dim2 * scales[2];
      index_of_input_dim3 = index_of_dim3 / scales[3];
      x_offset = index_of_dim3 - index_of_input_dim3 * scales[3];

      input_index = index_of_dim0 * input_pitches[0] +
            index_of_dim1 * input_pitches[1] +
            index_of_input_dim2 * input_pitches[2] +
            index_of_input_dim3;

      float x00 = getInputFloat(input_index);
      float x10, x01, x11;

      bool end_of_dim2 = false;
      if (index_of_input_dim2 == (${e[0].dims[2]} - 1)) {
        // It's the end in dimension 2
        x01 = x00;
        end_of_dim2 = true;
      } else {
        x01 = getInputFloat(input_index + input_pitches[2]);
      }

      if (index_of_input_dim3 == (input_pitches[2] - 1)) {
        // It's the end in dimension 3
        x10 = x00;
        x11 = x01;
      }
      else {
        x10 = getInputFloat(input_index + 1);
        x11 = end_of_dim2 ? x10 : getInputFloat(input_index + input_pitches[2] + 1);
      }

      float y0 = x00 + float(y_offset) * (x01 - x00) / float(scales[2]);
      float y1 = x10 + float(y_offset) * (x11 - x10) / float(scales[2]);
      return y0 + float(x_offset) * (y1 - y0) / float(scales[3]);
    }`:`
    ${f}
    float process(int indices[2]) {
      int input_index = 0;
      int output_index = coordsToOffset(TexCoords, ${a}, ${u});

      ${p}

      int m;
      int index_of_dim0, index_of_dim1;
      index_of_dim0 = output_index / output_pitches[0];
      m = output_index - index_of_dim0 * output_pitches[0];
      index_of_dim1 = m;

      int index_of_input_dim0, index_of_input_dim1, x_offset, y_offset;
      index_of_input_dim0 = index_of_dim0 / scales[0];
      y_offset = index_of_dim0 - index_of_input_dim0 * scales[0];
      index_of_input_dim1 = index_of_dim1 / scales[1];
      x_offset = index_of_dim1 - index_of_input_dim1 * scales[1];

      input_index = index_of_input_dim0 * input_pitches[0] + index_of_input_dim1;

      float x00 = getInputFloat(input_index);
      float x10, x01, x11;

      bool end_of_dim0 = false;
      if (index_of_input_dim0 == (${e[0].dims[0]} - 1)) {
        // It's the end in dimension 0
        x01 = x00;
        end_of_dim0 = true;
      } else {
        x01 = getInputFloat(input_index + input_pitches[0]);
      }

      if (index_of_input_dim1 == (input_pitches[0] - 1)) {
        // It's the end in dimension 1
        x10 = x00;
        x11 = x01;
      }
      else {
        x10 = getInputFloat(input_index + 1);
        x11 = end_of_dim0 ? x10 : getInputFloat(input_index + input_pitches[0] + 1);
      }

      float y0 = x00 + float(y_offset) * (x01 - x00) / float(scales[0]);
      float y1 = x10 + float(y_offset) * (x11 - x10) / float(scales[0]);
      return y0 + float(x_offset) * (y1 - y0) / float(scales[1]);
    }`;return{...Ph,output:{dims:s,type:e[0].type,textureType:0},shaderSource:h,variables:[{name:"scales",type:"int",arrayLength:n.scales.length,data:n.scales.map(m=>Math.ceil(m))}]}},Ou=(r,e)=>{if(!r||e.opset<9&&r.length!==1||e.opset>=9&&e.opset<11&&r.length!==2||e.opset>=11&&r.length<2)throw new Error("invalid inputs.");if(e.scales.length>0&&r[0].dims.length!==e.scales.length)throw new Error("Invalid input shape.");if(r[0].type==="string")throw new Error("Invalid input tensor types.")},oi=(r,e,n)=>{if(n){for(let t of r)if(t<=0)throw new Error("Scale value should be greater than 0.")}else for(let t of r)if(t<1)throw new Error("Scale value should be greater than or equal to 1.");if((e==="linear"||e==="cubic")&&r.length!==2&&(r.length!==4||r[0]!==1||r[1]!==1))throw new Error(`'Linear' mode and 'Cubic' mode only support 2-D inputs ('Bilinear', 'Bicubic')         or 4-D inputs with the corresponding outermost 2 scale values being 1         in the ${n?"Resize":"Upsample"} opeartor.`)}});var Eu,Du,Ch,kh,l1,c1,d1,p1,Lh=A(()=>{"use strict";Le();he();dn();er();Pu();Eu={name:"Resize",inputNames:["A"],inputTypes:[2]},Du=(r,e,n)=>(Ou(e,n),[r.run({...Eu,cacheHint:n.cacheKey,get:()=>l1(r,e,n)},e)]),Ch=r=>Qr(r,10),kh=r=>Qr(r,11),l1=(r,e,n)=>{let t=Y(r.session.backend.glContext.version),[o,i]=c1(e,n);if(o.every(_=>_===1)&&n.coordinateTransformMode!=="tf_crop_and_resize")return{...Eu,output:{dims:i,type:e[0].type,textureType:2},hasMain:!0,shaderSource:`void main() {
                    vec4 v = ${t.texture2D}(X, TexCoords);
                    ${t.output} = v;
                }`};let a=i.length;if(a<2)throw new Error(`output dimension should be at least 2, but got ${a}`);let u=i[a-2],l=i[a-1],c=e[0].dims;if(a!==c.length)throw new Error(`output dimension should match input ${c.length}, but got ${a}`);let d=c[a-2],p=c[a-1],f=o[a-2],h=o[a-1],m="";if(n.mode!=="linear")throw new Error(`resize (packed) does not support mode: '${n.mode}'`);switch(n.coordinateTransformMode){case"asymmetric":m=`
                    vec4 getSourceFracIndex(ivec4 coords) {
                        return vec4(coords) / scaleWHWH;
                    }
                `;break;case"half_pixel":m=`
                    vec4 getSourceFracIndex(ivec4 coords) {
                        return (vec4(coords) + 0.5) / scaleWHWH - 0.5;
                    }
                `;break;case"pytorch_half_pixel":m=`
                    vec4 getSourceFracIndex(ivec4 coords) {
                        vec4 fcoords = vec4(coords);
                        return vec4(
                            ${l}.0 > 1.0 ? (fcoords.x + 0.5) / scaleWHWH.x - 0.5 : 0.0,
                            ${u}.0 > 1.0 ? (fcoords.y + 0.5) / scaleWHWH.y - 0.5 : 0.0,
                            ${l}.0 > 1.0 ? (fcoords.z + 0.5) / scaleWHWH.z - 0.5 : 0.0,
                            ${u}.0 > 1.0 ? (fcoords.w + 0.5) / scaleWHWH.w - 0.5 : 0.0
                          );
                    }
                `;break;case"align_corners":m=`
                    vec4 getSourceFracIndex(ivec4 coords) {
                        vec4 resized = vec4(${l}.0 - 1.0, ${u}.0 - 1.0, ${l}.0 - 1.0,
                            ${u}.0 - 1.0);
                        vec4 original = vec4(${p}.0 - 1.0, ${d}.0 - 1.0, ${p}.0 - 1.0,
                            ${d}.0 - 1.0);
                        vec4 new_scale = original / resized;
                        return vec4(coords) * new_scale;
                    }
                `;break;default:throw new Error(`resize (packed) does not support coordinateTransformMode:                                 '${n.coordinateTransformMode}'`)}let y=Ye(a),g=pn(),b=`
            const vec2 inputWH = vec2(${d}.0, ${p}.0);
            const vec4 scaleWHWH = vec4(float(${f}), float(${h}), float(${f}), float(${h}));
            ${g}
            ${m}
            float getAValue(int x10, int r, int c, int d) {
                return getChannel(getA(x10, r, c, d), vec2(c, d));
            }
            void main() {
                ${y} rc = getOutputCoords();

                int batch = rc[0];
                int depth = rc[1];

                // retrieve the 4 coordinates that is used in the 4 packed output values.
                ivec4 coords = ivec4(rc.wz, rc.w + 1, rc.z + 1);

                // calculate the source index in fraction
                vec4 sourceFrac = getSourceFracIndex(coords);

                // get the lower and upper bound of the 4 values that will be packed into one texel.
                ivec4 x00 = ivec4(max(sourceFrac.xy, vec2(0.0)), min(inputWH - 1.0, ceil(sourceFrac.xy)));
                ivec4 x01 = ivec4(max(sourceFrac.xw, vec2(0.0)), min(inputWH - 1.0, ceil(sourceFrac.xw)));
                ivec4 x10 = ivec4(max(sourceFrac.zy, vec2(0.0)), min(inputWH - 1.0, ceil(sourceFrac.zy)));
                ivec4 x11 = ivec4(max(sourceFrac.zw, vec2(0.0)), min(inputWH - 1.0, ceil(sourceFrac.zw)));

                bool hasNextRow = rc.w < ${u-1};
                bool hasNextCol = rc.z < ${l-1};

                // pack x00, x01, x10, x11's top-left corner into one vec4 structure
                vec4 topLeft = vec4(
                    getAValue(batch, depth, x00.x, x00.y),
                    hasNextCol ? getAValue(batch, depth, x01.x, x01.y) : 0.0,
                    hasNextRow ? getAValue(batch, depth, x10.x, x10.y) : 0.0,
                    (hasNextRow && hasNextCol) ? getAValue(batch, depth, x11.x, x11.y) : 0.0);

                // pack x00, x01, x10, x11's top-right corner into one vec4 structure
                vec4 topRight = vec4(
                    getAValue(batch, depth, x00.x, x00.w),
                    hasNextCol ? getAValue(batch, depth, x01.x, x01.w) : 0.0,
                    hasNextRow ? getAValue(batch, depth, x10.x, x10.w) : 0.0,
                    (hasNextRow && hasNextCol) ? getAValue(batch, depth, x11.x, x11.w) : 0.0);

                // pack x00, x01, x10, x11's bottom-left corner into one vec4 structure
                vec4 bottomLeft = vec4(
                    getAValue(batch, depth, x00.z, x00.y),
                    hasNextCol ? getAValue(batch, depth, x01.z, x01.y) : 0.0,
                    hasNextRow ? getAValue(batch, depth, x10.z, x10.y) : 0.0,
                    (hasNextRow && hasNextCol) ? getAValue(batch, depth, x11.z, x11.y) : 0.0);

                // pack x00, x01, x10, x11's bottom-right corner into one vec4 structure
                vec4 bottomRight = vec4(
                    getAValue(batch, depth, x00.z, x00.w),
                    hasNextCol ? getAValue(batch, depth, x01.z, x01.w) : 0.0,
                    hasNextRow ? getAValue(batch, depth, x10.z, x10.w) : 0.0,
                    (hasNextRow && hasNextCol) ? getAValue(batch, depth, x11.z, x11.w) : 0.0);

                // calculate the interpolation fraction on u and v direction
                vec4 frac = vec4(sourceFrac) - floor(sourceFrac);
                vec4 clampFrac = clamp(frac, vec4(0.0), vec4(1.0));

                vec4 top = mix(topLeft, topRight, clampFrac.ywyw);
                vec4 bottom = mix(bottomLeft, bottomRight, clampFrac.ywyw);
                vec4 newValue = mix(top, bottom, clampFrac.xxzz);

                ${t.output} = vec4(newValue);
            }
        `;return{...Eu,output:{dims:i,type:e[0].type,textureType:2},hasMain:!0,shaderSource:b}},c1=(r,e)=>{let t=r[0].dims,o=e.scales,i;if(o.length===0){let a=r[e.scalesInputIdx];if(a&&a.size!==0){if(r[e.sizesInputIdx])throw new Error("Only one of scales or sizes must be provided as input.");o=d1(a,e.mode,e.isResize)}else{let u=r[e.sizesInputIdx];if(!u||u.size===0)throw new Error("Either scales or sizes MUST be provided as input.");i=Array.from(u.integerData),o=p1(i,t,e.mode,e.isResize)}}else if(r[e.sizesInputIdx])throw new Error("Only one of scales or sizes must be provided as input.");let s=i||t.map((a,u)=>Math.floor(a*o[u]));return[o,s]},d1=(r,e,n)=>{let t=Array.from(r.floatData);return oi(t,e,n),t},p1=(r,e,n,t)=>{let o=e.length,i=new Array(o);for(let s=0,a=o;s<a;s++)if(e[s]===0){if(r[s]!==0)throw new Error("Input dim is zero but required output dim is non-zero.");i[s]=1}else i[s]=r[s]/e[s];return oi(i,n,t),i}});var Nh,f1,Rh=A(()=>{"use strict";Yn();Nh=(r,e)=>(f1(e),[new Fe([e[0].dims.length],"int32",void 0,void 0,new Int32Array(e[0].dims))]),f1=r=>{if(!r||r.length!==1)throw new Error("Shape requires 1 input.")}});var Cu,zh,Bh,Mh,h1,Vh,m1,g1,Fh=A(()=>{"use strict";qe();Jr();xe();he();Cu={name:"Slice",inputNames:["A"],inputTypes:[0]},zh=(r,e,n)=>(h1(e),[r.run({...Cu,cacheHint:n.cacheKey,get:()=>Mh(r,e[0],n)},e)]),Bh=r=>{let e=r.attributes.getInts("starts"),n=r.attributes.getInts("ends"),t=r.attributes.getInts("axes",[]);return de({starts:e,ends:n,axes:t})},Mh=(r,e,n)=>{let t=n.axes.length===0?e.dims.slice(0).map((d,p)=>p):n.axes,o=Z.normalizeAxes(t,e.dims.length),i=n.starts.map((d,p)=>d>e.dims[o[p]]-1?e.dims[o[p]]:Z.normalizeAxis(d,e.dims[o[p]])),s=n.ends.map((d,p)=>d>e.dims[o[p]]-1?e.dims[o[p]]:Z.normalizeAxis(d,e.dims[o[p]])),a=e.dims.slice(),u=[];for(let d=0;d<o.length;d++)a[o[d]]=s[d]-i[d],i[d]>0&&u.push(`outputIdx[${o[d]}] += ${i[d]};`);let c=`
      float process(int outputIdx[${a.length}]) {
        ${u.join(`
      `)}
        return _A(outputIdx);
      }`;return{...Cu,output:{dims:a,type:e.type,textureType:0},shaderSource:c}},h1=r=>{if(!r||r.length!==1)throw new Error("Slice requires 1 input.");if(Rn.indexOf(r[0].type)===-1)throw new Error("Invalid input type.")},Vh=(r,e)=>{g1(e);let n=m1(r,e);return[r.run({...Cu,cacheHint:n.cacheKey,get:()=>Mh(r,e[0],n)},[e[0]])]},m1=(r,e)=>{if(!r.session.isInitializer(e[1].dataId)||!r.session.isInitializer(e[2].dataId)||e.length>=4&&!r.session.isInitializer(e[3].dataId)||e.length>=5&&!r.session.isInitializer(e[4].dataId))throw new Error("dynamic slice attributes are not allowed");if(e.length>=5&&e[4].integerData.some(s=>s!==1))throw new Error("currently non-1 steps is not supported for Slice");let n=Array.from(e[1].integerData),t=Array.from(e[2].integerData),o=e.length>=4?Array.from(e[3].integerData):[],i=`${o};${n};${t}`;return{starts:n,ends:t,axes:o,cacheKey:i}},g1=r=>{if(!r||r.length<3||r.length>5)throw new Error("Invalid input number.");if(r[1].type!=="int32"||r[1].dims.length!==1)throw new Error("Invalid input type.");if(r[2].type!=="int32"||r[2].dims.length!==1)throw new Error("Invalid input type.");if(r.length>=4&&(r[3].type!=="int32"||r[3].dims.length!==1))throw new Error("Invalid input type.");if(r.length>=5&&(r[4].type!=="int32"||r[4].dims.length!==1))throw new Error("Invalid input type.")}});var Gh,Uh,Wh,Hh,qh,jh,Kh,Xh,b1,y1,_1,Zh,Jh=A(()=>{"use strict";qe();xe();Le();he();ti();Gh={name:"SoftmaxComputeMax",inputNames:["A"],inputTypes:[0]},Uh={name:"SoftmaxComputeScale",inputNames:["A","Max"],inputTypes:[0,0]},Wh={name:"SoftMax",inputNames:["A","Max","Norm"],inputTypes:[0,0,0]},Hh=(r,e,n)=>{Zh(e);let t=e[0].dims.slice(),o=Z.normalizeAxis(n.axis,t.length),i=Z.sizeToDimension(t,o),s=Z.sizeFromDimension(t,o);return Xh(r,e,n,i,s)},qh=r=>de({axis:r.attributes.getInt("axis",1)}),jh=r=>de({axis:r.attributes.getInt("axis",-1)}),Kh=(r,e,n)=>{Zh(e);let t=e[0].dims.slice(),o=Z.normalizeAxis(n.axis,t.length),i=t.length,s=o!==i-1,a=[],u=[],l=[],c;s&&(u=Array.from({length:i}).map((h,m)=>m),u[o]=i-1,u[i-1]=o,u.map(h=>a.push(t[h])),c=de({perm:u}),l=nr(r,e,c));let d=s?Z.sizeToDimension(a,i-1):Z.sizeToDimension(t,i-1),p=s?Z.sizeFromDimension(a,i-1):Z.sizeFromDimension(t,i-1),f=Xh(r,s?l:e,n,d,p);return s?nr(r,f,c):f},Xh=(r,e,n,t,o)=>{let i=b1(r,e[0],t,o,[t]),s=r.run({...Gh,cacheHint:n.cacheKey,get:()=>i},e),a=y1(r,e[0],t,o,i.output.dims,[t]),u=r.run({...Uh,cacheHint:n.cacheKey,get:()=>a},[e[0],s]),l=_1(r,e[0],t,o,i.output.dims,a.output.dims);return[r.run({...Wh,cacheHint:n.cacheKey,get:()=>l},[e[0],s,u])]},b1=(r,e,n,t,o)=>{let[i,s]=r.calculateTextureWidthAndHeight(e.dims,0),a=o.length;if(n<1||t<1)throw new Error("Logical row count N and feature count D must be greater than or equal to 1");if(o.length!==1)throw new Error("Dimensionality of the output should be 1");if(o[0]!==n)throw new Error("Shape of the output should be equal to logical row count");let u=Y(r.session.backend.glContext.version),l=`
      float process(int[${a}] indices) {
        int logical_row_start_offset = indices[0] * ${t};

        float max = getColorAsFloat(${u.texture2D}(A, offsetToCoords(logical_row_start_offset, ${i},
        ${s} )));
        for(int i=1; i<${t}; ++i)
        {
          float current = getColorAsFloat(${u.texture2D}(A, offsetToCoords(logical_row_start_offset + i,
            ${i}, ${s})));
          if(current > max)
          max = current;
        }

        return max;
      }`;return{...Gh,output:{dims:o,type:e.type,textureType:0},shaderSource:l}},y1=(r,e,n,t,o,i)=>{let[s,a]=r.calculateTextureWidthAndHeight(e.dims,0),u=i.length;if(n<1||t<1)throw new Error("Logical row count N and feature count D must be greater than or equal to 1");if(i.length!==1)throw new Error("Dimensionality of the output should be 1");if(i[0]!==n)throw new Error("Shape of the output should be equal to logical row count");if(o.length!==1)throw new Error("Dimensionality of the intermediate results should be 1");if(o[0]!==n)throw new Error("Shape of the intermediate results should be equal to logical row count");let l=Y(r.session.backend.glContext.version),c=`
      float process(int[${u}] indices) {
        int logical_row_start_offset = indices[0] * ${t};

        float norm_factor = 0.0;
        float max = _Max(indices);
        for(int i=0; i<${t}; ++i)
        {
          norm_factor += exp(getColorAsFloat(${l.texture2D}(A, offsetToCoords(logical_row_start_offset + i,
            ${s}, ${a}))) - max);
        }

        return norm_factor;
      }`;return{...Uh,output:{dims:i,type:e.type,textureType:0},shaderSource:c}},_1=(r,e,n,t,o,i)=>{let[s,a]=r.calculateTextureWidthAndHeight(e.dims,0),u=e.dims.length;if(n<1||t<1)throw new Error("Logical row count N and feature count D must be greater than or equal to 1");if(o.length!==1||i.length!==1)throw new Error("Dimensionality of the intermediate results should be 1");if(o[0]!==n||i[0]!==n)throw new Error("Shape of the intermediate results should be equal to logical row count");let l=`
      float process(int[${u}] indices) {

      // get offset of current logical tensor index from the 2-D texture coordinates (TexCoords)
      int offset = coordsToOffset(TexCoords, ${s}, ${a});

      //determine the logical row for this index
      int logical_row_index[1];
      logical_row_index[0] = offset / ${t};

      float norm_factor = _Norm(logical_row_index);

      // avoid possible division by 0
      // if norm_facor is 0, all elements are zero
      // if so, return 0
      if(norm_factor == 0.0)
        return 0.0;

      return exp(_A(indices) - _Max(logical_row_index)) / norm_factor;
    }`;return{...Wh,output:{dims:e.dims,type:e.type,textureType:0},shaderSource:l}},Zh=r=>{if(!r||r.length!==1)throw new Error("Softmax requires 1 input.");if(r[0].type!=="float32"&&r[0].type!=="float64")throw new Error("Invalid input type")}});var Qh,Yh,em,w1,v1,x1,tm=A(()=>{"use strict";qe();xe();he();Qh={name:"Split",inputNames:["A"],inputTypes:[0]},Yh=(r,e,n)=>{x1(e);let t=Z.normalizeAxis(n.axis,e[0].dims.length),o=w1(r,e,t,n),i=[];for(let s=0;s<o;++s)i.push(r.run({...Qh,cacheHint:`${n.cacheKey};${s}`,get:()=>v1(r,e[0],n,t,s)},e));return i},em=r=>{let e=r.attributes.getInt("axis",0),n=r.attributes.getInts("split",[]),t=r.outputs.length;return de({axis:e,split:n,numOutputs:t})},w1=(r,e,n,t)=>{let[,o]=Hr.splitShape(e[0].dims,n,t.split,t.numOutputs);return o.length},v1=(r,e,n,t,o)=>{let[i,s]=Hr.splitShape(e.dims,t,n.split,n.numOutputs),a=s[o],u=i[o],c=`
      float process(int indices[${u.length}]) {
        indices[${t}] += ${a};
        return _A(indices);
      }
    `;return{...Qh,cacheHint:`${n.cacheKey}:${o}`,output:{dims:u,type:e.type,textureType:0},shaderSource:c}},x1=r=>{if(!r||r.length!==1)throw new Error("Split requires one input.");if(r[0].type!=="int8"&&r[0].type!=="uint8"&&r[0].type!=="int16"&&r[0].type!=="uint16"&&r[0].type!=="int32"&&r[0].type!=="uint32"&&r[0].type!=="float32"&&r[0].type!=="float64"&&r[0].type!=="bool")throw new Error("Invalid input type.")}});var ku,nm,rm,T1,I1,om=A(()=>{"use strict";xe();ku=(r,e,n)=>{T1(e);let t=Z.squeezeShape(e[0].dims,n);return[r.reshapeUnpacked(e[0],t)]},nm=(r,e)=>(I1(e),ku(r,[e[0]],Array.from(e[1].integerData))),rm=r=>r.attributes.getInts("axes"),T1=r=>{if(!r||r.length!==1)throw new Error("Squeeze requires 1 input.");if(r[0].type==="string")throw new Error("invalid input tensor types.")},I1=r=>{if(!r||r.length!==2)throw new Error("Squeeze requires 2 inputs.");if(r[1].type!=="int32")throw new Error("Invalid input type.")}});var im,S1,$1,sm=A(()=>{"use strict";Le();he();im=(r,e)=>{$1(e);let n={name:"Sum",inputNames:e.map((o,i)=>`X${i}`),inputTypes:new Array(e.length).fill(0)};return[r.run({...n,get:()=>S1(r,e,n)},e)]},S1=(r,e,n)=>{let t=Y(r.session.backend.glContext.version),o=e[0].dims.slice(),s=`
      void main() {
        vec4 result = ${e.map((a,u)=>`${t.texture2D}(X${u},TexCoords)`).join(" + ")};
        ${t.output} = result;
      }
    `;return{...n,output:{dims:o,type:e[0].type,textureType:0},hasMain:!0,shaderSource:s}},$1=r=>{if(!r||r.length===0)throw new Error("Sum requires inputs.");let e=r[0].dims.length;for(let n=1;n<r.length;n++){if(e!==r[n].dims.length)throw new Error("Input shapes are mismatched.");for(let t=0;t<e;t++)if(r[0].dims[t]!==r[n].dims[t])throw new Error("Input shapes are not matched.")}if(r[0].type!=="float32"&&r[0].type!=="float64")throw new Error("Invalid input type.");for(let n=1;n<r.length;n++)if(r[0].type!==r[n].type)throw new Error("Input types are not matched.")}});var am,A1,O1,um=A(()=>{"use strict";Jr();he();am=(r,e)=>{O1(e);let n={name:"Tile",inputNames:["A"],inputTypes:[0]};return[r.run({...n,get:()=>A1(r,e,n)},e)]},A1=(r,e,n)=>{let t=e[0].dims.slice(),o=new Array(t.length),i=[];for(let u=0;u<t.length;u++)o[u]=t[u]*e[1].numberData[u],i.push(`inputIdx[${u}] = int(mod(float(outputIdx[${u}]), ${t[u]}.));`);let s=o.length,a=`
      float process(int outputIdx[${s}]) {
        int inputIdx[${s}];
        ${i.join(`
`)}
        return _A(inputIdx);
      }
    `;return{...n,output:{dims:o,type:e[0].type,textureType:0},shaderSource:a}},O1=r=>{if(!r||r.length!==2)throw new Error("Tile requires 2 input.");if(r[1].dims.length!==1)throw new Error("The second input shape must 1 dimension.");if(r[1].dims[0]!==r[0].dims.length)throw new Error("Invalid input shape.");if(Rn.indexOf(r[0].type)===-1)throw new Error("Invalid input type.");if(r[1].type!=="int32"&&r[1].type!=="int16")throw new Error("Invalid repeat type.")}});var Lu,lm,cm,P1,E1,dm=A(()=>{"use strict";xe();Lu=(r,e,n)=>{P1(e);let t=Z.unsqueezeShape(e[0].dims,n);return[r.reshapeUnpacked(e[0],t)]},lm=(r,e)=>(E1(e),Lu(r,[e[0]],Array.from(e[1].integerData))),cm=r=>r.attributes.getInts("axes"),P1=r=>{if(!r||r.length!==1)throw new Error("Unsqueeze requires 1 input.");if(r[0].type==="string")throw new Error("invalid input tensor types.")},E1=r=>{if(!r||r.length!==2)throw new Error("Unsqueeze requires 2 inputs.");if(r[1].type!=="int32")throw new Error("Invalid input type.")}});var pm,fm=A(()=>{"use strict";xp();Np();Bp();Wp();Qo();Of();Lf();zf();Vf();Wf();jf();Jf();th();Yo();ih();yh();$h();Oh();Lh();Rh();Fh();Jh();tm();om();sm();um();ti();bu();dm();Pu();pm=[["Abs","","6+",Hp],["Acos","","7+",qp],["Add","","7+",Tp],["And","","7+",Ip],["Asin","","7+",jp],["Atan","","7+",Kp],["AveragePool","","7+",ah,uh],["BatchNormalization","","7+",wp,vp],["Cast","","6+",Rp,zp],["Ceil","","6+",Jp],["Clip","","6-10",mu,Xp],["Clip","","11+",Zp],["Concat","","4+",Fp,Up],["Conv","","1+",Tu,Iu],["ConvTranspose","","1+",$f,Af],["Cos","","7+",Qp],["Div","","7+",Sp],["Dropout","","7+",gu],["DepthToSpace","","1+",Cf,kf],["Equal","","7+",$p],["Elu","","6+",Yp,ef],["Exp","","6+",tf],["Flatten","","1+",Nf,Rf],["Floor","","6+",nf],["FusedConv","com.microsoft","1+",Tu,Iu],["Gather","","1+",Bf,Mf],["Gemm","","7-10",Su,Gf],["Gemm","","11+",Su,Uf],["GlobalAveragePool","","1+",ch,dh],["GlobalMaxPool","","1+",gh],["Greater","","7+",Ap],["Identity","","1+",gu],["ImageScaler","","1+",Hf,qf],["InstanceNormalization","","6+",Xf,Zf],["LeakyRelu","","6+",rf,of],["Less","","7+",Op],["LRN","","1+",Qf,Yf],["Log","","6+",sf],["MatMul","","1+",_f,wf],["MaxPool","","1+",ph,fh],["Mul","","7+",Pp],["Neg","","6+",af],["Not","","1+",uf],["Or","","7+",Ep],["Pad","","2-10",$u,nh],["Pad","","11+",rh,oh],["Pow","","7+",Dp],["PRelu","","7+",Cp],["ReduceLogSum","","1+",Ih,zn],["ReduceMax","","1+",vh,zn],["ReduceMean","","1+",wh,zn],["ReduceMin","","1+",xh,zn],["ReduceProd","","1+",Th,zn],["ReduceSum","","1-12",_h,zn],["ReduceSumSquare","","1+",Sh,zn],["Relu","","6+",lf],["Reshape","","5+",Ah],["Resize","","10",Du,Ch],["Resize","","11+",Du,kh],["Shape","","1+",Nh],["Sigmoid","","6+",cf],["Sin","","7+",df],["Slice","","10+",Vh],["Slice","","1-9",zh,Bh],["Softmax","","1-12",Hh,qh],["Softmax","","13+",Kh,jh],["Split","","2-12",Yh,em],["Sqrt","","6+",pf],["Squeeze","","1-12",ku,rm],["Squeeze","","13+",nm],["Sub","","7+",kp],["Sum","","6+",im],["Tan","","7+",ff],["Tanh","","6+",hf],["Tile","","6+",am],["Transpose","","1+",nr,Ef],["Upsample","","7-8",Au,Eh],["Upsample","","9",Au,Dh],["Unsqueeze","","1-12",Lu,cm],["Unsqueeze","","13+",lm],["Xor","","7+",Lp]]});function mm(r){let e={},n;for(;(n=hm.exec(r))!==null;){let t=n[3].split(",").map(o=>{let i=o.trim().split(" ");return i&&i.length===2?{type:i[0],name:i[1]}:null}).filter(o=>o!==null);e[n[2]]={params:t,body:n[4]}}for(let t in e){let o=D1.replace("__FUNC__",t),i=new RegExp(o,"gm");for(;(n=i.exec(r))!==null;){let s=n[1],a=n[2],u=n[3].split(","),l=s?`${s} ${a};`:"",c=e[t].body,d="";e[t].params.forEach((f,h)=>{f&&(d+=`${f.type} ${f.name} = ${u[h]};
`)}),c=`${d}
 ${c}`,c=c.replace("return",`${a} = `);let p=`
      ${l}
      {
        ${c}
      }
      `;r=r.replace(n[0],p)}}return r=r.replace(hm,""),r}var hm,D1,gm=A(()=>{"use strict";hm=/@inline[\s\n\r]+(\w+)[\s\n\r]+([0-9a-zA-Z_]+)\s*\(([^)]*)\)\s*{(([^}]|[\n\r])*)}/gm,D1="(\\w+)?\\s+([_0-9a-zA-Z]+)\\s+=\\s+__FUNC__\\((.*)\\)\\s*;"});function Ir(r,e){let n=[],t=[],o=e!=null&&Array.isArray(e)&&e.length===0,i=e==null||o?null:C1(e,r).sort(),s=0;for(let a=0;a<r.length;++a){if(i!=null){if(i[s]===a&&r[a]!==1)throw new Error(`Can't squeeze axis ${a} since its dim '${r[a]}' is not 1`);(i[s]==null||i[s]>a)&&r[a]===1&&(n.push(r[a]),t.push(a)),i[s]<=a&&s++}r[a]!==1&&(n.push(r[a]),t.push(a))}return{newShape:n,keptDims:t}}function C1(r,e){let n=e.length;return r=r==null?e.map((t,o)=>o):[].concat(r),yr(r.every(t=>t>=-n&&t<n),()=>`All values in axis param must be in range [-${n}, ${n}) but got axis ${r}`),yr(r.every(k1),()=>`All values in axis param must be integers but got axis ${r}`),r.map(t=>t<0?n+t:t)}function k1(r){return r%1===0}function L1(r){if(r.length===0)return 1;let e=r[0];for(let n=1;n<r.length;n++)e*=r[n];return e}function bm(r){let e=Math.ceil(Math.sqrt(r));return[e,Math.ceil(r/e)]}var ii,Nu=A(()=>{"use strict";dt();xe();ii=class{constructor(e){this.maxTextureSize=e}computeTextureWH(e,n){let t=this.computeTexture(e,n);return n&&n.isPacked&&(t[0]/=2,t[1]/=2),n&&n.reverseWH?[t[1],t[0]]:t}computeTexture(e,n){let t=n&&n.isPacked;if(e.length===0)return t?[2,2]:[1,1];let o=this.maxTextureSize;if(n&&n.breakAxis!==void 0){let a=n.breakAxis>=e.length?1:e.slice(n.breakAxis).reduce((l,c)=>l*c),u=n.breakAxis<=0?1:e.slice(0,n.breakAxis).reduce((l,c)=>l*c);if(a>o||u>o)Ie.verbose("TextureLayout",`Given width/height preferences were unattainable: shape:${e}, breakAxis:${n.breakAxis}`);else return[a,u]}let i=e.slice(0);t&&(o=o*2,i=i.map((a,u)=>u>=i.length-2?i[u]%2===0?i[u]:i[u]+1:i[u]),i.length===1&&(i=[2,i[0]])),i.length!==2&&(i=Ir(i).newShape);let s=L1(i);return i.length<=1&&s<=o?[1,s]:i.length===2&&i[0]<=o&&i[1]<=o?i:i.length===3&&i[0]*i[1]<=o&&i[2]<=o?[i[0]*i[1],i[2]]:i.length===3&&i[0]<=o&&i[1]*i[2]<=o?[i[0],i[1]*i[2]]:i.length===4&&i[0]*i[1]*i[2]<=o&&i[3]<=o?[i[0]*i[1]*i[2],i[3]]:i.length===4&&i[0]<=o&&i[1]*i[2]*i[3]<=o?[i[0],i[1]*i[2]*i[3]]:t?bm(s/4).map(a=>a*2):bm(s)}}});var si,ym=A(()=>{"use strict";xe();In();Le();Nu();dn();si=class extends _t{constructor(e){super(e)}getFunctions(){return{...this.offsetToCoords(),...this.coordsToOffset(),...this.toVec(),...this.valueFrom(),...this.getCommonUtilFuncs(),...this.getInputsSamplingSnippets(),...this.getOutputSamplingSnippet()}}getCustomTypes(){return{}}offsetToCoords(){let e="offsetToCoords";return{offsetToCoords:new H(`
      vec2 ${e}(int offset, int width, int height) {
        int t = offset / width;
        int s = offset - t*width;
        vec2 coords = (vec2(s,t) + vec2(0.5,0.5)) / vec2(width, height);
        return coords;
      }
      `)}}coordsToOffset(){let e="coordsToOffset";return{coordsToOffset:new H(`
      int ${e}(vec2 coords, int width, int height) {
        float s = coords.s * float(width);
        float t = coords.t * float(height);
        int offset = int(t) * width + int(s);
        return offset;
      }
      `)}}getOutputSamplingSnippet(){let e=this.context.outputTextureLayout;return e.isPacked?this.getPackedOutputSamplingSnippet(e):this.getUnpackedOutputSamplingSnippet(e)}getPackedOutputSamplingSnippet(e){let n=e.unpackedShape,t=[e.width,e.height],o={},i="getOutputCoords";switch(n.length){case 0:o[i]=this.getOutputScalarCoords();break;case 1:o[i]=this.getOutputPacked1DCoords(n,t);break;case 2:o[i]=this.getOutputPacked2DCoords(n,t);break;case 3:o[i]=this.getOutputPacked3DCoords(n,t);break;default:o[i]=this.getOutputPackedNDCoords(n,t)}let a=`
      void setOutput(vec4 val) {
        ${Y(this.context.glContext.version).output} = val;
      }
    `,u="floatTextureSetRGBA";return o[u]=new H(a),o}getUnpackedOutputSamplingSnippet(e){let n=e.unpackedShape,t=[e.width,e.height],o={},i="getOutputCoords";switch(n.length){case 0:o[i]=this.getOutputScalarCoords();break;case 1:o[i]=this.getOutputUnpacked1DCoords(n,t);break;case 2:o[i]=this.getOutputUnpacked2DCoords(n,t);break;case 3:o[i]=this.getOutputUnpacked3DCoords(n,t);break;case 4:o[i]=this.getOutputUnpacked4DCoords(n,t);break;case 5:o[i]=this.getOutputUnpacked5DCoords(n,t);break;case 6:o[i]=this.getOutputUnpacked6DCoords(n,t);break;default:throw new Error(`Unsupported output dimensionality: ${n.length}`)}let a=`
        void setOutput(float val) {
          ${Y(this.context.glContext.version).output} = vec4(val, 0, 0, 0);
        }
    `,u="floatTextureSetR";return o[u]=new H(a),o}getOutputScalarCoords(){return new H(`
      int getOutputCoords() {
        return 0;
      }
    `)}getOutputPacked1DCoords(e,n){let t=n,o="";return t[0]===1?(o=`
          int getOutputCoords() {
            return 2 * int(TexCoords.y * ${t[1]}.0);
          }
        `,new H(o)):t[1]===1?(o=`
          int getOutputCoords() {
            return 2 * int(TexCoords.x * ${t[0]}.0);
          }
        `,new H(o)):(o=`
        int getOutputCoords() {
          ivec2 resTexRC = ivec2(TexCoords.xy *
                                 vec2(${t[0]}, ${t[1]}));
          return 2 * (resTexRC.y * ${t[0]} + resTexRC.x);
        }
      `,new H(o))}getOutputPacked2DCoords(e,n){let t="";if(Xn.arraysEqual(e,n))return t=`
        ivec2 getOutputCoords() {
          return 2 * ivec2(TexCoords.xy * vec2(${n[0]}, ${n[1]}));
        }
      `,new H(t);let o=n,i=Math.ceil(e[1]/2);return t=`
        ivec2 getOutputCoords() {
          ivec2 resTexRC = ivec2(TexCoords.xy *
                                vec2(${o[0]}, ${o[1]}));

          int index = resTexRC.y * ${o[0]} + resTexRC.x;

          // reverse r and c order for packed texture
          int r = imod(index, ${i}) * 2;
          int c = 2 * (index / ${i});

          return ivec2(r, c);
        }
      `,new H(t)}getOutputPacked3DCoords(e,n){let t=[n[0],n[1]],o=Math.ceil(e[2]/2),i=o*Math.ceil(e[1]/2),s=`
        ivec3 getOutputCoords() {
          ivec2 resTexRC = ivec2(TexCoords.xy *
                                vec2(${t[0]}, ${t[1]}));
          int index = resTexRC.y * ${t[0]} + resTexRC.x;

          int b = index / ${i};
          index -= b * ${i};

          // reverse r and c order for packed texture
          int r = imod(index, ${o}) * 2;
          int c = 2 * (index / ${o});

          return ivec3(b, r, c);
        }
      `;return new H(s)}getOutputPackedNDCoords(e,n){let t=[n[0],n[1]],o=Math.ceil(e[e.length-1]/2),i=o*Math.ceil(e[e.length-2]/2),s=i,a="",u="b, r, c";for(let c=2;c<e.length-1;c++)s*=e[e.length-c-1],a=`
      int b${c} = index / ${s};
      index -= b${c} * ${s};
    `+a,u=`b${c}, `+u;let l=`
      ivec${e.length} getOutputCoords() {
        ivec2 resTexRC = ivec2(TexCoords.xy *
                              vec2(${t[0]}, ${t[1]}));
        int index = resTexRC.y * ${t[0]} + resTexRC.x;

        ${a}

        int b = index / ${i};
        index -= b * ${i};

        // reverse r and c order for packed texture
        int r = imod(index, ${o}) * 2;
        int c = 2 * (index / ${o});

        return ivec${e.length}(${u});
      }
    `;return new H(l)}getOutputUnpacked1DCoords(e,n){let t=`
        int getOutputCoords() {
          ivec2 resTexRC = ivec2(TexCoords.xy *
                                vec2(${n[0]}, ${n[1]}));
          return resTexRC.y * ${n[0]} + resTexRC.x;
        }
      `;return new H(t)}getOutputUnpacked2DCoords(e,n){let t=`
        ivec2 getOutputCoords() {
          ivec2 resTexRC = ivec2(TexCoords.xy *
                                vec2(${n[0]}, ${n[1]}));
          int index = resTexRC.y * ${n[0]} + resTexRC.x;
          int r = index / ${e[1]};
          int c = index - r * ${e[1]};
          return ivec2(r, c);
        }
      `;return new H(t)}getOutputUnpacked3DCoords(e,n){let t="",o=e.length,i=null;o<2&&(i=[]),i=new Array(o-1),i[o-2]=e[o-1];for(let u=o-3;u>=0;--u)i[u]=i[u+1]*e[u+1];let s=["r","c","d"],a=i.map((u,l)=>{let c=`int ${s[l]} = index / ${u}`,d=l===i.length-1?`int ${s[l+1]} = index - ${s[l]} * ${u}`:`index -= ${s[l]} * ${u}`;return`${c}; ${d};`}).join("");return t=`
        ivec3 getOutputCoords() {
          ivec2 resTexRC = ivec2(TexCoords.xy *
                                vec2(${n[0]}, ${n[1]}));
          int index = resTexRC.y * ${n[0]} + resTexRC.x;
          ${a}
          return ivec3(r, c, d);
        }
      `,new H(t)}getOutputUnpacked4DCoords(e,n){let t="",o=e.length,i=null;o<2&&(i=[]),i=new Array(o-1),i[o-2]=e[o-1];for(let u=o-3;u>=0;--u)i[u]=i[u+1]*e[u+1];let s=["r","c","d","d2"],a=i.map((u,l)=>{let c=`int ${s[l]} = index / ${u}`,d=l===i.length-1?`int ${s[l+1]} = index - ${s[l]} * ${u}`:`index -= ${s[l]} * ${u}`;return`${c}; ${d};`}).join("");return t=`
      ivec4 getOutputCoords() {
          ivec2 resTexRC = ivec2(TexCoords.xy *
                                vec2(${n[0]}, ${n[1]}));
          int index = resTexRC.y * ${n[0]} + resTexRC.x;
          ${a}
          return ivec4(r, c, d, d2);
        }
      `,new H(t)}getOutputUnpacked5DCoords(e,n){let t="",o=e.length,i=null;o<2&&(i=[]),i=new Array(o-1),i[o-2]=e[o-1];for(let u=o-3;u>=0;--u)i[u]=i[u+1]*e[u+1];let s=["r","c","d","d2","d3"],a=i.map((u,l)=>{let c=`int ${s[l]} = index / ${u}`,d=l===i.length-1?`int ${s[l+1]} = index - ${s[l]} * ${u}`:`index -= ${s[l]} * ${u}`;return`${c}; ${d};`}).join("");return t=`
      ivec5 getOutputCoords() {
          ivec2 resTexRC = ivec2(TexCoords.xy *
                                vec2(${n[0]}, ${n[1]}));
          int index = resTexRC.y * ${n[0]} + resTexRC.x;
          ${a}
          return ivec5(r, c, d, d2, d3);
        }
      `,new H(t)}getOutputUnpacked6DCoords(e,n){let t="",o=e.length,i=null;o<2&&(i=[]),i=new Array(o-1),i[o-2]=e[o-1];for(let u=o-3;u>=0;--u)i[u]=i[u+1]*e[u+1];let s=["r","c","d","d2","d3","d4"],a=i.map((u,l)=>{let c=`int ${s[l]} = index / ${u}`,d=l===i.length-1?`int ${s[l+1]} = index - ${s[l]} * ${u}`:`index -= ${s[l]} * ${u}`;return`${c}; ${d};`}).join("");return t=`
     ivec6 getOutputCoords() {
         ivec2 resTexRC = ivec2(TexCoords.xy *
                               vec2(${n[0]}, ${n[1]}));
         int index = resTexRC.y * ${n[0]} + resTexRC.x;
         ${a}
         return ivec6(r, c, d, d2, d3, d4);
       }
     `,new H(t)}getCommonUtilFuncs(){let e={},n="uvFromFlat";e[n]=new H(`
    vec2 uvFromFlat(int texNumR, int texNumC, int index) {
      int texC = index / texNumR;
      int texR = index - texC * texNumR;
      // TODO: swap texR, texC order in following function so row is corresponding to u and column is corresponding to
      //       v.
      return (vec2(texR, texC) + halfCR) / vec2(texNumR, texNumC);
    }
    `),n="packedUVfrom1D",e[n]=new H(`
      vec2 packedUVfrom1D(int texNumR, int texNumC, int index) {
        int texelIndex = index / 2;
        int texR = texelIndex / texNumC;
        int texC = texelIndex - texR * texNumC;
        return (vec2(texC, texR) + halfCR) / vec2(texNumC, texNumR);
      }
      `),n="packedUVfrom2D",e[n]=new H(`
      vec2 packedUVfrom2D(int texNumR, int texNumC, int texelsInLogicalRow, int row, int col) {
        int texelIndex = (row / 2) * texelsInLogicalRow + (col / 2);
        int texR = texelIndex / texNumC;
        int texC = texelIndex - texR * texNumC;
        return (vec2(texC, texR) + halfCR) / vec2(texNumC, texNumR);
      }
      `),n="packedUVfrom3D",e[n]=new H(`
      vec2 packedUVfrom3D(int texNumR, int texNumC,
          int texelsInBatch, int texelsInLogicalRow, int b,
          int row, int col) {
        int index = b * texelsInBatch + (row / 2) * texelsInLogicalRow + (col / 2);
        int texR = index / texNumC;
        int texC = index - texR * texNumC;
        return (vec2(texC, texR) + halfCR) / vec2(texNumC, texNumR);
      }
      `),n="sampleTexture";let t=Y(this.context.glContext.version);return e[n]=new H(`
        float sampleTexture(sampler2D textureSampler, vec2 uv) {
            return ${t.texture2D}(textureSampler, uv).r;
        }`),e}getInputsSamplingSnippets(){let e={},n=this.context.outputTextureLayout;return this.context.programInfo.inputNames.forEach((t,o)=>{let i=this.context.inputTextureLayouts[o],s=Ho(t);i.isPacked?e[s]=this.getPackedSamplerFromInput(s,t,i):e[s]=this.getUnpackedSamplerFromInput(s,t,i);let a=op(t);i.unpackedShape.length<=n.unpackedShape.length&&(i.isPacked?e[a]=this.getPackedSamplerAtOutputCoords(a,i,n,t):e[a]=this.getUnpackedSamplerAtOutputCoords(a,i,n,t))}),e}getPackedSamplerAtOutputCoords(e,n,t,o){let i=n.unpackedShape,s=t.unpackedShape,u=Ho(o),l=i.length,c=s.length,d=Qe.getBroadcastDims(i,s),p=Ye(c),f=c-l,h,m=$t();l===0?h="":c<2&&d.length>=1?h="coords = 0;":h=d.map(E=>`coords.${m[E+f]} = 0;`).join(`
`);let y="";c<2&&l>0?y="coords":y=i.map((E,N)=>`coords.${m[N+f]}`).join(", ");let g="return outputValue;",_=Z.size(i)===1,T=Z.size(s)===1;if(l===1&&!_&&!T)g=`
        return vec4(outputValue.xy, outputValue.xy);
      `;else if(_&&!T)c===1?g=`
          return vec4(outputValue.x, outputValue.x, 0., 0.);
        `:g=`
          return vec4(outputValue.x);
        `;else if(d.length){let E=l-2,N=l-1;d.indexOf(E)>-1&&d.indexOf(N)>-1?g="return vec4(outputValue.x);":d.indexOf(E)>-1?g="return vec4(outputValue.x, outputValue.y, outputValue.x, outputValue.y);":d.indexOf(N)>-1&&(g="return vec4(outputValue.xx, outputValue.zz);")}let S=`
        int lastDim = coords.${m[c-1]};
        coords.${m[c-1]} = coords.${m[c-2]};
        coords.${m[c-2]} = lastDim;
      `,P=`
      vec4 ${e}() {
        ${p} coords = getOutputCoords();
        ${S}
        ${h}
        vec4 outputValue = ${u}(${y});
        ${g}
      }
    `;return new H(P,["coordinates.getOutputCoords"])}getUnpackedSamplerAtOutputCoords(e,n,t,o){let i=[t.width,t.height],s=[n.width,n.height],a=n.unpackedShape.length,u=t.unpackedShape.length,l=n.unpackedShape,c=t.unpackedShape,d=Ho(o);if(a===u&&Xn.arraysEqual(s,i)){let _=`
          float ${e}() {
            return sampleTexture(${o}, TexCoords);
          }
        `;return new H(_,["coordinates.sampleTexture"])}let p=Ye(u),f=Qe.getBroadcastDims(l,c),h=u-a,m,y=$t();a===0?m="":u<2&&f.length>=1?m="coords = 0;":m=f.map(_=>`coords.${y[_+h]} = 0;`).join(`
`);let g="";u<2&&a>0?g="coords":g=n.unpackedShape.map((_,x)=>`coords.${y[x+h]}`).join(", ");let b=`
        float ${e}() {
          ${p} coords = getOutputCoords();
          ${m}
          return ${d}(${g});
        }
      `;return new H(b,["coordinates.getOutputCoords"])}getPackedSamplerFromInput(e,n,t){switch(t.unpackedShape.length){case 0:return this.getPackedSamplerScalar(e,n);case 1:return this.getPackedSampler1D(e,n,t);case 2:return this.getPackedSampler2D(e,n,t);case 3:return this.getPackedSampler3D(e,n,t);default:return this.getPackedSamplerND(e,n,t)}}getUnpackedSamplerFromInput(e,n,t){let o=t.unpackedShape;switch(o.length){case 0:return this.getUnpackedSamplerScalar(e,n,t);case 1:return this.getUnpackedSampler1D(e,n,t);case 2:return this.getUnpackedSampler2D(e,n,t);case 3:return this.getUnpackedSampler3D(e,n,t);case 4:return this.getUnpackedSampler4D(e,n,t);case 5:return this.getUnpackedSampler5D(e,n,t);case 6:return this.getUnpackedSampler6D(e,n,t);default:throw new Error(`Unsupported dimension ${o.length}-D`)}}getPackedSamplerScalar(e,n){let t=Y(this.context.glContext.version),o=`
          vec4 ${e}() {
            return ${t.texture2D}(${n}, halfCR);
          }
        `;return new H(o)}getPackedSampler1D(e,n,t){let o=[t.width,t.height],i=[o[1],o[0]],s=Y(this.context.glContext.version),u=`vec4 ${e}(int index) {
      vec2 uv = packedUVfrom1D(
      ${i[0]}, ${i[1]}, index);
      return ${s.texture2D}(${n}, uv);
    }`;return new H(u,["coordinates.packedUVfrom1D"])}getPackedSampler2D(e,n,t){let o=t.unpackedShape,i=[t.width,t.height],s=Y(this.context.glContext.version),a=i[0],u=i[1];if(i!=null&&Xn.arraysEqual(o,i)){let f=`vec4 ${e}(int row, int col) {
        vec2 uv = (vec2(col, row) + halfCR) / vec2(${u}.0, ${a}.0);
        return ${s.texture2D}(${n}, uv);
      }`;return new H(f)}let l=i,c=Math.ceil(o[1]/2),p=`vec4 ${e}(int row, int col) {
      vec2 uv = packedUVfrom2D(${l[1]}, ${l[0]}, ${c}, row, col);
      return ${s.texture2D}(${n}, uv);
    }`;return new H(p,["coordinates.packedUVfrom2D"])}getPackedSampler3D(e,n,t){let o=t.unpackedShape,i=[t.width,t.height],s=[i[0],i[1]],a=Y(this.context.glContext.version);if(o[0]===1){let h=o.slice(1),m=[1,2],y=_r(o,h),g=["b","row","col"],b=JSON.parse(JSON.stringify(t));b.unpackedShape=y;let _=this.getPackedSamplerFromInput(e,n,b),T=`${_.routineBody}
      vec4 ${e}(int b, int row, int col) {
        return ${e}(${wr(g,m)});
      } `;return new H(T,_.dependencies)}let u=s[0],l=s[1],c=Math.ceil(o[2]/2),d=c*Math.ceil(o[1]/2),f=`vec4 ${e}(int b, int row, int col) {
      vec2 uv = packedUVfrom3D(
        ${l}, ${u}, ${d}, ${c}, b, row, col);
      return ${a.texture2D}(${n}, uv);}`;return new H(f,["coordinates.packedUVfrom3D"])}getPackedSamplerND(e,n,t){let o=t.unpackedShape,i=o.length,s=[t.width,t.height],a=Y(this.context.glContext.version),u=[s[0],s[1]],l=u[1],c=u[0],d=Math.ceil(o[i-1]/2),p=d*Math.ceil(o[i-2]/2),f="int b, int row, int col",h=`b * ${p} + (row / 2) * ${d} + (col / 2)`;for(let g=2;g<i-1;g++)f=`int b${g}, `+f,p*=o[i-g-1],h=`b${g} * ${p} + `+h;let y=`vec4 ${e}(${f}) {
      int index = ${h};
      int texR = index / ${c};
      int texC = index - texR * ${c};
      vec2 uv = (vec2(texC, texR) + halfCR) / vec2(${c}, ${l});
      return ${a.texture2D}(${n}, uv);
    }`;return new H(y)}getUnpackedSamplerScalar(e,n,t){let[o,i]=[t.width,t.height];if(o===1&&i===1){let a=`
          float ${e}() {
            return sampleTexture(${n}, halfCR);
          }
        `;return new H(a,["coordinates.sampleTexture"])}let s=`
        float ${e}() {
          int offset_${n} = coordsToOffset(TexCoords, ${o}, ${i});
          vec2 uv = uvFromFlat(${o}, ${i}, offset_${n});
          return sampleTexture(${n}, uv);
        }
      `;return new H(s,["coordinates.uvFromFlat","coordinates.sampleTexture","coordinates.coordsToOffset"])}getUnpackedSampler1D(e,n,t){let o=t.width,i=t.height;if(i===1&&o===1){let a=`
        float ${e}(int index) {
          return sampleTexture(${n}, halfCR);
        }
      `;return new H(a,["coordinates.sampleTexture"])}if(i===1){let a=`
          float ${e}(int index) {
            vec2 uv = vec2((float(index) + 0.5) / ${o}.0, 0.5);
            return sampleTexture(${n}, uv);
          }
        `;return new H(a,["coordinates.sampleTexture"])}if(o===1){let a=`
          float ${e}(int index) {
            vec2 uv = vec2(0.5, (float(index) + 0.5) / ${i}.0);
            return sampleTexture(${n}, uv);
          }
        `;return new H(a,["coordinates.sampleTexture"])}let s=`
        float ${e}(int index) {
          vec2 uv = uvFromFlat(${o}, ${i}, index);
          return sampleTexture(${n}, uv);
        }
      `;return new H(s,["coordinates.uvFromFlat","coordinates.sampleTexture"])}getUnpackedSampler2D(e,n,t){let o=t.unpackedShape,i=[t.height,t.width];if(i!=null&&Xn.arraysEqual(o,i)){let p=i[1],f=i[0],h=`
          float ${e}(int row, int col) {
            vec2 uv = (vec2(row, col) + halfCR) / vec2(${p}.0, ${f}.0);
            return sampleTexture(${n}, uv);
          }
        `;return new H(h,["coordinates.sampleTexture"])}let{newShape:s,keptDims:a}=Ir(o),u=s;if(u.length<o.length){let p=_r(o,u),f=JSON.parse(JSON.stringify(t));f.unpackedShape=p;let h=["col","row"],m=`
          ${this.getUnpackedSamplerFromInput(e,n,f).routineBody}
          float ${e}(int row, int col) {
            return ${e}(${wr(h,a)});
          }
        `;return new H(m,["coordinates.sampleTexture"])}let l=i[1],c=i[0];if(c===1){let p=`
          float ${e}(int row, int col) {
            int offset_${n} = coordsToOffset(TexCoords, ${l}, ${c});
            float index = dot(vec3(row, col, offset_${n}), vec3(${o[1]}, 1, 1));
            vec2 uv = vec2(0.5, (index + 0.5) / ${l}.0);
            return sampleTexture(${n}, uv);
          }
        `;return new H(p,["coordinates.sampleTexture","coordinates.coordsToOffset"])}if(l===1){let p=`
          float ${e}(int row, int col) {
            int offset_${n} = coordsToOffset(TexCoords, ${l}, ${c});
            float index = dot(vec3(row, col, offset_${n}), vec3(${o[1]}, 1, 1));
            vec2 uv = vec2((index + 0.5) / ${c}.0, 0.5);
            return sampleTexture(${n}, uv);
          }
        `;return new H(p,["coordinates.sampleTexture","coordinates.coordsToOffset"])}let d=`
        float ${e}(int row, int col) {
          int index = col * ${o[1]} + row;
          vec2 uv = uvFromFlat(${l}, ${c}, index);
          return sampleTexture(${n}, uv);
        }
      `;return new H(d,["coordinates.uvFromFlat","coordinates.sampleTexture","coordinates.coordsToOffset"])}getUnpackedSampler3D(e,n,t){let o=t.unpackedShape,i=o[1]*o[2],s=o[2],{newShape:a,keptDims:u}=Ir(o),l=a;if(l.length<o.length){let f=_r(o,l),h=["batch","col","row"],m=JSON.parse(JSON.stringify(t));m.unpackedShape=f;let y=this.getUnpackedSamplerFromInput(e,n,m),g=u.reverse(),b=`
          ${y.routineBody}
          float ${e}(int batch, int row, int col) {
            return ${e}(${wr(h,g)});
          }
        `;return new H(b,y.dependencies)}let c=t.width,d=t.height,p=`
          float ${e}(int depth, int row, int col) {
            // Explicitly use integer operations as dot() only works on floats.
            int index = depth * ${i} + col * ${s} + row;
            vec2 uv = uvFromFlat(${c}, ${d}, index);
            return sampleTexture(${n}, uv);
          }
      `;return new H(p,["coordinates.uvFromFlat","coordinates.sampleTexture","coordinates.coordsToOffset"])}getUnpackedSampler4D(e,n,t){let o=t.unpackedShape,i=o[3],s=o[2]*i,a=o[1]*s,u=t.width,l=t.height,c=`
        float ${e}(int row, int col, int depth, int depth2) {
          int index = row * ${a} + col * ${s} +
              depth2 * ${i} + depth;
          vec2 uv = uvFromFlat(${u}, ${l}, index);
          return sampleTexture(${n}, uv);
        }
      `;return new H(c,["coordinates.uvFromFlat","coordinates.sampleTexture"])}getUnpackedSampler5D(e,n,t){let o=t.unpackedShape,i=o[4],s=o[3]*i,a=o[2]*s,u=o[1]*a,{newShape:l,keptDims:c}=Ir(o);if(l.length<o.length){let h=_r(o,l),m=["row","col","depth","depth2","depth3"],y=JSON.parse(JSON.stringify(t));y.unpackedShape=h;let g=`
          ${this.getUnpackedSamplerFromInput(e,n,y).routineBody}
          float ${e}(int row, int col, int depth, int depth2, int depth3) {
            return ${e}(${wr(m,c)});
          }
        `;return new H(g,["coordinates.sampleTexture","coordinates.uvFromFlat"])}let d=t.width,p=t.height,f=`
        float ${e}(int row, int col, int depth, int depth2, int depth3) {
          int index = row * ${u} + col * ${a} + depth * ${s} +
          depth3 * ${i} + depth2;
          vec2 uv = uvFromFlat(${d}, ${p}, index);
          return sampleTexture(${n}, uv);
        }
      `;return new H(f,["coordinates.sampleTexture","coordinates.uvFromFlat"])}getUnpackedSampler6D(e,n,t){let o=t.unpackedShape,i=o[5],s=o[4]*i,a=o[3]*s,u=o[2]*a,l=o[1]*u,{newShape:c,keptDims:d}=Ir(o);if(c.length<o.length){let m=_r(o,c),y=["row","col","depth","depth2","depth3","depth4"],g=JSON.parse(JSON.stringify(t));g.unpackedShape=m;let b=`
            ${this.getUnpackedSamplerFromInput(e,n,g).routineBody}
            float ${e}(int row, int col, int depth,
              int depth2, int depth3, int depth4) {
              return ${e}(${wr(y,d)});
            }
          `;return new H(b,["coordinates.sampleTexture","coordinates.uvFromFlat"])}let p=t.width,f=t.height,h=`
          float ${e}(int row, int col, int depth,
            int depth2, int depth3, int depth4) {
            int index = row * ${l} + col * ${u} + depth * ${a} +
            depth2 * ${s} + depth3 * ${i} + depth4;
            vec2 uv = uvFromFlat(${p}, ${f}, index);
            return sampleTexture(${n}, uv);
          }
        `;return new H(h,["coordinates.uvFromFlat","coordinates.sampleTexture","coordinates.coordsToOffset"])}toVec(){let e=this.context.outputTextureLayout,n=e.shape.length,t=e.strides,o=e.width,i=e.height,s=[];for(let u=0;u<n-1;++u)s.push(`
        c[${u}] = offset / ${t[u]};`),s.push(`
        offset -= c[${u}] * ${t[u]};`);s.push(`
        c[${n-1}] = offset;`);let a=`
      void toVec(vec2 texCoords, out int c[${n}]) {
        int offset = coordsToOffset(texCoords, ${o}, ${i});
        ${s.join("")}
      }
      void toVec(int offset, out int c[${n}]) {
        ${s.join("")}
      }
    `;return{toVec:new H(a,["coordinates.coordsToOffset"])}}valueFrom(){let e={};return this.context.programInfo.inputNames.forEach((n,t)=>{let o=this.context.inputTextureLayouts[t],s=(o.unpackedShape.length>0?o.unpackedShape:o.shape).length,a=`_${n}`;e[a]=new H(this.getValueFromSingle(n,s,o.width,o.height,!1),[`shapeUtils.indicesToOffset${a}`,"coordinates.offsetToCoords","fragcolor.getColorAsFloat"]),a=a+"_T",e[a]=new H(this.getValueFromSingle(n,s,o.width,o.height,!0),[`shapeUtils.indicesToOffset${a}`,"coordinates.offsetToCoords","fragcolor.getColorAsFloat"])}),e}getValueFromSingle(e,n,t,o,i){let s=`_${e}`;i&&(s=s+"_T");let a=Y(this.context.glContext.version);return`
        float ${s}(int m[${n}]) {
          int offset = indicesToOffset${s}(m);
          vec2 coords = offsetToCoords(offset, ${t}, ${o});
          float value = getColorAsFloat(${a.texture2D}(${e}, coords));
          return value;
        }
        `}getPackedValueFrom(e,n,t,o,i){let s=`_${e}_Pack`;i&&(s=s+"_T");let a=Y(this.context.glContext.version);return`
        vec4 ${s}(int m[${n}]) {
          int offset = indicesToOffset_${e}(m);
          vec2 coords = offsetToCoords(offset, ${t}, ${o});
          return ${a.texture2D}(${e}, coords);
        }
        `}}});var ai,_m=A(()=>{"use strict";In();ai=class r extends _t{constructor(e){super(e)}getFunctions(){return{...this.encodeFloat32(),...this.decodeFloat32()}}getCustomTypes(){return{}}encodeFloat32(){return{encode:new H(`highp vec4 encode(highp float f) {
        return vec4(f, 0.0, 0.0, 0.0);
      }
        `)}}decodeFloat32(){return{decode:new H(`highp float decode(highp vec4 rgba) {
        return rgba.r;
      }
        `)}}encodeUint8(){let e=r.isLittleEndian()?"rgba.rgba=rgba.abgr;":"";return{encode:new H(`
      highp vec4 encode(highp float f) {
        highp float F = abs(f);
        highp float Sign = step(0.0,-f);
        highp float Exponent = floor(log2(F));
        highp float Mantissa = (exp2(- Exponent) * F);
        Exponent = floor(log2(F) + 127.0) + floor(log2(Mantissa));
        highp vec4 rgba;
        rgba[0] = 128.0 * Sign  + floor(Exponent*exp2(-1.0));
        rgba[1] = 128.0 * mod(Exponent,2.0) + mod(floor(Mantissa*128.0),128.0);
        rgba[2] = floor(mod(floor(Mantissa*exp2(23.0 -8.0)),exp2(8.0)));
        rgba[3] = floor(exp2(23.0)*mod(Mantissa,exp2(-15.0)));
        ${e}
        rgba = rgba / 255.0; // values need to be normalized to [0,1]
        return rgba;
    }
        `)}}decodeUint8(){let e=r.isLittleEndian()?"rgba.rgba=rgba.abgr;":"";return{decode:new H(`
        highp float decode(highp vec4 rgba) {
          rgba = rgba * 255.0; // values need to be de-normalized from [0,1] to [0,255]
          ${e}
          highp float Sign = 1.0 - step(128.0,rgba[0])*2.0;
          highp float Exponent = 2.0 * mod(rgba[0],128.0) + step(128.0,rgba[1]) - 127.0;
          highp float Mantissa = mod(rgba[1],128.0)*65536.0 + rgba[2]*256.0 +rgba[3] + float(0x800000);
          highp float Result =  Sign * exp2(Exponent) * (Mantissa * exp2(-23.0 ));
          return Result;
      }
        `)}}static isLittleEndian(){let e=new ArrayBuffer(4),n=new Uint32Array(e),t=new Uint8Array(e);if(n[0]=3735928559,t[0]===239)return!0;if(t[0]===222)return!1;throw new Error("unknown endianness")}}});var ui,wm=A(()=>{"use strict";In();Le();ui=class extends _t{constructor(e){super(e)}getFunctions(){return{...this.setFragColor(),...this.getColorAsFloat()}}getCustomTypes(){return{}}setFragColor(){let e=Y(this.context.glContext.version);return{setFragColor:new H(`
        void setFragColor(float value) {
            ${e.output} = encode(value);
        }
        `,["encoding.encode"])}}getColorAsFloat(){return{getColorAsFloat:new H(`
        float getColorAsFloat(vec4 color) {
            return decode(color);
        }
        `,["encoding.decode"])}}}});var li,vm=A(()=>{"use strict";In();li=class r extends _t{constructor(e){super(e)}getFunctions(){return{...this.bcastIndex(),...this.bcastMatmulIndex(),...this.offsetToIndices(),...this.indicesToOffset(),...this.incrementIndices()}}getCustomTypes(){return{}}bcastIndex(){let e=this.context.outputTextureLayout.shape.length,n={};return this.context.programInfo.inputNames.forEach((t,o)=>{let i=this.context.inputTextureLayouts[o].unpackedShape;if(i.length<=e){let s=i.length,a=e-s,u=`bcastIndices_${t}`,l="";for(let d=0;d<s;++d)l+=`
          realIndices[${d}] = int( mod(float(bcastedIndices[${a+d}]), ${i[d]}.0) );
          `;let c=`
        void ${u} (int bcastedIndices[${e}], out int realIndices[${s}]) {
          ${l}
        }
        `;n[u]=new H(c)}}),n}bcastMatmulIndex(){let e=this.context.outputTextureLayout.shape.length,n={};return this.context.programInfo.inputNames.forEach((t,o)=>{let i=this.context.inputTextureLayouts[o].shape;if(!(i.length<2||i.length>e)){let s=i.length,a=e-s,u=`bcastMatmulIndices_${t}`,l="";for(let d=0;d<s-2;++d)l+=`
          realIndices[${d}] = int( mod(float(bcastedIndices[${a+d}]), ${i[d]}.0) );
          `;let c=`
        void ${u}(int bcastedIndices[${e}], out int realIndices[${s}]) {
          ${l}
          realIndices[${s-1}] = bcastedIndices[${e-1}];
          realIndices[${s-2}] = bcastedIndices[${e-2}];
        }
        `;n[u]=new H(c)}}),n}indicesToOffset(){let e={};return this.context.programInfo.inputNames.forEach((n,t)=>{let o=this.context.inputTextureLayouts[t].shape,i=this.context.inputTextureLayouts[t].strides,s=o.length,a=`indicesToOffset_${n}`;e[a]=new H(r.indexToOffsetSingle(a,s,i)),a=`indicesToOffset_${n}_T`,e[a]=new H(r.indexToOffsetSingle(a,s,i.slice().reverse()))}),e}static indexToOffsetSingle(e,n,t){let o="";for(let i=n-1;i>=0;--i)o+=`
        offset += indices[${i}] * ${t[i]};
        `;return`
      int ${e}(int indices[${n}]) {
        int offset = 0;
        ${o}
        return offset;
      }
      `}offsetToIndices(){let e={};return this.context.programInfo.inputNames.forEach((n,t)=>{let o=this.context.inputTextureLayouts[t].shape,i=this.context.inputTextureLayouts[t].strides,s=o.length,a=`offsetToIndices_${n}`;e[a]=new H(r.offsetToIndicesSingle(a,s,i)),a=`offsetToIndices_${n}_T`,e[a]=new H(r.offsetToIndicesSingle(a,s,i.slice().reverse()))}),e}static offsetToIndicesSingle(e,n,t){let o=[];for(let i=0;i<n-1;++i)o.push(`
      indices[${i}] = offset / ${t[i]};`),o.push(`
        offset -= indices[${i}] * ${t[i]};`);return o.push(`
      indices[${n-1}] = offset;`),`
      void ${e}(int offset, out int indices[${n}]) {
        ${o.join("")}
      }
      `}incrementIndices(){let e={};return this.context.programInfo.inputNames.forEach((n,t)=>{let o=this.context.inputTextureLayouts[t].shape,i=o.length,s=`incrementIndices_${n}`,a="";for(let l=0;l<i;++l)a+=`
        shape[${l}] = ${o[l]};`;let u=`
        void ${s}(int axis, out int indices[${i}]) {
          int shape[${i}];
          ${a};
          for(int i = ${i} -1 ; i >= 0; --i) {
            if(i > axis) continue;
            indices[i] += 1;
            if(indices[i] < shape[i]) {
              break;
            }
            indices[i] = 0;
          }
        }
        `;e[s]=new H(u)}),e}}});var ci,xm=A(()=>{"use strict";In();ci=class extends _t{constructor(e){super(e)}getCustomTypes(){return{}}getFunctions(){return{...this.binaryVecFunctions(),...this.copyVec(),...this.setVecItem(),...this.getVecItem()}}binaryVecFunctions(){let n=this.context.outputTextureLayout.shape.length,t={add:"+=",sub:"-=",mul:"*=",div:"/="},o={};for(let i in t){let s=`${i}Vec`,a="";for(let l=0;l<n;++l)a+=`
          dest[${l}] ${t[i]} src[${l}];
          `;let u=`
        void ${s}(int src[${n}], out int dest[${n}]) {
          ${a}
        }
        `;o[s]=new H(u)}return o}copyVec(){let n=this.context.outputTextureLayout.shape.length,t="";for(let i=0;i<n;++i)t+=`
        dest[${i}] = src[${i}];
        `;let o=`
      void copyVec(int src[${n}], out int dest[${n}]) {
        ${t}
      }
      `;return{copyVec:new H(o)}}setVecItem(){let n=this.context.outputTextureLayout.shape.length,t=`
        if(index < 0)
            index =${n} + index;
        if (index == 0)
            m[0] = value;
        `;for(let i=1;i<n-1;++i)t+=`
        else if (index == ${i})
            m[${i}] = value;
            `;t+=`
        else
            m[${n-1}] = value;
        `;let o=`
      void setVecItem(out int m[${n}], int index, int value) {
        ${t}
      }
        `;return{setVecItem:new H(o)}}getVecItem(){let n=this.context.outputTextureLayout.shape.length,t=`
        if(index < 0)
            index = ${n} + index;
        if (index == 0)
            return m[0];
      `;for(let i=1;i<n-1;++i)t+=`
        else if (index == ${i})
            return m[${i}];
      `;t+=`
        else
            return m[${n-1}];
        `;let o=`
      int getVecItem(int m[${n}], int index) {
        ${t}
      }
    `;return{getVecItem:new H(o)}}}});var Ru,Tm=A(()=>{"use strict";ym();_m();wm();vm();xm();Ru={encoding:ai,fragcolor:ui,vec:ci,shapeUtils:li,coordinates:si}});var di,Im=A(()=>{"use strict";In();gm();Tm();Le();di=class{constructor(e,n,t,o){this.libs={};this.glslLibRoutineDependencyGraph={};this.context=new Xo(e,n,t,o),Object.keys(Ru).forEach(s=>{let a=new Ru[s](this.context);this.libs[s]=a});let i=this.glslLibRoutineDependencyGraph;for(let s in this.libs){let u=this.libs[s].getFunctions();for(let l in u){let c=s+"."+l,d;i[c]?(d=i[c],d.routineBody=u[l].routineBody):(d=new Zr(c,u[l].routineBody),i[c]=d);let p=u[l].dependencies;if(p)for(let f=0;f<p.length;++f)if(i[p[f]])d.addDependency(i[p[f]]);else{let h=new Zr(p[f]);i[p[f]]=h,d.addDependency(h)}}}}preprocess(){let e=this.context.programInfo,n=e.shaderSource;return this.context.programInfo.hasMain||(n=`${n}
      ${rp(this.context.glContext.version,this.context.outputTextureLayout.shape.length)}`),n=mm(n),`${np(this.context.glContext.version)}
    ${this.getUniforms(e.inputNames,e.variables)}
    ${this.getImports(n)}
    ${n}`}getImports(e){let n=this.selectGlslLibRoutinesToBeIncluded(e);if(n.length===0)return"";let t="";for(let o=0;o<n.length;++o)if(n[o].routineBody)t+=n[o].routineBody+`
`;else throw new Error(`Missing body for the Glsl Library routine: ${n[o].name}`);return t}selectGlslLibRoutinesToBeIncluded(e){let n=[];return Object.keys(this.glslLibRoutineDependencyGraph).forEach(t=>{let o=t.split(".")[1];e.indexOf(o)!==-1&&n.push(this.glslLibRoutineDependencyGraph[t])}),Zo.returnOrderedNodes(n)}getUniforms(e,n){let t=[];if(e)for(let o of e)t.push(`uniform sampler2D ${o};`);if(n)for(let o of n)t.push(`uniform ${o.type} ${o.name}${o.arrayLength?`[${o.arrayLength}]`:""};`);return t.join(`
`)}}});var pi,Sm=A(()=>{"use strict";Ke();dt();Im();Le();pi=class{constructor(e,n,t){this.profiler=e;this.glContext=n;this.textureLayoutStrategy=t;this.repo=new Map,this.attributesBound=!1}getArtifact(e){return this.repo.get(e)}setArtifact(e,n){this.repo.set(e,n)}run(e,n,t){this.profiler.event("op",`ProgramManager.run ${e.programInfo.name??"unknown kernel"}`,()=>{let o=this.glContext.gl,i=e.program;o.useProgram(i);try{this.bindOutput(t),this.attributesBound||this.bindAttributes(e.attribLocations),this.bindUniforms(e.uniformLocations,e.programInfo.variables??[],n)}catch(s){throw Ie.error("ProgramManager",e.programInfo.shaderSource),s}this.profiler.event("backend","GlContext.draw()",()=>{this.glContext.draw()})},this.glContext)}dispose(){this.vertexShader&&this.glContext.deleteShader(this.vertexShader),this.repo.forEach(e=>this.glContext.deleteProgram(e.program))}build(e,n,t){return this.profiler.event("backend","ProgramManager.build",()=>{let o=new di(this.glContext,e,n,t),i=o.preprocess(),s=this.compile(i);return{programInfo:e,program:s,uniformLocations:this.getUniformLocations(s,o.context.programInfo.inputNames,o.context.programInfo.variables),attribLocations:this.getAttribLocations(s)}})}compile(e){if(!this.vertexShader){Ie.verbose("ProrgramManager","Compiling and caching Vertex shader for the first time");let o=tp(this.glContext.version);this.vertexShader=this.glContext.compileShader(o,this.glContext.gl.VERTEX_SHADER)}re.debug&&Ie.verbose("ProrgramManager",`FragShader:
${e}
`);let n=this.glContext.compileShader(e,this.glContext.gl.FRAGMENT_SHADER),t=this.glContext.createProgram(this.vertexShader,n);return this.glContext.deleteShader(n),t}bindOutput(e){let n=e.width,t=e.height;Ie.verbose("ProrgramManager",`Binding output texture to Framebuffer: w/h=${n}/${t}, shape=${e.shape}, type=${e.tensor.type}`),this.glContext.attachFramebuffer(e.texture,n,t)}bindAttributes(e){let n=e.position,t=e.textureCoord;this.glContext.setVertexAttributes(n,t),this.attributesBound=!0}bindUniforms(e,n,t){let o=this.glContext.gl,i=0;for(let{name:s,type:a,location:u,arrayLength:l}of e){let c=n.find(d=>d.name===s)?.data;if(a!=="sampler2D"&&!c)throw new Error(`variable '${s}' does not have data defined in program info`);switch(a){case"sampler2D":this.bindTexture(t[i],u,i),i++;break;case"float":l?o.uniform1fv(u,c):o.uniform1f(u,c);break;case"int":l?o.uniform1iv(u,c):o.uniform1i(u,c);break;default:throw new Error(`Uniform not implemented: ${a}`)}}}bindTexture(e,n,t){this.glContext.bindTextureToUniform(e.texture,t,n)}getAttribLocations(e){return{position:this.getAttribLocation(e,"position"),textureCoord:this.getAttribLocation(e,"textureCoord")}}getUniformLocations(e,n,t){let o=[];if(n)for(let i of n)o.push({name:i,type:"sampler2D",location:this.getUniformLocation(e,i)});if(t)for(let i of t)o.push({...i,location:this.getUniformLocation(e,i.name)});return o}getUniformLocation(e,n){let o=this.glContext.gl.getUniformLocation(e,n);if(o===null)throw new Error(`Uniform ${n} not found.`);return o}getAttribLocation(e,n){return this.glContext.gl.getAttribLocation(e,n)}}});var fi,$m=A(()=>{"use strict";dt();Kr();fi=class{constructor(e,n,t,o){this.glContext=e;this.layoutStrategy=n;this.profiler=t;this.config=o;this.pendingRead=new Map;o.reuseTextures&&(this.inUseTextures=new Map,this.idleTextures=new Map,this.textureLookup=new Map)}createTextureFromLayout(e,n,t,o){let i=this.toEncoderType(e),s=this.glContext.getEncoder(i,n.channels||1,o);if(n.isPacked&&o===1)throw new Error("not implemented");let a=n.width,u=n.height,l,c;if(this.config.reuseTextures){l=`${a}x${u}_${s.format}_${s.internalFormat}_${s.textureType}`,c=this.inUseTextures.get(l),c||(c=[],this.inUseTextures.set(l,c));let p=this.idleTextures.get(l);if(p&&p.length>0){let f=p.pop();return c.push(f),o===1&&this.glContext.updateTexture(f,a,u,s,this.toTextureData(e,t)),f}}Ie.verbose("TextureManager",`Creating new texture of size ${n.width}x${n.height}`);let d=this.glContext.allocateTexture(a,u,s,this.toTextureData(e,t));return this.config.reuseTextures&&(c.push(d),this.textureLookup.set(d,l)),d}readTexture(e,n,t){return t||(t=1),this.profiler.event("backend","TextureManager.readTexture",()=>{let o=e.shape.reduce((s,a)=>s*a)*t,i=this.glContext.readTexture(e.texture,e.width,e.height,o,this.toEncoderType(n),t);return this.toTensorData(n,i)})}async readTextureAsync(e,n,t){let o=e.tensor.dataId;if(t||(t=1),this.pendingRead.has(o)){let i=this.pendingRead.get(o);return new Promise(s=>i?.push(s))}return this.profiler.event("backend","TextureManager.readTextureAsync",async()=>{this.pendingRead.set(o,[]);let i=e.shape.reduce((l,c)=>l*c)*t;await this.glContext.createAndWaitForFence();let s=this.glContext.readTexture(e.texture,e.width,e.height,i,this.toEncoderType(n),t),a=this.toTensorData(n,s),u=this.pendingRead.get(o);return this.pendingRead.delete(o),u?.forEach(l=>l(a)),a})}readUint8TextureAsFloat(e){return this.profiler.event("backend","TextureManager.readUint8TextureAsFloat",()=>{let n=e.shape.reduce((o,i)=>o*i),t=this.glContext.readTexture(e.texture,e.width,e.height,n*4,"byte",4);return new Float32Array(t.buffer,t.byteOffset,n)})}releaseTexture(e,n){let t;if(this.config.reuseTextures&&(t=this.textureLookup.get(e.texture),t)){n&&this.textureLookup.delete(t);let o=this.inUseTextures.get(t);if(o){let i=o.indexOf(e.texture);if(i!==-1){o.splice(i,1);let s=this.idleTextures.get(t);s||(s=[],this.idleTextures.set(t,s)),s.push(e.texture)}}}(!t||n)&&(Ie.verbose("TextureManager",`Deleting texture of size ${e.width}x${e.height}`),this.glContext.deleteTexture(e.texture))}toTensorData(e,n){switch(e){case"int16":return n instanceof Int16Array?n:Int16Array.from(n);case"int32":return n instanceof Int32Array?n:Int32Array.from(n);case"int8":return n instanceof Int8Array?n:Int8Array.from(n);case"uint16":return n instanceof Uint16Array?n:Uint16Array.from(n);case"uint32":return n instanceof Uint32Array?n:Uint32Array.from(n);case"uint8":case"bool":return n instanceof Uint8Array?n:Uint8Array.from(n);case"float32":return n instanceof Float32Array?n:Float32Array.from(n);case"float64":return n instanceof Float64Array?n:Float64Array.from(n);default:throw new Error(`TensorData type ${e} is not supported`)}}toTextureData(e,n){if(n)return n instanceof Float32Array?n:new Float32Array(n)}toEncoderType(e){return"float"}clearActiveTextures(){this.glContext.clearActiveTextures()}}});var hi,Am=A(()=>{"use strict";dt();pc();yp();fm();Sm();Nu();$m();hi=class{constructor(e,n){this.backend=e;this.context=n;this.layoutStrategy=new ii(e.glContext.maxTextureSize),this.programManager=new pi(this.context.profiler,e.glContext,this.layoutStrategy),this.textureManager=new fi(e.glContext,this.layoutStrategy,this.context.profiler,{reuseTextures:e.textureCacheMode==="full"}),this.packedTextureDataCache=new Map,this.unpackedTextureDataCache=new Map,this.pack=e.pack,this.pack2unpackMap=new Map,this.unpack2packMap=new Map}createInferenceHandler(){return new Ko(this)}onGraphInitialized(e){let n=e.getValues().filter(t=>t.from===-1&&t.tensor).map(t=>t.tensor.dataId);this.initializers=new Set(n)}isInitializer(e){return this.initializers?this.initializers.has(e):!1}addInitializer(e){this.initializers.add(e)}getTextureData(e,n){return n?this.packedTextureDataCache.get(e):this.unpackedTextureDataCache.get(e)}setTextureData(e,n,t=!1){Ie.verbose("WebGLSessionHandler","Storing Texture data in cache"),t?this.packedTextureDataCache.set(e,n):this.unpackedTextureDataCache.set(e,n)}dispose(){this.programManager.dispose(),this.textureManager.clearActiveTextures(),this.packedTextureDataCache.forEach(e=>this.textureManager.releaseTexture(e,!0)),this.packedTextureDataCache=new Map,this.unpackedTextureDataCache.forEach(e=>this.textureManager.releaseTexture(e,!0)),this.unpackedTextureDataCache=new Map}resolve(e,n,t){let o=dc(e,n,pm);return{impl:o.opImpl,context:o.opInit?o.opInit(e,t):e}}}});function N1(r){let e=0;for(;e<r.length&&r[e]();++e);return e-1}var Yr,Om=A(()=>{"use strict";Ke();Kr();Kr();dn();Yr=class{constructor(e,n){this.frameBufferBound=!1;this.itemsToPoll=[];this.gl=e,this.version=n,this.getExtensions(),this.vertexbuffer=this.createVertexbuffer(),this.framebuffer=this.createFramebuffer(),this.queryVitalParameters()}allocateTexture(e,n,t,o){let i=this.gl,s=i.createTexture();i.bindTexture(i.TEXTURE_2D,s),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.NEAREST),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE);let a=o?t.encode(o,e*n):null;return i.texImage2D(i.TEXTURE_2D,0,t.internalFormat,e,n,0,t.format,t.textureType,a),this.checkError(),s}updateTexture(e,n,t,o,i){let s=this.gl;s.bindTexture(s.TEXTURE_2D,e);let a=o.encode(i,n*t);s.texSubImage2D(s.TEXTURE_2D,0,0,0,n,t,o.format,o.textureType,a),this.checkError()}attachFramebuffer(e,n,t){let o=this.gl;o.bindTexture(o.TEXTURE_2D,e),o.bindFramebuffer(o.FRAMEBUFFER,this.framebuffer),o.framebufferTexture2D(o.FRAMEBUFFER,o.COLOR_ATTACHMENT0,o.TEXTURE_2D,e,0),this.checkError(),o.viewport(0,0,n,t),o.scissor(0,0,n,t)}readTexture(e,n,t,o,i,s){let a=this.gl;s||(s=1),this.frameBufferBound||this.attachFramebuffer(e,n,t);let u=this.getEncoder(i,s),l=u.allocate(n*t);return a.bindTexture(a.TEXTURE_2D,e),a.framebufferTexture2D(a.FRAMEBUFFER,a.COLOR_ATTACHMENT0,a.TEXTURE_2D,e,0),a.readPixels(0,0,n,t,a.RGBA,u.textureType,l),this.checkError(),u.decode(l,o)}isFramebufferReady(){return!0}getActiveTexture(){let e=this.gl;return`TEXTURE${e.getParameter(this.gl.ACTIVE_TEXTURE)-e.TEXTURE0}`}getTextureBinding(){return this.gl.getParameter(this.gl.TEXTURE_BINDING_2D)}getFramebufferBinding(){return this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING)}setVertexAttributes(e,n){let t=this.gl;t.vertexAttribPointer(e,3,t.FLOAT,!1,20,0),t.enableVertexAttribArray(e),n!==-1&&(t.vertexAttribPointer(n,2,t.FLOAT,!1,20,12),t.enableVertexAttribArray(n)),this.checkError()}createProgram(e,n){let t=this.gl,o=t.createProgram();return t.attachShader(o,e),t.attachShader(o,n),t.linkProgram(o),o}compileShader(e,n){let t=this.gl,o=t.createShader(n);if(!o)throw new Error(`createShader() returned null with type ${n}`);if(t.shaderSource(o,e),t.compileShader(o),t.getShaderParameter(o,t.COMPILE_STATUS)===!1)throw new Error(`Failed to compile shader: ${t.getShaderInfoLog(o)}
Shader source:
${e}`);return o}deleteShader(e){this.gl.deleteShader(e)}bindTextureToUniform(e,n,t){let o=this.gl;o.activeTexture(o.TEXTURE0+n),this.checkError(),o.bindTexture(o.TEXTURE_2D,e),this.checkError(),o.uniform1i(t,n),this.checkError()}draw(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4),this.checkError()}checkError(){if(re.debug){let e=this.gl,n=e.getError(),t="";switch(n){case e.NO_ERROR:return;case e.INVALID_ENUM:t="INVALID_ENUM";break;case e.INVALID_VALUE:t="INVALID_VALUE";break;case e.INVALID_OPERATION:t="INVALID_OPERATION";break;case e.INVALID_FRAMEBUFFER_OPERATION:t="INVALID_FRAMEBUFFER_OPERATION";break;case e.OUT_OF_MEMORY:t="OUT_OF_MEMORY";break;case e.CONTEXT_LOST_WEBGL:t="CONTEXT_LOST_WEBGL";break;default:t=`Unknown WebGL Error: ${n.toString(16)}`}throw new Error(t)}}deleteTexture(e){this.gl.deleteTexture(e)}deleteProgram(e){this.gl.deleteProgram(e)}getEncoder(e,n,t=0){if(this.version===2)return new qo(this.gl,n);switch(e){case"float":return t===1||this.isRenderFloat32Supported?new jr(this.gl,n):new jr(this.gl,n,this.textureHalfFloatExtension.HALF_FLOAT_OES);case"int":throw new Error("not implemented");case"byte":return new jo(this.gl,n);default:throw new Error(`Invalid dataType: ${e}`)}}clearActiveTextures(){let e=this.gl;for(let n=0;n<this.maxTextureImageUnits;++n)e.activeTexture(e.TEXTURE0+n),e.bindTexture(e.TEXTURE_2D,null)}dispose(){if(this.disposed)return;let e=this.gl;e.bindFramebuffer(e.FRAMEBUFFER,null),e.deleteFramebuffer(this.framebuffer),e.bindBuffer(e.ARRAY_BUFFER,null),e.deleteBuffer(this.vertexbuffer),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null),e.finish(),this.disposed=!0}createDefaultGeometry(){return new Float32Array([-1,1,0,0,1,-1,-1,0,0,0,1,1,0,1,1,1,-1,0,1,0])}createVertexbuffer(){let e=this.gl,n=e.createBuffer();if(!n)throw new Error("createBuffer() returned null");let t=this.createDefaultGeometry();return e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,t,e.STATIC_DRAW),this.checkError(),n}createFramebuffer(){let e=this.gl.createFramebuffer();if(!e)throw new Error("createFramebuffer returned null");return e}queryVitalParameters(){let e=this.gl;if(this.isFloatTextureAttachableToFrameBuffer=this.checkFloatTextureAttachableToFrameBuffer(),this.isRenderFloat32Supported=this.checkRenderFloat32(),this.isFloat32DownloadSupported=this.checkFloat32Download(),this.version===1&&!this.textureHalfFloatExtension&&!this.isRenderFloat32Supported)throw new Error("both float32 and float16 TextureType are not supported");this.isBlendSupported=!this.isRenderFloat32Supported||this.checkFloat32Blend(),this.maxTextureSize=e.getParameter(e.MAX_TEXTURE_SIZE),this.maxTextureImageUnits=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),this.version}getExtensions(){this.version===2?(this.colorBufferFloatExtension=this.gl.getExtension("EXT_color_buffer_float"),this.disjointTimerQueryWebgl2Extension=this.gl.getExtension("EXT_disjoint_timer_query_webgl2")):(this.textureFloatExtension=this.gl.getExtension("OES_texture_float"),this.textureHalfFloatExtension=this.gl.getExtension("OES_texture_half_float"))}checkFloatTextureAttachableToFrameBuffer(){let e=this.gl,n=e.createTexture();e.bindTexture(e.TEXTURE_2D,n);let t=this.version===2?e.RGBA32F:e.RGBA;e.texImage2D(e.TEXTURE_2D,0,t,1,1,0,e.RGBA,e.FLOAT,null);let o=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,o),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,n,0);let i=e.checkFramebufferStatus(e.FRAMEBUFFER)===e.FRAMEBUFFER_COMPLETE;return e.bindTexture(e.TEXTURE_2D,null),e.bindFramebuffer(e.FRAMEBUFFER,null),e.deleteTexture(n),e.deleteFramebuffer(o),i}checkRenderFloat32(){if(this.version===2){if(!this.colorBufferFloatExtension)return!1}else if(!this.textureFloatExtension)return!1;return this.isFloatTextureAttachableToFrameBuffer}checkFloat32Download(){if(this.version===2){if(!this.colorBufferFloatExtension)return!1}else if(!this.textureFloatExtension||!this.gl.getExtension("WEBGL_color_buffer_float"))return!1;return this.isFloatTextureAttachableToFrameBuffer}checkFloat32Blend(){let e=this.gl,n,t,o,i,s;try{n=e.createTexture(),t=e.createFramebuffer(),e.bindTexture(e.TEXTURE_2D,n);let a=this.version===2?e.RGBA32F:e.RGBA;return e.texImage2D(e.TEXTURE_2D,0,a,1,1,0,e.RGBA,e.FLOAT,null),e.bindFramebuffer(e.FRAMEBUFFER,t),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,n,0),e.enable(e.BLEND),o=e.createShader(e.VERTEX_SHADER),!o||(e.shaderSource(o,"void main(){}"),e.compileShader(o),i=e.createShader(e.FRAGMENT_SHADER),!i)||(e.shaderSource(i,"precision highp float;void main(){gl_FragColor=vec4(0.5);}"),e.compileShader(i),s=e.createProgram(),!s)?!1:(e.attachShader(s,o),e.attachShader(s,i),e.linkProgram(s),e.useProgram(s),e.drawArrays(e.POINTS,0,1),e.getError()===e.NO_ERROR)}finally{e.disable(e.BLEND),s&&e.deleteProgram(s),o&&e.deleteShader(o),i&&e.deleteShader(i),t&&(e.bindFramebuffer(e.FRAMEBUFFER,null),e.deleteFramebuffer(t)),n&&(e.bindTexture(e.TEXTURE_2D,null),e.deleteTexture(n))}}beginTimer(){if(this.version===2&&this.disjointTimerQueryWebgl2Extension){let e=this.gl,n=this.disjointTimerQueryWebgl2Extension,t=e.createQuery();return e.beginQuery(n.TIME_ELAPSED_EXT,t),t}else throw new Error("WebGL1 profiling currently not supported.")}endTimer(){if(this.version===2&&this.disjointTimerQueryWebgl2Extension){let e=this.gl,n=this.disjointTimerQueryWebgl2Extension;e.endQuery(n.TIME_ELAPSED_EXT);return}else throw new Error("WebGL1 profiling currently not supported")}isTimerResultAvailable(e){let n=!1,t=!1;if(this.version===2&&this.disjointTimerQueryWebgl2Extension){let o=this.gl,i=this.disjointTimerQueryWebgl2Extension;n=o.getQueryParameter(e,o.QUERY_RESULT_AVAILABLE),t=o.getParameter(i.GPU_DISJOINT_EXT)}else throw new Error("WebGL1 profiling currently not supported");return n&&!t}getTimerResult(e){let n=0;if(this.version===2){let t=this.gl;n=t.getQueryParameter(e,t.QUERY_RESULT),t.deleteQuery(e)}else throw new Error("WebGL1 profiling currently not supported");return n/1e6}async waitForQueryAndGetTime(e){return await au(()=>this.isTimerResultAvailable(e)),this.getTimerResult(e)}async createAndWaitForFence(){let e=this.createFence(this.gl);return this.pollFence(e)}createFence(e){let n,t=e,o=t.fenceSync(t.SYNC_GPU_COMMANDS_COMPLETE,0);return e.flush(),o===null?n=()=>!0:n=()=>{let i=t.clientWaitSync(o,0,0);return i===t.ALREADY_SIGNALED||i===t.CONDITION_SATISFIED},{query:o,isFencePassed:n}}async pollFence(e){return new Promise(n=>{this.addItemToPoll(()=>e.isFencePassed(),()=>n())})}pollItems(){let e=N1(this.itemsToPoll.map(n=>n.isDoneFn));for(let n=0;n<=e;++n){let{resolveFn:t}=this.itemsToPoll[n];t()}this.itemsToPoll=this.itemsToPoll.slice(e+1)}async addItemToPoll(e,n){this.itemsToPoll.push({isDoneFn:e,resolveFn:n}),!(this.itemsToPoll.length>1)&&await au(()=>(this.pollItems(),this.itemsToPoll.length===0))}}});function zu(r){let e;if((!r||r==="webgl2")&&"webgl2"in Sr?e=Sr.webgl2:(!r||r==="webgl")&&"webgl"in Sr&&(e=Sr.webgl),!e)try{let t=z1();e=Pm(t,r)}catch{let t=R1();e=Pm(t,r)}r=r||e.version===1?"webgl":"webgl2";let n=e.gl;return Sr[r]=e,n.isContextLost()?(delete Sr[r],zu(r)):(n.disable(n.DEPTH_TEST),n.disable(n.STENCIL_TEST),n.disable(n.BLEND),n.disable(n.DITHER),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SAMPLE_COVERAGE),n.enable(n.SCISSOR_TEST),n.enable(n.CULL_FACE),n.cullFace(n.BACK),e)}function Pm(r,e){let n={alpha:!1,depth:!1,antialias:!1,stencil:!1,preserveDrawingBuffer:!1,premultipliedAlpha:!1,failIfMajorPerformanceCaveat:!1},t,o=n;if((!e||e==="webgl2")&&(t=r.getContext("webgl2",o),t))try{return new Yr(t,2)}catch(i){Ie.warning("GlContextFactory",`failed to create WebGLContext using contextId 'webgl2'. Error: ${i}`)}if((!e||e==="webgl")&&(t=r.getContext("webgl",o)||r.getContext("experimental-webgl",o),t))try{return new Yr(t,1)}catch(i){Ie.warning("GlContextFactory",`failed to create WebGLContext using contextId 'webgl' or 'experimental-webgl'. Error: ${i}`)}throw new Error("WebGL is not supported")}function R1(){if(typeof document>"u")throw new TypeError("failed to create canvas: document is not supported");let r=document.createElement("canvas");return r.width=1,r.height=1,r}function z1(){if(typeof OffscreenCanvas>"u")throw new TypeError("failed to create offscreen canvas: OffscreenCanvas is not supported");return new OffscreenCanvas(1,1)}var Sr,Em=A(()=>{"use strict";dt();Om();Sr={}});var mi,Dm=A(()=>{"use strict";Ke();dt();Am();Em();mi=class{get contextId(){return re.webgl.contextId}set contextId(e){re.webgl.contextId=e}get matmulMaxBatchSize(){return re.webgl.matmulMaxBatchSize}set matmulMaxBatchSize(e){re.webgl.matmulMaxBatchSize=e}get textureCacheMode(){return re.webgl.textureCacheMode}set textureCacheMode(e){re.webgl.textureCacheMode=e}get pack(){return re.webgl.pack}set pack(e){re.webgl.pack=e}get async(){return re.webgl.async}set async(e){re.webgl.async=e}initialize(){try{return this.glContext=zu(this.contextId),typeof this.matmulMaxBatchSize!="number"&&(this.matmulMaxBatchSize=16),typeof this.textureCacheMode!="string"&&(this.textureCacheMode="full"),typeof this.pack!="boolean"&&(this.pack=!1),typeof this.async!="boolean"&&(this.async=!1),Ie.setWithEnv(re),re.webgl.context||Object.defineProperty(re.webgl,"context",{value:this.glContext.gl}),Ie.verbose("WebGLBackend",`Created WebGLContext: ${typeof this.glContext} with matmulMaxBatchSize: ${this.matmulMaxBatchSize}; textureCacheMode: ${this.textureCacheMode}; pack: ${this.pack}; async: ${this.async}.`),!0}catch(e){return Ie.warning("WebGLBackend",`Unable to initialize WebGLBackend. ${e}`),!1}}createSessionHandler(e){return new hi(this,e)}dispose(){this.glContext.dispose()}}});async function Bu(r){if(r){let e=typeof r=="string"?[r]:r;for(let n of e){let t=Cm.get(n);if(t)return t;let o=await M1(n);if(o)return o}}else return Bu(["webgl"]);throw new Error("no available backend to use")}async function M1(r){let e=B1;if(typeof e[r]<"u"&&V1(e[r])){let n=e[r],t=n.initialize();if(typeof t=="object"&&"then"in t&&(t=await t),t)return Cm.set(r,n),n}}function V1(r){let e=r;return"initialize"in e&&typeof e.initialize=="function"&&"createSessionHandler"in e&&typeof e.createSessionHandler=="function"&&"dispose"in e&&typeof e.dispose=="function"}var Cm,B1,km=A(()=>{"use strict";Dm();Cm=new Map,B1={webgl:new mi}});var Mu,gi,Lm=A(()=>{"use strict";dt();Mu=class{constructor(e,n){this.op=e;this.node=n}},gi=class{constructor(e,n,t){this.graph=e;this.profiler=t;this.initialize(n)}initialize(e){this.profiler.event("session","ExecutionPlan.initialize",()=>{let n=this.graph.getNodes();if(n.length!==e.length)throw new Error("The size of nodes and OPs do not match.");this._ops=e.map((t,o)=>new Mu(t,n[o])),this.reset(),this._starter=[],this._ops.forEach((t,o)=>{let i=!0;for(let s of t.node.inputs)if(!this._values[s]&&this.graph.getInputIndices().indexOf(s)===-1){i=!1;break}i&&this._starter.push(o)})})}reset(){this._values=this.graph.getValues().map(e=>e.tensor)}async execute(e,n){return this.profiler.event("session","ExecutionPlan.execute",async()=>{this.reset();let t=e.createInferenceHandler(),o=this.graph.getInputIndices();if(n.length!==o.length)throw new Error(`number of input tensors don't match the number of inputs to the model: actual: ${n.length} expected: ${o.length}`);n.forEach((c,d)=>{let p=o[d];this._values[p]=c});let i=this._starter.slice(0),s=this.graph.getValues(),a=this.graph.getNodes(),u=0;for(;u<i.length;){let c=i[u++],d=this._ops[c],p=d.node.inputs.map(y=>this._values[y]);if(p.indexOf(void 0)!==-1)throw new Error(`unresolved input detected: op: ${d.node}`);let f=p;Ie.verbose("ExecPlan",`Running op:${d.node.name} (${f.map((y,g)=>`'${d.node.inputs[g]}': ${y.type}[${y.dims.join(",")}]`).join(", ")})`);let h=await this.profiler.event("node",d.node.name,async()=>d.op.impl(t,f,d.op.context));if(h.length!==d.node.outputs.length)throw new Error("the size of output does not match model definition.");h.forEach((y,g)=>{let b=d.node.outputs[g];if(this._values[b])throw new Error(`output [${b}] already has value: op:${d.node.name}`);this._values[b]=y});let m=new Set;h.forEach((y,g)=>{let b=d.node.outputs[g];for(let _ of s[b].to){let x=a[_],T=!0;for(let S of x.inputs)if(!this._values[S]){T=!1;break}T&&m.add(_)}}),i.push(...m)}let l=[];for(let c=0;c<this.graph.getOutputIndices().length;c++){let d=this.graph.getOutputIndices()[c],p=this._values[d];if(p===void 0)throw new Error(`required output [${d}] does not have value`);d===0?await p.getData():p.data,l.push(p)}return Ie.verbose("ExecPlan","disposing of inferenceHandler"),t.dispose(),l})}}});var fe,eo,Nm=A(()=>{"use strict";Vr();fe=ue(br());Yn();xe();eo=class r{constructor(e){if(this._attributes=new Map,e!=null){for(let n of e)n instanceof fe.onnx.AttributeProto?this._attributes.set(n.name,[r.getValue(n),r.getType(n)]):n instanceof Bo.Attribute&&this._attributes.set(n.name(),[r.getValue(n),r.getType(n)]);if(this._attributes.size<e.length)throw new Error("duplicated attribute names")}}set(e,n,t){this._attributes.set(e,[t,n])}delete(e){this._attributes.delete(e)}getFloat(e,n){return this.get(e,"float",n)}getInt(e,n){return this.get(e,"int",n)}getString(e,n){return this.get(e,"string",n)}getTensor(e,n){return this.get(e,"tensor",n)}getFloats(e,n){return this.get(e,"floats",n)}getInts(e,n){return this.get(e,"ints",n)}getStrings(e,n){return this.get(e,"strings",n)}getTensors(e,n){return this.get(e,"tensors",n)}get(e,n,t){let o=this._attributes.get(e);if(o===void 0){if(t!==void 0)return t;throw new Error(`required attribute not found: ${e}`)}if(o[1]!==n)throw new Error(`type mismatch: expected ${n} but got ${o[1]}`);return o[0]}static getType(e){let n=e instanceof fe.onnx.AttributeProto?e.type:e.type();switch(n){case fe.onnx.AttributeProto.AttributeType.FLOAT:return"float";case fe.onnx.AttributeProto.AttributeType.INT:return"int";case fe.onnx.AttributeProto.AttributeType.STRING:return"string";case fe.onnx.AttributeProto.AttributeType.TENSOR:return"tensor";case fe.onnx.AttributeProto.AttributeType.FLOATS:return"floats";case fe.onnx.AttributeProto.AttributeType.INTS:return"ints";case fe.onnx.AttributeProto.AttributeType.STRINGS:return"strings";case fe.onnx.AttributeProto.AttributeType.TENSORS:return"tensors";default:throw new Error(`attribute type is not supported yet: ${fe.onnx.AttributeProto.AttributeType[n]}`)}}static getValue(e){let n=e instanceof fe.onnx.AttributeProto?e.type:e.type();if(n===fe.onnx.AttributeProto.AttributeType.GRAPH||n===fe.onnx.AttributeProto.AttributeType.GRAPHS)throw new Error("graph attribute is not supported yet");let t=this.getValueNoCheck(e);if(n===fe.onnx.AttributeProto.AttributeType.INT&&ot.isLong(t))return ot.longToNumber(t);if(n===fe.onnx.AttributeProto.AttributeType.INTS){let o=t,i=new Array(o.length);for(let s=0;s<o.length;s++){let a=o[s];i[s]=ot.longToNumber(a)}return i}if(n===fe.onnx.AttributeProto.AttributeType.TENSOR)return e instanceof fe.onnx.AttributeProto?Fe.fromProto(t):Fe.fromOrtTensor(t);if(n===fe.onnx.AttributeProto.AttributeType.TENSORS){if(e instanceof fe.onnx.AttributeProto)return t.map(i=>Fe.fromProto(i));if(e instanceof Bo.Attribute)return t.map(i=>Fe.fromOrtTensor(i))}return n===fe.onnx.AttributeProto.AttributeType.STRING&&e instanceof fe.onnx.AttributeProto?qr(t):n===fe.onnx.AttributeProto.AttributeType.STRINGS&&e instanceof fe.onnx.AttributeProto?t.map(qr):t}static getValueNoCheck(e){return e instanceof fe.onnx.AttributeProto?this.getValueNoCheckFromOnnxFormat(e):this.getValueNoCheckFromOrtFormat(e)}static getValueNoCheckFromOnnxFormat(e){switch(e.type){case fe.onnx.AttributeProto.AttributeType.FLOAT:return e.f;case fe.onnx.AttributeProto.AttributeType.INT:return e.i;case fe.onnx.AttributeProto.AttributeType.STRING:return e.s;case fe.onnx.AttributeProto.AttributeType.TENSOR:return e.t;case fe.onnx.AttributeProto.AttributeType.GRAPH:return e.g;case fe.onnx.AttributeProto.AttributeType.FLOATS:return e.floats;case fe.onnx.AttributeProto.AttributeType.INTS:return e.ints;case fe.onnx.AttributeProto.AttributeType.STRINGS:return e.strings;case fe.onnx.AttributeProto.AttributeType.TENSORS:return e.tensors;case fe.onnx.AttributeProto.AttributeType.GRAPHS:return e.graphs;default:throw new Error(`unsupported attribute type: ${fe.onnx.AttributeProto.AttributeType[e.type]}`)}}static getValueNoCheckFromOrtFormat(e){switch(e.type()){case gt.AttributeType.FLOAT:return e.f();case gt.AttributeType.INT:return e.i();case gt.AttributeType.STRING:return e.s();case gt.AttributeType.TENSOR:return e.t();case gt.AttributeType.GRAPH:return e.g();case gt.AttributeType.FLOATS:return e.floatsArray();case gt.AttributeType.INTS:{let n=[];for(let t=0;t<e.intsLength();t++)n.push(e.ints(t));return n}case gt.AttributeType.STRINGS:{let n=[];for(let t=0;t<e.stringsLength();t++)n.push(e.strings(t));return n}case gt.AttributeType.TENSORS:{let n=[];for(let t=0;t<e.tensorsLength();t++)n.push(e.tensors(t));return n}default:throw new Error(`unsupported attribute type: ${gt.AttributeType[e.type()]}`)}}}});var Fu,Gu,hn,bi,Vu,Rm=A(()=>{"use strict";Nm();Vr();Fu=ue(br());Yn();xe();Gu={from:(r,e)=>new Vu(r,e)},hn=class{constructor(e){this._from=void 0,this._to=[],this.tensor=void 0,this.type=void 0,e&&(this.type=Xe.tensorValueTypeFromProto(e.type.tensorType))}get from(){return this._from}get to(){return this._to}},bi=class{constructor(e,n){e instanceof Fu.onnx.NodeProto?(this.name=e.name,this.opType=e.opType,this.attributes=new eo(e.attribute)):e instanceof Fa.Node&&(this.name=n??e.name(),this.opType=e.opType(),this.attributes=new eo(Xe.tensorAttributesFromORTFormat(e))),this.inputs=[],this.outputs=[],this.executeNode=!0}},Vu=class{constructor(e,n){if(!e)throw new TypeError("graph is empty");this.buildGraph(e),this.transformGraph(n),this.checkIsAcyclic()}getInputIndices(){return this._allInputIndices}getInputNames(){return this._allInputNames}getOutputIndices(){return this._allOutputIndices}getOutputNames(){return this._allOutputNames}getValues(){return this._allData}getNodes(){return this._nodes}buildGraph(e){if(e instanceof Fu.onnx.GraphProto)this.buildGraphFromOnnxFormat(e);else if(e instanceof Ma.Graph)this.buildGraphFromOrtFormat(e);else throw new TypeError("Graph type is not supported.")}buildGraphFromOnnxFormat(e){let n=new Map;this._allData=[],this._allInputIndices=[],this._allInputNames=[],this._allOutputIndices=[],this._allOutputNames=[],this._nodes=[];let t=new Map;if(!e.input)throw new Error("missing information in graph: input");let o=[];for(let i of e.input){if(n.has(i.name))throw new Error(`duplicated input name: ${i.name}`);let s=this._allData.push(new hn(i))-1;n.set(i.name,s),o.push(i.name)}if(!e.initializer)throw new Error("missing information in graph: initializer");for(let i of e.initializer){let s=n.get(i.name);if(s===void 0){let a=new hn;a.type={shape:{dims:Xe.tensorDimsFromProto(i.dims)},tensorType:Xe.tensorDataTypeFromProto(i.dataType)},s=this._allData.push(a)-1,n.set(i.name,s)}this._allData[s]._from=-1,this._allData[s].tensor=Fe.fromProto(i)}for(let i=0;i<this._allData.length;i++)this._allData[i].tensor||(this._allInputIndices.push(i),this._allInputNames.push(o[i]));if(!e.output)throw new Error("missing information in graph: output");for(let i of e.output){if(n.has(i.name))throw new Error(`duplicated output name: ${i.name}`);let s=this._allData.push(new hn(i))-1;n.set(i.name,s),this._allOutputIndices.push(s),this._allOutputNames.push(i.name)}if(!e.node)throw new Error("missing information in graph: node");for(let i of e.node){if(!i.name)for(let a=0;;a++){let u=`unnamed_${i.opType}_${a}`;if(!t.has(u)){i.name=u;break}}if(t.has(i.name))throw new Error(`duplicated node name: ${i.name}`);let s=this._nodes.push(new bi(i))-1;t.set(i.name,s)}for(let i=0;i<this._nodes.length;i++){let s=this._nodes[i],a=e.node[i];if(!a.output)throw new Error(`missing output for node: ${a.name}`);for(let u of a.output){let l=n.get(u);if(typeof l>"u"&&(l=this._allData.push(new hn)-1,n.set(u,l)),s.outputs.push(l),this._allData[l]._from!==void 0)throw new Error(`multiple nodes output to one data value: ${l}`);if(this._allData[l]._from=i,a.opType==="Constant"){if(!a.attribute||a.attribute.length!==1||!a.attribute[0].t)throw new Error("missing attributes or missing tensor value in attributes for this Constant operator");if(!a.output||a.output.length!==1)throw new Error("missing output or incorrect number of outputs for this Constant operator");s.outputs.pop(),s.executeNode=!1,this._allData[l]._from=-1,this._allData[l].tensor=Fe.fromProto(a.attribute[0].t)}}}for(let i=0;i<this._nodes.length;i++){let s=this._nodes[i],a=e.node[i];if(!a.input)throw new Error(`missing input for node: ${a.name}`);for(let u of a.input){let l=n.get(u);if(typeof l>"u"){if(u===""&&(a.input.length===3||a.input.length===4)&&a.opType==="Resize")continue;throw new Error(`unrecognized input '${u}' for node: ${a.name}`)}s.inputs.push(l),this._allData[l]._to.push(i)}}return!0}buildGraphFromOrtFormat(e){let n=new Map;this._allData=[],this._allInputIndices=[],this._allInputNames=[],this._allOutputIndices=[],this._allOutputNames=[],this._nodes=[];let t=new Map,o=[];for(let i=0;i<e.inputsLength();i++){let s=e.inputs(i);if(n.has(s))throw new Error(`duplicated input name: ${s}`);for(let a=0;a<e.nodeArgsLength();a++)if(e.nodeArgs(a)?.name()===s){let u=new hn;if(e.nodeArgs(a)?.type()?.valueType()!==Ua.TypeInfoValue.tensor_type)throw new Error("Unexpected value type for the nodeArg.");let c=e.nodeArgs(a).type().value(new Ga.TensorTypeAndShape),d=Xe.tensorDataTypeFromProto(c.elemType()),p=c.shape(),f=[];for(let m=0;m<p.dimLength();m++)f.push(ot.longToNumber(p.dim(m).value().dimValue()));u.type={shape:{dims:f},tensorType:d};let h=this._allData.push(u)-1;n.set(s,h),o.push(s)}}for(let i=0;i<e.initializersLength();i++){let s=e.initializers(i),a=n.get(s.name());if(a===void 0){let u=new hn,l=Xe.tensorDimsFromORTFormat(s),c=Xe.tensorDataTypeFromProto(s.dataType());u.type={shape:{dims:l},tensorType:c},a=this._allData.push(u)-1,n.set(s.name(),a)}this._allData[a]._from=-1,this._allData[a].tensor=Fe.fromOrtTensor(s)}for(let i=0;i<this._allData.length;i++)this._allData[i].tensor||(this._allInputIndices.push(i),this._allInputNames.push(o[i]));for(let i=0;i<e.outputsLength();i++){let s=e.outputs(i);if(n.has(s))throw new Error(`duplicated output name: ${s}`);let a=this._allData.push(new hn)-1;n.set(s,a),this._allOutputIndices.push(a),this._allOutputNames.push(s)}if(!e.nodes)throw new Error("missing information in graph: node");for(let i=0;i<e.nodesLength();i++){let s=e.nodes(i),a=s.name();if(!a)for(let l=0;a=`unnamed_${s.opType()}_${l}`,!!t.has(a);l++);if(t.has(a))throw new Error(`duplicated node name: ${a}`);let u=this._nodes.push(new bi(s,a))-1;t.set(a,u)}for(let i=0;i<this._nodes.length;i++){let s=this._nodes[i],a=e.nodes(i);if(a==null)throw new Error(`No node exists at index ${i}`);if(a?.outputsLength()===0)throw new Error(`missing output for node: ${a.name}`);for(let u=0;u<a?.outputsLength();u++){let l=a?.outputs(u),c=n.get(l);if(typeof c>"u"&&(c=this._allData.push(new hn)-1,n.set(l,c)),s.outputs.push(c),this._allData[c]._from!==void 0)throw new Error(`multiple nodes output to one data value: ${c}`);if(this._allData[c]._from=i,a.opType()==="Constant"){if(a.attributesLength()!==1||!a.attributes(0).t())throw new Error("missing attributes or missing tensor value in attributes for this Constant operator");if(a.outputsLength()!==1)throw new Error("missing output or incorrect number of outputs for this Constant operator");s.outputs.pop(),s.executeNode=!1,this._allData[c]._from=-1,this._allData[c].tensor=Fe.fromOrtTensor(a.attributes(0).t())}}}for(let i=0;i<this._nodes.length;i++){let s=this._nodes[i],a=e.nodes(i);if(a.inputsLength()===0)throw new Error(`missing input for node: ${a.name}`);for(let u=0;u<a.inputsLength();u++){let l=a.inputs(u),c=n.get(l);if(typeof c>"u")throw new Error(`unrecognized input '${l}' for node: ${a.name()}`);s.inputs.push(c),this._allData[c]._to.push(i)}}}checkIsAcyclic(){let e=new Set;this._allInputIndices.forEach(o=>{this._allData[o]._to.forEach(s=>{e.add(s)})});let n=Array.from(e),t=new Array(this._nodes.length).fill("white");for(;n.length>0;){let o=n.pop();t[o]==="gray"?t[o]="black":(n.push(o),t[o]="gray",this._nodes[o].outputs.forEach(i=>{let s=this._allData[i];if(typeof s.tensor<"u")throw new Error("node outputs should not be initialized");if(s._from!==o)throw new Error("from property of the Value object doesn't match index of Node being processed");s._to.forEach(a=>{if(t[a]==="gray")throw new Error("model graph is cyclic");t[a]==="white"&&n.push(a)})}))}}transformGraph(e){this.removeAllIdentityNodes(),this.removeAllDropoutNodes(),this.fuseConvActivationNodes(),e&&e.transformGraph(this),this.finalizeGraph()}finalizeGraph(){let e=0,n=new Array(this._nodes.length,0),t=0;for(let o=0;o<this._nodes.length;o++)n[o]=t,this._nodes[o].executeNode?(t!==o&&(this._nodes[t]=this._nodes[o]),t++):this._nodes[o].outputs.forEach(i=>{this._allData[i]._from=-2});this._nodes.splice(t,this._nodes.length-t);for(let o=0;o<this._allData.length;o++){let i=this._allData[o];i._from!==void 0&&i._from!==-1&&i._from!==-2&&(i._from=n[i._from]);for(let s=0;s<i._to.length;s++)if(i._to[s]>=0)i._to[s]=n[i._to[s]];else throw new Error("Trying to update a removed node")}e=0;for(let o=0;o<this._allData.length;o++){if(this._allData[o].from===-2&&this._allOutputIndices.indexOf(o+e)===-1){e++,this._allData.splice(o,1),o--;continue}if(e>0){let i=-1;this._allData[o].from!==void 0&&this._allData[o].from!==-1?(i=this._nodes[this._allData[o].from].outputs.indexOf(o+e),i!==-1&&(this._nodes[this._allData[o].from].outputs[i]=o)):(i=this._allInputIndices.indexOf(o+e),i!==-1&&(this._allInputIndices[i]=o)),this._allData[o].to.forEach(s=>{i=this._nodes[s].inputs.indexOf(o+e),i!==-1&&(this._nodes[s].inputs[i]=o)}),this._allData[o].to.length===0&&(i=this._allOutputIndices.indexOf(o+e),i!==-1&&(this._allOutputIndices[i]=o))}}}deleteNode(e){let n=this._nodes[e];if(n.outputs.length>1){for(let a=1;a<n.outputs.length;a++)if(this._allData[n.outputs[a]].to.length>0)throw new Error("Node deletion with more than one output connected to other nodes is not supported. ")}n.executeNode=!1;let t=n.inputs[0],o=n.outputs[0],i=this._allData[o].to;for(let a=0;a<n.inputs.length;a++){let u=this._allData[n.inputs[a]].to.indexOf(e);if(u===-1)throw new Error("The Value object doesn't have the current Node in it's 'to' property ");this._allData[n.inputs[a]].to.splice(u,1)}this._allData[o]._to=[];let s=this._allOutputIndices.indexOf(o);if(s!==-1&&(this._allOutputIndices[s]=t),i&&i.length>0)for(let a of i){let u=this._nodes[a].inputs.indexOf(o);if(u===-1)throw new Error("The Node object doesn't have the output Value in it's 'inputs' property ");this._nodes[a].inputs[u]=t,this._allData[t].to.push(a)}}removeAllDropoutNodes(){let e=0;for(let n of this._nodes){if(n.opType==="Dropout"){if(n.inputs.length!==1)throw new Error("Dropout nodes should only contain one input. ");if(n.outputs.length!==1&&n.outputs.length!==2)throw new Error("Dropout nodes should contain either 1 or 2 output(s)");if(n.outputs.length===2&&this._allData[n.outputs[1]]._to.length!==0)throw new Error("Dropout nodes's second output should not be referenced by other nodes");this.deleteNode(e)}e++}}removeAllIdentityNodes(){let e=0;for(let n of this._nodes)n.opType==="Identity"&&this.deleteNode(e),e++}isActivation(e){switch(e.opType){case"Relu":case"Sigmoid":case"Clip":return!0;default:return!1}}fuseConvActivationNodes(){for(let e of this._nodes)if(e.opType==="Conv"){let n=this._allData[e.outputs[0]]._to;if(n.length===1&&this.isActivation(this._nodes[n[0]])){let t=this._nodes[n[0]];if(t.opType==="Clip")if(t.inputs.length===1)try{e.attributes.set("activation_params","floats",[t.attributes.getFloat("min"),t.attributes.getFloat("max")])}catch{e.attributes.set("activation_params","floats",[Jn,Qn])}else if(t.inputs.length>=3&&this._allData[t.inputs[1]].tensor!==void 0&&this._allData[t.inputs[2]].tensor!==void 0)e.attributes.set("activation_params","floats",[this._allData[t.inputs[1]].tensor.floatData[0],this._allData[t.inputs[2]].tensor.floatData[0]]);else continue;e.attributes.set("activation","string",t.opType),this.deleteNode(n[0])}}}}});var zm,Bm,yi,Mm=A(()=>{"use strict";zm=ue(ve());Rm();Vr();Bm=ue(br());xe();yi=class{constructor(){}load(e,n,t){let o;if(!t)try{this.loadFromOnnxFormat(e,n);return}catch(i){if(t!==void 0)throw i;o=i}try{this.loadFromOrtFormat(e,n)}catch(i){throw t!==void 0?i:new Error(`Failed to load model as ONNX format: ${o}
as ORT format: ${i}`)}}loadFromOnnxFormat(e,n){let t=Bm.onnx.ModelProto.decode(e);if(ot.longToNumber(t.irVersion)<3)throw new Error("only support ONNX model with IR_VERSION>=3");this._opsets=t.opsetImport.map(i=>({domain:i.domain,version:ot.longToNumber(i.version)})),this._graph=Gu.from(t.graph,n)}loadFromOrtFormat(e,n){let t=new zm.ByteBuffer(e),o=Va.InferenceSession.getRootAsInferenceSession(t).model();if(ot.longToNumber(o.irVersion())<3)throw new Error("only support ONNX model with IR_VERSION>=3");this._opsets=[];for(let s=0;s<o.opsetImportLength();s++){let a=o.opsetImport(s);this._opsets.push({domain:a?.domain(),version:ot.longToNumber(a.version())})}this._graph=Gu.from(o.graph(),n)}get graph(){return this._graph}get opsets(){return this._opsets}}});var _i,Vm=A(()=>{"use strict";km();Lm();dt();Mm();_i=class{constructor(e={}){this._initialized=!1,this.backendHint=e.backendHint,this.profiler=xo.create(e.profiler),this.context={profiler:this.profiler,graphInputTypes:[],graphInputDims:[]}}get inputNames(){return this._model.graph.getInputNames()}get outputNames(){return this._model.graph.getOutputNames()}startProfiling(){this.profiler.start()}endProfiling(){this.profiler.stop()}async loadModel(e,n,t){await this.profiler.event("session","Session.loadModel",async()=>{let o=await Bu(this.backendHint);if(this.sessionHandler=o.createSessionHandler(this.context),this._model=new yi,typeof e=="string"){let i=e.endsWith(".ort");{let a=await(await fetch(e)).arrayBuffer();this.initialize(new Uint8Array(a),i)}}else if(ArrayBuffer.isView(e))this.initialize(e);else{let i=new Uint8Array(e,n||0,t||e.byteLength);this.initialize(i)}})}initialize(e,n){if(this._initialized)throw new Error("already initialized");this.profiler.event("session","Session.initialize",()=>{let t=this.sessionHandler.transformGraph?this.sessionHandler:void 0;this._model.load(e,t,n),this.sessionHandler.onGraphInitialized&&this.sessionHandler.onGraphInitialized(this._model.graph),this.initializeOps(this._model.graph),this._executionPlan=new gi(this._model.graph,this._ops,this.profiler)}),this._initialized=!0}async run(e){if(!this._initialized)throw new Error("session not initialized yet");return this.profiler.event("session","Session.run",async()=>{let n=this.normalizeAndValidateInputs(e),t=await this._executionPlan.execute(this.sessionHandler,n);return this.createOutput(t)})}normalizeAndValidateInputs(e){let n=this._model.graph.getInputNames();if(Array.isArray(e)){if(e.length!==n.length)throw new Error(`incorrect input array length: expected ${n.length} but got ${e.length}`)}else{if(e.size!==n.length)throw new Error(`incorrect input map size: expected ${n.length} but got ${e.size}`);let t=new Array(e.size),o=0;for(let i=0;i<n.length;++i){let s=e.get(n[i]);if(!s)throw new Error(`missing input tensor for: '${name}'`);t[o++]=s}e=t}if(!this.context.graphInputTypes||this.context.graphInputTypes.length===0||!this.context.graphInputDims||this.context.graphInputDims.length===0){let t=this._model.graph.getInputIndices(),o=this._model.graph.getValues(),i=new Array(t.length);for(let s=0;s<t.length;++s){let a=o[t[s]];i[s]=a.type.shape.dims,this.context.graphInputTypes.push(a.type.tensorType),this.context.graphInputDims.push(e[s].dims)}this.validateInputTensorDims(i,e,!0)}else this.validateInputTensorDims(this.context.graphInputDims,e,!1);return this.validateInputTensorTypes(this.context.graphInputTypes,e),e}validateInputTensorTypes(e,n){for(let t=0;t<n.length;t++){let o=e[t],i=n[t].type;if(o!==i)throw new Error(`input tensor[${t}] check failed: expected type '${o}' but got ${i}`)}}validateInputTensorDims(e,n,t){for(let o=0;o<n.length;o++){let i=e[o],s=n[o].dims;if(!this.compareTensorDims(i,s,t))throw new Error(`input tensor[${o}] check failed: expected shape '[${i.join(",")}]' but got [${s.join(",")}]`)}}compareTensorDims(e,n,t){if(e.length!==n.length)return!1;for(let o=0;o<e.length;++o)if(e[o]!==n[o]&&(!t||e[o]!==0))return!1;return!0}createOutput(e){let n=this._model.graph.getOutputNames();if(e.length!==n.length)throw new Error("expected number of outputs do not match number of generated outputs");let t=new Map;for(let o=0;o<n.length;++o)t.set(n[o],e[o]);return t}initializeOps(e){let n=e.getNodes();this._ops=new Array(n.length);for(let t=0;t<n.length;t++)this._ops[t]=this.sessionHandler.resolve(n[t],this._model.opsets,e)}}});var wi,Fm=A(()=>{"use strict";Ke();Yn();wi=class{constructor(e){this.session=e;this.inputNames=this.session.inputNames,this.outputNames=this.session.outputNames}get inputMetadata(){throw new Error("Getting model metadata is not supported in webgl backend.")}get outputMetadata(){throw new Error("Getting model metadata is not supported in webgl backend.")}async dispose(){}async run(e,n,t){let o=new Map;for(let a in e)if(Object.hasOwnProperty.call(e,a)){let u=e[a];o.set(a,new Fe(u.dims,u.type,void 0,void 0,u.data))}let i=await this.session.run(o),s={};return i.forEach((a,u)=>{s[u]=new st(a.type,a.data,a.dims)}),s}startProfiling(){this.session.startProfiling()}endProfiling(){this.session.endProfiling()}}});var Gm={};pr(Gm,{onnxjsBackend:()=>F1});var Uu,F1,Um=A(()=>{"use strict";Vm();Fm();Uu=class{async init(){}async createInferenceSessionHandler(e,n){let t=new _i(n);return typeof e=="string"?await t.loadModel(e):await t.loadModel(e),new wi(t)}},F1=new Uu});var vi=A(()=>{"use strict"});var qm={};pr(qm,{default:()=>G1});var Wm,Hm,G1,jm=A(()=>{"use strict";Wu();Bn();xi();Wm="ort-wasm-proxy-worker",Hm=globalThis.self?.name===Wm;Hm&&(self.onmessage=r=>{let{type:e,in:n}=r.data;try{switch(e){case"init-wasm":Ti(n.wasm).then(()=>{Ii(n).then(()=>{postMessage({type:e})},t=>{postMessage({type:e,err:t})})},t=>{postMessage({type:e,err:t})});break;case"init-ep":{let{epName:t,env:o}=n;Si(o,t).then(()=>{postMessage({type:e})},i=>{postMessage({type:e,err:i})});break}case"copy-from":{let{buffer:t}=n,o=to(t);postMessage({type:e,out:o});break}case"create":{let{model:t,options:o}=n;$i(t,o).then(i=>{postMessage({type:e,out:i})},i=>{postMessage({type:e,err:i})});break}case"release":Ai(n),postMessage({type:e});break;case"run":{let{sessionId:t,inputIndices:o,inputs:i,outputIndices:s,options:a}=n;Oi(t,o,i,s,new Array(s.length).fill(null),a).then(u=>{u.some(l=>l[3]!=="cpu")?postMessage({type:e,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:e,out:u},Ei([...i,...u]))},u=>{postMessage({type:e,err:u})});break}case"end-profiling":Pi(n),postMessage({type:e});break;default:}}catch(t){postMessage({type:e,err:t})}});G1=Hm?null:r=>new Worker(r??lt,{type:"module",name:Wm})});var Zm,U1,W1,lt,Di,Hu,H1,q1,Jm,j1,Km,Qm,Xm,Ym,xi=A(()=>{"use strict";vi();Zm=typeof location>"u"?void 0:location.origin,U1=import.meta.url>"file:"&&import.meta.url<"file;",W1=()=>{if(!!1){if(U1){let r=URL;return new URL(new r("ort.all.min.mjs",import.meta.url).href,Zm).href}return import.meta.url}},lt=W1(),Di=()=>{if(lt&&!lt.startsWith("blob:"))return lt.substring(0,lt.lastIndexOf("/")+1)},Hu=(r,e)=>{try{let n=e??lt;return(n?new URL(r,n):new URL(r)).origin===Zm}catch{return!1}},H1=(r,e)=>{let n=e??lt;try{return(n?new URL(r,n):new URL(r)).href}catch{return}},q1=(r,e)=>`${e??"./"}${r}`,Jm=async r=>{let n=await(await fetch(r,{credentials:"same-origin"})).blob();return URL.createObjectURL(n)},j1=async r=>(await import(/*webpackIgnore:true*/ /*@vite-ignore*/r)).default,Km=(jm(),kr(qm)).default,Qm=async()=>{if(!lt)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(Hu(lt))return[void 0,Km()];let r=await Jm(lt);return[r,Km(r)]},Xm=void 0,Ym=async(r,e,n,t)=>{let o=Xm&&!(r||e);if(o)if(lt)o=Hu(lt)||t&&!n;else if(t&&!n)o=!0;else throw new Error("cannot determine the script source URL.");if(o)return[void 0,Xm];{let i="ort-wasm-simd-threaded.jsep.mjs",s=r??H1(i,e),a=!!1&&n&&s&&!Hu(s,e),u=a?await Jm(s):s??q1(i,e);return[a?u:void 0,await j1(u)]}}});var qu,ju,Ci,eg,K1,X1,Z1,Ti,Te,Bn=A(()=>{"use strict";xi();ju=!1,Ci=!1,eg=!1,K1=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},X1=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},Z1=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,19,1,17,0,65,1,253,15,65,2,253,15,65,3,253,15,253,147,2,11]))}catch{return!1}},Ti=async r=>{if(ju)return Promise.resolve();if(Ci)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(eg)throw new Error("previous call to 'initializeWebAssembly()' failed.");Ci=!0;let e=r.initTimeout,n=r.numThreads;if(r.simd!==!1){if(r.simd==="relaxed"){if(!Z1())throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.")}else if(!X1())throw new Error("WebAssembly SIMD is not supported in the current environment.")}let t=K1();n>1&&!t&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+n+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),r.numThreads=n=1);let o=r.wasmPaths,i=typeof o=="string"?o:void 0,s=o?.mjs,a=s?.href??s,u=o?.wasm,l=u?.href??u,c=r.wasmBinary,[d,p]=await Ym(a,i,n>1,!!c||!!l),f=!1,h=[];if(e>0&&h.push(new Promise(m=>{setTimeout(()=>{f=!0,m()},e)})),h.push(new Promise((m,y)=>{let g={numThreads:n};if(c)g.wasmBinary=c,g.locateFile=b=>b;else if(l||i)g.locateFile=b=>l??i+b;else if(a&&a.indexOf("blob:")!==0)g.locateFile=b=>new URL(b,a).href;else if(d){let b=Di();b&&(g.locateFile=_=>b+_)}p(g).then(b=>{Ci=!1,ju=!0,qu=b,m(),d&&URL.revokeObjectURL(d)},b=>{Ci=!1,eg=!0,y(b)})})),await Promise.race(h),f)throw new Error(`WebAssembly backend initializing failed due to timeout: ${e}ms`)},Te=()=>{if(ju&&qu)return qu;throw new Error("WebAssembly is not initialized yet.")}});var ct,no,me,ki=A(()=>{"use strict";Bn();ct=(r,e)=>{let n=Te(),t=n.lengthBytesUTF8(r)+1,o=n._malloc(t);return n.stringToUTF8(r,o,t),e.push(o),o},no=(r,e,n,t)=>{if(typeof r=="object"&&r!==null){if(n.has(r))throw new Error("Circular reference in options");n.add(r)}Object.entries(r).forEach(([o,i])=>{let s=e?e+o:o;if(typeof i=="object")no(i,s+".",n,t);else if(typeof i=="string"||typeof i=="number")t(s,i.toString());else if(typeof i=="boolean")t(s,i?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof i}`)})},me=r=>{let e=Te(),n=e.stackSave();try{let t=e.PTR_SIZE,o=e.stackAlloc(2*t);e._OrtGetLastError(o,o+t);let i=Number(e.getValue(o,t===4?"i32":"i64")),s=e.getValue(o+t,"*"),a=s?e.UTF8ToString(s):"";throw new Error(`${r} ERROR_CODE: ${i}, ERROR_MESSAGE: ${a}`)}finally{e.stackRestore(n)}}});var tg,ng=A(()=>{"use strict";Bn();ki();tg=r=>{let e=Te(),n=0,t=[],o=r||{};try{if(r?.logSeverityLevel===void 0)o.logSeverityLevel=2;else if(typeof r.logSeverityLevel!="number"||!Number.isInteger(r.logSeverityLevel)||r.logSeverityLevel<0||r.logSeverityLevel>4)throw new Error(`log severity level is not valid: ${r.logSeverityLevel}`);if(r?.logVerbosityLevel===void 0)o.logVerbosityLevel=0;else if(typeof r.logVerbosityLevel!="number"||!Number.isInteger(r.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${r.logVerbosityLevel}`);r?.terminate===void 0&&(o.terminate=!1);let i=0;return r?.tag!==void 0&&(i=ct(r.tag,t)),n=e._OrtCreateRunOptions(o.logSeverityLevel,o.logVerbosityLevel,!!o.terminate,i),n===0&&me("Can't create run options."),r?.extra!==void 0&&no(r.extra,"",new WeakSet,(s,a)=>{let u=ct(s,t),l=ct(a,t);e._OrtAddRunConfigEntry(n,u,l)!==0&&me(`Can't set a run config entry: ${s} - ${a}.`)}),[n,t]}catch(i){throw n!==0&&e._OrtReleaseRunOptions(n),t.forEach(s=>e._free(s)),i}}});var J1,Q1,Y1,$r,eS,rg,og=A(()=>{"use strict";Bn();ki();J1=r=>{switch(r){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"layout":return 3;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${r}`)}},Q1=r=>{switch(r){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${r}`)}},Y1=r=>{r.extra||(r.extra={}),r.extra.session||(r.extra.session={});let e=r.extra.session;e.use_ort_model_bytes_directly||(e.use_ort_model_bytes_directly="1"),r.executionProviders&&r.executionProviders.some(n=>(typeof n=="string"?n:n.name)==="webgpu")&&(r.enableMemPattern=!1)},$r=(r,e,n,t)=>{let o=ct(e,t),i=ct(n,t);Te()._OrtAddSessionConfigEntry(r,o,i)!==0&&me(`Can't set a session config entry: ${e} - ${n}.`)},eS=async(r,e,n)=>{let t=e.executionProviders;for(let o of t){let i=typeof o=="string"?o:o.name,s=[];switch(i){case"webnn":if(i="WEBNN",$r(r,"session.disable_quant_qdq","1",n),$r(r,"session.disable_qdq_constant_folding","1",n),typeof o!="string"){let p=o?.deviceType;p&&$r(r,"deviceType",p,n)}break;case"webgpu":if(i="JS",typeof o!="string"){let d=o;if(d?.preferredLayout){if(d.preferredLayout!=="NCHW"&&d.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${d.preferredLayout}`);$r(r,"preferredLayout",d.preferredLayout,n)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${i}`)}let a=ct(i,n),u=s.length,l=0,c=0;if(u>0){l=Te()._malloc(u*Te().PTR_SIZE),n.push(l),c=Te()._malloc(u*Te().PTR_SIZE),n.push(c);for(let d=0;d<u;d++)Te().setValue(l+d*Te().PTR_SIZE,s[d][0],"*"),Te().setValue(c+d*Te().PTR_SIZE,s[d][1],"*")}await Te()._OrtAppendExecutionProvider(r,a,l,c,u)!==0&&me(`Can't append execution provider: ${i}.`)}},rg=async r=>{let e=Te(),n=0,t=[],o=r||{};Y1(o);try{let i=J1(o.graphOptimizationLevel??"all"),s=Q1(o.executionMode??"sequential"),a=typeof o.logId=="string"?ct(o.logId,t):0,u=o.logSeverityLevel??2;if(!Number.isInteger(u)||u<0||u>4)throw new Error(`log severity level is not valid: ${u}`);let l=o.logVerbosityLevel??0;if(!Number.isInteger(l)||l<0||l>4)throw new Error(`log verbosity level is not valid: ${l}`);let c=typeof o.optimizedModelFilePath=="string"?ct(o.optimizedModelFilePath,t):0;if(n=e._OrtCreateSessionOptions(i,!!o.enableCpuMemArena,!!o.enableMemPattern,s,!!o.enableProfiling,0,a,u,l,c),n===0&&me("Can't create session options."),o.executionProviders&&await eS(n,o,t),o.enableGraphCapture!==void 0){if(typeof o.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${o.enableGraphCapture}`);$r(n,"enableGraphCapture",o.enableGraphCapture.toString(),t)}if(o.freeDimensionOverrides)for(let[d,p]of Object.entries(o.freeDimensionOverrides)){if(typeof d!="string")throw new Error(`free dimension override name must be a string: ${d}`);if(typeof p!="number"||!Number.isInteger(p)||p<0)throw new Error(`free dimension override value must be a non-negative integer: ${p}`);let f=ct(d,t);e._OrtAddFreeDimensionOverride(n,f,p)!==0&&me(`Can't set a free dimension override: ${d} - ${p}.`)}return o.extra!==void 0&&no(o.extra,"",new WeakSet,(d,p)=>{$r(n,d,p,t)}),[n,t]}catch(i){throw n!==0&&e._OrtReleaseSessionOptions(n)!==0&&me("Can't release session options."),t.forEach(s=>e._free(s)),i}}});var Mn,mn,Vn,Ar,ro,Li,Ni,Ku,ee=A(()=>{"use strict";Mn=r=>{switch(r){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${r}`)}},mn=r=>{switch(r){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${r}`)}},Vn=(r,e)=>{let n=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][r],t=typeof e=="number"?e:e.reduce((o,i)=>o*i,1);return n>0?Math.ceil(t*n):void 0},Ar=r=>{switch(r){case"float16":return typeof Float16Array<"u"?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${r}`)}},ro=r=>{switch(r){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${r}`)}},Li=r=>r==="float32"||r==="float16"||r==="int32"||r==="int64"||r==="uint32"||r==="uint8"||r==="bool"||r==="uint4"||r==="int4",Ni=r=>r==="float32"||r==="float16"||r==="int32"||r==="int64"||r==="uint32"||r==="uint64"||r==="int8"||r==="uint8"||r==="bool"||r==="uint4"||r==="int4",Ku=r=>{switch(r){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;case"ml-tensor":return 5;default:throw new Error(`unsupported data location: ${r}`)}}});var oo,Xu=A(()=>{"use strict";vi();oo=async r=>{if(typeof r=="string")if(!1)try{let{readFile:e}=dr("node:fs/promises");return new Uint8Array(await e(r))}catch(e){if(e.code==="ERR_FS_FILE_TOO_LARGE"){let{createReadStream:n}=dr("node:fs"),t=n(r),o=[];for await(let i of t)o.push(i);return new Uint8Array(Buffer.concat(o))}throw e}else{let e=await fetch(r);if(!e.ok)throw new Error(`failed to load external data file: ${r}`);let n=e.headers.get("Content-Length"),t=n?parseInt(n,10):0;if(t<1073741824)return new Uint8Array(await e.arrayBuffer());{if(!e.body)throw new Error(`failed to load external data file: ${r}, no response body.`);let o=e.body.getReader(),i;try{i=new ArrayBuffer(t)}catch(a){if(a instanceof RangeError){let u=Math.ceil(t/65536);i=new WebAssembly.Memory({initial:u,maximum:u}).buffer}else throw a}let s=0;for(;;){let{done:a,value:u}=await o.read();if(a)break;let l=u.byteLength;new Uint8Array(i,s,l).set(u),s+=l}return new Uint8Array(i,0,t)}}else return r instanceof Blob?new Uint8Array(await r.arrayBuffer()):r instanceof Uint8Array?r:new Uint8Array(r)}});var tS,nS,ig,sg,Ri,rS,le,gn=A(()=>{"use strict";ee();tS=["V","I","W","E","F"],nS=(r,e)=>{console.log(`[${tS[r]},${new Date().toISOString()}]${e}`)},Ri=(r,e)=>{ig=r,sg=e},rS=(r,e)=>{let n=ro(r),t=ro(ig);n>=t&&nS(n,typeof e=="function"?e():e)},le=(...r)=>{sg&&rS(...r)}});var Zu,bn,$,ir,zi,ag,ug,oe=A(()=>{"use strict";Zu=class{static calcMatMulShape(e,n){return e[1]!==n[0]?void 0:[e[0],n[1]]}},bn=class{static calcShape(e,n,t=!1){let o=e.length,i=n.length;if(o===0)return n;if(i===0)return e;let s=Math.max(e.length,n.length),a=new Array(s);if(t){if(o<2||i<2)return;let u=Zu.calcMatMulShape([e[o-2],e[o-1]],[n[i-2],n[i-1]]);if(u===void 0)return;[a[s-2],a[s-1]]=u}for(let u=t?3:1;u<=s;u++){let l=o-u<0?1:e[o-u],c=i-u<0?1:n[i-u];if(l!==c&&l>1&&c>1)return;let d=Math.max(l,c);if(l&&c)a[s-u]=Math.max(l,c);else{if(d>1)return;a[s-u]=0}}return a}static isValidBroadcast(e,n){let t=e.length,o=n.length;if(t>o)return!1;for(let i=1;i<=t;i++)if(e[t-i]!==1&&e[t-i]!==n[o-i])return!1;return!0}},$=class r{static size(e){return r.getSizeFromDimensionRange(e,0,e.length)}static convertShape(e,n=4){let t=e.length;if(t===0)return[];let o=new Array(t),i=t-1;for(;i>=0;){if(e[i]%n===0){o[i]=e[i]/n;break}if(n%e[i]!==0)throw new Error("cannot convert shape");o[i]=1,n/=e[i],i--}for(i--;i>=0;i--)o[i]=e[i];return o}static sizeFromDimension(e,n){if(n<0||n>e.length)throw new Error(`invalid dimension of ${n} for sizeFromDimension as Tensor has ${e.length} dimensions.`);return r.getSizeFromDimensionRange(e,n,e.length)}static sizeToDimension(e,n){if(n<0||n>e.length)throw new Error(`invalid dimension of ${n} for sizeToDimension as Tensor has ${e.length} dimensions.`);return r.getSizeFromDimensionRange(e,0,n)}static getSizeFromDimensionRange(e,n,t){let o=1;for(let i=n;i<t;i++){if(e[i]<0)throw new Error("cannot get valid size from specified dimension range. Most likely the range contains negative values in them.");o*=Number(e[i])}return o}static computeStrides(e){let n=e.length;if(n===0)return[];if(n===1)return[1];let t=new Array(n);t[n-1]=1,t[n-2]=e[n-1];for(let o=n-3;o>=0;--o)t[o]=t[o+1]*e[o+1];return t}static normalizeAxis(e,n){if(e<-n&&e>=n)throw new Error("unsupported axis for this operation.");return e<0?e+n:e}static normalizeAxes(e,n){return e.map(t=>this.normalizeAxis(t,n??e.length))}static sortBasedOnPerm(e,n){return n?n.map(t=>e[t]):e.slice().reverse()}static padShape(e,n){let t=e.length;return e.map((o,i)=>o+n[i]+n[i+t])}static areEqual(e,n){return e.length!==n.length?!1:e.every((t,o)=>t===n[o])}},ir=class r{static adjustPoolAttributes(e,n,t,o,i,s){if(!e&&t.length!==n.length-2)throw new Error("length of specified kernel shapes should be 2 less than length of input dimensions");if(e)for(let a=0;a<n.length-2;a++)a>=t.length?t.push(n[a+2]):t[a]=n[a+2];for(let a=0;a<t.length;a++)if(a<o.length){if(o[a]<0)throw new Error("strides should be greater than or equal to 1")}else o.push(1);for(let a=0;a<t.length;a++)if(a<i.length){if(i[a]<0)throw new Error("dilations should be greater than or equal to 1")}else i.push(1);for(let a=0;a<t.length*2;a++)if(a<s.length){if(s[a]<0)throw new Error("pad should be greater than or equal to 1")}else s.push(0);for(let a=0;a<t.length;a++){if(t[a]<=0)throw new Error("kernel shapes need to be greater than 0");if(s[a]>=t[a]||s[a+t.length]>=t[a])throw new Error("pads should be smaller than kernel")}}static adjustPadsBasedOnAutoPad(e,n,t,o,i,s,a){if(a){if(i.length!==2*(e.length-2))throw new Error("length of pads should be twice the length of data dimensions");if(n.length!==e.length-2)throw new Error("length of strides should be the length of data dimensions");if(o.length!==e.length-2)throw new Error("length of kernel shapes should be the length of data dimensions");for(let u=0;u<e.length-2;u++)r.adjustPadAndReturnShape(e[u+(s?1:2)],n[u],t[u],o[u],i,u,u+e.length-2,a)}}static computePoolOutputShape(e,n,t,o,i,s,a,u=0){if(n.length<=0)throw new Error("input shape must be of size greater than 0");let l=[n[0],n[1]];return r.computeShapeHelper(e,n,l,t,o,i,s,a,u),l}static computeConvOutputShape(e,n,t,o,i,s,a){if(e.length<=0||n.length<=0)throw new Error("invalid input tensor dims or invalid filter tensor dims");let u=[e[0],n[0]];return r.computeShapeHelper(!1,e,u,t,o,i,s,a),u}static computeShapeHelper(e,n,t,o,i,s,a,u,l=0){if(e)for(let c=0;c<n.length-2;c++)t.push(1);else for(let c=0;c<n.length-2;c++)t.push(r.adjustPadAndReturnShape(n[c+2],o[c],i[c],s[c],a,c,c+n.length-2,u,l))}static computeOutputSize(e,n,t,o,i){let s=Math.floor(e/n)+1;return i===1&&(s=Math.ceil(e/n)+1,(s-1)*n>=t+o&&(s-=1)),s}static adjustPadAndReturnShape(e,n,t,o,i,s,a,u,l=0){let c=t*(o-1)+1;if(u&&u!=="NOTSET")switch(u){case"VALID":return i[s]=0,i[a]=0,r.computeOutputSize(e-c,n,e,0,l);case"SAME_LOWER":case"SAME_UPPER":if(t!==1)throw new Error("Dilation not supported for SAME_UPPER or SAME_LOWER");{let p=(Math.floor((e+n-1)/n)-1)*n+o-e;return i[s]=Math.floor(u==="SAME_LOWER"?(p+1)/2:p/2),i[a]=p-i[s],r.computeOutputSize(e+i[s]+i[a]-c,n,e,i[s],l)}default:throw new Error("Unsupported AutoPad type")}else return r.computeOutputSize(e+i[s]+i[a]-c,n,e,i[s],l)}},zi=class{static getShapeOfGemmResult(e,n,t,o,i){if(e.length!==2||t.length!==2)throw new Error("shape need to be of size 2");let s,a,u;n?(s=e[1],a=e[0]):(s=e[0],a=e[1]);let l=-1;if(o?(u=t[0],l=1):(u=t[1],l=0),t[l]!==a)throw new Error("dimension mismatch");if(s<=0||u<=0||a<=0)throw new Error("invalid shape specified");if(i&&!bn.isValidBroadcast(i,[s,u]))throw new Error("gemm: invalid bias shape for broadcast");return[s,u,a]}},ag=-34028234663852886e22,ug=34028234663852886e22});var Bi,Ju=A(()=>{"use strict";ee();Bi=(r,e)=>new(Ar(e))(r)});var cg,oS,dg,iS,lg,sS,pg,Mi,Vi,Qu,fg,hg=A(()=>{"use strict";ee();gn();cg=new Map([["float32",32],["float16",16],["int32",32],["uint32",32],["int64",64],["uint64",64],["int8",8],["uint8",8],["int4",4],["uint4",4]]),oS=(r,e)=>{if(e==="int32")return r;let n=cg.get(e);if(!n)throw new Error(`WebNN backend does not support data type: ${e}`);let t=n/8;if(r.byteLength%t!==0)throw new Error(`Invalid Uint8Array length - must be a multiple of ${t}.`);let o=r.byteLength/t,i=new(Ar(e))(r.buffer,r.byteOffset,o);switch(e){case"int64":case"uint64":{let s=new Int32Array(o);for(let a=0;a<o;a++){let u=i[a];if(u>2147483647n||u<-2147483648n)throw new Error("Can not convert int64 data to int32 - value out of range.");s[a]=Number(u)}return new Uint8Array(s.buffer)}case"int8":case"uint8":case"uint32":{if(e==="uint32"&&i.some(a=>a>2147483647))throw new Error("Can not convert uint32 data to int32 - value out of range.");let s=Int32Array.from(i,Number);return new Uint8Array(s.buffer)}default:throw new Error(`Unsupported data conversion from ${e} to 'int32'`)}},dg=(r,e)=>{if(e==="int32")return r;if(r.byteLength%4!==0)throw new Error("Invalid Uint8Array length - must be a multiple of 4 (int32).");let n=r.byteLength/4,t=new Int32Array(r.buffer,r.byteOffset,n);switch(e){case"int64":{let o=BigInt64Array.from(t,BigInt);return new Uint8Array(o.buffer)}case"uint64":{if(t.some(i=>i<0))throw new Error("Can not convert int32 data to uin64 - negative value found.");let o=BigUint64Array.from(t,BigInt);return new Uint8Array(o.buffer)}case"int8":{if(t.some(i=>i<-128||i>127))throw new Error("Can not convert int32 data to int8 - value out of range.");let o=Int8Array.from(t,Number);return new Uint8Array(o.buffer)}case"uint8":{if(t.some(o=>o<0||o>255))throw new Error("Can not convert int32 data to uint8 - value out of range.");return Uint8Array.from(t,Number)}case"uint32":{if(t.some(i=>i<0))throw new Error("Can not convert int32 data to uint32 - negative value found.");let o=Uint32Array.from(t,Number);return new Uint8Array(o.buffer)}default:throw new Error(`Unsupported data conversion from 'int32' to ${e}`)}},iS=1,lg=()=>iS++,sS=new Map([["int8","int32"],["uint8","int32"],["uint32","int32"],["int64","int32"]]),pg=(r,e)=>{let n=cg.get(r);if(!n)throw new Error(`WebNN backend does not support data type: ${r}`);return e.length>0?Math.ceil(e.reduce((t,o)=>t*o)*n/8):0},Mi=class{constructor(e){this.isDataConverted=!1;let{sessionId:n,context:t,tensor:o,dataType:i,shape:s,fallbackDataType:a}=e;this.sessionId=n,this.mlContext=t,this.mlTensor=o,this.dataType=i,this.tensorShape=s,this.fallbackDataType=a}get tensor(){return this.mlTensor}get type(){return this.dataType}get fallbackType(){return this.fallbackDataType}get shape(){return this.tensorShape}get byteLength(){return pg(this.dataType,this.tensorShape)}destroy(){le("verbose",()=>"[WebNN] TensorWrapper.destroy"),this.mlTensor.destroy()}write(e){this.mlContext.writeTensor(this.mlTensor,e)}async read(e){if(this.fallbackDataType){let n=await this.mlContext.readTensor(this.mlTensor),t=dg(new Uint8Array(n),this.dataType);if(e){(e instanceof ArrayBuffer?new Uint8Array(e):new Uint8Array(e.buffer,e.byteOffset,e.byteLength)).set(t);return}else return new Uint8Array(t).buffer}else return e?this.mlContext.readTensor(this.mlTensor,e):this.mlContext.readTensor(this.mlTensor)}canReuseTensor(e,n,t){return this.mlContext===e&&this.dataType===n&&this.tensorShape.length===t.length&&this.tensorShape.every((o,i)=>o===t[i])}setIsDataConverted(e){this.isDataConverted=e}},Vi=class{constructor(e,n){this.tensorManager=e;this.wrapper=n}get tensorWrapper(){return this.wrapper}releaseTensor(){this.tensorWrapper&&(this.tensorManager.releaseTensor(this.tensorWrapper),this.wrapper=void 0)}async ensureTensor(e,n,t,o){let i=this.tensorManager.getMLContext(e),s=this.tensorManager.getMLOpSupportLimits(e),a;if(!s?.input.dataTypes.includes(n)){if(a=sS.get(n),!a||!s?.input.dataTypes.includes(a))throw new Error(`WebNN backend does not support data type: ${n}`);le("verbose",()=>`[WebNN] TensorIdTracker.ensureTensor: fallback dataType from ${n} to ${a}`)}if(this.wrapper){if(this.wrapper.canReuseTensor(i,n,t))return this.wrapper.tensor;if(o){if(this.wrapper.byteLength!==pg(n,t))throw new Error("Unable to copy data to tensor with different size.");this.activeUpload=new Uint8Array(await this.wrapper.read())}this.tensorManager.releaseTensor(this.wrapper)}let u=typeof MLTensorUsage>"u"?void 0:MLTensorUsage.READ|MLTensorUsage.WRITE;return this.wrapper=await this.tensorManager.getCachedTensor(e,n,t,u,!0,!0,a),o&&this.activeUpload&&(this.wrapper.write(this.activeUpload),this.activeUpload=void 0),this.wrapper.tensor}upload(e){let n=e;if(this.wrapper){if(this.wrapper.fallbackType)if(this.wrapper.fallbackType==="int32")n=oS(e,this.wrapper.type),this.wrapper.setIsDataConverted(!0);else throw new Error(`Unsupported fallback data type: ${this.wrapper.fallbackType}`);if(e.byteLength===this.wrapper.byteLength){this.wrapper.write(n);return}else le("verbose",()=>"Data size does not match tensor size. Releasing tensor."),this.releaseTensor()}this.activeUpload?this.activeUpload.set(n):this.activeUpload=new Uint8Array(n)}async download(e){if(this.activeUpload){let n=this.wrapper?.isDataConverted?dg(this.activeUpload,this.wrapper?.type):this.activeUpload;if(e){e instanceof ArrayBuffer?new Uint8Array(e).set(n):new Uint8Array(e.buffer,e.byteOffset,e.byteLength).set(n);return}else return n.buffer}if(!this.wrapper)throw new Error("Tensor has not been created.");return e?this.wrapper.read(e):this.wrapper.read()}},Qu=class{constructor(e){this.backend=e;this.tensorTrackersById=new Map;this.freeTensors=[];this.externalTensors=new Set}getMLContext(e){let n=this.backend.getMLContext(e);if(!n)throw new Error("MLContext not found for session.");return n}getMLOpSupportLimits(e){return this.backend.getMLOpSupportLimits(e)}reserveTensorId(){let e=lg();return this.tensorTrackersById.set(e,new Vi(this)),e}releaseTensorId(e){let n=this.tensorTrackersById.get(e);n&&(this.tensorTrackersById.delete(e),n.tensorWrapper&&this.releaseTensor(n.tensorWrapper))}async ensureTensor(e,n,t,o,i){le("verbose",()=>`[WebNN] TensorManager.ensureTensor {tensorId: ${n}, dataType: ${t}, shape: ${o}, copyOld: ${i}}`);let s=this.tensorTrackersById.get(n);if(!s)throw new Error("Tensor not found.");return s.ensureTensor(e,t,o,i)}upload(e,n){let t=this.tensorTrackersById.get(e);if(!t)throw new Error("Tensor not found.");t.upload(n)}async download(e,n){le("verbose",()=>`[WebNN] TensorManager.download {tensorId: ${e}, dstBuffer: ${n?.byteLength}}`);let t=this.tensorTrackersById.get(e);if(!t)throw new Error("Tensor not found.");return t.download(n)}releaseTensorsForSession(e){for(let n of this.freeTensors)n.sessionId===e&&n.destroy();this.freeTensors=this.freeTensors.filter(n=>n.sessionId!==e)}registerTensor(e,n,t,o){let i=this.getMLContext(e),s=lg(),a=new Mi({sessionId:e,context:i,tensor:n,dataType:t,shape:o});return this.tensorTrackersById.set(s,new Vi(this,a)),this.externalTensors.add(a),s}async getCachedTensor(e,n,t,o,i,s,a){let u=this.getMLContext(e);for(let[c,d]of this.freeTensors.entries())if(d.canReuseTensor(u,n,t)){le("verbose",()=>`[WebNN] Reusing tensor {dataType: ${n}, ${a?`fallbackDataType: ${a},`:""} shape: ${t}`);let p=this.freeTensors.splice(c,1)[0];return p.sessionId=e,p}le("verbose",()=>`[WebNN] MLContext.createTensor {dataType: ${n}, ${a?`fallbackDataType: ${a},`:""} shape: ${t}}`);let l=await u.createTensor({dataType:a??n,shape:t,dimensions:t,usage:o,writable:i,readable:s});return new Mi({sessionId:e,context:u,tensor:l,dataType:n,shape:t,fallbackDataType:a})}releaseTensor(e){this.externalTensors.has(e)&&this.externalTensors.delete(e),this.freeTensors.push(e)}},fg=(...r)=>new Qu(...r)});var Fi,aS,Gi,mg=A(()=>{"use strict";ee();Bn();Ju();hg();gn();Fi=new Map([[1,"float32"],[10,"float16"],[6,"int32"],[12,"uint32"],[7,"int64"],[13,"uint64"],[22,"int4"],[21,"uint4"],[3,"int8"],[2,"uint8"],[9,"uint8"]]),aS=(r,e)=>{if(r===e)return!0;if(r===void 0||e===void 0)return!1;let n=Object.keys(r).sort(),t=Object.keys(e).sort();return n.length===t.length&&n.every((o,i)=>o===t[i]&&r[o]===e[o])},Gi=class{constructor(e){this.tensorManager=fg(this);this.mlContextBySessionId=new Map;this.sessionIdsByMLContext=new Map;this.mlContextCache=[];this.sessionGraphInputs=new Map;this.sessionGraphOutputs=new Map;this.temporaryGraphInputs=[];this.temporaryGraphOutputs=[];this.temporarySessionTensorIds=new Map;this.mlOpSupportLimitsBySessionId=new Map;Ri(e.logLevel,!!e.debug)}get currentSessionId(){if(this.activeSessionId===void 0)throw new Error("No active session");return this.activeSessionId}onRunStart(e){le("verbose",()=>`[WebNN] onRunStart {sessionId: ${e}}`),this.activeSessionId=e}onRunEnd(e){le("verbose",()=>`[WebNN] onRunEnd {sessionId: ${e}}`);let n=this.temporarySessionTensorIds.get(e);if(n){for(let t of n)le("verbose",()=>`[WebNN] releasing temporary tensor {tensorId: ${t}}`),this.tensorManager.releaseTensorId(t);this.temporarySessionTensorIds.delete(e),this.activeSessionId=void 0}}async createMLContext(e){if(e instanceof GPUDevice){let t=this.mlContextCache.findIndex(o=>o.gpuDevice===e);if(t!==-1)return this.mlContextCache[t].mlContext;{let o=await navigator.ml.createContext(e);return this.mlContextCache.push({gpuDevice:e,mlContext:o}),o}}else if(e===void 0){let t=this.mlContextCache.findIndex(o=>o.options===void 0&&o.gpuDevice===void 0);if(t!==-1)return this.mlContextCache[t].mlContext;{let o=await navigator.ml.createContext();return this.mlContextCache.push({mlContext:o}),o}}let n=this.mlContextCache.findIndex(t=>aS(t.options,e));if(n!==-1)return this.mlContextCache[n].mlContext;{let t=await navigator.ml.createContext(e);return this.mlContextCache.push({options:e,mlContext:t}),t}}registerMLContext(e,n){this.mlContextBySessionId.set(e,n);let t=this.sessionIdsByMLContext.get(n);t||(t=new Set,this.sessionIdsByMLContext.set(n,t)),t.add(e),this.mlOpSupportLimitsBySessionId.has(e)||this.mlOpSupportLimitsBySessionId.set(e,n.opSupportLimits()),this.temporaryGraphInputs.length>0&&(this.sessionGraphInputs.set(e,this.temporaryGraphInputs),this.temporaryGraphInputs=[]),this.temporaryGraphOutputs.length>0&&(this.sessionGraphOutputs.set(e,this.temporaryGraphOutputs),this.temporaryGraphOutputs=[])}onReleaseSession(e){this.sessionGraphInputs.delete(e),this.sessionGraphOutputs.delete(e);let n=this.mlContextBySessionId.get(e);if(!n)return;this.tensorManager.releaseTensorsForSession(e),this.mlContextBySessionId.delete(e),this.mlOpSupportLimitsBySessionId.delete(e);let t=this.sessionIdsByMLContext.get(n);if(t.delete(e),t.size===0){this.sessionIdsByMLContext.delete(n);let o=this.mlContextCache.findIndex(i=>i.mlContext===n);o!==-1&&this.mlContextCache.splice(o,1)}}getMLContext(e){return this.mlContextBySessionId.get(e)}getMLOpSupportLimits(e){return this.mlOpSupportLimitsBySessionId.get(e)}reserveTensorId(){return this.tensorManager.reserveTensorId()}releaseTensorId(e){le("verbose",()=>`[WebNN] releaseTensorId {tensorId: ${e}}`),this.tensorManager.releaseTensorId(e)}async ensureTensor(e,n,t,o,i){let s=Fi.get(t);if(!s)throw new Error(`Unsupported ONNX data type: ${t}`);return this.tensorManager.ensureTensor(e??this.currentSessionId,n,s,o,i)}async createTemporaryTensor(e,n,t){le("verbose",()=>`[WebNN] createTemporaryTensor {onnxDataType: ${n}, shape: ${t}}`);let o=Fi.get(n);if(!o)throw new Error(`Unsupported ONNX data type: ${n}`);let i=this.tensorManager.reserveTensorId();await this.tensorManager.ensureTensor(e,i,o,t,!1);let s=this.temporarySessionTensorIds.get(e);return s?s.push(i):this.temporarySessionTensorIds.set(e,[i]),i}uploadTensor(e,n){if(!Te().shouldTransferToMLTensor)throw new Error("Trying to upload to a MLTensor while shouldTransferToMLTensor is false");le("verbose",()=>`[WebNN] uploadTensor {tensorId: ${e}, data: ${n.byteLength}}`),this.tensorManager.upload(e,n)}async downloadTensor(e,n){return this.tensorManager.download(e,n)}createMLTensorDownloader(e,n){return async()=>{let t=await this.tensorManager.download(e);return Bi(t,n)}}registerMLTensor(e,n,t,o){let i=Fi.get(t);if(!i)throw new Error(`Unsupported ONNX data type: ${t}`);let s=this.tensorManager.registerTensor(e,n,i,o);return le("verbose",()=>`[WebNN] registerMLTensor {tensor: ${n}, dataType: ${i}, dimensions: ${o}} -> {tensorId: ${s}}`),s}registerGraphInput(e){this.temporaryGraphInputs.push(e)}registerGraphOutput(e){this.temporaryGraphOutputs.push(e)}isGraphInput(e,n){let t=this.sessionGraphInputs.get(e);return t?t.includes(n):!1}isGraphOutput(e,n){let t=this.sessionGraphOutputs.get(e);return t?t.includes(n):!1}isGraphInputOutputTypeSupported(e,n,t=!0){let o=Fi.get(Mn(n)),i=this.mlOpSupportLimitsBySessionId.get(e);return typeof o>"u"?!1:t?!!i?.input.dataTypes.includes(o):!!i?.output.dataTypes.includes(o)}flush(){}}});var Ui=A(()=>{"use strict"});var gg,Yu,el,uS,lS,bg,nl,tl,_g,wg=A(()=>{"use strict";gn();Ui();gg=new Map([[64,250],[128,200],[256,200],[512,200],[2048,230],[4096,200],[8192,50],[16384,50],[32768,50],[65536,50],[131072,50],[262144,50],[524288,50],[1048576,50],[2097152,30],[4194304,20],[8388608,10],[12582912,10],[16777216,10],[26214400,15],[33554432,22],[44236800,2],[58982400,6],[67108864,6],[134217728,6],[167772160,6]]),Yu=[],el=r=>Math.ceil(Number(r)/16)*16,uS=r=>{for(let e=0;e<Yu.length;e++){let n=Yu[e];if(r<=n)return n}return Math.ceil(r/16)*16},lS=1,bg=()=>lS++,nl=async(r,e,n,t)=>{let o=el(n),i=r.device.createBuffer({size:o,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let s=r.getCommandEncoder();r.endComputePass(),s.copyBufferToBuffer(e,0,i,0,o),r.flush(),await i.mapAsync(GPUMapMode.READ);let a=i.getMappedRange();if(t){let u=t();return u.set(new Uint8Array(a,0,n)),u}else return new Uint8Array(a.slice(0,n))}finally{i.destroy()}},tl=class{constructor(e){this.backend=e;this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.buffersPending=[],this.capturedPendingBuffers=new Map;for(let[n]of gg)Yu.push(n),this.freeBuffers.set(n,[]),this.freeUniformBuffers.set(n,[]);this.sessionCount=0}upload(e,n){let t=n.buffer,o=n.byteOffset,i=n.byteLength,s=el(i),a=this.storageCache.get(e);if(!a)throw new Error("gpu data for uploading does not exist");if(Number(a.originalSize)!==i)throw new Error(`inconsistent data size. gpu data size=${a.originalSize}, data size=${i}`);if(s===i&&o%4===0)this.backend.device.queue.writeBuffer(a.gpuData.buffer,0,t,o,i);else{let u=new Uint8Array(s);u.set(n),this.backend.device.queue.writeBuffer(a.gpuData.buffer,0,u,0,s)}le("verbose",()=>`[WebGPU] GpuDataManager.upload(id=${e})`)}memcpy(e,n){let t=this.storageCache.get(e);if(!t)throw new Error("source gpu data for memcpy does not exist");let o=this.storageCache.get(n);if(!o)throw new Error("destination gpu data for memcpy does not exist");if(t.originalSize!==o.originalSize)throw new Error("inconsistent source and destination gpu data size");let i=el(t.originalSize),s=this.backend.getCommandEncoder();this.backend.endComputePass(),s.copyBufferToBuffer(t.gpuData.buffer,0,o.gpuData.buffer,0,i)}registerExternalBuffer(e,n,t){let o;if(t){if(o=t[0],e===t[1])return le("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${n}) => id=${o}, buffer is the same, skip.`),o;if(this.backend.capturedCommandList.has(this.backend.currentSessionId))throw new Error(`Registering a different external buffer under graph capture mode is not supported yet.
             Please use the previous external buffer!`)}else o=bg();return this.storageCache.set(o,{gpuData:{id:o,type:0,buffer:e},originalSize:n}),le("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${n}) => id=${o}, registered.`),o}unregisterExternalBuffer(e){e!==void 0&&(this.storageCache.delete(e),le("verbose",()=>`[WebGPU] GpuDataManager.unregisterExternalBuffer() => id=${e}`))}create(e,n=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST){let t=uS(e),o,i=(n&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE,s=(n&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM;if(i||s){let l=(i?this.freeBuffers:this.freeUniformBuffers).get(t);l?l.length>0?o=l.pop():o=this.backend.device.createBuffer({size:t,usage:n}):o=this.backend.device.createBuffer({size:t,usage:n})}else o=this.backend.device.createBuffer({size:t,usage:n});let a={id:bg(),type:0,buffer:o};return this.storageCache.set(a.id,{gpuData:a,originalSize:Number(e)}),le("verbose",()=>`[WebGPU] GpuDataManager.create(size=${e}) => id=${a.id}`),a}get(e){return this.storageCache.get(e)?.gpuData}release(e){let n=typeof e=="bigint"?Number(e):e,t=this.storageCache.get(n);if(!t){if(this.storageCache.size===0)return 0;throw new Error("releasing data does not exist")}return le("verbose",()=>`[WebGPU] GpuDataManager.release(id=${n}), gpuDataId=${t.gpuData.id}`),this.storageCache.delete(n),this.buffersPending.push(t.gpuData.buffer),t.originalSize}async download(e,n){let t=this.storageCache.get(Number(e));if(!t)throw new Error("data does not exist");await nl(this.backend,t.gpuData.buffer,t.originalSize,n)}refreshPendingBuffers(){if(this.buffersPending.length!==0)if(this.backend.sessionStatus==="default"){for(let e of this.buffersPending){let n=gg.get(e.size);if((e.usage&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE){let t=this.freeBuffers.get(e.size)||[];n===void 0||t.length>=n?e.destroy():t.push(e)}else if((e.usage&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM){let t=this.freeUniformBuffers.get(e.size)||[];n===void 0||t.length>=n?e.destroy():t.push(e)}else e.destroy()}this.buffersPending=[]}else{let e=this.capturedPendingBuffers.get(this.backend.currentSessionId);e||(e=[],this.capturedPendingBuffers.set(this.backend.currentSessionId,e));for(let n of this.buffersPending)e.push(n);this.buffersPending=[]}}dispose(){this.freeBuffers.forEach(e=>{e.forEach(n=>{n.destroy()})}),this.freeUniformBuffers.forEach(e=>{e.forEach(n=>{n.destroy()})}),this.storageCache.forEach(e=>{e.gpuData.buffer.destroy()}),this.capturedPendingBuffers.forEach(e=>{e.forEach(n=>{n.destroy()})}),this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.capturedPendingBuffers=new Map}onCreateSession(){this.sessionCount+=1}onReleaseSession(e){let n=this.capturedPendingBuffers.get(e);n&&(n.forEach(t=>{t.destroy()}),this.capturedPendingBuffers.delete(e)),this.sessionCount-=1,this.sessionCount===0&&(le("warning",()=>"[WebGPU] Clearing webgpu buffer cache"),this.storageCache.forEach(t=>{t.gpuData.buffer.destroy()}),this.storageCache=new Map)}},_g=(...r)=>new tl(...r)});var rl,Q,Ce=A(()=>{"use strict";rl=class{constructor(e){Object.assign(this,e)}get cacheKey(){return this.key||(this.key=Object.getOwnPropertyNames(this).sort().map(e=>`${this[e]}`).join(";")),this.key}},Q=r=>new rl(r)});var sr,il,Se,Re,M,ge,sl,ar,At,q,Wi,O,R,vg,Hi,ol,xg,ae=A(()=>{"use strict";ee();oe();sr=64,il=(r,e)=>{if(e===3)throw new Error("vec3 has same alignment as vec4, use vec4 instead");switch(Number(r)){case 10:return e>1?`vec${e}<f16>`:"f16";case 1:return e>1?`vec${e}<f32>`:"f32";case 6:return e>1?`vec${e}<i32>`:"i32";case 12:return e>1?`vec${e}<u32>`:"u32";case 7:if(e>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","i32"];case 13:if(e>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","u32"];case 9:if(e!==4)throw new Error("bool must be vec4");return["u32","vec4<bool>"];case 22:return"i32";case 21:return"u32";default:throw new Error(`Unknown data type: ${r}`)}},Se=(r,e=1)=>{let n=il(r,e);return typeof n=="string"?n:n[0]},Re=(r,e=1)=>{let n=il(r,e);return typeof n=="string"?n:n[1]},M=(...r)=>{let e=[];return r.forEach(n=>{n.length!==0&&e.push({type:12,data:n},{type:12,data:$.computeStrides(n)})}),e},ge=r=>r%4===0?4:r%2===0?2:1,sl=(r="f32",e,n="0")=>!e||e===1?`${r}(${n})`:`vec${e}<${r}>(${n})`,ar=(r,e,n)=>r==="f32"?n:e===1?`f32(${n})`:`vec${e}<f32>(${n})`,At=(r,e)=>e===4?`(${r}.x + ${r}.y + ${r}.z + ${r}.w)`:e===2?`(${r}.x + ${r}.y)`:e===3?`(${r}.x + ${r}.y + ${r}.z)`:r,q=(r,e,n,t)=>r.startsWith("uniforms.")&&n>4?typeof e=="string"?t==="f16"?`${r}[(${e}) / 8][(${e}) % 8 / 4][(${e}) % 8 % 4]`:`${r}[(${e}) / 4][(${e}) % 4]`:t==="f16"?`${r}[${Math.floor(e/8)}][${Math.floor(e%8/4)}][${e%8%4}]`:`${r}[${Math.floor(e/4)}][${e%4}]`:n>1?`${r}[${e}]`:r,Wi=(r,e,n,t,o)=>{let i=typeof n=="number",s=i?n:n.length,a=[...new Array(s).keys()],u=s<2?"u32":s<=4?`vec${s}<u32>`:`array<u32, ${s}>`,l=il(e,o),c=typeof l=="string"?l:l[1],d=typeof l=="string"?l:l[0],p={indices:u,value:c,storage:d,tensor:e},f=L=>typeof L=="string"?L:`${L}u`,h={offsetToIndices:!1,indicesToOffset:!1,broadcastedIndicesToOffset:!1,set:!1,setByIndices:!1,get:!1,getByIndices:!1},m=i?"uniforms.":"",y=`${m}${r}_shape`,g=`${m}${r}_strides`,b="";for(let L=0;L<s-1;L++)b+=`
    let dim${L} = current / ${q(g,L,s)};
    let rest${L} = current % ${q(g,L,s)};
    indices[${L}] = dim${L};
    current = rest${L};
    `;b+=`indices[${s-1}] = current;`;let _=s<2?"":`
  fn o2i_${r}(offset: u32) -> ${p.indices} {
    var indices: ${p.indices};
    var current = offset;
    ${b}
    return indices;
  }`,x=L=>(h.offsetToIndices=!0,s<2?L:`o2i_${r}(${L})`),T=[];if(s>=2)for(let L=s-1;L>=0;L--)T.push(`${q(g,L,s)} * (indices[${L}])`);let S=s<2?"":`
  fn i2o_${r}(indices: ${p.indices}) -> u32 {
    return ${T.join("+")};
  }`,P=L=>(h.indicesToOffset=!0,s<2?L:`i2o_${r}(${L})`),E=(...L)=>s===0?"0u":`${p.indices}(${L.map(f).join(",")})`,N=(L,z)=>s<2?`${L}`:`${q(L,z,s)}`,B=(L,z,ce)=>s<2?`${L}=${ce};`:`${q(L,z,s)}=${ce};`,D={},j=(L,z)=>{h.broadcastedIndicesToOffset=!0;let ce=`${z.name}broadcastedIndicesTo${r}Offset`;if(ce in D)return`${ce}(${L})`;let ze=[];for(let Pe=s-1;Pe>=0;Pe--){let Ze=z.indicesGet("outputIndices",Pe+z.rank-s);ze.push(`${N(g,Pe)} * (${Ze} % ${N(y,Pe)})`)}return D[ce]=`fn ${ce}(outputIndices: ${z.type.indices}) -> u32 {
             return ${ze.length>0?ze.join("+"):"0u"};
           }`,`${ce}(${L})`},C=(L,z)=>(()=>{if(p.storage===p.value)return`${r}[${L}]=${z};`;if(p.storage==="vec2<u32>"&&p.value==="i32")return`${r}[${L}]=vec2<u32>(u32(${z}), select(0u, 0xFFFFFFFFu, ${z} < 0));`;if(p.storage==="vec2<u32>"&&p.value==="u32")return`${r}[${L}]=vec2<u32>(u32(${z}), 0u);`;if(p.storage==="u32"&&p.value==="vec4<bool>")return`${r}[${L}]=dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(${z}));`;throw new Error(`not supported combination of storage type ${p.storage} and value type ${p.value} yet`)})(),w=L=>(()=>{if(p.storage===p.value)return`${r}[${L}]`;if(p.storage==="vec2<u32>"&&p.value==="i32")return`i32(${r}[${L}].x)`;if(p.storage==="vec2<u32>"&&p.value==="u32")return`u32(${r}[${L}].x)`;if(p.storage==="u32"&&p.value==="vec4<bool>")return`vec4<bool>(bool(${r}[${L}] & 0xFFu), bool(${r}[${L}] & 0xFF00u), bool(${r}[${L}] & 0xFF0000u), bool(${r}[${L}] & 0xFF000000u))`;throw new Error(`not supported combination of storage type ${p.storage} and value type ${p.value} yet`)})(),k=s<2?"":`
  fn get_${r}ByIndices(indices: ${p.indices}) -> ${c} {
    return ${w(`i2o_${r}(indices)`)};
  }`,V=s<2?"":(()=>{let L=a.map(ce=>`d${ce}: u32`).join(", "),z=a.map(ce=>`d${ce}`).join(", ");return`
  fn get_${r}(${L}) -> ${c} {
    return get_${r}ByIndices(${E(z)});
  }`})(),W=(...L)=>{if(L.length!==s)throw new Error(`indices length must be ${s}`);let z=L.map(f).join(",");return s===0?w("0u"):s===1?w(z[0]):(h.get=!0,h.getByIndices=!0,h.indicesToOffset=!0,`get_${r}(${z})`)},U=L=>s<2?w(L):(h.getByIndices=!0,h.indicesToOffset=!0,`get_${r}ByIndices(${L})`),K=s<2?"":`
  fn set_${r}ByIndices(indices: ${p.indices}, value: ${c}) {
    ${C(`i2o_${r}(indices)`,"value")}
  }`,te=s<2?"":(()=>{let L=a.map(ce=>`d${ce}: u32`).join(", "),z=a.map(ce=>`d${ce}`).join(", ");return`
  fn set_${r}(${L}, value: ${c}) {
    set_${r}ByIndices(${E(z)}, value);
  }`})();return{impl:()=>{let L=[],z=!1;return h.offsetToIndices&&(L.push(_),z=!0),h.indicesToOffset&&(L.push(S),z=!0),h.broadcastedIndicesToOffset&&(Object.values(D).forEach(ce=>L.push(ce)),z=!0),h.set&&(L.push(te),z=!0),h.setByIndices&&(L.push(K),z=!0),h.get&&(L.push(V),z=!0),h.getByIndices&&(L.push(k),z=!0),!i&&z&&L.unshift(`const ${y} = ${p.indices}(${n.join(",")});`,`const ${g} = ${p.indices}(${$.computeStrides(n).join(",")});`),L.join(`
`)},type:p,offsetToIndices:x,indicesToOffset:P,broadcastedIndicesToOffset:j,indices:E,indicesGet:N,indicesSet:B,set:(...L)=>{if(L.length!==s+1)throw new Error(`indices length must be ${s}`);let z=L[s];if(typeof z!="string")throw new Error("value must be string");let ce=L.slice(0,s).map(f).join(",");return s===0?C("0u",z):s===1?C(ce[0],z):(h.set=!0,h.setByIndices=!0,h.indicesToOffset=!0,`set_${r}(${ce}, ${z})`)},setByOffset:C,setByIndices:(L,z)=>s<2?C(L,z):(h.setByIndices=!0,h.indicesToOffset=!0,`set_${r}ByIndices(${L}, ${z});`),get:W,getByOffset:w,getByIndices:U,usage:t,name:r,strides:g,shape:y,rank:s}},O=(r,e,n,t=1)=>Wi(r,e,n,"input",t),R=(r,e,n,t=1)=>Wi(r,e,n,"output",t),vg=(r,e,n)=>Wi(r,e,n,"atomicOutput",1),Hi=(r,e,n,t=1)=>Wi(r,e,n,"internal",t),ol=class{constructor(e,n){this.normalizedDispatchGroup=e;this.limits=n;this.internalVariables=[];this.variables=[];this.uniforms=[];this.variableIndex=0}guardAgainstOutOfBoundsWorkgroupSizes(e){return`if (global_idx >= ${typeof e=="number"?`${e}u`:e}) { return; }`}mainStart(e=sr){let n=typeof e=="number"?e:e[0],t=typeof e=="number"?1:e[1],o=typeof e=="number"?1:e[2];if(n>this.limits.maxComputeWorkgroupSizeX||t>this.limits.maxComputeWorkgroupSizeY||o>this.limits.maxComputeWorkgroupSizeZ)throw new Error(`workgroup size [${n}, ${t}, ${o}] exceeds the maximum workgroup size [${this.limits.maxComputeWorkgroupSizeX}, ${this.limits.maxComputeWorkgroupSizeY}, ${this.limits.maxComputeWorkgroupSizeZ}].`);if(n*t*o>this.limits.maxComputeInvocationsPerWorkgroup)throw new Error(`workgroup size [${n}, ${t}, ${o}] exceeds the maximum workgroup invocations ${this.limits.maxComputeInvocationsPerWorkgroup}.`);let i=this.normalizedDispatchGroup[1]===1&&this.normalizedDispatchGroup[2]===1,s=i?`@builtin(global_invocation_id) global_id : vec3<u32>,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(local_invocation_id) local_id : vec3<u32>`:`@builtin(global_invocation_id) global_id : vec3<u32>,
                                             @builtin(local_invocation_id) local_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(num_workgroups) num_workgroups : vec3<u32>`,a=i?`let global_idx = global_id.x;
         let workgroup_index = workgroup_id.x;`:`let workgroup_index = workgroup_id.z * num_workgroups[0] * num_workgroups[1] +
             workgroup_id.y * num_workgroups[0] + workgroup_id.x;
         let global_idx = workgroup_index * ${n*t*o}u + local_idx;`;return`@compute @workgroup_size(${n}, ${t}, ${o})
  fn main(${s}) {
    ${a}
  `}appendVariableUniforms(e){e.rank!==0&&(e.shape.startsWith("uniforms.")&&this.uniforms.push({name:e.shape.replace("uniforms.",""),type:"u32",length:e.rank}),e.strides.startsWith("uniforms.")&&this.uniforms.push({name:e.strides.replace("uniforms.",""),type:"u32",length:e.rank}))}declareVariable(e,n){if(e.usage==="internal")throw new Error("cannot use internal variable with declareVariable(). use registerInternalVariables() instead.");this.variables.push(e),this.appendVariableUniforms(e);let t=e.usage==="input"?"read":"read_write",o=e.usage==="atomicOutput"?"atomic<i32>":e.type.storage;return`@group(0) @binding(${n}) var<storage, ${t}> ${e.name}: array<${o}>;`}declareVariables(...e){return e.map(n=>this.declareVariable(n,this.variableIndex++)).join(`
`)}registerInternalVariable(e){if(e.usage!=="internal")throw new Error("cannot use input or output variable with registerInternalVariable(). use declareVariables() instead.");this.internalVariables.push(e),this.appendVariableUniforms(e)}registerInternalVariables(...e){return e.forEach(n=>this.registerInternalVariable(n)),this}registerUniform(e,n,t=1){return this.uniforms.push({name:e,type:n,length:t}),this}registerUniforms(e){return this.uniforms=this.uniforms.concat(e),this}uniformDeclaration(){if(this.uniforms.length===0)return"";let e=[];for(let{name:n,type:t,length:o}of this.uniforms)if(o&&o>4)t==="f16"?e.push(`@align(16) ${n}:array<mat2x4<${t}>, ${Math.ceil(o/8)}>`):e.push(`${n}:array<vec4<${t}>, ${Math.ceil(o/4)}>`);else{let i=o==null||o===1?t:`vec${o}<${t}>`;e.push(`${n}:${i}`)}return`
      struct Uniforms { ${e.join(", ")} };
      @group(0) @binding(${this.variableIndex}) var<uniform> uniforms: Uniforms;`}get additionalImplementations(){return this.uniformDeclaration()+this.variables.map(e=>e.impl()).join(`
`)+this.internalVariables.map(e=>e.impl()).join(`
`)}get variablesInfo(){if(this.uniforms.length===0)return;let e=n=>[12,10,1,6][["u32","f16","f32","i32"].indexOf(n)];return this.uniforms.map(n=>[e(n.type),n.length??1])}},xg=(r,e)=>new ol(r,e)});var cS,Tg,dS,pS,fS,hS,We,Ig,Sg,Sn=A(()=>{"use strict";ee();oe();Ce();ae();cS=(r,e)=>{if(!r||r.length!==1)throw new Error("Transpose requires 1 input.");if(e.length!==0&&e.length!==r[0].dims.length)throw new Error(`perm size ${e.length} does not match input rank ${r[0].dims.length}`)},Tg=(r,e)=>e.length!==0?e:[...new Array(r).keys()].reverse(),dS=(r,e)=>$.sortBasedOnPerm(r,Tg(r.length,e)),pS=(r,e,n,t)=>{let o=`fn perm(i: ${t.type.indices}) -> ${n.type.indices} {
    var a: ${n.type.indices};`;for(let i=0;i<e;++i)o+=`a[${r[i]}]=i[${i}];`;return o+="return a;}"},fS=(r,e)=>{let n=[],t=[];for(let o=0;o<r.length;++o)r[o]!==1&&n.push(r[o]),r[e[o]]!==1&&t.push(e[o]);return{newShape:n,newPerm:t}},hS=(r,e)=>{let n=0;for(let t=0;t<r.length;++t)if(e[r[t]]!==1){if(r[t]<n)return!1;n=r[t]}return!0},We=(r,e)=>{let n=r.dataType,t=r.dims.length,o=Tg(t,e),i=dS(r.dims,o),s=r.dims,a=i,u=t<2||hS(o,r.dims),l;if(u)return l=m=>{let y=O("input",n,s,4),g=R("output",n,a,4);return`
  ${m.registerUniform("output_size","u32").declareVariables(y,g)}
  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    output[global_idx] = input[global_idx];
  }`},{name:"TransposeCopy",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let m=$.size(i);return{outputs:[{dims:i,dataType:r.dataType}],dispatchGroup:{x:Math.ceil(m/64/4)},programUniforms:[{type:12,data:Math.ceil(m/4)}]}},getShaderSource:l};let{newShape:c,newPerm:d}=fS(r.dims,o),p=$.areEqual(d,[2,3,1]),f=$.areEqual(d,[3,1,2]);if(c.length===2||p||f){s=p?[c[0],c[1]*c[2]]:f?[c[0]*c[1],c[2]]:c,a=[s[1],s[0]];let m=16;return l=y=>{let g=O("a",n,s.length),b=R("output",n,a.length);return`
  ${y.registerUniform("output_size","u32").declareVariables(g,b)}
  var<workgroup> tile : array<array<${b.type.value}, ${m+1}>, ${m}>;
  ${y.mainStart([m,m,1])}
    let stride = (uniforms.output_shape[1] - 1) / ${m} + 1;
    let workgroup_id_x = workgroup_index % stride;
    let workgroup_id_y = workgroup_index / stride;
    let input_col = workgroup_id_y * ${m}u + local_id.x;
    let input_row = workgroup_id_x * ${m}u + local_id.y;
    if (input_row < uniforms.a_shape[0] && input_col < uniforms.a_shape[1]) {
      tile[local_id.y][local_id.x] = ${g.getByIndices(`${g.type.indices}(input_row, input_col)`)};
    }
    workgroupBarrier();

    let output_col = workgroup_id_x * ${m}u + local_id.x;
    let output_row = workgroup_id_y * ${m}u + local_id.y;
    if (output_row < uniforms.output_shape[0] && output_col < uniforms.output_shape[1]) {
      ${b.setByIndices(`${b.type.indices}(output_row, output_col)`,"tile[local_id.x][local_id.y]")}
    }
  }`},{name:"TransposeShared",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let y=$.size(i);return{outputs:[{dims:i,dataType:r.dataType}],dispatchGroup:{x:Math.ceil(a[1]/m),y:Math.ceil(a[0]/m)},programUniforms:[{type:12,data:y},...M(s,a)]}},getShaderSource:l}}return l=m=>{let y=O("a",n,s.length),g=R("output",n,a.length);return`
  ${m.registerUniform("output_size","u32").declareVariables(y,g)}

  ${pS(o,t,y,g)}

  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${g.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${g.setByOffset("global_idx",y.getByIndices("aIndices"))}
  }`},{name:"Transpose",shaderCache:{hint:`${e}`,inputDependencies:["rank"]},getRunData:()=>{let m=$.size(i);return{outputs:[{dims:i,dataType:r.dataType}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:[{type:12,data:m},...M(s,a)]}},getShaderSource:l}},Ig=(r,e)=>{cS(r.inputs,e.perm),r.compute(We(r.inputs[0],e.perm))},Sg=r=>Q({perm:r.perm})});var mS,gS,bS,yS,_S,wS,vS,xS,TS,IS,yn,$g,Ag,Og,Pg,Eg,Dg,Cg,kg,Lg,Ng,Rg=A(()=>{"use strict";ee();oe();ae();qi();Sn();mS={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate * candidate",logSumExp:"bestValue + exp(candidate)",l1:"bestValue + abs(candidate)",l2:"bestValue + candidate * candidate",logSum:"bestValue + candidate"},gS={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate",logSumExp:"bestValue + candidate",l1:"bestValue + candidate",l2:"bestValue + candidate",logSum:"bestValue + candidate"},bS={max:"_A[offset]",min:"_A[offset]",mean:"0",sum:"0",prod:"1",sumSquare:"0",logSumExp:"0",l1:"0",l2:"0",logSum:"0"},yS={max:"bestValue",min:"bestValue",sum:"bestValue",prod:"bestValue",sumSquare:"bestValue",logSumExp:"log(bestValue)",l1:"bestValue",l2:"sqrt(bestValue)",logSum:"log(bestValue)"},_S=(r,e)=>{let n=[];for(let t=e-r;t<e;++t)n.push(t);return n},wS=(r,e)=>{let n=[],t=r.length;for(let i=0;i<t;i++)e.indexOf(i)===-1&&n.push(r[i]);let o=e.map(i=>r[i]);return[n,o]},vS=(r,e)=>{let n=r.length+e.length,t=[],o=0;for(let i=0;i<n;i++)e.indexOf(i)===-1?t.push(r[o++]):t.push(1);return t},xS=(r,e)=>{for(let n=0;n<r.length;++n)if(r[r.length-n-1]!==e-1-n)return!1;return!0},TS=(r,e)=>{let n=[];if(!xS(r,e)){for(let t=0;t<e;++t)r.indexOf(t)===-1&&n.push(t);r.forEach(t=>n.push(t))}return n},IS=(r,e,n,t,o,i,s)=>{let a=n[0].dims,u=$.size(i),l=$.size(s),c=O("_A",n[0].dataType,a),d=R("output",o,i),p=64;u===1&&(p=256);let f=`
          var<workgroup> aBestValues : array<f32, ${p}>;
       `,h=m=>`
        ${m.registerUniform("reduceSize","u32").declareVariables(c,d)}
        ${f}
        fn DIV_CEIL(a : u32, b : u32) -> u32 {
          return ((a - 1u) / b + 1u);
         }
         ${m.mainStart(p)}

          let outputIndex = global_idx / ${p};
          let offset = outputIndex * uniforms.reduceSize;

          var bestValue = f32(${bS[t]});
          let Length = uniforms.reduceSize;
          for (var k = local_idx; k < Length; k = k + ${p}) {
           let candidate = f32(${c.getByOffset("offset + k")});
           bestValue = ${mS[t]};
          }
          aBestValues[local_idx] = bestValue;
          workgroupBarrier();

         var reduceSize = min(Length, ${p}u);
         for (var currentSize = reduceSize / 2u; reduceSize > 1u;
             currentSize = reduceSize / 2u) {
           let interval = DIV_CEIL(reduceSize, 2u);
           if (local_idx < currentSize) {
            let candidate = aBestValues[local_idx + interval];
            bestValue = ${gS[t]};
            aBestValues[local_idx] = bestValue;
           }
           reduceSize = interval;
           workgroupBarrier();
         }

         if (local_idx == 0u) {
          ${d.setByOffset("outputIndex",`${t==="mean"?`${d.type.storage}(bestValue / f32(uniforms.reduceSize))`:`${d.type.storage}(${yS[t]})`}`)};
         }
        }`;return{name:r,shaderCache:{hint:`${e};${p}`,inputDependencies:["type"]},getShaderSource:h,getRunData:()=>({outputs:[{dims:i,dataType:o}],dispatchGroup:{x:u},programUniforms:[{type:12,data:l}]})}},yn=(r,e,n,t)=>{let o=r.inputs.length===1?n:al(r.inputs,n),i=o.axes;i.length===0&&!o.noopWithEmptyAxes&&(i=r.inputs[0].dims.map((f,h)=>h));let s=$.normalizeAxes(i,r.inputs[0].dims.length),a=s,u=r.inputs[0],l=TS(a,r.inputs[0].dims.length);l.length>0&&(u=r.compute(We(r.inputs[0],l),{inputs:[0],outputs:[-1]})[0],a=_S(a.length,u.dims.length));let[c,d]=wS(u.dims,a),p=c;o.keepDims&&(p=vS(c,s)),r.compute(IS(e,o.cacheKey,[u],t,r.inputs[0].dataType,p,d),{inputs:[u]})},$g=(r,e)=>{yn(r,"ReduceMeanShared",e,"mean")},Ag=(r,e)=>{yn(r,"ReduceL1Shared",e,"l1")},Og=(r,e)=>{yn(r,"ReduceL2Shared",e,"l2")},Pg=(r,e)=>{yn(r,"ReduceLogSumExpShared",e,"logSumExp")},Eg=(r,e)=>{yn(r,"ReduceMaxShared",e,"max")},Dg=(r,e)=>{yn(r,"ReduceMinShared",e,"min")},Cg=(r,e)=>{yn(r,"ReduceProdShared",e,"prod")},kg=(r,e)=>{yn(r,"ReduceSumShared",e,"sum")},Lg=(r,e)=>{yn(r,"ReduceSumSquareShared",e,"sumSquare")},Ng=(r,e)=>{yn(r,"ReduceLogSumShared",e,"logSum")}});var _n,SS,ji,al,wn,$S,AS,OS,PS,ES,DS,CS,kS,LS,NS,vn,zg,Bg,Mg,Vg,Fg,Gg,Ug,Wg,Hg,qg,qi=A(()=>{"use strict";ee();oe();Ce();ae();Rg();_n=r=>{if(!r||r.length===0||r.length>2)throw new Error("Reduce op requires 1 or 2 inputs.");if(r.length===2&&r[1].dims.length!==1)throw new Error("Invalid axes input dims.")},SS=r=>["","",`var value = ${r.getByIndices("input_indices")};`,""],ji=(r,e,n,t,o,i,s=!1,a=!1)=>{let u=[],l=n[0].dims,c=l.length,d=$.normalizeAxes(o,c),p=!a&&d.length===0;l.forEach((y,g)=>{p||d.indexOf(g)>=0?s&&u.push(1):u.push(y)});let f=u.length,h=$.size(u);return{name:r,shaderCache:e,getShaderSource:y=>{let g=[],b=O("_A",n[0].dataType,c),_=R("output",i,f),x=t(b,_,d),T=x[2];for(let S=0,P=0;S<c;S++)p||d.indexOf(S)>=0?(s&&P++,T=`for(var j${S}: u32 = 0; j${S} < ${l[S]}; j${S}++) {
                  ${x[2].includes("last_index")?`let last_index = j${S};`:""}
                  ${b.indicesSet("input_indices",S,`j${S}`)}
                  ${T}
                }`):(g.push(`${b.indicesSet("input_indices",S,_.indicesGet("output_indices",P))};`),P++);return`

        ${y.registerUniform("output_size","u32").declareVariables(b,_)}

        ${y.mainStart()}
          ${y.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          var input_indices: ${b.type.indices};
          let output_indices = ${_.offsetToIndices("global_idx")};

          ${g.join(`
`)}
          ${x[0]}       // init ops for reduce max/min
          ${x[1]}
          ${T}
          ${x[3]}
          ${x.length===4?_.setByOffset("global_idx","value"):x.slice(4).join(`
`)}
        }`},getRunData:()=>({outputs:[{dims:u,dataType:i}],dispatchGroup:{x:Math.ceil(h/64)},programUniforms:[{type:12,data:h},...M(l,u)]})}},al=(r,e)=>{let n=[];return r[1].dims[0]>0&&r[1].getBigInt64Array().forEach(t=>n.push(Number(t))),Q({axes:n,keepDims:e.keepDims,noopWithEmptyAxes:e.noopWithEmptyAxes})},wn=(r,e,n,t)=>{let o=r.inputs,i=o.length===1?n:al(o,n);r.compute(ji(e,{hint:i.cacheKey,inputDependencies:["rank"]},[o[0]],i.noopWithEmptyAxes&&i.axes.length===0?SS:t,i.axes,o[0].dataType,i.keepDims,i.noopWithEmptyAxes),{inputs:[0]})},$S=(r,e)=>{_n(r.inputs),wn(r,"ReduceLogSum",e,(t,o)=>[`var value = ${o.type.storage}(0);`,"",`value += ${t.getByIndices("input_indices")};`,"value = log(value);"])},AS=(r,e)=>{_n(r.inputs),wn(r,"ReduceL1",e,(t,o)=>[`var value = ${o.type.storage}(0);`,"",`value += abs(${t.getByIndices("input_indices")});`,""])},OS=(r,e)=>{_n(r.inputs),wn(r,"ReduceL2",e,(t,o)=>[`var t = ${o.type.value}(0); var value = ${o.type.value}(0);`,"",`t = ${t.getByIndices("input_indices")}; value += (t * t);`,"value = sqrt(value);"])},PS=(r,e)=>{_n(r.inputs),wn(r,"ReduceLogSumExp",e,(t,o)=>[`var value = ${o.type.storage}(0);`,"",`value += exp(${t.getByIndices("input_indices")});`,"value = log(value);"])},ES=(r,e)=>{_n(r.inputs),wn(r,"ReduceMax",e,(t,o,i)=>{let s=[];for(let a=0;a<t.rank;a++)(i.indexOf(a)>=0||i.length===0)&&s.push(t.indicesSet("input_indices",a,0));return[`${s.join(`
`)}`,`var value = ${t.getByIndices("input_indices")};`,`value = max(value, ${t.getByIndices("input_indices")});`,""]})},DS=(r,e)=>{_n(r.inputs),wn(r,"ReduceMean",e,(t,o,i)=>{let s=1;for(let a=0;a<t.rank;a++)(i.indexOf(a)>=0||i.length===0)&&(s*=r.inputs[0].dims[a]);return["var sum = f32(0);","",`sum += f32(${t.getByIndices("input_indices")});`,`let value = ${o.type.value}(sum / ${s});`]})},CS=(r,e)=>{_n(r.inputs),wn(r,"ReduceMin",e,(t,o,i)=>{let s=[];for(let a=0;a<t.rank;a++)(i.indexOf(a)>=0||i.length===0)&&s.push(`input_indices[${a}] = 0;`);return[`${s.join(`
`)}`,`var value = ${t.getByIndices("input_indices")};`,`value = min(value, ${t.getByIndices("input_indices")});`,""]})},kS=(r,e)=>{_n(r.inputs),wn(r,"ReduceProd",e,(t,o)=>[`var value = ${o.type.storage}(1);`,"",`value *= ${t.getByIndices("input_indices")};`,""])},LS=(r,e)=>{_n(r.inputs),wn(r,"ReduceSum",e,(t,o)=>[`var value = ${o.type.storage}(0);`,"",`value += ${t.getByIndices("input_indices")};`,""])},NS=(r,e)=>{_n(r.inputs),wn(r,"ReduceSumSquare",e,(t,o)=>[`var t = ${o.type.value}(0); var value = ${o.type.value}(0);`,"",`t = ${t.getByIndices("input_indices")}; value += t * t;`,""])},vn=(r,e,n)=>{if(e.length===0)return n;let t=1,o=1;for(let i=0;i<e.length;i++)e.indexOf(i)===-1?t*=r[i]:o*=r[i];return o<32&&t>1024},zg=(r,e)=>{vn(r.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?DS(r,e):$g(r,e)},Bg=(r,e)=>{vn(r.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?AS(r,e):Ag(r,e)},Mg=(r,e)=>{vn(r.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?OS(r,e):Og(r,e)},Vg=(r,e)=>{vn(r.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?PS(r,e):Pg(r,e)},Fg=(r,e)=>{vn(r.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?ES(r,e):Eg(r,e)},Gg=(r,e)=>{vn(r.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?CS(r,e):Dg(r,e)},Ug=(r,e)=>{vn(r.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?kS(r,e):Cg(r,e)},Wg=(r,e)=>{vn(r.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?LS(r,e):kg(r,e)},Hg=(r,e)=>{vn(r.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?NS(r,e):Lg(r,e)},qg=(r,e)=>{vn(r.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?$S(r,e):Ng(r,e)}});var jg,Kg,Xg,ul,Zg=A(()=>{"use strict";ee();Ce();qi();jg=r=>{if(!r||r.length===0||r.length>2)throw new Error("ArgMinMaxOp op requires 1 or 2 inputs.");if(r[0].dataType!==1)throw new Error("Invalid input type.")},Kg=(r,e)=>{jg(r.inputs);let n=(t,o,i)=>{let s=[];for(let a=0;a<t.rank;a++)(i.indexOf(a)>=0||i.length===0)&&s.push(`input_indices[${a}] = 0;`);return[`${s.join(`
`)}`,`var value = ${t.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${t.getByIndices("input_indices")} ${e.selectLastIndex>0?"<=":"<"} value) {
         value = ${t.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",o.setByOffset("global_idx","best_index")]};r.compute(ji("ArgMin",{hint:e.cacheKey,inputDependencies:["rank"]},[r.inputs[0]],n,[e.axis],7,e.keepDims),{inputs:[0]})},Xg=(r,e)=>{jg(r.inputs);let n=(t,o,i)=>{let s=[];for(let a=0;a<t.rank;a++)(i.indexOf(a)>=0||i.length===0)&&s.push(`input_indices[${a}] = 0;`);return[`${s.join(`
`)}`,`var value = ${t.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${t.getByIndices("input_indices")} ${e.selectLastIndex>0?">=":">"} value) {
         value = ${t.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",o.setByOffset("global_idx","best_index")]};r.compute(ji("argMax",{hint:e.cacheKey,inputDependencies:["rank"]},[r.inputs[0]],n,[e.axis],7,e.keepDims),{inputs:[0]})},ul=r=>Q(r)});var RS,ll,zS,BS,MS,Or,VS,Jg,Ki=A(()=>{"use strict";ee();oe();Ui();ae();RS=(r,e)=>{let n=r[0],t=r[1],o=r[2],i=r[3],s=r[4],a=r[5];if(s&&a)throw new Error("Attention cannot have both past and attention_bias");if(n.dims.length!==3)throw new Error('Input "input" must have 3 dimensions');let u=n.dims[0],l=n.dims[1],c=n.dims[2];if(o.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimensions');if(t.dims.length!==2)throw new Error('Input "weights" is expected to have 2 dimensions');if(t.dims[0]!==c)throw new Error("Input 1 dimension 0 should have same length as dimension 2 of input 0");if(o.dims[0]!==t.dims[1])throw new Error('Input "bias" dimension 0 should have same length as dimension 1 of input "weights"');let d=o.dims[0]/3,p=d,f=p;if(e.qkvHiddenSizes.length>0){if(e.qkvHiddenSizes.length!==3)throw new Error("qkv_hidden_sizes attribute should have 3 elements");for(let _ of e.qkvHiddenSizes)if(_%e.numHeads!==0)throw new Error("qkv_hidden_sizes should be divisible by num_heads");d=e.qkvHiddenSizes[0],p=e.qkvHiddenSizes[1],f=e.qkvHiddenSizes[2]}let h=l;if(d!==p)throw new Error("qkv_hidden_sizes first element should be same as the second");if(o.dims[0]!==d+p+f)throw new Error('Input "bias" dimension 0 should have same length as sum of Q/K/V hidden sizes');let m=0;if(s){if(p!==f)throw new Error('Input "past" expect k_hidden_size == v_hidden_size');if(s.dims.length!==5)throw new Error('Input "past" must have 5 dimensions');if(s.dims[0]!==2)throw new Error('Input "past" first dimension must be 2');if(s.dims[1]!==u)throw new Error('Input "past" second dimension must be batch_size');if(s.dims[2]!==e.numHeads)throw new Error('Input "past" third dimension must be num_heads');if(s.dims[4]!==p/e.numHeads)throw new Error('Input "past" fifth dimension must be k_hidden_size / num_heads');e.pastPresentShareBuffer||(m=s.dims[3])}let y=h+m,g=-1,b=0;if(i)throw new Error("Mask not supported");if(s)throw new Error("past is not supported");if(a){if(a.dims.length!==4)throw new Error('Input "attention_bias" must have 4 dimensions');if(a.dims[0]!==u||a.dims[1]!==e.numHeads||a.dims[2]!==l||a.dims[3]!==y)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:u,sequenceLength:l,pastSequenceLength:m,kvSequenceLength:h,totalSequenceLength:y,maxSequenceLength:g,inputHiddenSize:c,hiddenSize:d,vHiddenSize:f,headSize:Math.floor(d/e.numHeads),vHeadSize:Math.floor(f/e.numHeads),numHeads:e.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:e.maskFilterValue,maskType:b,scale:e.scale,broadcastResPosBias:!1,passPastInKv:!1,qkvFormat:1}},ll=(r,e,n)=>e&&r?`
      let total_sequence_length_input = u32(${e.getByOffset("0")});
      let present_sequence_length = max(total_sequence_length_input, uniforms.past_sequence_length);
      let is_subsequent_prompt: bool = sequence_length > 1 && sequence_length != total_sequence_length_input;
      let is_first_prompt: bool = is_subsequent_prompt == false && sequence_length == total_sequence_length_input;
      total_sequence_length = u32(${r?.getByOffset("batchIdx")}) + 1;
      var past_sequence_length: u32 = 0;
      if (is_first_prompt == false) {
        past_sequence_length = total_sequence_length - sequence_length;
      }
       `:`
    ${n?"let past_sequence_length = uniforms.past_sequence_length":""};
    let present_sequence_length = total_sequence_length;
    `,zS=(r,e,n,t,o,i,s,a)=>{let u=ge(s?1:i),l=64,c=i/u;c<l&&(l=32);let d=Math.ceil(i/u/l),p=[{type:12,data:e},{type:12,data:n},{type:12,data:t},{type:12,data:o},{type:12,data:c},{type:12,data:d}],f=Se(r.dataType,u),h=Re(1,u),m=["type"];s&&m.push("type"),a&&m.push("type");let y=g=>{let b=R("x",r.dataType,r.dims,u),_=[b],x=s?O("seq_lens",s.dataType,s.dims):void 0;x&&_.push(x);let T=a?O("total_sequence_length_input",a.dataType,a.dims):void 0;T&&_.push(T);let S=Re(r.dataType),P=[{name:"batch_size",type:"u32"},{name:"num_heads",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"sequence_length",type:"u32"},{name:"total_sequence_length",type:"u32"},{name:"elements_per_thread",type:"u32"}];return`
  var<workgroup> thread_max: array<f32, ${l}>;
  var<workgroup> thread_sum: array<f32, ${l}>;
  ${g.registerUniforms(P).declareVariables(..._)}
  ${g.mainStart([l,1,1])}
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let sequence_length = uniforms.sequence_length;
    var total_sequence_length = uniforms.total_sequence_length;
    ${ll(x,T,!1)}
    let local_offset = local_idx * uniforms.elements_per_thread;
    let offset = (global_idx / ${l}) * uniforms.total_sequence_length + local_offset;
    let seq_causal_length = ${s?"u32(past_sequence_length + workgroup_id.y + 1)":"total_sequence_length"};
    var thread_max_vector = ${h}(-3.4028234663852886e+38f);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      thread_max_vector = max(${h}(x[offset + i]), thread_max_vector);
    }
    thread_max[local_idx] = ${(()=>{switch(u){case 1:return"thread_max_vector";case 2:return"max(thread_max_vector.x, thread_max_vector.y)";case 4:return"max(max(thread_max_vector.x, thread_max_vector.y), max(thread_max_vector.z, thread_max_vector.w))";default:throw new Error(`Unsupported components: ${u}`)}})()};
    workgroupBarrier();

    var max_value =  f32(-3.4028234663852886e+38f);
    for (var i = 0u; i < ${l}; i++) {
      max_value = max(thread_max[i], max_value);
    }

    var sum_vector = ${h}(0);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      sum_vector += exp(${h}(x[offset + i]) - max_value);
    }
    thread_sum[local_idx] = ${(()=>{switch(u){case 1:return"sum_vector";case 2:return"sum_vector.x + sum_vector.y";case 4:return"sum_vector.x + sum_vector.y + sum_vector.z + sum_vector.w";default:throw new Error(`Unsupported components: ${u}`)}})()};
    workgroupBarrier();

    var sum: f32 = 0;
    for (var i = 0u; i < ${l}; i++) {
      sum += thread_sum[i];
    }

    if (sum == 0) {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        x[offset + i] = ${b.type.value}(${S}(1.0) / ${S}(seq_causal_length));
      }
    } else {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        var f32input = ${h}(x[offset + i]);
        x[offset + i] = ${b.type.value}(exp(f32input - max_value) / sum);
      }
    }
      ${s?`
        for (var total_seq_id: u32 = seq_causal_length; total_seq_id + local_offset < uniforms.total_sequence_length; total_seq_id++) {
          x[offset + total_seq_id] = ${b.type.value}(${S}(0));
        }`:""};
  }`};return{name:"AttentionProbsSoftmax",shaderCache:{hint:`${l};${f};${u}`,inputDependencies:m},getShaderSource:y,getRunData:()=>({outputs:[],dispatchGroup:{x:1,y:o,z:e*n},programUniforms:p})}},BS=(r,e,n,t,o,i,s,a,u)=>{let l=s+i.kvSequenceLength,c=[i.batchSize,i.numHeads,i.sequenceLength,l],d=r>1&&t,p=i.kvNumHeads?i.kvNumHeads:i.numHeads,f=d?[i.batchSize,p,l,i.headSize]:void 0,h=i.nReps?i.nReps:1,m=i.scale===0?1/Math.sqrt(i.headSize):i.scale,y=ge(i.headSize),g=i.headSize/y,b=12,_={x:Math.ceil(l/b),y:Math.ceil(i.sequenceLength/b),z:i.batchSize*i.numHeads},x=[{type:12,data:i.sequenceLength},{type:12,data:g},{type:12,data:l},{type:12,data:i.numHeads},{type:12,data:i.headSize},{type:1,data:m},{type:12,data:s},{type:12,data:i.kvSequenceLength},{type:12,data:h}],T=d&&t&&$.size(t.dims)>0,S=["type","type"];T&&S.push("type"),o&&S.push("type"),a&&S.push("type"),u&&S.push("type");let P=[{dims:c,dataType:e.dataType,gpuDataType:0}];d&&P.push({dims:f,dataType:e.dataType,gpuDataType:0});let E=N=>{let B=O("q",e.dataType,e.dims,y),D=O("key",n.dataType,n.dims,y),j=[B,D];if(T){let K=O("past_key",t.dataType,t.dims,y);j.push(K)}o&&j.push(O("attention_bias",o.dataType,o.dims));let C=a?O("seq_lens",a.dataType,a.dims):void 0;C&&j.push(C);let w=u?O("total_sequence_length_input",u.dataType,u.dims):void 0;w&&j.push(w);let k=R("output",e.dataType,c),V=[k];d&&V.push(R("present_key",e.dataType,f,y));let W=Re(1,y),U=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"alpha",type:"f32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${b}u;

  var<workgroup> tileQ: array<${B.type.storage}, ${b*b}>;
  var<workgroup> tileK: array<${B.type.storage}, ${b*b}>;
  ${N.registerUniforms(U).declareVariables(...j,...V)}
  ${N.mainStart([b,b,1])}
    // x holds the N and y holds the M
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let kvHeadIdx = ${h===1?"headIdx":"headIdx / uniforms.n_reps"};
    let kv_num_heads = ${h===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let m = workgroup_id.y * TILE_SIZE;
    let n = workgroup_id.x * TILE_SIZE;
    let sequence_length = uniforms.M;
    var total_sequence_length = uniforms.N;
    ${ll(C,w,!0)}
    let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx;
    let qOffset = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
    ${T&&d?"let pastKeyOffset = absKvHeadIdx * uniforms.past_sequence_length * uniforms.K;":""};
    let kOffset = absKvHeadIdx * uniforms.kv_sequence_length * uniforms.K;
    ${d?"let presentKeyOffset = absKvHeadIdx * uniforms.N * uniforms.K;":""}
    var value = ${W}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (global_id.y < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = q[qOffset + local_id.y * uniforms.K + w + local_id.x];
      }
      if (n + local_id.y < uniforms.N && w + local_id.x < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
      ${T&&d?`
              if (n + local_id.y < past_sequence_length) {
                tileK[idx] = past_key[pastKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
              } else if (n + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
                tileK[idx] = key[kOffset + (n + local_id.y - past_sequence_length) * uniforms.K + w + local_id.x];
              }`:`
          if (n + local_id.y < uniforms.kv_sequence_length) {
            tileK[idx] = key[kOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
          }`}
      ${d?`if (n + local_id.y < present_sequence_length) {
        present_key[presentKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x] = tileK[idx];
      }`:""}
      }
      workgroupBarrier();

      for (var k: u32 = 0u; k < TILE_SIZE && w+k < uniforms.K; k++) {
          value += ${W}(tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * local_id.x + k]);
      }

      workgroupBarrier();
    }

    if (global_id.y < uniforms.M && global_id.x < total_sequence_length) {
      let headOffset = workgroup_id.z * uniforms.M * uniforms.N;
      let outputIdx = headOffset + global_id.y * uniforms.N + global_id.x;
      var sum: f32 = ${(()=>{switch(y){case 1:return"value";case 2:return"value.x + value.y";case 4:return"value.x + value.y + value.z + value.w";default:throw new Error(`Unsupported components: ${y}`)}})()};
        output[outputIdx] = ${k.type.value} (sum * uniforms.alpha) + ${o?"attention_bias[outputIdx]":"0.0"};
    }
  }`};return{name:"AttentionProbs",shaderCache:{hint:`${y};${o!==void 0};${t!==void 0};${r}`,inputDependencies:S},getRunData:()=>({outputs:P,dispatchGroup:_,programUniforms:x}),getShaderSource:E}},MS=(r,e,n,t,o,i,s=void 0,a=void 0)=>{let u=i+o.kvSequenceLength,l=o.nReps?o.nReps:1,c=o.vHiddenSize*l,d=r>1&&t,p=o.kvNumHeads?o.kvNumHeads:o.numHeads,f=d?[o.batchSize,p,u,o.headSize]:void 0,h=[o.batchSize,o.sequenceLength,c],m=12,y={x:Math.ceil(o.vHeadSize/m),y:Math.ceil(o.sequenceLength/m),z:o.batchSize*o.numHeads},g=[{type:12,data:o.sequenceLength},{type:12,data:u},{type:12,data:o.vHeadSize},{type:12,data:o.numHeads},{type:12,data:o.headSize},{type:12,data:c},{type:12,data:i},{type:12,data:o.kvSequenceLength},{type:12,data:l}],b=d&&t&&$.size(t.dims)>0,_=["type","type"];b&&_.push("type"),s&&_.push("type"),a&&_.push("type");let x=[{dims:h,dataType:e.dataType,gpuDataType:0}];d&&x.push({dims:f,dataType:e.dataType,gpuDataType:0});let T=S=>{let P=O("probs",e.dataType,e.dims),E=O("v",n.dataType,n.dims),N=[P,E];b&&N.push(O("past_value",t.dataType,t.dims));let B=s?O("seq_lens",s.dataType,s.dims):void 0;s&&N.push(B);let D=a?O("total_sequence_length_input",a.dataType,a.dims):void 0;a&&N.push(D);let C=[R("output",e.dataType,h)];d&&C.push(R("present_value",e.dataType,f));let w=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"v_hidden_size",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${m}u;
  var<workgroup> tileQ: array<${P.type.value}, ${m*m}>;
  var<workgroup> tileV: array<${P.type.value}, ${m*m}>;
  ${S.registerUniforms(w).declareVariables(...N,...C)}
  ${S.mainStart([m,m,1])}
   let headIdx = workgroup_id.z % uniforms.num_heads;
   let batchIdx = workgroup_id.z / uniforms.num_heads;
   let kvHeadIdx = ${l===1?"headIdx":"headIdx / uniforms.n_reps"};
   let kv_num_heads = ${l===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
   let m = global_id.y;
   let n = global_id.x;
   let sequence_length = uniforms.M;
   var total_sequence_length = uniforms.K;
   ${ll(B,D,!0)}
   let offsetA = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
   let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx; // kvHeadIdx is relative to the batch
   ${b&&d?"let pastValueOffset = absKvHeadIdx * uniforms.N * uniforms.past_sequence_length + n;":""};
   let vOffset = absKvHeadIdx * uniforms.N * uniforms.kv_sequence_length + n;
   ${d?"let presentValueOffset = absKvHeadIdx * uniforms.N * uniforms.K + n;":""}
   var value = ${P.type.storage}(0);
   for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = probs[offsetA + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
        ${b&&d?`
        if (w + local_id.y < past_sequence_length) {
          tileV[idx] = past_value[pastValueOffset + (w + local_id.y) * uniforms.N];
        } else if (w + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
          tileV[idx] = v[vOffset + (w + local_id.y - past_sequence_length) * uniforms.N];
        }
      `:`
            if (w + local_id.y < uniforms.kv_sequence_length) {
              tileV[idx] = v[vOffset + (w + local_id.y) * uniforms.N];
            }`}
        ${d?`
            if (w + local_id.y < present_sequence_length) {
          present_value[presentValueOffset + (w + local_id.y) * uniforms.N] = tileV[idx];
        }`:""}
      }
     workgroupBarrier();
     for (var k: u32 = 0u; k < TILE_SIZE && w+k < total_sequence_length; k++) {
       value += tileQ[TILE_SIZE * local_id.y + k] * tileV[TILE_SIZE * k + local_id.x];
     }
     workgroupBarrier();
   }

   // we need to transpose output from BNSH_v to BSND_v
   if (m < uniforms.M && n < uniforms.N) {
     let outputIdx = batchIdx * uniforms.M * uniforms.v_hidden_size + m * uniforms.v_hidden_size
       + headIdx * uniforms.N + n;
     output[outputIdx] = value;
   }
  }`};return{name:"AttentionScore",shaderCache:{hint:`${t!==void 0};${r}`,inputDependencies:_},getRunData:()=>({outputs:x,dispatchGroup:y,programUniforms:g}),getShaderSource:T}},Or=(r,e,n,t,o,i,s,a,u,l,c=void 0,d=void 0)=>{let p=Math.min(r.outputCount,1+(s?1:0)+(a?1:0)),f=p>1?s:void 0,h=p>1?a:void 0,m=p>1?l.pastSequenceLength:0,y=m+l.kvSequenceLength,g=u&&$.size(u.dims)>0?u:void 0,b=[e,n];f&&$.size(f.dims)>0&&b.push(f),g&&b.push(g),c&&b.push(c),d&&b.push(d);let _=r.compute(BS(p,e,n,f,g,l,m,c,d),{inputs:b,outputs:p>1?[-1,1]:[-1]})[0];r.compute(zS(_,l.batchSize,l.numHeads,m,l.sequenceLength,y,c,d),{inputs:c&&d?[_,c,d]:[_],outputs:[]});let x=[_,t];h&&$.size(h.dims)>0&&x.push(h),c&&x.push(c),d&&x.push(d),r.compute(MS(p,_,t,h,l,m,c,d),{inputs:x,outputs:p>1?[0,2]:[0]})},VS=(r,e)=>{let n=[e.batchSize,e.numHeads,e.sequenceLength,e.headSize],t=e.sequenceLength,o=e.inputHiddenSize,i=e.headSize,s=12,a={x:Math.ceil(e.headSize/s),y:Math.ceil(e.sequenceLength/s),z:e.batchSize*e.numHeads},u=[r.inputs[0],r.inputs[1],r.inputs[2]],l=[{type:12,data:t},{type:12,data:o},{type:12,data:i},{type:12,data:e.numHeads},{type:12,data:e.headSize},{type:12,data:e.hiddenSize},{type:12,data:e.hiddenSize+e.hiddenSize+e.vHiddenSize}],c=d=>{let p=R("output_q",u[0].dataType,n),f=R("output_k",u[0].dataType,n),h=R("output_v",u[0].dataType,n),m=O("input",u[0].dataType,u[0].dims),y=O("weight",u[1].dataType,u[1].dims),g=O("bias",u[2].dataType,u[2].dims),b=m.type.storage,_=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"hidden_size",type:"u32"},{name:"ldb",type:"u32"}];return`
  const TILE_SIZE = ${s}u;
  var<workgroup> tileInput: array<${b}, ${s*s}>;
  var<workgroup> tileWeightQ: array<${b}, ${s*s}>;
  var<workgroup> tileWeightK: array<${b}, ${s*s}>;
  var<workgroup> tileWeightV: array<${b}, ${s*s}>;
  ${d.registerUniforms(_).declareVariables(m,y,g,p,f,h)}
  ${d.mainStart([s,s,1])}
    let batchIndex = workgroup_id.z / uniforms.num_heads;
    let headNumber = workgroup_id.z % uniforms.num_heads;
    let m = global_id.y;
    let n = global_id.x;

    let inputOffset = batchIndex * (uniforms.M * uniforms.K) + m * uniforms.K;
    let biasOffsetQ = headNumber * uniforms.head_size;
    let biasOffsetK = uniforms.hidden_size + biasOffsetQ;
    let biasOffsetV = uniforms.hidden_size + biasOffsetK;

    var valueQ = ${b}(0);
    var valueK = ${b}(0);
    var valueV = ${b}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileInput[TILE_SIZE * local_id.y + local_id.x] = input[inputOffset + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        let offset = n + (w + local_id.y) * uniforms.ldb;
        tileWeightQ[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetQ + offset];
        tileWeightK[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetK + offset];
        tileWeightV[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetV + offset];
      }
      workgroupBarrier();
      for (var k: u32 = 0u; k<TILE_SIZE && w+k < uniforms.K; k++) {
        let inputTileOffset = TILE_SIZE * local_id.y + k;
        let weightTileOffset = TILE_SIZE * k + local_id.x;
        valueQ += tileInput[inputTileOffset] * tileWeightQ[weightTileOffset];
        valueK += tileInput[inputTileOffset] * tileWeightK[weightTileOffset];
        valueV += tileInput[inputTileOffset] * tileWeightV[weightTileOffset];
      }

      workgroupBarrier();
    }

    let headOffset = (m * uniforms.N + n) % uniforms.head_size;
    valueQ += bias[headOffset + biasOffsetQ];
    valueK += bias[headOffset + biasOffsetK];
    valueV += bias[headOffset + biasOffsetV];

    let offset = workgroup_id.z * uniforms.M * uniforms.N;
    if (m < uniforms.M && n < uniforms.N) {
      let outputIdx = offset + m * uniforms.N + n;
      output_q[outputIdx] = valueQ;
      output_k[outputIdx] = valueK;
      output_v[outputIdx] = valueV;
    }
  }`};return r.compute({name:"AttentionPrepare",shaderCache:{inputDependencies:["type","type","type"]},getRunData:()=>({outputs:[{dims:n,dataType:r.inputs[0].dataType,gpuDataType:0},{dims:n,dataType:r.inputs[0].dataType,gpuDataType:0},{dims:n,dataType:r.inputs[0].dataType,gpuDataType:0}],dispatchGroup:a,programUniforms:l}),getShaderSource:c},{inputs:u,outputs:[-1,-1,-1]})},Jg=(r,e)=>{let n=RS(r.inputs,e),[t,o,i]=VS(r,n);return Or(r,t,o,i,r.inputs[4],void 0,void 0,void 0,r.inputs[5],n)}});var FS,GS,US,Qg,Yg=A(()=>{"use strict";Ke();ee();oe();Ce();ae();FS=(r,e)=>{if(!r||r.length!==5)throw new Error("BatchNormalization requires 5 inputs");let n=(t,o,i)=>{let s=o.length;if(s!==t.length)throw new Error(`${i}: num dimensions != ${s}`);o.forEach((a,u)=>{if(a!==t[u])throw new Error(`${i}: dim[${u}] do not match`)})};if(r[0].dims.length>1){let t=e.format==="NHWC"?e.spatial?r[0].dims.slice(-1):r[0].dims.slice(-1).concat(r[0].dims.slice(1,r[0].dims.length-1)):r[0].dims.slice(1,e.spatial?2:void 0);n(r[1].dims,t,"Invalid input scale"),n(r[2].dims,t,"Invalid input B"),n(r[3].dims,t,"Invalid input mean"),n(r[4].dims,t,"Invalid input var")}else n(r[1].dims,[1],"Invalid input scale"),n(r[2].dims,[1],"Invalid input B"),n(r[3].dims,[1],"Invalid input mean"),n(r[4].dims,[1],"Invalid input var")},GS=(r,e)=>{let{epsilon:n,spatial:t,format:o}=e,i=r[0].dims,s=t?ge(i[i.length-1]):1,a=o==="NHWC"&&i.length>1?s:1,u=$.size(i)/s,l=t,c=l?i.length:i,d=O("x",r[0].dataType,r[0].dims,s),p=O("scale",r[1].dataType,r[1].dims,a),f=O("bias",r[2].dataType,r[2].dims,a),h=O("inputMean",r[3].dataType,r[3].dims,a),m=O("inputVar",r[4].dataType,r[4].dims,a),y=R("y",r[0].dataType,c,s),g=()=>{let _="";if(t)_=`let cOffset = ${i.length===1?"0u":o==="NHWC"?`outputIndices[${i.length-1}] / ${s}`:"outputIndices[1]"};`;else if(o==="NCHW")_=`
            ${y.indicesSet("outputIndices","0","0")}
            let cOffset = ${y.indicesToOffset("outputIndices")};`;else{_=`var cIndices = ${p.type.indices}(0);
                       cIndices[0] = outputIndices[${i.length-1}];`;for(let x=1;x<p.rank;x++)_+=`cIndices[${x}] = outputIndices[${x}];`;_+=`let cOffset = ${p.indicesToOffset("cIndices")};`}return _},b=_=>`
  const epsilon = ${n};
  ${_.registerUniform("outputSize","u32").declareVariables(d,p,f,h,m,y)}
  ${_.mainStart()}
  ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
    var outputIndices = ${y.offsetToIndices(`global_idx * ${s}`)};
    ${g()}
    let scale = ${p.getByOffset("cOffset")};
    let bias = ${f.getByOffset("cOffset")};
    let inputMean = ${h.getByOffset("cOffset")};
    let inputVar = ${m.getByOffset("cOffset")};
    let x = ${d.getByOffset("global_idx")};
    let value = (x - inputMean) * inverseSqrt(inputVar + epsilon) * scale + bias;
    ${y.setByOffset("global_idx","value")}
  }`;return{name:"BatchNormalization",shaderCache:{hint:`${e.epsilon}_${e.format}_${t}_${s}`,inputDependencies:l?["rank","type","type","type","type"]:void 0},getShaderSource:b,getRunData:()=>({outputs:[{dims:r[0].dims,dataType:r[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:l?[{type:12,data:u},...M(i)]:[{type:12,data:u}]})}},US=r=>Q(r),Qg=(r,e)=>{let{inputs:n,outputCount:t}=r,o=US({...e,outputCount:t});if(re.webgpu.validateInputContent&&FS(n,o),e.trainingMode)throw new Error("BatchNormalization trainingMode is not supported yet.");r.compute(GS(n,o))}});var WS,HS,eb,tb=A(()=>{"use strict";oe();ae();WS=r=>{if(r[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![320,640,1280].includes(r[0].dims[2]))throw new Error("number of channels should be 320, 640 or 1280");if(r[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(r[0].dims[2]!==r[1].dims[0])throw new Error("last dimension of input and bias are not the same")},HS=r=>{let e=r[0].dims,n=r[0].dims[2],t=$.size(e)/4,o=r[0].dataType,i=O("input",o,e,4),s=O("bias",o,[n],4),a=O("residual",o,e,4),u=R("output",o,e,4);return{name:"BiasAdd",getRunData:()=>({outputs:[{dims:e,dataType:r[0].dataType}],dispatchGroup:{x:Math.ceil(t/64)}}),getShaderSource:c=>`
  const channels = ${n}u / 4;
  ${c.declareVariables(i,s,a,u)}

  ${c.mainStart()}
    ${c.guardAgainstOutOfBoundsWorkgroupSizes(t)}
    let value = ${i.getByOffset("global_idx")}
      + ${s.getByOffset("global_idx % channels")} + ${a.getByOffset("global_idx")};
    ${u.setByOffset("global_idx","value")}
  }`}},eb=r=>{WS(r.inputs),r.compute(HS(r.inputs))}});var qS,be,nb,rb,ob,ib,sb,ab,ub,lb,cb,jS,db,pb,fb,hb,io,mb,Xi,gb,bb,yb,_b,wb,vb,xb,Tb,Ib,Sb,$b,Ab,Ob,Pb,Eb,Db,Cb,kb,Lb,cl,dl,Nb,Rb,zb,KS,XS,Bb,Zi=A(()=>{"use strict";ee();oe();Ce();ae();qS=(r,e,n,t,o,i,s)=>{let a=Math.ceil(e/4),u="";typeof o=="string"?u=`${o}(a)`:u=o("a");let l=O("inputData",n,[a],4),c=R("outputData",t,[a],4),d=[{name:"vec_size",type:"u32"}];return s&&d.push(...s),`
      ${r.registerUniforms(d).declareVariables(l,c)}

  ${i??""}

  ${r.mainStart()}
    ${r.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}

    let a = ${l.getByOffset("global_idx")};
    ${c.setByOffset("global_idx",u)}
  }`},be=(r,e,n,t,o,i=r.dataType,s,a)=>{let u=[{type:12,data:Math.ceil($.size(r.dims)/4)}];return s&&u.push(...s),{name:e,shaderCache:{hint:o,inputDependencies:["type"]},getShaderSource:l=>qS(l,$.size(r.dims),r.dataType,i,n,t,a),getRunData:l=>({outputs:[{dims:r.dims,dataType:i}],dispatchGroup:{x:Math.ceil($.size(l[0].dims)/64/4)},programUniforms:u})}},nb=r=>{r.compute(be(r.inputs[0],"Abs","abs"))},rb=r=>{r.compute(be(r.inputs[0],"Acos","acos"))},ob=r=>{r.compute(be(r.inputs[0],"Acosh","acosh"))},ib=r=>{r.compute(be(r.inputs[0],"Asin","asin"))},sb=r=>{r.compute(be(r.inputs[0],"Asinh","asinh"))},ab=r=>{r.compute(be(r.inputs[0],"Atan","atan"))},ub=r=>{r.compute(be(r.inputs[0],"Atanh","atanh"))},lb=r=>Q(r),cb=(r,e)=>{let n;switch(e.to){case 10:n="vec4<f16>";break;case 1:n="vec4<f32>";break;case 12:n="vec4<u32>";break;case 6:n="vec4<i32>";break;case 9:n="vec4<bool>";break;default:throw new RangeError(`not supported type (specified in attribute 'to' from 'Cast' operator): ${e.to}`)}r.compute(be(r.inputs[0],"Cast",n,void 0,e.cacheKey,e.to))},jS=r=>{let e,n,t=r.length>=2&&r[1].data!==0,o=r.length>=3&&r[2].data!==0;switch(r[0].dataType){case 1:e=t?r[1].getFloat32Array()[0]:-34028234663852886e22,n=o?r[2].getFloat32Array()[0]:34028234663852886e22;break;case 10:e=t?r[1].getUint16Array()[0]:64511,n=o?r[2].getUint16Array()[0]:31743;break;default:throw new Error("Unsupport data type")}return Q({min:e,max:n})},db=(r,e)=>{let n=e||jS(r.inputs),t=Re(r.inputs[0].dataType);r.compute(be(r.inputs[0],"Clip",o=>`clamp(${o}, vec4<${t}>(uniforms.min), vec4<${t}>(uniforms.max))`,void 0,n.cacheKey,void 0,[{type:r.inputs[0].dataType,data:n.min},{type:r.inputs[0].dataType,data:n.max}],[{name:"min",type:t},{name:"max",type:t}]),{inputs:[0]})},pb=r=>{r.compute(be(r.inputs[0],"Ceil","ceil"))},fb=r=>{r.compute(be(r.inputs[0],"Cos","cos"))},hb=r=>{r.compute(be(r.inputs[0],"Cosh","cosh"))},io=r=>Q(r),mb=(r,e)=>{let n=Re(r.inputs[0].dataType);r.compute(be(r.inputs[0],"Elu",t=>`elu_vf32(${t})`,`
  const elu_alpha_ = ${n}(${e.alpha});

  fn elu_f32(a: ${n}) -> ${n} {
  return select((exp(a) - 1.0) * elu_alpha_, a, a >= 0.0);
  }

  fn elu_vf32(v: vec4<${n}>) -> vec4<${n}> {
  return vec4(elu_f32(v.x), elu_f32(v.y), elu_f32(v.z), elu_f32(v.w));
  }`,e.cacheKey))},Xi=(r="f32")=>`
const r0: ${r} = 0.3275911;
const r1: ${r} = 0.254829592;
const r2: ${r} = -0.284496736;
const r3: ${r} = 1.421413741;
const r4: ${r} = -1.453152027;
const r5: ${r} = 1.061405429;

fn erf_vf32(v: vec4<${r}>) -> vec4<${r}> {
  let absv = abs(v);
  let x = 1.0 / (1.0 + r0 * absv);
  return sign(v) * (1.0 - ((((r5 * x + r4) * x + r3) * x + r2) * x + r1) * x * exp(-absv * absv));
}`,gb=r=>{let e=Re(r.inputs[0].dataType);r.compute(be(r.inputs[0],"Erf",n=>`erf_vf32(${n})`,Xi(e)))},bb=r=>{r.compute(be(r.inputs[0],"Exp","exp"))},yb=r=>{r.compute(be(r.inputs[0],"Floor","floor"))},_b=r=>{let e=Re(r.inputs[0].dataType);r.compute(be(r.inputs[0],"Gelu",n=>`0.5 * ${n} * (1.0 + erf_vf32(${n} * 0.7071067811865475))`,Xi(e)))},wb=(r,e)=>{let n=Re(r.inputs[0].dataType);r.compute(be(r.inputs[0],"LeakyRelu",t=>`select(leaky_relu_alpha_ * ${t}, ${t}, ${t} >= vec4<${n}>(0.0))`,`const leaky_relu_alpha_ = ${n}(${e.alpha});`,e.cacheKey))},vb=r=>{r.compute(be(r.inputs[0],"Not",e=>`!${e}`))},xb=r=>{r.compute(be(r.inputs[0],"Neg",e=>`-${e}`))},Tb=r=>{r.compute(be(r.inputs[0],"Reciprocal",e=>`1.0/${e}`))},Ib=r=>{let e=Re(r.inputs[0].dataType);r.compute(be(r.inputs[0],"Relu",n=>`select(vec4<${e}>(0.0), ${n}, ${n} > vec4<${e}>(0.0))`))},Sb=r=>{r.compute(be(r.inputs[0],"Sigmoid",e=>`(1.0 / (1.0 + exp(-${e})))`))},$b=r=>Q(r),Ab=(r,e)=>{let n=Re(r.inputs[0].dataType);r.compute(be(r.inputs[0],"HardSigmoid",t=>`max(vec4<${n}>(0.0), min(vec4<${n}>(1.0), ${e.alpha} * ${t} + vec4<${n}>(${e.beta})))`,void 0,e.cacheKey))},Ob=r=>{let e=Re(r.inputs[0].dataType);r.compute(be(r.inputs[0],"HardSwish",n=>`${n} * max(vec4<${e}>(0.0), min(vec4<${e}>(1.0), vec4<${e}>(${e}(1.0 / 6.0)) * ${n} + vec4<${e}>(0.5)))`))},Pb=r=>{r.compute(be(r.inputs[0],"Sin","sin"))},Eb=r=>{r.compute(be(r.inputs[0],"Sinh","sinh"))},Db=r=>{r.compute(be(r.inputs[0],"Sqrt","sqrt"))},Cb=r=>{r.compute(be(r.inputs[0],"Tan","tan"))},kb=r=>`sign(${r}) * (1 - exp(-2 * abs(${r}))) / (1 + exp(-2 * abs(${r})))`,Lb=r=>{r.compute(be(r.inputs[0],"Tanh",kb))},cl=(r="f32")=>`
const fast_gelu_a: ${r} = 0.5;
const fast_gelu_b: ${r} = 0.7978845608028654;
const fast_gelu_c: ${r} = 0.035677408136300125;

fn tanh_v(v: vec4<${r}>) -> vec4<${r}> {
  return ${kb("v")};
}
`,dl=r=>`(fast_gelu_a + fast_gelu_a * tanh_v(${r} * (fast_gelu_c * ${r} * ${r} + fast_gelu_b))) * ${r}`,Nb=r=>{let e=Re(r.inputs[0].dataType);r.compute(be(r.inputs[0],"FastGelu",dl,cl(e),void 0,r.inputs[0].dataType))},Rb=(r,e)=>{let n=Re(r.inputs[0].dataType);return r.compute(be(r.inputs[0],"ThresholdedRelu",t=>`select(vec4<${n}>(0.0), ${t}, ${t} > thresholded_relu_alpha_)`,`const thresholded_relu_alpha_ = vec4<${n}>(${e.alpha});`,e.cacheKey)),0},zb=r=>{r.compute(be(r.inputs[0],"Log","log"))},KS=(r,e)=>`
const alpha = vec4<${r}>(${e});
const one = ${r}(1.0);
const zero = ${r}(0.0);

fn quick_gelu_impl(x: vec4<${r}>) -> vec4<${r}> {
  let v = x *alpha;
  var x1 : vec4<${r}>;
  for (var i = 0; i < 4; i = i + 1) {
    if (v[i] >= zero) {
      x1[i] = one / (one + exp(-v[i]));
    } else {
      x1[i] = one - one / (one + exp(v[i]));
    }
  }
  return x * x1;
}
`,XS=r=>`quick_gelu_impl(${r})`,Bb=(r,e)=>{let n=Re(r.inputs[0].dataType);r.compute(be(r.inputs[0],"QuickGelu",XS,KS(n,e.alpha),e.cacheKey,r.inputs[0].dataType))}});var ZS,JS,Vb,Fb=A(()=>{"use strict";oe();ae();Zi();ZS=r=>{if(r[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![2560,5120,10240].includes(r[0].dims[2]))throw new Error("hidden state should be 2560, 5120 or 10240");if(r[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(r[0].dims[2]!==r[1].dims[0])throw new Error("last dimension of input and bias are not the same")},JS=r=>{let e=r[0].dims.slice();e[2]=e[2]/2;let n=O("input",r[0].dataType,r[0].dims,4),t=O("bias",r[0].dataType,[r[0].dims[2]],4),o=R("output",r[0].dataType,e,4),i=$.size(e)/4,s=Se(r[0].dataType);return{name:"BiasSplitGelu",getRunData:()=>({outputs:[{dims:e,dataType:r[0].dataType}],dispatchGroup:{x:Math.ceil(i/64)}}),getShaderSource:u=>`
  const M_SQRT2 = sqrt(2.0);
  const halfChannels = ${r[0].dims[2]/4/2}u;

  ${u.declareVariables(n,t,o)}

  ${Xi(s)}

  ${u.mainStart()}
    ${u.guardAgainstOutOfBoundsWorkgroupSizes(i)}
    let biasIdx = global_idx % halfChannels;
    let batchIndex = global_idx / halfChannels;
    let inputOffset = biasIdx + batchIndex * halfChannels * 2;
    let valueLeft = input[inputOffset] + bias[biasIdx];
    let valueRight = input[inputOffset + halfChannels] + bias[biasIdx + halfChannels];
    let geluRight = valueRight * 0.5 * (erf_vf32(valueRight / M_SQRT2) + 1);

    ${o.setByOffset("global_idx","valueLeft * geluRight")}
  }`}},Vb=r=>{ZS(r.inputs),r.compute(JS(r.inputs))}});var QS,YS,xn,Gb,Ub,Wb,Hb,qb,jb,Kb,Xb,Zb,Jb,Qb=A(()=>{"use strict";ee();oe();ae();QS=(r,e,n,t,o,i,s,a,u,l,c,d)=>{let p,f;typeof a=="string"?p=f=(b,_)=>`${a}((${b}),(${_}))`:typeof a=="function"?p=f=a:(p=a.scalar,f=a.vector);let h=R("outputData",c,t.length,4),m=O("aData",u,e.length,4),y=O("bData",l,n.length,4),g;if(o)if(i){let b=$.size(e)===1,_=$.size(n)===1,x=e.length>0&&e[e.length-1]%4===0,T=n.length>0&&n[n.length-1]%4===0;b||_?g=h.setByOffset("global_idx",f(b?`${m.type.value}(${m.getByOffset("0")}.x)`:m.getByOffset("global_idx"),_?`${y.type.value}(${y.getByOffset("0")}.x)`:y.getByOffset("global_idx"))):g=`
            let outputIndices = ${h.offsetToIndices("global_idx * 4u")};
            let offsetA = ${m.broadcastedIndicesToOffset("outputIndices",h)};
            let offsetB = ${y.broadcastedIndicesToOffset("outputIndices",h)};
            ${h.setByOffset("global_idx",f(s||x?m.getByOffset("offsetA / 4u"):`${m.type.value}(${m.getByOffset("offsetA / 4u")}[offsetA % 4u])`,s||T?y.getByOffset("offsetB / 4u"):`${y.type.value}(${y.getByOffset("offsetB / 4u")}[offsetB % 4u])`))}
          `}else g=h.setByOffset("global_idx",f(m.getByOffset("global_idx"),y.getByOffset("global_idx")));else{if(!i)throw new Error("no necessary to use scalar implementation for element-wise binary op implementation.");let b=(_,x,T="")=>{let S=`aData[indexA${x}][componentA${x}]`,P=`bData[indexB${x}][componentB${x}]`;return`
            let outputIndices${x} = ${h.offsetToIndices(`global_idx * 4u + ${x}u`)};
            let offsetA${x} = ${m.broadcastedIndicesToOffset(`outputIndices${x}`,h)};
            let offsetB${x} = ${y.broadcastedIndicesToOffset(`outputIndices${x}`,h)};
            let indexA${x} = offsetA${x} / 4u;
            let indexB${x} = offsetB${x} / 4u;
            let componentA${x} = offsetA${x} % 4u;
            let componentB${x} = offsetB${x} % 4u;
            ${_}[${x}] = ${T}(${p(S,P)});
          `};c===9?g=`
            var data = vec4<u32>(0);
            ${b("data",0,"u32")}
            ${b("data",1,"u32")}
            ${b("data",2,"u32")}
            ${b("data",3,"u32")}
            outputData[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:g=`
            ${b("outputData[global_idx]",0)}
            ${b("outputData[global_idx]",1)}
            ${b("outputData[global_idx]",2)}
            ${b("outputData[global_idx]",3)}
          `}return`
        ${r.registerUniform("vec_size","u32").declareVariables(m,y,h)}

        ${d??""}

        ${r.mainStart()}
        ${r.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${g}
      }`},YS=(r,e,n,t,o,i,s=n.dataType)=>{let a=n.dims.map(Number),u=t.dims.map(Number),l=!$.areEqual(a,u),c=a,d=$.size(a),p=!1,f=!1,h=[l];if(l){let m=bn.calcShape(a,u,!1);if(!m)throw new Error("Can't perform binary op on the given tensors");c=m.slice(),d=$.size(c);let y=$.size(a)===1,g=$.size(u)===1,b=a.length>0&&a[a.length-1]%4===0,_=u.length>0&&u[u.length-1]%4===0;h.push(y),h.push(g),h.push(b),h.push(_);let x=1;for(let T=1;T<c.length;T++){let S=a[a.length-T],P=u[u.length-T];if(S===P)x*=S;else break}x%4===0?(f=!0,p=!0):(y||g||b||_)&&(p=!0)}else p=!0;return h.push(p),{name:r,shaderCache:{hint:e+h.map(m=>m.toString()).join("_"),inputDependencies:["rank","rank"]},getShaderSource:m=>QS(m,a,u,c,p,l,f,o,n.dataType,t.dataType,s,i),getRunData:()=>({outputs:[{dims:c,dataType:s}],dispatchGroup:{x:Math.ceil(d/64/4)},programUniforms:[{type:12,data:Math.ceil($.size(c)/4)},...M(a,u,c)]})}},xn=(r,e,n,t,o,i)=>{r.compute(YS(e,o??"",r.inputs[0],r.inputs[1],n,t,i))},Gb=r=>{xn(r,"Add",(e,n)=>`${e}+${n}`)},Ub=r=>{xn(r,"Div",(e,n)=>`${e}/${n}`)},Wb=r=>{xn(r,"Equal",{scalar:(e,n)=>`u32(${e}==${n})`,vector:(e,n)=>`vec4<u32>(${e}==${n})`},void 0,void 0,9)},Hb=r=>{xn(r,"Mul",(e,n)=>`${e}*${n}`)},qb=r=>{let e=O("input",r.inputs[0].dataType,r.inputs[0].dims).type.value;xn(r,"Pow",{scalar:(t,o)=>`pow_custom(${t},${o})`,vector:(t,o)=>`pow_vector_custom(${t},${o})`},`
    fn pow_custom(a : ${e}, b : ${e}) -> ${e} {
      if (b == ${e}(0.0)) {
        return ${e}(1.0);
      } else if (a < ${e}(0.0) && f32(b) != floor(f32(b))) {
        return ${e}(pow(f32(a), f32(b))); // NaN
      }
      return select(sign(a), ${e}(1.0), round(f32(abs(b) % ${e}(2.0))) != 1.0) * ${e}(${e==="i32"?"round":""}(pow(f32(abs(a)), f32(b))));
    }
    fn pow_vector_custom(a : vec4<${e}>, b : vec4<${e}>) -> vec4<${e}> {
      // TODO: implement vectorized pow
      return vec4<${e}>(pow_custom(a.x, b.x), pow_custom(a.y, b.y), pow_custom(a.z, b.z), pow_custom(a.w, b.w));
    }
      `)},jb=r=>{xn(r,"Sub",(e,n)=>`${e}-${n}`)},Kb=r=>{xn(r,"Greater",{scalar:(e,n)=>`u32(${e}>${n})`,vector:(e,n)=>`vec4<u32>(${e}>${n})`},void 0,void 0,9)},Xb=r=>{xn(r,"Less",{scalar:(e,n)=>`u32(${e}<${n})`,vector:(e,n)=>`vec4<u32>(${e}<${n})`},void 0,void 0,9)},Zb=r=>{xn(r,"GreaterOrEqual",{scalar:(e,n)=>`u32(${e}>=${n})`,vector:(e,n)=>`vec4<u32>(${e}>=${n})`},void 0,void 0,9)},Jb=r=>{xn(r,"LessOrEqual",{scalar:(e,n)=>`u32(${e}<=${n})`,vector:(e,n)=>`vec4<u32>(${e}<=${n})`},void 0,void 0,9)}});var t$,n$,r$,o$,Yb,ey,ty=A(()=>{"use strict";ee();oe();Ce();ae();t$=(r,e)=>{if(!r||r.length<1)throw new Error("too few inputs");let n=0,t=r[n],o=t.dataType,i=t.dims.length;r.forEach((s,a)=>{if(a!==n){if(s.dataType!==o)throw new Error("input tensors should be one type");if(s.dims.length!==i)throw new Error("input tensors should have the same shape");s.dims.forEach((u,l)=>{if(l!==e&&u!==t.dims[l])throw new Error("non concat dimensions must match")})}})},n$=(r,e)=>`
  fn calculateInputIndex(index: u32) -> u32 {
    let sizeInConcatAxis = array<u32, ${r}u>(${e});
    for (var i: u32 = 0u; i < ${r}; i += 1u ) {
      if (index < sizeInConcatAxis[i]) {
        return i;
      }
    }
    return ${r}u;
  }`,r$=(r,e)=>{let n=r.length,t=[];for(let o=0;o<n;++o){let i=e.setByOffset("global_idx",r[o].getByIndices("indices"));n===1?t.push(i):o===0?t.push(`if (inputIndex == ${o}u) { ${i} }`):o===n-1?t.push(`else { ${i} }`):t.push(`else if (inputIndex == ${o}) { ${i} }`)}return t.join(`
`)},o$=(r,e,n,t)=>{let o=$.size(n),i=new Array(r.length),s=new Array(r.length),a=0,u=[],l=[],c=[{type:12,data:o}];for(let m=0;m<r.length;++m)a+=r[m].dims[e],i[m]=a,l.push(r[m].dims.length),s[m]=O(`input${m}`,t,l[m]),u.push("rank"),c.push({type:12,data:i[m]});for(let m=0;m<r.length;++m)c.push(...M(r[m].dims));c.push(...M(n));let d=R("output",t,n.length),p=d.indicesGet("indices",e),f=Array.from(Array(i.length).keys()).map(m=>`uniforms.sizeInConcatAxis${m}`).join(","),h=m=>`

  ${(()=>{m.registerUniform("outputSize","u32");for(let y=0;y<r.length;y++)m.registerUniform(`sizeInConcatAxis${y}`,"u32");return m.declareVariables(...s,d)})()}

  ${n$(i.length,f)}

  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

    var indices = ${d.offsetToIndices("global_idx")};

    let inputIndex = calculateInputIndex(${p});
    if (inputIndex != 0u) {
      let sizeInConcatAxis = array<u32, ${i.length}u>(${f});
      ${p} -= sizeInConcatAxis[inputIndex - 1u];
    }

    ${r$(s,d)}
  }`;return{name:"Concat",shaderCache:{hint:`${e}`,inputDependencies:u},getRunData:()=>({outputs:[{dims:n,dataType:t}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:c}),getShaderSource:h}},Yb=(r,e)=>{let n=r.inputs,t=n[0].dims,o=$.normalizeAxis(e.axis,t.length);t$(n,o);let i=t.slice();i[o]=n.reduce((a,u)=>a+(u.dims.length>o?u.dims[o]:0),0);let s=n.filter(a=>$.size(a.dims)>0);r.compute(o$(s,o,i,n[0].dataType),{inputs:s})},ey=r=>Q({axis:r.axis})});var Ot,Pt,Et,Ji,Fn=A(()=>{"use strict";ee();oe();Ot=(r,e,n="f32")=>{switch(r.activation){case"Relu":return`value = max(value, ${e}(0.0));`;case"Sigmoid":return`value = (${e}(1.0) / (${e}(1.0) + exp(-value)));`;case"Clip":return`value = clamp(value, ${e}(${n}(uniforms.clip_min)), ${e}(${n}(uniforms.clip_max)));`;case"HardSigmoid":return`value = max(${e}(0.0), min(${e}(1.0), ${n}(uniforms.alpha) * value + ${n}(uniforms.beta)));`;case"LeakyRelu":return`value = select(${n}(uniforms.alpha) * value, value, value >= ${e}(0.0));`;case"Tanh":return`let e2x = exp(-2.0 * abs(value));
              value = sign(value) * (1.0 - e2x) / (1.0 + e2x);
        `;case"":return"";default:throw new Error(`Unsupported activation ${r.activation}`)}},Pt=(r,e)=>{r.activation==="Clip"?e.push({type:1,data:r.clipMax},{type:1,data:r.clipMin}):r.activation==="HardSigmoid"?e.push({type:1,data:r.alpha},{type:1,data:r.beta}):r.activation==="LeakyRelu"&&e.push({type:1,data:r.alpha})},Et=(r,e)=>{r.activation==="Clip"?e.push({name:"clip_max",type:"f32"},{name:"clip_min",type:"f32"}):r.activation==="HardSigmoid"?e.push({name:"alpha",type:"f32"},{name:"beta",type:"f32"}):r.activation==="LeakyRelu"&&e.push({name:"alpha",type:"f32"})},Ji=r=>{let e=r?.activation||"";if(e==="HardSigmoid"){let[n,t]=r?.activation_params||[.2,.5];return{activation:e,alpha:n,beta:t}}else if(e==="Clip"){let[n,t]=r?.activation_params||[ag,ug];return{activation:e,clipMax:t,clipMin:n}}else if(e==="LeakyRelu"){let[n]=r?.activation_params||[.01];return{activation:e,alpha:n}}return{activation:e}}});var Ge,ny,Qi=A(()=>{"use strict";Ge=(r,e)=>{switch(r){case 1:return e;case 2:return`vec2<${e}>`;case 3:return`vec3<${e}>`;case 4:return`vec4<${e}>`;default:throw new Error(`${r}-component is not supported.`)}},ny=r=>`
      ${r?"value = value + getBiasByOutputCoords(coords);":""}
      `});var ry,oy=A(()=>{"use strict";ry=r=>`
fn getIndexFromCoords4D(coords : vec4<i32>, shape : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
      shape.y * shape.z * shape.w, shape.z * shape.w, shape.w, 1));
}
fn getOutputIndexFromCoords(coords : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
    i32(${r}.x), i32(${r}.y), i32(${r}.z), 1));
}
`});var so,Yi,es=A(()=>{"use strict";ee();oe();ae();Fn();so=(r,e,n,t,o)=>{let i=t-n;return`
      ${Array.from({length:n}).map((s,a)=>`
      if (${q(e.shape,a,e.rank)} != 1) {
        ${e.indicesSet(r,a,q(o,a+i,t))}
      } else {
        ${e.indicesSet(r,a,0)}
      }`).join("")}
`},Yi=(r,e,n,t,o=!1,i)=>{let s=r[0].dims,a=r[1].dims,u=s[s.length-2],l=a[a.length-1],c=s[s.length-1],d=ge(l),p=ge(c),f=ge(u),h=$.size(n)/d/f,m=r.length>2,y=t?t.slice(0,-2):n.slice(0,-2),b=[$.size(y),u,l],_=[{type:12,data:h},{type:12,data:u},{type:12,data:l},{type:12,data:c}];Pt(e,_),_.push(...M(y,s,a)),m&&_.push(...M(r[2].dims)),_.push(...M(b));let x=T=>{let S=Hi("batch_dims",r[0].dataType,y.length),P=O("a",r[0].dataType,s.length,p),E=O("b",r[1].dataType,a.length,d),N=R("output",r[0].dataType,b.length,d),B=Se(N.type.tensor),D=Ot(e,N.type.value,B),j=[P,E],C="";if(m){let V=o?d:1;j.push(O("bias",r[2].dataType,r[2].dims.length,V)),C=`${o?`value += bias[col / ${V}];`:`value += ${N.type.value}(bias[row + i]);`}`}let w=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"}];Et(e,w);let k=()=>{let V=`var a_data: ${P.type.value};`;for(let W=0;W<p;W++)V+=`
              let b_data${W} = b[(b_offset + (k + ${W}) * uniforms.N + col) / ${d}];`;for(let W=0;W<f;W++){V+=`a_data = a[(a_offset + (row + ${W}) * uniforms.K + k) / ${p}];`;for(let U=0;U<p;U++)V+=`
            values[${W}] = fma(${E.type.value}(a_data${p===1?"":`[${U}]`}), b_data${U}, values[${W}]);
`}return V};return`
  ${T.registerUniforms(w).registerInternalVariables(S).declareVariables(...j,N)}
  ${T.mainStart()}
    ${T.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let col = (global_idx % (uniforms.N / ${d})) * ${d};
    var index1 = global_idx / (uniforms.N / ${d});
    let stride1 = uniforms.M / ${f};
    let row = (index1 % stride1) * ${f};
    let batch = index1 / stride1;

    ${n.length===2?"":`let batch_indices = ${S.offsetToIndices("batch")};`}

    var a_indices: ${P.type.indices};
    ${so("a_indices",P,P.rank-2,S.rank,"batch_indices")}
    ${P.indicesSet("a_indices",P.rank-2,0)}
    ${P.indicesSet("a_indices",P.rank-1,0)}
    let a_offset = ${P.indicesToOffset("a_indices")};

    var b_indices: ${E.type.indices};
    ${so("b_indices",E,E.rank-2,S.rank,"batch_indices")}
    ${E.indicesSet("b_indices",E.rank-2,0)}
    ${E.indicesSet("b_indices",E.rank-1,0)}
    let b_offset = ${E.indicesToOffset("b_indices")};
    var values: array<${N.type.value}, ${f}>;
    for (var k: u32 = 0u; k < uniforms.K; k = k + ${p}) {
      ${k()}
    }
    for (var i = 0u; i < ${f}u; i++) {
      var value = values[i];
      ${C}
      ${D}
      let cur_indices = ${N.type.indices}(batch, row + i, col);
      let offset = ${N.indicesToOffset("cur_indices")};
      ${N.setByOffset(`offset / ${d}`,"value")};
    }
  }
  `};return{name:"MatMulNaive",shaderCache:{hint:`${e.activation};${d};${p};${f};${o}`,inputDependencies:m?["rank","rank","rank"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:i?i(n):n,dataType:r[0].dataType}],dispatchGroup:{x:Math.ceil(h/64)},programUniforms:_}),getShaderSource:x}}});var i$,s$,pl,iy,a$,fl,u$,ao,ts=A(()=>{"use strict";ee();oe();ae();Fn();es();Qi();i$=(r,e)=>r?`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          kStart + inputRow,
          globalRowStart / innerElementSize + inputCol${e?", batchIndices":""});
        `:`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          globalRow + innerRow,
          kStart / innerElementSize + inputCol${e?", batchIndices":""});
        `,s$=(r,e)=>r?`
        let ACached0 = mm_Asub[k * innerElementSize][localRow];
        let ACached1 = mm_Asub[k * innerElementSize + 1][localRow];
        let ACached2 = mm_Asub[k * innerElementSize + 2][localRow];
        ${e===3?"":"let ACached3 = mm_Asub[k * innerElementSize + 3][localRow];"}
        for (var i = 0; i < rowPerThread; i = i + 1) {
          acc[i] = BCached0 * ACached0[i] + acc[i];
          acc[i] = BCached1 * ACached1[i] + acc[i];
          acc[i] = BCached2 * ACached2[i] + acc[i];
          ${e===3?"":"acc[i] = BCached3 * ACached3[i] + acc[i];"}
        }`:`
        for (var i = 0; i < rowPerThread; i = i + 1) {
          let ACached = mm_Asub[tileRow + i][k];
          acc[i] = BCached0 * ACached.x + acc[i];
          acc[i] = BCached1 * ACached.y + acc[i];
          acc[i] = BCached2 * ACached.z + acc[i];
          ${e===3?"":"acc[i] = BCached3 * ACached.w + acc[i];"}
        }`,pl=(r,e,n="f32",t,o=!1,i=32,s=!1,a=32)=>{let u=e[1]*r[1],l=e[0]*r[0],c=o?u:i,d=o?i:u,p=c/e[0],f=i/e[1];if(!((o&&p===4&&r[1]===4||!o&&(p===3||p===4))&&c%e[0]===0&&i%e[1]===0&&r[0]===4))throw new Error(`If transposeA ${o} is true, innerElementSize ${p} and workPerThread[1] ${r[1]} must be 4.
      Otherwise, innerElementSize ${p} must be 3 or 4.
  tileAWidth ${c} must be divisible by workgroupSize[0]${e[0]}. tileInner ${i} must be divisible by workgroupSize[1] ${e[1]}. colPerThread ${r[0]} must be 4.`);return`
var<workgroup> mm_Asub: array<array<vec${p}<${n}>, ${c/p}>, ${d}>;
var<workgroup> mm_Bsub: array<array<vec4<${n}>, ${l/r[0]}>, ${i}>;

const rowPerThread = ${r[1]};
const colPerThread = ${r[0]};
const innerElementSize = ${p};
const tileInner = ${i};

@compute @workgroup_size(${e[0]}, ${e[1]}, ${e[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
  let localRow = i32(localId.y);
  let tileRow = localRow * rowPerThread;
  let tileCol = i32(localId.x);

  let globalRow =i32(globalId.y) * rowPerThread;
  let globalCol = i32(globalId.x);
  let batch = ${s?"0":"i32(globalId.z)"};
  ${t?`let batchIndices = ${t.offsetToIndices("u32(batch)")};`:""}
  let globalRowStart = i32(workgroupId.y) * ${u};

  let num_tiles = ${s?`${Math.ceil(a/i)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
  var kStart = ${s?`i32(globalId.z) * ${a}`:"0"};

  var acc: array<vec4<${n}>, rowPerThread>;

  // Loop over shared dimension.
  let tileRowB = localRow * ${f};
  for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let inputRow = tileRow + innerRow;
          let inputCol = tileCol;
          ${i$(o,t)}
      }

      // Load one tile of B into local memory.
      for (var innerRow = 0; innerRow < ${f}; innerRow = innerRow + 1) {
          let inputRow = tileRowB + innerRow;
          let inputCol = tileCol;
          mm_Bsub[inputRow][inputCol] = mm_readB(batch, kStart + inputRow, globalCol${t?", batchIndices":""});
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      for (var k = 0; k < tileInner / innerElementSize; k = k + 1) {
          let BCached0 = mm_Bsub[k * innerElementSize][tileCol];
          let BCached1 = mm_Bsub[k * innerElementSize + 1][tileCol];
          let BCached2 = mm_Bsub[k * innerElementSize + 2][tileCol];
          ${p===3?"":"let BCached3 = mm_Bsub[k * innerElementSize + 3][tileCol];"}

          ${s$(o,p)}
      }

      workgroupBarrier();
  }

  for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      mm_write(batch, globalRow + innerRow, globalCol, acc[innerRow]);
  }
}`},iy=(r,e)=>r?`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              kStart + inputRow,
              globalRowStart + inputCol${e?", batchIndices":""});
            `:`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              globalRowStart + inputRow,
              kStart + inputCol${e?", batchIndices":""});
            `,a$=r=>r?"let ACached = mm_Asub[k][tileRow + innerRow];":"let ACached = mm_Asub[tileRow + innerRow][k];",fl=(r,e,n="f32",t,o=!1,i=32,s=!1,a=32,u=!1)=>{let l=r[1]*e[1],c=r[0]*e[0],d=o?l:i,p=o?i:l;if(!(p%e[1]===0&&d%e[0]===0&&i%e[1]===0))throw new Error(`tileAHight ${p} must be divisible by workgroupSize[1]${e[1]}, tileAWidth ${d} must be divisible by workgroupSize[0]${e[0]}, tileInner ${i} must be divisible by workgroupSize[1]${e[1]}`);let f=p/e[1],h=d/e[0],m=i/e[1],y=u?`
    let localRow = i32(localId.y);
    let localCol = i32(localId.x);
    let globalRowStart = i32(workgroupId.y) * ${l};
    let globalColStart = i32(workgroupId.x) * ${c};

    // Loop over shared dimension.
    for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var inputRow = localRow; inputRow < ${p}; inputRow = inputRow + ${e[1]}) {
        for (var inputCol = localCol; inputCol < ${d}; inputCol = inputCol + ${e[0]}) {
          ${iy(o,t)}
        }
      }
      // Load one tile of B into local memory.
      for (var inputRow = localRow; inputRow < ${i}; inputRow = inputRow + ${e[1]}) {
            for (var inputCol = localCol; inputCol < ${c}; inputCol = inputCol + ${e[0]}) {
          mm_Bsub[inputRow][inputCol] = mm_readB(batch,
            kStart + inputRow,
            globalColStart + inputCol${t?", batchIndices":""});
        }
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      var BCached : array<${n}, colPerThread>;
      for (var k = 0; k < tileInner; k = k + 1) {
        for (var inner = 0; inner < colPerThread; inner = inner + 1) {
          BCached[inner] = mm_Bsub[k][localCol + inner * ${e[0]}];
        }
        for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let ACached = ${o?`mm_Asub[k][localRow + innerRow * ${e[1]}];`:`mm_Asub[localRow + innerRow * ${e[1]}][k];`}
          for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
            acc[innerRow][innerCol] = acc[innerRow][innerCol] +
                ACached * BCached[innerCol];
          }
        }
      }
      workgroupBarrier();
    }
    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      let gRow = globalRowStart + localRow + innerRow * ${e[1]};
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        let gCol = globalColStart + localCol + innerCol * ${e[0]};
        mm_write(batch, gRow, gCol, acc[innerRow][innerCol]);
      }
    }
    `:`
let tileRow = i32(localId.y) * rowPerThread;
let tileCol = i32(localId.x) * colPerThread;

let globalRow = i32(globalId.y) * rowPerThread;
let globalCol = i32(globalId.x) * colPerThread;
let globalRowStart = i32(workgroupId.y) * ${l};

let tileRowA = i32(localId.y) * ${f};
let tileColA = i32(localId.x) * ${h};
let tileRowB = i32(localId.y) * ${m};
// Loop over shared dimension.
for (var t = 0; t < num_tiles; t = t + 1) {
  // Load one tile of A into local memory.
  for (var innerRow = 0; innerRow < ${f}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < ${h}; innerCol = innerCol + 1) {
      let inputRow = tileRowA + innerRow;
      let inputCol = tileColA + innerCol;
      ${iy(o,t)}
    }
  }

  // Load one tile of B into local memory.
  for (var innerRow = 0; innerRow < ${m}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
      let inputRow = tileRowB + innerRow;
      let inputCol = tileCol + innerCol;
      mm_Bsub[inputRow][inputCol] = mm_readB(batch,
        kStart + inputRow,
        globalCol + innerCol${t?", batchIndices":""});
    }
  }
  kStart = kStart + tileInner;
  workgroupBarrier();

  // Compute acc values for a single thread.
  var BCached : array<${n}, colPerThread>;
  for (var k = 0; k < tileInner; k = k + 1) {
    for (var inner = 0; inner < colPerThread; inner = inner + 1) {
      BCached[inner] = mm_Bsub[k][tileCol + inner];
    }

    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      ${a$(o)}
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        acc[innerRow][innerCol] = acc[innerRow][innerCol] + ACached * BCached[innerCol];
      }
    }
  }

  workgroupBarrier();
}

for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
  for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
    mm_write(batch, globalRow + innerRow, globalCol + innerCol,
        acc[innerRow][innerCol]);
  }
}
`;return`
  var<workgroup> mm_Asub : array<array<${n}, ${d}>, ${p}>;
  var<workgroup> mm_Bsub : array<array<${n}, ${c}>, ${i}>;
  const rowPerThread = ${r[1]};
  const colPerThread = ${r[0]};
  const tileInner = ${i};

@compute @workgroup_size(${e[0]}, ${e[1]}, ${e[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
    let batch = ${s?"0":"i32(globalId.z)"};
    ${t?`let batchIndices = ${t.offsetToIndices("u32(batch)")};`:""}
    let num_tiles = ${s?`${Math.ceil(a/i)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
    var kStart = ${s?`i32(globalId.z) * ${a}`:"0"};

    var acc : array<array<${n}, colPerThread>, rowPerThread>;
    ${y}
  }
`},u$=(r,e,n,t,o=!1)=>{let[i,s,a,u]=t,l=Se(t[0].type.tensor);return`
    fn mm_readA(batch: i32, row: i32, colIn: i32, batchIndices: ${i.type.indices}) -> ${Ge(r,l)} {
      var value = ${Ge(r,l)}(0.0);
      let col = colIn * ${r};
      if(row < uniforms.dim_a_outer && col < uniforms.dim_inner)
      {
        var aIndices: ${s.type.indices};
        ${so("aIndices",s,s.rank-2,i.rank,"batchIndices")}
        ${s.indicesSet("aIndices",s.rank-2,"u32(row)")}
        ${s.indicesSet("aIndices",s.rank-1,"u32(colIn)")}
        value = ${s.getByIndices("aIndices")};
      }
      return value;
    }

    fn mm_readB(batch: i32, row: i32, colIn: i32, batchIndices: ${i.type.indices}) -> ${Ge(r,l)} {
      var value = ${Ge(r,l)}(0.0);
      let col = colIn * ${r};
      if(row < uniforms.dim_inner && col < uniforms.dim_b_outer)
      {
        var bIndices: ${a.type.indices};
        ${so("bIndices",a,a.rank-2,i.rank,"batchIndices")}
        ${a.indicesSet("bIndices",a.rank-2,"u32(row)")}
        ${a.indicesSet("bIndices",a.rank-1,"u32(colIn)")}
        value = ${a.getByIndices("bIndices")};
      }
      return value;
    }

    fn mm_write(batch: i32, row: i32, colIn: i32, valueIn: ${Ge(r,l)}) {
      let col = colIn * ${r};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer) {
        var value = valueIn;
        let coords = vec3<i32>(batch, row, colIn);
        ${e?`value = value + ${o?"bias[colIn]":`${Ge(r,l)}(bias[row])`};`:""}
        ${n}
        ${u.setByIndices("vec3<u32>(coords)","value")}
      }
    }
    `},ao=(r,e,n,t,o=!1,i)=>{let s=r[0].dims,a=r[1].dims,u=s.slice(0,-2),l=a.slice(0,-2),c=t?t.slice(0,-2):n.slice(0,-2),d=$.size(c),p=s[s.length-2],f=s[s.length-1],h=a[a.length-1],m=f%4===0&&h%4===0,y=p<=8?[4,1,1]:[4,4,1],g=[8,8,1],b=[Math.ceil(h/g[0]/y[0]),Math.ceil(p/g[1]/y[1]),Math.ceil(d/g[2]/y[2])],_=m?4:1,x=[...u,p,f/_],T=x.length,S=[...l,f,h/_],P=S.length,E=[d,p,h/_],N=[{type:6,data:p},{type:6,data:h},{type:6,data:f}];Pt(e,N),N.push(...M(c,x,S));let B=["rank","rank"],D=r.length>2;D&&(N.push(...M(r[2].dims)),B.push("rank")),N.push(...M(E));let j=C=>{let w=c.length,k=Hi("batchDims",r[0].dataType,w,1),V=Se(r[0].dataType),W=O("a",r[0].dataType,T,_),U=O("b",r[1].dataType,P,_),K=R("result",r[0].dataType,E.length,_),te=[W,U];if(D){let z=o?_:1;te.push(O("bias",r[2].dataType,r[2].dims.length,z))}let ne=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"}];Et(e,ne);let Ae=Se(K.type.tensor),se=Ot(e,K.type.value,Ae),L=u$(_,D,se,[k,W,U,K],o);return`
  ${C.registerUniforms(ne).registerInternalVariables(k).declareVariables(...te,K)}
  ${L}
  ${m?pl(y,g,V,k):fl(y,g,V,k)}
                   `};return{name:"MatMul",shaderCache:{hint:`${y};${e.activation};${m};${o}`,inputDependencies:B},getRunData:()=>({outputs:[{dims:i?i(n):n,dataType:r[0].dataType}],dispatchGroup:{x:b[0],y:b[1],z:b[2]},programUniforms:N}),getShaderSource:j}}});var l$,sy,ay=A(()=>{"use strict";ee();gn();ae();Fn();Qi();oy();ts();l$=(r,e,n,t,o=!1,i,s=4,a=4,u=4,l="f32")=>{let c=B=>{switch(B){case 1:return"resData = x[xIndex];";case 3:return`resData = vec3<${l}>(x[xIndex], x[xIndex + 1], x[xIndex + 2]);`;case 4:return"resData = x[xIndex / 4];";default:throw new Error(`innerElementSize ${B} is not supported.`)}},d=B=>{switch(B){case 1:return"return w[row * i32(uniforms.w_shape[3]) + colIn];";case 4:return"return w[row * i32(uniforms.w_shape[3]) / 4 + colIn];";default:throw new Error(`innerElementSize ${B} is not supported.`)}},p=r?`
    let coord = vec4<i32>(batch, xRow, xCol, xCh);
    `:`
    let coord = vec4<i32>(batch, xCh, xRow, xCol);
    `,f=r?`
    let coords = vec4<i32>(
      batch,
      row / outWidth,
      row % outWidth,
      col);
    `:`
    let coords = vec4<i32>(
      batch,
      row,
      col / outWidth,
      col % outWidth);
    `,h=r?"i32(uniforms.x_shape[1])":"i32(uniforms.x_shape[2])",m=r?"i32(uniforms.x_shape[2])":"i32(uniforms.x_shape[3])",y=r?"row":"col",g=r?"col":"row",b=`
    let inChannels = i32(uniforms.w_shape[2]);
    let outWidth = ${r?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
    let outRow = ${y} / outWidth;
    let outCol = ${y} % outWidth;

    let WRow = ${g} / (i32(uniforms.w_shape[1]) * inChannels);
    let WCol = ${g} / inChannels % i32(uniforms.w_shape[1]);
    let xRow = outRow * uniforms.stride[0] + uniforms.dilation[0] * WRow - uniforms.pad[0];
    let xCol = outCol * uniforms.stride[1] + uniforms.dilation[1] * WCol - uniforms.pad[1];
    let xCh = ${g} % inChannels;
    var resData = ${Ge(s,l)}(0.0);
    // The bounds checking is always needed since we use it to pad zero for
    // the 'same' padding type.
    if (xRow >= 0 && xRow < ${h} && xCol >= 0 && xCol < ${m}) {
      ${p}
      let xIndex = getIndexFromCoords4D(coord, vec4<i32>(uniforms.x_shape));
      ${c(s)}
    }
    return resData;`,_=r?e&&t?`
    let col = colIn * ${s};
    ${b}`:`
    let col = colIn * ${s};
    if (row < uniforms.dim_a_outer && col < uniforms.dim_inner) {
      ${b}
    }
    return ${Ge(s,l)}(0.0);`:t&&n?`
    let col = colIn * ${s};
    ${b}`:`
    let col = colIn * ${s};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${b}
    }
    return ${Ge(s,l)}(0.0);`,x=r?t&&n?d(a):`
    let col = colIn * ${a};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${d(a)}
    }
    return ${Ge(a,l)}(0.0);`:`
    let col = colIn * ${a};
    if (row < uniforms.dim_inner && col < uniforms.dim_a_outer) {
      ${d(a)}
    }
    return ${Ge(a,l)}(0.0);`,T=Ge(u,l),S=r?Ge(s,l):Ge(a,l),P=r?Ge(a,l):Ge(s,l),E=Ot(i,T,l);return`
    fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${S} {
      ${r?_:x}
    }

    fn mm_readB(batch: i32, row : i32, colIn : i32) -> ${P} {
      ${r?x:_}
    }

    fn mm_write(batch: i32, row : i32, colIn : i32, valueIn : ${T}) {
      let col = colIn * ${u};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer)
      {
      var value = valueIn;
      let outWidth = ${r?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
      ${f}
      ${ny(o)}
      ${E}
      setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);
      }
    }`},sy=(r,e,n,t,o,i,s,a,u)=>{let l=e.format==="NHWC",c=l?r[0].dims[3]:r[0].dims[1],d=n[0],p=l?n[2]:n[3],f=l?n[1]:n[2],h=l?n[3]:n[1],m=l&&(c%4===0||c%3===0)&&h%4===0,y=l?h:p*f,g=l?p*f:h,b=[8,8,1],_=t<=8?[4,1,1]:[4,4,1],x=[Math.ceil(y/b[0]/_[0]),Math.ceil(g/b[1]/_[1]),Math.ceil(d/b[2]/_[2])];le("verbose",()=>`[conv2d_mm_webgpu] dispatch = ${x}`);let T=m?l&&c%4!==0?3:4:1,S=b[1]*_[1],P=b[0]*_[0],E=Math.max(b[0]*T,b[1]),N=t%S===0,B=o%P===0,D=i%E===0,j=m?[T,4,4]:[1,1,1],C=[{type:6,data:t},{type:6,data:o},{type:6,data:i},{type:6,data:[e.pads[0],e.pads[1]]},{type:6,data:e.strides},{type:6,data:e.dilations}];Pt(e,C),C.push(...M(r[0].dims,r[1].dims));let w=["rank","rank"];s&&(C.push(...M(r[2].dims)),w.push("rank")),C.push(...M(n));let k=V=>{let W=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"},{name:"pad",type:"i32",length:2},{name:"stride",type:"i32",length:2},{name:"dilation",type:"i32",length:2}];Et(e,W);let U=m?4:1,K=Se(r[0].dataType),te=`
      fn setOutputAtIndex(flatIndex : i32, value : ${m?`vec4<${K}>`:K}) {
        result[flatIndex] = ${m?`vec4<${K}>`:K}(value);
      }
      fn setOutputAtCoords(d0 : i32, d1 : i32, d2 : i32, d3 : i32, value : ${m?`vec4<${K}>`:K}) {
        let flatIndex = getOutputIndexFromCoords(vec4<i32>(d0, d1, d2, d3));
        setOutputAtIndex(flatIndex ${m?"/ 4":""}, value);
      }`,ne=O("x",r[0].dataType,r[0].dims.length,T===3?1:T),Ae=O("w",r[1].dataType,r[1].dims.length,U),se=[ne,Ae],L=R("result",r[0].dataType,n.length,U);if(s){let z=O("bias",r[2].dataType,r[2].dims.length,U);se.push(z),te+=`
        fn getBiasByOutputCoords(coords : vec4<i32>) -> ${m?`vec4<${K}>`:K} {
          return bias[coords.${l?"w":"y"}${m?"/ 4":""}];
        }`}return`
        ${ry("uniforms.result_strides")}
        //struct Uniforms { xShape : vec4<i32>, wShape : vec4<i32>, outShape : vec4<i32>,
        //  outShapeStrides: vec3<i32>, filterDims : vec2<i32>, pad : vec2<i32>, stride : vec2<i32>,
        //  dilation : vec2<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32 };
        ${V.registerUniforms(W).declareVariables(...se,L)}
        ${te}
        ${l$(l,N,B,D,s,e,j[0],j[1],j[2],K)}
        ${m?pl(_,b,K,void 0,!l,E):fl(_,b,K,void 0,!l,E,!1,void 0,a)}`};return{name:"Conv2DMatMul",shaderCache:{hint:`${e.cacheKey};${T};${m};${N};${B};${D};${S};${P};${E}`,inputDependencies:w},getRunData:()=>({outputs:[{dims:u?u(n):n,dataType:r[0].dataType}],dispatchGroup:{x:x[0],y:x[1],z:x[2]},programUniforms:C}),getShaderSource:k}}});var c$,uy,ns,d$,ly,p$,cy,dy,py=A(()=>{"use strict";ee();gn();oe();ae();Fn();Qi();c$=r=>{let e=1;for(let n=0;n<r.length;n++)e*=r[n];return e},uy=r=>typeof r=="number"?[r,r,r]:r,ns=(r,e)=>e<=1?r:r+(r-1)*(e-1),d$=(r,e,n,t=1)=>{let o=ns(e,t);return Math.floor((r[0]*(n-1)-n+o)/2)},ly=(r,e,n,t,o)=>{o==null&&(o=d$(r,e[0],t[0]));let i=[0,0,0,n];for(let s=0;s<3;s++)r[s]+2*o>=e[s]&&(i[s]=Math.trunc((r[s]-e[s]+2*o)/t[s]+1));return i},p$=(r,e,n,t,o,i,s,a,u,l)=>{let c,d,p,f;if(r==="VALID"&&(r=0),typeof r=="number"){c={top:r,bottom:r,left:r,right:r,front:r,back:r};let h=ly([e,n,t,1],[a,u,l],1,[o,i,s],r);d=h[0],p=h[1],f=h[2]}else if(Array.isArray(r)){if(!r.every((m,y,g)=>m===g[0]))throw Error(`Unsupported padding parameter: ${r}`);c={top:r[0],bottom:r[1],left:r[2],right:r[3],front:r[4],back:r[5]};let h=ly([e,n,t,1],[a,u,l],1,[o,i,s],r[0]);d=h[0],p=h[1],f=h[2]}else if(r==="SAME_UPPER"){d=Math.ceil(e/o),p=Math.ceil(n/i),f=Math.ceil(t/s);let h=(d-1)*o+a-e,m=(p-1)*i+u-n,y=(f-1)*s+l-t,g=Math.floor(h/2),b=h-g,_=Math.floor(m/2),x=m-_,T=Math.floor(y/2),S=y-T;c={top:_,bottom:x,left:T,right:S,front:g,back:b}}else throw Error(`Unknown padding parameter: ${r}`);return{padInfo:c,outDepth:d,outHeight:p,outWidth:f}},cy=(r,e,n,t,o,i=!1,s="channelsLast")=>{let a,u,l,c,d;if(s==="channelsLast")[a,u,l,c,d]=r;else if(s==="channelsFirst")[a,d,u,l,c]=r;else throw new Error(`Unknown dataFormat ${s}`);let[p,,f,h,m]=e,[y,g,b]=uy(n),[_,x,T]=uy(t),S=ns(f,_),P=ns(h,x),E=ns(m,T),{padInfo:N,outDepth:B,outHeight:D,outWidth:j}=p$(o,u,l,c,y,g,b,S,P,E),C=i?p*d:p,w=[0,0,0,0,0];return s==="channelsFirst"?w=[a,C,B,D,j]:s==="channelsLast"&&(w=[a,B,D,j,C]),{batchSize:a,dataFormat:s,inDepth:u,inHeight:l,inWidth:c,inChannels:d,outDepth:B,outHeight:D,outWidth:j,outChannels:C,padInfo:N,strideDepth:y,strideHeight:g,strideWidth:b,filterDepth:f,filterHeight:h,filterWidth:m,effectiveFilterDepth:S,effectiveFilterHeight:P,effectiveFilterWidth:E,dilationDepth:_,dilationHeight:x,dilationWidth:T,inShape:r,outShape:w,filterShape:e}},dy=(r,e,n,t,o,i)=>{let s=i==="channelsLast",a=s?r[0].dims[3]:r[0].dims[1],u=!1,l=[64,1,1],c={x:n.map((b,_)=>_)},d=[Math.ceil(c$(c.x.map(b=>n[b]))/l[0]),1,1];le("verbose",()=>`[conv3d_naive_webgpu] dispatch = ${d}`);let p=u?s&&a%4!==0?3:4:1,f=$.size(n),h=[{type:12,data:f},{type:12,data:t},{type:12,data:o},{type:12,data:e.strides},{type:12,data:e.dilations}];Pt(e,h),h.push(...M(r[0].dims,r[1].dims));let m=["rank","rank"],y=r.length===3;y&&(h.push(...M(r[2].dims)),m.push("rank")),h.push(...M(n));let g=b=>{let _=[{name:"output_size",type:"u32"},{name:"filter_dims",type:"u32",length:t.length},{name:"pads",type:"u32",length:o.length},{name:"strides",type:"u32",length:e.strides.length},{name:"dilations",type:"u32",length:e.dilations.length}];Et(e,_);let x=u?4:1,T=Se(r[0].dataType),S=O("x",r[0].dataType,r[0].dims.length,p===3?1:p),P=O("W",r[1].dataType,r[1].dims.length,x),E=[S,P],N=R("result",r[0].dataType,n.length,x),B="";if(y){let C=O("bias",r[2].dataType,r[2].dims.length,x);E.push(C),B+=`
        fn getBiasByOutputCoords(coords : array<u32, 5>) -> ${u?`vec4<${T}>`:T} {
          return bias[${s?q("coords",4,5):q("coords",1,5)}${u?"/ 4":""}];
        }`}let D=Ge(p,T),j=Ot(e,D,T);return`
            ${B}
            fn getX(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> ${T} {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${S.getByIndices("aIndices")};
            }
            fn getW(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> ${T} {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${P.getByIndices("aIndices")};
            }
          ${b.registerUniforms(_).declareVariables(...E,N)}
          ${b.mainStart()}
          ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
              let coords = ${N.offsetToIndices("global_idx")};
              let batch = ${q("coords",0,S.rank)};
              let d2 = ${s?q("coords",S.rank-1,S.rank):q("coords",1,S.rank)};
              let xFRCCorner = vec3<u32>(${s?q("coords",1,S.rank):q("coords",2,S.rank)},
              ${s?q("coords",2,S.rank):q("coords",3,S.rank)},
              ${s?q("coords",3,S.rank):q("coords",4,S.rank)}) * uniforms.strides - uniforms.pads;
              let xFCorner = xFRCCorner.x;
              let xRCorner = xFRCCorner.y;
              let xCCorner = xFRCCorner.z;
              let xShapeY = ${s?q("uniforms.x_shape",1,S.rank):q("uniforms.x_shape",2,S.rank)};
              let xShapeZ = ${s?q("uniforms.x_shape",2,S.rank):q("uniforms.x_shape",3,S.rank)};
              let xShapeW = ${s?q("uniforms.x_shape",3,S.rank):q("uniforms.x_shape",4,S.rank)};
              let xShapeU = ${s?q("uniforms.x_shape",4,S.rank):q("uniforms.x_shape",1,S.rank)};
              let inputDepthNearestVec4 = (xShapeU / 4) * 4;
              let inputDepthVec4Remainder = xShapeU % 4;

              var value = ${T}(0);
              for (var wF = 0u; wF < uniforms.filter_dims[0]; wF++) {
                let xF = xFCorner + wF * uniforms.dilations[0];
                if (xF < 0 || xF >= xShapeY) {
                  continue;
                }

                for (var wR = 0u; wR < uniforms.filter_dims[1]; wR++) {
                  let xR = xRCorner + wR * uniforms.dilations[1];
                  if (xR < 0 || xR >= xShapeZ) {
                    continue;
                  }

                  for (var wC = 0u; wC < uniforms.filter_dims[2]; wC++) {
                    let xC = xCCorner + wC * uniforms.dilations[2];
                    if (xC < 0 || xC >= xShapeW) {
                      continue;
                    }

                    for (var d1 = 0u; d1 < inputDepthNearestVec4; d1 += 4) {
                      ${s?`let xValues = vec4<${T}>(
                               getX(batch, xF, xR, xC, d1),
                               getX(batch, xF, xR, xC, d1 + 1),
                               getX(batch, xF, xR, xC, d1 + 2),
                               getX(batch, xF, xR, xC, d1 + 3));
                            `:`let xValues = vec4<${T}>(
                               getX(batch, d1, xF, xR, xC),
                               getX(batch, d1 + 1, xF, xR, xC),
                               getX(batch, d1 + 2, xF, xR, xC),
                               getX(batch, d1 + 3, xF, xR, xC));
                            `}
                            let wValues = vec4<${T}>(
                              getW(d2, d1, wF, wR, wC),
                              getW(d2, d1 + 1, wF, wR, wC),
                              getW(d2, d1 + 2, wF, wR, wC),
                              getW(d2, d1 + 3, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                    if (inputDepthVec4Remainder == 1) {
                        ${s?`value += getX(batch, xF, xR, xC, inputDepthNearestVec4)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`:`value += getX(batch, inputDepthNearestVec4, xF, xR, xC)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`}
                    } else if (inputDepthVec4Remainder == 2) {
                      ${s?`let xValues = vec2<${T}>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1));
                      `:`let xValues = vec2<${T}>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC));
                    `}
                    let wValues = vec2<${T}>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC));
                      value += dot(xValues, wValues);
                    } else if (inputDepthVec4Remainder == 3) {
                      ${s?`let xValues = vec3<${T}>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 2));
                      `:`let xValues = vec3<${T}>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 2, xF, xR, xC));
                    `}
                    let wValues = vec3<${T}>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 2, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                  }
                }
              }
              ${y?"value = value + getBiasByOutputCoords(coords)":""};
              ${j}
              result[global_idx] = ${T}(value);
          }`};return{name:"Conv3DNaive",shaderCache:{hint:`${e.cacheKey};${s};${p};${y}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:n,dataType:r[0].dataType}],dispatchGroup:{x:d[0],y:d[1],z:d[2]},programUniforms:h}),getShaderSource:g}}});var fy,hy,my=A(()=>{"use strict";ee();oe();ae();Fn();fy=(r,e,n,t)=>{let o=r.length>2,i=o?"value += b[output_channel];":"",s=r[0].dims,a=r[1].dims,u=e.format==="NHWC",l=u?n[3]:n[1],c=l/e.group,d=u&&c>=4?ge(l):1,p=$.size(n)/d,f=[{type:12,data:p},{type:12,data:e.dilations},{type:12,data:[e.strides[0],e.strides[1]]},{type:12,data:[e.pads[0],e.pads[1]]},{type:12,data:c}];Pt(e,f),f.push(...M(s,[a[0],a[1],a[2],a[3]/d]));let h=o?["rank","rank","rank"]:["rank","rank"];f.push(...M([n[0],n[1],n[2],n[3]/d]));let m=y=>{let g=R("output",r[0].dataType,n.length,d),b=Se(g.type.tensor),_=Ot(e,g.type.value,b),x=O("x",r[0].dataType,s.length),T=O("w",r[1].dataType,a.length,d),S=[x,T];o&&S.push(O("b",r[2].dataType,r[2].dims,d));let P=[{name:"output_size",type:"u32"},{name:"dilations",type:"u32",length:e.dilations.length},{name:"strides",type:"u32",length:2},{name:"pads",type:"u32",length:2},{name:"output_channels_per_group",type:"u32"}];Et(e,P);let E=u?`
      for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[0]; wHeight++) {
        let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

        if (xHeight < 0u || xHeight >= uniforms.x_shape[1]) {
          continue;
        }

        for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[1]; wWidth++) {
          let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
          if (xWidth < 0u || xWidth >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[2]; wInChannel++) {
            let input_channel = in_channel_offset + wInChannel;
            let xVal = ${x.get("batch","xHeight","xWidth","input_channel")};
            let wVal = ${T.get("wHeight","wWidth","wInChannel","output_channel")};
            value += xVal * wVal;
          }
        }
      }
      `:`
      for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[1]; wInChannel++) {
        let input_channel = in_channel_offset + wInChannel;
        for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[2]; wHeight++) {
          let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

          if (xHeight < 0u || xHeight >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[3]; wWidth++) {
            let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
            if (xWidth < 0u || xWidth >= uniforms.x_shape[3]) {
              continue;
            }

            let xVal = ${x.get("batch","input_channel","xHeight","xWidth")};
            let wVal = ${T.get("output_channel","wInChannel","wHeight","wWidth")};
            value += xVal * wVal;
          }
        }
      }
      `;return`
  ${y.registerUniforms(P).declareVariables(...S,g)}

  ${y.mainStart()}
    ${y.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let outputIndices = ${g.offsetToIndices("global_idx")};
    let batch: u32 = outputIndices[0];
    let output_channel: u32 = outputIndices[${u?3:1}];
    let xRCCorner: vec2<u32> = vec2<u32>(outputIndices[${u?1:2}], outputIndices[${u?2:3}]) * uniforms.strides - uniforms.pads;
    let group_id: u32 = output_channel * ${d} / uniforms.output_channels_per_group;
    var in_channel_offset = group_id * uniforms.w_shape[${u?2:1}];

    var value: ${g.type.value} = ${g.type.value}(0);
    ${E}
    ${i}
    ${_}
    ${g.setByOffset("global_idx","value")}
  }`};return{name:"GroupedConv",shaderCache:{hint:`${e.cacheKey}_${d}`,inputDependencies:h},getRunData:()=>({outputs:[{dims:t?t(n):n,dataType:r[0].dataType}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:f}),getShaderSource:m}},hy=(r,e,n,t)=>{let o=r.length>2,i=ge(n[3]),s=ge(n[2]),a=$.size(n)/i/s,u=[r[0].dims[0],r[0].dims[1],r[0].dims[2],r[0].dims[3]/i],l=[r[1].dims[0],r[1].dims[1],r[1].dims[2],r[1].dims[3]/i],c=[n[0],n[1],n[2],n[3]/i],d=[{type:12,data:a},{type:6,data:[e.strides[0],e.strides[1]]},{type:6,data:[e.pads[0],e.pads[1]]}];Pt(e,d),d.push(...M(u,l,c));let p=(s-1)*e.strides[1]+l[1],f=h=>{let m=R("output",r[0].dataType,c.length,i),y=Se(m.type.tensor),g=Ot(e,m.type.value,y),b=O("x",r[0].dataType,u.length,i),_=O("w",r[1].dataType,l.length,i),x=[b,_];o&&x.push(O("b",r[2].dataType,r[2].dims,i));let T=o?"value += b[output_channel];":"",S=[{name:"output_size",type:"u32"},{name:"strides",type:"i32",length:2},{name:"pads",type:"i32",length:2}];return Et(e,S),`
  ${h.registerUniforms(S).declareVariables(...x,m)}
  ${h.mainStart()}
    ${h.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let width0 = uniforms.output_shape[3];
    let output_channel = global_idx % width0;
    var index1 = global_idx / width0;
    let width1 = uniforms.output_shape[2] / ${s}u;
    let col = (index1 % width1) * ${s}u;
    index1 = index1 / width1;
    let row = index1 % uniforms.output_shape[1];
    let batch = index1 / uniforms.output_shape[1];

    let x_corner = vec2<i32>(i32(row), i32(col)) * uniforms.strides - uniforms.pads;

    var x_vals: array<${b.type.value}, ${p}>;
    var values: array<${m.type.value}, ${s}>;
    let input_channel = output_channel;
    // Use constant instead of uniform can give better performance for w's height/width.
    for (var w_height: u32 = 0u; w_height < ${l[0]}; w_height++) {
      let x_height = x_corner.x + i32(w_height);
      if (x_height >= 0 && u32(x_height) < uniforms.x_shape[1]) {
        for (var i = 0; i < ${p}; i++) {
          let x_width = x_corner.y + i;
          if (x_width >= 0 && u32(x_width) < uniforms.x_shape[2]) {
            x_vals[i] = ${b.get("batch","u32(x_height)","u32(x_width)","input_channel")};
          } else {
            x_vals[i] = ${b.type.value}(0);
          }
        }
        for (var w_width: u32 = 0u; w_width < ${l[1]}; w_width++) {
          let w_val = ${_.get("w_height","w_width","0","output_channel")};
          for (var i = 0u; i < ${s}u; i++) {
            values[i] = fma(x_vals[i * u32(uniforms.strides[1]) + w_width], w_val, values[i]);
          }
        }
      }
    }

    for (var i = 0u; i < ${s}u; i++) {
      var value = values[i];
      ${T}
      ${g}
      ${m.set("batch","row","col + i","output_channel","value")};
    }
  }`};return{name:"GroupedConv-Vectorize",shaderCache:{hint:`${e.cacheKey};${i};${s};${p};${l[0]};${l[1]}`,inputDependencies:o?["rank","rank","type"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:t?t(n):n,dataType:r[0].dataType}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:d}),getShaderSource:f}}});var f$,hl,h$,ml,gl,gy,m$,g$,bl,by=A(()=>{"use strict";oe();ay();py();ts();my();Fn();es();Sn();f$=(r,e,n,t,o,i)=>{let s=r[0],a=r.slice(i?1:2,i?3:4),u=a.length,l=e[0],d=e.slice(2).map((h,m)=>h+(h-1)*(n[m]-1)),f=a.map((h,m)=>h+t[m]+t[m+u]).map((h,m)=>Math.floor((h-d[m]+o[m])/o[m]));return f.splice(0,0,s),f.splice(i?3:1,0,l),f},hl=[2,3,1,0],h$=(r,e)=>{if(!r||r.length!==2&&r.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(r[0].dims.length>5)throw new Error("greater than 5D is not supported");if(r[0].dims.length!==r[1].dims.length)throw new Error("filter does not have same dimension as input");let n=r[0].dims[e.format==="NHWC"?r[0].dims.length-1:1],t=r[1].dims[1]*e.group;if(n!==t)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");if(r.length===3&&(r[2].dims.length!==1||r[1].dims[0]!==r[2].dims[0]))throw new Error("invalid bias");let o=r[0].dims.length-2;if(e.dilations.length!==o)throw new Error(`dilations should be ${o}D`);if(e.strides.length!==o)throw new Error(`strides should be ${o}D`);if(e.pads.length!==o*2)throw new Error(`pads should be ${o*2}D`);if(e.kernelShape.length!==0&&e.kernelShape.length!==r[1].dims.length-2)throw new Error("invalid kernel shape")},ml=(r,e)=>{let n=r.kernelShape.slice();n.length<e[1].dims.length-2&&n.push(...Array(e[1].dims.length-2-n.length).fill(0));for(let i=2;i<e[1].dims.length;++i)n[i-2]===0&&(n[i-2]=e[1].dims[i]);let t=r.pads.slice();ir.adjustPadsBasedOnAutoPad(e[0].dims,r.strides,r.dilations,n,t,r.format==="NHWC",r.autoPad);let o=Object.assign({},r);return Object.assign(o,{kernelShape:n,pads:t}),o},gl=r=>{let e=Ji(r),n=r.format,t=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][r.auto_pad],o=r.dilations,i=r.group,s=r.kernel_shape,a=r.pads,u=r.strides,l=r.w_is_const();return{autoPad:t,format:n,dilations:o,group:i,kernelShape:s,pads:a,strides:u,wIsConst:l,...e,cacheKey:`${r.format};${e.activation};`}},gy=(r,e,n,t)=>{let o=n.format==="NHWC",i=f$(e[0].dims,e[1].dims,n.dilations,n.pads,n.strides,o);if(n.group!==1){let S=[e[0]];if(o){let E=r.kernelCustomData.wT??r.compute(We(e[1],hl),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];n.wIsConst&&!r.kernelCustomData.wT&&(r.kernelCustomData.wT=E),S.push(E)}else S.push(e[1]);e.length===3&&S.push(e[2]),!r.adapterInfo.isArchitecture("ampere")&&o&&e[1].dims[0]===n.group&&e[1].dims[1]===1&&n.dilations[0]===1&&n.dilations[1]===1?r.compute(hy(S,n,i,t),{inputs:S}):r.compute(fy(S,n,i,t),{inputs:S});return}let s=e.length===3,a=e[0].dims[o?1:2],u=e[0].dims[o?2:3],l=e[0].dims[o?3:1],c=e[1].dims[2],d=e[1].dims[3],p=i[o?1:2],f=i[o?2:3],h=i[o?3:1],m=o&&c===a&&d===u&&n.pads[0]===0&&n.pads[1]===0;if(m||c===1&&d===1&&n.dilations[0]===1&&n.dilations[1]===1&&n.strides[0]===1&&n.strides[1]===1&&n.pads[0]===0&&n.pads[1]===0){let S=i[0],P,E,N,B=[];if(o){let C=r.kernelCustomData.wT??r.compute(We(e[1],hl),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];if(n.wIsConst&&!r.kernelCustomData.wT&&(r.kernelCustomData.wT=C),m){let w=a*u*l;P=e[0].reshape([1,S,w]),E=C.reshape([1,w,h]),N=[1,S,h]}else P=e[0].reshape([S,a*u,l]),E=C.reshape([1,l,h]),N=[S,p*f,h];B.push(P),B.push(E)}else P=e[0].reshape([S,l,a*u]),E=e[1].reshape([1,h,l]),N=[S,h,p*f],B.push(E),B.push(P);s&&B.push(e[2]);let D=N[2],j=B[0].dims[B[0].dims.length-1];D<8&&j<8?r.compute(Yi(B,n,i,N,o,t),{inputs:B}):r.compute(ao(B,n,i,N,o,t),{inputs:B});return}let y=!0,g=r.kernelCustomData.wT??r.compute(We(e[1],hl),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];n.wIsConst&&!r.kernelCustomData.wT&&(r.kernelCustomData.wT=g);let b=[e[0],g];s&&b.push(e[2]);let _=o?p*f:h,x=o?h:p*f,T=c*d*l;r.compute(sy(b,n,i,_,x,T,s,y,t),{inputs:b})},m$=(r,e)=>{let n=e.format==="NHWC",t=[r.inputs[0].reshape(n?[r.inputs[0].dims[0],1,r.inputs[0].dims[1],r.inputs[0].dims[2]]:[r.inputs[0].dims[0],r.inputs[0].dims[1],1,r.inputs[0].dims[2]]),r.inputs[1].reshape([r.inputs[1].dims[0],r.inputs[1].dims[1],1,r.inputs[1].dims[2]])];r.inputs.length===3&&t.push(r.inputs[2]);let o=[0,e.pads[0],0,e.pads[1]],i=[1].concat(e.strides),s=[1].concat(e.dilations),a=[1].concat(e.kernelShape),u=ml({...e,pads:o,strides:i,dilations:s,kernelShape:a},t);gy(r,t,u,l=>n?[l[0],l[2],l[3]]:[l[0],l[1],l[3]])},g$=(r,e,n)=>{let t=n.format==="NHWC"?"channelsLast":"channelsFirst",o=ml(n,e),i=n.autoPad==="NOTSET"?n.pads:n.autoPad,s=cy(e[0].dims,e[1].dims,n.strides,n.dilations,i,!1,t);r.compute(dy(e,o,s.outShape,[s.filterDepth,s.filterHeight,s.filterWidth],[s.padInfo.front,s.padInfo.top,s.padInfo.left],t))},bl=(r,e)=>{if(h$(r.inputs,e),r.inputs[0].dims.length===3)m$(r,e);else if(r.inputs[0].dims.length===5)g$(r,r.inputs,e);else{let n=ml(e,r.inputs);gy(r,r.inputs,n)}}});var yy,_y=A(()=>{"use strict";ee();gn();oe();ae();yy=(r,e,n)=>{let t=r.length>2,o=e.outputShape,i=e.format==="NHWC",s=e.group,a=r[1].dims,u=a[2]/s,l=a[3],c=i?ge(u):1,d=i&&l===1&&u>=4,p=d?Math.floor(u/4)*4:Math.floor(u/c)*c,f=u-p,h=i?ge(l):1,m=i?l===1?c:h:1,y=$.size(o)/h,g=[Math.ceil(y/64),1,1];le("verbose",()=>`[conv2d_backprop_webgpu] dispatch = ${g}`);let b=["rank","rank"],_=[e.strides[0],e.strides[1]],x=[e.kernelShape[i?1:2],e.kernelShape[i?2:3]],T=[e.dilations[0],e.dilations[1]],S=[x[0]+(e.dilations[0]<=1?0:(e.kernelShape[i?1:2]-1)*(e.dilations[0]-1)),x[1]+(e.dilations[1]<=1?0:(e.kernelShape[i?2:3]-1)*(e.dilations[1]-1))],P=[S[0]-1-Math.floor((e.pads[0]+e.pads[2])/2),S[1]-1-Math.floor((e.pads[1]+e.pads[3])/2)],E=[{type:12,data:y},{type:12,data:_},{type:12,data:x},{type:12,data:T},{type:12,data:S},{type:6,data:P},{type:12,data:p},{type:12,data:u},{type:12,data:l},...M(r[0].dims,r[1].dims)];t&&(E.push(...M(r[2].dims)),b.push("rank")),E.push(...M(o));let N=B=>{let D=[{name:"output_size",type:"u32"},{name:"strides",type:"u32",length:_.length},{name:"filter_dims",type:"u32",length:x.length},{name:"dilations",type:"u32",length:x.length},{name:"effective_filter_dims",type:"u32",length:S.length},{name:"pads",type:"i32",length:P.length},{name:"input_channels_per_group_int",type:"u32"},{name:"input_channels_per_group",type:"u32"},{name:"output_channels_per_group",type:"u32"}],j=Se(r[0].dataType),C=i?1:2,w=i?2:3,k=i?3:1,V=O("W",r[1].dataType,r[1].dims.length,m),W=O("Dy",r[0].dataType,r[0].dims.length,c),U=[W,V];t&&U.push(O("bias",r[2].dataType,[o[k]].length,h));let K=R("result",r[0].dataType,o.length,h),te=()=>{let se="";if(d)c===4?se+=`
        let xValue = ${W.getByOffset("x_offset")};
        let wValue = ${V.getByOffset("w_offset")};
        dotProd = dotProd + dot(xValue, wValue);
        x_offset += 1u;
        w_offset += 1u;`:c===2?se+=`
          dotProd = dotProd + dot(vec4<${j}>(${W.getByOffset("x_offset")}, ${W.getByOffset("x_offset + 1u")}), vec4<${j}>(${V.getByOffset("w_offset")}, ${V.getByOffset("w_offset + 1u")}));
          x_offset += 2u;
          w_offset += 2u;`:c===1&&(se+=`
          dotProd = dotProd + dot(vec4<${j}>(${W.getByOffset("x_offset")}, ${W.getByOffset("x_offset + 1u")}, ${W.getByOffset("x_offset + 2u")}, ${W.getByOffset("x_offset + 3u")}), vec4<${j}>(${V.getByOffset("w_offset")}, ${V.getByOffset("w_offset + 1u")}, ${V.getByOffset("w_offset + 2u")}, ${V.getByOffset("w_offset + 3u")}));
          x_offset += 4u;
          w_offset += 4u;`);else if(se+=`
                  let xValue = ${i?W.getByOffset(`${W.indicesToOffset(`${W.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${c}`):W.get("batch","inputChannel","idyR","idyC")};
        `,c===1)se+=`
          let w_offset = ${V.indicesToOffset(`${V.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel, wOutChannel)`)};
          let wValue = ${V.getByOffset(`w_offset / ${m}`)};
          dotProd = dotProd + xValue * wValue;`;else for(let L=0;L<c;L++)se+=`
            let wValue${L} = ${V.getByOffset(`${V.indicesToOffset(`${V.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel + ${L}, wOutChannel)`)} / ${m}`)};
            dotProd = dotProd + xValue[${L}] * wValue${L};`;return se},ne=()=>{if(f===0)return"";if(!d)throw new Error(`packInputAs4 ${d} is not true.`);let se="";if(c===1){se+="dotProd = dotProd";for(let L=0;L<f;L++)se+=`
            + ${W.getByOffset(`x_offset + ${L}`)} * ${V.getByOffset(`w_offset + ${L}`)}`;se+=";"}else if(c===2){if(f!==2)throw new Error(`Invalid inputChannelsRemainder ${f}.`);se+=`
          let xValue = ${W.getByOffset("x_offset")};
          let wValue = ${V.getByOffset("w_offset")};
          dotProd = dotProd + dot(xValue, wValue);`}return se},Ae=`
            let outputIndices = ${K.offsetToIndices(`global_idx * ${h}`)};
            let batch = ${K.indicesGet("outputIndices",0)};
            let d1 = ${K.indicesGet("outputIndices",k)};
            let r = ${K.indicesGet("outputIndices",C)};
            let c = ${K.indicesGet("outputIndices",w)};
            let dyCorner = vec2<i32>(i32(r), i32(c)) - uniforms.pads;
            let dyRCorner = dyCorner.x;
            let dyCCorner = dyCorner.y;
            let groupId = d1 / uniforms.output_channels_per_group;
            let wOutChannel = d1 - groupId * uniforms.output_channels_per_group;
            // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
            // ? = to be determined. : = across all values in that axis.
            var dotProd = ${K.type.value}(0.0);
            var wR: u32 = 0;
            if (uniforms.dilations.x == 1) {
              // Minimum wR >= 0 that satisfies (dyRCorner + wR) % (uniforms.strides.x) == 0
              wR = u32(((dyRCorner + i32(uniforms.strides.x) - 1) / i32(uniforms.strides.x)) * i32(uniforms.strides.x) - dyRCorner);
            }
            for (; wR < uniforms.effective_filter_dims.x; wR = wR + 1) {
              if (wR % uniforms.dilations.x != 0) {
                continue;
              }
              let dyR = (${j}(dyRCorner) + ${j}(wR)) / ${j}(uniforms.strides[0]);
              let wRPerm = uniforms.filter_dims.x - 1 - wR / uniforms.dilations.x;
              if (dyR < 0.0 || dyR >= ${j}(uniforms.Dy_shape[${C}]) || fract(dyR) > 0.0 ||
                  wRPerm < 0) {
                continue;
              }
              let idyR: u32 = u32(dyR);
              var wC: u32 = 0;
              if (uniforms.dilations.y == 1) {
                // Minimum wC >= 0 that satisfies (dyCCorner + wC) % (uniforms.strides.y) == 0
                wC = u32(((dyCCorner + i32(uniforms.strides.y) - 1) / i32(uniforms.strides.y)) * i32(uniforms.strides.y) - dyCCorner);
              }
              for (; wC < uniforms.effective_filter_dims.y; wC = wC + 1) {
                if (wC % uniforms.dilations.y != 0) {
                  continue;
                }
                let dyC = (${j}(dyCCorner) + ${j}(wC)) / ${j}(uniforms.strides.y);
                let wCPerm = uniforms.filter_dims.y - 1 - wC / uniforms.dilations.y;
                if (dyC < 0.0 || dyC >= ${j}(uniforms.Dy_shape[${w}]) ||
                    fract(dyC) > 0.0 || wCPerm < 0) {
                  continue;
                }
                let idyC: u32 = u32(dyC);
                var inputChannel = groupId * uniforms.input_channels_per_group;
                ${d?`
                var x_offset = ${W.indicesToOffset(`${W.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${c};
                var w_offset = ${V.indicesToOffset(`${V.type.indices}(wRPerm, wCPerm, inputChannel, wOutChannel)`)} / ${m};
                  `:""}
                for (var d2: u32 = 0; d2 < uniforms.input_channels_per_group_int; d2 = d2 + ${d?4:c}) {
                  ${te()}
                  inputChannel = inputChannel + ${d?4:c};
                }
                ${ne()}
                wC = wC + uniforms.strides.y - 1;
              }
              wR = wR + uniforms.strides[0] - 1;
            }
            let value = dotProd${t?` + bias[d1 / ${h}]`:""};
            ${K.setByOffset("global_idx","value")};
          `;return`
    ${B.registerUniforms(D).declareVariables(...U,K)}
      ${B.mainStart()}
      ${B.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")};
    ${Ae}}`};return{name:"ConvTranspose2D",shaderCache:{hint:`${e.cacheKey};${c}${m}${h}${d}${f}`,inputDependencies:b},getRunData:()=>({dispatchGroup:{x:g[0],y:g[1],z:g[2]},outputs:[{dims:n?n(o):o,dataType:r[0].dataType}],programUniforms:E}),getShaderSource:N}}});var b$,y$,_$,wy,vy,w$,xy,v$,Ty,Iy=A(()=>{"use strict";_y();Fn();Sn();b$=(r,e,n,t,o,i)=>(r-1)*e+n+(t-1)*o+1-i,y$=(r,e,n,t,o)=>{let i=Math.floor(r/2);e==="SAME_UPPER"?(n[t]=i,n[o]=r-i):e==="SAME_LOWER"&&(n[t]=r-i,n[o]=i)},_$=(r,e,n,t,o,i,s,a,u,l)=>{let c=r.length-2,d=l.length===0;u.length<c&&u.push(...Array(c-u.length).fill(0));let p=r[0],f=e[a?3:1]*o;for(let h=0,m=r.length-c-(a?1:0);h<c;++h,++m){let y=r[m],g=d?y*s[h]:l[h],b=b$(y,s[h],i[h],e[m],n[h],g);y$(b,t,i,h,h+c),d&&l.push(s[h]*(y-1)+u[h]+(e[m]-1)*n[h]+1-i[h]-i[h+c])}l.splice(0,0,p),l.splice(a?3:1,0,f)},wy=(r,e)=>{let n=r.kernelShape.slice();if(r.kernelShape.length===0||r.kernelShape.reduce((d,p)=>d*p,1)===0){n.length=0;for(let d=2;d<e[1].dims.length;++d)n.push(e[1].dims[d])}let t=r.format==="NHWC";n.splice(0,0,e[1].dims[0]),n.splice(t?3:1,0,e[1].dims[1]);let o=r.pads.slice(),i=r.outputShape.slice(),s=r.outputPadding.slice(),a=e[0].dims,u=r.dilations.slice();if(u.reduce((d,p)=>d+p,0)===0){let d=e[0].dims.length-2;u=new Array(d).fill(1)}let l=r.strides.slice();if(l.reduce((d,p)=>d+p,0)===0){let d=e[0].dims.length-2;l=new Array(d).fill(1)}_$(a,n,u,r.autoPad,r.group,o,l,t,s,i);let c=Object.assign({},r);return Object.assign(c,{kernelShape:n,pads:o,outputPadding:s,outputShape:i,dilations:u,strides:l}),c},vy=r=>{let e=Ji(r),n=r.format,t=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][typeof r.autoPad>"u"?0:r.autoPad],o=r.dilations,i=r.group??1,s=r.kernelShape,a=r.pads,u=r.strides,l=r.wIsConst(),c=r.outputPadding,d=r.outputShape;return{autoPad:t,format:n,dilations:o,group:i,kernelShape:s,outputPadding:c,outputShape:d,pads:a,strides:u,wIsConst:l,...e,cacheKey:`${r.format};${e.activation};`}},w$=(r,e)=>{if(!r||r.length!==2&&r.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(r[0].dims.length!==4&&r[0].dims.length!==3)throw new Error("currently only support 2-dimensional conv");if(r[0].dims.length!==r[1].dims.length)throw new Error("filter does not have same dimension as input");let n=r[0].dims[e.format==="NHWC"?r[0].dims.length-1:1],t=r[1].dims[0];if(n!==t)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");let o=r[1].dims[1]*e.group;if(r.length===3&&(r[2].dims.length!==1||r[2].dims[0]!==o))throw new Error("invalid bias");let i=r[0].dims.length-2;if(e.dilations.reduce((c,d)=>c+d,0)>0&&e.dilations.length!==i)throw new Error(`dilations should be ${i}D`);if(e.strides.reduce((c,d)=>c+d,0)>0&&e.strides.length!==i)throw new Error(`strides should be ${i}D`);if(e.pads.reduce((c,d)=>c+d,0)>0&&e.pads.length!==i*2)throw new Error(`pads should be ${i*2}D`);if(e.outputPadding.length!==i&&e.outputPadding.length!==0)throw new Error(`output_padding should be ${i}D`);if(e.kernelShape.reduce((c,d)=>c+d,0)>0&&e.kernelShape.length!==0&&e.kernelShape.length!==r[1].dims.length-2)throw new Error("invalid kernel shape");if(e.outputShape.length!==0&&e.outputShape.length!==r[0].dims.length-2)throw new Error("invalid output shape")},xy=(r,e,n,t)=>{let o=r.kernelCustomData.wT??r.compute(We(e[1],[2,3,0,1]),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];n.wIsConst&&!r.kernelCustomData.wT&&(r.kernelCustomData.wT=o);let i=[e[0],o];e.length===3&&i.push(e[2]),r.compute(yy(i,n,t),{inputs:i})},v$=(r,e)=>{let n=e.format==="NHWC",t=[r.inputs[0].reshape(n?[r.inputs[0].dims[0],1,r.inputs[0].dims[1],r.inputs[0].dims[2]]:[r.inputs[0].dims[0],r.inputs[0].dims[1],1,r.inputs[0].dims[2]]),r.inputs[1].reshape([r.inputs[1].dims[0],r.inputs[1].dims[1],1,r.inputs[1].dims[2]])];r.inputs.length===3&&t.push(r.inputs[2]);let o=e.kernelShape;(o.length===0||o[0]===0)&&(o=[r.inputs[1].dims[2]]);let i=e.dilations;(i.length===0||i[0]===0)&&(i=[1]);let s=e.strides;(s.length===0||s[0]===0)&&(s=[1]);let a=e.pads;a.length===0&&(a=[0,0]),a=[0,a[0],0,a[1]],s=[1].concat(s),i=[1].concat(i),o=[1].concat(o);let u=e.outputPadding;u=[0].concat(u);let l=wy({...e,pads:a,strides:s,dilations:i,kernelShape:o,outputPadding:u},t);xy(r,t,l,c=>n?[c[0],c[2],c[3]]:[c[0],c[1],c[3]])},Ty=(r,e)=>{if(w$(r.inputs,e),r.inputs[0].dims.length===3)v$(r,e);else{let n=wy(e,r.inputs);xy(r,r.inputs,n)}}});var x$,Sy,$y,Ay=A(()=>{"use strict";ee();oe();Ce();ae();x$=(r,e,n,t)=>{let o=$.size(e),i=e.length,s=O("input",r,i),a=R("output",r,i),u=n.dataType===6?n.getInt32Array()[0]:Number(n.getBigInt64Array()[0]),l=$.normalizeAxis(u,i),c=d=>{let p=` i32(${s.indicesGet("inputIndices","uniforms.axis")}) `,f=q("uniforms.input_shape","uniforms.axis",i),h=t.reverse?p+(t.exclusive?" + 1":""):"0",m=t.reverse?f:p+(t.exclusive?"":" + 1");return`
                ${d.registerUniform("outputSize","u32").registerUniform("axis","u32").declareVariables(s,a)}
                ${d.mainStart()}
                  ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
                  var inputIndices = ${a.offsetToIndices("global_idx")};
                  var sum = ${a.type.value}(0);
                  let first : i32 = ${h};
                  let last : i32 = ${m};
                  for (var i : i32 = first; i < last; i++) {
                    ${s.indicesSet("inputIndices","uniforms.axis","u32(i)")};
                    sum = sum + ${s.getByIndices("inputIndices")};
                  }
                  ${a.setByOffset("global_idx","sum")};
                }`};return{name:"CumSum",shaderCache:{hint:t.cacheKey,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:e,dataType:r}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:[{type:12,data:o},{type:12,data:l},...M(e,e)]}),getShaderSource:c}},Sy=(r,e)=>{let n=r.inputs[0].dims,t=r.inputs[0].dataType,o=r.inputs[1];r.compute(x$(t,n,o,e),{inputs:[0]})},$y=r=>{let e=r.exclusive===1,n=r.reverse===1;return Q({exclusive:e,reverse:n})}});var T$,I$,S$,Oy,Py,Ey=A(()=>{"use strict";ee();oe();Ce();ae();T$=r=>{if(!r||r.length!==1)throw new Error("DepthToSpace requires 1 input.");if(r[0].dims.length!==4)throw new Error("DepthToSpace requires 4D input.")},I$=(r,e,n,t)=>{let o=[];o.push(`fn perm(i: ${t.type.indices}) -> ${n.type.indices} {
    var a: ${n.type.indices};`);for(let i=0;i<e;++i)o.push(n.indicesSet("a",r[i],`i[${i}]`));return o.push("return a;}"),o.join(`
`)},S$=(r,e)=>{let n,t,o,i,s,a,u=e.format==="NHWC",l=e.blocksize,c=e.mode==="DCR";u?([n,t,o,i]=r.dims,s=c?[n,t,o,l,l,i/l**2]:[n,t,o,i/l**2,l,l],a=c?[0,1,3,2,4,5]:[0,1,4,2,5,3]):([n,t,o,i]=[r.dims[0],r.dims[2],r.dims[3],r.dims[1]],s=c?[n,l,l,i/l**2,t,o]:[n,i/l**2,l,l,t,o],a=c?[0,3,4,1,5,2]:[0,1,4,2,5,3]);let d=r.reshape(s),p=d.dims.length,f=r.dataType,h=O("a",f,p),m=R("output",f,p),y=g=>`
  ${g.registerUniform("output_size","u32").declareVariables(h,m)}

  ${I$(a,p,h,m)}

  ${g.mainStart()}
    ${g.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${m.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${m.setByOffset("global_idx",h.getByIndices("aIndices"))}
  }`;return{name:"DepthToSpace",shaderCache:{hint:`${r.dims};${e.blocksize};${e.mode}`,inputDependencies:["rank"]},getRunData:g=>{let b=u?[n,t*l,o*l,i/l**2]:[n,i/l**2,t*l,o*l],_=$.size(b),x=d.dims,T=$.sortBasedOnPerm(x,a);return{outputs:[{dims:b,dataType:g[0].dataType}],dispatchGroup:{x:Math.ceil(_/64)},programUniforms:[{type:12,data:_},...M(x,T)]}},getShaderSource:y}},Oy=(r,e)=>{T$(r.inputs),r.compute(S$(r.inputs[0],e))},Py=r=>Q({blocksize:r.blocksize,mode:r.mode,format:r.format})});var Gn,rs,yl,Cy,ur,$$,A$,O$,ky,Ly,Ny,P$,E$,Dy,D$,Ry,zy,By=A(()=>{"use strict";ee();oe();Ce();ae();Gn=256,rs=512,yl=2*Math.PI,Cy=r=>{let e=[],n=r;for(let t of[4,2,3,5])for(;n%t===0;)e.push(t),n/=t;return n===1?e:void 0},ur=r=>{let e=r.toPrecision(9);return/[.eE]/.test(e)?e:`${e}.0`},$$=(r,e,n,t,o)=>{let i=n/r,s=rs-t,a=l=>`smem[${s}u + base + ${l*e}u]`,u=`  for (var t = local_idx; t < ${i}u; t += ${Gn}u) {
`;u+=`    let twiddleIndex = t % ${e}u;
    let angleUnit = f32(twiddleIndex);
`,u+=`    var leg: array<vec2<f32>, 5>;
`;for(let l=0;l<r;l++){let c=`${t}u + t + ${l*i}u`;if(l===0)u+=`    leg[0] = smem[${c}];
`;else{let d=o*yl*l/(r*e);u+=`    { let a = ${ur(d)} * angleUnit; leg[${l}] = cmul(smem[${c}], vec2<f32>(cos(a), sin(a))); }
`}}if(u+=`    let base = (t / ${e}u) * ${e*r}u + twiddleIndex;
`,r===2)u+=`    ${a(0)} = leg[0] + leg[1];
    ${a(1)} = leg[0] - leg[1];
`;else if(r===4){let l=o<0?"vec2<f32>(oddDiff.y, -oddDiff.x)":"vec2<f32>(-oddDiff.y, oddDiff.x)";u+=`    let evenSum = leg[0] + leg[2]; let evenDiff = leg[0] - leg[2];
`,u+=`    let oddSum = leg[1] + leg[3]; let oddDiff = leg[1] - leg[3];
`,u+=`    let oddRot = ${l};
`,u+=`    ${a(0)} = evenSum + oddSum;
    ${a(1)} = evenDiff + oddRot;
`,u+=`    ${a(2)} = evenSum - oddSum;
    ${a(3)} = evenDiff - oddRot;
`}else for(let l=0;l<r;l++){let c=["leg[0]"];for(let d=1;d<r;d++){let p=o*yl*(d*l)/r,f=ur(Math.cos(p)),h=ur(Math.sin(p));c.push(`vec2<f32>(leg[${d}].x*${f} - leg[${d}].y*${h}, leg[${d}].x*${h} + leg[${d}].y*${f})`)}u+=`    ${a(l)} = ${c.join(" + ")};
`}return`${u}  }
  workgroupBarrier();
`},A$=(r,e,n)=>{let t="",o=1,i=0;for(let s of r)t+=$$(s,o,e,i,n),o*=s,i=rs-i;return{code:t,resultOffset:i}},O$=(r,e,n,t,o)=>{let i=r.dims,s=i.length,a=i[s-1],u=i[e],l=n&&t?(u-1)*2:u;o!==void 0&&(l=o);let c=n&&t?1:2,d=t&&!n?Math.floor(l/2)+1:l,p=i.slice();p[e]=d,p[s-1]=c;let f=1;for(let m=e+1;m<s-1;m++)f*=i[m];let h=$.size(i)/a/u;return{dataType:r.dataType,outputDims:p,length:l,signalLength:u,inner:f,batch:h,inputComponents:a,outputComponents:c,outputLength:d,inverse:n,onesided:t}},ky=(r,e)=>[e,r.length,r.inputComponents,r.outputComponents,r.inverse,r.onesided].join(";"),Ly=r=>[{type:12,data:r.batch},{type:12,data:r.signalLength},{type:12,data:r.inner},{type:12,data:r.outputLength}],Ny=(r,e,n)=>r.registerUniform("batch","u32").registerUniform("signalLength","u32").registerUniform("inner","u32").registerUniform("outputLength","u32").declareVariables(e,n),P$=r=>{let{dataType:e,length:n,inputComponents:t,outputComponents:o,inverse:i,onesided:s}=r,a=Re(e),u=i?1:-1,l=i?1/n:1,c=Cy(n),d=p=>{let f=O("x",e,[1]),h=R("y",e,[1]),m=T=>{let S=`inBase + (${T}) * uniforms.inner * ${t}u`,P=`f32(${f.getByOffset(S)})`,E=t===2?`f32(${f.getByOffset(`${S} + 1u`)})`:"0.0";return`vec2<f32>(${P}, ${E})`},y;if(i&&s){let T=Math.floor(n/2)+1,S=n%2===0?`select(provided, provided - 1u, provided == ${T}u)`:"provided";y=`
    let provided = min(uniforms.signalLength, ${T}u);
    for (var i = local_idx; i < ${n}u; i += ${Gn}u) {
      if (i < provided) { smem[i] = ${m("i")}; } else { smem[i] = vec2<f32>(0.0); }
    }
    workgroupBarrier();
    for (var k = local_idx + 1u; k < ${S}; k += ${Gn}u) {
      let h = smem[k];
      smem[${n}u - k] = vec2<f32>(h.x, -h.y);
    }
    workgroupBarrier();`}else y=`
    let loadCount = min(uniforms.signalLength, ${n}u);
    for (var i = local_idx; i < ${n}u; i += ${Gn}u) {
      if (i < loadCount) { smem[i] = ${m("i")}; } else { smem[i] = vec2<f32>(0.0); }
    }
    workgroupBarrier();`;let{code:g,resultOffset:b}=A$(c,n,u),_=l===1?`smem[${b}u + i]`:`smem[${b}u + i] * ${ur(l)}`,x=o===2?h.setByOffset("off + 1u",`${a}(v.y)`):"";return`
  ${Ny(p,f,h)}
  var<workgroup> smem: array<vec2<f32>, ${2*rs}>;
  fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
  }
  ${p.mainStart(Gn)}
    let row = workgroup_index;
    if (row >= uniforms.batch) { return; }
    let outer = row / uniforms.inner;
    let within = row % uniforms.inner;
    let inBase = (outer * uniforms.signalLength * uniforms.inner + within) * ${t}u;
    let outBase = (outer * uniforms.outputLength * uniforms.inner + within) * ${o}u;
    ${y}
${g}    for (var i = local_idx; i < uniforms.outputLength; i += ${Gn}u) {
      let v = ${_};
      let off = outBase + i * uniforms.inner * ${o}u;
      ${h.setByOffset("off",`${a}(v.x)`)}
      ${x}
    }
  }`};return{name:"DFT",shaderCache:{hint:ky(r,"fft"),inputDependencies:["type"]},getShaderSource:d,getRunData:()=>({outputs:[{dims:r.outputDims,dataType:e}],programUniforms:Ly(r),dispatchGroup:{x:r.batch}})}},E$=r=>{let{dataType:e,length:n,inputComponents:t,outputComponents:o,inverse:i,onesided:s}=r,a=Re(e),u=i?1:-1,l=i?1/n:1,c=d=>{let p=O("x",e,[1]),f=R("y",e,[1]),h=_=>{let x=`inBase + (${_}) * uniforms.inner * ${t}u`,T=`f32(${p.getByOffset(x)})`,S=t===2?`f32(${p.getByOffset(`${x} + 1u`)})`:"0.0";return`vec2<f32>(${T}, ${S})`},m=i&&s?`fn spectrum(inBase: u32, k: u32) -> vec2<f32> {
    let provided = min(uniforms.signalLength, ${Math.floor(n/2)+1}u);
    if (k < provided) { return ${h("k")}; }
    let m = ${n}u - k;
    if (m < provided) {
      let h = ${h("m")};
      return vec2<f32>(h.x, -h.y);
    }
    return vec2<f32>(0.0, 0.0);
  }`:`fn spectrum(inBase: u32, n: u32) -> vec2<f32> {
    if (n < uniforms.signalLength) { return ${h("n")}; }
    return vec2<f32>(0.0, 0.0);
  }`,y=`
      let angle = ${ur(u*yl)} * f32(knMod) / ${ur(n)};
      acc += cmul(spectrum(inBase, n), vec2<f32>(cos(angle), sin(angle)));
      knMod += k;
      if (knMod >= ${n}u) { knMod -= ${n}u; }`,g=o===2?f.setByOffset("off + 1u",`${a}(v.y)`):"",b=l===1?"acc":`acc * ${ur(l)}`;return`
  ${Ny(d,p,f)}
  fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
  }
  ${m}
  ${d.mainStart(Gn)}
    let row = workgroup_index;
    if (row >= uniforms.batch) { return; }
    let outer = row / uniforms.inner;
    let within = row % uniforms.inner;
    let inBase = (outer * uniforms.signalLength * uniforms.inner + within) * ${t}u;
    let outBase = (outer * uniforms.outputLength * uniforms.inner + within) * ${o}u;
    for (var k = local_idx; k < uniforms.outputLength; k += ${Gn}u) {
      var acc = vec2<f32>(0.0, 0.0);
      var knMod = 0u;
      for (var n = 0u; n < ${n}u; n++) {${y}
      }
      let v = ${b};
      let off = outBase + k * uniforms.inner * ${o}u;
      ${f.setByOffset("off",`${a}(v.x)`)}
      ${g}
    }
  }`};return{name:"DFT",shaderCache:{hint:ky(r,"direct"),inputDependencies:["type"]},getShaderSource:c,getRunData:()=>({outputs:[{dims:r.outputDims,dataType:e}],programUniforms:Ly(r),dispatchGroup:{x:r.batch}})}},Dy=r=>{if(!r||r.dataType===0)return;if($.size(r.dims)!==1)throw new Error("DFT optional scalar inputs must have exactly 1 element.");if(r.dataType===6)return r.getInt32Array()[0];let e=Number(r.getBigInt64Array()[0]);if(!Number.isSafeInteger(e))throw new Error("DFT optional scalar inputs are out of JavaScript safe integer range.");return e},D$=r=>{if(!r||r.length<1)throw new Error("DFT requires at least 1 input.");let e=r[0].dims;if(e.length<2)throw new Error("DFT input must have at least 2 dimensions.");let n=e[e.length-1];if(n!==1&&n!==2)throw new Error("DFT input's innermost dimension must be 1 (real) or 2 (complex).")},Ry=(r,e)=>{D$(r.inputs);let n=r.inputs[0],t=n.dims.length,o=e.inverse!==0,i=e.onesided!==0,s=Dy(r.inputs[1]);if(s!==void 0&&s<=0)throw new Error("dft_length must be greater than zero.");let a=$.normalizeAxis(Dy(r.inputs[2])??e.axis,t);if(a===t-1)throw new Error("DFT axis must refer to a signal dimension, not the innermost (real/imaginary) dimension.");if(o&&i&&n.dims[t-1]!==2)throw new Error("Inverse one-sided DFT (IRFFT) requires complex-valued input (innermost dimension 2).");let u=O$(n,a,o,i,s);if(u.length<=0)throw new Error(`Invalid DFT length: ${u.length}`);let c=u.length<=rs&&Cy(u.length)!==void 0?P$(u):E$(u);r.compute(c,{inputs:[0]})},zy=r=>Q({axis:r.axis??1,inverse:r.inverse??0,onesided:r.onesided??0})});var _l,os,My,C$,k$,wl,vl,Vy,L$,Fy,Gy,Uy=A(()=>{"use strict";ee();oe();Ce();ae();_l="[a-zA-Z]|\\.\\.\\.",os="("+_l+")+",My="^"+os+"$",C$="("+os+",)*"+os,k$="^"+C$+"$",wl=class{constructor(e=-1){this.symbolToIndices=new Map,this.inputIndex=e}addSymbol(e,n){let t=this.symbolToIndices.get(e);t===void 0?t=[n]:t.push(n),this.symbolToIndices.set(e,t)}},vl=class{constructor(e,n){this.equation=n;this.hasEllipsis=!1,this.symbolToInfo=new Map,this.lhs=new Array,this.outputDims=[];let[t,o]=n.includes("->")?n.split("->",2):[n,""];if(!t.match(RegExp(k$)))throw new Error("Invalid LHS term");if(t.split(",").forEach((a,u)=>{let l=e[u].dims.slice();if(!a.match(RegExp(My)))throw new Error("Invalid LHS term");let c=this.processTerm(a,!0,l,u);this.lhs.push(c)}),o==="")o+=[...this.symbolToInfo.entries()].filter(([a,u])=>u.count===1||a==="...").map(([a])=>a).join("");else if(!o.match(RegExp(os)))throw new Error("Invalid RHS");o.match(RegExp(_l,"g"))?.forEach(a=>{if(a==="...")this.outputDims=this.outputDims.concat(this.ellipsisDims);else{let u=this.symbolToInfo.get(a);if(u===void 0)throw new Error("Invalid RHS symbol");this.outputDims.push(u.dimValue)}}),this.rhs=this.processTerm(o,!1,this.outputDims)}addSymbol(e,n,t){let o=this.symbolToInfo.get(e);if(o!==void 0){if(o.dimValue!==n&&o.count!==1)throw new Error("Dimension mismatch");o.count++,o.inputIndices.push(t)}else o={count:1,dimValue:n,inputIndices:[t]};this.symbolToInfo.set(e,o)}processTerm(e,n,t,o=-1){let i=t.length,s=!1,a=[],u=0;if(!e.match(RegExp(My))&&!n&&e!=="")throw new Error("Invalid LHS term");let l=e.match(RegExp(_l,"g")),c=new wl(o);return l?.forEach((d,p)=>{if(d==="..."){if(s)throw new Error("Only one ellipsis is allowed per input term");s=!0;let f=i-l.length+1;if(f<0)throw new Error("Ellipsis out of bounds");if(a=t.slice(u,u+f),this.hasEllipsis){if(this.ellipsisDims.length!==a.length||this.ellipsisDims.toString()!==a.toString())throw new Error("Ellipsis dimensions mismatch")}else if(n)this.hasEllipsis=!0,this.ellipsisDims=a;else throw new Error("Ellipsis must be specified in the LHS");for(let h=0;h<a.length;h++){let m=String.fromCharCode(48+h);c.addSymbol(m,p+h),this.addSymbol(m,t[u++],o)}}else c.addSymbol(d,p+(this.hasEllipsis?this.ellipsisDims.length-1:0)),this.addSymbol(d,t[u++],o)}),c}},Vy=r=>r+"_max",L$=(r,e,n,t)=>{let i=r.map(c=>c.length).map((c,d)=>O(`input${d}`,e,c)),s=$.size(t),a=R("output",e,t.length),u=[...n.symbolToInfo.keys()].filter(c=>!n.rhs.symbolToIndices.has(c)),l=c=>{let d=[],p="var prod = 1.0;",f="var sum = 0.0;",h="sum += prod;",m=[],y=[],g=[],b=[],_=n.symbolToInfo.size===n.rhs.symbolToIndices.size;n.symbolToInfo.forEach((T,S)=>{if(n.rhs.symbolToIndices.has(S)){let P=n.rhs.symbolToIndices.get(S)?.[0];P!==void 0&&n.lhs.forEach((E,N)=>{if(T.inputIndices.includes(N)){let B=E.symbolToIndices.get(S);if(B===void 0)throw new Error("Invalid symbol error");B.forEach(D=>{d.push(`${i[N].indicesSet(`input${N}Indices`,D,a.indicesGet("outputIndices",P))}`)})}})}else n.lhs.forEach((P,E)=>{if(T.inputIndices.includes(E)){let N=P.symbolToIndices.get(S);if(N===void 0)throw new Error("Invalid symbol error");N.forEach(B=>{m.push(`${i[E].indicesSet(`input${E}Indices`,B,`${S}`)}`)}),b.push(`prod *= ${i[E].getByIndices(`input${E}Indices`)};`)}}),y.push(`for(var ${S}: u32 = 0; ${S} < uniforms.${Vy(S)}; ${S}++) {`),g.push("}")});let x=_?[...d,`let sum = ${i.map((T,S)=>T.getByIndices(`input${S}Indices`)).join(" * ")};`]:[...d,f,...y,...m,p,...b,h,...g];return`
            ${c.registerUniforms(u.map(T=>({name:`${Vy(T)}`,type:"u32"}))).registerUniform("outputSize","u32").declareVariables(...i,a)}

            ${c.mainStart()}
            ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
            var outputIndices = ${a.offsetToIndices("global_idx")};
            ${i.map((T,S)=>`var input${S}Indices: ${i[S].type.indices};`).join(`
`)}
            ${x.join(`
`)};
            ${a.setByOffset("global_idx","sum")};
          }`};return{name:"Einsum",shaderCache:{hint:n.equation,inputDependencies:r.map(()=>"rank")},getRunData:()=>{let c=u.filter(p=>n.symbolToInfo.has(p)).map(p=>({type:12,data:n.symbolToInfo.get(p)?.dimValue||0}));c.push({type:12,data:s});let d=r.map((p,f)=>[...M(p)]).reduce((p,f)=>p.concat(f),c);return d.push(...M(t)),{outputs:[{dims:t,dataType:e}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:d}},getShaderSource:l}},Fy=(r,e)=>{let n=new vl(r.inputs,e.equation),t=n.outputDims,o=r.inputs.map((i,s)=>i.dims);r.compute(L$(o,r.inputs[0].dataType,n,t))},Gy=r=>{let e=r.equation.replace(/\s+/g,"");return Q({equation:e})}});var N$,Wy,R$,z$,Hy,qy=A(()=>{"use strict";ee();oe();ae();N$=r=>{if(!r||r.length!==2)throw new Error("Expand requires 2 input.");let e=r[0].dims,n=Array.from(r[1].getBigInt64Array(),Number),t=n.length<e.length?0:n.length-e.length,o=e.length<n.length?0:e.length-n.length;for(;t<n.length&&o<e.length;++t,++o)if(n[t]!==e[o]&&n[t]!==1&&e[o]!==1)throw new Error("Expand requires shape to be broadcastable to input")},Wy=(r,e)=>{let n=r.length-e.length,t=[];for(let o=0;o<n;++o)t.push(r[o]);for(let o=0;o<e.length;++o)t.push(e[o]===1?r[o+n]:e[o]);return t},R$=(r,e)=>r.length>e.length?Wy(r,e):Wy(e,r),z$=r=>{let e=r[0].dims,n=Array.from(r[1].getBigInt64Array(),Number),t=R$(e,n),o=r[0].dataType,i=o===9||$.size(e)===1,s=o===9||e.length>0&&e[e.length-1]%4===0?4:1,a=i||t.length>0&&t[t.length-1]%4===0?4:1,u=Math.ceil($.size(t)/a),l=d=>{let p=O("input",o,e.length,s),f=R("output",o,t.length,a),h;if(o===9){let m=(y,g,b="")=>`
          let outputIndices${g} = ${f.offsetToIndices(`outputOffset + ${g}u`)};
          let offset${g} = ${p.broadcastedIndicesToOffset(`outputIndices${g}`,f)};
          let index${g} = offset${g} / 4u;
          let component${g} = offset${g} % 4u;
          ${y}[${g}] = ${b}(${p.getByOffset(`index${g}`)}[component${g}]);
        `;h=`
        let outputOffset = global_idx * ${a};
        var data = vec4<u32>(0);
        ${m("data",0,"u32")}
        ${m("data",1,"u32")}
        ${m("data",2,"u32")}
        ${m("data",3,"u32")}
        ${f.setByOffset("global_idx","data")}
      }`}else h=`
        let outputIndices = ${f.offsetToIndices(`global_idx * ${a}`)};
        let inputOffset = ${p.broadcastedIndicesToOffset("outputIndices",f)};
        let data = ${f.type.value}(${p.getByOffset(`inputOffset / ${s}`)});
        ${f.setByOffset("global_idx","data")}
      }`;return`
    ${d.registerUniform("vec_size","u32").declareVariables(p,f)}
    ${d.mainStart()}
    ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
    ${h}`},c=[{type:12,data:u},...M(e,t)];return{name:"Expand",shaderCache:{hint:`${t.length};${s}${a}`,inputDependencies:["rank"]},getShaderSource:l,getRunData:()=>({outputs:[{dims:t,dataType:r[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:c})}},Hy=r=>{N$(r.inputs),r.compute(z$(r.inputs),{inputs:[0]})}});var B$,jy,Ky=A(()=>{"use strict";ee();oe();ae();Zi();B$=r=>{let e=r[0].dataType,n=$.size(r[0].dims),t=$.size(r[1].dims),o=t%4===0,i=s=>{let a=O("x",e,[1],4),u=O("bias",e,[1],4),l=R("y",e,[1],4),c=[{name:"output_vec_size",type:"u32"},{name:"bias_size",type:"u32"}],d=f=>`
      let bias${f}_offset: u32 = (global_idx * 4 + ${f}) % uniforms.bias_size;
      let bias${f} = ${u.getByOffset(`bias${f}_offset / 4`)}[bias${f}_offset % 4];`,p=o?`
      let bias = ${u.getByOffset("global_idx % (uniforms.bias_size / 4)")};`:`${d(0)}${d(1)}${d(2)}${d(3)}
      let bias = ${a.type.value}(bias0, bias1, bias2, bias3);`;return`${s.registerUniforms(c).declareVariables(a,u,l)}

    ${cl(Re(e))}

    ${s.mainStart(sr)}
      ${s.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_vec_size")}

      let x = ${a.getByOffset("global_idx")};
      ${p}
      let x_in = x + bias;
      ${l.setByOffset("global_idx",dl("x_in"))}
    }`};return{name:"FastGeluWithBias",shaderCache:{hint:`${o}`,inputDependencies:["type","type"]},getShaderSource:i,getRunData:s=>({outputs:[{dims:s[0].dims,dataType:s[0].dataType}],programUniforms:[{type:12,data:Math.ceil(n/4)},{type:12,data:t}],dispatchGroup:{x:Math.ceil(n/sr/4)}})}},jy=r=>{r.inputs.length<2||$.size(r.inputs[1].dims)===0?Nb(r):r.compute(B$(r.inputs))}});var M$,V$,Xy,Zy,Jy=A(()=>{"use strict";ee();oe();Ce();ae();M$=r=>{if(!r||r.length!==2)throw new Error("Gather requires 2 inputs.")},V$=(r,e)=>{let n=r[0].dims,t=r[1].dims,o=n.length,i=$.normalizeAxis(e.axis,o),s=n.slice(0);s.splice(i,1,...t);let a=n[i],u=r[0].dataType===9?4:1,l=Math.ceil($.size(s)/u),c=[{type:12,data:l},{type:6,data:a},{type:12,data:i},...M(r[0].dims,r[1].dims,s)],d=p=>{let f=O("data",r[0].dataType,r[0].dims.length,u),h=O("inputIndices",r[1].dataType,r[1].dims.length),m=R("output",r[0].dataType,s.length,u),y=b=>{let _=t.length,x=`var indicesIndices${b}  = ${h.type.indices}(0);`;for(let T=0;T<_;T++)x+=`${_>1?`indicesIndices${b}[${T}]`:`indicesIndices${b}`} = ${s.length>1?`outputIndices${b}[uniforms.axis + ${T}]`:`outputIndices${b}`};`;x+=`
          var idx${b} = ${h.getByIndices(`indicesIndices${b}`)};
          if (idx${b} < 0) {
            idx${b} = idx${b} + uniforms.axisDimLimit;
          }
          var dataIndices${b} : ${f.type.indices};
        `;for(let T=0,S=0;T<o;T++)T===i?(x+=`${o>1?`dataIndices${b}[${T}]`:`dataIndices${b}`} = u32(idx${b});`,S+=_):(x+=`${o>1?`dataIndices${b}[${T}]`:`dataIndices${b}`} = ${s.length>1?`outputIndices${b}[${S}]`:`outputIndices${b}`};`,S++);return x},g;if(r[0].dataType===9){let b=(_,x,T="")=>`
          let outputIndices${x} = ${m.offsetToIndices(`outputOffset + ${x}u`)};
          ${y(x)};
          let offset${x} = ${f.indicesToOffset(`dataIndices${x}`)};
          let index${x} = offset${x} / 4u;
          let component${x} = offset${x} % 4u;
          ${_}[${x}] = ${T}(${f.getByOffset(`index${x}`)}[component${x}]);
        `;g=`
        let outputOffset = global_idx * ${u};
        var value = vec4<u32>(0);
        ${b("value",0,"u32")}
        ${b("value",1,"u32")}
        ${b("value",2,"u32")}
        ${b("value",3,"u32")}
        ${m.setByOffset("global_idx","value")}
      `}else g=`
      let outputIndices = ${m.offsetToIndices("global_idx")};
      ${y("")};
      let value = ${f.getByIndices("dataIndices")};
      ${m.setByOffset("global_idx","value")};
      `;return`
      ${p.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(f,h,m)}
      ${p.mainStart()}
        ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        ${g}
      }`};return{name:"Gather",shaderCache:{hint:e.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:s,dataType:r[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:c}),getShaderSource:d}},Xy=r=>Q({axis:r.axis}),Zy=(r,e)=>{let n=r.inputs;M$(n),r.compute(V$(r.inputs,e))}});var F$,Qy,Yy,e_=A(()=>{"use strict";ee();oe();ae();F$=(r,e,n,t,o,i,s,a,u)=>{let l=[{type:12,data:i},{type:12,data:t},{type:12,data:o},{type:12,data:n},{type:12,data:s},{type:12,data:a},{type:12,data:u}],c=[i];l.push(...M(e.dims,c));let d=p=>{let f=O("indices_data",e.dataType,e.dims.length),h=R("input_slice_offsets_data",12,1,1),m=[f,h],y=[{name:"output_size",type:"u32"},{name:"batch_dims",type:"u32"},{name:"input_dims",type:"u32",length:o.length},{name:"sizes_from_slice_dims_data",type:"u32",length:n.length},{name:"num_slices_per_batch",type:"u32"},{name:"input_batch_stride",type:"u32"},{name:"num_slice_dims",type:"u32"}];return`
  ${p.registerUniforms(y).declareVariables(...m)}
  ${p.mainStart()}
    ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let batch_idx = global_idx / uniforms.num_slices_per_batch;
    let base_offset = batch_idx * uniforms.input_batch_stride;

    let slice_indices_base_offset = global_idx * uniforms.num_slice_dims;
    var relative_slice_offset = 0;
    for (var dim_idx = 0u; dim_idx < uniforms.num_slice_dims; dim_idx ++) {
      var index = i32(indices_data[dim_idx + slice_indices_base_offset].x);
      let input_dim_idx = uniforms.batch_dims + dim_idx;
      if (index < 0) {
        ${o.length===1?"index += i32(uniforms.input_dims);":"index += i32(uniforms.input_dims[input_dim_idx]);"}
      }
      ${n.length===1?"relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data);":"relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data[dim_idx]);"}
    }

    input_slice_offsets_data[global_idx] =  base_offset + u32(relative_slice_offset);
  }`};return r.compute({name:"computeSliceOffsets",shaderCache:{hint:`${o.length}_${n.length}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:c,dataType:r.inputs[1].dataType}],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:l}),getShaderSource:d},{inputs:[e],outputs:[-1]})[0]},Qy=(r,e)=>{let n=r.inputs,t=n[0].dims,o=n[0].dataType,i=n[1].dims,s=i[i.length-1],a=$.sizeToDimension(i,i.length-1),u=$.sizeFromDimension(t,e.batchDims+s),l=$.sizeToDimension(t,e.batchDims),c=$.sizeFromDimension(t,e.batchDims),d=a/l,p=new Array(s),f=u;for(let x=0;x<s;++x)p[s-1-x]=f,f*=t[e.batchDims+s-1-x];let h=F$(r,n[1],p,e.batchDims,t,a,d,c,s),m=e.batchDims+s;if(m>t.length)throw new Error("last dimension of indices must not be larger than rank of input tensor");let y=i.slice(0,-1).concat(t.slice(m)),g=$.size(y),b=[{type:12,data:g},{type:12,data:u},...M(n[0].dims,h.dims,y)],_=x=>{let T=O("data",n[0].dataType,n[0].dims.length),S=O("slice_offsets",12,h.dims.length),P=R("output",n[0].dataType,y.length);return`
          ${x.registerUniform("output_size","u32").registerUniform("slice_size","u32").declareVariables(T,S,P)}
            ${x.mainStart()}
            ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let slice_offset = slice_offsets[global_idx / uniforms.slice_size];
          output[global_idx] = data[u32(slice_offset) + global_idx % uniforms.slice_size];
        }`};r.compute({name:"GatherND",shaderCache:{hint:e.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:y,dataType:o}],dispatchGroup:{x:Math.ceil(g/64)},programUniforms:b}),getShaderSource:_},{inputs:[n[0],h]})},Yy=r=>({batchDims:r.batch_dims,cacheKey:""})});var G$,U$,t_,n_,r_=A(()=>{"use strict";ee();oe();Ce();ae();G$=(r,e)=>{if(r.length<3||r.length>4)throw new Error("GatherBlockQuantized requires 3 or 4 inputs.");let n=$.normalizeAxis(e.quantizeAxis,r[0].dims.length),t=e.blockSize,o=r[0],i=r[2],s=r.length===4?r[3]:void 0;if(i.dims.length!==o.dims.length||!o.dims.map((a,u)=>u===n?Math.ceil(a/t)===i.dims[u]:a===i.dims[u]).reduce((a,u)=>a&&u,!0))throw new Error("Scales must have the same rank as the input tensor and the dims should match except on gatherAxis.");if(s){if(s.dataType!==o.dataType)throw new Error("Zero point must have the same data type as the input tensor.");if(s.dims.length!==i.dims.length||!s.dims.map((a,u)=>a===i.dims[u]).reduce((a,u)=>a&&u,!0))throw new Error("Zero point must have the same rank as the input tensor and the dims should match except on quantizeAxis.")}},U$=(r,e)=>{let n=r[0].dims,t=r[1].dims,o=n.length,i=$.normalizeAxis(e.gatherAxis,o),s=$.normalizeAxis(e.quantizeAxis,o),a=n.slice(0);a.splice(i,1,...t);let u=$.size(a),l=r[2].dataType,d=r[0].dataType===22,p=[{type:12,data:u},{type:12,data:s},{type:12,data:i},{type:12,data:e.blockSize},...M(...r.map((h,m)=>h.dims),a)],f=h=>{let m=O("data",r[0].dataType,r[0].dims.length),y=O("inputIndices",r[1].dataType,r[1].dims.length),g=O("scales",r[2].dataType,r[2].dims.length),b=r.length>3?O("zeroPoint",r[3].dataType,r[3].dims.length):void 0,_=R("output",l,a.length),x=[m,y,g];b&&x.push(b);let T=[{name:"output_size",type:"u32"},{name:"quantize_axis",type:"u32"},{name:"gather_axis",type:"u32"},{name:"block_size",type:"u32"}];return`
        ${h.registerUniforms(T).declareVariables(...x,_)}
        ${h.mainStart()}
        let output_indices = ${_.offsetToIndices("global_idx")};
        var indices_indices = ${y.type.indices}(0);
        ${t.length>1?`
          for (var i: u32 = 0; i < ${t.length}; i++) {
            let index = ${_.indicesGet("output_indices","uniforms.gather_axis + i")};
            ${y.indicesSet("indices_indices","i","index")};
          }`:`indices_indices = ${_.indicesGet("output_indices","uniforms.gather_axis")};`};
        var data_indices = ${m.type.indices}(0);
        for (var i: u32 = 0; i < uniforms.gather_axis; i++) {
          let index = ${_.indicesGet("output_indices","i")};
          ${m.indicesSet("data_indices","i","index")};
        }
        var index_from_indices = ${y.getByIndices("indices_indices")};
        if (index_from_indices < 0) {
          index_from_indices += ${n[i]};
        }
        ${m.indicesSet("data_indices","uniforms.gather_axis","u32(index_from_indices)")};
        for (var i = uniforms.gather_axis + 1; i < ${a.length}; i++) {
          let index = ${_.indicesGet("output_indices",`i + ${t.length} - 1`)};
          ${m.indicesSet("data_indices","i","index")};
        }
        let data_offset = ${m.indicesToOffset("data_indices")};
        let data_index = data_offset % 8;
        // Convert 4-bit packed data to 8-bit packed data.
        let packed_4bit_quantized_data = ${m.getByOffset("data_offset / 8")};
        let packed_8bit_quantized_data = (packed_4bit_quantized_data >> (4 * (data_index % 2))) & 0x0f0f0f0f;
        let quantized_data_vec = ${d?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_quantized_data));
        let quantized_data = quantized_data_vec[data_index / 2];
        var scale_indices = data_indices;
        let quantize_axis_index = ${g.indicesGet("data_indices","uniforms.quantize_axis")} / uniforms.block_size;
        ${g.indicesSet("scale_indices","uniforms.quantize_axis","quantize_axis_index")};
        var scale = ${g.getByIndices("scale_indices")};
        ${b?`
              let zero_point_indices = scale_indices;
              let zero_point_offset = ${b.indicesToOffset("zero_point_indices")};
              let zero_point_index = zero_point_offset % 8;
              let packed_4bit_zero_points = ${b.getByOffset("zero_point_offset / 8")};
              let packed_8bit_zero_points = (packed_4bit_zero_points >> (4 * (zero_point_index % 2))) & 0x0f0f0f0f;
              let zero_point_vec = ${d?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_zero_points));
              let zero_point = zero_point_vec[zero_point_index / 2];`:"var zero_point = 0"};
        let dequantized_data = ${Re(l)}(quantized_data - zero_point) * scale;
        ${_.setByOffset("global_idx","dequantized_data")};
    }`};return{name:"GatherBlockQuantized",shaderCache:{hint:`${e.cacheKey};${r.filter((h,m)=>m!==1).map(h=>h.dims.join("_")).join(";")}`,inputDependencies:Array.from({length:r.length},(h,m)=>"rank")},getRunData:()=>({outputs:[{dims:a,dataType:l}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:p}),getShaderSource:f}},t_=(r,e)=>{let n=r.inputs;G$(n,e),r.compute(U$(r.inputs,e))},n_=r=>Q({blockSize:r.blockSize,gatherAxis:r.gatherAxis,quantizeAxis:r.quantizeAxis})});var W$,H$,o_,i_,s_=A(()=>{"use strict";ee();oe();Ce();ae();W$=r=>{if(!r||r.length!==2)throw new Error("GatherElements requires 2 inputs.");if(r[0].dims.length<1)throw new Error("GatherElements requires that the data input be rank >= 1.");if(r[0].dims.length!==r[1].dims.length)throw new Error(`GatherElements requires that the data input and
                     indices input tensors be of same rank.`)},H$=(r,e)=>{let n=r[0].dims,t=r[0].dataType,o=n.length,i=r[1].dims,s=r[1].dataType,a=$.normalizeAxis(e.axis,o),u=n[a],l=i.slice(0),c=$.size(l),d=O("input",t,o),p=O("indicesInput",s,i.length),f=R("output",t,l.length),h=[{type:12,data:c},{type:6,data:u},{type:12,data:a}];return h.push(...M(n,i,l)),{name:"GatherElements",shaderCache:{inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:l,dataType:r[0].dataType}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:h}),getShaderSource:g=>`
      ${g.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(d,p,f)}
      ${g.mainStart()}
      ${g.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

      let outputIndices = ${f.offsetToIndices("global_idx")};

      var idx = ${p.getByOffset("global_idx")};
      if (idx < 0) {
        idx = idx + uniforms.axisDimLimit;
      }
      var inputIndices = ${d.type.indices}(outputIndices);
      ${d.indicesSet("inputIndices","uniforms.axis","u32(idx)")};
      let value = ${d.getByIndices("inputIndices")};

      ${f.setByOffset("global_idx","value")};
  }`}},o_=r=>Q({axis:r.axis}),i_=(r,e)=>{let n=r.inputs;W$(n),r.compute(H$(r.inputs,e))}});var q$,j$,a_,u_,l_=A(()=>{"use strict";ee();oe();ae();q$=r=>{if(!r)throw new Error("Input is missing");if(r.length<2||r.length>3)throw new Error("Invaid input number.");if(r.length===3&&r[2].dims.length>2)throw new Error("Invalid input shape of C");if(r[0].dataType!==r[1].dataType||r.length===3&&r[0].dataType!==r[2].dataType)throw new Error("Input types are mismatched")},j$=(r,e)=>{let n=r[0].dims.slice(),t=r[1].dims.slice(),[o,i,s]=zi.getShapeOfGemmResult(n,e.transA,t,e.transB,r.length===3?r[2].dims:void 0),a=[o,i];if(!a)throw new Error("Can't use gemm on the given tensors");let u=16,l=Math.ceil(i/u),c=Math.ceil(o/u),d=!0,p=$.size(a),f=[{type:12,data:d?l:p},{type:12,data:o},{type:12,data:i},{type:12,data:s},{type:1,data:e.alpha},{type:1,data:e.beta}],h=["type","type"];r.length===3&&(f.push(...M(r[2].dims)),h.push("rank")),f.push(...M(a));let m=g=>{let b="";e.transA&&e.transB?b="value += a[k * uniforms.M + m] * b[n * uniforms.K + k];":e.transA&&!e.transB?b="value += a[k * uniforms.M + m] * b[k * uniforms.N + n];":!e.transA&&e.transB?b="value += a[m * uniforms.K + k] * b[n * uniforms.K + k];":!e.transA&&!e.transB&&(b="value += a[m * uniforms.K + k] * b[k * uniforms.N + n];");let _=e.alpha===1?"":"value *= uniforms.alpha;",x=O("a",r[0].dataType,r[0].dims),T=O("b",r[1].dataType,r[1].dims),S=x.type.value,P=null,E=[x,T];r.length===3&&(P=O("c",r[2].dataType,r[2].dims.length),E.push(P));let N=R("output",r[0].dataType,a.length);E.push(N);let B=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}];return`
  ${g.registerUniforms(B).declareVariables(...E)}

  ${g.mainStart()}
    ${g.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let m = global_idx / uniforms.N;
    let n = global_idx % uniforms.N;

    var value = ${S}(0);
    for (var k: u32 = 0u; k < uniforms.K; k++) {
      ${b}
    }

    ${_}
    ${P!=null?`let cOffset = ${P.broadcastedIndicesToOffset("vec2(m, n)",N)}; value += ${S}(uniforms.beta) * ${P.getByOffset("cOffset")};`:""}
    output[global_idx] = value;
  }`},y=g=>{let b=O("a",r[0].dataType,r[0].dims),_=O("b",r[1].dataType,r[1].dims),x=null,T=[b,_];r.length===3&&(x=O("c",r[2].dataType,r[2].dims.length),T.push(x));let S=R("output",r[0].dataType,a.length);T.push(S);let P=[{name:"num_tile_n",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}],E="",N="";e.transA&&e.transB?(N=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${b.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${_.type.value}(0);
      }
      `,E="value += tile_a[k][local_id.y] * tile_b[local_id.x][k];"):e.transA&&!e.transB?(N=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${b.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${_.type.value}(0);
      }
      `,E="value += tile_a[k][local_id.y] * tile_b[k][local_id.x];"):!e.transA&&e.transB?(N=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${b.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${_.type.value}(0);
      }
      `,E="value += tile_a[local_id.y][k] * tile_b[local_id.x][k];"):!e.transA&&!e.transB&&(N=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${b.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${_.type.value}(0);
      }
      `,E="value += tile_a[local_id.y][k] * tile_b[k][local_id.x];");let B=e.alpha===1?"":"value *= uniforms.alpha;";return`
  ${g.registerUniforms(P).declareVariables(...T)}
  var<workgroup> tile_a: array<array<${b.type.storage}, ${u}>, ${u}>;
  var<workgroup> tile_b: array<array<${_.type.storage}, ${u}>, ${u}>;
  ${g.mainStart([u,u,1])}
    let tile_col_start = (workgroup_index % uniforms.num_tile_n) * ${u};
    let tile_row_start = (workgroup_index / uniforms.num_tile_n) * ${u};
    let num_tiles = (uniforms.K - 1) / ${u} + 1;
    var k_start = 0u;
    var value = ${S.type.value}(0);
    for (var t: u32 = 0u; t < num_tiles; t++) {
      ${N}
      k_start = k_start + ${u};
      workgroupBarrier();

      for (var k: u32 = 0u; k < ${u}; k++) {
        ${E}
      }
      workgroupBarrier();
    }

    ${B}
    let m = tile_row_start + local_id.y;
    let n = tile_col_start + local_id.x;
    ${x!=null?`let cOffset = ${x.broadcastedIndicesToOffset("vec2(m, n)",S)}; value += ${S.type.value}(uniforms.beta) * ${x.getByOffset("cOffset")};`:""}
    if (m < uniforms.M && n < uniforms.N) {
      output[m * uniforms.N + n] = value;
    }
  }`};return d?{name:"GemmShared",shaderCache:{hint:`${e.cacheKey}`,inputDependencies:h},getRunData:()=>({outputs:[{dims:a,dataType:r[0].dataType}],dispatchGroup:{x:l*c},programUniforms:f}),getShaderSource:y}:{name:"Gemm",shaderCache:{hint:`${e.cacheKey}`,inputDependencies:h},getRunData:()=>({outputs:[{dims:a,dataType:r[0].dataType}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:f}),getShaderSource:m}},a_=r=>{let e=r.transA,n=r.transB,t=r.alpha,o=r.beta;return{transA:e,transB:n,alpha:t,beta:o,cacheKey:`${r.transA};${r.transB};${r.alpha===1}`}},u_=(r,e)=>{q$(r.inputs),r.compute(j$(r.inputs,e))}});var $n,Un,Pr,Er,K$,X$,Z$,J$,Q$,Y$,eA,tA,c_,d_,p_=A(()=>{"use strict";ee();oe();Ce();ae();[$n,Un,Pr,Er]=[0,1,2,3],K$=r=>{if(r[0].dims.length!==4)throw new Error("only 4-D tensor is supported.");if(r[0].dims.length!==r[1].dims.length)throw new Error("input dimensions must be equal to grid dimensions");if(r[0].dims.length-2!==r[1].dims[r[1].dims.length-1])throw new Error(`last dimension of grid must be equal to ${r[0].dims.length-2}`);if(r[0].dims[0]!==r[1].dims[0])throw new Error("grid batch size must match input batch size")},X$=`
  fn gs_get_cubic_coeffs(x: f32) -> vec4<f32> {
    let cubic_alpha = -0.75f;
    let x_abs = abs(x);
    var coeffs: vec4<f32>;
    coeffs[0] = (((cubic_alpha * (x_abs + 1) - 5 * cubic_alpha) * (x_abs + 1) + 8 * cubic_alpha) * (x_abs + 1) - 4 * cubic_alpha);
    coeffs[1] = (((cubic_alpha + 2) * x_abs - (cubic_alpha + 3)) * x_abs * x_abs + 1);
    coeffs[2] = (((cubic_alpha + 2) * (1 - x_abs) - (cubic_alpha + 3)) * (1 - x_abs) * (1 - x_abs) + 1);
    coeffs[3] = (((cubic_alpha * (2 - x_abs) - 5 * cubic_alpha) * (2 - x_abs) + 8 * cubic_alpha) * (2 - x_abs) - 4 * cubic_alpha);
    return coeffs;
  }
`,Z$=r=>`
  fn gs_bicubic_interpolate(p: mat4x4<${r}>, x: f32, y: f32) -> ${r} {
    var v: vec4<f32>;
    var coeffs = gs_get_cubic_coeffs(x);
    for (var i = 0; i < 4; i++) {
      v[i] = coeffs[0] * p[i][0] + coeffs[1] * p[i][1] + coeffs[2] * p[i][2] + coeffs[3] * p[i][3];
    }
    coeffs = gs_get_cubic_coeffs(y);
    let pixel = ${r}(coeffs[0] * v[0] + coeffs[1] * v[1] + coeffs[2] * v[2] + coeffs[3] * v[3]);
    return pixel;
  }
`,J$=r=>`
  fn gs_denormalize(n: f32, length: i32) -> f32 {
    ${r.alignCorners===0?`
    // alignCorners: false => [-1, 1] to [-0.5, length - 0.5]
    return ((n + 1.0) * f32(length) - 1.0) / 2.0;
    `:`
    // alignCorners: true => [-1, 1] to [0, length - 1]
    return (n + 1.0) / 2.0 * (f32(length - 1));
    `}
  }
`,Q$=r=>`
  ${r.paddingMode==="reflection"?`
      fn gs_reflect(x: i32, x_min: f32, x_max: f32) -> u32 {
        var dx = 0.0;
        var fx = f32(x);
        let range = x_max - x_min;
        if (fx < x_min) {
          dx = x_min - fx;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_min + r;
          } else {
            fx = x_max - r;
          }
        } else if (fx > x_max) {
          dx = fx - x_max;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_max - r;
          } else {
            fx = x_min + r;
          }
        }
        return u32(fx);
      }`:""}
`,Y$=(r,e,n)=>`
  fn pixel_at_grid(r: i32, c: i32, H: i32, W: i32, batch: u32, channel: u32, border: vec4<f32>) -> ${e} {
     var pixel = ${e}(0);
     var indices = vec4<u32>(0);
     indices[${$n}] = batch;
     indices[${Un}] = channel;`+(()=>{switch(n.paddingMode){case"zeros":return`
          if (r >= 0 && r < H && c >=0 && c < W) {
            indices[${Pr}] = u32(r);
            indices[${Er}] = u32(c);
          } else {
            return ${e}(0);
          }
        `;case"border":return`
          indices[${Pr}] = u32(clamp(r, 0, H - 1));
          indices[${Er}] = u32(clamp(c, 0, W - 1));
        `;case"reflection":return`
          indices[${Pr}] = gs_reflect(r, border[1], border[3]);
          indices[${Er}] = gs_reflect(c, border[0], border[2]);
        `;default:throw new Error(`padding mode ${n.paddingMode} is not supported`)}})()+`
    return ${r.getByIndices("indices")};
  }
`,eA=(r,e,n)=>(()=>{switch(n.mode){case"nearest":return`
          let result = pixel_at_grid(i32(round(y)), i32(round(x)), H_in, W_in, indices[${$n}], indices[${Un}], border);
        `;case"bilinear":return`
          let x1 = i32(floor(x));
          let y1 = i32(floor(y));
          let x2 = x1 + 1;
          let y2 = y1 + 1;

          let p11 = pixel_at_grid(y1, x1, H_in, W_in, indices[${$n}], indices[${Un}], border);
          let p12 = pixel_at_grid(y1, x2, H_in, W_in, indices[${$n}], indices[${Un}], border);
          let p21 = pixel_at_grid(y2, x1, H_in, W_in, indices[${$n}], indices[${Un}], border);
          let p22 = pixel_at_grid(y2, x2, H_in, W_in, indices[${$n}], indices[${Un}], border);

          let dx2 = ${e}(f32(x2) - x);
          let dx1 = ${e}(x - f32(x1));
          let dy2 = ${e}(f32(y2) - y);
          let dy1 = ${e}(y - f32(y1));
          let result = dy2 * (dx2 * p11 + dx1 * p12) + dy1 * (dx2 * p21 + dx1 * p22);
        `;case"bicubic":return`
          let x0 = i32(floor(x)) - 1;
          let y0 = i32(floor(y)) - 1;
          var p: mat4x4<${e}>;
          for (var h = 0; h < 4; h++) {
            for (var w = 0; w < 4; w++) {
              p[h][w] = pixel_at_grid(h + y0, w + x0, H_in, W_in, indices[${$n}], indices[${Un}], border);
            }
          }

          let dx = x - f32(x0 + 1);
          let dy = y - f32(y0 + 1);
          let result = gs_bicubic_interpolate(p, dx, dy);
        `;default:throw new Error(`mode ${n.mode} is not supported`)}})()+`${r.setByOffset("global_idx","result")}`,tA=(r,e)=>{let n=O("x",r[0].dataType,r[0].dims.length),t=[r[1].dims[0],r[1].dims[1],r[1].dims[2]],o=O("grid",r[1].dataType,t.length,2),i=[r[0].dims[0],r[0].dims[1],r[1].dims[1],r[1].dims[2]];e.format==="NHWC"&&(i=[r[0].dims[0],r[1].dims[1],r[1].dims[2],r[0].dims[3]],[$n,Un,Pr,Er]=[0,3,1,2]);let s=R("output",r[0].dataType,i.length),a=n.type.value,u=$.size(i),l=[{type:12,data:u},...M(r[0].dims,t,i)],c=d=>`
  ${d.registerUniform("output_size","u32").declareVariables(n,o,s)}
  ${X$}
  ${Z$(a)}
  ${J$(e)}
  ${Q$(e)}
  ${Y$(n,a,e)}

  ${d.mainStart()}
    ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let H_in = i32(uniforms.x_shape[${Pr}]);
      let W_in = i32(uniforms.x_shape[${Er}]);

      ${e.alignCorners===0?`
      let x_min = -0.5;
      let x_max = f32(W_in) - 0.5;
      let y_min = -0.5;
      let y_max = f32(H_in) - 0.5;
      `:`
      let x_min = 0.0;
      let x_max = f32(W_in) - 1.0;
      let y_min = 0.0;
      let y_max = f32(H_in) - 1.0;
      `};
      let border = vec4<f32>(x_min, y_min, x_max, y_max);

      let indices = ${s.offsetToIndices("global_idx")};
      var grid_indices = vec3<u32>(indices[${$n}], indices[${Pr}], indices[${Er}]);
      let nxy = ${o.getByIndices("grid_indices")};
      var x = gs_denormalize(f32(nxy[0]), W_in);
      var y = gs_denormalize(f32(nxy[1]), H_in);

      ${eA(s,a,e)}
  }`;return{name:"GridSample",shaderCache:{hint:`${e.cacheKey}`,inputDependencies:["type","type"]},getRunData:d=>{let p=$.size(i);return{outputs:[{dims:i,dataType:d[0].dataType}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:l}},getShaderSource:c}},c_=(r,e)=>{K$(r.inputs),r.compute(tA(r.inputs,e))},d_=r=>Q({alignCorners:r.align_corners,mode:r.mode,paddingMode:r.padding_mode,format:r.format})});var it,oA,h_,f_,iA,uo,m_,xl=A(()=>{"use strict";ee();oe();Ce();Ui();Ki();ae();Sn();it=(r,e)=>r.length>e&&r[e].dims.length>0?r[e]:void 0,oA=(r,e)=>{let n=r[0],t=it(r,1),o=it(r,2),i=it(r,3),s=it(r,4),a=it(r,5),u=it(r,6),l=it(r,7);if(n.dims.length!==3&&n.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let c=n.dims[0],d=n.dims[1],p=n.dims.length===3?n.dims[2]:e.numHeads*n.dims[4],f=d,h=0,m=0,y=Math.floor(p/e.numHeads);if(u&&l&&$.size(u.dims)&&$.size(l.dims)){if(u.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(u.dims[0]!==c||u.dims[1]!==e.numHeads||u.dims[3]!==y)throw new Error('Input "past_key" shape (batch_size, num_heads, past_sequence_length, head_size)');if(l.dims[0]!==c||l.dims[1]!==e.numHeads||l.dims[3]!==y)throw new Error('Input "past_value" shape (batch_size, num_heads, past_sequence_length, head_size)');if(u.dims[2]!==l.dims[2])throw new Error('Input "past_key" and "past_value" shall have same dim 2 (past_sequence_length)');if(l.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');h=u.dims[2],m=u.dims[2]}else if(u&&$.size(u.dims)||l&&$.size(l.dims))throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let g;if(t&&$.size(t.dims)>0){if(n.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(t.dims.length<3||t.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(n.dims[0]!==t.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(t.dims.length===3){if(t.dims[2]!==n.dims[2])throw new Error('Input "query" and "key" shall have same dim 2 (hidden_size)');g=2,f=t.dims[1]}else if(t.dims.length===5){if(t.dims[2]!==e.numHeads||t.dims[3]!==2||t.dims[4]!==y)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(o)throw new Error('Expect "value" be none when "key" has packed kv format.');g=5,f=t.dims[1]}else{if(t.dims[1]!==e.numHeads||t.dims[3]!==y)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');g=0,f=t.dims[2]}}else{if(n.dims.length!==5)throw new Error('Input "query" is expected to have 5 dimensions when key is empty');if(n.dims[2]!==e.numHeads||n.dims[3]!==3)throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');g=3}if(i&&$.size(i.dims)>0){if(i.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimension');if(t&&t.dims.length===5&&t.dims[3]===2)throw new Error("bias is not allowed for packed kv.")}let b=h+f,_=0;if(s&&$.size(s.dims)>0){_=8;let P=s.dims;throw P.length===1?P[0]===c?_=1:P[0]===3*c+2&&(_=3):P.length===2&&P[0]===c&&P[1]===b&&(_=5),_===8?new Error('Input "key_padding_mask" shape shall be (batch_size) or (batch_size, total_sequence_length)'):new Error("Mask not supported")}let x=!1,T=p;if(o&&$.size(o.dims)>0){if(o.dims.length!==3&&o.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(n.dims[0]!==o.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(o.dims.length===3){if(f!==o.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');T=o.dims[2]}else{if(f!==o.dims[2])throw new Error('Input "key" and "value" shall have the same dim 2 (kv_sequence_length)');T=o.dims[1]*o.dims[3],x=!0}}let S=!1;if(s&&$.size(s.dims)>0)throw new Error("Key padding mask is not supported");if(a&&$.size(a.dims)>0){if(a.dims.length!==4)throw new Error('Input "attention_bias" is expected to have 4 dimensions');if(a.dims[0]!==c||a.dims[1]!==e.numHeads||a.dims[2]!==d||a.dims[3]!==b)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:c,sequenceLength:d,pastSequenceLength:h,kvSequenceLength:f,totalSequenceLength:b,maxSequenceLength:m,inputHiddenSize:0,hiddenSize:p,vHiddenSize:T,headSize:y,vHeadSize:Math.floor(T/e.numHeads),numHeads:e.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:e.maskFilterValue,maskType:_,scale:e.scale,broadcastResPosBias:S,passPastInKv:x,qkvFormat:g}},h_=r=>Q({...r}),f_=Q({perm:[0,2,1,3]}),iA=(r,e,n,t,o,i,s)=>{let a=[t,o,i],u=$.size(a),l=[{type:12,data:u},{type:12,data:s},{type:12,data:i}],c=d=>{let p=R("qkv_with_bias",e.dataType,a),f=O("qkv",e.dataType,a),h=O("bias",n.dataType,a),m=[{name:"output_size",type:"u32"},{name:"bias_offset",type:"u32"},{name:"hidden_size",type:"u32"}];return`
  ${d.registerUniforms(m).declareVariables(f,h,p)}
  ${d.mainStart()}
    ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let bias_offset_idx = (global_idx % uniforms.hidden_size) + uniforms.bias_offset;

    qkv_with_bias[global_idx] = qkv[global_idx] + bias[bias_offset_idx];
  }`};return r.compute({name:"MultiHeadAttentionAddBias",shaderCache:{inputDependencies:["type","type"]},getRunData:()=>({outputs:[{dims:a,dataType:e.dataType,gpuDataType:0}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:l}),getShaderSource:c},{inputs:[e,n],outputs:[-1]})[0]},uo=(r,e,n,t,o,i,s,a)=>{let u=i;if(s&&$.size(s.dims)>0){if(t===1)throw new Error("AddBiasReshape is not implemented. Please export your model with packed QKV or KV");return u=iA(r,i,s,e,t,n*o,a),u=u.reshape([e,t,n,o]),n===1||t===1?u:r.compute(We(u,f_.perm),{inputs:[u],outputs:[-1]})[0]}else return i.dims.length===3&&(u=i.reshape([e,t,n,o])),n===1||t===1?u:r.compute(We(u,f_.perm),{inputs:[u],outputs:[-1]})[0]},m_=(r,e)=>{let n=oA(r.inputs,e),t=r.inputs[0],o=it(r.inputs,1),i=it(r.inputs,2),s=it(r.inputs,3),a=it(r.inputs,4),u=it(r.inputs,5),l=it(r.inputs,6),c=it(r.inputs,7);if(t.dims.length===5)throw new Error("Packed QKV is not implemented");if(o?.dims.length===5)throw new Error("Packed KV is not implemented");let d=o&&i&&o.dims.length===4&&i.dims.length===4,p=uo(r,n.batchSize,n.numHeads,n.sequenceLength,n.headSize,t,s,0);if(d)return Or(r,p,o,i,a,void 0,l,c,u,n);if(!o||!i)throw new Error("key and value must be provided");let f=uo(r,n.batchSize,n.numHeads,n.kvSequenceLength,n.headSize,o,s,n.hiddenSize),h=uo(r,n.batchSize,n.numHeads,n.kvSequenceLength,n.vHeadSize,i,s,2*n.hiddenSize);Or(r,p,f,h,a,void 0,l,c,u,n)}});var sA,aA,uA,lA,Tl,g_,b_,Il=A(()=>{"use strict";ee();oe();Ce();ae();sA=r=>{if(!r||r.length<1)throw new Error("too few inputs")},aA=(r,e)=>{let n=[],t=e.numOutputs;return r[1].dims[0]>0&&(r[1].getBigInt64Array().forEach(o=>n.push(Number(o))),t=n.length),Q({numOutputs:t,axis:e.axis,splitSizes:n})},uA=r=>`
fn calculateOutputIndex(index: u32) -> u32 {
    for (var i: u32 = 0u; i < ${r}u; i += 1u ) {
    if (index < ${q("uniforms.size_in_split_axis","i",r)}) {
        return i;
    }
    }
    return ${r}u;
}`,lA=r=>{let e=r.length,n=[];for(let t=0;t<e;++t){let o=r[t].setByIndices("indices","input[global_idx]");e===1?n.push(o):t===0?n.push(`if (output_number == ${t}u) { ${o} }`):t===e-1?n.push(`else { ${o} }`):n.push(`else if (output_number == ${t}) { ${o} }`)}return`
      fn writeBufferData(output_number: u32, indices: ${r[0].type.indices}, global_idx: u32) {
        ${n.join(`
`)}
      }`},Tl=(r,e)=>{let n=r[0].dims,t=$.size(n),o=r[0].dataType,i=$.normalizeAxis(e.axis,n.length),s=new Array(e.numOutputs),a=O("input",o,n.length),u=new Array(e.numOutputs),l=[],c=[],d=0,p=[{type:12,data:t}];for(let h=0;h<e.numOutputs;h++){d+=e.splitSizes[h],u[h]=d;let m=n.slice();m[i]=e.splitSizes[h],c.push(m),s[h]=R(`output${h}`,o,m.length),l.push({dims:c[h],dataType:r[0].dataType})}p.push({type:12,data:u},...M(n,...c));let f=h=>`
  ${h.registerUniform("input_size","u32").registerUniform("size_in_split_axis","u32",u.length).declareVariables(a,...s)}
  ${uA(u.length)}
  ${lA(s)}

  ${h.mainStart()}
    ${h.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.input_size")}

    var indices = ${a.offsetToIndices("global_idx")};
    var index = ${a.indicesGet("indices",i)};
    let output_number = calculateOutputIndex(index);
    if (output_number != 0) {
      index -= ${q("uniforms.size_in_split_axis","output_number - 1u",u.length)};
      ${a.indicesSet("indices",i,"index")};
    }
    writeBufferData(output_number, indices, global_idx);
  }`;return{name:"Split",shaderCache:{hint:e.cacheKey,inputDependencies:["rank"]},getShaderSource:f,getRunData:()=>({outputs:l,dispatchGroup:{x:Math.ceil(t/64)},programUniforms:p})}},g_=(r,e)=>{sA(r.inputs);let n=r.inputs.length===1?e:aA(r.inputs,e);r.compute(Tl(r.inputs,n),{inputs:[0]})},b_=r=>{let e=r.axis,n=r.splitSizes,t=r.numOutputs<0?n.length:r.numOutputs;if(t!==n.length)throw new Error("numOutputs and splitSizes length must be equal");return Q({axis:e,numOutputs:t,splitSizes:n})}});var cA,is,y_,Sl=A(()=>{"use strict";ee();oe();Ce();ae();cA=(r,e)=>{let[n,t,o,i]=r,{numHeads:s,rotaryEmbeddingDim:a}=e;if(n.dims.length!==3&&n.dims.length!==4)throw new Error(`Input 'x' is expected to have 3 or 4 dimensions, got ${n.dims.length}`);if(!$.areEqual(t.dims,[])&&!$.areEqual(t.dims,[1])&&t.dims.length!==2)throw new Error(`Input 'position_ids' is expected to have 0, 1, or 2 dimensions, got ${t.dims.length}`);if(o.dims.length!==2)throw new Error(`Input 'cos_cache' is expected to have 2 dimensions, got ${o.dims.length}`);if(i.dims.length!==2)throw new Error(`Input 'sin_cache' is expected to have 2 dimensions, got ${i.dims.length}`);if(!$.areEqual(o.dims,i.dims))throw new Error("Inputs 'cos_cache' and 'sin_cache' are expected to have the same shape");if(a>0&&s===0)throw new Error("num_heads must be provided if rotary_embedding_dim is specified");let u=n.dims[0],l=n.dims[n.dims.length-2],c=o.dims[0],d=$.sizeFromDimension(n.dims,1)/l,p=a===0?o.dims[1]*2:d/s;if(a>p)throw new Error("rotary_embedding_dim must be less than or equal to head_size");if(t.dims.length===2){if(u!==t.dims[0])throw new Error(`Input 'position_ids' dimension 0 should be of size batch_size, got ${t.dims[0]}`);if(l!==t.dims[1])throw new Error(`Input 'position_ids' dimension 1 should be of size sequence_length, got ${t.dims[1]}`)}if(l>c)throw new Error("Updating cos_cache and sin_cache in RotaryEmbedding is not currently supported");if(p/2!==o.dims[1]&&a/2!==o.dims[1])throw new Error(`Input 'cos_cache' dimension 1 should be same as head_size / 2 or rotary_embedding_dim / 2, got ${o.dims[1]}`)},is=(r,e)=>{let{interleaved:n,numHeads:t,rotaryEmbeddingDim:o,scale:i}=e,s=r[0].dims[0],a=$.sizeFromDimension(r[0].dims,1),u=r[0].dims[r[0].dims.length-2],l=a/u,c=r[2].dims[1],d=o===0?c*2:l/t,p=new Array(s,u,l/d,d-c),f=$.computeStrides(p),h=[{type:1,data:i},{type:12,data:p},{type:12,data:f},...r[0].dims.length===3?new Array({type:12,data:[a,l,d,1]}):[],...r[0].dims.length===4?new Array({type:12,data:[a,d,u*d,1]}):[],...M(r[0].dims,r[1].dims,r[2].dims,r[3].dims,r[0].dims)],m=y=>{let g=O("input",r[0].dataType,r[0].dims.length),b=O("position_ids",r[1].dataType,r[1].dims.length),_=O("cos_cache",r[2].dataType,r[2].dims.length),x=O("sin_cache",r[3].dataType,r[3].dims.length),T=R("output",r[0].dataType,r[0].dims.length);return y.registerUniforms([{name:"scale",type:"f32"},{name:"global_shape",type:"u32",length:p.length},{name:"global_strides",type:"u32",length:f.length},{name:"input_output_strides",type:"u32",length:f.length}]),`
        ${y.declareVariables(g,b,_,x,T)}

        ${y.mainStart(sr)}
          let half_rotary_emb_dim = uniforms.${_.name}_shape[1];
          let bsnh = global_idx / uniforms.global_strides % uniforms.global_shape;
          let size = uniforms.global_shape[0] * uniforms.global_strides[0];
          ${y.guardAgainstOutOfBoundsWorkgroupSizes("size")}

          if (bsnh[3] < half_rotary_emb_dim) {
            let position_ids_idx =
                ${b.broadcastedIndicesToOffset("bsnh.xy",R("",b.type.tensor,2))};
            let position_id =
                u32(${b.getByOffset("position_ids_idx")}) + select(0, bsnh[1], position_ids_idx == 0);
            let i = dot(bsnh, uniforms.input_output_strides) + select(0, bsnh[3], ${n});
            let j = i + select(half_rotary_emb_dim, 1, ${n});
            let re = ${g.getByOffset("i")} * ${_.get("position_id","bsnh[3]")} -
                ${g.getByOffset("j")} * ${x.get("position_id","bsnh[3]")};
            ${T.setByOffset("i","re")}
            let im = ${g.getByOffset("i")} * ${x.get("position_id","bsnh[3]")} +
                ${g.getByOffset("j")} * ${_.get("position_id","bsnh[3]")};
            ${T.setByOffset("j","im")}
          } else {
            let k = dot(bsnh, uniforms.input_output_strides) + half_rotary_emb_dim;
            ${T.setByOffset("k",g.getByOffset("k"))}
          }
        }`};return{name:"RotaryEmbedding",shaderCache:{hint:Q({interleaved:n}).cacheKey,inputDependencies:["rank","rank","rank","rank"]},getShaderSource:m,getRunData:()=>({outputs:[{dims:r[0].dims,dataType:r[0].dataType}],dispatchGroup:{x:Math.ceil($.size(p)/sr)},programUniforms:h})}},y_=(r,e)=>{cA(r.inputs,e),r.compute(is(r.inputs,e))}});var dA,pA,__,fA,w_,v_=A(()=>{"use strict";Ce();ee();Ki();xl();Il();Sn();Sl();ae();dA=(r,e)=>{if(e.doRotary&&r.length<=7)throw new Error("cos_cache and sin_cache inputs are required if do_rotary is specified");let n=r[0],t=r[1],o=r[2],i=r[3],s=r[4];if(e.doRotary!==0&&r.length<=7)throw new Error("cos_cast and sin_cache are expected if do_rotary attribute is non-zero");if(e.localWindowSize!==-1)throw new Error("Local attention is not supported");if(e.softcap!==0)throw new Error("Softcap is not supported");if(e.rotaryInterleaved!==0)throw new Error("Rotary interleaved is not supported");if(e.smoothSoftmax)throw new Error("Smooth softmax is not supported");if(n.dims.length!==3&&n.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let a=!1,u=n.dims[0],l=n.dims[1],c=n.dims.length===3?a?n.dims[2]/3:n.dims[2]:e.numHeads*n.dims[4],d=l,p=0,f=!t||t.dims.length===0,h=Math.floor(f?c/(e.numHeads+2*e.kvNumHeads):c/e.numHeads);f&&(c=h*e.numHeads);let m=i&&i.dims.length!==0,y=s&&s.dims.length!==0;if(m&&i.dims.length===4&&i.dims[0]===u&&i.dims[1]!==e.kvNumHeads&&i.dims[2]===e.kvNumHeads&&i.dims[3]===h)throw new Error("BSNH pastKey/pastValue is not supported");if(m&&y){if(i.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(s.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');p=i.dims[2]}else if(m||y)throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let b=1;if(t&&t.dims.length>0){if(n.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(t.dims.length<3||t.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(n.dims[0]!==t.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(t.dims.length===3){if(n.dims[2]%t.dims[2]!==0)throw new Error('Dimension 2 of "query" should be a multiple of "key"');d=t.dims[1]}else if(t.dims.length===5){if(t.dims[2]!==e.numHeads||t.dims[3]!==2||t.dims[4]!==h)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(o)throw new Error('Expect "value" be none when "key" has packed kv format.');d=t.dims[1]}else{if(t.dims[1]!==e.numHeads||t.dims[3]!==h)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');d=t.dims[2]}}else{if(n.dims.length!==3&&n.dims.length!==5)throw new Error('Input "query" is expected to have 3 or 5 dimensions when key is empty');if(n.dims.length===5&&(n.dims[2]!==e.numHeads||n.dims[3]!==3))throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');b=3}let _=0,x=!1,T=e.kvNumHeads?h*e.kvNumHeads:c;if(o&&o.dims.length>0){if(o.dims.length!==3&&o.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(n.dims[0]!==o.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(o.dims.length===3){if(d!==o.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');T=o.dims[2]}else{if(d!==o.dims[2])throw new Error('Input "past_key" and "past_value" shall have the same dim 2 (kv_sequence_length)');T=o.dims[1]*o.dims[3],x=!0}}let S=r.length>4?r[5]:void 0;if(S){if(S.dims.length===0)throw new Error("seqlens_k must be at least 1D, got scalar.");let B=S.dims.reduce((D,j)=>D*j,1);if(B!==u)throw new Error(`seqlens_k must have batch_size (${u}) elements, got ${B}.`);for(let D=0;D<S.dims.length;D++)if(S.dims[D]!==1&&S.dims[D]!==u)throw new Error(`seqlens_k has unexpected shape. Each dimension must be 1 or batch_size (${u}), got dims[${D}] = ${S.dims[D]}.`)}return{batchSize:u,sequenceLength:l,pastSequenceLength:p,kvSequenceLength:d,totalSequenceLength:-1,maxSequenceLength:-1,inputHiddenSize:0,hiddenSize:c,vHiddenSize:T,headSize:h,vHeadSize:Math.floor(T/e.kvNumHeads),numHeads:e.numHeads,kvNumHeads:e.kvNumHeads,nReps:e.numHeads/e.kvNumHeads,pastPresentShareBuffer:!1,maskType:_,scale:e.scale,broadcastResPosBias:!1,passPastInKv:x,qkvFormat:b}},pA=Q({perm:[0,2,1,3]}),__=(r,e,n)=>{let t=e,o=n.kvNumHeads;return e.dims.length===3&&n.kvSequenceLength!==0&&(t=e.reshape([n.batchSize,n.kvSequenceLength,o,n.headSize]),t=r.compute(We(t,pA.perm),{inputs:[t],outputs:[-1]})[0]),t},fA=(r,e,n,t)=>{let o=7,i=["type","type"],s=[r*e],a=r*e,u=[{type:12,data:a},{type:12,data:e},{type:12,data:r}],l=c=>{let d=O("seq_lens",n.dataType,n.dims),p=O("total_seq_lens",t.dataType,t.dims),f=R("pos_ids",o,s),h=[{name:"output_size",type:"u32"},{name:"sequence_length",type:"u32"},{name:"batch_size",type:"u32"}];return`
  ${c.registerUniforms(h).declareVariables(d,p,f)}
  ${c.mainStart()}
    ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let total_sequence_length = u32(${p.getByOffset("0")});
    let is_subsequent_prompt = uniforms.sequence_length > 1 && uniforms.sequence_length != total_sequence_length;
    let is_first_prompt = !is_subsequent_prompt && uniforms.sequence_length == total_sequence_length;
    let batch_idx = global_idx / uniforms.sequence_length;
    let sequence_idx = i32(global_idx % uniforms.sequence_length);
    var pos_id: i32 = 0;
    let seqlen = ${d.getByOffset("batch_idx")};
    let total_seqlen = seqlen + 1;
    if (is_first_prompt) {
      if (sequence_idx < total_seqlen) {
        pos_id = sequence_idx;
      } else {
        pos_id = 1;
      }
      ${f.setByOffset("global_idx","pos_id")}
    } else if (is_subsequent_prompt) {
      let past_seqlen = total_seqlen - i32(uniforms.sequence_length);
      if (past_seqlen + sequence_idx < total_seqlen) {
        pos_id = past_seqlen + sequence_idx;
      } else {
        pos_id = 1;
      }
      ${f.setByOffset("global_idx","pos_id")}
    } else if (global_idx < uniforms.batch_size) {
      ${f.setByOffset("global_idx","seqlen")}
    };
  }
  `};return{name:"GeneratePositionIds",shaderCache:{hint:`${r};${e}`,inputDependencies:i},getRunData:()=>({outputs:[{dims:s,dataType:o}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:u}),getShaderSource:l}},w_=(r,e)=>{if(r.inputs.length>14&&r.inputs[14]||r.inputs.length>15&&r.inputs[15])throw new Error("GroupQueryAttention (JSEP): q_norm_weight / k_norm_weight inputs are not supported. The per-head Q/K RMS normalization prologue is implemented only on the CUDA and native WebGPU EPs.");let n=dA(r.inputs,e);if(r.inputs[0].dims.length===5)throw new Error("Packed QKV is not implemented");if(r.inputs[1]?.dims.length===5)throw new Error("Packed KV is not implemented");let t=r.inputs[0],o=r.inputs[1]&&r.inputs[1].dims.length>0?r.inputs[1]:void 0,i=r.inputs[2]&&r.inputs[2].dims.length>0?r.inputs[2]:void 0,s=r.inputs[3]&&r.inputs[3].dims.length!==0?r.inputs[3]:void 0,a=r.inputs[4]&&r.inputs[4].dims.length!==0?r.inputs[4]:void 0,u=r.inputs.length>4?r.inputs[5]:void 0,l=r.inputs.length>5?r.inputs[6]:void 0,c=n.kvNumHeads?n.kvNumHeads:n.numHeads,d=Q({axis:2,numOutputs:3,splitSizes:[n.numHeads*n.headSize,c*n.headSize,c*n.headSize]}),[p,f,h]=!o&&!i?r.compute(Tl([t],d),{inputs:[t],outputs:[-1,-1,-1]}):[t,o,i],m,y;if(e.doRotary){let x=r.compute(fA(n.batchSize,n.sequenceLength,u,l),{inputs:[u,l],outputs:[-1]})[0],T=r.inputs[7],S=r.inputs[8],P=Q({interleaved:e.rotaryInterleaved!==0,numHeads:n.numHeads,rotaryEmbeddingDim:0,scale:e.scale}),E=[p,x,T,S],N=[-1];m=r.compute(is(E,P),{inputs:E,outputs:N})[0],E.splice(0,1,f);let B=Q({interleaved:e.rotaryInterleaved!==0,numHeads:n.kvNumHeads,rotaryEmbeddingDim:0,scale:e.scale});y=r.compute(is(E,B),{inputs:E,outputs:N})[0]}let g=uo(r,n.batchSize,n.numHeads,n.sequenceLength,n.headSize,e.doRotary?m:p,void 0,0),b=__(r,e.doRotary?y:f,n),_=__(r,h,n);Or(r,g,b,_,void 0,void 0,s,a,void 0,n,u,l)}});var x_,hA,mA,T_,I_=A(()=>{"use strict";ee();oe();Sn();ae();x_=(r,e,n,t,o,i,s,a)=>{let u=ge(i),l=u===1?"f32":`vec${u}f`,c=u===1?"vec2f":`mat2x${u}f`,d=o*s,p=64;d===1&&(p=256);let f=[o,s,i/u],h=[o,s,2],m=["rank","type","type"],y=[];y.push(...M(f,h));let g=b=>{let _=O("x",e.dataType,3,u),x=O("scale",n.dataType,n.dims),T=O("bias",t.dataType,t.dims),S=R("output",1,3,2),P=[_,x,T,S];return`
  var<workgroup> workgroup_shared : array<${c}, ${p}>;
  const workgroup_size = ${p}u;
  ${b.declareVariables(...P)}
  ${b.mainStart(p)}
    let batch = workgroup_index / uniforms.x_shape[1];
    let channel = workgroup_index % uniforms.x_shape[1];
    let hight = uniforms.x_shape[2];
    // initialize workgroup memory
    var sum = ${l}(0);
    var squared_sum = ${l}(0);
    for (var h = local_idx; h < hight; h += workgroup_size) {
      let value = ${l}(${_.get("batch","channel","h")});
      sum += value;
      squared_sum += value * value;
    }
    workgroup_shared[local_idx] = ${c}(sum, squared_sum);
    workgroupBarrier();

    for (var currSize = workgroup_size >> 1;  currSize > 0; currSize = currSize >> 1) {
      if (local_idx < currSize) {
        workgroup_shared[local_idx] = workgroup_shared[local_idx] + workgroup_shared[local_idx + currSize];
      }
      workgroupBarrier();
    }
    if (local_idx == 0) {
      let sum_final = ${At("workgroup_shared[0][0]",u)} / f32(hight * ${u});
      let squared_sum_final = ${At("workgroup_shared[0][1]",u)} / f32(hight * ${u});

      let inv_std_dev = inverseSqrt(squared_sum_final - sum_final * sum_final + f32(${a}));
      let channel_scale = inv_std_dev * f32(scale[channel]);
      let channel_shift = f32(bias[channel]) - sum_final * channel_scale;
      output[workgroup_index] = vec2f(channel_scale, channel_shift);
    }
  }`};return r.compute({name:"InstanceNormComputeChannelScaleShift",shaderCache:{hint:`${u};${a};${p}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:h,dataType:1}],dispatchGroup:{x:d},programUniforms:y}),getShaderSource:g},{inputs:[e,n,t],outputs:[-1]})[0]},hA=(r,e,n)=>{let t=e[0].dims,o=t,i=2,s=t[0],a=t[1],u=$.sizeFromDimension(t,i),l=ge(u),c=$.size(o)/l,d=x_(r,e[0],e[1],e[2],s,u,a,n.epsilon),p=[s,a,u/l],f=[s,a],h=["type","none"],m=y=>{let g=O("x",e[0].dataType,p.length,l),b=O("scale_shift",1,f.length,2),_=R("output",e[0].dataType,p.length,l),x=[g,b,_];return`
  ${y.registerUniform("output_size","u32").declareVariables(...x)}
  ${y.mainStart()}
  ${y.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let outputIndices = ${_.offsetToIndices("global_idx")};
      let batch = outputIndices[0];
      let channel = outputIndices[1];
      let scale_shift = ${b.getByIndices("vec2<u32>(batch, channel)")};
      let value = ${g.getByOffset("global_idx")} * ${_.type.value}(scale_shift.x) + ${_.type.value}(scale_shift.y);
      ${_.setByOffset("global_idx","value")};
  }`};r.compute({name:"InstanceNormalization",shaderCache:{hint:`${l}`,inputDependencies:h},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:[{type:12,data:c},...M(p,f,p)]}),getShaderSource:m},{inputs:[e[0],d]})},mA=(r,e,n)=>{let t=e[0].dims,o=t,i=t[0],s=t[t.length-1],a=$.sizeFromDimension(t,1)/s,u=ge(s),l=$.size(o)/u,c=[{type:12,data:a},{type:12,data:Math.floor(s/u)}],d=["type","type"],p=!1,f=[0,t.length-1];for(let g=0;g<t.length-2;g++)p=p||t[g+1]!==1,f.push(g+1);p=p&&t[t.length-1]!==1;let h=p?r.compute(We(r.inputs[0],f),{inputs:[r.inputs[0]],outputs:[-1]})[0]:r.inputs[0].reshape(Array.from({length:t.length},(g,b)=>t[f[b]])),m=x_(r,h,e[1],e[2],i,a,s,n.epsilon),y=g=>{let b=Se(e[0].dataType),_=u===1?"vec2f":`mat${u}x2f`,x=P=>{let E=P===0?"x":"y",N=u===1?"f32":`vec${u}f`;switch(u){case 1:return`${b}(${N}(scale.${E}))`;case 2:return`vec2<${b}>(${N}(scale[0].${E}, scale[1].${E}))`;case 4:return`vec4<${b}>(${N}(scale[0].${E}, scale[1].${E}, scale[2].${E}, scale[3].${E}))`;default:throw new Error(`Not supported compoents ${u}`)}},T=O("input",e[0].dataType,e[0].dims,u),S=R("output",e[0].dataType,o,u);return`
  @group(0) @binding(0) var<storage, read> input : array<${T.type.storage}>;
  @group(0) @binding(1) var<storage, read> scale_input : array<${_}>;
  @group(0) @binding(2) var<storage, read_write> output : array<${S.type.storage}>;
  struct Uniforms {H: u32, C : u32};
  @group(0) @binding(3) var<uniform> uniforms: Uniforms;

  ${g.mainStart()}
    let current_image_number = global_idx / (uniforms.C * uniforms.H);
    let current_channel_number = global_idx % uniforms.C;

    let scale_offset = current_image_number * uniforms.C + current_channel_number;
    let scale = scale_input[scale_offset];
    output[global_idx] = fma(input[global_idx], ${x(0)}, ${x(1)});
  }`};r.compute({name:"InstanceNormalizationNHWC",shaderCache:{hint:`${u}`,inputDependencies:d},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:c}),getShaderSource:y},{inputs:[e[0],m]})},T_=(r,e)=>{e.format==="NHWC"?mA(r,r.inputs,e):hA(r,r.inputs,e)}});var gA,bA,S_,$_=A(()=>{"use strict";ee();oe();ae();gA=r=>{if(!r||r.length<2)throw new Error("layerNorm requires at least 2 inputs.")},bA=(r,e,n)=>{let t=e.simplified,o=r[0].dims,i=r[1],s=!t&&r[2],a=o,u=$.normalizeAxis(e.axis,o.length),l=$.sizeToDimension(o,u),c=$.sizeFromDimension(o,u),d=$.size(i.dims),p=s?$.size(s.dims):0;if(d!==c||s&&p!==c)throw new Error(`Size of X.shape()[axis:] == ${c}.
       Size of scale and bias (if provided) must match this.
       Got scale size of ${d} and bias size of ${p}`);let f=[];for(let T=0;T<o.length;++T)T<u?f.push(o[T]):f.push(1);let h=ge(c),m=["type","type"],y=[{type:12,data:l},{type:1,data:c},{type:12,data:Math.floor(c/h)},{type:1,data:e.epsilon}];s&&m.push("type");let g=n>1,b=n>2,_=T=>{let S=Se(r[0].dataType),P=[O("x",r[0].dataType,r[0].dims,h),O("scale",i.dataType,i.dims,h)];s&&P.push(O("bias",s.dataType,s.dims,h)),P.push(R("output",r[0].dataType,a,h)),g&&P.push(R("mean_data_output",1,f)),b&&P.push(R("inv_std_output",1,f));let E=[{name:"norm_count",type:"u32"},{name:"norm_size",type:"f32"},{name:"norm_size_vectorized",type:"u32"},{name:"epsilon",type:"f32"}];return`
  ${T.registerUniforms(E).declareVariables(...P)}
  ${T.mainStart()}
    ${T.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.norm_count")}
    let offset = global_idx * uniforms.norm_size_vectorized;
    var mean_vector = ${sl("f32",h)};
    var mean_square_vector = ${sl("f32",h)};

    for (var h: u32 = 0u; h < uniforms.norm_size_vectorized; h++) {
      let value = ${ar(S,h,"x[h + offset]")};
      mean_vector += value;
      mean_square_vector += value * value;
    }
    let mean = ${At("mean_vector",h)} / uniforms.norm_size;
    let inv_std_dev = inverseSqrt(${At("mean_square_vector",h)} / uniforms.norm_size ${t?"":"- mean * mean"} + uniforms.epsilon);

    for (var j: u32 = 0; j < uniforms.norm_size_vectorized; j++) {
      let f32input = ${ar(S,h,"x[j + offset]")};
      let f32scale = ${ar(S,h,"scale[j]")};
      output[j + offset] = ${P[0].type.value}((f32input ${t?"":"- mean"}) * inv_std_dev * f32scale
        ${s?`+ ${ar(S,h,"bias[j]")}`:""}
      );
    }

    ${g?"mean_data_output[global_idx] = mean":""};
    ${b?"inv_std_output[global_idx] = inv_std_dev":""};
  }`},x=[{dims:a,dataType:r[0].dataType}];return g&&x.push({dims:f,dataType:1}),b&&x.push({dims:f,dataType:1}),{name:"LayerNormalization",shaderCache:{hint:`${h};${n};${t}`,inputDependencies:m},getRunData:()=>({outputs:x,dispatchGroup:{x:Math.ceil(l/64)},programUniforms:y}),getShaderSource:_}},S_=(r,e)=>{gA(r.inputs),r.compute(bA(r.inputs,e,r.outputCount))}});var yA,A_,O_=A(()=>{"use strict";oe();es();ts();yA=r=>{if(!r||r.length!==2)throw new Error("MatMul requires 2 inputs.");if(r[0].dims[r[0].dims.length-1]!==r[1].dims[r[1].dims.length-2])throw new Error("shared dimension does not match.")},A_=r=>{yA(r.inputs);let e=bn.calcShape(r.inputs[0].dims,r.inputs[1].dims,!0);if(!e)throw new Error("Can't use matmul on the given tensors");let n=e[e.length-1],t=r.inputs[0].dims[r.inputs[0].dims.length-1];if(n<8&&t<8)r.compute(Yi(r.inputs,{activation:""},e));else{let o=e[e.length-2],i=$.size(r.inputs[0].dims.slice(0,-2)),s=$.size(r.inputs[1].dims.slice(0,-2));if(i!==1&&o===1&&s===1){let a=r.inputs[0].reshape([1,i,t]),u=r.inputs[1].reshape([1,t,n]),l=[1,i,n],c=[a,u];r.compute(ao(c,{activation:""},e,l),{inputs:c})}else r.compute(ao(r.inputs,{activation:""},e))}}});var _A,wA,vA,P_,E_,D_=A(()=>{"use strict";ee();oe();Ce();ae();_A=(r,e)=>{if(r.length<3||r.length>4)throw new Error("MatMulNBits requires 3 or 4 inputs");let n=r[0],t=n.dims.length;if(n.dims[t-1]!==e.k)throw new Error("The last dim of input shape does not match the k value");let o=Math.floor((e.k+e.blockSize-1)/e.blockSize),i=e.blockSize/8*e.bits,s=r[1];if(!$.areEqual(s.dims,[e.n,o,i]))throw new Error("The second inputs must be 3D tensor with shape N X nBlocksPerCol X blobSize");let u=r[2].dims;if($.size(u)!==e.n*o)throw new Error("scales input size error.");if(r.length===4){let c=r[3].dims,d=e.n*(e.bits===8?o:Math.floor((o*e.bits+7)/8));if($.size(c)!==d)throw new Error("zeroPoints input size error.")}},wA=(r,e)=>{let n=r[0].dims,t=n.length,o=n[t-2],i=e.k,s=e.n,a=n.slice(0,t-2),u=$.size(a),c=r[1].dims[2]/4,d=r[0].dataType,p=ge(e.k),f=ge(c),h=ge(s),m=a.concat([o,s]),y=o>1&&s/h%2===0?2:1,g=$.size(m)/h/y,b=64,_=[],x=[u,o,i/p],T=$.convertShape(r[1].dims).slice();T.splice(-1,1,c/f),_.push(...M(x)),_.push(...M(T)),_.push(...M(r[2].dims)),r.length===4&&_.push(...M($.convertShape(r[3].dims)));let S=[u,o,s/h];_.push(...M(S));let P=E=>{let N=x.length,B=O("a",r[0].dataType,N,p),D=O("b",12,T.length,f),j=O("scales",r[2].dataType,r[2].dims.length),C=[B,D,j],w=r.length===4?O("zero_points",12,r[3].dims.length):void 0;w&&C.push(w);let k=S.length,V=R("output",r[0].dataType,k,h),W=Se(r[0].dataType),U=(()=>{switch(p){case 1:return`array<${W}, 8>`;case 2:return`mat4x2<${W}>`;case 4:return`mat2x4<${W}>`;default:throw new Error(`${p}-component is not supported.`)}})(),K=Math.floor(32/e.bits),te=Math.floor(K/8),ne=()=>{let L="";for(let z=0;z<te;z++){let ce=z*e.bits*4,ze=ce+e.bits;L+=`
          // reuse a data (pass ${z})
            var input_offset${z>0?z:""} = ${z===0?B.indicesToOffset(`${B.type.indices}(batch, row, word_offset)`):"input_offset"};
            var a_data${z>0?z:""}: ${U};
            for (var j${z>0?z:""}: u32 = 0; j${z>0?z:""} < ${8/p}; j${z>0?z:""}++) {
              a_data${z>0?z:""}[j${z>0?z:""}] = ${B.getByOffset(`input_offset${z>0?z:""}`)};
              input_offset${z>0?z:""}++;
            }
          `;for(let Pe=0;Pe<h*y;Pe++)L+=`
            b_value = ${f===1?`b${Pe}_data`:`b${Pe}_data[i]`};
            ${e.bits===2?`{
              let half_word = b_value >> ${z*16}u;
              let byte_lo = half_word & 0xFFu;
              let byte_hi = (half_word >> 8u) & 0xFFu;
              let spread_word = (byte_lo & 0xFu) | ((byte_lo >> 4u) << 8u) | ((byte_hi & 0xFu) << 16u) | ((byte_hi >> 4u) << 24u);
              b_value_lower = unpack4xU8(spread_word & b_mask);
              b_value_upper = unpack4xU8((spread_word >> 2u) & b_mask);
            }`:`b_value_lower = unpack4xU8((b_value >> ${ce}u) & b_mask);
            b_value_upper = unpack4xU8((b_value >> ${ze}u) & b_mask);`}
            b_quantized_values = ${U}(${Array.from({length:4},(Ze,Oe)=>`${W}(b_value_lower[${Oe}]), ${W}(b_value_upper[${Oe}])`).join(", ")});
            b_dequantized_values = ${p===1?`${U}(${Array.from({length:8},(Ze,Oe)=>`(b_quantized_values[${Oe}] - ${w?`zero_point${Pe}`:"zero_point"}) * scale${Pe}`).join(", ")});`:`(b_quantized_values - ${U}(${Array(8).fill(`${w?`zero_point${Pe}`:"zero_point"}`).join(",")})) * scale${Pe};`};
            workgroup_shared[local_id.x * ${y} + ${Math.floor(Pe/h)}]${h>1?`[${Pe%h}]`:""} += ${Array.from({length:8/p},(Ze,Oe)=>`${p===1?`a_data${z>0?z:""}[${Oe}] * b_dequantized_values[${Oe}]`:`dot(a_data${z>0?z:""}[${Oe}], b_dequantized_values[${Oe}])`}`).join(" + ")};
          `}return L},Ae=()=>{let L=`
            var col_index = col * ${h};
            ${w?`
            let zero_point_values_per_byte: u32 = ${Math.floor(8/e.bits)}u;
            let zero_point_bytes_per_col = (nBlocksPerCol + zero_point_values_per_byte - 1u) / zero_point_values_per_byte;
            var zero_point_byte_count: u32;
            var zero_point_word_index: u32;
            var zero_point_byte_offset: u32;
            let zero_point_sub_offset: u32 = block % zero_point_values_per_byte;
            var zero_point_bits_offset: u32;
            var zero_point_word: u32;`:`
            // The default zero point is ${Math.pow(2,e.bits-1)} for unsigned ${e.bits}-bit quantization.
            let zero_point = ${W}(${Math.pow(2,e.bits-1).toFixed(1)});`}
            `;for(let z=0;z<h*y;z++)L+=`
            let scale${z} = ${j.getByOffset("col_index * nBlocksPerCol + block")};
            ${w?`
            zero_point_byte_count = col_index * zero_point_bytes_per_col + (block / zero_point_values_per_byte);
            zero_point_word_index = zero_point_byte_count >> 0x2u;
            zero_point_byte_offset = zero_point_byte_count & 0x3u;
            zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_sub_offset * ${e.bits}u);
            zero_point_word = ${w.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point${z} = ${W}((zero_point_word) & ${e.bits===2?"0x3u":"0xFu"});`:""}
            col_index += 1;`;return L},se=()=>{let L=`col_index = col * ${h};`;for(let z=0;z<h*y;z++)L+=`
            let b${z}_data = ${D.getByIndices(`${D.type.indices}(col_index, block, word)`)};
            col_index += 1;`;return L+=`
            var b_value: u32;
            let b_mask: u32 = ${e.bits===2?"0x03030303u":"0x0F0F0F0Fu"};
            var b_value_lower: vec4<u32>;
            var b_value_upper: vec4<u32>;
            var b_quantized_values: ${U};
            var b_dequantized_values: ${U};`,L};return`
        var<workgroup> workgroup_shared: array<${V.type.value}, ${y*b}>;
        ${E.declareVariables(...C,V)}
        ${E.mainStart([b,1,1])}
          let output_indices = ${V.offsetToIndices(`(global_idx / ${b}) * ${y}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let nBlocksPerCol = uniforms.b_shape[1];

          for (var block = local_id.x; block < nBlocksPerCol; block += ${b}) {
            //process one block
            var word_offset: u32 = block * ${e.blockSize/p};
            ${Ae()}
            for (var word: u32 = 0; word < ${c}; word += ${f}) {
              ${se()}
              for (var i: u32 = 0; i < ${f}; i++) {
                ${ne()}
                word_offset += ${K/p};
              }
            }
          }
          workgroupBarrier();

          if (local_id.x < ${y}) {
            var output_value: ${V.type.value} = ${V.type.value}(0);
            var workgroup_shared_offset: u32 = local_id.x;
            for (var b: u32 = 0u; b < ${b}u; b++) {
              output_value += workgroup_shared[workgroup_shared_offset];
              workgroup_shared_offset += ${y};
            }
            ${V.setByIndices(`${V.type.indices}(batch, row, col + local_id.x)`,"output_value")};
          }
        }`};return{name:"MatMulNBits",shaderCache:{hint:`${e.blockSize};${e.bits};${p};${f};${h};${y};${b}`,inputDependencies:Array(r.length).fill("rank")},getRunData:()=>({outputs:[{dims:m,dataType:d}],dispatchGroup:{x:g},programUniforms:_}),getShaderSource:P}},vA=(r,e)=>{let n=r[0].dims,t=n.length,o=n[t-2],i=e.k,s=e.n,a=n.slice(0,t-2),u=$.size(a),c=r[1].dims[2]/4,d=r[0].dataType,p=ge(e.k),f=ge(c),h=a.concat([o,s]),m=128,y=s%8===0?8:s%4===0?4:1,g=m/y,b=Math.floor(32/e.bits),_=g*f*b,x=_/p,T=_/e.blockSize,S=$.size(h)/y,P=[],E=[u,o,i/p],N=$.convertShape(r[1].dims).slice();N.splice(-1,1,c/f),P.push(...M(E)),P.push(...M(N)),P.push(...M(r[2].dims)),r.length===4&&P.push(...M($.convertShape(r[3].dims)));let B=[u,o,s];P.push(...M(B));let D=j=>{let C=E.length,w=O("a",r[0].dataType,C,p),k=O("b",12,N.length,f),V=O("scales",r[2].dataType,r[2].dims.length),W=[w,k,V],U=r.length===4?O("zero_points",12,r[3].dims.length):void 0;U&&W.push(U);let K=B.length,te=R("output",r[0].dataType,K),ne=Se(r[0].dataType),Ae=()=>{switch(p){case 1:return`
          let a_data0 = vec4<${ne}>(sub_a[word_offset], sub_a[word_offset + 1], sub_a[word_offset + 2], sub_a[word_offset + 3]);
          let a_data1 = vec4<${ne}>(sub_a[word_offset + 4], sub_a[word_offset + 5], sub_a[word_offset + 6], sub_a[word_offset + 7]);`;case 2:return`
          let a_data0 = vec4<${ne}>(sub_a[word_offset], sub_a[word_offset + 1]);
          let a_data1 = vec4<${ne}>(sub_a[word_offset + 2], sub_a[word_offset + 3]);`;case 4:return`
          let a_data0 = sub_a[word_offset];
          let a_data1 = sub_a[word_offset + 1];`;default:throw new Error(`${p}-component is not supported.`)}};return`
        var<workgroup> sub_a: array<${w.type.value}, ${x}>;
        var<workgroup> inter_results: array<array<${te.type.value}, ${g}>, ${y}>;
        ${j.declareVariables(...W,te)}
        ${j.mainStart([g,y,1])}
          let output_indices = ${te.offsetToIndices(`workgroup_index * ${y}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let n_blocks_per_col = uniforms.b_shape[1];
          let num_tiles =  (n_blocks_per_col - 1) / ${T} + 1;

          // Loop over shared dimension.
          for (var tile: u32 = 0; tile < num_tiles; tile += 1) {
            let a_col_start = tile * ${x};
            // load one tile A data into shared memory.
            for (var a_offset = local_idx; a_offset < ${x}; a_offset += ${m})
            {
              let a_col = a_col_start + a_offset;
              if (a_col < uniforms.a_shape[2])
              {
                sub_a[a_offset] = ${w.getByIndices(`${w.type.indices}(batch, row, a_col)`)};
              } else {
                sub_a[a_offset] = ${w.type.value}(0);
              }
            }
            workgroupBarrier();

            // each thread process one block
            let b_row = col + local_id.y;
            let block = tile * ${T} + local_id.x;
            ${U?`
            let zero_point_values_per_byte: u32 = ${Math.floor(8/e.bits)}u;
            let zero_point_bytes_per_col = (n_blocks_per_col + zero_point_values_per_byte - 1u) / zero_point_values_per_byte;
            let zero_point_byte_count = b_row * zero_point_bytes_per_col + (block / zero_point_values_per_byte);
            let zero_point_word_index = zero_point_byte_count >> 0x2u;
            let zero_point_byte_offset = zero_point_byte_count & 0x3u;
            let zero_point_sub_offset: u32 = block % zero_point_values_per_byte;
            let zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_sub_offset * ${e.bits}u);
            let zero_point_word = ${U.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point = ${ne}((zero_point_word) & ${e.bits===2?"0x3u":"0xFu"});`:`
            // The default zero point is ${Math.pow(2,e.bits-1)} for unsigned ${e.bits}-bit quantization.
            let zero_point = ${ne}(${Math.pow(2,e.bits-1).toFixed(1)});`}
            let scale = ${V.getByOffset("b_row * n_blocks_per_col + block")};
            let b_data = ${k.getByIndices(`${k.type.indices}(b_row, block, 0)`)};
            var word_offset = local_id.x * ${e.blockSize/p};
            for (var i: u32 = 0; i < ${f}; i++) {
              let b_value = ${f===1?"b_data":"b_data[i]"};
              ${(()=>{let se=Math.floor(b/8),L="";for(let z=0;z<se;z++){let ce=z*e.bits*4,ze=ce+e.bits;L+=`
              ${Ae()}
              {${e.bits===2?`
                let half_word = b_value >> ${z*16}u;
                let byte_lo = half_word & 0xFFu;
                let byte_hi = (half_word >> 8u) & 0xFFu;
                let spread_word = (byte_lo & 0xFu) | ((byte_lo >> 4u) << 8u) | ((byte_hi & 0xFu) << 16u) | ((byte_hi >> 4u) << 24u);
                let b_value_lower = unpack4xU8(spread_word & 0x03030303u);
                let b_value_upper = unpack4xU8((spread_word >> 2u) & 0x03030303u);`:`
                let b_value_lower = unpack4xU8((b_value >> ${ce}u) & 0x0F0F0F0Fu);
                let b_value_upper = unpack4xU8((b_value >> ${ze}u) & 0x0F0F0F0Fu);`}
                let b_quantized_values = mat2x4<${ne}>(${Array.from({length:4},(Pe,Ze)=>`${ne}(b_value_lower[${Ze}]), ${ne}(b_value_upper[${Ze}])`).join(", ")});
                let b_dequantized_values = (b_quantized_values - mat2x4<${ne}>(${Array(8).fill("zero_point").join(",")})) * scale;
                inter_results[local_id.y][local_id.x] += ${Array.from({length:2},(Pe,Ze)=>`${`dot(a_data${Ze}, b_dequantized_values[${Ze}])`}`).join(" + ")};
              }
              word_offset += ${8/p};`}return L})()}
            }
            workgroupBarrier();
          }

          if (local_idx < ${y}) {
            var output_value: ${te.type.value} = ${te.type.value}(0);
            for (var b = 0u; b < ${g}; b++) {
              output_value += inter_results[local_idx][b];
            }
            if (col + local_idx < uniforms.output_shape[2])
            {
              ${te.setByIndices(`${te.type.indices}(batch, row, col + local_idx)`,"output_value")}
            }
          }
        }`};return{name:"BlockwiseMatMulNBits32",shaderCache:{hint:`${e.blockSize};${p};${f};${g};${y}`,inputDependencies:Array(r.length).fill("rank")},getRunData:()=>({outputs:[{dims:h,dataType:d}],dispatchGroup:{x:S},programUniforms:P}),getShaderSource:D}},P_=(r,e)=>{_A(r.inputs,e),e.blockSize===32&&r.adapterInfo.isVendor("intel")&&r.adapterInfo.isArchitecture("gen-12lp")?r.compute(vA(r.inputs,e)):r.compute(wA(r.inputs,e))},E_=r=>Q(r)});var xA,TA,IA,SA,$A,AA,OA,PA,C_,k_=A(()=>{"use strict";ee();oe();ae();xA=r=>{if(!r||r.length<1)throw new Error("Too few inputs");if(r[0].dataType!==1&&r[0].dataType!==10)throw new Error("Input type must be float or float16.");if(r.length>=2){let e=r[0].dims.length*2===r[1].dims[0];if(r.length===4&&(e=r[3].dims[0]*2===r[1].dims[0]),!e)throw new Error("The pads should be a 1D tensor of shape [2 * input_rank] or [2 * num_axes].")}},TA=(r,e,n)=>{let t="";for(let o=e-1;o>=0;--o)t+=`
            k = i32(${r.indicesGet("indices",o)}) - ${q("uniforms.pads",o,n)};
            if (k < 0) {
              break;
            }
            if (k >= i32(${q("uniforms.x_shape",o,e)})) {
              break;
            }
            offset += k * i32(${q("uniforms.x_strides",o,e)});
        `;return`
          value = ${r.type.value}(uniforms.constant_value);
          for (var i = 0; i < 1; i++) {
            var offset = 0;
            var k = 0;
            ${t}
            value = x[offset];
          }
      `},IA=(r,e,n)=>{let t="";for(let o=e-1;o>=0;--o)t+=`
                k = i32(${r.indicesGet("indices",o)}) - ${q("uniforms.pads",o,n)};
                if (k < 0) {
                  k = -k;
                }
                {
                  let _2n_1 = 2 * (i32(${q("uniforms.x_shape",o,e)}) - 1);
                  k = k % _2n_1;
                  if(k >= i32(${q("uniforms.x_shape",o,e)})) {
                    k = _2n_1 - k;
                  }
                }
                offset += k * i32(${q("uniforms.x_strides",o,e)});
            `;return`
              var offset = 0;
              var k = 0;
              ${t}
              value = x[offset];
          `},SA=(r,e,n)=>{let t="";for(let o=e-1;o>=0;--o)t+=`
                k = i32(${r.indicesGet("indices",o)}) - ${q("uniforms.pads",o,n)};
                if (k < 0) {
                  k = 0;
                }
                if (k >= i32(${q("uniforms.x_shape",o,e)})) {
                  k = i32(${q("uniforms.x_shape",o,e)}) - 1;
                }
                offset += k * i32(${q("uniforms.x_strides",o,e)});
            `;return`
              var offset = 0;
              var k = 0;
              ${t}
              value = x[offset];
          `},$A=(r,e,n)=>{let t="";for(let o=e-1;o>=0;--o)t+=`
                k = i32(${r.indicesGet("indices",o)}) - ${q("uniforms.pads",o,n)};
                if (k < 0)  {
                  k += i32(${q("uniforms.x_shape",o,e)}]);
                }
                if (k >= i32(${q("uniforms.x_shape",o,e)})) {
                  k -= i32(${q("uniforms.x_shape",o,e)});
                }
                offset += k * i32(${q("uniforms.x_strides",o,e)});
            `;return`
              var offset = 0;
              var k = 0;
              ${t}
              value = x[offset];
          `},AA=(r,e,n)=>{switch(n.mode){case 0:return TA(r,e,n.pads.length);case 1:return IA(r,e,n.pads.length);case 2:return SA(r,e,n.pads.length);case 3:return $A(r,e,n.pads.length);default:throw new Error("Invalid mode")}},OA=(r,e)=>{let n=$.padShape(r[0].dims.slice(),e.pads),t=r[0].dims,o=$.size(n),i=[{type:12,data:o},{type:6,data:e.pads}],s=r.length>=3&&r[2].data;e.mode===0&&i.push({type:s?r[2].dataType:1,data:e.value}),i.push(...M(r[0].dims,n));let a=["rank"],u=l=>{let c=R("output",r[0].dataType,n.length),d=O("x",r[0].dataType,t.length),p=d.type.value,f=AA(c,t.length,e),h=[{name:"output_size",type:"u32"},{name:"pads",type:"i32",length:e.pads.length}];return e.mode===0&&h.push({name:"constant_value",type:s?p:"f32"}),`
            ${l.registerUniforms(h).declareVariables(d,c)}
            ${l.mainStart()}
            ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

            let indices = ${c.offsetToIndices("global_idx")};

            var value = ${p}(0);
            ${f}
            output[global_idx] = value;
        }`};return{name:"Pad",shaderCache:{hint:`${e.mode}${s}`,inputDependencies:a},getRunData:()=>({outputs:[{dims:n,dataType:r[0].dataType}],dispatchGroup:{x:Math.ceil($.size(n)/64)},programUniforms:i}),getShaderSource:u}},PA=(r,e)=>{if(r.length>1){let n=r[1].getBigInt64Array(),t=r.length>=3&&r[2].data?r[2].dataType===10?r[2].getUint16Array()[0]:r[2].getFloat32Array()[0]:0,o=r[0].dims.length,i=new Int32Array(2*o).fill(0);if(r.length>=4){let a=r[3].getBigInt64Array();for(let u=0;u<a.length;u++)i[Number(a[u])]=Number(n[u]),i[Number(a[u])+o]=Number(n[u+a.length])}else n.forEach((a,u)=>i[Number(u)]=Number(a));let s=[];return i.forEach(a=>s.push(a)),{mode:e.mode,value:t,pads:s}}else return e},C_=(r,e)=>{xA(r.inputs);let n=PA(r.inputs,e);r.compute(OA(r.inputs,n),{inputs:[0]})}});var ss,L_,N_,R_,z_,EA,DA,B_,M_,V_,F_,G_,U_,W_,H_,q_,j_,K_,X_,Z_=A(()=>{"use strict";Ke();ee();oe();ae();ss=r=>{if(re.webgpu.validateInputContent&&(!r||r.length!==1))throw new Error("Pool ops requires 1 input.")},L_=(r,e,n)=>{let t=e.format==="NHWC",o=r.dims.slice();t&&o.splice(1,0,o.pop());let i=Object.hasOwnProperty.call(e,"dilations"),s=e.kernelShape.slice(),a=e.strides.slice(),u=i?e.dilations.slice():[],l=e.pads.slice();ir.adjustPoolAttributes(n,o,s,a,u,l);let c=ir.computePoolOutputShape(n,o,a,u,s,l,e.autoPad,e.ceilMode),d=Object.assign({},e);i?Object.assign(d,{kernelShape:s,strides:a,pads:l,dilations:u,cacheKey:e.cacheKey}):Object.assign(d,{kernelShape:s,strides:a,pads:l,cacheKey:e.cacheKey});let p=c.slice();return p.push(p.splice(1,1)[0]),[d,t?p:c]},N_=(r,e)=>{let n=e.format==="NHWC",t=$.size(r),o=$.size(e.kernelShape),i=[{type:12,data:t},{type:12,data:o}],s=[{name:"outputSize",type:"u32"},{name:"kernelSize",type:"u32"}];if(e.kernelShape.length<=2){let a=e.kernelShape[e.kernelShape.length-1],u=e.strides[e.strides.length-1],l=e.pads[e.pads.length/2-1],c=e.pads[e.pads.length-1],d=!!(l+c);i.push({type:12,data:a},{type:12,data:u},{type:12,data:l},{type:12,data:c}),s.push({name:"kw",type:"u32"},{name:"sw",type:"u32"},{name:"pwStart",type:"u32"},{name:"pwEnd",type:"u32"});let p=!1;if(e.kernelShape.length===2){let f=e.kernelShape[e.kernelShape.length-2],h=e.strides[e.strides.length-2],m=e.pads[e.pads.length/2-2],y=e.pads[e.pads.length-2];p=!!(m+y),i.push({type:12,data:f},{type:12,data:h},{type:12,data:m},{type:12,data:y}),s.push({name:"kh",type:"u32"},{name:"sh",type:"u32"},{name:"phStart",type:"u32"},{name:"phEnd",type:"u32"})}return[i,s,!0,d,p]}else{if(n)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let a=$.computeStrides(e.kernelShape);i.push({type:12,data:a},{type:12,data:e.pads},{type:12,data:e.strides}),s.push({name:"kernelStrides",type:"u32",length:a.length},{name:"pads",type:"u32",length:e.pads.length},{name:"strides",type:"u32",length:e.strides.length});let u=e.pads.reduce((l,c)=>l+c);return[i,s,!!u,!1,!1]}},R_=(r,e,n,t,o,i,s,a,u,l,c,d)=>{let p=o.format==="NHWC",f=e.type.value,h=R("output",e.type.tensor,t);if(o.kernelShape.length<=2){let m="",y="",g="",b=n-(p?2:1);if(c?m=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${b}] = indices[${b}] * uniforms.sw - uniforms.pwStart + i;
                  if (xIndices[${b}] < 0 || xIndices[${b}]
                      >= uniforms.x_shape[${b}]) {
                    pad++;
                    continue;
                  }
                  let x_val = x[${e.indicesToOffset("xIndices")}];
                  ${i}
                }`:m=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${b}] = indices[${b}] * uniforms.sw - uniforms.pwStart + i;
                  let x_val = x[${e.indicesToOffset("xIndices")}];
                  ${i}
                }`,o.kernelShape.length===2){let x=n-(p?3:2);d?y=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${x}] = indices[${x}] * uniforms.sh - uniforms.phStart + j;
                  if (xIndices[${x}] < 0 || xIndices[${x}] >= uniforms.x_shape[${x}]) {
                    pad += i32(uniforms.kw);
                    continue;
                  }
              `:y=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${x}] = indices[${x}] * uniforms.sh - uniforms.phStart + j;
                `,g=`
              }
            `}return`
            ${r.registerUniforms(u).declareVariables(e,h)}

            ${r.mainStart()}
              ${r.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

              let indices = ${h.offsetToIndices("global_idx")};
              var xIndices = ${h.offsetToIndices("global_idx")};

              var value = ${f}(${a});
              var pad = 0;
              ${y}
              ${m}
              ${g}
              ${s}

              output[global_idx] = value;
            }`}else{if(p)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let m=o.kernelShape.length,y=o.pads.length,g="";return l?g=`
                if (xIndices[j] >= uniforms.x_shape[j]) {
                  pad++;
                  isPad = true;
                  break;
                }
              }
              if (!isPad) {
                let x_val = x[${e.indicesToOffset("xIndices")}];
                ${i}
              }`:g=`
              }
              let x_val = x[${e.indicesToOffset("xIndices")}];
              ${i}
            `,`
            ${r.registerUniforms(u).declareVariables(e,h)}

            ${r.mainStart()}
              ${r.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
              let indices = ${h.offsetToIndices("global_idx")};
              var xIndices = ${h.offsetToIndices("global_idx")};

              var offsets: array<u32, ${m}>;

              var value = ${f}(${a});
              var pad = 0;
              var isPad = false;

              for (var i: u32 = 0u; i < uniforms.kernelSize; i++) {
                var offset = i;
                for (var j = 0u; j < ${m-1}u; j++) {
                  offsets[j] = offset / ${q("uniforms.kernelStrides","j",m)};
                  offset -= offsets[j] * ${q("uniforms.kernelStrides","j",m)};
                }
                offsets[${m-1}] = offset;

                isPad = false;
                for (var j = ${n-m}u; j < ${n}u; j++) {
                  xIndices[j] = indices[j] * ${q("uniforms.strides",`j - ${n-m}u`,m)}
                    + offsets[j - ${n-m}u] - ${q("uniforms.pads","j - 2u",y)};
                  ${g}
              }
              ${s}

              output[global_idx] = value;
            }`}},z_=r=>`${r.format};${r.ceilMode};${r.autoPad};${r.kernelShape.length}`,EA=r=>`${z_(r)};${r.countIncludePad}`,DA=r=>`${z_(r)};${r.storageOrder};${r.dilations}`,B_=r=>({format:r.format,autoPad:["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][r.auto_pad],ceilMode:r.ceil_mode,kernelShape:r.kernel_shape,strides:r.strides,pads:r.pads}),M_=(r,e,n,t)=>{let[o,i]=L_(e,t,n),s=O("x",e.dataType,e.dims.length),a=s.type.value,u="value += x_val;",l="";o.countIncludePad?l+=`value /= ${a}(uniforms.kernelSize);`:l+=`value /= ${a}(i32(uniforms.kernelSize) - pad);`;let[c,d,p,f,h]=N_(i,o);c.push(...M(e.dims,i));let m=["rank"];return{name:r,shaderCache:{hint:`${t.cacheKey};${p};${f};${h}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:i,dataType:e.dataType}],dispatchGroup:{x:Math.ceil($.size(i)/64)},programUniforms:c}),getShaderSource:y=>R_(y,s,e.dims.length,i.length,o,u,l,0,d,p,f,h)}},V_=r=>{let e=r.count_include_pad!==0,n=B_(r);if(n.ceilMode!==0)throw new Error("ceil_mode output-shape is computed, but ceil_mode kernel execution (padding/divisor) is not yet implemented in the WebGPU AveragePool kernel");let t={countIncludePad:e,...n,cacheKey:""};return{...t,cacheKey:EA(t)}},F_=(r,e)=>{ss(r.inputs),r.compute(M_("AveragePool",r.inputs[0],!1,e))},G_={autoPad:"",ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[]},U_=r=>{let e=r.format;return{format:e,...G_,cacheKey:e}},W_=(r,e)=>{ss(r.inputs),r.compute(M_("GlobalAveragePool",r.inputs[0],!0,e))},H_=(r,e,n,t)=>{let[o,i]=L_(e,t,n),s=`
      value = max(x_val, value);
    `,a="",u=O("x",e.dataType,e.dims.length),l=["rank"],[c,d,p,f,h]=N_(i,o);return c.push(...M(e.dims,i)),{name:r,shaderCache:{hint:`${t.cacheKey};${p};${f};${h}`,inputDependencies:l},getRunData:()=>({outputs:[{dims:i,dataType:e.dataType}],dispatchGroup:{x:Math.ceil($.size(i)/64)},programUniforms:c}),getShaderSource:m=>R_(m,u,e.dims.length,i.length,o,s,a,e.dataType===10?-65504:-1e5,d,p,f,h)}},q_=(r,e)=>{ss(r.inputs),r.compute(H_("MaxPool",r.inputs[0],!1,e))},j_=r=>{let e=r.storage_order,n=r.dilations,t=B_(r);if(e!==0)throw new Error("column major storage order is not yet supported for MaxPool");if(t.ceilMode!==0)throw new Error("ceil_mode output-shape is computed, but ceil_mode kernel execution (padding) is not yet implemented in the WebGPU MaxPool kernel");let o={storageOrder:e,dilations:n,...t,cacheKey:""};return{...o,cacheKey:DA(o)}},K_=r=>{let e=r.format;return{format:e,...G_,cacheKey:e}},X_=(r,e)=>{ss(r.inputs),r.compute(H_("GlobalMaxPool",r.inputs[0],!0,e))}});var kA,LA,J_,Q_,Y_=A(()=>{"use strict";ee();oe();Ce();ae();kA=(r,e)=>{if(r.length<2||r.length>3)throw new Error("DequantizeLinear requires 2 or 3 inputs.");if(r.length===3&&r[1].dims===r[2].dims)throw new Error("x-scale and x-zero-point must have the same shape.");if(r.length===3&&r[0].dataType!==r[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(r[1].dims.length!==0&&r[1].dims.length!==1&&r[1].dims.length!==r[0].dims.length)throw new Error("scale input must be a scalar, a 1D tensor, or have the same rank as the input tensor.");if(r.length>2){if(r[0].dataType!==r[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(r[1].dims.length!==r[2].dims.length)throw new Error("scale and zero-point inputs must have the same rank.");if(!r[1].dims.map((n,t)=>n===r[2].dims[t]).reduce((n,t)=>n&&t,!0))throw new Error("scale and zero-point inputs must have the same shape.")}if(e.blockSize>0){if(r[1].dims.length===0||r[1].dims.length===1&&r[1].dims[0]===1)throw new Error("blockSize must be set only for block quantization.");if(!r[1].dims.map((o,i)=>i===e.axis||o===r[0].dims[i]).reduce((o,i)=>o&&i,!0))throw new Error("For block qunatization, scale input shape to match the input shape except for the axis");if(r[1].dims.length!==r[0].dims.length)throw new Error("For block qunatization the scale input rank must be the same as the x rank.");let n=r[0].dims[e.axis],t=r[1].dims[e.axis];if(e.blockSize<Math.ceil(n/t)||e.blockSize>Math.ceil(n/(t-1)-1))throw new Error("blockSize must be with in the range [ceil(dI / Si), ceil(dI / (Si - 1) - 1)].")}},LA=(r,e)=>{let n=$.normalizeAxis(e.axis,r[0].dims.length),t=r[0].dataType,o=t===3,i=r[0].dims,s=r[1].dataType,a=$.size(i),u=t===3||t===2,l=u?[Math.ceil($.size(r[0].dims)/4)]:r[0].dims,c=r[1].dims,d=r.length>2?r[2]:void 0,p=d?u?[Math.ceil($.size(d.dims)/4)]:d.dims:void 0,f=c.length===0||c.length===1&&c[0]===1,h=f===!1&&c.length===1,m=ge(a),y=f&&(!u||m===4),g=y?m:1,b=y&&!u?m:1,_=O("input",u?12:t,l.length,b),x=O("scale",s,c.length),T=d?O("zero_point",u?12:t,p.length):void 0,S=R("output",s,i.length,g),P=[_,x];T&&P.push(T);let E=[l,c];d&&E.push(p);let N=[{type:12,data:a/g},{type:12,data:n},{type:12,data:e.blockSize},...M(...E,i)],B=D=>{let j=[{name:"output_size",type:"u32"},{name:"axis",type:"u32"},{name:"block_size",type:"u32"}];return`
      ${D.registerUniforms(j).declareVariables(...P,S)}
      ${D.mainStart()}
          ${D.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let output_indices = ${S.offsetToIndices("global_idx")};

          // Set input x
          ${u?`
            let input = ${_.getByOffset("global_idx / 4")};
            let x_vec = ${o?"unpack4xI8(input)":"unpack4xU8(input)"};
            let x_value = ${g===1?"x_vec[global_idx % 4]":"x_vec"};`:`let x_value = ${_.getByOffset("global_idx")};`};

          // Set scale input
          ${f?`let scale_value= ${x.getByOffset("0")}`:h?`
            let scale_index = ${S.indicesGet("output_indices","uniforms.axis")};
            let scale_value= ${x.getByOffset("scale_index")};`:`
            var scale_indices: ${x.type.indices} = output_indices;
            let index = ${x.indicesGet("scale_indices","uniforms.axis")} / uniforms.block_size;
            ${x.indicesSet("scale_indices","uniforms.axis","index")};
            let scale_value= ${x.getByIndices("scale_indices")};`};

          // Set zero-point input
          ${T?f?u?`
                let zero_point_input = ${T.getByOffset("0")};
                let zero_point_vec =  ${o?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value= zero_point_vec[0]`:`let zero_point_value = ${T.getByOffset("0")}`:h?u?`
                let zero_point_index = ${S.indicesGet("output_indices","uniforms.axis")};
                let zero_point_input = ${T.getByOffset("zero_point_index / 4")};
                let zero_point_vec =  ${o?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_index % 4]`:`
                let zero_point_index = ${S.indicesGet("output_indices","uniforms.axis")};
                let zero_point_value = ${T.getByOffset("zero_point_index")};`:u?`
                let zero_point_offset = ${x.indicesToOffset("scale_indices")};
                let zero_point_input = ${T.getByOffset("zero_point_offset / 4")};
                let zero_point_vec = ${o?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_offset % 4];`:`let zero_point_value = ${T.getByIndices("scale_indices")};`:`let zero_point_value = ${u?o?"i32":"u32":_.type.value}(0);`};
      // Compute and write output
      ${S.setByOffset("global_idx",`${S.type.value}(x_value - zero_point_value) * scale_value`)};
      }`};return{name:"DequantizeLinear",shaderCache:{hint:e.cacheKey,inputDependencies:T?["rank","rank","rank"]:["rank","rank"]},getShaderSource:B,getRunData:()=>({outputs:[{dims:i,dataType:s}],dispatchGroup:{x:Math.ceil(a/g/64),y:1,z:1},programUniforms:N})}},J_=(r,e)=>{kA(r.inputs,e),r.compute(LA(r.inputs,e))},Q_=r=>Q({axis:r.axis,blockSize:r.blockSize})});var NA,RA,ew,tw=A(()=>{"use strict";Ke();ee();ae();NA=(r,e,n)=>{let t=r===e,o=r<e&&n<0,i=r>e&&n>0;if(t||o||i)throw new Error("Range these inputs' contents are invalid.")},RA=(r,e,n,t)=>{let o=Math.abs(Math.ceil((e-r)/n)),i=[o],s=o,a=[{type:12,data:s},{type:t,data:r},{type:t,data:n},...M(i)],u=l=>{let c=R("output",t,i.length),d=c.type.value,p=[{name:"outputSize",type:"u32"},{name:"start",type:d},{name:"delta",type:d}];return`
        ${l.registerUniforms(p).declareVariables(c)}
        ${l.mainStart()}
        ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        output[global_idx] = uniforms.start + ${d}(global_idx) * uniforms.delta;
      }`};return{name:"Range",shaderCache:{hint:`${t}`},getShaderSource:u,getRunData:()=>({outputs:[{dims:i,dataType:t}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:a})}},ew=r=>{let e=0,n=0,t=0;r.inputs[0].dataType===6?(e=r.inputs[0].getInt32Array()[0],n=r.inputs[1].getInt32Array()[0],t=r.inputs[2].getInt32Array()[0]):r.inputs[0].dataType===1&&(e=r.inputs[0].getFloat32Array()[0],n=r.inputs[1].getFloat32Array()[0],t=r.inputs[2].getFloat32Array()[0]),re.webgpu.validateInputContent&&NA(e,n,t),r.compute(RA(e,n,t,r.inputs[0].dataType),{inputs:[]})}});var zA,BA,nw,rw,ow=A(()=>{"use strict";ee();oe();Ce();ae();zA=(r,e,n,t)=>{if(r!=="none"&&t!=="i32"&&t!=="u32"&&t!=="f32")throw new Error(`Input ${t} is not supported with reduction ${r}.`);let o=`{
                var oldValue = 0;
                loop {
                  let newValueF32 =`,i=`;
                  let newValue = bitcast<i32>(newValueF32);
                  let res = atomicCompareExchangeWeak(&${e}, oldValue, newValue);
                  if res.exchanged {
                    break;
                  }
                  oldValue = res.old_value;
                }
              }`;switch(r){case"none":return`${e}=${n};`;case"add":return t==="i32"||t==="u32"?`atomicAdd(&${e}, bitcast<${t}>(${n}));`:`
              ${o}bitcast<${t}>(oldValue) + (${n})${i}`;case"max":return t==="i32"||t==="u32"?`atomicMax(&${e}, bitcast<${t}>(${n}));`:`
                ${o}max(bitcast<f32>(oldValue), (${n}))${i}`;case"min":return t==="i32"||t==="u32"?`atomicMin(&${e}, bitcast<${t}>(${n}));`:`${o}min(bitcast<${t}>(oldValue), (${n}))${i}`;case"mul":return`${o}(bitcast<${t}>(oldValue) * (${n}))${i}`;default:throw new Error(`Reduction ${r} is not supported.`)}},BA=(r,e)=>{let n=r[0].dims,t=r[1].dims,o=n,i=1,s=Math.ceil($.sizeToDimension(t,t.length-1)/i),a=t[t.length-1],u=$.sizeFromDimension(n,a),l=[{type:12,data:s},{type:12,data:a},{type:12,data:u},...M(r[1].dims,r[2].dims,o)],c=d=>{let p=O("indices",r[1].dataType,r[1].dims.length),f=O("updates",r[2].dataType,r[2].dims.length,i),h=e.reduction!=="none"&&e.reduction!==""?vg("output",r[0].dataType,o.length):R("output",r[0].dataType,o.length,i);return`
      ${d.registerUniform("output_size","u32").registerUniform("last_index_dimension","u32").registerUniform("num_updates_elements","u32").declareVariables(p,f,h)}
      ${d.mainStart()}
        ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
  var data_offset = 0u;
  let indices_start = uniforms.last_index_dimension * global_idx;
  let indices_end = indices_start + uniforms.last_index_dimension;
  for (var i = indices_start; i < indices_end; i++) {
    var index = i32(indices[i].x);
    ${r[0].dims.length===1?`
    let element_count_dim = uniforms.output_strides;
    let dim_value = uniforms.output_shape;`:`
    let element_count_dim = uniforms.output_strides[i - indices_start];
    let dim_value = uniforms.output_shape[i - indices_start];`}
    if (index >= 0) {
      if (index >= i32(dim_value)) {
        index = i32(dim_value - 1);
      }
    } else {
      if (index < -i32(dim_value)) {
        index = 0;
      } else {
        index += i32(dim_value);
      }
    }
    data_offset += u32((u32(index) * element_count_dim));
  }

  for (var i = 0u; i < uniforms.num_updates_elements; i++) {
    let value = updates[uniforms.num_updates_elements * global_idx + i];
    ${zA(e.reduction,"output[data_offset + i]","value",h.type.value)}
  }

      }`};return{name:"ScatterND",shaderCache:{hint:`${e.cacheKey}_${e.reduction}`,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:o,dataType:r[0].dataType}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:l}),getShaderSource:c}},nw=r=>Q({reduction:r.reduction}),rw=(r,e)=>{r.compute(BA(r.inputs,e),{inputs:[r.inputs[1],r.inputs[2]],outputs:[]})}});var MA,VA,FA,iw,GA,UA,WA,HA,qA,jA,KA,XA,sw,ZA,JA,QA,YA,eO,aw,uw,lw=A(()=>{"use strict";ee();oe();Ce();ae();MA=(r,e)=>{if(r.every(n=>n>0||(()=>{throw new Error("Resize requires scales input values to be positive")})),r.length>0){if(e.mode==="linear"){if(!(r.length===2||r.length===3||r.length===4&&r[0]===1&&r[1]===1||r.length===4&&r[0]===1&&r[3]===1||r.length===5&&r[0]===1&&r[1]===1))throw new Error(`For linear mode, Resize requires scales to be 2D, 3D, 4D with either two outermost or one innermost and
            one outermost scale values equal to 1, or 5D with two outermost scale values equal to 1`)}else if(e.mode==="cubic"&&!(r.length===2||r.length===4&&r[0]===1&&r[1]===1||r.length===4&&r[0]===1&&r[3]===1))throw new Error("Resize requires scales input size to be 2 or 4 for cubic mode")}},VA=(r,e,n)=>{e.every(o=>o>=0&&o<n||(()=>{throw new Error("Resize requires axes input values to be positive and less than rank")}));let t=new Array(n).fill(1);return e.forEach((o,i)=>t[o]=r[i]),t},FA=(r,e,n,t,o,i)=>{let[s,a,u]=n>10?[1,2,3]:[-1,r.length>1?1:-1,-1],l=r[0].dims.length;if(s>0&&r.length>s&&r[s].dims.length>0)r[s].getFloat32Array().forEach(c=>i.push(c));else if(e.coordinateTransformMode==="tf_crop_and_resize")throw new Error("Resize requires RoI input to be specified when coordinateTransformMode is tfCropAndResize");if(a>0&&r.length>a&&r[a].dims.length===1&&r[a].dims[0]>0){if(r[a].getFloat32Array().forEach(c=>t.push(c)),t.length!==0&&t.length!==l&&n>=18&&t.length!==e.axes.length)throw new Error("Resize requires scales input size to be same as input rank or axes size for opset 18 and up");MA(t,e),e.axes.length>0&&VA(t,e.axes,l).forEach((c,d)=>t[d]=c)}if(u>0&&r.length>u&&r[u].dims.length===1&&r[u].dims[0]>0&&(r[u].getBigInt64Array().forEach(c=>o.push(Number(c))),o.length!==0&&o.length!==l&&n>=18&&o.length!==e.axes.length))throw new Error("Resize requires sizes input size to be same as input rank or axes size for opset 18 and up");if(e.axes.length>0){if(t.length!==0&&t.length!==e.axes.length)throw new Error('Resize requires "scales" input size to be of axes rank when axes attributes is specified');if(o.length!==0&&o.length!==e.axes.length)throw new Error('Resize requires "sizes" input size to be of rank axes rank when axes attributes is specified')}if(typeof t<"u"&&typeof o<"u"&&t.length>0&&o.length>l)throw new Error("Resize requires only of scales or sizes to be specified")},iw=(r,e,n,t)=>`
  // The whole part and the fractional part are calculated separately due to inaccuracy of floating
  // point division. As an example, f32(21) / f32(7) may evaluate to 2.99... instead of 3, causing an
  // offset-by-one error later in floor().
  let big = (${r}) * (${e});
  let whole = ${t}(big / (${n}));
  let fract = ${t}(big % (${n})) / ${t}(${n});
  return whole + fract;
`,GA=(r,e)=>`fn getOriginalCoordinateFromResizedCoordinate(xResized: u32, xScale: f32, lengthResized: u32,
     lengthOriginal: u32, roiStart: f32, roiEnd: f32) -> ${e} { `+(()=>{switch(r){case"asymmetric":return`
          if (xScale < 1.0 || floor(xScale) != xScale) {
            return ${e}(xResized) / ${e}(xScale);
          } else {
            ${iw("xResized","lengthOriginal","lengthResized",e)}
          }
        `;case"pytorch_half_pixel":return`if (lengthResized > 1) {
                    return (${e}(xResized) + 0.5) / ${e}(xScale) - 0.5;
                  } else {
                    return 0.0;
                  }`;case"tf_half_pixel_for_nn":return`return (${e}(xResized) + 0.5) / ${e}(xScale);`;case"align_corners":return`if (lengthResized == 1) {
                    return 0.0;
                  } else {
                    ${iw("xResized","lengthOriginal - 1","lengthResized - 1",e)}
                  }`;case"tf_crop_and_resize":return`if (lengthResized > 1) {
                    return ${e}(roiStart) * ${e}(lengthOriginal - 1) +
                        (${e}(xResized) * ${e}(roiEnd - roiStart) * ${e}(lengthOriginal - 1)) /
                        ${e}(lengthResized - 1);
                  } else {
                    return 0.5 * ${e}(roiStart + roiEnd) * ${e}(lengthOriginal - 1);
                  }`;case"half_pixel_symmetric":return`const outputWidth = ${e}xScale * ${e}(lengthResized);
                  const adjustment = ${e}(lengthResized) / outputWidth;
                  const center = ${e}(lengthOriginal) / 2;
                  const offset = center * (1 - adjustment);
                  return offset + ((${e}(xResized) + 0.5) / ${e}(xScale)) - 0.5;`;case"half_pixel":return`return ((${e}(xResized) + 0.5) / ${e}(xScale)) - 0.5;`;default:throw new Error(`Coordinate transform mode ${r} is not supported`)}})()+"}",UA=(r,e,n)=>`fn getNearestPixelFromOriginal(xOriginal: ${n}, isDownSample: bool) -> ${n} {`+(()=>{switch(r){case"round_prefer_ceil":return"if (fract(xOriginal) == 0.5) {             return ceil(xOriginal);           } else {             return round(xOriginal);           }";case"floor":return"return floor(xOriginal);";case"ceil":return"return ceil(xOriginal);";case"round_prefer_floor":return"if (fract(xOriginal) == 0.5) {                     return floor(xOriginal);                   } else {                     return round(xOriginal);                   }";default:if(e<11)return"if (isDownSample)                     {                       return ceil(xOriginal);                     } else {                       return xOriginal;                     }";throw new Error(`Nearest mode ${r} is not supported`)}})()+"}",WA=(r,e,n)=>{let t=new Array(n).fill(0).concat(new Array(n).fill(1)),o=r.length===0?t:r.slice();return e.length>0?(e.forEach((i,s)=>{t[i]=o[s],t[s+n]=o[e.length+s]}),t):o},HA=(r,e,n,t)=>{let o=[];if(n.length>0)if(t.length>0){if(r.forEach(i=>o.push(i)),Math.max(...t)>r.length)throw new Error("axes is out of bound");t.forEach((i,s)=>o[i]=n[s])}else n.forEach(i=>o.push(i));else{if(e.length===0)throw new Error("Resize requires either scales or sizes.");o=r.map((i,s)=>Math.round(i*e[s]))}return o},qA=(r,e,n)=>{let t=(()=>{switch(n.keepAspectRatioPolicy){case"not_larger":return n.axes.length>0?Math.min(...n.axes.map(i=>e[i]),Number.MAX_VALUE):Math.min(...e,Number.MAX_VALUE);case"not_smaller":return n.axes.length>0?Math.max(...n.axes.map(i=>e[i]),Number.MIN_VALUE):Math.max(...e,Number.MIN_VALUE);default:throw new Error(`Keep aspect ratio policy ${n.keepAspectRatioPolicy} is not supported`)}})();e.fill(1,0,e.length);let o=r.slice();return n.axes.length>0?(n.axes.forEach(i=>e[i]=t),n.axes.forEach(i=>o[i]=Math.round(r[i]*e[i]))):(e.fill(t,0,e.length),o.forEach((i,s)=>o[s]=Math.round(i*e[s]))),o},jA=(r,e,n,t,o)=>`
    fn calculateOriginalIndicesFromOutputIndices(output_indices: ${r.type.indices}) -> array<${r.type.value}, ${n.length}> {
      var original_indices: array<${r.type.value}, ${n.length}>;
      for (var i:u32 = 0; i < ${n.length}; i++) {
        var output_index = ${r.indicesGet("output_indices","i")};
        var scale = ${q("uniforms.scales","i",t)};
        var roi_low = ${q("uniforms.roi","i",o)};
        var roi_hi = ${q("uniforms.roi",`i + ${e.length}`,o)};
        if (scale == 1.0) {
          original_indices[i] = ${r.type.value}(output_index);
        } else {
          var input_shape_i = ${q("uniforms.input_shape","i",e.length)};
          var output_shape_i = ${q("uniforms.output_shape","i",n.length)};
          original_indices[i] = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                           input_shape_i, roi_low, roi_hi);
        }
      }
      return original_indices;
    }`,KA=(r,e,n,t,o,i,s)=>`
    fn calculateInputIndicesFromOutputIndices(output_indices: ${e.type.indices}) -> ${r.type.indices} {
      var input_indices: ${r.type.indices};
      for (var i:u32 = 0; i < ${t.length}; i++) {
        var output_index = ${e.indicesGet("output_indices","i")};
        var input_index: u32;
        var scale = ${q("uniforms.scales","i",o)};
        if (scale == 1.0) {
          input_index = output_index;
        } else {
          var roi_low = ${q("uniforms.roi","i",i)};
          var roi_hi = ${q("uniforms.roi",`i + ${n.length}`,i)};
          var input_shape_i = ${q("uniforms.input_shape","i",n.length)};
          var output_shape_i = ${q("uniforms.output_shape","i",t.length)};
          var original_idx = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                        input_shape_i, roi_low, roi_hi);
          if (!${s} || (original_idx >= 0 && original_idx < ${e.type.value}(input_shape_i))) {
            if (original_idx < 0) {
              input_index = 0;
            } else if (original_idx > ${e.type.value}(input_shape_i - 1)) {
              input_index = input_shape_i - 1;
            } else {
              input_index = u32(getNearestPixelFromOriginal(original_idx, scale < 1));
            }
          } else {
            input_index = u32(original_idx);
          }
        }
        ${r.indicesSet("input_indices","i","input_index")}
      }
      return input_indices;
    }`,XA=(r,e)=>`
    fn checkInputIndices(input_indices: ${r.type.indices}) -> bool {
      for (var i:u32 = 0; i < ${e.length}; i++) {
        var input_index = ${r.indicesGet("input_indices","i")};
        if (input_index < 0 || input_index >= ${q("uniforms.input_shape","i",e.length)}) {
          return false;
        }
      }
      return true;
    }`,sw=(r,e,n,t)=>r.rank>t?`
    ${r.indicesSet("input_indices",e,"channel")};
    ${r.indicesSet("input_indices",n,"batch")};
`:"",ZA=(r,e,n,t,o)=>{let[s,a,u,l]=n.length===2?[-1,0,1,-1]:[0,2,3,1],c=r.type.value;return`
    fn getInputValue(batch: u32, channel: u32, row: u32, col: u32) -> ${c} {
      var input_indices: ${r.type.indices};
      ${r.indicesSet("input_indices",a,`max(0, min(row, ${n[a]} - 1))`)};
      ${r.indicesSet("input_indices",u,`max(0, min(col, ${n[u]} - 1))`)};
      ${sw(r,l,s,2)}
      return ${r.getByIndices("input_indices")};
    }

    fn bilinearInterpolation(output_indices: ${e.type.indices}) -> ${c} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var row:${c} = originalIndices[${a}];
      var col:${c} = originalIndices[${u}];
      ${t?`if (row < 0 || row > (${n[a]} - 1) || col < 0 || col > (${n[u]} - 1)) {
        return ${o};
      }`:""};
      row = max(0, min(row, ${n[a]} - 1));
      col = max(0, min(col, ${n[u]} - 1));
      var row1: u32 = u32(row);
      var col1: u32 = u32(col);
      var row2: u32 = u32(row + 1);
      var col2: u32 = u32(col + 1);
      var channel: u32 = ${n.length>2?`u32(originalIndices[${l}])`:"0"};
      var batch: u32 =  ${n.length>2?`u32(originalIndices[${s}])`:"0"};
      var x11: ${c} = getInputValue(batch, channel, row1, col1);
      var x12: ${c} = getInputValue(batch, channel, row1, col2);
      var x21: ${c} = getInputValue(batch, channel, row2, col1);
      var x22: ${c} = getInputValue(batch, channel, row2, col2);
      var dx1: ${c} = abs(row - ${c}(row1));
      var dx2: ${c} = abs(${c}(row2) - row);
      var dy1: ${c} = abs(col - ${c}(col1));
      var dy2: ${c} = abs(${c}(col2) - col);
      if (row1 == row2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (col1 == col2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      return (x11 * dx2 * dy2 + x12 * dx2 * dy1 + x21 * dx1 * dy2 + x22 * dx1 * dy1);
    }`},JA=(r,e,n,t,o,i,s,a,u,l)=>{let c=n.length===2,d=!0,[p,f]=c?[0,1]:d?[2,3]:[1,2],h=r.type.value,m=y=>{let g=y===p?"row":"col";return`
      fn ${g}CubicInterpolation(input_indices: ${r.type.indices}, output_indices: ${e.type.indices}) -> ${h} {
        var output_index = ${e.indicesGet("output_indices",y)};
        var originalIdx: ${h} = getOriginalCoordinateFromResizedCoordinate(output_index, ${o[y]},
        ${t[y]}, ${n[y]}, ${i[y]}, ${i[y]} + ${n.length});
        var fractOriginalIdx: ${h} = originalIdx - floor(originalIdx);
        var coefs = getCubicInterpolationCoefs(fractOriginalIdx);

        if (${a} && (originalIdx < 0 || originalIdx > (${n[y]} - 1))) {
          return ${u};
        }
        var data: array<${h}, 4> = array<${h}, 4>(0.0, 0.0, 0.0, 0.0);
        for (var i: i32 = -1; i < 3; i++) {
          var ${g}: ${h} = originalIdx + ${h}(i);
          if (${g} < 0 || ${g} >= ${n[y]}) {
            ${l?`coefs[i + 1] = 0.0;
                        continue;`:a?`return ${u};`:`${g} = max(0, min(${g}, ${n[y]} - 1));`};
          }
        var input_indices_copy: ${r.type.indices} = input_indices;
          ${r.indicesSet("input_indices_copy",y,`u32(${g})`)};
          data[i + 1] = ${y===p?r.getByIndices("input_indices_copy"):"rowCubicInterpolation(input_indices_copy, output_indices)"};
        }
        return cubicInterpolation1D(data, coefs);
      }`};return`
    ${m(p)};
    ${m(f)};
  fn getCubicInterpolationCoefs(s: ${h}) -> array<${h}, 4> {
    var absS = abs(s);
    var coeffs: array<${h}, 4> = array<${h}, 4>(0.0, 0.0, 0.0, 0.0);
    var oneMinusAbsS: ${h} = 1.0 - absS;
    var twoMinusAbsS: ${h} = 2.0 - absS;
    var onePlusAbsS: ${h} = 1.0 + absS;
    coeffs[0] = ((${s} * onePlusAbsS - 5 * ${s}) * onePlusAbsS + 8 * ${s}) * onePlusAbsS - 4 * ${s};
    coeffs[1] = ((${s} + 2) * absS - (${s} + 3)) * absS * absS + 1;
    coeffs[2] = ((${s} + 2) * oneMinusAbsS - (${s} + 3)) * oneMinusAbsS * oneMinusAbsS + 1;
    coeffs[3] = ((${s} * twoMinusAbsS - 5 * ${s}) * twoMinusAbsS + 8 * ${s}) * twoMinusAbsS - 4 * ${s};
    return coeffs;
  }

  fn cubicInterpolation1D(x: array<${h}, 4>, coefs: array<${h}, 4>) -> ${h} {
    var coefsSum: ${h} = coefs[0] + coefs[1] + coefs[2] + coefs[3];
    return (x[0] * coefs[0] + x[1] * coefs[1]+ x[2] * coefs[2]+ x[3] * coefs[3]) / coefsSum;
  }

  fn bicubicInterpolation(output_indices: ${e.type.indices}) -> ${h} {
    var input_indices: ${r.type.indices} = output_indices;
    return colCubicInterpolation(input_indices, output_indices);
  }
    `},QA=(r,e,n,t,o)=>{let[s,a,u,l,c]=n.length===3?[-1,0,1,2,-1]:[0,2,3,4,1],d=r.type.value;return`
    fn getInputValue(batch: u32, channel: u32, depth:u32, height: u32, width: u32) -> ${d} {
      var input_indices: ${r.type.indices};
      ${r.indicesSet("input_indices",a,`max(0, min(depth, ${n[a]} - 1))`)};
      ${r.indicesSet("input_indices",u,`max(0, min(height, ${n[u]} - 1))`)};
      ${r.indicesSet("input_indices",l,`max(0, min(width, ${n[l]} - 1))`)};
      ${sw(r,c,s,3)}
      return ${r.getByIndices("input_indices")};
    }

    fn trilinearInterpolation(output_indices: ${e.type.indices}) -> ${d} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var depth:${d} = originalIndices[${a}];
      var height:${d} = originalIndices[${u}];
      var width:${d} = originalIndices[${l}];
      ${t?`if (depth < 0 || depth > (${n[a]} - 1) || height < 0 || height > (${n[u]} - 1) || width < 0 || (width > ${n[l]} - 1)) {
      return ${o};
        }`:""};

    depth = max(0, min(depth, ${n[a]} - 1));
      height = max(0, min(height, ${n[u]} - 1));
      width = max(0, min(width, ${n[l]} - 1));
      var depth1: u32 = u32(depth);
      var height1: u32 = u32(height);
      var width1: u32 = u32(width);
      var depth2: u32 = u32(depth + 1);
      var height2: u32 = u32(height + 1);
      var width2: u32 = u32(width + 1);
      var channel: u32 = ${n.length>3?`u32(originalIndices[${c}])`:"0"};
      var batch: u32 =  ${n.length>3?`u32(originalIndices[${s}])`:"0"};

      var x111: ${d} = getInputValue(batch, channel, depth1, height1, width1);
      var x112: ${d} = getInputValue(batch, channel, depth1, height1, width2);
      var x121: ${d} = getInputValue(batch, channel, depth1, height2, width1);
      var x122: ${d} = getInputValue(batch, channel, depth1, height2, width2);
      var x211: ${d} = getInputValue(batch, channel, depth2, height1, width1);
      var x212: ${d} = getInputValue(batch, channel, depth2, height1, width2);
      var x221: ${d} = getInputValue(batch, channel, depth2, height2, width1);
      var x222: ${d} = getInputValue(batch, channel, depth2, height2, width2);
      var dx1: ${d} = abs(depth - ${d}(depth1));
      var dx2: ${d} = abs(${d}(depth2) - depth);
      var dy1: ${d} = abs(height - ${d}(height1));
      var dy2: ${d} = abs(${d}(height2) - height);
      var dz1: ${d} = abs(width - ${d}(width1));
      var dz2: ${d} = abs(${d}(width2) - width);
      if (depth1 == depth2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (height1 == height2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      if (width1 == width2) {
        dz1 = 0.5;
        dz2 = 0.5;
      }
      return (x111 * dx2 * dy2 * dz2 + x112 * dx2 * dy2 * dz1 + x121 * dx2 * dy1 *dz2 + x122 * dx2 * dy1 * dz1 +
              x211 * dx1 * dy2 * dz2 + x212 * dx1 * dy2 * dz1 + x221 * dx1 * dy1 *dz2 + x222 * dx1 * dy1 * dz1);
    }`},YA=(r,e,n,t,o,i)=>{let s=r.dims,a=WA(i,e.axes,s.length),u=HA(s,t,o,e.axes),l=t.slice();t.length===0&&(l=s.map((b,_)=>b===0?1:u[_]/b),e.keepAspectRatioPolicy!=="stretch"&&(u=qA(s,l,e)));let c=R("output",r.dataType,u.length),d=O("input",r.dataType,s.length),p=$.size(u),f=s.length===u.length&&s.every((b,_)=>b===u[_]),h=e.coordinateTransformMode==="tf_crop_and_resize",m=e.extrapolationValue,y=d.type.value,g=b=>`
      ${f?"":`
      ${GA(e.coordinateTransformMode,y)};
      ${(()=>{switch(e.mode){case"nearest":return`
              ${XA(d,s)};
              ${UA(e.nearestMode,n,y)};
              ${KA(d,c,s,u,l.length,a.length,h)};
              `;case"linear":return`
              ${jA(c,s,u,l.length,a.length)};
              ${(()=>{if(s.length===2||s.length===4)return`${ZA(d,c,s,h,m)}`;if(s.length===3||s.length===5)return`${QA(d,c,s,h,m)}`;throw Error("Linear mode only supports input dims 2, 3, 4 and 5 are supported in linear mode.")})()};
            `;case"cubic":return`
            ${(()=>{if(s.length===2||s.length===4)return`${JA(d,c,s,u,l,a,e.cubicCoeffA,h,e.extrapolationValue,e.excludeOutside)}`;throw Error("Cubic mode only supports input dims 2 and 4 are supported in linear mode.")})()};
            `;default:throw Error("Invalid resize mode")}})()};
      `}
      ${b.registerUniform("output_size","u32").registerUniform("scales","f32",l.length).registerUniform("roi","f32",a.length).declareVariables(d,c)}
      ${b.mainStart()}
        ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
        ${f?"output[global_idx] = input[global_idx];":`
        let output_indices = ${c.offsetToIndices("global_idx")};
        var input_indices: ${d.type.indices};
        ${(()=>{switch(e.mode){case"nearest":return`input_indices = calculateInputIndicesFromOutputIndices(output_indices);
                if (checkInputIndices(input_indices)) {
                  output[global_idx] = ${d.getByIndices("input_indices")};
                } else {
                  output[global_idx] = ${e.extrapolationValue};
                }`;case"linear":return`output[global_idx] = ${s.length===2||s.length===4?"bilinearInterpolation":"trilinearInterpolation"}(output_indices);`;case"cubic":return"output[global_idx] = bicubicInterpolation(output_indices);";default:throw Error(`Unsupported resize mode: ${e.mode}`)}})()};
`}
      }`;return{name:"Resize",shaderCache:{hint:`${e.cacheKey}|${n}|${l.length>0?e.mode==="cubic"?l:l.length:""}|${o.length>0?o:""}|${a.length>0?a:""}|${f}|${e.mode==="nearest"?s.length:s}`,inputDependencies:["rank"]},getShaderSource:g,getRunData:()=>({outputs:[{dims:u,dataType:r.dataType}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:[{type:12,data:p},{type:1,data:l},{type:1,data:a},...M(s,u)]})}},eO=r=>{let e=r.customDataBuffer;return new Uint32Array(e.buffer,e.byteOffset,1)[0]},aw=(r,e)=>{let n=[],t=[],o=[],i=eO(r);if(e.antialias!==0)throw Error("Only default value (0) for Antialias attribute is supported");FA(r.inputs,e,i,n,t,o),r.compute(YA(r.inputs[0],e,i,n,t,o),{inputs:[0]})},uw=r=>{let e=r.antialias,n=r.axes,t=r.coordinateTransformMode,o=r.cubicCoeffA,i=r.excludeOutside!==0,s=r.extrapolationValue,a=r.keepAspectRatioPolicy,u=r.mode,l=r.nearestMode===""?"simple":r.nearestMode;return Q({antialias:e,axes:n,coordinateTransformMode:t,cubicCoeffA:o,excludeOutside:i,extrapolationValue:s,keepAspectRatioPolicy:a,mode:u,nearestMode:l})}});var tO,nO,cw,dw=A(()=>{"use strict";ee();oe();ae();tO=r=>{if(!r||r.length<3)throw new Error("layerNorm requires at least 3 inputs.");let e=r[0],n=r[1],t=r[2];if(e.dataType!==n.dataType||e.dataType!==t.dataType)throw new Error("All inputs must have the same data type");if(e.dims.length!==3&&e.dims.length!==2)throw new Error("Input must be 2D or 3D");if(n.dims.length!==3&&n.dims.length!==2)throw new Error("Skip must be 2D or 3D");let o=e.dims[e.dims.length-1],i=e.dims[e.dims.length-2];if(n.dims[n.dims.length-1]!==o)throw new Error("Skip must have the same hidden size as input");if(n.dims[n.dims.length-2]!==i)throw new Error("Skip must have the same sequence length as input");if(t.dims.length!==1)throw new Error("Gamma must be 1D");if(t.dims[t.dims.length-1]!==o)throw new Error("Gamma must have the same hidden size as input");if(r.length>3){let s=r[3];if(s.dims.length!==1)throw new Error("Beta must be 1D");if(s.dims[s.dims.length-1]!==o)throw new Error("Beta must have the same hidden size as input")}if(r.length>4){let s=r[4];if(s.dims.length!==1)throw new Error("Bias must be 1D");if(s.dims[s.dims.length-1]!==o)throw new Error("Bias must have the same hidden size as input")}},nO=(r,e,n,t)=>{let o=e.simplified,i=r[0].dims,s=$.size(i),a=i,u=s,l=i.slice(-1)[0],c=t?i.slice(0,-1).concat(1):[],d=!o&&r.length>3,p=r.length>4,f=t&&n>1,h=t&&n>2,m=n>3,y=64,g=ge(l),b=[{type:12,data:u},{type:12,data:g},{type:12,data:l},{type:1,data:e.epsilon}],_=T=>{let S=[{name:"output_size",type:"u32"},{name:"components",type:"u32"},{name:"hidden_size",type:"u32"},{name:"epsilon",type:"f32"}],P=[O("x",r[0].dataType,r[0].dims,g),O("skip",r[1].dataType,r[1].dims,g),O("gamma",r[2].dataType,r[2].dims,g)];d&&P.push(O("beta",r[3].dataType,r[3].dims,g)),p&&P.push(O("bias",r[4].dataType,r[4].dims,g)),P.push(R("output",r[0].dataType,a,g)),f&&P.push(R("mean_output",1,c)),h&&P.push(R("inv_std_output",1,c)),m&&P.push(R("input_skip_bias_sum",r[0].dataType,a,g));let E=Se(r[0].dataType),N=Se(1,g);return`

      ${T.registerUniforms(S).declareVariables(...P)}
      var<workgroup> sum_shared : array<${N}, ${y}>;
      var<workgroup> sum_squared_shared : array<${N}, ${y}>;

      ${T.mainStart([y,1,1])}
        let ix = local_id.x;
        let iy = global_id.x / ${y};

        let hidden_size_vectorized: u32 = uniforms.hidden_size / uniforms.components;
        var stride = hidden_size_vectorized / ${y};
        let offset = ix * stride + iy * hidden_size_vectorized;
        let offset1d = stride * ix;
        if (ix == ${y-1}) {
          stride = hidden_size_vectorized - stride * ix;
        }
        for (var i: u32 = 0; i < stride; i++) {
          let skip_value = skip[offset + i];
          let bias_value = ${p?"bias[offset1d + i]":E+"(0.0)"};
          let input_value = x[offset + i];
          let value = input_value + skip_value + bias_value;
          ${m?"input_skip_bias_sum[offset + i] = value;":""}
          output[offset + i] = value;
          let f32_value = ${ar(E,g,"value")};
          sum_shared[ix] += f32_value;
          sum_squared_shared[ix] += f32_value * f32_value;
        }
        workgroupBarrier();

        var reduce_size : u32 = ${y};
        for (var curr_size = reduce_size >> 1;  curr_size > 0; curr_size = reduce_size >> 1) {
          reduce_size = curr_size + (reduce_size & 1);
          if (ix < curr_size) {
            sum_shared[ix] += sum_shared[ix + reduce_size];
            sum_squared_shared[ix] += sum_squared_shared[ix + reduce_size];
          }
          workgroupBarrier();
        }

        let sum = sum_shared[0];
        let square_sum = sum_squared_shared[0];
        let mean = ${At("sum",g)} / f32(uniforms.hidden_size);
        let inv_std_dev = inverseSqrt(${At("square_sum",g)} / f32(uniforms.hidden_size) ${o?"":"- mean * mean"} + uniforms.epsilon);
        ${f?"mean_output[global_idx] = mean;":""}
        ${h?"inv_std_output[global_idx] = inv_std_dev;":""}

        for (var i: u32 = 0; i < stride; i++) {
          output[offset + i] = (output[offset + i] ${o?"":`- ${E}(mean)`}) *
            ${E}(inv_std_dev) * gamma[offset1d + i]
            ${d?"+ beta[offset1d + i]":""};
        }
      }`},x=[{dims:a,dataType:r[0].dataType}];return n>1&&x.push({dims:c,dataType:1}),n>2&&x.push({dims:c,dataType:1}),n>3&&x.push({dims:i,dataType:r[0].dataType}),{name:"SkipLayerNormalization",shaderCache:{hint:`${g};${f};${h};${m}`,inputDependencies:r.map((T,S)=>"type")},getShaderSource:_,getRunData:()=>({outputs:x,dispatchGroup:{x:Math.ceil(u/l)},programUniforms:b})}},cw=(r,e)=>{tO(r.inputs);let t=[0];r.outputCount>1&&t.push(-3),r.outputCount>2&&t.push(-3),r.outputCount>3&&t.push(3),r.compute(nO(r.inputs,e,r.outputCount,!1),{outputs:t})}});var rO,as,oO,pw,iO,sO,fw,hw,mw=A(()=>{"use strict";ee();oe();Ce();ae();rO=(r,e)=>{if(!r||r.length<1)throw new Error("too few inputs");if(e.axes.length!==0){if(e.axes.length!==e.starts.length||e.axes.length!==e.ends.length)throw new Error("axes, starts and ends must have the same length")}else if(e.starts.length!==e.ends.length)throw new Error("starts and ends must have the same length");r.slice(1).forEach((n,t)=>{if(r[t+1].dataType!==6&&r[t+1].dataType!==7)throw new Error(`Input ${t} must be an array of int32 or int64`)})},as=(r,e)=>{let n=[];if(r.length>e)if(r[e].dataType===7)r[e].getBigInt64Array().forEach(t=>n.push(Number(t)));else if(r[e].dataType===6)r[e].getInt32Array().forEach(t=>n.push(Number(t)));else throw new Error(`Input ${e} must be an array of int32 or int64`);return n},oO=(r,e)=>{if(r.length>1){let n=as(r,1),t=as(r,2),o=as(r,3);return o.length===0&&(o=[...Array(r[0].dims.length).keys()]),Q({starts:n,ends:t,axes:o})}else return e},pw=(r,e,n,t,o)=>{let i=r;return r<0&&(i+=n[t[e]]),o[e]<0?Math.max(0,Math.min(i,n[t[e]]-1)):Math.max(0,Math.min(i,n[t[e]]))},iO=(r,e,n)=>`fn calculateInputIndices(output_indices: ${e.type.indices}) -> ${r.type.indices} {
          var input_indices: ${r.type.indices};
          var carry = 0u;
          for (var i = ${n.length-1}; i >= 0; i--) {
            let input_shape_i = ${q("uniforms.input_shape","i",n.length)};
            let steps_i = ${q("uniforms.steps","i",n.length)};
            let signs_i = ${q("uniforms.signs","i",n.length)};
            let starts_i = ${q("uniforms.starts","i",n.length)};
            var output_index = ${e.indicesGet("output_indices","i")};
            var input_index = output_index * steps_i + starts_i + carry;
            carry = input_index / input_shape_i;
            input_index = input_index % input_shape_i;
            if (signs_i < 0) {
              input_index = input_shape_i - input_index - 1u + starts_i;
            }
            ${r.indicesSet("input_indices","i","input_index")};
          }
          return input_indices;
      }`,sO=(r,e)=>{let n=r[0].dims,t=$.size(n),o=e.axes.length>0?$.normalizeAxes(e.axes,n.length):[...Array(n.length).keys()],i=as(r,4);i.forEach(g=>g!==0||(()=>{throw new Error("step cannot be 0")})),i.length===0&&(i=Array(o.length).fill(1));let s=e.starts.map((g,b)=>pw(g,b,n,o,i)),a=e.ends.map((g,b)=>pw(g,b,n,o,i));if(o.length!==s.length||o.length!==a.length)throw new Error("start, ends and axes should have the same number of elements");if(o.length!==n.length)for(let g=0;g<n.length;++g)o.includes(g)||(s.splice(g,0,0),a.splice(g,0,n[g]),i.splice(g,0,1));let u=i.map(g=>Math.sign(g));i.forEach((g,b,_)=>{if(g<0){let x=(a[b]-s[b])/g,T=s[b],S=T+x*i[b];s[b]=S,a[b]=T,_[b]=-g}});let l=n.slice(0);o.forEach((g,b)=>{l[g]=Math.ceil((a[g]-s[g])/i[g])});let c={dims:l,dataType:r[0].dataType},d=R("output",r[0].dataType,l.length),p=O("input",r[0].dataType,r[0].dims.length),f=$.size(l),h=[{name:"outputSize",type:"u32"},{name:"starts",type:"u32",length:s.length},{name:"signs",type:"i32",length:u.length},{name:"steps",type:"u32",length:i.length}],m=[{type:12,data:f},{type:12,data:s},{type:6,data:u},{type:12,data:i},...M(r[0].dims,l)],y=g=>`
      ${g.registerUniforms(h).declareVariables(p,d)}
        ${iO(p,d,n)}
        ${g.mainStart()}
          ${g.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
          let output_indices = ${d.offsetToIndices("global_idx")};
          let input_indices = calculateInputIndices(output_indices);
          ${d.setByOffset("global_idx",p.getByIndices("input_indices"))}
      }`;return{name:"Slice",shaderCache:{hint:`${u.length}_${s.length}_${i.length}`,inputDependencies:["rank"]},getShaderSource:y,getRunData:()=>({outputs:[c],dispatchGroup:{x:Math.ceil(t/64)},programUniforms:m})}},fw=(r,e)=>{rO(r.inputs,e);let n=oO(r.inputs,e);r.compute(sO(r.inputs,n),{inputs:[0]})},hw=r=>{let e=r.starts,n=r.ends,t=r.axes;return Q({starts:e,ends:n,axes:t})}});var aO,uO,gw,bw,yw=A(()=>{"use strict";ee();oe();Ce();Sn();ae();aO=r=>{if(!r||r.length!==1)throw new Error("Softmax op requires 1 input.")},uO=(r,e)=>{let n=r.inputs[0],t=n.dims,o=$.size(t),i=t.length,s=$.normalizeAxis(e.axis,i),a=s<t.length-1,u,l=[];a?(l=Array.from({length:i},(P,E)=>E),l[s]=i-1,l[i-1]=s,u=r.compute(We(n,l),{inputs:[n],outputs:[-1]})[0]):u=n;let c=u.dims,d=c[i-1],p=o/d,f=ge(d),h=d/f,m=64;p===1&&(m=256);let y=(P,E)=>E===4?`max(max(${P}.x, ${P}.y), max(${P}.z, ${P}.w))`:E===2?`max(${P}.x, ${P}.y)`:E===3?`max(max(${P}.x, ${P}.y), ${P}.z)`:P,g=O("x",u.dataType,u.dims,f),b=R("result",u.dataType,u.dims,f),_=g.type.value,x=Se(u.dataType)==="f32"?`var threadMax = ${_}(-3.4028234663852886e+38f);`:`var threadMax = ${_}(-65504.0h);`,T=P=>`
      var<workgroup> rowMaxShared : ${_};
      var<workgroup> rowSumShared : ${_};
      var<workgroup> threadShared : array<${_}, ${m}>;

      fn getValue(row: i32, col: i32, row_stride: i32) -> ${_} {
        let index = row * row_stride + col;
        return x[index];
      }

      fn setValue(row: i32, col: i32, row_stride: i32, value: ${_}) {
        let index = row * row_stride + col;
        result[index] = value;
      }
      ${P.registerUniform("packedCols","i32").declareVariables(g,b)}
      ${P.mainStart(m)}
        let gindex = i32(global_idx);
        let lindex = i32(local_idx);
        const wg = ${m};
        let row = gindex / wg;
        let cols = uniforms.packedCols;
        let row_stride : i32 = uniforms.packedCols;

        // find the rows max
        ${x}
        for (var col = lindex; col < cols; col += wg) {
          let value = getValue(row, col, row_stride);
          threadMax = max(threadMax, value);
        }
        if (lindex < cols) {
          threadShared[lindex] = threadMax;
        }
        workgroupBarrier();

        var reduceSize = min(cols, wg);
        for (var currSize = reduceSize >> 1;  currSize > 0; currSize = reduceSize >> 1) {
          reduceSize = currSize + (reduceSize & 1);
          if (lindex < currSize) {
            threadShared[lindex] = max(threadShared[lindex], threadShared[lindex + reduceSize]);
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowMaxShared = ${_}(${y("threadShared[0]",f)});
        }
        workgroupBarrier();

        // find the rows sum
        var threadSum = ${_}(0.0);
        for (var col = lindex; col < cols; col += wg) {
          let subExp = exp(getValue(row, col, row_stride) - rowMaxShared);
          threadSum += subExp;
        }
        threadShared[lindex] = threadSum;
        workgroupBarrier();

        for (var currSize = wg >> 1;  currSize > 0; currSize = currSize >> 1) {
          if (lindex < currSize) {
            threadShared[lindex] = threadShared[lindex] + threadShared[lindex + currSize];
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowSumShared = ${_}(${At("threadShared[0]",f)});
        }
        workgroupBarrier();

        // calculate final value for each element in the row
        for (var col = lindex; col < cols; col += wg) {
          var value = exp(getValue(row, col, row_stride) - rowMaxShared) / rowSumShared;
          // max operation protects against NaN since all values should be >=0
          value = max(value, ${_}(0.0));
          setValue(row, col, row_stride, value);
        }
      }`,S=r.compute({name:"Softmax",shaderCache:{hint:`${f};${m}`,inputDependencies:["type"]},getRunData:()=>({outputs:[{dims:c,dataType:u.dataType}],dispatchGroup:{x:p},programUniforms:[{type:6,data:h}]}),getShaderSource:T},{inputs:[u],outputs:[a?-1:0]})[0];a&&r.compute(We(S,l),{inputs:[S]})},gw=(r,e)=>{aO(r.inputs),uO(r,e)},bw=r=>Q({axis:r.axis})});var _w,lO,cO,dO,ww,vw=A(()=>{"use strict";ee();oe();ae();_w=r=>Array.from(r.getBigInt64Array(),Number),lO=r=>{if(!r||r.length!==2)throw new Error("Tile requires 2 inputs.");if(r[0].dataType!==1&&r[0].dataType!==10&&r[0].dataType!==6&&r[0].dataType!==12)throw new Error("Tile only support float, float16, int32, and uint32 data types");if(r[1].dataType!==7)throw new Error("Tile `repeats` input should be of int64 data type");if(r[1].dims.length!==1)throw new Error("Tile `repeats` input should be 1-D");if(_w(r[1]).length!==r[0].dims.length)throw new Error("Tile `repeats` input should have same number of elements as rank of input data tensor")},cO=(r,e)=>{let n=[];for(let t=0;t<r.length;++t)n.push(r[t]*e[t]);return n},dO=(r,e)=>{let n=r[0].dims,t=e??_w(r[1]),o=cO(n,t),i=$.size(o),s=r[0].dataType,a=O("input",s,n.length),u=R("output",s,o.length),l=c=>`
      const inputShape = ${a.indices(...n)};
      ${c.registerUniform("output_size","u32").declareVariables(a,u)}
      ${c.mainStart()}
      ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let output_indices = ${u.offsetToIndices("global_idx")};
      var input_indices: ${a.type.indices};
      for (var i = 0; i < ${n.length}; i++) {
        let input_dim_i = ${a.indicesGet("uniforms.input_shape","i")};
        let input_dim_value = ${u.indicesGet("output_indices","i")}  % input_dim_i;

        ${a.indicesSet("input_indices","i","input_dim_value")}
      }
      ${u.setByOffset("global_idx",a.getByIndices("input_indices"))}
    }`;return{name:"Tile",shaderCache:{hint:`${t}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:o,dataType:r[0].dataType}],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:[{type:12,data:i},...M(r[0].dims,o)]}),getShaderSource:l}},ww=r=>{lO(r.inputs),r.compute(dO(r.inputs),{inputs:[0]})}});var pO,fO,xw,Tw=A(()=>{"use strict";ee();oe();ae();pO=(r,e,n,t,o)=>{let i=R("output_data",o,n.length,4),s=O("a_data",e[1].dataType,e[1].dims.length,4),a=O("b_data",e[2].dataType,e[2].dims.length,4),u=O("c_data",e[0].dataType,e[0].dims.length,4),l,c=(d,p,f)=>`select(${p}, ${d}, ${f})`;if(!t)l=i.setByOffset("global_idx",c(s.getByOffset("global_idx"),a.getByOffset("global_idx"),u.getByOffset("global_idx")));else{let d=(p,f,h="")=>{let m=`a_data[index_a${f}][component_a${f}]`,y=`b_data[index_b${f}][component_b${f}]`,g=`bool(c_data[index_c${f}] & (0xffu << (component_c${f} * 8)))`;return`
            let output_indices${f} = ${i.offsetToIndices(`global_idx * 4u + ${f}u`)};
            let offset_a${f} = ${s.broadcastedIndicesToOffset(`output_indices${f}`,i)};
            let offset_b${f} = ${a.broadcastedIndicesToOffset(`output_indices${f}`,i)};
            let offset_c${f} = ${u.broadcastedIndicesToOffset(`output_indices${f}`,i)};
            let index_a${f} = offset_a${f} / 4u;
            let index_b${f} = offset_b${f} / 4u;
            let index_c${f} = offset_c${f} / 4u;
            let component_a${f} = offset_a${f} % 4u;
            let component_b${f} = offset_b${f} % 4u;
            let component_c${f} = offset_c${f} % 4u;
            ${p}[${f}] = ${h}(${c(m,y,g)});
          `};o===9?l=`
            var data = vec4<u32>(0);
            ${d("data",0,"u32")}
            ${d("data",1,"u32")}
            ${d("data",2,"u32")}
            ${d("data",3,"u32")}
            output_data[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:l=`
            ${d("output_data[global_idx]",0)}
            ${d("output_data[global_idx]",1)}
            ${d("output_data[global_idx]",2)}
            ${d("output_data[global_idx]",3)}
          `}return`
        ${r.registerUniform("vec_size","u32").declareVariables(u,s,a,i)}
        ${r.mainStart()}
        ${r.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${l}
      }`},fO=r=>{let e=r[1].dims,n=r[2].dims,t=r[0].dims,o=r[1].dataType,i=!($.areEqual(e,n)&&$.areEqual(n,t)),s=e,a=$.size(e);if(i){let l=bn.calcShape(bn.calcShape(e,n,!1),t,!1);if(!l)throw new Error("Can't perform where op on the given tensors");s=l,a=$.size(s)}let u=Math.ceil(a/4);return{name:"Where",shaderCache:{inputDependencies:["rank","rank","rank"]},getShaderSource:l=>pO(l,r,s,i,o),getRunData:()=>({outputs:[{dims:s,dataType:o}],dispatchGroup:{x:Math.ceil(a/64/4)},programUniforms:[{type:12,data:u},...M(t,e,n,s)]})}},xw=r=>{r.compute(fO(r.inputs))}});var Iw,Sw=A(()=>{"use strict";Zg();Ki();Yg();tb();Fb();Qb();ty();by();Iy();Ay();Ey();By();Uy();qy();Ky();Jy();e_();r_();s_();l_();p_();v_();I_();$_();O_();D_();xl();k_();Z_();Y_();tw();ow();qi();lw();Sl();dw();mw();yw();Il();vw();Sn();Zi();Tw();Iw=new Map([["Abs",[nb]],["Acos",[rb]],["Acosh",[ob]],["Add",[Gb]],["ArgMax",[Xg,ul]],["ArgMin",[Kg,ul]],["Asin",[ib]],["Asinh",[sb]],["Atan",[ab]],["Atanh",[ub]],["Attention",[Jg]],["AveragePool",[F_,V_]],["BatchNormalization",[Qg]],["BiasAdd",[eb]],["BiasSplitGelu",[Vb]],["Cast",[cb,lb]],["Ceil",[pb]],["Clip",[db]],["Concat",[Yb,ey]],["Conv",[bl,gl]],["ConvTranspose",[Ty,vy]],["Cos",[fb]],["Cosh",[hb]],["CumSum",[Sy,$y]],["DepthToSpace",[Oy,Py]],["DequantizeLinear",[J_,Q_]],["DFT",[Ry,zy]],["Div",[Ub]],["Einsum",[Fy,Gy]],["Elu",[mb,io]],["Equal",[Wb]],["Erf",[gb]],["Exp",[bb]],["Expand",[Hy]],["FastGelu",[jy]],["Floor",[yb]],["FusedConv",[bl,gl]],["Gather",[Zy,Xy]],["GatherElements",[i_,o_]],["GatherBlockQuantized",[t_,n_]],["GatherND",[Qy,Yy]],["Gelu",[_b]],["Gemm",[u_,a_]],["GlobalAveragePool",[W_,U_]],["GlobalMaxPool",[X_,K_]],["Greater",[Kb]],["GreaterOrEqual",[Zb]],["GridSample",[c_,d_]],["GroupQueryAttention",[w_]],["HardSigmoid",[Ab,$b]],["HardSwish",[Ob]],["InstanceNormalization",[T_]],["LayerNormalization",[S_]],["LeakyRelu",[wb,io]],["Less",[Xb]],["LessOrEqual",[Jb]],["Log",[zb]],["MatMul",[A_]],["MatMulNBits",[P_,E_]],["MaxPool",[q_,j_]],["Mul",[Hb]],["MultiHeadAttention",[m_,h_]],["Neg",[xb]],["Not",[vb]],["Pad",[C_]],["Pow",[qb]],["QuickGelu",[Bb,io]],["Range",[ew]],["Reciprocal",[Tb]],["ReduceMin",[Gg]],["ReduceMean",[zg]],["ReduceMax",[Fg]],["ReduceSum",[Wg]],["ReduceProd",[Ug]],["ReduceL1",[Bg]],["ReduceL2",[Mg]],["ReduceLogSum",[qg]],["ReduceLogSumExp",[Vg]],["ReduceSumSquare",[Hg]],["Relu",[Ib]],["Resize",[aw,uw]],["RotaryEmbedding",[y_]],["ScatterND",[rw,nw]],["Sigmoid",[Sb]],["Sin",[Pb]],["Sinh",[Eb]],["Slice",[fw,hw]],["SkipLayerNormalization",[cw]],["Split",[g_,b_]],["Sqrt",[Db]],["Softmax",[gw,bw]],["Sub",[jb]],["Tan",[Cb]],["Tanh",[Lb]],["ThresholdedRelu",[Rb,io]],["Tile",[ww]],["Transpose",[Ig,Sg]],["Where",[xw]]])});var us,$w=A(()=>{"use strict";Ke();gn();ae();us=class{constructor(e){this.backend=e;this.repo=new Map,this.attributesBound=!1}getArtifact(e){return this.repo.get(e)}setArtifact(e,n){this.repo.set(e,n)}run(e,n,t,o,i){at(e.programInfo.name);let s=this.backend.device,a=this.backend.getComputePassEncoder();this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2);let u=[];for(let c of n)u.push({binding:u.length,resource:{buffer:c.buffer}});for(let c of t)u.push({binding:u.length,resource:{buffer:c.buffer}});i&&u.push({binding:u.length,resource:i});let l=s.createBindGroup({layout:e.computePipeline.getBindGroupLayout(0),entries:u,label:e.programInfo.name});if(this.backend.sessionStatus==="capturing"){let c={kernelId:this.backend.currentKernelId,computePipeline:e.computePipeline,bindGroup:l,dispatchGroup:o};this.backend.capturedCommandList.get(this.backend.currentSessionId).push(c)}a.setPipeline(e.computePipeline),a.setBindGroup(0,l),a.dispatchWorkgroups(...o),this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2+1),this.backend.pendingDispatchNumber++,(this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber||this.backend.queryType==="at-passes")&&this.backend.endComputePass(),this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber&&this.backend.flush(),et(e.programInfo.name)}dispose(){}build(e,n){at(e.name);let t=this.backend.device,o=[];[{feature:"shader-f16",extension:"f16"},{feature:"subgroups",extension:"subgroups"}].forEach(d=>{t.features.has(d.feature)&&o.push(`enable ${d.extension};`)});let s=xg(n,this.backend.device.limits),a=e.getShaderSource(s),u=`${o.join(`
`)}
${s.additionalImplementations}
${a}`,l=t.createShaderModule({code:u,label:e.name});le("verbose",()=>`[WebGPU] ${e.name} shader code: ${u}`);let c=t.createComputePipeline({compute:{module:l,entryPoint:"main"},layout:"auto",label:e.name});return et(e.name),{programInfo:e,computePipeline:c,uniformVariablesInfo:s.variablesInfo}}normalizeDispatchGroupSize(e){let n=typeof e=="number"?e:e.x,t=typeof e=="number"?1:e.y||1,o=typeof e=="number"?1:e.z||1,i=this.backend.device.limits.maxComputeWorkgroupsPerDimension;if(n<=i&&t<=i&&o<=i)return[n,t,o];let s=n*t*o,a=Math.ceil(Math.sqrt(s));if(a>i){if(a=Math.ceil(Math.cbrt(s)),a>i)throw new Error("Total dispatch size exceeds WebGPU maximum.");return[a,a,a]}else return[a,a,1]}}});var Aw={};pr(Aw,{WebGpuBackend:()=>Al});var hO,mO,$l,Al,Ow=A(()=>{"use strict";Ke();ee();gn();Ju();wg();Sw();$w();hO=(r,e)=>{if(e.length!==r.length)throw new Error(`inputDependencies length ${e.length} is not equal to inputTensors length ${r.length}.`);let n=[];for(let t=0;t<r.length;++t){let o=r[t].dataType;switch(e[t]){case"none":{n.push("");break}case"type":{n.push(`${o}`);break}case"rank":{let i=r[t].dims.length;n.push(`${o};${i}`);break}case"dims":{let i=r[t].dims.join(",");n.push(`${o};${i}`);break}default:throw new Error(`unsupported input dependency: ${e[t]}`)}}return n.join("|")},mO=(r,e,n)=>{let t=r.name;return r.shaderCache?.hint&&(t+="["+r.shaderCache.hint+"]"),t+=":"+n+`:${hO(e,r.shaderCache?.inputDependencies??new Array(e.length).fill("dims"))}`,t},$l=class{constructor(e){e&&(this.architecture=e.architecture,this.vendor=e.vendor)}isArchitecture(e){return this.architecture===e}isVendor(e){return this.vendor===e}},Al=class{constructor(){this.currentSessionId=null;this.currentKernelId=null;this.commandEncoder=null;this.computePassEncoder=null;this.maxDispatchNumber=16;this.pendingDispatchNumber=0;this.pendingKernels=[];this.pendingQueries=new Map;this.sessionStatus="default";this.capturedCommandList=new Map;this.capturedPendingKernels=new Map;this.sessionExternalDataMapping=new Map}get currentKernelCustomData(){if(this.currentKernelId===null)throw new Error("currentKernelCustomData(): currentKernelId is null. (should not happen)");let e=this.kernelCustomData.get(this.currentKernelId);return e||(e={},this.kernelCustomData.set(this.currentKernelId,e)),e}async initialize(e,n){this.env=e;let t=[],o={requiredLimits:{maxComputeWorkgroupStorageSize:n.limits.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:n.limits.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:n.limits.maxStorageBufferBindingSize,maxBufferSize:n.limits.maxBufferSize,maxComputeInvocationsPerWorkgroup:n.limits.maxComputeInvocationsPerWorkgroup,maxComputeWorkgroupSizeX:n.limits.maxComputeWorkgroupSizeX,maxComputeWorkgroupSizeY:n.limits.maxComputeWorkgroupSizeY,maxComputeWorkgroupSizeZ:n.limits.maxComputeWorkgroupSizeZ},requiredFeatures:t},i=u=>n.features.has(u)&&t.push(u)&&!0;i("chromium-experimental-timestamp-query-inside-passes")||i("timestamp-query"),i("shader-f16"),i("subgroups"),this.device=await n.requestDevice(o);let s=n,a=n.info??(typeof s.requestAdapterInfo=="function"?await s.requestAdapterInfo():void 0);this.adapterInfo=new $l(a),this.gpuDataManager=_g(this),this.programManager=new us(this),this.kernels=new Map,this.kernelPersistentData=new Map,this.kernelCustomData=new Map,Ri(e.logLevel,!!e.debug),this.device.onuncapturederror=u=>{u.error instanceof GPUValidationError&&console.error(`An uncaught WebGPU validation error was raised: ${u.error.message}`)},Object.defineProperty(this.env.webgpu,"device",{value:this.device,writable:!1,enumerable:!0,configurable:!0}),Object.defineProperty(this.env.webgpu,"adapter",{value:n,writable:!1,enumerable:!0,configurable:!1}),this.setQueryType()}dispose(){typeof this.querySet<"u"&&this.querySet.destroy(),this.gpuDataManager.dispose(),this.device&&this.env?.webgpu&&this.device.lost.then(()=>{delete this.env.webgpu.device})}getCommandEncoder(){return this.commandEncoder||(this.commandEncoder=this.device.createCommandEncoder()),this.commandEncoder}getComputePassEncoder(){if(!this.computePassEncoder){let e=this.getCommandEncoder(),n={};this.queryType==="at-passes"&&(n.timestampWrites={querySet:this.querySet,beginningOfPassWriteIndex:this.pendingDispatchNumber*2,endOfPassWriteIndex:this.pendingDispatchNumber*2+1}),this.computePassEncoder=e.beginComputePass(n)}return this.computePassEncoder}endComputePass(){this.computePassEncoder&&(this.computePassEncoder.end(),this.computePassEncoder=null)}flush(){if(!this.commandEncoder)return;at(),this.endComputePass();let e;this.queryType!=="none"&&(this.commandEncoder.resolveQuerySet(this.querySet,0,this.pendingDispatchNumber*2,this.queryResolveBuffer,0),e=this.device.createBuffer({size:this.pendingDispatchNumber*2*8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.pendingQueries.set(e,this.pendingKernels),this.pendingKernels=[],this.commandEncoder.copyBufferToBuffer(this.queryResolveBuffer,0,e,0,this.pendingDispatchNumber*2*8)),this.device.queue.submit([this.commandEncoder.finish()]),this.gpuDataManager.refreshPendingBuffers(),this.commandEncoder=null,this.pendingDispatchNumber=0,this.queryType!=="none"&&e.mapAsync(GPUMapMode.READ).then(()=>{let n=new BigUint64Array(e.getMappedRange()),t=this.pendingQueries.get(e);for(let o=0;o<n.length/2;o++){let i=t[o],s=i.kernelId,a=this.kernels.get(s),u=a.kernelType,l=a.kernelName,c=i.programName,d=i.inputTensorViews,p=i.outputTensorViews,f=n[o*2],h=n[o*2+1];typeof this.queryTimeBase>"u"&&(this.queryTimeBase=f);let m=Number(f-this.queryTimeBase),y=Number(h-this.queryTimeBase);if(!Number.isSafeInteger(m)||!Number.isSafeInteger(y))throw new RangeError("incorrect timestamp range");if(this.env.webgpu.profiling?.ondata)this.env.webgpu.profiling.ondata({version:1,inputsMetadata:d.map(g=>({dims:g.dims,dataType:mn(g.dataType)})),outputsMetadata:p.map(g=>({dims:g.dims,dataType:mn(g.dataType)})),kernelId:s,kernelType:u,kernelName:l,programName:c,startTime:m,endTime:y});else{let g="";d.forEach((_,x)=>{g+=`input[${x}]: [${_.dims}] | ${mn(_.dataType)}, `});let b="";p.forEach((_,x)=>{b+=`output[${x}]: [${_.dims}] | ${mn(_.dataType)}, `}),console.log(`[profiling] kernel "${s}|${u}|${l}|${c}" ${g}${b}start time: ${m} ns, execution time: ${y-m} ns`)}go("GPU",`${c}::${f}::${h}`)}e.unmap(),this.pendingQueries.delete(e)}),et()}run(e,n,t,o,i,s){at(e.name);let a=[];for(let _=0;_<n.length;++_){let x=n[_].data;if(x===0)continue;let T=this.gpuDataManager.get(x);if(!T)throw new Error(`no GPU data for input: ${x}`);a.push(T)}let{outputs:u,dispatchGroup:l,programUniforms:c}=e.getRunData(n),d=t.length===0?u.map((_,x)=>x):t;if(d.length!==u.length)throw new Error(`Output size ${d.length} must be equal to ${u.length}.`);let p=[],f=[];for(let _=0;_<u.length;++_){if(!Number.isInteger(d[_])||d[_]<-3||d[_]>=s)throw new Error(`Invalid output index: ${d[_]}`);if(d[_]===-3)continue;let x=d[_]===-1,T=d[_]===-2,S=x||T?i(u[_].dataType,u[_].dims):o(d[_],u[_].dataType,u[_].dims);if(p.push(S),S.data===0)continue;let P=this.gpuDataManager.get(S.data);if(!P)throw new Error(`no GPU data for output: ${S.data}`);if(x&&this.temporaryData.push(P),T){let E=this.kernelPersistentData.get(this.currentKernelId);E||(E=[],this.kernelPersistentData.set(this.currentKernelId,E)),E.push(P)}f.push(P)}if(a.length!==n.length||f.length!==p.length){if(f.length===0)return et(e.name),p;throw new Error(`Program ${e.name} has zero-sized tensor(s) in inputs or outputs. This is not supported now.`)}let h;if(c){let _=0,x=[];c.forEach(E=>{let N=typeof E.data=="number"?[E.data]:E.data;if(N.length===0)return;let B=E.type===10?2:4,D,j;E.type===10?(j=N.length>4?16:N.length>2?8:N.length*B,D=N.length>4?16:B*N.length):(j=N.length<=2?N.length*B:16,D=16),_=Math.ceil(_/j)*j,x.push(_);let C=E.type===10?8:4;_+=N.length>4?Math.ceil(N.length/C)*D:N.length*B});let T=16;_=Math.ceil(_/T)*T;let S=new ArrayBuffer(_);c.forEach((E,N)=>{let B=x[N],D=typeof E.data=="number"?[E.data]:E.data;if(E.type===6)new Int32Array(S,B,D.length).set(D);else if(E.type===12)new Uint32Array(S,B,D.length).set(D);else if(E.type===10)new Uint16Array(S,B,D.length).set(D);else if(E.type===1)new Float32Array(S,B,D.length).set(D);else throw new Error(`Unsupported uniform type: ${mn(E.type)}`)});let P=this.gpuDataManager.create(_,GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM);this.device.queue.writeBuffer(P.buffer,0,S,0,_),this.gpuDataManager.release(P.id),h={offset:0,size:_,buffer:P.buffer}}let m=this.programManager.normalizeDispatchGroupSize(l),y=m[1]===1&&m[2]===1,g=mO(e,n,y),b=this.programManager.getArtifact(g);if(b||(b=this.programManager.build(e,m),this.programManager.setArtifact(g,b),le("info",()=>`[artifact] key: ${g}, programName: ${e.name}`)),c&&b.uniformVariablesInfo){if(c.length!==b.uniformVariablesInfo.length)throw new Error(`Uniform variables count mismatch: expect ${b.uniformVariablesInfo.length}, got ${c.length} in program "${b.programInfo.name}".`);for(let _=0;_<c.length;_++){let x=c[_],T=x.type,S=typeof x.data=="number"?1:x.data.length,[P,E]=b.uniformVariablesInfo[_];if(T!==P||S!==E)throw new Error(`Uniform variable ${_} mismatch: expect type ${P} with size ${E}, got type ${T} with size ${S} in program "${b.programInfo.name}".`)}}if(le("info",()=>`[ProgramManager] run "${e.name}" (key=${g}) with ${m[0]}x${m[1]}x${m[2]}`),this.queryType!=="none"||this.sessionStatus==="capturing"){let _={kernelId:this.currentKernelId,programName:b.programInfo.name,inputTensorViews:n,outputTensorViews:p};this.pendingKernels.push(_),this.sessionStatus==="capturing"&&this.capturedPendingKernels.get(this.currentSessionId).push(_)}return this.programManager.run(b,a,f,m,h),et(e.name),p}upload(e,n){this.gpuDataManager.upload(e,n)}memcpy(e,n){this.gpuDataManager.memcpy(e,n)}async download(e,n){await this.gpuDataManager.download(e,n)}alloc(e){return this.gpuDataManager.create(e).id}free(e){return this.gpuDataManager.release(e)}createKernel(e,n,t,o){let i=Iw.get(e);if(!i)throw new Error(`kernel not implemented: ${e}`);let s={kernelType:e,kernelName:o,kernelEntry:i[0],attributes:[i[1],t]};this.kernels.set(n,s)}releaseKernel(e){let n=this.kernelPersistentData.get(e);if(n){for(let t of n)this.gpuDataManager.release(t.id);this.kernelPersistentData.delete(e)}this.kernelCustomData.delete(e),this.kernels.delete(e)}computeKernel(e,n,t){let o=this.kernels.get(e);if(!o)throw new Error(`kernel not created: ${e}`);let i=o.kernelType,s=o.kernelName,a=o.kernelEntry,u=o.attributes;if(this.currentKernelId!==null)throw new Error(`kernel "[${i}] ${s}" is not allowed to be called recursively`);this.currentKernelId=e,u[0]&&(u[1]=u[0](u[1]),u[0]=void 0),le("info",()=>`[WebGPU] Start to run kernel "[${i}] ${s}"...`);let l=this.env.debug;this.temporaryData=[];try{return l&&this.device.pushErrorScope("validation"),a(n,u[1]),0}catch(c){return t.push(Promise.resolve(`[WebGPU] Kernel "[${i}] ${s}" failed. ${c}`)),1}finally{l&&t.push(this.device.popErrorScope().then(c=>c?`GPU validation error for kernel "[${i}] ${s}": ${c.message}`:null));for(let c of this.temporaryData)this.gpuDataManager.release(c.id);this.temporaryData=[],this.currentKernelId=null}}registerBuffer(e,n,t,o){let i=this.sessionExternalDataMapping.get(e);i||(i=new Map,this.sessionExternalDataMapping.set(e,i));let s=i.get(n),a=this.gpuDataManager.registerExternalBuffer(t,o,s);return i.set(n,[a,t]),a}unregisterBuffers(e){let n=this.sessionExternalDataMapping.get(e);n&&(n.forEach(t=>this.gpuDataManager.unregisterExternalBuffer(t[0])),this.sessionExternalDataMapping.delete(e))}getBuffer(e){let n=this.gpuDataManager.get(e);if(!n)throw new Error(`no GPU data for buffer: ${e}`);return n.buffer}createDownloader(e,n,t){return async()=>{let o=await nl(this,e,n);return Bi(o.buffer,t)}}writeTimestamp(e){this.queryType==="inside-passes"&&this.computePassEncoder.writeTimestamp(this.querySet,e)}setQueryType(){this.queryType="none",(this.env.webgpu.profiling?.mode==="default"||(typeof this.env.trace>"u"?this.env.wasm.trace:this.env.trace))&&(this.device.features.has("chromium-experimental-timestamp-query-inside-passes")?this.queryType="inside-passes":this.device.features.has("timestamp-query")&&(this.queryType="at-passes"),this.queryType!=="none"&&typeof this.querySet>"u"&&(this.querySet=this.device.createQuerySet({type:"timestamp",count:this.maxDispatchNumber*2}),this.queryResolveBuffer=this.device.createBuffer({size:this.maxDispatchNumber*2*8,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.QUERY_RESOLVE})))}captureBegin(){le("info","captureBegin"),this.capturedCommandList.get(this.currentSessionId)||this.capturedCommandList.set(this.currentSessionId,[]),this.capturedPendingKernels.get(this.currentSessionId)||this.capturedPendingKernels.set(this.currentSessionId,[]),this.flush(),this.sessionStatus="capturing"}captureEnd(){le("info","captureEnd"),this.flush(),this.sessionStatus="default"}replay(){le("info","replay"),this.sessionStatus="replaying";let e=this.capturedCommandList.get(this.currentSessionId),n=this.capturedPendingKernels.get(this.currentSessionId),t=e.length;this.pendingKernels=[];for(let o=0;o<t;o++){let i=this.getComputePassEncoder(),s=e[o];this.writeTimestamp(this.pendingDispatchNumber*2),i.setPipeline(s.computePipeline),i.setBindGroup(0,s.bindGroup),i.dispatchWorkgroups(...s.dispatchGroup),this.writeTimestamp(this.pendingDispatchNumber*2+1),this.pendingDispatchNumber++,this.queryType!=="none"&&this.pendingKernels.push(n[o]),(this.pendingDispatchNumber>=this.maxDispatchNumber||this.queryType==="at-passes")&&this.endComputePass(),this.pendingDispatchNumber>=this.maxDispatchNumber&&this.flush()}this.flush(),this.sessionStatus="default"}onCreateSession(){this.gpuDataManager.onCreateSession()}onReleaseSession(e){this.unregisterBuffers(e),this.capturedCommandList.has(e)&&this.capturedCommandList.delete(e),this.capturedPendingKernels.has(e)&&this.capturedPendingKernels.delete(e),this.gpuDataManager.onReleaseSession(e)}onRunStart(e){this.currentSessionId=e,this.setQueryType()}}});var Pw={};pr(Pw,{init:()=>gO});var lo,Ol,gO,Ew=A(()=>{"use strict";ee();gn();oe();mg();lo=class r{constructor(e,n,t,o){this.module=e;this.dataType=n;this.data=t;this.dims=o}getFloat32Array(){if(this.dataType!==1)throw new Error("Invalid data type");let e=$.size(this.dims);return e===0?new Float32Array:new Float32Array(this.module.HEAP8.buffer,this.data,e)}getBigInt64Array(){if(this.dataType!==7)throw new Error("Invalid data type");let e=$.size(this.dims);return e===0?new BigInt64Array:new BigInt64Array(this.module.HEAP8.buffer,this.data,e)}getInt32Array(){if(this.dataType!==6)throw new Error("Invalid data type");let e=$.size(this.dims);return e===0?new Int32Array:new Int32Array(this.module.HEAP8.buffer,this.data,e)}getUint16Array(){if(this.dataType!==10&&this.dataType!==4)throw new Error("Invalid data type");let e=$.size(this.dims);return e===0?new Uint16Array:new Uint16Array(this.module.HEAP8.buffer,this.data,e)}reshape(e){if($.size(e)!==$.size(this.dims))throw new Error("Invalid new shape");return new r(this.module,this.dataType,this.data,e)}},Ol=class{constructor(e,n,t){this.module=e;this.backend=n;this.customDataOffset=0;this.customDataSize=0;this.adapterInfo=n.adapterInfo;let o=e.PTR_SIZE,i=t/e.PTR_SIZE,s=o===4?"i32":"i64";this.opKernelContext=Number(e.getValue(o*i++,s));let a=Number(e.getValue(o*i++,s));this.outputCount=Number(e.getValue(o*i++,s)),this.customDataOffset=Number(e.getValue(o*i++,"*")),this.customDataSize=Number(e.getValue(o*i++,s));let u=[];for(let l=0;l<a;l++){let c=Number(e.getValue(o*i++,s)),d=Number(e.getValue(o*i++,"*")),p=Number(e.getValue(o*i++,s)),f=[];for(let h=0;h<p;h++)f.push(Number(e.getValue(o*i++,s)));u.push(new lo(e,c,d,f))}this.inputs=u}get kernelCustomData(){return this.backend.currentKernelCustomData}get customDataBuffer(){return this.module.HEAPU8.subarray(this.customDataOffset,this.customDataOffset+this.customDataSize)}compute(e,n){let t=n?.inputs?.map(a=>typeof a=="number"?this.inputs[a]:a)??this.inputs,o=n?.outputs??[],i=(a,u,l)=>new lo(this.module,u,this.output(a,l),l),s=(a,u)=>{let l=Vn(a,u);if(!l)throw new Error(`Unsupported data type: ${a}`);let c=l>0?this.backend.gpuDataManager.create(l).id:0;return new lo(this.module,a,c,u)};return this.backend.run(e,t,o,i,s,this.outputCount)}output(e,n){let t=this.module.stackSave();try{let o=this.module.PTR_SIZE,i=o===4?"i32":"i64",s=this.module.stackAlloc((1+n.length)*o);this.module.setValue(s,n.length,i);for(let a=0;a<n.length;a++)this.module.setValue(s+o*(a+1),n[a],i);return this.module._JsepOutput(this.opKernelContext,e,s)}catch(o){throw new Error(`Failed to generate kernel's output[${e}] with dims [${n}]. If you are running with pre-allocated output, please make sure the output type/dims are correct. Error: ${o}`)}finally{this.module.stackRestore(t)}}},gO=async(r,e,n,t)=>{let o=e.jsepInit;if(!o)throw new Error("Failed to initialize JSEP. The WebAssembly module is not built with JSEP support.");if(r==="webgpu"){let i=(Ow(),kr(Aw)).WebGpuBackend,s=new i;await s.initialize(n,t),o("webgpu",[s,a=>s.alloc(Number(a)),a=>s.free(a),(a,u,l,c=!1)=>{if(c)le("verbose",()=>`[WebGPU] jsepCopyGpuToGpu: src=${Number(a)}, dst=${Number(u)}, size=${Number(l)}`),s.memcpy(Number(a),Number(u));else{le("verbose",()=>`[WebGPU] jsepCopyCpuToGpu: dataOffset=${Number(a)}, gpuDataId=${Number(u)}, size=${Number(l)}`);let d=e.HEAPU8.subarray(Number(a>>>0),Number(a>>>0)+Number(l));s.upload(Number(u),d)}},async(a,u,l)=>{le("verbose",()=>`[WebGPU] jsepCopyGpuToCpu: gpuDataId=${a}, dataOffset=${u}, size=${l}`),await s.download(Number(a),()=>e.HEAPU8.subarray(Number(u)>>>0,Number(u+l)>>>0))},(a,u,l)=>s.createKernel(a,Number(u),l,e.UTF8ToString(e._JsepGetNodeName(Number(u)))),a=>s.releaseKernel(a),(a,u,l,c)=>{le("verbose",()=>`[WebGPU] jsepRun: sessionHandle=${l}, kernel=${a}, contextDataOffset=${u}`);let d=new Ol(e,s,Number(u));return s.computeKernel(Number(a),d,c)},()=>s.captureBegin(),()=>s.captureEnd(),()=>s.replay()])}else{let i=new Gi(n);o("webnn",[i,()=>i.reserveTensorId(),s=>i.releaseTensorId(s),async(s,a,u,l,c)=>i.ensureTensor(s,a,u,l,c),(s,a)=>{i.uploadTensor(s,a)},async(s,a)=>i.downloadTensor(s,a),(s,a)=>i.registerMLContext(s,a),!!n.trace])}}});var bO,Ii,Si,lr,yO,Dw,to,$i,Ai,Cw,Oi,Pi,Ei,Wu=A(()=>{"use strict";Ke();ng();og();ee();Bn();ki();Xu();bO=(r,e)=>{Te()._OrtInit(r,e)!==0&&me("Can't initialize onnxruntime.")},Ii=async r=>{bO(r.wasm.numThreads,ro(r.logLevel))},Si=async(r,e)=>{Te().asyncInit?.();let n=r.webgpu.adapter;if(e==="webgpu"){if(typeof navigator>"u"||!navigator.gpu)throw new Error("WebGPU is not supported in current environment");if(n){if(typeof n.limits!="object"||typeof n.features!="object"||typeof n.requestDevice!="function")throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.")}else{let t=r.webgpu.powerPreference;if(t!==void 0&&t!=="low-power"&&t!=="high-performance")throw new Error(`Invalid powerPreference setting: "${t}"`);let o=r.webgpu.forceFallbackAdapter;if(o!==void 0&&typeof o!="boolean")throw new Error(`Invalid forceFallbackAdapter setting: "${o}"`);if(n=await navigator.gpu.requestAdapter({powerPreference:t,forceFallbackAdapter:o}),!n)throw new Error('Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.')}}if(e==="webnn"&&(typeof navigator>"u"||!navigator.ml))throw new Error("WebNN is not supported in current environment");{let t=(Ew(),kr(Pw)).init;e==="webgpu"&&await t("webgpu",Te(),r,n),e==="webnn"&&await t("webnn",Te(),r)}},lr=new Map,yO=r=>{let e=Te(),n=e.stackSave();try{let t=e.PTR_SIZE,o=e.stackAlloc(2*t);e._OrtGetInputOutputCount(r,o,o+t)!==0&&me("Can't get session input/output count.");let s=t===4?"i32":"i64";return[Number(e.getValue(o,s)),Number(e.getValue(o+t,s))]}finally{e.stackRestore(n)}},Dw=(r,e)=>{let n=Te(),t=n.stackSave(),o=0;try{let i=n.PTR_SIZE,s=n.stackAlloc(2*i);n._OrtGetInputOutputMetadata(r,e,s,s+i)!==0&&me("Can't get session input/output metadata.");let u=Number(n.getValue(s,"*"));o=Number(n.getValue(s+i,"*"));let l=n.HEAP32[o/4];if(l===0)return[u,0];let c=n.HEAPU32[o/4+1],d=[];for(let p=0;p<c;p++){let f=Number(n.getValue(o+8+p*i,"*"));d.push(f!==0?n.UTF8ToString(f):Number(n.getValue(o+8+(p+c)*i,"*")))}return[u,l,d]}finally{n.stackRestore(t),o!==0&&n._OrtFree(o)}},to=r=>{let e=Te(),n=e._malloc(r.byteLength);if(n===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${r.byteLength}.`);return e.HEAPU8.set(r,n),[n,r.byteLength]},$i=async(r,e)=>{let n,t,o=Te();Array.isArray(r)?[n,t]=r:r.buffer===o.HEAPU8.buffer?[n,t]=[r.byteOffset,r.byteLength]:[n,t]=to(r);let i=0,s=0,a=0,u=[],l=[],c=[];try{if([s,u]=await rg(e),e?.externalData&&o.mountExternalData){let x=[];for(let T of e.externalData){let S=typeof T=="string"?T:T.path,P=typeof T=="string"?T:T.data;x.push(oo(P).then(E=>{o.mountExternalData(S,E)}))}await Promise.all(x)}for(let x of e?.executionProviders??[])if((typeof x=="string"?x:x.name)==="webnn"){if(o.shouldTransferToMLTensor=!1,typeof x!="string"){let S=x,P=S?.context,E=S?.gpuDevice,N=S?.deviceType,B=S?.powerPreference;P?o.currentContext=P:E?o.currentContext=await o.webnnCreateMLContext(E):o.currentContext=await o.webnnCreateMLContext({deviceType:N,powerPreference:B})}else o.currentContext=await o.webnnCreateMLContext();break}i=await o._OrtCreateSession(n,t,s),o.webgpuOnCreateSession?.(i),i===0&&me("Can't create a session."),o.jsepOnCreateSession?.(),o.currentContext&&(o.webnnRegisterMLContext(i,o.currentContext),o.currentContext=void 0,o.shouldTransferToMLTensor=!0);let[d,p]=yO(i),f=!!e?.enableGraphCapture,h=[],m=[],y=[],g=[],b=[];for(let x=0;x<d;x++){let[T,S,P]=Dw(i,x);T===0&&me("Can't get an input name."),l.push(T);let E=o.UTF8ToString(T);h.push(E),y.push(S===0?{name:E,isTensor:!1}:{name:E,isTensor:!0,type:mn(S),shape:P})}for(let x=0;x<p;x++){let[T,S,P]=Dw(i,x+d);T===0&&me("Can't get an output name."),c.push(T);let E=o.UTF8ToString(T);m.push(E),g.push(S===0?{name:E,isTensor:!1}:{name:E,isTensor:!0,type:mn(S),shape:P});{if(f&&e?.preferredOutputLocation===void 0){b.push("gpu-buffer");continue}let N=typeof e?.preferredOutputLocation=="string"?e.preferredOutputLocation:e?.preferredOutputLocation?.[E]??"cpu",B=o.webnnIsGraphOutput;if(N==="cpu"&&B&&B(i,E)){b.push("ml-tensor-cpu-output");continue}if(N!=="cpu"&&N!=="cpu-pinned"&&N!=="gpu-buffer"&&N!=="ml-tensor")throw new Error(`Not supported preferred output location: ${N}.`);if(f&&N!=="gpu-buffer")throw new Error(`Not supported preferred output location: ${N}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`);b.push(N)}}let _=null;return b.some(x=>x==="gpu-buffer"||x==="ml-tensor"||x==="ml-tensor-cpu-output")&&(a=o._OrtCreateBinding(i),a===0&&me("Can't create IO binding."),_={handle:a,outputPreferredLocations:b,outputPreferredLocationsEncoded:b.map(x=>x==="ml-tensor-cpu-output"?"ml-tensor":x).map(x=>Ku(x))}),lr.set(i,[i,l,c,_,f,!1]),[i,h,m,y,g]}catch(d){throw l.forEach(p=>o._OrtFree(p)),c.forEach(p=>o._OrtFree(p)),a!==0&&o._OrtReleaseBinding(a)!==0&&me("Can't release IO binding."),i!==0&&o._OrtReleaseSession(i)!==0&&me("Can't release session."),d}finally{o._free(n),s!==0&&o._OrtReleaseSessionOptions(s)!==0&&me("Can't release session options."),u.forEach(d=>o._free(d)),o.unmountExternalData?.()}},Ai=r=>{let e=Te(),n=lr.get(r);if(!n)throw new Error(`cannot release session. invalid session id: ${r}`);let[t,o,i,s,a]=n;s&&(a&&e._OrtClearBoundOutputs(s.handle)!==0&&me("Can't clear bound outputs."),e._OrtReleaseBinding(s.handle)!==0&&me("Can't release IO binding.")),e.jsepOnReleaseSession?.(r),e.webnnOnReleaseSession?.(r),e.webgpuOnReleaseSession?.(r),o.forEach(u=>e._OrtFree(u)),i.forEach(u=>e._OrtFree(u)),e._OrtReleaseSession(t)!==0&&me("Can't release session."),lr.delete(r)},Cw=async(r,e,n,t,o,i,s=!1)=>{if(!r){e.push(0);return}let a=Te(),u=a.PTR_SIZE,l=r[0],c=r[1],d=r[3],p=d,f,h;if(l==="string"&&(d==="gpu-buffer"||d==="ml-tensor"))throw new Error("String tensor is not supported on GPU.");if(s&&d!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${i} when enableGraphCapture is true.`);if(d==="gpu-buffer"){let g=r[2].gpuBuffer;h=Vn(Mn(l),c);{let b=a.jsepRegisterBuffer;if(!b)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');f=b(t,i,g,h)}}else if(d==="ml-tensor"){let g=r[2].mlTensor;h=Vn(Mn(l),c);let b=a.webnnRegisterMLTensor;if(!b)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');f=b(t,g,Mn(l),c)}else{let g=r[2];if(Array.isArray(g)){h=u*g.length,f=a._malloc(h),n.push(f);for(let b=0;b<g.length;b++){if(typeof g[b]!="string")throw new TypeError(`tensor data at index ${b} is not a string`);a.setValue(f+b*u,ct(g[b],n),"*")}}else{let b=a.webnnIsGraphInput,_=a.webnnIsGraphOutput;if(l!=="string"&&b&&_){let x=a.UTF8ToString(o);if(b(t,x)||_(t,x)){let T=Mn(l);h=Vn(T,c),p="ml-tensor";let S=a.webnnCreateTemporaryTensor,P=a.webnnUploadTensor;if(!S||!P)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');let E=await S(t,T,c);P(E,new Uint8Array(g.buffer,g.byteOffset,g.byteLength)),f=E}else h=g.byteLength,f=a._malloc(h),n.push(f),a.HEAPU8.set(new Uint8Array(g.buffer,g.byteOffset,h),f)}else h=g.byteLength,f=a._malloc(h),n.push(f),a.HEAPU8.set(new Uint8Array(g.buffer,g.byteOffset,h),f)}}let m=a.stackSave(),y=a.stackAlloc(4*c.length);try{c.forEach((b,_)=>a.setValue(y+_*u,b,u===4?"i32":"i64"));let g=a._OrtCreateTensor(Mn(l),f,h,y,c.length,Ku(p));g===0&&me(`Can't create tensor for input/output. session=${t}, index=${i}.`),e.push(g)}finally{a.stackRestore(m)}},Oi=async(r,e,n,t,o,i)=>{let s=Te(),a=s.PTR_SIZE,u=lr.get(r);if(!u)throw new Error(`cannot run inference. invalid session id: ${r}`);let l=u[0],c=u[1],d=u[2],p=u[3],f=u[4],h=u[5],m=e.length,y=t.length,g=0,b=[],_=[],x=[],T=[],S=[],P=s.stackSave(),E=s.stackAlloc(m*a),N=s.stackAlloc(m*a),B=s.stackAlloc(y*a),D=s.stackAlloc(y*a);try{[g,b]=tg(i),Pn("wasm prepareInputOutputTensor");for(let k=0;k<m;k++)await Cw(n[k],_,T,r,c[e[k]],e[k],f);for(let k=0;k<y;k++)await Cw(o[k],x,T,r,d[t[k]],m+t[k],f);En("wasm prepareInputOutputTensor");for(let k=0;k<m;k++)s.setValue(E+k*a,_[k],"*"),s.setValue(N+k*a,c[e[k]],"*");for(let k=0;k<y;k++)s.setValue(B+k*a,x[k],"*"),s.setValue(D+k*a,d[t[k]],"*");if(p&&!h){let{handle:k,outputPreferredLocations:V,outputPreferredLocationsEncoded:W}=p;if(c.length!==m)throw new Error(`input count from feeds (${m}) is expected to be always equal to model's input count (${c.length}).`);Pn("wasm bindInputsOutputs");for(let U=0;U<m;U++){let K=e[U];await s._OrtBindInput(k,c[K],_[U])!==0&&me(`Can't bind input[${U}] for session=${r}.`)}for(let U=0;U<y;U++){let K=t[U];o[U]?.[3]?(S.push(x[U]),s._OrtBindOutput(k,d[K],x[U],0)!==0&&me(`Can't bind pre-allocated output[${U}] for session=${r}.`)):s._OrtBindOutput(k,d[K],0,W[K])!==0&&me(`Can't bind output[${U}] to ${V[U]} for session=${r}.`)}En("wasm bindInputsOutputs"),lr.set(r,[l,c,d,p,f,!0])}s.jsepOnRunStart?.(l),s.webnnOnRunStart?.(l);let j;p?j=await s._OrtRunWithBinding(l,p.handle,y,B,g):j=await s._OrtRun(l,N,E,m,D,y,B,g),j!==0&&me("failed to call OrtRun().");let C=[],w=[];Pn("wasm ProcessOutputTensor");for(let k=0;k<y;k++){let V=Number(s.getValue(B+k*a,"*"));if(V===x[k]||S.includes(x[k])){C.push(o[k]),V!==x[k]&&s._OrtReleaseTensor(V)!==0&&me("Can't release tensor.");continue}let W=s.stackSave(),U=s.stackAlloc(4*a),K=!1,te,ne=0;try{s._OrtGetTensorData(V,U,U+a,U+2*a,U+3*a)!==0&&me(`Can't access output tensor data on index ${k}.`);let se=a===4?"i32":"i64",L=Number(s.getValue(U,se));ne=s.getValue(U+a,"*");let z=s.getValue(U+a*2,"*"),ce=Number(s.getValue(U+a*3,se)),ze=[];for(let Oe=0;Oe<ce;Oe++)ze.push(Number(s.getValue(z+Oe*a,se)));s._OrtFree(z)!==0&&me("Can't free memory for tensor dims.");let Pe=ze.reduce((Oe,Be)=>Oe*Be,1);te=mn(L);let Ze=p?.outputPreferredLocations[t[k]];if(te==="string"){if(Ze==="gpu-buffer"||Ze==="ml-tensor")throw new Error("String tensor is not supported on GPU.");let Oe=[];for(let Be=0;Be<Pe;Be++){let An=s.getValue(ne+Be*a,"*"),po=s.getValue(ne+(Be+1)*a,"*"),Cl=Be===Pe-1?void 0:po-An;Oe.push(s.UTF8ToString(An,Cl))}C.push([te,ze,Oe,"cpu"])}else if(Ze==="gpu-buffer"&&Pe>0){let Oe=s.jsepGetBuffer;if(!Oe)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let Be=Oe(ne),An=Vn(L,Pe);if(An===void 0||!Li(te))throw new Error(`Unsupported data type: ${te}`);K=!0,C.push([te,ze,{gpuBuffer:Be,download:s.jsepCreateDownloader(Be,An,te),dispose:()=>{s._OrtReleaseTensor(V)!==0&&me("Can't release tensor.")}},"gpu-buffer"])}else if(Ze==="ml-tensor"&&Pe>0){let Oe=s.webnnEnsureTensor,Be=s.webnnIsGraphInputOutputTypeSupported;if(!Oe||!Be)throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');if(Vn(L,Pe)===void 0||!Ni(te))throw new Error(`Unsupported data type: ${te}`);if(!Be(r,te,!1))throw new Error(`preferredLocation "ml-tensor" for ${te} output is not supported by current WebNN Context.`);let po=await Oe(r,ne,L,ze,!1);K=!0,C.push([te,ze,{mlTensor:po,download:s.webnnCreateMLTensorDownloader(ne,te),dispose:()=>{s.webnnReleaseTensorId(ne),s._OrtReleaseTensor(V)}},"ml-tensor"])}else if(Ze==="ml-tensor-cpu-output"&&Pe>0){let Oe=s.webnnCreateMLTensorDownloader(ne,te)(),Be=C.length;K=!0,w.push((async()=>{let An=[Be,await Oe];return s.webnnReleaseTensorId(ne),s._OrtReleaseTensor(V),An})()),C.push([te,ze,[],"cpu"])}else{let Oe=Ar(te),Be=new Oe(Pe);new Uint8Array(Be.buffer,Be.byteOffset,Be.byteLength).set(s.HEAPU8.subarray(ne,ne+Be.byteLength)),C.push([te,ze,Be,"cpu"])}}finally{s.stackRestore(W),te==="string"&&ne&&s._free(ne),K||s._OrtReleaseTensor(V)}}p&&!f&&(s._OrtClearBoundOutputs(p.handle)!==0&&me("Can't clear bound outputs."),lr.set(r,[l,c,d,p,f,!1]));for(let[k,V]of await Promise.all(w))C[k][2]=V;return En("wasm ProcessOutputTensor"),C}finally{s.webnnOnRunEnd?.(l),s.stackRestore(P),_.forEach(j=>s._OrtReleaseTensor(j)),x.forEach(j=>s._OrtReleaseTensor(j)),T.forEach(j=>s._free(j)),g!==0&&s._OrtReleaseRunOptions(g),b.forEach(j=>s._free(j))}},Pi=r=>{let e=Te(),n=lr.get(r);if(!n)throw new Error("invalid session id");let t=n[0],o=e._OrtEndProfiling(t);o===0&&me("Can't get an profile file name."),e._OrtFree(o)},Ei=r=>{let e=[];for(let n of r){let t=n[2];!Array.isArray(t)&&"buffer"in t&&e.push(t.buffer)}return e}});var cr,xt,co,cs,ds,ls,Pl,El,Dr,Cr,wO,kw,Lw,Nw,Rw,zw,Bw,Mw,Dl=A(()=>{"use strict";Ke();Wu();Bn();xi();cr=()=>!!re.wasm.proxy&&typeof document<"u",co=!1,cs=!1,ds=!1,El=new Map,Dr=(r,e)=>{let n=El.get(r);n?n.push(e):El.set(r,[e])},Cr=()=>{if(co||!cs||ds||!xt)throw new Error("worker not ready")},wO=r=>{switch(r.data.type){case"init-wasm":co=!1,r.data.err?(ds=!0,Pl[1](r.data.err)):(cs=!0,Pl[0]()),ls&&(URL.revokeObjectURL(ls),ls=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let e=El.get(r.data.type);r.data.err?e.shift()[1](r.data.err):e.shift()[0](r.data.out);break}default:}},kw=async()=>{if(!cs){if(co)throw new Error("multiple calls to 'initWasm()' detected.");if(ds)throw new Error("previous call to 'initWasm()' failed.");if(co=!0,cr())return new Promise((r,e)=>{xt?.terminate(),Qm().then(([n,t])=>{try{xt=t,xt.onerror=i=>e(i),xt.onmessage=wO,Pl=[r,e];let o={type:"init-wasm",in:re};if(!o.in.wasm.wasmPaths&&n){let i=Di();i&&(o.in.wasm.wasmPaths=i)}xt.postMessage(o),ls=n}catch(o){e(o)}},e)});try{await Ti(re.wasm),await Ii(re),cs=!0}catch(r){throw ds=!0,r}finally{co=!1}}},Lw=async r=>{if(cr())return Cr(),new Promise((e,n)=>{Dr("init-ep",[e,n]);let t={type:"init-ep",in:{epName:r,env:re}};xt.postMessage(t)});await Si(re,r)},Nw=async r=>cr()?(Cr(),new Promise((e,n)=>{Dr("copy-from",[e,n]);let t={type:"copy-from",in:{buffer:r}};xt.postMessage(t,[r.buffer])})):to(r),Rw=async(r,e)=>{if(cr()){if(e?.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return Cr(),new Promise((n,t)=>{Dr("create",[n,t]);let o={type:"create",in:{model:r,options:{...e}}},i=[];r instanceof Uint8Array&&i.push(r.buffer),xt.postMessage(o,i)})}else return $i(r,e)},zw=async r=>{if(cr())return Cr(),new Promise((e,n)=>{Dr("release",[e,n]);let t={type:"release",in:r};xt.postMessage(t)});Ai(r)},Bw=async(r,e,n,t,o,i)=>{if(cr()){if(n.some(s=>s[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(o.some(s=>s))throw new Error("pre-allocated output tensor is not supported for proxy.");return Cr(),new Promise((s,a)=>{Dr("run",[s,a]);let u=n,l={type:"run",in:{sessionId:r,inputIndices:e,inputs:u,outputIndices:t,options:i}};xt.postMessage(l,Ei(u))})}else return Oi(r,e,n,t,o,i)},Mw=async r=>{if(cr())return Cr(),new Promise((e,n)=>{Dr("end-profiling",[e,n]);let t={type:"end-profiling",in:r};xt.postMessage(t)});Pi(r)}});var Vw,vO,ps,Fw=A(()=>{"use strict";Ke();Dl();ee();vi();Xu();Vw=(r,e)=>{switch(r.location){case"cpu":return[r.type,r.dims,r.data,"cpu"];case"gpu-buffer":return[r.type,r.dims,{gpuBuffer:r.gpuBuffer},"gpu-buffer"];case"ml-tensor":return[r.type,r.dims,{mlTensor:r.mlTensor},"ml-tensor"];default:throw new Error(`invalid data location: ${r.location} for ${e()}`)}},vO=r=>{switch(r[3]){case"cpu":return new st(r[0],r[2],r[1]);case"gpu-buffer":{let e=r[0];if(!Li(e))throw new Error(`not supported data type: ${e} for deserializing GPU tensor`);let{gpuBuffer:n,download:t,dispose:o}=r[2];return st.fromGpuBuffer(n,{dataType:e,dims:r[1],download:t,dispose:o})}case"ml-tensor":{let e=r[0];if(!Ni(e))throw new Error(`not supported data type: ${e} for deserializing MLTensor tensor`);let{mlTensor:n,download:t,dispose:o}=r[2];return st.fromMLTensor(n,{dataType:e,dims:r[1],download:t,dispose:o})}default:throw new Error(`invalid data location: ${r[3]}`)}},ps=class{async fetchModelAndCopyToWasmMemory(e){return Nw(await oo(e))}async loadModel(e,n){at();let t;typeof e=="string"?t=await this.fetchModelAndCopyToWasmMemory(e):t=e,[this.sessionId,this.inputNames,this.outputNames,this.inputMetadata,this.outputMetadata]=await Rw(t,n),et()}async dispose(){return zw(this.sessionId)}async run(e,n,t){at();let o=[],i=[];Object.entries(e).forEach(p=>{let f=p[0],h=p[1],m=this.inputNames.indexOf(f);if(m===-1)throw new Error(`invalid input '${f}'`);o.push(h),i.push(m)});let s=[],a=[];Object.entries(n).forEach(p=>{let f=p[0],h=p[1],m=this.outputNames.indexOf(f);if(m===-1)throw new Error(`invalid output '${f}'`);s.push(h),a.push(m)});let u=o.map((p,f)=>Vw(p,()=>`input "${this.inputNames[i[f]]}"`)),l=s.map((p,f)=>p?Vw(p,()=>`output "${this.outputNames[a[f]]}"`):null),c=await Bw(this.sessionId,i,u,a,l,t),d={};for(let p=0;p<c.length;p++)d[this.outputNames[a[p]]]=s[p]??vO(c[p]);return et(),d}startProfiling(){}endProfiling(){Mw(this.sessionId)}}});var Uw={};pr(Uw,{OnnxruntimeWebAssemblyBackend:()=>fs,initializeFlags:()=>Gw,wasmBackend:()=>xO});var Gw,fs,xO,Ww=A(()=>{"use strict";Ke();Dl();Fw();Gw=()=>{(typeof re.wasm.initTimeout!="number"||re.wasm.initTimeout<0)&&(re.wasm.initTimeout=0);let r=re.wasm.simd;if(typeof r!="boolean"&&r!==void 0&&r!=="fixed"&&r!=="relaxed"&&(console.warn(`Property "env.wasm.simd" is set to unknown value "${r}". Reset it to \`false\` and ignore SIMD feature checking.`),re.wasm.simd=!1),typeof re.wasm.proxy!="boolean"&&(re.wasm.proxy=!1),typeof re.wasm.trace!="boolean"&&(re.wasm.trace=!1),typeof re.wasm.numThreads!="number"||!Number.isInteger(re.wasm.numThreads)||re.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)re.wasm.numThreads=1;else{let e=typeof navigator>"u"?dr("node:os").cpus().length:navigator.hardwareConcurrency;re.wasm.numThreads=Math.min(4,Math.ceil((e||1)/2))}},fs=class{async init(e){Gw(),await kw(),await Lw(e)}async createInferenceSessionHandler(e,n){let t=new ps;return await t.loadModel(e,n),t}},xO=new fs});Ke();Ke();Ke();var uc="1.30.0";var cH=_s;{let r=(Um(),kr(Gm)).onnxjsBackend;On("webgl",r,-10)}{let r=(Ww(),kr(Uw)).wasmBackend;On("webgpu",r,5),On("webnn",r,5),On("cpu",r,10),On("wasm",r,10)}Object.defineProperty(re.versions,"web",{value:uc,enumerable:!0});export{Jw as InferenceSession,go as TRACE,Pn as TRACE_EVENT_BEGIN,En as TRACE_EVENT_END,at as TRACE_FUNC_BEGIN,et as TRACE_FUNC_END,st as Tensor,cH as default,re as env,On as registerBackend};
/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
/*! Bundled license information:

long/index.js:
long/umd/index.js:
  (**
   * @license
   * Copyright 2009 The Closure Library Authors
   * Copyright 2020 Daniel Wirtz / The long.js Authors.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *
   * SPDX-License-Identifier: Apache-2.0
   *)
*/
//# sourceMappingURL=ort.all.min.mjs.map
