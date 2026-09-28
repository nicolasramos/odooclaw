/*!
 * ONNX Runtime Web v1.30.0
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var Fn=Object.defineProperty;var Ef=Object.getOwnPropertyDescriptor;var kf=Object.getOwnPropertyNames;var Pf=Object.prototype.hasOwnProperty;var qn=(t=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(t,{get:(e,r)=>(typeof require<"u"?require:e)[r]}):t)(function(t){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+t+'" is not supported')});var V=(t,e,r)=>()=>{if(r)throw r[0];try{return t&&(e=t(t=0)),e}catch(n){throw r=[n],n}};var Wt=(t,e)=>{for(var r in e)Fn(t,r,{get:e[r],enumerable:!0})},Df=(t,e,r,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of kf(e))!Pf.call(t,o)&&o!==r&&Fn(t,o,{get:()=>e[o],enumerable:!(n=Ef(e,o))||n.enumerable});return t};var er=t=>Df(Fn({},"__esModule",{value:!0}),t);var Tr,kt,Pt,Of,Ra,Kn=V(()=>{"use strict";Tr=new Map,kt=[],Pt=(t,e,r)=>{if(e&&typeof e.init=="function"&&typeof e.createInferenceSessionHandler=="function"){let n=Tr.get(t);if(n===void 0)Tr.set(t,{backend:e,priority:r});else{if(n.priority>r)return;if(n.priority===r&&n.backend!==e)throw new Error(`cannot register backend "${t}" using priority ${r}`)}if(r>=0){let o=kt.indexOf(t);o!==-1&&kt.splice(o,1);for(let i=0;i<kt.length;i++)if(Tr.get(kt[i]).priority<=r){kt.splice(i,0,t);return}kt.push(t)}return}throw new TypeError("not a valid backend")},Of=async t=>{let e=Tr.get(t);if(!e)return"backend not found.";if(e.initialized)return e.backend;if(e.aborted)return e.error;{let r=!!e.initPromise;try{return r||(e.initPromise=e.backend.init(t)),await e.initPromise,e.initialized=!0,e.backend}catch(n){return r||(e.error=`${n}`,e.aborted=!0),e.error}finally{delete e.initPromise}}},Ra=async t=>{let e=t.executionProviders||[],r=e.map(d=>typeof d=="string"?d:d.name),n=r.length===0?kt:r,o,i=[],a=new Set;for(let d of n){let c=await Of(d);typeof c=="string"?i.push({name:d,err:c}):(o||(o=c),o===c&&a.add(d))}if(!o)throw new Error(`no available backend found. ERR: ${i.map(d=>`[${d.name}] ${d.err}`).join(", ")}`);for(let{name:d,err:c}of i)r.includes(d)&&console.warn(`removing requested execution provider "${d}" from session options because it is not available: ${c}`);let u=e.filter(d=>a.has(typeof d=="string"?d:d.name));return[o,new Proxy(t,{get:(d,c)=>c==="executionProviders"?u:Reflect.get(d,c)})]}});var Ua=V(()=>{"use strict";Kn()});var Na,Va=V(()=>{"use strict";Na="1.30.0"});var La,Oe,jn=V(()=>{"use strict";Va();La="warning",Oe={wasm:{},webgl:{},webgpu:{},versions:{common:Na},set logLevel(t){if(t!==void 0){if(typeof t!="string"||["verbose","info","warning","error","fatal"].indexOf(t)===-1)throw new Error(`Unsupported logging level: ${t}`);La=t}},get logLevel(){return La}};Object.defineProperty(Oe,"logLevel",{enumerable:!0})});var _e,Wa=V(()=>{"use strict";jn();_e=Oe});var Ga,Ha,Fa=V(()=>{"use strict";Ga=(t,e)=>{let r=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);r.width=t.dims[3],r.height=t.dims[2];let n=r.getContext("2d");if(n!=null){let o,i;e?.tensorLayout!==void 0&&e.tensorLayout==="NHWC"?(o=t.dims[2],i=t.dims[3]):(o=t.dims[3],i=t.dims[2]);let a=e?.format!==void 0?e.format:"RGB",u=e?.norm,d,c;u===void 0||u.mean===void 0?d=[255,255,255,255]:typeof u.mean=="number"?d=[u.mean,u.mean,u.mean,u.mean]:(d=[u.mean[0],u.mean[1],u.mean[2],0],u.mean[3]!==void 0&&(d[3]=u.mean[3])),u===void 0||u.bias===void 0?c=[0,0,0,0]:typeof u.bias=="number"?c=[u.bias,u.bias,u.bias,u.bias]:(c=[u.bias[0],u.bias[1],u.bias[2],0],u.bias[3]!==void 0&&(c[3]=u.bias[3]));let p=i*o,m=0,g=p,y=p*2,b=-1;a==="RGBA"?(m=0,g=p,y=p*2,b=p*3):a==="RGB"?(m=0,g=p,y=p*2):a==="RBG"&&(m=0,y=p,g=p*2);for(let _=0;_<i;_++)for(let S=0;S<o;S++){let x=(t.data[m++]-c[0])*d[0],$=(t.data[g++]-c[1])*d[1],T=(t.data[y++]-c[2])*d[2],I=b===-1?255:(t.data[b++]-c[3])*d[3];n.fillStyle="rgba("+x+","+$+","+T+","+I+")",n.fillRect(S,_,1,1)}if("toDataURL"in r)return r.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},Ha=(t,e)=>{let r=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),n;if(r!=null){let o,i,a;e?.tensorLayout!==void 0&&e.tensorLayout==="NHWC"?(o=t.dims[2],i=t.dims[1],a=t.dims[3]):(o=t.dims[3],i=t.dims[2],a=t.dims[1]);let u=e!==void 0&&e.format!==void 0?e.format:"RGB",d=e?.norm,c,p;d===void 0||d.mean===void 0?c=[255,255,255,255]:typeof d.mean=="number"?c=[d.mean,d.mean,d.mean,d.mean]:(c=[d.mean[0],d.mean[1],d.mean[2],255],d.mean[3]!==void 0&&(c[3]=d.mean[3])),d===void 0||d.bias===void 0?p=[0,0,0,0]:typeof d.bias=="number"?p=[d.bias,d.bias,d.bias,d.bias]:(p=[d.bias[0],d.bias[1],d.bias[2],0],d.bias[3]!==void 0&&(p[3]=d.bias[3]));let m=i*o;if(e!==void 0&&(e.format!==void 0&&a===4&&e.format!=="RGBA"||a===3&&e.format!=="RGB"&&e.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let g=4,y=0,b=1,_=2,S=3,x=0,$=m,T=m*2,I=-1;u==="RGBA"?(x=0,$=m,T=m*2,I=m*3):u==="RGB"?(x=0,$=m,T=m*2):u==="RBG"&&(x=0,T=m,$=m*2),n=r.createImageData(o,i);for(let A=0;A<i*o;y+=g,b+=g,_+=g,S+=g,A++)n.data[y]=(t.data[x++]-p[0])*c[0],n.data[b]=(t.data[$++]-p[1])*c[1],n.data[_]=(t.data[T++]-p[2])*c[2],n.data[S]=I===-1?255:(t.data[I++]-p[3])*c[3]}else throw new Error("Can not access image data");return n}});var Zn,qa,Ka,ja,Za,Qa,Ya=V(()=>{"use strict";Ir();Zn=(t,e)=>{if(t===void 0)throw new Error("Image buffer must be defined");if(e.height===void 0||e.width===void 0)throw new Error("Image height and width must be defined");if(e.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:r,width:n}=e,o=e.norm??{mean:255,bias:0},i,a;typeof o.mean=="number"?i=[o.mean,o.mean,o.mean,o.mean]:i=[o.mean[0],o.mean[1],o.mean[2],o.mean[3]??255],typeof o.bias=="number"?a=[o.bias,o.bias,o.bias,o.bias]:a=[o.bias[0],o.bias[1],o.bias[2],o.bias[3]??0];let u=e.format!==void 0?e.format:"RGBA",d=e.tensorFormat!==void 0&&e.tensorFormat!==void 0?e.tensorFormat:"RGB",c=r*n,p=d==="RGBA"?new Float32Array(c*4):new Float32Array(c*3),m=4,g=0,y=1,b=2,_=3,S=0,x=c,$=c*2,T=-1;u==="RGB"&&(m=3,g=0,y=1,b=2,_=-1),d==="RGBA"?T=c*3:d==="RBG"?(S=0,$=c,x=c*2):d==="BGR"&&($=0,x=c,S=c*2);for(let A=0;A<c;A++,g+=m,b+=m,y+=m,_+=m)p[S++]=(t[g]+a[0])/i[0],p[x++]=(t[y]+a[1])/i[1],p[$++]=(t[b]+a[2])/i[2],T!==-1&&_!==-1&&(p[T++]=(t[_]+a[3])/i[3]);return d==="RGBA"?new ze("float32",p,[1,4,r,n]):new ze("float32",p,[1,3,r,n])},qa=async(t,e)=>{let r=typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement,n=typeof ImageData<"u"&&t instanceof ImageData,o=typeof ImageBitmap<"u"&&t instanceof ImageBitmap,i=typeof t=="string",a,u=e??{},d=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},c=p=>typeof HTMLCanvasElement<"u"&&p instanceof HTMLCanvasElement||p instanceof OffscreenCanvas?p.getContext("2d"):null;if(r){let p=d();p.width=t.width,p.height=t.height;let m=c(p);if(m!=null){let g=t.height,y=t.width;if(e!==void 0&&e.resizedHeight!==void 0&&e.resizedWidth!==void 0&&(g=e.resizedHeight,y=e.resizedWidth),e!==void 0){if(u=e,e.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");u.tensorFormat="RGBA",u.height=g,u.width=y}else u.tensorFormat="RGBA",u.height=g,u.width=y;m.drawImage(t,0,0),a=m.getImageData(0,0,y,g).data}else throw new Error("Can not access image data")}else if(n){let p,m;if(e!==void 0&&e.resizedWidth!==void 0&&e.resizedHeight!==void 0?(p=e.resizedHeight,m=e.resizedWidth):(p=t.height,m=t.width),e!==void 0&&(u=e),u.format="RGBA",u.height=p,u.width=m,e!==void 0){let g=d();g.width=m,g.height=p;let y=c(g);if(y!=null)y.putImageData(t,0,0),a=y.getImageData(0,0,m,p).data;else throw new Error("Can not access image data")}else a=t.data}else if(o){if(e===void 0)throw new Error("Please provide image config with format for Imagebitmap");let p=d();p.width=t.width,p.height=t.height;let m=c(p);if(m!=null){let g=t.height,y=t.width;return m.drawImage(t,0,0,y,g),a=m.getImageData(0,0,y,g).data,u.height=g,u.width=y,Zn(a,u)}else throw new Error("Can not access image data")}else{if(i)return new Promise((p,m)=>{let g=d(),y=c(g);if(!t||!y)return m();let b=new Image;b.crossOrigin="Anonymous",b.src=t,b.onload=()=>{g.width=b.width,g.height=b.height,y.drawImage(b,0,0,g.width,g.height);let _=y.getImageData(0,0,g.width,g.height);u.height=g.height,u.width=g.width,p(Zn(_.data,u))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(a!==void 0)return Zn(a,u);throw new Error("Input data provided is not supported - aborted tensor creation")},Ka=(t,e)=>{let{width:r,height:n,download:o,dispose:i}=e,a=[1,n,r,4];return new ze({location:"texture",type:"float32",texture:t,dims:a,download:o,dispose:i})},ja=(t,e)=>{let{dataType:r,dims:n,download:o,dispose:i}=e;return new ze({location:"gpu-buffer",type:r??"float32",gpuBuffer:t,dims:n,download:o,dispose:i})},Za=(t,e)=>{let{dataType:r,dims:n,download:o,dispose:i}=e;return new ze({location:"ml-tensor",type:r??"float32",mlTensor:t,dims:n,download:o,dispose:i})},Qa=(t,e,r)=>new ze({location:"cpu-pinned",type:t,data:e,dims:r??[e.length]})});var Dt,tr,Xa,Ja,es=V(()=>{"use strict";Dt=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),tr=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),Xa=!1,Ja=()=>{if(!Xa){Xa=!0;let t=typeof BigInt64Array<"u"&&BigInt64Array.from,e=typeof BigUint64Array<"u"&&BigUint64Array.from,r=globalThis.Float16Array,n=typeof r<"u"&&r.from;t&&(Dt.set("int64",BigInt64Array),tr.set(BigInt64Array,"int64")),e&&(Dt.set("uint64",BigUint64Array),tr.set(BigUint64Array,"uint64")),n?(Dt.set("float16",r),tr.set(r,"float16")):Dt.set("float16",Uint16Array)}}});var ts,rs,ns=V(()=>{"use strict";Ir();ts=t=>{let e=1;for(let r=0;r<t.length;r++){let n=t[r];if(typeof n!="number"||!Number.isSafeInteger(n))throw new TypeError(`dims[${r}] must be an integer, got: ${n}`);if(n<0)throw new RangeError(`dims[${r}] must be a non-negative integer, got: ${n}`);e*=n}return e},rs=(t,e)=>{switch(t.location){case"cpu":return new ze(t.type,t.data,e);case"cpu-pinned":return new ze({location:"cpu-pinned",data:t.data,type:t.type,dims:e});case"texture":return new ze({location:"texture",texture:t.texture,type:t.type,dims:e});case"gpu-buffer":return new ze({location:"gpu-buffer",gpuBuffer:t.gpuBuffer,type:t.type,dims:e});case"ml-tensor":return new ze({location:"ml-tensor",mlTensor:t.mlTensor,type:t.type,dims:e});default:throw new Error(`tensorReshape: tensor location ${t.location} is not supported`)}}});var ze,Ir=V(()=>{"use strict";Fa();Ya();es();ns();ze=class{constructor(e,r,n){Ja();let o,i;if(typeof e=="object"&&"location"in e)switch(this.dataLocation=e.location,o=e.type,i=e.dims,e.location){case"cpu-pinned":{let u=Dt.get(o);if(!u)throw new TypeError(`unsupported type "${o}" to create tensor from pinned buffer`);if(!(e.data instanceof u))throw new TypeError(`buffer should be of type ${u.name}`);this.cpuData=e.data;break}case"texture":{if(o!=="float32")throw new TypeError(`unsupported type "${o}" to create tensor from texture`);this.gpuTextureData=e.texture,this.downloader=e.download,this.disposer=e.dispose;break}case"gpu-buffer":{if(o!=="float32"&&o!=="float16"&&o!=="int32"&&o!=="int64"&&o!=="uint32"&&o!=="uint8"&&o!=="bool"&&o!=="uint4"&&o!=="int4")throw new TypeError(`unsupported type "${o}" to create tensor from gpu buffer`);this.gpuBufferData=e.gpuBuffer,this.downloader=e.download,this.disposer=e.dispose;break}case"ml-tensor":{if(o!=="float32"&&o!=="float16"&&o!=="int32"&&o!=="int64"&&o!=="uint32"&&o!=="uint64"&&o!=="int8"&&o!=="uint8"&&o!=="bool"&&o!=="uint4"&&o!=="int4")throw new TypeError(`unsupported type "${o}" to create tensor from MLTensor`);this.mlTensorData=e.mlTensor,this.downloader=e.download,this.disposer=e.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let u,d;if(typeof e=="string")if(o=e,d=n,e==="string"){if(!Array.isArray(r))throw new TypeError("A string tensor's data must be a string array.");u=r}else{let c=Dt.get(e);if(c===void 0)throw new TypeError(`Unsupported tensor type: ${e}.`);if(Array.isArray(r)){if(e==="float16"&&c===Uint16Array||e==="uint4"||e==="int4")throw new TypeError(`Creating a ${e} tensor from number array is not supported. Please use ${c.name} as data.`);e==="uint64"||e==="int64"?u=c.from(r,BigInt):u=c.from(r)}else if(r instanceof c)u=r;else if(r instanceof Uint8ClampedArray)if(e==="uint8")u=Uint8Array.from(r);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else if(e==="float16"&&r instanceof Uint16Array&&c!==Uint16Array)u=new globalThis.Float16Array(r.buffer,r.byteOffset,r.length);else throw new TypeError(`A ${o} tensor's data must be type of ${c}`)}else if(d=r,Array.isArray(e)){if(e.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let c=typeof e[0];if(c==="string")o="string",u=e;else if(c==="boolean")o="bool",u=Uint8Array.from(e);else throw new TypeError(`Invalid element type of data array: ${c}.`)}else if(e instanceof Uint8ClampedArray)o="uint8",u=Uint8Array.from(e);else{let c=tr.get(e.constructor);if(c===void 0)throw new TypeError(`Unsupported type for tensor data: ${e.constructor}.`);o=c,u=e}if(d===void 0)d=[u.length];else if(!Array.isArray(d))throw new TypeError("A tensor's dims must be a number array");i=d,this.cpuData=u,this.dataLocation="cpu"}let a=ts(i);if(this.cpuData&&a!==this.cpuData.length&&!((o==="uint4"||o==="int4")&&Math.ceil(a/2)===this.cpuData.length))throw new Error(`Tensor's size(${a}) does not match data length(${this.cpuData.length}).`);this.type=o,this.dims=i,this.size=a}static async fromImage(e,r){return qa(e,r)}static fromTexture(e,r){return Ka(e,r)}static fromGpuBuffer(e,r){return ja(e,r)}static fromMLTensor(e,r){return Za(e,r)}static fromPinnedBuffer(e,r,n){return Qa(e,r,n)}toDataURL(e){return Ga(this,e)}toImageData(e){return Ha(this,e)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(e){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let r=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=r,e&&this.disposer&&(this.disposer(),this.disposer=void 0),r}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(e){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return rs(this,e)}}});var je,Qn=V(()=>{"use strict";Ir();je=ze});var Cr,os,Ve,Re,_t,wt,Yn=V(()=>{"use strict";jn();Cr=(t,e)=>{(typeof Oe.trace>"u"?!Oe.wasm.trace:!Oe.trace)||console.timeStamp(`${t}::ORT::${e}`)},os=(t,e)=>{let r=new Error().stack?.split(/\r\n|\r|\n/g)||[],n=!1;for(let o=0;o<r.length;o++){if(n&&!r[o].includes("TRACE_FUNC")){let i=`FUNC_${t}::${r[o].trim().split(" ")[1]}`;e&&(i+=`::${e}`),Cr("CPU",i);return}r[o].includes("TRACE_FUNC")&&(n=!0)}},Ve=t=>{(typeof Oe.trace>"u"?!Oe.wasm.trace:!Oe.trace)||os("BEGIN",t)},Re=t=>{(typeof Oe.trace>"u"?!Oe.wasm.trace:!Oe.trace)||os("END",t)},_t=t=>{(typeof Oe.trace>"u"?!Oe.wasm.trace:!Oe.trace)||console.time(`ORT::${t}`)},wt=t=>{(typeof Oe.trace>"u"?!Oe.wasm.trace:!Oe.trace)||console.timeEnd(`ORT::${t}`)}});var Ar,is=V(()=>{"use strict";Kn();Qn();Yn();Ar=class t{constructor(e){this.handler=e}async run(e,r,n){Ve(),_t("InferenceSession.run");let o={},i={};if(typeof e!="object"||e===null||e instanceof je||Array.isArray(e))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let a=!0;if(typeof r=="object"){if(r===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(r instanceof je)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(r)){if(r.length===0)throw new TypeError("'fetches' cannot be an empty array.");a=!1;for(let c of r){if(typeof c!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(c)===-1)throw new RangeError(`'fetches' contains invalid output name: ${c}.`);o[c]=null}if(typeof n=="object"&&n!==null)i=n;else if(typeof n<"u")throw new TypeError("'options' must be an object.")}else{let c=!1,p=Object.getOwnPropertyNames(r);for(let m of this.outputNames)if(p.indexOf(m)!==-1){let g=r[m];(g===null||g instanceof je)&&(c=!0,a=!1,o[m]=g)}if(c){if(typeof n=="object"&&n!==null)i=n;else if(typeof n<"u")throw new TypeError("'options' must be an object.")}else i=r}}else if(typeof r<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let c of this.inputNames)if(typeof e[c]>"u")throw new Error(`input '${c}' is missing in 'feeds'.`);if(a)for(let c of this.outputNames)o[c]=null;let u=await this.handler.run(e,o,i),d={};for(let c in u)if(Object.hasOwnProperty.call(u,c)){let p=u[c];p instanceof je?d[c]=p:d[c]=new je(p.type,p.data,p.dims)}return wt("InferenceSession.run"),Re(),d}async release(){return this.handler.dispose()}static async create(e,r,n,o){Ve(),_t("InferenceSession.create");let i,a={};if(typeof e=="string"){if(i=e,typeof r=="object"&&r!==null)a=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(e instanceof Uint8Array){if(i=e,typeof r=="object"&&r!==null)a=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(e instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&e instanceof SharedArrayBuffer){let p=e,m=0,g=e.byteLength;if(typeof r=="object"&&r!==null)a=r;else if(typeof r=="number"){if(m=r,!Number.isSafeInteger(m))throw new RangeError("'byteOffset' must be an integer.");if(m<0||m>=p.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${p.byteLength}).`);if(g=e.byteLength-m,typeof n=="number"){if(g=n,!Number.isSafeInteger(g))throw new RangeError("'byteLength' must be an integer.");if(g<=0||m+g>p.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${p.byteLength-m}].`);if(typeof o=="object"&&o!==null)a=o;else if(typeof o<"u")throw new TypeError("'options' must be an object.")}else if(typeof n<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof r<"u")throw new TypeError("'options' must be an object.");i=new Uint8Array(p,m,g)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[u,d]=await Ra(a),c=await u.createInferenceSessionHandler(i,d);return wt("InferenceSession.create"),Re(),new t(c)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}get inputMetadata(){return this.handler.inputMetadata}get outputMetadata(){return this.handler.outputMetadata}}});var Bf,as=V(()=>{"use strict";is();Bf=Ar});var ss=V(()=>{"use strict"});var us=V(()=>{"use strict"});var ds=V(()=>{"use strict"});var ls=V(()=>{"use strict"});var Xn={};Wt(Xn,{InferenceSession:()=>Bf,TRACE:()=>Cr,TRACE_EVENT_BEGIN:()=>_t,TRACE_EVENT_END:()=>wt,TRACE_FUNC_BEGIN:()=>Ve,TRACE_FUNC_END:()=>Re,Tensor:()=>je,env:()=>_e,registerBackend:()=>Pt});var Le=V(()=>{"use strict";Ua();Wa();as();Qn();ss();us();Yn();ds();ls()});var Er=V(()=>{"use strict"});var fs={};Wt(fs,{default:()=>zf});var ps,ms,zf,hs=V(()=>{"use strict";Jn();vt();kr();ps="ort-wasm-proxy-worker",ms=globalThis.self?.name===ps;ms&&(self.onmessage=t=>{let{type:e,in:r}=t.data;try{switch(e){case"init-wasm":Pr(r.wasm).then(()=>{Dr(r).then(()=>{postMessage({type:e})},n=>{postMessage({type:e,err:n})})},n=>{postMessage({type:e,err:n})});break;case"init-ep":{let{epName:n,env:o}=r;Or(o,n).then(()=>{postMessage({type:e})},i=>{postMessage({type:e,err:i})});break}case"copy-from":{let{buffer:n}=r,o=rr(n);postMessage({type:e,out:o});break}case"create":{let{model:n,options:o}=r;Br(n,o).then(i=>{postMessage({type:e,out:i})},i=>{postMessage({type:e,err:i})});break}case"release":zr(r),postMessage({type:e});break;case"run":{let{sessionId:n,inputIndices:o,inputs:i,outputIndices:a,options:u}=r;Mr(n,o,i,a,new Array(a.length).fill(null),u).then(d=>{d.some(c=>c[3]!=="cpu")?postMessage({type:e,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:e,out:d},Ur([...i,...d]))},d=>{postMessage({type:e,err:d})});break}case"end-profiling":Rr(r),postMessage({type:e});break;default:}}catch(n){postMessage({type:e,err:n})}});zf=ms?null:t=>new Worker(t??We,{type:"module",name:ps})});var bs={};Wt(bs,{default:()=>Mf});async function gs(t={}){var e=t,r=!!globalThis.window,n=!!globalThis.WorkerGlobalScope,o=n&&self.name?.startsWith("em-pthread");e.mountExternalData=(s,l)=>{s.startsWith("./")&&(s=s.substring(2)),(e.ad||(e.ad=new Map)).set(s,l)},e.unmountExternalData=()=>{delete e.ad,delete e.Yd,delete e.Xd,delete e.be},globalThis.SharedArrayBuffer??new WebAssembly.Memory({initial:0,maximum:0,shared:!0}).buffer.constructor;let i=s=>async(...l)=>{try{if(e.$c)throw Error("Session already started");let h=e.$c={Nd:l[0],errors:[]},f=await s(...l);if(e.$c!==h)throw Error("Session mismatch");e.hd?.flush();let v=h.errors;if(0<v.length){let C=await Promise.all(v);if(C=C.filter(P=>P),0<C.length)throw Error(C.join(`
`))}return f}finally{e.$c=null}};e.jsepInit=(s,l)=>{if(s==="webgpu"){[e.hd,e.Dd,e.Hd,e.jd,e.Gd,e.bc,e.Id,e.Kd,e.Ed,e.Fd,e.Jd]=l;let h=e.hd;e.jsepRegisterBuffer=(f,v,C,P)=>h.registerBuffer(f,v,C,P),e.jsepGetBuffer=f=>h.getBuffer(f),e.jsepCreateDownloader=(f,v,C)=>h.createDownloader(f,v,C),e.jsepOnCreateSession=f=>{h.onCreateSession(f)},e.jsepOnReleaseSession=f=>{h.onReleaseSession(f)},e.jsepOnRunStart=f=>h.onRunStart(f),e.Ld=(f,v)=>{h.upload(f,v)}}else if(s==="webnn"){let h=l[0];[e.Vd,e.vd,e.webnnEnsureTensor,e.wd,e.webnnDownloadTensor,e.Ud,e.webnnEnableTraceEvent]=l.slice(1),e.webnnReleaseTensorId=e.vd,e.webnnUploadTensor=e.wd,e.webnnRegisterMLContext=e.Ud,e.webnnOnRunStart=f=>h.onRunStart(f),e.webnnOnRunEnd=h.onRunEnd.bind(h),e.webnnOnReleaseSession=f=>{h.onReleaseSession(f)},e.webnnCreateMLTensorDownloader=(f,v)=>h.createMLTensorDownloader(f,v),e.webnnRegisterMLTensor=(f,v,C,P)=>h.registerMLTensor(f,v,C,P),e.webnnCreateMLContext=f=>h.createMLContext(f),e.webnnRegisterGraphInput=h.registerGraphInput.bind(h),e.webnnIsGraphInput=h.isGraphInput.bind(h),e.webnnRegisterGraphOutput=h.registerGraphOutput.bind(h),e.webnnIsGraphOutput=h.isGraphOutput.bind(h),e.webnnCreateTemporaryTensor=h.createTemporaryTensor.bind(h),e.webnnIsGraphInputOutputTypeSupported=h.isGraphInputOutputTypeSupported.bind(h)}};let a=()=>{let s=l=>(...h)=>{let f=et;return h=l(...h),et!=f?new Promise((v,C)=>{Dn={resolve:v,reject:C}}):h};(()=>{for(let l of["_OrtAppendExecutionProvider","_OrtCreateSession","_OrtRun","_OrtRunWithBinding","_OrtBindInput"])e[l]=s(e[l])})(),i!==void 0&&(e._OrtRun=i(e._OrtRun),e._OrtRunWithBinding=i(e._OrtRunWithBinding)),a=void 0};e.asyncInit=()=>{a?.()};var u,d,c=(s,l)=>{throw l},p=import.meta.url,m="";if(r||n){try{m=new URL(".",p).href}catch{}n&&(d=s=>{var l=new XMLHttpRequest;return l.open("GET",s,!1),l.responseType="arraybuffer",l.send(null),new Uint8Array(l.response)}),u=async s=>{if(O(s))return new Promise((h,f)=>{var v=new XMLHttpRequest;v.open("GET",s,!0),v.responseType="arraybuffer",v.onload=()=>{v.status==200||v.status==0&&v.response?h(v.response):f(v.status)},v.onerror=f,v.send(null)});var l=await fetch(s,{credentials:"same-origin"});if(l.ok)return l.arrayBuffer();throw Error(l.status+" : "+l.url)}}var g,y,b,_,S,x,$=console.log.bind(console),T=console.error.bind(console),I=$,A=T,E=!1,O=s=>s.startsWith("file://");function w(){ht.buffer!=N.buffer&&Me()}if(o){let s=function(l){try{var h=l.data,f=h.Vc;if(f==="load"){let v=[];self.onmessage=C=>v.push(C),x=()=>{postMessage({Vc:"loaded"});for(let C of v)s(C);self.onmessage=s};for(let C of h.Ad)e[C]&&!e[C].proxy||(e[C]=(...P)=>{postMessage({Vc:"callHandler",yd:C,args:P})},C=="print"&&(I=e[C]),C=="printErr"&&(A=e[C]));ht=h.Rd,Me(),y=h.Sd,be(),Sr()}else if(f==="run"){(function(v){var C=(w(),L)[v+52>>>2>>>0];v=(w(),L)[v+56>>>2>>>0],qi(C,C-v),ue(C)})(h.Uc),Rn(h.Uc,0,0,1,0,0),qo(),En(h.Uc),U||(Vi(),U=!0);try{bp(h.Pd,h.ed)}catch(v){if(v!="unwind")throw v}}else h.target!=="setimmediate"&&(f==="checkMailbox"?U&&br():f&&(A(`worker: received unknown command ${f}`),A(h)))}catch(v){throw Li(),v}};var by=s,U=!1;self.onunhandledrejection=l=>{throw l.reason||l},self.onmessage=s}var N,F,q,X,B,L,Q,Y,Z,ne,ie,ce=!1;function Me(){var s=ht.buffer;e.HEAP8=N=new Int8Array(s),q=new Int16Array(s),e.HEAPU8=F=new Uint8Array(s),X=new Uint16Array(s),e.HEAP32=B=new Int32Array(s),e.HEAPU32=L=new Uint32Array(s),Q=new Float32Array(s),Y=new Float64Array(s),Z=new BigInt64Array(s),ne=new BigUint64Array(s)}function ve(){ce=!0,o?x():ct.ub()}function M(s){throw A(s="Aborted("+s+")"),E=!0,s=new WebAssembly.RuntimeError(s+". Build with -sASSERTIONS for more info."),S?.(s),s}function G(){return{a:{ma:Wm,hb:Lm,g:yp,J:_p,f:wp,o:vp,i:$p,$:xp,b:Sp,S:Tp,Ha:Xo,n:Ip,aa:ri,Ya:ni,Da:oi,Fa:ii,Za:ai,Wa:si,Pa:ui,Va:di,ka:li,Ea:ci,Ba:pi,Xa:mi,Ca:fi,cb:Cp,fa:Ep,wa:kp,ua:Dp,ea:Bp,N:zp,H:Mp,va:Rp,_:Hp,xa:Fp,Sa:qp,za:jp,Ia:Zp,sa:Qp,ga:Yp,Ra:En,$a:Xp,Q:rm,r:sm,c:Cn,ib:um,y:dm,M:lm,D:cm,l:pm,s:$i,jb:mm,I:fm,R:hm,j:gm,u:bm,q:ym,k:_m,Ma:wm,Na:vm,Oa:$m,Ka:Ii,La:Ci,ta:Ai,eb:Sm,bb:Cm,v:Am,ba:Em,ha:km,ab:Tm,V:Pm,_a:Dm,Aa:Om,F:xm,U:Bm,la:$r,ya:Mm,gb:zm,fb:Rm,Ta:Di,Ua:Oi,Ga:$n,T:Bi,Ja:zi,ja:Mi,Qa:Ri,ia:Ui,lb:If,na:vf,mb:Tf,oa:wf,G:df,e:qm,t:Hm,w:Gm,B:rf,nb:bf,Z:gf,x:Zm,pa:yf,X:$f,ca:hf,ob:ff,pb:mf,O:nf,qb:cf,qa:pf,rb:lf,L:sf,Y:_f,d:Fm,A:jm,m:Km,kb:Cf,p:Ym,z:Xm,C:Qm,E:Jm,K:of,ra:uf,P:xf,da:af,W:Sf,sb:tf,tb:ef,h:Nm,a:ht,db:pr}}}async function be(){function s(f,v){var C=ct=f.exports;f={};for(let[P,z]of Object.entries(C))typeof z=="function"?(C=Jp(z),f[P]=C):f[P]=z;return ct=f,ct=(function(){var P=ct,z=K=>ae=>K(ae)>>>0,H=K=>()=>K()>>>0;return(P=Object.assign({},P)).vb=z(P.vb),P.Zb=H(P.Zb),P.$b=z(P.$b),P.nc=z(P.nc),P.oc=H(P.oc),P.sc=z(P.sc),P})(),Ho.push(ct.ac),Ni=(f=ct).vb,Vi=f.wb,e._OrtInit=f.xb,e._OrtGetLastError=f.yb,e._OrtCreateSessionOptions=f.zb,e._OrtAppendExecutionProvider=f.Ab,e._OrtAddFreeDimensionOverride=f.Bb,e._OrtAddSessionConfigEntry=f.Cb,e._OrtReleaseSessionOptions=f.Db,e._OrtCreateSession=f.Eb,e._OrtReleaseSession=f.Fb,e._OrtGetInputOutputCount=f.Gb,e._OrtGetInputOutputMetadata=f.Hb,e._OrtFree=f.Ib,e._OrtCreateTensor=f.Jb,e._OrtGetTensorData=f.Kb,e._OrtReleaseTensor=f.Lb,e._OrtCreateRunOptions=f.Mb,e._OrtAddRunConfigEntry=f.Nb,e._OrtReleaseRunOptions=f.Ob,e._OrtCreateBinding=f.Pb,e._OrtBindInput=f.Qb,e._OrtBindOutput=f.Rb,e._OrtClearBoundOutputs=f.Sb,e._OrtReleaseBinding=f.Tb,e._OrtRunWithBinding=f.Ub,e._OrtRun=f.Vb,e._OrtEndProfiling=f.Wb,e._JsepOutput=f.Xb,e._JsepGetNodeName=f.Yb,xr=f.Zb,tt=e._free=f._b,Xt=e._malloc=f.$b,Rn=f.cc,Li=f.dc,Wi=f.ec,Gi=f.fc,Un=f.gc,Hi=f.hc,Fi=f.ic,le=f.jc,Jt=f.kc,qi=f.lc,ue=f.mc,Nn=f.nc,de=f.oc,Ki=f.pc,Vn=f.qc,ji=f.rc,Zi=f.sc,Qi=f.tc,Ln=f.uc,Yi=f.vc,Xi=f.wc,Ji=f.xc,ea=f.yc,ta=f.zc,ra=f.Ac,na=f.Bc,oa=f.Cc,ia=f.Dc,aa=f.Ec,sa=f.Fc,ua=f.Gc,da=f.Hc,la=f.Ic,ca=f.Jc,pa=f.Kc,ma=f.Lc,fa=f.Mc,ha=f.Nc,ga=f.Oc,ba=f.Pc,ya=f.Qc,_a=f.Sc,wa=f.Tc,va=f.cd,$a=f.dd,xa=f.id,Sa=f.nd,Ta=f.od,Ia=f.pd,Ca=f.qd,Aa=f.rd,Ea=f.sd,ka=f.td,Pa=f.ud,Da=f.zd,Oa=f.Zd,Ba=f._d,za=f.$d,Ma=f.ae,y=v,ct}var l,h=G();return e.instantiateWasm?new Promise(f=>{e.instantiateWasm(h,(v,C)=>{f(s(v,C))})}):o?s(new WebAssembly.Instance(y,G()),y):(ie??=e.locateFile?e.locateFile?e.locateFile("ort-wasm-simd-threaded.jsep.wasm",m):m+"ort-wasm-simd-threaded.jsep.wasm":new URL("ort-wasm-simd-threaded.jsep.wasm",import.meta.url).href,l=await(async function(f){var v=ie;if(!g&&!O(v))try{var C=fetch(v,{credentials:"same-origin"});return await WebAssembly.instantiateStreaming(C,f)}catch(P){A(`wasm streaming compile failed: ${P}`),A("falling back to ArrayBuffer instantiation")}return(async function(P,z){try{var H=await(async function(K){if(!g)try{var ae=await u(K);return new Uint8Array(ae)}catch{}if(K==ie&&g)K=new Uint8Array(g);else{if(!d)throw"both async and sync fetching of the wasm failed";K=d(K)}return K})(P);return await WebAssembly.instantiate(H,z)}catch(K){A(`failed to asynchronously prepare wasm: ${K}`),M(K)}})(v,f)})(h),s(l.instance,l.module))}class ke{name="ExitStatus";constructor(l){this.message=`Program terminated with exit(${l})`,this.status=l}}var $e=s=>{s.terminate(),s.onmessage=()=>{}},De=[],ge=0,Te=null,qe=s=>{ft.length==0&&(jo(),Ko(ft[0]));var l=ft.pop();if(!l)return 6;Qt.push(l),Ct[s.Uc]=l,l.Uc=s.Uc;var h={Vc:"run",Pd:s.Od,ed:s.ed,Uc:s.Uc};return l.postMessage(h,s.md),0},Ne=0,xe=(s,l,...h)=>{var f,v=16*h.length,C=de(),P=Nn(v),z=P>>>3;for(f of h)typeof f=="bigint"?((w(),Z)[z++>>>0]=1n,(w(),Z)[z++>>>0]=f):((w(),Z)[z++>>>0]=0n,(w(),Y)[z++>>>0]=f);return s=Wi(s,0,v,P,l),ue(C),s};function pr(s){if(o)return xe(0,1,s);if(b=s,!(0<Ne)){for(var l of Qt)$e(l);for(l of ft)$e(l);ft=[],Qt=[],Ct={},E=!0}c(0,new ke(s))}function Go(s){if(o)return xe(1,0,s);$n(s)}var $n=s=>{if(b=s,o)throw Go(s),"unwind";pr(s)},ft=[],Qt=[],Ho=[],Ct={},Fo=s=>{var l=s.Uc;delete Ct[l],ft.push(s),Qt.splice(Qt.indexOf(s),1),s.Uc=0,Gi(l)};function qo(){Ho.forEach(s=>s())}var Ko=s=>new Promise(l=>{s.onmessage=v=>{var C=v.data;if(v=C.Vc,C.bd&&C.bd!=xr()){var P=Ct[C.bd];P?P.postMessage(C,C.md):A(`Internal error! Worker sent a message "${v}" to target pthread ${C.bd}, but that thread no longer exists!`)}else v==="checkMailbox"?br():v==="spawnThread"?qe(C):v==="cleanupThread"?gr(()=>{Fo(Ct[C.Qd])}):v==="loaded"?(s.loaded=!0,l(s)):C.target==="setimmediate"?s.postMessage(C):v==="uncaughtException"?s.onerror(C.error):v==="callHandler"?e[C.yd](...C.args):v&&A(`worker sent an unknown command ${v}`)},s.onerror=v=>{throw A(`worker sent an error! ${v.filename}:${v.lineno}: ${v.message}`),v};var h,f=[];for(h of[])e.propertyIsEnumerable(h)&&f.push(h);s.postMessage({Vc:"load",Ad:f,Rd:ht,Sd:y})});function jo(){var s=new Worker((()=>{let l=URL;return import.meta.url>"file:"&&import.meta.url<"file;"?new l("ort.bundle.min.mjs",import.meta.url):new URL(import.meta.url)})(),{type:"module",workerData:"em-pthread",name:"em-pthread"});ft.push(s)}var ht,bp=(s,l)=>{Ne=0,s=Ln(s,l),0<Ne?b=s:Un(s)},mr=[],fr=0;function yp(s){var l=new xn(s>>>=0);return(w(),N)[l.Wc+12>>>0]==0&&(Zo(l,!0),fr--),Qo(l,!1),mr.push(l),Zi(s)}var Vt=0,_p=()=>{le(0,0);var s=mr.pop();Ki(s.gd),Vt=0};function Zo(s,l){l=l?1:0,(w(),N)[s.Wc+12>>>0]=l}function Qo(s,l){l=l?1:0,(w(),N)[s.Wc+13>>>0]=l}class xn{constructor(l){this.gd=l,this.Wc=l-24}}var Sn=s=>{var l=Vt;if(!l)return Jt(0),0;var h=new xn(l);(w(),L)[h.Wc+16>>>2>>>0]=l;var f=(w(),L)[h.Wc+4>>>2>>>0];if(!f)return Jt(0),l;for(var v of s){if(v===0||v===f)break;if(ji(v,f,h.Wc+16))return Jt(v),l}return Jt(f),l};function wp(){return Sn([])}function vp(s){return Sn([s>>>0])}function $p(s,l,h,f){return Sn([s>>>0,l>>>0,h>>>0,f>>>0])}var xp=()=>{var s=mr.pop();s||M("no exception to throw");var l=s.gd;throw(w(),N)[s.Wc+13>>>0]==0&&(mr.push(s),Qo(s,!0),Zo(s,!1),fr++),Vn(l),Vt=l};function Sp(s,l,h){var f=new xn(s>>>=0);throw l>>>=0,h>>>=0,(w(),L)[f.Wc+16>>>2>>>0]=0,(w(),L)[f.Wc+4>>>2>>>0]=l,(w(),L)[f.Wc+8>>>2>>>0]=h,Vn(s),fr++,Vt=s}var Tp=()=>fr;function Yo(s,l,h,f){return o?xe(2,1,s,l,h,f):Xo(s,l,h,f)}function Xo(s,l,h,f){if(s>>>=0,l>>>=0,h>>>=0,f>>>=0,!globalThis.SharedArrayBuffer)return 6;var v=[];return o&&v.length===0?Yo(s,l,h,f):(s={Od:h,Uc:s,ed:f,md:v},o?(s.Vc="spawnThread",postMessage(s,v),0):qe(s))}function Ip(s){throw Vt||=s>>>0,Vt}var Jo=globalThis.TextDecoder&&new TextDecoder,ei=(s,l,h,f)=>{if(h=l+h,f)return h;for(;s[l]&&!(l>=h);)++l;return l},ti=(s,l=0,h,f)=>{if(16<(h=ei(s,l>>>=0,h,f))-l&&s.buffer&&Jo)return Jo.decode(s.buffer instanceof ArrayBuffer?s.subarray(l,h):s.slice(l,h));for(f="";l<h;){var v=s[l++];if(128&v){var C=63&s[l++];if((224&v)==192)f+=String.fromCharCode((31&v)<<6|C);else{var P=63&s[l++];65536>(v=(240&v)==224?(15&v)<<12|C<<6|P:(7&v)<<18|C<<12|P<<6|63&s[l++])?f+=String.fromCharCode(v):(v-=65536,f+=String.fromCharCode(55296|v>>10,56320|1023&v))}}else f+=String.fromCharCode(v)}return f},Ee=(s,l,h)=>(s>>>=0)?ti((w(),F),s,l,h):"";function ri(s,l,h){return o?xe(3,1,s,l,h):0}function ni(s,l){if(o)return xe(4,1,s,l)}function oi(s,l){if(o)return xe(5,1,s,l)}function ii(s,l,h){if(o)return xe(6,1,s,l,h)}function ai(s,l,h){return o?xe(7,1,s,l,h):0}function si(s,l){if(o)return xe(8,1,s,l)}function ui(s,l,h){if(o)return xe(9,1,s,l,h)}function di(s,l,h,f){if(o)return xe(10,1,s,l,h,f)}function li(s,l,h,f){if(o)return xe(11,1,s,l,h,f)}function ci(s,l,h,f){if(o)return xe(12,1,s,l,h,f)}function pi(s){if(o)return xe(13,1,s)}function mi(s,l){if(o)return xe(14,1,s,l)}function fi(s,l,h){if(o)return xe(15,1,s,l,h)}var Cp=()=>M(""),Je=s=>{s>>>=0;for(var l="";;){var h=(w(),F)[s++>>>0];if(!h)return l;l+=String.fromCharCode(h)}},Tn={},In={},Ap={},Lt=class extends Error{constructor(s){super(s),this.name="BindingError"}};function lt(s,l,h={}){return(function(f,v,C={}){var P=v.name;if(!f)throw new Lt(`type "${P}" must have a positive integer typeid pointer`);if(In.hasOwnProperty(f)){if(C.Bd)return;throw new Lt(`Cannot register type '${P}' twice`)}In[f]=v,delete Ap[f],Tn.hasOwnProperty(f)&&(v=Tn[f],delete Tn[f],v.forEach(z=>z()))})(s,l,h)}var hi=(s,l,h)=>{switch(l){case 1:return h?f=>(w(),N)[f>>>0]:f=>(w(),F)[f>>>0];case 2:return h?f=>(w(),q)[f>>>1>>>0]:f=>(w(),X)[f>>>1>>>0];case 4:return h?f=>(w(),B)[f>>>2>>>0]:f=>(w(),L)[f>>>2>>>0];case 8:return h?f=>(w(),Z)[f>>>3>>>0]:f=>(w(),ne)[f>>>3>>>0];default:throw new TypeError(`invalid integer width (${l}): ${s}`)}};function Ep(s,l,h,f,v){s>>>=0,h>>>=0,l=Je(l>>>0);let C=P=>P;if(f=f===0n){let P=8*h;C=z=>BigInt.asUintN(P,z),v=C(v)}lt(s,{name:l,Rc:C,Yc:(P,z)=>(typeof z=="number"&&(z=BigInt(z)),z),Xc:hi(l,h,!f),Zc:null})}function kp(s,l,h,f){lt(s>>>=0,{name:l=Je(l>>>0),Rc:function(v){return!!v},Yc:function(v,C){return C?h:f},Xc:function(v){return this.Rc((w(),F)[v>>>0])},Zc:null})}var gi=[],At=[0,1,,1,null,1,!0,1,!1,1];function Cn(s){9<(s>>>=0)&&--At[s+1]===0&&(At[s]=void 0,gi.push(s))}var He=s=>{if(!s)throw new Lt(`Cannot use deleted val. handle = ${s}`);return At[s]},Ke=s=>{switch(s){case void 0:return 2;case null:return 4;case!0:return 6;case!1:return 8;default:let l=gi.pop()||At.length;return At[l]=s,At[l+1]=1,l}};function An(s){return this.Rc((w(),L)[s>>>2>>>0])}var Pp={name:"emscripten::val",Rc:s=>{var l=He(s);return Cn(s),l},Yc:(s,l)=>Ke(l),Xc:An,Zc:null};function Dp(s){return lt(s>>>0,Pp)}var Op=(s,l)=>{switch(l){case 4:return function(h){return this.Rc((w(),Q)[h>>>2>>>0])};case 8:return function(h){return this.Rc((w(),Y)[h>>>3>>>0])};default:throw new TypeError(`invalid float width (${l}): ${s}`)}};function Bp(s,l,h){h>>>=0,lt(s>>>=0,{name:l=Je(l>>>0),Rc:f=>f,Yc:(f,v)=>v,Xc:Op(l,h),Zc:null})}function zp(s,l,h,f,v){s>>>=0,h>>>=0,l=Je(l>>>0);let C=z=>z;if(f===0){var P=32-8*h;C=z=>z<<P>>>P,v=C(v)}lt(s,{name:l,Rc:C,Yc:(z,H)=>H,Xc:hi(l,h,f!==0),Zc:null})}function Mp(s,l,h){function f(C){var P=(w(),L)[C>>>2>>>0];return C=(w(),L)[C+4>>>2>>>0],new v((w(),N).buffer,C,P)}var v=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array][l];lt(s>>>=0,{name:h=Je(h>>>0),Rc:f,Xc:f},{Bd:!0})}var gt=(s,l,h)=>{var f=(w(),F);if(l>>>=0,0<h){var v=l;h=l+h-1;for(var C=0;C<s.length;++C){var P=s.codePointAt(C);if(127>=P){if(l>=h)break;f[l++>>>0]=P}else if(2047>=P){if(l+1>=h)break;f[l++>>>0]=192|P>>6,f[l++>>>0]=128|63&P}else if(65535>=P){if(l+2>=h)break;f[l++>>>0]=224|P>>12,f[l++>>>0]=128|P>>6&63,f[l++>>>0]=128|63&P}else{if(l+3>=h)break;f[l++>>>0]=240|P>>18,f[l++>>>0]=128|P>>12&63,f[l++>>>0]=128|P>>6&63,f[l++>>>0]=128|63&P,C++}}f[l>>>0]=0,s=l-v}else s=0;return s},hr=s=>{for(var l=0,h=0;h<s.length;++h){var f=s.charCodeAt(h);127>=f?l++:2047>=f?l+=2:55296<=f&&57343>=f?(l+=4,++h):l+=3}return l};function Rp(s,l){lt(s>>>=0,{name:l=Je(l>>>0),Rc(h){var f=(w(),L)[h>>>2>>>0];return f=Ee(h+4,f,!0),tt(h),f},Yc(h,f){f instanceof ArrayBuffer&&(f=new Uint8Array(f));var v=typeof f=="string";if(!(v||ArrayBuffer.isView(f)&&f.BYTES_PER_ELEMENT==1))throw new Lt("Cannot pass non-string to std::string");var C=v?hr(f):f.length,P=Xt(4+C+1),z=P+4;return(w(),L)[P>>>2>>>0]=C,v?gt(f,z,C+1):(w(),F).set(f,z>>>0),h!==null&&h.push(tt,P),P},Xc:An,Zc(h){tt(h)}})}var bi=globalThis.TextDecoder?new TextDecoder("utf-16le"):void 0,Up=(s,l,h)=>{if(s>>>=1,16<(l=ei((w(),X),s,l/2,h))-s&&bi)return bi.decode((w(),X).slice(s,l));for(h="";s<l;++s){var f=(w(),X)[s>>>0];h+=String.fromCharCode(f)}return h},Np=(s,l,h)=>{if(h??=2147483647,2>h)return 0;var f=l;h=(h-=2)<2*s.length?h/2:s.length;for(var v=0;v<h;++v){var C=s.charCodeAt(v);(w(),q)[l>>>1>>>0]=C,l+=2}return(w(),q)[l>>>1>>>0]=0,l-f},Vp=s=>2*s.length,Lp=(s,l,h)=>{var f="";s>>>=2;for(var v=0;!(v>=l/4);v++){var C=(w(),L)[s+v>>>0];if(!C&&!h)break;f+=String.fromCodePoint(C)}return f},Wp=(s,l,h)=>{if(l>>>=0,h??=2147483647,4>h)return 0;var f=l;h=f+h-4;for(var v=0;v<s.length;++v){var C=s.codePointAt(v);if(65535<C&&v++,(w(),B)[l>>>2>>>0]=C,(l+=4)+4>h)break}return(w(),B)[l>>>2>>>0]=0,l-f},Gp=s=>{for(var l=0,h=0;h<s.length;++h)65535<s.codePointAt(h)&&h++,l+=4;return l};function Hp(s,l,h){if(s>>>=0,l>>>=0,h=Je(h>>>=0),l===2)var f=Up,v=Np,C=Vp;else f=Lp,v=Wp,C=Gp;lt(s,{name:h,Rc:P=>{var z=(w(),L)[P>>>2>>>0];return z=f(P+4,z*l,!0),tt(P),z},Yc:(P,z)=>{if(typeof z!="string")throw new Lt(`Cannot pass non-string to C++ string type ${h}`);var H=C(z),K=Xt(4+H+l);return(w(),L)[K>>>2>>>0]=H/l,v(z,K+4,H+l),P!==null&&P.push(tt,K),K},Xc:An,Zc(P){tt(P)}})}function Fp(s,l){lt(s>>>=0,{Cd:!0,name:l=Je(l>>>0),Rc:()=>{},Yc:()=>{}})}function qp(s){Rn(s>>>0,!n,1,!r,131072,!1),qo()}var gr=s=>{if(!E)try{if(s(),!(0<Ne))try{o?xr()&&Un(b):$n(b)}catch(l){l instanceof ke||l=="unwind"||c(0,l)}}catch(l){l instanceof ke||l=="unwind"||c(0,l)}},Kp=!Atomics.waitAsync||globalThis.navigator?.userAgent&&91>Number((navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)||[])[2]);function En(s){s>>>=0,Kp||(Atomics.waitAsync((w(),B),s>>>2,s).value.then(br),s+=128,Atomics.store((w(),B),s>>>2,1))}var br=()=>gr(()=>{var s=xr();s&&(En(s),Fi())});function jp(s,l){(s>>>=0)==l>>>0?setTimeout(br):o?postMessage({bd:s,Vc:"checkMailbox"}):(s=Ct[s])&&s.postMessage({Vc:"checkMailbox"})}var kn=[];function Zp(s,l,h,f,v){for(l>>>=0,v>>>=0,kn.length=0,h=v>>>3,f=v+f>>>3;h<f;){var C;C=(w(),Z)[h++>>>0]?(w(),Z)[h++>>>0]:(w(),Y)[h++>>>0],kn.push(C)}return(l?Wn[l]:Vm[s])(...kn)}var Qp=()=>{Ne=0};function Yp(s){s>>>=0,o?postMessage({Vc:"cleanupThread",Qd:s}):Fo(Ct[s])}function Xp(s){}var yr=s=>{try{s()}catch(l){M(l)}};function Jp(s){var l=(...h)=>{_r.push(s);try{return s(...h)}finally{E||(_r.pop(),et&&bt===1&&_r.length===0&&(bt=0,Ne+=1,yr(Ba),typeof Fibers<"u"&&Fibers.de()))}};return wi.set(s,l),l}var bt=0,et=null,yi=0,_r=[],Pn=new Map,_i=new Map,wi=new Map,em=0,Dn=null,tm=[],vi=s=>(function(l){if(!E){if(bt===0){var h=!1,f=!1;l((v=0)=>{if(!E&&(yi=v,h=!0,f)){bt=2,yr(()=>za(et)),typeof MainLoop<"u"&&MainLoop.xd&&MainLoop.resume(),v=!1;try{var C=(function(){var H=(w(),B)[et+8>>>2>>>0];return H=_i.get(H),H=wi.get(H),--Ne,H()})()}catch(H){C=H,v=!0}var P=!1;if(!et){var z=Dn;z&&(Dn=null,(v?z.reject:z.resolve)(C),P=!0)}if(v&&!P)throw C}}),f=!0,h||(bt=1,et=(function(){var v=Xt(65548),C=v+12;if((w(),L)[v>>>2>>>0]=C,(w(),L)[v+4>>>2>>>0]=C+65536,C=_r[0],!Pn.has(C)){var P=em++;Pn.set(C,P),_i.set(P,C)}return C=Pn.get(C),(w(),B)[v+8>>>2>>>0]=C,v})(),typeof MainLoop<"u"&&MainLoop.xd&&MainLoop.pause(),yr(()=>Oa(et)))}else bt===2?(bt=0,yr(Ma),tt(et),et=null,tm.forEach(gr)):M(`invalid state: ${bt}`);return yi}})(l=>{s().then(l)});function rm(s){return s>>>=0,vi(async()=>{var l=await He(s);return Ke(l)})}var On=[],nm=s=>{var l=On.length;return On.push(s),l},om=(s,l)=>{for(var h=Array(s),f=0;f<s;++f){var v=f,C=(w(),L)[l+4*f>>>2>>>0],P=In[C];if(P===void 0)throw s=`parameter ${f}`,C=Ni(C),l=Je(C),tt(C),new Lt(`${s} has unknown type ${l}`);h[v]=P}return h},im=(s,l,h)=>{var f=[];return s=s(f,h),f.length&&((w(),L)[l>>>2>>>0]=Ke(f)),s},am={},wr=s=>{var l=am[s];return l===void 0?Je(s):l};function sm(s,l,h){var[f,...v]=om(s,l>>>0);l=f.Yc.bind(f);var C=v.map(H=>H.Xc.bind(H));s--;var P={toValue:He};switch(s=C.map((H,K)=>{var ae=`argFromPtr${K}`;return P[ae]=H,`${ae}(args${K?"+"+8*K:""})`}),h){case 0:var z="toValue(handle)";break;case 2:z="new (toValue(handle))";break;case 3:z="";break;case 1:P.getStringOrSymbol=wr,z="toValue(handle)[getStringOrSymbol(methodName)]"}return z+=`(${s})`,f.Cd||(P.toReturnWire=l,P.emval_returnValue=im,z=`return emval_returnValue(toReturnWire, destructorsRef, ${z})`),z=`return function (handle, methodName, destructorsRef, args) {
  ${z}
  }`,h=new Function(Object.keys(P),z)(...Object.values(P)),z=`methodCaller<(${v.map(H=>H.name)}) => ${f.name}>`,nm(Object.defineProperty(h,"name",{value:z}))}function um(s,l){return l>>>=0,(s=He(s>>>0))==He(l)}function dm(s){return(s>>>=0)?(s=wr(s),Ke(globalThis[s])):Ke(globalThis)}function lm(s){return s=wr(s>>>0),Ke(e[s])}function cm(s,l){return l>>>=0,s=He(s>>>0),l=He(l),Ke(s[l])}function pm(s){9<(s>>>=0)&&(At[s+1]+=1)}function $i(s,l,h,f,v){return On[s>>>0](l>>>0,h>>>0,f>>>0,v>>>0)}function mm(s,l,h,f,v){return $i(s>>>0,l>>>0,h>>>0,f>>>0,v>>>0)}function fm(){return Ke([])}function hm(s){s=He(s>>>0);for(var l=Array(s.length),h=0;h<s.length;h++)l[h]=s[h];return Ke(l)}function gm(s){return Ke(wr(s>>>0))}function bm(){return Ke({})}function ym(s){for(var l=He(s>>>=0);l.length;){var h=l.pop();l.pop()(h)}Cn(s)}function _m(s,l,h){l>>>=0,h>>>=0,s=He(s>>>0),l=He(l),h=He(h),s[l]=h}function wm(s,l){s=-9007199254740992>s||9007199254740992<s?NaN:Number(s),l>>>=0,s=new Date(1e3*s),(w(),B)[l>>>2>>>0]=s.getUTCSeconds(),(w(),B)[l+4>>>2>>>0]=s.getUTCMinutes(),(w(),B)[l+8>>>2>>>0]=s.getUTCHours(),(w(),B)[l+12>>>2>>>0]=s.getUTCDate(),(w(),B)[l+16>>>2>>>0]=s.getUTCMonth(),(w(),B)[l+20>>>2>>>0]=s.getUTCFullYear()-1900,(w(),B)[l+24>>>2>>>0]=s.getUTCDay(),s=(s.getTime()-Date.UTC(s.getUTCFullYear(),0,1,0,0,0,0))/864e5|0,(w(),B)[l+28>>>2>>>0]=s}var xi=s=>s%4==0&&(s%100!=0||s%400==0),Si=[0,31,60,91,121,152,182,213,244,274,305,335],Ti=[0,31,59,90,120,151,181,212,243,273,304,334];function vm(s,l){s=-9007199254740992>s||9007199254740992<s?NaN:Number(s),l>>>=0,s=new Date(1e3*s),(w(),B)[l>>>2>>>0]=s.getSeconds(),(w(),B)[l+4>>>2>>>0]=s.getMinutes(),(w(),B)[l+8>>>2>>>0]=s.getHours(),(w(),B)[l+12>>>2>>>0]=s.getDate(),(w(),B)[l+16>>>2>>>0]=s.getMonth(),(w(),B)[l+20>>>2>>>0]=s.getFullYear()-1900,(w(),B)[l+24>>>2>>>0]=s.getDay();var h=(xi(s.getFullYear())?Si:Ti)[s.getMonth()]+s.getDate()-1|0;(w(),B)[l+28>>>2>>>0]=h,(w(),B)[l+36>>>2>>>0]=-60*s.getTimezoneOffset(),h=new Date(s.getFullYear(),6,1).getTimezoneOffset();var f=new Date(s.getFullYear(),0,1).getTimezoneOffset();s=0|(h!=f&&s.getTimezoneOffset()==Math.min(f,h)),(w(),B)[l+32>>>2>>>0]=s}function $m(s){s>>>=0;var l=new Date((w(),B)[s+20>>>2>>>0]+1900,(w(),B)[s+16>>>2>>>0],(w(),B)[s+12>>>2>>>0],(w(),B)[s+8>>>2>>>0],(w(),B)[s+4>>>2>>>0],(w(),B)[s>>>2>>>0],0),h=(w(),B)[s+32>>>2>>>0],f=l.getTimezoneOffset(),v=new Date(l.getFullYear(),6,1).getTimezoneOffset(),C=new Date(l.getFullYear(),0,1).getTimezoneOffset(),P=Math.min(C,v);return 0>h?(w(),B)[s+32>>>2>>>0]=+(v!=C&&P==f):0<h!=(P==f)&&(v=Math.max(C,v),l.setTime(l.getTime()+6e4*((0<h?P:v)-f))),(w(),B)[s+24>>>2>>>0]=l.getDay(),h=(xi(l.getFullYear())?Si:Ti)[l.getMonth()]+l.getDate()-1|0,(w(),B)[s+28>>>2>>>0]=h,(w(),B)[s>>>2>>>0]=l.getSeconds(),(w(),B)[s+4>>>2>>>0]=l.getMinutes(),(w(),B)[s+8>>>2>>>0]=l.getHours(),(w(),B)[s+12>>>2>>>0]=l.getDate(),(w(),B)[s+16>>>2>>>0]=l.getMonth(),(w(),B)[s+20>>>2>>>0]=l.getYear(),s=l.getTime(),BigInt(isNaN(s)?-1:s/1e3)}function Ii(s,l,h,f,v,C,P){return o?xe(16,1,s,l,h,f,v,C,P):-52}function Ci(s,l,h,f,v,C){if(o)return xe(17,1,s,l,h,f,v,C)}var Yt={},xm=()=>performance.timeOrigin+performance.now();function Ai(s,l){if(o)return xe(18,1,s,l);if(Yt[s]&&(clearTimeout(Yt[s].id),delete Yt[s]),!l)return 0;var h=setTimeout(()=>{delete Yt[s],gr(()=>Hi(s,performance.timeOrigin+performance.now()))},l);return Yt[s]={id:h,ce:l},0}function Sm(s,l,h,f){s>>>=0,l>>>=0,h>>>=0,f>>>=0;var v=new Date().getFullYear(),C=new Date(v,0,1).getTimezoneOffset();v=new Date(v,6,1).getTimezoneOffset();var P=Math.max(C,v);(w(),L)[s>>>2>>>0]=60*P,(w(),B)[l>>>2>>>0]=+(C!=v),s=(l=z=>{var H=Math.abs(z);return`UTC${0<=z?"-":"+"}${String(Math.floor(H/60)).padStart(2,"0")}${String(H%60).padStart(2,"0")}`})(C),l=l(v),v<C?(gt(s,h,17),gt(l,f,17)):(gt(s,f,17),gt(l,h,17))}var Tm=()=>Date.now(),Im=1;function Cm(s,l,h){if(h>>>=0,!(0<=s&&3>=s))return 28;if(s===0)s=Date.now();else{if(!Im)return 52;s=performance.timeOrigin+performance.now()}return s=Math.round(1e6*s),(w(),Z)[h>>>3>>>0]=BigInt(s),0}var Bn=[],Ei=(s,l)=>{Bn.length=0;for(var h;h=(w(),F)[s++>>>0];){var f=h!=105;l+=(f&=h!=112)&&l%8?4:0,Bn.push(h==112?(w(),L)[l>>>2>>>0]:h==106?(w(),Z)[l>>>3>>>0]:h==105?(w(),B)[l>>>2>>>0]:(w(),Y)[l>>>3>>>0]),l+=f?8:4}return Bn};function Am(s,l,h){return s>>>=0,l=Ei(l>>>0,h>>>0),Wn[s](...l)}function Em(s,l,h){return s>>>=0,l=Ei(l>>>0,h>>>0),Wn[s](...l)}var km=()=>{};function Pm(s,l){return A(Ee(s>>>0,l>>>0))}var Dm=()=>{throw Ne+=1,"unwind"};function Om(){return 4294901760}var Bm=()=>navigator.hardwareConcurrency,Et={},vr=s=>{var l;return(l=/\bwasm-function\[\d+\]:(0x[0-9a-f]+)/.exec(s))?+l[1]:(l=/:(\d+):\d+(?:\)|$)/.exec(s))?2147483648|+l[1]:0},ki=s=>{for(var l of s)(s=vr(l))&&(Et[s]=l)};function zm(){var s=Error().stack.toString().split(`
`);return s[0]=="Error"&&s.shift(),ki(s),Et.kd=vr(s[3]),Et.Md=s,Et.kd}function $r(s){if(!(s=Et[s>>>0]))return 0;var l;if(l=/^\s+at .*\.wasm\.(.*) \(.*\)$/.exec(s))s=l[1];else if(l=/^\s+at (.*) \(.*\)$/.exec(s))s=l[1];else{if(!(l=/^(.+?)@/.exec(s)))return 0;s=l[1]}tt($r.ld??0),l=hr(s)+1;var h=Xt(l);return h&&gt(s,h,l),$r.ld=h,$r.ld}function Mm(s){s>>>=0;var l=(w(),F).length;if(s<=l||4294901760<s)return!1;for(var h=1;4>=h;h*=2){var f=l*(1+.2/h);f=Math.min(f,s+100663296);e:{f=(Math.min(4294901760,65536*Math.ceil(Math.max(s,f)/65536))-ht.buffer.byteLength+65535)/65536|0;try{ht.grow(f),Me();var v=1;break e}catch{}v=void 0}if(v)return!0}return!1}function Rm(s,l,h){if(s>>>=0,l>>>=0,Et.kd==s)var f=Et.Md;else(f=Error().stack.toString().split(`
`))[0]=="Error"&&f.shift(),ki(f);for(var v=3;f[v]&&vr(f[v])!=s;)++v;for(s=0;s<h&&f[s+v];++s)(w(),B)[l+4*s>>>2>>>0]=vr(f[s+v]);return s}var zn,Mn={},Pi=()=>{if(!zn){var s,l={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:(globalThis.navigator?.language??"C").replace("-","_")+".UTF-8",_:"./this.program"};for(s in Mn)Mn[s]===void 0?delete l[s]:l[s]=Mn[s];var h=[];for(s in l)h.push(`${s}=${l[s]}`);zn=h}return zn};function Di(s,l){if(o)return xe(19,1,s,l);s>>>=0,l>>>=0;var h,f=0,v=0;for(h of Pi()){var C=l+f;(w(),L)[s+v>>>2>>>0]=C,f+=gt(h,C,1/0)+1,v+=4}return 0}function Oi(s,l){if(o)return xe(20,1,s,l);s>>>=0,l>>>=0;var h=Pi();for(var f of((w(),L)[s>>>2>>>0]=h.length,s=0,h))s+=hr(f)+1;return(w(),L)[l>>>2>>>0]=s,0}function Bi(s){return o?xe(21,1,s):52}function zi(s,l,h,f,v){return o?xe(22,1,s,l,h,f,v):52}function Mi(s,l,h,f){return o?xe(23,1,s,l,h,f):52}function Ri(s,l,h,f){return o?xe(24,1,s,l,h,f):70}var Um=[null,[],[]];function Ui(s,l,h,f){if(o)return xe(25,1,s,l,h,f);l>>>=0,h>>>=0,f>>>=0;for(var v=0,C=0;C<h;C++){var P=(w(),L)[l>>>2>>>0],z=(w(),L)[l+4>>>2>>>0];l+=8;for(var H=0;H<z;H++){var K=s,ae=(w(),F)[P+H>>>0],pe=Um[K];ae===0||ae===10?((K===1?I:A)(ti(pe)),pe.length=0):pe.push(ae)}v+=z}return(w(),L)[f>>>2>>>0]=v,0}function Nm(s){return s>>>0}o||(function(){for(var s=e.numThreads-1;s--;)jo();De.push(async()=>{var l=(async function(){if(!o)return Promise.all(ft.map(Ko))})();ge++,await l,--ge==0&&Te&&(l=Te,Te=null,l())})})(),o||(ht=new WebAssembly.Memory({initial:256,maximum:65536,shared:!0}),Me()),e.wasmBinary&&(g=e.wasmBinary),e.stackSave=()=>de(),e.stackRestore=s=>ue(s),e.stackAlloc=s=>Nn(s),e.setValue=function(s,l,h="i8"){switch(h.endsWith("*")&&(h="*"),h){case"i1":case"i8":(w(),N)[s>>>0]=l;break;case"i16":(w(),q)[s>>>1>>>0]=l;break;case"i32":(w(),B)[s>>>2>>>0]=l;break;case"i64":(w(),Z)[s>>>3>>>0]=BigInt(l);break;case"float":(w(),Q)[s>>>2>>>0]=l;break;case"double":(w(),Y)[s>>>3>>>0]=l;break;case"*":(w(),L)[s>>>2>>>0]=l;break;default:M(`invalid type for setValue: ${h}`)}},e.getValue=function(s,l="i8"){switch(l.endsWith("*")&&(l="*"),l){case"i1":case"i8":return(w(),N)[s>>>0];case"i16":return(w(),q)[s>>>1>>>0];case"i32":return(w(),B)[s>>>2>>>0];case"i64":return(w(),Z)[s>>>3>>>0];case"float":return(w(),Q)[s>>>2>>>0];case"double":return(w(),Y)[s>>>3>>>0];case"*":return(w(),L)[s>>>2>>>0];default:M(`invalid type for getValue: ${l}`)}},e.UTF8ToString=Ee,e.stringToUTF8=gt,e.lengthBytesUTF8=hr;var Ni,Vi,xr,tt,Xt,Rn,Li,Wi,Gi,Un,Hi,Fi,le,Jt,qi,ue,Nn,de,Ki,Vn,ji,Zi,Qi,Ln,Yi,Xi,Ji,ea,ta,ra,na,oa,ia,aa,sa,ua,da,la,ca,pa,ma,fa,ha,ga,ba,ya,_a,wa,va,$a,xa,Sa,Ta,Ia,Ca,Aa,Ea,ka,Pa,Da,Oa,Ba,za,Ma,ct,Vm=[pr,Go,Yo,ri,ni,oi,ii,ai,si,ui,di,li,ci,pi,mi,fi,Ii,Ci,Ai,Di,Oi,Bi,zi,Mi,Ri,Ui],Wn={1086876:(s,l,h,f,v)=>{if(e===void 0||!e.ad)return 1;if((s=Ee(Number(s>>>0))).startsWith("./")&&(s=s.substring(2)),!(s=e.ad.get(s)))return 2;if(l=Number(l>>>0),h=Number(h>>>0),f=Number(f>>>0),l+h>s.byteLength)return 3;try{let C=s.subarray(l,l+h);switch(v){case 0:(w(),F).set(C,f>>>0);break;case 1:e.Td?e.Td(f,C):e.Ld(f,C);break;default:return 4}return 0}catch{return 4}},1087700:(s,l,h)=>{e.wd(s,(w(),F).subarray(l>>>0,l+h>>>0))},1087764:()=>e.Vd(),1087806:s=>{e.vd(s)},1087843:()=>{e.Ed()},1087874:()=>{e.Fd()},1087903:()=>{e.Jd()},1087928:s=>e.Dd(s),1087961:s=>e.Hd(s),1087993:(s,l,h)=>{e.jd(Number(s),Number(l),Number(h),!0)},1088056:(s,l,h)=>{e.jd(Number(s),Number(l),Number(h))},1088113:()=>typeof wasmOffsetConverter<"u",1088170:s=>{e.bc("Abs",s,void 0)},1088221:s=>{e.bc("Neg",s,void 0)},1088272:s=>{e.bc("Floor",s,void 0)},1088325:s=>{e.bc("Ceil",s,void 0)},1088377:s=>{e.bc("Reciprocal",s,void 0)},1088435:s=>{e.bc("Sqrt",s,void 0)},1088487:s=>{e.bc("Exp",s,void 0)},1088538:s=>{e.bc("Erf",s,void 0)},1088589:s=>{e.bc("Sigmoid",s,void 0)},1088644:(s,l,h)=>{e.bc("HardSigmoid",s,{alpha:l,beta:h})},1088723:s=>{e.bc("HardSwish",s,void 0)},1088780:s=>{e.bc("Log",s,void 0)},1088831:s=>{e.bc("Sin",s,void 0)},1088882:s=>{e.bc("Cos",s,void 0)},1088933:s=>{e.bc("Tan",s,void 0)},1088984:s=>{e.bc("Asin",s,void 0)},1089036:s=>{e.bc("Acos",s,void 0)},1089088:s=>{e.bc("Atan",s,void 0)},1089140:s=>{e.bc("Sinh",s,void 0)},1089192:s=>{e.bc("Cosh",s,void 0)},1089244:s=>{e.bc("Asinh",s,void 0)},1089297:s=>{e.bc("Acosh",s,void 0)},1089350:s=>{e.bc("Atanh",s,void 0)},1089403:s=>{e.bc("Tanh",s,void 0)},1089455:s=>{e.bc("Not",s,void 0)},1089506:(s,l,h)=>{e.bc("Clip",s,{min:l,max:h})},1089575:s=>{e.bc("Clip",s,void 0)},1089627:(s,l)=>{e.bc("Elu",s,{alpha:l})},1089685:s=>{e.bc("Gelu",s,void 0)},1089737:s=>{e.bc("Relu",s,void 0)},1089789:(s,l)=>{e.bc("LeakyRelu",s,{alpha:l})},1089853:(s,l)=>{e.bc("ThresholdedRelu",s,{alpha:l})},1089923:(s,l)=>{e.bc("Cast",s,{to:l})},1089981:s=>{e.bc("Add",s,void 0)},1090032:s=>{e.bc("Sub",s,void 0)},1090083:s=>{e.bc("Mul",s,void 0)},1090134:s=>{e.bc("Div",s,void 0)},1090185:s=>{e.bc("Pow",s,void 0)},1090236:s=>{e.bc("Equal",s,void 0)},1090289:s=>{e.bc("Greater",s,void 0)},1090344:s=>{e.bc("GreaterOrEqual",s,void 0)},1090406:s=>{e.bc("Less",s,void 0)},1090458:s=>{e.bc("LessOrEqual",s,void 0)},1090517:(s,l,h,f,v)=>{e.bc("ReduceMean",s,{keepDims:!!l,noopWithEmptyAxes:!!h,axes:f?Array.from((w(),B).subarray(Number(f)>>>0,Number(v)>>>0)):[]})},1090692:(s,l,h,f,v)=>{e.bc("ReduceMax",s,{keepDims:!!l,noopWithEmptyAxes:!!h,axes:f?Array.from((w(),B).subarray(Number(f)>>>0,Number(v)>>>0)):[]})},1090866:(s,l,h,f,v)=>{e.bc("ReduceMin",s,{keepDims:!!l,noopWithEmptyAxes:!!h,axes:f?Array.from((w(),B).subarray(Number(f)>>>0,Number(v)>>>0)):[]})},1091040:(s,l,h,f,v)=>{e.bc("ReduceProd",s,{keepDims:!!l,noopWithEmptyAxes:!!h,axes:f?Array.from((w(),B).subarray(Number(f)>>>0,Number(v)>>>0)):[]})},1091215:(s,l,h,f,v)=>{e.bc("ReduceSum",s,{keepDims:!!l,noopWithEmptyAxes:!!h,axes:f?Array.from((w(),B).subarray(Number(f)>>>0,Number(v)>>>0)):[]})},1091389:(s,l,h,f,v)=>{e.bc("ReduceL1",s,{keepDims:!!l,noopWithEmptyAxes:!!h,axes:f?Array.from((w(),B).subarray(Number(f)>>>0,Number(v)>>>0)):[]})},1091562:(s,l,h,f,v)=>{e.bc("ReduceL2",s,{keepDims:!!l,noopWithEmptyAxes:!!h,axes:f?Array.from((w(),B).subarray(Number(f)>>>0,Number(v)>>>0)):[]})},1091735:(s,l,h,f,v)=>{e.bc("ReduceLogSum",s,{keepDims:!!l,noopWithEmptyAxes:!!h,axes:f?Array.from((w(),B).subarray(Number(f)>>>0,Number(v)>>>0)):[]})},1091912:(s,l,h,f,v)=>{e.bc("ReduceSumSquare",s,{keepDims:!!l,noopWithEmptyAxes:!!h,axes:f?Array.from((w(),B).subarray(Number(f)>>>0,Number(v)>>>0)):[]})},1092092:(s,l,h,f,v)=>{e.bc("ReduceLogSumExp",s,{keepDims:!!l,noopWithEmptyAxes:!!h,axes:f?Array.from((w(),B).subarray(Number(f)>>>0,Number(v)>>>0)):[]})},1092272:s=>{e.bc("Where",s,void 0)},1092325:(s,l,h)=>{e.bc("Transpose",s,{perm:l?Array.from((w(),B).subarray(Number(l)>>>0,Number(h)>>>0)):[]})},1092449:(s,l,h,f)=>{e.bc("DepthToSpace",s,{blocksize:l,mode:Ee(h),format:f?"NHWC":"NCHW"})},1092582:(s,l,h,f)=>{e.bc("DepthToSpace",s,{blocksize:l,mode:Ee(h),format:f?"NHWC":"NCHW"})},1092715:(s,l,h,f)=>{e.bc("DFT",s,{axis:l,inverse:h,onesided:f})},1092807:(s,l,h,f,v,C,P,z,H,K,ae,pe,Se,Ie,yt)=>{e.bc("ConvTranspose",s,{format:H?"NHWC":"NCHW",autoPad:l,dilations:[h],group:f,kernelShape:[v],pads:[C,P],strides:[z],wIsConst:()=>!!(w(),N)[K>>>0],outputPadding:ae?Array.from((w(),B).subarray(Number(ae)>>>0,Number(pe)>>>0)):[],outputShape:Se?Array.from((w(),B).subarray(Number(Se)>>>0,Number(Ie)>>>0)):[],activation:Ee(yt)})},1093240:(s,l,h,f,v,C,P,z,H,K,ae,pe,Se,Ie)=>{e.bc("ConvTranspose",s,{format:z?"NHWC":"NCHW",autoPad:l,dilations:Array.from((w(),B).subarray(Number(h)>>>0,(Number(h)>>>0)+2>>>0)),group:f,kernelShape:Array.from((w(),B).subarray(Number(v)>>>0,(Number(v)>>>0)+2>>>0)),pads:Array.from((w(),B).subarray(Number(C)>>>0,(Number(C)>>>0)+4>>>0)),strides:Array.from((w(),B).subarray(Number(P)>>>0,(Number(P)>>>0)+2>>>0)),wIsConst:()=>!!(w(),N)[H>>>0],outputPadding:K?Array.from((w(),B).subarray(Number(K)>>>0,Number(ae)>>>0)):[],outputShape:pe?Array.from((w(),B).subarray(Number(pe)>>>0,Number(Se)>>>0)):[],activation:Ee(Ie)})},1093901:(s,l,h,f,v,C,P,z,H,K,ae,pe,Se,Ie,yt)=>{e.bc("ConvTranspose",s,{format:H?"NHWC":"NCHW",autoPad:l,dilations:[h],group:f,kernelShape:[v],pads:[C,P],strides:[z],wIsConst:()=>!!(w(),N)[K>>>0],outputPadding:ae?Array.from((w(),B).subarray(Number(ae)>>>0,Number(pe)>>>0)):[],outputShape:Se?Array.from((w(),B).subarray(Number(Se)>>>0,Number(Ie)>>>0)):[],activation:Ee(yt)})},1094334:(s,l,h,f,v,C,P,z,H,K,ae,pe,Se,Ie)=>{e.bc("ConvTranspose",s,{format:z?"NHWC":"NCHW",autoPad:l,dilations:Array.from((w(),B).subarray(Number(h)>>>0,(Number(h)>>>0)+2>>>0)),group:f,kernelShape:Array.from((w(),B).subarray(Number(v)>>>0,(Number(v)>>>0)+2>>>0)),pads:Array.from((w(),B).subarray(Number(C)>>>0,(Number(C)>>>0)+4>>>0)),strides:Array.from((w(),B).subarray(Number(P)>>>0,(Number(P)>>>0)+2>>>0)),wIsConst:()=>!!(w(),N)[H>>>0],outputPadding:K?Array.from((w(),B).subarray(Number(K)>>>0,Number(ae)>>>0)):[],outputShape:pe?Array.from((w(),B).subarray(Number(pe)>>>0,Number(Se)>>>0)):[],activation:Ee(Ie)})},1094995:(s,l)=>{e.bc("GlobalAveragePool",s,{format:l?"NHWC":"NCHW"})},1095086:(s,l,h,f,v,C,P,z,H,K,ae,pe,Se,Ie)=>{e.bc("AveragePool",s,{format:Ie?"NHWC":"NCHW",auto_pad:l,ceil_mode:h,count_include_pad:f,storage_order:v,dilations:C?Array.from((w(),B).subarray(Number(C)>>>0,Number(P)>>>0)):[],kernel_shape:z?Array.from((w(),B).subarray(Number(z)>>>0,Number(H)>>>0)):[],pads:K?Array.from((w(),B).subarray(Number(K)>>>0,Number(ae)>>>0)):[],strides:pe?Array.from((w(),B).subarray(Number(pe)>>>0,Number(Se)>>>0)):[]})},1095565:(s,l)=>{e.bc("GlobalAveragePool",s,{format:l?"NHWC":"NCHW"})},1095656:(s,l,h,f,v,C,P,z,H,K,ae,pe,Se,Ie)=>{e.bc("AveragePool",s,{format:Ie?"NHWC":"NCHW",auto_pad:l,ceil_mode:h,count_include_pad:f,storage_order:v,dilations:C?Array.from((w(),B).subarray(Number(C)>>>0,Number(P)>>>0)):[],kernel_shape:z?Array.from((w(),B).subarray(Number(z)>>>0,Number(H)>>>0)):[],pads:K?Array.from((w(),B).subarray(Number(K)>>>0,Number(ae)>>>0)):[],strides:pe?Array.from((w(),B).subarray(Number(pe)>>>0,Number(Se)>>>0)):[]})},1096135:(s,l)=>{e.bc("GlobalMaxPool",s,{format:l?"NHWC":"NCHW"})},1096222:(s,l,h,f,v,C,P,z,H,K,ae,pe,Se,Ie)=>{e.bc("MaxPool",s,{format:Ie?"NHWC":"NCHW",auto_pad:l,ceil_mode:h,count_include_pad:f,storage_order:v,dilations:C?Array.from((w(),B).subarray(Number(C)>>>0,Number(P)>>>0)):[],kernel_shape:z?Array.from((w(),B).subarray(Number(z)>>>0,Number(H)>>>0)):[],pads:K?Array.from((w(),B).subarray(Number(K)>>>0,Number(ae)>>>0)):[],strides:pe?Array.from((w(),B).subarray(Number(pe)>>>0,Number(Se)>>>0)):[]})},1096697:(s,l)=>{e.bc("GlobalMaxPool",s,{format:l?"NHWC":"NCHW"})},1096784:(s,l,h,f,v,C,P,z,H,K,ae,pe,Se,Ie)=>{e.bc("MaxPool",s,{format:Ie?"NHWC":"NCHW",auto_pad:l,ceil_mode:h,count_include_pad:f,storage_order:v,dilations:C?Array.from((w(),B).subarray(Number(C)>>>0,Number(P)>>>0)):[],kernel_shape:z?Array.from((w(),B).subarray(Number(z)>>>0,Number(H)>>>0)):[],pads:K?Array.from((w(),B).subarray(Number(K)>>>0,Number(ae)>>>0)):[],strides:pe?Array.from((w(),B).subarray(Number(pe)>>>0,Number(Se)>>>0)):[]})},1097259:(s,l,h,f,v)=>{e.bc("Gemm",s,{alpha:l,beta:h,transA:f,transB:v})},1097363:s=>{e.bc("MatMul",s,void 0)},1097417:(s,l,h,f)=>{e.bc("ArgMax",s,{keepDims:!!l,selectLastIndex:!!h,axis:f})},1097525:(s,l,h,f)=>{e.bc("ArgMin",s,{keepDims:!!l,selectLastIndex:!!h,axis:f})},1097633:(s,l)=>{e.bc("Softmax",s,{axis:l})},1097696:(s,l)=>{e.bc("Concat",s,{axis:l})},1097756:(s,l,h,f,v)=>{e.bc("Split",s,{axis:l,numOutputs:h,splitSizes:f?Array.from((w(),B).subarray(Number(f)>>>0,Number(v)>>>0)):[]})},1097912:s=>{e.bc("Expand",s,void 0)},1097966:(s,l)=>{e.bc("Gather",s,{axis:Number(l)})},1098037:(s,l)=>{e.bc("GatherElements",s,{axis:Number(l)})},1098116:(s,l)=>{e.bc("GatherND",s,{batch_dims:Number(l)})},1098195:(s,l,h,f,v,C,P,z,H,K,ae)=>{e.bc("Resize",s,{antialias:l,axes:h?Array.from((w(),B).subarray(Number(h)>>>0,Number(f)>>>0)):[],coordinateTransformMode:Ee(v),cubicCoeffA:C,excludeOutside:P,extrapolationValue:z,keepAspectRatioPolicy:Ee(H),mode:Ee(K),nearestMode:Ee(ae)})},1098557:(s,l,h,f,v,C,P)=>{e.bc("Slice",s,{starts:l?Array.from((w(),B).subarray(Number(l)>>>0,Number(h)>>>0)):[],ends:f?Array.from((w(),B).subarray(Number(f)>>>0,Number(v)>>>0)):[],axes:C?Array.from((w(),B).subarray(Number(C)>>>0,Number(P)>>>0)):[]})},1098821:s=>{e.bc("Tile",s,void 0)},1098873:(s,l,h)=>{e.bc("InstanceNormalization",s,{epsilon:l,format:h?"NHWC":"NCHW"})},1098987:(s,l,h)=>{e.bc("InstanceNormalization",s,{epsilon:l,format:h?"NHWC":"NCHW"})},1099101:s=>{e.bc("Range",s,void 0)},1099154:(s,l)=>{e.bc("Einsum",s,{equation:Ee(l)})},1099235:(s,l,h,f,v)=>{e.bc("Pad",s,{mode:l,value:h,pads:f?Array.from((w(),B).subarray(Number(f)>>>0,Number(v)>>>0)):[]})},1099378:(s,l,h,f,v,C)=>{e.bc("BatchNormalization",s,{epsilon:l,momentum:h,spatial:!!v,trainingMode:!!f,format:C?"NHWC":"NCHW"})},1099547:(s,l,h,f,v,C)=>{e.bc("BatchNormalization",s,{epsilon:l,momentum:h,spatial:!!v,trainingMode:!!f,format:C?"NHWC":"NCHW"})},1099716:(s,l,h)=>{e.bc("CumSum",s,{exclusive:Number(l),reverse:Number(h)})},1099813:(s,l,h)=>{e.bc("DequantizeLinear",s,{axis:l,blockSize:h})},1099903:(s,l,h,f,v)=>{e.bc("GridSample",s,{align_corners:l,mode:Ee(h),padding_mode:Ee(f),format:v?"NHWC":"NCHW"})},1100073:(s,l,h,f,v)=>{e.bc("GridSample",s,{align_corners:l,mode:Ee(h),padding_mode:Ee(f),format:v?"NHWC":"NCHW"})},1100243:(s,l)=>{e.bc("ScatterND",s,{reduction:Ee(l)})},1100328:(s,l,h,f,v,C,P,z,H)=>{e.bc("Attention",s,{numHeads:l,isUnidirectional:h,maskFilterValue:f,scale:v,doRotary:C,qkvHiddenSizes:P?Array.from((w(),B).subarray(Number(z)>>>0,Number(z)+P>>>0)):[],pastPresentShareBuffer:!!H})},1100600:s=>{e.bc("BiasAdd",s,void 0)},1100655:s=>{e.bc("BiasSplitGelu",s,void 0)},1100716:s=>{e.bc("FastGelu",s,void 0)},1100772:(s,l,h,f,v,C,P,z,H,K,ae,pe,Se,Ie,yt,Gn)=>{e.bc("Conv",s,{format:pe?"NHWC":"NCHW",auto_pad:l,dilations:h?Array.from((w(),B).subarray(Number(h)>>>0,Number(f)>>>0)):[],group:v,kernel_shape:C?Array.from((w(),B).subarray(Number(C)>>>0,Number(P)>>>0)):[],pads:z?Array.from((w(),B).subarray(Number(z)>>>0,Number(H)>>>0)):[],strides:K?Array.from((w(),B).subarray(Number(K)>>>0,Number(ae)>>>0)):[],w_is_const:()=>!!(w(),N)[Number(Se)>>>0],activation:Ee(Ie),activation_params:yt?Array.from((w(),Q).subarray(Number(yt)>>>0,Number(Gn)>>>0)):[]})},1101356:s=>{e.bc("Gelu",s,void 0)},1101408:(s,l,h,f,v,C,P,z,H)=>{e.bc("GroupQueryAttention",s,{numHeads:l,kvNumHeads:h,scale:f,softcap:v,doRotary:C,rotaryInterleaved:P,smoothSoftmax:z,localWindowSize:H})},1101625:(s,l,h,f)=>{e.bc("LayerNormalization",s,{axis:l,epsilon:h,simplified:!!f})},1101736:(s,l,h,f)=>{e.bc("LayerNormalization",s,{axis:l,epsilon:h,simplified:!!f})},1101847:(s,l,h,f,v,C)=>{e.bc("MatMulNBits",s,{k:l,n:h,accuracyLevel:f,bits:v,blockSize:C})},1101974:(s,l,h,f,v,C)=>{e.bc("MultiHeadAttention",s,{numHeads:l,isUnidirectional:h,maskFilterValue:f,scale:v,doRotary:C})},1102133:(s,l)=>{e.bc("QuickGelu",s,{alpha:l})},1102197:(s,l,h,f,v)=>{e.bc("RotaryEmbedding",s,{interleaved:!!l,numHeads:h,rotaryEmbeddingDim:f,scale:v})},1102336:(s,l,h)=>{e.bc("SkipLayerNormalization",s,{epsilon:l,simplified:!!h})},1102438:(s,l,h)=>{e.bc("SkipLayerNormalization",s,{epsilon:l,simplified:!!h})},1102540:(s,l,h,f)=>{e.bc("GatherBlockQuantized",s,{gatherAxis:l,quantizeAxis:h,blockSize:f})},1102661:s=>{e.Id(s)},1102695:(s,l)=>e.Kd(Number(s),Number(l),e.$c.Nd,e.$c.errors)};function Lm(s,l,h){return vi(async()=>{await e.Gd(Number(s),Number(l),Number(h))})}function Wm(){return typeof wasmOffsetConverter<"u"}function Gm(s,l,h,f){var v=de();try{return oa(s,l,h,f)}catch(C){if(ue(v),C!==C+0)throw C;le(1,0)}}function Hm(s,l,h){var f=de();try{return ea(s,l,h)}catch(v){if(ue(f),v!==v+0)throw v;le(1,0)}}function Fm(s){var l=de();try{Yi(s)}catch(h){if(ue(l),h!==h+0)throw h;le(1,0)}}function qm(s,l){var h=de();try{return Ln(s,l)}catch(f){if(ue(h),f!==f+0)throw f;le(1,0)}}function Km(s,l,h){var f=de();try{Qi(s,l,h)}catch(v){if(ue(f),v!==v+0)throw v;le(1,0)}}function jm(s,l){var h=de();try{ia(s,l)}catch(f){if(ue(h),f!==f+0)throw f;le(1,0)}}function Zm(s,l,h,f,v,C,P){var z=de();try{return ra(s,l,h,f,v,C,P)}catch(H){if(ue(z),H!==H+0)throw H;le(1,0)}}function Qm(s,l,h,f,v,C){var P=de();try{Xi(s,l,h,f,v,C)}catch(z){if(ue(P),z!==z+0)throw z;le(1,0)}}function Ym(s,l,h,f){var v=de();try{na(s,l,h,f)}catch(C){if(ue(v),C!==C+0)throw C;le(1,0)}}function Xm(s,l,h,f,v){var C=de();try{Ji(s,l,h,f,v)}catch(P){if(ue(C),P!==P+0)throw P;le(1,0)}}function Jm(s,l,h,f,v,C,P){var z=de();try{sa(s,l,h,f,v,C,P)}catch(H){if(ue(z),H!==H+0)throw H;le(1,0)}}function ef(s,l,h,f,v,C,P){var z=de();try{ua(s,l,h,f,v,C,P)}catch(H){if(ue(z),H!==H+0)throw H;le(1,0)}}function tf(s,l,h,f,v,C,P,z){var H=de();try{pa(s,l,h,f,v,C,P,z)}catch(K){if(ue(H),K!==K+0)throw K;le(1,0)}}function rf(s,l,h,f,v){var C=de();try{return aa(s,l,h,f,v)}catch(P){if(ue(C),P!==P+0)throw P;le(1,0)}}function nf(s,l,h){var f=de();try{return ma(s,l,h)}catch(v){if(ue(f),v!==v+0)throw v;le(1,0)}}function of(s,l,h,f,v,C,P,z){var H=de();try{fa(s,l,h,f,v,C,P,z)}catch(K){if(ue(H),K!==K+0)throw K;le(1,0)}}function af(s,l,h,f,v,C,P,z,H,K,ae,pe){var Se=de();try{da(s,l,h,f,v,C,P,z,H,K,ae,pe)}catch(Ie){if(ue(Se),Ie!==Ie+0)throw Ie;le(1,0)}}function sf(s,l,h){var f=de();try{return ha(s,l,h)}catch(v){if(ue(f),v!==v+0)throw v;return le(1,0),0n}}function uf(s,l,h,f,v,C,P,z,H){var K=de();try{ta(s,l,h,f,v,C,P,z,H)}catch(ae){if(ue(K),ae!==ae+0)throw ae;le(1,0)}}function df(s){var l=de();try{return ga(s)}catch(h){if(ue(l),h!==h+0)throw h;le(1,0)}}function lf(s,l){var h=de();try{return Da(s,l)}catch(f){if(ue(h),f!==f+0)throw f;return le(1,0),0n}}function cf(s,l,h,f){var v=de();try{return ba(s,l,h,f)}catch(C){if(ue(v),C!==C+0)throw C;le(1,0)}}function pf(s){var l=de();try{return ya(s)}catch(h){if(ue(l),h!==h+0)throw h;return le(1,0),0n}}function mf(s,l,h,f){var v=de();try{return Sa(s,l,h,f)}catch(C){if(ue(v),C!==C+0)throw C;le(1,0)}}function ff(s,l,h,f,v){var C=de();try{return Ta(s,l,h,f,v)}catch(P){if(ue(C),P!==P+0)throw P;le(1,0)}}function hf(s,l,h,f,v,C){var P=de();try{return Ia(s,l,h,f,v,C)}catch(z){if(ue(P),z!==z+0)throw z;le(1,0)}}function gf(s,l,h,f,v,C){var P=de();try{return la(s,l,h,f,v,C)}catch(z){if(ue(P),z!==z+0)throw z;le(1,0)}}function bf(s,l,h,f,v,C){var P=de();try{return Ca(s,l,h,f,v,C)}catch(z){if(ue(P),z!==z+0)throw z;le(1,0)}}function yf(s,l,h,f,v,C,P,z){var H=de();try{return ca(s,l,h,f,v,C,P,z)}catch(K){if(ue(H),K!==K+0)throw K;le(1,0)}}function _f(s,l,h,f,v){var C=de();try{return Aa(s,l,h,f,v)}catch(P){if(ue(C),P!==P+0)throw P;return le(1,0),0n}}function wf(s,l,h,f){var v=de();try{return Ea(s,l,h,f)}catch(C){if(ue(v),C!==C+0)throw C;le(1,0)}}function vf(s,l,h,f){var v=de();try{return ka(s,l,h,f)}catch(C){if(ue(v),C!==C+0)throw C;le(1,0)}}function $f(s,l,h,f,v,C,P,z,H,K,ae,pe){var Se=de();try{return Pa(s,l,h,f,v,C,P,z,H,K,ae,pe)}catch(Ie){if(ue(Se),Ie!==Ie+0)throw Ie;le(1,0)}}function xf(s,l,h,f,v,C,P,z,H,K,ae){var pe=de();try{$a(s,l,h,f,v,C,P,z,H,K,ae)}catch(Se){if(ue(pe),Se!==Se+0)throw Se;le(1,0)}}function Sf(s,l,h,f,v,C,P,z,H,K,ae,pe,Se,Ie,yt,Gn){var Af=de();try{xa(s,l,h,f,v,C,P,z,H,K,ae,pe,Se,Ie,yt,Gn)}catch(Hn){if(ue(Af),Hn!==Hn+0)throw Hn;le(1,0)}}function Tf(s,l,h){var f=de();try{return _a(s,l,h)}catch(v){if(ue(f),v!==v+0)throw v;le(1,0)}}function If(s,l,h){var f=de();try{return wa(s,l,h)}catch(v){if(ue(f),v!==v+0)throw v;le(1,0)}}function Cf(s,l,h,f){var v=de();try{va(s,l,h,f)}catch(C){if(ue(v),C!==C+0)throw C;le(1,0)}}function Sr(){if(0<ge)Te=Sr;else if(o)_?.(e),ve();else{for(var s=De;0<s.length;)s.shift()(e);0<ge?Te=Sr:(e.calledRun=!0,E||(ve(),_?.(e)))}}return o||(ct=await be(),Sr()),e.PTR_SIZE=4,ce?e:new Promise((s,l)=>{_=s,S=l})}var Mf,Rf,ys=V(()=>{"use strict";Mf=gs,Rf=globalThis.self?.name?.startsWith("em-pthread");Rf&&gs()});var vs,to,Uf,We,$s,eo,Nf,Vf,xs,Lf,_s,Ss,ws,Ts,kr=V(()=>{"use strict";Er();vs=typeof location>"u"?void 0:location.origin,to=import.meta.url>"file:"&&import.meta.url<"file;",Uf=()=>{if(!!1){if(to){let t=URL;return new URL(new t("ort.bundle.min.mjs",import.meta.url).href,vs).href}return import.meta.url}},We=Uf(),$s=()=>{if(We&&!We.startsWith("blob:"))return We.substring(0,We.lastIndexOf("/")+1)},eo=(t,e)=>{try{let r=e??We;return(r?new URL(t,r):new URL(t)).origin===vs}catch{return!1}},Nf=(t,e)=>{let r=e??We;try{return(r?new URL(t,r):new URL(t)).href}catch{return}},Vf=(t,e)=>`${e??"./"}${t}`,xs=async t=>{let r=await(await fetch(t,{credentials:"same-origin"})).blob();return URL.createObjectURL(r)},Lf=async t=>(await import(/*webpackIgnore:true*/ /*@vite-ignore*/t)).default,_s=(hs(),er(fs)).default,Ss=async()=>{if(!We)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(eo(We))return[void 0,_s()];let t=await xs(We);return[t,_s(t)]},ws=(ys(),er(bs)).default,Ts=async(t,e,r,n)=>{let o=ws&&!(t||e);if(o)if(We)o=eo(We)||n&&!r;else if(n&&!r)o=!0;else throw new Error("cannot determine the script source URL.");if(o)return[void 0,ws];{let i="ort-wasm-simd-threaded.jsep.mjs",a=t??Nf(i,e),u=!!1&&r&&a&&!eo(a,e),d=u?await xs(a):a??Vf(i,e);return[u?d:void 0,await Lf(d)]}}});var ro,no,Nr,Is,Wf,Gf,Hf,Pr,ye,vt=V(()=>{"use strict";kr();no=!1,Nr=!1,Is=!1,Wf=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},Gf=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},Hf=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,19,1,17,0,65,1,253,15,65,2,253,15,65,3,253,15,253,147,2,11]))}catch{return!1}},Pr=async t=>{if(no)return Promise.resolve();if(Nr)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(Is)throw new Error("previous call to 'initializeWebAssembly()' failed.");Nr=!0;let e=t.initTimeout,r=t.numThreads;if(t.simd!==!1){if(t.simd==="relaxed"){if(!Hf())throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.")}else if(!Gf())throw new Error("WebAssembly SIMD is not supported in the current environment.")}let n=Wf();r>1&&!n&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+r+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),t.numThreads=r=1);let o=t.wasmPaths,i=typeof o=="string"?o:void 0,a=o?.mjs,u=a?.href??a,d=o?.wasm,c=d?.href??d,p=t.wasmBinary,[m,g]=await Ts(u,i,r>1,!!p||!!c),y=!1,b=[];if(e>0&&b.push(new Promise(_=>{setTimeout(()=>{y=!0,_()},e)})),b.push(new Promise((_,S)=>{let x={numThreads:r};if(p)x.wasmBinary=p,x.locateFile=$=>$;else if(c||i)x.locateFile=$=>c??i+$;else if(u&&u.indexOf("blob:")!==0)x.locateFile=$=>new URL($,u).href;else if(m){let $=$s();$&&(x.locateFile=T=>$+T)}g(x).then($=>{Nr=!1,no=!0,ro=$,_(),m&&URL.revokeObjectURL(m)},$=>{Nr=!1,Is=!0,S($)})})),await Promise.race(b),y)throw new Error(`WebAssembly backend initializing failed due to timeout: ${e}ms`)},ye=()=>{if(no&&ro)return ro;throw new Error("WebAssembly is not initialized yet.")}});var Ge,nr,me,Vr=V(()=>{"use strict";vt();Ge=(t,e)=>{let r=ye(),n=r.lengthBytesUTF8(t)+1,o=r._malloc(n);return r.stringToUTF8(t,o,n),e.push(o),o},nr=(t,e,r,n)=>{if(typeof t=="object"&&t!==null){if(r.has(t))throw new Error("Circular reference in options");r.add(t)}Object.entries(t).forEach(([o,i])=>{let a=e?e+o:o;if(typeof i=="object")nr(i,a+".",r,n);else if(typeof i=="string"||typeof i=="number")n(a,i.toString());else if(typeof i=="boolean")n(a,i?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof i}`)})},me=t=>{let e=ye(),r=e.stackSave();try{let n=e.PTR_SIZE,o=e.stackAlloc(2*n);e._OrtGetLastError(o,o+n);let i=Number(e.getValue(o,n===4?"i32":"i64")),a=e.getValue(o+n,"*"),u=a?e.UTF8ToString(a):"";throw new Error(`${t} ERROR_CODE: ${i}, ERROR_MESSAGE: ${u}`)}finally{e.stackRestore(r)}}});var Cs,As=V(()=>{"use strict";vt();Vr();Cs=t=>{let e=ye(),r=0,n=[],o=t||{};try{if(t?.logSeverityLevel===void 0)o.logSeverityLevel=2;else if(typeof t.logSeverityLevel!="number"||!Number.isInteger(t.logSeverityLevel)||t.logSeverityLevel<0||t.logSeverityLevel>4)throw new Error(`log severity level is not valid: ${t.logSeverityLevel}`);if(t?.logVerbosityLevel===void 0)o.logVerbosityLevel=0;else if(typeof t.logVerbosityLevel!="number"||!Number.isInteger(t.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${t.logVerbosityLevel}`);t?.terminate===void 0&&(o.terminate=!1);let i=0;return t?.tag!==void 0&&(i=Ge(t.tag,n)),r=e._OrtCreateRunOptions(o.logSeverityLevel,o.logVerbosityLevel,!!o.terminate,i),r===0&&me("Can't create run options."),t?.extra!==void 0&&nr(t.extra,"",new WeakSet,(a,u)=>{let d=Ge(a,n),c=Ge(u,n);e._OrtAddRunConfigEntry(r,d,c)!==0&&me(`Can't set a run config entry: ${a} - ${u}.`)}),[r,n]}catch(i){throw r!==0&&e._OrtReleaseRunOptions(r),n.forEach(a=>e._free(a)),i}}});var Ff,qf,Kf,Gt,jf,Es,ks=V(()=>{"use strict";vt();Vr();Ff=t=>{switch(t){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"layout":return 3;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${t}`)}},qf=t=>{switch(t){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${t}`)}},Kf=t=>{t.extra||(t.extra={}),t.extra.session||(t.extra.session={});let e=t.extra.session;e.use_ort_model_bytes_directly||(e.use_ort_model_bytes_directly="1"),t.executionProviders&&t.executionProviders.some(r=>(typeof r=="string"?r:r.name)==="webgpu")&&(t.enableMemPattern=!1)},Gt=(t,e,r,n)=>{let o=Ge(e,n),i=Ge(r,n);ye()._OrtAddSessionConfigEntry(t,o,i)!==0&&me(`Can't set a session config entry: ${e} - ${r}.`)},jf=async(t,e,r)=>{let n=e.executionProviders;for(let o of n){let i=typeof o=="string"?o:o.name,a=[];switch(i){case"webnn":if(i="WEBNN",Gt(t,"session.disable_quant_qdq","1",r),Gt(t,"session.disable_qdq_constant_folding","1",r),typeof o!="string"){let g=o?.deviceType;g&&Gt(t,"deviceType",g,r)}break;case"webgpu":if(i="JS",typeof o!="string"){let m=o;if(m?.preferredLayout){if(m.preferredLayout!=="NCHW"&&m.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${m.preferredLayout}`);Gt(t,"preferredLayout",m.preferredLayout,r)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${i}`)}let u=Ge(i,r),d=a.length,c=0,p=0;if(d>0){c=ye()._malloc(d*ye().PTR_SIZE),r.push(c),p=ye()._malloc(d*ye().PTR_SIZE),r.push(p);for(let m=0;m<d;m++)ye().setValue(c+m*ye().PTR_SIZE,a[m][0],"*"),ye().setValue(p+m*ye().PTR_SIZE,a[m][1],"*")}await ye()._OrtAppendExecutionProvider(t,u,c,p,d)!==0&&me(`Can't append execution provider: ${i}.`)}},Es=async t=>{let e=ye(),r=0,n=[],o=t||{};Kf(o);try{let i=Ff(o.graphOptimizationLevel??"all"),a=qf(o.executionMode??"sequential"),u=typeof o.logId=="string"?Ge(o.logId,n):0,d=o.logSeverityLevel??2;if(!Number.isInteger(d)||d<0||d>4)throw new Error(`log severity level is not valid: ${d}`);let c=o.logVerbosityLevel??0;if(!Number.isInteger(c)||c<0||c>4)throw new Error(`log verbosity level is not valid: ${c}`);let p=typeof o.optimizedModelFilePath=="string"?Ge(o.optimizedModelFilePath,n):0;if(r=e._OrtCreateSessionOptions(i,!!o.enableCpuMemArena,!!o.enableMemPattern,a,!!o.enableProfiling,0,u,d,c,p),r===0&&me("Can't create session options."),o.executionProviders&&await jf(r,o,n),o.enableGraphCapture!==void 0){if(typeof o.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${o.enableGraphCapture}`);Gt(r,"enableGraphCapture",o.enableGraphCapture.toString(),n)}if(o.freeDimensionOverrides)for(let[m,g]of Object.entries(o.freeDimensionOverrides)){if(typeof m!="string")throw new Error(`free dimension override name must be a string: ${m}`);if(typeof g!="number"||!Number.isInteger(g)||g<0)throw new Error(`free dimension override value must be a non-negative integer: ${g}`);let y=Ge(m,n);e._OrtAddFreeDimensionOverride(r,y,g)!==0&&me(`Can't set a free dimension override: ${m} - ${g}.`)}return o.extra!==void 0&&nr(o.extra,"",new WeakSet,(m,g)=>{Gt(r,m,g,n)}),[r,n]}catch(i){throw r!==0&&e._OrtReleaseSessionOptions(r)!==0&&me("Can't release session options."),n.forEach(a=>e._free(a)),i}}});var $t,rt,xt,Ht,or,Lr,Wr,oo,ee=V(()=>{"use strict";$t=t=>{switch(t){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${t}`)}},rt=t=>{switch(t){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${t}`)}},xt=(t,e)=>{let r=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][t],n=typeof e=="number"?e:e.reduce((o,i)=>o*i,1);return r>0?Math.ceil(n*r):void 0},Ht=t=>{switch(t){case"float16":return typeof Float16Array<"u"?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${t}`)}},or=t=>{switch(t){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${t}`)}},Lr=t=>t==="float32"||t==="float16"||t==="int32"||t==="int64"||t==="uint32"||t==="uint8"||t==="bool"||t==="uint4"||t==="int4",Wr=t=>t==="float32"||t==="float16"||t==="int32"||t==="int64"||t==="uint32"||t==="uint64"||t==="int8"||t==="uint8"||t==="bool"||t==="uint4"||t==="int4",oo=t=>{switch(t){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;case"ml-tensor":return 5;default:throw new Error(`unsupported data location: ${t}`)}}});var ir,io=V(()=>{"use strict";Er();ir=async t=>{if(typeof t=="string")if(!1)try{let{readFile:e}=qn("node:fs/promises");return new Uint8Array(await e(t))}catch(e){if(e.code==="ERR_FS_FILE_TOO_LARGE"){let{createReadStream:r}=qn("node:fs"),n=r(t),o=[];for await(let i of n)o.push(i);return new Uint8Array(Buffer.concat(o))}throw e}else{let e=await fetch(t);if(!e.ok)throw new Error(`failed to load external data file: ${t}`);let r=e.headers.get("Content-Length"),n=r?parseInt(r,10):0;if(n<1073741824)return new Uint8Array(await e.arrayBuffer());{if(!e.body)throw new Error(`failed to load external data file: ${t}, no response body.`);let o=e.body.getReader(),i;try{i=new ArrayBuffer(n)}catch(u){if(u instanceof RangeError){let d=Math.ceil(n/65536);i=new WebAssembly.Memory({initial:d,maximum:d}).buffer}else throw u}let a=0;for(;;){let{done:u,value:d}=await o.read();if(u)break;let c=d.byteLength;new Uint8Array(i,a,c).set(d),a+=c}return new Uint8Array(i,0,n)}}else return t instanceof Blob?new Uint8Array(await t.arrayBuffer()):t instanceof Uint8Array?t:new Uint8Array(t)}});var Zf,Qf,Ps,Ds,Gr,Yf,se,nt=V(()=>{"use strict";ee();Zf=["V","I","W","E","F"],Qf=(t,e)=>{console.log(`[${Zf[t]},${new Date().toISOString()}]${e}`)},Gr=(t,e)=>{Ps=t,Ds=e},Yf=(t,e)=>{let r=or(t),n=or(Ps);r>=n&&Qf(r,typeof e=="function"?e():e)},se=(...t)=>{Ds&&Yf(...t)}});var ao,ot,k,Bt,Hr,Os,Bs,te=V(()=>{"use strict";ao=class{static calcMatMulShape(e,r){return e[1]!==r[0]?void 0:[e[0],r[1]]}},ot=class{static calcShape(e,r,n=!1){let o=e.length,i=r.length;if(o===0)return r;if(i===0)return e;let a=Math.max(e.length,r.length),u=new Array(a);if(n){if(o<2||i<2)return;let d=ao.calcMatMulShape([e[o-2],e[o-1]],[r[i-2],r[i-1]]);if(d===void 0)return;[u[a-2],u[a-1]]=d}for(let d=n?3:1;d<=a;d++){let c=o-d<0?1:e[o-d],p=i-d<0?1:r[i-d];if(c!==p&&c>1&&p>1)return;let m=Math.max(c,p);if(c&&p)u[a-d]=Math.max(c,p);else{if(m>1)return;u[a-d]=0}}return u}static isValidBroadcast(e,r){let n=e.length,o=r.length;if(n>o)return!1;for(let i=1;i<=n;i++)if(e[n-i]!==1&&e[n-i]!==r[o-i])return!1;return!0}},k=class t{static size(e){return t.getSizeFromDimensionRange(e,0,e.length)}static convertShape(e,r=4){let n=e.length;if(n===0)return[];let o=new Array(n),i=n-1;for(;i>=0;){if(e[i]%r===0){o[i]=e[i]/r;break}if(r%e[i]!==0)throw new Error("cannot convert shape");o[i]=1,r/=e[i],i--}for(i--;i>=0;i--)o[i]=e[i];return o}static sizeFromDimension(e,r){if(r<0||r>e.length)throw new Error(`invalid dimension of ${r} for sizeFromDimension as Tensor has ${e.length} dimensions.`);return t.getSizeFromDimensionRange(e,r,e.length)}static sizeToDimension(e,r){if(r<0||r>e.length)throw new Error(`invalid dimension of ${r} for sizeToDimension as Tensor has ${e.length} dimensions.`);return t.getSizeFromDimensionRange(e,0,r)}static getSizeFromDimensionRange(e,r,n){let o=1;for(let i=r;i<n;i++){if(e[i]<0)throw new Error("cannot get valid size from specified dimension range. Most likely the range contains negative values in them.");o*=Number(e[i])}return o}static computeStrides(e){let r=e.length;if(r===0)return[];if(r===1)return[1];let n=new Array(r);n[r-1]=1,n[r-2]=e[r-1];for(let o=r-3;o>=0;--o)n[o]=n[o+1]*e[o+1];return n}static normalizeAxis(e,r){if(e<-r&&e>=r)throw new Error("unsupported axis for this operation.");return e<0?e+r:e}static normalizeAxes(e,r){return e.map(n=>this.normalizeAxis(n,r??e.length))}static sortBasedOnPerm(e,r){return r?r.map(n=>e[n]):e.slice().reverse()}static padShape(e,r){let n=e.length;return e.map((o,i)=>o+r[i]+r[i+n])}static areEqual(e,r){return e.length!==r.length?!1:e.every((n,o)=>n===r[o])}},Bt=class t{static adjustPoolAttributes(e,r,n,o,i,a){if(!e&&n.length!==r.length-2)throw new Error("length of specified kernel shapes should be 2 less than length of input dimensions");if(e)for(let u=0;u<r.length-2;u++)u>=n.length?n.push(r[u+2]):n[u]=r[u+2];for(let u=0;u<n.length;u++)if(u<o.length){if(o[u]<0)throw new Error("strides should be greater than or equal to 1")}else o.push(1);for(let u=0;u<n.length;u++)if(u<i.length){if(i[u]<0)throw new Error("dilations should be greater than or equal to 1")}else i.push(1);for(let u=0;u<n.length*2;u++)if(u<a.length){if(a[u]<0)throw new Error("pad should be greater than or equal to 1")}else a.push(0);for(let u=0;u<n.length;u++){if(n[u]<=0)throw new Error("kernel shapes need to be greater than 0");if(a[u]>=n[u]||a[u+n.length]>=n[u])throw new Error("pads should be smaller than kernel")}}static adjustPadsBasedOnAutoPad(e,r,n,o,i,a,u){if(u){if(i.length!==2*(e.length-2))throw new Error("length of pads should be twice the length of data dimensions");if(r.length!==e.length-2)throw new Error("length of strides should be the length of data dimensions");if(o.length!==e.length-2)throw new Error("length of kernel shapes should be the length of data dimensions");for(let d=0;d<e.length-2;d++)t.adjustPadAndReturnShape(e[d+(a?1:2)],r[d],n[d],o[d],i,d,d+e.length-2,u)}}static computePoolOutputShape(e,r,n,o,i,a,u,d=0){if(r.length<=0)throw new Error("input shape must be of size greater than 0");let c=[r[0],r[1]];return t.computeShapeHelper(e,r,c,n,o,i,a,u,d),c}static computeConvOutputShape(e,r,n,o,i,a,u){if(e.length<=0||r.length<=0)throw new Error("invalid input tensor dims or invalid filter tensor dims");let d=[e[0],r[0]];return t.computeShapeHelper(!1,e,d,n,o,i,a,u),d}static computeShapeHelper(e,r,n,o,i,a,u,d,c=0){if(e)for(let p=0;p<r.length-2;p++)n.push(1);else for(let p=0;p<r.length-2;p++)n.push(t.adjustPadAndReturnShape(r[p+2],o[p],i[p],a[p],u,p,p+r.length-2,d,c))}static computeOutputSize(e,r,n,o,i){let a=Math.floor(e/r)+1;return i===1&&(a=Math.ceil(e/r)+1,(a-1)*r>=n+o&&(a-=1)),a}static adjustPadAndReturnShape(e,r,n,o,i,a,u,d,c=0){let p=n*(o-1)+1;if(d&&d!=="NOTSET")switch(d){case"VALID":return i[a]=0,i[u]=0,t.computeOutputSize(e-p,r,e,0,c);case"SAME_LOWER":case"SAME_UPPER":if(n!==1)throw new Error("Dilation not supported for SAME_UPPER or SAME_LOWER");{let g=(Math.floor((e+r-1)/r)-1)*r+o-e;return i[a]=Math.floor(d==="SAME_LOWER"?(g+1)/2:g/2),i[u]=g-i[a],t.computeOutputSize(e+i[a]+i[u]-p,r,e,i[a],c)}default:throw new Error("Unsupported AutoPad type")}else return t.computeOutputSize(e+i[a]+i[u]-p,r,e,i[a],c)}},Hr=class{static getShapeOfGemmResult(e,r,n,o,i){if(e.length!==2||n.length!==2)throw new Error("shape need to be of size 2");let a,u,d;r?(a=e[1],u=e[0]):(a=e[0],u=e[1]);let c=-1;if(o?(d=n[0],c=1):(d=n[1],c=0),n[c]!==u)throw new Error("dimension mismatch");if(a<=0||d<=0||u<=0)throw new Error("invalid shape specified");if(i&&!ot.isValidBroadcast(i,[a,d]))throw new Error("gemm: invalid bias shape for broadcast");return[a,d,u]}},Os=-34028234663852886e22,Bs=34028234663852886e22});var Fr,so=V(()=>{"use strict";ee();Fr=(t,e)=>new(Ht(e))(t)});var Ms,Xf,Rs,Jf,zs,eh,Us,qr,Kr,uo,Ns,Vs=V(()=>{"use strict";ee();nt();Ms=new Map([["float32",32],["float16",16],["int32",32],["uint32",32],["int64",64],["uint64",64],["int8",8],["uint8",8],["int4",4],["uint4",4]]),Xf=(t,e)=>{if(e==="int32")return t;let r=Ms.get(e);if(!r)throw new Error(`WebNN backend does not support data type: ${e}`);let n=r/8;if(t.byteLength%n!==0)throw new Error(`Invalid Uint8Array length - must be a multiple of ${n}.`);let o=t.byteLength/n,i=new(Ht(e))(t.buffer,t.byteOffset,o);switch(e){case"int64":case"uint64":{let a=new Int32Array(o);for(let u=0;u<o;u++){let d=i[u];if(d>2147483647n||d<-2147483648n)throw new Error("Can not convert int64 data to int32 - value out of range.");a[u]=Number(d)}return new Uint8Array(a.buffer)}case"int8":case"uint8":case"uint32":{if(e==="uint32"&&i.some(u=>u>2147483647))throw new Error("Can not convert uint32 data to int32 - value out of range.");let a=Int32Array.from(i,Number);return new Uint8Array(a.buffer)}default:throw new Error(`Unsupported data conversion from ${e} to 'int32'`)}},Rs=(t,e)=>{if(e==="int32")return t;if(t.byteLength%4!==0)throw new Error("Invalid Uint8Array length - must be a multiple of 4 (int32).");let r=t.byteLength/4,n=new Int32Array(t.buffer,t.byteOffset,r);switch(e){case"int64":{let o=BigInt64Array.from(n,BigInt);return new Uint8Array(o.buffer)}case"uint64":{if(n.some(i=>i<0))throw new Error("Can not convert int32 data to uin64 - negative value found.");let o=BigUint64Array.from(n,BigInt);return new Uint8Array(o.buffer)}case"int8":{if(n.some(i=>i<-128||i>127))throw new Error("Can not convert int32 data to int8 - value out of range.");let o=Int8Array.from(n,Number);return new Uint8Array(o.buffer)}case"uint8":{if(n.some(o=>o<0||o>255))throw new Error("Can not convert int32 data to uint8 - value out of range.");return Uint8Array.from(n,Number)}case"uint32":{if(n.some(i=>i<0))throw new Error("Can not convert int32 data to uint32 - negative value found.");let o=Uint32Array.from(n,Number);return new Uint8Array(o.buffer)}default:throw new Error(`Unsupported data conversion from 'int32' to ${e}`)}},Jf=1,zs=()=>Jf++,eh=new Map([["int8","int32"],["uint8","int32"],["uint32","int32"],["int64","int32"]]),Us=(t,e)=>{let r=Ms.get(t);if(!r)throw new Error(`WebNN backend does not support data type: ${t}`);return e.length>0?Math.ceil(e.reduce((n,o)=>n*o)*r/8):0},qr=class{constructor(e){this.isDataConverted=!1;let{sessionId:r,context:n,tensor:o,dataType:i,shape:a,fallbackDataType:u}=e;this.sessionId=r,this.mlContext=n,this.mlTensor=o,this.dataType=i,this.tensorShape=a,this.fallbackDataType=u}get tensor(){return this.mlTensor}get type(){return this.dataType}get fallbackType(){return this.fallbackDataType}get shape(){return this.tensorShape}get byteLength(){return Us(this.dataType,this.tensorShape)}destroy(){se("verbose",()=>"[WebNN] TensorWrapper.destroy"),this.mlTensor.destroy()}write(e){this.mlContext.writeTensor(this.mlTensor,e)}async read(e){if(this.fallbackDataType){let r=await this.mlContext.readTensor(this.mlTensor),n=Rs(new Uint8Array(r),this.dataType);if(e){(e instanceof ArrayBuffer?new Uint8Array(e):new Uint8Array(e.buffer,e.byteOffset,e.byteLength)).set(n);return}else return new Uint8Array(n).buffer}else return e?this.mlContext.readTensor(this.mlTensor,e):this.mlContext.readTensor(this.mlTensor)}canReuseTensor(e,r,n){return this.mlContext===e&&this.dataType===r&&this.tensorShape.length===n.length&&this.tensorShape.every((o,i)=>o===n[i])}setIsDataConverted(e){this.isDataConverted=e}},Kr=class{constructor(e,r){this.tensorManager=e;this.wrapper=r}get tensorWrapper(){return this.wrapper}releaseTensor(){this.tensorWrapper&&(this.tensorManager.releaseTensor(this.tensorWrapper),this.wrapper=void 0)}async ensureTensor(e,r,n,o){let i=this.tensorManager.getMLContext(e),a=this.tensorManager.getMLOpSupportLimits(e),u;if(!a?.input.dataTypes.includes(r)){if(u=eh.get(r),!u||!a?.input.dataTypes.includes(u))throw new Error(`WebNN backend does not support data type: ${r}`);se("verbose",()=>`[WebNN] TensorIdTracker.ensureTensor: fallback dataType from ${r} to ${u}`)}if(this.wrapper){if(this.wrapper.canReuseTensor(i,r,n))return this.wrapper.tensor;if(o){if(this.wrapper.byteLength!==Us(r,n))throw new Error("Unable to copy data to tensor with different size.");this.activeUpload=new Uint8Array(await this.wrapper.read())}this.tensorManager.releaseTensor(this.wrapper)}let d=typeof MLTensorUsage>"u"?void 0:MLTensorUsage.READ|MLTensorUsage.WRITE;return this.wrapper=await this.tensorManager.getCachedTensor(e,r,n,d,!0,!0,u),o&&this.activeUpload&&(this.wrapper.write(this.activeUpload),this.activeUpload=void 0),this.wrapper.tensor}upload(e){let r=e;if(this.wrapper){if(this.wrapper.fallbackType)if(this.wrapper.fallbackType==="int32")r=Xf(e,this.wrapper.type),this.wrapper.setIsDataConverted(!0);else throw new Error(`Unsupported fallback data type: ${this.wrapper.fallbackType}`);if(e.byteLength===this.wrapper.byteLength){this.wrapper.write(r);return}else se("verbose",()=>"Data size does not match tensor size. Releasing tensor."),this.releaseTensor()}this.activeUpload?this.activeUpload.set(r):this.activeUpload=new Uint8Array(r)}async download(e){if(this.activeUpload){let r=this.wrapper?.isDataConverted?Rs(this.activeUpload,this.wrapper?.type):this.activeUpload;if(e){e instanceof ArrayBuffer?new Uint8Array(e).set(r):new Uint8Array(e.buffer,e.byteOffset,e.byteLength).set(r);return}else return r.buffer}if(!this.wrapper)throw new Error("Tensor has not been created.");return e?this.wrapper.read(e):this.wrapper.read()}},uo=class{constructor(e){this.backend=e;this.tensorTrackersById=new Map;this.freeTensors=[];this.externalTensors=new Set}getMLContext(e){let r=this.backend.getMLContext(e);if(!r)throw new Error("MLContext not found for session.");return r}getMLOpSupportLimits(e){return this.backend.getMLOpSupportLimits(e)}reserveTensorId(){let e=zs();return this.tensorTrackersById.set(e,new Kr(this)),e}releaseTensorId(e){let r=this.tensorTrackersById.get(e);r&&(this.tensorTrackersById.delete(e),r.tensorWrapper&&this.releaseTensor(r.tensorWrapper))}async ensureTensor(e,r,n,o,i){se("verbose",()=>`[WebNN] TensorManager.ensureTensor {tensorId: ${r}, dataType: ${n}, shape: ${o}, copyOld: ${i}}`);let a=this.tensorTrackersById.get(r);if(!a)throw new Error("Tensor not found.");return a.ensureTensor(e,n,o,i)}upload(e,r){let n=this.tensorTrackersById.get(e);if(!n)throw new Error("Tensor not found.");n.upload(r)}async download(e,r){se("verbose",()=>`[WebNN] TensorManager.download {tensorId: ${e}, dstBuffer: ${r?.byteLength}}`);let n=this.tensorTrackersById.get(e);if(!n)throw new Error("Tensor not found.");return n.download(r)}releaseTensorsForSession(e){for(let r of this.freeTensors)r.sessionId===e&&r.destroy();this.freeTensors=this.freeTensors.filter(r=>r.sessionId!==e)}registerTensor(e,r,n,o){let i=this.getMLContext(e),a=zs(),u=new qr({sessionId:e,context:i,tensor:r,dataType:n,shape:o});return this.tensorTrackersById.set(a,new Kr(this,u)),this.externalTensors.add(u),a}async getCachedTensor(e,r,n,o,i,a,u){let d=this.getMLContext(e);for(let[p,m]of this.freeTensors.entries())if(m.canReuseTensor(d,r,n)){se("verbose",()=>`[WebNN] Reusing tensor {dataType: ${r}, ${u?`fallbackDataType: ${u},`:""} shape: ${n}`);let g=this.freeTensors.splice(p,1)[0];return g.sessionId=e,g}se("verbose",()=>`[WebNN] MLContext.createTensor {dataType: ${r}, ${u?`fallbackDataType: ${u},`:""} shape: ${n}}`);let c=await d.createTensor({dataType:u??r,shape:n,dimensions:n,usage:o,writable:i,readable:a});return new qr({sessionId:e,context:d,tensor:c,dataType:r,shape:n,fallbackDataType:u})}releaseTensor(e){this.externalTensors.has(e)&&this.externalTensors.delete(e),this.freeTensors.push(e)}},Ns=(...t)=>new uo(...t)});var jr,th,Zr,Ls=V(()=>{"use strict";ee();vt();so();Vs();nt();jr=new Map([[1,"float32"],[10,"float16"],[6,"int32"],[12,"uint32"],[7,"int64"],[13,"uint64"],[22,"int4"],[21,"uint4"],[3,"int8"],[2,"uint8"],[9,"uint8"]]),th=(t,e)=>{if(t===e)return!0;if(t===void 0||e===void 0)return!1;let r=Object.keys(t).sort(),n=Object.keys(e).sort();return r.length===n.length&&r.every((o,i)=>o===n[i]&&t[o]===e[o])},Zr=class{constructor(e){this.tensorManager=Ns(this);this.mlContextBySessionId=new Map;this.sessionIdsByMLContext=new Map;this.mlContextCache=[];this.sessionGraphInputs=new Map;this.sessionGraphOutputs=new Map;this.temporaryGraphInputs=[];this.temporaryGraphOutputs=[];this.temporarySessionTensorIds=new Map;this.mlOpSupportLimitsBySessionId=new Map;Gr(e.logLevel,!!e.debug)}get currentSessionId(){if(this.activeSessionId===void 0)throw new Error("No active session");return this.activeSessionId}onRunStart(e){se("verbose",()=>`[WebNN] onRunStart {sessionId: ${e}}`),this.activeSessionId=e}onRunEnd(e){se("verbose",()=>`[WebNN] onRunEnd {sessionId: ${e}}`);let r=this.temporarySessionTensorIds.get(e);if(r){for(let n of r)se("verbose",()=>`[WebNN] releasing temporary tensor {tensorId: ${n}}`),this.tensorManager.releaseTensorId(n);this.temporarySessionTensorIds.delete(e),this.activeSessionId=void 0}}async createMLContext(e){if(e instanceof GPUDevice){let n=this.mlContextCache.findIndex(o=>o.gpuDevice===e);if(n!==-1)return this.mlContextCache[n].mlContext;{let o=await navigator.ml.createContext(e);return this.mlContextCache.push({gpuDevice:e,mlContext:o}),o}}else if(e===void 0){let n=this.mlContextCache.findIndex(o=>o.options===void 0&&o.gpuDevice===void 0);if(n!==-1)return this.mlContextCache[n].mlContext;{let o=await navigator.ml.createContext();return this.mlContextCache.push({mlContext:o}),o}}let r=this.mlContextCache.findIndex(n=>th(n.options,e));if(r!==-1)return this.mlContextCache[r].mlContext;{let n=await navigator.ml.createContext(e);return this.mlContextCache.push({options:e,mlContext:n}),n}}registerMLContext(e,r){this.mlContextBySessionId.set(e,r);let n=this.sessionIdsByMLContext.get(r);n||(n=new Set,this.sessionIdsByMLContext.set(r,n)),n.add(e),this.mlOpSupportLimitsBySessionId.has(e)||this.mlOpSupportLimitsBySessionId.set(e,r.opSupportLimits()),this.temporaryGraphInputs.length>0&&(this.sessionGraphInputs.set(e,this.temporaryGraphInputs),this.temporaryGraphInputs=[]),this.temporaryGraphOutputs.length>0&&(this.sessionGraphOutputs.set(e,this.temporaryGraphOutputs),this.temporaryGraphOutputs=[])}onReleaseSession(e){this.sessionGraphInputs.delete(e),this.sessionGraphOutputs.delete(e);let r=this.mlContextBySessionId.get(e);if(!r)return;this.tensorManager.releaseTensorsForSession(e),this.mlContextBySessionId.delete(e),this.mlOpSupportLimitsBySessionId.delete(e);let n=this.sessionIdsByMLContext.get(r);if(n.delete(e),n.size===0){this.sessionIdsByMLContext.delete(r);let o=this.mlContextCache.findIndex(i=>i.mlContext===r);o!==-1&&this.mlContextCache.splice(o,1)}}getMLContext(e){return this.mlContextBySessionId.get(e)}getMLOpSupportLimits(e){return this.mlOpSupportLimitsBySessionId.get(e)}reserveTensorId(){return this.tensorManager.reserveTensorId()}releaseTensorId(e){se("verbose",()=>`[WebNN] releaseTensorId {tensorId: ${e}}`),this.tensorManager.releaseTensorId(e)}async ensureTensor(e,r,n,o,i){let a=jr.get(n);if(!a)throw new Error(`Unsupported ONNX data type: ${n}`);return this.tensorManager.ensureTensor(e??this.currentSessionId,r,a,o,i)}async createTemporaryTensor(e,r,n){se("verbose",()=>`[WebNN] createTemporaryTensor {onnxDataType: ${r}, shape: ${n}}`);let o=jr.get(r);if(!o)throw new Error(`Unsupported ONNX data type: ${r}`);let i=this.tensorManager.reserveTensorId();await this.tensorManager.ensureTensor(e,i,o,n,!1);let a=this.temporarySessionTensorIds.get(e);return a?a.push(i):this.temporarySessionTensorIds.set(e,[i]),i}uploadTensor(e,r){if(!ye().shouldTransferToMLTensor)throw new Error("Trying to upload to a MLTensor while shouldTransferToMLTensor is false");se("verbose",()=>`[WebNN] uploadTensor {tensorId: ${e}, data: ${r.byteLength}}`),this.tensorManager.upload(e,r)}async downloadTensor(e,r){return this.tensorManager.download(e,r)}createMLTensorDownloader(e,r){return async()=>{let n=await this.tensorManager.download(e);return Fr(n,r)}}registerMLTensor(e,r,n,o){let i=jr.get(n);if(!i)throw new Error(`Unsupported ONNX data type: ${n}`);let a=this.tensorManager.registerTensor(e,r,i,o);return se("verbose",()=>`[WebNN] registerMLTensor {tensor: ${r}, dataType: ${i}, dimensions: ${o}} -> {tensorId: ${a}}`),a}registerGraphInput(e){this.temporaryGraphInputs.push(e)}registerGraphOutput(e){this.temporaryGraphOutputs.push(e)}isGraphInput(e,r){let n=this.sessionGraphInputs.get(e);return n?n.includes(r):!1}isGraphOutput(e,r){let n=this.sessionGraphOutputs.get(e);return n?n.includes(r):!1}isGraphInputOutputTypeSupported(e,r,n=!0){let o=jr.get($t(r)),i=this.mlOpSupportLimitsBySessionId.get(e);return typeof o>"u"?!1:n?!!i?.input.dataTypes.includes(o):!!i?.output.dataTypes.includes(o)}flush(){}}});var Qr=V(()=>{"use strict"});var Ws,lo,co,rh,nh,Gs,mo,po,Fs,qs=V(()=>{"use strict";nt();Qr();Ws=new Map([[64,250],[128,200],[256,200],[512,200],[2048,230],[4096,200],[8192,50],[16384,50],[32768,50],[65536,50],[131072,50],[262144,50],[524288,50],[1048576,50],[2097152,30],[4194304,20],[8388608,10],[12582912,10],[16777216,10],[26214400,15],[33554432,22],[44236800,2],[58982400,6],[67108864,6],[134217728,6],[167772160,6]]),lo=[],co=t=>Math.ceil(Number(t)/16)*16,rh=t=>{for(let e=0;e<lo.length;e++){let r=lo[e];if(t<=r)return r}return Math.ceil(t/16)*16},nh=1,Gs=()=>nh++,mo=async(t,e,r,n)=>{let o=co(r),i=t.device.createBuffer({size:o,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let a=t.getCommandEncoder();t.endComputePass(),a.copyBufferToBuffer(e,0,i,0,o),t.flush(),await i.mapAsync(GPUMapMode.READ);let u=i.getMappedRange();if(n){let d=n();return d.set(new Uint8Array(u,0,r)),d}else return new Uint8Array(u.slice(0,r))}finally{i.destroy()}},po=class{constructor(e){this.backend=e;this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.buffersPending=[],this.capturedPendingBuffers=new Map;for(let[r]of Ws)lo.push(r),this.freeBuffers.set(r,[]),this.freeUniformBuffers.set(r,[]);this.sessionCount=0}upload(e,r){let n=r.buffer,o=r.byteOffset,i=r.byteLength,a=co(i),u=this.storageCache.get(e);if(!u)throw new Error("gpu data for uploading does not exist");if(Number(u.originalSize)!==i)throw new Error(`inconsistent data size. gpu data size=${u.originalSize}, data size=${i}`);if(a===i&&o%4===0)this.backend.device.queue.writeBuffer(u.gpuData.buffer,0,n,o,i);else{let d=new Uint8Array(a);d.set(r),this.backend.device.queue.writeBuffer(u.gpuData.buffer,0,d,0,a)}se("verbose",()=>`[WebGPU] GpuDataManager.upload(id=${e})`)}memcpy(e,r){let n=this.storageCache.get(e);if(!n)throw new Error("source gpu data for memcpy does not exist");let o=this.storageCache.get(r);if(!o)throw new Error("destination gpu data for memcpy does not exist");if(n.originalSize!==o.originalSize)throw new Error("inconsistent source and destination gpu data size");let i=co(n.originalSize),a=this.backend.getCommandEncoder();this.backend.endComputePass(),a.copyBufferToBuffer(n.gpuData.buffer,0,o.gpuData.buffer,0,i)}registerExternalBuffer(e,r,n){let o;if(n){if(o=n[0],e===n[1])return se("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${r}) => id=${o}, buffer is the same, skip.`),o;if(this.backend.capturedCommandList.has(this.backend.currentSessionId))throw new Error(`Registering a different external buffer under graph capture mode is not supported yet.
             Please use the previous external buffer!`)}else o=Gs();return this.storageCache.set(o,{gpuData:{id:o,type:0,buffer:e},originalSize:r}),se("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${r}) => id=${o}, registered.`),o}unregisterExternalBuffer(e){e!==void 0&&(this.storageCache.delete(e),se("verbose",()=>`[WebGPU] GpuDataManager.unregisterExternalBuffer() => id=${e}`))}create(e,r=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST){let n=rh(e),o,i=(r&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE,a=(r&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM;if(i||a){let c=(i?this.freeBuffers:this.freeUniformBuffers).get(n);c?c.length>0?o=c.pop():o=this.backend.device.createBuffer({size:n,usage:r}):o=this.backend.device.createBuffer({size:n,usage:r})}else o=this.backend.device.createBuffer({size:n,usage:r});let u={id:Gs(),type:0,buffer:o};return this.storageCache.set(u.id,{gpuData:u,originalSize:Number(e)}),se("verbose",()=>`[WebGPU] GpuDataManager.create(size=${e}) => id=${u.id}`),u}get(e){return this.storageCache.get(e)?.gpuData}release(e){let r=typeof e=="bigint"?Number(e):e,n=this.storageCache.get(r);if(!n){if(this.storageCache.size===0)return 0;throw new Error("releasing data does not exist")}return se("verbose",()=>`[WebGPU] GpuDataManager.release(id=${r}), gpuDataId=${n.gpuData.id}`),this.storageCache.delete(r),this.buffersPending.push(n.gpuData.buffer),n.originalSize}async download(e,r){let n=this.storageCache.get(Number(e));if(!n)throw new Error("data does not exist");await mo(this.backend,n.gpuData.buffer,n.originalSize,r)}refreshPendingBuffers(){if(this.buffersPending.length!==0)if(this.backend.sessionStatus==="default"){for(let e of this.buffersPending){let r=Ws.get(e.size);if((e.usage&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE){let n=this.freeBuffers.get(e.size)||[];r===void 0||n.length>=r?e.destroy():n.push(e)}else if((e.usage&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM){let n=this.freeUniformBuffers.get(e.size)||[];r===void 0||n.length>=r?e.destroy():n.push(e)}else e.destroy()}this.buffersPending=[]}else{let e=this.capturedPendingBuffers.get(this.backend.currentSessionId);e||(e=[],this.capturedPendingBuffers.set(this.backend.currentSessionId,e));for(let r of this.buffersPending)e.push(r);this.buffersPending=[]}}dispose(){this.freeBuffers.forEach(e=>{e.forEach(r=>{r.destroy()})}),this.freeUniformBuffers.forEach(e=>{e.forEach(r=>{r.destroy()})}),this.storageCache.forEach(e=>{e.gpuData.buffer.destroy()}),this.capturedPendingBuffers.forEach(e=>{e.forEach(r=>{r.destroy()})}),this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.capturedPendingBuffers=new Map}onCreateSession(){this.sessionCount+=1}onReleaseSession(e){let r=this.capturedPendingBuffers.get(e);r&&(r.forEach(n=>{n.destroy()}),this.capturedPendingBuffers.delete(e)),this.sessionCount-=1,this.sessionCount===0&&(se("warning",()=>"[WebGPU] Clearing webgpu buffer cache"),this.storageCache.forEach(n=>{n.gpuData.buffer.destroy()}),this.storageCache=new Map)}},Fs=(...t)=>new po(...t)});var fo,J,Ce=V(()=>{"use strict";fo=class{constructor(e){Object.assign(this,e)}get cacheKey(){return this.key||(this.key=Object.getOwnPropertyNames(this).sort().map(e=>`${this[e]}`).join(";")),this.key}},J=t=>new fo(t)});var zt,go,we,Ae,W,fe,bo,Mt,Ze,j,Yr,D,R,Ks,Xr,ho,js,oe=V(()=>{"use strict";ee();te();zt=64,go=(t,e)=>{if(e===3)throw new Error("vec3 has same alignment as vec4, use vec4 instead");switch(Number(t)){case 10:return e>1?`vec${e}<f16>`:"f16";case 1:return e>1?`vec${e}<f32>`:"f32";case 6:return e>1?`vec${e}<i32>`:"i32";case 12:return e>1?`vec${e}<u32>`:"u32";case 7:if(e>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","i32"];case 13:if(e>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","u32"];case 9:if(e!==4)throw new Error("bool must be vec4");return["u32","vec4<bool>"];case 22:return"i32";case 21:return"u32";default:throw new Error(`Unknown data type: ${t}`)}},we=(t,e=1)=>{let r=go(t,e);return typeof r=="string"?r:r[0]},Ae=(t,e=1)=>{let r=go(t,e);return typeof r=="string"?r:r[1]},W=(...t)=>{let e=[];return t.forEach(r=>{r.length!==0&&e.push({type:12,data:r},{type:12,data:k.computeStrides(r)})}),e},fe=t=>t%4===0?4:t%2===0?2:1,bo=(t="f32",e,r="0")=>!e||e===1?`${t}(${r})`:`vec${e}<${t}>(${r})`,Mt=(t,e,r)=>t==="f32"?r:e===1?`f32(${r})`:`vec${e}<f32>(${r})`,Ze=(t,e)=>e===4?`(${t}.x + ${t}.y + ${t}.z + ${t}.w)`:e===2?`(${t}.x + ${t}.y)`:e===3?`(${t}.x + ${t}.y + ${t}.z)`:t,j=(t,e,r,n)=>t.startsWith("uniforms.")&&r>4?typeof e=="string"?n==="f16"?`${t}[(${e}) / 8][(${e}) % 8 / 4][(${e}) % 8 % 4]`:`${t}[(${e}) / 4][(${e}) % 4]`:n==="f16"?`${t}[${Math.floor(e/8)}][${Math.floor(e%8/4)}][${e%8%4}]`:`${t}[${Math.floor(e/4)}][${e%4}]`:r>1?`${t}[${e}]`:t,Yr=(t,e,r,n,o)=>{let i=typeof r=="number",a=i?r:r.length,u=[...new Array(a).keys()],d=a<2?"u32":a<=4?`vec${a}<u32>`:`array<u32, ${a}>`,c=go(e,o),p=typeof c=="string"?c:c[1],m=typeof c=="string"?c:c[0],g={indices:d,value:p,storage:m,tensor:e},y=M=>typeof M=="string"?M:`${M}u`,b={offsetToIndices:!1,indicesToOffset:!1,broadcastedIndicesToOffset:!1,set:!1,setByIndices:!1,get:!1,getByIndices:!1},_=i?"uniforms.":"",S=`${_}${t}_shape`,x=`${_}${t}_strides`,$="";for(let M=0;M<a-1;M++)$+=`
    let dim${M} = current / ${j(x,M,a)};
    let rest${M} = current % ${j(x,M,a)};
    indices[${M}] = dim${M};
    current = rest${M};
    `;$+=`indices[${a-1}] = current;`;let T=a<2?"":`
  fn o2i_${t}(offset: u32) -> ${g.indices} {
    var indices: ${g.indices};
    var current = offset;
    ${$}
    return indices;
  }`,I=M=>(b.offsetToIndices=!0,a<2?M:`o2i_${t}(${M})`),A=[];if(a>=2)for(let M=a-1;M>=0;M--)A.push(`${j(x,M,a)} * (indices[${M}])`);let E=a<2?"":`
  fn i2o_${t}(indices: ${g.indices}) -> u32 {
    return ${A.join("+")};
  }`,O=M=>(b.indicesToOffset=!0,a<2?M:`i2o_${t}(${M})`),w=(...M)=>a===0?"0u":`${g.indices}(${M.map(y).join(",")})`,U=(M,G)=>a<2?`${M}`:`${j(M,G,a)}`,N=(M,G,be)=>a<2?`${M}=${be};`:`${j(M,G,a)}=${be};`,F={},q=(M,G)=>{b.broadcastedIndicesToOffset=!0;let be=`${G.name}broadcastedIndicesTo${t}Offset`;if(be in F)return`${be}(${M})`;let ke=[];for(let $e=a-1;$e>=0;$e--){let De=G.indicesGet("outputIndices",$e+G.rank-a);ke.push(`${U(x,$e)} * (${De} % ${U(S,$e)})`)}return F[be]=`fn ${be}(outputIndices: ${G.type.indices}) -> u32 {
             return ${ke.length>0?ke.join("+"):"0u"};
           }`,`${be}(${M})`},X=(M,G)=>(()=>{if(g.storage===g.value)return`${t}[${M}]=${G};`;if(g.storage==="vec2<u32>"&&g.value==="i32")return`${t}[${M}]=vec2<u32>(u32(${G}), select(0u, 0xFFFFFFFFu, ${G} < 0));`;if(g.storage==="vec2<u32>"&&g.value==="u32")return`${t}[${M}]=vec2<u32>(u32(${G}), 0u);`;if(g.storage==="u32"&&g.value==="vec4<bool>")return`${t}[${M}]=dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(${G}));`;throw new Error(`not supported combination of storage type ${g.storage} and value type ${g.value} yet`)})(),B=M=>(()=>{if(g.storage===g.value)return`${t}[${M}]`;if(g.storage==="vec2<u32>"&&g.value==="i32")return`i32(${t}[${M}].x)`;if(g.storage==="vec2<u32>"&&g.value==="u32")return`u32(${t}[${M}].x)`;if(g.storage==="u32"&&g.value==="vec4<bool>")return`vec4<bool>(bool(${t}[${M}] & 0xFFu), bool(${t}[${M}] & 0xFF00u), bool(${t}[${M}] & 0xFF0000u), bool(${t}[${M}] & 0xFF000000u))`;throw new Error(`not supported combination of storage type ${g.storage} and value type ${g.value} yet`)})(),L=a<2?"":`
  fn get_${t}ByIndices(indices: ${g.indices}) -> ${p} {
    return ${B(`i2o_${t}(indices)`)};
  }`,Q=a<2?"":(()=>{let M=u.map(be=>`d${be}: u32`).join(", "),G=u.map(be=>`d${be}`).join(", ");return`
  fn get_${t}(${M}) -> ${p} {
    return get_${t}ByIndices(${w(G)});
  }`})(),Y=(...M)=>{if(M.length!==a)throw new Error(`indices length must be ${a}`);let G=M.map(y).join(",");return a===0?B("0u"):a===1?B(G[0]):(b.get=!0,b.getByIndices=!0,b.indicesToOffset=!0,`get_${t}(${G})`)},Z=M=>a<2?B(M):(b.getByIndices=!0,b.indicesToOffset=!0,`get_${t}ByIndices(${M})`),ne=a<2?"":`
  fn set_${t}ByIndices(indices: ${g.indices}, value: ${p}) {
    ${X(`i2o_${t}(indices)`,"value")}
  }`,ie=a<2?"":(()=>{let M=u.map(be=>`d${be}: u32`).join(", "),G=u.map(be=>`d${be}`).join(", ");return`
  fn set_${t}(${M}, value: ${p}) {
    set_${t}ByIndices(${w(G)}, value);
  }`})();return{impl:()=>{let M=[],G=!1;return b.offsetToIndices&&(M.push(T),G=!0),b.indicesToOffset&&(M.push(E),G=!0),b.broadcastedIndicesToOffset&&(Object.values(F).forEach(be=>M.push(be)),G=!0),b.set&&(M.push(ie),G=!0),b.setByIndices&&(M.push(ne),G=!0),b.get&&(M.push(Q),G=!0),b.getByIndices&&(M.push(L),G=!0),!i&&G&&M.unshift(`const ${S} = ${g.indices}(${r.join(",")});`,`const ${x} = ${g.indices}(${k.computeStrides(r).join(",")});`),M.join(`
`)},type:g,offsetToIndices:I,indicesToOffset:O,broadcastedIndicesToOffset:q,indices:w,indicesGet:U,indicesSet:N,set:(...M)=>{if(M.length!==a+1)throw new Error(`indices length must be ${a}`);let G=M[a];if(typeof G!="string")throw new Error("value must be string");let be=M.slice(0,a).map(y).join(",");return a===0?X("0u",G):a===1?X(be[0],G):(b.set=!0,b.setByIndices=!0,b.indicesToOffset=!0,`set_${t}(${be}, ${G})`)},setByOffset:X,setByIndices:(M,G)=>a<2?X(M,G):(b.setByIndices=!0,b.indicesToOffset=!0,`set_${t}ByIndices(${M}, ${G});`),get:Y,getByOffset:B,getByIndices:Z,usage:n,name:t,strides:x,shape:S,rank:a}},D=(t,e,r,n=1)=>Yr(t,e,r,"input",n),R=(t,e,r,n=1)=>Yr(t,e,r,"output",n),Ks=(t,e,r)=>Yr(t,e,r,"atomicOutput",1),Xr=(t,e,r,n=1)=>Yr(t,e,r,"internal",n),ho=class{constructor(e,r){this.normalizedDispatchGroup=e;this.limits=r;this.internalVariables=[];this.variables=[];this.uniforms=[];this.variableIndex=0}guardAgainstOutOfBoundsWorkgroupSizes(e){return`if (global_idx >= ${typeof e=="number"?`${e}u`:e}) { return; }`}mainStart(e=zt){let r=typeof e=="number"?e:e[0],n=typeof e=="number"?1:e[1],o=typeof e=="number"?1:e[2];if(r>this.limits.maxComputeWorkgroupSizeX||n>this.limits.maxComputeWorkgroupSizeY||o>this.limits.maxComputeWorkgroupSizeZ)throw new Error(`workgroup size [${r}, ${n}, ${o}] exceeds the maximum workgroup size [${this.limits.maxComputeWorkgroupSizeX}, ${this.limits.maxComputeWorkgroupSizeY}, ${this.limits.maxComputeWorkgroupSizeZ}].`);if(r*n*o>this.limits.maxComputeInvocationsPerWorkgroup)throw new Error(`workgroup size [${r}, ${n}, ${o}] exceeds the maximum workgroup invocations ${this.limits.maxComputeInvocationsPerWorkgroup}.`);let i=this.normalizedDispatchGroup[1]===1&&this.normalizedDispatchGroup[2]===1,a=i?`@builtin(global_invocation_id) global_id : vec3<u32>,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(local_invocation_id) local_id : vec3<u32>`:`@builtin(global_invocation_id) global_id : vec3<u32>,
                                             @builtin(local_invocation_id) local_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(num_workgroups) num_workgroups : vec3<u32>`,u=i?`let global_idx = global_id.x;
         let workgroup_index = workgroup_id.x;`:`let workgroup_index = workgroup_id.z * num_workgroups[0] * num_workgroups[1] +
             workgroup_id.y * num_workgroups[0] + workgroup_id.x;
         let global_idx = workgroup_index * ${r*n*o}u + local_idx;`;return`@compute @workgroup_size(${r}, ${n}, ${o})
  fn main(${a}) {
    ${u}
  `}appendVariableUniforms(e){e.rank!==0&&(e.shape.startsWith("uniforms.")&&this.uniforms.push({name:e.shape.replace("uniforms.",""),type:"u32",length:e.rank}),e.strides.startsWith("uniforms.")&&this.uniforms.push({name:e.strides.replace("uniforms.",""),type:"u32",length:e.rank}))}declareVariable(e,r){if(e.usage==="internal")throw new Error("cannot use internal variable with declareVariable(). use registerInternalVariables() instead.");this.variables.push(e),this.appendVariableUniforms(e);let n=e.usage==="input"?"read":"read_write",o=e.usage==="atomicOutput"?"atomic<i32>":e.type.storage;return`@group(0) @binding(${r}) var<storage, ${n}> ${e.name}: array<${o}>;`}declareVariables(...e){return e.map(r=>this.declareVariable(r,this.variableIndex++)).join(`
`)}registerInternalVariable(e){if(e.usage!=="internal")throw new Error("cannot use input or output variable with registerInternalVariable(). use declareVariables() instead.");this.internalVariables.push(e),this.appendVariableUniforms(e)}registerInternalVariables(...e){return e.forEach(r=>this.registerInternalVariable(r)),this}registerUniform(e,r,n=1){return this.uniforms.push({name:e,type:r,length:n}),this}registerUniforms(e){return this.uniforms=this.uniforms.concat(e),this}uniformDeclaration(){if(this.uniforms.length===0)return"";let e=[];for(let{name:r,type:n,length:o}of this.uniforms)if(o&&o>4)n==="f16"?e.push(`@align(16) ${r}:array<mat2x4<${n}>, ${Math.ceil(o/8)}>`):e.push(`${r}:array<vec4<${n}>, ${Math.ceil(o/4)}>`);else{let i=o==null||o===1?n:`vec${o}<${n}>`;e.push(`${r}:${i}`)}return`
      struct Uniforms { ${e.join(", ")} };
      @group(0) @binding(${this.variableIndex}) var<uniform> uniforms: Uniforms;`}get additionalImplementations(){return this.uniformDeclaration()+this.variables.map(e=>e.impl()).join(`
`)+this.internalVariables.map(e=>e.impl()).join(`
`)}get variablesInfo(){if(this.uniforms.length===0)return;let e=r=>[12,10,1,6][["u32","f16","f32","i32"].indexOf(r)];return this.uniforms.map(r=>[e(r.type),r.length??1])}},js=(t,e)=>new ho(t,e)});var oh,Zs,ih,ah,sh,uh,Be,Qs,Ys,pt=V(()=>{"use strict";ee();te();Ce();oe();oh=(t,e)=>{if(!t||t.length!==1)throw new Error("Transpose requires 1 input.");if(e.length!==0&&e.length!==t[0].dims.length)throw new Error(`perm size ${e.length} does not match input rank ${t[0].dims.length}`)},Zs=(t,e)=>e.length!==0?e:[...new Array(t).keys()].reverse(),ih=(t,e)=>k.sortBasedOnPerm(t,Zs(t.length,e)),ah=(t,e,r,n)=>{let o=`fn perm(i: ${n.type.indices}) -> ${r.type.indices} {
    var a: ${r.type.indices};`;for(let i=0;i<e;++i)o+=`a[${t[i]}]=i[${i}];`;return o+="return a;}"},sh=(t,e)=>{let r=[],n=[];for(let o=0;o<t.length;++o)t[o]!==1&&r.push(t[o]),t[e[o]]!==1&&n.push(e[o]);return{newShape:r,newPerm:n}},uh=(t,e)=>{let r=0;for(let n=0;n<t.length;++n)if(e[t[n]]!==1){if(t[n]<r)return!1;r=t[n]}return!0},Be=(t,e)=>{let r=t.dataType,n=t.dims.length,o=Zs(n,e),i=ih(t.dims,o),a=t.dims,u=i,d=n<2||uh(o,t.dims),c;if(d)return c=_=>{let S=D("input",r,a,4),x=R("output",r,u,4);return`
  ${_.registerUniform("output_size","u32").declareVariables(S,x)}
  ${_.mainStart()}
    ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    output[global_idx] = input[global_idx];
  }`},{name:"TransposeCopy",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let _=k.size(i);return{outputs:[{dims:i,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(_/64/4)},programUniforms:[{type:12,data:Math.ceil(_/4)}]}},getShaderSource:c};let{newShape:p,newPerm:m}=sh(t.dims,o),g=k.areEqual(m,[2,3,1]),y=k.areEqual(m,[3,1,2]);if(p.length===2||g||y){a=g?[p[0],p[1]*p[2]]:y?[p[0]*p[1],p[2]]:p,u=[a[1],a[0]];let _=16;return c=S=>{let x=D("a",r,a.length),$=R("output",r,u.length);return`
  ${S.registerUniform("output_size","u32").declareVariables(x,$)}
  var<workgroup> tile : array<array<${$.type.value}, ${_+1}>, ${_}>;
  ${S.mainStart([_,_,1])}
    let stride = (uniforms.output_shape[1] - 1) / ${_} + 1;
    let workgroup_id_x = workgroup_index % stride;
    let workgroup_id_y = workgroup_index / stride;
    let input_col = workgroup_id_y * ${_}u + local_id.x;
    let input_row = workgroup_id_x * ${_}u + local_id.y;
    if (input_row < uniforms.a_shape[0] && input_col < uniforms.a_shape[1]) {
      tile[local_id.y][local_id.x] = ${x.getByIndices(`${x.type.indices}(input_row, input_col)`)};
    }
    workgroupBarrier();

    let output_col = workgroup_id_x * ${_}u + local_id.x;
    let output_row = workgroup_id_y * ${_}u + local_id.y;
    if (output_row < uniforms.output_shape[0] && output_col < uniforms.output_shape[1]) {
      ${$.setByIndices(`${$.type.indices}(output_row, output_col)`,"tile[local_id.x][local_id.y]")}
    }
  }`},{name:"TransposeShared",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let S=k.size(i);return{outputs:[{dims:i,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(u[1]/_),y:Math.ceil(u[0]/_)},programUniforms:[{type:12,data:S},...W(a,u)]}},getShaderSource:c}}return c=_=>{let S=D("a",r,a.length),x=R("output",r,u.length);return`
  ${_.registerUniform("output_size","u32").declareVariables(S,x)}

  ${ah(o,n,S,x)}

  ${_.mainStart()}
    ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${x.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${x.setByOffset("global_idx",S.getByIndices("aIndices"))}
  }`},{name:"Transpose",shaderCache:{hint:`${e}`,inputDependencies:["rank"]},getRunData:()=>{let _=k.size(i);return{outputs:[{dims:i,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(_/64)},programUniforms:[{type:12,data:_},...W(a,u)]}},getShaderSource:c}},Qs=(t,e)=>{oh(t.inputs,e.perm),t.compute(Be(t.inputs[0],e.perm))},Ys=t=>J({perm:t.perm})});var dh,lh,ch,ph,mh,fh,hh,gh,bh,yh,it,Xs,Js,eu,tu,ru,nu,ou,iu,au,su,uu=V(()=>{"use strict";ee();te();oe();Jr();pt();dh={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate * candidate",logSumExp:"bestValue + exp(candidate)",l1:"bestValue + abs(candidate)",l2:"bestValue + candidate * candidate",logSum:"bestValue + candidate"},lh={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate",logSumExp:"bestValue + candidate",l1:"bestValue + candidate",l2:"bestValue + candidate",logSum:"bestValue + candidate"},ch={max:"_A[offset]",min:"_A[offset]",mean:"0",sum:"0",prod:"1",sumSquare:"0",logSumExp:"0",l1:"0",l2:"0",logSum:"0"},ph={max:"bestValue",min:"bestValue",sum:"bestValue",prod:"bestValue",sumSquare:"bestValue",logSumExp:"log(bestValue)",l1:"bestValue",l2:"sqrt(bestValue)",logSum:"log(bestValue)"},mh=(t,e)=>{let r=[];for(let n=e-t;n<e;++n)r.push(n);return r},fh=(t,e)=>{let r=[],n=t.length;for(let i=0;i<n;i++)e.indexOf(i)===-1&&r.push(t[i]);let o=e.map(i=>t[i]);return[r,o]},hh=(t,e)=>{let r=t.length+e.length,n=[],o=0;for(let i=0;i<r;i++)e.indexOf(i)===-1?n.push(t[o++]):n.push(1);return n},gh=(t,e)=>{for(let r=0;r<t.length;++r)if(t[t.length-r-1]!==e-1-r)return!1;return!0},bh=(t,e)=>{let r=[];if(!gh(t,e)){for(let n=0;n<e;++n)t.indexOf(n)===-1&&r.push(n);t.forEach(n=>r.push(n))}return r},yh=(t,e,r,n,o,i,a)=>{let u=r[0].dims,d=k.size(i),c=k.size(a),p=D("_A",r[0].dataType,u),m=R("output",o,i),g=64;d===1&&(g=256);let y=`
          var<workgroup> aBestValues : array<f32, ${g}>;
       `,b=_=>`
        ${_.registerUniform("reduceSize","u32").declareVariables(p,m)}
        ${y}
        fn DIV_CEIL(a : u32, b : u32) -> u32 {
          return ((a - 1u) / b + 1u);
         }
         ${_.mainStart(g)}

          let outputIndex = global_idx / ${g};
          let offset = outputIndex * uniforms.reduceSize;

          var bestValue = f32(${ch[n]});
          let Length = uniforms.reduceSize;
          for (var k = local_idx; k < Length; k = k + ${g}) {
           let candidate = f32(${p.getByOffset("offset + k")});
           bestValue = ${dh[n]};
          }
          aBestValues[local_idx] = bestValue;
          workgroupBarrier();

         var reduceSize = min(Length, ${g}u);
         for (var currentSize = reduceSize / 2u; reduceSize > 1u;
             currentSize = reduceSize / 2u) {
           let interval = DIV_CEIL(reduceSize, 2u);
           if (local_idx < currentSize) {
            let candidate = aBestValues[local_idx + interval];
            bestValue = ${lh[n]};
            aBestValues[local_idx] = bestValue;
           }
           reduceSize = interval;
           workgroupBarrier();
         }

         if (local_idx == 0u) {
          ${m.setByOffset("outputIndex",`${n==="mean"?`${m.type.storage}(bestValue / f32(uniforms.reduceSize))`:`${m.type.storage}(${ph[n]})`}`)};
         }
        }`;return{name:t,shaderCache:{hint:`${e};${g}`,inputDependencies:["type"]},getShaderSource:b,getRunData:()=>({outputs:[{dims:i,dataType:o}],dispatchGroup:{x:d},programUniforms:[{type:12,data:c}]})}},it=(t,e,r,n)=>{let o=t.inputs.length===1?r:yo(t.inputs,r),i=o.axes;i.length===0&&!o.noopWithEmptyAxes&&(i=t.inputs[0].dims.map((y,b)=>b));let a=k.normalizeAxes(i,t.inputs[0].dims.length),u=a,d=t.inputs[0],c=bh(u,t.inputs[0].dims.length);c.length>0&&(d=t.compute(Be(t.inputs[0],c),{inputs:[0],outputs:[-1]})[0],u=mh(u.length,d.dims.length));let[p,m]=fh(d.dims,u),g=p;o.keepDims&&(g=hh(p,a)),t.compute(yh(e,o.cacheKey,[d],n,t.inputs[0].dataType,g,m),{inputs:[d]})},Xs=(t,e)=>{it(t,"ReduceMeanShared",e,"mean")},Js=(t,e)=>{it(t,"ReduceL1Shared",e,"l1")},eu=(t,e)=>{it(t,"ReduceL2Shared",e,"l2")},tu=(t,e)=>{it(t,"ReduceLogSumExpShared",e,"logSumExp")},ru=(t,e)=>{it(t,"ReduceMaxShared",e,"max")},nu=(t,e)=>{it(t,"ReduceMinShared",e,"min")},ou=(t,e)=>{it(t,"ReduceProdShared",e,"prod")},iu=(t,e)=>{it(t,"ReduceSumShared",e,"sum")},au=(t,e)=>{it(t,"ReduceSumSquareShared",e,"sumSquare")},su=(t,e)=>{it(t,"ReduceLogSumShared",e,"logSum")}});var at,_h,en,yo,st,wh,vh,$h,xh,Sh,Th,Ih,Ch,Ah,Eh,ut,du,lu,cu,pu,mu,fu,hu,gu,bu,yu,Jr=V(()=>{"use strict";ee();te();Ce();oe();uu();at=t=>{if(!t||t.length===0||t.length>2)throw new Error("Reduce op requires 1 or 2 inputs.");if(t.length===2&&t[1].dims.length!==1)throw new Error("Invalid axes input dims.")},_h=t=>["","",`var value = ${t.getByIndices("input_indices")};`,""],en=(t,e,r,n,o,i,a=!1,u=!1)=>{let d=[],c=r[0].dims,p=c.length,m=k.normalizeAxes(o,p),g=!u&&m.length===0;c.forEach((S,x)=>{g||m.indexOf(x)>=0?a&&d.push(1):d.push(S)});let y=d.length,b=k.size(d);return{name:t,shaderCache:e,getShaderSource:S=>{let x=[],$=D("_A",r[0].dataType,p),T=R("output",i,y),I=n($,T,m),A=I[2];for(let E=0,O=0;E<p;E++)g||m.indexOf(E)>=0?(a&&O++,A=`for(var j${E}: u32 = 0; j${E} < ${c[E]}; j${E}++) {
                  ${I[2].includes("last_index")?`let last_index = j${E};`:""}
                  ${$.indicesSet("input_indices",E,`j${E}`)}
                  ${A}
                }`):(x.push(`${$.indicesSet("input_indices",E,T.indicesGet("output_indices",O))};`),O++);return`

        ${S.registerUniform("output_size","u32").declareVariables($,T)}

        ${S.mainStart()}
          ${S.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          var input_indices: ${$.type.indices};
          let output_indices = ${T.offsetToIndices("global_idx")};

          ${x.join(`
`)}
          ${I[0]}       // init ops for reduce max/min
          ${I[1]}
          ${A}
          ${I[3]}
          ${I.length===4?T.setByOffset("global_idx","value"):I.slice(4).join(`
`)}
        }`},getRunData:()=>({outputs:[{dims:d,dataType:i}],dispatchGroup:{x:Math.ceil(b/64)},programUniforms:[{type:12,data:b},...W(c,d)]})}},yo=(t,e)=>{let r=[];return t[1].dims[0]>0&&t[1].getBigInt64Array().forEach(n=>r.push(Number(n))),J({axes:r,keepDims:e.keepDims,noopWithEmptyAxes:e.noopWithEmptyAxes})},st=(t,e,r,n)=>{let o=t.inputs,i=o.length===1?r:yo(o,r);t.compute(en(e,{hint:i.cacheKey,inputDependencies:["rank"]},[o[0]],i.noopWithEmptyAxes&&i.axes.length===0?_h:n,i.axes,o[0].dataType,i.keepDims,i.noopWithEmptyAxes),{inputs:[0]})},wh=(t,e)=>{at(t.inputs),st(t,"ReduceLogSum",e,(n,o)=>[`var value = ${o.type.storage}(0);`,"",`value += ${n.getByIndices("input_indices")};`,"value = log(value);"])},vh=(t,e)=>{at(t.inputs),st(t,"ReduceL1",e,(n,o)=>[`var value = ${o.type.storage}(0);`,"",`value += abs(${n.getByIndices("input_indices")});`,""])},$h=(t,e)=>{at(t.inputs),st(t,"ReduceL2",e,(n,o)=>[`var t = ${o.type.value}(0); var value = ${o.type.value}(0);`,"",`t = ${n.getByIndices("input_indices")}; value += (t * t);`,"value = sqrt(value);"])},xh=(t,e)=>{at(t.inputs),st(t,"ReduceLogSumExp",e,(n,o)=>[`var value = ${o.type.storage}(0);`,"",`value += exp(${n.getByIndices("input_indices")});`,"value = log(value);"])},Sh=(t,e)=>{at(t.inputs),st(t,"ReduceMax",e,(n,o,i)=>{let a=[];for(let u=0;u<n.rank;u++)(i.indexOf(u)>=0||i.length===0)&&a.push(n.indicesSet("input_indices",u,0));return[`${a.join(`
`)}`,`var value = ${n.getByIndices("input_indices")};`,`value = max(value, ${n.getByIndices("input_indices")});`,""]})},Th=(t,e)=>{at(t.inputs),st(t,"ReduceMean",e,(n,o,i)=>{let a=1;for(let u=0;u<n.rank;u++)(i.indexOf(u)>=0||i.length===0)&&(a*=t.inputs[0].dims[u]);return["var sum = f32(0);","",`sum += f32(${n.getByIndices("input_indices")});`,`let value = ${o.type.value}(sum / ${a});`]})},Ih=(t,e)=>{at(t.inputs),st(t,"ReduceMin",e,(n,o,i)=>{let a=[];for(let u=0;u<n.rank;u++)(i.indexOf(u)>=0||i.length===0)&&a.push(`input_indices[${u}] = 0;`);return[`${a.join(`
`)}`,`var value = ${n.getByIndices("input_indices")};`,`value = min(value, ${n.getByIndices("input_indices")});`,""]})},Ch=(t,e)=>{at(t.inputs),st(t,"ReduceProd",e,(n,o)=>[`var value = ${o.type.storage}(1);`,"",`value *= ${n.getByIndices("input_indices")};`,""])},Ah=(t,e)=>{at(t.inputs),st(t,"ReduceSum",e,(n,o)=>[`var value = ${o.type.storage}(0);`,"",`value += ${n.getByIndices("input_indices")};`,""])},Eh=(t,e)=>{at(t.inputs),st(t,"ReduceSumSquare",e,(n,o)=>[`var t = ${o.type.value}(0); var value = ${o.type.value}(0);`,"",`t = ${n.getByIndices("input_indices")}; value += t * t;`,""])},ut=(t,e,r)=>{if(e.length===0)return r;let n=1,o=1;for(let i=0;i<e.length;i++)e.indexOf(i)===-1?n*=t[i]:o*=t[i];return o<32&&n>1024},du=(t,e)=>{ut(t.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?Th(t,e):Xs(t,e)},lu=(t,e)=>{ut(t.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?vh(t,e):Js(t,e)},cu=(t,e)=>{ut(t.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?$h(t,e):eu(t,e)},pu=(t,e)=>{ut(t.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?xh(t,e):tu(t,e)},mu=(t,e)=>{ut(t.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?Sh(t,e):ru(t,e)},fu=(t,e)=>{ut(t.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?Ih(t,e):nu(t,e)},hu=(t,e)=>{ut(t.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?Ch(t,e):ou(t,e)},gu=(t,e)=>{ut(t.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?Ah(t,e):iu(t,e)},bu=(t,e)=>{ut(t.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?Eh(t,e):au(t,e)},yu=(t,e)=>{ut(t.inputs[0].dims,e.axes,e.noopWithEmptyAxes)?wh(t,e):su(t,e)}});var _u,wu,vu,_o,$u=V(()=>{"use strict";ee();Ce();Jr();_u=t=>{if(!t||t.length===0||t.length>2)throw new Error("ArgMinMaxOp op requires 1 or 2 inputs.");if(t[0].dataType!==1)throw new Error("Invalid input type.")},wu=(t,e)=>{_u(t.inputs);let r=(n,o,i)=>{let a=[];for(let u=0;u<n.rank;u++)(i.indexOf(u)>=0||i.length===0)&&a.push(`input_indices[${u}] = 0;`);return[`${a.join(`
`)}`,`var value = ${n.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${n.getByIndices("input_indices")} ${e.selectLastIndex>0?"<=":"<"} value) {
         value = ${n.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",o.setByOffset("global_idx","best_index")]};t.compute(en("ArgMin",{hint:e.cacheKey,inputDependencies:["rank"]},[t.inputs[0]],r,[e.axis],7,e.keepDims),{inputs:[0]})},vu=(t,e)=>{_u(t.inputs);let r=(n,o,i)=>{let a=[];for(let u=0;u<n.rank;u++)(i.indexOf(u)>=0||i.length===0)&&a.push(`input_indices[${u}] = 0;`);return[`${a.join(`
`)}`,`var value = ${n.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${n.getByIndices("input_indices")} ${e.selectLastIndex>0?">=":">"} value) {
         value = ${n.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",o.setByOffset("global_idx","best_index")]};t.compute(en("argMax",{hint:e.cacheKey,inputDependencies:["rank"]},[t.inputs[0]],r,[e.axis],7,e.keepDims),{inputs:[0]})},_o=t=>J(t)});var kh,wo,Ph,Dh,Oh,Ft,Bh,xu,tn=V(()=>{"use strict";ee();te();Qr();oe();kh=(t,e)=>{let r=t[0],n=t[1],o=t[2],i=t[3],a=t[4],u=t[5];if(a&&u)throw new Error("Attention cannot have both past and attention_bias");if(r.dims.length!==3)throw new Error('Input "input" must have 3 dimensions');let d=r.dims[0],c=r.dims[1],p=r.dims[2];if(o.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimensions');if(n.dims.length!==2)throw new Error('Input "weights" is expected to have 2 dimensions');if(n.dims[0]!==p)throw new Error("Input 1 dimension 0 should have same length as dimension 2 of input 0");if(o.dims[0]!==n.dims[1])throw new Error('Input "bias" dimension 0 should have same length as dimension 1 of input "weights"');let m=o.dims[0]/3,g=m,y=g;if(e.qkvHiddenSizes.length>0){if(e.qkvHiddenSizes.length!==3)throw new Error("qkv_hidden_sizes attribute should have 3 elements");for(let T of e.qkvHiddenSizes)if(T%e.numHeads!==0)throw new Error("qkv_hidden_sizes should be divisible by num_heads");m=e.qkvHiddenSizes[0],g=e.qkvHiddenSizes[1],y=e.qkvHiddenSizes[2]}let b=c;if(m!==g)throw new Error("qkv_hidden_sizes first element should be same as the second");if(o.dims[0]!==m+g+y)throw new Error('Input "bias" dimension 0 should have same length as sum of Q/K/V hidden sizes');let _=0;if(a){if(g!==y)throw new Error('Input "past" expect k_hidden_size == v_hidden_size');if(a.dims.length!==5)throw new Error('Input "past" must have 5 dimensions');if(a.dims[0]!==2)throw new Error('Input "past" first dimension must be 2');if(a.dims[1]!==d)throw new Error('Input "past" second dimension must be batch_size');if(a.dims[2]!==e.numHeads)throw new Error('Input "past" third dimension must be num_heads');if(a.dims[4]!==g/e.numHeads)throw new Error('Input "past" fifth dimension must be k_hidden_size / num_heads');e.pastPresentShareBuffer||(_=a.dims[3])}let S=b+_,x=-1,$=0;if(i)throw new Error("Mask not supported");if(a)throw new Error("past is not supported");if(u){if(u.dims.length!==4)throw new Error('Input "attention_bias" must have 4 dimensions');if(u.dims[0]!==d||u.dims[1]!==e.numHeads||u.dims[2]!==c||u.dims[3]!==S)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:d,sequenceLength:c,pastSequenceLength:_,kvSequenceLength:b,totalSequenceLength:S,maxSequenceLength:x,inputHiddenSize:p,hiddenSize:m,vHiddenSize:y,headSize:Math.floor(m/e.numHeads),vHeadSize:Math.floor(y/e.numHeads),numHeads:e.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:e.maskFilterValue,maskType:$,scale:e.scale,broadcastResPosBias:!1,passPastInKv:!1,qkvFormat:1}},wo=(t,e,r)=>e&&t?`
      let total_sequence_length_input = u32(${e.getByOffset("0")});
      let present_sequence_length = max(total_sequence_length_input, uniforms.past_sequence_length);
      let is_subsequent_prompt: bool = sequence_length > 1 && sequence_length != total_sequence_length_input;
      let is_first_prompt: bool = is_subsequent_prompt == false && sequence_length == total_sequence_length_input;
      total_sequence_length = u32(${t?.getByOffset("batchIdx")}) + 1;
      var past_sequence_length: u32 = 0;
      if (is_first_prompt == false) {
        past_sequence_length = total_sequence_length - sequence_length;
      }
       `:`
    ${r?"let past_sequence_length = uniforms.past_sequence_length":""};
    let present_sequence_length = total_sequence_length;
    `,Ph=(t,e,r,n,o,i,a,u)=>{let d=fe(a?1:i),c=64,p=i/d;p<c&&(c=32);let m=Math.ceil(i/d/c),g=[{type:12,data:e},{type:12,data:r},{type:12,data:n},{type:12,data:o},{type:12,data:p},{type:12,data:m}],y=we(t.dataType,d),b=Ae(1,d),_=["type"];a&&_.push("type"),u&&_.push("type");let S=x=>{let $=R("x",t.dataType,t.dims,d),T=[$],I=a?D("seq_lens",a.dataType,a.dims):void 0;I&&T.push(I);let A=u?D("total_sequence_length_input",u.dataType,u.dims):void 0;A&&T.push(A);let E=Ae(t.dataType),O=[{name:"batch_size",type:"u32"},{name:"num_heads",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"sequence_length",type:"u32"},{name:"total_sequence_length",type:"u32"},{name:"elements_per_thread",type:"u32"}];return`
  var<workgroup> thread_max: array<f32, ${c}>;
  var<workgroup> thread_sum: array<f32, ${c}>;
  ${x.registerUniforms(O).declareVariables(...T)}
  ${x.mainStart([c,1,1])}
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let sequence_length = uniforms.sequence_length;
    var total_sequence_length = uniforms.total_sequence_length;
    ${wo(I,A,!1)}
    let local_offset = local_idx * uniforms.elements_per_thread;
    let offset = (global_idx / ${c}) * uniforms.total_sequence_length + local_offset;
    let seq_causal_length = ${a?"u32(past_sequence_length + workgroup_id.y + 1)":"total_sequence_length"};
    var thread_max_vector = ${b}(-3.4028234663852886e+38f);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      thread_max_vector = max(${b}(x[offset + i]), thread_max_vector);
    }
    thread_max[local_idx] = ${(()=>{switch(d){case 1:return"thread_max_vector";case 2:return"max(thread_max_vector.x, thread_max_vector.y)";case 4:return"max(max(thread_max_vector.x, thread_max_vector.y), max(thread_max_vector.z, thread_max_vector.w))";default:throw new Error(`Unsupported components: ${d}`)}})()};
    workgroupBarrier();

    var max_value =  f32(-3.4028234663852886e+38f);
    for (var i = 0u; i < ${c}; i++) {
      max_value = max(thread_max[i], max_value);
    }

    var sum_vector = ${b}(0);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      sum_vector += exp(${b}(x[offset + i]) - max_value);
    }
    thread_sum[local_idx] = ${(()=>{switch(d){case 1:return"sum_vector";case 2:return"sum_vector.x + sum_vector.y";case 4:return"sum_vector.x + sum_vector.y + sum_vector.z + sum_vector.w";default:throw new Error(`Unsupported components: ${d}`)}})()};
    workgroupBarrier();

    var sum: f32 = 0;
    for (var i = 0u; i < ${c}; i++) {
      sum += thread_sum[i];
    }

    if (sum == 0) {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        x[offset + i] = ${$.type.value}(${E}(1.0) / ${E}(seq_causal_length));
      }
    } else {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        var f32input = ${b}(x[offset + i]);
        x[offset + i] = ${$.type.value}(exp(f32input - max_value) / sum);
      }
    }
      ${a?`
        for (var total_seq_id: u32 = seq_causal_length; total_seq_id + local_offset < uniforms.total_sequence_length; total_seq_id++) {
          x[offset + total_seq_id] = ${$.type.value}(${E}(0));
        }`:""};
  }`};return{name:"AttentionProbsSoftmax",shaderCache:{hint:`${c};${y};${d}`,inputDependencies:_},getShaderSource:S,getRunData:()=>({outputs:[],dispatchGroup:{x:1,y:o,z:e*r},programUniforms:g})}},Dh=(t,e,r,n,o,i,a,u,d)=>{let c=a+i.kvSequenceLength,p=[i.batchSize,i.numHeads,i.sequenceLength,c],m=t>1&&n,g=i.kvNumHeads?i.kvNumHeads:i.numHeads,y=m?[i.batchSize,g,c,i.headSize]:void 0,b=i.nReps?i.nReps:1,_=i.scale===0?1/Math.sqrt(i.headSize):i.scale,S=fe(i.headSize),x=i.headSize/S,$=12,T={x:Math.ceil(c/$),y:Math.ceil(i.sequenceLength/$),z:i.batchSize*i.numHeads},I=[{type:12,data:i.sequenceLength},{type:12,data:x},{type:12,data:c},{type:12,data:i.numHeads},{type:12,data:i.headSize},{type:1,data:_},{type:12,data:a},{type:12,data:i.kvSequenceLength},{type:12,data:b}],A=m&&n&&k.size(n.dims)>0,E=["type","type"];A&&E.push("type"),o&&E.push("type"),u&&E.push("type"),d&&E.push("type");let O=[{dims:p,dataType:e.dataType,gpuDataType:0}];m&&O.push({dims:y,dataType:e.dataType,gpuDataType:0});let w=U=>{let N=D("q",e.dataType,e.dims,S),F=D("key",r.dataType,r.dims,S),q=[N,F];if(A){let ne=D("past_key",n.dataType,n.dims,S);q.push(ne)}o&&q.push(D("attention_bias",o.dataType,o.dims));let X=u?D("seq_lens",u.dataType,u.dims):void 0;X&&q.push(X);let B=d?D("total_sequence_length_input",d.dataType,d.dims):void 0;B&&q.push(B);let L=R("output",e.dataType,p),Q=[L];m&&Q.push(R("present_key",e.dataType,y,S));let Y=Ae(1,S),Z=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"alpha",type:"f32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${$}u;

  var<workgroup> tileQ: array<${N.type.storage}, ${$*$}>;
  var<workgroup> tileK: array<${N.type.storage}, ${$*$}>;
  ${U.registerUniforms(Z).declareVariables(...q,...Q)}
  ${U.mainStart([$,$,1])}
    // x holds the N and y holds the M
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let kvHeadIdx = ${b===1?"headIdx":"headIdx / uniforms.n_reps"};
    let kv_num_heads = ${b===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let m = workgroup_id.y * TILE_SIZE;
    let n = workgroup_id.x * TILE_SIZE;
    let sequence_length = uniforms.M;
    var total_sequence_length = uniforms.N;
    ${wo(X,B,!0)}
    let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx;
    let qOffset = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
    ${A&&m?"let pastKeyOffset = absKvHeadIdx * uniforms.past_sequence_length * uniforms.K;":""};
    let kOffset = absKvHeadIdx * uniforms.kv_sequence_length * uniforms.K;
    ${m?"let presentKeyOffset = absKvHeadIdx * uniforms.N * uniforms.K;":""}
    var value = ${Y}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (global_id.y < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = q[qOffset + local_id.y * uniforms.K + w + local_id.x];
      }
      if (n + local_id.y < uniforms.N && w + local_id.x < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
      ${A&&m?`
              if (n + local_id.y < past_sequence_length) {
                tileK[idx] = past_key[pastKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
              } else if (n + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
                tileK[idx] = key[kOffset + (n + local_id.y - past_sequence_length) * uniforms.K + w + local_id.x];
              }`:`
          if (n + local_id.y < uniforms.kv_sequence_length) {
            tileK[idx] = key[kOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
          }`}
      ${m?`if (n + local_id.y < present_sequence_length) {
        present_key[presentKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x] = tileK[idx];
      }`:""}
      }
      workgroupBarrier();

      for (var k: u32 = 0u; k < TILE_SIZE && w+k < uniforms.K; k++) {
          value += ${Y}(tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * local_id.x + k]);
      }

      workgroupBarrier();
    }

    if (global_id.y < uniforms.M && global_id.x < total_sequence_length) {
      let headOffset = workgroup_id.z * uniforms.M * uniforms.N;
      let outputIdx = headOffset + global_id.y * uniforms.N + global_id.x;
      var sum: f32 = ${(()=>{switch(S){case 1:return"value";case 2:return"value.x + value.y";case 4:return"value.x + value.y + value.z + value.w";default:throw new Error(`Unsupported components: ${S}`)}})()};
        output[outputIdx] = ${L.type.value} (sum * uniforms.alpha) + ${o?"attention_bias[outputIdx]":"0.0"};
    }
  }`};return{name:"AttentionProbs",shaderCache:{hint:`${S};${o!==void 0};${n!==void 0};${t}`,inputDependencies:E},getRunData:()=>({outputs:O,dispatchGroup:T,programUniforms:I}),getShaderSource:w}},Oh=(t,e,r,n,o,i,a=void 0,u=void 0)=>{let d=i+o.kvSequenceLength,c=o.nReps?o.nReps:1,p=o.vHiddenSize*c,m=t>1&&n,g=o.kvNumHeads?o.kvNumHeads:o.numHeads,y=m?[o.batchSize,g,d,o.headSize]:void 0,b=[o.batchSize,o.sequenceLength,p],_=12,S={x:Math.ceil(o.vHeadSize/_),y:Math.ceil(o.sequenceLength/_),z:o.batchSize*o.numHeads},x=[{type:12,data:o.sequenceLength},{type:12,data:d},{type:12,data:o.vHeadSize},{type:12,data:o.numHeads},{type:12,data:o.headSize},{type:12,data:p},{type:12,data:i},{type:12,data:o.kvSequenceLength},{type:12,data:c}],$=m&&n&&k.size(n.dims)>0,T=["type","type"];$&&T.push("type"),a&&T.push("type"),u&&T.push("type");let I=[{dims:b,dataType:e.dataType,gpuDataType:0}];m&&I.push({dims:y,dataType:e.dataType,gpuDataType:0});let A=E=>{let O=D("probs",e.dataType,e.dims),w=D("v",r.dataType,r.dims),U=[O,w];$&&U.push(D("past_value",n.dataType,n.dims));let N=a?D("seq_lens",a.dataType,a.dims):void 0;a&&U.push(N);let F=u?D("total_sequence_length_input",u.dataType,u.dims):void 0;u&&U.push(F);let X=[R("output",e.dataType,b)];m&&X.push(R("present_value",e.dataType,y));let B=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"v_hidden_size",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${_}u;
  var<workgroup> tileQ: array<${O.type.value}, ${_*_}>;
  var<workgroup> tileV: array<${O.type.value}, ${_*_}>;
  ${E.registerUniforms(B).declareVariables(...U,...X)}
  ${E.mainStart([_,_,1])}
   let headIdx = workgroup_id.z % uniforms.num_heads;
   let batchIdx = workgroup_id.z / uniforms.num_heads;
   let kvHeadIdx = ${c===1?"headIdx":"headIdx / uniforms.n_reps"};
   let kv_num_heads = ${c===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
   let m = global_id.y;
   let n = global_id.x;
   let sequence_length = uniforms.M;
   var total_sequence_length = uniforms.K;
   ${wo(N,F,!0)}
   let offsetA = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
   let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx; // kvHeadIdx is relative to the batch
   ${$&&m?"let pastValueOffset = absKvHeadIdx * uniforms.N * uniforms.past_sequence_length + n;":""};
   let vOffset = absKvHeadIdx * uniforms.N * uniforms.kv_sequence_length + n;
   ${m?"let presentValueOffset = absKvHeadIdx * uniforms.N * uniforms.K + n;":""}
   var value = ${O.type.storage}(0);
   for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = probs[offsetA + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
        ${$&&m?`
        if (w + local_id.y < past_sequence_length) {
          tileV[idx] = past_value[pastValueOffset + (w + local_id.y) * uniforms.N];
        } else if (w + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
          tileV[idx] = v[vOffset + (w + local_id.y - past_sequence_length) * uniforms.N];
        }
      `:`
            if (w + local_id.y < uniforms.kv_sequence_length) {
              tileV[idx] = v[vOffset + (w + local_id.y) * uniforms.N];
            }`}
        ${m?`
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
  }`};return{name:"AttentionScore",shaderCache:{hint:`${n!==void 0};${t}`,inputDependencies:T},getRunData:()=>({outputs:I,dispatchGroup:S,programUniforms:x}),getShaderSource:A}},Ft=(t,e,r,n,o,i,a,u,d,c,p=void 0,m=void 0)=>{let g=Math.min(t.outputCount,1+(a?1:0)+(u?1:0)),y=g>1?a:void 0,b=g>1?u:void 0,_=g>1?c.pastSequenceLength:0,S=_+c.kvSequenceLength,x=d&&k.size(d.dims)>0?d:void 0,$=[e,r];y&&k.size(y.dims)>0&&$.push(y),x&&$.push(x),p&&$.push(p),m&&$.push(m);let T=t.compute(Dh(g,e,r,y,x,c,_,p,m),{inputs:$,outputs:g>1?[-1,1]:[-1]})[0];t.compute(Ph(T,c.batchSize,c.numHeads,_,c.sequenceLength,S,p,m),{inputs:p&&m?[T,p,m]:[T],outputs:[]});let I=[T,n];b&&k.size(b.dims)>0&&I.push(b),p&&I.push(p),m&&I.push(m),t.compute(Oh(g,T,n,b,c,_,p,m),{inputs:I,outputs:g>1?[0,2]:[0]})},Bh=(t,e)=>{let r=[e.batchSize,e.numHeads,e.sequenceLength,e.headSize],n=e.sequenceLength,o=e.inputHiddenSize,i=e.headSize,a=12,u={x:Math.ceil(e.headSize/a),y:Math.ceil(e.sequenceLength/a),z:e.batchSize*e.numHeads},d=[t.inputs[0],t.inputs[1],t.inputs[2]],c=[{type:12,data:n},{type:12,data:o},{type:12,data:i},{type:12,data:e.numHeads},{type:12,data:e.headSize},{type:12,data:e.hiddenSize},{type:12,data:e.hiddenSize+e.hiddenSize+e.vHiddenSize}],p=m=>{let g=R("output_q",d[0].dataType,r),y=R("output_k",d[0].dataType,r),b=R("output_v",d[0].dataType,r),_=D("input",d[0].dataType,d[0].dims),S=D("weight",d[1].dataType,d[1].dims),x=D("bias",d[2].dataType,d[2].dims),$=_.type.storage,T=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"hidden_size",type:"u32"},{name:"ldb",type:"u32"}];return`
  const TILE_SIZE = ${a}u;
  var<workgroup> tileInput: array<${$}, ${a*a}>;
  var<workgroup> tileWeightQ: array<${$}, ${a*a}>;
  var<workgroup> tileWeightK: array<${$}, ${a*a}>;
  var<workgroup> tileWeightV: array<${$}, ${a*a}>;
  ${m.registerUniforms(T).declareVariables(_,S,x,g,y,b)}
  ${m.mainStart([a,a,1])}
    let batchIndex = workgroup_id.z / uniforms.num_heads;
    let headNumber = workgroup_id.z % uniforms.num_heads;
    let m = global_id.y;
    let n = global_id.x;

    let inputOffset = batchIndex * (uniforms.M * uniforms.K) + m * uniforms.K;
    let biasOffsetQ = headNumber * uniforms.head_size;
    let biasOffsetK = uniforms.hidden_size + biasOffsetQ;
    let biasOffsetV = uniforms.hidden_size + biasOffsetK;

    var valueQ = ${$}(0);
    var valueK = ${$}(0);
    var valueV = ${$}(0);
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
  }`};return t.compute({name:"AttentionPrepare",shaderCache:{inputDependencies:["type","type","type"]},getRunData:()=>({outputs:[{dims:r,dataType:t.inputs[0].dataType,gpuDataType:0},{dims:r,dataType:t.inputs[0].dataType,gpuDataType:0},{dims:r,dataType:t.inputs[0].dataType,gpuDataType:0}],dispatchGroup:u,programUniforms:c}),getShaderSource:p},{inputs:d,outputs:[-1,-1,-1]})},xu=(t,e)=>{let r=kh(t.inputs,e),[n,o,i]=Bh(t,r);return Ft(t,n,o,i,t.inputs[4],void 0,void 0,void 0,t.inputs[5],r)}});var zh,Mh,Rh,Su,Tu=V(()=>{"use strict";Le();ee();te();Ce();oe();zh=(t,e)=>{if(!t||t.length!==5)throw new Error("BatchNormalization requires 5 inputs");let r=(n,o,i)=>{let a=o.length;if(a!==n.length)throw new Error(`${i}: num dimensions != ${a}`);o.forEach((u,d)=>{if(u!==n[d])throw new Error(`${i}: dim[${d}] do not match`)})};if(t[0].dims.length>1){let n=e.format==="NHWC"?e.spatial?t[0].dims.slice(-1):t[0].dims.slice(-1).concat(t[0].dims.slice(1,t[0].dims.length-1)):t[0].dims.slice(1,e.spatial?2:void 0);r(t[1].dims,n,"Invalid input scale"),r(t[2].dims,n,"Invalid input B"),r(t[3].dims,n,"Invalid input mean"),r(t[4].dims,n,"Invalid input var")}else r(t[1].dims,[1],"Invalid input scale"),r(t[2].dims,[1],"Invalid input B"),r(t[3].dims,[1],"Invalid input mean"),r(t[4].dims,[1],"Invalid input var")},Mh=(t,e)=>{let{epsilon:r,spatial:n,format:o}=e,i=t[0].dims,a=n?fe(i[i.length-1]):1,u=o==="NHWC"&&i.length>1?a:1,d=k.size(i)/a,c=n,p=c?i.length:i,m=D("x",t[0].dataType,t[0].dims,a),g=D("scale",t[1].dataType,t[1].dims,u),y=D("bias",t[2].dataType,t[2].dims,u),b=D("inputMean",t[3].dataType,t[3].dims,u),_=D("inputVar",t[4].dataType,t[4].dims,u),S=R("y",t[0].dataType,p,a),x=()=>{let T="";if(n)T=`let cOffset = ${i.length===1?"0u":o==="NHWC"?`outputIndices[${i.length-1}] / ${a}`:"outputIndices[1]"};`;else if(o==="NCHW")T=`
            ${S.indicesSet("outputIndices","0","0")}
            let cOffset = ${S.indicesToOffset("outputIndices")};`;else{T=`var cIndices = ${g.type.indices}(0);
                       cIndices[0] = outputIndices[${i.length-1}];`;for(let I=1;I<g.rank;I++)T+=`cIndices[${I}] = outputIndices[${I}];`;T+=`let cOffset = ${g.indicesToOffset("cIndices")};`}return T},$=T=>`
  const epsilon = ${r};
  ${T.registerUniform("outputSize","u32").declareVariables(m,g,y,b,_,S)}
  ${T.mainStart()}
  ${T.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
    var outputIndices = ${S.offsetToIndices(`global_idx * ${a}`)};
    ${x()}
    let scale = ${g.getByOffset("cOffset")};
    let bias = ${y.getByOffset("cOffset")};
    let inputMean = ${b.getByOffset("cOffset")};
    let inputVar = ${_.getByOffset("cOffset")};
    let x = ${m.getByOffset("global_idx")};
    let value = (x - inputMean) * inverseSqrt(inputVar + epsilon) * scale + bias;
    ${S.setByOffset("global_idx","value")}
  }`;return{name:"BatchNormalization",shaderCache:{hint:`${e.epsilon}_${e.format}_${n}_${a}`,inputDependencies:c?["rank","type","type","type","type"]:void 0},getShaderSource:$,getRunData:()=>({outputs:[{dims:t[0].dims,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:c?[{type:12,data:d},...W(i)]:[{type:12,data:d}]})}},Rh=t=>J(t),Su=(t,e)=>{let{inputs:r,outputCount:n}=t,o=Rh({...e,outputCount:n});if(_e.webgpu.validateInputContent&&zh(r,o),e.trainingMode)throw new Error("BatchNormalization trainingMode is not supported yet.");t.compute(Mh(r,o))}});var Uh,Nh,Iu,Cu=V(()=>{"use strict";te();oe();Uh=t=>{if(t[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![320,640,1280].includes(t[0].dims[2]))throw new Error("number of channels should be 320, 640 or 1280");if(t[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(t[0].dims[2]!==t[1].dims[0])throw new Error("last dimension of input and bias are not the same")},Nh=t=>{let e=t[0].dims,r=t[0].dims[2],n=k.size(e)/4,o=t[0].dataType,i=D("input",o,e,4),a=D("bias",o,[r],4),u=D("residual",o,e,4),d=R("output",o,e,4);return{name:"BiasAdd",getRunData:()=>({outputs:[{dims:e,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(n/64)}}),getShaderSource:p=>`
  const channels = ${r}u / 4;
  ${p.declareVariables(i,a,u,d)}

  ${p.mainStart()}
    ${p.guardAgainstOutOfBoundsWorkgroupSizes(n)}
    let value = ${i.getByOffset("global_idx")}
      + ${a.getByOffset("global_idx % channels")} + ${u.getByOffset("global_idx")};
    ${d.setByOffset("global_idx","value")}
  }`}},Iu=t=>{Uh(t.inputs),t.compute(Nh(t.inputs))}});var Vh,he,Au,Eu,ku,Pu,Du,Ou,Bu,zu,Mu,Lh,Ru,Uu,Nu,Vu,ar,Lu,rn,Wu,Gu,Hu,Fu,qu,Ku,ju,Zu,Qu,Yu,Xu,Ju,ed,td,rd,nd,od,id,ad,vo,$o,sd,ud,dd,Wh,Gh,ld,nn=V(()=>{"use strict";ee();te();Ce();oe();Vh=(t,e,r,n,o,i,a)=>{let u=Math.ceil(e/4),d="";typeof o=="string"?d=`${o}(a)`:d=o("a");let c=D("inputData",r,[u],4),p=R("outputData",n,[u],4),m=[{name:"vec_size",type:"u32"}];return a&&m.push(...a),`
      ${t.registerUniforms(m).declareVariables(c,p)}

  ${i??""}

  ${t.mainStart()}
    ${t.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}

    let a = ${c.getByOffset("global_idx")};
    ${p.setByOffset("global_idx",d)}
  }`},he=(t,e,r,n,o,i=t.dataType,a,u)=>{let d=[{type:12,data:Math.ceil(k.size(t.dims)/4)}];return a&&d.push(...a),{name:e,shaderCache:{hint:o,inputDependencies:["type"]},getShaderSource:c=>Vh(c,k.size(t.dims),t.dataType,i,r,n,u),getRunData:c=>({outputs:[{dims:t.dims,dataType:i}],dispatchGroup:{x:Math.ceil(k.size(c[0].dims)/64/4)},programUniforms:d})}},Au=t=>{t.compute(he(t.inputs[0],"Abs","abs"))},Eu=t=>{t.compute(he(t.inputs[0],"Acos","acos"))},ku=t=>{t.compute(he(t.inputs[0],"Acosh","acosh"))},Pu=t=>{t.compute(he(t.inputs[0],"Asin","asin"))},Du=t=>{t.compute(he(t.inputs[0],"Asinh","asinh"))},Ou=t=>{t.compute(he(t.inputs[0],"Atan","atan"))},Bu=t=>{t.compute(he(t.inputs[0],"Atanh","atanh"))},zu=t=>J(t),Mu=(t,e)=>{let r;switch(e.to){case 10:r="vec4<f16>";break;case 1:r="vec4<f32>";break;case 12:r="vec4<u32>";break;case 6:r="vec4<i32>";break;case 9:r="vec4<bool>";break;default:throw new RangeError(`not supported type (specified in attribute 'to' from 'Cast' operator): ${e.to}`)}t.compute(he(t.inputs[0],"Cast",r,void 0,e.cacheKey,e.to))},Lh=t=>{let e,r,n=t.length>=2&&t[1].data!==0,o=t.length>=3&&t[2].data!==0;switch(t[0].dataType){case 1:e=n?t[1].getFloat32Array()[0]:-34028234663852886e22,r=o?t[2].getFloat32Array()[0]:34028234663852886e22;break;case 10:e=n?t[1].getUint16Array()[0]:64511,r=o?t[2].getUint16Array()[0]:31743;break;default:throw new Error("Unsupport data type")}return J({min:e,max:r})},Ru=(t,e)=>{let r=e||Lh(t.inputs),n=Ae(t.inputs[0].dataType);t.compute(he(t.inputs[0],"Clip",o=>`clamp(${o}, vec4<${n}>(uniforms.min), vec4<${n}>(uniforms.max))`,void 0,r.cacheKey,void 0,[{type:t.inputs[0].dataType,data:r.min},{type:t.inputs[0].dataType,data:r.max}],[{name:"min",type:n},{name:"max",type:n}]),{inputs:[0]})},Uu=t=>{t.compute(he(t.inputs[0],"Ceil","ceil"))},Nu=t=>{t.compute(he(t.inputs[0],"Cos","cos"))},Vu=t=>{t.compute(he(t.inputs[0],"Cosh","cosh"))},ar=t=>J(t),Lu=(t,e)=>{let r=Ae(t.inputs[0].dataType);t.compute(he(t.inputs[0],"Elu",n=>`elu_vf32(${n})`,`
  const elu_alpha_ = ${r}(${e.alpha});

  fn elu_f32(a: ${r}) -> ${r} {
  return select((exp(a) - 1.0) * elu_alpha_, a, a >= 0.0);
  }

  fn elu_vf32(v: vec4<${r}>) -> vec4<${r}> {
  return vec4(elu_f32(v.x), elu_f32(v.y), elu_f32(v.z), elu_f32(v.w));
  }`,e.cacheKey))},rn=(t="f32")=>`
const r0: ${t} = 0.3275911;
const r1: ${t} = 0.254829592;
const r2: ${t} = -0.284496736;
const r3: ${t} = 1.421413741;
const r4: ${t} = -1.453152027;
const r5: ${t} = 1.061405429;

fn erf_vf32(v: vec4<${t}>) -> vec4<${t}> {
  let absv = abs(v);
  let x = 1.0 / (1.0 + r0 * absv);
  return sign(v) * (1.0 - ((((r5 * x + r4) * x + r3) * x + r2) * x + r1) * x * exp(-absv * absv));
}`,Wu=t=>{let e=Ae(t.inputs[0].dataType);t.compute(he(t.inputs[0],"Erf",r=>`erf_vf32(${r})`,rn(e)))},Gu=t=>{t.compute(he(t.inputs[0],"Exp","exp"))},Hu=t=>{t.compute(he(t.inputs[0],"Floor","floor"))},Fu=t=>{let e=Ae(t.inputs[0].dataType);t.compute(he(t.inputs[0],"Gelu",r=>`0.5 * ${r} * (1.0 + erf_vf32(${r} * 0.7071067811865475))`,rn(e)))},qu=(t,e)=>{let r=Ae(t.inputs[0].dataType);t.compute(he(t.inputs[0],"LeakyRelu",n=>`select(leaky_relu_alpha_ * ${n}, ${n}, ${n} >= vec4<${r}>(0.0))`,`const leaky_relu_alpha_ = ${r}(${e.alpha});`,e.cacheKey))},Ku=t=>{t.compute(he(t.inputs[0],"Not",e=>`!${e}`))},ju=t=>{t.compute(he(t.inputs[0],"Neg",e=>`-${e}`))},Zu=t=>{t.compute(he(t.inputs[0],"Reciprocal",e=>`1.0/${e}`))},Qu=t=>{let e=Ae(t.inputs[0].dataType);t.compute(he(t.inputs[0],"Relu",r=>`select(vec4<${e}>(0.0), ${r}, ${r} > vec4<${e}>(0.0))`))},Yu=t=>{t.compute(he(t.inputs[0],"Sigmoid",e=>`(1.0 / (1.0 + exp(-${e})))`))},Xu=t=>J(t),Ju=(t,e)=>{let r=Ae(t.inputs[0].dataType);t.compute(he(t.inputs[0],"HardSigmoid",n=>`max(vec4<${r}>(0.0), min(vec4<${r}>(1.0), ${e.alpha} * ${n} + vec4<${r}>(${e.beta})))`,void 0,e.cacheKey))},ed=t=>{let e=Ae(t.inputs[0].dataType);t.compute(he(t.inputs[0],"HardSwish",r=>`${r} * max(vec4<${e}>(0.0), min(vec4<${e}>(1.0), vec4<${e}>(${e}(1.0 / 6.0)) * ${r} + vec4<${e}>(0.5)))`))},td=t=>{t.compute(he(t.inputs[0],"Sin","sin"))},rd=t=>{t.compute(he(t.inputs[0],"Sinh","sinh"))},nd=t=>{t.compute(he(t.inputs[0],"Sqrt","sqrt"))},od=t=>{t.compute(he(t.inputs[0],"Tan","tan"))},id=t=>`sign(${t}) * (1 - exp(-2 * abs(${t}))) / (1 + exp(-2 * abs(${t})))`,ad=t=>{t.compute(he(t.inputs[0],"Tanh",id))},vo=(t="f32")=>`
const fast_gelu_a: ${t} = 0.5;
const fast_gelu_b: ${t} = 0.7978845608028654;
const fast_gelu_c: ${t} = 0.035677408136300125;

fn tanh_v(v: vec4<${t}>) -> vec4<${t}> {
  return ${id("v")};
}
`,$o=t=>`(fast_gelu_a + fast_gelu_a * tanh_v(${t} * (fast_gelu_c * ${t} * ${t} + fast_gelu_b))) * ${t}`,sd=t=>{let e=Ae(t.inputs[0].dataType);t.compute(he(t.inputs[0],"FastGelu",$o,vo(e),void 0,t.inputs[0].dataType))},ud=(t,e)=>{let r=Ae(t.inputs[0].dataType);return t.compute(he(t.inputs[0],"ThresholdedRelu",n=>`select(vec4<${r}>(0.0), ${n}, ${n} > thresholded_relu_alpha_)`,`const thresholded_relu_alpha_ = vec4<${r}>(${e.alpha});`,e.cacheKey)),0},dd=t=>{t.compute(he(t.inputs[0],"Log","log"))},Wh=(t,e)=>`
const alpha = vec4<${t}>(${e});
const one = ${t}(1.0);
const zero = ${t}(0.0);

fn quick_gelu_impl(x: vec4<${t}>) -> vec4<${t}> {
  let v = x *alpha;
  var x1 : vec4<${t}>;
  for (var i = 0; i < 4; i = i + 1) {
    if (v[i] >= zero) {
      x1[i] = one / (one + exp(-v[i]));
    } else {
      x1[i] = one - one / (one + exp(v[i]));
    }
  }
  return x * x1;
}
`,Gh=t=>`quick_gelu_impl(${t})`,ld=(t,e)=>{let r=Ae(t.inputs[0].dataType);t.compute(he(t.inputs[0],"QuickGelu",Gh,Wh(r,e.alpha),e.cacheKey,t.inputs[0].dataType))}});var Hh,Fh,pd,md=V(()=>{"use strict";te();oe();nn();Hh=t=>{if(t[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![2560,5120,10240].includes(t[0].dims[2]))throw new Error("hidden state should be 2560, 5120 or 10240");if(t[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(t[0].dims[2]!==t[1].dims[0])throw new Error("last dimension of input and bias are not the same")},Fh=t=>{let e=t[0].dims.slice();e[2]=e[2]/2;let r=D("input",t[0].dataType,t[0].dims,4),n=D("bias",t[0].dataType,[t[0].dims[2]],4),o=R("output",t[0].dataType,e,4),i=k.size(e)/4,a=we(t[0].dataType);return{name:"BiasSplitGelu",getRunData:()=>({outputs:[{dims:e,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(i/64)}}),getShaderSource:d=>`
  const M_SQRT2 = sqrt(2.0);
  const halfChannels = ${t[0].dims[2]/4/2}u;

  ${d.declareVariables(r,n,o)}

  ${rn(a)}

  ${d.mainStart()}
    ${d.guardAgainstOutOfBoundsWorkgroupSizes(i)}
    let biasIdx = global_idx % halfChannels;
    let batchIndex = global_idx / halfChannels;
    let inputOffset = biasIdx + batchIndex * halfChannels * 2;
    let valueLeft = input[inputOffset] + bias[biasIdx];
    let valueRight = input[inputOffset + halfChannels] + bias[biasIdx + halfChannels];
    let geluRight = valueRight * 0.5 * (erf_vf32(valueRight / M_SQRT2) + 1);

    ${o.setByOffset("global_idx","valueLeft * geluRight")}
  }`}},pd=t=>{Hh(t.inputs),t.compute(Fh(t.inputs))}});var qh,Kh,dt,fd,hd,gd,bd,yd,_d,wd,vd,$d,xd,Sd=V(()=>{"use strict";ee();te();oe();qh=(t,e,r,n,o,i,a,u,d,c,p,m)=>{let g,y;typeof u=="string"?g=y=($,T)=>`${u}((${$}),(${T}))`:typeof u=="function"?g=y=u:(g=u.scalar,y=u.vector);let b=R("outputData",p,n.length,4),_=D("aData",d,e.length,4),S=D("bData",c,r.length,4),x;if(o)if(i){let $=k.size(e)===1,T=k.size(r)===1,I=e.length>0&&e[e.length-1]%4===0,A=r.length>0&&r[r.length-1]%4===0;$||T?x=b.setByOffset("global_idx",y($?`${_.type.value}(${_.getByOffset("0")}.x)`:_.getByOffset("global_idx"),T?`${S.type.value}(${S.getByOffset("0")}.x)`:S.getByOffset("global_idx"))):x=`
            let outputIndices = ${b.offsetToIndices("global_idx * 4u")};
            let offsetA = ${_.broadcastedIndicesToOffset("outputIndices",b)};
            let offsetB = ${S.broadcastedIndicesToOffset("outputIndices",b)};
            ${b.setByOffset("global_idx",y(a||I?_.getByOffset("offsetA / 4u"):`${_.type.value}(${_.getByOffset("offsetA / 4u")}[offsetA % 4u])`,a||A?S.getByOffset("offsetB / 4u"):`${S.type.value}(${S.getByOffset("offsetB / 4u")}[offsetB % 4u])`))}
          `}else x=b.setByOffset("global_idx",y(_.getByOffset("global_idx"),S.getByOffset("global_idx")));else{if(!i)throw new Error("no necessary to use scalar implementation for element-wise binary op implementation.");let $=(T,I,A="")=>{let E=`aData[indexA${I}][componentA${I}]`,O=`bData[indexB${I}][componentB${I}]`;return`
            let outputIndices${I} = ${b.offsetToIndices(`global_idx * 4u + ${I}u`)};
            let offsetA${I} = ${_.broadcastedIndicesToOffset(`outputIndices${I}`,b)};
            let offsetB${I} = ${S.broadcastedIndicesToOffset(`outputIndices${I}`,b)};
            let indexA${I} = offsetA${I} / 4u;
            let indexB${I} = offsetB${I} / 4u;
            let componentA${I} = offsetA${I} % 4u;
            let componentB${I} = offsetB${I} % 4u;
            ${T}[${I}] = ${A}(${g(E,O)});
          `};p===9?x=`
            var data = vec4<u32>(0);
            ${$("data",0,"u32")}
            ${$("data",1,"u32")}
            ${$("data",2,"u32")}
            ${$("data",3,"u32")}
            outputData[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:x=`
            ${$("outputData[global_idx]",0)}
            ${$("outputData[global_idx]",1)}
            ${$("outputData[global_idx]",2)}
            ${$("outputData[global_idx]",3)}
          `}return`
        ${t.registerUniform("vec_size","u32").declareVariables(_,S,b)}

        ${m??""}

        ${t.mainStart()}
        ${t.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${x}
      }`},Kh=(t,e,r,n,o,i,a=r.dataType)=>{let u=r.dims.map(Number),d=n.dims.map(Number),c=!k.areEqual(u,d),p=u,m=k.size(u),g=!1,y=!1,b=[c];if(c){let _=ot.calcShape(u,d,!1);if(!_)throw new Error("Can't perform binary op on the given tensors");p=_.slice(),m=k.size(p);let S=k.size(u)===1,x=k.size(d)===1,$=u.length>0&&u[u.length-1]%4===0,T=d.length>0&&d[d.length-1]%4===0;b.push(S),b.push(x),b.push($),b.push(T);let I=1;for(let A=1;A<p.length;A++){let E=u[u.length-A],O=d[d.length-A];if(E===O)I*=E;else break}I%4===0?(y=!0,g=!0):(S||x||$||T)&&(g=!0)}else g=!0;return b.push(g),{name:t,shaderCache:{hint:e+b.map(_=>_.toString()).join("_"),inputDependencies:["rank","rank"]},getShaderSource:_=>qh(_,u,d,p,g,c,y,o,r.dataType,n.dataType,a,i),getRunData:()=>({outputs:[{dims:p,dataType:a}],dispatchGroup:{x:Math.ceil(m/64/4)},programUniforms:[{type:12,data:Math.ceil(k.size(p)/4)},...W(u,d,p)]})}},dt=(t,e,r,n,o,i)=>{t.compute(Kh(e,o??"",t.inputs[0],t.inputs[1],r,n,i))},fd=t=>{dt(t,"Add",(e,r)=>`${e}+${r}`)},hd=t=>{dt(t,"Div",(e,r)=>`${e}/${r}`)},gd=t=>{dt(t,"Equal",{scalar:(e,r)=>`u32(${e}==${r})`,vector:(e,r)=>`vec4<u32>(${e}==${r})`},void 0,void 0,9)},bd=t=>{dt(t,"Mul",(e,r)=>`${e}*${r}`)},yd=t=>{let e=D("input",t.inputs[0].dataType,t.inputs[0].dims).type.value;dt(t,"Pow",{scalar:(n,o)=>`pow_custom(${n},${o})`,vector:(n,o)=>`pow_vector_custom(${n},${o})`},`
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
      `)},_d=t=>{dt(t,"Sub",(e,r)=>`${e}-${r}`)},wd=t=>{dt(t,"Greater",{scalar:(e,r)=>`u32(${e}>${r})`,vector:(e,r)=>`vec4<u32>(${e}>${r})`},void 0,void 0,9)},vd=t=>{dt(t,"Less",{scalar:(e,r)=>`u32(${e}<${r})`,vector:(e,r)=>`vec4<u32>(${e}<${r})`},void 0,void 0,9)},$d=t=>{dt(t,"GreaterOrEqual",{scalar:(e,r)=>`u32(${e}>=${r})`,vector:(e,r)=>`vec4<u32>(${e}>=${r})`},void 0,void 0,9)},xd=t=>{dt(t,"LessOrEqual",{scalar:(e,r)=>`u32(${e}<=${r})`,vector:(e,r)=>`vec4<u32>(${e}<=${r})`},void 0,void 0,9)}});var Zh,Qh,Yh,Xh,Td,Id,Cd=V(()=>{"use strict";ee();te();Ce();oe();Zh=(t,e)=>{if(!t||t.length<1)throw new Error("too few inputs");let r=0,n=t[r],o=n.dataType,i=n.dims.length;t.forEach((a,u)=>{if(u!==r){if(a.dataType!==o)throw new Error("input tensors should be one type");if(a.dims.length!==i)throw new Error("input tensors should have the same shape");a.dims.forEach((d,c)=>{if(c!==e&&d!==n.dims[c])throw new Error("non concat dimensions must match")})}})},Qh=(t,e)=>`
  fn calculateInputIndex(index: u32) -> u32 {
    let sizeInConcatAxis = array<u32, ${t}u>(${e});
    for (var i: u32 = 0u; i < ${t}; i += 1u ) {
      if (index < sizeInConcatAxis[i]) {
        return i;
      }
    }
    return ${t}u;
  }`,Yh=(t,e)=>{let r=t.length,n=[];for(let o=0;o<r;++o){let i=e.setByOffset("global_idx",t[o].getByIndices("indices"));r===1?n.push(i):o===0?n.push(`if (inputIndex == ${o}u) { ${i} }`):o===r-1?n.push(`else { ${i} }`):n.push(`else if (inputIndex == ${o}) { ${i} }`)}return n.join(`
`)},Xh=(t,e,r,n)=>{let o=k.size(r),i=new Array(t.length),a=new Array(t.length),u=0,d=[],c=[],p=[{type:12,data:o}];for(let _=0;_<t.length;++_)u+=t[_].dims[e],i[_]=u,c.push(t[_].dims.length),a[_]=D(`input${_}`,n,c[_]),d.push("rank"),p.push({type:12,data:i[_]});for(let _=0;_<t.length;++_)p.push(...W(t[_].dims));p.push(...W(r));let m=R("output",n,r.length),g=m.indicesGet("indices",e),y=Array.from(Array(i.length).keys()).map(_=>`uniforms.sizeInConcatAxis${_}`).join(","),b=_=>`

  ${(()=>{_.registerUniform("outputSize","u32");for(let S=0;S<t.length;S++)_.registerUniform(`sizeInConcatAxis${S}`,"u32");return _.declareVariables(...a,m)})()}

  ${Qh(i.length,y)}

  ${_.mainStart()}
    ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

    var indices = ${m.offsetToIndices("global_idx")};

    let inputIndex = calculateInputIndex(${g});
    if (inputIndex != 0u) {
      let sizeInConcatAxis = array<u32, ${i.length}u>(${y});
      ${g} -= sizeInConcatAxis[inputIndex - 1u];
    }

    ${Yh(a,m)}
  }`;return{name:"Concat",shaderCache:{hint:`${e}`,inputDependencies:d},getRunData:()=>({outputs:[{dims:r,dataType:n}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:p}),getShaderSource:b}},Td=(t,e)=>{let r=t.inputs,n=r[0].dims,o=k.normalizeAxis(e.axis,n.length);Zh(r,o);let i=n.slice();i[o]=r.reduce((u,d)=>u+(d.dims.length>o?d.dims[o]:0),0);let a=r.filter(u=>k.size(u.dims)>0);t.compute(Xh(a,o,i,r[0].dataType),{inputs:a})},Id=t=>J({axis:t.axis})});var Qe,Ye,Xe,on,St=V(()=>{"use strict";ee();te();Qe=(t,e,r="f32")=>{switch(t.activation){case"Relu":return`value = max(value, ${e}(0.0));`;case"Sigmoid":return`value = (${e}(1.0) / (${e}(1.0) + exp(-value)));`;case"Clip":return`value = clamp(value, ${e}(${r}(uniforms.clip_min)), ${e}(${r}(uniforms.clip_max)));`;case"HardSigmoid":return`value = max(${e}(0.0), min(${e}(1.0), ${r}(uniforms.alpha) * value + ${r}(uniforms.beta)));`;case"LeakyRelu":return`value = select(${r}(uniforms.alpha) * value, value, value >= ${e}(0.0));`;case"Tanh":return`let e2x = exp(-2.0 * abs(value));
              value = sign(value) * (1.0 - e2x) / (1.0 + e2x);
        `;case"":return"";default:throw new Error(`Unsupported activation ${t.activation}`)}},Ye=(t,e)=>{t.activation==="Clip"?e.push({type:1,data:t.clipMax},{type:1,data:t.clipMin}):t.activation==="HardSigmoid"?e.push({type:1,data:t.alpha},{type:1,data:t.beta}):t.activation==="LeakyRelu"&&e.push({type:1,data:t.alpha})},Xe=(t,e)=>{t.activation==="Clip"?e.push({name:"clip_max",type:"f32"},{name:"clip_min",type:"f32"}):t.activation==="HardSigmoid"?e.push({name:"alpha",type:"f32"},{name:"beta",type:"f32"}):t.activation==="LeakyRelu"&&e.push({name:"alpha",type:"f32"})},on=t=>{let e=t?.activation||"";if(e==="HardSigmoid"){let[r,n]=t?.activation_params||[.2,.5];return{activation:e,alpha:r,beta:n}}else if(e==="Clip"){let[r,n]=t?.activation_params||[Os,Bs];return{activation:e,clipMax:n,clipMin:r}}else if(e==="LeakyRelu"){let[r]=t?.activation_params||[.01];return{activation:e,alpha:r}}return{activation:e}}});var Pe,Ad,an=V(()=>{"use strict";Pe=(t,e)=>{switch(t){case 1:return e;case 2:return`vec2<${e}>`;case 3:return`vec3<${e}>`;case 4:return`vec4<${e}>`;default:throw new Error(`${t}-component is not supported.`)}},Ad=t=>`
      ${t?"value = value + getBiasByOutputCoords(coords);":""}
      `});var Ed,kd=V(()=>{"use strict";Ed=t=>`
fn getIndexFromCoords4D(coords : vec4<i32>, shape : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
      shape.y * shape.z * shape.w, shape.z * shape.w, shape.w, 1));
}
fn getOutputIndexFromCoords(coords : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
    i32(${t}.x), i32(${t}.y), i32(${t}.z), 1));
}
`});var sr,sn,un=V(()=>{"use strict";ee();te();oe();St();sr=(t,e,r,n,o)=>{let i=n-r;return`
      ${Array.from({length:r}).map((a,u)=>`
      if (${j(e.shape,u,e.rank)} != 1) {
        ${e.indicesSet(t,u,j(o,u+i,n))}
      } else {
        ${e.indicesSet(t,u,0)}
      }`).join("")}
`},sn=(t,e,r,n,o=!1,i)=>{let a=t[0].dims,u=t[1].dims,d=a[a.length-2],c=u[u.length-1],p=a[a.length-1],m=fe(c),g=fe(p),y=fe(d),b=k.size(r)/m/y,_=t.length>2,S=n?n.slice(0,-2):r.slice(0,-2),$=[k.size(S),d,c],T=[{type:12,data:b},{type:12,data:d},{type:12,data:c},{type:12,data:p}];Ye(e,T),T.push(...W(S,a,u)),_&&T.push(...W(t[2].dims)),T.push(...W($));let I=A=>{let E=Xr("batch_dims",t[0].dataType,S.length),O=D("a",t[0].dataType,a.length,g),w=D("b",t[1].dataType,u.length,m),U=R("output",t[0].dataType,$.length,m),N=we(U.type.tensor),F=Qe(e,U.type.value,N),q=[O,w],X="";if(_){let Q=o?m:1;q.push(D("bias",t[2].dataType,t[2].dims.length,Q)),X=`${o?`value += bias[col / ${Q}];`:`value += ${U.type.value}(bias[row + i]);`}`}let B=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"}];Xe(e,B);let L=()=>{let Q=`var a_data: ${O.type.value};`;for(let Y=0;Y<g;Y++)Q+=`
              let b_data${Y} = b[(b_offset + (k + ${Y}) * uniforms.N + col) / ${m}];`;for(let Y=0;Y<y;Y++){Q+=`a_data = a[(a_offset + (row + ${Y}) * uniforms.K + k) / ${g}];`;for(let Z=0;Z<g;Z++)Q+=`
            values[${Y}] = fma(${w.type.value}(a_data${g===1?"":`[${Z}]`}), b_data${Z}, values[${Y}]);
`}return Q};return`
  ${A.registerUniforms(B).registerInternalVariables(E).declareVariables(...q,U)}
  ${A.mainStart()}
    ${A.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let col = (global_idx % (uniforms.N / ${m})) * ${m};
    var index1 = global_idx / (uniforms.N / ${m});
    let stride1 = uniforms.M / ${y};
    let row = (index1 % stride1) * ${y};
    let batch = index1 / stride1;

    ${r.length===2?"":`let batch_indices = ${E.offsetToIndices("batch")};`}

    var a_indices: ${O.type.indices};
    ${sr("a_indices",O,O.rank-2,E.rank,"batch_indices")}
    ${O.indicesSet("a_indices",O.rank-2,0)}
    ${O.indicesSet("a_indices",O.rank-1,0)}
    let a_offset = ${O.indicesToOffset("a_indices")};

    var b_indices: ${w.type.indices};
    ${sr("b_indices",w,w.rank-2,E.rank,"batch_indices")}
    ${w.indicesSet("b_indices",w.rank-2,0)}
    ${w.indicesSet("b_indices",w.rank-1,0)}
    let b_offset = ${w.indicesToOffset("b_indices")};
    var values: array<${U.type.value}, ${y}>;
    for (var k: u32 = 0u; k < uniforms.K; k = k + ${g}) {
      ${L()}
    }
    for (var i = 0u; i < ${y}u; i++) {
      var value = values[i];
      ${X}
      ${F}
      let cur_indices = ${U.type.indices}(batch, row + i, col);
      let offset = ${U.indicesToOffset("cur_indices")};
      ${U.setByOffset(`offset / ${m}`,"value")};
    }
  }
  `};return{name:"MatMulNaive",shaderCache:{hint:`${e.activation};${m};${g};${y};${o}`,inputDependencies:_?["rank","rank","rank"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:i?i(r):r,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(b/64)},programUniforms:T}),getShaderSource:I}}});var Jh,eg,xo,Pd,tg,So,rg,ur,dn=V(()=>{"use strict";ee();te();oe();St();un();an();Jh=(t,e)=>t?`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          kStart + inputRow,
          globalRowStart / innerElementSize + inputCol${e?", batchIndices":""});
        `:`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          globalRow + innerRow,
          kStart / innerElementSize + inputCol${e?", batchIndices":""});
        `,eg=(t,e)=>t?`
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
        }`,xo=(t,e,r="f32",n,o=!1,i=32,a=!1,u=32)=>{let d=e[1]*t[1],c=e[0]*t[0],p=o?d:i,m=o?i:d,g=p/e[0],y=i/e[1];if(!((o&&g===4&&t[1]===4||!o&&(g===3||g===4))&&p%e[0]===0&&i%e[1]===0&&t[0]===4))throw new Error(`If transposeA ${o} is true, innerElementSize ${g} and workPerThread[1] ${t[1]} must be 4.
      Otherwise, innerElementSize ${g} must be 3 or 4.
  tileAWidth ${p} must be divisible by workgroupSize[0]${e[0]}. tileInner ${i} must be divisible by workgroupSize[1] ${e[1]}. colPerThread ${t[0]} must be 4.`);return`
var<workgroup> mm_Asub: array<array<vec${g}<${r}>, ${p/g}>, ${m}>;
var<workgroup> mm_Bsub: array<array<vec4<${r}>, ${c/t[0]}>, ${i}>;

const rowPerThread = ${t[1]};
const colPerThread = ${t[0]};
const innerElementSize = ${g};
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
  let batch = ${a?"0":"i32(globalId.z)"};
  ${n?`let batchIndices = ${n.offsetToIndices("u32(batch)")};`:""}
  let globalRowStart = i32(workgroupId.y) * ${d};

  let num_tiles = ${a?`${Math.ceil(u/i)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
  var kStart = ${a?`i32(globalId.z) * ${u}`:"0"};

  var acc: array<vec4<${r}>, rowPerThread>;

  // Loop over shared dimension.
  let tileRowB = localRow * ${y};
  for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let inputRow = tileRow + innerRow;
          let inputCol = tileCol;
          ${Jh(o,n)}
      }

      // Load one tile of B into local memory.
      for (var innerRow = 0; innerRow < ${y}; innerRow = innerRow + 1) {
          let inputRow = tileRowB + innerRow;
          let inputCol = tileCol;
          mm_Bsub[inputRow][inputCol] = mm_readB(batch, kStart + inputRow, globalCol${n?", batchIndices":""});
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      for (var k = 0; k < tileInner / innerElementSize; k = k + 1) {
          let BCached0 = mm_Bsub[k * innerElementSize][tileCol];
          let BCached1 = mm_Bsub[k * innerElementSize + 1][tileCol];
          let BCached2 = mm_Bsub[k * innerElementSize + 2][tileCol];
          ${g===3?"":"let BCached3 = mm_Bsub[k * innerElementSize + 3][tileCol];"}

          ${eg(o,g)}
      }

      workgroupBarrier();
  }

  for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      mm_write(batch, globalRow + innerRow, globalCol, acc[innerRow]);
  }
}`},Pd=(t,e)=>t?`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              kStart + inputRow,
              globalRowStart + inputCol${e?", batchIndices":""});
            `:`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              globalRowStart + inputRow,
              kStart + inputCol${e?", batchIndices":""});
            `,tg=t=>t?"let ACached = mm_Asub[k][tileRow + innerRow];":"let ACached = mm_Asub[tileRow + innerRow][k];",So=(t,e,r="f32",n,o=!1,i=32,a=!1,u=32,d=!1)=>{let c=t[1]*e[1],p=t[0]*e[0],m=o?c:i,g=o?i:c;if(!(g%e[1]===0&&m%e[0]===0&&i%e[1]===0))throw new Error(`tileAHight ${g} must be divisible by workgroupSize[1]${e[1]}, tileAWidth ${m} must be divisible by workgroupSize[0]${e[0]}, tileInner ${i} must be divisible by workgroupSize[1]${e[1]}`);let y=g/e[1],b=m/e[0],_=i/e[1],S=d?`
    let localRow = i32(localId.y);
    let localCol = i32(localId.x);
    let globalRowStart = i32(workgroupId.y) * ${c};
    let globalColStart = i32(workgroupId.x) * ${p};

    // Loop over shared dimension.
    for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var inputRow = localRow; inputRow < ${g}; inputRow = inputRow + ${e[1]}) {
        for (var inputCol = localCol; inputCol < ${m}; inputCol = inputCol + ${e[0]}) {
          ${Pd(o,n)}
        }
      }
      // Load one tile of B into local memory.
      for (var inputRow = localRow; inputRow < ${i}; inputRow = inputRow + ${e[1]}) {
            for (var inputCol = localCol; inputCol < ${p}; inputCol = inputCol + ${e[0]}) {
          mm_Bsub[inputRow][inputCol] = mm_readB(batch,
            kStart + inputRow,
            globalColStart + inputCol${n?", batchIndices":""});
        }
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      var BCached : array<${r}, colPerThread>;
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
let globalRowStart = i32(workgroupId.y) * ${c};

let tileRowA = i32(localId.y) * ${y};
let tileColA = i32(localId.x) * ${b};
let tileRowB = i32(localId.y) * ${_};
// Loop over shared dimension.
for (var t = 0; t < num_tiles; t = t + 1) {
  // Load one tile of A into local memory.
  for (var innerRow = 0; innerRow < ${y}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < ${b}; innerCol = innerCol + 1) {
      let inputRow = tileRowA + innerRow;
      let inputCol = tileColA + innerCol;
      ${Pd(o,n)}
    }
  }

  // Load one tile of B into local memory.
  for (var innerRow = 0; innerRow < ${_}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
      let inputRow = tileRowB + innerRow;
      let inputCol = tileCol + innerCol;
      mm_Bsub[inputRow][inputCol] = mm_readB(batch,
        kStart + inputRow,
        globalCol + innerCol${n?", batchIndices":""});
    }
  }
  kStart = kStart + tileInner;
  workgroupBarrier();

  // Compute acc values for a single thread.
  var BCached : array<${r}, colPerThread>;
  for (var k = 0; k < tileInner; k = k + 1) {
    for (var inner = 0; inner < colPerThread; inner = inner + 1) {
      BCached[inner] = mm_Bsub[k][tileCol + inner];
    }

    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      ${tg(o)}
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
  var<workgroup> mm_Asub : array<array<${r}, ${m}>, ${g}>;
  var<workgroup> mm_Bsub : array<array<${r}, ${p}>, ${i}>;
  const rowPerThread = ${t[1]};
  const colPerThread = ${t[0]};
  const tileInner = ${i};

@compute @workgroup_size(${e[0]}, ${e[1]}, ${e[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
    let batch = ${a?"0":"i32(globalId.z)"};
    ${n?`let batchIndices = ${n.offsetToIndices("u32(batch)")};`:""}
    let num_tiles = ${a?`${Math.ceil(u/i)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
    var kStart = ${a?`i32(globalId.z) * ${u}`:"0"};

    var acc : array<array<${r}, colPerThread>, rowPerThread>;
    ${S}
  }
`},rg=(t,e,r,n,o=!1)=>{let[i,a,u,d]=n,c=we(n[0].type.tensor);return`
    fn mm_readA(batch: i32, row: i32, colIn: i32, batchIndices: ${i.type.indices}) -> ${Pe(t,c)} {
      var value = ${Pe(t,c)}(0.0);
      let col = colIn * ${t};
      if(row < uniforms.dim_a_outer && col < uniforms.dim_inner)
      {
        var aIndices: ${a.type.indices};
        ${sr("aIndices",a,a.rank-2,i.rank,"batchIndices")}
        ${a.indicesSet("aIndices",a.rank-2,"u32(row)")}
        ${a.indicesSet("aIndices",a.rank-1,"u32(colIn)")}
        value = ${a.getByIndices("aIndices")};
      }
      return value;
    }

    fn mm_readB(batch: i32, row: i32, colIn: i32, batchIndices: ${i.type.indices}) -> ${Pe(t,c)} {
      var value = ${Pe(t,c)}(0.0);
      let col = colIn * ${t};
      if(row < uniforms.dim_inner && col < uniforms.dim_b_outer)
      {
        var bIndices: ${u.type.indices};
        ${sr("bIndices",u,u.rank-2,i.rank,"batchIndices")}
        ${u.indicesSet("bIndices",u.rank-2,"u32(row)")}
        ${u.indicesSet("bIndices",u.rank-1,"u32(colIn)")}
        value = ${u.getByIndices("bIndices")};
      }
      return value;
    }

    fn mm_write(batch: i32, row: i32, colIn: i32, valueIn: ${Pe(t,c)}) {
      let col = colIn * ${t};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer) {
        var value = valueIn;
        let coords = vec3<i32>(batch, row, colIn);
        ${e?`value = value + ${o?"bias[colIn]":`${Pe(t,c)}(bias[row])`};`:""}
        ${r}
        ${d.setByIndices("vec3<u32>(coords)","value")}
      }
    }
    `},ur=(t,e,r,n,o=!1,i)=>{let a=t[0].dims,u=t[1].dims,d=a.slice(0,-2),c=u.slice(0,-2),p=n?n.slice(0,-2):r.slice(0,-2),m=k.size(p),g=a[a.length-2],y=a[a.length-1],b=u[u.length-1],_=y%4===0&&b%4===0,S=g<=8?[4,1,1]:[4,4,1],x=[8,8,1],$=[Math.ceil(b/x[0]/S[0]),Math.ceil(g/x[1]/S[1]),Math.ceil(m/x[2]/S[2])],T=_?4:1,I=[...d,g,y/T],A=I.length,E=[...c,y,b/T],O=E.length,w=[m,g,b/T],U=[{type:6,data:g},{type:6,data:b},{type:6,data:y}];Ye(e,U),U.push(...W(p,I,E));let N=["rank","rank"],F=t.length>2;F&&(U.push(...W(t[2].dims)),N.push("rank")),U.push(...W(w));let q=X=>{let B=p.length,L=Xr("batchDims",t[0].dataType,B,1),Q=we(t[0].dataType),Y=D("a",t[0].dataType,A,T),Z=D("b",t[1].dataType,O,T),ne=R("result",t[0].dataType,w.length,T),ie=[Y,Z];if(F){let G=o?T:1;ie.push(D("bias",t[2].dataType,t[2].dims.length,G))}let ce=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"}];Xe(e,ce);let Me=we(ne.type.tensor),ve=Qe(e,ne.type.value,Me),M=rg(T,F,ve,[L,Y,Z,ne],o);return`
  ${X.registerUniforms(ce).registerInternalVariables(L).declareVariables(...ie,ne)}
  ${M}
  ${_?xo(S,x,Q,L):So(S,x,Q,L)}
                   `};return{name:"MatMul",shaderCache:{hint:`${S};${e.activation};${_};${o}`,inputDependencies:N},getRunData:()=>({outputs:[{dims:i?i(r):r,dataType:t[0].dataType}],dispatchGroup:{x:$[0],y:$[1],z:$[2]},programUniforms:U}),getShaderSource:q}}});var ng,Dd,Od=V(()=>{"use strict";ee();nt();oe();St();an();kd();dn();ng=(t,e,r,n,o=!1,i,a=4,u=4,d=4,c="f32")=>{let p=N=>{switch(N){case 1:return"resData = x[xIndex];";case 3:return`resData = vec3<${c}>(x[xIndex], x[xIndex + 1], x[xIndex + 2]);`;case 4:return"resData = x[xIndex / 4];";default:throw new Error(`innerElementSize ${N} is not supported.`)}},m=N=>{switch(N){case 1:return"return w[row * i32(uniforms.w_shape[3]) + colIn];";case 4:return"return w[row * i32(uniforms.w_shape[3]) / 4 + colIn];";default:throw new Error(`innerElementSize ${N} is not supported.`)}},g=t?`
    let coord = vec4<i32>(batch, xRow, xCol, xCh);
    `:`
    let coord = vec4<i32>(batch, xCh, xRow, xCol);
    `,y=t?`
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
    `,b=t?"i32(uniforms.x_shape[1])":"i32(uniforms.x_shape[2])",_=t?"i32(uniforms.x_shape[2])":"i32(uniforms.x_shape[3])",S=t?"row":"col",x=t?"col":"row",$=`
    let inChannels = i32(uniforms.w_shape[2]);
    let outWidth = ${t?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
    let outRow = ${S} / outWidth;
    let outCol = ${S} % outWidth;

    let WRow = ${x} / (i32(uniforms.w_shape[1]) * inChannels);
    let WCol = ${x} / inChannels % i32(uniforms.w_shape[1]);
    let xRow = outRow * uniforms.stride[0] + uniforms.dilation[0] * WRow - uniforms.pad[0];
    let xCol = outCol * uniforms.stride[1] + uniforms.dilation[1] * WCol - uniforms.pad[1];
    let xCh = ${x} % inChannels;
    var resData = ${Pe(a,c)}(0.0);
    // The bounds checking is always needed since we use it to pad zero for
    // the 'same' padding type.
    if (xRow >= 0 && xRow < ${b} && xCol >= 0 && xCol < ${_}) {
      ${g}
      let xIndex = getIndexFromCoords4D(coord, vec4<i32>(uniforms.x_shape));
      ${p(a)}
    }
    return resData;`,T=t?e&&n?`
    let col = colIn * ${a};
    ${$}`:`
    let col = colIn * ${a};
    if (row < uniforms.dim_a_outer && col < uniforms.dim_inner) {
      ${$}
    }
    return ${Pe(a,c)}(0.0);`:n&&r?`
    let col = colIn * ${a};
    ${$}`:`
    let col = colIn * ${a};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${$}
    }
    return ${Pe(a,c)}(0.0);`,I=t?n&&r?m(u):`
    let col = colIn * ${u};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${m(u)}
    }
    return ${Pe(u,c)}(0.0);`:`
    let col = colIn * ${u};
    if (row < uniforms.dim_inner && col < uniforms.dim_a_outer) {
      ${m(u)}
    }
    return ${Pe(u,c)}(0.0);`,A=Pe(d,c),E=t?Pe(a,c):Pe(u,c),O=t?Pe(u,c):Pe(a,c),w=Qe(i,A,c);return`
    fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${E} {
      ${t?T:I}
    }

    fn mm_readB(batch: i32, row : i32, colIn : i32) -> ${O} {
      ${t?I:T}
    }

    fn mm_write(batch: i32, row : i32, colIn : i32, valueIn : ${A}) {
      let col = colIn * ${d};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer)
      {
      var value = valueIn;
      let outWidth = ${t?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
      ${y}
      ${Ad(o)}
      ${w}
      setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);
      }
    }`},Dd=(t,e,r,n,o,i,a,u,d)=>{let c=e.format==="NHWC",p=c?t[0].dims[3]:t[0].dims[1],m=r[0],g=c?r[2]:r[3],y=c?r[1]:r[2],b=c?r[3]:r[1],_=c&&(p%4===0||p%3===0)&&b%4===0,S=c?b:g*y,x=c?g*y:b,$=[8,8,1],T=n<=8?[4,1,1]:[4,4,1],I=[Math.ceil(S/$[0]/T[0]),Math.ceil(x/$[1]/T[1]),Math.ceil(m/$[2]/T[2])];se("verbose",()=>`[conv2d_mm_webgpu] dispatch = ${I}`);let A=_?c&&p%4!==0?3:4:1,E=$[1]*T[1],O=$[0]*T[0],w=Math.max($[0]*A,$[1]),U=n%E===0,N=o%O===0,F=i%w===0,q=_?[A,4,4]:[1,1,1],X=[{type:6,data:n},{type:6,data:o},{type:6,data:i},{type:6,data:[e.pads[0],e.pads[1]]},{type:6,data:e.strides},{type:6,data:e.dilations}];Ye(e,X),X.push(...W(t[0].dims,t[1].dims));let B=["rank","rank"];a&&(X.push(...W(t[2].dims)),B.push("rank")),X.push(...W(r));let L=Q=>{let Y=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"},{name:"pad",type:"i32",length:2},{name:"stride",type:"i32",length:2},{name:"dilation",type:"i32",length:2}];Xe(e,Y);let Z=_?4:1,ne=we(t[0].dataType),ie=`
      fn setOutputAtIndex(flatIndex : i32, value : ${_?`vec4<${ne}>`:ne}) {
        result[flatIndex] = ${_?`vec4<${ne}>`:ne}(value);
      }
      fn setOutputAtCoords(d0 : i32, d1 : i32, d2 : i32, d3 : i32, value : ${_?`vec4<${ne}>`:ne}) {
        let flatIndex = getOutputIndexFromCoords(vec4<i32>(d0, d1, d2, d3));
        setOutputAtIndex(flatIndex ${_?"/ 4":""}, value);
      }`,ce=D("x",t[0].dataType,t[0].dims.length,A===3?1:A),Me=D("w",t[1].dataType,t[1].dims.length,Z),ve=[ce,Me],M=R("result",t[0].dataType,r.length,Z);if(a){let G=D("bias",t[2].dataType,t[2].dims.length,Z);ve.push(G),ie+=`
        fn getBiasByOutputCoords(coords : vec4<i32>) -> ${_?`vec4<${ne}>`:ne} {
          return bias[coords.${c?"w":"y"}${_?"/ 4":""}];
        }`}return`
        ${Ed("uniforms.result_strides")}
        //struct Uniforms { xShape : vec4<i32>, wShape : vec4<i32>, outShape : vec4<i32>,
        //  outShapeStrides: vec3<i32>, filterDims : vec2<i32>, pad : vec2<i32>, stride : vec2<i32>,
        //  dilation : vec2<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32 };
        ${Q.registerUniforms(Y).declareVariables(...ve,M)}
        ${ie}
        ${ng(c,U,N,F,a,e,q[0],q[1],q[2],ne)}
        ${_?xo(T,$,ne,void 0,!c,w):So(T,$,ne,void 0,!c,w,!1,void 0,u)}`};return{name:"Conv2DMatMul",shaderCache:{hint:`${e.cacheKey};${A};${_};${U};${N};${F};${E};${O};${w}`,inputDependencies:B},getRunData:()=>({outputs:[{dims:d?d(r):r,dataType:t[0].dataType}],dispatchGroup:{x:I[0],y:I[1],z:I[2]},programUniforms:X}),getShaderSource:L}}});var og,Bd,ln,ig,zd,ag,Md,Rd,Ud=V(()=>{"use strict";ee();nt();te();oe();St();an();og=t=>{let e=1;for(let r=0;r<t.length;r++)e*=t[r];return e},Bd=t=>typeof t=="number"?[t,t,t]:t,ln=(t,e)=>e<=1?t:t+(t-1)*(e-1),ig=(t,e,r,n=1)=>{let o=ln(e,n);return Math.floor((t[0]*(r-1)-r+o)/2)},zd=(t,e,r,n,o)=>{o==null&&(o=ig(t,e[0],n[0]));let i=[0,0,0,r];for(let a=0;a<3;a++)t[a]+2*o>=e[a]&&(i[a]=Math.trunc((t[a]-e[a]+2*o)/n[a]+1));return i},ag=(t,e,r,n,o,i,a,u,d,c)=>{let p,m,g,y;if(t==="VALID"&&(t=0),typeof t=="number"){p={top:t,bottom:t,left:t,right:t,front:t,back:t};let b=zd([e,r,n,1],[u,d,c],1,[o,i,a],t);m=b[0],g=b[1],y=b[2]}else if(Array.isArray(t)){if(!t.every((_,S,x)=>_===x[0]))throw Error(`Unsupported padding parameter: ${t}`);p={top:t[0],bottom:t[1],left:t[2],right:t[3],front:t[4],back:t[5]};let b=zd([e,r,n,1],[u,d,c],1,[o,i,a],t[0]);m=b[0],g=b[1],y=b[2]}else if(t==="SAME_UPPER"){m=Math.ceil(e/o),g=Math.ceil(r/i),y=Math.ceil(n/a);let b=(m-1)*o+u-e,_=(g-1)*i+d-r,S=(y-1)*a+c-n,x=Math.floor(b/2),$=b-x,T=Math.floor(_/2),I=_-T,A=Math.floor(S/2),E=S-A;p={top:T,bottom:I,left:A,right:E,front:x,back:$}}else throw Error(`Unknown padding parameter: ${t}`);return{padInfo:p,outDepth:m,outHeight:g,outWidth:y}},Md=(t,e,r,n,o,i=!1,a="channelsLast")=>{let u,d,c,p,m;if(a==="channelsLast")[u,d,c,p,m]=t;else if(a==="channelsFirst")[u,m,d,c,p]=t;else throw new Error(`Unknown dataFormat ${a}`);let[g,,y,b,_]=e,[S,x,$]=Bd(r),[T,I,A]=Bd(n),E=ln(y,T),O=ln(b,I),w=ln(_,A),{padInfo:U,outDepth:N,outHeight:F,outWidth:q}=ag(o,d,c,p,S,x,$,E,O,w),X=i?g*m:g,B=[0,0,0,0,0];return a==="channelsFirst"?B=[u,X,N,F,q]:a==="channelsLast"&&(B=[u,N,F,q,X]),{batchSize:u,dataFormat:a,inDepth:d,inHeight:c,inWidth:p,inChannels:m,outDepth:N,outHeight:F,outWidth:q,outChannels:X,padInfo:U,strideDepth:S,strideHeight:x,strideWidth:$,filterDepth:y,filterHeight:b,filterWidth:_,effectiveFilterDepth:E,effectiveFilterHeight:O,effectiveFilterWidth:w,dilationDepth:T,dilationHeight:I,dilationWidth:A,inShape:t,outShape:B,filterShape:e}},Rd=(t,e,r,n,o,i)=>{let a=i==="channelsLast",u=a?t[0].dims[3]:t[0].dims[1],d=!1,c=[64,1,1],p={x:r.map(($,T)=>T)},m=[Math.ceil(og(p.x.map($=>r[$]))/c[0]),1,1];se("verbose",()=>`[conv3d_naive_webgpu] dispatch = ${m}`);let g=d?a&&u%4!==0?3:4:1,y=k.size(r),b=[{type:12,data:y},{type:12,data:n},{type:12,data:o},{type:12,data:e.strides},{type:12,data:e.dilations}];Ye(e,b),b.push(...W(t[0].dims,t[1].dims));let _=["rank","rank"],S=t.length===3;S&&(b.push(...W(t[2].dims)),_.push("rank")),b.push(...W(r));let x=$=>{let T=[{name:"output_size",type:"u32"},{name:"filter_dims",type:"u32",length:n.length},{name:"pads",type:"u32",length:o.length},{name:"strides",type:"u32",length:e.strides.length},{name:"dilations",type:"u32",length:e.dilations.length}];Xe(e,T);let I=d?4:1,A=we(t[0].dataType),E=D("x",t[0].dataType,t[0].dims.length,g===3?1:g),O=D("W",t[1].dataType,t[1].dims.length,I),w=[E,O],U=R("result",t[0].dataType,r.length,I),N="";if(S){let X=D("bias",t[2].dataType,t[2].dims.length,I);w.push(X),N+=`
        fn getBiasByOutputCoords(coords : array<u32, 5>) -> ${d?`vec4<${A}>`:A} {
          return bias[${a?j("coords",4,5):j("coords",1,5)}${d?"/ 4":""}];
        }`}let F=Pe(g,A),q=Qe(e,F,A);return`
            ${N}
            fn getX(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> ${A} {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${E.getByIndices("aIndices")};
            }
            fn getW(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> ${A} {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${O.getByIndices("aIndices")};
            }
          ${$.registerUniforms(T).declareVariables(...w,U)}
          ${$.mainStart()}
          ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
              let coords = ${U.offsetToIndices("global_idx")};
              let batch = ${j("coords",0,E.rank)};
              let d2 = ${a?j("coords",E.rank-1,E.rank):j("coords",1,E.rank)};
              let xFRCCorner = vec3<u32>(${a?j("coords",1,E.rank):j("coords",2,E.rank)},
              ${a?j("coords",2,E.rank):j("coords",3,E.rank)},
              ${a?j("coords",3,E.rank):j("coords",4,E.rank)}) * uniforms.strides - uniforms.pads;
              let xFCorner = xFRCCorner.x;
              let xRCorner = xFRCCorner.y;
              let xCCorner = xFRCCorner.z;
              let xShapeY = ${a?j("uniforms.x_shape",1,E.rank):j("uniforms.x_shape",2,E.rank)};
              let xShapeZ = ${a?j("uniforms.x_shape",2,E.rank):j("uniforms.x_shape",3,E.rank)};
              let xShapeW = ${a?j("uniforms.x_shape",3,E.rank):j("uniforms.x_shape",4,E.rank)};
              let xShapeU = ${a?j("uniforms.x_shape",4,E.rank):j("uniforms.x_shape",1,E.rank)};
              let inputDepthNearestVec4 = (xShapeU / 4) * 4;
              let inputDepthVec4Remainder = xShapeU % 4;

              var value = ${A}(0);
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
                      ${a?`let xValues = vec4<${A}>(
                               getX(batch, xF, xR, xC, d1),
                               getX(batch, xF, xR, xC, d1 + 1),
                               getX(batch, xF, xR, xC, d1 + 2),
                               getX(batch, xF, xR, xC, d1 + 3));
                            `:`let xValues = vec4<${A}>(
                               getX(batch, d1, xF, xR, xC),
                               getX(batch, d1 + 1, xF, xR, xC),
                               getX(batch, d1 + 2, xF, xR, xC),
                               getX(batch, d1 + 3, xF, xR, xC));
                            `}
                            let wValues = vec4<${A}>(
                              getW(d2, d1, wF, wR, wC),
                              getW(d2, d1 + 1, wF, wR, wC),
                              getW(d2, d1 + 2, wF, wR, wC),
                              getW(d2, d1 + 3, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                    if (inputDepthVec4Remainder == 1) {
                        ${a?`value += getX(batch, xF, xR, xC, inputDepthNearestVec4)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`:`value += getX(batch, inputDepthNearestVec4, xF, xR, xC)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`}
                    } else if (inputDepthVec4Remainder == 2) {
                      ${a?`let xValues = vec2<${A}>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1));
                      `:`let xValues = vec2<${A}>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC));
                    `}
                    let wValues = vec2<${A}>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC));
                      value += dot(xValues, wValues);
                    } else if (inputDepthVec4Remainder == 3) {
                      ${a?`let xValues = vec3<${A}>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 2));
                      `:`let xValues = vec3<${A}>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 2, xF, xR, xC));
                    `}
                    let wValues = vec3<${A}>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 2, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                  }
                }
              }
              ${S?"value = value + getBiasByOutputCoords(coords)":""};
              ${q}
              result[global_idx] = ${A}(value);
          }`};return{name:"Conv3DNaive",shaderCache:{hint:`${e.cacheKey};${a};${g};${S}`,inputDependencies:_},getRunData:()=>({outputs:[{dims:r,dataType:t[0].dataType}],dispatchGroup:{x:m[0],y:m[1],z:m[2]},programUniforms:b}),getShaderSource:x}}});var Nd,Vd,Ld=V(()=>{"use strict";ee();te();oe();St();Nd=(t,e,r,n)=>{let o=t.length>2,i=o?"value += b[output_channel];":"",a=t[0].dims,u=t[1].dims,d=e.format==="NHWC",c=d?r[3]:r[1],p=c/e.group,m=d&&p>=4?fe(c):1,g=k.size(r)/m,y=[{type:12,data:g},{type:12,data:e.dilations},{type:12,data:[e.strides[0],e.strides[1]]},{type:12,data:[e.pads[0],e.pads[1]]},{type:12,data:p}];Ye(e,y),y.push(...W(a,[u[0],u[1],u[2],u[3]/m]));let b=o?["rank","rank","rank"]:["rank","rank"];y.push(...W([r[0],r[1],r[2],r[3]/m]));let _=S=>{let x=R("output",t[0].dataType,r.length,m),$=we(x.type.tensor),T=Qe(e,x.type.value,$),I=D("x",t[0].dataType,a.length),A=D("w",t[1].dataType,u.length,m),E=[I,A];o&&E.push(D("b",t[2].dataType,t[2].dims,m));let O=[{name:"output_size",type:"u32"},{name:"dilations",type:"u32",length:e.dilations.length},{name:"strides",type:"u32",length:2},{name:"pads",type:"u32",length:2},{name:"output_channels_per_group",type:"u32"}];Xe(e,O);let w=d?`
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
            let xVal = ${I.get("batch","xHeight","xWidth","input_channel")};
            let wVal = ${A.get("wHeight","wWidth","wInChannel","output_channel")};
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

            let xVal = ${I.get("batch","input_channel","xHeight","xWidth")};
            let wVal = ${A.get("output_channel","wInChannel","wHeight","wWidth")};
            value += xVal * wVal;
          }
        }
      }
      `;return`
  ${S.registerUniforms(O).declareVariables(...E,x)}

  ${S.mainStart()}
    ${S.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let outputIndices = ${x.offsetToIndices("global_idx")};
    let batch: u32 = outputIndices[0];
    let output_channel: u32 = outputIndices[${d?3:1}];
    let xRCCorner: vec2<u32> = vec2<u32>(outputIndices[${d?1:2}], outputIndices[${d?2:3}]) * uniforms.strides - uniforms.pads;
    let group_id: u32 = output_channel * ${m} / uniforms.output_channels_per_group;
    var in_channel_offset = group_id * uniforms.w_shape[${d?2:1}];

    var value: ${x.type.value} = ${x.type.value}(0);
    ${w}
    ${i}
    ${T}
    ${x.setByOffset("global_idx","value")}
  }`};return{name:"GroupedConv",shaderCache:{hint:`${e.cacheKey}_${m}`,inputDependencies:b},getRunData:()=>({outputs:[{dims:n?n(r):r,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(g/64)},programUniforms:y}),getShaderSource:_}},Vd=(t,e,r,n)=>{let o=t.length>2,i=fe(r[3]),a=fe(r[2]),u=k.size(r)/i/a,d=[t[0].dims[0],t[0].dims[1],t[0].dims[2],t[0].dims[3]/i],c=[t[1].dims[0],t[1].dims[1],t[1].dims[2],t[1].dims[3]/i],p=[r[0],r[1],r[2],r[3]/i],m=[{type:12,data:u},{type:6,data:[e.strides[0],e.strides[1]]},{type:6,data:[e.pads[0],e.pads[1]]}];Ye(e,m),m.push(...W(d,c,p));let g=(a-1)*e.strides[1]+c[1],y=b=>{let _=R("output",t[0].dataType,p.length,i),S=we(_.type.tensor),x=Qe(e,_.type.value,S),$=D("x",t[0].dataType,d.length,i),T=D("w",t[1].dataType,c.length,i),I=[$,T];o&&I.push(D("b",t[2].dataType,t[2].dims,i));let A=o?"value += b[output_channel];":"",E=[{name:"output_size",type:"u32"},{name:"strides",type:"i32",length:2},{name:"pads",type:"i32",length:2}];return Xe(e,E),`
  ${b.registerUniforms(E).declareVariables(...I,_)}
  ${b.mainStart()}
    ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let width0 = uniforms.output_shape[3];
    let output_channel = global_idx % width0;
    var index1 = global_idx / width0;
    let width1 = uniforms.output_shape[2] / ${a}u;
    let col = (index1 % width1) * ${a}u;
    index1 = index1 / width1;
    let row = index1 % uniforms.output_shape[1];
    let batch = index1 / uniforms.output_shape[1];

    let x_corner = vec2<i32>(i32(row), i32(col)) * uniforms.strides - uniforms.pads;

    var x_vals: array<${$.type.value}, ${g}>;
    var values: array<${_.type.value}, ${a}>;
    let input_channel = output_channel;
    // Use constant instead of uniform can give better performance for w's height/width.
    for (var w_height: u32 = 0u; w_height < ${c[0]}; w_height++) {
      let x_height = x_corner.x + i32(w_height);
      if (x_height >= 0 && u32(x_height) < uniforms.x_shape[1]) {
        for (var i = 0; i < ${g}; i++) {
          let x_width = x_corner.y + i;
          if (x_width >= 0 && u32(x_width) < uniforms.x_shape[2]) {
            x_vals[i] = ${$.get("batch","u32(x_height)","u32(x_width)","input_channel")};
          } else {
            x_vals[i] = ${$.type.value}(0);
          }
        }
        for (var w_width: u32 = 0u; w_width < ${c[1]}; w_width++) {
          let w_val = ${T.get("w_height","w_width","0","output_channel")};
          for (var i = 0u; i < ${a}u; i++) {
            values[i] = fma(x_vals[i * u32(uniforms.strides[1]) + w_width], w_val, values[i]);
          }
        }
      }
    }

    for (var i = 0u; i < ${a}u; i++) {
      var value = values[i];
      ${A}
      ${x}
      ${_.set("batch","row","col + i","output_channel","value")};
    }
  }`};return{name:"GroupedConv-Vectorize",shaderCache:{hint:`${e.cacheKey};${i};${a};${g};${c[0]};${c[1]}`,inputDependencies:o?["rank","rank","type"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:n?n(r):r,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:m}),getShaderSource:y}}});var sg,To,ug,Io,Co,Wd,dg,lg,Ao,Gd=V(()=>{"use strict";te();Od();Ud();dn();Ld();St();un();pt();sg=(t,e,r,n,o,i)=>{let a=t[0],u=t.slice(i?1:2,i?3:4),d=u.length,c=e[0],m=e.slice(2).map((b,_)=>b+(b-1)*(r[_]-1)),y=u.map((b,_)=>b+n[_]+n[_+d]).map((b,_)=>Math.floor((b-m[_]+o[_])/o[_]));return y.splice(0,0,a),y.splice(i?3:1,0,c),y},To=[2,3,1,0],ug=(t,e)=>{if(!t||t.length!==2&&t.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(t[0].dims.length>5)throw new Error("greater than 5D is not supported");if(t[0].dims.length!==t[1].dims.length)throw new Error("filter does not have same dimension as input");let r=t[0].dims[e.format==="NHWC"?t[0].dims.length-1:1],n=t[1].dims[1]*e.group;if(r!==n)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");if(t.length===3&&(t[2].dims.length!==1||t[1].dims[0]!==t[2].dims[0]))throw new Error("invalid bias");let o=t[0].dims.length-2;if(e.dilations.length!==o)throw new Error(`dilations should be ${o}D`);if(e.strides.length!==o)throw new Error(`strides should be ${o}D`);if(e.pads.length!==o*2)throw new Error(`pads should be ${o*2}D`);if(e.kernelShape.length!==0&&e.kernelShape.length!==t[1].dims.length-2)throw new Error("invalid kernel shape")},Io=(t,e)=>{let r=t.kernelShape.slice();r.length<e[1].dims.length-2&&r.push(...Array(e[1].dims.length-2-r.length).fill(0));for(let i=2;i<e[1].dims.length;++i)r[i-2]===0&&(r[i-2]=e[1].dims[i]);let n=t.pads.slice();Bt.adjustPadsBasedOnAutoPad(e[0].dims,t.strides,t.dilations,r,n,t.format==="NHWC",t.autoPad);let o=Object.assign({},t);return Object.assign(o,{kernelShape:r,pads:n}),o},Co=t=>{let e=on(t),r=t.format,n=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][t.auto_pad],o=t.dilations,i=t.group,a=t.kernel_shape,u=t.pads,d=t.strides,c=t.w_is_const();return{autoPad:n,format:r,dilations:o,group:i,kernelShape:a,pads:u,strides:d,wIsConst:c,...e,cacheKey:`${t.format};${e.activation};`}},Wd=(t,e,r,n)=>{let o=r.format==="NHWC",i=sg(e[0].dims,e[1].dims,r.dilations,r.pads,r.strides,o);if(r.group!==1){let E=[e[0]];if(o){let w=t.kernelCustomData.wT??t.compute(Be(e[1],To),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!t.kernelCustomData.wT&&(t.kernelCustomData.wT=w),E.push(w)}else E.push(e[1]);e.length===3&&E.push(e[2]),!t.adapterInfo.isArchitecture("ampere")&&o&&e[1].dims[0]===r.group&&e[1].dims[1]===1&&r.dilations[0]===1&&r.dilations[1]===1?t.compute(Vd(E,r,i,n),{inputs:E}):t.compute(Nd(E,r,i,n),{inputs:E});return}let a=e.length===3,u=e[0].dims[o?1:2],d=e[0].dims[o?2:3],c=e[0].dims[o?3:1],p=e[1].dims[2],m=e[1].dims[3],g=i[o?1:2],y=i[o?2:3],b=i[o?3:1],_=o&&p===u&&m===d&&r.pads[0]===0&&r.pads[1]===0;if(_||p===1&&m===1&&r.dilations[0]===1&&r.dilations[1]===1&&r.strides[0]===1&&r.strides[1]===1&&r.pads[0]===0&&r.pads[1]===0){let E=i[0],O,w,U,N=[];if(o){let X=t.kernelCustomData.wT??t.compute(Be(e[1],To),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];if(r.wIsConst&&!t.kernelCustomData.wT&&(t.kernelCustomData.wT=X),_){let B=u*d*c;O=e[0].reshape([1,E,B]),w=X.reshape([1,B,b]),U=[1,E,b]}else O=e[0].reshape([E,u*d,c]),w=X.reshape([1,c,b]),U=[E,g*y,b];N.push(O),N.push(w)}else O=e[0].reshape([E,c,u*d]),w=e[1].reshape([1,b,c]),U=[E,b,g*y],N.push(w),N.push(O);a&&N.push(e[2]);let F=U[2],q=N[0].dims[N[0].dims.length-1];F<8&&q<8?t.compute(sn(N,r,i,U,o,n),{inputs:N}):t.compute(ur(N,r,i,U,o,n),{inputs:N});return}let S=!0,x=t.kernelCustomData.wT??t.compute(Be(e[1],To),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!t.kernelCustomData.wT&&(t.kernelCustomData.wT=x);let $=[e[0],x];a&&$.push(e[2]);let T=o?g*y:b,I=o?b:g*y,A=p*m*c;t.compute(Dd($,r,i,T,I,A,a,S,n),{inputs:$})},dg=(t,e)=>{let r=e.format==="NHWC",n=[t.inputs[0].reshape(r?[t.inputs[0].dims[0],1,t.inputs[0].dims[1],t.inputs[0].dims[2]]:[t.inputs[0].dims[0],t.inputs[0].dims[1],1,t.inputs[0].dims[2]]),t.inputs[1].reshape([t.inputs[1].dims[0],t.inputs[1].dims[1],1,t.inputs[1].dims[2]])];t.inputs.length===3&&n.push(t.inputs[2]);let o=[0,e.pads[0],0,e.pads[1]],i=[1].concat(e.strides),a=[1].concat(e.dilations),u=[1].concat(e.kernelShape),d=Io({...e,pads:o,strides:i,dilations:a,kernelShape:u},n);Wd(t,n,d,c=>r?[c[0],c[2],c[3]]:[c[0],c[1],c[3]])},lg=(t,e,r)=>{let n=r.format==="NHWC"?"channelsLast":"channelsFirst",o=Io(r,e),i=r.autoPad==="NOTSET"?r.pads:r.autoPad,a=Md(e[0].dims,e[1].dims,r.strides,r.dilations,i,!1,n);t.compute(Rd(e,o,a.outShape,[a.filterDepth,a.filterHeight,a.filterWidth],[a.padInfo.front,a.padInfo.top,a.padInfo.left],n))},Ao=(t,e)=>{if(ug(t.inputs,e),t.inputs[0].dims.length===3)dg(t,e);else if(t.inputs[0].dims.length===5)lg(t,t.inputs,e);else{let r=Io(e,t.inputs);Wd(t,t.inputs,r)}}});var Hd,Fd=V(()=>{"use strict";ee();nt();te();oe();Hd=(t,e,r)=>{let n=t.length>2,o=e.outputShape,i=e.format==="NHWC",a=e.group,u=t[1].dims,d=u[2]/a,c=u[3],p=i?fe(d):1,m=i&&c===1&&d>=4,g=m?Math.floor(d/4)*4:Math.floor(d/p)*p,y=d-g,b=i?fe(c):1,_=i?c===1?p:b:1,S=k.size(o)/b,x=[Math.ceil(S/64),1,1];se("verbose",()=>`[conv2d_backprop_webgpu] dispatch = ${x}`);let $=["rank","rank"],T=[e.strides[0],e.strides[1]],I=[e.kernelShape[i?1:2],e.kernelShape[i?2:3]],A=[e.dilations[0],e.dilations[1]],E=[I[0]+(e.dilations[0]<=1?0:(e.kernelShape[i?1:2]-1)*(e.dilations[0]-1)),I[1]+(e.dilations[1]<=1?0:(e.kernelShape[i?2:3]-1)*(e.dilations[1]-1))],O=[E[0]-1-Math.floor((e.pads[0]+e.pads[2])/2),E[1]-1-Math.floor((e.pads[1]+e.pads[3])/2)],w=[{type:12,data:S},{type:12,data:T},{type:12,data:I},{type:12,data:A},{type:12,data:E},{type:6,data:O},{type:12,data:g},{type:12,data:d},{type:12,data:c},...W(t[0].dims,t[1].dims)];n&&(w.push(...W(t[2].dims)),$.push("rank")),w.push(...W(o));let U=N=>{let F=[{name:"output_size",type:"u32"},{name:"strides",type:"u32",length:T.length},{name:"filter_dims",type:"u32",length:I.length},{name:"dilations",type:"u32",length:I.length},{name:"effective_filter_dims",type:"u32",length:E.length},{name:"pads",type:"i32",length:O.length},{name:"input_channels_per_group_int",type:"u32"},{name:"input_channels_per_group",type:"u32"},{name:"output_channels_per_group",type:"u32"}],q=we(t[0].dataType),X=i?1:2,B=i?2:3,L=i?3:1,Q=D("W",t[1].dataType,t[1].dims.length,_),Y=D("Dy",t[0].dataType,t[0].dims.length,p),Z=[Y,Q];n&&Z.push(D("bias",t[2].dataType,[o[L]].length,b));let ne=R("result",t[0].dataType,o.length,b),ie=()=>{let ve="";if(m)p===4?ve+=`
        let xValue = ${Y.getByOffset("x_offset")};
        let wValue = ${Q.getByOffset("w_offset")};
        dotProd = dotProd + dot(xValue, wValue);
        x_offset += 1u;
        w_offset += 1u;`:p===2?ve+=`
          dotProd = dotProd + dot(vec4<${q}>(${Y.getByOffset("x_offset")}, ${Y.getByOffset("x_offset + 1u")}), vec4<${q}>(${Q.getByOffset("w_offset")}, ${Q.getByOffset("w_offset + 1u")}));
          x_offset += 2u;
          w_offset += 2u;`:p===1&&(ve+=`
          dotProd = dotProd + dot(vec4<${q}>(${Y.getByOffset("x_offset")}, ${Y.getByOffset("x_offset + 1u")}, ${Y.getByOffset("x_offset + 2u")}, ${Y.getByOffset("x_offset + 3u")}), vec4<${q}>(${Q.getByOffset("w_offset")}, ${Q.getByOffset("w_offset + 1u")}, ${Q.getByOffset("w_offset + 2u")}, ${Q.getByOffset("w_offset + 3u")}));
          x_offset += 4u;
          w_offset += 4u;`);else if(ve+=`
                  let xValue = ${i?Y.getByOffset(`${Y.indicesToOffset(`${Y.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${p}`):Y.get("batch","inputChannel","idyR","idyC")};
        `,p===1)ve+=`
          let w_offset = ${Q.indicesToOffset(`${Q.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel, wOutChannel)`)};
          let wValue = ${Q.getByOffset(`w_offset / ${_}`)};
          dotProd = dotProd + xValue * wValue;`;else for(let M=0;M<p;M++)ve+=`
            let wValue${M} = ${Q.getByOffset(`${Q.indicesToOffset(`${Q.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel + ${M}, wOutChannel)`)} / ${_}`)};
            dotProd = dotProd + xValue[${M}] * wValue${M};`;return ve},ce=()=>{if(y===0)return"";if(!m)throw new Error(`packInputAs4 ${m} is not true.`);let ve="";if(p===1){ve+="dotProd = dotProd";for(let M=0;M<y;M++)ve+=`
            + ${Y.getByOffset(`x_offset + ${M}`)} * ${Q.getByOffset(`w_offset + ${M}`)}`;ve+=";"}else if(p===2){if(y!==2)throw new Error(`Invalid inputChannelsRemainder ${y}.`);ve+=`
          let xValue = ${Y.getByOffset("x_offset")};
          let wValue = ${Q.getByOffset("w_offset")};
          dotProd = dotProd + dot(xValue, wValue);`}return ve},Me=`
            let outputIndices = ${ne.offsetToIndices(`global_idx * ${b}`)};
            let batch = ${ne.indicesGet("outputIndices",0)};
            let d1 = ${ne.indicesGet("outputIndices",L)};
            let r = ${ne.indicesGet("outputIndices",X)};
            let c = ${ne.indicesGet("outputIndices",B)};
            let dyCorner = vec2<i32>(i32(r), i32(c)) - uniforms.pads;
            let dyRCorner = dyCorner.x;
            let dyCCorner = dyCorner.y;
            let groupId = d1 / uniforms.output_channels_per_group;
            let wOutChannel = d1 - groupId * uniforms.output_channels_per_group;
            // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
            // ? = to be determined. : = across all values in that axis.
            var dotProd = ${ne.type.value}(0.0);
            var wR: u32 = 0;
            if (uniforms.dilations.x == 1) {
              // Minimum wR >= 0 that satisfies (dyRCorner + wR) % (uniforms.strides.x) == 0
              wR = u32(((dyRCorner + i32(uniforms.strides.x) - 1) / i32(uniforms.strides.x)) * i32(uniforms.strides.x) - dyRCorner);
            }
            for (; wR < uniforms.effective_filter_dims.x; wR = wR + 1) {
              if (wR % uniforms.dilations.x != 0) {
                continue;
              }
              let dyR = (${q}(dyRCorner) + ${q}(wR)) / ${q}(uniforms.strides[0]);
              let wRPerm = uniforms.filter_dims.x - 1 - wR / uniforms.dilations.x;
              if (dyR < 0.0 || dyR >= ${q}(uniforms.Dy_shape[${X}]) || fract(dyR) > 0.0 ||
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
                let dyC = (${q}(dyCCorner) + ${q}(wC)) / ${q}(uniforms.strides.y);
                let wCPerm = uniforms.filter_dims.y - 1 - wC / uniforms.dilations.y;
                if (dyC < 0.0 || dyC >= ${q}(uniforms.Dy_shape[${B}]) ||
                    fract(dyC) > 0.0 || wCPerm < 0) {
                  continue;
                }
                let idyC: u32 = u32(dyC);
                var inputChannel = groupId * uniforms.input_channels_per_group;
                ${m?`
                var x_offset = ${Y.indicesToOffset(`${Y.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${p};
                var w_offset = ${Q.indicesToOffset(`${Q.type.indices}(wRPerm, wCPerm, inputChannel, wOutChannel)`)} / ${_};
                  `:""}
                for (var d2: u32 = 0; d2 < uniforms.input_channels_per_group_int; d2 = d2 + ${m?4:p}) {
                  ${ie()}
                  inputChannel = inputChannel + ${m?4:p};
                }
                ${ce()}
                wC = wC + uniforms.strides.y - 1;
              }
              wR = wR + uniforms.strides[0] - 1;
            }
            let value = dotProd${n?` + bias[d1 / ${b}]`:""};
            ${ne.setByOffset("global_idx","value")};
          `;return`
    ${N.registerUniforms(F).declareVariables(...Z,ne)}
      ${N.mainStart()}
      ${N.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")};
    ${Me}}`};return{name:"ConvTranspose2D",shaderCache:{hint:`${e.cacheKey};${p}${_}${b}${m}${y}`,inputDependencies:$},getRunData:()=>({dispatchGroup:{x:x[0],y:x[1],z:x[2]},outputs:[{dims:r?r(o):o,dataType:t[0].dataType}],programUniforms:w}),getShaderSource:U}}});var cg,pg,mg,qd,Kd,fg,jd,hg,Zd,Qd=V(()=>{"use strict";Fd();St();pt();cg=(t,e,r,n,o,i)=>(t-1)*e+r+(n-1)*o+1-i,pg=(t,e,r,n,o)=>{let i=Math.floor(t/2);e==="SAME_UPPER"?(r[n]=i,r[o]=t-i):e==="SAME_LOWER"&&(r[n]=t-i,r[o]=i)},mg=(t,e,r,n,o,i,a,u,d,c)=>{let p=t.length-2,m=c.length===0;d.length<p&&d.push(...Array(p-d.length).fill(0));let g=t[0],y=e[u?3:1]*o;for(let b=0,_=t.length-p-(u?1:0);b<p;++b,++_){let S=t[_],x=m?S*a[b]:c[b],$=cg(S,a[b],i[b],e[_],r[b],x);pg($,n,i,b,b+p),m&&c.push(a[b]*(S-1)+d[b]+(e[_]-1)*r[b]+1-i[b]-i[b+p])}c.splice(0,0,g),c.splice(u?3:1,0,y)},qd=(t,e)=>{let r=t.kernelShape.slice();if(t.kernelShape.length===0||t.kernelShape.reduce((m,g)=>m*g,1)===0){r.length=0;for(let m=2;m<e[1].dims.length;++m)r.push(e[1].dims[m])}let n=t.format==="NHWC";r.splice(0,0,e[1].dims[0]),r.splice(n?3:1,0,e[1].dims[1]);let o=t.pads.slice(),i=t.outputShape.slice(),a=t.outputPadding.slice(),u=e[0].dims,d=t.dilations.slice();if(d.reduce((m,g)=>m+g,0)===0){let m=e[0].dims.length-2;d=new Array(m).fill(1)}let c=t.strides.slice();if(c.reduce((m,g)=>m+g,0)===0){let m=e[0].dims.length-2;c=new Array(m).fill(1)}mg(u,r,d,t.autoPad,t.group,o,c,n,a,i);let p=Object.assign({},t);return Object.assign(p,{kernelShape:r,pads:o,outputPadding:a,outputShape:i,dilations:d,strides:c}),p},Kd=t=>{let e=on(t),r=t.format,n=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][typeof t.autoPad>"u"?0:t.autoPad],o=t.dilations,i=t.group??1,a=t.kernelShape,u=t.pads,d=t.strides,c=t.wIsConst(),p=t.outputPadding,m=t.outputShape;return{autoPad:n,format:r,dilations:o,group:i,kernelShape:a,outputPadding:p,outputShape:m,pads:u,strides:d,wIsConst:c,...e,cacheKey:`${t.format};${e.activation};`}},fg=(t,e)=>{if(!t||t.length!==2&&t.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(t[0].dims.length!==4&&t[0].dims.length!==3)throw new Error("currently only support 2-dimensional conv");if(t[0].dims.length!==t[1].dims.length)throw new Error("filter does not have same dimension as input");let r=t[0].dims[e.format==="NHWC"?t[0].dims.length-1:1],n=t[1].dims[0];if(r!==n)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");let o=t[1].dims[1]*e.group;if(t.length===3&&(t[2].dims.length!==1||t[2].dims[0]!==o))throw new Error("invalid bias");let i=t[0].dims.length-2;if(e.dilations.reduce((p,m)=>p+m,0)>0&&e.dilations.length!==i)throw new Error(`dilations should be ${i}D`);if(e.strides.reduce((p,m)=>p+m,0)>0&&e.strides.length!==i)throw new Error(`strides should be ${i}D`);if(e.pads.reduce((p,m)=>p+m,0)>0&&e.pads.length!==i*2)throw new Error(`pads should be ${i*2}D`);if(e.outputPadding.length!==i&&e.outputPadding.length!==0)throw new Error(`output_padding should be ${i}D`);if(e.kernelShape.reduce((p,m)=>p+m,0)>0&&e.kernelShape.length!==0&&e.kernelShape.length!==t[1].dims.length-2)throw new Error("invalid kernel shape");if(e.outputShape.length!==0&&e.outputShape.length!==t[0].dims.length-2)throw new Error("invalid output shape")},jd=(t,e,r,n)=>{let o=t.kernelCustomData.wT??t.compute(Be(e[1],[2,3,0,1]),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!t.kernelCustomData.wT&&(t.kernelCustomData.wT=o);let i=[e[0],o];e.length===3&&i.push(e[2]),t.compute(Hd(i,r,n),{inputs:i})},hg=(t,e)=>{let r=e.format==="NHWC",n=[t.inputs[0].reshape(r?[t.inputs[0].dims[0],1,t.inputs[0].dims[1],t.inputs[0].dims[2]]:[t.inputs[0].dims[0],t.inputs[0].dims[1],1,t.inputs[0].dims[2]]),t.inputs[1].reshape([t.inputs[1].dims[0],t.inputs[1].dims[1],1,t.inputs[1].dims[2]])];t.inputs.length===3&&n.push(t.inputs[2]);let o=e.kernelShape;(o.length===0||o[0]===0)&&(o=[t.inputs[1].dims[2]]);let i=e.dilations;(i.length===0||i[0]===0)&&(i=[1]);let a=e.strides;(a.length===0||a[0]===0)&&(a=[1]);let u=e.pads;u.length===0&&(u=[0,0]),u=[0,u[0],0,u[1]],a=[1].concat(a),i=[1].concat(i),o=[1].concat(o);let d=e.outputPadding;d=[0].concat(d);let c=qd({...e,pads:u,strides:a,dilations:i,kernelShape:o,outputPadding:d},n);jd(t,n,c,p=>r?[p[0],p[2],p[3]]:[p[0],p[1],p[3]])},Zd=(t,e)=>{if(fg(t.inputs,e),t.inputs[0].dims.length===3)hg(t,e);else{let r=qd(e,t.inputs);jd(t,t.inputs,r)}}});var gg,Yd,Xd,Jd=V(()=>{"use strict";ee();te();Ce();oe();gg=(t,e,r,n)=>{let o=k.size(e),i=e.length,a=D("input",t,i),u=R("output",t,i),d=r.dataType===6?r.getInt32Array()[0]:Number(r.getBigInt64Array()[0]),c=k.normalizeAxis(d,i),p=m=>{let g=` i32(${a.indicesGet("inputIndices","uniforms.axis")}) `,y=j("uniforms.input_shape","uniforms.axis",i),b=n.reverse?g+(n.exclusive?" + 1":""):"0",_=n.reverse?y:g+(n.exclusive?"":" + 1");return`
                ${m.registerUniform("outputSize","u32").registerUniform("axis","u32").declareVariables(a,u)}
                ${m.mainStart()}
                  ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
                  var inputIndices = ${u.offsetToIndices("global_idx")};
                  var sum = ${u.type.value}(0);
                  let first : i32 = ${b};
                  let last : i32 = ${_};
                  for (var i : i32 = first; i < last; i++) {
                    ${a.indicesSet("inputIndices","uniforms.axis","u32(i)")};
                    sum = sum + ${a.getByIndices("inputIndices")};
                  }
                  ${u.setByOffset("global_idx","sum")};
                }`};return{name:"CumSum",shaderCache:{hint:n.cacheKey,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:e,dataType:t}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:[{type:12,data:o},{type:12,data:c},...W(e,e)]}),getShaderSource:p}},Yd=(t,e)=>{let r=t.inputs[0].dims,n=t.inputs[0].dataType,o=t.inputs[1];t.compute(gg(n,r,o,e),{inputs:[0]})},Xd=t=>{let e=t.exclusive===1,r=t.reverse===1;return J({exclusive:e,reverse:r})}});var bg,yg,_g,el,tl,rl=V(()=>{"use strict";ee();te();Ce();oe();bg=t=>{if(!t||t.length!==1)throw new Error("DepthToSpace requires 1 input.");if(t[0].dims.length!==4)throw new Error("DepthToSpace requires 4D input.")},yg=(t,e,r,n)=>{let o=[];o.push(`fn perm(i: ${n.type.indices}) -> ${r.type.indices} {
    var a: ${r.type.indices};`);for(let i=0;i<e;++i)o.push(r.indicesSet("a",t[i],`i[${i}]`));return o.push("return a;}"),o.join(`
`)},_g=(t,e)=>{let r,n,o,i,a,u,d=e.format==="NHWC",c=e.blocksize,p=e.mode==="DCR";d?([r,n,o,i]=t.dims,a=p?[r,n,o,c,c,i/c**2]:[r,n,o,i/c**2,c,c],u=p?[0,1,3,2,4,5]:[0,1,4,2,5,3]):([r,n,o,i]=[t.dims[0],t.dims[2],t.dims[3],t.dims[1]],a=p?[r,c,c,i/c**2,n,o]:[r,i/c**2,c,c,n,o],u=p?[0,3,4,1,5,2]:[0,1,4,2,5,3]);let m=t.reshape(a),g=m.dims.length,y=t.dataType,b=D("a",y,g),_=R("output",y,g),S=x=>`
  ${x.registerUniform("output_size","u32").declareVariables(b,_)}

  ${yg(u,g,b,_)}

  ${x.mainStart()}
    ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${_.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${_.setByOffset("global_idx",b.getByIndices("aIndices"))}
  }`;return{name:"DepthToSpace",shaderCache:{hint:`${t.dims};${e.blocksize};${e.mode}`,inputDependencies:["rank"]},getRunData:x=>{let $=d?[r,n*c,o*c,i/c**2]:[r,i/c**2,n*c,o*c],T=k.size($),I=m.dims,A=k.sortBasedOnPerm(I,u);return{outputs:[{dims:$,dataType:x[0].dataType}],dispatchGroup:{x:Math.ceil(T/64)},programUniforms:[{type:12,data:T},...W(I,A)]}},getShaderSource:S}},el=(t,e)=>{bg(t.inputs),t.compute(_g(t.inputs[0],e))},tl=t=>J({blocksize:t.blocksize,mode:t.mode,format:t.format})});var Tt,cn,Eo,ol,Rt,wg,vg,$g,il,al,sl,xg,Sg,nl,Tg,ul,dl,ll=V(()=>{"use strict";ee();te();Ce();oe();Tt=256,cn=512,Eo=2*Math.PI,ol=t=>{let e=[],r=t;for(let n of[4,2,3,5])for(;r%n===0;)e.push(n),r/=n;return r===1?e:void 0},Rt=t=>{let e=t.toPrecision(9);return/[.eE]/.test(e)?e:`${e}.0`},wg=(t,e,r,n,o)=>{let i=r/t,a=cn-n,u=c=>`smem[${a}u + base + ${c*e}u]`,d=`  for (var t = local_idx; t < ${i}u; t += ${Tt}u) {
`;d+=`    let twiddleIndex = t % ${e}u;
    let angleUnit = f32(twiddleIndex);
`,d+=`    var leg: array<vec2<f32>, 5>;
`;for(let c=0;c<t;c++){let p=`${n}u + t + ${c*i}u`;if(c===0)d+=`    leg[0] = smem[${p}];
`;else{let m=o*Eo*c/(t*e);d+=`    { let a = ${Rt(m)} * angleUnit; leg[${c}] = cmul(smem[${p}], vec2<f32>(cos(a), sin(a))); }
`}}if(d+=`    let base = (t / ${e}u) * ${e*t}u + twiddleIndex;
`,t===2)d+=`    ${u(0)} = leg[0] + leg[1];
    ${u(1)} = leg[0] - leg[1];
`;else if(t===4){let c=o<0?"vec2<f32>(oddDiff.y, -oddDiff.x)":"vec2<f32>(-oddDiff.y, oddDiff.x)";d+=`    let evenSum = leg[0] + leg[2]; let evenDiff = leg[0] - leg[2];
`,d+=`    let oddSum = leg[1] + leg[3]; let oddDiff = leg[1] - leg[3];
`,d+=`    let oddRot = ${c};
`,d+=`    ${u(0)} = evenSum + oddSum;
    ${u(1)} = evenDiff + oddRot;
`,d+=`    ${u(2)} = evenSum - oddSum;
    ${u(3)} = evenDiff - oddRot;
`}else for(let c=0;c<t;c++){let p=["leg[0]"];for(let m=1;m<t;m++){let g=o*Eo*(m*c)/t,y=Rt(Math.cos(g)),b=Rt(Math.sin(g));p.push(`vec2<f32>(leg[${m}].x*${y} - leg[${m}].y*${b}, leg[${m}].x*${b} + leg[${m}].y*${y})`)}d+=`    ${u(c)} = ${p.join(" + ")};
`}return`${d}  }
  workgroupBarrier();
`},vg=(t,e,r)=>{let n="",o=1,i=0;for(let a of t)n+=wg(a,o,e,i,r),o*=a,i=cn-i;return{code:n,resultOffset:i}},$g=(t,e,r,n,o)=>{let i=t.dims,a=i.length,u=i[a-1],d=i[e],c=r&&n?(d-1)*2:d;o!==void 0&&(c=o);let p=r&&n?1:2,m=n&&!r?Math.floor(c/2)+1:c,g=i.slice();g[e]=m,g[a-1]=p;let y=1;for(let _=e+1;_<a-1;_++)y*=i[_];let b=k.size(i)/u/d;return{dataType:t.dataType,outputDims:g,length:c,signalLength:d,inner:y,batch:b,inputComponents:u,outputComponents:p,outputLength:m,inverse:r,onesided:n}},il=(t,e)=>[e,t.length,t.inputComponents,t.outputComponents,t.inverse,t.onesided].join(";"),al=t=>[{type:12,data:t.batch},{type:12,data:t.signalLength},{type:12,data:t.inner},{type:12,data:t.outputLength}],sl=(t,e,r)=>t.registerUniform("batch","u32").registerUniform("signalLength","u32").registerUniform("inner","u32").registerUniform("outputLength","u32").declareVariables(e,r),xg=t=>{let{dataType:e,length:r,inputComponents:n,outputComponents:o,inverse:i,onesided:a}=t,u=Ae(e),d=i?1:-1,c=i?1/r:1,p=ol(r),m=g=>{let y=D("x",e,[1]),b=R("y",e,[1]),_=A=>{let E=`inBase + (${A}) * uniforms.inner * ${n}u`,O=`f32(${y.getByOffset(E)})`,w=n===2?`f32(${y.getByOffset(`${E} + 1u`)})`:"0.0";return`vec2<f32>(${O}, ${w})`},S;if(i&&a){let A=Math.floor(r/2)+1,E=r%2===0?`select(provided, provided - 1u, provided == ${A}u)`:"provided";S=`
    let provided = min(uniforms.signalLength, ${A}u);
    for (var i = local_idx; i < ${r}u; i += ${Tt}u) {
      if (i < provided) { smem[i] = ${_("i")}; } else { smem[i] = vec2<f32>(0.0); }
    }
    workgroupBarrier();
    for (var k = local_idx + 1u; k < ${E}; k += ${Tt}u) {
      let h = smem[k];
      smem[${r}u - k] = vec2<f32>(h.x, -h.y);
    }
    workgroupBarrier();`}else S=`
    let loadCount = min(uniforms.signalLength, ${r}u);
    for (var i = local_idx; i < ${r}u; i += ${Tt}u) {
      if (i < loadCount) { smem[i] = ${_("i")}; } else { smem[i] = vec2<f32>(0.0); }
    }
    workgroupBarrier();`;let{code:x,resultOffset:$}=vg(p,r,d),T=c===1?`smem[${$}u + i]`:`smem[${$}u + i] * ${Rt(c)}`,I=o===2?b.setByOffset("off + 1u",`${u}(v.y)`):"";return`
  ${sl(g,y,b)}
  var<workgroup> smem: array<vec2<f32>, ${2*cn}>;
  fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
  }
  ${g.mainStart(Tt)}
    let row = workgroup_index;
    if (row >= uniforms.batch) { return; }
    let outer = row / uniforms.inner;
    let within = row % uniforms.inner;
    let inBase = (outer * uniforms.signalLength * uniforms.inner + within) * ${n}u;
    let outBase = (outer * uniforms.outputLength * uniforms.inner + within) * ${o}u;
    ${S}
${x}    for (var i = local_idx; i < uniforms.outputLength; i += ${Tt}u) {
      let v = ${T};
      let off = outBase + i * uniforms.inner * ${o}u;
      ${b.setByOffset("off",`${u}(v.x)`)}
      ${I}
    }
  }`};return{name:"DFT",shaderCache:{hint:il(t,"fft"),inputDependencies:["type"]},getShaderSource:m,getRunData:()=>({outputs:[{dims:t.outputDims,dataType:e}],programUniforms:al(t),dispatchGroup:{x:t.batch}})}},Sg=t=>{let{dataType:e,length:r,inputComponents:n,outputComponents:o,inverse:i,onesided:a}=t,u=Ae(e),d=i?1:-1,c=i?1/r:1,p=m=>{let g=D("x",e,[1]),y=R("y",e,[1]),b=T=>{let I=`inBase + (${T}) * uniforms.inner * ${n}u`,A=`f32(${g.getByOffset(I)})`,E=n===2?`f32(${g.getByOffset(`${I} + 1u`)})`:"0.0";return`vec2<f32>(${A}, ${E})`},_=i&&a?`fn spectrum(inBase: u32, k: u32) -> vec2<f32> {
    let provided = min(uniforms.signalLength, ${Math.floor(r/2)+1}u);
    if (k < provided) { return ${b("k")}; }
    let m = ${r}u - k;
    if (m < provided) {
      let h = ${b("m")};
      return vec2<f32>(h.x, -h.y);
    }
    return vec2<f32>(0.0, 0.0);
  }`:`fn spectrum(inBase: u32, n: u32) -> vec2<f32> {
    if (n < uniforms.signalLength) { return ${b("n")}; }
    return vec2<f32>(0.0, 0.0);
  }`,S=`
      let angle = ${Rt(d*Eo)} * f32(knMod) / ${Rt(r)};
      acc += cmul(spectrum(inBase, n), vec2<f32>(cos(angle), sin(angle)));
      knMod += k;
      if (knMod >= ${r}u) { knMod -= ${r}u; }`,x=o===2?y.setByOffset("off + 1u",`${u}(v.y)`):"",$=c===1?"acc":`acc * ${Rt(c)}`;return`
  ${sl(m,g,y)}
  fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
  }
  ${_}
  ${m.mainStart(Tt)}
    let row = workgroup_index;
    if (row >= uniforms.batch) { return; }
    let outer = row / uniforms.inner;
    let within = row % uniforms.inner;
    let inBase = (outer * uniforms.signalLength * uniforms.inner + within) * ${n}u;
    let outBase = (outer * uniforms.outputLength * uniforms.inner + within) * ${o}u;
    for (var k = local_idx; k < uniforms.outputLength; k += ${Tt}u) {
      var acc = vec2<f32>(0.0, 0.0);
      var knMod = 0u;
      for (var n = 0u; n < ${r}u; n++) {${S}
      }
      let v = ${$};
      let off = outBase + k * uniforms.inner * ${o}u;
      ${y.setByOffset("off",`${u}(v.x)`)}
      ${x}
    }
  }`};return{name:"DFT",shaderCache:{hint:il(t,"direct"),inputDependencies:["type"]},getShaderSource:p,getRunData:()=>({outputs:[{dims:t.outputDims,dataType:e}],programUniforms:al(t),dispatchGroup:{x:t.batch}})}},nl=t=>{if(!t||t.dataType===0)return;if(k.size(t.dims)!==1)throw new Error("DFT optional scalar inputs must have exactly 1 element.");if(t.dataType===6)return t.getInt32Array()[0];let e=Number(t.getBigInt64Array()[0]);if(!Number.isSafeInteger(e))throw new Error("DFT optional scalar inputs are out of JavaScript safe integer range.");return e},Tg=t=>{if(!t||t.length<1)throw new Error("DFT requires at least 1 input.");let e=t[0].dims;if(e.length<2)throw new Error("DFT input must have at least 2 dimensions.");let r=e[e.length-1];if(r!==1&&r!==2)throw new Error("DFT input's innermost dimension must be 1 (real) or 2 (complex).")},ul=(t,e)=>{Tg(t.inputs);let r=t.inputs[0],n=r.dims.length,o=e.inverse!==0,i=e.onesided!==0,a=nl(t.inputs[1]);if(a!==void 0&&a<=0)throw new Error("dft_length must be greater than zero.");let u=k.normalizeAxis(nl(t.inputs[2])??e.axis,n);if(u===n-1)throw new Error("DFT axis must refer to a signal dimension, not the innermost (real/imaginary) dimension.");if(o&&i&&r.dims[n-1]!==2)throw new Error("Inverse one-sided DFT (IRFFT) requires complex-valued input (innermost dimension 2).");let d=$g(r,u,o,i,a);if(d.length<=0)throw new Error(`Invalid DFT length: ${d.length}`);let p=d.length<=cn&&ol(d.length)!==void 0?xg(d):Sg(d);t.compute(p,{inputs:[0]})},dl=t=>J({axis:t.axis??1,inverse:t.inverse??0,onesided:t.onesided??0})});var ko,pn,cl,Ig,Cg,Po,Do,pl,Ag,ml,fl,hl=V(()=>{"use strict";ee();te();Ce();oe();ko="[a-zA-Z]|\\.\\.\\.",pn="("+ko+")+",cl="^"+pn+"$",Ig="("+pn+",)*"+pn,Cg="^"+Ig+"$",Po=class{constructor(e=-1){this.symbolToIndices=new Map,this.inputIndex=e}addSymbol(e,r){let n=this.symbolToIndices.get(e);n===void 0?n=[r]:n.push(r),this.symbolToIndices.set(e,n)}},Do=class{constructor(e,r){this.equation=r;this.hasEllipsis=!1,this.symbolToInfo=new Map,this.lhs=new Array,this.outputDims=[];let[n,o]=r.includes("->")?r.split("->",2):[r,""];if(!n.match(RegExp(Cg)))throw new Error("Invalid LHS term");if(n.split(",").forEach((u,d)=>{let c=e[d].dims.slice();if(!u.match(RegExp(cl)))throw new Error("Invalid LHS term");let p=this.processTerm(u,!0,c,d);this.lhs.push(p)}),o==="")o+=[...this.symbolToInfo.entries()].filter(([u,d])=>d.count===1||u==="...").map(([u])=>u).join("");else if(!o.match(RegExp(pn)))throw new Error("Invalid RHS");o.match(RegExp(ko,"g"))?.forEach(u=>{if(u==="...")this.outputDims=this.outputDims.concat(this.ellipsisDims);else{let d=this.symbolToInfo.get(u);if(d===void 0)throw new Error("Invalid RHS symbol");this.outputDims.push(d.dimValue)}}),this.rhs=this.processTerm(o,!1,this.outputDims)}addSymbol(e,r,n){let o=this.symbolToInfo.get(e);if(o!==void 0){if(o.dimValue!==r&&o.count!==1)throw new Error("Dimension mismatch");o.count++,o.inputIndices.push(n)}else o={count:1,dimValue:r,inputIndices:[n]};this.symbolToInfo.set(e,o)}processTerm(e,r,n,o=-1){let i=n.length,a=!1,u=[],d=0;if(!e.match(RegExp(cl))&&!r&&e!=="")throw new Error("Invalid LHS term");let c=e.match(RegExp(ko,"g")),p=new Po(o);return c?.forEach((m,g)=>{if(m==="..."){if(a)throw new Error("Only one ellipsis is allowed per input term");a=!0;let y=i-c.length+1;if(y<0)throw new Error("Ellipsis out of bounds");if(u=n.slice(d,d+y),this.hasEllipsis){if(this.ellipsisDims.length!==u.length||this.ellipsisDims.toString()!==u.toString())throw new Error("Ellipsis dimensions mismatch")}else if(r)this.hasEllipsis=!0,this.ellipsisDims=u;else throw new Error("Ellipsis must be specified in the LHS");for(let b=0;b<u.length;b++){let _=String.fromCharCode(48+b);p.addSymbol(_,g+b),this.addSymbol(_,n[d++],o)}}else p.addSymbol(m,g+(this.hasEllipsis?this.ellipsisDims.length-1:0)),this.addSymbol(m,n[d++],o)}),p}},pl=t=>t+"_max",Ag=(t,e,r,n)=>{let i=t.map(p=>p.length).map((p,m)=>D(`input${m}`,e,p)),a=k.size(n),u=R("output",e,n.length),d=[...r.symbolToInfo.keys()].filter(p=>!r.rhs.symbolToIndices.has(p)),c=p=>{let m=[],g="var prod = 1.0;",y="var sum = 0.0;",b="sum += prod;",_=[],S=[],x=[],$=[],T=r.symbolToInfo.size===r.rhs.symbolToIndices.size;r.symbolToInfo.forEach((A,E)=>{if(r.rhs.symbolToIndices.has(E)){let O=r.rhs.symbolToIndices.get(E)?.[0];O!==void 0&&r.lhs.forEach((w,U)=>{if(A.inputIndices.includes(U)){let N=w.symbolToIndices.get(E);if(N===void 0)throw new Error("Invalid symbol error");N.forEach(F=>{m.push(`${i[U].indicesSet(`input${U}Indices`,F,u.indicesGet("outputIndices",O))}`)})}})}else r.lhs.forEach((O,w)=>{if(A.inputIndices.includes(w)){let U=O.symbolToIndices.get(E);if(U===void 0)throw new Error("Invalid symbol error");U.forEach(N=>{_.push(`${i[w].indicesSet(`input${w}Indices`,N,`${E}`)}`)}),$.push(`prod *= ${i[w].getByIndices(`input${w}Indices`)};`)}}),S.push(`for(var ${E}: u32 = 0; ${E} < uniforms.${pl(E)}; ${E}++) {`),x.push("}")});let I=T?[...m,`let sum = ${i.map((A,E)=>A.getByIndices(`input${E}Indices`)).join(" * ")};`]:[...m,y,...S,..._,g,...$,b,...x];return`
            ${p.registerUniforms(d.map(A=>({name:`${pl(A)}`,type:"u32"}))).registerUniform("outputSize","u32").declareVariables(...i,u)}

            ${p.mainStart()}
            ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
            var outputIndices = ${u.offsetToIndices("global_idx")};
            ${i.map((A,E)=>`var input${E}Indices: ${i[E].type.indices};`).join(`
`)}
            ${I.join(`
`)};
            ${u.setByOffset("global_idx","sum")};
          }`};return{name:"Einsum",shaderCache:{hint:r.equation,inputDependencies:t.map(()=>"rank")},getRunData:()=>{let p=d.filter(g=>r.symbolToInfo.has(g)).map(g=>({type:12,data:r.symbolToInfo.get(g)?.dimValue||0}));p.push({type:12,data:a});let m=t.map((g,y)=>[...W(g)]).reduce((g,y)=>g.concat(y),p);return m.push(...W(n)),{outputs:[{dims:n,dataType:e}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:m}},getShaderSource:c}},ml=(t,e)=>{let r=new Do(t.inputs,e.equation),n=r.outputDims,o=t.inputs.map((i,a)=>i.dims);t.compute(Ag(o,t.inputs[0].dataType,r,n))},fl=t=>{let e=t.equation.replace(/\s+/g,"");return J({equation:e})}});var Eg,gl,kg,Pg,bl,yl=V(()=>{"use strict";ee();te();oe();Eg=t=>{if(!t||t.length!==2)throw new Error("Expand requires 2 input.");let e=t[0].dims,r=Array.from(t[1].getBigInt64Array(),Number),n=r.length<e.length?0:r.length-e.length,o=e.length<r.length?0:e.length-r.length;for(;n<r.length&&o<e.length;++n,++o)if(r[n]!==e[o]&&r[n]!==1&&e[o]!==1)throw new Error("Expand requires shape to be broadcastable to input")},gl=(t,e)=>{let r=t.length-e.length,n=[];for(let o=0;o<r;++o)n.push(t[o]);for(let o=0;o<e.length;++o)n.push(e[o]===1?t[o+r]:e[o]);return n},kg=(t,e)=>t.length>e.length?gl(t,e):gl(e,t),Pg=t=>{let e=t[0].dims,r=Array.from(t[1].getBigInt64Array(),Number),n=kg(e,r),o=t[0].dataType,i=o===9||k.size(e)===1,a=o===9||e.length>0&&e[e.length-1]%4===0?4:1,u=i||n.length>0&&n[n.length-1]%4===0?4:1,d=Math.ceil(k.size(n)/u),c=m=>{let g=D("input",o,e.length,a),y=R("output",o,n.length,u),b;if(o===9){let _=(S,x,$="")=>`
          let outputIndices${x} = ${y.offsetToIndices(`outputOffset + ${x}u`)};
          let offset${x} = ${g.broadcastedIndicesToOffset(`outputIndices${x}`,y)};
          let index${x} = offset${x} / 4u;
          let component${x} = offset${x} % 4u;
          ${S}[${x}] = ${$}(${g.getByOffset(`index${x}`)}[component${x}]);
        `;b=`
        let outputOffset = global_idx * ${u};
        var data = vec4<u32>(0);
        ${_("data",0,"u32")}
        ${_("data",1,"u32")}
        ${_("data",2,"u32")}
        ${_("data",3,"u32")}
        ${y.setByOffset("global_idx","data")}
      }`}else b=`
        let outputIndices = ${y.offsetToIndices(`global_idx * ${u}`)};
        let inputOffset = ${g.broadcastedIndicesToOffset("outputIndices",y)};
        let data = ${y.type.value}(${g.getByOffset(`inputOffset / ${a}`)});
        ${y.setByOffset("global_idx","data")}
      }`;return`
    ${m.registerUniform("vec_size","u32").declareVariables(g,y)}
    ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
    ${b}`},p=[{type:12,data:d},...W(e,n)];return{name:"Expand",shaderCache:{hint:`${n.length};${a}${u}`,inputDependencies:["rank"]},getShaderSource:c,getRunData:()=>({outputs:[{dims:n,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:p})}},bl=t=>{Eg(t.inputs),t.compute(Pg(t.inputs),{inputs:[0]})}});var Dg,_l,wl=V(()=>{"use strict";ee();te();oe();nn();Dg=t=>{let e=t[0].dataType,r=k.size(t[0].dims),n=k.size(t[1].dims),o=n%4===0,i=a=>{let u=D("x",e,[1],4),d=D("bias",e,[1],4),c=R("y",e,[1],4),p=[{name:"output_vec_size",type:"u32"},{name:"bias_size",type:"u32"}],m=y=>`
      let bias${y}_offset: u32 = (global_idx * 4 + ${y}) % uniforms.bias_size;
      let bias${y} = ${d.getByOffset(`bias${y}_offset / 4`)}[bias${y}_offset % 4];`,g=o?`
      let bias = ${d.getByOffset("global_idx % (uniforms.bias_size / 4)")};`:`${m(0)}${m(1)}${m(2)}${m(3)}
      let bias = ${u.type.value}(bias0, bias1, bias2, bias3);`;return`${a.registerUniforms(p).declareVariables(u,d,c)}

    ${vo(Ae(e))}

    ${a.mainStart(zt)}
      ${a.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_vec_size")}

      let x = ${u.getByOffset("global_idx")};
      ${g}
      let x_in = x + bias;
      ${c.setByOffset("global_idx",$o("x_in"))}
    }`};return{name:"FastGeluWithBias",shaderCache:{hint:`${o}`,inputDependencies:["type","type"]},getShaderSource:i,getRunData:a=>({outputs:[{dims:a[0].dims,dataType:a[0].dataType}],programUniforms:[{type:12,data:Math.ceil(r/4)},{type:12,data:n}],dispatchGroup:{x:Math.ceil(r/zt/4)}})}},_l=t=>{t.inputs.length<2||k.size(t.inputs[1].dims)===0?sd(t):t.compute(Dg(t.inputs))}});var Og,Bg,vl,$l,xl=V(()=>{"use strict";ee();te();Ce();oe();Og=t=>{if(!t||t.length!==2)throw new Error("Gather requires 2 inputs.")},Bg=(t,e)=>{let r=t[0].dims,n=t[1].dims,o=r.length,i=k.normalizeAxis(e.axis,o),a=r.slice(0);a.splice(i,1,...n);let u=r[i],d=t[0].dataType===9?4:1,c=Math.ceil(k.size(a)/d),p=[{type:12,data:c},{type:6,data:u},{type:12,data:i},...W(t[0].dims,t[1].dims,a)],m=g=>{let y=D("data",t[0].dataType,t[0].dims.length,d),b=D("inputIndices",t[1].dataType,t[1].dims.length),_=R("output",t[0].dataType,a.length,d),S=$=>{let T=n.length,I=`var indicesIndices${$}  = ${b.type.indices}(0);`;for(let A=0;A<T;A++)I+=`${T>1?`indicesIndices${$}[${A}]`:`indicesIndices${$}`} = ${a.length>1?`outputIndices${$}[uniforms.axis + ${A}]`:`outputIndices${$}`};`;I+=`
          var idx${$} = ${b.getByIndices(`indicesIndices${$}`)};
          if (idx${$} < 0) {
            idx${$} = idx${$} + uniforms.axisDimLimit;
          }
          var dataIndices${$} : ${y.type.indices};
        `;for(let A=0,E=0;A<o;A++)A===i?(I+=`${o>1?`dataIndices${$}[${A}]`:`dataIndices${$}`} = u32(idx${$});`,E+=T):(I+=`${o>1?`dataIndices${$}[${A}]`:`dataIndices${$}`} = ${a.length>1?`outputIndices${$}[${E}]`:`outputIndices${$}`};`,E++);return I},x;if(t[0].dataType===9){let $=(T,I,A="")=>`
          let outputIndices${I} = ${_.offsetToIndices(`outputOffset + ${I}u`)};
          ${S(I)};
          let offset${I} = ${y.indicesToOffset(`dataIndices${I}`)};
          let index${I} = offset${I} / 4u;
          let component${I} = offset${I} % 4u;
          ${T}[${I}] = ${A}(${y.getByOffset(`index${I}`)}[component${I}]);
        `;x=`
        let outputOffset = global_idx * ${d};
        var value = vec4<u32>(0);
        ${$("value",0,"u32")}
        ${$("value",1,"u32")}
        ${$("value",2,"u32")}
        ${$("value",3,"u32")}
        ${_.setByOffset("global_idx","value")}
      `}else x=`
      let outputIndices = ${_.offsetToIndices("global_idx")};
      ${S("")};
      let value = ${y.getByIndices("dataIndices")};
      ${_.setByOffset("global_idx","value")};
      `;return`
      ${g.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(y,b,_)}
      ${g.mainStart()}
        ${g.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        ${x}
      }`};return{name:"Gather",shaderCache:{hint:e.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:a,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:p}),getShaderSource:m}},vl=t=>J({axis:t.axis}),$l=(t,e)=>{let r=t.inputs;Og(r),t.compute(Bg(t.inputs,e))}});var zg,Sl,Tl,Il=V(()=>{"use strict";ee();te();oe();zg=(t,e,r,n,o,i,a,u,d)=>{let c=[{type:12,data:i},{type:12,data:n},{type:12,data:o},{type:12,data:r},{type:12,data:a},{type:12,data:u},{type:12,data:d}],p=[i];c.push(...W(e.dims,p));let m=g=>{let y=D("indices_data",e.dataType,e.dims.length),b=R("input_slice_offsets_data",12,1,1),_=[y,b],S=[{name:"output_size",type:"u32"},{name:"batch_dims",type:"u32"},{name:"input_dims",type:"u32",length:o.length},{name:"sizes_from_slice_dims_data",type:"u32",length:r.length},{name:"num_slices_per_batch",type:"u32"},{name:"input_batch_stride",type:"u32"},{name:"num_slice_dims",type:"u32"}];return`
  ${g.registerUniforms(S).declareVariables(..._)}
  ${g.mainStart()}
    ${g.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
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
      ${r.length===1?"relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data);":"relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data[dim_idx]);"}
    }

    input_slice_offsets_data[global_idx] =  base_offset + u32(relative_slice_offset);
  }`};return t.compute({name:"computeSliceOffsets",shaderCache:{hint:`${o.length}_${r.length}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:p,dataType:t.inputs[1].dataType}],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:c}),getShaderSource:m},{inputs:[e],outputs:[-1]})[0]},Sl=(t,e)=>{let r=t.inputs,n=r[0].dims,o=r[0].dataType,i=r[1].dims,a=i[i.length-1],u=k.sizeToDimension(i,i.length-1),d=k.sizeFromDimension(n,e.batchDims+a),c=k.sizeToDimension(n,e.batchDims),p=k.sizeFromDimension(n,e.batchDims),m=u/c,g=new Array(a),y=d;for(let I=0;I<a;++I)g[a-1-I]=y,y*=n[e.batchDims+a-1-I];let b=zg(t,r[1],g,e.batchDims,n,u,m,p,a),_=e.batchDims+a;if(_>n.length)throw new Error("last dimension of indices must not be larger than rank of input tensor");let S=i.slice(0,-1).concat(n.slice(_)),x=k.size(S),$=[{type:12,data:x},{type:12,data:d},...W(r[0].dims,b.dims,S)],T=I=>{let A=D("data",r[0].dataType,r[0].dims.length),E=D("slice_offsets",12,b.dims.length),O=R("output",r[0].dataType,S.length);return`
          ${I.registerUniform("output_size","u32").registerUniform("slice_size","u32").declareVariables(A,E,O)}
            ${I.mainStart()}
            ${I.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let slice_offset = slice_offsets[global_idx / uniforms.slice_size];
          output[global_idx] = data[u32(slice_offset) + global_idx % uniforms.slice_size];
        }`};t.compute({name:"GatherND",shaderCache:{hint:e.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:S,dataType:o}],dispatchGroup:{x:Math.ceil(x/64)},programUniforms:$}),getShaderSource:T},{inputs:[r[0],b]})},Tl=t=>({batchDims:t.batch_dims,cacheKey:""})});var Mg,Rg,Cl,Al,El=V(()=>{"use strict";ee();te();Ce();oe();Mg=(t,e)=>{if(t.length<3||t.length>4)throw new Error("GatherBlockQuantized requires 3 or 4 inputs.");let r=k.normalizeAxis(e.quantizeAxis,t[0].dims.length),n=e.blockSize,o=t[0],i=t[2],a=t.length===4?t[3]:void 0;if(i.dims.length!==o.dims.length||!o.dims.map((u,d)=>d===r?Math.ceil(u/n)===i.dims[d]:u===i.dims[d]).reduce((u,d)=>u&&d,!0))throw new Error("Scales must have the same rank as the input tensor and the dims should match except on gatherAxis.");if(a){if(a.dataType!==o.dataType)throw new Error("Zero point must have the same data type as the input tensor.");if(a.dims.length!==i.dims.length||!a.dims.map((u,d)=>u===i.dims[d]).reduce((u,d)=>u&&d,!0))throw new Error("Zero point must have the same rank as the input tensor and the dims should match except on quantizeAxis.")}},Rg=(t,e)=>{let r=t[0].dims,n=t[1].dims,o=r.length,i=k.normalizeAxis(e.gatherAxis,o),a=k.normalizeAxis(e.quantizeAxis,o),u=r.slice(0);u.splice(i,1,...n);let d=k.size(u),c=t[2].dataType,m=t[0].dataType===22,g=[{type:12,data:d},{type:12,data:a},{type:12,data:i},{type:12,data:e.blockSize},...W(...t.map((b,_)=>b.dims),u)],y=b=>{let _=D("data",t[0].dataType,t[0].dims.length),S=D("inputIndices",t[1].dataType,t[1].dims.length),x=D("scales",t[2].dataType,t[2].dims.length),$=t.length>3?D("zeroPoint",t[3].dataType,t[3].dims.length):void 0,T=R("output",c,u.length),I=[_,S,x];$&&I.push($);let A=[{name:"output_size",type:"u32"},{name:"quantize_axis",type:"u32"},{name:"gather_axis",type:"u32"},{name:"block_size",type:"u32"}];return`
        ${b.registerUniforms(A).declareVariables(...I,T)}
        ${b.mainStart()}
        let output_indices = ${T.offsetToIndices("global_idx")};
        var indices_indices = ${S.type.indices}(0);
        ${n.length>1?`
          for (var i: u32 = 0; i < ${n.length}; i++) {
            let index = ${T.indicesGet("output_indices","uniforms.gather_axis + i")};
            ${S.indicesSet("indices_indices","i","index")};
          }`:`indices_indices = ${T.indicesGet("output_indices","uniforms.gather_axis")};`};
        var data_indices = ${_.type.indices}(0);
        for (var i: u32 = 0; i < uniforms.gather_axis; i++) {
          let index = ${T.indicesGet("output_indices","i")};
          ${_.indicesSet("data_indices","i","index")};
        }
        var index_from_indices = ${S.getByIndices("indices_indices")};
        if (index_from_indices < 0) {
          index_from_indices += ${r[i]};
        }
        ${_.indicesSet("data_indices","uniforms.gather_axis","u32(index_from_indices)")};
        for (var i = uniforms.gather_axis + 1; i < ${u.length}; i++) {
          let index = ${T.indicesGet("output_indices",`i + ${n.length} - 1`)};
          ${_.indicesSet("data_indices","i","index")};
        }
        let data_offset = ${_.indicesToOffset("data_indices")};
        let data_index = data_offset % 8;
        // Convert 4-bit packed data to 8-bit packed data.
        let packed_4bit_quantized_data = ${_.getByOffset("data_offset / 8")};
        let packed_8bit_quantized_data = (packed_4bit_quantized_data >> (4 * (data_index % 2))) & 0x0f0f0f0f;
        let quantized_data_vec = ${m?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_quantized_data));
        let quantized_data = quantized_data_vec[data_index / 2];
        var scale_indices = data_indices;
        let quantize_axis_index = ${x.indicesGet("data_indices","uniforms.quantize_axis")} / uniforms.block_size;
        ${x.indicesSet("scale_indices","uniforms.quantize_axis","quantize_axis_index")};
        var scale = ${x.getByIndices("scale_indices")};
        ${$?`
              let zero_point_indices = scale_indices;
              let zero_point_offset = ${$.indicesToOffset("zero_point_indices")};
              let zero_point_index = zero_point_offset % 8;
              let packed_4bit_zero_points = ${$.getByOffset("zero_point_offset / 8")};
              let packed_8bit_zero_points = (packed_4bit_zero_points >> (4 * (zero_point_index % 2))) & 0x0f0f0f0f;
              let zero_point_vec = ${m?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_zero_points));
              let zero_point = zero_point_vec[zero_point_index / 2];`:"var zero_point = 0"};
        let dequantized_data = ${Ae(c)}(quantized_data - zero_point) * scale;
        ${T.setByOffset("global_idx","dequantized_data")};
    }`};return{name:"GatherBlockQuantized",shaderCache:{hint:`${e.cacheKey};${t.filter((b,_)=>_!==1).map(b=>b.dims.join("_")).join(";")}`,inputDependencies:Array.from({length:t.length},(b,_)=>"rank")},getRunData:()=>({outputs:[{dims:u,dataType:c}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:g}),getShaderSource:y}},Cl=(t,e)=>{let r=t.inputs;Mg(r,e),t.compute(Rg(t.inputs,e))},Al=t=>J({blockSize:t.blockSize,gatherAxis:t.gatherAxis,quantizeAxis:t.quantizeAxis})});var Ug,Ng,kl,Pl,Dl=V(()=>{"use strict";ee();te();Ce();oe();Ug=t=>{if(!t||t.length!==2)throw new Error("GatherElements requires 2 inputs.");if(t[0].dims.length<1)throw new Error("GatherElements requires that the data input be rank >= 1.");if(t[0].dims.length!==t[1].dims.length)throw new Error(`GatherElements requires that the data input and
                     indices input tensors be of same rank.`)},Ng=(t,e)=>{let r=t[0].dims,n=t[0].dataType,o=r.length,i=t[1].dims,a=t[1].dataType,u=k.normalizeAxis(e.axis,o),d=r[u],c=i.slice(0),p=k.size(c),m=D("input",n,o),g=D("indicesInput",a,i.length),y=R("output",n,c.length),b=[{type:12,data:p},{type:6,data:d},{type:12,data:u}];return b.push(...W(r,i,c)),{name:"GatherElements",shaderCache:{inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:c,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:b}),getShaderSource:x=>`
      ${x.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(m,g,y)}
      ${x.mainStart()}
      ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

      let outputIndices = ${y.offsetToIndices("global_idx")};

      var idx = ${g.getByOffset("global_idx")};
      if (idx < 0) {
        idx = idx + uniforms.axisDimLimit;
      }
      var inputIndices = ${m.type.indices}(outputIndices);
      ${m.indicesSet("inputIndices","uniforms.axis","u32(idx)")};
      let value = ${m.getByIndices("inputIndices")};

      ${y.setByOffset("global_idx","value")};
  }`}},kl=t=>J({axis:t.axis}),Pl=(t,e)=>{let r=t.inputs;Ug(r),t.compute(Ng(t.inputs,e))}});var Vg,Lg,Ol,Bl,zl=V(()=>{"use strict";ee();te();oe();Vg=t=>{if(!t)throw new Error("Input is missing");if(t.length<2||t.length>3)throw new Error("Invaid input number.");if(t.length===3&&t[2].dims.length>2)throw new Error("Invalid input shape of C");if(t[0].dataType!==t[1].dataType||t.length===3&&t[0].dataType!==t[2].dataType)throw new Error("Input types are mismatched")},Lg=(t,e)=>{let r=t[0].dims.slice(),n=t[1].dims.slice(),[o,i,a]=Hr.getShapeOfGemmResult(r,e.transA,n,e.transB,t.length===3?t[2].dims:void 0),u=[o,i];if(!u)throw new Error("Can't use gemm on the given tensors");let d=16,c=Math.ceil(i/d),p=Math.ceil(o/d),m=!0,g=k.size(u),y=[{type:12,data:m?c:g},{type:12,data:o},{type:12,data:i},{type:12,data:a},{type:1,data:e.alpha},{type:1,data:e.beta}],b=["type","type"];t.length===3&&(y.push(...W(t[2].dims)),b.push("rank")),y.push(...W(u));let _=x=>{let $="";e.transA&&e.transB?$="value += a[k * uniforms.M + m] * b[n * uniforms.K + k];":e.transA&&!e.transB?$="value += a[k * uniforms.M + m] * b[k * uniforms.N + n];":!e.transA&&e.transB?$="value += a[m * uniforms.K + k] * b[n * uniforms.K + k];":!e.transA&&!e.transB&&($="value += a[m * uniforms.K + k] * b[k * uniforms.N + n];");let T=e.alpha===1?"":"value *= uniforms.alpha;",I=D("a",t[0].dataType,t[0].dims),A=D("b",t[1].dataType,t[1].dims),E=I.type.value,O=null,w=[I,A];t.length===3&&(O=D("c",t[2].dataType,t[2].dims.length),w.push(O));let U=R("output",t[0].dataType,u.length);w.push(U);let N=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}];return`
  ${x.registerUniforms(N).declareVariables(...w)}

  ${x.mainStart()}
    ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let m = global_idx / uniforms.N;
    let n = global_idx % uniforms.N;

    var value = ${E}(0);
    for (var k: u32 = 0u; k < uniforms.K; k++) {
      ${$}
    }

    ${T}
    ${O!=null?`let cOffset = ${O.broadcastedIndicesToOffset("vec2(m, n)",U)}; value += ${E}(uniforms.beta) * ${O.getByOffset("cOffset")};`:""}
    output[global_idx] = value;
  }`},S=x=>{let $=D("a",t[0].dataType,t[0].dims),T=D("b",t[1].dataType,t[1].dims),I=null,A=[$,T];t.length===3&&(I=D("c",t[2].dataType,t[2].dims.length),A.push(I));let E=R("output",t[0].dataType,u.length);A.push(E);let O=[{name:"num_tile_n",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}],w="",U="";e.transA&&e.transB?(U=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${$.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${T.type.value}(0);
      }
      `,w="value += tile_a[k][local_id.y] * tile_b[local_id.x][k];"):e.transA&&!e.transB?(U=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${$.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${T.type.value}(0);
      }
      `,w="value += tile_a[k][local_id.y] * tile_b[k][local_id.x];"):!e.transA&&e.transB?(U=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${$.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${T.type.value}(0);
      }
      `,w="value += tile_a[local_id.y][k] * tile_b[local_id.x][k];"):!e.transA&&!e.transB&&(U=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${$.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${T.type.value}(0);
      }
      `,w="value += tile_a[local_id.y][k] * tile_b[k][local_id.x];");let N=e.alpha===1?"":"value *= uniforms.alpha;";return`
  ${x.registerUniforms(O).declareVariables(...A)}
  var<workgroup> tile_a: array<array<${$.type.storage}, ${d}>, ${d}>;
  var<workgroup> tile_b: array<array<${T.type.storage}, ${d}>, ${d}>;
  ${x.mainStart([d,d,1])}
    let tile_col_start = (workgroup_index % uniforms.num_tile_n) * ${d};
    let tile_row_start = (workgroup_index / uniforms.num_tile_n) * ${d};
    let num_tiles = (uniforms.K - 1) / ${d} + 1;
    var k_start = 0u;
    var value = ${E.type.value}(0);
    for (var t: u32 = 0u; t < num_tiles; t++) {
      ${U}
      k_start = k_start + ${d};
      workgroupBarrier();

      for (var k: u32 = 0u; k < ${d}; k++) {
        ${w}
      }
      workgroupBarrier();
    }

    ${N}
    let m = tile_row_start + local_id.y;
    let n = tile_col_start + local_id.x;
    ${I!=null?`let cOffset = ${I.broadcastedIndicesToOffset("vec2(m, n)",E)}; value += ${E.type.value}(uniforms.beta) * ${I.getByOffset("cOffset")};`:""}
    if (m < uniforms.M && n < uniforms.N) {
      output[m * uniforms.N + n] = value;
    }
  }`};return m?{name:"GemmShared",shaderCache:{hint:`${e.cacheKey}`,inputDependencies:b},getRunData:()=>({outputs:[{dims:u,dataType:t[0].dataType}],dispatchGroup:{x:c*p},programUniforms:y}),getShaderSource:S}:{name:"Gemm",shaderCache:{hint:`${e.cacheKey}`,inputDependencies:b},getRunData:()=>({outputs:[{dims:u,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(g/64)},programUniforms:y}),getShaderSource:_}},Ol=t=>{let e=t.transA,r=t.transB,n=t.alpha,o=t.beta;return{transA:e,transB:r,alpha:n,beta:o,cacheKey:`${t.transA};${t.transB};${t.alpha===1}`}},Bl=(t,e)=>{Vg(t.inputs),t.compute(Lg(t.inputs,e))}});var mt,It,qt,Kt,Wg,Gg,Hg,Fg,qg,Kg,jg,Zg,Ml,Rl,Ul=V(()=>{"use strict";ee();te();Ce();oe();[mt,It,qt,Kt]=[0,1,2,3],Wg=t=>{if(t[0].dims.length!==4)throw new Error("only 4-D tensor is supported.");if(t[0].dims.length!==t[1].dims.length)throw new Error("input dimensions must be equal to grid dimensions");if(t[0].dims.length-2!==t[1].dims[t[1].dims.length-1])throw new Error(`last dimension of grid must be equal to ${t[0].dims.length-2}`);if(t[0].dims[0]!==t[1].dims[0])throw new Error("grid batch size must match input batch size")},Gg=`
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
`,Hg=t=>`
  fn gs_bicubic_interpolate(p: mat4x4<${t}>, x: f32, y: f32) -> ${t} {
    var v: vec4<f32>;
    var coeffs = gs_get_cubic_coeffs(x);
    for (var i = 0; i < 4; i++) {
      v[i] = coeffs[0] * p[i][0] + coeffs[1] * p[i][1] + coeffs[2] * p[i][2] + coeffs[3] * p[i][3];
    }
    coeffs = gs_get_cubic_coeffs(y);
    let pixel = ${t}(coeffs[0] * v[0] + coeffs[1] * v[1] + coeffs[2] * v[2] + coeffs[3] * v[3]);
    return pixel;
  }
`,Fg=t=>`
  fn gs_denormalize(n: f32, length: i32) -> f32 {
    ${t.alignCorners===0?`
    // alignCorners: false => [-1, 1] to [-0.5, length - 0.5]
    return ((n + 1.0) * f32(length) - 1.0) / 2.0;
    `:`
    // alignCorners: true => [-1, 1] to [0, length - 1]
    return (n + 1.0) / 2.0 * (f32(length - 1));
    `}
  }
`,qg=t=>`
  ${t.paddingMode==="reflection"?`
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
`,Kg=(t,e,r)=>`
  fn pixel_at_grid(r: i32, c: i32, H: i32, W: i32, batch: u32, channel: u32, border: vec4<f32>) -> ${e} {
     var pixel = ${e}(0);
     var indices = vec4<u32>(0);
     indices[${mt}] = batch;
     indices[${It}] = channel;`+(()=>{switch(r.paddingMode){case"zeros":return`
          if (r >= 0 && r < H && c >=0 && c < W) {
            indices[${qt}] = u32(r);
            indices[${Kt}] = u32(c);
          } else {
            return ${e}(0);
          }
        `;case"border":return`
          indices[${qt}] = u32(clamp(r, 0, H - 1));
          indices[${Kt}] = u32(clamp(c, 0, W - 1));
        `;case"reflection":return`
          indices[${qt}] = gs_reflect(r, border[1], border[3]);
          indices[${Kt}] = gs_reflect(c, border[0], border[2]);
        `;default:throw new Error(`padding mode ${r.paddingMode} is not supported`)}})()+`
    return ${t.getByIndices("indices")};
  }
`,jg=(t,e,r)=>(()=>{switch(r.mode){case"nearest":return`
          let result = pixel_at_grid(i32(round(y)), i32(round(x)), H_in, W_in, indices[${mt}], indices[${It}], border);
        `;case"bilinear":return`
          let x1 = i32(floor(x));
          let y1 = i32(floor(y));
          let x2 = x1 + 1;
          let y2 = y1 + 1;

          let p11 = pixel_at_grid(y1, x1, H_in, W_in, indices[${mt}], indices[${It}], border);
          let p12 = pixel_at_grid(y1, x2, H_in, W_in, indices[${mt}], indices[${It}], border);
          let p21 = pixel_at_grid(y2, x1, H_in, W_in, indices[${mt}], indices[${It}], border);
          let p22 = pixel_at_grid(y2, x2, H_in, W_in, indices[${mt}], indices[${It}], border);

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
              p[h][w] = pixel_at_grid(h + y0, w + x0, H_in, W_in, indices[${mt}], indices[${It}], border);
            }
          }

          let dx = x - f32(x0 + 1);
          let dy = y - f32(y0 + 1);
          let result = gs_bicubic_interpolate(p, dx, dy);
        `;default:throw new Error(`mode ${r.mode} is not supported`)}})()+`${t.setByOffset("global_idx","result")}`,Zg=(t,e)=>{let r=D("x",t[0].dataType,t[0].dims.length),n=[t[1].dims[0],t[1].dims[1],t[1].dims[2]],o=D("grid",t[1].dataType,n.length,2),i=[t[0].dims[0],t[0].dims[1],t[1].dims[1],t[1].dims[2]];e.format==="NHWC"&&(i=[t[0].dims[0],t[1].dims[1],t[1].dims[2],t[0].dims[3]],[mt,It,qt,Kt]=[0,3,1,2]);let a=R("output",t[0].dataType,i.length),u=r.type.value,d=k.size(i),c=[{type:12,data:d},...W(t[0].dims,n,i)],p=m=>`
  ${m.registerUniform("output_size","u32").declareVariables(r,o,a)}
  ${Gg}
  ${Hg(u)}
  ${Fg(e)}
  ${qg(e)}
  ${Kg(r,u,e)}

  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let H_in = i32(uniforms.x_shape[${qt}]);
      let W_in = i32(uniforms.x_shape[${Kt}]);

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

      let indices = ${a.offsetToIndices("global_idx")};
      var grid_indices = vec3<u32>(indices[${mt}], indices[${qt}], indices[${Kt}]);
      let nxy = ${o.getByIndices("grid_indices")};
      var x = gs_denormalize(f32(nxy[0]), W_in);
      var y = gs_denormalize(f32(nxy[1]), H_in);

      ${jg(a,u,e)}
  }`;return{name:"GridSample",shaderCache:{hint:`${e.cacheKey}`,inputDependencies:["type","type"]},getRunData:m=>{let g=k.size(i);return{outputs:[{dims:i,dataType:m[0].dataType}],dispatchGroup:{x:Math.ceil(g/64)},programUniforms:c}},getShaderSource:p}},Ml=(t,e)=>{Wg(t.inputs),t.compute(Zg(t.inputs,e))},Rl=t=>J({alignCorners:t.align_corners,mode:t.mode,paddingMode:t.padding_mode,format:t.format})});var Ue,Xg,Vl,Nl,Jg,dr,Ll,Oo=V(()=>{"use strict";ee();te();Ce();Qr();tn();oe();pt();Ue=(t,e)=>t.length>e&&t[e].dims.length>0?t[e]:void 0,Xg=(t,e)=>{let r=t[0],n=Ue(t,1),o=Ue(t,2),i=Ue(t,3),a=Ue(t,4),u=Ue(t,5),d=Ue(t,6),c=Ue(t,7);if(r.dims.length!==3&&r.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let p=r.dims[0],m=r.dims[1],g=r.dims.length===3?r.dims[2]:e.numHeads*r.dims[4],y=m,b=0,_=0,S=Math.floor(g/e.numHeads);if(d&&c&&k.size(d.dims)&&k.size(c.dims)){if(d.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(d.dims[0]!==p||d.dims[1]!==e.numHeads||d.dims[3]!==S)throw new Error('Input "past_key" shape (batch_size, num_heads, past_sequence_length, head_size)');if(c.dims[0]!==p||c.dims[1]!==e.numHeads||c.dims[3]!==S)throw new Error('Input "past_value" shape (batch_size, num_heads, past_sequence_length, head_size)');if(d.dims[2]!==c.dims[2])throw new Error('Input "past_key" and "past_value" shall have same dim 2 (past_sequence_length)');if(c.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');b=d.dims[2],_=d.dims[2]}else if(d&&k.size(d.dims)||c&&k.size(c.dims))throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let x;if(n&&k.size(n.dims)>0){if(r.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(n.dims.length<3||n.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(r.dims[0]!==n.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(n.dims.length===3){if(n.dims[2]!==r.dims[2])throw new Error('Input "query" and "key" shall have same dim 2 (hidden_size)');x=2,y=n.dims[1]}else if(n.dims.length===5){if(n.dims[2]!==e.numHeads||n.dims[3]!==2||n.dims[4]!==S)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(o)throw new Error('Expect "value" be none when "key" has packed kv format.');x=5,y=n.dims[1]}else{if(n.dims[1]!==e.numHeads||n.dims[3]!==S)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');x=0,y=n.dims[2]}}else{if(r.dims.length!==5)throw new Error('Input "query" is expected to have 5 dimensions when key is empty');if(r.dims[2]!==e.numHeads||r.dims[3]!==3)throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');x=3}if(i&&k.size(i.dims)>0){if(i.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimension');if(n&&n.dims.length===5&&n.dims[3]===2)throw new Error("bias is not allowed for packed kv.")}let $=b+y,T=0;if(a&&k.size(a.dims)>0){T=8;let O=a.dims;throw O.length===1?O[0]===p?T=1:O[0]===3*p+2&&(T=3):O.length===2&&O[0]===p&&O[1]===$&&(T=5),T===8?new Error('Input "key_padding_mask" shape shall be (batch_size) or (batch_size, total_sequence_length)'):new Error("Mask not supported")}let I=!1,A=g;if(o&&k.size(o.dims)>0){if(o.dims.length!==3&&o.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(r.dims[0]!==o.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(o.dims.length===3){if(y!==o.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');A=o.dims[2]}else{if(y!==o.dims[2])throw new Error('Input "key" and "value" shall have the same dim 2 (kv_sequence_length)');A=o.dims[1]*o.dims[3],I=!0}}let E=!1;if(a&&k.size(a.dims)>0)throw new Error("Key padding mask is not supported");if(u&&k.size(u.dims)>0){if(u.dims.length!==4)throw new Error('Input "attention_bias" is expected to have 4 dimensions');if(u.dims[0]!==p||u.dims[1]!==e.numHeads||u.dims[2]!==m||u.dims[3]!==$)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:p,sequenceLength:m,pastSequenceLength:b,kvSequenceLength:y,totalSequenceLength:$,maxSequenceLength:_,inputHiddenSize:0,hiddenSize:g,vHiddenSize:A,headSize:S,vHeadSize:Math.floor(A/e.numHeads),numHeads:e.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:e.maskFilterValue,maskType:T,scale:e.scale,broadcastResPosBias:E,passPastInKv:I,qkvFormat:x}},Vl=t=>J({...t}),Nl=J({perm:[0,2,1,3]}),Jg=(t,e,r,n,o,i,a)=>{let u=[n,o,i],d=k.size(u),c=[{type:12,data:d},{type:12,data:a},{type:12,data:i}],p=m=>{let g=R("qkv_with_bias",e.dataType,u),y=D("qkv",e.dataType,u),b=D("bias",r.dataType,u),_=[{name:"output_size",type:"u32"},{name:"bias_offset",type:"u32"},{name:"hidden_size",type:"u32"}];return`
  ${m.registerUniforms(_).declareVariables(y,b,g)}
  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let bias_offset_idx = (global_idx % uniforms.hidden_size) + uniforms.bias_offset;

    qkv_with_bias[global_idx] = qkv[global_idx] + bias[bias_offset_idx];
  }`};return t.compute({name:"MultiHeadAttentionAddBias",shaderCache:{inputDependencies:["type","type"]},getRunData:()=>({outputs:[{dims:u,dataType:e.dataType,gpuDataType:0}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:c}),getShaderSource:p},{inputs:[e,r],outputs:[-1]})[0]},dr=(t,e,r,n,o,i,a,u)=>{let d=i;if(a&&k.size(a.dims)>0){if(n===1)throw new Error("AddBiasReshape is not implemented. Please export your model with packed QKV or KV");return d=Jg(t,i,a,e,n,r*o,u),d=d.reshape([e,n,r,o]),r===1||n===1?d:t.compute(Be(d,Nl.perm),{inputs:[d],outputs:[-1]})[0]}else return i.dims.length===3&&(d=i.reshape([e,n,r,o])),r===1||n===1?d:t.compute(Be(d,Nl.perm),{inputs:[d],outputs:[-1]})[0]},Ll=(t,e)=>{let r=Xg(t.inputs,e),n=t.inputs[0],o=Ue(t.inputs,1),i=Ue(t.inputs,2),a=Ue(t.inputs,3),u=Ue(t.inputs,4),d=Ue(t.inputs,5),c=Ue(t.inputs,6),p=Ue(t.inputs,7);if(n.dims.length===5)throw new Error("Packed QKV is not implemented");if(o?.dims.length===5)throw new Error("Packed KV is not implemented");let m=o&&i&&o.dims.length===4&&i.dims.length===4,g=dr(t,r.batchSize,r.numHeads,r.sequenceLength,r.headSize,n,a,0);if(m)return Ft(t,g,o,i,u,void 0,c,p,d,r);if(!o||!i)throw new Error("key and value must be provided");let y=dr(t,r.batchSize,r.numHeads,r.kvSequenceLength,r.headSize,o,a,r.hiddenSize),b=dr(t,r.batchSize,r.numHeads,r.kvSequenceLength,r.vHeadSize,i,a,2*r.hiddenSize);Ft(t,g,y,b,u,void 0,c,p,d,r)}});var eb,tb,rb,nb,Bo,Wl,Gl,zo=V(()=>{"use strict";ee();te();Ce();oe();eb=t=>{if(!t||t.length<1)throw new Error("too few inputs")},tb=(t,e)=>{let r=[],n=e.numOutputs;return t[1].dims[0]>0&&(t[1].getBigInt64Array().forEach(o=>r.push(Number(o))),n=r.length),J({numOutputs:n,axis:e.axis,splitSizes:r})},rb=t=>`
fn calculateOutputIndex(index: u32) -> u32 {
    for (var i: u32 = 0u; i < ${t}u; i += 1u ) {
    if (index < ${j("uniforms.size_in_split_axis","i",t)}) {
        return i;
    }
    }
    return ${t}u;
}`,nb=t=>{let e=t.length,r=[];for(let n=0;n<e;++n){let o=t[n].setByIndices("indices","input[global_idx]");e===1?r.push(o):n===0?r.push(`if (output_number == ${n}u) { ${o} }`):n===e-1?r.push(`else { ${o} }`):r.push(`else if (output_number == ${n}) { ${o} }`)}return`
      fn writeBufferData(output_number: u32, indices: ${t[0].type.indices}, global_idx: u32) {
        ${r.join(`
`)}
      }`},Bo=(t,e)=>{let r=t[0].dims,n=k.size(r),o=t[0].dataType,i=k.normalizeAxis(e.axis,r.length),a=new Array(e.numOutputs),u=D("input",o,r.length),d=new Array(e.numOutputs),c=[],p=[],m=0,g=[{type:12,data:n}];for(let b=0;b<e.numOutputs;b++){m+=e.splitSizes[b],d[b]=m;let _=r.slice();_[i]=e.splitSizes[b],p.push(_),a[b]=R(`output${b}`,o,_.length),c.push({dims:p[b],dataType:t[0].dataType})}g.push({type:12,data:d},...W(r,...p));let y=b=>`
  ${b.registerUniform("input_size","u32").registerUniform("size_in_split_axis","u32",d.length).declareVariables(u,...a)}
  ${rb(d.length)}
  ${nb(a)}

  ${b.mainStart()}
    ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.input_size")}

    var indices = ${u.offsetToIndices("global_idx")};
    var index = ${u.indicesGet("indices",i)};
    let output_number = calculateOutputIndex(index);
    if (output_number != 0) {
      index -= ${j("uniforms.size_in_split_axis","output_number - 1u",d.length)};
      ${u.indicesSet("indices",i,"index")};
    }
    writeBufferData(output_number, indices, global_idx);
  }`;return{name:"Split",shaderCache:{hint:e.cacheKey,inputDependencies:["rank"]},getShaderSource:y,getRunData:()=>({outputs:c,dispatchGroup:{x:Math.ceil(n/64)},programUniforms:g})}},Wl=(t,e)=>{eb(t.inputs);let r=t.inputs.length===1?e:tb(t.inputs,e);t.compute(Bo(t.inputs,r),{inputs:[0]})},Gl=t=>{let e=t.axis,r=t.splitSizes,n=t.numOutputs<0?r.length:t.numOutputs;if(n!==r.length)throw new Error("numOutputs and splitSizes length must be equal");return J({axis:e,numOutputs:n,splitSizes:r})}});var ob,mn,Hl,Mo=V(()=>{"use strict";ee();te();Ce();oe();ob=(t,e)=>{let[r,n,o,i]=t,{numHeads:a,rotaryEmbeddingDim:u}=e;if(r.dims.length!==3&&r.dims.length!==4)throw new Error(`Input 'x' is expected to have 3 or 4 dimensions, got ${r.dims.length}`);if(!k.areEqual(n.dims,[])&&!k.areEqual(n.dims,[1])&&n.dims.length!==2)throw new Error(`Input 'position_ids' is expected to have 0, 1, or 2 dimensions, got ${n.dims.length}`);if(o.dims.length!==2)throw new Error(`Input 'cos_cache' is expected to have 2 dimensions, got ${o.dims.length}`);if(i.dims.length!==2)throw new Error(`Input 'sin_cache' is expected to have 2 dimensions, got ${i.dims.length}`);if(!k.areEqual(o.dims,i.dims))throw new Error("Inputs 'cos_cache' and 'sin_cache' are expected to have the same shape");if(u>0&&a===0)throw new Error("num_heads must be provided if rotary_embedding_dim is specified");let d=r.dims[0],c=r.dims[r.dims.length-2],p=o.dims[0],m=k.sizeFromDimension(r.dims,1)/c,g=u===0?o.dims[1]*2:m/a;if(u>g)throw new Error("rotary_embedding_dim must be less than or equal to head_size");if(n.dims.length===2){if(d!==n.dims[0])throw new Error(`Input 'position_ids' dimension 0 should be of size batch_size, got ${n.dims[0]}`);if(c!==n.dims[1])throw new Error(`Input 'position_ids' dimension 1 should be of size sequence_length, got ${n.dims[1]}`)}if(c>p)throw new Error("Updating cos_cache and sin_cache in RotaryEmbedding is not currently supported");if(g/2!==o.dims[1]&&u/2!==o.dims[1])throw new Error(`Input 'cos_cache' dimension 1 should be same as head_size / 2 or rotary_embedding_dim / 2, got ${o.dims[1]}`)},mn=(t,e)=>{let{interleaved:r,numHeads:n,rotaryEmbeddingDim:o,scale:i}=e,a=t[0].dims[0],u=k.sizeFromDimension(t[0].dims,1),d=t[0].dims[t[0].dims.length-2],c=u/d,p=t[2].dims[1],m=o===0?p*2:c/n,g=new Array(a,d,c/m,m-p),y=k.computeStrides(g),b=[{type:1,data:i},{type:12,data:g},{type:12,data:y},...t[0].dims.length===3?new Array({type:12,data:[u,c,m,1]}):[],...t[0].dims.length===4?new Array({type:12,data:[u,m,d*m,1]}):[],...W(t[0].dims,t[1].dims,t[2].dims,t[3].dims,t[0].dims)],_=S=>{let x=D("input",t[0].dataType,t[0].dims.length),$=D("position_ids",t[1].dataType,t[1].dims.length),T=D("cos_cache",t[2].dataType,t[2].dims.length),I=D("sin_cache",t[3].dataType,t[3].dims.length),A=R("output",t[0].dataType,t[0].dims.length);return S.registerUniforms([{name:"scale",type:"f32"},{name:"global_shape",type:"u32",length:g.length},{name:"global_strides",type:"u32",length:y.length},{name:"input_output_strides",type:"u32",length:y.length}]),`
        ${S.declareVariables(x,$,T,I,A)}

        ${S.mainStart(zt)}
          let half_rotary_emb_dim = uniforms.${T.name}_shape[1];
          let bsnh = global_idx / uniforms.global_strides % uniforms.global_shape;
          let size = uniforms.global_shape[0] * uniforms.global_strides[0];
          ${S.guardAgainstOutOfBoundsWorkgroupSizes("size")}

          if (bsnh[3] < half_rotary_emb_dim) {
            let position_ids_idx =
                ${$.broadcastedIndicesToOffset("bsnh.xy",R("",$.type.tensor,2))};
            let position_id =
                u32(${$.getByOffset("position_ids_idx")}) + select(0, bsnh[1], position_ids_idx == 0);
            let i = dot(bsnh, uniforms.input_output_strides) + select(0, bsnh[3], ${r});
            let j = i + select(half_rotary_emb_dim, 1, ${r});
            let re = ${x.getByOffset("i")} * ${T.get("position_id","bsnh[3]")} -
                ${x.getByOffset("j")} * ${I.get("position_id","bsnh[3]")};
            ${A.setByOffset("i","re")}
            let im = ${x.getByOffset("i")} * ${I.get("position_id","bsnh[3]")} +
                ${x.getByOffset("j")} * ${T.get("position_id","bsnh[3]")};
            ${A.setByOffset("j","im")}
          } else {
            let k = dot(bsnh, uniforms.input_output_strides) + half_rotary_emb_dim;
            ${A.setByOffset("k",x.getByOffset("k"))}
          }
        }`};return{name:"RotaryEmbedding",shaderCache:{hint:J({interleaved:r}).cacheKey,inputDependencies:["rank","rank","rank","rank"]},getShaderSource:_,getRunData:()=>({outputs:[{dims:t[0].dims,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(k.size(g)/zt)},programUniforms:b})}},Hl=(t,e)=>{ob(t.inputs,e),t.compute(mn(t.inputs,e))}});var ib,ab,Fl,sb,ql,Kl=V(()=>{"use strict";Ce();ee();tn();Oo();zo();pt();Mo();oe();ib=(t,e)=>{if(e.doRotary&&t.length<=7)throw new Error("cos_cache and sin_cache inputs are required if do_rotary is specified");let r=t[0],n=t[1],o=t[2],i=t[3],a=t[4];if(e.doRotary!==0&&t.length<=7)throw new Error("cos_cast and sin_cache are expected if do_rotary attribute is non-zero");if(e.localWindowSize!==-1)throw new Error("Local attention is not supported");if(e.softcap!==0)throw new Error("Softcap is not supported");if(e.rotaryInterleaved!==0)throw new Error("Rotary interleaved is not supported");if(e.smoothSoftmax)throw new Error("Smooth softmax is not supported");if(r.dims.length!==3&&r.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let u=!1,d=r.dims[0],c=r.dims[1],p=r.dims.length===3?u?r.dims[2]/3:r.dims[2]:e.numHeads*r.dims[4],m=c,g=0,y=!n||n.dims.length===0,b=Math.floor(y?p/(e.numHeads+2*e.kvNumHeads):p/e.numHeads);y&&(p=b*e.numHeads);let _=i&&i.dims.length!==0,S=a&&a.dims.length!==0;if(_&&i.dims.length===4&&i.dims[0]===d&&i.dims[1]!==e.kvNumHeads&&i.dims[2]===e.kvNumHeads&&i.dims[3]===b)throw new Error("BSNH pastKey/pastValue is not supported");if(_&&S){if(i.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(a.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');g=i.dims[2]}else if(_||S)throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let $=1;if(n&&n.dims.length>0){if(r.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(n.dims.length<3||n.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(r.dims[0]!==n.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(n.dims.length===3){if(r.dims[2]%n.dims[2]!==0)throw new Error('Dimension 2 of "query" should be a multiple of "key"');m=n.dims[1]}else if(n.dims.length===5){if(n.dims[2]!==e.numHeads||n.dims[3]!==2||n.dims[4]!==b)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(o)throw new Error('Expect "value" be none when "key" has packed kv format.');m=n.dims[1]}else{if(n.dims[1]!==e.numHeads||n.dims[3]!==b)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');m=n.dims[2]}}else{if(r.dims.length!==3&&r.dims.length!==5)throw new Error('Input "query" is expected to have 3 or 5 dimensions when key is empty');if(r.dims.length===5&&(r.dims[2]!==e.numHeads||r.dims[3]!==3))throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');$=3}let T=0,I=!1,A=e.kvNumHeads?b*e.kvNumHeads:p;if(o&&o.dims.length>0){if(o.dims.length!==3&&o.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(r.dims[0]!==o.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(o.dims.length===3){if(m!==o.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');A=o.dims[2]}else{if(m!==o.dims[2])throw new Error('Input "past_key" and "past_value" shall have the same dim 2 (kv_sequence_length)');A=o.dims[1]*o.dims[3],I=!0}}let E=t.length>4?t[5]:void 0;if(E){if(E.dims.length===0)throw new Error("seqlens_k must be at least 1D, got scalar.");let N=E.dims.reduce((F,q)=>F*q,1);if(N!==d)throw new Error(`seqlens_k must have batch_size (${d}) elements, got ${N}.`);for(let F=0;F<E.dims.length;F++)if(E.dims[F]!==1&&E.dims[F]!==d)throw new Error(`seqlens_k has unexpected shape. Each dimension must be 1 or batch_size (${d}), got dims[${F}] = ${E.dims[F]}.`)}return{batchSize:d,sequenceLength:c,pastSequenceLength:g,kvSequenceLength:m,totalSequenceLength:-1,maxSequenceLength:-1,inputHiddenSize:0,hiddenSize:p,vHiddenSize:A,headSize:b,vHeadSize:Math.floor(A/e.kvNumHeads),numHeads:e.numHeads,kvNumHeads:e.kvNumHeads,nReps:e.numHeads/e.kvNumHeads,pastPresentShareBuffer:!1,maskType:T,scale:e.scale,broadcastResPosBias:!1,passPastInKv:I,qkvFormat:$}},ab=J({perm:[0,2,1,3]}),Fl=(t,e,r)=>{let n=e,o=r.kvNumHeads;return e.dims.length===3&&r.kvSequenceLength!==0&&(n=e.reshape([r.batchSize,r.kvSequenceLength,o,r.headSize]),n=t.compute(Be(n,ab.perm),{inputs:[n],outputs:[-1]})[0]),n},sb=(t,e,r,n)=>{let o=7,i=["type","type"],a=[t*e],u=t*e,d=[{type:12,data:u},{type:12,data:e},{type:12,data:t}],c=p=>{let m=D("seq_lens",r.dataType,r.dims),g=D("total_seq_lens",n.dataType,n.dims),y=R("pos_ids",o,a),b=[{name:"output_size",type:"u32"},{name:"sequence_length",type:"u32"},{name:"batch_size",type:"u32"}];return`
  ${p.registerUniforms(b).declareVariables(m,g,y)}
  ${p.mainStart()}
    ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let total_sequence_length = u32(${g.getByOffset("0")});
    let is_subsequent_prompt = uniforms.sequence_length > 1 && uniforms.sequence_length != total_sequence_length;
    let is_first_prompt = !is_subsequent_prompt && uniforms.sequence_length == total_sequence_length;
    let batch_idx = global_idx / uniforms.sequence_length;
    let sequence_idx = i32(global_idx % uniforms.sequence_length);
    var pos_id: i32 = 0;
    let seqlen = ${m.getByOffset("batch_idx")};
    let total_seqlen = seqlen + 1;
    if (is_first_prompt) {
      if (sequence_idx < total_seqlen) {
        pos_id = sequence_idx;
      } else {
        pos_id = 1;
      }
      ${y.setByOffset("global_idx","pos_id")}
    } else if (is_subsequent_prompt) {
      let past_seqlen = total_seqlen - i32(uniforms.sequence_length);
      if (past_seqlen + sequence_idx < total_seqlen) {
        pos_id = past_seqlen + sequence_idx;
      } else {
        pos_id = 1;
      }
      ${y.setByOffset("global_idx","pos_id")}
    } else if (global_idx < uniforms.batch_size) {
      ${y.setByOffset("global_idx","seqlen")}
    };
  }
  `};return{name:"GeneratePositionIds",shaderCache:{hint:`${t};${e}`,inputDependencies:i},getRunData:()=>({outputs:[{dims:a,dataType:o}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:d}),getShaderSource:c}},ql=(t,e)=>{if(t.inputs.length>14&&t.inputs[14]||t.inputs.length>15&&t.inputs[15])throw new Error("GroupQueryAttention (JSEP): q_norm_weight / k_norm_weight inputs are not supported. The per-head Q/K RMS normalization prologue is implemented only on the CUDA and native WebGPU EPs.");let r=ib(t.inputs,e);if(t.inputs[0].dims.length===5)throw new Error("Packed QKV is not implemented");if(t.inputs[1]?.dims.length===5)throw new Error("Packed KV is not implemented");let n=t.inputs[0],o=t.inputs[1]&&t.inputs[1].dims.length>0?t.inputs[1]:void 0,i=t.inputs[2]&&t.inputs[2].dims.length>0?t.inputs[2]:void 0,a=t.inputs[3]&&t.inputs[3].dims.length!==0?t.inputs[3]:void 0,u=t.inputs[4]&&t.inputs[4].dims.length!==0?t.inputs[4]:void 0,d=t.inputs.length>4?t.inputs[5]:void 0,c=t.inputs.length>5?t.inputs[6]:void 0,p=r.kvNumHeads?r.kvNumHeads:r.numHeads,m=J({axis:2,numOutputs:3,splitSizes:[r.numHeads*r.headSize,p*r.headSize,p*r.headSize]}),[g,y,b]=!o&&!i?t.compute(Bo([n],m),{inputs:[n],outputs:[-1,-1,-1]}):[n,o,i],_,S;if(e.doRotary){let I=t.compute(sb(r.batchSize,r.sequenceLength,d,c),{inputs:[d,c],outputs:[-1]})[0],A=t.inputs[7],E=t.inputs[8],O=J({interleaved:e.rotaryInterleaved!==0,numHeads:r.numHeads,rotaryEmbeddingDim:0,scale:e.scale}),w=[g,I,A,E],U=[-1];_=t.compute(mn(w,O),{inputs:w,outputs:U})[0],w.splice(0,1,y);let N=J({interleaved:e.rotaryInterleaved!==0,numHeads:r.kvNumHeads,rotaryEmbeddingDim:0,scale:e.scale});S=t.compute(mn(w,N),{inputs:w,outputs:U})[0]}let x=dr(t,r.batchSize,r.numHeads,r.sequenceLength,r.headSize,e.doRotary?_:g,void 0,0),$=Fl(t,e.doRotary?S:y,r),T=Fl(t,b,r);Ft(t,x,$,T,void 0,void 0,a,u,void 0,r,d,c)}});var jl,ub,db,Zl,Ql=V(()=>{"use strict";ee();te();pt();oe();jl=(t,e,r,n,o,i,a,u)=>{let d=fe(i),c=d===1?"f32":`vec${d}f`,p=d===1?"vec2f":`mat2x${d}f`,m=o*a,g=64;m===1&&(g=256);let y=[o,a,i/d],b=[o,a,2],_=["rank","type","type"],S=[];S.push(...W(y,b));let x=$=>{let T=D("x",e.dataType,3,d),I=D("scale",r.dataType,r.dims),A=D("bias",n.dataType,n.dims),E=R("output",1,3,2),O=[T,I,A,E];return`
  var<workgroup> workgroup_shared : array<${p}, ${g}>;
  const workgroup_size = ${g}u;
  ${$.declareVariables(...O)}
  ${$.mainStart(g)}
    let batch = workgroup_index / uniforms.x_shape[1];
    let channel = workgroup_index % uniforms.x_shape[1];
    let hight = uniforms.x_shape[2];
    // initialize workgroup memory
    var sum = ${c}(0);
    var squared_sum = ${c}(0);
    for (var h = local_idx; h < hight; h += workgroup_size) {
      let value = ${c}(${T.get("batch","channel","h")});
      sum += value;
      squared_sum += value * value;
    }
    workgroup_shared[local_idx] = ${p}(sum, squared_sum);
    workgroupBarrier();

    for (var currSize = workgroup_size >> 1;  currSize > 0; currSize = currSize >> 1) {
      if (local_idx < currSize) {
        workgroup_shared[local_idx] = workgroup_shared[local_idx] + workgroup_shared[local_idx + currSize];
      }
      workgroupBarrier();
    }
    if (local_idx == 0) {
      let sum_final = ${Ze("workgroup_shared[0][0]",d)} / f32(hight * ${d});
      let squared_sum_final = ${Ze("workgroup_shared[0][1]",d)} / f32(hight * ${d});

      let inv_std_dev = inverseSqrt(squared_sum_final - sum_final * sum_final + f32(${u}));
      let channel_scale = inv_std_dev * f32(scale[channel]);
      let channel_shift = f32(bias[channel]) - sum_final * channel_scale;
      output[workgroup_index] = vec2f(channel_scale, channel_shift);
    }
  }`};return t.compute({name:"InstanceNormComputeChannelScaleShift",shaderCache:{hint:`${d};${u};${g}`,inputDependencies:_},getRunData:()=>({outputs:[{dims:b,dataType:1}],dispatchGroup:{x:m},programUniforms:S}),getShaderSource:x},{inputs:[e,r,n],outputs:[-1]})[0]},ub=(t,e,r)=>{let n=e[0].dims,o=n,i=2,a=n[0],u=n[1],d=k.sizeFromDimension(n,i),c=fe(d),p=k.size(o)/c,m=jl(t,e[0],e[1],e[2],a,d,u,r.epsilon),g=[a,u,d/c],y=[a,u],b=["type","none"],_=S=>{let x=D("x",e[0].dataType,g.length,c),$=D("scale_shift",1,y.length,2),T=R("output",e[0].dataType,g.length,c),I=[x,$,T];return`
  ${S.registerUniform("output_size","u32").declareVariables(...I)}
  ${S.mainStart()}
  ${S.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let outputIndices = ${T.offsetToIndices("global_idx")};
      let batch = outputIndices[0];
      let channel = outputIndices[1];
      let scale_shift = ${$.getByIndices("vec2<u32>(batch, channel)")};
      let value = ${x.getByOffset("global_idx")} * ${T.type.value}(scale_shift.x) + ${T.type.value}(scale_shift.y);
      ${T.setByOffset("global_idx","value")};
  }`};t.compute({name:"InstanceNormalization",shaderCache:{hint:`${c}`,inputDependencies:b},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:[{type:12,data:p},...W(g,y,g)]}),getShaderSource:_},{inputs:[e[0],m]})},db=(t,e,r)=>{let n=e[0].dims,o=n,i=n[0],a=n[n.length-1],u=k.sizeFromDimension(n,1)/a,d=fe(a),c=k.size(o)/d,p=[{type:12,data:u},{type:12,data:Math.floor(a/d)}],m=["type","type"],g=!1,y=[0,n.length-1];for(let x=0;x<n.length-2;x++)g=g||n[x+1]!==1,y.push(x+1);g=g&&n[n.length-1]!==1;let b=g?t.compute(Be(t.inputs[0],y),{inputs:[t.inputs[0]],outputs:[-1]})[0]:t.inputs[0].reshape(Array.from({length:n.length},(x,$)=>n[y[$]])),_=jl(t,b,e[1],e[2],i,u,a,r.epsilon),S=x=>{let $=we(e[0].dataType),T=d===1?"vec2f":`mat${d}x2f`,I=O=>{let w=O===0?"x":"y",U=d===1?"f32":`vec${d}f`;switch(d){case 1:return`${$}(${U}(scale.${w}))`;case 2:return`vec2<${$}>(${U}(scale[0].${w}, scale[1].${w}))`;case 4:return`vec4<${$}>(${U}(scale[0].${w}, scale[1].${w}, scale[2].${w}, scale[3].${w}))`;default:throw new Error(`Not supported compoents ${d}`)}},A=D("input",e[0].dataType,e[0].dims,d),E=R("output",e[0].dataType,o,d);return`
  @group(0) @binding(0) var<storage, read> input : array<${A.type.storage}>;
  @group(0) @binding(1) var<storage, read> scale_input : array<${T}>;
  @group(0) @binding(2) var<storage, read_write> output : array<${E.type.storage}>;
  struct Uniforms {H: u32, C : u32};
  @group(0) @binding(3) var<uniform> uniforms: Uniforms;

  ${x.mainStart()}
    let current_image_number = global_idx / (uniforms.C * uniforms.H);
    let current_channel_number = global_idx % uniforms.C;

    let scale_offset = current_image_number * uniforms.C + current_channel_number;
    let scale = scale_input[scale_offset];
    output[global_idx] = fma(input[global_idx], ${I(0)}, ${I(1)});
  }`};t.compute({name:"InstanceNormalizationNHWC",shaderCache:{hint:`${d}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:p}),getShaderSource:S},{inputs:[e[0],_]})},Zl=(t,e)=>{e.format==="NHWC"?db(t,t.inputs,e):ub(t,t.inputs,e)}});var lb,cb,Yl,Xl=V(()=>{"use strict";ee();te();oe();lb=t=>{if(!t||t.length<2)throw new Error("layerNorm requires at least 2 inputs.")},cb=(t,e,r)=>{let n=e.simplified,o=t[0].dims,i=t[1],a=!n&&t[2],u=o,d=k.normalizeAxis(e.axis,o.length),c=k.sizeToDimension(o,d),p=k.sizeFromDimension(o,d),m=k.size(i.dims),g=a?k.size(a.dims):0;if(m!==p||a&&g!==p)throw new Error(`Size of X.shape()[axis:] == ${p}.
       Size of scale and bias (if provided) must match this.
       Got scale size of ${m} and bias size of ${g}`);let y=[];for(let A=0;A<o.length;++A)A<d?y.push(o[A]):y.push(1);let b=fe(p),_=["type","type"],S=[{type:12,data:c},{type:1,data:p},{type:12,data:Math.floor(p/b)},{type:1,data:e.epsilon}];a&&_.push("type");let x=r>1,$=r>2,T=A=>{let E=we(t[0].dataType),O=[D("x",t[0].dataType,t[0].dims,b),D("scale",i.dataType,i.dims,b)];a&&O.push(D("bias",a.dataType,a.dims,b)),O.push(R("output",t[0].dataType,u,b)),x&&O.push(R("mean_data_output",1,y)),$&&O.push(R("inv_std_output",1,y));let w=[{name:"norm_count",type:"u32"},{name:"norm_size",type:"f32"},{name:"norm_size_vectorized",type:"u32"},{name:"epsilon",type:"f32"}];return`
  ${A.registerUniforms(w).declareVariables(...O)}
  ${A.mainStart()}
    ${A.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.norm_count")}
    let offset = global_idx * uniforms.norm_size_vectorized;
    var mean_vector = ${bo("f32",b)};
    var mean_square_vector = ${bo("f32",b)};

    for (var h: u32 = 0u; h < uniforms.norm_size_vectorized; h++) {
      let value = ${Mt(E,b,"x[h + offset]")};
      mean_vector += value;
      mean_square_vector += value * value;
    }
    let mean = ${Ze("mean_vector",b)} / uniforms.norm_size;
    let inv_std_dev = inverseSqrt(${Ze("mean_square_vector",b)} / uniforms.norm_size ${n?"":"- mean * mean"} + uniforms.epsilon);

    for (var j: u32 = 0; j < uniforms.norm_size_vectorized; j++) {
      let f32input = ${Mt(E,b,"x[j + offset]")};
      let f32scale = ${Mt(E,b,"scale[j]")};
      output[j + offset] = ${O[0].type.value}((f32input ${n?"":"- mean"}) * inv_std_dev * f32scale
        ${a?`+ ${Mt(E,b,"bias[j]")}`:""}
      );
    }

    ${x?"mean_data_output[global_idx] = mean":""};
    ${$?"inv_std_output[global_idx] = inv_std_dev":""};
  }`},I=[{dims:u,dataType:t[0].dataType}];return x&&I.push({dims:y,dataType:1}),$&&I.push({dims:y,dataType:1}),{name:"LayerNormalization",shaderCache:{hint:`${b};${r};${n}`,inputDependencies:_},getRunData:()=>({outputs:I,dispatchGroup:{x:Math.ceil(c/64)},programUniforms:S}),getShaderSource:T}},Yl=(t,e)=>{lb(t.inputs),t.compute(cb(t.inputs,e,t.outputCount))}});var pb,Jl,ec=V(()=>{"use strict";te();un();dn();pb=t=>{if(!t||t.length!==2)throw new Error("MatMul requires 2 inputs.");if(t[0].dims[t[0].dims.length-1]!==t[1].dims[t[1].dims.length-2])throw new Error("shared dimension does not match.")},Jl=t=>{pb(t.inputs);let e=ot.calcShape(t.inputs[0].dims,t.inputs[1].dims,!0);if(!e)throw new Error("Can't use matmul on the given tensors");let r=e[e.length-1],n=t.inputs[0].dims[t.inputs[0].dims.length-1];if(r<8&&n<8)t.compute(sn(t.inputs,{activation:""},e));else{let o=e[e.length-2],i=k.size(t.inputs[0].dims.slice(0,-2)),a=k.size(t.inputs[1].dims.slice(0,-2));if(i!==1&&o===1&&a===1){let u=t.inputs[0].reshape([1,i,n]),d=t.inputs[1].reshape([1,n,r]),c=[1,i,r],p=[u,d];t.compute(ur(p,{activation:""},e,c),{inputs:p})}else t.compute(ur(t.inputs,{activation:""},e))}}});var mb,fb,hb,tc,rc,nc=V(()=>{"use strict";ee();te();Ce();oe();mb=(t,e)=>{if(t.length<3||t.length>4)throw new Error("MatMulNBits requires 3 or 4 inputs");let r=t[0],n=r.dims.length;if(r.dims[n-1]!==e.k)throw new Error("The last dim of input shape does not match the k value");let o=Math.floor((e.k+e.blockSize-1)/e.blockSize),i=e.blockSize/8*e.bits,a=t[1];if(!k.areEqual(a.dims,[e.n,o,i]))throw new Error("The second inputs must be 3D tensor with shape N X nBlocksPerCol X blobSize");let d=t[2].dims;if(k.size(d)!==e.n*o)throw new Error("scales input size error.");if(t.length===4){let p=t[3].dims,m=e.n*(e.bits===8?o:Math.floor((o*e.bits+7)/8));if(k.size(p)!==m)throw new Error("zeroPoints input size error.")}},fb=(t,e)=>{let r=t[0].dims,n=r.length,o=r[n-2],i=e.k,a=e.n,u=r.slice(0,n-2),d=k.size(u),p=t[1].dims[2]/4,m=t[0].dataType,g=fe(e.k),y=fe(p),b=fe(a),_=u.concat([o,a]),S=o>1&&a/b%2===0?2:1,x=k.size(_)/b/S,$=64,T=[],I=[d,o,i/g],A=k.convertShape(t[1].dims).slice();A.splice(-1,1,p/y),T.push(...W(I)),T.push(...W(A)),T.push(...W(t[2].dims)),t.length===4&&T.push(...W(k.convertShape(t[3].dims)));let E=[d,o,a/b];T.push(...W(E));let O=w=>{let U=I.length,N=D("a",t[0].dataType,U,g),F=D("b",12,A.length,y),q=D("scales",t[2].dataType,t[2].dims.length),X=[N,F,q],B=t.length===4?D("zero_points",12,t[3].dims.length):void 0;B&&X.push(B);let L=E.length,Q=R("output",t[0].dataType,L,b),Y=we(t[0].dataType),Z=(()=>{switch(g){case 1:return`array<${Y}, 8>`;case 2:return`mat4x2<${Y}>`;case 4:return`mat2x4<${Y}>`;default:throw new Error(`${g}-component is not supported.`)}})(),ne=Math.floor(32/e.bits),ie=Math.floor(ne/8),ce=()=>{let M="";for(let G=0;G<ie;G++){let be=G*e.bits*4,ke=be+e.bits;M+=`
          // reuse a data (pass ${G})
            var input_offset${G>0?G:""} = ${G===0?N.indicesToOffset(`${N.type.indices}(batch, row, word_offset)`):"input_offset"};
            var a_data${G>0?G:""}: ${Z};
            for (var j${G>0?G:""}: u32 = 0; j${G>0?G:""} < ${8/g}; j${G>0?G:""}++) {
              a_data${G>0?G:""}[j${G>0?G:""}] = ${N.getByOffset(`input_offset${G>0?G:""}`)};
              input_offset${G>0?G:""}++;
            }
          `;for(let $e=0;$e<b*S;$e++)M+=`
            b_value = ${y===1?`b${$e}_data`:`b${$e}_data[i]`};
            ${e.bits===2?`{
              let half_word = b_value >> ${G*16}u;
              let byte_lo = half_word & 0xFFu;
              let byte_hi = (half_word >> 8u) & 0xFFu;
              let spread_word = (byte_lo & 0xFu) | ((byte_lo >> 4u) << 8u) | ((byte_hi & 0xFu) << 16u) | ((byte_hi >> 4u) << 24u);
              b_value_lower = unpack4xU8(spread_word & b_mask);
              b_value_upper = unpack4xU8((spread_word >> 2u) & b_mask);
            }`:`b_value_lower = unpack4xU8((b_value >> ${be}u) & b_mask);
            b_value_upper = unpack4xU8((b_value >> ${ke}u) & b_mask);`}
            b_quantized_values = ${Z}(${Array.from({length:4},(De,ge)=>`${Y}(b_value_lower[${ge}]), ${Y}(b_value_upper[${ge}])`).join(", ")});
            b_dequantized_values = ${g===1?`${Z}(${Array.from({length:8},(De,ge)=>`(b_quantized_values[${ge}] - ${B?`zero_point${$e}`:"zero_point"}) * scale${$e}`).join(", ")});`:`(b_quantized_values - ${Z}(${Array(8).fill(`${B?`zero_point${$e}`:"zero_point"}`).join(",")})) * scale${$e};`};
            workgroup_shared[local_id.x * ${S} + ${Math.floor($e/b)}]${b>1?`[${$e%b}]`:""} += ${Array.from({length:8/g},(De,ge)=>`${g===1?`a_data${G>0?G:""}[${ge}] * b_dequantized_values[${ge}]`:`dot(a_data${G>0?G:""}[${ge}], b_dequantized_values[${ge}])`}`).join(" + ")};
          `}return M},Me=()=>{let M=`
            var col_index = col * ${b};
            ${B?`
            let zero_point_values_per_byte: u32 = ${Math.floor(8/e.bits)}u;
            let zero_point_bytes_per_col = (nBlocksPerCol + zero_point_values_per_byte - 1u) / zero_point_values_per_byte;
            var zero_point_byte_count: u32;
            var zero_point_word_index: u32;
            var zero_point_byte_offset: u32;
            let zero_point_sub_offset: u32 = block % zero_point_values_per_byte;
            var zero_point_bits_offset: u32;
            var zero_point_word: u32;`:`
            // The default zero point is ${Math.pow(2,e.bits-1)} for unsigned ${e.bits}-bit quantization.
            let zero_point = ${Y}(${Math.pow(2,e.bits-1).toFixed(1)});`}
            `;for(let G=0;G<b*S;G++)M+=`
            let scale${G} = ${q.getByOffset("col_index * nBlocksPerCol + block")};
            ${B?`
            zero_point_byte_count = col_index * zero_point_bytes_per_col + (block / zero_point_values_per_byte);
            zero_point_word_index = zero_point_byte_count >> 0x2u;
            zero_point_byte_offset = zero_point_byte_count & 0x3u;
            zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_sub_offset * ${e.bits}u);
            zero_point_word = ${B.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point${G} = ${Y}((zero_point_word) & ${e.bits===2?"0x3u":"0xFu"});`:""}
            col_index += 1;`;return M},ve=()=>{let M=`col_index = col * ${b};`;for(let G=0;G<b*S;G++)M+=`
            let b${G}_data = ${F.getByIndices(`${F.type.indices}(col_index, block, word)`)};
            col_index += 1;`;return M+=`
            var b_value: u32;
            let b_mask: u32 = ${e.bits===2?"0x03030303u":"0x0F0F0F0Fu"};
            var b_value_lower: vec4<u32>;
            var b_value_upper: vec4<u32>;
            var b_quantized_values: ${Z};
            var b_dequantized_values: ${Z};`,M};return`
        var<workgroup> workgroup_shared: array<${Q.type.value}, ${S*$}>;
        ${w.declareVariables(...X,Q)}
        ${w.mainStart([$,1,1])}
          let output_indices = ${Q.offsetToIndices(`(global_idx / ${$}) * ${S}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let nBlocksPerCol = uniforms.b_shape[1];

          for (var block = local_id.x; block < nBlocksPerCol; block += ${$}) {
            //process one block
            var word_offset: u32 = block * ${e.blockSize/g};
            ${Me()}
            for (var word: u32 = 0; word < ${p}; word += ${y}) {
              ${ve()}
              for (var i: u32 = 0; i < ${y}; i++) {
                ${ce()}
                word_offset += ${ne/g};
              }
            }
          }
          workgroupBarrier();

          if (local_id.x < ${S}) {
            var output_value: ${Q.type.value} = ${Q.type.value}(0);
            var workgroup_shared_offset: u32 = local_id.x;
            for (var b: u32 = 0u; b < ${$}u; b++) {
              output_value += workgroup_shared[workgroup_shared_offset];
              workgroup_shared_offset += ${S};
            }
            ${Q.setByIndices(`${Q.type.indices}(batch, row, col + local_id.x)`,"output_value")};
          }
        }`};return{name:"MatMulNBits",shaderCache:{hint:`${e.blockSize};${e.bits};${g};${y};${b};${S};${$}`,inputDependencies:Array(t.length).fill("rank")},getRunData:()=>({outputs:[{dims:_,dataType:m}],dispatchGroup:{x},programUniforms:T}),getShaderSource:O}},hb=(t,e)=>{let r=t[0].dims,n=r.length,o=r[n-2],i=e.k,a=e.n,u=r.slice(0,n-2),d=k.size(u),p=t[1].dims[2]/4,m=t[0].dataType,g=fe(e.k),y=fe(p),b=u.concat([o,a]),_=128,S=a%8===0?8:a%4===0?4:1,x=_/S,$=Math.floor(32/e.bits),T=x*y*$,I=T/g,A=T/e.blockSize,E=k.size(b)/S,O=[],w=[d,o,i/g],U=k.convertShape(t[1].dims).slice();U.splice(-1,1,p/y),O.push(...W(w)),O.push(...W(U)),O.push(...W(t[2].dims)),t.length===4&&O.push(...W(k.convertShape(t[3].dims)));let N=[d,o,a];O.push(...W(N));let F=q=>{let X=w.length,B=D("a",t[0].dataType,X,g),L=D("b",12,U.length,y),Q=D("scales",t[2].dataType,t[2].dims.length),Y=[B,L,Q],Z=t.length===4?D("zero_points",12,t[3].dims.length):void 0;Z&&Y.push(Z);let ne=N.length,ie=R("output",t[0].dataType,ne),ce=we(t[0].dataType),Me=()=>{switch(g){case 1:return`
          let a_data0 = vec4<${ce}>(sub_a[word_offset], sub_a[word_offset + 1], sub_a[word_offset + 2], sub_a[word_offset + 3]);
          let a_data1 = vec4<${ce}>(sub_a[word_offset + 4], sub_a[word_offset + 5], sub_a[word_offset + 6], sub_a[word_offset + 7]);`;case 2:return`
          let a_data0 = vec4<${ce}>(sub_a[word_offset], sub_a[word_offset + 1]);
          let a_data1 = vec4<${ce}>(sub_a[word_offset + 2], sub_a[word_offset + 3]);`;case 4:return`
          let a_data0 = sub_a[word_offset];
          let a_data1 = sub_a[word_offset + 1];`;default:throw new Error(`${g}-component is not supported.`)}};return`
        var<workgroup> sub_a: array<${B.type.value}, ${I}>;
        var<workgroup> inter_results: array<array<${ie.type.value}, ${x}>, ${S}>;
        ${q.declareVariables(...Y,ie)}
        ${q.mainStart([x,S,1])}
          let output_indices = ${ie.offsetToIndices(`workgroup_index * ${S}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let n_blocks_per_col = uniforms.b_shape[1];
          let num_tiles =  (n_blocks_per_col - 1) / ${A} + 1;

          // Loop over shared dimension.
          for (var tile: u32 = 0; tile < num_tiles; tile += 1) {
            let a_col_start = tile * ${I};
            // load one tile A data into shared memory.
            for (var a_offset = local_idx; a_offset < ${I}; a_offset += ${_})
            {
              let a_col = a_col_start + a_offset;
              if (a_col < uniforms.a_shape[2])
              {
                sub_a[a_offset] = ${B.getByIndices(`${B.type.indices}(batch, row, a_col)`)};
              } else {
                sub_a[a_offset] = ${B.type.value}(0);
              }
            }
            workgroupBarrier();

            // each thread process one block
            let b_row = col + local_id.y;
            let block = tile * ${A} + local_id.x;
            ${Z?`
            let zero_point_values_per_byte: u32 = ${Math.floor(8/e.bits)}u;
            let zero_point_bytes_per_col = (n_blocks_per_col + zero_point_values_per_byte - 1u) / zero_point_values_per_byte;
            let zero_point_byte_count = b_row * zero_point_bytes_per_col + (block / zero_point_values_per_byte);
            let zero_point_word_index = zero_point_byte_count >> 0x2u;
            let zero_point_byte_offset = zero_point_byte_count & 0x3u;
            let zero_point_sub_offset: u32 = block % zero_point_values_per_byte;
            let zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_sub_offset * ${e.bits}u);
            let zero_point_word = ${Z.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point = ${ce}((zero_point_word) & ${e.bits===2?"0x3u":"0xFu"});`:`
            // The default zero point is ${Math.pow(2,e.bits-1)} for unsigned ${e.bits}-bit quantization.
            let zero_point = ${ce}(${Math.pow(2,e.bits-1).toFixed(1)});`}
            let scale = ${Q.getByOffset("b_row * n_blocks_per_col + block")};
            let b_data = ${L.getByIndices(`${L.type.indices}(b_row, block, 0)`)};
            var word_offset = local_id.x * ${e.blockSize/g};
            for (var i: u32 = 0; i < ${y}; i++) {
              let b_value = ${y===1?"b_data":"b_data[i]"};
              ${(()=>{let ve=Math.floor($/8),M="";for(let G=0;G<ve;G++){let be=G*e.bits*4,ke=be+e.bits;M+=`
              ${Me()}
              {${e.bits===2?`
                let half_word = b_value >> ${G*16}u;
                let byte_lo = half_word & 0xFFu;
                let byte_hi = (half_word >> 8u) & 0xFFu;
                let spread_word = (byte_lo & 0xFu) | ((byte_lo >> 4u) << 8u) | ((byte_hi & 0xFu) << 16u) | ((byte_hi >> 4u) << 24u);
                let b_value_lower = unpack4xU8(spread_word & 0x03030303u);
                let b_value_upper = unpack4xU8((spread_word >> 2u) & 0x03030303u);`:`
                let b_value_lower = unpack4xU8((b_value >> ${be}u) & 0x0F0F0F0Fu);
                let b_value_upper = unpack4xU8((b_value >> ${ke}u) & 0x0F0F0F0Fu);`}
                let b_quantized_values = mat2x4<${ce}>(${Array.from({length:4},($e,De)=>`${ce}(b_value_lower[${De}]), ${ce}(b_value_upper[${De}])`).join(", ")});
                let b_dequantized_values = (b_quantized_values - mat2x4<${ce}>(${Array(8).fill("zero_point").join(",")})) * scale;
                inter_results[local_id.y][local_id.x] += ${Array.from({length:2},($e,De)=>`${`dot(a_data${De}, b_dequantized_values[${De}])`}`).join(" + ")};
              }
              word_offset += ${8/g};`}return M})()}
            }
            workgroupBarrier();
          }

          if (local_idx < ${S}) {
            var output_value: ${ie.type.value} = ${ie.type.value}(0);
            for (var b = 0u; b < ${x}; b++) {
              output_value += inter_results[local_idx][b];
            }
            if (col + local_idx < uniforms.output_shape[2])
            {
              ${ie.setByIndices(`${ie.type.indices}(batch, row, col + local_idx)`,"output_value")}
            }
          }
        }`};return{name:"BlockwiseMatMulNBits32",shaderCache:{hint:`${e.blockSize};${g};${y};${x};${S}`,inputDependencies:Array(t.length).fill("rank")},getRunData:()=>({outputs:[{dims:b,dataType:m}],dispatchGroup:{x:E},programUniforms:O}),getShaderSource:F}},tc=(t,e)=>{mb(t.inputs,e),e.blockSize===32&&t.adapterInfo.isVendor("intel")&&t.adapterInfo.isArchitecture("gen-12lp")?t.compute(hb(t.inputs,e)):t.compute(fb(t.inputs,e))},rc=t=>J(t)});var gb,bb,yb,_b,wb,vb,$b,xb,oc,ic=V(()=>{"use strict";ee();te();oe();gb=t=>{if(!t||t.length<1)throw new Error("Too few inputs");if(t[0].dataType!==1&&t[0].dataType!==10)throw new Error("Input type must be float or float16.");if(t.length>=2){let e=t[0].dims.length*2===t[1].dims[0];if(t.length===4&&(e=t[3].dims[0]*2===t[1].dims[0]),!e)throw new Error("The pads should be a 1D tensor of shape [2 * input_rank] or [2 * num_axes].")}},bb=(t,e,r)=>{let n="";for(let o=e-1;o>=0;--o)n+=`
            k = i32(${t.indicesGet("indices",o)}) - ${j("uniforms.pads",o,r)};
            if (k < 0) {
              break;
            }
            if (k >= i32(${j("uniforms.x_shape",o,e)})) {
              break;
            }
            offset += k * i32(${j("uniforms.x_strides",o,e)});
        `;return`
          value = ${t.type.value}(uniforms.constant_value);
          for (var i = 0; i < 1; i++) {
            var offset = 0;
            var k = 0;
            ${n}
            value = x[offset];
          }
      `},yb=(t,e,r)=>{let n="";for(let o=e-1;o>=0;--o)n+=`
                k = i32(${t.indicesGet("indices",o)}) - ${j("uniforms.pads",o,r)};
                if (k < 0) {
                  k = -k;
                }
                {
                  let _2n_1 = 2 * (i32(${j("uniforms.x_shape",o,e)}) - 1);
                  k = k % _2n_1;
                  if(k >= i32(${j("uniforms.x_shape",o,e)})) {
                    k = _2n_1 - k;
                  }
                }
                offset += k * i32(${j("uniforms.x_strides",o,e)});
            `;return`
              var offset = 0;
              var k = 0;
              ${n}
              value = x[offset];
          `},_b=(t,e,r)=>{let n="";for(let o=e-1;o>=0;--o)n+=`
                k = i32(${t.indicesGet("indices",o)}) - ${j("uniforms.pads",o,r)};
                if (k < 0) {
                  k = 0;
                }
                if (k >= i32(${j("uniforms.x_shape",o,e)})) {
                  k = i32(${j("uniforms.x_shape",o,e)}) - 1;
                }
                offset += k * i32(${j("uniforms.x_strides",o,e)});
            `;return`
              var offset = 0;
              var k = 0;
              ${n}
              value = x[offset];
          `},wb=(t,e,r)=>{let n="";for(let o=e-1;o>=0;--o)n+=`
                k = i32(${t.indicesGet("indices",o)}) - ${j("uniforms.pads",o,r)};
                if (k < 0)  {
                  k += i32(${j("uniforms.x_shape",o,e)}]);
                }
                if (k >= i32(${j("uniforms.x_shape",o,e)})) {
                  k -= i32(${j("uniforms.x_shape",o,e)});
                }
                offset += k * i32(${j("uniforms.x_strides",o,e)});
            `;return`
              var offset = 0;
              var k = 0;
              ${n}
              value = x[offset];
          `},vb=(t,e,r)=>{switch(r.mode){case 0:return bb(t,e,r.pads.length);case 1:return yb(t,e,r.pads.length);case 2:return _b(t,e,r.pads.length);case 3:return wb(t,e,r.pads.length);default:throw new Error("Invalid mode")}},$b=(t,e)=>{let r=k.padShape(t[0].dims.slice(),e.pads),n=t[0].dims,o=k.size(r),i=[{type:12,data:o},{type:6,data:e.pads}],a=t.length>=3&&t[2].data;e.mode===0&&i.push({type:a?t[2].dataType:1,data:e.value}),i.push(...W(t[0].dims,r));let u=["rank"],d=c=>{let p=R("output",t[0].dataType,r.length),m=D("x",t[0].dataType,n.length),g=m.type.value,y=vb(p,n.length,e),b=[{name:"output_size",type:"u32"},{name:"pads",type:"i32",length:e.pads.length}];return e.mode===0&&b.push({name:"constant_value",type:a?g:"f32"}),`
            ${c.registerUniforms(b).declareVariables(m,p)}
            ${c.mainStart()}
            ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

            let indices = ${p.offsetToIndices("global_idx")};

            var value = ${g}(0);
            ${y}
            output[global_idx] = value;
        }`};return{name:"Pad",shaderCache:{hint:`${e.mode}${a}`,inputDependencies:u},getRunData:()=>({outputs:[{dims:r,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(k.size(r)/64)},programUniforms:i}),getShaderSource:d}},xb=(t,e)=>{if(t.length>1){let r=t[1].getBigInt64Array(),n=t.length>=3&&t[2].data?t[2].dataType===10?t[2].getUint16Array()[0]:t[2].getFloat32Array()[0]:0,o=t[0].dims.length,i=new Int32Array(2*o).fill(0);if(t.length>=4){let u=t[3].getBigInt64Array();for(let d=0;d<u.length;d++)i[Number(u[d])]=Number(r[d]),i[Number(u[d])+o]=Number(r[d+u.length])}else r.forEach((u,d)=>i[Number(d)]=Number(u));let a=[];return i.forEach(u=>a.push(u)),{mode:e.mode,value:n,pads:a}}else return e},oc=(t,e)=>{gb(t.inputs);let r=xb(t.inputs,e);t.compute($b(t.inputs,r),{inputs:[0]})}});var fn,ac,sc,uc,dc,Sb,Tb,lc,cc,pc,mc,fc,hc,gc,bc,yc,_c,wc,vc,$c=V(()=>{"use strict";Le();ee();te();oe();fn=t=>{if(_e.webgpu.validateInputContent&&(!t||t.length!==1))throw new Error("Pool ops requires 1 input.")},ac=(t,e,r)=>{let n=e.format==="NHWC",o=t.dims.slice();n&&o.splice(1,0,o.pop());let i=Object.hasOwnProperty.call(e,"dilations"),a=e.kernelShape.slice(),u=e.strides.slice(),d=i?e.dilations.slice():[],c=e.pads.slice();Bt.adjustPoolAttributes(r,o,a,u,d,c);let p=Bt.computePoolOutputShape(r,o,u,d,a,c,e.autoPad,e.ceilMode),m=Object.assign({},e);i?Object.assign(m,{kernelShape:a,strides:u,pads:c,dilations:d,cacheKey:e.cacheKey}):Object.assign(m,{kernelShape:a,strides:u,pads:c,cacheKey:e.cacheKey});let g=p.slice();return g.push(g.splice(1,1)[0]),[m,n?g:p]},sc=(t,e)=>{let r=e.format==="NHWC",n=k.size(t),o=k.size(e.kernelShape),i=[{type:12,data:n},{type:12,data:o}],a=[{name:"outputSize",type:"u32"},{name:"kernelSize",type:"u32"}];if(e.kernelShape.length<=2){let u=e.kernelShape[e.kernelShape.length-1],d=e.strides[e.strides.length-1],c=e.pads[e.pads.length/2-1],p=e.pads[e.pads.length-1],m=!!(c+p);i.push({type:12,data:u},{type:12,data:d},{type:12,data:c},{type:12,data:p}),a.push({name:"kw",type:"u32"},{name:"sw",type:"u32"},{name:"pwStart",type:"u32"},{name:"pwEnd",type:"u32"});let g=!1;if(e.kernelShape.length===2){let y=e.kernelShape[e.kernelShape.length-2],b=e.strides[e.strides.length-2],_=e.pads[e.pads.length/2-2],S=e.pads[e.pads.length-2];g=!!(_+S),i.push({type:12,data:y},{type:12,data:b},{type:12,data:_},{type:12,data:S}),a.push({name:"kh",type:"u32"},{name:"sh",type:"u32"},{name:"phStart",type:"u32"},{name:"phEnd",type:"u32"})}return[i,a,!0,m,g]}else{if(r)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let u=k.computeStrides(e.kernelShape);i.push({type:12,data:u},{type:12,data:e.pads},{type:12,data:e.strides}),a.push({name:"kernelStrides",type:"u32",length:u.length},{name:"pads",type:"u32",length:e.pads.length},{name:"strides",type:"u32",length:e.strides.length});let d=e.pads.reduce((c,p)=>c+p);return[i,a,!!d,!1,!1]}},uc=(t,e,r,n,o,i,a,u,d,c,p,m)=>{let g=o.format==="NHWC",y=e.type.value,b=R("output",e.type.tensor,n);if(o.kernelShape.length<=2){let _="",S="",x="",$=r-(g?2:1);if(p?_=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${$}] = indices[${$}] * uniforms.sw - uniforms.pwStart + i;
                  if (xIndices[${$}] < 0 || xIndices[${$}]
                      >= uniforms.x_shape[${$}]) {
                    pad++;
                    continue;
                  }
                  let x_val = x[${e.indicesToOffset("xIndices")}];
                  ${i}
                }`:_=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${$}] = indices[${$}] * uniforms.sw - uniforms.pwStart + i;
                  let x_val = x[${e.indicesToOffset("xIndices")}];
                  ${i}
                }`,o.kernelShape.length===2){let I=r-(g?3:2);m?S=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${I}] = indices[${I}] * uniforms.sh - uniforms.phStart + j;
                  if (xIndices[${I}] < 0 || xIndices[${I}] >= uniforms.x_shape[${I}]) {
                    pad += i32(uniforms.kw);
                    continue;
                  }
              `:S=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${I}] = indices[${I}] * uniforms.sh - uniforms.phStart + j;
                `,x=`
              }
            `}return`
            ${t.registerUniforms(d).declareVariables(e,b)}

            ${t.mainStart()}
              ${t.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

              let indices = ${b.offsetToIndices("global_idx")};
              var xIndices = ${b.offsetToIndices("global_idx")};

              var value = ${y}(${u});
              var pad = 0;
              ${S}
              ${_}
              ${x}
              ${a}

              output[global_idx] = value;
            }`}else{if(g)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let _=o.kernelShape.length,S=o.pads.length,x="";return c?x=`
                if (xIndices[j] >= uniforms.x_shape[j]) {
                  pad++;
                  isPad = true;
                  break;
                }
              }
              if (!isPad) {
                let x_val = x[${e.indicesToOffset("xIndices")}];
                ${i}
              }`:x=`
              }
              let x_val = x[${e.indicesToOffset("xIndices")}];
              ${i}
            `,`
            ${t.registerUniforms(d).declareVariables(e,b)}

            ${t.mainStart()}
              ${t.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
              let indices = ${b.offsetToIndices("global_idx")};
              var xIndices = ${b.offsetToIndices("global_idx")};

              var offsets: array<u32, ${_}>;

              var value = ${y}(${u});
              var pad = 0;
              var isPad = false;

              for (var i: u32 = 0u; i < uniforms.kernelSize; i++) {
                var offset = i;
                for (var j = 0u; j < ${_-1}u; j++) {
                  offsets[j] = offset / ${j("uniforms.kernelStrides","j",_)};
                  offset -= offsets[j] * ${j("uniforms.kernelStrides","j",_)};
                }
                offsets[${_-1}] = offset;

                isPad = false;
                for (var j = ${r-_}u; j < ${r}u; j++) {
                  xIndices[j] = indices[j] * ${j("uniforms.strides",`j - ${r-_}u`,_)}
                    + offsets[j - ${r-_}u] - ${j("uniforms.pads","j - 2u",S)};
                  ${x}
              }
              ${a}

              output[global_idx] = value;
            }`}},dc=t=>`${t.format};${t.ceilMode};${t.autoPad};${t.kernelShape.length}`,Sb=t=>`${dc(t)};${t.countIncludePad}`,Tb=t=>`${dc(t)};${t.storageOrder};${t.dilations}`,lc=t=>({format:t.format,autoPad:["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][t.auto_pad],ceilMode:t.ceil_mode,kernelShape:t.kernel_shape,strides:t.strides,pads:t.pads}),cc=(t,e,r,n)=>{let[o,i]=ac(e,n,r),a=D("x",e.dataType,e.dims.length),u=a.type.value,d="value += x_val;",c="";o.countIncludePad?c+=`value /= ${u}(uniforms.kernelSize);`:c+=`value /= ${u}(i32(uniforms.kernelSize) - pad);`;let[p,m,g,y,b]=sc(i,o);p.push(...W(e.dims,i));let _=["rank"];return{name:t,shaderCache:{hint:`${n.cacheKey};${g};${y};${b}`,inputDependencies:_},getRunData:()=>({outputs:[{dims:i,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(k.size(i)/64)},programUniforms:p}),getShaderSource:S=>uc(S,a,e.dims.length,i.length,o,d,c,0,m,g,y,b)}},pc=t=>{let e=t.count_include_pad!==0,r=lc(t);if(r.ceilMode!==0)throw new Error("ceil_mode output-shape is computed, but ceil_mode kernel execution (padding/divisor) is not yet implemented in the WebGPU AveragePool kernel");let n={countIncludePad:e,...r,cacheKey:""};return{...n,cacheKey:Sb(n)}},mc=(t,e)=>{fn(t.inputs),t.compute(cc("AveragePool",t.inputs[0],!1,e))},fc={autoPad:"",ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[]},hc=t=>{let e=t.format;return{format:e,...fc,cacheKey:e}},gc=(t,e)=>{fn(t.inputs),t.compute(cc("GlobalAveragePool",t.inputs[0],!0,e))},bc=(t,e,r,n)=>{let[o,i]=ac(e,n,r),a=`
      value = max(x_val, value);
    `,u="",d=D("x",e.dataType,e.dims.length),c=["rank"],[p,m,g,y,b]=sc(i,o);return p.push(...W(e.dims,i)),{name:t,shaderCache:{hint:`${n.cacheKey};${g};${y};${b}`,inputDependencies:c},getRunData:()=>({outputs:[{dims:i,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(k.size(i)/64)},programUniforms:p}),getShaderSource:_=>uc(_,d,e.dims.length,i.length,o,a,u,e.dataType===10?-65504:-1e5,m,g,y,b)}},yc=(t,e)=>{fn(t.inputs),t.compute(bc("MaxPool",t.inputs[0],!1,e))},_c=t=>{let e=t.storage_order,r=t.dilations,n=lc(t);if(e!==0)throw new Error("column major storage order is not yet supported for MaxPool");if(n.ceilMode!==0)throw new Error("ceil_mode output-shape is computed, but ceil_mode kernel execution (padding) is not yet implemented in the WebGPU MaxPool kernel");let o={storageOrder:e,dilations:r,...n,cacheKey:""};return{...o,cacheKey:Tb(o)}},wc=t=>{let e=t.format;return{format:e,...fc,cacheKey:e}},vc=(t,e)=>{fn(t.inputs),t.compute(bc("GlobalMaxPool",t.inputs[0],!0,e))}});var Cb,Ab,xc,Sc,Tc=V(()=>{"use strict";ee();te();Ce();oe();Cb=(t,e)=>{if(t.length<2||t.length>3)throw new Error("DequantizeLinear requires 2 or 3 inputs.");if(t.length===3&&t[1].dims===t[2].dims)throw new Error("x-scale and x-zero-point must have the same shape.");if(t.length===3&&t[0].dataType!==t[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(t[1].dims.length!==0&&t[1].dims.length!==1&&t[1].dims.length!==t[0].dims.length)throw new Error("scale input must be a scalar, a 1D tensor, or have the same rank as the input tensor.");if(t.length>2){if(t[0].dataType!==t[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(t[1].dims.length!==t[2].dims.length)throw new Error("scale and zero-point inputs must have the same rank.");if(!t[1].dims.map((r,n)=>r===t[2].dims[n]).reduce((r,n)=>r&&n,!0))throw new Error("scale and zero-point inputs must have the same shape.")}if(e.blockSize>0){if(t[1].dims.length===0||t[1].dims.length===1&&t[1].dims[0]===1)throw new Error("blockSize must be set only for block quantization.");if(!t[1].dims.map((o,i)=>i===e.axis||o===t[0].dims[i]).reduce((o,i)=>o&&i,!0))throw new Error("For block qunatization, scale input shape to match the input shape except for the axis");if(t[1].dims.length!==t[0].dims.length)throw new Error("For block qunatization the scale input rank must be the same as the x rank.");let r=t[0].dims[e.axis],n=t[1].dims[e.axis];if(e.blockSize<Math.ceil(r/n)||e.blockSize>Math.ceil(r/(n-1)-1))throw new Error("blockSize must be with in the range [ceil(dI / Si), ceil(dI / (Si - 1) - 1)].")}},Ab=(t,e)=>{let r=k.normalizeAxis(e.axis,t[0].dims.length),n=t[0].dataType,o=n===3,i=t[0].dims,a=t[1].dataType,u=k.size(i),d=n===3||n===2,c=d?[Math.ceil(k.size(t[0].dims)/4)]:t[0].dims,p=t[1].dims,m=t.length>2?t[2]:void 0,g=m?d?[Math.ceil(k.size(m.dims)/4)]:m.dims:void 0,y=p.length===0||p.length===1&&p[0]===1,b=y===!1&&p.length===1,_=fe(u),S=y&&(!d||_===4),x=S?_:1,$=S&&!d?_:1,T=D("input",d?12:n,c.length,$),I=D("scale",a,p.length),A=m?D("zero_point",d?12:n,g.length):void 0,E=R("output",a,i.length,x),O=[T,I];A&&O.push(A);let w=[c,p];m&&w.push(g);let U=[{type:12,data:u/x},{type:12,data:r},{type:12,data:e.blockSize},...W(...w,i)],N=F=>{let q=[{name:"output_size",type:"u32"},{name:"axis",type:"u32"},{name:"block_size",type:"u32"}];return`
      ${F.registerUniforms(q).declareVariables(...O,E)}
      ${F.mainStart()}
          ${F.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let output_indices = ${E.offsetToIndices("global_idx")};

          // Set input x
          ${d?`
            let input = ${T.getByOffset("global_idx / 4")};
            let x_vec = ${o?"unpack4xI8(input)":"unpack4xU8(input)"};
            let x_value = ${x===1?"x_vec[global_idx % 4]":"x_vec"};`:`let x_value = ${T.getByOffset("global_idx")};`};

          // Set scale input
          ${y?`let scale_value= ${I.getByOffset("0")}`:b?`
            let scale_index = ${E.indicesGet("output_indices","uniforms.axis")};
            let scale_value= ${I.getByOffset("scale_index")};`:`
            var scale_indices: ${I.type.indices} = output_indices;
            let index = ${I.indicesGet("scale_indices","uniforms.axis")} / uniforms.block_size;
            ${I.indicesSet("scale_indices","uniforms.axis","index")};
            let scale_value= ${I.getByIndices("scale_indices")};`};

          // Set zero-point input
          ${A?y?d?`
                let zero_point_input = ${A.getByOffset("0")};
                let zero_point_vec =  ${o?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value= zero_point_vec[0]`:`let zero_point_value = ${A.getByOffset("0")}`:b?d?`
                let zero_point_index = ${E.indicesGet("output_indices","uniforms.axis")};
                let zero_point_input = ${A.getByOffset("zero_point_index / 4")};
                let zero_point_vec =  ${o?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_index % 4]`:`
                let zero_point_index = ${E.indicesGet("output_indices","uniforms.axis")};
                let zero_point_value = ${A.getByOffset("zero_point_index")};`:d?`
                let zero_point_offset = ${I.indicesToOffset("scale_indices")};
                let zero_point_input = ${A.getByOffset("zero_point_offset / 4")};
                let zero_point_vec = ${o?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_offset % 4];`:`let zero_point_value = ${A.getByIndices("scale_indices")};`:`let zero_point_value = ${d?o?"i32":"u32":T.type.value}(0);`};
      // Compute and write output
      ${E.setByOffset("global_idx",`${E.type.value}(x_value - zero_point_value) * scale_value`)};
      }`};return{name:"DequantizeLinear",shaderCache:{hint:e.cacheKey,inputDependencies:A?["rank","rank","rank"]:["rank","rank"]},getShaderSource:N,getRunData:()=>({outputs:[{dims:i,dataType:a}],dispatchGroup:{x:Math.ceil(u/x/64),y:1,z:1},programUniforms:U})}},xc=(t,e)=>{Cb(t.inputs,e),t.compute(Ab(t.inputs,e))},Sc=t=>J({axis:t.axis,blockSize:t.blockSize})});var Eb,kb,Ic,Cc=V(()=>{"use strict";Le();ee();oe();Eb=(t,e,r)=>{let n=t===e,o=t<e&&r<0,i=t>e&&r>0;if(n||o||i)throw new Error("Range these inputs' contents are invalid.")},kb=(t,e,r,n)=>{let o=Math.abs(Math.ceil((e-t)/r)),i=[o],a=o,u=[{type:12,data:a},{type:n,data:t},{type:n,data:r},...W(i)],d=c=>{let p=R("output",n,i.length),m=p.type.value,g=[{name:"outputSize",type:"u32"},{name:"start",type:m},{name:"delta",type:m}];return`
        ${c.registerUniforms(g).declareVariables(p)}
        ${c.mainStart()}
        ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        output[global_idx] = uniforms.start + ${m}(global_idx) * uniforms.delta;
      }`};return{name:"Range",shaderCache:{hint:`${n}`},getShaderSource:d,getRunData:()=>({outputs:[{dims:i,dataType:n}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:u})}},Ic=t=>{let e=0,r=0,n=0;t.inputs[0].dataType===6?(e=t.inputs[0].getInt32Array()[0],r=t.inputs[1].getInt32Array()[0],n=t.inputs[2].getInt32Array()[0]):t.inputs[0].dataType===1&&(e=t.inputs[0].getFloat32Array()[0],r=t.inputs[1].getFloat32Array()[0],n=t.inputs[2].getFloat32Array()[0]),_e.webgpu.validateInputContent&&Eb(e,r,n),t.compute(kb(e,r,n,t.inputs[0].dataType),{inputs:[]})}});var Pb,Db,Ac,Ec,kc=V(()=>{"use strict";ee();te();Ce();oe();Pb=(t,e,r,n)=>{if(t!=="none"&&n!=="i32"&&n!=="u32"&&n!=="f32")throw new Error(`Input ${n} is not supported with reduction ${t}.`);let o=`{
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
              }`;switch(t){case"none":return`${e}=${r};`;case"add":return n==="i32"||n==="u32"?`atomicAdd(&${e}, bitcast<${n}>(${r}));`:`
              ${o}bitcast<${n}>(oldValue) + (${r})${i}`;case"max":return n==="i32"||n==="u32"?`atomicMax(&${e}, bitcast<${n}>(${r}));`:`
                ${o}max(bitcast<f32>(oldValue), (${r}))${i}`;case"min":return n==="i32"||n==="u32"?`atomicMin(&${e}, bitcast<${n}>(${r}));`:`${o}min(bitcast<${n}>(oldValue), (${r}))${i}`;case"mul":return`${o}(bitcast<${n}>(oldValue) * (${r}))${i}`;default:throw new Error(`Reduction ${t} is not supported.`)}},Db=(t,e)=>{let r=t[0].dims,n=t[1].dims,o=r,i=1,a=Math.ceil(k.sizeToDimension(n,n.length-1)/i),u=n[n.length-1],d=k.sizeFromDimension(r,u),c=[{type:12,data:a},{type:12,data:u},{type:12,data:d},...W(t[1].dims,t[2].dims,o)],p=m=>{let g=D("indices",t[1].dataType,t[1].dims.length),y=D("updates",t[2].dataType,t[2].dims.length,i),b=e.reduction!=="none"&&e.reduction!==""?Ks("output",t[0].dataType,o.length):R("output",t[0].dataType,o.length,i);return`
      ${m.registerUniform("output_size","u32").registerUniform("last_index_dimension","u32").registerUniform("num_updates_elements","u32").declareVariables(g,y,b)}
      ${m.mainStart()}
        ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
  var data_offset = 0u;
  let indices_start = uniforms.last_index_dimension * global_idx;
  let indices_end = indices_start + uniforms.last_index_dimension;
  for (var i = indices_start; i < indices_end; i++) {
    var index = i32(indices[i].x);
    ${t[0].dims.length===1?`
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
    ${Pb(e.reduction,"output[data_offset + i]","value",b.type.value)}
  }

      }`};return{name:"ScatterND",shaderCache:{hint:`${e.cacheKey}_${e.reduction}`,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:o,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:c}),getShaderSource:p}},Ac=t=>J({reduction:t.reduction}),Ec=(t,e)=>{t.compute(Db(t.inputs,e),{inputs:[t.inputs[1],t.inputs[2]],outputs:[]})}});var Ob,Bb,zb,Pc,Mb,Rb,Ub,Nb,Vb,Lb,Wb,Gb,Dc,Hb,Fb,qb,Kb,jb,Oc,Bc,zc=V(()=>{"use strict";ee();te();Ce();oe();Ob=(t,e)=>{if(t.every(r=>r>0||(()=>{throw new Error("Resize requires scales input values to be positive")})),t.length>0){if(e.mode==="linear"){if(!(t.length===2||t.length===3||t.length===4&&t[0]===1&&t[1]===1||t.length===4&&t[0]===1&&t[3]===1||t.length===5&&t[0]===1&&t[1]===1))throw new Error(`For linear mode, Resize requires scales to be 2D, 3D, 4D with either two outermost or one innermost and
            one outermost scale values equal to 1, or 5D with two outermost scale values equal to 1`)}else if(e.mode==="cubic"&&!(t.length===2||t.length===4&&t[0]===1&&t[1]===1||t.length===4&&t[0]===1&&t[3]===1))throw new Error("Resize requires scales input size to be 2 or 4 for cubic mode")}},Bb=(t,e,r)=>{e.every(o=>o>=0&&o<r||(()=>{throw new Error("Resize requires axes input values to be positive and less than rank")}));let n=new Array(r).fill(1);return e.forEach((o,i)=>n[o]=t[i]),n},zb=(t,e,r,n,o,i)=>{let[a,u,d]=r>10?[1,2,3]:[-1,t.length>1?1:-1,-1],c=t[0].dims.length;if(a>0&&t.length>a&&t[a].dims.length>0)t[a].getFloat32Array().forEach(p=>i.push(p));else if(e.coordinateTransformMode==="tf_crop_and_resize")throw new Error("Resize requires RoI input to be specified when coordinateTransformMode is tfCropAndResize");if(u>0&&t.length>u&&t[u].dims.length===1&&t[u].dims[0]>0){if(t[u].getFloat32Array().forEach(p=>n.push(p)),n.length!==0&&n.length!==c&&r>=18&&n.length!==e.axes.length)throw new Error("Resize requires scales input size to be same as input rank or axes size for opset 18 and up");Ob(n,e),e.axes.length>0&&Bb(n,e.axes,c).forEach((p,m)=>n[m]=p)}if(d>0&&t.length>d&&t[d].dims.length===1&&t[d].dims[0]>0&&(t[d].getBigInt64Array().forEach(p=>o.push(Number(p))),o.length!==0&&o.length!==c&&r>=18&&o.length!==e.axes.length))throw new Error("Resize requires sizes input size to be same as input rank or axes size for opset 18 and up");if(e.axes.length>0){if(n.length!==0&&n.length!==e.axes.length)throw new Error('Resize requires "scales" input size to be of axes rank when axes attributes is specified');if(o.length!==0&&o.length!==e.axes.length)throw new Error('Resize requires "sizes" input size to be of rank axes rank when axes attributes is specified')}if(typeof n<"u"&&typeof o<"u"&&n.length>0&&o.length>c)throw new Error("Resize requires only of scales or sizes to be specified")},Pc=(t,e,r,n)=>`
  // The whole part and the fractional part are calculated separately due to inaccuracy of floating
  // point division. As an example, f32(21) / f32(7) may evaluate to 2.99... instead of 3, causing an
  // offset-by-one error later in floor().
  let big = (${t}) * (${e});
  let whole = ${n}(big / (${r}));
  let fract = ${n}(big % (${r})) / ${n}(${r});
  return whole + fract;
`,Mb=(t,e)=>`fn getOriginalCoordinateFromResizedCoordinate(xResized: u32, xScale: f32, lengthResized: u32,
     lengthOriginal: u32, roiStart: f32, roiEnd: f32) -> ${e} { `+(()=>{switch(t){case"asymmetric":return`
          if (xScale < 1.0 || floor(xScale) != xScale) {
            return ${e}(xResized) / ${e}(xScale);
          } else {
            ${Pc("xResized","lengthOriginal","lengthResized",e)}
          }
        `;case"pytorch_half_pixel":return`if (lengthResized > 1) {
                    return (${e}(xResized) + 0.5) / ${e}(xScale) - 0.5;
                  } else {
                    return 0.0;
                  }`;case"tf_half_pixel_for_nn":return`return (${e}(xResized) + 0.5) / ${e}(xScale);`;case"align_corners":return`if (lengthResized == 1) {
                    return 0.0;
                  } else {
                    ${Pc("xResized","lengthOriginal - 1","lengthResized - 1",e)}
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
                  return offset + ((${e}(xResized) + 0.5) / ${e}(xScale)) - 0.5;`;case"half_pixel":return`return ((${e}(xResized) + 0.5) / ${e}(xScale)) - 0.5;`;default:throw new Error(`Coordinate transform mode ${t} is not supported`)}})()+"}",Rb=(t,e,r)=>`fn getNearestPixelFromOriginal(xOriginal: ${r}, isDownSample: bool) -> ${r} {`+(()=>{switch(t){case"round_prefer_ceil":return"if (fract(xOriginal) == 0.5) {             return ceil(xOriginal);           } else {             return round(xOriginal);           }";case"floor":return"return floor(xOriginal);";case"ceil":return"return ceil(xOriginal);";case"round_prefer_floor":return"if (fract(xOriginal) == 0.5) {                     return floor(xOriginal);                   } else {                     return round(xOriginal);                   }";default:if(e<11)return"if (isDownSample)                     {                       return ceil(xOriginal);                     } else {                       return xOriginal;                     }";throw new Error(`Nearest mode ${t} is not supported`)}})()+"}",Ub=(t,e,r)=>{let n=new Array(r).fill(0).concat(new Array(r).fill(1)),o=t.length===0?n:t.slice();return e.length>0?(e.forEach((i,a)=>{n[i]=o[a],n[a+r]=o[e.length+a]}),n):o},Nb=(t,e,r,n)=>{let o=[];if(r.length>0)if(n.length>0){if(t.forEach(i=>o.push(i)),Math.max(...n)>t.length)throw new Error("axes is out of bound");n.forEach((i,a)=>o[i]=r[a])}else r.forEach(i=>o.push(i));else{if(e.length===0)throw new Error("Resize requires either scales or sizes.");o=t.map((i,a)=>Math.round(i*e[a]))}return o},Vb=(t,e,r)=>{let n=(()=>{switch(r.keepAspectRatioPolicy){case"not_larger":return r.axes.length>0?Math.min(...r.axes.map(i=>e[i]),Number.MAX_VALUE):Math.min(...e,Number.MAX_VALUE);case"not_smaller":return r.axes.length>0?Math.max(...r.axes.map(i=>e[i]),Number.MIN_VALUE):Math.max(...e,Number.MIN_VALUE);default:throw new Error(`Keep aspect ratio policy ${r.keepAspectRatioPolicy} is not supported`)}})();e.fill(1,0,e.length);let o=t.slice();return r.axes.length>0?(r.axes.forEach(i=>e[i]=n),r.axes.forEach(i=>o[i]=Math.round(t[i]*e[i]))):(e.fill(n,0,e.length),o.forEach((i,a)=>o[a]=Math.round(i*e[a]))),o},Lb=(t,e,r,n,o)=>`
    fn calculateOriginalIndicesFromOutputIndices(output_indices: ${t.type.indices}) -> array<${t.type.value}, ${r.length}> {
      var original_indices: array<${t.type.value}, ${r.length}>;
      for (var i:u32 = 0; i < ${r.length}; i++) {
        var output_index = ${t.indicesGet("output_indices","i")};
        var scale = ${j("uniforms.scales","i",n)};
        var roi_low = ${j("uniforms.roi","i",o)};
        var roi_hi = ${j("uniforms.roi",`i + ${e.length}`,o)};
        if (scale == 1.0) {
          original_indices[i] = ${t.type.value}(output_index);
        } else {
          var input_shape_i = ${j("uniforms.input_shape","i",e.length)};
          var output_shape_i = ${j("uniforms.output_shape","i",r.length)};
          original_indices[i] = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                           input_shape_i, roi_low, roi_hi);
        }
      }
      return original_indices;
    }`,Wb=(t,e,r,n,o,i,a)=>`
    fn calculateInputIndicesFromOutputIndices(output_indices: ${e.type.indices}) -> ${t.type.indices} {
      var input_indices: ${t.type.indices};
      for (var i:u32 = 0; i < ${n.length}; i++) {
        var output_index = ${e.indicesGet("output_indices","i")};
        var input_index: u32;
        var scale = ${j("uniforms.scales","i",o)};
        if (scale == 1.0) {
          input_index = output_index;
        } else {
          var roi_low = ${j("uniforms.roi","i",i)};
          var roi_hi = ${j("uniforms.roi",`i + ${r.length}`,i)};
          var input_shape_i = ${j("uniforms.input_shape","i",r.length)};
          var output_shape_i = ${j("uniforms.output_shape","i",n.length)};
          var original_idx = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                        input_shape_i, roi_low, roi_hi);
          if (!${a} || (original_idx >= 0 && original_idx < ${e.type.value}(input_shape_i))) {
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
        ${t.indicesSet("input_indices","i","input_index")}
      }
      return input_indices;
    }`,Gb=(t,e)=>`
    fn checkInputIndices(input_indices: ${t.type.indices}) -> bool {
      for (var i:u32 = 0; i < ${e.length}; i++) {
        var input_index = ${t.indicesGet("input_indices","i")};
        if (input_index < 0 || input_index >= ${j("uniforms.input_shape","i",e.length)}) {
          return false;
        }
      }
      return true;
    }`,Dc=(t,e,r,n)=>t.rank>n?`
    ${t.indicesSet("input_indices",e,"channel")};
    ${t.indicesSet("input_indices",r,"batch")};
`:"",Hb=(t,e,r,n,o)=>{let[a,u,d,c]=r.length===2?[-1,0,1,-1]:[0,2,3,1],p=t.type.value;return`
    fn getInputValue(batch: u32, channel: u32, row: u32, col: u32) -> ${p} {
      var input_indices: ${t.type.indices};
      ${t.indicesSet("input_indices",u,`max(0, min(row, ${r[u]} - 1))`)};
      ${t.indicesSet("input_indices",d,`max(0, min(col, ${r[d]} - 1))`)};
      ${Dc(t,c,a,2)}
      return ${t.getByIndices("input_indices")};
    }

    fn bilinearInterpolation(output_indices: ${e.type.indices}) -> ${p} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var row:${p} = originalIndices[${u}];
      var col:${p} = originalIndices[${d}];
      ${n?`if (row < 0 || row > (${r[u]} - 1) || col < 0 || col > (${r[d]} - 1)) {
        return ${o};
      }`:""};
      row = max(0, min(row, ${r[u]} - 1));
      col = max(0, min(col, ${r[d]} - 1));
      var row1: u32 = u32(row);
      var col1: u32 = u32(col);
      var row2: u32 = u32(row + 1);
      var col2: u32 = u32(col + 1);
      var channel: u32 = ${r.length>2?`u32(originalIndices[${c}])`:"0"};
      var batch: u32 =  ${r.length>2?`u32(originalIndices[${a}])`:"0"};
      var x11: ${p} = getInputValue(batch, channel, row1, col1);
      var x12: ${p} = getInputValue(batch, channel, row1, col2);
      var x21: ${p} = getInputValue(batch, channel, row2, col1);
      var x22: ${p} = getInputValue(batch, channel, row2, col2);
      var dx1: ${p} = abs(row - ${p}(row1));
      var dx2: ${p} = abs(${p}(row2) - row);
      var dy1: ${p} = abs(col - ${p}(col1));
      var dy2: ${p} = abs(${p}(col2) - col);
      if (row1 == row2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (col1 == col2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      return (x11 * dx2 * dy2 + x12 * dx2 * dy1 + x21 * dx1 * dy2 + x22 * dx1 * dy1);
    }`},Fb=(t,e,r,n,o,i,a,u,d,c)=>{let p=r.length===2,m=!0,[g,y]=p?[0,1]:m?[2,3]:[1,2],b=t.type.value,_=S=>{let x=S===g?"row":"col";return`
      fn ${x}CubicInterpolation(input_indices: ${t.type.indices}, output_indices: ${e.type.indices}) -> ${b} {
        var output_index = ${e.indicesGet("output_indices",S)};
        var originalIdx: ${b} = getOriginalCoordinateFromResizedCoordinate(output_index, ${o[S]},
        ${n[S]}, ${r[S]}, ${i[S]}, ${i[S]} + ${r.length});
        var fractOriginalIdx: ${b} = originalIdx - floor(originalIdx);
        var coefs = getCubicInterpolationCoefs(fractOriginalIdx);

        if (${u} && (originalIdx < 0 || originalIdx > (${r[S]} - 1))) {
          return ${d};
        }
        var data: array<${b}, 4> = array<${b}, 4>(0.0, 0.0, 0.0, 0.0);
        for (var i: i32 = -1; i < 3; i++) {
          var ${x}: ${b} = originalIdx + ${b}(i);
          if (${x} < 0 || ${x} >= ${r[S]}) {
            ${c?`coefs[i + 1] = 0.0;
                        continue;`:u?`return ${d};`:`${x} = max(0, min(${x}, ${r[S]} - 1));`};
          }
        var input_indices_copy: ${t.type.indices} = input_indices;
          ${t.indicesSet("input_indices_copy",S,`u32(${x})`)};
          data[i + 1] = ${S===g?t.getByIndices("input_indices_copy"):"rowCubicInterpolation(input_indices_copy, output_indices)"};
        }
        return cubicInterpolation1D(data, coefs);
      }`};return`
    ${_(g)};
    ${_(y)};
  fn getCubicInterpolationCoefs(s: ${b}) -> array<${b}, 4> {
    var absS = abs(s);
    var coeffs: array<${b}, 4> = array<${b}, 4>(0.0, 0.0, 0.0, 0.0);
    var oneMinusAbsS: ${b} = 1.0 - absS;
    var twoMinusAbsS: ${b} = 2.0 - absS;
    var onePlusAbsS: ${b} = 1.0 + absS;
    coeffs[0] = ((${a} * onePlusAbsS - 5 * ${a}) * onePlusAbsS + 8 * ${a}) * onePlusAbsS - 4 * ${a};
    coeffs[1] = ((${a} + 2) * absS - (${a} + 3)) * absS * absS + 1;
    coeffs[2] = ((${a} + 2) * oneMinusAbsS - (${a} + 3)) * oneMinusAbsS * oneMinusAbsS + 1;
    coeffs[3] = ((${a} * twoMinusAbsS - 5 * ${a}) * twoMinusAbsS + 8 * ${a}) * twoMinusAbsS - 4 * ${a};
    return coeffs;
  }

  fn cubicInterpolation1D(x: array<${b}, 4>, coefs: array<${b}, 4>) -> ${b} {
    var coefsSum: ${b} = coefs[0] + coefs[1] + coefs[2] + coefs[3];
    return (x[0] * coefs[0] + x[1] * coefs[1]+ x[2] * coefs[2]+ x[3] * coefs[3]) / coefsSum;
  }

  fn bicubicInterpolation(output_indices: ${e.type.indices}) -> ${b} {
    var input_indices: ${t.type.indices} = output_indices;
    return colCubicInterpolation(input_indices, output_indices);
  }
    `},qb=(t,e,r,n,o)=>{let[a,u,d,c,p]=r.length===3?[-1,0,1,2,-1]:[0,2,3,4,1],m=t.type.value;return`
    fn getInputValue(batch: u32, channel: u32, depth:u32, height: u32, width: u32) -> ${m} {
      var input_indices: ${t.type.indices};
      ${t.indicesSet("input_indices",u,`max(0, min(depth, ${r[u]} - 1))`)};
      ${t.indicesSet("input_indices",d,`max(0, min(height, ${r[d]} - 1))`)};
      ${t.indicesSet("input_indices",c,`max(0, min(width, ${r[c]} - 1))`)};
      ${Dc(t,p,a,3)}
      return ${t.getByIndices("input_indices")};
    }

    fn trilinearInterpolation(output_indices: ${e.type.indices}) -> ${m} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var depth:${m} = originalIndices[${u}];
      var height:${m} = originalIndices[${d}];
      var width:${m} = originalIndices[${c}];
      ${n?`if (depth < 0 || depth > (${r[u]} - 1) || height < 0 || height > (${r[d]} - 1) || width < 0 || (width > ${r[c]} - 1)) {
      return ${o};
        }`:""};

    depth = max(0, min(depth, ${r[u]} - 1));
      height = max(0, min(height, ${r[d]} - 1));
      width = max(0, min(width, ${r[c]} - 1));
      var depth1: u32 = u32(depth);
      var height1: u32 = u32(height);
      var width1: u32 = u32(width);
      var depth2: u32 = u32(depth + 1);
      var height2: u32 = u32(height + 1);
      var width2: u32 = u32(width + 1);
      var channel: u32 = ${r.length>3?`u32(originalIndices[${p}])`:"0"};
      var batch: u32 =  ${r.length>3?`u32(originalIndices[${a}])`:"0"};

      var x111: ${m} = getInputValue(batch, channel, depth1, height1, width1);
      var x112: ${m} = getInputValue(batch, channel, depth1, height1, width2);
      var x121: ${m} = getInputValue(batch, channel, depth1, height2, width1);
      var x122: ${m} = getInputValue(batch, channel, depth1, height2, width2);
      var x211: ${m} = getInputValue(batch, channel, depth2, height1, width1);
      var x212: ${m} = getInputValue(batch, channel, depth2, height1, width2);
      var x221: ${m} = getInputValue(batch, channel, depth2, height2, width1);
      var x222: ${m} = getInputValue(batch, channel, depth2, height2, width2);
      var dx1: ${m} = abs(depth - ${m}(depth1));
      var dx2: ${m} = abs(${m}(depth2) - depth);
      var dy1: ${m} = abs(height - ${m}(height1));
      var dy2: ${m} = abs(${m}(height2) - height);
      var dz1: ${m} = abs(width - ${m}(width1));
      var dz2: ${m} = abs(${m}(width2) - width);
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
    }`},Kb=(t,e,r,n,o,i)=>{let a=t.dims,u=Ub(i,e.axes,a.length),d=Nb(a,n,o,e.axes),c=n.slice();n.length===0&&(c=a.map(($,T)=>$===0?1:d[T]/$),e.keepAspectRatioPolicy!=="stretch"&&(d=Vb(a,c,e)));let p=R("output",t.dataType,d.length),m=D("input",t.dataType,a.length),g=k.size(d),y=a.length===d.length&&a.every(($,T)=>$===d[T]),b=e.coordinateTransformMode==="tf_crop_and_resize",_=e.extrapolationValue,S=m.type.value,x=$=>`
      ${y?"":`
      ${Mb(e.coordinateTransformMode,S)};
      ${(()=>{switch(e.mode){case"nearest":return`
              ${Gb(m,a)};
              ${Rb(e.nearestMode,r,S)};
              ${Wb(m,p,a,d,c.length,u.length,b)};
              `;case"linear":return`
              ${Lb(p,a,d,c.length,u.length)};
              ${(()=>{if(a.length===2||a.length===4)return`${Hb(m,p,a,b,_)}`;if(a.length===3||a.length===5)return`${qb(m,p,a,b,_)}`;throw Error("Linear mode only supports input dims 2, 3, 4 and 5 are supported in linear mode.")})()};
            `;case"cubic":return`
            ${(()=>{if(a.length===2||a.length===4)return`${Fb(m,p,a,d,c,u,e.cubicCoeffA,b,e.extrapolationValue,e.excludeOutside)}`;throw Error("Cubic mode only supports input dims 2 and 4 are supported in linear mode.")})()};
            `;default:throw Error("Invalid resize mode")}})()};
      `}
      ${$.registerUniform("output_size","u32").registerUniform("scales","f32",c.length).registerUniform("roi","f32",u.length).declareVariables(m,p)}
      ${$.mainStart()}
        ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
        ${y?"output[global_idx] = input[global_idx];":`
        let output_indices = ${p.offsetToIndices("global_idx")};
        var input_indices: ${m.type.indices};
        ${(()=>{switch(e.mode){case"nearest":return`input_indices = calculateInputIndicesFromOutputIndices(output_indices);
                if (checkInputIndices(input_indices)) {
                  output[global_idx] = ${m.getByIndices("input_indices")};
                } else {
                  output[global_idx] = ${e.extrapolationValue};
                }`;case"linear":return`output[global_idx] = ${a.length===2||a.length===4?"bilinearInterpolation":"trilinearInterpolation"}(output_indices);`;case"cubic":return"output[global_idx] = bicubicInterpolation(output_indices);";default:throw Error(`Unsupported resize mode: ${e.mode}`)}})()};
`}
      }`;return{name:"Resize",shaderCache:{hint:`${e.cacheKey}|${r}|${c.length>0?e.mode==="cubic"?c:c.length:""}|${o.length>0?o:""}|${u.length>0?u:""}|${y}|${e.mode==="nearest"?a.length:a}`,inputDependencies:["rank"]},getShaderSource:x,getRunData:()=>({outputs:[{dims:d,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(g/64)},programUniforms:[{type:12,data:g},{type:1,data:c},{type:1,data:u},...W(a,d)]})}},jb=t=>{let e=t.customDataBuffer;return new Uint32Array(e.buffer,e.byteOffset,1)[0]},Oc=(t,e)=>{let r=[],n=[],o=[],i=jb(t);if(e.antialias!==0)throw Error("Only default value (0) for Antialias attribute is supported");zb(t.inputs,e,i,r,n,o),t.compute(Kb(t.inputs[0],e,i,r,n,o),{inputs:[0]})},Bc=t=>{let e=t.antialias,r=t.axes,n=t.coordinateTransformMode,o=t.cubicCoeffA,i=t.excludeOutside!==0,a=t.extrapolationValue,u=t.keepAspectRatioPolicy,d=t.mode,c=t.nearestMode===""?"simple":t.nearestMode;return J({antialias:e,axes:r,coordinateTransformMode:n,cubicCoeffA:o,excludeOutside:i,extrapolationValue:a,keepAspectRatioPolicy:u,mode:d,nearestMode:c})}});var Zb,Qb,Mc,Rc=V(()=>{"use strict";ee();te();oe();Zb=t=>{if(!t||t.length<3)throw new Error("layerNorm requires at least 3 inputs.");let e=t[0],r=t[1],n=t[2];if(e.dataType!==r.dataType||e.dataType!==n.dataType)throw new Error("All inputs must have the same data type");if(e.dims.length!==3&&e.dims.length!==2)throw new Error("Input must be 2D or 3D");if(r.dims.length!==3&&r.dims.length!==2)throw new Error("Skip must be 2D or 3D");let o=e.dims[e.dims.length-1],i=e.dims[e.dims.length-2];if(r.dims[r.dims.length-1]!==o)throw new Error("Skip must have the same hidden size as input");if(r.dims[r.dims.length-2]!==i)throw new Error("Skip must have the same sequence length as input");if(n.dims.length!==1)throw new Error("Gamma must be 1D");if(n.dims[n.dims.length-1]!==o)throw new Error("Gamma must have the same hidden size as input");if(t.length>3){let a=t[3];if(a.dims.length!==1)throw new Error("Beta must be 1D");if(a.dims[a.dims.length-1]!==o)throw new Error("Beta must have the same hidden size as input")}if(t.length>4){let a=t[4];if(a.dims.length!==1)throw new Error("Bias must be 1D");if(a.dims[a.dims.length-1]!==o)throw new Error("Bias must have the same hidden size as input")}},Qb=(t,e,r,n)=>{let o=e.simplified,i=t[0].dims,a=k.size(i),u=i,d=a,c=i.slice(-1)[0],p=n?i.slice(0,-1).concat(1):[],m=!o&&t.length>3,g=t.length>4,y=n&&r>1,b=n&&r>2,_=r>3,S=64,x=fe(c),$=[{type:12,data:d},{type:12,data:x},{type:12,data:c},{type:1,data:e.epsilon}],T=A=>{let E=[{name:"output_size",type:"u32"},{name:"components",type:"u32"},{name:"hidden_size",type:"u32"},{name:"epsilon",type:"f32"}],O=[D("x",t[0].dataType,t[0].dims,x),D("skip",t[1].dataType,t[1].dims,x),D("gamma",t[2].dataType,t[2].dims,x)];m&&O.push(D("beta",t[3].dataType,t[3].dims,x)),g&&O.push(D("bias",t[4].dataType,t[4].dims,x)),O.push(R("output",t[0].dataType,u,x)),y&&O.push(R("mean_output",1,p)),b&&O.push(R("inv_std_output",1,p)),_&&O.push(R("input_skip_bias_sum",t[0].dataType,u,x));let w=we(t[0].dataType),U=we(1,x);return`

      ${A.registerUniforms(E).declareVariables(...O)}
      var<workgroup> sum_shared : array<${U}, ${S}>;
      var<workgroup> sum_squared_shared : array<${U}, ${S}>;

      ${A.mainStart([S,1,1])}
        let ix = local_id.x;
        let iy = global_id.x / ${S};

        let hidden_size_vectorized: u32 = uniforms.hidden_size / uniforms.components;
        var stride = hidden_size_vectorized / ${S};
        let offset = ix * stride + iy * hidden_size_vectorized;
        let offset1d = stride * ix;
        if (ix == ${S-1}) {
          stride = hidden_size_vectorized - stride * ix;
        }
        for (var i: u32 = 0; i < stride; i++) {
          let skip_value = skip[offset + i];
          let bias_value = ${g?"bias[offset1d + i]":w+"(0.0)"};
          let input_value = x[offset + i];
          let value = input_value + skip_value + bias_value;
          ${_?"input_skip_bias_sum[offset + i] = value;":""}
          output[offset + i] = value;
          let f32_value = ${Mt(w,x,"value")};
          sum_shared[ix] += f32_value;
          sum_squared_shared[ix] += f32_value * f32_value;
        }
        workgroupBarrier();

        var reduce_size : u32 = ${S};
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
        let mean = ${Ze("sum",x)} / f32(uniforms.hidden_size);
        let inv_std_dev = inverseSqrt(${Ze("square_sum",x)} / f32(uniforms.hidden_size) ${o?"":"- mean * mean"} + uniforms.epsilon);
        ${y?"mean_output[global_idx] = mean;":""}
        ${b?"inv_std_output[global_idx] = inv_std_dev;":""}

        for (var i: u32 = 0; i < stride; i++) {
          output[offset + i] = (output[offset + i] ${o?"":`- ${w}(mean)`}) *
            ${w}(inv_std_dev) * gamma[offset1d + i]
            ${m?"+ beta[offset1d + i]":""};
        }
      }`},I=[{dims:u,dataType:t[0].dataType}];return r>1&&I.push({dims:p,dataType:1}),r>2&&I.push({dims:p,dataType:1}),r>3&&I.push({dims:i,dataType:t[0].dataType}),{name:"SkipLayerNormalization",shaderCache:{hint:`${x};${y};${b};${_}`,inputDependencies:t.map((A,E)=>"type")},getShaderSource:T,getRunData:()=>({outputs:I,dispatchGroup:{x:Math.ceil(d/c)},programUniforms:$})}},Mc=(t,e)=>{Zb(t.inputs);let n=[0];t.outputCount>1&&n.push(-3),t.outputCount>2&&n.push(-3),t.outputCount>3&&n.push(3),t.compute(Qb(t.inputs,e,t.outputCount,!1),{outputs:n})}});var Yb,hn,Xb,Uc,Jb,ey,Nc,Vc,Lc=V(()=>{"use strict";ee();te();Ce();oe();Yb=(t,e)=>{if(!t||t.length<1)throw new Error("too few inputs");if(e.axes.length!==0){if(e.axes.length!==e.starts.length||e.axes.length!==e.ends.length)throw new Error("axes, starts and ends must have the same length")}else if(e.starts.length!==e.ends.length)throw new Error("starts and ends must have the same length");t.slice(1).forEach((r,n)=>{if(t[n+1].dataType!==6&&t[n+1].dataType!==7)throw new Error(`Input ${n} must be an array of int32 or int64`)})},hn=(t,e)=>{let r=[];if(t.length>e)if(t[e].dataType===7)t[e].getBigInt64Array().forEach(n=>r.push(Number(n)));else if(t[e].dataType===6)t[e].getInt32Array().forEach(n=>r.push(Number(n)));else throw new Error(`Input ${e} must be an array of int32 or int64`);return r},Xb=(t,e)=>{if(t.length>1){let r=hn(t,1),n=hn(t,2),o=hn(t,3);return o.length===0&&(o=[...Array(t[0].dims.length).keys()]),J({starts:r,ends:n,axes:o})}else return e},Uc=(t,e,r,n,o)=>{let i=t;return t<0&&(i+=r[n[e]]),o[e]<0?Math.max(0,Math.min(i,r[n[e]]-1)):Math.max(0,Math.min(i,r[n[e]]))},Jb=(t,e,r)=>`fn calculateInputIndices(output_indices: ${e.type.indices}) -> ${t.type.indices} {
          var input_indices: ${t.type.indices};
          var carry = 0u;
          for (var i = ${r.length-1}; i >= 0; i--) {
            let input_shape_i = ${j("uniforms.input_shape","i",r.length)};
            let steps_i = ${j("uniforms.steps","i",r.length)};
            let signs_i = ${j("uniforms.signs","i",r.length)};
            let starts_i = ${j("uniforms.starts","i",r.length)};
            var output_index = ${e.indicesGet("output_indices","i")};
            var input_index = output_index * steps_i + starts_i + carry;
            carry = input_index / input_shape_i;
            input_index = input_index % input_shape_i;
            if (signs_i < 0) {
              input_index = input_shape_i - input_index - 1u + starts_i;
            }
            ${t.indicesSet("input_indices","i","input_index")};
          }
          return input_indices;
      }`,ey=(t,e)=>{let r=t[0].dims,n=k.size(r),o=e.axes.length>0?k.normalizeAxes(e.axes,r.length):[...Array(r.length).keys()],i=hn(t,4);i.forEach(x=>x!==0||(()=>{throw new Error("step cannot be 0")})),i.length===0&&(i=Array(o.length).fill(1));let a=e.starts.map((x,$)=>Uc(x,$,r,o,i)),u=e.ends.map((x,$)=>Uc(x,$,r,o,i));if(o.length!==a.length||o.length!==u.length)throw new Error("start, ends and axes should have the same number of elements");if(o.length!==r.length)for(let x=0;x<r.length;++x)o.includes(x)||(a.splice(x,0,0),u.splice(x,0,r[x]),i.splice(x,0,1));let d=i.map(x=>Math.sign(x));i.forEach((x,$,T)=>{if(x<0){let I=(u[$]-a[$])/x,A=a[$],E=A+I*i[$];a[$]=E,u[$]=A,T[$]=-x}});let c=r.slice(0);o.forEach((x,$)=>{c[x]=Math.ceil((u[x]-a[x])/i[x])});let p={dims:c,dataType:t[0].dataType},m=R("output",t[0].dataType,c.length),g=D("input",t[0].dataType,t[0].dims.length),y=k.size(c),b=[{name:"outputSize",type:"u32"},{name:"starts",type:"u32",length:a.length},{name:"signs",type:"i32",length:d.length},{name:"steps",type:"u32",length:i.length}],_=[{type:12,data:y},{type:12,data:a},{type:6,data:d},{type:12,data:i},...W(t[0].dims,c)],S=x=>`
      ${x.registerUniforms(b).declareVariables(g,m)}
        ${Jb(g,m,r)}
        ${x.mainStart()}
          ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
          let output_indices = ${m.offsetToIndices("global_idx")};
          let input_indices = calculateInputIndices(output_indices);
          ${m.setByOffset("global_idx",g.getByIndices("input_indices"))}
      }`;return{name:"Slice",shaderCache:{hint:`${d.length}_${a.length}_${i.length}`,inputDependencies:["rank"]},getShaderSource:S,getRunData:()=>({outputs:[p],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:_})}},Nc=(t,e)=>{Yb(t.inputs,e);let r=Xb(t.inputs,e);t.compute(ey(t.inputs,r),{inputs:[0]})},Vc=t=>{let e=t.starts,r=t.ends,n=t.axes;return J({starts:e,ends:r,axes:n})}});var ty,ry,Wc,Gc,Hc=V(()=>{"use strict";ee();te();Ce();pt();oe();ty=t=>{if(!t||t.length!==1)throw new Error("Softmax op requires 1 input.")},ry=(t,e)=>{let r=t.inputs[0],n=r.dims,o=k.size(n),i=n.length,a=k.normalizeAxis(e.axis,i),u=a<n.length-1,d,c=[];u?(c=Array.from({length:i},(O,w)=>w),c[a]=i-1,c[i-1]=a,d=t.compute(Be(r,c),{inputs:[r],outputs:[-1]})[0]):d=r;let p=d.dims,m=p[i-1],g=o/m,y=fe(m),b=m/y,_=64;g===1&&(_=256);let S=(O,w)=>w===4?`max(max(${O}.x, ${O}.y), max(${O}.z, ${O}.w))`:w===2?`max(${O}.x, ${O}.y)`:w===3?`max(max(${O}.x, ${O}.y), ${O}.z)`:O,x=D("x",d.dataType,d.dims,y),$=R("result",d.dataType,d.dims,y),T=x.type.value,I=we(d.dataType)==="f32"?`var threadMax = ${T}(-3.4028234663852886e+38f);`:`var threadMax = ${T}(-65504.0h);`,A=O=>`
      var<workgroup> rowMaxShared : ${T};
      var<workgroup> rowSumShared : ${T};
      var<workgroup> threadShared : array<${T}, ${_}>;

      fn getValue(row: i32, col: i32, row_stride: i32) -> ${T} {
        let index = row * row_stride + col;
        return x[index];
      }

      fn setValue(row: i32, col: i32, row_stride: i32, value: ${T}) {
        let index = row * row_stride + col;
        result[index] = value;
      }
      ${O.registerUniform("packedCols","i32").declareVariables(x,$)}
      ${O.mainStart(_)}
        let gindex = i32(global_idx);
        let lindex = i32(local_idx);
        const wg = ${_};
        let row = gindex / wg;
        let cols = uniforms.packedCols;
        let row_stride : i32 = uniforms.packedCols;

        // find the rows max
        ${I}
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
          rowMaxShared = ${T}(${S("threadShared[0]",y)});
        }
        workgroupBarrier();

        // find the rows sum
        var threadSum = ${T}(0.0);
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
          rowSumShared = ${T}(${Ze("threadShared[0]",y)});
        }
        workgroupBarrier();

        // calculate final value for each element in the row
        for (var col = lindex; col < cols; col += wg) {
          var value = exp(getValue(row, col, row_stride) - rowMaxShared) / rowSumShared;
          // max operation protects against NaN since all values should be >=0
          value = max(value, ${T}(0.0));
          setValue(row, col, row_stride, value);
        }
      }`,E=t.compute({name:"Softmax",shaderCache:{hint:`${y};${_}`,inputDependencies:["type"]},getRunData:()=>({outputs:[{dims:p,dataType:d.dataType}],dispatchGroup:{x:g},programUniforms:[{type:6,data:b}]}),getShaderSource:A},{inputs:[d],outputs:[u?-1:0]})[0];u&&t.compute(Be(E,c),{inputs:[E]})},Wc=(t,e)=>{ty(t.inputs),ry(t,e)},Gc=t=>J({axis:t.axis})});var Fc,ny,oy,iy,qc,Kc=V(()=>{"use strict";ee();te();oe();Fc=t=>Array.from(t.getBigInt64Array(),Number),ny=t=>{if(!t||t.length!==2)throw new Error("Tile requires 2 inputs.");if(t[0].dataType!==1&&t[0].dataType!==10&&t[0].dataType!==6&&t[0].dataType!==12)throw new Error("Tile only support float, float16, int32, and uint32 data types");if(t[1].dataType!==7)throw new Error("Tile `repeats` input should be of int64 data type");if(t[1].dims.length!==1)throw new Error("Tile `repeats` input should be 1-D");if(Fc(t[1]).length!==t[0].dims.length)throw new Error("Tile `repeats` input should have same number of elements as rank of input data tensor")},oy=(t,e)=>{let r=[];for(let n=0;n<t.length;++n)r.push(t[n]*e[n]);return r},iy=(t,e)=>{let r=t[0].dims,n=e??Fc(t[1]),o=oy(r,n),i=k.size(o),a=t[0].dataType,u=D("input",a,r.length),d=R("output",a,o.length),c=p=>`
      const inputShape = ${u.indices(...r)};
      ${p.registerUniform("output_size","u32").declareVariables(u,d)}
      ${p.mainStart()}
      ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let output_indices = ${d.offsetToIndices("global_idx")};
      var input_indices: ${u.type.indices};
      for (var i = 0; i < ${r.length}; i++) {
        let input_dim_i = ${u.indicesGet("uniforms.input_shape","i")};
        let input_dim_value = ${d.indicesGet("output_indices","i")}  % input_dim_i;

        ${u.indicesSet("input_indices","i","input_dim_value")}
      }
      ${d.setByOffset("global_idx",u.getByIndices("input_indices"))}
    }`;return{name:"Tile",shaderCache:{hint:`${n}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:o,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:[{type:12,data:i},...W(t[0].dims,o)]}),getShaderSource:c}},qc=t=>{ny(t.inputs),t.compute(iy(t.inputs),{inputs:[0]})}});var ay,sy,jc,Zc=V(()=>{"use strict";ee();te();oe();ay=(t,e,r,n,o)=>{let i=R("output_data",o,r.length,4),a=D("a_data",e[1].dataType,e[1].dims.length,4),u=D("b_data",e[2].dataType,e[2].dims.length,4),d=D("c_data",e[0].dataType,e[0].dims.length,4),c,p=(m,g,y)=>`select(${g}, ${m}, ${y})`;if(!n)c=i.setByOffset("global_idx",p(a.getByOffset("global_idx"),u.getByOffset("global_idx"),d.getByOffset("global_idx")));else{let m=(g,y,b="")=>{let _=`a_data[index_a${y}][component_a${y}]`,S=`b_data[index_b${y}][component_b${y}]`,x=`bool(c_data[index_c${y}] & (0xffu << (component_c${y} * 8)))`;return`
            let output_indices${y} = ${i.offsetToIndices(`global_idx * 4u + ${y}u`)};
            let offset_a${y} = ${a.broadcastedIndicesToOffset(`output_indices${y}`,i)};
            let offset_b${y} = ${u.broadcastedIndicesToOffset(`output_indices${y}`,i)};
            let offset_c${y} = ${d.broadcastedIndicesToOffset(`output_indices${y}`,i)};
            let index_a${y} = offset_a${y} / 4u;
            let index_b${y} = offset_b${y} / 4u;
            let index_c${y} = offset_c${y} / 4u;
            let component_a${y} = offset_a${y} % 4u;
            let component_b${y} = offset_b${y} % 4u;
            let component_c${y} = offset_c${y} % 4u;
            ${g}[${y}] = ${b}(${p(_,S,x)});
          `};o===9?c=`
            var data = vec4<u32>(0);
            ${m("data",0,"u32")}
            ${m("data",1,"u32")}
            ${m("data",2,"u32")}
            ${m("data",3,"u32")}
            output_data[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:c=`
            ${m("output_data[global_idx]",0)}
            ${m("output_data[global_idx]",1)}
            ${m("output_data[global_idx]",2)}
            ${m("output_data[global_idx]",3)}
          `}return`
        ${t.registerUniform("vec_size","u32").declareVariables(d,a,u,i)}
        ${t.mainStart()}
        ${t.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${c}
      }`},sy=t=>{let e=t[1].dims,r=t[2].dims,n=t[0].dims,o=t[1].dataType,i=!(k.areEqual(e,r)&&k.areEqual(r,n)),a=e,u=k.size(e);if(i){let c=ot.calcShape(ot.calcShape(e,r,!1),n,!1);if(!c)throw new Error("Can't perform where op on the given tensors");a=c,u=k.size(a)}let d=Math.ceil(u/4);return{name:"Where",shaderCache:{inputDependencies:["rank","rank","rank"]},getShaderSource:c=>ay(c,t,a,i,o),getRunData:()=>({outputs:[{dims:a,dataType:o}],dispatchGroup:{x:Math.ceil(u/64/4)},programUniforms:[{type:12,data:d},...W(n,e,r,a)]})}},jc=t=>{t.compute(sy(t.inputs))}});var Qc,Yc=V(()=>{"use strict";$u();tn();Tu();Cu();md();Sd();Cd();Gd();Qd();Jd();rl();ll();hl();yl();wl();xl();Il();El();Dl();zl();Ul();Kl();Ql();Xl();ec();nc();Oo();ic();$c();Tc();Cc();kc();Jr();zc();Mo();Rc();Lc();Hc();zo();Kc();pt();nn();Zc();Qc=new Map([["Abs",[Au]],["Acos",[Eu]],["Acosh",[ku]],["Add",[fd]],["ArgMax",[vu,_o]],["ArgMin",[wu,_o]],["Asin",[Pu]],["Asinh",[Du]],["Atan",[Ou]],["Atanh",[Bu]],["Attention",[xu]],["AveragePool",[mc,pc]],["BatchNormalization",[Su]],["BiasAdd",[Iu]],["BiasSplitGelu",[pd]],["Cast",[Mu,zu]],["Ceil",[Uu]],["Clip",[Ru]],["Concat",[Td,Id]],["Conv",[Ao,Co]],["ConvTranspose",[Zd,Kd]],["Cos",[Nu]],["Cosh",[Vu]],["CumSum",[Yd,Xd]],["DepthToSpace",[el,tl]],["DequantizeLinear",[xc,Sc]],["DFT",[ul,dl]],["Div",[hd]],["Einsum",[ml,fl]],["Elu",[Lu,ar]],["Equal",[gd]],["Erf",[Wu]],["Exp",[Gu]],["Expand",[bl]],["FastGelu",[_l]],["Floor",[Hu]],["FusedConv",[Ao,Co]],["Gather",[$l,vl]],["GatherElements",[Pl,kl]],["GatherBlockQuantized",[Cl,Al]],["GatherND",[Sl,Tl]],["Gelu",[Fu]],["Gemm",[Bl,Ol]],["GlobalAveragePool",[gc,hc]],["GlobalMaxPool",[vc,wc]],["Greater",[wd]],["GreaterOrEqual",[$d]],["GridSample",[Ml,Rl]],["GroupQueryAttention",[ql]],["HardSigmoid",[Ju,Xu]],["HardSwish",[ed]],["InstanceNormalization",[Zl]],["LayerNormalization",[Yl]],["LeakyRelu",[qu,ar]],["Less",[vd]],["LessOrEqual",[xd]],["Log",[dd]],["MatMul",[Jl]],["MatMulNBits",[tc,rc]],["MaxPool",[yc,_c]],["Mul",[bd]],["MultiHeadAttention",[Ll,Vl]],["Neg",[ju]],["Not",[Ku]],["Pad",[oc]],["Pow",[yd]],["QuickGelu",[ld,ar]],["Range",[Ic]],["Reciprocal",[Zu]],["ReduceMin",[fu]],["ReduceMean",[du]],["ReduceMax",[mu]],["ReduceSum",[gu]],["ReduceProd",[hu]],["ReduceL1",[lu]],["ReduceL2",[cu]],["ReduceLogSum",[yu]],["ReduceLogSumExp",[pu]],["ReduceSumSquare",[bu]],["Relu",[Qu]],["Resize",[Oc,Bc]],["RotaryEmbedding",[Hl]],["ScatterND",[Ec,Ac]],["Sigmoid",[Yu]],["Sin",[td]],["Sinh",[rd]],["Slice",[Nc,Vc]],["SkipLayerNormalization",[Mc]],["Split",[Wl,Gl]],["Sqrt",[nd]],["Softmax",[Wc,Gc]],["Sub",[_d]],["Tan",[od]],["Tanh",[ad]],["ThresholdedRelu",[ud,ar]],["Tile",[qc]],["Transpose",[Qs,Ys]],["Where",[jc]]])});var gn,Xc=V(()=>{"use strict";Le();nt();oe();gn=class{constructor(e){this.backend=e;this.repo=new Map,this.attributesBound=!1}getArtifact(e){return this.repo.get(e)}setArtifact(e,r){this.repo.set(e,r)}run(e,r,n,o,i){Ve(e.programInfo.name);let a=this.backend.device,u=this.backend.getComputePassEncoder();this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2);let d=[];for(let p of r)d.push({binding:d.length,resource:{buffer:p.buffer}});for(let p of n)d.push({binding:d.length,resource:{buffer:p.buffer}});i&&d.push({binding:d.length,resource:i});let c=a.createBindGroup({layout:e.computePipeline.getBindGroupLayout(0),entries:d,label:e.programInfo.name});if(this.backend.sessionStatus==="capturing"){let p={kernelId:this.backend.currentKernelId,computePipeline:e.computePipeline,bindGroup:c,dispatchGroup:o};this.backend.capturedCommandList.get(this.backend.currentSessionId).push(p)}u.setPipeline(e.computePipeline),u.setBindGroup(0,c),u.dispatchWorkgroups(...o),this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2+1),this.backend.pendingDispatchNumber++,(this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber||this.backend.queryType==="at-passes")&&this.backend.endComputePass(),this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber&&this.backend.flush(),Re(e.programInfo.name)}dispose(){}build(e,r){Ve(e.name);let n=this.backend.device,o=[];[{feature:"shader-f16",extension:"f16"},{feature:"subgroups",extension:"subgroups"}].forEach(m=>{n.features.has(m.feature)&&o.push(`enable ${m.extension};`)});let a=js(r,this.backend.device.limits),u=e.getShaderSource(a),d=`${o.join(`
`)}
${a.additionalImplementations}
${u}`,c=n.createShaderModule({code:d,label:e.name});se("verbose",()=>`[WebGPU] ${e.name} shader code: ${d}`);let p=n.createComputePipeline({compute:{module:c,entryPoint:"main"},layout:"auto",label:e.name});return Re(e.name),{programInfo:e,computePipeline:p,uniformVariablesInfo:a.variablesInfo}}normalizeDispatchGroupSize(e){let r=typeof e=="number"?e:e.x,n=typeof e=="number"?1:e.y||1,o=typeof e=="number"?1:e.z||1,i=this.backend.device.limits.maxComputeWorkgroupsPerDimension;if(r<=i&&n<=i&&o<=i)return[r,n,o];let a=r*n*o,u=Math.ceil(Math.sqrt(a));if(u>i){if(u=Math.ceil(Math.cbrt(a)),u>i)throw new Error("Total dispatch size exceeds WebGPU maximum.");return[u,u,u]}else return[u,u,1]}}});var Jc={};Wt(Jc,{WebGpuBackend:()=>Uo});var uy,dy,Ro,Uo,ep=V(()=>{"use strict";Le();ee();nt();so();qs();Yc();Xc();uy=(t,e)=>{if(e.length!==t.length)throw new Error(`inputDependencies length ${e.length} is not equal to inputTensors length ${t.length}.`);let r=[];for(let n=0;n<t.length;++n){let o=t[n].dataType;switch(e[n]){case"none":{r.push("");break}case"type":{r.push(`${o}`);break}case"rank":{let i=t[n].dims.length;r.push(`${o};${i}`);break}case"dims":{let i=t[n].dims.join(",");r.push(`${o};${i}`);break}default:throw new Error(`unsupported input dependency: ${e[n]}`)}}return r.join("|")},dy=(t,e,r)=>{let n=t.name;return t.shaderCache?.hint&&(n+="["+t.shaderCache.hint+"]"),n+=":"+r+`:${uy(e,t.shaderCache?.inputDependencies??new Array(e.length).fill("dims"))}`,n},Ro=class{constructor(e){e&&(this.architecture=e.architecture,this.vendor=e.vendor)}isArchitecture(e){return this.architecture===e}isVendor(e){return this.vendor===e}},Uo=class{constructor(){this.currentSessionId=null;this.currentKernelId=null;this.commandEncoder=null;this.computePassEncoder=null;this.maxDispatchNumber=16;this.pendingDispatchNumber=0;this.pendingKernels=[];this.pendingQueries=new Map;this.sessionStatus="default";this.capturedCommandList=new Map;this.capturedPendingKernels=new Map;this.sessionExternalDataMapping=new Map}get currentKernelCustomData(){if(this.currentKernelId===null)throw new Error("currentKernelCustomData(): currentKernelId is null. (should not happen)");let e=this.kernelCustomData.get(this.currentKernelId);return e||(e={},this.kernelCustomData.set(this.currentKernelId,e)),e}async initialize(e,r){this.env=e;let n=[],o={requiredLimits:{maxComputeWorkgroupStorageSize:r.limits.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:r.limits.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:r.limits.maxStorageBufferBindingSize,maxBufferSize:r.limits.maxBufferSize,maxComputeInvocationsPerWorkgroup:r.limits.maxComputeInvocationsPerWorkgroup,maxComputeWorkgroupSizeX:r.limits.maxComputeWorkgroupSizeX,maxComputeWorkgroupSizeY:r.limits.maxComputeWorkgroupSizeY,maxComputeWorkgroupSizeZ:r.limits.maxComputeWorkgroupSizeZ},requiredFeatures:n},i=d=>r.features.has(d)&&n.push(d)&&!0;i("chromium-experimental-timestamp-query-inside-passes")||i("timestamp-query"),i("shader-f16"),i("subgroups"),this.device=await r.requestDevice(o);let a=r,u=r.info??(typeof a.requestAdapterInfo=="function"?await a.requestAdapterInfo():void 0);this.adapterInfo=new Ro(u),this.gpuDataManager=Fs(this),this.programManager=new gn(this),this.kernels=new Map,this.kernelPersistentData=new Map,this.kernelCustomData=new Map,Gr(e.logLevel,!!e.debug),this.device.onuncapturederror=d=>{d.error instanceof GPUValidationError&&console.error(`An uncaught WebGPU validation error was raised: ${d.error.message}`)},Object.defineProperty(this.env.webgpu,"device",{value:this.device,writable:!1,enumerable:!0,configurable:!0}),Object.defineProperty(this.env.webgpu,"adapter",{value:r,writable:!1,enumerable:!0,configurable:!1}),this.setQueryType()}dispose(){typeof this.querySet<"u"&&this.querySet.destroy(),this.gpuDataManager.dispose(),this.device&&this.env?.webgpu&&this.device.lost.then(()=>{delete this.env.webgpu.device})}getCommandEncoder(){return this.commandEncoder||(this.commandEncoder=this.device.createCommandEncoder()),this.commandEncoder}getComputePassEncoder(){if(!this.computePassEncoder){let e=this.getCommandEncoder(),r={};this.queryType==="at-passes"&&(r.timestampWrites={querySet:this.querySet,beginningOfPassWriteIndex:this.pendingDispatchNumber*2,endOfPassWriteIndex:this.pendingDispatchNumber*2+1}),this.computePassEncoder=e.beginComputePass(r)}return this.computePassEncoder}endComputePass(){this.computePassEncoder&&(this.computePassEncoder.end(),this.computePassEncoder=null)}flush(){if(!this.commandEncoder)return;Ve(),this.endComputePass();let e;this.queryType!=="none"&&(this.commandEncoder.resolveQuerySet(this.querySet,0,this.pendingDispatchNumber*2,this.queryResolveBuffer,0),e=this.device.createBuffer({size:this.pendingDispatchNumber*2*8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.pendingQueries.set(e,this.pendingKernels),this.pendingKernels=[],this.commandEncoder.copyBufferToBuffer(this.queryResolveBuffer,0,e,0,this.pendingDispatchNumber*2*8)),this.device.queue.submit([this.commandEncoder.finish()]),this.gpuDataManager.refreshPendingBuffers(),this.commandEncoder=null,this.pendingDispatchNumber=0,this.queryType!=="none"&&e.mapAsync(GPUMapMode.READ).then(()=>{let r=new BigUint64Array(e.getMappedRange()),n=this.pendingQueries.get(e);for(let o=0;o<r.length/2;o++){let i=n[o],a=i.kernelId,u=this.kernels.get(a),d=u.kernelType,c=u.kernelName,p=i.programName,m=i.inputTensorViews,g=i.outputTensorViews,y=r[o*2],b=r[o*2+1];typeof this.queryTimeBase>"u"&&(this.queryTimeBase=y);let _=Number(y-this.queryTimeBase),S=Number(b-this.queryTimeBase);if(!Number.isSafeInteger(_)||!Number.isSafeInteger(S))throw new RangeError("incorrect timestamp range");if(this.env.webgpu.profiling?.ondata)this.env.webgpu.profiling.ondata({version:1,inputsMetadata:m.map(x=>({dims:x.dims,dataType:rt(x.dataType)})),outputsMetadata:g.map(x=>({dims:x.dims,dataType:rt(x.dataType)})),kernelId:a,kernelType:d,kernelName:c,programName:p,startTime:_,endTime:S});else{let x="";m.forEach((T,I)=>{x+=`input[${I}]: [${T.dims}] | ${rt(T.dataType)}, `});let $="";g.forEach((T,I)=>{$+=`output[${I}]: [${T.dims}] | ${rt(T.dataType)}, `}),console.log(`[profiling] kernel "${a}|${d}|${c}|${p}" ${x}${$}start time: ${_} ns, execution time: ${S-_} ns`)}Cr("GPU",`${p}::${y}::${b}`)}e.unmap(),this.pendingQueries.delete(e)}),Re()}run(e,r,n,o,i,a){Ve(e.name);let u=[];for(let T=0;T<r.length;++T){let I=r[T].data;if(I===0)continue;let A=this.gpuDataManager.get(I);if(!A)throw new Error(`no GPU data for input: ${I}`);u.push(A)}let{outputs:d,dispatchGroup:c,programUniforms:p}=e.getRunData(r),m=n.length===0?d.map((T,I)=>I):n;if(m.length!==d.length)throw new Error(`Output size ${m.length} must be equal to ${d.length}.`);let g=[],y=[];for(let T=0;T<d.length;++T){if(!Number.isInteger(m[T])||m[T]<-3||m[T]>=a)throw new Error(`Invalid output index: ${m[T]}`);if(m[T]===-3)continue;let I=m[T]===-1,A=m[T]===-2,E=I||A?i(d[T].dataType,d[T].dims):o(m[T],d[T].dataType,d[T].dims);if(g.push(E),E.data===0)continue;let O=this.gpuDataManager.get(E.data);if(!O)throw new Error(`no GPU data for output: ${E.data}`);if(I&&this.temporaryData.push(O),A){let w=this.kernelPersistentData.get(this.currentKernelId);w||(w=[],this.kernelPersistentData.set(this.currentKernelId,w)),w.push(O)}y.push(O)}if(u.length!==r.length||y.length!==g.length){if(y.length===0)return Re(e.name),g;throw new Error(`Program ${e.name} has zero-sized tensor(s) in inputs or outputs. This is not supported now.`)}let b;if(p){let T=0,I=[];p.forEach(w=>{let U=typeof w.data=="number"?[w.data]:w.data;if(U.length===0)return;let N=w.type===10?2:4,F,q;w.type===10?(q=U.length>4?16:U.length>2?8:U.length*N,F=U.length>4?16:N*U.length):(q=U.length<=2?U.length*N:16,F=16),T=Math.ceil(T/q)*q,I.push(T);let X=w.type===10?8:4;T+=U.length>4?Math.ceil(U.length/X)*F:U.length*N});let A=16;T=Math.ceil(T/A)*A;let E=new ArrayBuffer(T);p.forEach((w,U)=>{let N=I[U],F=typeof w.data=="number"?[w.data]:w.data;if(w.type===6)new Int32Array(E,N,F.length).set(F);else if(w.type===12)new Uint32Array(E,N,F.length).set(F);else if(w.type===10)new Uint16Array(E,N,F.length).set(F);else if(w.type===1)new Float32Array(E,N,F.length).set(F);else throw new Error(`Unsupported uniform type: ${rt(w.type)}`)});let O=this.gpuDataManager.create(T,GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM);this.device.queue.writeBuffer(O.buffer,0,E,0,T),this.gpuDataManager.release(O.id),b={offset:0,size:T,buffer:O.buffer}}let _=this.programManager.normalizeDispatchGroupSize(c),S=_[1]===1&&_[2]===1,x=dy(e,r,S),$=this.programManager.getArtifact(x);if($||($=this.programManager.build(e,_),this.programManager.setArtifact(x,$),se("info",()=>`[artifact] key: ${x}, programName: ${e.name}`)),p&&$.uniformVariablesInfo){if(p.length!==$.uniformVariablesInfo.length)throw new Error(`Uniform variables count mismatch: expect ${$.uniformVariablesInfo.length}, got ${p.length} in program "${$.programInfo.name}".`);for(let T=0;T<p.length;T++){let I=p[T],A=I.type,E=typeof I.data=="number"?1:I.data.length,[O,w]=$.uniformVariablesInfo[T];if(A!==O||E!==w)throw new Error(`Uniform variable ${T} mismatch: expect type ${O} with size ${w}, got type ${A} with size ${E} in program "${$.programInfo.name}".`)}}if(se("info",()=>`[ProgramManager] run "${e.name}" (key=${x}) with ${_[0]}x${_[1]}x${_[2]}`),this.queryType!=="none"||this.sessionStatus==="capturing"){let T={kernelId:this.currentKernelId,programName:$.programInfo.name,inputTensorViews:r,outputTensorViews:g};this.pendingKernels.push(T),this.sessionStatus==="capturing"&&this.capturedPendingKernels.get(this.currentSessionId).push(T)}return this.programManager.run($,u,y,_,b),Re(e.name),g}upload(e,r){this.gpuDataManager.upload(e,r)}memcpy(e,r){this.gpuDataManager.memcpy(e,r)}async download(e,r){await this.gpuDataManager.download(e,r)}alloc(e){return this.gpuDataManager.create(e).id}free(e){return this.gpuDataManager.release(e)}createKernel(e,r,n,o){let i=Qc.get(e);if(!i)throw new Error(`kernel not implemented: ${e}`);let a={kernelType:e,kernelName:o,kernelEntry:i[0],attributes:[i[1],n]};this.kernels.set(r,a)}releaseKernel(e){let r=this.kernelPersistentData.get(e);if(r){for(let n of r)this.gpuDataManager.release(n.id);this.kernelPersistentData.delete(e)}this.kernelCustomData.delete(e),this.kernels.delete(e)}computeKernel(e,r,n){let o=this.kernels.get(e);if(!o)throw new Error(`kernel not created: ${e}`);let i=o.kernelType,a=o.kernelName,u=o.kernelEntry,d=o.attributes;if(this.currentKernelId!==null)throw new Error(`kernel "[${i}] ${a}" is not allowed to be called recursively`);this.currentKernelId=e,d[0]&&(d[1]=d[0](d[1]),d[0]=void 0),se("info",()=>`[WebGPU] Start to run kernel "[${i}] ${a}"...`);let c=this.env.debug;this.temporaryData=[];try{return c&&this.device.pushErrorScope("validation"),u(r,d[1]),0}catch(p){return n.push(Promise.resolve(`[WebGPU] Kernel "[${i}] ${a}" failed. ${p}`)),1}finally{c&&n.push(this.device.popErrorScope().then(p=>p?`GPU validation error for kernel "[${i}] ${a}": ${p.message}`:null));for(let p of this.temporaryData)this.gpuDataManager.release(p.id);this.temporaryData=[],this.currentKernelId=null}}registerBuffer(e,r,n,o){let i=this.sessionExternalDataMapping.get(e);i||(i=new Map,this.sessionExternalDataMapping.set(e,i));let a=i.get(r),u=this.gpuDataManager.registerExternalBuffer(n,o,a);return i.set(r,[u,n]),u}unregisterBuffers(e){let r=this.sessionExternalDataMapping.get(e);r&&(r.forEach(n=>this.gpuDataManager.unregisterExternalBuffer(n[0])),this.sessionExternalDataMapping.delete(e))}getBuffer(e){let r=this.gpuDataManager.get(e);if(!r)throw new Error(`no GPU data for buffer: ${e}`);return r.buffer}createDownloader(e,r,n){return async()=>{let o=await mo(this,e,r);return Fr(o.buffer,n)}}writeTimestamp(e){this.queryType==="inside-passes"&&this.computePassEncoder.writeTimestamp(this.querySet,e)}setQueryType(){this.queryType="none",(this.env.webgpu.profiling?.mode==="default"||(typeof this.env.trace>"u"?this.env.wasm.trace:this.env.trace))&&(this.device.features.has("chromium-experimental-timestamp-query-inside-passes")?this.queryType="inside-passes":this.device.features.has("timestamp-query")&&(this.queryType="at-passes"),this.queryType!=="none"&&typeof this.querySet>"u"&&(this.querySet=this.device.createQuerySet({type:"timestamp",count:this.maxDispatchNumber*2}),this.queryResolveBuffer=this.device.createBuffer({size:this.maxDispatchNumber*2*8,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.QUERY_RESOLVE})))}captureBegin(){se("info","captureBegin"),this.capturedCommandList.get(this.currentSessionId)||this.capturedCommandList.set(this.currentSessionId,[]),this.capturedPendingKernels.get(this.currentSessionId)||this.capturedPendingKernels.set(this.currentSessionId,[]),this.flush(),this.sessionStatus="capturing"}captureEnd(){se("info","captureEnd"),this.flush(),this.sessionStatus="default"}replay(){se("info","replay"),this.sessionStatus="replaying";let e=this.capturedCommandList.get(this.currentSessionId),r=this.capturedPendingKernels.get(this.currentSessionId),n=e.length;this.pendingKernels=[];for(let o=0;o<n;o++){let i=this.getComputePassEncoder(),a=e[o];this.writeTimestamp(this.pendingDispatchNumber*2),i.setPipeline(a.computePipeline),i.setBindGroup(0,a.bindGroup),i.dispatchWorkgroups(...a.dispatchGroup),this.writeTimestamp(this.pendingDispatchNumber*2+1),this.pendingDispatchNumber++,this.queryType!=="none"&&this.pendingKernels.push(r[o]),(this.pendingDispatchNumber>=this.maxDispatchNumber||this.queryType==="at-passes")&&this.endComputePass(),this.pendingDispatchNumber>=this.maxDispatchNumber&&this.flush()}this.flush(),this.sessionStatus="default"}onCreateSession(){this.gpuDataManager.onCreateSession()}onReleaseSession(e){this.unregisterBuffers(e),this.capturedCommandList.has(e)&&this.capturedCommandList.delete(e),this.capturedPendingKernels.has(e)&&this.capturedPendingKernels.delete(e),this.gpuDataManager.onReleaseSession(e)}onRunStart(e){this.currentSessionId=e,this.setQueryType()}}});var tp={};Wt(tp,{init:()=>ly});var lr,No,ly,rp=V(()=>{"use strict";ee();nt();te();Ls();lr=class t{constructor(e,r,n,o){this.module=e;this.dataType=r;this.data=n;this.dims=o}getFloat32Array(){if(this.dataType!==1)throw new Error("Invalid data type");let e=k.size(this.dims);return e===0?new Float32Array:new Float32Array(this.module.HEAP8.buffer,this.data,e)}getBigInt64Array(){if(this.dataType!==7)throw new Error("Invalid data type");let e=k.size(this.dims);return e===0?new BigInt64Array:new BigInt64Array(this.module.HEAP8.buffer,this.data,e)}getInt32Array(){if(this.dataType!==6)throw new Error("Invalid data type");let e=k.size(this.dims);return e===0?new Int32Array:new Int32Array(this.module.HEAP8.buffer,this.data,e)}getUint16Array(){if(this.dataType!==10&&this.dataType!==4)throw new Error("Invalid data type");let e=k.size(this.dims);return e===0?new Uint16Array:new Uint16Array(this.module.HEAP8.buffer,this.data,e)}reshape(e){if(k.size(e)!==k.size(this.dims))throw new Error("Invalid new shape");return new t(this.module,this.dataType,this.data,e)}},No=class{constructor(e,r,n){this.module=e;this.backend=r;this.customDataOffset=0;this.customDataSize=0;this.adapterInfo=r.adapterInfo;let o=e.PTR_SIZE,i=n/e.PTR_SIZE,a=o===4?"i32":"i64";this.opKernelContext=Number(e.getValue(o*i++,a));let u=Number(e.getValue(o*i++,a));this.outputCount=Number(e.getValue(o*i++,a)),this.customDataOffset=Number(e.getValue(o*i++,"*")),this.customDataSize=Number(e.getValue(o*i++,a));let d=[];for(let c=0;c<u;c++){let p=Number(e.getValue(o*i++,a)),m=Number(e.getValue(o*i++,"*")),g=Number(e.getValue(o*i++,a)),y=[];for(let b=0;b<g;b++)y.push(Number(e.getValue(o*i++,a)));d.push(new lr(e,p,m,y))}this.inputs=d}get kernelCustomData(){return this.backend.currentKernelCustomData}get customDataBuffer(){return this.module.HEAPU8.subarray(this.customDataOffset,this.customDataOffset+this.customDataSize)}compute(e,r){let n=r?.inputs?.map(u=>typeof u=="number"?this.inputs[u]:u)??this.inputs,o=r?.outputs??[],i=(u,d,c)=>new lr(this.module,d,this.output(u,c),c),a=(u,d)=>{let c=xt(u,d);if(!c)throw new Error(`Unsupported data type: ${u}`);let p=c>0?this.backend.gpuDataManager.create(c).id:0;return new lr(this.module,u,p,d)};return this.backend.run(e,n,o,i,a,this.outputCount)}output(e,r){let n=this.module.stackSave();try{let o=this.module.PTR_SIZE,i=o===4?"i32":"i64",a=this.module.stackAlloc((1+r.length)*o);this.module.setValue(a,r.length,i);for(let u=0;u<r.length;u++)this.module.setValue(a+o*(u+1),r[u],i);return this.module._JsepOutput(this.opKernelContext,e,a)}catch(o){throw new Error(`Failed to generate kernel's output[${e}] with dims [${r}]. If you are running with pre-allocated output, please make sure the output type/dims are correct. Error: ${o}`)}finally{this.module.stackRestore(n)}}},ly=async(t,e,r,n)=>{let o=e.jsepInit;if(!o)throw new Error("Failed to initialize JSEP. The WebAssembly module is not built with JSEP support.");if(t==="webgpu"){let i=(ep(),er(Jc)).WebGpuBackend,a=new i;await a.initialize(r,n),o("webgpu",[a,u=>a.alloc(Number(u)),u=>a.free(u),(u,d,c,p=!1)=>{if(p)se("verbose",()=>`[WebGPU] jsepCopyGpuToGpu: src=${Number(u)}, dst=${Number(d)}, size=${Number(c)}`),a.memcpy(Number(u),Number(d));else{se("verbose",()=>`[WebGPU] jsepCopyCpuToGpu: dataOffset=${Number(u)}, gpuDataId=${Number(d)}, size=${Number(c)}`);let m=e.HEAPU8.subarray(Number(u>>>0),Number(u>>>0)+Number(c));a.upload(Number(d),m)}},async(u,d,c)=>{se("verbose",()=>`[WebGPU] jsepCopyGpuToCpu: gpuDataId=${u}, dataOffset=${d}, size=${c}`),await a.download(Number(u),()=>e.HEAPU8.subarray(Number(d)>>>0,Number(d+c)>>>0))},(u,d,c)=>a.createKernel(u,Number(d),c,e.UTF8ToString(e._JsepGetNodeName(Number(d)))),u=>a.releaseKernel(u),(u,d,c,p)=>{se("verbose",()=>`[WebGPU] jsepRun: sessionHandle=${c}, kernel=${u}, contextDataOffset=${d}`);let m=new No(e,a,Number(d));return a.computeKernel(Number(u),m,p)},()=>a.captureBegin(),()=>a.captureEnd(),()=>a.replay()])}else{let i=new Zr(r);o("webnn",[i,()=>i.reserveTensorId(),a=>i.releaseTensorId(a),async(a,u,d,c,p)=>i.ensureTensor(a,u,d,c,p),(a,u)=>{i.uploadTensor(a,u)},async(a,u)=>i.downloadTensor(a,u),(a,u)=>i.registerMLContext(a,u),!!r.trace])}}});var cy,Dr,Or,Ut,py,np,rr,Br,zr,op,Mr,Rr,Ur,Jn=V(()=>{"use strict";Le();As();ks();ee();vt();Vr();io();cy=(t,e)=>{ye()._OrtInit(t,e)!==0&&me("Can't initialize onnxruntime.")},Dr=async t=>{cy(t.wasm.numThreads,or(t.logLevel))},Or=async(t,e)=>{ye().asyncInit?.();let r=t.webgpu.adapter;if(e==="webgpu"){if(typeof navigator>"u"||!navigator.gpu)throw new Error("WebGPU is not supported in current environment");if(r){if(typeof r.limits!="object"||typeof r.features!="object"||typeof r.requestDevice!="function")throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.")}else{let n=t.webgpu.powerPreference;if(n!==void 0&&n!=="low-power"&&n!=="high-performance")throw new Error(`Invalid powerPreference setting: "${n}"`);let o=t.webgpu.forceFallbackAdapter;if(o!==void 0&&typeof o!="boolean")throw new Error(`Invalid forceFallbackAdapter setting: "${o}"`);if(r=await navigator.gpu.requestAdapter({powerPreference:n,forceFallbackAdapter:o}),!r)throw new Error('Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.')}}if(e==="webnn"&&(typeof navigator>"u"||!navigator.ml))throw new Error("WebNN is not supported in current environment");{let n=(rp(),er(tp)).init;e==="webgpu"&&await n("webgpu",ye(),t,r),e==="webnn"&&await n("webnn",ye(),t)}},Ut=new Map,py=t=>{let e=ye(),r=e.stackSave();try{let n=e.PTR_SIZE,o=e.stackAlloc(2*n);e._OrtGetInputOutputCount(t,o,o+n)!==0&&me("Can't get session input/output count.");let a=n===4?"i32":"i64";return[Number(e.getValue(o,a)),Number(e.getValue(o+n,a))]}finally{e.stackRestore(r)}},np=(t,e)=>{let r=ye(),n=r.stackSave(),o=0;try{let i=r.PTR_SIZE,a=r.stackAlloc(2*i);r._OrtGetInputOutputMetadata(t,e,a,a+i)!==0&&me("Can't get session input/output metadata.");let d=Number(r.getValue(a,"*"));o=Number(r.getValue(a+i,"*"));let c=r.HEAP32[o/4];if(c===0)return[d,0];let p=r.HEAPU32[o/4+1],m=[];for(let g=0;g<p;g++){let y=Number(r.getValue(o+8+g*i,"*"));m.push(y!==0?r.UTF8ToString(y):Number(r.getValue(o+8+(g+p)*i,"*")))}return[d,c,m]}finally{r.stackRestore(n),o!==0&&r._OrtFree(o)}},rr=t=>{let e=ye(),r=e._malloc(t.byteLength);if(r===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${t.byteLength}.`);return e.HEAPU8.set(t,r),[r,t.byteLength]},Br=async(t,e)=>{let r,n,o=ye();Array.isArray(t)?[r,n]=t:t.buffer===o.HEAPU8.buffer?[r,n]=[t.byteOffset,t.byteLength]:[r,n]=rr(t);let i=0,a=0,u=0,d=[],c=[],p=[];try{if([a,d]=await Es(e),e?.externalData&&o.mountExternalData){let I=[];for(let A of e.externalData){let E=typeof A=="string"?A:A.path,O=typeof A=="string"?A:A.data;I.push(ir(O).then(w=>{o.mountExternalData(E,w)}))}await Promise.all(I)}for(let I of e?.executionProviders??[])if((typeof I=="string"?I:I.name)==="webnn"){if(o.shouldTransferToMLTensor=!1,typeof I!="string"){let E=I,O=E?.context,w=E?.gpuDevice,U=E?.deviceType,N=E?.powerPreference;O?o.currentContext=O:w?o.currentContext=await o.webnnCreateMLContext(w):o.currentContext=await o.webnnCreateMLContext({deviceType:U,powerPreference:N})}else o.currentContext=await o.webnnCreateMLContext();break}i=await o._OrtCreateSession(r,n,a),o.webgpuOnCreateSession?.(i),i===0&&me("Can't create a session."),o.jsepOnCreateSession?.(),o.currentContext&&(o.webnnRegisterMLContext(i,o.currentContext),o.currentContext=void 0,o.shouldTransferToMLTensor=!0);let[m,g]=py(i),y=!!e?.enableGraphCapture,b=[],_=[],S=[],x=[],$=[];for(let I=0;I<m;I++){let[A,E,O]=np(i,I);A===0&&me("Can't get an input name."),c.push(A);let w=o.UTF8ToString(A);b.push(w),S.push(E===0?{name:w,isTensor:!1}:{name:w,isTensor:!0,type:rt(E),shape:O})}for(let I=0;I<g;I++){let[A,E,O]=np(i,I+m);A===0&&me("Can't get an output name."),p.push(A);let w=o.UTF8ToString(A);_.push(w),x.push(E===0?{name:w,isTensor:!1}:{name:w,isTensor:!0,type:rt(E),shape:O});{if(y&&e?.preferredOutputLocation===void 0){$.push("gpu-buffer");continue}let U=typeof e?.preferredOutputLocation=="string"?e.preferredOutputLocation:e?.preferredOutputLocation?.[w]??"cpu",N=o.webnnIsGraphOutput;if(U==="cpu"&&N&&N(i,w)){$.push("ml-tensor-cpu-output");continue}if(U!=="cpu"&&U!=="cpu-pinned"&&U!=="gpu-buffer"&&U!=="ml-tensor")throw new Error(`Not supported preferred output location: ${U}.`);if(y&&U!=="gpu-buffer")throw new Error(`Not supported preferred output location: ${U}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`);$.push(U)}}let T=null;return $.some(I=>I==="gpu-buffer"||I==="ml-tensor"||I==="ml-tensor-cpu-output")&&(u=o._OrtCreateBinding(i),u===0&&me("Can't create IO binding."),T={handle:u,outputPreferredLocations:$,outputPreferredLocationsEncoded:$.map(I=>I==="ml-tensor-cpu-output"?"ml-tensor":I).map(I=>oo(I))}),Ut.set(i,[i,c,p,T,y,!1]),[i,b,_,S,x]}catch(m){throw c.forEach(g=>o._OrtFree(g)),p.forEach(g=>o._OrtFree(g)),u!==0&&o._OrtReleaseBinding(u)!==0&&me("Can't release IO binding."),i!==0&&o._OrtReleaseSession(i)!==0&&me("Can't release session."),m}finally{o._free(r),a!==0&&o._OrtReleaseSessionOptions(a)!==0&&me("Can't release session options."),d.forEach(m=>o._free(m)),o.unmountExternalData?.()}},zr=t=>{let e=ye(),r=Ut.get(t);if(!r)throw new Error(`cannot release session. invalid session id: ${t}`);let[n,o,i,a,u]=r;a&&(u&&e._OrtClearBoundOutputs(a.handle)!==0&&me("Can't clear bound outputs."),e._OrtReleaseBinding(a.handle)!==0&&me("Can't release IO binding.")),e.jsepOnReleaseSession?.(t),e.webnnOnReleaseSession?.(t),e.webgpuOnReleaseSession?.(t),o.forEach(d=>e._OrtFree(d)),i.forEach(d=>e._OrtFree(d)),e._OrtReleaseSession(n)!==0&&me("Can't release session."),Ut.delete(t)},op=async(t,e,r,n,o,i,a=!1)=>{if(!t){e.push(0);return}let u=ye(),d=u.PTR_SIZE,c=t[0],p=t[1],m=t[3],g=m,y,b;if(c==="string"&&(m==="gpu-buffer"||m==="ml-tensor"))throw new Error("String tensor is not supported on GPU.");if(a&&m!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${i} when enableGraphCapture is true.`);if(m==="gpu-buffer"){let x=t[2].gpuBuffer;b=xt($t(c),p);{let $=u.jsepRegisterBuffer;if(!$)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');y=$(n,i,x,b)}}else if(m==="ml-tensor"){let x=t[2].mlTensor;b=xt($t(c),p);let $=u.webnnRegisterMLTensor;if(!$)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');y=$(n,x,$t(c),p)}else{let x=t[2];if(Array.isArray(x)){b=d*x.length,y=u._malloc(b),r.push(y);for(let $=0;$<x.length;$++){if(typeof x[$]!="string")throw new TypeError(`tensor data at index ${$} is not a string`);u.setValue(y+$*d,Ge(x[$],r),"*")}}else{let $=u.webnnIsGraphInput,T=u.webnnIsGraphOutput;if(c!=="string"&&$&&T){let I=u.UTF8ToString(o);if($(n,I)||T(n,I)){let A=$t(c);b=xt(A,p),g="ml-tensor";let E=u.webnnCreateTemporaryTensor,O=u.webnnUploadTensor;if(!E||!O)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');let w=await E(n,A,p);O(w,new Uint8Array(x.buffer,x.byteOffset,x.byteLength)),y=w}else b=x.byteLength,y=u._malloc(b),r.push(y),u.HEAPU8.set(new Uint8Array(x.buffer,x.byteOffset,b),y)}else b=x.byteLength,y=u._malloc(b),r.push(y),u.HEAPU8.set(new Uint8Array(x.buffer,x.byteOffset,b),y)}}let _=u.stackSave(),S=u.stackAlloc(4*p.length);try{p.forEach(($,T)=>u.setValue(S+T*d,$,d===4?"i32":"i64"));let x=u._OrtCreateTensor($t(c),y,b,S,p.length,oo(g));x===0&&me(`Can't create tensor for input/output. session=${n}, index=${i}.`),e.push(x)}finally{u.stackRestore(_)}},Mr=async(t,e,r,n,o,i)=>{let a=ye(),u=a.PTR_SIZE,d=Ut.get(t);if(!d)throw new Error(`cannot run inference. invalid session id: ${t}`);let c=d[0],p=d[1],m=d[2],g=d[3],y=d[4],b=d[5],_=e.length,S=n.length,x=0,$=[],T=[],I=[],A=[],E=[],O=a.stackSave(),w=a.stackAlloc(_*u),U=a.stackAlloc(_*u),N=a.stackAlloc(S*u),F=a.stackAlloc(S*u);try{[x,$]=Cs(i),_t("wasm prepareInputOutputTensor");for(let L=0;L<_;L++)await op(r[L],T,A,t,p[e[L]],e[L],y);for(let L=0;L<S;L++)await op(o[L],I,A,t,m[n[L]],_+n[L],y);wt("wasm prepareInputOutputTensor");for(let L=0;L<_;L++)a.setValue(w+L*u,T[L],"*"),a.setValue(U+L*u,p[e[L]],"*");for(let L=0;L<S;L++)a.setValue(N+L*u,I[L],"*"),a.setValue(F+L*u,m[n[L]],"*");if(g&&!b){let{handle:L,outputPreferredLocations:Q,outputPreferredLocationsEncoded:Y}=g;if(p.length!==_)throw new Error(`input count from feeds (${_}) is expected to be always equal to model's input count (${p.length}).`);_t("wasm bindInputsOutputs");for(let Z=0;Z<_;Z++){let ne=e[Z];await a._OrtBindInput(L,p[ne],T[Z])!==0&&me(`Can't bind input[${Z}] for session=${t}.`)}for(let Z=0;Z<S;Z++){let ne=n[Z];o[Z]?.[3]?(E.push(I[Z]),a._OrtBindOutput(L,m[ne],I[Z],0)!==0&&me(`Can't bind pre-allocated output[${Z}] for session=${t}.`)):a._OrtBindOutput(L,m[ne],0,Y[ne])!==0&&me(`Can't bind output[${Z}] to ${Q[Z]} for session=${t}.`)}wt("wasm bindInputsOutputs"),Ut.set(t,[c,p,m,g,y,!0])}a.jsepOnRunStart?.(c),a.webnnOnRunStart?.(c);let q;g?q=await a._OrtRunWithBinding(c,g.handle,S,N,x):q=await a._OrtRun(c,U,w,_,F,S,N,x),q!==0&&me("failed to call OrtRun().");let X=[],B=[];_t("wasm ProcessOutputTensor");for(let L=0;L<S;L++){let Q=Number(a.getValue(N+L*u,"*"));if(Q===I[L]||E.includes(I[L])){X.push(o[L]),Q!==I[L]&&a._OrtReleaseTensor(Q)!==0&&me("Can't release tensor.");continue}let Y=a.stackSave(),Z=a.stackAlloc(4*u),ne=!1,ie,ce=0;try{a._OrtGetTensorData(Q,Z,Z+u,Z+2*u,Z+3*u)!==0&&me(`Can't access output tensor data on index ${L}.`);let ve=u===4?"i32":"i64",M=Number(a.getValue(Z,ve));ce=a.getValue(Z+u,"*");let G=a.getValue(Z+u*2,"*"),be=Number(a.getValue(Z+u*3,ve)),ke=[];for(let ge=0;ge<be;ge++)ke.push(Number(a.getValue(G+ge*u,ve)));a._OrtFree(G)!==0&&me("Can't free memory for tensor dims.");let $e=ke.reduce((ge,Te)=>ge*Te,1);ie=rt(M);let De=g?.outputPreferredLocations[n[L]];if(ie==="string"){if(De==="gpu-buffer"||De==="ml-tensor")throw new Error("String tensor is not supported on GPU.");let ge=[];for(let Te=0;Te<$e;Te++){let qe=a.getValue(ce+Te*u,"*"),Ne=a.getValue(ce+(Te+1)*u,"*"),xe=Te===$e-1?void 0:Ne-qe;ge.push(a.UTF8ToString(qe,xe))}X.push([ie,ke,ge,"cpu"])}else if(De==="gpu-buffer"&&$e>0){let ge=a.jsepGetBuffer;if(!ge)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let Te=ge(ce),qe=xt(M,$e);if(qe===void 0||!Lr(ie))throw new Error(`Unsupported data type: ${ie}`);ne=!0,X.push([ie,ke,{gpuBuffer:Te,download:a.jsepCreateDownloader(Te,qe,ie),dispose:()=>{a._OrtReleaseTensor(Q)!==0&&me("Can't release tensor.")}},"gpu-buffer"])}else if(De==="ml-tensor"&&$e>0){let ge=a.webnnEnsureTensor,Te=a.webnnIsGraphInputOutputTypeSupported;if(!ge||!Te)throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');if(xt(M,$e)===void 0||!Wr(ie))throw new Error(`Unsupported data type: ${ie}`);if(!Te(t,ie,!1))throw new Error(`preferredLocation "ml-tensor" for ${ie} output is not supported by current WebNN Context.`);let Ne=await ge(t,ce,M,ke,!1);ne=!0,X.push([ie,ke,{mlTensor:Ne,download:a.webnnCreateMLTensorDownloader(ce,ie),dispose:()=>{a.webnnReleaseTensorId(ce),a._OrtReleaseTensor(Q)}},"ml-tensor"])}else if(De==="ml-tensor-cpu-output"&&$e>0){let ge=a.webnnCreateMLTensorDownloader(ce,ie)(),Te=X.length;ne=!0,B.push((async()=>{let qe=[Te,await ge];return a.webnnReleaseTensorId(ce),a._OrtReleaseTensor(Q),qe})()),X.push([ie,ke,[],"cpu"])}else{let ge=Ht(ie),Te=new ge($e);new Uint8Array(Te.buffer,Te.byteOffset,Te.byteLength).set(a.HEAPU8.subarray(ce,ce+Te.byteLength)),X.push([ie,ke,Te,"cpu"])}}finally{a.stackRestore(Y),ie==="string"&&ce&&a._free(ce),ne||a._OrtReleaseTensor(Q)}}g&&!y&&(a._OrtClearBoundOutputs(g.handle)!==0&&me("Can't clear bound outputs."),Ut.set(t,[c,p,m,g,y,!1]));for(let[L,Q]of await Promise.all(B))X[L][2]=Q;return wt("wasm ProcessOutputTensor"),X}finally{a.webnnOnRunEnd?.(c),a.stackRestore(O),T.forEach(q=>a._OrtReleaseTensor(q)),I.forEach(q=>a._OrtReleaseTensor(q)),A.forEach(q=>a._free(q)),x!==0&&a._OrtReleaseRunOptions(x),$.forEach(q=>a._free(q))}},Rr=t=>{let e=ye(),r=Ut.get(t);if(!r)throw new Error("invalid session id");let n=r[0],o=e._OrtEndProfiling(n);o===0&&me("Can't get an profile file name."),e._OrtFree(o)},Ur=t=>{let e=[];for(let r of t){let n=r[2];!Array.isArray(n)&&"buffer"in n&&e.push(n.buffer)}return e}});var Nt,Fe,cr,yn,_n,bn,Vo,Lo,jt,Zt,fy,ip,ap,sp,up,dp,lp,cp,Wo=V(()=>{"use strict";Le();Jn();vt();kr();Nt=()=>!!_e.wasm.proxy&&typeof document<"u",cr=!1,yn=!1,_n=!1,Lo=new Map,jt=(t,e)=>{let r=Lo.get(t);r?r.push(e):Lo.set(t,[e])},Zt=()=>{if(cr||!yn||_n||!Fe)throw new Error("worker not ready")},fy=t=>{switch(t.data.type){case"init-wasm":cr=!1,t.data.err?(_n=!0,Vo[1](t.data.err)):(yn=!0,Vo[0]()),bn&&(URL.revokeObjectURL(bn),bn=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let e=Lo.get(t.data.type);t.data.err?e.shift()[1](t.data.err):e.shift()[0](t.data.out);break}default:}},ip=async()=>{if(!yn){if(cr)throw new Error("multiple calls to 'initWasm()' detected.");if(_n)throw new Error("previous call to 'initWasm()' failed.");if(cr=!0,Nt())return new Promise((t,e)=>{Fe?.terminate(),Ss().then(([r,n])=>{try{Fe=n,Fe.onerror=i=>e(i),Fe.onmessage=fy,Vo=[t,e];let o={type:"init-wasm",in:_e};!o.in.wasm.wasmPaths&&(r||to)&&(o.in.wasm.wasmPaths={wasm:new URL("ort-wasm-simd-threaded.jsep.wasm",import.meta.url).href}),Fe.postMessage(o),bn=r}catch(o){e(o)}},e)});try{await Pr(_e.wasm),await Dr(_e),yn=!0}catch(t){throw _n=!0,t}finally{cr=!1}}},ap=async t=>{if(Nt())return Zt(),new Promise((e,r)=>{jt("init-ep",[e,r]);let n={type:"init-ep",in:{epName:t,env:_e}};Fe.postMessage(n)});await Or(_e,t)},sp=async t=>Nt()?(Zt(),new Promise((e,r)=>{jt("copy-from",[e,r]);let n={type:"copy-from",in:{buffer:t}};Fe.postMessage(n,[t.buffer])})):rr(t),up=async(t,e)=>{if(Nt()){if(e?.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return Zt(),new Promise((r,n)=>{jt("create",[r,n]);let o={type:"create",in:{model:t,options:{...e}}},i=[];t instanceof Uint8Array&&i.push(t.buffer),Fe.postMessage(o,i)})}else return Br(t,e)},dp=async t=>{if(Nt())return Zt(),new Promise((e,r)=>{jt("release",[e,r]);let n={type:"release",in:t};Fe.postMessage(n)});zr(t)},lp=async(t,e,r,n,o,i)=>{if(Nt()){if(r.some(a=>a[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(o.some(a=>a))throw new Error("pre-allocated output tensor is not supported for proxy.");return Zt(),new Promise((a,u)=>{jt("run",[a,u]);let d=r,c={type:"run",in:{sessionId:t,inputIndices:e,inputs:d,outputIndices:n,options:i}};Fe.postMessage(c,Ur(d))})}else return Mr(t,e,r,n,o,i)},cp=async t=>{if(Nt())return Zt(),new Promise((e,r)=>{jt("end-profiling",[e,r]);let n={type:"end-profiling",in:t};Fe.postMessage(n)});Rr(t)}});var pp,hy,wn,mp=V(()=>{"use strict";Le();Wo();ee();Er();io();pp=(t,e)=>{switch(t.location){case"cpu":return[t.type,t.dims,t.data,"cpu"];case"gpu-buffer":return[t.type,t.dims,{gpuBuffer:t.gpuBuffer},"gpu-buffer"];case"ml-tensor":return[t.type,t.dims,{mlTensor:t.mlTensor},"ml-tensor"];default:throw new Error(`invalid data location: ${t.location} for ${e()}`)}},hy=t=>{switch(t[3]){case"cpu":return new je(t[0],t[2],t[1]);case"gpu-buffer":{let e=t[0];if(!Lr(e))throw new Error(`not supported data type: ${e} for deserializing GPU tensor`);let{gpuBuffer:r,download:n,dispose:o}=t[2];return je.fromGpuBuffer(r,{dataType:e,dims:t[1],download:n,dispose:o})}case"ml-tensor":{let e=t[0];if(!Wr(e))throw new Error(`not supported data type: ${e} for deserializing MLTensor tensor`);let{mlTensor:r,download:n,dispose:o}=t[2];return je.fromMLTensor(r,{dataType:e,dims:t[1],download:n,dispose:o})}default:throw new Error(`invalid data location: ${t[3]}`)}},wn=class{async fetchModelAndCopyToWasmMemory(e){return sp(await ir(e))}async loadModel(e,r){Ve();let n;typeof e=="string"?n=await this.fetchModelAndCopyToWasmMemory(e):n=e,[this.sessionId,this.inputNames,this.outputNames,this.inputMetadata,this.outputMetadata]=await up(n,r),Re()}async dispose(){return dp(this.sessionId)}async run(e,r,n){Ve();let o=[],i=[];Object.entries(e).forEach(g=>{let y=g[0],b=g[1],_=this.inputNames.indexOf(y);if(_===-1)throw new Error(`invalid input '${y}'`);o.push(b),i.push(_)});let a=[],u=[];Object.entries(r).forEach(g=>{let y=g[0],b=g[1],_=this.outputNames.indexOf(y);if(_===-1)throw new Error(`invalid output '${y}'`);a.push(b),u.push(_)});let d=o.map((g,y)=>pp(g,()=>`input "${this.inputNames[i[y]]}"`)),c=a.map((g,y)=>g?pp(g,()=>`output "${this.outputNames[u[y]]}"`):null),p=await lp(this.sessionId,i,d,u,c,n),m={};for(let g=0;g<p.length;g++)m[this.outputNames[u[g]]]=a[g]??hy(p[g]);return Re(),m}startProfiling(){}endProfiling(){cp(this.sessionId)}}});var hp={};Wt(hp,{OnnxruntimeWebAssemblyBackend:()=>vn,initializeFlags:()=>fp,wasmBackend:()=>gy});var fp,vn,gy,gp=V(()=>{"use strict";Le();Wo();mp();fp=()=>{(typeof _e.wasm.initTimeout!="number"||_e.wasm.initTimeout<0)&&(_e.wasm.initTimeout=0);let t=_e.wasm.simd;if(typeof t!="boolean"&&t!==void 0&&t!=="fixed"&&t!=="relaxed"&&(console.warn(`Property "env.wasm.simd" is set to unknown value "${t}". Reset it to \`false\` and ignore SIMD feature checking.`),_e.wasm.simd=!1),typeof _e.wasm.proxy!="boolean"&&(_e.wasm.proxy=!1),typeof _e.wasm.trace!="boolean"&&(_e.wasm.trace=!1),typeof _e.wasm.numThreads!="number"||!Number.isInteger(_e.wasm.numThreads)||_e.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)_e.wasm.numThreads=1;else{let e=typeof navigator>"u"?qn("node:os").cpus().length:navigator.hardwareConcurrency;_e.wasm.numThreads=Math.min(4,Math.ceil((e||1)/2))}},vn=class{async init(e){fp(),await ip(),await ap(e)}async createInferenceSessionHandler(e,r){let n=new wn;return await n.loadModel(e,r),n}},gy=new vn});Le();Le();Le();var cs="1.30.0";var BT=Xn;{let t=(gp(),er(hp)).wasmBackend;Pt("webgpu",t,5),Pt("webnn",t,5),Pt("cpu",t,10),Pt("wasm",t,10)}Object.defineProperty(_e.versions,"web",{value:cs,enumerable:!0});export{Bf as InferenceSession,Cr as TRACE,_t as TRACE_EVENT_BEGIN,wt as TRACE_EVENT_END,Ve as TRACE_FUNC_BEGIN,Re as TRACE_FUNC_END,je as Tensor,BT as default,_e as env,Pt as registerBackend};
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
//# sourceMappingURL=ort.bundle.min.mjs.map
