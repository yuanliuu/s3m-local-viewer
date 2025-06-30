const taskProcessor = new Cesium.TaskProcessor('S3MBTilesParser')
taskProcessor.initWebAssemblyModule({
  modulePath: 'ThirdParty/Workers/draco_wasm_wrapper.js',
  wasmBinaryFile: 'ThirdParty/draco_decoder.wasm',
  fallbackModulePath: 'ThirdParty/Workers/draco_decoder.js',
})
taskProcessor.initWebAssemblyModule({
  modulePath: 'ThirdParty/crunch.js',
  wasmBinaryFile: 'ThirdParty/crunch.wasm',
})

export const parseS3MB = async (fileName, s3mbBuffer) => {
  const data = {
    buffer: s3mbBuffer,
  }
  const promise = taskProcessor.scheduleTask(data)
  if (!promise) {
    // throw new Error("parse error");
    return Promise.resolve()
  }
  const s3mbPackage = await promise
  return {
    fileName,
    // s3mbBuffer,
    s3mbPackage,
  }
}
