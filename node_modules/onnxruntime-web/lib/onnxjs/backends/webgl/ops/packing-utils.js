'use strict';
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, '__esModule', { value: true });
exports.getVecChannels = getVecChannels;
exports.getChannels = getChannels;
exports.unpackFromChannel = unpackFromChannel;
const utils_1 = require('../utils');
function getVecChannels(name, rank) {
  return (0, utils_1.getGlChannels)(rank).map((d) => `${name}.${d}`);
}
function getChannels(name, rank) {
  if (rank === 1) {
    return [name];
  }
  return getVecChannels(name, rank);
}
function unpackFromChannel() {
  return `
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
  `;
}
//# sourceMappingURL=packing-utils.js.map
