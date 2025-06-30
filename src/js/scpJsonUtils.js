const {
  defined,
  Rectangle,
  // AssociativeArray,
  Uri,
  getBaseUri,
  getFilenameFromUri,
  Cartesian3,
  BoundingSphere,
  // defaultValue,
} = Cesium

export const parseScpJson = (scene, scpUrl, scpJson) => {
  var dataType = scpJson.dataType

  var x = scpJson.position.x
  var y = scpJson.position.y
  var z = scpJson.position.z

  var layerBounds
  if (defined(scpJson.geoBounds)) {
    layerBounds = Rectangle.fromDegrees(scpJson.geoBounds.left, scpJson.geoBounds.bottom, scpJson.geoBounds.right, scpJson.geoBounds.top)
  }

  var minHeight, maxHeight
  if (defined(scpJson.heightRange)) {
    minHeight = scpJson.heightRange.min
    maxHeight = scpJson.heightRange.max
  }

  var maxCategory, minCategory
  try {
    if (defined(scpJson.wDescript)) {
      maxCategory = scpJson.wDescript.range.max
      minCategory = scpJson.wDescript.range.min
    } else if (defined(scpJson.vertexAttributeDescript)) {
      for (let i = 0; i < scpJson.vertexAttributeDescript.length; i++) {
        const vertexAttribute = scpJson.vertexAttributeDescript[i]
        if (vertexAttribute.category === 'VertexWeight') {
          minCategory = vertexAttribute.range.min[0]
          maxCategory = vertexAttribute.range.max[0]
          break
        }
      }
    }
  } catch (e) {
    console.error(e)
  }

  var extensions = scpJson.extensions
  var fileType
  if (extensions.hasOwnProperty('s3m:FileType')) {
    fileType = extensions['s3m:FileType']
  }
  // extensions.hasOwnProperty('s3m:TileSplitType');
  var processType
  if (extensions.hasOwnProperty('s3m:ProcessType')) {
    processType = extensions['s3m:ProcessType']
  }
  // var idFieldName;
  // if (extensions.hasOwnProperty("IDFieldName")) {
  //   idFieldName = extensions.IDFieldName;
  // }
  var globeType
  if (extensions.hasOwnProperty('globeType')) {
    globeType = extensions.globeType
  }
  // var level;
  // if (extensions.hasOwnProperty("levels")) {
  //   for (var i = 0; i < extensions.levels.length; ) {
  //     level = extensions.levels[i].level;
  //     break;
  //   }
  // }
  // if (extensions.hasOwnProperty("sml:Level")) {
  //   level = parseInt(extensions["sml:Level"]);
  // }
  var isTextureShare
  if (extensions.hasOwnProperty('s3m:TextureSharing')) {
    isTextureShare = 'TRUE' === extensions['s3m:TextureSharing']
  }
  var isTransparencyOptimization
  if (extensions.hasOwnProperty('s3m:TransparencyOptimization')) {
    isTransparencyOptimization = 'TRUE' === extensions['s3m:TransparencyOptimization']
  }
  var vertexCompressionType
  if (extensions.hasOwnProperty('s3m:VertexCompressionType')) {
    vertexCompressionType = extensions['s3m:VertexCompressionType']
  }
  var vertexWeightMode
  if (extensions.hasOwnProperty('s3m:VertexWeightMode')) {
    vertexWeightMode = extensions['s3m:VertexWeightMode']
  }
  // var attributeExtentName;
  // if (extensions.hasOwnProperty("s3m:AttributeExtentName")) {
  //   attributeExtentName = extensions["s3m:AttributeExtentName"];
  // }
  // var pointCloudLayerNames = [];
  // var groupNameBounds = new AssociativeArray();
  // if (extensions.hasOwnProperty("pointCloudLayers")) {
  //   for (var j = 0; j < extensions.pointCloudLayers.length; j++) {
  //     var layerName = extensions.pointCloudLayers[j].layerName;
  //     if (defined(layerName)) {
  //       pointCloudLayerNames.push(layerName);
  //       groupNameBounds.set(
  //         layerName,
  //         extensions.pointCloudLayers[j].layerBounds
  //       );
  //     } else {
  //       groupNameBounds.set(
  //         extensions.pointCloudLayers[j].layer,
  //         new Rectangle()
  //       );
  //       pointCloudLayerNames.push(extensions.pointCloudLayers[j].layer);
  //     }
  //   }
  // }

  var baseUri = new Uri('')
  var rootEntities = []
  var rootTiles = scpJson.tiles || scpJson.rootTiles
  for (var i = 0; i < rootTiles.length; i++) {
    var rootTile = rootTiles[i]
    if (defined(rootTile)) {
      var tileUrl = rootTile.url
      var tileBaseUri = tileUrl.replace(/\\+/g, '/').replace(/(\.s3mb)/gi, '')
      var rootEntity = {}
      rootEntity.relativePath = new Uri(getBaseUri(tileBaseUri))
      rootEntity.name = getFilenameFromUri(tileBaseUri)
      if (defined(rootTile.boundingbox)) {
        var boundingbox = rootTile.boundingbox
        if (boundingbox.center) {
          rootEntity.obb = boundingbox
        } else {
          rootEntity.min = new Cartesian3(boundingbox.min.x, boundingbox.min.y, boundingbox.min.z)
          rootEntity.max = new Cartesian3(boundingbox.max.x, boundingbox.max.y, boundingbox.max.z)
          rootEntity.bSphere = BoundingSphere.fromCornerPoints(rootEntity.min, rootEntity.max)
        }
      }
      rootEntities.push(rootEntity)
    }
  }

  const s3mTilesOptions = {
    position: {
      lon: x,
      lat: y,
      height: z,
    },
    fileType: fileType,
    maxInstensity: 0,
    minInstensity: 0,
    maxHeight: maxHeight,
    minHeight: minHeight,
    maxCategory: maxCategory,
    minCategory: minCategory,
    layerBounds: layerBounds,
    baseUri: baseUri,
    rootEntities: rootEntities,
    isTextureShare: isTextureShare,
    urlArguments: {},
    isS3MB: true,
    isS3MZ: false,
    isS3MBlock: false,
    dataType: dataType,
    isTransparencyOptimization: isTransparencyOptimization,
    vertexCompressionType: vertexCompressionType,
    vertexWeightMode: vertexWeightMode,
    // level: level,
    // pointCloudLayerNames: pointCloudLayerNames,
    processType: processType,
    // groupNameBounds: groupNameBounds,
    // idFieldName: idFieldName,
    // attributeExtentName: attributeExtentName,
    globeType: globeType,
  }

  s3mTilesOptions.context = scene.context
  s3mTilesOptions.gl = scene.context._gl
  s3mTilesOptions.name = 'test'
  s3mTilesOptions.supportCompressType = scene._supportCompressType
  // s3mTilesOptions.urlType = options.urlType;
  // s3mTilesOptions.cullEnabled = options.cullEnabled;
  // s3mTilesOptions.horizontalLine = options.horizontalLine;
  // s3mTilesOptions.style3D = options.style3D;
  // s3mTilesOptions.selectEnable = options.selectable;
  // s3mTilesOptions.isVisible = options.isVisible;
  // s3mTilesOptions.minVisibleAltitude = options.minVisibleAltitude;
  // s3mTilesOptions.maxVisibleAltitude = options.maxVisibleAltitude;
  // s3mTilesOptions.minVisibleDistance = options.minVisibleDistance;
  // s3mTilesOptions.maxVisibleDistance = options.maxVisibleDistance;
  // s3mTilesOptions.shadowType = options.shadowType;
  // s3mTilesOptions.heading = options.heading;
  // s3mTilesOptions.lodRangeScale = options.lodRangeScale;
  // s3mTilesOptions.polygonOffset = options.polygonOffset;
  // s3mTilesOptions.brightness = options.brightness;
  // s3mTilesOptions.constrast = options.constrast;
  // s3mTilesOptions.hue = options.hue;
  // s3mTilesOptions.saturation = options.saturation;
  // s3mTilesOptions.gamma = options.gamma;
  // s3mTilesOptions.effect = options.effect;
  // s3mTilesOptions.ignoreNormal = defaultValue(options.ignoreNormal, false);
  // s3mTilesOptions.groupName = defaultValue(options.groupName, '');
  // s3mTilesOptions.cacheKey = defaultValue(options.cacheKey, '');
  s3mTilesOptions._isJson = true
  s3mTilesOptions.sceneMode = scene.mode
  s3mTilesOptions.scene = scene
  // s3mTilesOptions.useMercatorProject = options.useMercatorProject;
  s3mTilesOptions.scpUrl = scpUrl
  // s3mTilesOptions.queryFieldNames = options.queryFieldNames;
  // s3mTilesOptions.subdomainConfig = options.subdomainConfig;
  // s3mTilesOptions.customRequestHeaders = options.customRequestHeaders;

  // console.log(s3mTilesOptions);
  return s3mTilesOptions
}

/**
 *
 * @param {{fileName:string,s3mbPackage:any}[]} tileObjList
 * @returns
 */
export const createScpJsonFromS3MB = tileObjList => {
  let version
  let extensions
  const tiles = []

  for (let i = 0; i < tileObjList.length; i++) {
    const tileObj = tileObjList[i]
    if (!tileObj) {
      continue
    }

    if (i === 0) {
      version = tileObj.s3mbPackage.dataVersion
      extensions = getScpExtensions(tileObj.s3mbPackage)
    }

    tiles.push({
      boundingbox: calcTileBoundingBox(tileObj.s3mbPackage),
      url: tileObj.fileName,
    })
  }

  const scpJson = {
    asset: 'S3MLocalViewer',
    compressedPackageType: 'Zip',
    crs: '',
    dataType: 'ArtificialModel',
    extensions: extensions,
    geoBounds: {
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
    },
    heightRange: {
      max: 0,
      min: 0,
    },
    idFieldName: '',
    lodType: 'Replace',
    position: {
      // units: "Degree",
      x: 112.88202897,
      y: 28.21138169,
      z: 0,
    },
    pyramidSplitType: 'Unknown',
    tiles: tiles,
    version: version,
    wDescript: {
      category: '',
      range: {
        max: 0,
        min: 0,
      },
    },
  }
  console.skipHtml.log('ScpJson', scpJson)

  return scpJson
}

const getScpExtensions = s3mbPackage => {
  const extensions = {
    attachFiles: [],
    levels: [],
    pointCloudLayers: [],
    's3m:TransparencyOptimization': 'TRUE',
    vol: [],
  }

  // globeType
  if (s3mbPackage.dataVersion === 3) {
    extensions.globeType = 'Ellipsoid_WGS84'
  }

  // FileType
  const material = s3mbPackage.matrials.material[0].material
  if (material.alphaMode === 'opaque' || material.transparentsorting === true) {
    extensions['s3m:FileType'] = 'OSGBFile'
  } else {
    extensions['s3m:FileType'] = 'OSGBCacheFile'
  }

  // TextureCompressionType
  for (const materialId in s3mbPackage.texturePackage) {
    const material = s3mbPackage.texturePackage[materialId]
    for (const format in Cesium.S3MPixelFormat) {
      if (Cesium.S3MPixelFormat[format] === material.compressType) {
        extensions['s3m:TextureCompressionType'] = format
        break
      }
    }
    break
  }

  // VertexCompressionType
  try {
    // const skeletonName = s3mbPackage.groupNode.pageLods[0].geodes[0].skeletonNames[0]
    // const vertexPackage = s3mbPackage.geoPackage[skeletonName].vertexPackage
    let vertexPackage
    for (const key in s3mbPackage.geoPackage) {
      if (typeof s3mbPackage.geoPackage[key] === 'object' && s3mbPackage.geoPackage[key].vertexPackage) {
        vertexPackage = s3mbPackage.geoPackage[key].vertexPackage
        break
      }
    }
    if (vertexPackage.nCompressOptions !== 0) {
      const positionDim = vertexPackage.vertexAttributes[0].componentsPerAttribute
      if (positionDim === 3) {
        extensions['s3m:VertexCompressionType'] = 'DRACO'
      } else if (positionDim === 4) {
        extensions['s3m:VertexCompressionType'] = 'MESHOPT'
      }
    }
  } catch (e) {
    //
  }
  // console.log(extensions)
  return extensions
}

const calcTileBoundingBox = s3mbPackage => {
  const boundingSphere = new Cesium.BoundingSphere()
  s3mbPackage.groupNode.pageLods.forEach((pageLod, i) => {
    const tileBoundingSphere = new Cesium.BoundingSphere(pageLod.boundingSphere.center, pageLod.boundingSphere.radius)
    if (i === 0) {
      Cesium.BoundingSphere.clone(tileBoundingSphere, boundingSphere)
    } else {
      Cesium.BoundingSphere.union(boundingSphere, tileBoundingSphere, boundingSphere)
    }
  })

  const boundingbox = {
    max: {
      x: boundingSphere.center.x + boundingSphere.radius,
      y: boundingSphere.center.y + boundingSphere.radius,
      z: boundingSphere.center.z + boundingSphere.radius,
    },
    min: {
      x: boundingSphere.center.x - boundingSphere.radius,
      y: boundingSphere.center.y - boundingSphere.radius,
      z: boundingSphere.center.z - boundingSphere.radius,
    },
  }

  return boundingbox
}
