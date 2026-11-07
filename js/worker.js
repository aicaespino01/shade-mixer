/* Runs the recipe search off the main thread so the page never freezes. */
importScripts('mix.js', 'data.js');
var PAINTS = self.PAINT_DATA.TUBES.map(self.PaintMix.makePaint);
var customCache = {};

function customPaint(def) {
  var key = def.id + def.hex;
  if (!customCache[key]) customCache[key] = self.PaintMix.makePaint({ id: def.id, name: def.name, hex: def.hex, strength: 1 });
  customCache[key].name = def.name;
  return customCache[key];
}

self.onmessage = function (e) {
  var msg = e.data;
  var all = PAINTS.concat((msg.custom || []).map(customPaint));
  var use = all.filter(function (p) { return msg.enabled.indexOf(p.id) !== -1; });
  var recipes = self.PaintMix.solve(msg.hex, use, { maxPaints: msg.maxPaints || 4 }).map(function (r) {
    return {
      tag: r.tag, hex: r.hex, dE: r.dE, total: r.total,
      items: r.items.map(function (i) { return { id: i.paint.id, parts: i.parts }; })
    };
  });
  self.postMessage({ reqId: msg.reqId, recipes: recipes });
};
