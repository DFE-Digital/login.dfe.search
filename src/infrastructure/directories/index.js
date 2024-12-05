const config = require("./../config");

let adapter;
if (config.directories.type === "api") {
  adapter = require("./api");
} else {
  adapter = require("./static");
}
module.exports = adapter;
