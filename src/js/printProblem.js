ConsoleLogHTML.connect(document.querySelector('.analysis-content')) // Redirect log messages

export const printProblem = (scpJson, s3mbPackage) => {
  const extensions = scpJson.extensions
  const fileType = extensions['s3m:FileType']
  const transparencyOptimization = extensions['s3m:TransparencyOptimization'] === 'TRUE'
  const material = s3mbPackage.matrials.material[0].material
  const bTransparentsorting = material.transparentsorting === true

  if (bTransparentsorting && !transparencyOptimization) {
    console.warn('scp.extensions：使用了透明材质，但未启用 "s3m:TransparencyOptimization"')
  }

  if (bTransparentsorting && fileType === 'OSGBCacheFile') {
    console.warn('scp.extensions["s3m:FileType"]：使用了透明材质，"OSGBCacheFile" 类型可能导致显示异常')
  }

  // 纹理尺寸2的倍数
}
