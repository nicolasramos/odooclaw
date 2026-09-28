'use strict';
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, '__esModule', { value: true });
exports.getPackedShape = getPackedShape;
exports.repeatedTry = repeatedTry;
exports.generateShaderFuncNameFromInputSamplerName = generateShaderFuncNameFromInputSamplerName;
exports.generateShaderFuncNameFromInputSamplerNameAtOutCoords = generateShaderFuncNameFromInputSamplerNameAtOutCoords;
exports.squeezeInputShape = squeezeInputShape;
exports.getSqueezedParams = getSqueezedParams;
exports.getCoordsDataType = getCoordsDataType;
exports.getGlChannels = getGlChannels;
const util_1 = require('../../util');
/**
 * Given a non RGBA shape calculate the R version
 * It is assumed that the dimensions are multiples of given channels
 * NOTE: it is always the last dim that gets packed.
 * @param unpackedShape original shape to create a packed version from
 */
function getPackedShape(unpackedShape) {
  const len = unpackedShape.length;
  return unpackedShape.slice(0, len - 1).concat(unpackedShape[len - 1] / 4);
}
async function repeatedTry(checkFn, delayFn = (_counter) => 0, maxCounter) {
  return new Promise((resolve, reject) => {
    let tryCount = 0;
    const tryFn = () => {
      if (checkFn()) {
        resolve();
        return;
      }
      tryCount++;
      const nextBackoff = delayFn(tryCount);
      if (maxCounter != null && tryCount >= maxCounter) {
        reject();
        return;
      }
      setTimeout(tryFn, nextBackoff);
    };
    tryFn();
  });
}
/**
 * Generates the function name from an input sampler name.
 * @param samplerName Name of the sampler.
 */
function generateShaderFuncNameFromInputSamplerName(samplerName) {
  (0, util_1.assert)(
    typeof samplerName !== 'undefined' && samplerName.length !== 0,
    () => 'empty string found for sampler name',
  );
  return 'get' + samplerName.charAt(0).toUpperCase() + samplerName.slice(1);
}
/**
 * Generates the function name from an input sampler name at output coordinates.
 * @param samplerName Name of the sampler.
 */
function generateShaderFuncNameFromInputSamplerNameAtOutCoords(samplerName) {
  (0, util_1.assert)(
    typeof samplerName !== 'undefined' && samplerName.length !== 0,
    () => 'empty string found for sampler name',
  );
  return 'get' + samplerName.charAt(0).toUpperCase() + samplerName.slice(1) + 'AtOutCoords';
}
/** Returns a new input shape (a copy) that has a squeezed logical shape. */
function squeezeInputShape(inputShape, squeezedShape) {
  // Deep copy.
  let newInputShape = JSON.parse(JSON.stringify(inputShape));
  newInputShape = squeezedShape;
  return newInputShape;
}
/** Returns a list of squeezed parameters for shader functions */
function getSqueezedParams(params, keptDims) {
  return keptDims.map((d) => params[d]).join(', ');
}
/** Returns the data type for different ranks. */
function getCoordsDataType(rank) {
  if (rank <= 1) {
    return 'int';
  } else if (rank === 2) {
    return 'ivec2';
  } else if (rank === 3) {
    return 'ivec3';
  } else if (rank === 4) {
    return 'ivec4';
  } else if (rank === 5) {
    return 'ivec5';
  } else if (rank === 6) {
    return 'ivec6';
  } else {
    throw Error(`GPU for rank ${rank} is not yet supported`);
  }
}
function getGlChannels(rank = 6) {
  return ['x', 'y', 'z', 'w', 'u', 'v'].slice(0, rank);
}
//# sourceMappingURL=utils.js.map
