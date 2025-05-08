const { DOMParser } = require('xmldom');

function parseUnit(value) {
  if (!value) return null;

  // Remove any whitespace
  value = value.trim();

  // Extract number and unit
  const match = value.match(/^([\d.]+)([a-z%]*)$/i);
  if (!match) return null;

  const [, number, unit] = match;
  return {
    value: parseFloat(number),
    unit: unit.toLowerCase()
  };
}

function convertToPixels(value, unit, viewBox) {
  if (!value) return null;

  const { value: num, unit: u } = value;

  switch (u) {
    case 'px':
      return num;
    case '%':
      return (num / 100) * viewBox;
    case 'em':
      return num * 16; // Assuming 1em = 16px
    case 'rem':
      return num * 16; // Assuming 1rem = 16px
    case 'pt':
      return num * 1.33333; // 1pt = 1.33333px
    case 'pc':
      return num * 16; // 1pc = 16px
    case 'cm':
      return num * 37.795276; // 1cm = 37.795276px
    case 'mm':
      return num * 3.7795276; // 1mm = 3.7795276px
    case 'in':
      return num * 96; // 1in = 96px
    default:
      return num; // Default to pixels if unit is unknown
  }
}

async function parseSVG(svgContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'text/xml');
  const svgElement = doc.documentElement;

  // Get viewBox if present
  const viewBox = svgElement.getAttribute('viewBox');
  let viewBoxWidth = 0;
  let viewBoxHeight = 0;

  if (viewBox) {
    const [, , width, height] = viewBox.split(/\s+/).map(Number);
    viewBoxWidth = width;
    viewBoxHeight = height;
  }

  // Get width and height attributes
  const width = parseUnit(svgElement.getAttribute('width'));
  const height = parseUnit(svgElement.getAttribute('height'));

  // Convert to pixels
  const widthPx = convertToPixels(width, 'width', viewBoxWidth);
  const heightPx = convertToPixels(height, 'height', viewBoxHeight);

  // If no dimensions found, try to get from viewBox
  if (!widthPx || !heightPx) {
    if (viewBoxWidth && viewBoxHeight) {
      return {
        width: viewBoxWidth,
        height: viewBoxHeight
      };
    }
    // Default dimensions if nothing is specified
    return {
      width: 100,
      height: 100
    };
  }

  return {
    width: widthPx,
    height: heightPx
  };
}

module.exports = { parseSVG }; 