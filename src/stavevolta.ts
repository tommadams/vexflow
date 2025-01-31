// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// Author Larry Kuhns 2011

import { Stave } from './stave';
import { StaveModifier } from './stavemodifier';
import { FontInfo } from './types/common';

export enum VoltaType {
  NONE = 1,
  BEGIN = 2,
  MID = 3,
  END = 4,
  BEGIN_END = 5,
}

export class Volta extends StaveModifier {
  static get CATEGORY(): string {
    return 'Volta';
  }

  static get type(): typeof VoltaType {
    return VoltaType;
  }

  protected volta: number;
  protected number: string;

  protected font: FontInfo;
  protected y_shift: number;

  constructor(type: number, number: string, x: number, y_shift: number) {
    super();
    this.volta = type;
    this.x = x;
    this.y_shift = y_shift;
    this.number = number;
    this.font = {
      family: 'sans-serif',
      size: 9,
      weight: 'bold',
    };
  }

  setShiftY(y: number): this {
    this.y_shift = y;
    return this;
  }

  draw(stave: Stave, x: number): this {
    const ctx = stave.checkContext();
    this.setRendered();

    let width = stave.getWidth() - x; // don't include x (offset) for width
    const top_y = stave.getYForTopText(stave.getNumLines()) + this.y_shift;
    const vert_height = 1.5 * stave.getSpacingBetweenLines();
    switch (this.volta) {
      case VoltaType.BEGIN:
        ctx.fillRect(this.x + x, top_y, 1, vert_height);
        break;
      case VoltaType.END:
        width -= 5;
        ctx.fillRect(this.x + x + width, top_y, 1, vert_height);
        break;
      case VoltaType.BEGIN_END:
        width -= 3;
        ctx.fillRect(this.x + x, top_y, 1, vert_height);
        ctx.fillRect(this.x + x + width, top_y, 1, vert_height);
        break;
      default:
        break;
    }
    // If the beginning of a volta, draw measure number
    if (this.volta === VoltaType.BEGIN || this.volta === VoltaType.BEGIN_END) {
      ctx.save();
      ctx.setFont(this.font.family, this.font.size, this.font.weight);
      ctx.fillText(this.number, this.x + x + 5, top_y + 15);
      ctx.restore();
    }

    ctx.fillRect(this.x + x, top_y, width, 1);
    return this;
  }
}
