import { parseScpJson, createScpJsonFromS3MB } from './scpJsonUtils.js'
import { parseS3MB } from './parseS3MB.js'
import { printProblem } from './printProblem.js'
// import { TextureRenderer } from "./TextureRenderer.js";

/** 最大文件总量，GB */
const MAX_FILES_GB = 2

const viewer = new Cesium.Viewer('cesiumContainer', {
  navigation: false,
  imageryProvider: new Cesium.UrlTemplateImageryProvider({
    url: 'http://10.14.3.183:6081/map/imagery/{z}/{x}/{y}.jpg',
    maximumLevel: 18,
  }),
})

const scene = viewer.scene

const s3mbFileMap = {}

// 劫持S3MB请求，篡改URL
const loadHook = Cesium.loadWithXhr.load
Cesium.loadWithXhr.load = function (url, responseType, method, data, headers, deferred, overrideMimeType) {
  if (s3mbFileMap[url]) {
    url = s3mbFileMap[url]
  }

  loadHook(url, responseType, method, data, headers, deferred, overrideMimeType)
}

// 劫持S3MB解析处理，篡改pageLod为叶子节点
const parseResultHook = Cesium.S3MBDataParser.parseResult
Cesium.S3MBDataParser.parseResult = function (entityPackage, layer, entity, volBuffer) {
  if (Object.keys(s3mbFileMap).length === 1) {
    entityPackage.groupNode.pageLods.forEach(pageLod => (pageLod.childTile = ''))
  }

  parseResultHook(entityPackage, layer, entity, volBuffer)
}

const input = document.getElementById('file')
input.onchange = async () => {
  // 清除资源引用
  scene.layers && scene.layers.removeAll()
  scene.primitives.removeAll()
  Object.keys(s3mbFileMap).forEach(key => {
    URL.revokeObjectURL(s3mbFileMap[key])
    delete s3mbFileMap[key]
  })

  cleanJsonContent()
  console.clear()

  await handleFiles()

  input.value = ''
}

const handleFiles = async () => {
  const s3mbFiles = []

  const scpReaderDeferred = Cesium.when.defer()
  const scpDonePromise = scpReaderDeferred.promise
  const s3mbReaderDeferred = Cesium.when.defer()
  const s3mbDonePromise = s3mbReaderDeferred.promise

  let totalSize = 0
  const maxSize = MAX_FILES_GB * 1024 * 1024 * 1024
  for (const file of input.files) {
    if (file.name.endsWith('.s3mb')) {
      totalSize += file.size
      if (totalSize > maxSize) {
        console.warn(`文件大小超限${MAX_FILES_GB}GB，仅展示部分文件`)
        continue
      }

      s3mbFiles.push(file)
      continue
    }

    // 处理SCP
    const reader = new FileReader()
    reader.onload = () => {
      const json = JSON.parse(reader.result)
      renderJson(json)
      scpReaderDeferred.resolve(json)

      // s3mb读取完成
      s3mbDonePromise.then(() => {
        addS3MTilesLayerByScpJson(file.name, json)
      })
    }
    reader.readAsText(file)
  }

  if (input.files.length === 1 && s3mbFiles.length === 0) {
    return
  }

  const hasScpFile = input.files.length !== s3mbFiles.length

  // 处理s3mb
  const s3mbReaderPromises = []
  const s3mbParsePromises = []
  for (let i = 0; i < s3mbFiles.length; i++) {
    const file = s3mbFiles[i]

    const executor = resolve => {
      const reader = new FileReader()
      reader.onload = () => {
        // 资源化
        const url = URL.createObjectURL(new Blob([reader.result]))
        s3mbFileMap[file.name] = url
        resolve()

        // 缺少scp需要解析每一个s3mb
        if (!hasScpFile) {
          const parsePromise = parseS3MB(file.name, reader.result)
          s3mbParsePromises.push(parsePromise)
        }

        // 解析第一个s3mb作为scp配置校验的数据源
        else if (i === 0) {
          scpDonePromise.then(async scpJson => {
            const { s3mbPackage } = await parseS3MB(file.name, reader.result)
            printProblem(scpJson, s3mbPackage)
          })
        }
      }
      reader.readAsArrayBuffer(file)
    }

    const promise = new Promise(executor)
    s3mbReaderPromises.push(promise)
  }

  await Promise.all(s3mbReaderPromises)
  s3mbReaderPromises.length = 0
  s3mbReaderDeferred.resolve()

  // 缺少scp，通过构造scpJson实现加载
  if (!hasScpFile) {
    const tileObjList = await Promise.all(s3mbParsePromises)
    const scpJson = createScpJsonFromS3MB(tileObjList)
    const layer = addS3MTilesLayerByScpJson('single.scp', scpJson)
    console.skipHtml.log(layer)

    // 单个文件，显示对象结构
    if (s3mbFiles.length === 1) {
      const s3mbPackage = tileObjList[0].s3mbPackage
      console.skipHtml.log('s3mbPackage', s3mbPackage)
      renderJson(s3mbPackage)

      // const canvas = document.getElementById("texture");
      // const textureRenderer = new TextureRenderer(canvas);
      // const texturePromises = textureRenderer.parseMaterial(layer, s3mbPackage);
      // Promise.all(texturePromises).then((textureGroups) => {
      //   console.skipHtml.log(textureGroups);
      //   let textureGroup = textureGroups[0] || [];
      //   const renderToCanvas = (texture) => {
      //     console.skipHtml.log(texture);
      //     //
      //   };
      //   if (!Array.isArray(textureGroup)) {
      //     textureGroup = [textureGroup];
      //   }
      //   textureGroup.forEach((texture) => {
      //     renderToCanvas(texture);
      //   });
      // });
    }
  }
  s3mbParsePromises.length = 0

  s3mbFiles.length = 0
}

const addS3MTilesLayerByScpJson = (fileName, scpJson) => {
  // 过滤未资源化的瓦片
  const rootTiles = scpJson.tiles || scpJson.rootTiles
  const localize = rootTiles.filter(tile => {
    const name = tile.url.replace(/^.\//, '')
    return s3mbFileMap[name] !== undefined
  })
  if (scpJson.tiles) {
    scpJson.tiles = localize
  } else {
    scpJson.rootTiles = localize
  }

  const s3mTilesOptions = parseScpJson(scene, fileName, scpJson)
  var layer = new Cesium.S3MTilesLayer(s3mTilesOptions)
  viewer.scene._layers.add(layer, 0)
  // console.log(layer);
  if (scpJson.position.units === 'Degree') {
    viewer.flyTo(layer)
  } else {
    zoomToRootBoundSphere(layer)
  }

  return layer
}

const zoomToRootBoundSphere = layer => {
  var bSphere
  const rootTiles = layer._rootTiles || layer._layerScheduler._oriRootEntities
  rootTiles.forEach(entity => {
    const entityBoundingSphere = entity.bSphere || entity.boundingVolume._boundingSphere
    if (!bSphere) {
      bSphere = entityBoundingSphere.clone()
    } else {
      bSphere = Cesium.BoundingSphere.union(bSphere, entityBoundingSphere)
    }
  })

  // 转换到世界坐标系下
  Cesium.BoundingSphere.transform(bSphere, layer._matModel, bSphere)

  viewer.camera.flyToBoundingSphere(bSphere)
}

const objectToJson = obj => {
  const json = {}
  const array = []
  for (let key in obj) {
    const value = obj[key]
    if (key === 'matrials') {
      key = 'materials'
    }
    // simplify TypedArray
    if (value instanceof Int16Array) {
      json[key] = `Int16Array(${value.length})`
    } else if (value instanceof Uint8Array) {
      json[key] = `Uint8Array(${value.length})`
    } else if (value instanceof Uint16Array) {
      json[key] = `Uint16Array(${value.length})`
    } else if (value instanceof Uint32Array) {
      json[key] = `Uint32Array(${value.length})`
    } else if (value instanceof Float32Array) {
      json[key] = `Float32Array(${value.length})`
    } else if (value instanceof Array) {
      const tempArray = []
      for (const v of value) {
        if (typeof v === 'object') {
          tempArray.push(objectToJson(v))
        } else {
          tempArray.push(v)
        }
      }
      json[key] = tempArray
    } else if (typeof value === 'object') {
      json[key] = objectToJson(value)
    } else if (typeof obj === Array) {
      array.push(value)
    } else {
      json[key] = value
    }
  }
  return array.length === 0 ? json : array
}

const renderJson = obj => {
  const json = objectToJson(obj)
  const el = document.getElementById('json-tree')
  el.innerHTML = jsontohtml(json, {
    comments: {
      show: false,
    },
  })
  const label = document.querySelector('.json-content label')
  label.innerHTML = obj.extensions ? 'SCP 结构' : 'S3MB 结构'
}
const cleanJsonContent = () => {
  const el = document.getElementById('json-tree')
  el.innerHTML = ''
  const label = document.querySelector('.json-content label')
  label.innerHTML = 'SCP / S3MB 结构'
}

const globeCheckbox = document.getElementById('viewer-globe-visible')
globeCheckbox.onchange = () => {
  const checked = globeCheckbox.checked
  viewer.scene.globe.show = checked
  viewer.scene.skyAtmosphere.show = checked
  viewer.scene.skyBox.show = checked
  scene.backgroundColor = checked ? Cesium.Color.BLACK : Cesium.Color.fromCssColorString('#7c91c4')
}
