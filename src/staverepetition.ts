// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// Author Larry Kuhns 2011

import { Glyph } from './glyph';
import { Stave } from './stave';
import { StaveModifier } from './stavemodifier';
import { FontInfo } from './types/common';

export class Repetition extends StaveModifier {
  static get CATEGORY(): string {
    return 'Repetition';
  }

  static readonly type = {
    NONE: 1, // no coda or segno
    CODA_LEFT: 2, // coda at beginning of stave
    CODA_RIGHT: 3, // coda at end of stave
    SEGNO_LEFT: 4, // segno at beginning of stave
    SEGNO_RIGHT: 5, // segno at end of stave
    DC: 6, // D.C. at end of stave
    DC_AL_CODA: 7, // D.C. al coda at end of stave
    DC_AL_FINE: 8, // D.C. al Fine end of stave
    DS: 9, // D.S. at end of stave
    DS_AL_CODA: 10, // D.S. al coda at end of stave
    DS_AL_FINE: 11, // D.S. al Fine at end of stave
    FINE: 12, // Fine at end of stave
  };

  protected symbol_type: number;

  protected x_shift: number;
  protected y_shift: number;
  protected font: FontInfo;

  constructor(type: number, x: number, y_shift: number) {
    super();

    this.symbol_type = type;
    this.x = x;
    this.x_shift = 0;
    this.y_shift = y_shift;
    this.font = {
      family: 'times',
      size: 12,
      weight: 'bold',
      style: 'italic',
    };
  }

  setShiftX(x: number): this {
    this.x_shift = x;
    return this;
  }

  setShiftY(y: number): this {
    this.y_shift = y;
    return this;
  }

  draw(stave: Stave, x: number): this {
    this.setRendered();

    switch (this.symbol_type) {
      case Repetition.type.CODA_RIGHT:
        this.drawCodaFixed(stave, x + stave.getWidth());
        break;
      case Repetition.type.CODA_LEFT:
        this.drawSymbolText(stave, x, 'Coda', true);
        break;
      case Repetition.type.SEGNO_LEFT:
        this.drawSignoFixed(stave, x);
        break;
      case Repetition.type.SEGNO_RIGHT:
        this.drawSignoFixed(stave, x + stave.getWidth());
        break;
      case Repetition.type.DC:
        this.drawSymbolText(stave, x, 'D.C.', false);
        break;
      case Repetition.type.DC_AL_CODA:
        this.drawSymbolText(stave, x, 'D.C. al', true);
        break;
      case Repetition.type.DC_AL_FINE:
        this.drawSymbolText(stave, x, 'D.C. al Fine', false);
        break;
      case Repetition.type.DS:
        this.drawSymbolText(stave, x, 'D.S.', false);
        break;
      case Repetition.type.DS_AL_CODA:
        this.drawSymbolText(stave, x, 'D.S. al', true);
        break;
      case Repetition.type.DS_AL_FINE:
        this.drawSymbolText(stave, x, 'D.S. al Fine', false);
        break;
      case Repetition.type.FINE:
        this.drawSymbolText(stave, x, 'Fine', false);
        break;
      default:
        break;
    }

    return this;
  }

  drawCodaFixed(stave: Stave, x: number): this {
    const y = stave.getYForTopText(stave.getNumLines()) + this.y_shift;
    Glyph.renderGlyph(stave.checkContext(), this.x + x + this.x_shift, y + 25, 40, 'coda', { category: 'coda' });
    return this;
  }

  drawSignoFixed(stave: Stave, x: number): this {
    const y = stave.getYForTopText(stave.getNumLines()) + this.y_shift;
    Glyph.renderGlyph(stave.checkContext(), this.x + x + this.x_shift, y + 25, 30, 'segno', { category: 'segno' });
    return this;
  }

  drawSymbolText(stave: Stave, x: number, text: string, draw_coda: boolean): this {
    const ctx = stave.checkContext();

    ctx.save();
    ctx.setFont(this.font.family, this.font.size, this.font.weight);
    // Default to right symbol
    let text_x = 0 + this.x_shift;
    let symbol_x = x + this.x_shift;
    if (this.symbol_type === Repetition.type.CODA_LEFT) {
      // Offset Coda text to right of stave beginning
      text_x = this.x + stave.getVerticalBarWidth();
      symbol_x = text_x + ctx.measureText(text).width + 12;
    } else if (this.symbol_type === Repetition.type.DS) {
      const modifierWidth = stave.getNoteStartX() - this.x;
      text_x = this.x + x + this.x_shift + stave.getWidth() - 5 - modifierWidth - ctx.measureText(text).width;
      // TODO this is weird. setting the x position should probably be refactored, parameters aren't clear here.
    } else {
      // Offset Signo text to left stave end
      symbol_x = this.x + x + stave.getWidth() - 5 + this.x_shift;
      text_x = symbol_x - +ctx.measureText(text).width - 12;
    }

    const y = stave.getYForTopText(stave.getNumLines()) + this.y_shift;
    if (draw_coda) {
      Glyph.renderGlyph(ctx, symbol_x, y, 40, 'coda', { category: 'coda' });
    }

    ctx.fillText(text, text_x, y + 5);
    ctx.restore();

    return this;
  }
}
