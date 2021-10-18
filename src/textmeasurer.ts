import { TextMeasure } from './rendercontext';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Scale value to convert from points to pixels.
// CSS specifies dpi to be 96 and there are 72 points to an inch.
const POINT_SCALE = 96 / 72;

export abstract class TextMeasurer {
  // Measure the width and height of the given text/font combination.
  // Note that we ignore the font style here (normal, italic, oblique) for
  // consistency between canvas and SVG implementations: on Chrome at least
  // SVG context returns slightly wider bounds for italic text than normal,
  // while the canvas returns the same width.
  abstract measureText(text: string, family: string, size: number, weight: string): TextMeasure;
}

export class CanvasTextMeasurer extends TextMeasurer {
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  constructor(canvas?: HTMLCanvasElement | OffscreenCanvas) {
    super();
    if (!canvas) {
      if (window.OffscreenCanvas) {
        canvas = new window.OffscreenCanvas(8, 8);
      } else {
        canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 8;
      }
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error("Couldn't create 2d context from canvas object");
    }
    this.ctx = ctx;
  }

  measureText(text: string, family: string, size: number, weight: string): TextMeasure {
    this.ctx.font = `${weight} ${size}pt ${family}`;
    const width = this.ctx.measureText(text).width;
    const height = size * POINT_SCALE;
    return { width, height };
  }
}

export class SVGTextMeasurer extends TextMeasurer {
  private txt?: SVGTextElement;

  constructor(private svg: SVGSVGElement) {
    super();
  }

  measureText(text: string, family: string, size: number, weight: string): TextMeasure {
    if (!this.txt) {
      // Create the SVG text element that will be used to measure text.
      this.txt = document.createElementNS(SVG_NS, 'text');
    }

    this.txt.textContent = text;
    this.txt.setAttributeNS(null, 'font-family', family);
    this.txt.setAttributeNS(null, 'font-size', `${size}pt`);
    this.txt.setAttributeNS(null, 'font-weight', weight);
    this.svg.appendChild(this.txt);
    const bbox = this.txt.getBBox();
    this.svg.removeChild(this.txt);

    let width = bbox.width;
    // Firefox measures SVG text as 1 pixel wider than text measured using its canvas
    // context. Neither Chrome nor Edge exhibit this behavior.
    if (navigator.userAgent.indexOf('Firefox') != -1) {
      width = Math.max(width - 1, 0);
    }

    const height = size * POINT_SCALE;
    // CSS specifies dpi to be 96 and there are 72 points to an inch.
    return { width, height };
  }
}

export class CachedTextMeasurer extends TextMeasurer {
  private cache: Record<string, Record<string, TextMeasure>> = {};

  constructor(private impl: TextMeasurer) {
    super();
  }

  measureText(text: string, family: string, size: number, weight: string): TextMeasure {
    let entries = this.cache[text];
    if (entries === undefined) {
      entries = {};
      this.cache[text] = entries;
    }

    const key = `${family}%${size}%${weight}`;
    let entry = entries[key];
    if (entry === undefined) {
      entry = this.impl.measureText(text, family, size, weight);
      entries[key] = entry;
    }
    return entry;
  }
}

let singleton: TextMeasurer | null = null;

export function getSingletonTextMeasurer(): TextMeasurer {
  if (singleton == null) {
    singleton = new CachedTextMeasurer(new CanvasTextMeasurer());
  }
  return singleton;
}
