// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// MIT License
//
// StaveNote Tests

// TODO: In StaveNote.preFormat() line 929, should noteHeadPadding default to StaveNote.minNoteheadPadding?
//       The bounding box of a note changes slightly when we add a ModifierContext (even if we add zero modifiers).

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Accidental } from '../src/accidental';
import { Annotation } from '../src/annotation';
import { Articulation } from '../src/articulation';
import { Beam } from '../src/beam';
import { Flow } from '../src/flow';
import { Formatter } from '../src/formatter';
import { Fraction } from '../src/fraction';
import { FretHandFinger } from '../src/frethandfinger';
import { Modifier, ModifierPosition } from '../src/modifier';
import { ModifierContext } from '../src/modifiercontext';
import { RenderContext } from '../src/rendercontext';
import { ContextBuilder } from '../src/renderer';
import { Stave } from '../src/stave';
import { StaveNote, StaveNoteStruct } from '../src/stavenote';
import { Stem } from '../src/stem';
import { StringNumber } from '../src/stringnumber';
import { Stroke } from '../src/strokes';
import { TickContext } from '../src/tickcontext';

const StaveNoteTests = {
  Start(): void {
    QUnit.module('StaveNote');
    test('Tick', ticks);
    test('Tick - New API', ticksNewAPI);
    test('Stem', stem);
    test('Automatic Stem Direction', autoStem);
    test('Stem Extension Pitch', stemExtensionPitch);
    test('Displacement after calling setStemDirection', setStemDirectionDisplacement);
    test('StaveLine', staveLine);
    test('Width', width);
    test('TickContext', tickContext);

    const run = VexFlowTests.runTests;
    run('StaveNote Draw - Treble', drawBasic, { clef: 'treble', octaveShift: 0, restKey: 'r/4' });
    run('StaveNote BoundingBoxes - Treble', drawBoundingBoxes, { clef: 'treble', octaveShift: 0, restKey: 'r/4' });
    run('StaveNote Draw - Alto', drawBasic, { clef: 'alto', octaveShift: -1, restKey: 'r/4' });
    run('StaveNote Draw - Tenor', drawBasic, { clef: 'tenor', octaveShift: -1, restKey: 'r/3' });
    run('StaveNote Draw - Bass', drawBasic, { clef: 'bass', octaveShift: -2, restKey: 'r/3' });
    run('StaveNote Draw - Harmonic And Muted', drawHarmonicAndMuted);
    run('StaveNote Draw - Slash', drawSlash);
    run('Displacements', displacements);
    run('StaveNote Draw - Bass 2', drawBass);
    run('StaveNote Draw - Key Styles', drawKeyStyles);
    run('StaveNote Draw - StaveNote Stem Styles', drawNoteStemStyles);
    run('StaveNote Draw - StaveNote Stem Lengths', drawNoteStemLengths);
    run('StaveNote Draw - StaveNote Flag Styles', drawNoteStylesWithFlag);
    run('StaveNote Draw - StaveNote Styles', drawNoteStyles);
    run('Stave, Ledger Line, Beam, Stem and Flag Styles', drawBeamStyles);
    run('Flag and Dot Placement - Stem Up', dotsAndFlagsStemUp);
    run('Flag and Dots Placement - Stem Down', dotsAndFlagsStemDown);
    run('Beam and Dot Placement - Stem Up', dotsAndBeamsUp);
    run('Beam and Dot Placement - Stem Down', dotsAndBeamsDown);
    run('Center Aligned Note', centerAlignedRest);
    run('Center Aligned Note with Articulation', centerAlignedRestFermata);
    run('Center Aligned Note with Annotation', centerAlignedRestAnnotation);
    run('Center Aligned Note - Multi Voice', centerAlignedMultiVoice);
    run('Center Aligned Note with Multiple Modifiers', centerAlignedNoteMultiModifiers);

    // This interactivity test currently only works with the SVG backend.
    VexFlowTests.runSVGTest('Interactive Mouseover StaveNote', drawBasic, {
      clef: 'treble',
      octaveShift: 0,
      restKey: 'r/4',
      ui: true,
    });
  },
};

// Helper function to create StaveNotes.
const staveNote = (struct: StaveNoteStruct) => new StaveNote(struct);

/**
 * Helper function to draw a note with an optional bounding box.
 */
function draw(
  note: StaveNote,
  stave: Stave,
  context: RenderContext,
  x: number,
  drawBoundingBox: boolean = false,
  addModifierContext: boolean = true
) {
  // Associate the note with the stave.
  note.setStave(stave);

  // A ModifierContext is required for dots and other modifiers to be drawn properly.
  // If added, it changes the bounding box of a note, even if there are no modifiers to draw.
  // See StaveNote.minNoteheadPadding in stavenote.ts.
  if (addModifierContext) {
    note.addToModifierContext(new ModifierContext());
  }

  new TickContext().addTickable(note).preFormat().setX(x);
  note.setContext(context).draw();

  if (drawBoundingBox) {
    const bb = note.getBoundingBox();
    context.rect(bb.getX(), bb.getY(), bb.getW(), bb.getH());
    context.stroke();
  }
  return note;
}

function ticks(): void {
  const BEAT = (1 * Flow.RESOLUTION) / 4;

  // Key value pairs of `testName: [durationString, expectedBeats, expectedNoteType]`
  const tickTests: Record<string, [string, number, string]> = {
    'Breve note': ['1/2', 8.0, 'n'],
    'Whole note': ['w', 4.0, 'n'],
    'Quarter note': ['q', 1.0, 'n'],
    'Dotted half note': ['hd', 3.0, 'n'],
    'Doubled-dotted half note': ['hdd', 3.5, 'n'],
    'Triple-dotted half note': ['hddd', 3.75, 'n'],
    'Dotted half rest': ['hdr', 3.0, 'r'],
    'Double-dotted half rest': ['hddr', 3.5, 'r'],
    'Triple-dotted half rest': ['hdddr', 3.75, 'r'],
    'Dotted harmonic quarter note': ['qdh', 1.5, 'h'],
    'Double-dotted harmonic quarter note': ['qddh', 1.75, 'h'],
    'Triple-dotted harmonic quarter note': ['qdddh', 1.875, 'h'],
    'Dotted muted 8th note': ['8dm', 0.75, 'm'],
    'Double-dotted muted 8th note': ['8ddm', 0.875, 'm'],
    'Triple-dotted muted 8th note': ['8dddm', 0.9375, 'm'],
  };

  Object.keys(tickTests).forEach((testName: string) => {
    const testData = tickTests[testName];
    const durationString = testData[0];
    const expectedBeats = testData[1];
    const expectedNoteType = testData[2];
    const note = new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: durationString });
    equal(note.getTicks().value(), BEAT * expectedBeats, testName + ' must have ' + expectedBeats + ' beats');
    equal(note.getNoteType(), expectedNoteType, 'Note type must be ' + expectedNoteType);
  });

  throws(
    () => new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '8.7dddm' }),
    /BadArguments/,
    "Invalid note duration '8.7' throws BadArguments exception"
  );

  throws(
    () => new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '2Z' }),
    /BadArguments/,
    "Invalid note type 'Z' throws BadArguments exception"
  );

  throws(
    () => new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '2dddZ' }),
    /BadArguments/,
    "Invalid note type 'Z' throws BadArguments exception"
  );
}

function ticksNewAPI(): void {
  const BEAT = (1 * Flow.RESOLUTION) / 4;

  // Key value pairs of `testName: [noteData, expectedBeats, expectedNoteType]`
  const tickTests: Record<string, [StaveNoteStruct, number, string]> = {
    'Breve note': [{ duration: '1/2' }, 8.0, 'n'],
    'Whole note': [{ duration: 'w' }, 4.0, 'n'],
    'Quarter note': [{ duration: 'q' }, 1.0, 'n'],
    'Dotted half note': [{ duration: 'h', dots: 1 }, 3.0, 'n'],
    'Doubled-dotted half note': [{ duration: 'h', dots: 2 }, 3.5, 'n'],
    'Triple-dotted half note': [{ duration: 'h', dots: 3 }, 3.75, 'n'],
    'Dotted half rest': [{ duration: 'h', dots: 1, type: 'r' }, 3.0, 'r'],
    'Double-dotted half rest': [{ duration: 'h', dots: 2, type: 'r' }, 3.5, 'r'],
    'Triple-dotted half rest': [{ duration: 'h', dots: 3, type: 'r' }, 3.75, 'r'],
    'Dotted harmonic quarter note': [{ duration: 'q', dots: 1, type: 'h' }, 1.5, 'h'],
    'Double-dotted harmonic quarter note': [{ duration: 'q', dots: 2, type: 'h' }, 1.75, 'h'],
    'Triple-dotted harmonic quarter note': [{ duration: 'q', dots: 3, type: 'h' }, 1.875, 'h'],
    'Dotted muted 8th note': [{ duration: '8', dots: 1, type: 'm' }, 0.75, 'm'],
    'Double-dotted muted 8th note': [{ duration: '8', dots: 2, type: 'm' }, 0.875, 'm'],
    'Triple-dotted muted 8th note': [{ duration: '8', dots: 3, type: 'm' }, 0.9375, 'm'],
  };

  Object.keys(tickTests).forEach(function (testName) {
    const testData = tickTests[testName];
    const noteData = testData[0];
    const expectedBeats = testData[1];
    const expectedNoteType = testData[2];

    noteData.keys = ['c/4', 'e/4', 'g/4'];

    const note = new StaveNote(noteData);
    equal(note.getTicks().value(), BEAT * expectedBeats, testName + ' must have ' + expectedBeats + ' beats');
    equal(note.getNoteType(), expectedNoteType, 'Note type must be ' + expectedNoteType);
  });

  throws(
    () => new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '8.7dddm' }),
    /BadArguments/,
    "Invalid note duration '8.7' throws BadArguments exception"
  );

  throws(
    () => new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '2Z' }),
    /BadArguments/,
    "Invalid note type 'Z' throws BadArguments exception"
  );

  throws(
    () => new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '2dddZ' }),
    /BadArguments/,
    "Invalid note type 'Z' throws BadArguments exception"
  );
}

function stem(): void {
  const note = new StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: 'w' });
  equal(note.getStemDirection(), Stem.UP, 'Default note has UP stem');
}

function autoStem(): void {
  const testData: [/* keys */ string[], /* expectedStemDirection */ number][] = [
    [['c/5', 'e/5', 'g/5'], Stem.DOWN],
    [['e/4', 'g/4', 'c/5'], Stem.UP],
    [['c/5'], Stem.DOWN],
    [['a/4', 'e/5', 'g/5'], Stem.DOWN],
    [['b/4'], Stem.DOWN],
  ];
  testData.forEach((td) => {
    const keys = td[0];
    const expectedStemDirection = td[1];
    const note = new StaveNote({ keys: keys, auto_stem: true, duration: '8' });
    equal(
      note.getStemDirection(),
      expectedStemDirection,
      'Stem must be ' + (expectedStemDirection === Stem.UP ? 'up' : 'down')
    );
  });
}

function stemExtensionPitch(): void {
  // [keys, expectedStemExtension, override stem direction]
  const testData: [string[], number, number][] = [
    [['c/5', 'e/5', 'g/5'], 0, 0],
    [['e/4', 'g/4', 'c/5'], 0, 0],
    [['c/5'], 0, 0],
    [['f/3'], 15, 0],
    [['f/3'], 15, Stem.UP],
    [['f/3'], 0, Stem.DOWN],
    [['f/3', 'e/5'], 0, 0],
    [['g/6'], 25, 0],
    [['g/6'], 25, Stem.DOWN],
    [['g/6'], 0, Stem.UP],
  ];
  testData.forEach((td) => {
    const keys = td[0];
    const expectedStemExtension = td[1];
    const overrideStemDirection = td[2];
    let note;
    if (overrideStemDirection === 0) {
      note = new StaveNote({ keys: keys, auto_stem: true, duration: '4' });
    } else {
      note = new StaveNote({ keys: keys, duration: '4', stem_direction: overrideStemDirection });
    }
    equal(
      note.getStemExtension(),
      expectedStemExtension,
      'For ' + keys.toString() + ' StemExtension must be ' + expectedStemExtension
    );
    // set to weird Stave
    const stave = new Stave(10, 10, 300, { spacing_between_lines_px: 20 });
    note.setStave(stave);
    equal(
      note.getStemExtension(),
      expectedStemExtension * 2,
      'For wide staff ' + keys.toString() + ' StemExtension must be ' + expectedStemExtension * 2
    );

    const whole_note = new StaveNote({ keys: keys, duration: 'w' });
    equal(
      whole_note.getStemExtension(),
      -1 * Flow.STEM_HEIGHT,
      'For ' + keys.toString() + ' whole_note StemExtension must always be -1 * Flow.STEM_HEIGHT'
    );
  });
}

function setStemDirectionDisplacement(): void {
  function getDisplacements(note: StaveNote) {
    // eslint-disable-next-line
    // @ts-ignore direct access to protected variable .note_heads
    return note.note_heads.map((notehead) => notehead.isDisplaced());
  }

  const stemUpDisplacements = [false, true, false];
  const stemDownDisplacements = [true, false, false];

  const note = new StaveNote({ keys: ['c/5', 'd/5', 'g/5'], stem_direction: Stem.UP, duration: '4' });
  deepEqual(getDisplacements(note), stemUpDisplacements);
  note.setStemDirection(Stem.DOWN);
  deepEqual(getDisplacements(note), stemDownDisplacements);
  note.setStemDirection(Stem.UP);
  deepEqual(getDisplacements(note), stemUpDisplacements);
}

function staveLine(): void {
  const stave = new Stave(10, 10, 300);
  const note = new StaveNote({ keys: ['c/4', 'e/4', 'a/4'], duration: 'w' });
  note.setStave(stave);

  const props = note.getKeyProps();
  equal(props[0].line, 0, 'C/4 on line 0');
  equal(props[1].line, 1, 'E/4 on line 1');
  equal(props[2].line, 2.5, 'A/4 on line 2.5');

  const ys = note.getYs();
  equal(ys.length, 3, 'Chord should be rendered on three lines');
  equal(ys[0], 100, 'Line for C/4');
  equal(ys[1], 90, 'Line for E/4');
  equal(ys[2], 75, 'Line for A/4');
}

function width(): void {
  const note = new StaveNote({ keys: ['c/4', 'e/4', 'a/4'], duration: 'w' });
  throws(() => note.getWidth(), /UnformattedNote/, 'Unformatted note should have no width');
}

function tickContext(): void {
  const stave = new Stave(10, 10, 400);
  const note = new StaveNote({ keys: ['c/4', 'e/4', 'a/4'], duration: 'w' }).setStave(stave);

  new TickContext().addTickable(note).preFormat().setX(10).setPadding(0);

  expect(0);
}

function drawBasic(options: TestOptions, contextBuilder: ContextBuilder): void {
  const clef = options.params.clef;
  const octaveShift = options.params.octaveShift;
  const restKey = options.params.restKey;

  const ctx = contextBuilder(options.elementId, 700, 180);
  const stave = new Stave(10, 30, 750);
  stave.setContext(ctx);
  stave.addClef(clef);
  stave.draw();

  const lowerKeys = ['c/', 'e/', 'a/'];
  const higherKeys = ['c/', 'e/', 'a/'];
  for (let k = 0; k < lowerKeys.length; k++) {
    lowerKeys[k] = lowerKeys[k] + (4 + octaveShift);
    higherKeys[k] = higherKeys[k] + (5 + octaveShift);
  }

  const restKeys = [restKey];

  const noteStructs: StaveNoteStruct[] = [
    { clef: clef, keys: higherKeys, duration: '1/2' },
    { clef: clef, keys: lowerKeys, duration: 'w' },
    { clef: clef, keys: higherKeys, duration: 'h' },
    { clef: clef, keys: lowerKeys, duration: 'q' },
    { clef: clef, keys: higherKeys, duration: '8' },
    { clef: clef, keys: lowerKeys, duration: '16' },
    { clef: clef, keys: higherKeys, duration: '32' },
    { clef: clef, keys: higherKeys, duration: '64' },
    { clef: clef, keys: higherKeys, duration: '128' },
    { clef: clef, keys: lowerKeys, duration: '1/2', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: 'w', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: 'h', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: 'q', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '8', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '16', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '32', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '64', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '128', stem_direction: Stem.DOWN },

    { clef: clef, keys: restKeys, duration: '1/2r' },
    { clef: clef, keys: restKeys, duration: 'wr' },
    { clef: clef, keys: restKeys, duration: 'hr' },
    { clef: clef, keys: restKeys, duration: 'qr' },
    { clef: clef, keys: restKeys, duration: '8r' },
    { clef: clef, keys: restKeys, duration: '16r' },
    { clef: clef, keys: restKeys, duration: '32r' },
    { clef: clef, keys: restKeys, duration: '64r' },
    { clef: clef, keys: restKeys, duration: '128r' },
    { keys: ['x/4'], duration: 'h' },
  ];
  expect(noteStructs.length * 2);

  const colorDescendants = (parentItem: SVGElement, color: string) => () =>
    parentItem.querySelectorAll('*').forEach((child) => {
      child.setAttribute('fill', color);
      child.setAttribute('stroke', color);
    });

  for (let i = 0; i < noteStructs.length; ++i) {
    const note = draw(staveNote(noteStructs[i]), stave, ctx, (i + 1) * 25);

    // If this is an interactivity test (ui: true), then attach mouseover & mouseout handlers to the notes.
    if (options.params.ui) {
      const item = note.getAttribute('el') as SVGElement;
      item.addEventListener('mouseover', colorDescendants(item, 'green'), false);
      item.addEventListener('mouseout', colorDescendants(item, 'black'), false);
    }
    ok(note.getX() > 0, 'Note ' + i + ' has X value');
    ok(note.getYs().length > 0, 'Note ' + i + ' has Y values');
  }
}

function drawBoundingBoxes(options: TestOptions, contextBuilder: ContextBuilder): void {
  const clef = options.params.clef;
  const octaveShift = options.params.octaveShift;
  const restKey = options.params.restKey;

  const ctx = contextBuilder(options.elementId, 700, 180);
  const stave = new Stave(10, 30, 750);
  stave.setContext(ctx);
  stave.addClef(clef);
  stave.draw();

  const lowerKeys = ['c/', 'e/', 'a/'];
  const higherKeys = ['c/', 'e/', 'a/'];
  for (let k = 0; k < lowerKeys.length; k++) {
    lowerKeys[k] = lowerKeys[k] + (4 + octaveShift);
    higherKeys[k] = higherKeys[k] + (5 + octaveShift);
  }

  const restKeys = [restKey];

  const noteStructs = [
    { clef: clef, keys: higherKeys, duration: '1/2' },
    { clef: clef, keys: lowerKeys, duration: 'w' },
    { clef: clef, keys: higherKeys, duration: 'h' },
    { clef: clef, keys: lowerKeys, duration: 'q' },
    { clef: clef, keys: higherKeys, duration: '8' },
    { clef: clef, keys: lowerKeys, duration: '16' },
    { clef: clef, keys: higherKeys, duration: '32' },
    { clef: clef, keys: higherKeys, duration: '64' },
    { clef: clef, keys: higherKeys, duration: '128' },
    { clef: clef, keys: lowerKeys, duration: '1/2', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: 'w', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: 'h', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: 'q', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '8', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '16', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '32', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '64', stem_direction: Stem.DOWN },
    { clef: clef, keys: lowerKeys, duration: '128' },

    { clef: clef, keys: restKeys, duration: '1/2r' },
    { clef: clef, keys: restKeys, duration: 'wr' },
    { clef: clef, keys: restKeys, duration: 'hr' },
    { clef: clef, keys: restKeys, duration: 'qr' },
    { clef: clef, keys: restKeys, duration: '8r' },
    { clef: clef, keys: restKeys, duration: '16r' },
    { clef: clef, keys: restKeys, duration: '32r' },
    { clef: clef, keys: restKeys, duration: '64r' },
    { clef: clef, keys: restKeys, duration: '128r' },
    { keys: ['x/4'], duration: 'h' },
  ];
  expect(noteStructs.length * 2);

  for (let i = 0; i < noteStructs.length; ++i) {
    const note = draw(
      staveNote(noteStructs[i]),
      stave,
      ctx,
      (i + 1) * 25,
      true /* drawBoundingBox */,
      false /* addModifierContext */
    );

    ok(note.getX() > 0, 'Note ' + i + ' has X value');
    ok(note.getYs().length > 0, 'Note ' + i + ' has Y values');
  }
}

function drawBass(options: TestOptions, contextBuilder: ContextBuilder): void {
  expect(40);
  const ctx = contextBuilder(options.elementId, 600, 280);
  const stave = new Stave(10, 10, 650);
  stave.setContext(ctx);
  stave.addClef('bass');
  stave.draw();

  const noteStructs: StaveNoteStruct[] = [
    { clef: 'bass', keys: ['c/3', 'e/3', 'a/3'], duration: '1/2' },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: 'w' },
    { clef: 'bass', keys: ['c/3', 'e/3', 'a/3'], duration: 'h' },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: 'q' },
    { clef: 'bass', keys: ['c/3', 'e/3', 'a/3'], duration: '8' },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: '16' },
    { clef: 'bass', keys: ['c/3', 'e/3', 'a/3'], duration: '32' },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: 'h', stem_direction: Stem.DOWN },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: 'q', stem_direction: Stem.DOWN },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: '8', stem_direction: Stem.DOWN },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: '16', stem_direction: Stem.DOWN },
    { clef: 'bass', keys: ['c/2', 'e/2', 'a/2'], duration: '32', stem_direction: Stem.DOWN },

    { keys: ['r/4'], duration: '1/2r' },
    { keys: ['r/4'], duration: 'wr' },
    { keys: ['r/4'], duration: 'hr' },
    { keys: ['r/4'], duration: 'qr' },
    { keys: ['r/4'], duration: '8r' },
    { keys: ['r/4'], duration: '16r' },
    { keys: ['r/4'], duration: '32r' },
    { keys: ['x/4'], duration: 'h' },
  ];

  for (let i = 0; i < noteStructs.length; ++i) {
    const note = draw(staveNote(noteStructs[i]), stave, ctx, (i + 1) * 25);

    ok(note.getX() > 0, 'Note ' + i + ' has X value');
    ok(note.getYs().length > 0, 'Note ' + i + ' has Y values');
  }
}

function displacements(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 700, 155);
  ctx.scale(0.9, 0.9);
  ctx.fillStyle = '#221';
  ctx.strokeStyle = '#221';

  const stave = new Stave(10, 10, 675);
  stave.setContext(ctx);
  stave.draw();

  const noteStructs = [
    { keys: ['g/3', 'a/3', 'c/4', 'd/4', 'e/4'], duration: '1/2' },
    { keys: ['g/3', 'a/3', 'c/4', 'd/4', 'e/4'], duration: 'w' },
    { keys: ['d/4', 'e/4', 'f/4'], duration: 'h' },
    { keys: ['f/4', 'g/4', 'a/4', 'b/4'], duration: 'q' },
    { keys: ['e/3', 'b/3', 'c/4', 'e/4', 'f/4', 'g/5', 'a/5'], duration: '8' },
    { keys: ['a/3', 'c/4', 'e/4', 'g/4', 'a/4', 'b/4'], duration: '16' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '32' },
    { keys: ['c/4', 'e/4', 'a/4', 'a/4'], duration: '64' },
    { keys: ['g/3', 'c/4', 'd/4', 'e/4'], duration: 'h', stem_direction: Stem.DOWN },
    { keys: ['d/4', 'e/4', 'f/4'], duration: 'q', stem_direction: Stem.DOWN },
    { keys: ['f/4', 'g/4', 'a/4', 'b/4'], duration: '8', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'd/4', 'e/4', 'f/4', 'g/4', 'a/4'], duration: '16', stem_direction: Stem.DOWN },
    { keys: ['b/3', 'c/4', 'e/4', 'a/4', 'b/5', 'c/6', 'e/6'], duration: '32', stem_direction: Stem.DOWN },
    {
      keys: ['b/3', 'c/4', 'e/4', 'a/4', 'b/5', 'c/6', 'e/6', 'e/6'],
      duration: '64',
      stem_direction: Stem.DOWN,
    },
  ];
  expect(noteStructs.length * 2);

  for (let i = 0; i < noteStructs.length; ++i) {
    const note = draw(staveNote(noteStructs[i]), stave, ctx, (i + 1) * 45);

    ok(note.getX() > 0, 'Note ' + i + ' has X value');
    ok(note.getYs().length > 0, 'Note ' + i + ' has Y values');
  }
}

function drawHarmonicAndMuted(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 1000, 180);
  const stave = new Stave(10, 10, 950);
  stave.setContext(ctx);
  stave.draw();

  const noteStructs = [
    { keys: ['c/4', 'e/4', 'a/4'], duration: '1/2h' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'wh' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'hh' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'qh' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '8h' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '16h' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '32h' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '64h' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '128h' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '1/2h', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'wh', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'hh', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'qh', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '8h', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '16h', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '32h', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '64h', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '128h', stem_direction: Stem.DOWN },

    { keys: ['c/4', 'e/4', 'a/4'], duration: '1/2m' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'wm' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'hm' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'qm' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '8m' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '16m' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '32m' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '64m' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '128m' },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '1/2m', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'wm', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'hm', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: 'qm', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '8m', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '16m', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '32m', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '64m', stem_direction: Stem.DOWN },
    { keys: ['c/4', 'e/4', 'a/4'], duration: '128m', stem_direction: Stem.DOWN },
  ];
  expect(noteStructs.length * 2);

  for (let i = 0; i < noteStructs.length; ++i) {
    const note = draw(staveNote(noteStructs[i]), stave, ctx, i * 25 + 5);

    ok(note.getX() > 0, 'Note ' + i + ' has X value');
    ok(note.getYs().length > 0, 'Note ' + i + ' has Y values');
  }
}

function drawSlash(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 700, 180);
  const stave = new Stave(10, 10, 650);
  stave.setContext(ctx);
  stave.draw();

  const notes = [
    { keys: ['b/4'], duration: '1/2s', stem_direction: Stem.DOWN },
    { keys: ['b/4'], duration: 'ws', stem_direction: Stem.DOWN },
    { keys: ['b/4'], duration: 'hs', stem_direction: Stem.DOWN },
    { keys: ['b/4'], duration: 'qs', stem_direction: Stem.DOWN },
    { keys: ['b/4'], duration: '8s', stem_direction: Stem.DOWN },
    { keys: ['b/4'], duration: '16s', stem_direction: Stem.DOWN },
    { keys: ['b/4'], duration: '32s', stem_direction: Stem.DOWN },
    { keys: ['b/4'], duration: '64s', stem_direction: Stem.DOWN },
    { keys: ['b/4'], duration: '128s', stem_direction: Stem.DOWN },

    { keys: ['b/4'], duration: '1/2s', stem_direction: Stem.UP },
    { keys: ['b/4'], duration: 'ws', stem_direction: Stem.UP },
    { keys: ['b/4'], duration: 'hs', stem_direction: Stem.UP },
    { keys: ['b/4'], duration: 'qs', stem_direction: Stem.UP },
    { keys: ['b/4'], duration: '8s', stem_direction: Stem.UP },
    { keys: ['b/4'], duration: '16s', stem_direction: Stem.UP },
    { keys: ['b/4'], duration: '32s', stem_direction: Stem.UP },
    { keys: ['b/4'], duration: '64s', stem_direction: Stem.UP },
    { keys: ['b/4'], duration: '128s', stem_direction: Stem.UP },

    // Beam
    { keys: ['b/4'], duration: '8s', stem_direction: Stem.DOWN },
    { keys: ['b/4'], duration: '8s', stem_direction: Stem.DOWN },
    { keys: ['b/4'], duration: '8s', stem_direction: Stem.UP },
    { keys: ['b/4'], duration: '8s', stem_direction: Stem.UP },
  ];

  const stave_notes = notes.map((struct) => new StaveNote(struct));
  const beam1 = new Beam([stave_notes[16], stave_notes[17]]);
  const beam2 = new Beam([stave_notes[18], stave_notes[19]]);

  Formatter.FormatAndDraw(ctx, stave, stave_notes, false);

  beam1.setContext(ctx).draw();
  beam2.setContext(ctx).draw();

  ok('Slash Note Heads');
}

function drawKeyStyles(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 300, 280);
  ctx.scale(3, 3);

  const stave = new Stave(10, 0, 100);

  const note = new StaveNote({ keys: ['g/4', 'bb/4', 'd/5'], duration: 'q' })
    .setStave(stave)
    .addAccidental(1, new Accidental('b'))
    .setKeyStyle(1, { shadowBlur: 2, shadowColor: 'blue', fillStyle: 'blue' });

  new TickContext().addTickable(note).preFormat().setX(25);

  stave.setContext(ctx).draw();
  note.setContext(ctx).draw();

  ok(note.getX() > 0, 'Note has X value');
  ok(note.getYs().length > 0, 'Note has Y values');
}

function drawNoteStyles(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 300, 280);
  const stave = new Stave(10, 0, 100);
  ctx.scale(3, 3);

  const note = new StaveNote({ keys: ['g/4', 'bb/4', 'd/5'], duration: '8' })
    .setStave(stave)
    .addAccidental(1, new Accidental('b'));

  note.setStyle({ shadowBlur: 2, shadowColor: 'blue', fillStyle: 'blue', strokeStyle: 'blue' });

  new TickContext().addTickable(note).preFormat().setX(25);

  stave.setContext(ctx).draw();
  note.setContext(ctx).draw();

  ok(note.getX() > 0, 'Note has X value');
  ok(note.getYs().length > 0, 'Note has Y values');
}

function drawNoteStemStyles(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 300, 280);
  const stave = new Stave(10, 0, 100);
  ctx.scale(3, 3);

  const note = new StaveNote({ keys: ['g/4', 'bb/4', 'd/5'], duration: 'q' })
    .setStave(stave)
    .addAccidental(1, new Accidental('b'));

  note.setStemStyle({ shadowBlur: 2, shadowColor: 'blue', fillStyle: 'blue', strokeStyle: 'blue' });

  new TickContext().addTickable(note).preFormat().setX(25);

  stave.setContext(ctx).draw();
  note.setContext(ctx).draw();

  ok('Note Stem Style');
}

function drawNoteStemLengths(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 975, 150);
  const stave = new Stave(10, 10, 975);
  stave.setContext(ctx).draw();

  const keys = [
    'e/3',
    'f/3',
    'g/3',
    'a/3',
    'b/3',
    'c/4',
    'd/4',
    'e/4',
    'f/4',
    'g/4',
    'f/5',
    'g/5',
    'a/5',
    'b/5',
    'c/6',
    'd/6',
    'e/6',
    'f/6',
    'g/6',
    'a/6',
  ];
  const notes: StaveNote[] = [];
  let note;
  let i;

  for (i = 0; i < keys.length; i++) {
    let duration = 'q';
    if (i % 2 === 1) {
      duration = '8';
    }
    note = new StaveNote({ keys: [keys[i]], duration, auto_stem: true }).setStave(stave);
    new TickContext().addTickable(note);
    note.setContext(ctx);
    notes.push(note);
  }

  const whole_keys = ['e/3', 'a/3', 'f/5', 'a/5', 'd/6', 'a/6'];
  for (i = 0; i < whole_keys.length; i++) {
    note = new StaveNote({ keys: [whole_keys[i]], duration: 'w' }).setStave(stave);
    new TickContext().addTickable(note);
    note.setContext(ctx);
    notes.push(note);
  }
  Formatter.FormatAndDraw(ctx, stave, notes);

  ok('Note Stem Length');
}

function drawNoteStylesWithFlag(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 300, 280);
  const stave = new Stave(10, 0, 100);
  ctx.scale(3, 3);

  const note = new StaveNote({ keys: ['g/4', 'bb/4', 'd/5'], duration: '8' })
    .setStave(stave)
    .addAccidental(1, new Accidental('b'));

  note.setFlagStyle({ shadowBlur: 2, shadowColor: 'blue', fillStyle: 'blue', strokeStyle: 'blue' });

  new TickContext().addTickable(note).preFormat().setX(25);

  stave.setContext(ctx).draw();
  note.setContext(ctx).draw();

  ok(note.getX() > 0, 'Note has X value');
  ok(note.getYs().length > 0, 'Note has Y values');
}

function drawBeamStyles(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 160);
  const stave = new Stave(10, 10, 380);
  stave.setStyle({ strokeStyle: '#EEAAEE', lineWidth: 3 });
  stave.setContext(ctx);
  stave.draw();

  const notes = [
    // beam1
    { keys: ['b/4'], duration: '8', stem_direction: Stem.DOWN },
    { keys: ['b/4'], duration: '8', stem_direction: Stem.DOWN },

    // should be unstyled...
    { keys: ['b/4'], duration: '8', stem_direction: Stem.DOWN },

    // beam2 should also be unstyled
    { keys: ['b/4'], duration: '8', stem_direction: Stem.DOWN },
    { keys: ['b/4'], duration: '8', stem_direction: Stem.DOWN },

    // beam3
    { keys: ['b/4'], duration: '8', stem_direction: Stem.UP },
    { keys: ['b/4'], duration: '8', stem_direction: Stem.UP },

    // beam4
    { keys: ['d/6'], duration: '8', stem_direction: Stem.DOWN },
    { keys: ['c/6', 'd/6'], duration: '8', stem_direction: Stem.DOWN },

    // unbeamed
    { keys: ['d/6', 'e/6'], duration: '8', stem_direction: Stem.DOWN },

    // unbeamed, unstyled
    { keys: ['e/6', 'f/6'], duration: '8', stem_direction: Stem.DOWN },
  ];

  const staveNotes = notes.map((note) => new StaveNote(note));

  const beam1 = new Beam(staveNotes.slice(0, 2));
  const beam2 = new Beam(staveNotes.slice(3, 5));
  const beam3 = new Beam(staveNotes.slice(5, 7));
  const beam4 = new Beam(staveNotes.slice(7, 9));

  // stem, key, ledger, flag; beam.setStyle

  beam1.setStyle({ fillStyle: 'blue', strokeStyle: 'blue' });

  staveNotes[0].setKeyStyle(0, { fillStyle: 'purple' });
  staveNotes[0].setStemStyle({ strokeStyle: 'green' });
  staveNotes[1].setStemStyle({ strokeStyle: 'orange' });
  staveNotes[1].setKeyStyle(0, { fillStyle: 'darkturquoise' });

  staveNotes[5].setStyle({ fillStyle: 'tomato', strokeStyle: 'tomato' });
  beam3.setStyle({ shadowBlur: 4, shadowColor: 'blue' });

  staveNotes[9].setLedgerLineStyle({ fillStyle: 'lawngreen', strokeStyle: 'lawngreen', lineWidth: 1 });
  staveNotes[9].setFlagStyle({ fillStyle: 'orange', strokeStyle: 'orange' });

  Formatter.FormatAndDraw(ctx, stave, staveNotes, false);

  beam1.setContext(ctx).draw();
  beam2.setContext(ctx).draw();
  beam3.setContext(ctx).draw();
  beam4.setContext(ctx).draw();

  ok('draw beam styles');
}

function dotsAndFlagsStemUp(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 800, 150);
  ctx.scale(1.0, 1.0);
  ctx.setFillStyle('#221');
  ctx.setStrokeStyle('#221');

  const stave = new Stave(10, 10, 975);

  const notes = [
    staveNote({ keys: ['f/4'], duration: '4', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['f/4'], duration: '8', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['f/4'], duration: '16', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['f/4'], duration: '32', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['f/4'], duration: '64', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['f/4'], duration: '128', stem_direction: Stem.UP })
      .addDotToAll()
      .addDotToAll(),
    staveNote({ keys: ['g/4'], duration: '4', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['g/4'], duration: '8', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['g/4'], duration: '16', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['g/4'], duration: '32' }).addDotToAll(),
    staveNote({ keys: ['g/4'], duration: '64', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['g/4'], duration: '128', stem_direction: Stem.UP })
      .addDotToAll()
      .addDotToAll(),
  ];

  stave.setContext(ctx).draw();

  for (let i = 0; i < notes.length; ++i) {
    draw(notes[i], stave, ctx, i * 65);
  }

  ok(true, 'Full Dot');
}

function dotsAndFlagsStemDown(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 800, 160);
  ctx.scale(1.0, 1.0);
  ctx.setFillStyle('#221');
  ctx.setStrokeStyle('#221');

  const stave = new Stave(10, 10, 975);

  const staveNotes = [
    staveNote({ keys: ['e/5'], duration: '4', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['e/5'], duration: '8', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['e/5'], duration: '16', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['e/5'], duration: '32', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['e/5'], duration: '64', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['e/5'], duration: '128', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['d/5'], duration: '4', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['d/5'], duration: '8', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['d/5'], duration: '16', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['d/5'], duration: '32', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['d/5'], duration: '64', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['d/5'], duration: '128', stem_direction: Stem.DOWN }).addDotToAll(),
  ];

  stave.setContext(ctx).draw();

  for (let i = 0; i < staveNotes.length; ++i) {
    draw(staveNotes[i], stave, ctx, i * 65);
  }

  ok(true, 'Full Dot');
}

function dotsAndBeamsUp(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 800, 150);
  ctx.scale(1.0, 1.0);
  ctx.setFillStyle('#221');
  ctx.setStrokeStyle('#221');

  const stave = new Stave(10, 10, 975);

  const staveNotes = [
    staveNote({ keys: ['f/4'], duration: '8', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['f/4'], duration: '16', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['f/4'], duration: '32', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['f/4'], duration: '64', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['f/4'], duration: '128', stem_direction: Stem.UP })
      .addDotToAll()
      .addDotToAll(),
    staveNote({ keys: ['g/4'], duration: '8', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['g/4'], duration: '16', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['g/4'], duration: '32' }).addDotToAll(),
    staveNote({ keys: ['g/4'], duration: '64', stem_direction: Stem.UP }).addDotToAll(),
    staveNote({ keys: ['g/4'], duration: '128', stem_direction: Stem.UP })
      .addDotToAll()
      .addDotToAll(),
  ];

  const beam = new Beam(staveNotes);

  stave.setContext(ctx).draw();

  for (let i = 0; i < staveNotes.length; ++i) {
    draw(staveNotes[i], stave, ctx, i * 65);
  }

  beam.setContext(ctx).draw();

  ok(true, 'Full Dot');
}

function dotsAndBeamsDown(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 800, 160);
  ctx.scale(1.0, 1.0);
  ctx.setFillStyle('#221');
  ctx.setStrokeStyle('#221');

  const stave = new Stave(10, 10, 975);

  const staveNotes = [
    staveNote({ keys: ['e/5'], duration: '8', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['e/5'], duration: '16', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['e/5'], duration: '32', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['e/5'], duration: '64', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['e/5'], duration: '128', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['d/5'], duration: '8', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['d/5'], duration: '16', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['d/5'], duration: '32', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['d/5'], duration: '64', stem_direction: Stem.DOWN }).addDotToAll(),
    staveNote({ keys: ['d/5'], duration: '128', stem_direction: Stem.DOWN }).addDotToAll(),
  ];

  const beam = new Beam(staveNotes);

  stave.setContext(ctx).draw();

  for (let i = 0; i < staveNotes.length; ++i) {
    draw(staveNotes[i], stave, ctx, i * 65);
  }

  beam.setContext(ctx).draw();

  ok(true, 'Full Dot');
}

function centerAlignedRest(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 400, 160);
  const stave = f.Stave({ x: 10, y: 10, width: 350 }).addClef('treble').addTimeSignature('4/4');
  const note = f.StaveNote({ keys: ['b/4'], duration: '1r', align_center: true });
  const voice = f.Voice().setStrict(false).addTickables([note]);
  f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
  f.draw();
  ok(true);
}

function centerAlignedRestFermata(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 400, 160);

  const stave = f.Stave({ x: 10, y: 10, width: 350 }).addClef('treble').addTimeSignature('4/4');

  const note = f
    .StaveNote({ keys: ['b/4'], duration: '1r', align_center: true })
    .addArticulation(0, new Articulation('a@a').setPosition(3));

  const voice = f.Voice().setStrict(false).addTickables([note]);

  f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  ok(true);
}

function centerAlignedRestAnnotation(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 400, 160);

  const stave = f.Stave({ x: 10, y: 10, width: 350 }).addClef('treble').addTimeSignature('4/4');

  const note = f
    .StaveNote({ keys: ['b/4'], duration: '1r', align_center: true })
    .addAnnotation(0, new Annotation('Whole measure rest').setPosition(3));

  const voice = f.Voice().setStrict(false).addTickables([note]);

  f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  ok(true);
}

function centerAlignedNoteMultiModifiers(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 400, 160);

  const stave = f.Stave({ x: 10, y: 10, width: 350 }).addClef('treble').addTimeSignature('4/4');

  function newFinger(num: string, pos: ModifierPosition) {
    return new FretHandFinger(num).setPosition(pos);
  }

  const note = f
    .StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '4', align_center: true })
    .addAnnotation(0, new Annotation('Test').setPosition(3))
    .addStroke(0, new Stroke(2))
    .addAccidental(1, new Accidental('#'))
    .addModifier(newFinger('3', Modifier.Position.LEFT), 0)
    .addModifier(newFinger('2', Modifier.Position.LEFT), 2)
    .addModifier(newFinger('1', Modifier.Position.RIGHT), 1)
    .addModifier(new StringNumber('4').setPosition(Modifier.Position.BELOW), 2)
    .addDotToAll();

  const voice = f.Voice().setStrict(false).addTickables([note]);

  f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  ok(true);
}

function centerAlignedMultiVoice(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 400, 160);

  const stave = f.Stave({ x: 10, y: 10, width: 350 }).addClef('treble').addTimeSignature('3/8');

  // Set a custom duration of 3 / 8.
  const custom_duration = new Fraction(3, 8);
  // TODO: Should the whole rest draw a ledger line that is visible to the left/right of the rest?
  const notes0 = [
    f.StaveNote({
      keys: ['c/4'],
      duration: '1r',
      align_center: true,
      duration_override: custom_duration,
    }),
  ];

  const createStaveNote = (struct: StaveNoteStruct) => f.StaveNote(struct);
  const notes1 = [
    { keys: ['b/4'], duration: '8' },
    { keys: ['b/4'], duration: '8' },
    { keys: ['b/4'], duration: '8' },
  ].map(createStaveNote);

  notes1[1].addAccidental(0, f.Accidental({ type: '#' }));

  f.Beam({ notes: notes1 });

  const voice0 = f.Voice({ time: '3/8' }).setStrict(false).addTickables(notes0);
  const voice1 = f.Voice({ time: '3/8' }).setStrict(false).addTickables(notes1);

  f.Formatter().joinVoices([voice0, voice1]).formatToStave([voice0, voice1], stave);

  f.draw();

  ok(true);
}

export { StaveNoteTests };
