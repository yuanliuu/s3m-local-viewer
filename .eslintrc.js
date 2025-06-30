module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es6: true
  },
  parser: "babel-eslint",
  parserOptions: {
    sourceType: "module"
  },
  globals: {
    Cesium: true,
    ConsoleLogHTML: true,
    jsontohtml: true,
  },
  extends: ['eslint:recommended'],
  rules: {
  },
}
