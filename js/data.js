/* Paint tubes (the paints you mix with) and the shade library. */
(function (global) {
  'use strict';

  // Common artist / craft paint colours. strength = tinting strength.
  var TUBES = [
    { id: 'white', name: 'Titanium White', hex: '#FBFBF8', strength: 2.0, basic: true },
    { id: 'black', name: 'Mars Black', hex: '#1E1E1F', strength: 1.0, basic: true },
    { id: 'lemon', name: 'Lemon Yellow', hex: '#FFF04A', strength: 0.9 },
    { id: 'yellow', name: 'Cadmium Yellow', hex: '#FFC20E', strength: 1.0, basic: true },
    { id: 'orange', name: 'Cadmium Orange', hex: '#F7781C', strength: 1.0 },
    { id: 'red', name: 'Cadmium Red', hex: '#D7262A', strength: 1.0, basic: true },
    { id: 'crimson', name: 'Alizarin Crimson', hex: '#9E1B32', strength: 1.1 },
    { id: 'magenta', name: 'Quinacridone Magenta', hex: '#C2257A', strength: 1.1 },
    { id: 'purple', name: 'Dioxazine Purple', hex: '#4E2A84', strength: 1.3 },
    { id: 'ultramarine', name: 'Ultramarine Blue', hex: '#2B3A9C', strength: 1.0, basic: true },
    { id: 'phthaloblue', name: 'Phthalo Blue', hex: '#0B5AA8', strength: 1.4 },
    { id: 'phthalogreen', name: 'Phthalo Green', hex: '#007A5A', strength: 1.4 },
    { id: 'ochre', name: 'Yellow Ochre', hex: '#C99A2E', strength: 0.8 },
    { id: 'sienna', name: 'Burnt Sienna', hex: '#A0502E', strength: 0.9 },
    { id: 'umber', name: 'Burnt Umber', hex: '#5C3D2A', strength: 1.0 }
  ];

  var C = [];
  function add(group, list) {
    list.forEach(function (row) { C.push({ name: row[0], hex: row[1], group: group }); });
  }

  add('Pastels', [
    ['Baby Pink', '#F4C2C2'], ['Blush', '#F9D5D3'], ['Cotton Candy', '#FFBCD9'], ['Pastel Coral', '#F8B4A6'],
    ['Peach Puff', '#FFDAB9'], ['Apricot Cream', '#FBCEB1'], ['Vanilla', '#F3E5AB'], ['Butter', '#FFF1A8'],
    ['Lemon Chiffon', '#FFFACD'], ['Pistachio', '#C9E4A8'], ['Mint Cream', '#D5F5E3'], ['Pastel Sage', '#D1DEC2'],
    ['Seafoam Mist', '#C3EBD7'], ['Pale Aqua', '#BCE3E0'], ['Sky Mist', '#D6ECF3'], ['Baby Blue', '#BFD7ED'],
    ['Powder Blue', '#B0D8E6'], ['Periwinkle', '#C3CDE6'], ['Lavender', '#D8C8EE'], ['Lilac', '#DCC6E0'],
    ['Mauve Mist', '#E0C7D7'], ['Pale Peach', '#FFE5D4']
  ]);
  add('Reds', [
    ['Scarlet', '#E0301E'], ['Fire Engine Red', '#CE2029'], ['Cherry Red', '#C21E2B'], ['Crimson', '#B0122E'],
    ['Ruby', '#9B111E'], ['Rose Red', '#C2304F'], ['Coral Red', '#F05A4F'], ['Tomato', '#E8483A'],
    ['Brick Red', '#A33A2B'], ['Rust Red', '#A93C22'], ['Burgundy', '#800020'], ['Wine', '#6D1A2A']
  ]);
  add('Pinks', [
    ['Hot Pink', '#FF69B4'], ['Bubblegum', '#F7A1C4'], ['Flamingo', '#F38BA0'], ['Rose', '#E8879C'],
    ['Peony', '#E3A0B8'], ['Watermelon', '#F2576A'], ['Salmon', '#F4907E'], ['Dusty Rose', '#C9909A'],
    ['Old Rose', '#C08081'], ['Fuchsia', '#C2268A'], ['Raspberry', '#B3245B'], ['Magenta', '#B0306E']
  ]);
  add('Oranges', [
    ['Tangerine', '#F28500'], ['Pumpkin', '#E8751A'], ['Burnt Orange', '#CC5500'], ['Mango', '#F9A030'],
    ['Marigold', '#F2A31B'], ['Apricot', '#F5A262'], ['Cantaloupe', '#F6B27A'], ['Peach', '#F7B58A'],
    ['Coral', '#F27F64'], ['Terracotta', '#C8623F'], ['Copper', '#B8692F'], ['Persimmon', '#E9592B']
  ]);
  add('Yellows', [
    ['Lemon', '#F7E733'], ['Canary', '#FFEF5C'], ['Daffodil', '#FBE14F'], ['Sunflower', '#F5C518'],
    ['Golden Yellow', '#F2B90F'], ['Saffron', '#F4B71F'], ['Honey', '#E3A938'], ['Mustard', '#D4A017'],
    ['Butter Yellow', '#F6DF7A'], ['Maize', '#F1D46A'], ['Straw', '#E5CF7A'], ['Antique Gold', '#B8912F']
  ]);
  add('Greens', [
    ['Lime', '#A6CE39'], ['Chartreuse', '#B8D433'], ['Grass Green', '#5BA33B'], ['Leaf Green', '#4C9A2A'],
    ['Kelly Green', '#3A9B37'], ['Emerald', '#1F8A5B'], ['Jade', '#00A36C'], ['Mint', '#98D7B0'],
    ['Seafoam Green', '#8FD1B5'], ['Sage', '#9CAF88'], ['Eucalyptus', '#5F8575'], ['Moss', '#8A9A5B'],
    ['Olive', '#708238'], ['Avocado', '#6F7D35'], ['Pine', '#2F5D50'], ['Hunter Green', '#355E3B'],
    ['Forest Green', '#2D5A27']
  ]);
  add('Blues & Teals', [
    ['Sky Blue', '#87BEE0'], ['Cornflower', '#6495ED'], ['Cerulean', '#2A7FB8'], ['Steel Blue', '#4682B4'],
    ['Denim', '#3B5F8A'], ['Cobalt', '#2350A5'], ['Royal Blue', '#2F55B4'], ['Ocean Blue', '#1D5F8A'],
    ['Slate Blue', '#5E6E91'], ['Navy', '#1F2D5A'], ['Midnight Blue', '#1C2541'], ['Aqua', '#63C5DA'],
    ['Turquoise', '#3FBFB4'], ['Teal', '#127C7A'], ['Peacock', '#12707D'], ['Robin Egg', '#96D3D8']
  ]);
  add('Purples', [
    ['Lavender Purple', '#9A7CC2'], ['Wisteria', '#A994C9'], ['Amethyst', '#9966CC'], ['Violet', '#7F4FB5'],
    ['Royal Purple', '#5B3A99'], ['Grape', '#5B2A6E'], ['Plum', '#8E4585'], ['Orchid', '#B565A7'],
    ['Mulberry', '#8C3A63'], ['Heather', '#A68FAD'], ['Eggplant', '#482642'], ['Mauve', '#A87B96']
  ]);
  add('Browns & Earth', [
    ['Sand', '#D8C3A0'], ['Beige', '#E6D7B9'], ['Tan', '#C9A27A'], ['Khaki', '#BDAE82'],
    ['Camel', '#B98A5E'], ['Caramel', '#B5733A'], ['Cinnamon', '#9B5A2E'], ['Clay', '#B66A50'],
    ['Chestnut', '#8B4A35'], ['Mocha', '#7B5A4A'], ['Coffee', '#6F4E37'], ['Taupe', '#8F7F72'],
    ['Walnut', '#5E4532'], ['Chocolate', '#5C3317']
  ]);
  add('Neutrals & Grays', [
    ['Off White', '#F5F2EA'], ['Ivory', '#F7F1DE'], ['Cream', '#F3E9CF'], ['Linen', '#EFE6DA'],
    ['Light Gray', '#D3D3D0'], ['Silver', '#BFC1C2'], ['Dove Gray', '#B5B3AE'], ['Greige', '#B8AFA2'],
    ['Warm Gray', '#A39C92'], ['Cool Gray', '#9AA1A8'], ['Stone', '#8E8A82'], ['Ash', '#8A8D8F'],
    ['Slate Gray', '#6C757D'], ['Charcoal', '#3F4144']
  ]);
  add('Deep & Dark', [
    ['Jet Black', '#141414'], ['Espresso', '#3B2A22'], ['Oxblood', '#4A0F14'], ['Aubergine', '#3B1F33'],
    ['Deep Navy', '#141E3C'], ['Deep Teal', '#0D4D4B'], ['Deep Forest', '#1E3B2B'], ['Gunmetal', '#2C3539']
  ]);

  global.PAINT_DATA = { TUBES: TUBES, COLORS: C };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.PAINT_DATA;
})(this);
