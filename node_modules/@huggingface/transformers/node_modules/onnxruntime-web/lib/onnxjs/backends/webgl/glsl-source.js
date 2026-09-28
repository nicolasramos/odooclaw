'use strict';
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, '__esModule', { value: true });
exports.getGlsl = getGlsl;
exports.getVertexShaderSource = getVertexShaderSource;
exports.getFragShaderPreamble = getFragShaderPreamble;
exports.getDefaultFragShaderMain = getDefaultFragShaderMain;
const GLSL_ES_2_0 = {
  version: '',
  attribute: 'attribute',
  varyingVertex: 'varying',
  varyingFrag: 'varying',
  texture2D: 'texture2D',
  output: 'gl_FragColor',
  outputDeclaration: '',
};
const GLSL_ES_3_0 = {
  version: '#version 300 es',
  attribute: 'in',
  varyingVertex: 'out',
  varyingFrag: 'in',
  texture2D: 'texture',
  output: 'outputColor',
  outputDeclaration: 'out vec4 outputColor;',
};
function getGlsl(version) {
  return version === 1 ? GLSL_ES_2_0 : GLSL_ES_3_0;
}
function getVertexShaderSource(version) {
  const glsl = getGlsl(version);
  return `${glsl.version}
      precision highp float;
      ${glsl.attribute} vec3 position;
      ${glsl.attribute} vec2 textureCoord;

      ${glsl.varyingVertex} vec2 TexCoords;

      void main()
      {
          gl_Position = vec4(position, 1.0);
          TexCoords = textureCoord;
      }`;
}
function getFragShaderPreamble(version) {
  const glsl = getGlsl(version);
  return `${glsl.version}
    precision highp float;
    precision highp int;
    precision highp sampler2D;
    ${glsl.varyingFrag} vec2 TexCoords;
    ${glsl.outputDeclaration}
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

    `;
}
function getDefaultFragShaderMain(version, outputShapeLength) {
  const glsl = getGlsl(version);
  return `
  void main() {
    int indices[${outputShapeLength}];
    toVec(TexCoords, indices);
    vec4 result = vec4(process(indices));
    ${glsl.output} = result;
  }
  `;
}
//# sourceMappingURL=glsl-source.js.map
