/* Runs the recipe search off the main thread so the page never freezes. */
importScripts('mix.js', 'data.js');
var PAINTS = self.PAINT_DATA.TUBES.map(self.PaintMix.makePaint);

self.onmessage = function (e) {
  var msg = e.data;
  var use = PAINTS.filter(function (p) { return msg.enabled.indexOf(p.id) !== -1; });
  var recipes = self.PaintMix.solve(msg.hex, use).map(function (r) {
    return {
      tag: r.tag, hex: r.hex, dE: r.dE, total: r.total,
      items: r.items.map(function (i) { return { id: i.paint.id, parts: i.parts }; })
    };
  });
  self.postMessage({ reqId: msg.reqId, recipes: recipes });
};
