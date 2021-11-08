// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// MIT License
// @author Gregory Ristow (2015)

import { Element } from './element';
import { RuntimeError, normalizeAngle, prefix } from './util';
import { GroupAttributes, RenderContext, TextMeasure } from './rendercontext';
import { getSingletonTextMeasurer, TextMeasurer } from './textmeasurer';

// eslint-disable-next-line
type Attributes = { [key: string]: any };

const attrNamesToIgnoreMap: { [nodeName: string]: Attributes } = {
  path: {
    x: true,
    y: true,
    width: true,
    height: true,
    'font-family': true,
    'font-weight': true,
    'font-style': true,
    'font-size': true,
  },
  rect: {
    'font-family': true,
    'font-weight': true,
    'font-style': true,
    'font-size': true,
  },
  text: {
    width: true,
    height: true,
  },
};

/** Create the SVG in the SVG namespace. */
const SVG_NS = 'http://www.w3.org/2000/svg';

const TWO_PI = 2 * Math.PI;

interface State {
  state: Attributes;
  attributes: Attributes;
  shadow_attributes: Attributes;
  lineWidth: number;
}

type EventListener = (ev: any) => any;

interface Elem {
  nodeName: string;
  textContent: string | null;

  appendChild(newChild: any): any;
  setAttribute(name: string, value: string): void;
  setAttributeNS(ns: string | null, name: string, value: string): void;
  addEventListener(type: string, listener: EventListener): void;
}

interface Options {
  // Defaults to a singleton text measurer shared by all context instances.
  textMeasurer: TextMeasurer;
}

/**
 * Base SVG render context that implements most of the shared functionality
 * used by SVGContext and SVGTextContext.
 */
abstract class SVGContextBase extends RenderContext {
  protected options: Options;
  protected root: Elem;

  width: number = 0;
  height: number = 0;
  path: string;
  pen: { x: number; y: number };
  lineWidth: number;
  attributes: Attributes;
  background_attributes: Attributes;
  shadow_attributes: Attributes;
  state: Attributes;
  state_stack: State[];
  parent: Elem;
  groups: Elem[];
  fontString: string = '';

  constructor(root: Elem, options: Partial<Options>) {
    super();

    this.options = {
      textMeasurer: options.textMeasurer || getSingletonTextMeasurer(),
    };

    this.root = root;

    // Point to it:
    this.groups = [this.root]; // Create the group stack
    this.parent = this.root;

    this.path = '';
    this.pen = { x: NaN, y: NaN };
    this.lineWidth = 1.0;
    this.state = {
      scale: { x: 1, y: 1 },
      'font-family': 'Arial',
      'font-size': '8pt',
      'font-weight': 'normal',
    };

    const defaultAttributes = {
      'stroke-dasharray': 'none',
      'font-family': 'Arial',
      'font-size': '10pt',
      'font-weight': 'normal',
      'font-style': 'normal',
    };

    this.attributes = {
      'stroke-width': 0.3,
      fill: 'black',
      stroke: 'black',
      ...defaultAttributes,
    };

    this.background_attributes = {
      'stroke-width': 0,
      fill: 'white',
      stroke: 'white',
      ...defaultAttributes,
    };

    this.shadow_attributes = {
      width: 0,
      color: 'black',
    };

    this.state_stack = [];
  }

  abstract create(svgElementType: string): Elem;

  // Allow grouping elements in containers for interactivity.
  openGroup(cls: string, id?: string, attrs?: GroupAttributes): Elem {
    const group = this.create('g');
    this.groups.push(group);
    this.parent.appendChild(group);
    this.parent = group;
    if (cls) group.setAttribute('class', prefix(cls));
    if (id) group.setAttribute('id', prefix(id));

    if (attrs && attrs.pointerBBox) {
      group.setAttribute('pointer-events', 'bounding-box');
    }
    return group;
  }

  closeGroup(): void {
    this.groups.pop();
    this.parent = this.groups[this.groups.length - 1];
  }

  add(elem: Elem): void {
    this.parent.appendChild(elem);
  }

  // ### Styling & State Methods:

  setFont(family: string, size: number, weight?: string): this {
    // In SVG italic is handled by font-style.
    // We search the weight argument and apply bold and italic
    // to font-weight and font-style respectively.
    let foundBold = false;
    let foundItalic = false;
    // Weight might also be a number (200, 400, etc...) so we
    // test its type to be sure we have access to String methods.
    if (typeof weight === 'string') {
      // look for "italic" in the weight:
      if (weight.indexOf('italic') !== -1) {
        weight = weight.replace(/italic/g, '');
        foundItalic = true;
      }
      // look for "bold" in weight
      if (weight.indexOf('bold') !== -1) {
        weight = weight.replace(/bold/g, '');
        foundBold = true;
      }
      // remove any remaining spaces
      weight = weight.replace(/ /g, '');
    }
    const noWeightProvided = typeof weight === 'undefined' || weight === '';
    if (noWeightProvided) {
      weight = 'normal';
    }

    const fontAttributes = {
      'font-family': family,
      'font-size': size + 'pt',
      'font-weight': foundBold ? 'bold' : weight,
      'font-style': foundItalic ? 'italic' : 'normal',
    };

    // Currently this.fontString only supports size & family. See setRawFont().
    this.fontString = `${size}pt ${family}`;
    this.attributes = { ...this.attributes, ...fontAttributes };
    this.state = { ...this.state, ...fontAttributes };

    return this;
  }

  setRawFont(font: string): this {
    this.fontString = font.trim();
    // Assumes size first, splits on space -- which is presently
    // how all existing modules are calling this.
    const fontArray = this.fontString.split(' ');

    const size = fontArray[0];
    this.attributes['font-size'] = size;
    this.state['font-size'] = size;

    const family = fontArray[1];
    this.attributes['font-family'] = family;
    this.state['font-family'] = family;

    return this;
  }

  setFillStyle(style: string): this {
    this.attributes.fill = style;
    return this;
  }

  setBackgroundFillStyle(style: string): this {
    this.background_attributes.fill = style;
    this.background_attributes.stroke = style;
    return this;
  }

  setStrokeStyle(style: string): this {
    this.attributes.stroke = style;
    return this;
  }

  setShadowColor(color: string): this {
    this.shadow_attributes.color = color;
    return this;
  }

  /**
   * @param blur A non-negative float specifying the level of shadow blur, where 0
   *             represents no blur and larger numbers represent increasingly more blur.
   * @returns this
   */
  setShadowBlur(blur: number): this {
    this.shadow_attributes.width = blur;
    return this;
  }

  /**
   * @param width
   * @returns this
   */
  setLineWidth(width: number): this {
    this.attributes['stroke-width'] = width;
    this.lineWidth = width;
    return this;
  }

  /**
   * @param lineDash an array of integers in the form of [dash, space, dash, space, etc...]
   * @returns this
   *
   * See: [SVG `stroke-dasharray` attribute](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray)
   */
  setLineDash(lineDash: number[]): this {
    if (Object.prototype.toString.call(lineDash) === '[object Array]') {
      this.attributes['stroke-dasharray'] = lineDash.join(',');
      return this;
    } else {
      throw new RuntimeError('ArgumentError', 'lineDash must be an array of integers.');
    }
  }

  /**
   * @param capType
   * @returns this
   */
  setLineCap(capType: CanvasLineCap): this {
    this.attributes['stroke-linecap'] = capType;
    return this;
  }

  // ### Sizing & Scaling Methods:

  abstract resize(width: number, height: number): this;

  scale(x: number, y: number): this {
    // uses viewBox to scale
    // TODO (GCR): we may at some point want to distinguish the
    // style.width / style.height properties that are applied to
    // the SVG object from our internal conception of the SVG
    // width/height.  This would allow us to create automatically
    // scaling SVG's that filled their containers, for instance.
    //
    // As this isn't implemented in Canvas contexts,
    // I've left as is for now, but in using the viewBox to
    // handle internal scaling, am trying to make it possible
    // for us to eventually move in that direction.

    this.state.scale = { x, y };
    const visibleWidth = this.width / x;
    const visibleHeight = this.height / y;
    this.setViewBox(0, 0, visibleWidth, visibleHeight);

    return this;
  }

  /**
   * 1 arg: string in the "x y w h" format
   * 4 args: x:number, y:number, w:number, h:number
   */
  setViewBox(viewBox_or_minX: string | number, minY?: number, width?: number, height?: number): void {
    if (typeof viewBox_or_minX === 'string') {
      this.root.setAttribute('viewBox', viewBox_or_minX);
    } else {
      const viewBoxString = viewBox_or_minX + ' ' + minY + ' ' + width + ' ' + height;
      this.root.setAttribute('viewBox', viewBoxString);
    }
  }

  // ### Drawing helper methods:

  applyAttributes(element: Elem, attributes: Attributes): Elem {
    const attrNamesToIgnore = attrNamesToIgnoreMap[element.nodeName];
    for (const propertyName of Object.keys(attributes)) {
      if (attrNamesToIgnore && attrNamesToIgnore[propertyName]) {
        continue;
      }
      element.setAttributeNS(null, propertyName, attributes[propertyName]);
    }

    return element;
  }

  // ### Shape & Path Methods:

  abstract clear(): void;

  // ## Rectangles:
  rect(x: number, y: number, width: number, height: number, attributes?: Attributes): this {
    // Avoid invalid negative height attribs by
    // flipping the rectangle on its head:
    if (height < 0) {
      y += height;
      height *= -1;
    }

    // Create the rect & style it:
    const rectangle = this.create('rect');
    if (typeof attributes === 'undefined') {
      attributes = {
        fill: 'none',
        'stroke-width': this.lineWidth,
        stroke: 'black',
      };
    }

    attributes = { ...attributes, x, y, width, height };

    this.applyAttributes(rectangle, attributes);

    this.add(rectangle);
    return this;
  }

  fillRect(x: number, y: number, width: number, height: number): this {
    const attributes = { fill: this.attributes.fill };
    this.rect(x, y, width, height, attributes);
    return this;
  }

  clearRect(x: number, y: number, width: number, height: number): this {
    // TODO(GCR): Improve implementation of this...
    // Currently it draws a box of the background color, rather
    // than creating alpha through lower z-levels.
    //
    // See the implementation of this in SVGKit:
    // http://sourceforge.net/projects/svgkit/
    // as a starting point.
    //
    // Adding a large number of transform paths (as we would
    // have to do) could be a real performance hit.  Since
    // tabNote seems to be the only module that makes use of this
    // it may be worth creating a separate tabStave that would
    // draw lines around locations of tablature fingering.
    //
    this.rect(x, y, width, height, this.background_attributes);
    return this;
  }

  // ## Paths:

  beginPath(): this {
    this.path = '';
    this.pen.x = NaN;
    this.pen.y = NaN;
    return this;
  }

  moveTo(x: number, y: number): this {
    this.path += 'M' + x + ' ' + y;
    this.pen.x = x;
    this.pen.y = y;
    return this;
  }

  lineTo(x: number, y: number): this {
    this.path += 'L' + x + ' ' + y;
    this.pen.x = x;
    this.pen.y = y;
    return this;
  }

  bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): this {
    this.path += 'C' + x1 + ' ' + y1 + ',' + x2 + ' ' + y2 + ',' + x + ' ' + y;
    this.pen.x = x;
    this.pen.y = y;
    return this;
  }

  quadraticCurveTo(x1: number, y1: number, x: number, y: number): this {
    this.path += 'Q' + x1 + ' ' + y1 + ',' + x + ' ' + y;
    this.pen.x = x;
    this.pen.y = y;
    return this;
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise: boolean): this {
    const x0 = x + radius * Math.cos(startAngle);
    const y0 = y + radius * Math.sin(startAngle);

    // Handle the edge case where arc length is greater than or equal to
    // the circle's circumference:
    //   https://html.spec.whatwg.org/multipage/canvas.html#ellipse-method-steps
    if (
      (!counterclockwise && endAngle - startAngle >= TWO_PI) ||
      (counterclockwise && startAngle - endAngle >= TWO_PI)
    ) {
      const x1 = x + radius * Math.cos(startAngle + Math.PI);
      const y1 = y + radius * Math.sin(startAngle + Math.PI);
      // There's no way to specify a completely circular arc in SVG so we have to
      // use two semi-circular arcs.
      this.path += `M${x0} ${y0} A${radius} ${radius} 0 0 0 ${x1} ${y1} `;
      this.path += `A${radius} ${radius} 0 0 0 ${x0} ${y0}`;
      this.pen.x = x0;
      this.pen.y = y0;
    } else {
      const x1 = x + radius * Math.cos(endAngle);
      const y1 = y + radius * Math.sin(endAngle);

      startAngle = normalizeAngle(startAngle);
      endAngle = normalizeAngle(endAngle);

      let large: boolean;
      if (Math.abs(endAngle - startAngle) < Math.PI) {
        large = counterclockwise;
      } else {
        large = !counterclockwise;
      }
      if (startAngle > endAngle) {
        large = !large;
      }

      const sweep = !counterclockwise;

      this.path += `M${x0} ${y0} A${radius} ${radius} 0 ${+large} ${+sweep} ${x1} ${y1}`;
      this.pen.x = x1;
      this.pen.y = y1;
    }
    return this;
  }

  closePath(): this {
    this.path += 'Z';
    return this;
  }

  private getShadowStyle(): string {
    const sa = this.shadow_attributes;
    // A CSS drop-shadow filter blur looks different than a canvas shadowBlur
    // of the same radius, so we scale the drop-shadow radius here to make it
    // look close to the canvas shadow.
    return `filter: drop-shadow(0 0 ${sa.width / 1.5}px ${sa.color})`;
  }

  fill(attributes: Attributes): this {
    const path = this.create('path');
    if (typeof attributes === 'undefined') {
      attributes = { ...this.attributes, stroke: 'none' };
    }

    attributes.d = this.path;
    if (this.shadow_attributes.width > 0) {
      attributes.style = this.getShadowStyle();
    }

    this.applyAttributes(path, attributes);
    this.add(path);
    return this;
  }

  stroke(): this {
    const path = this.create('path');
    const attributes: Attributes = {
      ...this.attributes,
      fill: 'none',
      'stroke-width': this.lineWidth,
      d: this.path,
    };
    if (this.shadow_attributes.width > 0) {
      attributes.style = this.getShadowStyle();
    }

    this.applyAttributes(path, attributes);
    this.add(path);
    return this;
  }

  // ## Text Methods:
  measureText(text: string): TextMeasure {
    const family = this.attributes['font-family'];
    const sizeStr = this.attributes['font-size'];
    const weight = this.attributes['font-weight'];
    const size = sizeStr.substring(0, sizeStr.length - 2);
    return this.options.textMeasurer.measureText(text, family, size, weight);
  }

  fillText(text: string, x: number, y: number): this {
    if (!text || text.length <= 0) {
      return this;
    }
    const attributes: Attributes = {
      ...this.attributes,
      stroke: 'none',
      x,
      y,
    };

    const txt = this.create('text');
    txt.textContent = text;
    this.applyAttributes(txt, attributes);
    this.add(txt);
    return this;
  }

  save(): this {
    // TODO(mmuthanna): State needs to be deep-copied.
    this.state_stack.push({
      state: {
        'font-family': this.state['font-family'],
        'font-weight': this.state['font-weight'],
        'font-style': this.state['font-style'],
        'font-size': this.state['font-size'],
        scale: this.state.scale,
      },
      attributes: {
        'font-family': this.attributes['font-family'],
        'font-weight': this.attributes['font-weight'],
        'font-style': this.attributes['font-style'],
        'font-size': this.attributes['font-size'],
        fill: this.attributes.fill,
        stroke: this.attributes.stroke,
        'stroke-width': this.attributes['stroke-width'],
        'stroke-dasharray': this.attributes['stroke-dasharray'],
      },
      shadow_attributes: {
        width: this.shadow_attributes.width,
        color: this.shadow_attributes.color,
      },
      lineWidth: this.lineWidth,
    });
    return this;
  }

  restore(): this {
    // TODO(0xfe): State needs to be deep-restored.
    const savedState = this.state_stack.pop();
    if (savedState) {
      const state = savedState;
      this.state['font-family'] = state.state['font-family'];
      this.state['font-weight'] = state.state['font-weight'];
      this.state['font-style'] = state.state['font-style'];
      this.state['font-size'] = state.state['font-size'];
      this.state.scale = state.state.scale;

      this.attributes['font-family'] = state.attributes['font-family'];
      this.attributes['font-weight'] = state.attributes['font-weight'];
      this.attributes['font-style'] = state.attributes['font-style'];
      this.attributes['font-size'] = state.attributes['font-size'];

      this.attributes.fill = state.attributes.fill;
      this.attributes.stroke = state.attributes.stroke;
      this.attributes['stroke-width'] = state.attributes['stroke-width'];
      this.attributes['stroke-dasharray'] = state.attributes['stroke-dasharray'];

      this.shadow_attributes.width = state.shadow_attributes.width;
      this.shadow_attributes.color = state.shadow_attributes.color;

      this.lineWidth = state.lineWidth;
    }
    return this;
  }

  set font(value: string) {
    this.setRawFont(value);
  }

  get font(): string {
    return this.fontString;
  }

  set fillStyle(style: string | CanvasGradient | CanvasPattern) {
    this.setFillStyle(style as string);
  }

  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return this.attributes.fill;
  }

  set strokeStyle(style: string | CanvasGradient | CanvasPattern) {
    this.setStrokeStyle(style as string);
  }

  get strokeStyle(): string | CanvasGradient | CanvasPattern {
    return this.attributes.stroke;
  }
}

/**
 * SVG rendering context with an API similar to CanvasRenderingContext2D.
 */
export class SVGContext extends SVGContextBase {
  svg: SVGSVGElement;

  element: HTMLElement; // the parent DOM object

  constructor(element: HTMLElement, options: Partial<Options> = {}) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    super(svg, options);
    this.element = element;
    this.element.appendChild(svg);
    this.svg = svg;
  }

  create(svgElementType: string): Elem {
    return document.createElementNS(SVG_NS, svgElementType);
  }

  clear(): void {
    // Clear the SVG by removing all inner children.

    // (This approach is usually slightly more efficient
    // than removing the old SVG & adding a new one to
    // the container element, since it does not cause the
    // container to resize twice.  Also, the resize
    // triggered by removing the entire SVG can trigger
    // a touchcancel event when the element resizes away
    // from a touch point.)

    while (this.svg.lastChild) {
      this.svg.removeChild(this.svg.lastChild);
    }

    // Replace the viewbox attribute we just removed:
    this.scale(this.state.scale.x, this.state.scale.y);
  }

  // TODO (GCR): See note at scale() -- separate our internal
  // conception of pixel-based width/height from the style.width
  // and style.height properties eventually to allow users to
  // apply responsive sizing attributes to the SVG.
  resize(width: number, height: number): this {
    this.width = width;
    this.height = height;
    this.element.style.width = width.toString();

    this.svg.style.width = width.toString();
    this.svg.style.height = height.toString();

    const attributes = {
      width,
      height,
    };

    this.applyAttributes(this.root, attributes);
    this.scale(this.state.scale.x, this.state.scale.y);
    return this;
  }
}

type EventListenerMap = Record<string, [string, EventListener][]>;

class TextElem implements Elem {
  attributes: Record<string, string> = {};
  style: Record<string, string> = {};
  children: TextElem[] = [];
  textContent: string = '';
  eventListeners: [string, EventListener][] = [];

  constructor(public nodeName: string) {}

  appendChild(newChild: TextElem): TextElem {
    this.children.push(newChild);
    return newChild;
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  setAttributeNS(ns: string | null, name: string, value: string): void {
    // We can just ignore the namespace for our purposes.
    this.attributes[name] = value;
  }

  clear() {
    this.attributes = {};
    this.style = {};
    this.children = [];
    this.textContent = '';
  }

  addEventListener(type: string, listener: EventListener): void {
    this.eventListeners.push([type, listener]);
  }

  toString(currIndent: string, indent: string, eventListeners?: EventListenerMap): string {
    let result = `${currIndent}<${this.nodeName}`;
    for (const [key, value] of Object.entries(this.attributes)) {
      result += ` ${key}="${value}"`;
    }

    if (eventListeners && this.eventListeners.length > 0) {
      let id = this.attributes.id;
      if (id === undefined) {
        id = Element.newID();
        result += ` id="${id}"`;
      }
      eventListeners[id] = this.eventListeners;
    }

    if (!this.children) {
      result += `>${this.textContent}</${this.nodeName}>\n`;
    } else {
      result += `>${this.textContent}\n`;
      const childIndent = currIndent + indent;
      for (const child of this.children) {
        result += child.toString(childIndent, indent, eventListeners);
      }
      result += `${indent}</${this.nodeName}>\n`;
    }
    return result;
  }
}

export class SVGTextContext extends SVGContextBase {
  private svg: TextElem;

  constructor(options: Partial<Options> = {}) {
    const svg = new TextElem('svg');
    super(svg, options);
    this.svg = svg;
  }

  create(svgElementType: string): Elem {
    return new TextElem(svgElementType);
  }

  clear(): void {
    this.svg.clear();

    // Replace the viewbox attribute we just removed:
    this.scale(this.state.scale.x, this.state.scale.y);
  }

  resize(width: number, height: number): this {
    this.width = width;
    this.height = height;

    this.svg.style.width = width.toString();
    this.svg.style.height = height.toString();

    const attributes = {
      width,
      height,
    };

    this.applyAttributes(this.root, attributes);
    this.scale(this.state.scale.x, this.state.scale.y);
    return this;
  }

  toString(indent: string = '', eventListeners?: EventListenerMap): string {
    return this.svg.toString('', indent, eventListeners);
  }

  toElement(element: HTMLElement): void {
    const eventListeners: EventListenerMap = {};
    element.innerHTML = this.toString('', eventListeners);
    for (const [id, listeners] of Object.entries(eventListeners)) {
      const target = element.querySelector('#' + id);
      if (target == null) {
        continue;
      }
      for (const [type, listener] of listeners) {
        target.addEventListener(type, listener);
      }
    }
  }
}
