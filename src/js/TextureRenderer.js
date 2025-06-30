export class TextureRenderer {
  constructor(canvas) {
    // const canvas = document.createElement("canvas");
    // canvas.width = 1920;
    // canvas.height = 1080;
    this.context = new Cesium.Context(canvas)
  }

  parseMaterial(layer, s3mbPackage) {
    const context = this.context
    const texturePromises = []

    let materialTable = {}
    let materials = s3mbPackage.matrials
      ? s3mbPackage.matrials.material
      : Cesium.defaultValue(s3mbPackage.materials.material, s3mbPackage.materials.materials)
    for (let i = 0, j = materials.length; i < j; i++) {
      let material = materials[i].material
      let materialCode = Cesium.defaultValue(material.id, material.name)
      let materialPass = new Cesium.MaterialPass()
      materialTable[materialCode] = materialPass
      let ambient = Cesium.defaultValue(material.ambient, Cesium.Color.WHITE)
      materialPass.ambientColor = new Cesium.Color(ambient.r, ambient.g, ambient.b, ambient.a)
      let diffuse = Cesium.defaultValue(material.diffuse, Cesium.Color.WHITE)
      materialPass.diffuseColor = new Cesium.Color(diffuse.r, diffuse.g, diffuse.b, diffuse.a)
      let specular = Cesium.defaultValue(material.specular, Cesium.Color.WHITE)
      materialPass.specularColor = new Cesium.Color(specular.r, specular.g, specular.b, specular.a)
      materialPass.shininess = Cesium.defaultValue(material.shininess, 10)
      materialPass.bTransparentSorting = Cesium.defaultValue(material.transparentsorting, false)
      materialPass.alphaMode = material.alphaMode
      let textureStates = Cesium.defaultValue(material.textureunitstates, material.textureStates)
      let len = textureStates.length
      for (let k = 0; k < len; k++) {
        let textureState = Cesium.defaultValue(textureStates[k].textureunitstate, textureStates[k].textureUnitState)
        let textureCode = Cesium.defaultValue(textureState.id, textureState.textureName)
        let uAddressMode = Cesium.defaultValue(textureState.addressmode, textureState.uAddressMode)
        let wrapS = uAddressMode.u === 0 ? Cesium.TextureWrap.REPEAT : Cesium.TextureWrap.CLAMP_TO_EDGE
        let wrapT = uAddressMode.v === 0 ? Cesium.TextureWrap.REPEAT : Cesium.TextureWrap.CLAMP_TO_EDGE
        materialPass.texMatrix = Cesium.Matrix4.unpack(Cesium.defaultValue(textureState.texmodmatrix, textureState.matrix))
        let textureInfo = s3mbPackage.texturePackage[textureCode]

        var texUnitStateId = textureState.id
        var texId = texUnitStateId + context._id
        if (Cesium.defined(textureInfo)) {
          texId += textureInfo.imageBuffer.length
        }

        if (Cesium.defined(textureInfo)) {
          textureInfo.wrapS = wrapS
          textureInfo.wrapT = wrapT
          // let keyword = tile.fileName + textureCode;
          let keyword = textureCode
          let texture = context.textureCache.getTexture(keyword)
          if (!Cesium.defined(texture)) {
            switch (textureInfo.compressType) {
              case Cesium.S3MPixelFormat.WEBP:
                {
                  materialPass._isWEBP = true
                  const texturePromise = materialPass.createWebp(
                    texId,
                    texUnitStateId,
                    context,
                    k,
                    textureInfo.imageBuffer,
                    textureInfo.width,
                    textureInfo.height,
                    wrapS,
                    wrapT,
                    textureInfo.mipmapLevel,
                    layer.mipmapEnabled
                  )
                  texturePromises.push(texturePromise)
                }
                break
              case Cesium.S3MPixelFormat.CRN_DXT5:
                {
                  const texturePromise = materialPass.createCRN(
                    texId,
                    texUnitStateId,
                    context,
                    k,
                    textureInfo,
                    wrapS,
                    wrapT,
                    false,
                    layer.mipmapEnabled
                  )
                  if (Cesium.defined(texturePromise)) {
                    texturePromises.push(texturePromise)
                  }
                }
                break
              case Cesium.S3MPixelFormat.STANDARD_CRN:
                {
                  const texturePromise = materialPass.createCRN(
                    texId,
                    texUnitStateId,
                    context,
                    k,
                    textureInfo,
                    wrapS,
                    wrapT,
                    true,
                    layer.mipmapEnabled
                  )
                  if (Cesium.defined(texturePromise)) {
                    texturePromises.push(texturePromise)
                  }
                }
                break
              case Cesium.S3MPixelFormat.KTX2:
                {
                  if (layer._RGBTOBGR) {
                    materialPass._isWEBP = true
                  }
                  const texturePromise = materialPass.createKTX2(
                    texId,
                    texUnitStateId,
                    context,
                    k,
                    textureInfo,
                    wrapS,
                    wrapT,
                    layer.mipmapEnabled
                  )
                  if (Cesium.defined(texturePromise)) {
                    texturePromises.push(texturePromise)
                  }
                }
                break
              default:
                texture = Cesium.DDSTextureManager.CreateTexture(
                  texId,
                  context,
                  textureInfo.width,
                  textureInfo.height,
                  textureInfo.nFormat,
                  textureInfo.compressType,
                  textureInfo.imageBuffer,
                  false,
                  wrapS,
                  wrapT,
                  layer.mipmapEnabled
                )
                materialPass._textures.push(texture)
            }
          }
        }
      }
    }

    return texturePromises
  }
}
